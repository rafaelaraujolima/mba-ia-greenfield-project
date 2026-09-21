import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.STORAGE_ENDPOINT || 'http://minio:9000',
  bucket: process.env.STORAGE_BUCKET || 'streamtube',
  accessKeyId: process.env.STORAGE_ACCESS_KEY || 'streamtube',
  secretAccessKey: process.env.STORAGE_SECRET_KEY || 'streamtube123',
  region: process.env.STORAGE_REGION || 'us-east-1',
  videoDraftTtlHours: parseInt(process.env.VIDEO_DRAFT_TTL_HOURS || '24', 10),
  multipartLifecycleDays: parseInt(
    process.env.MULTIPART_LIFECYCLE_DAYS || '1',
    10,
  ),
}));
