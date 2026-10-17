---
kind: phase
name: phase-07-home-search-finalization
test_specs_aware: true
sources_mtime:
  docs/phases/phase-07-home-search-finalization/context.md: "2026-10-14T19:28:23-04:00"
  docs/project-plan.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-home-search-finalization.md: "2026-10-14T19:20:42-04:00"
  docs/decisions/technical-decisions-next-frontend-msw-foundation.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-next-frontend-config-base.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-03-videos/context.md: "2026-09-23T14:42:16-04:00"
  docs/phases/phase-04-videos-channel/context.md: "2026-09-23T14:42:22-04:00"
  docs/phases/phase-04-videos-channel-frontend/context.md: "2026-10-04T21:01:55-04:00"
  docs/phases/phase-05-video-watch-page/context.md: "2026-10-08T13:36:47-04:00"
  docs/phases/phase-06-social-interactions/context.md: "2026-10-12T17:16:34-04:00"
  docs/inventories/screen-inventory-phase-07-home-search-finalization.md: "2026-10-12T18:29:24-04:00"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-17T19:27:23-04:00"
  .claude/skills/testing-guide-next-frontend/SKILL.md: "2026-09-17T19:27:23-04:00"
---

# Phase 07 — Página Inicial, Busca e Finalização

## Objective

Entregar a página inicial com grid de vídeos (thumbnail, título, canal, visualizações e tempo de publicação) e filtro por categoria, a busca por título e canal com resultados paginados, o header/navbar com logo, busca, login/avatar e navegação nas páginas públicas, a paginação das listagens, o layout responsivo para dispositivos móveis, os testes dos fluxos principais da plataforma e o ambiente de produção com deploy configurado.

---

## Step Implementations

### SI-07.1 — Infra: extensão `pg_trgm` e índices trigram da busca

**Description:** Habilita a extensão `pg_trgm` e cria os índices GIN que sustentam a busca por substring em título de vídeo e nome/nickname de canal.

**Technical actions:**

1. Criar a migration `AddSearchTrigramIndexes` em `nestjs-project/src/database/migrations/` (via `npm run migration:create`) com `CREATE EXTENSION IF NOT EXISTS pg_trgm` e os índices GIN `IDX_videos_title_trgm`, `IDX_channels_name_trgm` e `IDX_channels_nickname_trgm` com `gin_trgm_ops` (per `home-search-finalization/TD-02`; `### Data Model`)
2. Implementar `down()` removendo os três índices e mantendo a extensão, por ser compartilhada com o banco inteiro
3. Atualizar `nestjs-project/src/database/migrations.integration-spec.ts` para esperar a nova migration, os três índices e a reversão dela

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `AddSearchTrigramIndexes` | Integration: migration aplica a extensão e os índices, e `revert` remove os índices sem afetar a migration anterior | `nestjs-project/src/database/migrations.integration-spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- Após `npm run migration:run`, `pg_extension` contém `pg_trgm` e `pg_indexes` lista `IDX_videos_title_trgm`, `IDX_channels_name_trgm` e `IDX_channels_nickname_trgm`
- `npm run migration:revert` remove os três índices e deixa as tabelas `videos` e `channels` e as migrations anteriores intactas
- Rodar `migration:run` duas vezes seguidas não falha

---

### SI-07.2 — Contadores de visualização em lote

**Description:** Dá ao backend a leitura em lote das visualizações (um `MGET` por página) e a usa no painel de gestão, que hoje devolve `views: 0` como placeholder.

**Technical actions:**

1. Adicionar `VideosService.getViewCounts(videoIds: string[])` em `nestjs-project/src/videos/videos.service.ts`, com um único `MGET` das chaves `views:{id}` (`VIEW_COUNT_KEY_PREFIX`) devolvendo um `Map<string, number>` com `0` para ausentes (per `home-search-finalization/TD-04`)
2. Trocar o placeholder `views: 0` de `GET /channels/{id}/manage/videos` em `nestjs-project/src/videos/videos.controller.ts` pela leitura em lote dos vídeos da página

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.getViewCounts` | Integration: contadores reais no Redis, ausentes viram `0`, lista vazia não chama o Redis | `nestjs-project/src/videos/videos.service.integration-spec.ts` |
| `GET /channels/{id}/manage/videos` | E2E: `views` reflete o contador de cada vídeo da página | `nestjs-project/test/social-counts-viewer-state.e2e-spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- `GET /channels/{id}/manage/videos` retorna em `views` a contagem registrada no Redis de cada vídeo da página
- Vídeo sem contador no Redis retorna `views: 0`
- Os campos `likes` e `comments` do painel permanecem como estavam

---

### SI-07.3 — Serviço de listagem pública e busca de vídeos

**Description:** Implementa no `VideosService` a consulta pública paginada que serve a home e a busca, com filtro por categoria e por termo em título ou canal.

**Technical actions:**

1. Criar `ListVideosDto` em `nestjs-project/src/videos/dto/list-videos.dto.ts` com `q`, `categoryId`, `page` e `pageSize`, seguindo as regras de `#### Validation Rules — GET /videos` e reaproveitando as faixas de `ListChannelVideosDto` (per `home-search-finalization/TD-01`)
2. Adicionar `SEARCH_QUERY_MAX_LENGTH = 100` em `nestjs-project/src/videos/videos.constants.ts`
3. Implementar `VideosService.findPublic(query)` com query builder sobre `videos` juntando `channels`: filtros `status = ready`, `visibility = public` e `published_at IS NOT NULL`, `categoryId` opcional e `q` por `ILIKE` com escape de `%`, `_` e `\` sobre título, nome e nickname do canal; ordenação `published_at DESC, id DESC`; paginação `skip`/`take`; resposta `{ items, page, pageSize, total }` (per `home-search-finalization/TD-02`, `home-search-finalization/TD-03`)
4. Compor `viewCount` de cada item com `getViewCounts` do SI-07.2 e expor `channelName` e `channelNickname`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService.findPublic` | Unit: `q` só com espaços é tratado como ausente e o termo é escapado antes da consulta | `nestjs-project/src/videos/videos.service.spec.ts` |
| `VideosService.findPublic` | Integration: visibilidade, busca por título e por canal, filtro por categoria, ordenação, paginação e escape de `%` contra o banco real | `nestjs-project/src/videos/videos.service.integration-spec.ts` |

**Dependencies:** SI-07.1 (índices trigram), SI-07.2 (`getViewCounts`)

**Acceptance criteria:**

- A listagem inclui apenas vídeos `ready`, publicados e `public`, do mais recente para o mais antigo
- Vídeo `unlisted`, em rascunho ou sem `published_at` nunca aparece
- O termo `q` casa título, nome do canal e nickname do canal sem diferenciar caixa
- Um `%` ou `_` no termo é tratado como caractere literal
- `categoryId` de categoria inexistente devolve `items: []` e `total: 0`
- `page` além da última página devolve `items: []` com o `total` correto

---

### SI-07.4 — Endpoint GET /videos

