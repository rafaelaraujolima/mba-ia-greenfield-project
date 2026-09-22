---
kind: phase
name: phase-03-videos
test_specs_aware: true
sources_mtime:
  docs/phases/phase-03-videos/context.md: "2026-09-20T15:34:30-04:00"
  docs/phases/phase-03-videos/library-refs.md: "2026-09-20T15:56:03-04:00"
  docs/decisions/technical-decisions-phase-03-videos.md: "2026-09-20T15:32:08-04:00"
  docs/decisions/technical-decisions-upload-cleanup-policy.md: "2026-09-20T15:32:18-04:00"
---

# Fase 03 — Upload e Processamento de Vídeos

## Objective

Implementar o upload de vídeos de até 10GB sem travar a API (multipart direto ao storage via URLs pré-assinadas), com pré-cadastro automático do vídeo como rascunho ao iniciar o upload, processamento automático em segundo plano (fila BullMQ + worker dedicado extraindo duração/metadados via `ffprobe` e gerando thumbnail via `fluent-ffmpeg`), URL única por vídeo com streaming e download via redirect para URL pré-assinada de leitura, ciclo de status com retry automático em falha, e limpeza automática de uploads multipart abandonados e vídeos rascunho órfãos — entregando upload de até 10GB funcional, processamento automático do vídeo, streaming funcionando e URLs únicas geradas.

---

## Step Implementations

### SI-03.1 — Dependências, configuração e infraestrutura Docker

**Description:** Instalar as dependências de produção da fase, criar os namespaces de configuração de storage e fila, e subir a infraestrutura nova (Redis, MinIO, worker dedicado) no Compose.

**Technical actions:**

1. Instalar dependências de produção: `@nestjs/bullmq`, `bullmq`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `fluent-ffmpeg`, `@nestjs/schedule` (per `phase-03-videos/TD-01`, `TD-02`, `TD-04`, `upload-cleanup-policy/TD-01`)
2. Criar `src/config/storage.config.ts` (`registerAs('storage', ...)` — `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_REGION`) e `src/config/queue.config.ts` (`registerAs('queue', ...)` — `REDIS_HOST`, `REDIS_PORT`); atualizar `src/config/env.validation.ts` e `.env.example` com as novas variáveis (padrão `registerAs` per Inherited Conventions, phase 01)
3. Adicionar os serviços `redis`, `minio` e `nestjs-worker` (mesma imagem da API, comando de start diferente) ao `nestjs-project/compose.yaml`, com healthchecks (per `phase-03-videos/TD-03`)
4. Atualizar `Dockerfile.dev` para instalar o binário `ffmpeg` via `apt install ffmpeg` (necessário para `fluent-ffmpeg`, per `phase-03-videos/TD-04`)
5. Criar script de bootstrap `src/storage/configure-storage.ts` que garante a existência do bucket no MinIO (via `HeadBucketCommand`/`CreateBucketCommand`) (per `phase-03-videos/TD-07`)

**Tests:** _(empty — Infra)_

**Dependencies:** none

**Acceptance criteria:**

- `docker compose up -d` traz `redis`, `minio` e `nestjs-worker` com status healthy, além dos serviços já existentes
- Subir a aplicação sem `STORAGE_BUCKET` definido causa erro de validação Joi no bootstrap — a aplicação não inicia
- O binário `ffmpeg` está disponível dentro do container do worker (`ffmpeg -version` executa sem erro)
- O bucket configurado em `STORAGE_BUCKET` existe no MinIO após rodar o script de bootstrap

---

### SI-03.2 — Entidade Video + migration

**Description:** Criar a entidade `Video`, seu relacionamento com `Channel`, e a migration correspondente.

**Technical actions:**

1. Criar `src/videos/entities/video.entity.ts` — `@Entity('videos')` com as colunas do Data Model (`id`, `channel_id`, `title`, `status` enum, `error_message`, `storage_key`, `thumbnail_key`, `storage_upload_id`, `content_type`, `file_size_bytes`, `duration_seconds`, `width`, `height`, `created_at`, `updated_at`); `@ManyToOne(() => Channel)` + `@JoinColumn({ name: 'channel_id' })`
2. Atualizar `src/channels/entities/channel.entity.ts` — adicionar `@OneToMany(() => Video, (video) => video.channel)` no lado inverso do relacionamento
3. Gerar a migration via `npm run migration:generate -- src/database/migrations/CreateVideos` e revisar o SQL gerado (tabela, enum, FK, índices)
4. Criar `src/videos/videos.module.ts` — `VideosModule` com `TypeOrmModule.forFeature([Video])`, exporta `TypeOrmModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `Video` | Integration: constraints, defaults, enum de status | `src/videos/entities/video.entity.integration-spec.ts` |
| `VideosModule` | Unit: compilation test | `src/videos/videos.module.spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- A migration cria a tabela `videos` com FK para `channels(id)`, enum de status e índices em `channel_id`/`status`
- Inserir um `Video` sem `channel_id` viola constraint NOT NULL
- Campos opcionais (`thumbnail_key`, `duration_seconds`, `width`, `height`, `error_message`) aceitam `null`
- `VideosModule` compila e resolve suas dependências via `Test.createTestingModule`

