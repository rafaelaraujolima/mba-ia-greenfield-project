---
libs:
  "@nestjs/bullmq":
    version: "latest (Nest 11-compatible)"
    context7_id: "/nestjs/bull"
    fetched_at: "2026-09-17T20:00:00-04:00"
  "bullmq":
    version: "latest"
    context7_id: "/taskforcesh/bullmq"
    fetched_at: "2026-09-17T20:00:00-04:00"
  "@aws-sdk/client-s3":
    version: "latest (AWS SDK v3)"
    context7_id: "/aws/aws-sdk-js-v3"
    fetched_at: "2026-09-17T20:00:00-04:00"
  "@aws-sdk/s3-request-presigner":
    version: "latest (AWS SDK v3)"
    context7_id: "/aws/aws-sdk-js-v3"
    fetched_at: "2026-09-17T20:00:00-04:00"
  "fluent-ffmpeg":
    version: "latest"
    context7_id: "/thedave42/node-fluent-ffmpeg"
    fetched_at: "2026-09-17T20:00:00-04:00"
  "@nestjs/schedule":
    version: "latest (Nest 11-compatible)"
    context7_id: "/nestjs/schedule"
    fetched_at: "2026-09-20T15:00:00-04:00"
sources_mtime:
  docs/decisions/technical-decisions-phase-03-videos.md: "2026-09-20T15:32:08-04:00"
  docs/decisions/technical-decisions-upload-cleanup-policy.md: "2026-09-20T15:32:18-04:00"
---

# Library References — Fase 03 (Videos)

## @nestjs/bullmq + bullmq

`npm i --save @nestjs/bullmq bullmq` — official NestJS integration.

- Register a queue: `BullModule.forRootAsync({ useFactory: () => ({ connection: { host: 'redis', port: 6379 } }) })` + `BullModule.registerQueue({ name: 'video-processing' })`.
- Producer: `constructor(@InjectQueue('video-processing') private queue: Queue) {}` then `queue.add('process', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })` — the `attempts`/`backoff` options are exactly what `phase-03-videos/TD-06` relies on for automatic retry before marking a video `error`.
- Consumer (worker side): `@Processor('video-processing') export class VideoProcessor extends WorkerHost { async process(job: Job) { ... } }`.
- `QueueEventsListener` / `@OnQueueEvent('active'|'completed'|'failed')` available for observability if needed.

**Used by:** `phase-03-videos/TD-01` (queue tech), `TD-03` (worker consumes via `@Processor`), `TD-06` (retry policy).

## @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner

AWS SDK v3, modular clients. Fully compatible with MinIO via `endpoint` + `forcePathStyle: true`.

- Client setup: `new S3Client({ endpoint: 'http://minio:9000', forcePathStyle: true, region: 'us-east-1', credentials: {...} })`.
- Presigned multipart upload (`TD-02`): `CreateMultipartUploadCommand` → per-part `getSignedUrl(client, new UploadPartCommand({ Bucket, Key, UploadId, PartNumber }), { expiresIn })` → client uploads each part directly → `CompleteMultipartUploadCommand` with the collected `{ ETag, PartNumber }[]`.
- Presigned read (`TD-05`): `getSignedUrl(client, new GetObjectCommand({ Bucket, Key, ResponseContentDisposition: download ? 'attachment' : undefined }), { expiresIn })` — MinIO/S3 natively serves `Range`/206 for the resulting presigned URL, no app-side range handling needed.
- Cleanup (`upload-cleanup-policy/TD-01`): `PutBucketLifecycleConfigurationCommand` with `Rules: [{ ID, Status: 'Enabled', Filter: {}, AbortIncompleteMultipartUpload: { DaysAfterInitiation: N } }]` — configured once at bootstrap/infra setup, no runtime code needed afterward.
- Bucket/key convention (`TD-07`): single bucket, keys `videos/{videoId}/original.<ext>` and `videos/{videoId}/thumbnail.jpg`.

**Used by:** `phase-03-videos/TD-02`, `TD-05`, `TD-07`, `upload-cleanup-policy/TD-01`.

## fluent-ffmpeg

Node wrapper around the `ffmpeg`/`ffprobe` CLI binaries (must be installed in the worker's Docker image, e.g. `apt install ffmpeg`).

- Metadata (`TD-04`): `ffmpeg.ffprobe(filePath, (err, metadata) => { const duration = metadata.format.duration; const { width, height, codec_name } = metadata.streams.find(s => s.codec_type === 'video'); })`.
- Thumbnail (`TD-04`, resolved at 10% per AMB-1): `ffmpeg(filePath).screenshots({ timestamps: ['10%'], filename: 'thumbnail.jpg', folder: outputDir, size: '320x240' })`.
- Both operations can run against a local temp file (downloaded from the presigned-uploaded object) or a readable stream, depending on how the worker fetches the original from storage before processing.

**Used by:** `phase-03-videos/TD-04`.

## @nestjs/schedule

`npm i --save @nestjs/schedule` — declarative cron jobs for the API/worker process.

- Module: `ScheduleModule.forRoot()` in the relevant module's imports.
- Cron job (`upload-cleanup-policy/TD-01`): `@Cron(CronExpression.EVERY_DAY_AT_1AM) async cleanupOrphanDrafts() { /* mark/remove draft videos with no activity past TTL */ }`. The storage-side cleanup (abandoned multipart parts) is handled entirely by the S3/MinIO lifecycle rule above — this cron only touches the Postgres `videos` table.

**Used by:** `upload-cleanup-policy/TD-01`.