**Description:** Expõe a listagem pública e a busca como endpoint anônimo, com o contrato OpenAPI que o frontend vai consumir.

**Route:** GET /videos
**Test Specs:** see `nestjs-project/specs/videos-public-list.plan.md`
**Authorization:** Anonymous

**Technical actions:**

1. Adicionar `@Get('videos')` em `nestjs-project/src/videos/videos.controller.ts` com `@Public()` e `@Query() ListVideosDto`, delegando a `VideosService.findPublic` e serializando `publishedAt` e `updatedAt` em ISO (per `### API Contracts` → `GET /videos`; `home-search-finalization/TD-01`)
2. Declarar o contrato OpenAPI do endpoint (`@ApiOperation`, `@ApiResponse` 200 e 400 com schema inline dos campos de `items`) no padrão dos demais endpoints do controller

**Tests:** _(empty — controller wiring; E2E authored by /plan-test-specs in the referenced spec)_

**Dependencies:** SI-07.3

**Acceptance criteria:**

- `GET /videos` sem token retorna `200` com `{ items, page, pageSize, total }`
- `GET /videos?q=abc` retorna apenas vídeos cujo título ou canal contém o termo
- `GET /videos?categoryId={uuid de categoria}` retorna apenas vídeos daquela categoria
- `GET /videos?categoryId=nao-e-uuid` retorna `400`
- `GET /videos?pageSize=101` retorna `400`
- Vídeo `unlisted` ou em rascunho não aparece na resposta

---

### SI-07.5 — Infra: sincronizar OpenAPI e tipos do frontend

**Description:** Regenera o contrato OpenAPI do backend com `GET /videos` e propaga os tipos gerados para o frontend.

**Technical actions:**

1. Regenerar `nestjs-project/openapi.json` com o script de export do projeto
2. Copiar o contrato para `next-frontend/openapi.json` e rodar `npm run openapi:types` em `next-frontend/` para atualizar `lib/api/types.gen.ts`

**Tests:** _(empty — Infra SI; smoke-gated by AC)_

**Dependencies:** SI-07.4

**Acceptance criteria:**

- `next-frontend/openapi.json` contém o path `/videos` com `get`
- `lib/api/types.gen.ts` expõe a operação de listagem pública e `tsc --noEmit` passa em `next-frontend/`
- Rodar o export duas vezes seguidas não produz diff

---

### SI-07.6 — Aliases de contrato e mocks MSW de GET /videos

**Description:** Dá ao frontend os tipos nomeados e os handlers MSW da listagem pública, para que as telas e os testes de componente rodem sem backend.

**Technical actions:**

1. Adicionar em `next-frontend/lib/api/contracts.ts` os aliases `PublicVideoListResponse` e `PublicVideoListItem` derivados de `types.gen.ts`
2. Estender `next-frontend/mocks/factories/video.ts` com uma factory de item da listagem pública (`channelName`, `channelNickname`, `viewCount`)
3. Adicionar em `next-frontend/mocks/handlers/videos.ts` o handler `GET */videos` com filtro por `q` e `categoryId`, paginação e `total`, e registrá-lo em `mocks/handlers/index.ts`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| handler `GET /videos` | Unit: filtro por termo e categoria, paginação e `total` | `next-frontend/mocks/handlers/__tests__/videos.test.ts` |

**Dependencies:** SI-07.5

**Acceptance criteria:**

- O handler devolve `{ items, page, pageSize, total }` e respeita `q`, `categoryId`, `page` e `pageSize`
- `q` sem correspondência devolve `items: []` e `total: 0`
- Os aliases compilam e são os únicos tipos usados pelas telas da fase

---

### SI-07.7 — Layout do grupo (public) com renderização dinâmica (Setup)

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### home-search-finalization/TD-10`

**Technical actions:**

1. Criar `next-frontend/app/(public)/layout.tsx` com `export const dynamic = "force-dynamic"` byte-verbatim do Setup de `### Frontend Runtime`, renderizando `children` (o shell entra no SI-07.8)

**Dependencies:** —

**Tests:** _(empty — Setup SI; smoke-gated by AC; behavior tests live in the Migration SI)_

**Acceptance criteria:**

- `app/(public)/layout.tsx` existe e exporta `dynamic = "force-dynamic"`
- A aplicação compila com `npm run build` sem erro relacionado ao grupo

---

### SI-07.8 — Shell público ciente de sessão e migração das rotas públicas

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### home-search-finalization/TD-10` → Migração row for `app/watch/[id]/page.tsx`

**Description:** Move `watch` e `channel` para o grupo `(public)` e entrega o `AppShell` nas páginas públicas, com itens do `SideNav` conforme a sessão.

**Technical actions:**

1. Mover `next-frontend/app/watch` e `next-frontend/app/channel` para `next-frontend/app/(public)/` sem alterar o comportamento delas (per `home-search-finalization/TD-05`)
2. Em `next-frontend/app/(public)/layout.tsx`, ler a sessão (`SessionProvider` já existente) e renderizar `AppShell` com `TopNav` na variante logada ou de visitante; extrair o carregamento dos canais seguidos para um helper reaproveitado pelo layout do studio
3. Fazer o `SideNav` mostrar só Home para o visitante anônimo e Home, Subscriptions, Your videos, Liked videos e canais seguidos para usuário logado (per `home-search-finalization/TD-05`)
4. Remover `export const dynamic = "force-dynamic"` redundante de `app/(public)/watch/[id]/page.tsx` quando ele já vier do layout

**Dependencies:** SI-07.7

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `SideNav` | Unit: visitante vê só Home; usuário logado vê os quatro itens e os canais seguidos | `next-frontend/components/layout/__tests__/side-nav.test.tsx` |
| `TopNav` | Unit: ação "Sign in" para visitante e avatar para logado | `next-frontend/components/layout/__tests__/top-nav.test.tsx` |

**Acceptance criteria:**

- `/watch/{id}` e `/channel/{nickname}` continuam respondendo com o mesmo conteúdo, agora dentro do shell
- Visitante anônimo não vê Subscriptions, Your videos, Liked videos nem canais seguidos
- Os testes existentes das rotas movidas continuam passando

---

### SI-07.9 — Busca funcional no TopNav

**Description:** Torna o campo de busca do cabeçalho funcional: submete para `/search?q=` e vem preenchido com o termo da URL.

**Technical actions:**

1. Converter `SearchField` em `next-frontend/components/layout/top-nav.tsx` (ou componente cliente irmão) em formulário com `useRouter`: termo com trim, truncado em 100 caracteres, vazio ignorado, navegando para `/search?q={termo}` e preservando `category` quando já estiver em `/search`
2. Ler o valor inicial de `useSearchParams` (`q`) e manter o botão de voz desabilitado com `aria-disabled`

**Dependencies:** SI-07.8

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `TopNav` search | Unit: submissão navega para `/search?q=`, termo vazio é ignorado, campo vem preenchido com `q` | `next-frontend/components/layout/__tests__/top-nav-search.test.tsx` |

**Acceptance criteria:**