---

### SI-03.3 — Iniciar upload e solicitar URLs de parte

**Description:** Pré-cadastrar o vídeo como rascunho, iniciar o upload multipart no storage, e permitir que o cliente solicite URLs pré-assinadas por parte.

**Technical actions:**

1. Criar `src/videos/dto/create-video.dto.ts` (`title`, `contentType`, `fileSizeBytes`) e `src/videos/dto/request-upload-parts.dto.ts` (`partNumbers: number[]`)
2. Criar as subclasses de `DomainException` do Error Catalog desta fase: `ChannelNotFoundException`, `ChannelNotOwnedException`, `VideoNotFoundException`, `VideoNotOwnedException`, `InvalidVideoStateException`, `FileSizeExceededException` (per `phase-02-auth/TD-07`)
3. Criar `src/videos/videos.service.ts` — método `initiateUpload(channelId, userId, dto)`: valida posse do canal, valida `fileSizeBytes` ≤ 10GB, cria `Video` em `draft`, chama `CreateMultipartUploadCommand`, persiste `storage_upload_id` e `storage_key` (per `phase-03-videos/TD-02`, `TD-07`)
4. Adicionar método `requestUploadParts(videoId, userId, dto)` ao `VideosService` — valida posse e `status=draft`, gera URLs pré-assinadas via `getSignedUrl(UploadPartCommand)` por `partNumber` (per `phase-03-videos/TD-02`)
5. Criar `src/videos/videos.controller.ts` — `POST /channels/:channelId/videos` e `POST /videos/:id/upload-parts`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.initiateUpload` | Unit: branch logic (posse do canal, limite de tamanho) | `src/videos/videos.service.spec.ts` |
| `VideosService.initiateUpload` / `requestUploadParts` | Integration: DB + storage real (MinIO) | `src/videos/videos.service.integration-spec.ts` |
| `VideosController` (initiate + upload-parts) | E2E | `test/videos.e2e-spec.ts` |

**Dependencies:** SI-03.1, SI-03.2

**Acceptance criteria:**

- `POST /channels/:channelId/videos` com corpo válido retorna `201` com `id`, `status: "draft"` e `uploadId`
- `POST /channels/:channelId/videos` em canal de outro usuário retorna `403` com `errorCode: "CHANNEL_NOT_OWNED"`
- `POST /channels/:channelId/videos` com `fileSizeBytes` acima de 10GB retorna `400` com `errorCode: "FILE_SIZE_EXCEEDED"`
- `POST /videos/:id/upload-parts` com `partNumbers` válido retorna `200` com uma URL por parte solicitada
- `POST /videos/:id/upload-parts` em vídeo que não está em `draft` retorna `409` com `errorCode: "INVALID_VIDEO_STATE"`

---

### SI-03.4 — Completar upload e enfileirar processamento

**Description:** Completar o upload multipart no storage, transicionar o vídeo para `processing`, e enfileirar o job de processamento.

**Technical actions:**

1. Criar `src/videos/dto/complete-upload.dto.ts` (`parts: { partNumber, eTag }[]`)
2. Adicionar método `completeUpload(videoId, userId, dto)` ao `VideosService` — valida posse e `status=draft`, chama `CompleteMultipartUploadCommand`, atualiza `status=processing`, limpa `storage_upload_id`, enfileira o job `video.process` na fila BullMQ (per `phase-03-videos/TD-02`, `TD-06`)
3. Registrar `BullModule.registerQueue({ name: 'video-processing' })` no `VideosModule` e injetar `Queue` no `VideosService` via `@InjectQueue`
4. Adicionar `POST /videos/:id/complete` ao `VideosController`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.completeUpload` | Unit: branch logic (status/posse) | `src/videos/videos.service.spec.ts` |
| `VideosService.completeUpload` | Integration: DB + storage + fila real (BullMQ/Redis) | `src/videos/videos.service.integration-spec.ts` |
| `VideosController` (complete) | E2E | `test/videos.e2e-spec.ts` |

