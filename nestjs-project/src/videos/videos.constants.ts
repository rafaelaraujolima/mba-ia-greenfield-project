export const MAX_VIDEO_FILE_SIZE_BYTES = 10 * 1024 ** 3;
export const MAX_THUMBNAIL_FILE_SIZE_BYTES = 5 * 1024 ** 2;

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

export const VIDEO_PROCESSING_QUEUE = 'video-processing';
export const VIDEO_PROCESS_JOB = 'video.process';

export const THUMBNAIL_CACHE_CONTROL = 'public, max-age=60';

export const VIEW_COUNT_KEY_PREFIX = 'views:';
export const VIEW_DEDUP_KEY_PREFIX = 'view:';
export const VIEW_DEDUP_TTL_SECONDS = 30 * 60;

export const DEFAULT_SUGGESTIONS_LIMIT = 5;