- Submeter "gatos" leva a `/search?q=gatos`
- Submeter vazio ou só espaços não navega
- Em `/search?q=gatos` o campo exibe "gatos"
- O botão de voz permanece desabilitado

---

### SI-07.10 — Shell responsivo (gaveta, busca em segunda linha, sidebar empilhada)

**Description:** Aplica o comportamento mobile-first nas telas públicas abaixo do breakpoint `md` (per `home-search-finalization/TD-06`).

**Technical actions:**

1. Em `next-frontend/components/layout/app-shell.tsx`, transformar o `SideNav` em gaveta sobreposta abaixo de `md`, aberta pelo botão de menu do `TopNav`, fechando ao navegar e com `Escape`, devolvendo o foco ao botão
2. Em `top-nav.tsx`, mover o `SearchField` para uma segunda linha abaixo de `md`
3. Empilhar a coluna de sugestões da página de vídeo abaixo do player e reduzir colunas do grid de `VideoCard` abaixo de `md`; manter `(studio)` desktop-first

**Dependencies:** SI-07.8, SI-07.9

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `AppShell` drawer | Unit: abre pelo botão de menu, fecha ao navegar e com `Escape` | `next-frontend/components/layout/__tests__/app-shell-drawer.test.tsx` |

**Acceptance criteria:**

- Abaixo de `md` o `SideNav` não ocupa a coluna e abre como gaveta
- A gaveta fecha ao clicar em um item e ao pressionar `Escape`
- Em `md` ou mais o layout desktop permanece igual ao anterior
- O studio não muda

---

### SI-07.11.0 — Drift audit: Página inicial (Home)

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página inicial (Home)`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948
   - Reused DS components: [TopNav, IconButton, BrandLogo, SearchField, AccountMenuTrigger, SideNav, SideNavItem, SideNavSubscriptionList, TabMenu, VideoCard, VideoThumbnail, Avatar, PaginationLinks]
   - Server-connected component names (no endpoints/auth/errors): [SearchField, AccountMenuTrigger, SideNavSubscriptionList, TabMenu, VideoCard, PaginationLinks]
   - Target paths (read-only context for audit; no writes here): `app/(public)/page.tsx` + `components/home/home-video-grid.tsx`

   For each component in the Reused DS list, perform value-level diff against the file on disk and classify per the 4-value status enum (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`). Compose Decision per default policy (see `.claude/skills/plan-build/references/frontend-drift-report-schema.md` § Default decisions per status). Read prior sections of `frontend-drift-report.md` to build `prior_decisions`; populate `Prior` column with CONFLICT detection. Write a `## Screen: home — audited at SI-07.11.0 ({YYYY-MM-DD})` section to `frontend-drift-report.md`. **No code edits — verifiable via `git diff` at SI end.**

**Dependencies:** SI-07.10

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` exists in the plan folder; section `## Screen: home` exists with the current run's date in heading
- Every component in the Reused DS list has exactly one row in the table
- Every row has a Decision column populated per the schema's default policy
- Every `exception` decision carries a one-liner justification
- `git diff --name-only HEAD -- next-frontend` after the SI is empty

---

### SI-07.11a — Tela de Página inicial (Home) (visual shell)

**Route:** `/`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página inicial (Home)`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: home`

**Technical actions:**

1. **Apply drift decisions** — read the Drift Report section for this screen. For each row, parse the Decision column and apply per the verb body:
   - `auto-Edit "<specifics>"` → apply `Edit` on the named DS file with the documented specifics
   - `create` → create the file (icons via Figma asset; components per spec)
   - `exception` / `skip` → no-op
   - `CONFLICT: <one-liner>; <verb> "<specifics>"` → strip the prefix and apply the verb body

   No drift detection or auto-judgment in this step.

2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948
   - Reused DS components: [TopNav, IconButton, BrandLogo, SearchField, AccountMenuTrigger, SideNav, SideNavItem, SideNavSubscriptionList, TabMenu, VideoCard, VideoThumbnail, Avatar, PaginationLinks] _(now reflecting any DS edits from action 1)_
   - Server-connected component names (no endpoints/auth/errors): [SearchField, AccountMenuTrigger, SideNavSubscriptionList, TabMenu, VideoCard, PaginationLinks]
   - Target paths: `app/(public)/page.tsx` + `app/(public)/loading.tsx` + `components/home/home-video-grid.tsx` + `components/ui/progress-circular.tsx`

**Dependencies:** SI-07.11.0

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-07.11b; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- All target paths exist, export expected components, and compile per `next-frontend` build command
- Rendering matches Figma node fidelity within tolerance of DS component set
- No runtime imports beyond Reused DS list (stays visually scoped)

---

### SI-07.11b — Tela de Página inicial (Home) (lógica & wiring)

**Test Specs:** see `next-frontend/specs/home-catalog.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página inicial (Home)`

**Technical actions:**

1. **Rendering strategy application** — `app/(public)/page.tsx` como Server Component dinâmico: ler `searchParams` (`category`, `page`) com `normalizePage` e validação de uuid, e buscar `GET /videos` e `GET /categories` em paralelo no servidor via `upstream`; falha só de categorias degrada para a listagem sem chips
2. **Endpoint wiring** — mapear `PublicVideoListItem` para as props de `VideoCard` (`views` de `viewCount`, `channelName`, `thumbnailVersion`) e montar `TabMenu` com "All" + categorias (navegação por URL, adaptando `tab-menu.tsx` para ids e `href`) e `PaginationLinks` com `buildHref` preservando `category`
3. **Error mapping** — `app/(public)/error.tsx` para falha de `GET /videos`/`GET /categories`; estado vazio com texto muted para categoria sem vídeos

**Dependencies:**

- `SI-07.11a` (visual shell must exist before wiring)
- `SI-07.4` (`GET /videos`), `SI-07.6` (aliases e mocks), `SI-07.9` (busca funcional no TopNav)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/watch/tab-menu.tsx` | Unit: chips por categoria, "All" ativo por padrão, navegação por URL | `next-frontend/components/watch/__tests__/tab-menu.test.tsx` |
| `components/home/home-video-grid.tsx` | Unit: mapeamento de campos para `VideoCard`, estado vazio, paginação preservando `category` | `next-frontend/components/home/__tests__/home-video-grid.test.tsx` |

E2E for the page (RSC, `searchParams`, chips e paginação) is authored externally by `/plan-test-specs` in the spec file referenced by `**Test Specs:**` above and consumed JIT by `/implement`. /plan-build does NOT emit E2E rows here.

**Acceptance criteria:**

- `/` lista vídeos públicos do mais recente para o mais antigo com paginação por links
- Clicar em um chip leva a `/?category={id}` e o "All" volta para `/`
- `page` ou `category` inválidos na URL não quebram a página
- Falha do backend cai em `error.tsx`; falha só de categorias mostra a listagem sem chips

---

### SI-07.12.0 — Drift audit: Resultados de busca

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Resultados de busca`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948
   - Reused DS components: [TopNav, SearchField, SideNav, TabMenu, VideoCard, PaginationLinks]
   - Server-connected component names (no endpoints/auth/errors): [SearchField, VideoCard, PaginationLinks]
   - Target paths (read-only context for audit; no writes here): `app/(public)/search/page.tsx` + `components/search/search-results-heading.tsx` + `components/search/empty-results.tsx`

   For each component in the Reused DS list, perform value-level diff against the file on disk and classify per the 4-value status enum. Compose Decision per default policy. Read prior sections of `frontend-drift-report.md` (including `## Screen: home`) to build `prior_decisions`. Write a `## Screen: search — audited at SI-07.12.0 ({YYYY-MM-DD})` section to `frontend-drift-report.md`. **No code edits — verifiable via `git diff` at SI end.**

