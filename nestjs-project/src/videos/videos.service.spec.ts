import {
  CategoryNotFoundException,
  ChannelNotFoundException,
  ChannelNotOwnedException,
  FileSizeExceededException,
  InvalidFileTypeException,
  InvalidMultipartCompletionException,
  InvalidVideoStateException,
  ThumbnailSizeExceededException,
  VideoNotFoundException,
  VideoNotOwnedException,
} from '../common/exceptions/domain.exception';
import { S3ServiceException } from '@aws-sdk/client-s3';
import { VideosService } from './videos.service';
import { VideoStatus } from './entities/video.entity';
import {
  MAX_THUMBNAIL_FILE_SIZE_BYTES,
  MAX_VIDEO_FILE_SIZE_BYTES,
  VIDEO_PROCESS_JOB,
} from './videos.constants';

function makeVideoRepository(overrides: Record<string, jest.Mock> = {}): any {
  return {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'video-id', ...data })),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    ...overrides,
  };
}

function makeChannelsService(overrides: Record<string, jest.Mock> = {}): any {
  return {
    findById: jest.fn(),
    ...overrides,
  };
}

function makeCategoriesService(overrides: Record<string, jest.Mock> = {}): any {
  return {
    findAll: jest.fn(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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
        makeCategoriesService(),
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

  describe('findOne', () => {
    it('throws VideoNotFoundException when the video does not exist', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(service.findOne('video-id')).rejects.toThrow(
        VideoNotFoundException,
      );
    });

    it('returns a ready video to an anonymous requester', async () => {
      const readyVideo = {
        id: 'video-id',
        status: VideoStatus.READY,
        channel: { user_id: 'owner-id' },
      };
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue(readyVideo),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      const result = await service.findOne('video-id');
      expect(result).toBe(readyVideo);
    });

    it('throws VideoNotFoundException for a non-ready video accessed by a non-owner', async () => {
      const draftVideo = {
        id: 'video-id',
        status: VideoStatus.DRAFT,
        channel: { user_id: 'owner-id' },
      };
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue(draftVideo),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(service.findOne('video-id', 'other-user')).rejects.toThrow(
        VideoNotFoundException,
      );
      await expect(service.findOne('video-id')).rejects.toThrow(
        VideoNotFoundException,
      );
    });

    it('returns a non-ready video to its owner', async () => {
      const draftVideo = {
        id: 'video-id',
        status: VideoStatus.DRAFT,
        channel: { user_id: 'owner-id' },
      };
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue(draftVideo),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      const result = await service.findOne('video-id', 'owner-id');
      expect(result).toBe(draftVideo);
    });
  });

  describe('update', () => {
    const dto = { title: 'New title' };

    it('throws VideoNotFoundException when the video does not exist', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(service.update('video-id', 'user-id', dto)).rejects.toThrow(
        VideoNotFoundException,
      );
    });

    it('throws VideoNotOwnedException when the video channel belongs to another user', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          channel: { user_id: 'other-user' },
        }),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(service.update('video-id', 'user-id', dto)).rejects.toThrow(
        VideoNotOwnedException,
      );
    });

    it('throws CategoryNotFoundException when categoryId does not match an existing category', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          channel: { user_id: 'user-id' },
        }),
      });
      const categoriesService = makeCategoriesService({
        findById: jest.fn().mockResolvedValue(null),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        categoriesService,
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.update('video-id', 'user-id', {
          categoryId: 'missing-category',
        }),
      ).rejects.toThrow(CategoryNotFoundException);
    });

    it('updates only the fields provided and persists the video', async () => {
      const video = {
        id: 'video-id',
        title: 'Old title',
        description: null,
        category_id: null,
        visibility: 'public',
        channel: { user_id: 'user-id' },
      };
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue(video),
        save: jest.fn((data) => Promise.resolve(data)),
      });
      const categoriesService = makeCategoriesService({
        findById: jest.fn().mockResolvedValue({ id: 'category-id' }),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        categoriesService,
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      const result = await service.update('video-id', 'user-id', {
        title: 'New title',
        categoryId: 'category-id',
      });

      expect(result.title).toBe('New title');
      expect(result.category_id).toBe('category-id');
      expect(result.description).toBeNull();
      expect(result.visibility).toBe('public');
    });
  });

  describe('updateThumbnail', () => {
    function makeFile(overrides: Partial<Express.Multer.File> = {}): any {
      return {
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('fake-image'),
        ...overrides,
      };
    }

    it('throws InvalidFileTypeException when the file is not an image', async () => {
      const service = new VideosService(
        makeVideoRepository(),
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.updateThumbnail(
          'video-id',
          'user-id',
          makeFile({ mimetype: 'application/pdf' }),
        ),
      ).rejects.toThrow(InvalidFileTypeException);
    });

    it('throws ThumbnailSizeExceededException when the file exceeds the limit', async () => {
      const service = new VideosService(
        makeVideoRepository(),
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.updateThumbnail(
          'video-id',
          'user-id',
          makeFile({ size: MAX_THUMBNAIL_FILE_SIZE_BYTES + 1 }),
        ),
      ).rejects.toThrow(ThumbnailSizeExceededException);
    });

    it('throws VideoNotOwnedException when the video channel belongs to another user', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          channel: { user_id: 'other-user' },
        }),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.updateThumbnail('video-id', 'user-id', makeFile()),
      ).rejects.toThrow(VideoNotOwnedException);
    });

    it('uploads the image and overwrites thumbnail_key', async () => {
      const video = {
        id: 'video-id',
        thumbnail_key: null,
        channel: { user_id: 'user-id' },
      };
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue(video),
        save: jest.fn((data) => Promise.resolve(data)),
      });
      const s3Client = makeS3Client({ send: jest.fn().mockResolvedValue({}) });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        s3Client,
        storageConfig,
        makeQueue(),
      );

      const result = await service.updateThumbnail(
        'video-id',
        'user-id',
        makeFile(),
      );

      expect(s3Client.send).toHaveBeenCalledTimes(1);
      expect(result.thumbnail_key).toBe('videos/video-id/thumbnail.jpg');
    });
  });

  describe('publish', () => {
    it('throws VideoNotOwnedException when the video channel belongs to another user', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          status: VideoStatus.READY,
          published_at: null,
          channel: { user_id: 'other-user' },
        }),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(service.publish('video-id', 'user-id')).rejects.toThrow(
        VideoNotOwnedException,
      );
    });

    it('throws InvalidVideoStateException when the video is not ready', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          status: VideoStatus.PROCESSING,
          published_at: null,
          channel: { user_id: 'user-id' },
        }),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(service.publish('video-id', 'user-id')).rejects.toThrow(
        InvalidVideoStateException,
      );
    });

    it('throws InvalidVideoStateException when the video is already published', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          status: VideoStatus.READY,
          published_at: new Date(),
          channel: { user_id: 'user-id' },
        }),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(service.publish('video-id', 'user-id')).rejects.toThrow(
        InvalidVideoStateException,
      );
    });

    it('sets published_at for a ready, unpublished video', async () => {
      const videoRepository = makeVideoRepository({
        findOne: jest.fn().mockResolvedValue({
          id: 'video-id',
          status: VideoStatus.READY,
          published_at: null,
          channel: { user_id: 'user-id' },
        }),
        save: jest.fn((data) => Promise.resolve(data)),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      const result = await service.publish('video-id', 'user-id');

      expect(result.published_at).toBeInstanceOf(Date);
    });
  });

  describe('findByChannel', () => {
    it('throws ChannelNotFoundException when the channel does not exist', async () => {
      const service = new VideosService(
        makeVideoRepository(),
        makeChannelsService({ findById: jest.fn().mockResolvedValue(null) }),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.findByChannel('channel-id', 'user-id', {}),
      ).rejects.toThrow(ChannelNotFoundException);
    });

    it('throws ChannelNotOwnedException when the channel belongs to another user', async () => {
      const service = new VideosService(
        makeVideoRepository(),
        makeChannelsService({
          findById: jest
            .fn()
            .mockResolvedValue({ id: 'channel-id', user_id: 'other-user' }),
        }),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.findByChannel('channel-id', 'user-id', {}),
      ).rejects.toThrow(ChannelNotOwnedException);
    });

    it('applies default pagination and translates page/pageSize to skip/take', async () => {
      const findAndCount = jest.fn().mockResolvedValue([[], 0]);
      const service = new VideosService(
        makeVideoRepository({ findAndCount }),
        makeChannelsService({
          findById: jest
            .fn()
            .mockResolvedValue({ id: 'channel-id', user_id: 'user-id' }),
        }),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      const result = await service.findByChannel('channel-id', 'user-id', {
        page: 3,
        pageSize: 10,
      });

      expect(findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result).toEqual({ items: [], page: 3, pageSize: 10, total: 0 });
    });

    it('defaults to page 1 and pageSize 20 when none are provided', async () => {
      const findAndCount = jest.fn().mockResolvedValue([[], 0]);
      const service = new VideosService(
        makeVideoRepository({ findAndCount }),
        makeChannelsService({
          findById: jest
            .fn()
            .mockResolvedValue({ id: 'channel-id', user_id: 'user-id' }),
        }),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      const result = await service.findByChannel('channel-id', 'user-id', {});

      expect(findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('getPlaybackUrl', () => {
    it('throws VideoNotFoundException when the video does not exist', async () => {
      const videoRepository = makeVideoRepository({
        findOneBy: jest.fn().mockResolvedValue(null),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.getPlaybackUrl('video-id', 'inline'),
      ).rejects.toThrow(VideoNotFoundException);
    });

    it('throws InvalidVideoStateException when the video is not ready', async () => {
      const videoRepository = makeVideoRepository({
        findOneBy: jest
          .fn()
          .mockResolvedValue({ id: 'video-id', status: VideoStatus.DRAFT }),
      });
      const service = new VideosService(
        videoRepository,
        makeChannelsService(),
        makeCategoriesService(),
        makeS3Client(),
        storageConfig,
        makeQueue(),
      );

      await expect(
        service.getPlaybackUrl('video-id', 'inline'),
      ).rejects.toThrow(InvalidVideoStateException);
    });
  });
});
