import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import type { ConfigType } from '@nestjs/config';
import { In, IsNull, Not, Repository } from 'typeorm';
import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3ServiceException,
  UploadPartCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Queue } from 'bullmq';
import type Redis from 'ioredis';
import { CategoriesService } from '../categories/categories.service';
import { ChannelsService } from '../channels/channels.service';
import storageConfig from '../config/storage.config';
import { S3_CLIENT, S3_PRESIGN_CLIENT } from '../storage/storage.constants';
import { REDIS_CLIENT } from '../redis/redis.constants';
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
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { ListChannelVideosDto } from './dto/list-channel-videos.dto';
import { RequestUploadPartsDto } from './dto/request-upload-parts.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Video, VideoStatus, VideoVisibility } from './entities/video.entity';
import type { VideoProcessJobData } from './video-process.types';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SUGGESTIONS_LIMIT,
  MAX_THUMBNAIL_FILE_SIZE_BYTES,
  MAX_VIDEO_FILE_SIZE_BYTES,
  VIDEO_PROCESSING_QUEUE,
  VIDEO_PROCESS_JOB,
  VIEW_COUNT_KEY_PREFIX,
  VIEW_DEDUP_KEY_PREFIX,
  VIEW_DEDUP_TTL_SECONDS,
} from './videos.constants';

const UPLOAD_PART_URL_EXPIRATION_SECONDS = 900;
const VIDEO_PROCESS_JOB_ATTEMPTS = 3;
const VIDEO_PROCESS_JOB_BACKOFF_DELAY_MS = 5000;
const PLAYBACK_URL_EXPIRATION_SECONDS = 900;
const THUMBNAIL_URL_EXPIRATION_SECONDS = 900;

export type PlaybackDisposition = 'inline' | 'attachment';

export interface UploadPartUrl {
  partNumber: number;
  url: string;
}

