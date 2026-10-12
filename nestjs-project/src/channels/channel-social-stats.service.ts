import { Injectable } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Channel } from './entities/channel.entity';

export interface ChannelViewerState {
  subscribed: boolean;
  isChannelOwner: boolean;
}

export interface ChannelSocialStats {
  subscriberCount: number;
  /** `null` for anonymous viewers (social-interactions/TD-06). */
  viewerState: ChannelViewerState | null;
}

/**
 * Composes the social read-model of a channel (subscriber count and the
 * viewer relation) from `SubscriptionsService`, keeping `ChannelsService`
 * focused on channel data.
 */
@Injectable()
export class ChannelSocialStatsService {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async forChannel(
    channel: Channel,
    viewerId?: string,
  ): Promise<ChannelSocialStats> {
    const counts = await this.subscriptionsService.countByChannelIds([
      channel.id,
    ]);

    let viewerState: ChannelViewerState | null = null;
    if (viewerId !== undefined) {
      const subscribedChannelIds =
        await this.subscriptionsService.findSubscribedChannelIds(viewerId, [
          channel.id,
        ]);
      viewerState = {
        subscribed: subscribedChannelIds.has(channel.id),
        isChannelOwner: channel.user_id === viewerId,
      };
    }

    return {
      subscriberCount: counts.get(channel.id) ?? 0,
      viewerState,
    };
  }
}
