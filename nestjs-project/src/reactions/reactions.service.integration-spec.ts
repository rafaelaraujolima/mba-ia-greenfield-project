import { DataSource, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Channel } from '../channels/entities/channel.entity';
import { Comment } from '../comments/entities/comment.entity';
import {
  CommentNotFoundException,
  VideoNotFoundException,
} from '../common/exceptions/domain.exception';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import {
  Video,
  VideoStatus,
  VideoVisibility,
} from '../videos/entities/video.entity';
import { CommentReaction } from './entities/comment-reaction.entity';
import { ReactionType } from './entities/reaction-type.enum';
import { VideoReaction } from './entities/video-reaction.entity';
import { ReactionsService } from './reactions.service';

const ALL_ENTITIES = [
  User,
  Channel,
  Category,
  Video,
  Comment,
  VideoReaction,
  CommentReaction,
];

describe('ReactionsService (integration)', () => {
  let dataSource: DataSource;
  let service: ReactionsService;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let commentRepository: Repository<Comment>;
  let videoReactionRepository: Repository<VideoReaction>;
  let commentReactionRepository: Repository<CommentReaction>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    commentRepository = dataSource.getRepository(Comment);
    videoReactionRepository = dataSource.getRepository(VideoReaction);
    commentReactionRepository = dataSource.getRepository(CommentReaction);
    service = new ReactionsService(
      videoReactionRepository,
      commentReactionRepository,
      videoRepository,
      commentRepository,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createUser(): Promise<User> {
    return userRepository.save(
      userRepository.create({
        email: `reactions_svc_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
  }

  async function createVideo(
    overrides: Partial<Video> = {},
  ): Promise<{ video: Video; owner: User }> {
    const owner = await createUser();
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname: `reactions-channel-${counter}`,
        user_id: owner.id,
      }),
    );
    const video = await videoRepository.save(
      videoRepository.create({
        channel_id: channel.id,
        title: 'Reacted video',
        storage_key: `videos/${channel.id}/original.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
      }),
    );
    return { video, owner };
  }

  async function createComment(videoId: string): Promise<Comment> {
    const author = await createUser();
    return commentRepository.save(
      commentRepository.create({
        video_id: videoId,
        user_id: author.id,
        body: 'A comment',
      }),
    );
  }

  describe('video reactions', () => {
    it('should keep one row per (user, video) and replace the type on change', async () => {
      const viewer = await createUser();
      const { video } = await createVideo();

      await service.setVideoReaction(viewer.id, video.id, ReactionType.LIKE);
      await service.setVideoReaction(viewer.id, video.id, ReactionType.LIKE);
      await service.setVideoReaction(viewer.id, video.id, ReactionType.DISLIKE);

      const rows = await videoReactionRepository.findBy({
        user_id: viewer.id,
        video_id: video.id,
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe(ReactionType.DISLIKE);
    });

    it('should remove the reaction and tolerate repeating the call', async () => {
      const viewer = await createUser();
      const { video } = await createVideo();
      await service.setVideoReaction(viewer.id, video.id, ReactionType.LIKE);

      await service.removeVideoReaction(viewer.id, video.id);
      await expect(
        service.removeVideoReaction(viewer.id, video.id),
      ).resolves.toBeUndefined();

      expect(await videoReactionRepository.count()).toBe(0);
    });

    it('should reject reacting to a missing or unpublished video', async () => {
      const viewer = await createUser();
      const { video: draft } = await createVideo({
        status: VideoStatus.DRAFT,
        published_at: null,
      });

      await expect(
        service.setVideoReaction(
          viewer.id,
          '00000000-0000-4000-8000-000000000000',
          ReactionType.LIKE,
        ),
      ).rejects.toThrow(VideoNotFoundException);
      await expect(
        service.setVideoReaction(viewer.id, draft.id, ReactionType.LIKE),
      ).rejects.toThrow(VideoNotFoundException);
    });

    it('should count only likes per video and return zero for videos without likes', async () => {
      const { video: liked } = await createVideo();
      const { video: untouched } = await createVideo();
      const fanA = await createUser();
      const fanB = await createUser();
      const critic = await createUser();
      await service.setVideoReaction(fanA.id, liked.id, ReactionType.LIKE);
      await service.setVideoReaction(fanB.id, liked.id, ReactionType.LIKE);
      await service.setVideoReaction(critic.id, liked.id, ReactionType.DISLIKE);

      const counts = await service.countVideoLikes([liked.id, untouched.id]);

      expect(counts.get(liked.id)).toBe(2);
      expect(counts.get(untouched.id)).toBe(0);
    });

    it('should report the viewer reaction or null', async () => {
      const viewer = await createUser();
      const { video } = await createVideo();
      expect(await service.findVideoReaction(viewer.id, video.id)).toBeNull();

      await service.setVideoReaction(viewer.id, video.id, ReactionType.DISLIKE);

      expect(await service.findVideoReaction(viewer.id, video.id)).toBe(
        ReactionType.DISLIKE,
      );
    });
  });

  describe('comment reactions', () => {
    it('should keep one row per (user, comment) and replace the type on change', async () => {
      const viewer = await createUser();
      const { video } = await createVideo();
      const comment = await createComment(video.id);

      await service.setCommentReaction(
        viewer.id,
        comment.id,
        ReactionType.LIKE,
      );
      await service.setCommentReaction(
        viewer.id,
        comment.id,
        ReactionType.DISLIKE,
      );

      const rows = await commentReactionRepository.findBy({
        user_id: viewer.id,
        comment_id: comment.id,
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe(ReactionType.DISLIKE);
    });

    it('should reject reacting to a missing comment', async () => {
      const viewer = await createUser();

      await expect(
        service.setCommentReaction(
          viewer.id,
          '00000000-0000-4000-8000-000000000000',
          ReactionType.LIKE,
        ),
      ).rejects.toThrow(CommentNotFoundException);
    });

    it('should count likes in batch and map the viewer reactions', async () => {
      const viewer = await createUser();
      const { video } = await createVideo();
      const first = await createComment(video.id);
      const second = await createComment(video.id);
      const other = await createUser();
      await service.setCommentReaction(viewer.id, first.id, ReactionType.LIKE);
      await service.setCommentReaction(other.id, first.id, ReactionType.LIKE);
      await service.setCommentReaction(
        viewer.id,
        second.id,
        ReactionType.DISLIKE,
      );

      const counts = await service.countCommentLikes([first.id, second.id]);
      const mine = await service.findCommentReactions(viewer.id, [
        first.id,
        second.id,
      ]);

      expect(counts.get(first.id)).toBe(2);
      expect(counts.get(second.id)).toBe(0);
      expect(mine.get(first.id)).toBe(ReactionType.LIKE);
      expect(mine.get(second.id)).toBe(ReactionType.DISLIKE);
    });
  });
});