**Dependencies:** SI-07.11b

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` has section `## Screen: search` with the current run's date in heading
- Every component in the Reused DS list has exactly one row in the table
- Every row has a Decision column populated per the schema's default policy
- `git diff --name-only HEAD -- next-frontend` after the SI is empty

---

### SI-07.12a — Tela de Resultados de busca (visual shell)

**Route:** `/search`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Resultados de busca`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: search`

**Technical actions:**

1. **Apply drift decisions** — read the Drift Report section for this screen and apply each row's Decision verb mechanically (`auto-Edit`, `create`, `exception`/`skip`, `CONFLICT: …; <verb>`), with no drift detection in this step

2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948
   - Reused DS components: [TopNav, SearchField, SideNav, TabMenu, VideoCard, PaginationLinks] _(now reflecting any DS edits from action 1)_
   - Server-connected component names (no endpoints/auth/errors): [SearchField, VideoCard, PaginationLinks]
   - Target paths: `app/(public)/search/page.tsx` + `app/(public)/search/loading.tsx` + `components/search/search-results-heading.tsx` + `components/search/empty-results.tsx`

**Dependencies:** SI-07.12.0

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-07.12b; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- All target paths exist, export expected components, and compile per `next-frontend` build command
- Rendering matches Figma node fidelity within tolerance of DS component set
- No runtime imports beyond Reused DS list (stays visually scoped)

---

### SI-07.12b — Tela de Resultados de busca (lógica & wiring)

**Test Specs:** see `next-frontend/specs/search-results.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Resultados de busca`

**Technical actions:**

1. **Rendering strategy application** — `app/(public)/search/page.tsx` como Server Component dinâmico: `q` com trim e limite de 100; `q` ausente ou só com espaços redireciona para `/` com `redirect`; ler `category` e `page` como na Home
2. **Endpoint wiring** — buscar `GET /videos?q=&categoryId=&page=` no servidor, reaproveitar o grid, `TabMenu` e `PaginationLinks` da Home preservando `q` e `category`, e exibir `SearchResultsHeading` com termo e total em `aria-live="polite"`
3. **Error mapping** — `app/(public)/search/error.tsx` para falha de `GET /videos` e `EmptyResults` para busca sem resultado

**Dependencies:**