**Dependencies:** SI-03.1, SI-03.3

**Acceptance criteria:**

- `POST /videos/:id/complete` com `parts` válidas retorna `200` com `status: "processing"`
- `POST /videos/:id/complete` com `parts` vazia ou incompleta retorna `400` com `errorCode: "INVALID_MULTIPART_COMPLETION"`
- `POST /videos/:id/complete` em vídeo que já não está em `draft` retorna `409` com `errorCode: "INVALID_VIDEO_STATE"`
- Completar o upload enfileira um job `video.process` com `{ videoId }` na fila `video-processing`

---

### SI-03.5 — Worker de processamento de vídeo

**Description:** Criar o worker dedicado que consome os jobs `video.process`, extrai metadados via `ffprobe`, gera a thumbnail, e atualiza o status do vídeo.

**Technical actions:**

1. Criar o entrypoint dedicado `src/main-worker.ts` — bootstrap via `NestFactory.createApplicationContext(AppModule)` (per `phase-03-videos/TD-03`)
2. Criar `src/videos/video.processor.ts` — `@Processor('video-processing') class VideoProcessor extends WorkerHost`, job configurado com `attempts: 3` e `backoff: { type: 'exponential', delay: 5000 }` (per `phase-03-videos/TD-06`)
3. Implementar `process(job)`: baixar o arquivo original do storage, rodar `ffmpeg.ffprobe()` para extrair `duration_seconds`/`width`/`height`, gerar thumbnail via `.screenshots({ timestamps: ['10%'] })`, subir a thumbnail para `thumbnail_key`, atualizar `Video` para `status=ready` (per `phase-03-videos/TD-04`, `TD-07`)
4. Tratar falha: ao esgotar as tentativas, atualizar `Video` para `status=error` com `error_message` (per `phase-03-videos/TD-06`)
5. Registrar `VideoProcessor` no `VideosModule` e atualizar o comando de start do serviço `nestjs-worker` no Compose para `node dist/main-worker`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideoProcessor.process` (sucesso e falha) | Integration: fila/Redis real + MinIO real + `ffmpeg` real, atualiza `Video` para `ready` com metadados corretos ou `error` com `error_message` após esgotar tentativas | `src/videos/video.processor.integration-spec.ts` |

**Dependencies:** SI-03.1, SI-03.2, SI-03.4

**Acceptance criteria:**

- Um job `video.process` bem-sucedido atualiza o `Video` para `status: "ready"` com `duration_seconds`, `width`, `height` e `thumbnail_key` preenchidos
- A thumbnail gerada corresponde ao frame em 10% da duração do vídeo
- Um job que falha em todas as tentativas atualiza o `Video` para `status: "error"` com `error_message` preenchido
- O worker roda em processo/container separado da API (`nestjs-worker`), compartilhando o mesmo `VideosModule`

---

### SI-03.6 — Consulta, streaming e download do vídeo

**Description:** Expor a leitura do vídeo e a reprodução via streaming/download por redirect a uma URL pré-assinada.

**Technical actions:**

1. Adicionar método `findOne(videoId, userId?)` ao `VideosService` — retorna o vídeo se `status=ready`, ou se o requester é o dono do canal; caso contrário lança `VideoNotFoundException`
2. Adicionar método `getPlaybackUrl(videoId, disposition: 'inline' | 'attachment')` ao `VideosService` — valida `status=ready`, gera URL pré-assinada via `getSignedUrl(GetObjectCommand)` (com `ResponseContentDisposition: 'attachment'` quando `disposition='attachment'`) (per `phase-03-videos/TD-05`, `TD-07`)
3. Adicionar `GET /videos/:id`, `GET /videos/:id/stream` e `GET /videos/:id/download` ao `VideosController` — as duas últimas com `@Public()` e redirect `302` para a URL retornada
4. Aplicar `@Public()` também em `GET /videos/:id` (acesso anônimo permitido, com a regra de visibilidade do item 1)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.findOne` / `getPlaybackUrl` | Unit: branch logic (visibilidade por status/posse) | `src/videos/videos.service.spec.ts` |
| `VideosService.getPlaybackUrl` | Integration: storage real (MinIO) | `src/videos/videos.service.integration-spec.ts` |
| `VideosController` (get/stream/download) | E2E | `test/videos.e2e-spec.ts` |

**Dependencies:** SI-03.2

**Acceptance criteria:**

