import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UploadPartCommand, type S3Client } from '@aws-sdk/client-s3';
import type { Queue } from 'bullmq';
import { Category } from '../categories/entities/category.entity';
import { Channel } from '../channels/entities/channel.entity';
import storageConfig from '../config/storage.config';
import {
  ChannelNotFoundException,
  ChannelNotOwnedException,
  FileSizeExceededException,
  InvalidMultipartCompletionException,
  InvalidVideoStateException,
  VideoNotFoundException,
} from '../common/exceptions/domain.exception';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { S3_CLIENT } from '../storage/storage.constants';
import { User } from '../users/entities/user.entity';
import { Video, VideoStatus, VideoVisibility } from './entities/video.entity';
import { VideosModule } from './videos.module';
import { VideosService } from './videos.service';
import { VIDEO_PROCESSING_QUEUE, VIDEO_PROCESS_JOB } from './videos.constants';

const ALL_ENTITIES = [User, Channel, Category, Video];

async function createVideosTestModule(): Promise<TestingModule> {
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

describe('VideosService (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let videosService: VideosService;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let s3Client: S3Client;
  let videoProcessingQueue: Queue;

  beforeAll(async () => {
    module = await createVideosTestModule();
    dataSource = module.get(DataSource);
    videosService = module.get(VideosService);
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    s3Client = module.get(S3_CLIENT);
    videoProcessingQueue = module.get(getQueueToken(VIDEO_PROCESSING_QUEUE));
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

  describe('completeUpload', () => {
    async function initiateDraftAndUploadPart(
      userId: string,
      channelId: string,
    ): Promise<{ video: Video; eTag: string }> {
      const video = await videosService.initiateUpload(channelId, userId, {
        title: 'My video',
        contentType: 'video/mp4',
        fileSizeBytes: 2048,
      });
      const uploadResult = await s3Client.send(
        new UploadPartCommand({
          Bucket: 'streamtube',
          Key: video.storage_key,
          UploadId: video.storage_upload_id!,
          PartNumber: 1,
          Body: Buffer.from('fake video bytes'),
        }),
      );
      return { video, eTag: uploadResult.ETag! };
    }

    it('completes the upload, transitions to processing, and enqueues a video.process job', async () => {
      const { user, channel } = await createUserAndChannel();
      const { video, eTag } = await initiateDraftAndUploadPart(
        user.id,
        channel.id,
      );
      const addSpy = jest.spyOn(videoProcessingQueue, 'add');

      const completed = await videosService.completeUpload(video.id, user.id, {
        parts: [{ partNumber: 1, eTag }],
      });

      expect(completed.status).toBe(VideoStatus.PROCESSING);
      expect(completed.storage_upload_id).toBeNull();

      const persisted = await videoRepository.findOneBy({ id: video.id });
      expect(persisted!.status).toBe(VideoStatus.PROCESSING);

      expect(addSpy).toHaveBeenCalledWith(
        VIDEO_PROCESS_JOB,
        { videoId: video.id },
        expect.objectContaining({ attempts: 3 }),
      );
    }, 20000);

    it('throws InvalidMultipartCompletionException for a wrong ETag', async () => {
      const { user, channel } = await createUserAndChannel();
      const { video } = await initiateDraftAndUploadPart(user.id, channel.id);

      await expect(
        videosService.completeUpload(video.id, user.id, {
          parts: [{ partNumber: 1, eTag: '"not-the-real-etag"' }],
        }),
      ).rejects.toThrow(InvalidMultipartCompletionException);
    }, 20000);

    it('throws InvalidVideoStateException once the video left draft', async () => {
      const { user, channel } = await createUserAndChannel();
      const { video, eTag } = await initiateDraftAndUploadPart(
        user.id,
        channel.id,
      );
      await videoRepository.update(video.id, { status: VideoStatus.READY });

      await expect(
        videosService.completeUpload(video.id, user.id, {
          parts: [{ partNumber: 1, eTag }],
        }),
      ).rejects.toThrow(InvalidVideoStateException);
    }, 20000);
  });

  describe('getPlaybackUrl', () => {
    it('generates a pre-signed inline URL for a ready video', async () => {
      const { channel } = await createUserAndChannel();
      const video = await videoRepository.save(
        videoRepository.create({
          channel_id: channel.id,
          title: 'Ready video',
          status: VideoStatus.READY,
          storage_key: `videos/${channel.id}/original.mp4`,
        }),
      );

      const url = await videosService.getPlaybackUrl(video.id, 'inline');

      expect(url).toContain(video.storage_key);
      expect(url).not.toContain('response-content-disposition');
    });

    it('generates a pre-signed attachment URL for a ready video', async () => {
      const { channel } = await createUserAndChannel();
      const video = await videoRepository.save(
        videoRepository.create({
          channel_id: channel.id,
          title: 'Ready video',
          status: VideoStatus.READY,
          storage_key: `videos/${channel.id}/original.mp4`,
        }),
      );

      const url = await videosService.getPlaybackUrl(video.id, 'attachment');

      expect(url).toContain('response-content-disposition=attachment');
    });

    it('throws InvalidVideoStateException for a non-ready video', async () => {
      const { channel } = await createUserAndChannel();
      const video = await videoRepository.save(
        videoRepository.create({
          channel_id: channel.id,
          title: 'Draft video',
          status: VideoStatus.DRAFT,
          storage_key: `videos/${channel.id}/original.mp4`,
        }),
      );

      await expect(
        videosService.getPlaybackUrl(video.id, 'inline'),
      ).rejects.toThrow(InvalidVideoStateException);
    });

    it('throws VideoNotFoundException for a non-existent video', async () => {
      await expect(
        videosService.getPlaybackUrl(
          '00000000-0000-0000-0000-000000000000',
          'inline',
        ),
      ).rejects.toThrow(VideoNotFoundException);
    });
  });

  describe('findPublicByChannel', () => {
    async function createVideoWith(
      channelId: string,
      overrides: Partial<Video>,
    ) {
      return videoRepository.save(
        videoRepository.create({
          channel_id: channelId,
          title: 'Video',
          storage_key: `videos/${channelId}/x.mp4`,
          ...overrides,
        }),
      );
    }

    it('throws ChannelNotFoundException for an unknown nickname', async () => {
      await expect(
        videosService.findPublicByChannel('unknown-nick', {}),
      ).rejects.toThrow(ChannelNotFoundException);
    });

    it('returns only ready, public and published videos', async () => {
      const { channel } = await createUserAndChannel();
      const visible = await createVideoWith(channel.id, {
        title: 'Visible',
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date(),
      });
      await createVideoWith(channel.id, {
        title: 'Unpublished',
        status: VideoStatus.READY,
        published_at: null,
      });
      await createVideoWith(channel.id, {
        title: 'Unlisted',
        status: VideoStatus.READY,
        visibility: VideoVisibility.UNLISTED,
        published_at: new Date(),
      });
      await createVideoWith(channel.id, {
        title: 'Processing',
        status: VideoStatus.PROCESSING,
        published_at: new Date(),
      });

      const result = await videosService.findPublicByChannel(
        channel.nickname,
        {},
      );

      expect(result.total).toBe(1);
      expect(result.items.map((v) => v.id)).toEqual([visible.id]);
    });

    it('does not return public videos of other channels', async () => {
      const { channel } = await createUserAndChannel();
      const other = await createUserAndChannel();
      await createVideoWith(other.channel.id, {
        status: VideoStatus.READY,
        published_at: new Date(),
      });

      const result = await videosService.findPublicByChannel(
        channel.nickname,
        {},
      );

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findByChannel', () => {
    async function createVideos(channelId: string, count: number) {
      for (let i = 1; i <= count; i++) {
        await videoRepository.save(
          videoRepository.create({
            channel_id: channelId,
            title: `Video ${i}`,
            storage_key: `videos/${channelId}/${i}.mp4`,
          }),
        );
      }
    }

    it('returns only the videos of the requested channel, with the total count', async () => {
      const { user, channel } = await createUserAndChannel();
      const other = await createUserAndChannel();
      await createVideos(channel.id, 3);
      await createVideos(other.channel.id, 2);

      const result = await videosService.findByChannel(channel.id, user.id, {});

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(3);
      expect(result.items.every((v) => v.channel_id === channel.id)).toBe(true);
    });

    it('paginates the results using page and pageSize', async () => {
      const { user, channel } = await createUserAndChannel();
      await createVideos(channel.id, 5);

      const page1 = await videosService.findByChannel(channel.id, user.id, {
        page: 1,
        pageSize: 2,
      });
      const page3 = await videosService.findByChannel(channel.id, user.id, {
        page: 3,
        pageSize: 2,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page3.items).toHaveLength(1);
    });

    it('returns an empty items array when page is beyond the total', async () => {
      const { user, channel } = await createUserAndChannel();
      await createVideos(channel.id, 2);

      const result = await videosService.findByChannel(channel.id, user.id, {
        page: 5,
        pageSize: 10,
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(2);
    });
  });
});
