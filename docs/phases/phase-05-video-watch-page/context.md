---
kind: phase
name: phase-05-video-watch-page
sources_mtime:
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

# phase-05-video-watch-page — Context

## Scope

**Phase name:** Página de Visualização do Vídeo

**Capabilities** (literal, `docs/project-plan.md`):

- Player de vídeo com controles: play/pause, volume e barra de progresso
- Layout da página: vídeo principal + informações + sidebar com sugestões
- Descrição do vídeo com expansão/recolhimento
- Contagem de visualizações
- Sugestões de vídeos da mesma categoria na sidebar
- Acesso anônimo à visualização de vídeos
- Botão de download do vídeo
- Vídeos unlisted acessíveis apenas via link direto (sem aparecer em listagens)

**Out of scope:** _Not specified in project-plan.md._

**Deliverables:** página de visualização com player funcional, sidebar de sugestões, download e acesso anônimo.

**Affected subprojects:**

- `next-frontend/` — player, layout/composição da página, descrição expansível, contagem de views (UI), sugestões (UI), acesso anônimo, download (UI trigger).
- `nestjs-project/` — contagem de visualizações, endpoint de sugestões por categoria, e unificação da regra de visibilidade anônima (fecha um vazamento de rascunho pré-existente).

**Deferred subprojects:** _None._

**Sequencing notes:** Depende de Fase 03 (Upload e Processamento de Vídeos) e Fase 04 (Gerenciamento de Vídeos e Canal).

**Neighbors (for boundary detection only):**

- **Phase 04:** "Edição das informações do vídeo, fluxo de rascunho e publicação, painel de administração do canal e página pública." (Gerenciamento de Vídeos e Canal)
- **Phase 06:** "Likes/dislikes em vídeos e comentários, comentários com respostas e inscrição em canais." (Interações Sociais)

## Decisions Index

| Ref | Source | Scope | Topic | Status | Decision | Libraries |
|-----|--------|-------|-------|--------|----------|-----------|
| video-watch-page/TD-01 | phase | Frontend | Tecnologia do player de vídeo | decided | A | — |
| video-watch-page/TD-02 | phase | Backend | Estratégia de contagem de visualizações | decided | B | — |
| video-watch-page/TD-03 | phase | Backend | Estratégia de sugestões de vídeos relacionados | decided | B | — |
| video-watch-page/TD-04 | phase | Frontend | Estratégia de renderização e composição da página de vídeo | decided | A | — |
| video-watch-page/TD-05 | phase | Frontend | Interação de expansão/recolhimento da descrição do vídeo | decided | B | — |
| video-watch-page/TD-06 | phase | Frontend | Regra de acesso anônimo para a página de vídeo | decided | A | — |
| video-watch-page/TD-07 | phase | Cross-layer | Download do vídeo a partir da tela de visualização | decided | A | — |
| video-watch-page/TD-08 | phase | Backend | Regra de visibilidade para acesso anônimo a vídeo unlisted | decided | A | — |

_Source files:_

- video-watch-page — `docs/decisions/technical-decisions-video-watch-page.md` (scope_type: phase, related_phases: [5])

## Capability Coverage

| Capability (from project-plan.md) | Covered by |
|---|---|
| Player de vídeo com controles: play/pause, volume e barra de progresso | video-watch-page/TD-01 |
| Layout da página: vídeo principal + informações + sidebar com sugestões | video-watch-page/TD-04 |
| Descrição do vídeo com expansão/recolhimento | video-watch-page/TD-05 |
| Contagem de visualizações | video-watch-page/TD-02 |
| Sugestões de vídeos da mesma categoria na sidebar | video-watch-page/TD-03 |
| Acesso anônimo à visualização de vídeos | video-watch-page/TD-04, video-watch-page/TD-06 |
| Botão de download do vídeo | video-watch-page/TD-07 |
| Vídeos unlisted acessíveis apenas via link direto (sem aparecer em listagens) | video-watch-page/TD-08 |

