---
kind: phase
name: phase-05-video-watch-page
test_specs_aware: true
sources_mtime:
  docs/phases/phase-05-video-watch-page/context.md: "2026-10-04T18:08:05-04:00"
  docs/project-plan.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-video-watch-page.md: "2026-10-04T09:36:07-04:00"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-next-frontend-msw-foundation.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-next-frontend-config-base.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-03-videos/context.md: "2026-09-23T14:42:16-04:00"
  docs/phases/phase-04-videos-channel/context.md: "2026-09-23T14:42:22-04:00"
  docs/phases/phase-04-videos-channel-frontend/context.md: "2026-09-30T11:38:01-04:00"
  .claude/skills/testing-guide-next-frontend/SKILL.md: "2026-09-17T19:27:23-04:00"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-17T19:27:23-04:00"
  docs/inventories/screen-inventory-phase-05-video-watch-page.md: "2026-09-30T20:23:46-04:00"
---

# Phase 05 — Página de Visualização do Vídeo

## Objective

Entregar a página de visualização do vídeo (`/watch/[id]`) com player funcional (play/pause, volume, progresso), layout de vídeo principal + informações + sidebar de sugestões, descrição expansível, contagem de visualizações, sugestões da mesma categoria, acesso anônimo e botão de download — incluindo a correção do vazamento de visibilidade anônima pré-existente em `findOne`/`stream`/`download` do backend.

---

## Step Implementations

### SI-05.1 — Backend: Unificação da regra de visibilidade anônima + contagem de views no detalhe

**Description:** Unifica a regra de visibilidade usada por `findOne` e `getPlaybackUrl` (stream/download), corrigindo o vazamento de rascunho pré-existente, e adiciona a contagem de visualizações ao detalhe do vídeo.

**Technical actions:**

