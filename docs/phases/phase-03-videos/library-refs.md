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

### @nestjs/bullmq

`npm i --save @nestjs/bullmq bullmq` — official NestJS integration.

- Register: `BullModule.forRootAsync({ useFactory: () => ({ connection: { host: 'redis', port: 6379 } }) })` + `BullModule.registerQueue({ name: 'video-processing' })`.
- Producer: `constructor(@InjectQueue('video-processing') private queue: Queue) {}` then `queue.add('process', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })` — the `attempts`/`backoff` options are exactly what `phase-03-videos/TD-06` relies on for automatic retry before marking a video `error`.
- Consumer (worker side): `@Processor('video-processing') export class VideoProcessor extends WorkerHost { async process(job: Job) { ... } }`.
- `QueueEventsListener` / `@OnQueueEvent('active'|'completed'|'failed')` available for observability if needed.

**Used by:** `phase-03-videos/TD-01` (queue tech), `TD-03` (worker consumes via `@Processor`), `TD-06` (retry policy).

### bullmq

Core queue engine behind `@nestjs/bullmq` — same package family. `Job`, `Queue`, `Worker`, `CronExpression`-style repeatable options are all exposed here; the NestJS wrapper above re-exports the pieces used in application code (`Job`, `Queue` types). Direct use of `bullmq` primitives (e.g., constructing a `Worker` manually) is only needed outside the NestJS DI container — not required for this phase, since both API and worker run inside NestJS contexts (`WorkerHost`/`@Processor`).

**Used by:** `phase-03-videos/TD-01`.

### @aws-sdk/client-s3

AWS SDK v3, modular client. Fully compatible with MinIO via `endpoint` + `forcePathStyle: true`.

- Client setup: `new S3Client({ endpoint: 'http://minio:9000', forcePathStyle: true, region: 'us-east-1', credentials: {...} })`.
- Presigned multipart upload (`TD-02`): `CreateMultipartUploadCommand` → per-part `UploadPartCommand` (signed via `@aws-sdk/s3-request-presigner`) → client uploads each part directly → `CompleteMultipartUploadCommand` with the collected `{ ETag, PartNumber }[]`.
- Presigned read (`TD-05`): `GetObjectCommand` (signed via `@aws-sdk/s3-request-presigner`), optionally with `ResponseContentDisposition: 'attachment'` for downloads — MinIO/S3 natively serves `Range`/206 for the resulting presigned URL, no app-side range handling needed.
- Cleanup (`upload-cleanup-policy/TD-01`, revisado para Option B — MinIO não implementa a lifecycle action `AbortIncompleteMultipartUpload`): `ListMultipartUploadsCommand({ Bucket })` to enumerate in-progress multipart uploads, then `AbortMultipartUploadCommand({ Bucket, Key, UploadId })` for each upload older than the configured TTL (`Initiated` field) — run from `UploadCleanupService`'s cron (`@nestjs/schedule`), not at bootstrap.
- Bucket/key convention (`TD-07`): single bucket, keys `videos/{videoId}/original.<ext>` and `videos/{videoId}/thumbnail.jpg`.

**Used by:** `phase-03-videos/TD-02`, `TD-05`, `TD-07`, `upload-cleanup-policy/TD-01`.

### @aws-sdk/s3-request-presigner

`getSignedUrl(client, command, { expiresIn })` — generates a presigned URL for any S3 command object (`UploadPartCommand`, `GetObjectCommand`, etc.). Used together with `@aws-sdk/client-s3` for every presigned-URL flow in this phase (multipart upload parts, streaming/download reads).

**Used by:** `phase-03-videos/TD-02`, `TD-05`.

### fluent-ffmpeg

Node wrapper around the `ffmpeg`/`ffprobe` CLI binaries (must be installed in the worker's Docker image, e.g. `apt install ffmpeg`).

- Metadata (`TD-04`): `ffmpeg.ffprobe(filePath, (err, metadata) => { const duration = metadata.format.duration; const { width, height, codec_name } = metadata.streams.find(s => s.codec_type === 'video'); })`.
- Thumbnail (`TD-04`, resolved at 10% per AMB-1): `ffmpeg(filePath).screenshots({ timestamps: ['10%'], filename: 'thumbnail.jpg', folder: outputDir, size: '320x240' })`.
- Both operations can run against a local temp file (downloaded from the presigned-uploaded object) or a readable stream, depending on how the worker fetches the original from storage before processing.

**Used by:** `phase-03-videos/TD-04`.

### @nestjs/schedule

`npm i --save @nestjs/schedule` — declarative cron jobs for the API/worker process.

- Module: `ScheduleModule.forRoot()` in the relevant module's imports.
- Cron job (`upload-cleanup-policy/TD-01`, revisado para Option B): `@Cron(CronExpression.EVERY_DAY_AT_1AM) async cleanupOrphanDrafts() { /* mark draft videos with no activity past TTL as error */ }` plus a sibling `cleanupAbandonedMultipartUploads()` in the same service — both run from the same `UploadCleanupService`, covering Postgres `videos` (draft TTL) and storage (`ListMultipartUploadsCommand`/`AbortMultipartUploadCommand`, see `@aws-sdk/client-s3` above) in one mechanism, since MinIO does not support the `AbortIncompleteMultipartUpload` lifecycle action natively.

**Used by:** `upload-cleanup-policy/TD-01`.
