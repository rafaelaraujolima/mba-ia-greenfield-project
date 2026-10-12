import { Video, VideoStatus, VideoVisibility } from './entities/video.entity';

/**
 * Unified anonymous-visibility rule (video-watch-page/TD-08): the owner sees
 * the video in any status; anyone else (anonymous or not) only sees it when it
 * is ready, published, and public/unlisted. `video.channel` must be loaded.
 *
 * Kept as a pure function so the social modules (reactions, comments) apply
 * the same rule as `VideosService` without importing `VideosModule`.
 */
export function isVideoVisibleTo(video: Video, userId?: string): boolean {
  const isOwner = userId != null && video.channel.user_id === userId;
  if (isOwner) return true;

  return (
    video.status === VideoStatus.READY &&
    video.published_at !== null &&
    (video.visibility === VideoVisibility.PUBLIC ||
      video.visibility === VideoVisibility.UNLISTED)
  );
}
