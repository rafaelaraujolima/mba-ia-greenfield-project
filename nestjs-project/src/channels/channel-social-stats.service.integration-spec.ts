import { DataSource, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { Video } from '../videos/entities/video.entity';
import { ChannelSocialStatsService } from './channel-social-stats.service';
import { Channel } from './entities/channel.entity';

const ALL_ENTITIES = [User, Channel, Category, Video, Subscription];

describe('ChannelSocialStatsService (integration)', () => {
  let dataSource: DataSource;
  let service: ChannelSocialStatsService;
  let subscriptionsService: SubscriptionsService;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    subscriptionsService = new SubscriptionsService(
      dataSource.getRepository(Subscription),
      channelRepository,
      dataSource.getRepository(Video),
    );
    service = new ChannelSocialStatsService(subscriptionsService);
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
        email: `channel_stats_${++counter}@example.com`,
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
        nickname: `channel-stats-${counter}`,
        user_id: owner.id,
      }),
    );
    return { owner, channel };
  }

  it('should count subscribers and return a null viewerState for anonymous viewers', async () => {
    const { channel } = await createChannelWithOwner();
    const fanA = await createUser();
    const fanB = await createUser();
    await subscriptionsService.subscribe(fanA.id, channel.nickname);
    await subscriptionsService.subscribe(fanB.id, channel.nickname);

    const stats = await service.forChannel(channel);

    expect(stats.subscriberCount).toBe(2);
    expect(stats.viewerState).toBeNull();
  });

  it('should report whether the viewer is subscribed', async () => {
    const { channel } = await createChannelWithOwner();
    const subscriber = await createUser();
    const stranger = await createUser();
    await subscriptionsService.subscribe(subscriber.id, channel.nickname);

    const asSubscriber = await service.forChannel(channel, subscriber.id);
    const asStranger = await service.forChannel(channel, stranger.id);

    expect(asSubscriber.viewerState).toEqual({
      subscribed: true,
      isChannelOwner: false,
    });
    expect(asStranger.viewerState).toEqual({
      subscribed: false,
      isChannelOwner: false,
    });
  });

  it('should flag the owner as isChannelOwner', async () => {
    const { owner, channel } = await createChannelWithOwner();

    const stats = await service.forChannel(channel, owner.id);

    expect(stats.viewerState).toEqual({
      subscribed: false,
      isChannelOwner: true,
    });
  });
});
