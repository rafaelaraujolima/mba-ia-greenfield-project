import {
  ChannelNotFoundException,
  ChannelNotOwnedException,
  FileSizeExceededException,
  InvalidMultipartCompletionException,
  InvalidVideoStateException,
  VideoNotFoundException,
  VideoNotOwnedException,
} from '../common/exceptions/domain.exception';
import { S3ServiceException } from '@aws-sdk/client-s3';
import { VideosService } from './videos.service';
import { VideoStatus } from './entities/video.entity';
import {
  MAX_VIDEO_FILE_SIZE_BYTES,
  VIDEO_PROCESS_JOB,
} from './videos.constants';

function makeVideoRepository(overrides: Record<string, jest.Mock> = {}): any {
  return {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'video-id', ...data })),
    findOne: jest.fn(),
    ...overrides,
  };
}

function makeChannelsService(overrides: Record<string, jest.Mock> = {}): any {
  return {
    findById: jest.fn(),
    ...overrides,
  };
}

function makeS3Client(overrides: Record<string, jest.Mock> = {}): any {
  return {
    send: jest.fn(),
    ...overrides,
  };
}

function makeQueue(overrides: Record<string, jest.Mock> = {}): any {
  return {
    add: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const storageConfig = { bucket: 'streamtube' } as any;

describe('VideosService', () => {
  describe('initiateUpload', () => {
    const dto = {
      title: 'My video',
      contentType: 'video/mp4',
      fileSizeBytes: 1024,
    };

    it('throws ChannelNotFoundException when the channel does not exist', async () => {
      const channelsService = makeChannelsService({
        findById: jest.fn().mockResolvedValue(null),
      });
      const service = new VideosService(
        makeVideoRepository(),
        channelsService,
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.initiateUpload('channel-id', 'user-id', dto),
      ).rejects.toThrow(ChannelNotFoundException);
    });

    it('throws ChannelNotOwnedException when the channel belongs to another user', async () => {
      const channelsService = makeChannelsService({
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'channel-id', user_id: 'other-user' }),
      });
      const service = new VideosService(
        makeVideoRepository(),
        channelsService,
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.initiateUpload('channel-id', 'user-id', dto),
      ).rejects.toThrow(ChannelNotOwnedException);
    });

    it('throws FileSizeExceededException when fileSizeBytes exceeds the 10GB limit', async () => {
      const channelsService = makeChannelsService({
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'channel-id', user_id: 'user-id' }),
      });
      const service = new VideosService(
        makeVideoRepository(),
        channelsService,
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.initiateUpload('channel-id', 'user-id', {
          ...dto,
          fileSizeBytes: MAX_VIDEO_FILE_SIZE_BYTES + 1,
        }),
      ).rejects.toThrow(FileSizeExceededException);
    });

    it('creates the multipart upload and persists a draft video when owned and within limits', async () => {
      const channelsService = makeChannelsService({
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'channel-id', user_id: 'user-id' }),
      });
      const s3Client = makeS3Client({
        send: jest.fn().mockResolvedValue({ UploadId: 'upload-123' }),
      });
      const videoRepository = makeVideoRepository();
      const service = new VideosService(
        videoRepository,
        channelsService,
        s3Client,
        storageConfig,
        makeQueue(),
      );

      const video = await service.initiateUpload('channel-id', 'user-id', dto);

      expect(s3Client.send).toHaveBeenCalledTimes(1);
      expect(videoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel_id: 'channel-id',
          title: 'My video',
          content_type: 'video/mp4',
          storage_upload_id: 'upload-123',
        }),
      );
      expect(video.storage_upload_id).toBe('upload-123');
    });
  });

  describe('requestUploadParts', () => {
    const dto = { partNumbers: [1, 2] };

    it('throws VideoNotFoundException when the video does not exist', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.requestUploadParts('video-id', 'user-id', dto),
      ).rejects.toThrow(VideoNotFoundException);
    });

    it('throws VideoNotOwnedException when the video channel belongs to another user', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          status: VideoStatus.DRAFT,
          channel: { user_id: 'other-user' },
        }),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.requestUploadParts('video-id', 'user-id', dto),
      ).rejects.toThrow(VideoNotOwnedException);
    });

    it('throws InvalidVideoStateException when the video is not in draft', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          status: VideoStatus.PROCESSING,
          channel: { user_id: 'user-id' },
        }),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.requestUploadParts('video-id', 'user-id', dto),
      ).rejects.toThrow(InvalidVideoStateException);
    });
  });

  describe('completeUpload', () => {
    const dto = { parts: [{ partNumber: 1, eTag: 'etag-1' }] };

    it('throws VideoNotFoundException when the video does not exist', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.completeUpload('video-id', 'user-id', dto),
      ).rejects.toThrow(VideoNotFoundException);
    });

    it('throws VideoNotOwnedException when the video channel belongs to another user', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          status: VideoStatus.DRAFT,
          channel: { user_id: 'other-user' },
        }),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.completeUpload('video-id', 'user-id', dto),
      ).rejects.toThrow(VideoNotOwnedException);
    });

    it('throws InvalidVideoStateException when the video is not in draft', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          status: VideoStatus.READY,
          channel: { user_id: 'user-id' },
        }),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.completeUpload('video-id', 'user-id', dto),
      ).rejects.toThrow(InvalidVideoStateException);
    });

    it('throws InvalidMultipartCompletionException when S3 rejects the parts', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          status: VideoStatus.DRAFT,
          storage_key: 'videos/video-id/original.mp4',
          storage_upload_id: 'upload-123',
          channel: { user_id: 'user-id' },
        }),
      });
      const s3Error = new S3ServiceException({
        name: 'InvalidPart',
        $fault: 'client',
        $metadata: {},
        message: 'One or more of the specified parts could not be found',
      });
      const s3Client = makeS3Client({
        send: jest.fn().mockRejectedValue(s3Error),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        s3Client,
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.completeUpload('video-id', 'user-id', dto),
      ).rejects.toThrow(InvalidMultipartCompletionException);
    });

    it('re-throws non-S3 errors unchanged', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          status: VideoStatus.DRAFT,
          storage_key: 'videos/video-id/original.mp4',
          storage_upload_id: 'upload-123',
          channel: { user_id: 'user-id' },
        }),
      });
      const s3Client = makeS3Client({
        send: jest.fn().mockRejectedValue(new Error('network down')),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        s3Client,
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.completeUpload('video-id', 'user-id', dto),
      ).rejects.toThrow('network down');
    });

    it('completes the upload, transitions to processing, and enqueues the job', async () => {
      const video = {
        id: 'video-id',
        status: VideoStatus.DRAFT,
        storage_key: 'videos/video-id/original.mp4',
        storage_upload_id: 'upload-123',
        channel: { user_id: 'user-id' },
      };
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue(video),
        save: jest.fn((data) => Promise.resolve(data)),
      });
      const s3Client = makeS3Client({
        send: jest.fn().mockResolvedValue({}),
      });
      const queue = makeQueue();
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        s3Client,
        storageConfig,
        queue,
      );

      const result = await service.completeUpload('video-id', 'user-id', dto);

      expect(result.status).toBe(VideoStatus.PROCESSING);
      expect(result.storage_upload_id).toBeNull();
      expect(queue.add).toHaveBeenCalledWith(
        VIDEO_PROCESS_JOB,
        { videoId: 'video-id' },
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });
});
