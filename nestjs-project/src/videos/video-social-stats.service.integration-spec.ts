import { DataSource, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Channel } from '../channels/entities/channel.entity';
import { CommentsService } from '../comments/comments.service';
import { Comment } from '../comments/entities/comment.entity';
import { CommentReaction } from '../reactions/entities/comment-reaction.entity';
import { ReactionType } from '../reactions/entities/reaction-type.enum';
import { VideoReaction } from '../reactions/entities/video-reaction.entity';
import { ReactionsService } from '../reactions/reactions.service';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { Video, VideoStatus, VideoVisibility } from './entities/video.entity';
import { VideoSocialStatsService } from './video-social-stats.service';

const ALL_ENTITIES = [
  User,
  Channel,
  Category,
  Video,
  Comment,
  VideoReaction,
  CommentReaction,
  Subscription,
];

describe('VideoSocialStatsService (integration)', () => {
  let dataSource: DataSource;
  let service: VideoSocialStatsService;
  let reactionsService: ReactionsService;
  let subscriptionsService: SubscriptionsService;
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
    subscriptionsService = new SubscriptionsService(
      dataSource.getRepository(Subscription),
      channelRepository,
      videoRepository,
    );
    const commentsService = new CommentsService(
      commentRepository,
      videoRepository,
      channelRepository,
      reactionsService,
    );
    service = new VideoSocialStatsService(
      reactionsService,
      subscriptionsService,
      commentsService,
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
        email: `video_stats_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
  }

  async function createVideoWithOwner(): Promise<{
    video: Video;
    owner: User;
    channel: Channel;
  }> {
    const owner = await createUser();
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname: `video-stats-channel-${counter}`,
        user_id: owner.id,
      }),
    );
    const video = await videoRepository.save(
      videoRepository.create({
        channel_id: channel.id,
        title: 'Stats video',
        storage_key: `videos/${channel.id}/original.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date('2026-01-01T00:00:00Z'),
      }),
    );
    return { video: { ...video, channel } as Video, owner, channel };
  }

  describe('forVideo', () => {
    it('should count likes and channel subscribers and return a null viewerState for anonymous viewers', async () => {
      const { video, channel } = await createVideoWithOwner();
      const fanA = await createUser();
      const fanB = await createUser();
      const critic = await createUser();
      await reactionsService.setVideoReaction(
        fanA.id,
        video.id,
        ReactionType.LIKE,
      );
      await reactionsService.setVideoReaction(
        fanB.id,
        video.id,
        ReactionType.LIKE,
      );
      await reactionsService.setVideoReaction(
        critic.id,
        video.id,
        ReactionType.DISLIKE,
      );
      await subscriptionsService.subscribe(fanA.id, channel.nickname);

      const stats = await service.forVideo(video);

      expect(stats.likeCount).toBe(2);
      expect(stats.channelSubscriberCount).toBe(1);
      expect(stats.viewerState).toBeNull();
    });

    it('should return the viewer reaction, subscription and ownership flags', async () => {
      const { video, channel } = await createVideoWithOwner();
      const viewer = await createUser();
      await reactionsService.setVideoReaction(
        viewer.id,
        video.id,
        ReactionType.LIKE,
      );
      await subscriptionsService.subscribe(viewer.id, channel.nickname);

      const stats = await service.forVideo(video, viewer.id);

      expect(stats.viewerState).toEqual({
        reaction: ReactionType.LIKE,
        subscribed: true,
        isChannelOwner: false,
      });
    });

    it('should mark the channel owner and report no reaction or subscription', async () => {
      const { video, owner } = await createVideoWithOwner();

      const stats = await service.forVideo(video, owner.id);

      expect(stats.viewerState).toEqual({
        reaction: null,
        subscribed: false,
        isChannelOwner: true,
      });
    });
  });

  describe('countsForVideos', () => {
    it('should return like and comment totals per video, zero when absent', async () => {
      const { video: busy, owner } = await createVideoWithOwner();
      const { video: quiet } = await createVideoWithOwner();
      const fan = await createUser();
      await reactionsService.setVideoReaction(
        fan.id,
        busy.id,
        ReactionType.LIKE,
      );
      const top = await commentRepository.save(
        commentRepository.create({
          video_id: busy.id,
          user_id: owner.id,
          body: 'top',
        }),
      );
      await commentRepository.save(
        commentRepository.create({
          video_id: busy.id,
          user_id: owner.id,
          parent_id: top.id,
          body: 'reply',
        }),
      );

      const counts = await service.countsForVideos([busy.id, quiet.id]);

      expect(counts.likes.get(busy.id)).toBe(1);
      expect(counts.comments.get(busy.id)).toBe(2);
      expect(counts.likes.get(quiet.id)).toBe(0);
      expect(counts.comments.get(quiet.id)).toBe(0);
    });
  });
});