export interface PaginatedVideos {
  items: Video[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    private readonly channelsService: ChannelsService,
    private readonly categoriesService: CategoriesService,
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    @Inject(S3_PRESIGN_CLIENT) private readonly s3PresignClient: S3Client,
    @Inject(storageConfig.KEY)
    private readonly storage: ConfigType<typeof storageConfig>,
    @InjectQueue(VIDEO_PROCESSING_QUEUE)
    private readonly videoProcessingQueue: Queue<VideoProcessJobData>,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  async initiateUpload(
    channelId: string,
    userId: string,
    dto: CreateVideoDto,
  ): Promise<Video> {
    const channel = await this.channelsService.findById(channelId);
    if (!channel) throw new ChannelNotFoundException();
    if (channel.user_id !== userId) throw new ChannelNotOwnedException();
    if (dto.fileSizeBytes > MAX_VIDEO_FILE_SIZE_BYTES) {
      throw new FileSizeExceededException();
    }

    const id = randomUUID();
    const extension = dto.contentType.split('/')[1] || 'bin';
    const storageKey = `videos/${id}/original.${extension}`;

    const { UploadId } = await this.s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.storage.bucket,
        Key: storageKey,
        ContentType: dto.contentType,
      }),
    );

    const video = this.videoRepository.create({
      id,
      channel_id: channelId,
      title: dto.title,
      content_type: dto.contentType,
      file_size_bytes: String(dto.fileSizeBytes),
      storage_key: storageKey,
      storage_upload_id: UploadId,
    });

    return this.videoRepository.save(video);
  }

  async requestUploadParts(
    videoId: string,
    userId: string,
    dto: RequestUploadPartsDto,
  ): Promise<UploadPartUrl[]> {
    const video = await this.findOwnedVideoOrFail(videoId, userId);
    if (video.status !== VideoStatus.DRAFT) {
      throw new InvalidVideoStateException();
    }

    return Promise.all(
      dto.partNumbers.map(async (partNumber) => ({
        partNumber,
        url: await getSignedUrl(
          this.s3Client,
          new UploadPartCommand({
            Bucket: this.storage.bucket,
            Key: video.storage_key,
            UploadId: video.storage_upload_id!,
            PartNumber: partNumber,
          }),
          { expiresIn: UPLOAD_PART_URL_EXPIRATION_SECONDS },
        ),
      })),
    );
  }

  async completeUpload(
    videoId: string,
    userId: string,
    dto: CompleteUploadDto,
  ): Promise<Video> {
    const video = await this.findOwnedVideoOrFail(videoId, userId);
    if (video.status !== VideoStatus.DRAFT) {
      throw new InvalidVideoStateException();
    }

    try {
      await this.s3Client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.storage.bucket,
          Key: video.storage_key,
          UploadId: video.storage_upload_id!,
          MultipartUpload: {
            Parts: dto.parts.map((part) => ({
              PartNumber: part.partNumber,
              ETag: part.eTag,
            })),
          },
        }),
      );
    } catch (err) {
      if (err instanceof S3ServiceException) {
        throw new InvalidMultipartCompletionException();
      }
      throw err;
    }

    video.status = VideoStatus.PROCESSING;
    video.storage_upload_id = null;
    const savedVideo = await this.videoRepository.save(video);

    await this.videoProcessingQueue.add(
      VIDEO_PROCESS_JOB,
      { videoId: savedVideo.id },
      {
        attempts: VIDEO_PROCESS_JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: VIDEO_PROCESS_JOB_BACKOFF_DELAY_MS,
        },
      },
    );

    return savedVideo;
  }

  async findOne(videoId: string, userId?: string): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['channel'],
    });
    if (!video) throw new VideoNotFoundException();

    this.assertViewable(video, userId);

    return video;
  }

  /**
   * Unified anonymous-visibility rule (video-watch-page/TD-08): the owner sees
   * the video in any status; anyone else (anonymous or not) only sees it when
   * it is ready, published, and public/unlisted. Replaces the narrower
   * `status === READY`-only checks previously duplicated across
   * `findOne`/`getPlaybackUrl`, which leaked draft/private videos anonymously.
   */
  private assertViewable(video: Video, userId?: string): void {
    const isOwner = userId != null && video.channel.user_id === userId;
    if (isOwner) return;

    const isVisibleToViewers =
      video.status === VideoStatus.READY &&
      video.published_at !== null &&
      (video.visibility === VideoVisibility.PUBLIC ||
        video.visibility === VideoVisibility.UNLISTED);
    if (!isVisibleToViewers) {
      throw new VideoNotFoundException();
    }
  }

  async getViewCount(videoId: string): Promise<number> {
    const count = await this.redisClient.get(
      `${VIEW_COUNT_KEY_PREFIX}${videoId}`,
    );
    return count != null ? parseInt(count, 10) : 0;
  }

  /**
   * Registers a view with per-client dedup (video-watch-page/TD-02): a Redis
   * key with TTL marks the client as having counted a view for this video;
   * while that key is alive, repeated calls from the same client don't
   * increment the counter again.
   */
  async registerView(videoId: string, clientKey: string): Promise<void> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['channel'],
    });
    if (!video) throw new VideoNotFoundException();

    this.assertViewable(video);

    const dedupKey = `${VIEW_DEDUP_KEY_PREFIX}${videoId}:${clientKey}`;
    const dedupSet = await this.redisClient.set(
      dedupKey,
      '1',
      'EX',
      VIEW_DEDUP_TTL_SECONDS,
      'NX',
    );
    if (dedupSet === null) return;

    await this.redisClient.incr(`${VIEW_COUNT_KEY_PREFIX}${videoId}`);
  }

  async update(
    videoId: string,
    userId: string,
    dto: UpdateVideoDto,
  ): Promise<Video> {
    const video = await this.findOwnedVideoOrFail(videoId, userId);

    if (dto.categoryId !== undefined) {
      const category = await this.categoriesService.findById(dto.categoryId);
      if (!category) throw new CategoryNotFoundException();
      video.category_id = dto.categoryId;
    }
    if (dto.title !== undefined) video.title = dto.title;
    if (dto.description !== undefined) video.description = dto.description;
    if (dto.visibility !== undefined) video.visibility = dto.visibility;

    return this.videoRepository.save(video);
  }

  async updateThumbnail(
    videoId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<Video> {
    if (!file.mimetype.startsWith('image/')) {
      throw new InvalidFileTypeException();
    }
    if (file.size > MAX_THUMBNAIL_FILE_SIZE_BYTES) {
      throw new ThumbnailSizeExceededException();
    }

    const video = await this.findOwnedVideoOrFail(videoId, userId);
    const thumbnailKey = `videos/${video.id}/thumbnail.jpg`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.storage.bucket,
        Key: thumbnailKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    video.thumbnail_key = thumbnailKey;
    return this.videoRepository.save(video);
  }

  async publish(videoId: string, userId: string): Promise<Video> {
    const video = await this.findOwnedVideoOrFail(videoId, userId);
    if (video.status !== VideoStatus.READY || video.published_at !== null) {
      throw new InvalidVideoStateException();
    }

    video.published_at = new Date();
    return this.videoRepository.save(video);
  }

  async findByChannel(
    channelId: string,
    userId: string,
    { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE }: ListChannelVideosDto,
  ): Promise<PaginatedVideos> {
    const channel = await this.channelsService.findById(channelId);
    if (!channel) throw new ChannelNotFoundException();
    if (channel.user_id !== userId) throw new ChannelNotOwnedException();

    const [items, total] = await this.videoRepository.findAndCount({
      where: { channel_id: channelId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, page, pageSize, total };
  }

  async findPublicByChannel(
    nickname: string,
    { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE }: ListChannelVideosDto,
  ): Promise<PaginatedVideos> {
    const channel = await this.channelsService.findByNickname(nickname);
    if (!channel) throw new ChannelNotFoundException();

    const [items, total] = await this.videoRepository.findAndCount({
      where: {
        channel_id: channel.id,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: Not(IsNull()),
      },
      order: { published_at: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, page, pageSize, total };
  }

  /**
   * Sugestões de vídeos relacionados (video-watch-page/TD-03): prioriza
   * vídeos públicos da mesma categoria do vídeo de origem; completa com
   * vídeos públicos gerais quando a categoria não tem o suficiente.
   */
  async getSuggestions(
    videoId: string,
    limit: number = DEFAULT_SUGGESTIONS_LIMIT,
  ): Promise<Video[]> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['channel'],
    });
    if (!video) throw new VideoNotFoundException();

    this.assertViewable(video);

    const sameCategory =
      video.category_id != null
        ? await this.videoRepository.find({
            where: {
              category_id: video.category_id,
              status: VideoStatus.READY,
              visibility: VideoVisibility.PUBLIC,
              published_at: Not(IsNull()),
              id: Not(video.id),
            },
            relations: ['channel'],
            order: { published_at: 'DESC' },
            take: limit,
          })
        : [];

    if (sameCategory.length >= limit) return sameCategory;

    const excludeIds = [video.id, ...sameCategory.map((v) => v.id)];
    const fallback = await this.videoRepository.find({
      where: {
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: Not(IsNull()),
        id: Not(In(excludeIds)),
      },
      relations: ['channel'],
      order: { published_at: 'DESC' },
      take: limit - sameCategory.length,
    });

    return [...sameCategory, ...fallback];
  }

  async getPlaybackUrl(
    videoId: string,
    disposition: PlaybackDisposition,
    userId?: string,
  ): Promise<string> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['channel'],
    });
    if (!video) throw new VideoNotFoundException();

    this.assertViewable(video, userId);

    return getSignedUrl(
      this.s3PresignClient,
      new GetObjectCommand({
        Bucket: this.storage.bucket,
        Key: video.storage_key,
        ...(disposition === 'attachment' && {
          ResponseContentDisposition: 'attachment',
        }),
      }),
      { expiresIn: PLAYBACK_URL_EXPIRATION_SECONDS },
    );
  }

  async getThumbnailUrl(videoId: string, userId?: string): Promise<string> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['channel'],
    });
    if (!video) throw new VideoNotFoundException();

    const isOwner = userId != null && video.channel.user_id === userId;
    const isVisibleToPublic =
      video.status === VideoStatus.READY &&
      video.published_at !== null &&
      video.visibility === VideoVisibility.PUBLIC;
    if (!isOwner && !isVisibleToPublic) {
      throw new VideoNotFoundException();
    }
    if (!video.thumbnail_key) {
      throw new VideoNotFoundException();
    }

    return getSignedUrl(
      this.s3PresignClient,
      new GetObjectCommand({
        Bucket: this.storage.bucket,
        Key: video.thumbnail_key,
      }),
      { expiresIn: THUMBNAIL_URL_EXPIRATION_SECONDS },
    );
  }

  private async findOwnedVideoOrFail(
    videoId: string,
    userId: string,
  ): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['channel'],
    });
    if (!video) throw new VideoNotFoundException();
    if (video.channel.user_id !== userId) throw new VideoNotOwnedException();
    return video;
  }
}
