import { Channel } from '../channels/entities/channel.entity';
import { Video, VideoStatus, VideoVisibility } from './entities/video.entity';
import { isVideoVisibleTo } from './video-visibility.util';

function buildVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: 'video-1',
    status: VideoStatus.READY,
    visibility: VideoVisibility.PUBLIC,
    published_at: new Date('2026-01-01T00:00:00Z'),
    channel: { id: 'channel-1', user_id: 'owner-1' } as Channel,
    ...overrides,
  } as Video;
}

describe('isVideoVisibleTo', () => {
  it('should let the owner see a video in any status', () => {
    const draft = buildVideo({
      status: VideoStatus.DRAFT,
      published_at: null,
    });

    expect(isVideoVisibleTo(draft, 'owner-1')).toBe(true);
  });

  it('should show a ready, published, public video to anonymous viewers', () => {
    expect(isVideoVisibleTo(buildVideo())).toBe(true);
  });

  it('should show an unlisted video to other users', () => {
    const unlisted = buildVideo({ visibility: VideoVisibility.UNLISTED });

    expect(isVideoVisibleTo(unlisted, 'someone-else')).toBe(true);
  });

  it('should hide a video that is not ready from non-owners', () => {
    const processing = buildVideo({ status: VideoStatus.PROCESSING });

    expect(isVideoVisibleTo(processing)).toBe(false);
    expect(isVideoVisibleTo(processing, 'someone-else')).toBe(false);
  });

  it('should hide an unpublished video from non-owners', () => {
    const unpublished = buildVideo({ published_at: null });

    expect(isVideoVisibleTo(unpublished)).toBe(false);
  });
});
