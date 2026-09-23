import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
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
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelNotFoundException } from '../common/exceptions/domain.exception';
import { ApiErrorEnvelope } from '../common/openapi/api-error-envelope.dto';
import { ChannelsService } from './channels.service';

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update channel information',
    description:
      'Updates name, description and/or nickname of a channel owned by the requester. A nickname already in use is rejected with 409; the previous nickname is not redirected.',
  })
  @ApiResponse({
    status: 200,
    description: 'Channel updated',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        nickname: { type: 'string' },
        description: { type: 'string', nullable: true },
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
    description: 'Channel does not belong to requester',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 404,
    description: 'Channel not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  @ApiResponse({
    status: 409,
    description: 'Nickname is already in use',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateChannelDto,
  ): Promise<{
    id: string;
    name: string;
    nickname: string;
    description: string | null;
  }> {
    const channel = await this.channelsService.updateChannel(id, user.sub, dto);
    return {
      id: channel.id,
      name: channel.name,
      nickname: channel.nickname,
      description: channel.description,
    };
  }

  @Get(':nickname')
  @Public()
  @ApiOperation({
    summary: 'Get a public channel',
    description: 'Returns the public information of a channel by nickname.',
  })
  @ApiResponse({
    status: 200,
    description: 'Channel information',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        nickname: { type: 'string' },
        description: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Channel not found',
    schema: { $ref: getSchemaPath(ApiErrorEnvelope) },
  })
  async findByNickname(@Param('nickname') nickname: string): Promise<{
    id: string;
    name: string;
    nickname: string;
    description: string | null;
  }> {
    const channel = await this.channelsService.findByNickname(nickname);
    if (!channel) throw new ChannelNotFoundException();
    return {
      id: channel.id,
      name: channel.name,
      nickname: channel.nickname,
      description: channel.description,
    };
  }
}
