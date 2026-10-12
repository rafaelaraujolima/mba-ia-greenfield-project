import { Injectable } from '@nestjs/common';
import { CommentsService } from '../comments/comments.service';
import { ReactionType } from '../reactions/entities/reaction-type.enum';
import { ReactionsService } from '../reactions/reactions.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Video } from './entities/video.entity';

export interface VideoViewerState {
  reaction: ReactionType | null;
  subscribed: boolean;
  isChannelOwner: boolean;
}

export interface VideoSocialStats {
  likeCount: number;
  channelSubscriberCount: number;
  /** `null` for anonymous viewers (social-interactions/TD-06). */
  viewerState: VideoViewerState | null;
}

export interface VideoListSocialCounts {
  likes: Map<string, number>;
  comments: Map<string, number>;
}

/**
 * Composes the social read-model of a video from the social modules so
 * `VideosService` stays free of reaction/subscription/comment concerns.
 * Counts are aggregated on read (social-interactions/TD-02).
 */
@Injectable()
export class VideoSocialStatsService {
  constructor(
    private readonly reactionsService: ReactionsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly commentsService: CommentsService,
  ) {}

  /** `video.channel` must be loaded (`VideosService.findOne` does it). */
  async forVideo(video: Video, viewerId?: string): Promise<VideoSocialStats> {
    const [likes, subscribers] = await Promise.all([
      this.reactionsService.countVideoLikes([video.id]),
      this.subscriptionsService.countByChannelIds([video.channel_id]),
    ]);

    let viewerState: VideoViewerState | null = null;
    if (viewerId !== undefined) {
      const [reaction, subscribedChannelIds] = await Promise.all([
        this.reactionsService.findVideoReaction(viewerId, video.id),
        this.subscriptionsService.findSubscribedChannelIds(viewerId, [
          video.channel_id,
        ]),
      ]);
      viewerState = {
        reaction,
        subscribed: subscribedChannelIds.has(video.channel_id),
        isChannelOwner: video.channel.user_id === viewerId,
      };
    }

    return {
      likeCount: likes.get(video.id) ?? 0,
      channelSubscriberCount: subscribers.get(video.channel_id) ?? 0,
      viewerState,
    };
  }

  /** Batch counts for the management panel listing. */
  async countsForVideos(videoIds: string[]): Promise<VideoListSocialCounts> {
    const [likes, comments] = await Promise.all([
      this.reactionsService.countVideoLikes(videoIds),
      this.commentsService.countByVideoIds(videoIds),
    ]);
    return { likes, comments };
  }
}