- `SI-07.12a` (visual shell must exist before wiring)
- `SI-07.4` (`GET /videos`), `SI-07.9` (busca funcional), `SI-07.11b` (grid e chips da Home)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/search/search-results-heading.tsx` | Unit: termo e total, região `aria-live` | `next-frontend/components/search/__tests__/search-results-heading.test.tsx` |
| `components/search/empty-results.tsx` | Unit: mensagem com o termo, sem `role="alert"` | `next-frontend/components/search/__tests__/empty-results.test.tsx` |

E2E for the page (redirect sem `q`, resultados, paginação com `q`) is authored externally by `/plan-test-specs` in the spec file referenced by `**Test Specs:**` above and consumed JIT by `/implement`.

**Acceptance criteria:**

- `/search?q=termo` lista apenas vídeos cujo título ou canal contém o termo
- `/search` e `/search?q=%20` redirecionam para `/`
- Os links de paginação e de categoria preservam `q`
- Busca sem resultado mostra `EmptyResults` com o termo

---

### SI-07.13 — Infra: Playwright em modo full-stack

**Description:** Permite rodar a suíte E2E contra a stack real (sem MSW) em um projeto separado do Playwright, para o smoke dos fluxos principais (per `home-search-finalization/TD-07`).

**Technical actions:**

1. Em `next-frontend/playwright.config.ts`, adicionar o projeto `fullstack` com `testDir` próprio (`tests/fullstack`), `baseURL` da stack Compose e `MSW_ENABLED=false`, mantendo o projeto atual com MSW como padrão
2. Criar `next-frontend/tests/fullstack/fixtures.ts` com helpers de cadastro, confirmação por e-mail (leitura da caixa do ambiente de teste) e login, e adicionar o script `test:e2e:fullstack` ao `package.json`
3. Documentar em `next-frontend/README.md` como subir a stack e rodar o projeto `fullstack`

**Tests:** _(empty — Infra SI; smoke-gated by AC)_

**Dependencies:** SI-07.12b

**Acceptance criteria:**

- `npm run test:e2e` continua rodando só a suíte com MSW
- `npm run test:e2e:fullstack` roda apenas `tests/fullstack`
- Sem a stack no ar, o projeto `fullstack` falha de forma explícita, sem cair no MSW

---

### SI-07.14 — Specs full-stack dos fluxos principais

**Description:** Cobre os quatro fluxos de `home-search-finalization/TD-07` contra a stack real, em arquivos separados.

**Technical actions:**

1. Criar `next-frontend/tests/fullstack/auth-flow.spec.ts`: cadastro, confirmação de e-mail e login
2. Criar `next-frontend/tests/fullstack/video-publish-watch.spec.ts`: upload, publicação e reprodução
3. Criar `next-frontend/tests/fullstack/social-flow.spec.ts`: comentar, reagir e inscrever-se
4. Criar `next-frontend/tests/fullstack/search-navigate.spec.ts`: buscar na home, abrir resultados e navegar até o vídeo

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| fluxo de autenticação | E2E full-stack | `next-frontend/tests/fullstack/auth-flow.spec.ts` |
| fluxo upload → publicar → assistir | E2E full-stack | `next-frontend/tests/fullstack/video-publish-watch.spec.ts` |
| fluxo social | E2E full-stack | `next-frontend/tests/fullstack/social-flow.spec.ts` |
| fluxo busca e navegação | E2E full-stack | `next-frontend/tests/fullstack/search-navigate.spec.ts` |

**Dependencies:** SI-07.13

**Acceptance criteria:**

- Os quatro arquivos passam contra a stack de desenvolvimento em Compose
- Cada spec cria os próprios dados e não depende da ordem de execução
- Nenhum spec usa dados do seed de MSW

---

### SI-07.15 — Infra: Dockerfiles de produção

**Description:** Imagens multi-stage de API, worker e frontend para o ambiente de produção (per `home-search-finalization/TD-08`).

**Technical actions:**

1. Criar `nestjs-project/Dockerfile` multi-stage (build com dependências de desenvolvimento, runtime só com dependências de produção e `dist`) com alvos `api` e `worker`
2. Criar `next-frontend/Dockerfile` multi-stage com `next build` e runtime em `node` com usuário não-root
3. Adicionar `.dockerignore` em cada subprojeto

**Tests:** _(empty — Infra SI; smoke-gated by AC)_

**Dependencies:** SI-07.14

**Acceptance criteria:**

- `docker build` das três imagens termina sem erro
- Nenhuma imagem de runtime contém `devDependencies` nem código-fonte TypeScript
- Os contêineres rodam como usuário não-root

---

### SI-07.16 — Infra: compose de produção, proxy e runbook

**Description:** Descreve a topologia de produção em uma VM com proxy reverso e TLS, e documenta a operação (per `home-search-finalization/TD-08`).

**Technical actions:**

1. Criar `compose.prod.yaml` na raiz com `api`, `worker`, `frontend`, `db`, `redis`, `minio` e o proxy reverso com TLS; usar os nomes dos serviços do Compose como host de todas as conexões
2. Criar a configuração do proxy em `deploy/proxy/` e `.env.production.example` com todas as variáveis, sem segredos
3. Criar `docs/runbook-production.md` com subida, migrations, backup do banco e do MinIO, rollback e troubleshooting

**Tests:** _(empty — Infra SI; smoke-gated by AC)_

**Dependencies:** SI-07.15

**Acceptance criteria:**

- `docker compose -f compose.prod.yaml config` valida sem erro
- Só o proxy publica portas no host
- Nenhum host de conexão usa `localhost`
- O runbook cobre migrations, backup e rollback

---

### SI-07.17 — Infra: workflow de CI para pull requests

**Description:** Executa as verificações de qualidade em cada pull request (per `home-search-finalization/TD-09`).

**Technical actions:**

1. Criar `.github/workflows/ci.yaml` com jobs para o backend (`npm run lint` sobre os arquivos alterados, `npx tsc --noEmit`, testes unit, integration e e2e com Postgres, Redis e MinIO) e para o frontend (`lint`, `tsc --noEmit`, `vitest run`, `playwright test` com MSW)
2. Adicionar a checagem de frescor do contrato: regenerar `openapi.json` e falhar se houver diff contra o commit
3. Fixar a linha de base de lint do backend para não bloquear PRs por erros preexistentes

**Tests:** _(empty — Infra SI; smoke-gated by AC)_

**Dependencies:** SI-07.16

**Acceptance criteria:**

- O workflow roda em `pull_request` para `dev` e `main`
- Um `openapi.json` desatualizado faz o job falhar
- Falha em qualquer job impede o merge pela proteção de branch

---

### SI-07.18 — Infra: workflow de deploy a partir de main

**Description:** Publica as imagens e atualiza a VM a cada merge em `main` (per `home-search-finalization/TD-09`).

**Technical actions:**

1. Criar `.github/workflows/deploy.yaml` acionado por push em `main` e por `workflow_dispatch`, que constrói e publica as imagens no registro e executa `docker compose -f compose.prod.yaml pull && up -d` na VM por SSH
2. Executar as migrations antes de subir a nova versão da API e abortar o deploy se falharem
3. Ler credenciais só de `secrets` do GitHub e documentar os nomes no runbook

**Tests:** _(empty — Infra SI; smoke-gated by AC)_

**Dependencies:** SI-07.17

**Acceptance criteria:**

- O deploy só roda depois do workflow de CI verde
- Falha de migration interrompe o deploy sem derrubar a versão em execução
- Nenhum segredo aparece em arquivo versionado

---

## Technical Specifications

### Data Model

Nenhuma entidade nova nem alterada: a listagem pública e a busca leem `videos`, `channels` e `categories` existentes (`home-search-finalization/TD-01`). A única mudança de schema é a extensão e os índices que sustentam a busca por substring (per `home-search-finalization/TD-02`).

#### Extension `pg_trgm` and trigram indexes (SI-07.1)

| Object | Target | Type | Constraints |
|--------|--------|------|-------------|
| `pg_trgm` | database | extension | `CREATE EXTENSION IF NOT EXISTS pg_trgm` |
| `IDX_videos_title_trgm` | `videos.title` | GIN (`gin_trgm_ops`) | usado por `ILIKE '%termo%'` |
| `IDX_channels_name_trgm` | `channels.name` | GIN (`gin_trgm_ops`) | usado por `ILIKE '%termo%'` |
| `IDX_channels_nickname_trgm` | `channels.nickname` | GIN (`gin_trgm_ops`) | usado por `ILIKE '%termo%'` |

**Relations:** nenhuma nova.
**Indexes:** os três índices GIN acima; os índices existentes de `videos` (`channel_id`, `category_id`, `status`, `(channel_id, visibility, published_at)`) permanecem.

### API Contracts

#### GET /videos (SI-07.4)

Listagem pública de vídeos de todos os canais, usada pela home (sem `q`) e pela busca (com `q`) (per `home-search-finalization/TD-01`). Visibilidade da regra unificada: somente `ready`, publicado (`published_at` não nulo) e `public`; vídeos `unlisted` e rascunhos nunca aparecem. Ordenação fixa por `published_at` decrescente, desempate por `id` decrescente.

**Request headers:**
- Authorization: Bearer — opcional; o endpoint é público e ignora o token (sem `viewerState`)

**Request query parameters:**
- q: string, optional — termo buscado em `videos.title`, `channels.name` e `channels.nickname` por `ILIKE` com índice `pg_trgm` (per `home-search-finalization/TD-02`); valor vazio ou só com espaços é tratado como ausente
- categoryId: string (uuid), optional — filtra por `videos.category_id`; uuid de categoria inexistente devolve lista vazia, não erro
- page: integer, optional — default 1, min 1 (per `home-search-finalization/TD-03`)
- pageSize: integer, optional — default 20, min 1, max 100 (mesma convenção da listagem de vídeos do canal)

**Response 200:**
- items: array — cada item com:
  - id: string (uuid)
  - title: string
  - thumbnailKey: string | null
  - publishedAt: string (date-time)
  - updatedAt: string (date-time)
  - durationSeconds: number | null
  - channelName: string
  - channelNickname: string
  - viewCount: number — leitura em lote do contador do Redis (per `home-search-finalization/TD-04`); 0 quando não há contador
- page: number
- pageSize: number
- total: number — total de vídeos que satisfazem os filtros

**Error responses:**
- 400 validation error: `q` acima do limite, `categoryId` que não é uuid, `page` ou `pageSize` fora da faixa

---

#### Validation Rules — GET /videos

- `q`: opcional, string, máximo 100 caracteres, `trim` aplicado antes de decidir se há busca
- `categoryId`: opcional, uuid
- `page`: opcional, inteiro ≥ 1
- `pageSize`: opcional, inteiro entre 1 e 100

> _BFF tier — sem rotas novas nesta fase. Home e busca leem `GET /videos` e `GET /categories` diretamente no upstream a partir de Server Components, com a mesma convenção das telas públicas de canal e vídeo (`phase-04-videos-channel-frontend/TD-02`, `video-watch-page/TD-04`); o navegador só navega por URL (`/?category=&page=`, `/search?q=&category=&page=`), sem `fetch` próprio. Nenhum Route Handler de `app/api/**` é adicionado, e por isso não há blocos de BFF tier com `forwards-to`._

### Authorization Matrix

| Endpoint | Anonymous | Authenticated | Owner |
|----------|-----------|---------------|-------|
| GET /videos | ✓ | ✓ | ✓ |
| GET /categories | ✓ | ✓ | ✓ |

_Notas:_ `GET /videos` é `@Public()` e não devolve `viewerState`; o token, quando enviado, é ignorado. A regra de visibilidade (`ready` + publicado + `public`) vale para todos os papéis, inclusive o dono: vídeos próprios em rascunho ou `unlisted` não aparecem na listagem pública.

### UI Contracts

> _Escopo: home e resultados de busca. O chrome compartilhado (TopNav, SideNav, AccountMenu) é descrito uma vez na tela Home e referenciado pela busca. Componentes já inventariados nas fases 04 a 06 entram como reuso._

#### Screen: Página inicial (Home)

**Route:** `/`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948 (node `upxCB4CzKKTSOT9NpdAZ0u:143:948`)
**Purpose:** "Página inicial com grid de vídeos (thumbnail, título, canal, visualizações e tempo de publicação)"

**Auth requirement:** Anonymous _(source: §Authorization Matrix — `GET /videos` e `GET /categories`; a rota é pública e o header só varia por sessão, sem exigir login)_

**Rendering strategy:** Server Component (RSC) dinâmico e sem cache; a leitura de `GET /videos` e `GET /categories` roda no servidor a cada requisição, com `export const dynamic = "force-dynamic"` herdado do layout do grupo `(public)`; filtro e página vivem em `searchParams` (`?category=`, `?page=`) _(source: home-search-finalization/TD-10, home-search-finalization/TD-03)_

**Reused DS components:**
- `components/layout/top-nav.tsx` — TopNav (147:563) — Herdado da fase 04. Container do header; só existe a variante logada no Figma, a variante de visitante é derivada.
- `components/ui/icon-button.tsx` — Menu trigger (I147:563;62:1859), VoiceSearchButton (I147:563;62:1883), IconButton "Create" (I147:563;70:31) — o botão de voz permanece desabilitado.
- `components/auth/brand-logo.tsx` — BrandLogo (3050:135) — Variante `Size=sm`; wordmark StreamTube.
- `components/ui/search-field.tsx` — SearchField (I147:563;62:1878) — Herdado; hoje desabilitado, passa a ser funcional nesta fase.
- `components/layout/account-menu-trigger.tsx` — AccountMenuTrigger (I147:563;62:1892) — Avatar 36px do usuário logado; para o visitante a variante derivada exibe a ação "Sign in".
- `components/layout/side-nav.tsx` — SideNav (152:1499) — Herdado da fase 04. 256px no desktop.
- `components/layout/side-nav-item.tsx` — SideNavItem ×4 (62:1620, 62:1630, 62:1653, 62:1664) — Home, Subscriptions, Your videos, Liked videos.
- `components/layout/side-nav-subscription-list.tsx` — SideNavSubscriptionList (62:1672) — Herdado da fase 06; sem verbo novo.
- `components/watch/tab-menu.tsx` — TabMenu (143:1150) — Mesmo componente do Figma (67:231) usado nas sugestões da fase 05; aqui é o filtro por categoria.
- `components/channel/video-card.tsx` — VideoCard ×8 (149:650 …) — Variante default com avatar do canal; 266px (min 240, max 360), grid `flex-wrap` com gap 24px.
- `components/ui/video-thumbnail.tsx` — VideoThumbnail (I149:650;143:2507) — Dentro de cada VideoCard.
- `components/ui/avatar.tsx` — Avatar do canal (I149:650;143:2512) — 40px; dentro de cada VideoCard.
- `components/common/pagination-links.tsx` — PaginationLinks (não está no Figma) — Renderizado abaixo do grid (`?page=N`, `?category=`), reuso das fases 04 e 06.

**Server-connected components:**
- `SearchField` — verbs: pesquisar vídeos por título e canal | endpoint: `GET /videos?q=` lido pelo RSC de `/search` (§API Contracts → backend tier); o campo apenas navega para `/search?q=` | reuse: `components/ui/search-field.tsx`
- `AccountMenuTrigger` — verbs: exibir avatar do usuário autenticado ou ação de entrar conforme a sessão | endpoint: — (sessão iron-session lida no RSC raiz e entregue pelo `SessionProvider`) | reuse: `components/layout/account-menu-trigger.tsx`
- `SideNavSubscriptionList` — verbs: — (herdado da fase 06, sem verbo novo) | endpoint: `GET /subscriptions` lido pelo RSC do shell (fase 06) | reuse: `components/layout/side-nav-subscription-list.tsx`
- `TabMenu` — verbs: filtrar a listagem de vídeos da home por categoria | endpoint: `GET /categories` e `GET /videos?categoryId=` lidos pelo RSC (§API Contracts → backend tier) | reuse: `components/watch/tab-menu.tsx`
- `VideoCard` — verbs: exibir grid de vídeos publicados com thumbnail, título, canal, visualizações e tempo de publicação | endpoint: `GET /videos` lido pelo RSC (§API Contracts → backend tier) | reuse: `components/channel/video-card.tsx`
- `PaginationLinks` — verbs: navegar entre páginas da listagem de vídeos | endpoint: `GET /videos?page=` lido pelo RSC (§API Contracts → backend tier) | reuse: `components/common/pagination-links.tsx`

**Behaviors:**

*Rendered states:*
- Loading: `loading.tsx` da rota com `ProgressCircular` (149:1185, 40px, componente novo `new`) abaixo do esqueleto do grid; a paginação por links não usa spinner de "carregar mais".
- Empty: sem vídeos para a categoria escolhida — mensagem em texto muted derivada dos tokens existentes (não desenhada no Figma).
- Success: grid de `VideoCard` com thumbnail, título, canal, visualizações compactas e tempo relativo de publicação; chips da `TabMenu` com "All" ativo por padrão.
- Error: `error.tsx` da rota para falha de `GET /videos` ou `GET /categories`; falha só de categorias degrada para a listagem sem chips.

*Interactions:*
- Clique em um chip da `TabMenu` → navega para `/?category={id}` (página 1); o chip "All" volta para `/`.
- Clique em um link de `PaginationLinks` → navega para `/?page={n}` preservando `category`.
- Submissão do `SearchField` com termo não vazio → navega para `/search?q={termo}`; termo vazio é ignorado.
- Abaixo do breakpoint `md` o `SideNav` vira gaveta sobreposta aberta pelo botão de menu, que fecha ao navegar e com `Escape` (per `home-search-finalization/TD-06`).
- Visitante anônimo vê o `SideNav` só com itens públicos (Home); Subscriptions, Your videos, Liked videos e a lista de canais seguidos aparecem somente com sessão (per `home-search-finalization/TD-05`).

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `VALIDATION_ERROR` | `category` ou `page` inválidos na URL são normalizados (ignorados) antes da chamada; se ainda assim o upstream devolver `400`, `error.tsx` da rota |

**Client-side validation mirror:** _(source: §API Contracts → Validation Rules — GET /videos)_

- `q`: trim; máximo 100 caracteres — o `SearchField` limita a entrada e ignora o termo vazio
- `page`: inteiro ≥ 1 — `normalizePage` descarta valores inválidos
- `categoryId`: uuid — valor que não é uuid é descartado

**Accessibility notes:**
- Botões só com ícone (menu, microfone, lupa, Create) com `aria-label`; o botão de voz desabilitado mantém `aria-disabled`.
- Chips da `TabMenu` expõem o estado ativo (`aria-current`/`aria-selected`) e a linha rolável é navegável por teclado.
- O campo de busca tem rótulo acessível (`aria-label="Search"`).
- A gaveta mobile devolve o foco ao botão de menu ao fechar.

**Observações de design (drift conscientes):**
- Não existem frames mobile no Figma; o comportamento responsivo é derivado do desktop (SideNav em gaveta, grid com menos colunas, busca em segunda linha).
- O Figma só tem a variante logada do TopNav; a variante de visitante (ação "Sign in" no lugar de Create e avatar) é derivada e decidida pela sessão.
- O selo de canal verificado (I149:650;143:2519) foi omitido: o domínio não tem o conceito.
- Os rótulos de chip do Figma (Live, Mixes, Recently uploaded, Watched, Figma…) não são reproduzidos; a TabMenu usa "All" + as categorias de `GET /categories`.
- A paginação por links não tem frame no Figma; o controle é derivado de `components/common/pagination-links.tsx`.

#### Screen: Resultados de busca

**Route:** `/search`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948 (node `upxCB4CzKKTSOT9NpdAZ0u:143:948`)
**Purpose:** "Barra de busca (pesquisa por título e canal)"

**Auth requirement:** Anonymous _(source: §Authorization Matrix — `GET /videos`)_

**Rendering strategy:** Server Component (RSC) dinâmico e sem cache; termo, categoria e página em `searchParams` (`?q=`, `?category=`, `?page=`); `/search` sem `q` redireciona para `/` _(source: home-search-finalization/TD-10, home-search-finalization/TD-03, home-search-finalization/TD-01)_

**Reused DS components:**
- `components/layout/top-nav.tsx` — TopNav (147:563) — see screen: Página inicial (Home). O campo de busca vem preenchido com o termo `q` da URL.
- `components/ui/search-field.tsx` — SearchField (I147:563;62:1878) — see screen: Página inicial (Home).
- `components/layout/side-nav.tsx` — SideNav (152:1499) — see screen: Página inicial (Home).
- `components/watch/tab-menu.tsx` — TabMenu (143:1150) — mesmo componente da Home; filtra os resultados por categoria sem perder o termo.
- `components/channel/video-card.tsx` — VideoCard ×N (149:650) — see screen: Página inicial (Home). Mesma grade; os itens são os vídeos que casam com o termo em título ou canal.
- `components/common/pagination-links.tsx` — PaginationLinks (não está no Figma) — see screen: Página inicial (Home). Links preservam `q` e `category`.

**Server-connected components:**
- `SearchField` — verbs: pesquisar vídeos por título e canal | endpoint: navega para `/search?q=` | reuse: `components/ui/search-field.tsx`
- `VideoCard` — verbs: exibir resultados da busca por título e canal em lista paginada | endpoint: `GET /videos?q=` lido pelo RSC (§API Contracts → backend tier) | reuse: `components/channel/video-card.tsx`
- `PaginationLinks` — verbs: navegar entre páginas dos resultados | endpoint: `GET /videos?q=&page=` lido pelo RSC (§API Contracts → backend tier) | reuse: `components/common/pagination-links.tsx`

**Behaviors:**

*Rendered states:*
- Loading: `loading.tsx` da rota com `ProgressCircular`, o mesmo tratamento da Home.
- Empty: `EmptyResults` (componente novo `new`, sem frame) — texto muted "Nenhum vídeo encontrado para «{termo}»".
- Success: título `SearchResultsHeading` (componente novo `new`, `<h1>`) com o termo e o total de resultados, e o grid de `VideoCard` paginado.
- Error: `error.tsx` da rota para falha de `GET /videos`.

*Interactions:*
- Nova submissão do `SearchField` → navega para `/search?q={novo termo}` (descarta `page`; mantém `category`).
- Clique em chip da `TabMenu` → navega para `/search?q={termo}&category={id}`; "All" remove `category`.
- `/search` sem `q`, ou com `q` só de espaços → redireciona para `/` (per `home-search-finalization/TD-01`).

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `VALIDATION_ERROR` | `q` acima do limite é truncado no cliente; `400` do upstream cai em `error.tsx` da rota |

**Client-side validation mirror:** _(source: §API Contracts → Validation Rules — GET /videos)_

- `q`: trim; máximo 100 caracteres
- `categoryId` e `page`: normalizados como na Home

**Accessibility notes:**
- O total de resultados é anunciado em região `aria-live="polite"` e o campo de busca mantém o termo.
- O título da página é um `<h1>`; o estado vazio é texto simples, sem `role="alert"`.

### Frontend Runtime

#### home-search-finalization/TD-10 — Estratégia de cache e revalidação da home e da busca

**Pattern:** não há requisito de desempenho no plano nem medição que mostre o problema, o layout raiz já força a renderização dinâmica, e as Options B/C trocam frescura e determinismo de testes por um ganho não medido; a Option B fica como evolução localizada se a observação em produção (TD-08) apontar carga na listagem. Decisão: renderização dinâmica sem cache na home e na busca.

**Setup:** a convenção é declarada uma vez no layout do grupo de rotas `(public)`, que cobre home, busca, vídeo e canal.

```tsx
// next-frontend/app/(public)/layout.tsx
export const dynamic = "force-dynamic"
```

**Aplicação:**

- **Adopts the pattern:** todas as páginas do grupo `(public)` — home (`/`), busca (`/search`), vídeo (`/watch/[id]`) e canal (`/channel/[nickname]`); as leituras de `GET /videos`, `GET /categories` e `GET /channels/{nickname}` rodam no servidor a cada requisição.
- **Excludes / boundaries:**
  - `/subscriptions` e as rotas de `(studio)` — fora do grupo; já são autenticadas e dinâmicas pelo shell.
  - Rotas de `app/api/**` — Route Handlers não herdam o layout.

**Migração:**

| File | Current behavior | Required change | Owning SI |
|------|-----------------|-----------------|-----------|
| `next-frontend/app/watch/[id]/page.tsx` | Declara `export const dynamic = "force-dynamic"` na própria página | Passa a viver em `app/(public)/watch/[id]/page.tsx`; a declaração local pode ser removida porque o layout do grupo a fornece | SI-07.8 |

**Verificação:**

- **Unit:** o layout `app/(public)/layout.tsx` exporta `dynamic === "force-dynamic"`.
- **Integration:** n/a — sem camada de cache a exercitar.
- **E2E:** um vídeo publicado aparece na home na requisição seguinte, sem esperar revalidação (coberto pelo fluxo "buscar e navegar").
- **Regression guards:** os testes existentes das páginas de vídeo e canal continuam passando após a mudança de diretório.

### UI ↔ API Traceability Matrix

| Verb | Component | Screen | Endpoint (from API Contracts) | TD ref |
|------|-----------|--------|-------------------------------|--------|
| Exibir grid de vídeos publicados com thumbnail, título, canal, visualizações e tempo de publicação | VideoCard | / | GET /videos (leitura direta do RSC, sem rota BFF) | home-search-finalization/TD-01, home-search-finalization/TD-04 |
| Filtrar a listagem de vídeos da home por categoria | TabMenu | / | GET /categories e GET /videos?categoryId= (RSC) | home-search-finalization/TD-01 |
| Pesquisar vídeos por título e canal | SearchField | /, /search | GET /videos?q= (RSC de /search) | home-search-finalization/TD-01, home-search-finalization/TD-02 |
| Exibir avatar do usuário autenticado ou ação de entrar conforme a sessão | AccountMenuTrigger | / | — (sessão do `SessionProvider`) | home-search-finalization/TD-05 |
| Navegar entre páginas da listagem de vídeos | PaginationLinks | / | GET /videos?page= (RSC) | home-search-finalization/TD-03 |
| Exibir resultados da busca por título e canal em lista paginada | VideoCard | /search | GET /videos?q=&page= (RSC) | home-search-finalization/TD-01, home-search-finalization/TD-02, home-search-finalization/TD-04 |
| Navegar entre páginas dos resultados | PaginationLinks | /search | GET /videos?q=&page= (RSC) | home-search-finalization/TD-03 |

_Capabilities marked in `## Non-UI / Deferred Capabilities` are excluded from this matrix: "Layout responsivo para dispositivos móveis", "Testes dos fluxos principais da plataforma" e "Ambiente de produção e deploy"._

---

## Dependency Map

```
SI-07.1 (root — migration pg_trgm)
SI-07.2 (root — contadores em lote)
└── SI-07.3 — depends on SI-07.1 + SI-07.2 (índices e contadores antes do serviço)
    └── SI-07.4 — depends on SI-07.3 (serviço antes do controller)
        └── SI-07.5 — depends on SI-07.4 (contrato só existe depois do endpoint)
            └── SI-07.6 — depends on SI-07.5 (aliases e mocks usam os tipos gerados)
SI-07.7 (root — layout (public), TD-10 Setup)
└── SI-07.8 — depends on SI-07.7 (shell e migração das rotas)
    └── SI-07.9 — depends on SI-07.8 (busca no TopNav)
        └── SI-07.10 — depends on SI-07.8 + SI-07.9 (shell responsivo)
            └── SI-07.11.0 — depends on SI-07.10 (auditoria antes do shell visual)
                └── SI-07.11a — depends on SI-07.11.0
                    └── SI-07.11b — depends on SI-07.11a + SI-07.4 + SI-07.6 + SI-07.9
                        └── SI-07.12.0 — depends on SI-07.11b (reusa grid e chips)
                            └── SI-07.12a — depends on SI-07.12.0
                                └── SI-07.12b — depends on SI-07.12a + SI-07.4 + SI-07.9 + SI-07.11b
                                    └── SI-07.13 — depends on SI-07.12b (telas prontas antes do smoke)
                                        └── SI-07.14 — depends on SI-07.13
                                            └── SI-07.15 — depends on SI-07.14
                                                └── SI-07.16 — depends on SI-07.15
                                                    └── SI-07.17 — depends on SI-07.16
                                                        └── SI-07.18 — depends on SI-07.17
```

---

## Deliverables

- [ ] SI-07.1 — Infra: extensão `pg_trgm` e índices trigram da busca
- [ ] SI-07.2 — Contadores de visualização em lote
- [ ] SI-07.3 — Serviço de listagem pública e busca de vídeos
- [ ] SI-07.4 — Endpoint GET /videos
- [ ] SI-07.5 — Infra: sincronizar OpenAPI e tipos do frontend
- [ ] SI-07.6 — Aliases de contrato e mocks MSW de GET /videos
- [ ] SI-07.7 — Layout do grupo (public) com renderização dinâmica (Setup)
- [ ] SI-07.8 — Shell público ciente de sessão e migração das rotas públicas
- [ ] SI-07.9 — Busca funcional no TopNav
- [ ] SI-07.10 — Shell responsivo (gaveta, busca em segunda linha, sidebar empilhada)
- [ ] SI-07.11.0 — Drift audit: Página inicial (Home)
- [ ] SI-07.11a — Tela de Página inicial (Home) (visual shell)
- [ ] SI-07.11b — Tela de Página inicial (Home) (lógica & wiring)
- [ ] SI-07.12.0 — Drift audit: Resultados de busca
- [ ] SI-07.12a — Tela de Resultados de busca (visual shell)
- [ ] SI-07.12b — Tela de Resultados de busca (lógica & wiring)
- [ ] SI-07.13 — Infra: Playwright em modo full-stack
- [ ] SI-07.14 — Specs full-stack dos fluxos principais
- [ ] SI-07.15 — Infra: Dockerfiles de produção
- [ ] SI-07.16 — Infra: compose de produção, proxy e runbook
- [ ] SI-07.17 — Infra: workflow de CI para pull requests
- [ ] SI-07.18 — Infra: workflow de deploy a partir de main

**Per-screen deliverables:**

- [ ] Screen Página inicial (Home) (`/`) is routable
- [ ] Screen Página inicial (Home) (`/`) renders loading, success, empty and error states
- [ ] Screen Página inicial (Home) (`/`) passes component tests (per testing-guide-next-frontend layers)
- [ ] Screen Resultados de busca (`/search`) is routable
- [ ] Screen Resultados de busca (`/search`) renders loading, success, empty and error states
- [ ] Screen Resultados de busca (`/search`) passes component tests (per testing-guide-next-frontend layers)

**Full test suites:**

- [ ] Backend tests pass (`cd nestjs-project && npm test`)
- [ ] Backend integration tests pass (`cd nestjs-project && npm run test:integration`)
- [ ] E2E tests pass (`cd nestjs-project && npm run test:e2e`)
- [ ] Type/compilation checks pass (`cd nestjs-project && npx tsc --noEmit`)
- [ ] Lint passes (`cd nestjs-project && npm run lint`)
- [ ] Frontend tests pass (`cd next-frontend && npm test`)
- [ ] Frontend E2E tests pass (`cd next-frontend && npm run test:e2e`)
- [ ] Type/compilation checks pass (`cd next-frontend && npx tsc --noEmit`)
- [ ] Lint passes (`cd next-frontend && npm run lint`)
