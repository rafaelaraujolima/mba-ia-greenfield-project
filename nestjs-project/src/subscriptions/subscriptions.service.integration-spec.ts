import { DataSource, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Channel } from '../channels/entities/channel.entity';
import {
  CannotSubscribeOwnChannelException,
  ChannelNotFoundException,
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
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';

const ALL_ENTITIES = [User, Channel, Category, Video, Subscription];

describe('SubscriptionsService (integration)', () => {
  let dataSource: DataSource;
  let service: SubscriptionsService;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let subscriptionRepository: Repository<Subscription>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    subscriptionRepository = dataSource.getRepository(Subscription);
    service = new SubscriptionsService(
      subscriptionRepository,
      channelRepository,
      videoRepository,
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
        email: `subs_svc_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
  }

  async function createChannelWithOwner(): Promise<{
    owner: User;
    channel: Channel;
  }> {
    const owner = await createUser();
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname: `subs-channel-${counter}`,
        user_id: owner.id,
      }),
    );
    return { owner, channel };
  }

  async function createVideo(
    channelId: string,
    overrides: Partial<Video> = {},
  ): Promise<Video> {
    return videoRepository.save(
      videoRepository.create({
        channel_id: channelId,
        title: 'Feed video',
        storage_key: `videos/${channelId}/${++counter}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
      }),
    );
  }

  describe('subscribe / unsubscribe', () => {
    it('should keep a single row when subscribing twice', async () => {
      const viewer = await createUser();
      const { channel } = await createChannelWithOwner();

      await service.subscribe(viewer.id, channel.nickname);
      await service.subscribe(viewer.id, channel.nickname);

      expect(
        await subscriptionRepository.countBy({
          user_id: viewer.id,
          channel_id: channel.id,
        }),
      ).toBe(1);
    });

    it('should reject subscribing to the own channel and persist nothing', async () => {
      const { owner, channel } = await createChannelWithOwner();

      await expect(
        service.subscribe(owner.id, channel.nickname),
      ).rejects.toThrow(CannotSubscribeOwnChannelException);
      expect(await subscriptionRepository.count()).toBe(0);
    });

    it('should throw ChannelNotFoundException for an unknown nickname', async () => {
      const viewer = await createUser();

      await expect(service.subscribe(viewer.id, 'ghost')).rejects.toThrow(
        ChannelNotFoundException,
      );
    });

    it('should delete the subscription and tolerate repeating the call', async () => {
      const viewer = await createUser();
      const { channel } = await createChannelWithOwner();
      await service.subscribe(viewer.id, channel.nickname);

      await service.unsubscribe(viewer.id, channel.nickname);
      await expect(
        service.unsubscribe(viewer.id, channel.nickname),
      ).resolves.toBeUndefined();

      expect(await subscriptionRepository.count()).toBe(0);
    });
  });

  describe('counts and viewer state', () => {
    it('should count subscribers per channel and default to zero', async () => {
      const popular = (await createChannelWithOwner()).channel;
      const lonely = (await createChannelWithOwner()).channel;
      const fanA = await createUser();
      const fanB = await createUser();
      await service.subscribe(fanA.id, popular.nickname);
      await service.subscribe(fanB.id, popular.nickname);

      const counts = await service.countByChannelIds([popular.id, lonely.id]);

      expect(counts.get(popular.id)).toBe(2);
      expect(counts.get(lonely.id)).toBe(0);
    });

    it('should report which of the given channels the user follows', async () => {
      const viewer = await createUser();
      const followed = (await createChannelWithOwner()).channel;
      const other = (await createChannelWithOwner()).channel;
      await service.subscribe(viewer.id, followed.nickname);

      const subscribed = await service.findSubscribedChannelIds(viewer.id, [
        followed.id,
        other.id,
      ]);

      expect(subscribed.has(followed.id)).toBe(true);
      expect(subscribed.has(other.id)).toBe(false);
    });
  });

  describe('listFollowed', () => {
    it('should list newest subscription first and respect the limit', async () => {
      const viewer = await createUser();
      const first = (await createChannelWithOwner()).channel;
      const second = (await createChannelWithOwner()).channel;
      const third = (await createChannelWithOwner()).channel;
      await service.subscribe(viewer.id, first.nickname);
      await service.subscribe(viewer.id, second.nickname);
      await service.subscribe(viewer.id, third.nickname);

      const followed = await service.listFollowed(viewer.id, 2);

      expect(followed).toHaveLength(2);
      expect(followed[0].channelNickname).toBe(third.nickname);
      expect(followed[1].channelNickname).toBe(second.nickname);
      expect(followed[0].channelId).toBe(third.id);
      expect(followed[0].channelName).toBe(third.name);
      expect(followed[0].subscribedAt).toBeInstanceOf(Date);
    });

    it('should return an empty list when the user follows nobody', async () => {
      const viewer = await createUser();

      expect(await service.listFollowed(viewer.id)).toEqual([]);
    });
  });

  describe('listFeedVideos', () => {
    it('should return only published public videos of followed channels, newest first', async () => {
      const viewer = await createUser();
      const followed = (await createChannelWithOwner()).channel;
      const notFollowed = (await createChannelWithOwner()).channel;
      await service.subscribe(viewer.id, followed.nickname);

      const older = await createVideo(followed.id, {
        title: 'older',
        published_at: new Date('2026-01-01T00:00:00Z'),
      });
      const newer = await createVideo(followed.id, {
        title: 'newer',
        published_at: new Date('2026-02-01T00:00:00Z'),
      });
      await createVideo(followed.id, {
        title: 'draft',
        status: VideoStatus.DRAFT,
        published_at: null,
      });
      await createVideo(followed.id, {
        title: 'unlisted',
        visibility: VideoVisibility.UNLISTED,
      });
      await createVideo(notFollowed.id, { title: 'unfollowed' });

      const feed = await service.listFeedVideos(viewer.id);

      expect(feed.items.map((video) => video.id)).toEqual([newer.id, older.id]);
      expect(feed.total).toBe(2);
      expect(feed.page).toBe(1);
      expect(feed.items[0].channel.nickname).toBe(followed.nickname);
    });

    it('should paginate with page and pageSize', async () => {
      const viewer = await createUser();
      const followed = (await createChannelWithOwner()).channel;
      await service.subscribe(viewer.id, followed.nickname);
      for (let day = 1; day <= 3; day++) {
        await createVideo(followed.id, {
          title: `video-${day}`,
          published_at: new Date(`2026-03-0${day}T00:00:00Z`),
        });
      }

      const secondPage = await service.listFeedVideos(viewer.id, {
        page: 2,
        pageSize: 2,
      });

      expect(secondPage.items).toHaveLength(1);
      expect(secondPage.total).toBe(3);
      expect(secondPage.pageSize).toBe(2);
    });
  });
});