- `GET /videos/:id` com vídeo `ready` retorna `200` com os metadados, mesmo sem autenticação
- `GET /videos/:id` com vídeo em `draft`/`processing`/`error` acessado por não-dono (ou anônimo) retorna `404` com `errorCode: "VIDEO_NOT_FOUND"`
- `GET /videos/:id` com vídeo em `draft` acessado pelo dono retorna `200` com o status atual
- `GET /videos/:id/stream` com vídeo `ready` retorna `302` com header `Location` apontando para uma URL de leitura pré-assinada
- `GET /videos/:id/stream` ou `/download` com vídeo não `ready` retorna `409` com `errorCode: "INVALID_VIDEO_STATE"`
- `GET /videos/:id/download` retorna `302` com uma URL cujo `ResponseContentDisposition` é `attachment`

---

### SI-03.7 — Limpeza de uploads e rascunhos abandonados

**Description:** Job agendado único que expira vídeos `draft` sem atividade além do TTL **e** aborta uploads multipart incompletos no storage além do TTL — o MinIO não suporta a lifecycle rule `AbortIncompleteMultipartUpload` nativamente (confirmado empiricamente; ver `**Revisions:**` de `upload-cleanup-policy/TD-01`), então a limpeza do storage também é responsabilidade deste cron (per `upload-cleanup-policy/TD-01`, revisado para Option B).

**Technical actions:**

1. Criar `src/videos/upload-cleanup.service.ts` — `@Cron(CronExpression.EVERY_DAY_AT_1AM) async cleanupOrphanDrafts()`: busca `Video` com `status=draft` e `updated_at` além do TTL configurado, marca como `error` com `error_message` explicando o timeout (per `upload-cleanup-policy/TD-01`)
2. Adicionar `cleanupAbandonedMultipartUploads()` ao mesmo service: lista uploads multipart incompletos via `ListMultipartUploadsCommand`, aborta os iniciados há mais de `MULTIPART_LIFECYCLE_DAYS` dias via `AbortMultipartUploadCommand` (per `upload-cleanup-policy/TD-01`)
3. Importar `ScheduleModule.forRoot()` no `VideosModule`
4. Registrar `UploadCleanupService` como provider do `VideosModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `UploadCleanupService.cleanupOrphanDrafts` | Integration: DB real — drafts antigos viram `error`; drafts recentes e vídeos em outros estados não são tocados | `src/videos/upload-cleanup.service.integration-spec.ts` |
| `UploadCleanupService.cleanupAbandonedMultipartUploads` | Integration: MinIO real — multipart uploads antigos são abortados; recentes não são tocados | `src/videos/upload-cleanup.service.integration-spec.ts` |

**Dependencies:** SI-03.1, SI-03.2

**Acceptance criteria:**

- Um `Video` em `draft` com `updated_at` além do TTL é marcado como `error` com `error_message` explicando a expiração
- Um `Video` em `draft` recente (dentro do TTL) não é alterado pelo cron
- Um `Video` já em `ready`/`processing`/`error` não é alterado pelo cron
- Um upload multipart iniciado no storage há mais de `MULTIPART_LIFECYCLE_DAYS` dias é abortado (`ListMultipartUploads` não o lista mais depois)
- Um upload multipart recente (dentro do TTL) não é abortado pelo cron

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

```
SI-03.1 (root — dependências, config, infra Docker)
SI-03.2 (root — entidade Video + migration)
├── SI-03.3 — depends on SI-03.1, SI-03.2 (iniciar upload + upload-parts)
│   └── SI-03.4 — depends on SI-03.1, SI-03.3 (completar upload + enfileirar)
│       └── SI-03.5 — depends on SI-03.1, SI-03.2, SI-03.4 (worker de processamento)
├── SI-03.6 — depends on SI-03.2 (consulta, streaming, download)
└── SI-03.7 — depends on SI-03.1, SI-03.2 (limpeza de uploads/drafts abandonados)
```

---

## Deliverables

- [x] SI-03.1 — Dependências, configuração e infraestrutura Docker
- [x] SI-03.2 — Entidade Video + migration
- [x] SI-03.3 — Iniciar upload e solicitar URLs de parte
- [x] SI-03.4 — Completar upload e enfileirar processamento
- [x] SI-03.5 — Worker de processamento de vídeo
- [x] SI-03.6 — Consulta, streaming e download do vídeo
- [x] SI-03.7 — Limpeza de uploads e rascunhos abandonados

**Full test suites:**

- [x] Testes unitários e de integração passam (`docker compose exec nestjs-api npm test -- --runInBand`) — 196/196
- [x] Testes E2E passam (`docker compose exec nestjs-api npm run test:e2e`) — 71/71
- [x] Type-check passa (`docker compose exec nestjs-api npx tsc --noEmit`)
- [x] Lint passa (`docker compose exec nestjs-api npm run lint`)
