import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiErrorEnvelope } from '../common/openapi/api-error-envelope.dto';
import { ListSubscriptionFeedDto } from './dto/list-subscription-feed.dto';
import { ListSubscriptionsDto } from './dto/list-subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Put('channels/:nickname/subscription')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Subscribe to a channel',
    description:
      'Idempotent: subscribing to an already followed channel also returns 204. The owner of a channel cannot subscribe to it.',
  })
  @ApiResponse({ status: 204, description: 'Subscribed' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 403,
    description: 'The channel belongs to the requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Channel not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async subscribe(
    @Param('nickname') nickname: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.subscriptionsService.subscribe(user.sub, nickname);
  }

  @Delete('channels/:nickname/subscription')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Unsubscribe from a channel',
    description:
      'Idempotent: cancelling a subscription that does not exist also returns 204.',
  })
  @ApiResponse({ status: 204, description: 'Unsubscribed' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Channel not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async unsubscribe(
    @Param('nickname') nickname: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.subscriptionsService.unsubscribe(user.sub, nickname);
  }
  @Get('subscriptions')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List followed channels',
    description:
      'Channels the requester follows, most recent subscription first. The side menu requests limit=10.',
  })
  @ApiResponse({
    status: 200,
    description: 'Followed channels',
    schema: {
      properties: {
        items: {
          type: 'array',
          items: {
            properties: {
              channelId: { type: 'string', format: 'uuid' },
              channelName: { type: 'string' },
              channelNickname: { type: 'string' },
              subscribedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid limit',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async listFollowed(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSubscriptionsDto,
  ) {
    const channels = await this.subscriptionsService.listFollowed(
      user.sub,
      query.limit,
    );
    return {
      items: channels.map((channel) => ({
        channelId: channel.channelId,
        channelName: channel.channelName,
        channelNickname: channel.channelNickname,
        subscribedAt: channel.subscribedAt.toISOString(),
      })),
    };
  }

  @Get('subscriptions/videos')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Subscriptions feed',
    description:
      'Paginated published videos (ready, public) from the channels the requester follows, newest first.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated feed',
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
              channelName: { type: 'string' },
              channelNickname: { type: 'string' },
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
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async listFeed(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSubscriptionFeedDto,
  ) {
    const result = await this.subscriptionsService.listFeedVideos(
      user.sub,
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
        channelName: video.channel.name,
        channelNickname: video.channel.nickname,
      })),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }
}
