import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { Public } from '../auth/decorators/public.decorator';
import { ApiErrorEnvelope } from '../common/openapi/api-error-envelope.dto';
import {
  CommentResponse,
  RepliesResponse,
  TopLevelCommentsResponse,
  toCommentResponse,
} from './comment-response';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';

const COMMENT_ITEM_SCHEMA = {
  properties: {
    id: { type: 'string', format: 'uuid' },
    parentId: { type: 'string', format: 'uuid', nullable: true },
    body: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    author: {
      properties: {
        channelName: { type: 'string' },
        channelNickname: { type: 'string' },
      },
    },
    likeCount: { type: 'number' },
    replyCount: { type: 'number' },
    viewerState: {
      nullable: true,
      properties: {
        reaction: {
          type: 'string',
          enum: ['like', 'dislike'],
          nullable: true,
        },
      },
    },
  },
};

@ApiTags('comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('videos/:id/comments')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Comment on a video or reply to a comment',
    description:
      'Creates a top-level comment or, with parentId, a reply to a top-level comment (max depth 2). The body is plain text.',
  })
  @ApiResponse({
    status: 201,
    description: 'Comment created',
    schema: COMMENT_ITEM_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed or the parent is itself a reply (COMMENT_DEPTH_EXCEEDED)',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description:
      'Video not found or not visible (VIDEO_NOT_FOUND), or parent comment not found (COMMENT_NOT_FOUND)',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async create(
    @Param('id', ParseUUIDPipe) videoId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponse> {
    const item = await this.commentsService.create(user.sub, videoId, dto);
    return toCommentResponse(item);
  }

  @Get('videos/:id/comments')
  @Public()
  @ApiOperation({
    summary: 'List the top-level comments of a video',
    description:
      'Newest first, paginated by an opaque cursor. Public; a valid access token only adds the requester viewerState (an expired or invalid token is treated as anonymous).',
  })
  @ApiResponse({
    status: 200,
    description: 'A page of comments',
    schema: {
      properties: {
        items: { type: 'array', items: COMMENT_ITEM_SCHEMA },
        nextCursor: { type: 'string', nullable: true },
        totalCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid cursor (INVALID_CURSOR) or limit',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found or not visible',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async listTopLevel(
    @Param('id', ParseUUIDPipe) videoId: string,
    @Query() query: ListCommentsDto,
    @CurrentUser() user?: JwtPayload,
  ): Promise<TopLevelCommentsResponse> {
    const page = await this.commentsService.listTopLevel(
      videoId,
      query,
      user?.sub,
    );
    return {
      items: page.items.map(toCommentResponse),
      nextCursor: page.nextCursor,
      totalCount: page.totalCount,
    };
  }

  @Get('comments/:id/replies')
  @Public()
  @ApiOperation({
    summary: 'List the replies of a top-level comment',
    description:
      'Newest first, paginated by an opaque cursor. Public; a valid access token only adds the requester viewerState.',
  })
  @ApiResponse({
    status: 200,
    description: 'A page of replies',
    schema: {
      properties: {
        items: { type: 'array', items: COMMENT_ITEM_SCHEMA },
        nextCursor: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid cursor (INVALID_CURSOR) or limit',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description:
      'Comment not found, not top-level, or its video is not visible',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async listReplies(
    @Param('id', ParseUUIDPipe) commentId: string,
    @Query() query: ListCommentsDto,
    @CurrentUser() user?: JwtPayload,
  ): Promise<RepliesResponse> {
    const page = await this.commentsService.listReplies(
      commentId,
      query,
      user?.sub,
    );
    return {
      items: page.items.map(toCommentResponse),
      nextCursor: page.nextCursor,
    };
  }
}
