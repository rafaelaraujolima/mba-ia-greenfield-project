import { DataSource, Repository } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Channel } from '../../channels/entities/channel.entity';
import { User } from '../../users/entities/user.entity';
import {
  cleanAllTables,
  createTestDataSource,
} from '../../test/create-test-data-source';
import { Video, VideoStatus, VideoVisibility } from './video.entity';

const ALL_ENTITIES = [User, Channel, Category, Video];

describe('Video entity (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createChannel(): Promise<Channel> {
    const user = await userRepository.save(
      userRepository.create({
        email: `video_user_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
    return channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname: `channel-${counter}`,
        user_id: user.id,
      }),
    );
  }

  function buildVideo(
    channelId: string,
    overrides: Partial<Video> = {},
  ): Partial<Video> {
    return {
      channel_id: channelId,
      title: 'My video',
      storage_key: `videos/${channelId}/original.mp4`,
      ...overrides,
    };
  }

  it('should persist a video with default status draft', async () => {
    const channel = await createChannel();
    const video = await videoRepository.save(
      videoRepository.create(buildVideo(channel.id)),
    );

    expect(video.id).toBeDefined();
    expect(video.status).toBe(VideoStatus.DRAFT);
    expect(video.created_at).toBeInstanceOf(Date);
  });

  it('should reject a video without channel_id', async () => {
    const video = videoRepository.create({
      title: 'No channel',
      storage_key: 'videos/x/original.mp4',
    } as Partial<Video>);

    await expect(videoRepository.save(video)).rejects.toThrow();
  });

  it('should reject an invalid enum value for status', async () => {
    const channel = await createChannel();
    const video = videoRepository.create(
      buildVideo(channel.id, { status: 'invalid' as VideoStatus }),
    );

    await expect(videoRepository.save(video)).rejects.toThrow();
  });

  it('should allow thumbnail_key, duration_seconds, width, height and error_message to be null', async () => {
    const channel = await createChannel();
    const video = await videoRepository.save(
      videoRepository.create(
        buildVideo(channel.id, {
          thumbnail_key: null,
          duration_seconds: null,
          width: null,
          height: null,
          error_message: null,
        }),
      ),
    );

    expect(video.thumbnail_key).toBeNull();
    expect(video.duration_seconds).toBeNull();
    expect(video.width).toBeNull();
    expect(video.height).toBeNull();
    expect(video.error_message).toBeNull();
  });

  it('should load the related channel via ManyToOne relation', async () => {
    const channel = await createChannel();
    await videoRepository.save(
      videoRepository.create(buildVideo(channel.id, { title: 'Rel video' })),
    );

    const found = await videoRepository.findOne({
      where: { title: 'Rel video' },
      relations: ['channel'],
    });

    expect(found?.channel.id).toBe(channel.id);
  });

  it('should persist category_id as null when no category is provided', async () => {
    const channel = await createChannel();
    const video = await videoRepository.save(
      videoRepository.create(buildVideo(channel.id)),
    );

    expect(video.category_id).toBeNull();
  });

  it('should default visibility to public', async () => {
    const channel = await createChannel();
    const video = await videoRepository.save(
      videoRepository.create(buildVideo(channel.id)),
    );

    expect(video.visibility).toBe(VideoVisibility.PUBLIC);
  });

  it('should persist published_at as null by default', async () => {
    const channel = await createChannel();
    const video = await videoRepository.save(
      videoRepository.create(buildVideo(channel.id)),
    );

    expect(video.published_at).toBeNull();
  });

  it('should load the related category via ManyToOne relation', async () => {
    const channel = await createChannel();
    const categoryRepository = dataSource.getRepository(Category);
    const category = await categoryRepository.save(
      categoryRepository.create({ name: 'Education' }),
    );
    await videoRepository.save(
      videoRepository.create(
        buildVideo(channel.id, {
          title: 'Cat video',
          category_id: category.id,
        }),
      ),
    );

    const found = await videoRepository.findOne({
      where: { title: 'Cat video' },
      relations: ['category'],
    });

    expect(found?.category?.id).toBe(category.id);
  });
});