## Decisions Detail

### video-watch-page/TD-01

**Recommendation:** os controles pedidos (play/pause, volume, progresso) são exatamente o que `radix-ui`'s `Slider` + a API nativa do `HTMLVideoElement` já cobrem sem dependência nova, e mantém a mesma convenção "sem biblioteca de UI externa" já seguida em todo o projeto (ícones, primitivos shadcn). Vidstack (Option B) só se pagaria se o projeto adotasse HLS/DASH, o que não está no escopo desta fase.
**Libraries:** —

### video-watch-page/TD-02

**Recommendation:** Redis já é uma dependência da stack (BullMQ, `phase-03-videos/TD-01`), e o TTL nativo resolve a janela de deduplicação sem precisar de um job de limpeza adicional, que a Option C exigiria.
**Libraries:** —

### video-watch-page/TD-03

**Recommendation:** sem fallback, a sidebar de sugestões fica vazia exatamente nos casos mais comuns no estágio atual da plataforma (poucas categorias, poucos vídeos por categoria), o que anula o valor da feature; a Option C resolve um problema (repetição) que não foi levantado como capability nesta fase.
**Libraries:** —

### video-watch-page/TD-04

**Recommendation:** a página pública do canal já validou exatamente este padrão (RSC anônimo, sem cache, fora de `(studio)/`) em produção nesta mesma base; reaproveitar evita documentar uma convenção nova para um comportamento que já existe. A reorganização em grupos de rotas (Option B) é prematura — pode ser feita depois, como refactor puro, sem impacto em nenhuma decisão de comportamento já tomada.
**Libraries:** —

### video-watch-page/TD-05

**Recommendation:** é a única opção que não exige nenhum JavaScript client-side (permanece Server Component) e já vem com acessibilidade completa embutida pelo navegador, sem replicar manualmente o que a Option A/C exigiriam. O ajuste de estilo do marcador do `<summary>` é cosmético, não funcional.
**Libraries:** —

### video-watch-page/TD-06

**Recommendation:** o Figma desta fase não tem nenhum elemento condicionado à sessão (confirmado no inventário de telas), e replicar o padrão já validado da página pública do canal (que também não lê sessão) evita introduzir um consumidor sem uso real até a Fase 06.
**Libraries:** —

### video-watch-page/TD-07

**Recommendation:** a Option B reintroduz, do lado do download, exatamente o problema de memória que a Fase 03 already resolveu do lado do upload (vídeos de até 10GB não devem passar pela memória da aplicação/JS); um link simples com redirect 302 deixa o navegador lidar com arquivos de qualquer tamanho nativamente.
**Libraries:** —

### video-watch-page/TD-08

**Recommendation:** a Option B deixa consciente e documentado um vazamento de privacidade real (rascunho acessível anonimamente via UUID) exatamente na fase que tem todo o contexto para corrigi-lo; a Option C evita o risco de regressão da Option A, mas `findOne` é usado pelo formulário de edição sempre em contexto de dono (nunca exercitando o caminho anônimo), então o risco que a Option C tenta evitar não existe na prática — a duplicação de regra que ela introduz não se paga.
**Libraries:** —

## Inherited Decisions Detail

### phase-01-configuracao-base/TD-01
**Recommendation:** Option A (@nestjs/config) — Official, core-team-maintained, guaranteed NestJS 11 compatibility. The `registerAs()` factory pattern solves the TypeORM CLI sharing problem.
**Libraries:** @nestjs/config@^4.x

### phase-01-configuracao-base/TD-02
**Recommendation:** Option A (Joi) — First-class integration with `@nestjs/config` via `validationSchema`, zero custom wiring, native string-to-number coercion.
**Libraries:** joi@^17.x

