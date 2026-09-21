import { mkdtemp, rm } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { ConfigType } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import ffmpeg from 'fluent-ffmpeg';
import type { FfprobeData } from 'fluent-ffmpeg';
import type { Job } from 'bullmq';
import storageConfig from '../config/storage.config';
import { S3_CLIENT } from '../storage/storage.constants';
import { Video, VideoStatus } from './entities/video.entity';
import type { VideoProcessJobData } from './video-process.types';
import { VIDEO_PROCESSING_QUEUE } from './videos.constants';

const THUMBNAIL_TIMESTAMP = '10%';
const THUMBNAIL_SIZE = '320x240';
const THUMBNAIL_FILENAME = 'thumbnail.jpg';

@Processor(VIDEO_PROCESSING_QUEUE, { autorun: false })
@Injectable()
export class VideoProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    @Inject(storageConfig.KEY)
    private readonly storage: ConfigType<typeof storageConfig>,
  ) {
    super();
  }

  async process(job: Job<VideoProcessJobData>): Promise<void> {
    const { videoId } = job.data;
    const video = await this.videoRepository.findOneByOrFail({ id: videoId });

    const workDir = await mkdtemp(join(tmpdir(), 'video-process-'));
    const originalPath = join(workDir, 'original');

    try {
      await this.downloadOriginal(video.storage_key, originalPath);
      const metadata = await this.probe(originalPath);
      const videoStream = metadata.streams.find(
        (stream) => stream.codec_type === 'video',
      );

      await this.generateThumbnail(originalPath, workDir);
      const thumbnailKey = `videos/${video.id}/thumbnail.jpg`;
      await this.uploadThumbnail(
        join(workDir, THUMBNAIL_FILENAME),
        thumbnailKey,
      );

      video.status = VideoStatus.READY;
      video.duration_seconds =
        metadata.format.duration != null
          ? String(metadata.format.duration)
          : null;
      video.width = videoStream?.width ?? null;
      video.height = videoStream?.height ?? null;
      video.thumbnail_key = thumbnailKey;
      await this.videoRepository.save(video);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<VideoProcessJobData> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return;

    this.logger.error(
      `video.process job for video ${job.data.videoId} failed after ${job.attemptsMade} attempt(s): ${error.message}`,
    );

    await this.videoRepository.update(job.data.videoId, {
      status: VideoStatus.ERROR,
      error_message: error.message,
    });
  }

  private async downloadOriginal(
    storageKey: string,
    destPath: string,
  ): Promise<void> {
    const { Body } = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.storage.bucket, Key: storageKey }),
    );
    await pipeline(Body as Readable, createWriteStream(destPath));
  }

  private probe(filePath: string): Promise<FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err: Error | null, data: FfprobeData) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  private generateThumbnail(
    filePath: string,
    outputDir: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .screenshots({
          timestamps: [THUMBNAIL_TIMESTAMP],
          filename: THUMBNAIL_FILENAME,
          folder: outputDir,
          size: THUMBNAIL_SIZE,
        });
    });
  }

  private async uploadThumbnail(
    filePath: string,
    thumbnailKey: string,
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.storage.bucket,
        Key: thumbnailKey,
        Body: createReadStream(filePath),
        ContentType: 'image/jpeg',
      }),
    );
  }
}
