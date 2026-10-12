import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
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
import { SetReactionDto } from './dto/set-reaction.dto';
import { ReactionsService } from './reactions.service';

@ApiTags('reactions')
@Controller()
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Put('videos/:id/reaction')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Set the requester reaction to a video',
    description:
      'Idempotent: a user has at most one reaction (like or dislike) per video; sending a different type replaces it.',
  })
  @ApiResponse({ status: 204, description: 'Reaction set' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found or not visible to the requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async setVideoReaction(
    @Param('id', ParseUUIDPipe) videoId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SetReactionDto,
  ): Promise<void> {
    await this.reactionsService.setVideoReaction(user.sub, videoId, dto.type);
  }

  @Delete('videos/:id/reaction')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Remove the requester reaction to a video',
    description:
      'Idempotent: removing a reaction that does not exist also returns 204.',
  })
  @ApiResponse({ status: 204, description: 'Reaction removed' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found or not visible to the requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async removeVideoReaction(
    @Param('id', ParseUUIDPipe) videoId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.reactionsService.removeVideoReaction(user.sub, videoId);
  }
  @Put('comments/:id/reaction')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Set the requester reaction to a comment',
    description:
      'Idempotent: a user has at most one reaction (like or dislike) per comment; sending a different type replaces it.',
  })
  @ApiResponse({ status: 204, description: 'Reaction set' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async setCommentReaction(
    @Param('id', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SetReactionDto,
  ): Promise<void> {
    await this.reactionsService.setCommentReaction(
      user.sub,
      commentId,
      dto.type,
    );
  }

  @Delete('comments/:id/reaction')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Remove the requester reaction to a comment',
    description:
      'Idempotent: removing a reaction that does not exist also returns 204.',
  })
  @ApiResponse({ status: 204, description: 'Reaction removed' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async removeCommentReaction(
    @Param('id', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.reactionsService.removeCommentReaction(user.sub, commentId);
  }
}
