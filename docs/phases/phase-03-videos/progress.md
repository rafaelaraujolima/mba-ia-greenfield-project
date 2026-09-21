# phase-03-videos — Progress

**Status:** in_progress
**SIs:** 2/7 completed

### SI-03.1 — Dependências, configuração e infraestrutura Docker
- **Status:** complete
- **Tests:** N/A (infra-only SI, no application code under test yet)
- **Observations:** Pivoted `upload-cleanup-policy/TD-01` from Option A to Option B mid-SI — MinIO (`quay.io/minio/minio`, `RELEASE.2025-09-07T16-13-09Z`) does not implement the `AbortIncompleteMultipartUpload` lifecycle action (confirmed empirically). Multipart-abort cleanup moved to the app cron in SI-03.7; `configure-storage.ts` now only creates the bucket. Also switched MinIO image from `minio/minio` (no longer pullable from Docker Hub) to `quay.io/minio/mc`/`quay.io/minio/minio`. All ACs verified: `docker compose ps` shows `redis`/`minio`/`nestjs-worker` healthy; `STORAGE_BUCKET` Joi validation rejects when unset; `ffmpeg -version` works inside `nestjs-worker`; `streamtube` bucket exists in MinIO via `npm run storage:bootstrap`.

### SI-03.2 — Entidade Video + migration
- **Status:** complete
- **Tests:** `src/videos/entities/video.entity.integration-spec.ts` (5 tests), `src/videos/videos.module.spec.ts` (1 test) — all passing
- **Observations:** Adding `Channel.videos` (`@OneToMany`) surfaced two real regressions unrelated to entity code itself, both fixed: (1) every other test file building a TypeORM entity array with `Channel` now needed `Video` too, since TypeORM's metadata builder requires an inverse relation's target entity to be registered wherever `Channel` is — fixed by adding `Video` to `ALL_ENTITIES` across 10 spec files; (2) the production `AppModule` never imported `VideosModule`, so `autoLoadEntities` never discovered `Video`'s metadata, causing an infinite DB-connect retry loop (masquerading as a hang) at real app boot — fixed by wiring `VideosModule` into `AppModule`. Also discovered and fixed, unrelated to the entity work but blocking the full-suite DoD gate: `@nestjs/bullmq` and `@nestjs/schedule` (added in SI-03.1) are ESM-only packages that Jest's default `transformIgnorePatterns` can't parse (`transformIgnorePatterns` updated in both `package.json`'s jest config and `test/jest-e2e.json`); bullmq v6 no longer bundles `ioredis`, so `Queue`/`BullModule` connections retried forever without it — fixed by adding `ioredis` as an explicit dependency; e2e's default 5s hook timeout was too short for a full app boot with a real Redis connection — raised `testTimeout` to 30000 in `jest-e2e.json`. `migrations.integration-spec.ts` also needed sequential (not `Promise.all`) `DROP TABLE ... CASCADE` across the now-deeper `users <- channels <- videos` FK chain to avoid a Postgres deadlock, plus explicit enum-type drops for idempotency. Migration applied and reverted cleanly against the dev DB; `npx tsc --noEmit` clean; full suite 150/150 (unit+integration) + 52/52 (e2e) green; lint exits 0 with only pre-existing, unrelated debt.

### SI-03.3 — Iniciar upload e solicitar URLs de parte
- **Status:** pending
- **Tests:** —
- **Observations:** none

### SI-03.4 — Completar upload e enfileirar processamento
- **Status:** pending
- **Tests:** —
- **Observations:** none

### SI-03.5 — Worker de processamento de vídeo
- **Status:** pending
- **Tests:** —
- **Observations:** none

### SI-03.6 — Consulta, streaming e download do vídeo
- **Status:** pending
- **Tests:** —
- **Observations:** none

### SI-03.7 — Limpeza de uploads e rascunhos abandonados
- **Status:** pending
- **Tests:** —
- **Observations:** none
