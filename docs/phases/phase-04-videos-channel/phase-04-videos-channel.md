---
kind: phase
name: phase-04-videos-channel
test_specs_aware: true
sources_mtime:
  docs/phases/phase-04-videos-channel/context.md: "2026-09-22T19:28:59-04:00"
  docs/phases/phase-04-videos-channel/library-refs.md: "2026-09-22T19:29:39-04:00"
  docs/decisions/technical-decisions-phase-04-videos-channel.md: "2026-09-22T19:27:23-04:00"
---

# Phase 04 — Gerenciamento de Vídeos e Canal (Backend)

## Objective

Entregar, no backend (`nestjs-project/`), a categorização de vídeos, a edição de informações do vídeo (título, descrição, categoria e thumbnail customizada), o modelo de visibilidade (público/unlisted) e fluxo de rascunho → publicação, a paginação das listagens de vídeo do canal (painel de gerenciamento e página pública), e a edição das informações do canal (nome, descrição e política de troca de nickname) — a base de contrato sobre a qual o painel de gerenciamento e a página pública do canal serão construídos em uma fase de frontend futura e separada.

---

## Step Implementations

### SI-04.1 — Categoria: entidade + migration

**Description:** Criar a entidade `Category` e a migration correspondente — base de dados para a taxonomia de vídeo.

**Technical actions:**

1. Criar `src/categories/entities/category.entity.ts` — `@Entity('categories')` com as colunas do Data Model (`id`, `name`, `created_at`) (per `phase-04-videos-channel/TD-01`)
2. Gerar a migration via `npm run migration:generate -- src/database/migrations/CreateCategories` e revisar o SQL gerado (tabela, índice unique em `name`)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `Category` | Integration: constraints, defaults | `src/categories/entities/category.entity.integration-spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- A migration cria a tabela `categories` com índice unique em `name`
- Inserir duas categorias com o mesmo `name` viola a constraint unique

---

### SI-04.2 — Categoria: módulo + endpoint GET /categories

**Description:** Expor a listagem de categorias disponíveis via `CategoriesModule`.

**Technical actions:**

1. Criar `src/categories/categories.service.ts` — `CategoriesService.findAll()` retorna todas as categorias cadastradas
2. Criar `src/categories/categories.controller.ts` — `CategoriesController` com `GET /categories` (`@Public()`)
3. Criar `src/categories/categories.module.ts` — `TypeOrmModule.forFeature([Category])`, `CategoriesService`, `CategoriesController`; importar em `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `CategoriesService.findAll` | Integration: DB contract | `src/categories/categories.service.integration-spec.ts` |
| `CategoriesModule` | Unit: compilation test | `src/categories/categories.module.spec.ts` |

**Dependencies:** SI-04.1

**Acceptance criteria:**

- `GET /categories` com banco vazio retorna `200` com `[]`
- `GET /categories` com N categorias cadastradas retorna todas

---

### SI-04.3 — Vídeo: colunas de edição + migration

**Description:** Adicionar as colunas de descrição, categoria, visibilidade e publicação à entidade `Video` existente.

**Technical actions:**

1. Adicionar as colunas `description`, `category_id`, `visibility`, `published_at` em `src/videos/entities/video.entity.ts` + `@ManyToOne(() => Category)` com `@JoinColumn({ name: 'category_id' })` (per `phase-04-videos-channel/TD-01`, `TD-02`, `TD-03`)
2. Gerar a migration via `npm run migration:generate -- src/database/migrations/AddVideoEditingColumns` e revisar o SQL gerado — FK `category_id → categories(id)` com `ON DELETE SET NULL`, índice em `category_id`, índice composto em `(channel_id, visibility, published_at)` (per `phase-04-videos-channel/TD-03` Cons note)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `Video` | Integration: constraints, defaults (`visibility` default `public`, `published_at` nullable, FK `category_id`) | `src/videos/entities/video.entity.integration-spec.ts` |

**Dependencies:** SI-04.1

**Acceptance criteria:**

- Vídeo criado sem `categoryId` persiste `category_id = null`
- Vídeo criado sem `visibility` explícito persiste `visibility = 'public'`
- A migration cria a FK `category_id → categories(id)` e o índice composto `(channel_id, visibility, published_at)`