1. Criar método privado `VideosService.assertViewable(video, userId?)` — dono (`video.channel.user_id === userId`) vê qualquer status; qualquer outro chamador (anônimo ou autenticado não-dono) vê apenas quando `status === READY && published_at != null && visibility IN (public, unlisted)` (per `video-watch-page/TD-08`).
2. Substituir o check `status !== READY` em `findOne` e `getPlaybackUrl` (usado por `stream` e `download`) pela chamada a `assertViewable` — lança `VideoNotFoundException` quando a regra falha (mesmo código de erro já usado, sem mudança de shape).
3. Adicionar leitura do contador Redis `views:{videoId}` (chave sem TTL, incrementada por SI-05.2) ao payload de `findOne` como campo `viewCount` (default `0` quando a chave não existe) (per `video-watch-page/TD-02`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.assertViewable` | Unit: dono vê rascunho/privado; anônimo não vê rascunho/privado/draft; anônimo vê public/unlisted ready | `videos.service.spec.ts` |
| `VideosController` findOne/stream/download | E2E: anônimo recebe 404 para vídeo não publicado; anônimo recebe 200/302 para público/unlisted publicado; dono recebe 200/302 para qualquer status | `videos.e2e-spec.ts` |
| `findOne` viewCount field | Integration: retorna `viewCount: 0` quando chave Redis ausente; retorna valor correto quando chave existe | `videos.integration-spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- `GET /videos/:id` anônimo para vídeo com `status=draft` OU `visibility=private` retorna `404` (antes vazava `200`)
- `GET /videos/:id/stream` e `GET /videos/:id/download` anônimos aplicam a mesma regra de 404
- `GET /videos/:id` dono retorna `200` para vídeo em qualquer status
- `GET /videos/:id` retorna `viewCount: 0` para vídeo sem visualizações registradas
- `GET /videos/:id/thumbnail` comportamento inalterado (regra já era mais estrita)

---

### SI-05.2 — Backend: Registro de contagem de visualizações

**Description:** Endpoint que registra uma visualização com deduplicação por cliente via Redis TTL, incrementando o contador lido por SI-05.1.

**Technical actions:**

1. Criar endpoint `POST /videos/:id/views` (`@Public()`) em `VideosController` (per `video-watch-page/TD-02`).
2. Implementar `VideosService.registerView(videoId, clientKey)`: usa `assertViewable` (SI-05.1) para validar visibilidade; verifica a chave de dedup `view:{videoId}:{clientKey}` no Redis (TTL ~30min); se ausente, seta a chave e executa `INCR` no contador `views:{videoId}`.
3. Derivar `clientKey` a partir do IP do request (sem sessão assumida, per `video-watch-page/TD-06`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.registerView` | Unit: primeira chamada incrementa; chamada repetida dentro da janela TTL não incrementa; vídeo não visível retorna erro | `videos.service.spec.ts` |
| `POST /videos/:id/views` | E2E: retorna `204`; retorna `404` para vídeo não visível anonimamente | `videos.e2e-spec.ts` |

**Dependencies:** SI-05.1 (regra de visibilidade + convenção da chave Redis do contador)

**Acceptance criteria:**

- `POST /videos/:id/views` com vídeo visível retorna `204` e incrementa `views:{videoId}` na primeira chamada de um cliente
- `POST /videos/:id/views` repetido pelo mesmo cliente dentro de ~30min não incrementa novamente
- `POST /videos/:id/views` para vídeo não visível anonimamente retorna `404 VIDEO_NOT_FOUND`

---

### SI-05.3 — Backend: Sugestões de vídeos relacionados

**Description:** Endpoint que retorna vídeos sugeridos da mesma categoria do vídeo atual, com fallback para vídeos públicos gerais quando insuficiente.

**Technical actions:**

1. Criar endpoint `GET /videos/:id/suggestions` (`@Public()`) em `VideosController` (per `video-watch-page/TD-03`).
2. Implementar `VideosService.getSuggestions(videoId, limit = 5)`: usa `assertViewable` (SI-05.1) para validar o vídeo de origem; busca vídeos `visibility=public` da mesma `category_id` (excluindo o próprio); completa até `limit` com vídeos públicos gerais quando insuficiente (per `video-watch-page/TD-03`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.getSuggestions` | Unit: mesma categoria preenche primeiro; fallback geral completa quando insuficiente; vídeo de origem não visível lança erro | `videos.service.spec.ts` |
| `GET /videos/:id/suggestions` | E2E: retorna lista com os campos esperados; retorna `404` para vídeo de origem não visível | `videos.e2e-spec.ts` |

**Dependencies:** SI-05.1 (regra de visibilidade do vídeo de origem)

**Acceptance criteria:**

- `GET /videos/:id/suggestions` retorna até `limit` itens da mesma categoria quando disponíveis
- `GET /videos/:id/suggestions` completa com vídeos públicos gerais quando a categoria tem menos que `limit` vídeos
- `GET /videos/:id/suggestions` para vídeo de origem não visível anonimamente retorna `404 VIDEO_NOT_FOUND`

---

### SI-05.4 — Frontend BFF: rotas de views, sugestões e download

**Description:** Rotas BFF que expõem ao browser os três endpoints backend desta fase, seguindo o modelo strict-BFF do projeto (next-frontend/CLAUDE.md § "Talking to the NestJS API").

**Technical actions:**

1. Criar `app/api/videos/[id]/views/route.ts` — `POST`, forward para `POST /videos/:id/views` (per §API Contracts → BFF tier).
2. Criar `app/api/videos/[id]/suggestions/route.ts` — `GET`, forward para `GET /videos/:id/suggestions` (per §API Contracts → BFF tier).
3. Criar `app/api/videos/[id]/download/route.ts` — `GET`, forward/redirect para `GET /videos/:id/download`, mesmo padrão de `app/api/videos/[id]/thumbnail/route.ts` já existente (per `video-watch-page/TD-07`).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/videos/[id]/views/route.ts` | Integration: MSW intercepta upstream, retorna `204`; propaga `404` | `route.integration.test.ts` |
| `app/api/videos/[id]/suggestions/route.ts` | Integration: MSW intercepta upstream, retorna lista pass-through; propaga `404` | `route.integration.test.ts` |
| `app/api/videos/[id]/download/route.ts` | Integration: MSW intercepta upstream, retorna redirect pass-through; propaga `404` | `route.integration.test.ts` |

**Dependencies:** SI-05.2 (views), SI-05.3 (suggestions) — endpoints backend devem existir antes do forward

**Acceptance criteria:**

- `POST /api/videos/[id]/views` encaminha para o upstream e repassa `204`
- `GET /api/videos/[id]/suggestions` encaminha para o upstream e repassa a lista pass-through
- `GET /api/videos/[id]/download` encaminha para o upstream e repassa o redirect, mesmo padrão do BFF de thumbnail
- Chamadas com erro upstream (`404`) são propagadas sem alteração de shape

---

### SI-05.5.0 — Drift audit: Página de visualização do vídeo

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página de visualização do vídeo`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) com:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219
   - Reused DS components: [`components/channel/video-card.tsx`]
   - Server-connected component names (no endpoints/auth/errors): [VideoPlayer container, ChannelInfo, UploadDate text, DescriptionText body, ViewCount text, DownloadAction, TabMenu, VideoCard ×5]
   - Target paths (read-only context for audit; no writes here): `app/watch/[id]/page.tsx` + `components/watch/*.tsx`

   Para cada componente na lista Reused DS, executar diff de valor contra o arquivo em disco e classificar per o enum de 4 valores. Escrever seção `## Screen: video-watch-page — audited at SI-05.5.0 ({YYYY-MM-DD})` em `frontend-drift-report.md`.

**Dependencies:** none

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` existe na pasta do plano; seção `## Screen: video-watch-page` existe com a data da execução atual
- Todo componente da lista Reused DS tem exatamente uma linha na tabela
- Toda linha tem a coluna Decision populada
- `git diff --name-only HEAD -- next-frontend` após o SI está vazio

---

### SI-05.5a — Tela de Página de visualização do vídeo (visual shell)

**Route:** `/watch/[id]`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página de visualização do vídeo`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: video-watch-page`

**Technical actions:**

1. **Apply drift decisions** — ler a seção do Drift Report para esta tela e aplicar cada linha per o verbo da coluna Decision.
2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) com:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219
   - Reused DS components: [`components/channel/video-card.tsx`] _(refletindo eventuais edits da ação 1)_
   - Server-connected component names (no endpoints/auth/errors): [VideoPlayer container, ChannelInfo, UploadDate text, DescriptionText body, ViewCount text, DownloadAction, TabMenu, VideoCard ×5]
   - Target paths: `app/watch/[id]/page.tsx` + `components/watch/*.tsx`