### phase-01-configuracao-base/TD-03
**Recommendation:** Option B (Namespaced/grouped with registerAs) — clear file boundaries per domain, typed injection via `ConfigType<typeof databaseConfig>`, natural scalability.
**Libraries:** —

### phase-01-configuracao-base/TD-04
**Recommendation:** Option A (Shared registerAs factory) — natural outcome of `@nestjs/config` + `registerAs`; `data-source.ts` imports it, calls `dotenv.config()`, then calls the factory.
**Libraries:** dotenv (transitive via @nestjs/config)

### phase-02-auth/TD-01
**Recommendation:** Argon2id — OWASP-recommended for a greenfield 2026 project; native build dependency is a one-time Docker setup cost.
**Libraries:** argon2@^0.41.x

### phase-02-auth/TD-02
**Recommendation:** Option A (@nestjs/passport) planned, but implementation diverged: custom guards were preferred to keep the dependency surface smaller (social login not on near-term roadmap).
**Libraries:** @nestjs/jwt@^11.0.0

### phase-02-auth/TD-03
**Recommendation:** Option A (Refresh Token Rotation) — strongest security model with automatic theft detection; DB write overhead acceptable.
**Libraries:** —

### phase-02-auth/TD-04
**Recommendation:** Option B (Random Opaque Tokens in DB) — revocability important; tokens table decoupled from JWT auth system.
**Libraries:** —

### phase-02-auth/TD-05
**Recommendation:** Option A (@nestjs-modules/mailer) — best NestJS integration, SMTP, works with MailHog/Mailpit locally, Handlebars templates.
**Libraries:** @nestjs-modules/mailer@^2.x, handlebars@^4.x

### phase-02-auth/TD-06
**Recommendation:** Option A (class-validator + class-transformer) — documented NestJS approach, decorator-consistent with TypeORM/DI usage.
**Libraries:** class-validator@^0.14.x, class-transformer@^0.5.x

### phase-02-auth/TD-07
**Recommendation:** Option A (Custom Domain Exception Filter) — machine-readable error codes for the Next.js frontend without RFC 9457 overhead; `{ statusCode, error, message }` format.
**Libraries:** —

### phase-02-auth/TD-08
**Recommendation:** Option A (@nestjs/throttler) — native guard scoping to `AuthModule` via `APP_GUARD`, in-memory storage sufficient (single-instance).
**Libraries:** @nestjs/throttler@^6.x

### phase-02-auth/TD-09
**Recommendation:** Option B (Opaque) planned, but implementation diverged: JWT was kept to reuse access-token signing/verification infra (`@nestjs/jwt`), trading size/readability for a single token format.
**Libraries:** @nestjs/jwt@^11.0.0

### phase-02-auth/TD-10
**Recommendation:** Option A — strict `[a-z0-9_]` allowlist for channel handles; simplest/most portable, `user_<random>` fallback for extreme email prefixes.
**Libraries:** —

### phase-02-auth-frontend/TD-01
**Recommendation:** Cookie-based session via BFF Route Handler (not Auth.js) — smaller blast radius, compatible with Next.js 16 / React 19 primitives (`next/headers` `cookies()`).
**Libraries:** —

### phase-02-auth-frontend/TD-02
**Recommendation:** Encrypted single session cookie (`iron-session`) — defense in depth, single cookie to manage, carries minimal user metadata (userId, email, channelSlug) for RSC chrome rendering.
**Libraries:** iron-session

### phase-02-auth-frontend/TD-03
**Recommendation:** Single-flight refresh helper tested via MSW (two concurrent intercepted upstream calls → one refresh expected); client-driven/pre-emptive-timer alternatives rejected.
**Libraries:** —

### phase-02-auth-frontend/TD-04
**Recommendation:** react-hook-form + Zod for forms — decoupled from Route-Handler-vs-Server-Action choice, aligned with shadcn's canonical form primitive and the Zod-first FE pattern.
**Libraries:** react-hook-form, @hookform/resolvers