---

### SI-04.4 — Vídeo: edição de informações (PATCH /videos/:id)

**Description:** Permitir que o dono edite título, descrição, categoria e visibilidade de um vídeo já cadastrado.

**Technical actions:**

1. Adicionar `CategoryNotFoundException` em `src/common/exceptions/domain.exception.ts` (404) (per `phase-02-auth/TD-07`)
2. Criar `src/videos/dto/update-video.dto.ts` (`title?`, `description?`, `categoryId?`, `visibility?`) validado via `class-validator`
3. Adicionar `VideosService.update(id, userId, dto)` — valida posse (`VideoNotOwnedException`), valida `categoryId` existente quando informado (`CategoryNotFoundException`), persiste as alterações (per `phase-04-videos-channel/TD-02`)
4. Adicionar handler `PATCH /videos/:id` em `VideosController`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.update` | Unit: branch logic (posse, validação de categoria) mock repo | `src/videos/videos.service.spec.ts` |
| `VideosController` (PATCH /videos/:id) | E2E | `test/videos.e2e-spec.ts` |

**Dependencies:** SI-04.1, SI-04.3

**Acceptance criteria:**

- `PATCH /videos/:id` como dono com `title` válido retorna `200` com o campo atualizado
- `PATCH /videos/:id` de vídeo de outro canal retorna `403` com `errorCode: "VIDEO_NOT_OWNED"`
- `PATCH /videos/:id` com `categoryId` inexistente retorna `404` com `errorCode: "CATEGORY_NOT_FOUND"`
- `PATCH /videos/:id` de vídeo inexistente retorna `404` com `errorCode: "VIDEO_NOT_FOUND"`

---

### SI-04.5 — Vídeo: upload de thumbnail customizada

**Description:** Permitir que o dono substitua a thumbnail gerada automaticamente por uma imagem própria.

**Technical actions:**

1. Instalar `@types/multer` como dev dependency (per `phase-04-videos-channel/TD-02`)
2. Adicionar `InvalidFileTypeException` e `ThumbnailSizeExceededException` em `domain.exception.ts` (400) (per `phase-02-auth/TD-07`)
3. Adicionar `VideosService.updateThumbnail(id, userId, file)` — valida posse, valida mimetype (`image/*`) e tamanho, sobrescreve a chave `videos/{id}/thumbnail.jpg` no storage (per `phase-03-videos/TD-07`), atualiza `thumbnail_key` (per `phase-04-videos-channel/TD-02`)
4. Adicionar handler `POST /videos/:id/thumbnail` com `@UseInterceptors(FileInterceptor('thumbnail'))`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.updateThumbnail` | Unit: branch logic (posse, validação de arquivo) mock storage client | `src/videos/videos.service.spec.ts` |
| `VideosController` (POST /videos/:id/thumbnail) | E2E | `test/videos.e2e-spec.ts` |

**Dependencies:** SI-04.3

**Acceptance criteria:**

- `POST /videos/:id/thumbnail` com imagem válida como dono retorna `200` e sobrescreve a `thumbnail_key` existente
- `POST /videos/:id/thumbnail` com arquivo não-imagem retorna `400` com `errorCode: "INVALID_FILE_TYPE"`
- `POST /videos/:id/thumbnail` de vídeo de outro canal retorna `403` com `errorCode: "VIDEO_NOT_OWNED"`

---

### SI-04.6 — Vídeo: publicação (POST /videos/:id/publish)

**Description:** Transicionar um vídeo `ready` de rascunho editorial para publicado — fluxo unidirecional nesta fase (sem despublicar).

**Technical actions:**

1. Adicionar `VideosService.publish(id, userId)` — valida posse (`VideoNotOwnedException`), valida `status === 'ready'` e `published_at` ainda `null` (`InvalidVideoStateException`, reaproveitada de `phase-03-videos`), seta `published_at = now()` (per `phase-04-videos-channel/TD-03`)
2. Adicionar handler `POST /videos/:id/publish` em `VideosController`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.publish` | Unit: branch logic (validação de estado) mock repo | `src/videos/videos.service.spec.ts` |
| `VideosController` (POST /videos/:id/publish) | E2E | `test/videos.e2e-spec.ts` |

**Dependencies:** SI-04.3

**Acceptance criteria:**

- `POST /videos/:id/publish` em vídeo `ready` e não publicado retorna `200` com `publishedAt` preenchido
- `POST /videos/:id/publish` em vídeo com `status` diferente de `ready` retorna `409` com `errorCode: "INVALID_VIDEO_STATE"`
- `POST /videos/:id/publish` em vídeo já publicado retorna `409` com `errorCode: "INVALID_VIDEO_STATE"` (publicação é unidirecional nesta fase)

---

### SI-04.7 — Canal: listagem paginada do painel (GET /channels/:id/manage/videos)

**Description:** Endpoint de listagem paginada de todos os vídeos do canal (qualquer status/visibilidade), restrito ao dono — base do painel de gerenciamento.

**Technical actions:**

1. Criar `src/videos/dto/list-channel-videos.dto.ts` (`page?`, `pageSize?`) validado via `class-validator`
2. Adicionar `VideosService.findByChannel(channelId, userId, { page, pageSize })` — valida posse do canal (`ChannelNotOwnedException`), pagina via TypeORM `skip`/`take`, todos os `status`/`visibility` (per `phase-04-videos-channel/TD-04`)
3. Adicionar handler `GET /channels/:id/manage/videos` em `VideosController` (rota distinta da listagem pública `GET /channels/:nickname/videos` do SI-04.8, que teria o mesmo padrão de rota)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.findByChannel` | Unit: branch logic (posse do canal) mock repo | `src/videos/videos.service.spec.ts` |
| `VideosService.findByChannel` | Integration: DB contract (paginação, filtro por canal) | `src/videos/videos.service.integration-spec.ts` |
| `VideosController` (GET /channels/:id/manage/videos) | E2E | `test/videos.e2e-spec.ts` |

**Dependencies:** SI-04.3

**Acceptance criteria:**

- `GET /channels/:id/manage/videos` como dono retorna `items` paginados com `total`, incluindo vídeos de qualquer `status`/`visibility`
- `GET /channels/:id/manage/videos` de canal de outro usuário retorna `403` com `errorCode: "CHANNEL_NOT_OWNED"`
- `GET /channels/:id/manage/videos` com `page` além do total retorna `items: []`

---

### SI-04.8 — Canal: página pública + listagem pública (GET /channels/:nickname, GET /channels/:nickname/videos)

**Description:** Endpoints públicos com as informações do canal e a listagem de vídeos visíveis a qualquer requisitante — apenas vídeos `ready` + `public` + publicados.

**Technical actions:**

1. Adicionar `VideosService.findPublicByChannel(nickname, { page, pageSize })` — filtra `status='ready' AND visibility='public' AND published_at IS NOT NULL` (per `phase-04-videos-channel/TD-04`)
2. Adicionar `ChannelsService.findByNickname(nickname)`
3. Criar `src/channels/channels.controller.ts` — `ChannelsController` com `GET /channels/:nickname` e `GET /channels/:nickname/videos`, ambos `@Public()`; criar `src/channels/channels.module.ts` se ainda não existir e importar em `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.findPublicByChannel` | Integration: DB contract (filtro de visibilidade/publicação) | `src/videos/videos.service.integration-spec.ts` |
| `ChannelsService.findByNickname` | Integration: DB contract | `src/channels/channels.service.integration-spec.ts` |
| `ChannelsController` (GET /channels/:nickname, GET /channels/:nickname/videos) | E2E | `test/channels.e2e-spec.ts` |

**Dependencies:** SI-04.3

**Acceptance criteria:**

- `GET /channels/:nickname` retorna os dados públicos do canal
- `GET /channels/:nickname` de nickname inexistente retorna `404` com `errorCode: "CHANNEL_NOT_FOUND"`
- `GET /channels/:nickname/videos` retorna apenas vídeos `ready` + `public` + publicados
- Um vídeo `draft` (não publicado) ou `unlisted` não aparece na listagem pública

---

### SI-04.9 — Canal: edição de informações (PATCH /channels/:id)

**Description:** Permitir que o dono edite nome, descrição e nickname do canal — colisão de nickname rejeitada com `409`, sem sufixo automático e sem redirect do nickname antigo.

**Technical actions:**

1. Adicionar `NicknameAlreadyExistsException` em `domain.exception.ts` (409) (per `phase-02-auth/TD-07`)
2. Criar `src/channels/dto/update-channel.dto.ts` (`name?`, `description?`, `nickname?`) validado via `class-validator`
3. Adicionar `ChannelsService.updateChannel(id, userId, dto)` — valida posse (`ChannelNotOwnedException`), em colisão de `nickname` lança `NicknameAlreadyExistsException` sem tentar sufixo automático (per `phase-04-videos-channel/TD-05`, diverge deliberadamente do sufixo automático de `phase-02-auth/TD-10`, usado apenas na criação)
4. Adicionar handler `PATCH /channels/:id` em `ChannelsController`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `ChannelsService.updateChannel` | Unit: branch logic (posse, colisão de nickname) mock repo | `src/channels/channels.service.spec.ts` |
| `ChannelsController` (PATCH /channels/:id) | E2E | `test/channels.e2e-spec.ts` |

**Dependencies:** SI-04.8

**Acceptance criteria:**

- `PATCH /channels/:id` como dono com `nickname` disponível retorna `200` com o `nickname` atualizado
- `PATCH /channels/:id` com `nickname` já em uso por outro canal retorna `409` com `errorCode: "NICKNAME_ALREADY_EXISTS"`
- `PATCH /channels/:id` de canal de outro usuário retorna `403` com `errorCode: "CHANNEL_NOT_OWNED"`

---

## Technical Specifications

### Data Model

#### Category _(new entity — per `phase-04-videos-channel/TD-01`)_

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, generated |
| name | varchar(100) | unique, not null |
| created_at | timestamptz | default now() |

**Relations:** `Category` has many `Video` (one-to-many)
**Indexes:** unique on `name`

Category values are free-form / admin-managed this phase — no fixed seed list is delivered (per `AMB-1` clarification in `validation.md`).

#### Video _(modified — new columns per `phase-04-videos-channel/TD-01`, `TD-02`, `TD-03`)_

New columns added to the existing `videos` table (`nestjs-project/src/videos/entities/video.entity.ts`):

| Field | Type | Constraints |
|-------|------|-------------|
| description | text | nullable |
| category_id | uuid | FK → `categories.id`, nullable |
| visibility | enum(`public`, `unlisted`) | not null, default `public` |
| published_at | timestamptz | nullable |

**Relations:** `Video` belongs to `Category` (many-to-one, nullable — `@JoinColumn({ name: 'category_id' })`)
**Indexes:** index on `category_id`; composite index on `(channel_id, visibility, published_at)` — supports the public channel listing query (`GET /channels/:nickname/videos`) filtering by owner + public visibility + published state in one pass.

`published_at IS NULL` = draft (editorial); non-null = published. This is orthogonal to the existing `status` enum (`draft | processing | ready | error`), which covers exclusively the technical upload/processing pipeline per `phase-03-videos/TD-06` — a video can be `status=ready` and still be an unpublished draft (`published_at IS NULL`). Publish is one-directional this phase — no unpublish/revert path (per `AMB-2` clarification in `validation.md`).

### API Contracts

#### GET /categories (SI-04.1)

**Response 200:**
- items: array of `{ id: string (uuid), name: string }`

**Error responses:** none (always returns `[]` when no categories exist).

---

#### PATCH /videos/:id (SI-04.2)

**Request headers:**
- Content-Type: application/json

**Request body** _(all fields optional — partial update)_:
- title: string, optional
- description: string, optional
- categoryId: string (uuid), optional
- visibility: string, optional — one of `public`, `unlisted`

**Response 200:**
- id: string (uuid)
- title: string
- description: string | null
- categoryId: string (uuid) | null
- visibility: string
- status: string
- publishedAt: string (date-time) | null

**Error responses:**
- 400 validation error: when the request body fails schema validation
- 403 VIDEO_NOT_OWNED: when the video does not belong to the requester's channel
- 404 VIDEO_NOT_FOUND: when the video does not exist
- 404 CATEGORY_NOT_FOUND: when `categoryId` is provided but does not match an existing category

---

#### POST /videos/:id/thumbnail (SI-04.3)

**Request headers:**
- Content-Type: multipart/form-data

**Request body:**
- thumbnail: file, required — image only (`image/*`), overwrites the same storage key already used by the automatic thumbnail (`videos/{id}/thumbnail.jpg`, per `phase-03-videos/TD-07`)

**Response 200:**
- id: string (uuid)
- thumbnailKey: string

**Error responses:**
- 400 INVALID_FILE_TYPE: when the uploaded file is not an image
- 400 THUMBNAIL_SIZE_EXCEEDED: when the uploaded file exceeds the configured size limit
- 403 VIDEO_NOT_OWNED: when the video does not belong to the requester's channel
- 404 VIDEO_NOT_FOUND: when the video does not exist

---

#### POST /videos/:id/publish (SI-04.4)

**Request headers:**
- Content-Type: application/json

**Response 200:**
- id: string (uuid)
- publishedAt: string (date-time)

**Error responses:**
- 403 VIDEO_NOT_OWNED: when the video does not belong to the requester's channel
- 404 VIDEO_NOT_FOUND: when the video does not exist
- 409 INVALID_VIDEO_STATE: when the video's `status` is not `ready`, or when it is already published (`published_at` already set — publish is one-directional this phase, per `AMB-2` clarification)

---

#### GET /channels/:id/manage/videos (SI-04.7)

Management panel listing — owner-only, returns videos of any `status`/`visibility`/publication state.

**Request query parameters:**
- page: number, optional — default 1
- pageSize: number, optional — default 20

**Response 200:**
- items: array of `{ id, title, thumbnailKey, status, visibility, publishedAt, views, likes, comments }` — `views`, `likes`, and `comments` are placeholder fields (`0`/`null`) until Phase 06 (Interações Sociais) lands, per `AMB-3` clarification in `validation.md`
- page: number
- pageSize: number
- total: number

**Error responses:**
- 403 CHANNEL_NOT_OWNED: when the channel does not belong to the requester
- 404 CHANNEL_NOT_FOUND: when the channel does not exist

---

#### GET /channels/:nickname/videos (SI-04.6)

Public channel page listing — returns only videos with `status=ready`, `visibility=public`, and `published_at IS NOT NULL`.

**Request query parameters:**
- page: number, optional — default 1
- pageSize: number, optional — default 20

**Response 200:**
- items: array of `{ id, title, thumbnailKey, publishedAt, durationSeconds }`
- page: number
- pageSize: number
- total: number

**Error responses:**
- 404 CHANNEL_NOT_FOUND: when no channel matches `nickname`

---

#### GET /channels/:nickname (SI-04.6)

Public channel info page.

**Response 200:**
- id: string (uuid)
- name: string
- nickname: string
- description: string | null

**Error responses:**
- 404 CHANNEL_NOT_FOUND: when no channel matches `nickname`

---

#### PATCH /channels/:id (SI-04.7)

**Request headers:**
- Content-Type: application/json

**Request body** _(all fields optional — partial update)_:
- name: string, optional
- description: string, optional
- nickname: string, optional

**Response 200:**
- id: string (uuid)
- name: string
- nickname: string
- description: string | null

**Error responses:**
- 400 validation error: when the request body fails schema validation
- 403 CHANNEL_NOT_OWNED: when the channel does not belong to the requester
- 404 CHANNEL_NOT_FOUND: when the channel does not exist
- 409 NICKNAME_ALREADY_EXISTS: when the new `nickname` collides with another channel's nickname — no automatic suffix, no redirect of the old nickname (per `phase-04-videos-channel/TD-05`, deliberately diverging from `phase-02-auth/TD-10`'s creation-time auto-suffix behavior)

---

### Authorization Matrix

| Endpoint | Anonymous | Authenticated | Owner |
|----------|-----------|---------------|-------|
| GET /categories | ✓ | ✓ | ✓ |
| PATCH /videos/:id | ✗ | ✗ | ✓ |
| POST /videos/:id/thumbnail | ✗ | ✗ | ✓ |
| POST /videos/:id/publish | ✗ | ✗ | ✓ |
| GET /channels/:id/manage/videos | ✗ | ✗ | ✓ |
| GET /channels/:nickname/videos | ✓ | ✓ | ✓ |
| GET /channels/:nickname | ✓ | ✓ | ✓ |
| PATCH /channels/:id | ✗ | ✗ | ✓ |

### Error Catalog

| errorCode | HTTP | Trigger |
|-----------|------|---------|
| CATEGORY_NOT_FOUND | 404 | `categoryId` informado não corresponde a uma categoria existente |
| INVALID_FILE_TYPE | 400 | Arquivo enviado como thumbnail não é uma imagem |
| THUMBNAIL_SIZE_EXCEEDED | 400 | Arquivo de thumbnail excede o limite de tamanho configurado |
| VIDEO_NOT_FOUND | 404 | _(existing — `phase-03-videos`)_ Vídeo não encontrado |
| VIDEO_NOT_OWNED | 403 | _(existing — `phase-03-videos`)_ Vídeo não pertence ao canal do requisitante |
| INVALID_VIDEO_STATE | 409 | _(existing — `phase-03-videos`, reused)_ Tentativa de publicar vídeo que não está `ready`, ou que já foi publicado |
| CHANNEL_NOT_FOUND | 404 | _(existing — `phase-03-videos`)_ Canal não encontrado |
| CHANNEL_NOT_OWNED | 403 | _(existing — `phase-03-videos`)_ Canal não pertence ao requisitante |
| NICKNAME_ALREADY_EXISTS | 409 | Novo nickname já está em uso por outro canal |

---

<!-- phase-a-complete -->

## Dependency Map

```
SI-04.1 (root — categoria: entidade + migration)
├── SI-04.2 — depends on SI-04.1 (categoria: módulo + endpoint GET /categories)
└── SI-04.3 — depends on SI-04.1 (vídeo: colunas de edição + migration)
    ├── SI-04.4 — depends on SI-04.1, SI-04.3 (vídeo: edição de informações)
    ├── SI-04.5 — depends on SI-04.3 (vídeo: upload de thumbnail)
    ├── SI-04.6 — depends on SI-04.3 (vídeo: publicação)
    ├── SI-04.7 — depends on SI-04.3 (canal: listagem paginada do painel)
    └── SI-04.8 — depends on SI-04.3 (canal: página pública + listagem pública)
        └── SI-04.9 — depends on SI-04.8 (canal: edição de informações)
```

---

## Deliverables

- [x] SI-04.1 — Categoria: entidade + migration
- [x] SI-04.2 — Categoria: módulo + endpoint GET /categories
- [x] SI-04.3 — Vídeo: colunas de edição + migration
- [x] SI-04.4 — Vídeo: edição de informações (PATCH /videos/:id)
- [x] SI-04.5 — Vídeo: upload de thumbnail customizada
- [x] SI-04.6 — Vídeo: publicação (POST /videos/:id/publish)
- [x] SI-04.7 — Canal: listagem paginada do painel (GET /channels/:id/manage/videos)
- [x] SI-04.8 — Canal: página pública + listagem pública (GET /channels/:nickname, GET /channels/:nickname/videos)
- [x] SI-04.9 — Canal: edição de informações (PATCH /channels/:id)

**Full test suites:**

- [x] Testes unitários e de integração passam (`docker compose exec nestjs-api npm test -- --runInBand`) — 235/235
- [x] Testes E2E passam (`docker compose exec nestjs-api npm run test:e2e`) — 97/97
- [x] Type-check passa (`docker compose exec nestjs-api npx tsc --noEmit`)
- [ ] Lint passa (`docker compose exec nestjs-api npm run lint`) — **falha**: 280 erros (`no-unsafe-member-access`/`no-unsafe-*` em specs e `err as any` em `channels.service.ts`), parte pré-existente à fase; ver `progress.md`
