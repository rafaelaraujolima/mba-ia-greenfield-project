import { DataSource, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Channel } from '../channels/entities/channel.entity';
import {
  CommentDepthExceededException,
  CommentNotFoundException,
  InvalidCursorException,
  VideoNotFoundException,
} from '../common/exceptions/domain.exception';
import { CommentReaction } from '../reactions/entities/comment-reaction.entity';
import { ReactionType } from '../reactions/entities/reaction-type.enum';
import { VideoReaction } from '../reactions/entities/video-reaction.entity';
import { ReactionsService } from '../reactions/reactions.service';
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
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';

const ALL_ENTITIES = [
  User,
  Channel,
  Category,
  Video,
  Comment,
  VideoReaction,
  CommentReaction,
];

describe('CommentsService (integration)', () => {
  let dataSource: DataSource;
  let service: CommentsService;
  let reactionsService: ReactionsService;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let commentRepository: Repository<Comment>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    commentRepository = dataSource.getRepository(Comment);
    reactionsService = new ReactionsService(
      dataSource.getRepository(VideoReaction),
      dataSource.getRepository(CommentReaction),
      videoRepository,
      commentRepository,
    );
    service = new CommentsService(
      commentRepository,
      videoRepository,
      channelRepository,
      reactionsService,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createUserWithChannel(): Promise<{
    user: User;
    channel: Channel;
  }> {
    const user = await userRepository.save(
      userRepository.create({
        email: `comments_svc_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname: `comments-channel-${counter}`,
        user_id: user.id,
      }),
    );
    return { user, channel };
  }

  async function createVideo(
    channelId: string,
    overrides: Partial<Video> = {},
  ): Promise<Video> {
    return videoRepository.save(
      videoRepository.create({
        channel_id: channelId,
        title: 'Commented video',
        storage_key: `videos/${channelId}/${++counter}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
      }),
    );
  }

  async function seedComment(
    videoId: string,
    userId: string,
    createdAt: Date,
    overrides: Partial<Comment> = {},
  ): Promise<Comment> {
    return commentRepository.save(
      commentRepository.create({
        video_id: videoId,
        user_id: userId,
        body: `comment at ${createdAt.toISOString()}`,
        created_at: createdAt,
        ...overrides,
      }),
    );
  }

  describe('create', () => {
    it('should store a top-level comment with the trimmed body and author', async () => {
      const { channel: ownerChannel } = await createUserWithChannel();
      const { user: author, channel: authorChannel } =
        await createUserWithChannel();
      const video = await createVideo(ownerChannel.id);

      const item = await service.create(author.id, video.id, {
        body: '  great video  ',
      });

      expect(item.body).toBe('great video');
      expect(item.parentId).toBeNull();
      expect(item.likeCount).toBe(0);
      expect(item.replyCount).toBe(0);
      expect(item.author).toEqual({
        channelName: authorChannel.name,
        channelNickname: authorChannel.nickname,
      });
      expect(item.viewerState).toEqual({ reaction: null });
    });

    it('should create a reply to a top-level comment', async () => {
      const { user, channel } = await createUserWithChannel();
      const video = await createVideo(channel.id);
      const top = await service.create(user.id, video.id, { body: 'top' });

      const reply = await service.create(user.id, video.id, {
        body: 'reply',
        parentId: top.id,
      });

      expect(reply.parentId).toBe(top.id);
    });

    it('should reject a reply to a reply', async () => {
      const { user, channel } = await createUserWithChannel();
      const video = await createVideo(channel.id);
      const top = await service.create(user.id, video.id, { body: 'top' });
      const reply = await service.create(user.id, video.id, {
        body: 'reply',
        parentId: top.id,
      });

      await expect(
        service.create(user.id, video.id, {
          body: 'too deep',
          parentId: reply.id,
        }),
      ).rejects.toThrow(CommentDepthExceededException);
    });

    it('should reject a parent from another video and an unknown parent', async () => {
      const { user, channel } = await createUserWithChannel();
      const video = await createVideo(channel.id);
      const otherVideo = await createVideo(channel.id);
      const foreignTop = await service.create(user.id, otherVideo.id, {
        body: 'elsewhere',
      });

      await expect(
        service.create(user.id, video.id, {
          body: 'x',
          parentId: foreignTop.id,
        }),
      ).rejects.toThrow(CommentNotFoundException);
      await expect(
        service.create(user.id, video.id, {
          body: 'x',
          parentId: '00000000-0000-4000-8000-000000000000',
        }),
      ).rejects.toThrow(CommentNotFoundException);
    });

    it('should reject commenting on a video the user cannot see', async () => {
      const { channel } = await createUserWithChannel();
      const { user: stranger } = await createUserWithChannel();
      const draft = await createVideo(channel.id, {
        status: VideoStatus.DRAFT,
        published_at: null,
      });

      await expect(
        service.create(stranger.id, draft.id, { body: 'hello' }),
      ).rejects.toThrow(VideoNotFoundException);
    });
  });

  describe('listTopLevel', () => {
    it('should walk every comment exactly once via nextCursor, even when new ones arrive between pages', async () => {
      const { user, channel } = await createUserWithChannel();
      const video = await createVideo(channel.id);
      const created: Comment[] = [];
      for (let minute = 1; minute <= 5; minute++) {
        created.push(
          await seedComment(
            video.id,
            user.id,
            new Date(`2026-02-01T00:0${minute}:00Z`),
          ),
        );
      }

      const first = await service.listTopLevel(video.id, { limit: 2 });
      // A newer comment arrives while the client is paging: it sits before
      // the cursor in the ordering and must not disturb the remaining pages.
      await seedComment(video.id, user.id, new Date('2026-02-02T00:00:00Z'));
      const second = await service.listTopLevel(video.id, {
        limit: 2,
        cursor: first.nextCursor!,
      });
      const third = await service.listTopLevel(video.id, {
        limit: 2,
        cursor: second.nextCursor!,
      });

      const seen = [...first.items, ...second.items, ...third.items].map(
        (item) => item.id,
      );
      expect(seen).toEqual([...created].reverse().map((comment) => comment.id));
      expect(new Set(seen).size).toBe(5);
      expect(first.nextCursor).not.toBeNull();
      expect(third.nextCursor).toBeNull();
    });

    it('should include reply counts and a total that counts replies', async () => {
      const { user, channel } = await createUserWithChannel();
      const video = await createVideo(channel.id);
      const top = await seedComment(
        video.id,
        user.id,
        new Date('2026-02-01T00:00:00Z'),
      );
      await seedComment(video.id, user.id, new Date('2026-02-01T00:01:00Z'), {
        parent_id: top.id,
      });
      await seedComment(video.id, user.id, new Date('2026-02-01T00:02:00Z'), {
        parent_id: top.id,
      });

      const page = await service.listTopLevel(video.id, {});

      expect(page.items).toHaveLength(1);
      expect(page.items[0].replyCount).toBe(2);
      expect(page.totalCount).toBe(3);
    });

    it('should expose like counts and viewer state only for an identified viewer', async () => {
      const { user: author, channel } = await createUserWithChannel();
      const { user: viewer } = await createUserWithChannel();
      const { user: fan } = await createUserWithChannel();
      const video = await createVideo(channel.id);
      const comment = await seedComment(
        video.id,
        author.id,
        new Date('2026-02-01T00:00:00Z'),
      );
      await reactionsService.setCommentReaction(
        viewer.id,
        comment.id,
        ReactionType.LIKE,
      );
      await reactionsService.setCommentReaction(
        fan.id,
        comment.id,
        ReactionType.LIKE,
      );

      const asViewer = await service.listTopLevel(video.id, {}, viewer.id);
      const anonymous = await service.listTopLevel(video.id, {});

      expect(asViewer.items[0].likeCount).toBe(2);
      expect(asViewer.items[0].viewerState).toEqual({
        reaction: ReactionType.LIKE,
      });
      expect(anonymous.items[0].likeCount).toBe(2);
      expect(anonymous.items[0].viewerState).toBeNull();
    });

    it('should throw INVALID_CURSOR for a malformed cursor', async () => {
      const { channel } = await createUserWithChannel();
      const video = await createVideo(channel.id);

      await expect(
        service.listTopLevel(video.id, { cursor: 'nope' }),
      ).rejects.toThrow(InvalidCursorException);
    });

    it('should throw VIDEO_NOT_FOUND for an unpublished video', async () => {
      const { channel } = await createUserWithChannel();
      const draft = await createVideo(channel.id, {
        status: VideoStatus.DRAFT,
        published_at: null,
      });

      await expect(service.listTopLevel(draft.id, {})).rejects.toThrow(
        VideoNotFoundException,
      );
    });
  });

  describe('countByVideoIds', () => {
    it('should count comments per video including replies and default to zero', async () => {
      const { user, channel } = await createUserWithChannel();
      const busy = await createVideo(channel.id);
      const quiet = await createVideo(channel.id);
      const top = await seedComment(
        busy.id,
        user.id,
        new Date('2026-02-01T00:00:00Z'),
      );
      await seedComment(busy.id, user.id, new Date('2026-02-01T00:01:00Z'), {
        parent_id: top.id,
      });

      const counts = await service.countByVideoIds([busy.id, quiet.id]);

      expect(counts.get(busy.id)).toBe(2);
      expect(counts.get(quiet.id)).toBe(0);
    });
  });

  describe('listReplies', () => {
    it('should list the replies of a top-level comment, newest first', async () => {
      const { user, channel } = await createUserWithChannel();
      const video = await createVideo(channel.id);
      const top = await seedComment(
        video.id,
        user.id,
        new Date('2026-02-01T00:00:00Z'),
      );
      const older = await seedComment(
        video.id,
        user.id,
        new Date('2026-02-01T00:01:00Z'),
        { parent_id: top.id },
      );
      const newer = await seedComment(
        video.id,
        user.id,
        new Date('2026-02-01T00:02:00Z'),
        { parent_id: top.id },
      );

      const page = await service.listReplies(top.id, {});

      expect(page.items.map((item) => item.id)).toEqual([newer.id, older.id]);
      expect(page.items[0].parentId).toBe(top.id);
      expect(page.items[0].replyCount).toBe(0);
      expect(page.nextCursor).toBeNull();
    });

    it('should reject an unknown comment and a comment that is itself a reply', async () => {
      const { user, channel } = await createUserWithChannel();
      const video = await createVideo(channel.id);
      const top = await seedComment(
        video.id,
        user.id,
        new Date('2026-02-01T00:00:00Z'),
      );
      const reply = await seedComment(
        video.id,
        user.id,
        new Date('2026-02-01T00:01:00Z'),
        { parent_id: top.id },
      );

      await expect(
        service.listReplies('00000000-0000-4000-8000-000000000000', {}),
      ).rejects.toThrow(CommentNotFoundException);
      await expect(service.listReplies(reply.id, {})).rejects.toThrow(
        CommentNotFoundException,
      );
    });
  });
});