### phase-02-auth-frontend/TD-05
**Recommendation:** Route Handlers as the single mutation surface under `app/api/**` — strict-BFF alignment, reuses existing MSW+BFF test scaffold, sets precedent for Phases 03–07.
**Libraries:** —

### phase-02-auth-frontend/TD-06
**Recommendation:** Session delivered via RSC in the same response as page HTML, Client Provider hydrates from it; `router.refresh()` required after mid-session mutations.
**Libraries:** —

### phase-02-auth-frontend/TD-07
**Recommendation:** First-paint-correct pattern: RSC owns the token, Client Component owns the input, shared across confirmation and reset-password flows.
**Libraries:** —

### phase-03-videos/TD-01
**Recommendation:** BullMQ (official NestJS queue module) — native retry/backoff/progress/concurrency for long, failure-prone video jobs; Redis cost acceptable (already planned as dedicated container).
**Libraries:** @nestjs/bullmq, bullmq

### phase-03-videos/TD-02
**Recommendation:** S3 multipart presigned upload — only option meeting 10GB support, non-blocking API (bytes never pass through Node), and resumability on connection failure. Confirmed compatible with MinIO via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.
**Libraries:** @aws-sdk/client-s3, @aws-sdk/s3-request-presigner

### phase-03-videos/TD-03
**Recommendation:** Separate Video Worker process (per C4 diagram) sharing the same `VideosModule`/codebase as the API; only the bootstrap entrypoint differs.
**Libraries:** —

### phase-03-videos/TD-04
**Recommendation:** fluent-ffmpeg — stable API for `ffprobe` metadata + `screenshots()` thumbnail; thumbnail extracted at 10% of video duration.
**Libraries:** fluent-ffmpeg

### phase-03-videos/TD-05
**Recommendation:** Presigned GET URLs for streaming/download — avoids reimplementing Range/206, API never proxies large-file bytes (same principle as TD-02). Video UUID is the stable public identifier; presigned URL is a short-lived pointer.
**Libraries:** — (reuses @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner from TD-02)

