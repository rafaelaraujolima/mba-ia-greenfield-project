import { DataSource, Repository } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Channel } from '../../channels/entities/channel.entity';
import {
  cleanAllTables,
  createTestDataSource,
} from '../../test/create-test-data-source';
import { User } from '../../users/entities/user.entity';
import { Video } from '../../videos/entities/video.entity';
import { Comment } from './comment.entity';

const ALL_ENTITIES = [User, Channel, Category, Video, Comment];

describe('Comment entity (integration)', () => {
  let dataSource: DataSource;
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
        email: `comment_user_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
  }

  async function createVideo(): Promise<Video> {
    const owner = await createUser();
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname: `comment-channel-${counter}`,
        user_id: owner.id,
      }),
    );
    return videoRepository.save(
      videoRepository.create({
        channel_id: channel.id,
        title: 'Commented video',
        storage_key: `videos/${channel.id}/original.mp4`,
      }),
    );
  }

  it('should persist a top-level comment with a null parent_id', async () => {
    const author = await createUser();
    const video = await createVideo();

    const comment = await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: author.id,
        body: 'First!',
      }),
    );

    expect(comment.id).toBeDefined();
    expect(comment.parent_id).toBeNull();
    expect(comment.created_at).toBeInstanceOf(Date);
  });

  it('should persist a reply pointing at its parent comment', async () => {
    const author = await createUser();
    const video = await createVideo();
    const parent = await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: author.id,
        body: 'Parent',
      }),
    );

    const reply = await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: author.id,
        parent_id: parent.id,
        body: 'Reply',
      }),
    );

    const reloaded = await commentRepository.findOneOrFail({
      where: { id: reply.id },
      relations: { parent: true },
    });
    expect(reloaded.parent?.id).toBe(parent.id);
  });

  it('should reject a comment without a body', async () => {
    const author = await createUser();
    const video = await createVideo();

    await expect(
      commentRepository.save(
        commentRepository.create({
          video_id: video.id,
          user_id: author.id,
        } as Partial<Comment>),
      ),
    ).rejects.toThrow(/null value|not-null|body/i);
  });

  it('should cascade-delete replies when the parent comment is removed', async () => {
    const author = await createUser();
    const video = await createVideo();
    const parent = await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: author.id,
        body: 'Parent',
      }),
    );
    await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: author.id,
        parent_id: parent.id,
        body: 'Reply',
      }),
    );

    await commentRepository.delete({ id: parent.id });

    expect(await commentRepository.count()).toBe(0);
  });

  it('should cascade-delete comments when the video is removed', async () => {
    const author = await createUser();
    const video = await createVideo();
    await commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: author.id,
        body: 'Gone with the video',
      }),
    );

    await videoRepository.delete({ id: video.id });

    expect(await commentRepository.count()).toBe(0);
  });
});
