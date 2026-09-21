import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Channel } from '../channels/entities/channel.entity';
import storageConfig from '../config/storage.config';
import {
  ChannelNotFoundException,
  ChannelNotOwnedException,
  FileSizeExceededException,
  InvalidVideoStateException,
} from '../common/exceptions/domain.exception';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { Video, VideoStatus } from './entities/video.entity';
import { VideosModule } from './videos.module';
import { VideosService } from './videos.service';

const ALL_ENTITIES = [User, Channel, Video];

async function createVideosTestModule(): Promise<TestingModule> {
  const ds = createTestDataSource(ALL_ENTITIES);
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [storageConfig] }),
      TypeOrmModule.forRoot(ds.options),
      VideosModule,
    ],
  }).compile();
}

describe('VideosService (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let videosService: VideosService;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;

  beforeAll(async () => {
    module = await createVideosTestModule();
    dataSource = module.get(DataSource);
    videosService = module.get(VideosService);
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createUserAndChannel(): Promise<{
    user: User;
    channel: Channel;
  }> {
    const user = await userRepository.save(
      userRepository.create({
        email: `videos_svc_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname: `channel-svc-${counter}`,
        user_id: user.id,
      }),
    );
    return { user, channel };
  }

  describe('initiateUpload', () => {
    it('throws ChannelNotFoundException for a non-existent channel', async () => {
      const { user } = await createUserAndChannel();

      await expect(
        videosService.initiateUpload(
          '00000000-0000-0000-0000-000000000000',
          user.id,
          { title: 'x', contentType: 'video/mp4', fileSizeBytes: 1024 },
        ),
      ).rejects.toThrow(ChannelNotFoundException);
    });

    it('throws ChannelNotOwnedException when requester is not the channel owner', async () => {
      const { channel } = await createUserAndChannel();
      const { user: otherUser } = await createUserAndChannel();

      await expect(
        videosService.initiateUpload(channel.id, otherUser.id, {
          title: 'x',
          contentType: 'video/mp4',
          fileSizeBytes: 1024,
        }),
      ).rejects.toThrow(ChannelNotOwnedException);
    });

    it('throws FileSizeExceededException above the 10GB limit', async () => {
      const { user, channel } = await createUserAndChannel();

      await expect(
        videosService.initiateUpload(channel.id, user.id, {
          title: 'x',
          contentType: 'video/mp4',
          fileSizeBytes: 10 * 1024 ** 3 + 1,
        }),
      ).rejects.toThrow(FileSizeExceededException);
    });

    it('creates a real multipart upload in storage and persists a draft video', async () => {
      const { user, channel } = await createUserAndChannel();

      const video = await videosService.initiateUpload(channel.id, user.id, {
        title: 'My video',
        contentType: 'video/mp4',
        fileSizeBytes: 2048,
      });

      expect(video.id).toBeDefined();
      expect(video.status).toBe(VideoStatus.DRAFT);
      expect(video.storage_upload_id).toBeTruthy();
      expect(video.storage_key).toBe(`videos/${video.id}/original.mp4`);

      const persisted = await videoRepository.findOneBy({ id: video.id });
      expect(persisted).not.toBeNull();
      expect(persisted!.channel_id).toBe(channel.id);
    }, 20000);
  });

  describe('requestUploadParts', () => {
    it('returns one pre-signed URL per requested part number', async () => {
      const { user, channel } = await createUserAndChannel();
      const video = await videosService.initiateUpload(channel.id, user.id, {
        title: 'My video',
        contentType: 'video/mp4',
        fileSizeBytes: 2048,
      });

      const parts = await videosService.requestUploadParts(video.id, user.id, {
        partNumbers: [1, 2],
      });

      expect(parts).toHaveLength(2);
      expect(parts[0].partNumber).toBe(1);
      expect(parts[0].url).toContain(video.storage_key);
      expect(parts[1].partNumber).toBe(2);
    }, 20000);

    it('throws InvalidVideoStateException once the video left draft', async () => {
      const { user, channel } = await createUserAndChannel();
      const video = await videosService.initiateUpload(channel.id, user.id, {
        title: 'My video',
        contentType: 'video/mp4',
        fileSizeBytes: 2048,
      });
      await videoRepository.update(video.id, { status: VideoStatus.READY });

      await expect(
        videosService.requestUploadParts(video.id, user.id, {
          partNumbers: [1],
        }),
      ).rejects.toThrow(InvalidVideoStateException);
    }, 20000);
  });
});
