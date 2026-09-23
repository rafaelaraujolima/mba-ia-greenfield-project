import { Category } from '../categories/entities/category.entity';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  CreateMultipartUploadCommand,
  ListMultipartUploadsCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { Channel } from '../channels/entities/channel.entity';
import storageConfig from '../config/storage.config';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { S3_CLIENT } from '../storage/storage.constants';
import { User } from '../users/entities/user.entity';
import { UploadCleanupService } from './upload-cleanup.service';
import { Video, VideoStatus } from './entities/video.entity';
import { VideosModule } from './videos.module';

const ALL_ENTITIES = [User, Channel, Category, Video];
const BUCKET = 'streamtube';

async function createTestModule(): Promise<TestingModule> {
  const ds = createTestDataSource(ALL_ENTITIES);
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [storageConfig] }),
      TypeOrmModule.forRoot(ds.options),
      BullModule.forRoot({ connection: { host: 'redis', port: 6379 } }),
      VideosModule,
    ],
  }).compile();
}

describe('UploadCleanupService (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let s3Client: S3Client;
  let uploadCleanupService: UploadCleanupService;

  beforeAll(async () => {
    module = await createTestModule();
    dataSource = module.get(DataSource);
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    s3Client = module.get(S3_CLIENT);
    uploadCleanupService = module.get(UploadCleanupService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createUserAndChannel(): Promise<Channel> {
    const user = await userRepository.save(
      userRepository.create({
        email: `upload_cleanup_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
    return channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname: `channel-cleanup-${counter}`,
        user_id: user.id,
      }),
    );
  }

  async function createVideo(
    channelId: string,
    overrides: Partial<Video> = {},
  ): Promise<Video> {
    const video = await videoRepository.save(
      videoRepository.create({
        channel_id: channelId,
        title: 'My video',
        status: VideoStatus.DRAFT,
        storage_key: `videos/${channelId}/original.mp4`,
        ...overrides,
      }),
    );
    return video;
  }

  async function backdateUpdatedAt(videoId: string, date: Date): Promise<void> {
    await dataSource.query(
      'UPDATE "videos" SET updated_at = $1 WHERE id = $2',
      [date, videoId],
    );
  }

  describe('cleanupOrphanDrafts', () => {
    it('marks a stale draft as error with an explanatory error_message', async () => {
      const channel = await createUserAndChannel();
      const video = await createVideo(channel.id);
      await backdateUpdatedAt(
        video.id,
        new Date(Date.now() - 48 * 60 * 60 * 1000),
      );

      await uploadCleanupService.cleanupOrphanDrafts();

      const persisted = await videoRepository.findOneByOrFail({ id: video.id });
      expect(persisted.status).toBe(VideoStatus.ERROR);
      expect(persisted.error_message).toBeTruthy();
    });

    it('does not touch a recent draft', async () => {
      const channel = await createUserAndChannel();
      const video = await createVideo(channel.id);

      await uploadCleanupService.cleanupOrphanDrafts();

      const persisted = await videoRepository.findOneByOrFail({ id: video.id });
      expect(persisted.status).toBe(VideoStatus.DRAFT);
      expect(persisted.error_message).toBeNull();
    });

    it('does not touch videos already in ready, processing, or error', async () => {
      const channel = await createUserAndChannel();
      const ready = await createVideo(channel.id, {
        status: VideoStatus.READY,
      });
      const processing = await createVideo(channel.id, {
        status: VideoStatus.PROCESSING,
      });
      const error = await createVideo(channel.id, {
        status: VideoStatus.ERROR,
        error_message: 'pre-existing',
      });
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      await backdateUpdatedAt(ready.id, oldDate);
      await backdateUpdatedAt(processing.id, oldDate);
      await backdateUpdatedAt(error.id, oldDate);

      await uploadCleanupService.cleanupOrphanDrafts();

      expect(
        (await videoRepository.findOneByOrFail({ id: ready.id })).status,
      ).toBe(VideoStatus.READY);
      expect(
        (await videoRepository.findOneByOrFail({ id: processing.id })).status,
      ).toBe(VideoStatus.PROCESSING);
      const persistedError = await videoRepository.findOneByOrFail({
        id: error.id,
      });
      expect(persistedError.status).toBe(VideoStatus.ERROR);
      expect(persistedError.error_message).toBe('pre-existing');
    });
  });

  describe('cleanupAbandonedMultipartUploads', () => {
    async function startMultipartUpload(): Promise<{
      key: string;
      uploadId: string;
    }> {
      const key = `videos/cleanup-test-${Date.now()}-${Math.random()}/original.mp4`;
      const { UploadId } = await s3Client.send(
        new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key }),
      );
      return { key, uploadId: UploadId! };
    }

    async function listsUpload(key: string): Promise<boolean> {
      const { Uploads } = await s3Client.send(
        new ListMultipartUploadsCommand({ Bucket: BUCKET }),
      );
      return (Uploads ?? []).some((upload) => upload.Key === key);
    }

    it('aborts an abandoned multipart upload older than the configured TTL', async () => {
      const { key } = await startMultipartUpload();
      expect(await listsUpload(key)).toBe(true);

      const expiredCleanupService = new UploadCleanupService(
        videoRepository,
        s3Client,
        { ...storageConfig(), bucket: BUCKET, multipartLifecycleDays: 0 },
      );
      // Give the "Initiated" timestamp a moment to be strictly before "now".
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await expiredCleanupService.cleanupAbandonedMultipartUploads();

      expect(await listsUpload(key)).toBe(false);
    }, 20000);

    it('does not abort a recently started multipart upload', async () => {
      const { key } = await startMultipartUpload();

      await uploadCleanupService.cleanupAbandonedMultipartUploads();

      expect(await listsUpload(key)).toBe(true);
    }, 20000);
  });
});