**Dependencies:** SI-05.5.0 _(audit-SI; mandatory)_

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-05.5b; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- Todos os target paths existem, exportam os componentes esperados e compilam per `next-frontend` build command
- Renderização corresponde à fidelidade do node Figma dentro da tolerância do conjunto de componentes DS
- Nenhum import em runtime além da lista Reused DS (mantém escopo visual)

---

### SI-05.5b — Tela de Página de visualização do vídeo (lógica & wiring)

**Test Specs:** see `next-frontend/specs/video-watch-page.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página de visualização do vídeo`

**Technical actions:**

1. **Route guard application** — per UI Contract `**Auth requirement:**` (Anonymous): nenhuma guarda de autenticação; a RSC não lê sessão (per `video-watch-page/TD-06`).
2. **Rendering strategy application** — per UI Contract `**Rendering strategy:**` (Server Component / RSC): sem `"use client"` no nível da página; sem cache (per `video-watch-page/TD-04`).
3. **Endpoint wiring** — `GET /videos/:id` (metadados + `viewCount`), `GET /api/videos/[id]/suggestions` (sidebar), dispara `POST /api/videos/[id]/views` fire-and-forget no carregamento; `DownloadAction` aponta para `GET /api/videos/[id]/download`.
4. **Error mapping** — per UI Contract `**Error Catalog → UX mapping:**`: `VIDEO_NOT_FOUND` → página not-found (404) do Next.js.
5. **Interações** — `<details>`/`<summary>` nativo para a descrição (per `video-watch-page/TD-05`); clique em chip da `TabMenu` refiltra `VideoCard ×5` localmente.

**Dependencies:**

