import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ConfigType } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ChannelsService } from '../channels/channels.service';
import storageConfig from '../config/storage.config';
import { S3_CLIENT } from '../storage/storage.constants';
import {
  ChannelNotFoundException,
  ChannelNotOwnedException,
  FileSizeExceededException,
  InvalidVideoStateException,
  VideoNotFoundException,
  VideoNotOwnedException,
} from '../common/exceptions/domain.exception';
import { CreateVideoDto } from './dto/create-video.dto';
import { RequestUploadPartsDto } from './dto/request-upload-parts.dto';
import { Video, VideoStatus } from './entities/video.entity';
import { MAX_VIDEO_FILE_SIZE_BYTES } from './videos.constants';

const UPLOAD_PART_URL_EXPIRATION_SECONDS = 900;

export interface UploadPartUrl {
  partNumber: number;
  url: string;
}

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    private readonly channelsService: ChannelsService,
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    @Inject(storageConfig.KEY)
    private readonly storage: ConfigType<typeof storageConfig>,
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
