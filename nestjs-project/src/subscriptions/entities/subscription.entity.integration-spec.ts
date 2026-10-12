import { DataSource, Repository } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Channel } from '../../channels/entities/channel.entity';
import {
  cleanAllTables,
  createTestDataSource,
} from '../../test/create-test-data-source';
import { User } from '../../users/entities/user.entity';
import { Video } from '../../videos/entities/video.entity';
import { Subscription } from './subscription.entity';

const ALL_ENTITIES = [User, Channel, Category, Video, Subscription];

describe('Subscription entity (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let subscriptionRepository: Repository<Subscription>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    subscriptionRepository = dataSource.getRepository(Subscription);
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
        email: `subscription_user_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
  }

  async function createChannel(): Promise<Channel> {
    const owner = await createUser();
    return channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname: `subscription-channel-${counter}`,
        user_id: owner.id,
      }),
    );
  }

  it('should persist a subscription with generated id and created_at', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();

    const subscription = await subscriptionRepository.save(
      subscriptionRepository.create({
        user_id: subscriber.id,
        channel_id: channel.id,
      }),
    );

    expect(subscription.id).toBeDefined();
    expect(subscription.created_at).toBeInstanceOf(Date);
  });

  it('should reject a second subscription of the same user to the same channel', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();
    await subscriptionRepository.save(
      subscriptionRepository.create({
        user_id: subscriber.id,
        channel_id: channel.id,
      }),
    );

    await expect(
      subscriptionRepository.save(
        subscriptionRepository.create({
          user_id: subscriber.id,
          channel_id: channel.id,
        }),
      ),
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it('should cascade-delete subscriptions when the channel is removed', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();
    await subscriptionRepository.save(
      subscriptionRepository.create({
        user_id: subscriber.id,
        channel_id: channel.id,
      }),
    );

    await channelRepository.delete({ id: channel.id });

    expect(await subscriptionRepository.count()).toBe(0);
  });

  it('should cascade-delete subscriptions when the subscriber is removed', async () => {
    const subscriber = await createUser();
    const channel = await createChannel();
    await subscriptionRepository.save(
      subscriptionRepository.create({
        user_id: subscriber.id,
        channel_id: channel.id,
      }),
    );

    await userRepository.delete({ id: subscriber.id });

    expect(await subscriptionRepository.count()).toBe(0);
  });
});