- `SI-05.5a` (visual shell deve existir antes da lógica).
- `SI-05.4` (rotas BFF referenciadas pelos Server-connected components).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/watch/video-player.tsx` | Unit per testing-guide-next-frontend § "Client Components" — play/pause, volume, barra de progresso | `video-player.test.tsx` |
| `components/watch/description-text.tsx` | Unit — expansão/recolhimento via `<details>`/`<summary>` nativo | `description-text.test.tsx` |
| `components/watch/tab-menu.tsx` | Unit — clique em chip refiltra a lista de sugestões localmente | `tab-menu.test.tsx` |

E2E para a página (roteamento, fluxo completo) é autorado externamente por `/plan-test-specs` no spec file referenciado por `**Test Specs:**` acima.

**Acceptance criteria:**

- Página `/watch/[id]` anônima renderiza player, informações do vídeo e sidebar de sugestões
- Vídeo inexistente ou não visível anonimamente renderiza página not-found
- Botão de download aponta para `GET /api/videos/[id]/download`
- Clique em "ver mais" expande a descrição sem JS adicional (native `<details>`/`<summary>`)
- Clique em chip da `TabMenu` refiltra a lista de sugestões localmente

---

## Technical Specifications

### API Contracts

#### POST /videos/:id/views (SI-05.1)

**Request headers:** none required — client identity for the dedup window is derived server-side from the request's IP address (no session assumed; anonymous-first per video-watch-page/TD-06).

**Response 204:** No content.

**Error responses:**
- 404 VIDEO_NOT_FOUND: when the video does not exist, or is not visible anonymously under the unified rule (video-watch-page/TD-08)

---

#### GET /videos/:id/suggestions (SI-05.2)

**Request query parameters:**
- limit: number, optional, default 5 — matches the sidebar's `VideoCard ×5` slot count

**Response 200:**
- items: array of:
  - id: string (uuid)
  - title: string
  - thumbnailUrl: string
  - channelName: string
  - channelNickname: string
  - viewCount: number
  - publishedAt: string (ISO-8601)

**Error responses:**
- 404 VIDEO_NOT_FOUND: when the source video does not exist, or is not visible anonymously under the unified rule (video-watch-page/TD-08)

---

#### GET /videos/:id (modified) (SI-05.3)

**Response 200 (added field):**
- viewCount: number — total de visualizações do vídeo (video-watch-page/TD-02)

**Visibility rule (modified):** anonymous callers now see the video only when `status=ready` AND `published_at` is set AND `visibility IN (public, unlisted)`; owners continue to see the video regardless of status (video-watch-page/TD-08). Previously this endpoint checked only `status=ready`, leaking draft/private videos to anonymous callers who obtained the UUID.

**Error responses (changed enforcement, same code):**
- 404 VIDEO_NOT_FOUND: now also returned for anonymous access to a non-published, private, or draft video (previously leaked per the pre-existing bug documented in video-watch-page/TD-08)

---

#### GET /videos/:id/stream (modified) (SI-05.3)

Same visibility rule as above applies (video-watch-page/TD-08). No response-shape change.

**Error responses (changed enforcement, same code):**
- 404 VIDEO_NOT_FOUND: now also returned for anonymous access to a non-published, private, or draft video

---

#### GET /videos/:id/download (modified) (SI-05.3)

Same visibility rule as above applies (video-watch-page/TD-08). No response-shape change. (Endpoint itself inherited from phase-03-videos/TD-05; only enforcement changes.)

**Error responses (changed enforcement, same code):**
- 404 VIDEO_NOT_FOUND: now also returned for anonymous access to a non-published, private, or draft video

---

> _BFF tier — frontend-exposed contract. The browser calls the FE-facing route; the route proxies the upstream per next-frontend's strict BFF model (CLAUDE.md § "Talking to the NestJS API")._

#### POST /api/videos/[id]/views (SI-05.4)

**forwards-to:** `POST /videos/:id/views` *(derived: project contract source)*

**Request headers:** none *(derived: project contract source)*

**Response 204 (FE-facing):** pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*

---

#### GET /api/videos/[id]/suggestions (SI-05.4)

**forwards-to:** `GET /videos/:id/suggestions` *(derived: project contract source)*

**Request query parameters:**
- limit: number, optional *(derived: project contract source)*

**Response 200 (FE-facing):** pass-through `{ items: [...] }` *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*

---

#### GET /api/videos/[id]/download (SI-05.4)

**forwards-to:** `GET /videos/:id/download` *(derived: project contract source)*

**Response 302 (FE-facing):** redirect pass-through to the presigned Object Storage URL *(derived: project contract source; reshape: none)* — mirrors the existing `/api/videos/[id]/thumbnail` BFF passthrough pattern *(per video-watch-page/TD-07)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*

---

_Note: `GET /api/videos/[id]/stream` already exists (inherited from phase-04-videos-channel-frontend/TD-04) — not re-emitted here; only the backend's visibility enforcement behind it changed (video-watch-page/TD-08), which is transparent to this BFF route._

### Authorization Matrix

| Endpoint | Anonymous | Authenticated | Owner |
|----------|-----------|----------------|-------|
| GET /videos/:id | ✓ (ready + published + public/unlisted only — video-watch-page/TD-08) | ✓ (same rule) | ✓ (any status) |
| GET /videos/:id/stream | ✓ (same rule) | ✓ (same rule) | ✓ (any status) |
| GET /videos/:id/download | ✓ (same rule) | ✓ (same rule) | ✓ (any status) |
| GET /videos/:id/thumbnail | ✓ (ready + published + public only — stricter, unchanged) | ✓ | ✓ |
| POST /videos/:id/views | ✓ (same rule) | ✓ | ✓ |
| GET /videos/:id/suggestions | ✓ | ✓ | ✓ |

### Error Catalog

| errorCode | HTTP | Trigger |
|-----------|------|---------|
| VIDEO_NOT_FOUND | 404 | Vídeo inexistente, OU chamada anônima/autenticada não-dona para vídeo não publicado/privado/rascunho (novo gatilho via video-watch-page/TD-08) — código reutilizado de phase-03-videos |

<!-- Tech Specs subsections will be appended below in Phase A -->

### UI Contracts

#### Screen: Página de visualização do vídeo

**Route:** `/watch/[id]`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219 (node `upxCB4CzKKTSOT9NpdAZ0u:152:2219`)
**Purpose:** "Player de vídeo com controles: play/pause, volume e barra de progresso"

**Auth requirement:** Anonymous _(source: §Authorization Matrix — all endpoints referenced by this screen are Anonymous ✓)_

**Rendering strategy:** Server Component (RSC), sem leitura de sessão, fora de `(studio)/`, sem cache _(source: video-watch-page/TD-04, video-watch-page/TD-06)_

**Reused DS components:**
- `components/channel/video-card.tsx` — reuso direto do card de vídeo já usado na página pública do canal, para a sidebar de sugestões

**Server-connected components:**
- `VideoPlayer container` — verbs: Carregar e reproduzir o stream de vídeo a partir do Object Storage | endpoint: `GET /api/videos/[id]/stream` (inherited BFF route, phase-04-videos-channel-frontend/TD-04) | reuse: new
- `ChannelInfo — nome do canal` — verbs: Exibir nome do canal do vídeo | endpoint: `GET /videos/:id` enriched detail (phase-04-frontend-contract-gaps/TD-02) | reuse: new
- `UploadDate text` — verbs: Exibir data de publicação do vídeo | endpoint: `GET /videos/:id` | reuse: new
- `DescriptionText body` — verbs: Exibir descrição do vídeo | endpoint: `GET /videos/:id` | reuse: new
- `ViewCount text` — verbs: Exibir contagem de visualizações do vídeo | endpoint: `GET /videos/:id` (viewCount field) + `POST /api/videos/[id]/views` (§API Contracts → BFF tier) | reuse: new
- `DownloadAction` — verbs: Disparar download do vídeo | endpoint: `GET /api/videos/[id]/download` (§API Contracts → BFF tier) | reuse: new
- `TabMenu — chips de categoria/canal` — verbs: Filtrar sugestões de vídeo por categoria/canal | endpoint: `GET /api/videos/[id]/suggestions` (§API Contracts → BFF tier) | reuse: new
- `VideoCard ×5` — verbs: Exibir lista de vídeos sugeridos da mesma categoria na sidebar | endpoint: `GET /api/videos/[id]/suggestions` (§API Contracts → BFF tier) | reuse: `components/channel/video-card.tsx`

**Behaviors:**

*Rendered states:*
- Loading: não aplicável — RSC renderiza o conteúdo principal totalmente no servidor antes da resposta; o beacon `POST /api/videos/[id]/views` é fire-and-forget em background, sem estado de loading visível
- Empty: sidebar exibe "sem sugestões" quando `GET /api/videos/[id]/suggestions` retorna lista vazia mesmo após o fallback da Option B (video-watch-page/TD-03)
- Success: página completa com player, metadados, descrição e sugestões renderizados
- Error: vídeo inexistente ou não visível anonimamente → página not-found (404); falha ao carregar sugestões → seção de sugestões é omitida, resto da página renderiza normalmente (degradação graciosa)

*Interactions:*
- `<DescriptionText>` clique em "ver mais" (`<summary>`) → expande o `<details>` nativo revelando a descrição completa (video-watch-page/TD-05)
- `<TabMenu>` clique em chip → refiltra `<VideoCard ×5>` localmente por categoria/canal

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `VIDEO_NOT_FOUND` | Renderiza a página not-found (404) do Next.js |

**Client-side validation mirror:** _Not applicable — no form inputs on this screen._

**Accessibility notes:**
- `<details>`/`<summary>` nativo garante foco e leitura por screen reader sem JS adicional (video-watch-page/TD-05)
- Controles do player seguem a semântica nativa do `<video>` + Radix `Slider` (video-watch-page/TD-01)

### UI ↔ API Traceability Matrix

| Verb | Component | Screen | Endpoint (from API Contracts) | TD ref |
|------|-----------|--------|-------------------------------|--------|
| Carregar e reproduzir o stream de vídeo a partir do Object Storage | VideoPlayer container | /watch/[id] | `GET /api/videos/[id]/stream` → forwards-to `GET /videos/:id/stream` | phase-04-videos-channel-frontend/TD-04 _(inherited)_ |
| Exibir nome do canal do vídeo | ChannelInfo | /watch/[id] | `GET /videos/:id` | video-watch-page/TD-04 |
| Exibir data de publicação do vídeo | UploadDate text | /watch/[id] | `GET /videos/:id` | video-watch-page/TD-04 |
| Disparar download do vídeo | DownloadAction | /watch/[id] | `GET /api/videos/[id]/download` → forwards-to `GET /videos/:id/download` | video-watch-page/TD-07 |
| Exibir contagem de visualizações do vídeo | ViewCount text | /watch/[id] | `GET /videos/:id` (viewCount) + `POST /api/videos/[id]/views` → forwards-to `POST /videos/:id/views` | video-watch-page/TD-02 |
| Exibir descrição do vídeo | DescriptionText body | /watch/[id] | `GET /videos/:id` | video-watch-page/TD-05 |
| Filtrar sugestões de vídeo por categoria/canal | TabMenu | /watch/[id] | `GET /api/videos/[id]/suggestions` → forwards-to `GET /videos/:id/suggestions` | video-watch-page/TD-03 |
| Exibir lista de vídeos sugeridos da mesma categoria na sidebar | VideoCard ×5 | /watch/[id] | `GET /api/videos/[id]/suggestions` → forwards-to `GET /videos/:id/suggestions` | video-watch-page/TD-03 |

_Capabilities marked in `## Non-UI / Deferred Capabilities` (Acesso anônimo à visualização de vídeos; Vídeos unlisted acessíveis apenas via link direto) are excluded from this matrix — they are route-level/backend enforcement, not rendered verbs._

