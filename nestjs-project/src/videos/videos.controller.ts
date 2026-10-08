import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Redirect,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiErrorEnvelope } from '../common/openapi/api-error-envelope.dto';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { GetSuggestionsDto } from './dto/get-suggestions.dto';
import { ListChannelVideosDto } from './dto/list-channel-videos.dto';
import { RequestUploadPartsDto } from './dto/request-upload-parts.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { VideosService } from './videos.service';
import { THUMBNAIL_CACHE_CONTROL } from './videos.constants';

@ApiTags('videos')
@Controller()
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post('channels/:channelId/videos')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Initiate a video upload',
    description:
      'Pre-registers a video as a draft under the given channel and starts a multipart upload in storage.',
  })
  @ApiResponse({
    status: 201,
    description: 'Upload initiated',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', example: 'draft' },
        uploadId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or file size exceeds the 10GB limit',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 403,
    description: 'Channel does not belong to requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Channel not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async initiateUpload(
    @Param('channelId') channelId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateVideoDto,
  ): Promise<{ id: string; status: string; uploadId: string | null }> {
    const video = await this.videosService.initiateUpload(
      channelId,
      user.sub,
      dto,
    );
    return {
      id: video.id,
      status: video.status,
      uploadId: video.storage_upload_id,
    };
  }

  @Get('channels/:id/manage/videos')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List channel videos (management panel)',
    description:
      'Paginated listing of every video of a channel owned by the requester, regardless of status or visibility. views, likes and comments are placeholders until Phase 06.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated videos',
    schema: {
      properties: {
        items: {
          type: 'array',
          items: {
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              thumbnailKey: { type: 'string', nullable: true },
              status: { type: 'string' },
              visibility: { type: 'string' },
              publishedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
              updatedAt: { type: 'string', format: 'date-time' },
              views: { type: 'number', example: 0 },
              likes: { type: 'number', example: 0 },
              comments: { type: 'number', example: 0 },
            },
          },
        },
        page: { type: 'number' },
        pageSize: { type: 'number' },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid pagination parameters',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 403,
    description: 'Channel does not belong to requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Channel not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async findByChannel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: ListChannelVideosDto,
  ) {
    const result = await this.videosService.findByChannel(id, user.sub, query);
    return {
      items: result.items.map((video) => ({
        id: video.id,
        title: video.title,
        thumbnailKey: video.thumbnail_key,
        status: video.status,
        visibility: video.visibility,
        publishedAt: video.published_at
          ? video.published_at.toISOString()
          : null,
        updatedAt: video.updated_at.toISOString(),
        views: 0,
        likes: 0,
        comments: 0,
      })),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get('channels/:nickname/videos')
  @Public()
  @ApiOperation({
    summary: 'List public channel videos',
    description:
      'Paginated listing of the videos visible on the public channel page: ready, public and published.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated public videos',
    schema: {
      properties: {
        items: {
          type: 'array',
          items: {
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              thumbnailKey: { type: 'string', nullable: true },
              publishedAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              durationSeconds: { type: 'number', nullable: true },
            },
          },
        },
        page: { type: 'number' },
        pageSize: { type: 'number' },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid pagination parameters',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Channel not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async findPublicByChannel(
    @Param('nickname') nickname: string,
    @Query() query: ListChannelVideosDto,
  ) {
    const result = await this.videosService.findPublicByChannel(
      nickname,
      query,
    );
    return {
      items: result.items.map((video) => ({
        id: video.id,
        title: video.title,
        thumbnailKey: video.thumbnail_key,
        publishedAt: video.published_at!.toISOString(),
        updatedAt: video.updated_at.toISOString(),
        durationSeconds:
          video.duration_seconds != null
            ? Number(video.duration_seconds)
            : null,
      })),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Post('videos/:id/upload-parts')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Request pre-signed upload part URLs',
    description:
      'Returns one pre-signed URL per requested part number for a video still in draft.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pre-signed URLs generated',
    schema: {
      properties: {
        parts: {
          type: 'array',
          items: {
            properties: {
              partNumber: { type: 'number' },
              url: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 403,
    description: 'Video does not belong to requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 409,
    description: 'Video is not in draft state',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async requestUploadParts(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestUploadPartsDto,
  ): Promise<{ parts: { partNumber: number; url: string }[] }> {
    const parts = await this.videosService.requestUploadParts(
      id,
      user.sub,
      dto,
    );
    return { parts };
  }

  @Post('videos/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Complete a video upload',
    description:
      'Completes the multipart upload in storage, transitions the video to processing, and enqueues the processing job.',
  })
  @ApiResponse({
    status: 200,
    description: 'Upload completed',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', example: 'processing' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or multipart completion parts are invalid',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 403,
    description: 'Video does not belong to requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 409,
    description: 'Video is not in draft state',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async completeUpload(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CompleteUploadDto,
  ): Promise<{ id: string; status: string }> {
    const video = await this.videosService.completeUpload(id, user.sub, dto);
    return { id: video.id, status: video.status };
  }

  @Get('videos/:id')
  @Public()
  @ApiOperation({
    summary: 'Get a video',
    description:
      'Returns video metadata. Anonymous and non-owner requesters only see videos with status "ready"; the channel owner can see any status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Video metadata',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        categoryId: { type: 'string', format: 'uuid', nullable: true },
        visibility: { type: 'string', example: 'public' },
        status: { type: 'string', example: 'ready' },
        durationSeconds: { type: 'number', nullable: true },
        width: { type: 'number', nullable: true },
        height: { type: 'number', nullable: true },
        publishedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        thumbnailKey: { type: 'string', nullable: true },
        viewCount: { type: 'number' },
        channelName: { type: 'string' },
        channelNickname: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found or not visible to the requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<{
    id: string;
    title: string;
    description: string | null;
    categoryId: string | null;
    visibility: string;
    status: string;
    durationSeconds: number | null;
    width: number | null;
    height: number | null;
    publishedAt: string | null;
    thumbnailKey: string | null;
    viewCount: number;
    channelName: string;
    channelNickname: string;
    createdAt: string;
    updatedAt: string;
  }> {
    const video = await this.videosService.findOne(id, user?.sub);
    const viewCount = await this.videosService.getViewCount(id);
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      categoryId: video.category_id,
      visibility: video.visibility,
      status: video.status,
      durationSeconds:
        video.duration_seconds != null ? Number(video.duration_seconds) : null,
      width: video.width,
      height: video.height,
      publishedAt: video.published_at ? video.published_at.toISOString() : null,
      thumbnailKey: video.thumbnail_key,
      viewCount,
      channelName: video.channel.name,
      channelNickname: video.channel.nickname,
      createdAt: video.created_at.toISOString(),
      updatedAt: video.updated_at.toISOString(),
    };
  }

  @Patch('videos/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update video information',
    description:
      'Updates title, description, category and/or visibility of a video owned by the requester.',
  })
  @ApiResponse({
    status: 200,
    description: 'Video updated',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        categoryId: { type: 'string', format: 'uuid', nullable: true },
        visibility: { type: 'string', example: 'public' },
        status: { type: 'string' },
        publishedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 403,
    description: 'Video does not belong to requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found or category not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateVideoDto,
  ): Promise<{
    id: string;
    title: string;
    description: string | null;
    categoryId: string | null;
    visibility: string;
    status: string;
    publishedAt: string | null;
    updatedAt: string;
  }> {
    const video = await this.videosService.update(id, user.sub, dto);
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      categoryId: video.category_id,
      visibility: video.visibility,
      status: video.status,
      publishedAt: video.published_at ? video.published_at.toISOString() : null,
      updatedAt: video.updated_at.toISOString(),
    };
  }

  @Post('videos/:id/thumbnail')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { thumbnail: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Upload a custom thumbnail',
    description:
      'Replaces the automatically generated thumbnail with a custom image, owned by the requester.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail updated',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        thumbnailKey: { type: 'string' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'File is not an image, or exceeds the size limit',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 403,
    description: 'Video does not belong to requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async updateThumbnail(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ id: string; thumbnailKey: string; updatedAt: string }> {
    const video = await this.videosService.updateThumbnail(id, user.sub, file);
    return {
      id: video.id,
      thumbnailKey: video.thumbnail_key!,
      updatedAt: video.updated_at.toISOString(),
    };
  }

  @Post('videos/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Publish a video',
    description:
      'Transitions a ready video from editorial draft to published. Publishing is one-directional.',
  })
  @ApiResponse({
    status: 200,
    description: 'Video published',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        publishedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Video does not belong to requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 409,
    description: 'Video is not ready or is already published',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ id: string; publishedAt: string }> {
    const video = await this.videosService.publish(id, user.sub);
    return { id: video.id, publishedAt: video.published_at!.toISOString() };
  }

  @Get('videos/:id/stream')
  @Public()
  @Redirect()
  @ApiOperation({
    summary: 'Stream a video',
    description:
      'Redirects to a short-lived pre-signed URL for inline playback. MinIO/S3 natively serves Range/206 for the resulting URL.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to a pre-signed read URL',
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found, or not visible to the requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async stream(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<{ url: string; statusCode: number }> {
    const url = await this.videosService.getPlaybackUrl(
      id,
      'inline',
      user?.sub,
    );
    return { url, statusCode: HttpStatus.FOUND };
  }

  @Get('videos/:id/download')
  @Public()
  @Redirect()
  @ApiOperation({
    summary: 'Download a video',
    description:
      'Redirects to a short-lived pre-signed URL with a Content-Disposition: attachment header.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to a pre-signed download URL',
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found, or not visible to the requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async download(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<{ url: string; statusCode: number }> {
    const url = await this.videosService.getPlaybackUrl(
      id,
      'attachment',
      user?.sub,
    );
    return { url, statusCode: HttpStatus.FOUND };
  }

  @Get('videos/:id/thumbnail')
  @Public()
  @Redirect()
  @Header('Cache-Control', THUMBNAIL_CACHE_CONTROL)
  @ApiOperation({
    summary: 'Get a video thumbnail',
    description:
      'Redirects to a short-lived pre-signed URL for the thumbnail image. Anonymous and non-owner requesters only see thumbnails of videos that are ready, published and public; the channel owner can see any status.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to a pre-signed thumbnail URL',
  })
  @ApiResponse({
    status: 404,
    description:
      'Video not found, not visible to the requester, or has no thumbnail',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getThumbnail(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<{ url: string; statusCode: number }> {
    const url = await this.videosService.getThumbnailUrl(id, user?.sub);
    return { url, statusCode: HttpStatus.FOUND };
  }

  @Post('videos/:id/views')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Public()
  @ApiOperation({
    summary: 'Register a view',
    description:
      'Registers a view for the video, deduplicated per client via a short-lived Redis key (~30min window).',
  })
  @ApiResponse({
    status: 204,
    description: 'View registered (or deduplicated)',
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found, or not visible to the requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async registerView(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.videosService.registerView(id, req.ip ?? 'unknown');
  }

  @Get('videos/:id/suggestions')
  @Public()
  @ApiOperation({
    summary: 'Get related video suggestions',
    description:
      'Returns public videos from the same category as the given video, falling back to general public videos when the category has too few.',
  })
  @ApiResponse({
    status: 200,
    description: 'Suggested videos',
    schema: {
      properties: {
        items: {
          type: 'array',
          items: {
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              thumbnailUrl: { type: 'string', nullable: true },
              channelName: { type: 'string' },
              channelNickname: { type: 'string' },
              viewCount: { type: 'number' },
              publishedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Source video not found, or not visible to the requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async getSuggestions(
    @Param('id') id: string,
    @Query() query: GetSuggestionsDto,
  ): Promise<{
    items: {
      id: string;
      title: string;
      thumbnailUrl: string | null;
      channelName: string;
      channelNickname: string;
      viewCount: number;
      publishedAt: string;
    }[];
  }> {
    const videos = await this.videosService.getSuggestions(id, query.limit);
    const items = await Promise.all(
      videos.map(async (video) => ({
        id: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnail_key
          ? await this.videosService.getThumbnailUrl(video.id)
          : null,
        channelName: video.channel.name,
        channelNickname: video.channel.nickname,
        viewCount: await this.videosService.getViewCount(video.id),
        publishedAt: video.published_at!.toISOString(),
      })),
    );
    return { items };
  }
}
