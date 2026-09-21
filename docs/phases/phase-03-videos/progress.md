# phase-03-videos — Progress

**Status:** in_progress
**SIs:** 1/7 completed

### SI-03.1 — Dependências, configuração e infraestrutura Docker
- **Status:** complete
- **Tests:** N/A (infra-only SI, no application code under test yet)
- **Observations:** Pivoted `upload-cleanup-policy/TD-01` from Option A to Option B mid-SI — MinIO (`quay.io/minio/minio`, `RELEASE.2025-09-07T16-13-09Z`) does not implement the `AbortIncompleteMultipartUpload` lifecycle action (confirmed empirically). Multipart-abort cleanup moved to the app cron in SI-03.7; `configure-storage.ts` now only creates the bucket. Also switched MinIO image from `minio/minio` (no longer pullable from Docker Hub) to `quay.io/minio/mc`/`quay.io/minio/minio`. All ACs verified: `docker compose ps` shows `redis`/`minio`/`nestjs-worker` healthy; `STORAGE_BUCKET` Joi validation rejects when unset; `ffmpeg -version` works inside `nestjs-worker`; `streamtube` bucket exists in MinIO via `npm run storage:bootstrap`.

### SI-03.2 — Entidade Video + migration
- **Status:** pending
- **Tests:** —
- **Observations:** none

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
