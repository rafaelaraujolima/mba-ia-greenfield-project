import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import {
  ChannelNotFoundException,
  ChannelNotOwnedException,
  NicknameAlreadyExistsException,
} from '../common/exceptions/domain.exception';
import { appendRandomSuffix, sanitizeNickname } from './nickname.util';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Channel } from './entities/channel.entity';

const PG_UNIQUE_VIOLATION = '23505';
const NICKNAME_COLUMN = 'nickname';
const MAX_RETRIES = 5;

function isPgUniqueViolationOnColumn(err: unknown, column: string): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const e = err as any;
  return (
    e.code === PG_UNIQUE_VIOLATION &&
    typeof e.detail === 'string' &&
    e.detail.includes(column)
  );
}

@Injectable()
export class ChannelsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
  ) {}

  async findById(id: string): Promise<Channel | null> {
    return this.channelRepository.findOneBy({ id });
  }

  async findByNickname(nickname: string): Promise<Channel | null> {
    return this.channelRepository.findOneBy({ nickname });
  }

  async updateChannel(
    channelId: string,
    userId: string,
    dto: UpdateChannelDto,
  ): Promise<Channel> {
    const channel = await this.findById(channelId);
    if (!channel) throw new ChannelNotFoundException();
    if (channel.user_id !== userId) throw new ChannelNotOwnedException();

    if (dto.nickname !== undefined && dto.nickname !== channel.nickname) {
      const existing = await this.findByNickname(dto.nickname);
      if (existing) throw new NicknameAlreadyExistsException();
      channel.nickname = dto.nickname;
    }
    if (dto.name !== undefined) channel.name = dto.name;
    if (dto.description !== undefined) channel.description = dto.description;

    try {
      return await this.channelRepository.save(channel);
    } catch (err) {
      if (isPgUniqueViolationOnColumn(err, NICKNAME_COLUMN)) {
        throw new NicknameAlreadyExistsException();
      }
      throw err;
    }
  }

  async createChannel(userId: string, email: string): Promise<Channel> {
    const baseNickname = sanitizeNickname(email.split('@')[0]);

    return this.dataSource.transaction(async (manager) => {
      let nickname = baseNickname;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const existing = await manager.findOne(Channel, {
          where: { nickname },
        });
        if (existing) {
          nickname = appendRandomSuffix(baseNickname);
          continue;
        }

        try {
          return await manager.save(
            manager.create(Channel, {
              name: baseNickname,
              nickname,
              user_id: userId,
            }),
          );
        } catch (err) {
          if (isPgUniqueViolationOnColumn(err, NICKNAME_COLUMN)) {
            // Concurrent insert between pre-check and save — retry with new suffix
            nickname = appendRandomSuffix(baseNickname);
          } else {
            throw err;
          }
        }
      }

      throw new Error(
        'Nickname conflict could not be resolved after max retries',
      );
    });
  }
}
