import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { ConfigType } from '@nestjs/config';
import { LessThan, Repository } from 'typeorm';
import {
  AbortMultipartUploadCommand,
  ListMultipartUploadsCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import storageConfig from '../config/storage.config';
import { S3_CLIENT } from '../storage/storage.constants';
import { Video, VideoStatus } from './entities/video.entity';

@Injectable()
export class UploadCleanupService {
  private readonly logger = new Logger(UploadCleanupService.name);

  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    @Inject(storageConfig.KEY)
    private readonly storage: ConfigType<typeof storageConfig>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanupOrphanDrafts(): Promise<void> {
    const ttlHours = this.storage.videoDraftTtlHours;
    const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

    const result = await this.videoRepository.update(
      { status: VideoStatus.DRAFT, updated_at: LessThan(cutoff) },
      {
        status: VideoStatus.ERROR,
        error_message: `Upload expired after ${ttlHours}h of inactivity`,
      },
    );

    if (result.affected) {
      this.logger.log(`Expired ${result.affected} orphan draft video(s)`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanupAbandonedMultipartUploads(): Promise<void> {
    const ttlDays = this.storage.multipartLifecycleDays;
    const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);

    const { Uploads } = await this.s3Client.send(
      new ListMultipartUploadsCommand({ Bucket: this.storage.bucket }),
    );

    for (const upload of Uploads ?? []) {
      if (!upload.Key || !upload.UploadId || !upload.Initiated) continue;
      if (upload.Initiated >= cutoff) continue;

      await this.s3Client.send(
        new AbortMultipartUploadCommand({
          Bucket: this.storage.bucket,
          Key: upload.Key,
          UploadId: upload.UploadId,
        }),
      );
      this.logger.log(
        `Aborted abandoned multipart upload for key "${upload.Key}" (initiated ${upload.Initiated.toISOString()})`,
      );
    }
  }
}
