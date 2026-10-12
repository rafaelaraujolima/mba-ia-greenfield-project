import { DataSource, Repository } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Channel } from '../../channels/entities/channel.entity';
import { Comment } from '../../comments/entities/comment.entity';
import {
  cleanAllTables,
  createTestDataSource,
} from '../../test/create-test-data-source';
import { User } from '../../users/entities/user.entity';
import { Video } from '../../videos/entities/video.entity';
import { CommentReaction } from './comment-reaction.entity';
import { ReactionType } from './reaction-type.enum';
import { VideoReaction } from './video-reaction.entity';

const ALL_ENTITIES = [
  User,
  Channel,
  Category,
  Video,
  Comment,
  VideoReaction,
  CommentReaction,
];

describe('Reaction entities (integration)', () => {
  let dataSource: DataSource;
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
        email: `reaction_user_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
  }

  async function createVideo(): Promise<Video> {
    const owner = await createUser();
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname: `reaction-channel-${counter}`,
        user_id: owner.id,
      }),
    );
    return videoRepository.save(
      videoRepository.create({
        channel_id: channel.id,
        title: 'Reacted video',
        storage_key: `videos/${channel.id}/original.mp4`,
      }),
    );
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

  describe('VideoReaction', () => {
    it('should persist a reaction with generated id and timestamps', async () => {
      const user = await createUser();
      const video = await createVideo();

      const reaction = await videoReactionRepository.save(
        videoReactionRepository.create({
          user_id: user.id,
          video_id: video.id,
          type: ReactionType.LIKE,
        }),
      );

      expect(reaction.id).toBeDefined();
      expect(reaction.type).toBe(ReactionType.LIKE);
      expect(reaction.created_at).toBeInstanceOf(Date);
      expect(reaction.updated_at).toBeInstanceOf(Date);
    });

    it('should reject a second reaction from the same user on the same video', async () => {
      const user = await createUser();
      const video = await createVideo();
      await videoReactionRepository.save(
        videoReactionRepository.create({
          user_id: user.id,
          video_id: video.id,
          type: ReactionType.LIKE,
        }),
      );

      await expect(
        videoReactionRepository.save(
          videoReactionRepository.create({
            user_id: user.id,
            video_id: video.id,
            type: ReactionType.DISLIKE,
          }),
        ),
      ).rejects.toThrow(/duplicate key|unique/i);
    });

    it('should reject a type outside like/dislike', async () => {
      const user = await createUser();
      const video = await createVideo();

      await expect(
        dataSource.query(
          `INSERT INTO "video_reactions" ("user_id", "video_id", "type") VALUES ($1, $2, 'love')`,
          [user.id, video.id],
        ),
      ).rejects.toThrow(/invalid input value for enum/i);
    });

    it('should cascade-delete reactions when the video is removed', async () => {
      const user = await createUser();
      const video = await createVideo();
      await videoReactionRepository.save(
        videoReactionRepository.create({
          user_id: user.id,
          video_id: video.id,
          type: ReactionType.LIKE,
        }),
      );

      await videoRepository.delete({ id: video.id });

      expect(await videoReactionRepository.count()).toBe(0);
    });
  });

  describe('CommentReaction', () => {
    it('should persist a reaction with generated id and timestamps', async () => {
      const user = await createUser();
      const video = await createVideo();
      const comment = await createComment(video.id);

      const reaction = await commentReactionRepository.save(
        commentReactionRepository.create({
          user_id: user.id,
          comment_id: comment.id,
          type: ReactionType.DISLIKE,
        }),
      );

      expect(reaction.id).toBeDefined();
      expect(reaction.type).toBe(ReactionType.DISLIKE);
      expect(reaction.created_at).toBeInstanceOf(Date);
    });

    it('should reject a second reaction from the same user on the same comment', async () => {
      const user = await createUser();
      const video = await createVideo();
      const comment = await createComment(video.id);
      await commentReactionRepository.save(
        commentReactionRepository.create({
          user_id: user.id,
          comment_id: comment.id,
          type: ReactionType.LIKE,
        }),
      );

      await expect(
        commentReactionRepository.save(
          commentReactionRepository.create({
            user_id: user.id,
            comment_id: comment.id,
            type: ReactionType.LIKE,
          }),
        ),
      ).rejects.toThrow(/duplicate key|unique/i);
    });

    it('should cascade-delete reactions when the comment is removed', async () => {
      const user = await createUser();
      const video = await createVideo();
      const comment = await createComment(video.id);
      await commentReactionRepository.save(
        commentReactionRepository.create({
          user_id: user.id,
          comment_id: comment.id,
          type: ReactionType.LIKE,
        }),
      );

      await commentRepository.delete({ id: comment.id });

      expect(await commentReactionRepository.count()).toBe(0);
    });
  });
});
