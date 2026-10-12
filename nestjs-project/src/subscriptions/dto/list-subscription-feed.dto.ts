import { ListChannelVideosDto } from '../../videos/dto/list-channel-videos.dto';

/**
 * The subscriptions feed paginates by URL with the same `page`/`pageSize`
 * convention as the public channel listing (social-interactions/TD-07).
 */
export class ListSubscriptionFeedDto extends ListChannelVideosDto {}