---

<!-- phase-a-complete -->

## Dependency Map

```
SI-05.1 (root)
├── SI-05.2 — depends on SI-05.1 (regra de visibilidade + convenção da chave Redis)
├── SI-05.3 — depends on SI-05.1 (regra de visibilidade do vídeo de origem)
└── SI-05.4 — depends on SI-05.2, SI-05.3 (endpoints backend devem existir antes do forward)
    └── SI-05.5b — depends on SI-05.4 (+ SI-05.5a)

SI-05.5.0 (root, independent)
└── SI-05.5a — depends on SI-05.5.0 (audit-SI)
    └── SI-05.5b — depends on SI-05.5a (visual shell)
```

---

## Deliverables

- [ ] SI-05.1 — Backend: Unificação da regra de visibilidade anônima + contagem de views no detalhe
- [ ] SI-05.2 — Backend: Registro de contagem de visualizações
- [ ] SI-05.3 — Backend: Sugestões de vídeos relacionados
- [ ] SI-05.4 — Frontend BFF: rotas de views, sugestões e download
- [ ] SI-05.5.0 — Drift audit: Página de visualização do vídeo
- [ ] SI-05.5a — Tela de Página de visualização do vídeo (visual shell)
- [ ] SI-05.5b — Tela de Página de visualização do vídeo (lógica & wiring)

**Per-screen deliverables:**

- [ ] Screen Página de visualização do vídeo (`/watch/[id]`) is routable
- [ ] Screen Página de visualização do vídeo (`/watch/[id]`) renders loading, success, and error states
- [ ] Screen Página de visualização do vídeo (`/watch/[id]`) passes component tests (per testing-guide-next-frontend layers)

**Full test suites:**

- [ ] Backend tests pass (`cd nestjs-project && docker compose exec nestjs-api npm test -- --runInBand`)
- [ ] Backend E2E tests pass (`cd nestjs-project && docker compose exec nestjs-api npm run test:e2e`)
- [ ] Backend type-check passes (`cd nestjs-project && docker compose exec nestjs-api npx tsc --noEmit`)
- [ ] Frontend tests pass (`cd next-frontend && docker compose exec next-frontend npm test`)
- [ ] Frontend E2E tests pass (`cd next-frontend && npx playwright test`) — after `/plan-test-specs video-watch-page` authors the SI-05.5b spec
- [ ] Frontend type-check passes (`cd next-frontend && docker compose exec next-frontend npx tsc --noEmit`)
- [ ] Frontend lint passes (`cd next-frontend && docker compose exec next-frontend npm run lint`)
