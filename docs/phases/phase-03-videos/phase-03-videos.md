---
kind: phase
name: phase-03-videos
test_specs_aware: true
sources_mtime:
  docs/phases/phase-03-videos/context.md: "2026-09-20T15:34:30-04:00"
  docs/phases/phase-03-videos/library-refs.md: "2026-09-20T15:35:09-04:00"
  docs/decisions/technical-decisions-phase-03-videos.md: "2026-09-20T15:32:08-04:00"
  docs/decisions/technical-decisions-upload-cleanup-policy.md: "2026-09-20T15:32:18-04:00"
---

# Fase 03 — Upload e Processamento de Vídeos

## Objective

Implementar o upload de vídeos de até 10GB sem travar a API (multipart direto ao storage via URLs pré-assinadas), com pré-cadastro automático do vídeo como rascunho ao iniciar o upload, processamento automático em segundo plano (fila BullMQ + worker dedicado extraindo duração/metadados via `ffprobe` e gerando thumbnail via `fluent-ffmpeg`), URL única por vídeo com streaming e download via redirect para URL pré-assinada de leitura, ciclo de status com retry automático em falha, e limpeza automática de uploads multipart abandonados e vídeos rascunho órfãos — entregando upload de até 10GB funcional, processamento automático do vídeo, streaming funcionando e URLs únicas geradas.

---

## Step Implementations

<!-- SIs will be written in Phase B -->

---

## Technical Specifications

### Data Model

#### Video

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, generated |
| channel_id | uuid | FK → channels(id), not null |
| title | varchar(255) | not null |
| status | enum (`draft`, `processing`, `ready`, `error`) | not null, default `draft` |
| error_message | text | nullable |
| storage_key | varchar | not null — `videos/{id}/original.<ext>` (per phase-03-videos/TD-07) |
| thumbnail_key | varchar | nullable — `videos/{id}/thumbnail.jpg`, populated by worker on success (per phase-03-videos/TD-04, TD-07) |
| storage_upload_id | varchar | nullable — S3 multipart `UploadId`, cleared after `complete` (per phase-03-videos/TD-02) |
| content_type | varchar(100) | nullable — declared by client at initiate |
| file_size_bytes | bigint | nullable — declared at initiate, validated against the 10GB limit |
| duration_seconds | numeric(10,3) | nullable — populated by worker (per phase-03-videos/TD-04) |
| width | int | nullable — populated by worker |
| height | int | nullable — populated by worker |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now(), updated on write |

