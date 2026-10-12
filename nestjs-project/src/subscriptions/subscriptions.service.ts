import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Channel } from '../channels/entities/channel.entity';
import {
  CannotSubscribeOwnChannelException,
  ChannelNotFoundException,
} from '../common/exceptions/domain.exception';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../videos/videos.constants';
import {
  Video,
  VideoStatus,
  VideoVisibility,
} from '../videos/entities/video.entity';
import { Subscription } from './entities/subscription.entity';
import { DEFAULT_FOLLOWED_CHANNELS_LIMIT } from './subscriptions.constants';

export interface FollowedChannel {
  channelId: string;
  channelName: string;
  channelNickname: string;
  subscribedAt: Date;
}

export interface FeedPagination {
  page?: number;
  pageSize?: number;
}

export interface PaginatedFeedVideos {
  items: Video[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
  ) {}

  /**
   * Idempotent (social-interactions/TD-03): subscribing to an already
   * followed channel is a no-op thanks to the unique (user_id, channel_id)
   * index plus `ON CONFLICT DO NOTHING`.
   */
  async subscribe(userId: string, nickname: string): Promise<void> {
    const channel = await this.findChannelOrThrow(nickname);
    if (channel.user_id === userId) {
      throw new CannotSubscribeOwnChannelException();
    }

    await this.subscriptionRepository
      .createQueryBuilder()
      .insert()
      .into(Subscription)
      .values({ user_id: userId, channel_id: channel.id })
      .orIgnore()
      .execute();
  }

  async unsubscribe(userId: string, nickname: string): Promise<void> {
    const channel = await this.findChannelOrThrow(nickname);
    await this.subscriptionRepository.delete({
      user_id: userId,
      channel_id: channel.id,
    });
  }

  /** Subscriber counts aggregated on read (social-interactions/TD-02). */
  async countByChannelIds(channelIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>(channelIds.map((id) => [id, 0]));
    if (channelIds.length === 0) return counts;

    const rows = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('subscription.channel_id', 'channel_id')
      .addSelect('COUNT(*)', 'count')
      .where('subscription.channel_id IN (:...channelIds)', { channelIds })
      .groupBy('subscription.channel_id')
      .getRawMany<{ channel_id: string; count: string }>();

    for (const row of rows) {
      counts.set(row.channel_id, Number(row.count));
    }
    return counts;
  }

  async findSubscribedChannelIds(
    userId: string,
    channelIds: string[],
  ): Promise<Set<string>> {
    if (channelIds.length === 0) return new Set();

    const rows = await this.subscriptionRepository.find({
      select: { channel_id: true },
      where: { user_id: userId, channel_id: In(channelIds) },
    });
    return new Set(rows.map((row) => row.channel_id));
  }

  async listFollowed(
    userId: string,
    limit: number = DEFAULT_FOLLOWED_CHANNELS_LIMIT,
  ): Promise<FollowedChannel[]> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { user_id: userId },
      relations: { channel: true },
      order: { created_at: 'DESC', id: 'DESC' },
      take: limit,
    });

    return subscriptions.map((subscription) => ({
      channelId: subscription.channel_id,
      channelName: subscription.channel.name,
      channelNickname: subscription.channel.nickname,
      subscribedAt: subscription.created_at,
    }));
  }

  /**
   * Feed of published videos from followed channels
   * (social-interactions/TD-07): ready + public + published, newest first.
   */
  async listFeedVideos(
    userId: string,
    { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE }: FeedPagination = {},
  ): Promise<PaginatedFeedVideos> {
    const [items, total] = await this.videoRepository
      .createQueryBuilder('video')
      .innerJoinAndSelect('video.channel', 'channel')
      .innerJoin(
        Subscription,
        'subscription',
        'subscription.channel_id = video.channel_id AND subscription.user_id = :userId',
        { userId },
      )
      .where('video.status = :status', { status: VideoStatus.READY })
      .andWhere('video.visibility = :visibility', {
        visibility: VideoVisibility.PUBLIC,
      })
      .andWhere('video.published_at IS NOT NULL')
      .orderBy('video.published_at', 'DESC')
      .addOrderBy('video.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, page, pageSize, total };
  }

  private async findChannelOrThrow(nickname: string): Promise<Channel> {
    const channel = await this.channelRepository.findOneBy({ nickname });
    if (!channel) throw new ChannelNotFoundException();
    return channel;
  }
}