### phase-03-videos/TD-06
**Recommendation:** Retry transient upload/processing failures before exposing `error` to the user (leverages TD-01's queue attempts/backoff). The status enum covers only the technical upload/processing pipeline; content-publication state is a separate field (Phase 04).
**Libraries:** — (reuses @nestjs/bullmq from TD-01)

### phase-03-videos/TD-07
**Recommendation:** Single object-storage bucket — UUID already eliminates collisions, simpler provisioning, consistent with the single Object Storage container in the architecture diagram.
**Libraries:** — (reuses @aws-sdk/client-s3 from TD-02)

### upload-cleanup-policy/TD-01
**Recommendation:** Split responsibility at the natural resource boundary: storage handles multipart-part cleanup (native, survives app downtime); application handles only the Postgres `draft` record cleanup (invisible to storage).
**Libraries:** @nestjs/schedule
**Revisions:**
- 2026-09-21 — Decision changed from Option A to Option B during SI-03.1 of `/implement`. Rationale: MinIO silently drops the `AbortIncompleteMultipartUpload` lifecycle field unless combined with `Expiration`. The single cron (Option B) covers the same risk via `ListMultipartUploadsCommand` + `AbortMultipartUploadCommand` in the same `UploadCleanupService` that already cleans orphaned `draft` rows.

### phase-04-videos-channel/TD-01
**Recommendation:** Dedicated `categories` table + FK `videos.category_id`. Category is reusable content taxonomy (not an internal technical state), referenced by at least two future phases for filter/suggestion.
**Libraries:** —

### phase-04-videos-channel/TD-02
**Recommendation:** Direct thumbnail upload via API (`FileInterceptor` + `@nestjs/platform-express`) — thumbnails are small enough to not need the presigned-upload flow; overwrites the same key used by the auto-generated thumbnail (`videos/{id}/thumbnail.jpg`, per `phase-03-videos/TD-07`).
**Libraries:** @types/multer (dev)

### phase-04-videos-channel/TD-03
**Recommendation:** Independent `visibility` enum + nullable `published_at` timestamp for draft→publish flow; matches `phase-03-videos/TD-06`'s separate publication-state field.
**Libraries:** —

### phase-04-videos-channel/TD-04
**Recommendation:** `?page=1&pageSize=20` numbered pagination via TypeORM `skip`/`take` for channel video listings — per-channel volume is typically small.
**Libraries:** —

### phase-04-videos-channel/TD-05
**Recommendation:** 409 on channel nickname collision, no auto-suffix, no redirect from old nickname — project does not require preserving historical links.
**Libraries:** —

### phase-04-videos-channel-frontend/TD-01
**Recommendation:** Server-side auth check colocated with data fetch (not relying solely on `proxy.ts`'s optimistic check) — only pattern that survives App Router partial navigation. Pattern intended to extend to Phases 05–07 (comments, likes, subscriptions).
**Renders in:** frontend-runtime
**Libraries:** —

### phase-04-videos-channel-frontend/TD-02
**Recommendation:** URL as pagination state (no client cache dependency) — per-channel volumes are small (backend TD-04 premise); revisit if Phase 07 (home/search with long feed) needs client caching.
**Renders in:** frontend-runtime
**Libraries:** —

### phase-04-videos-channel-frontend/TD-03
**Recommendation:** No Cache Components adoption this phase — root layout already forces dynamic rendering, no measured performance need yet. Revisit in Phase 07 (home/search) where traffic/listing sharing justifies it.
**Renders in:** frontend-runtime
**Libraries:** —

### phase-04-videos-channel-frontend/TD-04
**Recommendation:** Resolves thumbnail, stream, and download via presigned URLs — preserves the "never proxy bytes" principle (`phase-03-videos/TD-05`); no FE change required. Dependency for Phases 04-FE and 05.
**Libraries:** —

### phase-04-videos-channel-frontend/TD-05
**Recommendation:** Authorization stays on the API (drafts remain private); stable URLs for caching; same read pattern already decided for video.
**Libraries:** —

### phase-04-frontend-contract-gaps/TD-01
**Recommendation:** Self-lookup endpoint added — also needed to pre-fill channel-edit form; resolves both uses without altering tokens or the login contract; cost is one extra call at login.
**Libraries:** —

### phase-04-frontend-contract-gaps/TD-02
**Recommendation:** Minimal new surface added; new fields are metadata that Phase 05 will also need; existing visibility rule still applies.
**Libraries:** —

### phase-04-frontend-contract-gaps/TD-03
**Recommendation:** Keeps the optimistic proxy check (TD-01), reuses the refresh helper already decided in Phase 02, limits cost to the rare expired-token case.
**Renders in:** frontend-runtime
**Libraries:** —

### next-frontend-openapi-typing/TD-01
**Recommendation:** Option A (`openapi-typescript` + `openapi-fetch`). Strict BFF makes the SDK surface valueless on the client; types-first matches the rest of the FE foundation; MSW typing is solved by the same `paths` symbol.
**Libraries:** openapi-typescript, openapi-fetch

### next-frontend-openapi-typing/TD-02
**Recommendation:** Option B (committed local copy at `next-frontend/openapi.json` + repo-root sync script). Preserves compose-stack independence; drift eliminated structurally when paired with TD-03's CI freshness check; the committed local file is a real artifact in PR review.
**Libraries:** —

### next-frontend-openapi-typing/TD-03
**Recommendation:** Option C (committed + CI freshness check). The only option that makes contract drift both visible (PR diffs) and impossible to merge accidentally (CI fail).
**Libraries:** —

### next-frontend-openapi-typing/TD-04
**Recommendation:** Option A (single `lib/api/contracts.ts` with explicit aliases). Handles pass-through and reshape with the same mechanism; single grep target for "what shape does the BFF expose"; decouples Component imports from App Router file paths.
**Libraries:** —

### next-frontend-openapi-typing/TD-05
**Recommendation:** Option A (hand-written MSW handlers typed via `paths`). Determinism over auto-generation; coherence with TD-01's `paths` type as single contract anchor; scale fit for the current API size.
**Libraries:** —

### next-frontend-msw-foundation/TD-01
**Recommendation:** Option B (per-domain modules under `mocks/handlers/<domain>.ts` + barrel). Matches MSW's own best-practice recommendation; domain ownership tracks the codebase, not the project plan; append-only growth with minimal merge conflicts.
**Libraries:** —

### next-frontend-msw-foundation/TD-02
**Recommendation:** Option A (test-only `setupServer` at foundation; browser worker deferred). The browser worker is a future capability with no documented current consumer; wiring it now is speculative investment.
**Libraries:** —

### next-frontend-msw-foundation/TD-03
**Recommendation:** Option D (hand-written deterministic defaults as default + opt-in seeded faker scoped to bulk-collection builders only). Option B's determinism + readability is the right baseline; bulk-collection cases will arrive but per-fixture local seeding avoids the global-cursor pitfall.
**Libraries:** —

### next-frontend-msw-foundation/TD-04
**Recommendation:** Option A (universal handler set + `server.use(...)` overrides + `onUnhandledRequest: "error"`). The "import only what it needs" requirement is satisfied at the authoring layer by TD-01; at runtime, loading all handlers is the canonical MSW v2 model and imposes no cost on tests that don't fetch the extra URLs.
**Libraries:** —

### next-frontend-config-base/TD-01
**Recommendation:** Option A (Zod 4). Type-inference matches the FE's strict-TS culture; ecosystem gravity in Next.js/React 19; direct enablement of TD-02 Option A (`@t3-oss/env-nextjs`).
**Libraries:** zod

### next-frontend-config-base/TD-02
**Recommendation:** Option A (`@t3-oss/env-nextjs`). The only option combining type-level `NEXT_PUBLIC_` prefix enforcement, runtime Proxy-based leak detection, and single-file consumer ergonomics.
**Libraries:** @t3-oss/env-nextjs

### next-frontend-config-base/TD-03
**Recommendation:** Option A (Strict BFF — single server-only `API_URL`). Aligned with the BFF testing strategy already documented in CLAUDE.md; eliminates CORS, eliminates public exposure of the backend URL.
**Libraries:** —

### openapi-docs-nestjs/TD-01
**Recommendation:** Option A (`@nestjs/swagger` + CLI plugin). Preserves prior decisions (`class-validator` em TD-06 de phase-02-auth) sem re-platform; o CLI plugin aproveita os decoradores existentes.
**Libraries:** @nestjs/swagger

### openapi-docs-nestjs/TD-02
**Recommendation:** Option C (Runtime UI + `openapi.json` exportado). O custo marginal sobre Option A é um npm script; o benefício é uma fundação correta para futura integração FE sem perder a UI interativa.
**Libraries:** —

### openapi-docs-nestjs/TD-03
**Recommendation:** Option B (Apenas em dev/staging via env flag). Alinha com a postura defensiva já estabelecida na Fase 02; não compromete consumidores legítimos.
**Libraries:** —

## Inherited Conventions

- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`. _(from phase 04)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`. _(from phase 04)_
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`. _(from phase 04)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports the config factory and calls it as a plain function. _(from phase 04)_
- Database connection parameters are sourced from a single `databaseConfig` factory — never duplicated. _(from phase 04)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`). _(from phase 04)_

## Inherited Deferred Capabilities

| Capability | Status | Origin phase | Rationale |
|-----------|--------|--------------|-----------|
| Telas de frontend | deferred | phase-01-configuracao-base | `next-frontend/` not initialized in this phase; UI surfaces start in a later phase. |
| Telas de cadastro, login, confirmação de conta e recuperação de senha | deferred | phase-02-auth | `next-frontend/` not initialized in this phase; UI surfaces start in a later phase. |
| "Confirmação de conta via e-mail com link de ativação" | deferred | phase-02-auth-frontend | UI landing screen de-scoped 2026-05-14; FE confirmation flow (TD-07) picked up by a future phase. BE side unchanged. |
| "Logout" | deferred | phase-02-auth-frontend | Logout button lives inside authenticated chrome (typically Phase 04). Phase 02 already implements `POST /api/auth/logout` so the contract is ready. |
| "Recuperação de senha (destination screen / set-new-password)" | deferred | phase-02-auth-frontend | `/forgot-password` ships this phase; the reset-password destination screen is absent from Figma — link target remains a 404 until a later phase delivers the screen. |
| "Telas de cadastro, login, confirmação de conta e recuperação de senha" | deferred | phase-02-auth-frontend | Umbrella bullet's full coverage requires the confirmação/reset-password screens, both deferred per rows above; the 3 shipped telas (signup, login, forgot-password) are covered individually. |
| Painel de gerenciamento de vídeos do canal (UI) | deferred | phase-04-videos-channel | Backend contract decided; panel UI delivered by sibling slice `phase-04-videos-channel-frontend` (already closed). |
| Edição de vídeos a partir do painel (UI) | deferred | phase-04-videos-channel | Same contract as video-info editing; panel-triggered UI delivered by sibling slice (already closed). |
| Edição das informações do canal (UI) | deferred | phase-04-videos-channel | Backend CRUD decided; channel-edit form UI delivered by sibling slice (already closed). |
| Página pública do canal (UI) | deferred | phase-04-videos-channel | Backend listing/pagination contract decided; public channel page UI delivered by sibling slice (already closed). |

_Note: the 4 rows deferred by `phase-04-videos-channel` were already built by the sibling slice `phase-04-videos-channel-frontend` (confirmed via that slice's own context.md and git history) — not open work for this phase._

## UI Inventory

**Source:** `docs/inventories/screen-inventory-phase-05-video-watch-page.md`
**Screens in scope:** 1

### UI ↔ Capability Join

| Screen | Route | Verb | Capability | Covering Component |
|--------|-------|------|------------|-------------------|
| Página de visualização do vídeo | /watch/[id] | Carregar e reproduzir o stream de vídeo a partir do Object Storage | "Player de vídeo com controles: play/pause, volume e barra de progresso" | VideoPlayer container |
| Página de visualização do vídeo | /watch/[id] | Exibir nome do canal do vídeo | "Layout da página: vídeo principal + informações + sidebar com sugestões" | ChannelInfo |
| Página de visualização do vídeo | /watch/[id] | Exibir data de publicação do vídeo | "Layout da página: vídeo principal + informações + sidebar com sugestões" | UploadDate text |
| Página de visualização do vídeo | /watch/[id] | Disparar download do vídeo | "Botão de download do vídeo" | DownloadAction |
| Página de visualização do vídeo | /watch/[id] | Exibir contagem de visualizações do vídeo | "Contagem de visualizações" | ViewCount text |
| Página de visualização do vídeo | /watch/[id] | Exibir descrição do vídeo | "Descrição do vídeo com expansão/recolhimento" | DescriptionText body |
| Página de visualização do vídeo | /watch/[id] | Filtrar sugestões de vídeo por categoria/canal | "Sugestões de vídeos da mesma categoria na sidebar" | TabMenu |
| Página de visualização do vídeo | /watch/[id] | Exibir lista de vídeos sugeridos da mesma categoria na sidebar | "Sugestões de vídeos da mesma categoria na sidebar" | VideoCard ×5 |

### Server-connected Components

- `VideoPlayer container` (Página de visualização do vídeo) — `Reuse?: new`
- `ChannelInfo — nome do canal` (Página de visualização do vídeo) — `Reuse?: new`
- `DownloadAction` (Página de visualização do vídeo) — `Reuse?: new`
- `ViewCount text` (Página de visualização do vídeo) — `Reuse?: new`
- `UploadDate text` (Página de visualização do vídeo) — `Reuse?: new`
- `DescriptionText body` (Página de visualização do vídeo) — `Reuse?: new`
- `TabMenu — chips de categoria/canal` (Página de visualização do vídeo) — `Reuse?: new`
- `VideoCard ×5` (Página de visualização do vídeo) — `Reuse?: components/channel/video-card.tsx`

### Open Questions from Inventory

- Confirmar a localização exata do item "Download" dentro do menu de overflow (kebab, nó 158:2855) — `get_design_context` não expõe os itens do menu expandido.
- Confirmar o mapeamento ícone→função do cluster de chrome do player (configurações/legendas/fullscreen, nós 108:276–108:294) — inferido do screenshot, não confirmado por nome de layer.

## Non-UI / Deferred Capabilities

| Capability | Status | Rationale | Covering TDs |
|---|---|---|---|
| Acesso anônimo à visualização de vídeos | non-ui | Comportamento de rota/arquitetura — ausência de `requireSession()` na página RSC (mesmo padrão já validado em `/channel/[nickname]`); não é um componente renderizado distinto. | video-watch-page/TD-04, video-watch-page/TD-06 |
| Vídeos unlisted acessíveis apenas via link direto (sem aparecer em listagens) | non-ui | Enforcement é regra de visibilidade no backend (unificação de `findOne`/`stream`/`download`/`thumbnail`) + ausência nos filtros de listagem; não há componente visual distinto a renderizar. | video-watch-page/TD-08 |

## Testing Requirements

### next-frontend

| Artifact created | Required tests |
|---|---|
| Page — sync RSC, static, no logic | None at component level; cover only if part of a critical flow → `*.e2e-spec.ts` |
| Page — sync RSC composing client children | Test client children directly; cover rendered page via `*.e2e-spec.ts` |
| Page — async RSC (`async function Page()` with `await`) | `*.e2e-spec.ts` only — Vitest cannot render it |
| Layout (`layout.tsx`) | None unless it adds logic (auth gate, conditional render); else via E2E |
| Client component (`"use client"`) with state/handlers | `*.test.tsx` — RTL + `jsdom` docblock, mock `next/navigation`, MSW for fetch |
| Feature component (server, composes primitives) | Skip unit; cover via the page's E2E |
| shadcn UI primitive (`components/ui/*`) | None — trust the library; cover via consumers |
| Icon (`components/icons/*`) | None |
| `lib/` utility / boundary module with branching or shape assumptions | `*.test.ts` |
| Custom hook (`hooks/*`) | `*.test.ts(x)` with `renderHook`, `jsdom` docblock |
| Route handler (`app/api/**/route.ts`) — proxy or with branching | `*.integration.test.ts` with MSW (+ `*.test.ts` for extracted pure logic) |

_Note: Playwright is not yet installed in `next-frontend` (per the testing guide's 2026-05 status) — the first E2E-requiring SI in this phase triggers the install._

### nestjs-project

| Artifact created | Required tests |
|---|---|
| Entity (`*.entity.ts`) | Integration: constraints, defaults, `select: false` |
| Service with branching + DB | Unit: branch logic (mock repo) + Integration: DB contract |
| Service with DB only (no branching) | Integration: DB contract |
| Service with configured lib (JWT, cache, Redis) | Unit: real lib with test config |
| Service with side-effect dep (email, storage) | Integration: real capture service (Mailpit) or local adapter |
| Module with configured imports | Unit: compilation test |
| Controller | E2E only — do NOT write unit tests |
| DTO | E2E: one validation wiring test per endpoint |
| Guard (delegates to service for business logic) | E2E + Unit if complex internal logic |