**Relations:** `Channel` has many `Video` (one-to-many); `Video` belongs to `Channel` (many-to-one, `channel_id`)
**Indexes:** index on `channel_id`; index on `status` (used by `upload-cleanup-policy/TD-01`'s cron to find orphan `draft` rows past TTL)

### API Contracts

#### POST /channels/:channelId/videos (SI-03.3)

**Request headers:**
- Authorization: Bearer {access_token}
- Content-Type: application/json

**Request body:**
- title: string, required — min 1, max 255 characters
- contentType: string, required — declared MIME type of the video file (e.g. `video/mp4`)
- fileSizeBytes: number, required — declared total size in bytes; must be ≤ 10GB (10 * 1024^3)

**Response 201:**
- id: string (uuid)
- status: string — `draft`
- uploadId: string — S3 multipart `UploadId`, used by the client to request part URLs and to complete the upload

**Error responses:**
- 404 CHANNEL_NOT_FOUND: quando o `channelId` não existe
- 403 CHANNEL_NOT_OWNED: quando o requester não é dono do canal
- 400 FILE_SIZE_EXCEEDED: quando `fileSizeBytes` excede 10GB
- 400 validation error: quando o corpo falha na validação de schema

---

#### POST /videos/:id/upload-parts (SI-03.3)

**Request headers:**
- Authorization: Bearer {access_token}
- Content-Type: application/json

**Request body:**
- partNumbers: number[], required — lista de números de parte (1..10000) para os quais o cliente precisa de uma URL pré-assinada

**Response 200:**
- parts: array of { partNumber: number, url: string } — URL pré-assinada de `UploadPartCommand` por parte, expiração curta

**Error responses:**
- 404 VIDEO_NOT_FOUND: quando o vídeo não existe
- 403 VIDEO_NOT_OWNED: quando o requester não é dono do canal do vídeo
- 409 INVALID_VIDEO_STATE: quando o vídeo não está em `draft`
- 400 validation error: quando `partNumbers` está vazio ou fora do range 1..10000

---

#### POST /videos/:id/complete (SI-03.4)

**Request headers:**
- Authorization: Bearer {access_token}
- Content-Type: application/json

**Request body:**
- parts: array of { partNumber: number, eTag: string }, required — partes enviadas, na ordem, para `CompleteMultipartUploadCommand`

**Response 200:**
- id: string (uuid)
- status: string — `processing`

**Error responses:**
- 404 VIDEO_NOT_FOUND
- 403 VIDEO_NOT_OWNED
- 409 INVALID_VIDEO_STATE: quando o vídeo não está em `draft`
- 400 INVALID_MULTIPART_COMPLETION: quando `parts` está vazia ou incompleta em relação ao upload multipart no storage
- 400 validation error

---

#### GET /videos/:id (SI-03.6)

**Request headers:**
- Authorization: Bearer {access_token} — opcional; `@Public()`

**Response 200:**
- id: string (uuid)
- title: string
- status: string — `draft | processing | ready | error`
- durationSeconds: number | null
- width: number | null
- height: number | null
- createdAt: string (ISO-8601)

**Error responses:**
- 404 VIDEO_NOT_FOUND: quando o vídeo não existe, **ou** quando existe mas `status != ready` e o requester não é o dono do canal (oculta vídeos não prontos de não-donos)

---

#### GET /videos/:id/stream (SI-03.6)

**Request headers:**
- Authorization: Bearer {access_token} — opcional; `@Public()`

**Response 302:** redirect com header `Location` apontando para uma URL `GetObjectCommand` pré-assinada de curta duração (MinIO/S3 resolve `Range`/206 nativamente no destino do redirect)

**Error responses:**
- 404 VIDEO_NOT_FOUND
- 409 INVALID_VIDEO_STATE: quando `status != ready` (o asset processado ainda não existe)

---

#### GET /videos/:id/download (SI-03.6)

**Request headers:**
- Authorization: Bearer {access_token} — opcional; `@Public()`

**Response 302:** redirect com header `Location` apontando para uma URL `GetObjectCommand` pré-assinada com `ResponseContentDisposition: attachment`

**Error responses:**
- 404 VIDEO_NOT_FOUND
- 409 INVALID_VIDEO_STATE: quando `status != ready`

### Authorization Matrix

| Endpoint | Anonymous | Authenticated (não-dono) | Dono |
|----------|-----------|---------------------------|------|
| POST /channels/:channelId/videos | ✗ | ✗ | ✓ |
| POST /videos/:id/upload-parts | ✗ | ✗ | ✓ |
| POST /videos/:id/complete | ✗ | ✗ | ✓ |
| GET /videos/:id | ✓ (só se `status=ready`) | ✓ (só se `status=ready`) | ✓ (qualquer status) |
| GET /videos/:id/stream | ✓ (só se `status=ready`) | ✓ (só se `status=ready`) | ✓ (só se `status=ready`) |
| GET /videos/:id/download | ✓ (só se `status=ready`) | ✓ (só se `status=ready`) | ✓ (só se `status=ready`) |

### Error Catalog

| errorCode | HTTP | Trigger |
|-----------|------|---------|
| CHANNEL_NOT_FOUND | 404 | Iniciar upload em um `channelId` inexistente |
| CHANNEL_NOT_OWNED | 403 | Iniciar upload em um canal que não pertence ao requester |
| VIDEO_NOT_FOUND | 404 | Operação em um `videoId` inexistente, ou vídeo não-`ready` acessado por não-dono |
| VIDEO_NOT_OWNED | 403 | Operação de upload (`upload-parts`/`complete`) em um vídeo cujo canal não pertence ao requester |
| INVALID_VIDEO_STATE | 409 | `upload-parts`/`complete` chamado fora do estado `draft`, ou `stream`/`download` chamado com `status != ready` |
| FILE_SIZE_EXCEEDED | 400 | `fileSizeBytes` declarado no início do upload excede 10GB |
| INVALID_MULTIPART_COMPLETION | 400 | Lista de `parts` vazia ou incompleta ao completar o upload multipart |

### Events/Messages

#### video.process

**Payload:**

```json
{ "videoId": "uuid" }
```

**Producer:** `VideosService` (per `phase-03-videos/TD-02`, ao completar o upload multipart)
**Consumer:** `VideoProcessor` (per `phase-03-videos/TD-03`, worker dedicado; per `phase-03-videos/TD-04`, extrai metadados via `ffprobe` e gera thumbnail via `fluent-ffmpeg` em 10% da duração)
**Trigger:** `POST /videos/:id/complete` bem-sucedido — vídeo transiciona de `draft` para `processing` e o job é enfileirado
**Delivery semantics:** at-least-once, com retry automático (`attempts`/`backoff` exponencial) antes de marcar `error` (per `phase-03-videos/TD-06`)

---

#### cleanup.orphan-drafts

**Payload:** nenhum (job agendado, sem fila — varre a tabela `videos` diretamente)

**Producer:** `@nestjs/schedule` `@Cron(CronExpression.EVERY_DAY_AT_1AM)` (per `upload-cleanup-policy/TD-01`)
**Consumer:** `UploadCleanupService` (mesmo processo da API — não é um job de worker via fila)
**Trigger:** diariamente, às 01h — marca/remove vídeos `draft` sem atividade além do TTL configurado
**Delivery semantics:** best-effort, idempotente (execuções repetidas não afetam vídeos já limpos); a limpeza das partes multipart órfãs no storage é feita separadamente pela lifecycle rule nativa do bucket (`AbortIncompleteMultipartUpload`), fora do código da aplicação (per `upload-cleanup-policy/TD-01`)

---

<!-- phase-a-complete -->

## Dependency Map

<!-- Dep Map will be written in Phase B -->

---

## Deliverables

<!-- Deliverables will be written in Phase B -->
