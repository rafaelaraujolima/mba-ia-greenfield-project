---
kind: phase
name: phase-04-videos-channel-frontend
sources_mtime:
  docs/project-plan.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-phase-04-videos-channel-frontend.md: "2026-09-24T19:42:10-04:00"
  docs/decisions/technical-decisions-next-frontend-config-base.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-next-frontend-msw-foundation.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-03-videos/context.md: "2026-09-23T14:42:16-04:00"
  docs/phases/phase-04-videos-channel/context.md: "2026-09-23T14:42:22-04:00"
  docs/phases/phase-04-videos-channel/library-refs.md: "2026-09-23T14:42:22-04:00"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-17T19:27:23-04:00"
  .claude/skills/testing-guide-next-frontend/SKILL.md: "2026-09-17T19:27:23-04:00"
  docs/inventories/screen-inventory-phase-04-videos-channel-frontend.md: "2026-09-26T09:29:35-04:00"
---

# phase-04-videos-channel-frontend — Context

## Scope

**Phase name:** Fase 04 — Gerenciamento de Vídeos e Canal (slice: `phase-04-videos-channel-frontend`)

**Capabilities** (literal, `docs/project-plan.md`; this slice's `covers_capabilities` lists all 8 bullets):

- Categorias de vídeo disponíveis na plataforma
- Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada
- Visibilidade do vídeo: público (aparece para todos) ou unlisted (somente via link)
- Fluxo de rascunho → publicação
- Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status)
- Edição de vídeos a partir do painel
- Edição das informações do canal: nickname, nome e descrição
- Página pública do canal com informações e listagem de vídeos

**Out of scope:** _Not specified in project-plan.md._

**Deliverables:** edição completa de vídeos, rascunho/publicação, painel de gerenciamento, edição de canal, página pública do canal.

**Affected subprojects:** _Not stated in project-plan.md._ This slice: `next-frontend/` (screens, BFF Route Handlers, route guard, list data strategy); `nestjs-project/` only for the backend changes required by cross-layer TD-04 and TD-05.

**Deferred subprojects:** _None._

**Sequencing notes:** `> Depende de: Fase 02, Fase 03`. Slice-level: `depends_on_slices: [phase-04-videos-channel]` — the backend slice is completed (`progress.md` `Status: completed`) and decides the backend contracts for all 8 bullets; it omits `covers_capabilities` (monolithic semantics). This slice claims all 8 bullets for their UI.

**Neighbors (for boundary detection only):**

- **Phase 03:** Fase 03 — Upload e Processamento de Vídeos (depende de: Fase 01, Fase 02).
- **Phase 05:** Fase 05 — Página de Visualização do Vídeo (depende de: Fase 03, Fase 04).

## Decisions Index

| Ref | Source | Scope | Topic | Status | Decision | Libraries | Renders in |
|-----|--------|-------|-------|--------|----------|-----------|------------|
| phase-04-videos-channel-frontend/TD-01 | phase | Frontend | Guarda de Rotas Autenticadas (área de gerenciamento) | decided | C | — | frontend-runtime |
| phase-04-videos-channel-frontend/TD-02 | phase | Frontend | Estratégia de Dados e Paginação das Listagens de Vídeo | decided | A | — | frontend-runtime |
| phase-04-videos-channel-frontend/TD-03 | phase | Frontend | Cache e Revalidação da Página Pública do Canal | decided | A | — | frontend-runtime |
| phase-04-videos-channel-frontend/TD-04 | phase | Cross-layer | Endpoint Público de Storage para URLs Pré-assinadas | decided | A | — | — |
| phase-04-videos-channel-frontend/TD-05 | phase | Cross-layer | Entrega de Thumbnails à UI (contrato e `next/image`) | decided | A | — | — |

_Source files:_

- phase-04-videos-channel-frontend — `docs/decisions/technical-decisions-phase-04-videos-channel-frontend.md` (scope_type: phase, related_phases: [4])

## Capability Coverage

| Capability (from project-plan.md) | Covered by |
|-----------------------------------|------------|
| Categorias de vídeo disponíveis na plataforma | phase-04-videos-channel/TD-01 _(inherited, sibling slice)_ |
| Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada | phase-04-videos-channel/TD-02 _(inherited, sibling slice)_ |
| Visibilidade do vídeo: público (aparece para todos) ou unlisted (somente via link) | phase-04-videos-channel/TD-03 _(inherited, sibling slice)_ |
| Fluxo de rascunho → publicação | phase-04-videos-channel/TD-03 _(inherited, sibling slice)_ |
| Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status) | phase-04-videos-channel-frontend/TD-01, TD-02, TD-04, TD-05 |
| Edição de vídeos a partir do painel | phase-04-videos-channel-frontend/TD-01, TD-03, TD-05 |
| Edição das informações do canal: nickname, nome e descrição | phase-04-videos-channel-frontend/TD-01, TD-03 |
| Página pública do canal com informações e listagem de vídeos | phase-04-videos-channel-frontend/TD-02, TD-03, TD-04, TD-05 |

_The first four bullets have their technical decisions in the sibling slice `phase-04-videos-channel` (mapping taken from that slice's own Capability Coverage); this slice owns their UI (screen `/studio/videos/[id]/edit`) and adds no TD of its own for them. All 8 bullets are covered (0 uncovered)._

## Decisions Detail

### phase-04-videos-channel-frontend/TD-01

**Recommendation:** a Fase 02 já fixou que a sessão vive em cookie `iron-session` lido no servidor; falta apenas a barreira. A verificação junto ao dado é a única que sobrevive à navegação parcial do App Router, e o `proxy.ts` sozinho é explicitamente uma checagem otimista. O custo (um helper chamado em poucos pontos) é baixo para esta fase e o padrão vale para as Fases 05–07 (comentários, curtidas, inscrições).
**Renders in:** frontend-runtime
**Libraries:** —

### phase-04-videos-channel-frontend/TD-02

**Recommendation:** os volumes por canal são pequenos (premissa do `TD-04` de backend), a URL como estado é o padrão idiomático do App Router e evita uma dependência e uma camada de estado que nenhuma capacidade da fase exige. Se a Fase 07 (home/busca com feed longo) pedir cache de cliente, a decisão é revisitada lá com evidência.
**Renders in:** frontend-runtime
**Libraries:** —

### phase-04-videos-channel-frontend/TD-03

**Recommendation:** não há requisito de desempenho no plano para esta fase, o layout raiz já força renderização dinâmica, e as Options B/C custam uma reorganização transversal (flag global ou layout raiz) para resolver um problema ainda não medido. Reavaliar na Fase 07 (home/busca), onde tráfego e listagens compartilhadas justificam Cache Components.
**Renders in:** frontend-runtime
**Libraries:** —

### phase-04-videos-channel-frontend/TD-04

**Recommendation:** é a única que resolve thumbnail, stream e download com uma mudança, mantém a decisão de nunca proxiar bytes (`phase-03-videos/TD-05`) e não toca o FE. É dependência das Fases 04-FE e 05.
**Libraries:** —

### phase-04-videos-channel-frontend/TD-05

**Recommendation:** mantém a autorização na API (rascunhos continuam privados), aproveita URLs estáveis para o cache e segue o mesmo padrão de leitura já decidido para o vídeo. O custo é pequeno (um endpoint e um Route Handler) frente ao Option B (imagens quebrando por expiração) e ao Option C (vazamento de thumbnails não publicadas).
**Libraries:** —

## Inherited Decisions Detail

### From the sibling slice `phase-04-videos-channel` (backend, completed) — direct contract dependencies

**phase-04-videos-channel/TD-01 — Modelo de dados para categorias de vídeo.** Decision: B (tabela dedicada `categories` + FK `videos.category_id`); taxonomia de conteúdo reutilizada em fases futuras. **Libraries:** — _(from slice phase-04-videos-channel)_

**phase-04-videos-channel/TD-02 — Upload de thumbnail customizada.** Decision: A (upload direto via API, `FileInterceptor` + `@nestjs/platform-express`; sobrescreve `videos/{id}/thumbnail.jpg`, convenção da `phase-03-videos/TD-07`). **Libraries:** @types/multer (dev) _(from slice phase-04-videos-channel)_

**phase-04-videos-channel/TD-03 — Visibilidade e fluxo rascunho → publicação.** Decision: A (campos independentes `visibility` enum + `published_at` timestamp nullable); `published_at` também resolve "tempo de publicação" do painel. **Libraries:** — _(from slice phase-04-videos-channel)_

**phase-04-videos-channel/TD-04 — Paginação de listagens de vídeo do canal.** Decision: A (`?page=1&pageSize=20`, TypeORM `skip`/`take`; resposta `{ items, page, pageSize, total }`). **Libraries:** — _(from slice phase-04-videos-channel)_

**phase-04-videos-channel/TD-05 — Troca de nickname do canal.** Decision: A (409 `NICKNAME_ALREADY_EXISTS` em colisão, sem sufixo automático, sem redirect de nickname antigo). **Libraries:** — _(from slice phase-04-videos-channel)_

### From prior phases (lineage: Phase 01 → Phase 02 → Phase 03)

**phase-01-configuracao-base/TD-01 — Config module.** Option A (`@nestjs/config`) — `registerAs()` factory is dual-purpose (DI token + plain function for `data-source.ts`). **Libraries:** `@nestjs/config@^4.x`

**phase-01-configuracao-base/TD-02 — Env validation.** Option A (Joi) — first-class `@nestjs/config` integration via `validationSchema`. **Libraries:** `joi@^17.x`

**phase-01-configuracao-base/TD-03 — Config file structure.** Option B (namespaced/grouped `registerAs`) — per-domain files, typed injection via `ConfigType<typeof xxxConfig>`. **Libraries:** —

**phase-01-configuracao-base/TD-04 — data-source.ts config sharing.** Option A (shared `registerAs` factory) — zero duplication between `AppModule` and `data-source.ts`. **Libraries:** `dotenv` (transitive)

**phase-02-auth/TD-01 — Password hashing.** Argon2id. **Libraries:** `argon2@^0.41.x`

**phase-02-auth/TD-02 — Auth strategy scaffolding.** Recommendation was `@nestjs/passport`; **implementation diverged** — custom guards were used instead. **Libraries:** `@nestjs/jwt@^11.0.0`

**phase-02-auth/TD-03 — Refresh token strategy.** Option A (Refresh Token Rotation). **Libraries:** —

**phase-02-auth/TD-04 — Password-reset token storage.** Option B (random opaque tokens in DB). **Libraries:** —

**phase-02-auth/TD-05 — Email delivery.** Option A (`@nestjs-modules/mailer`). **Libraries:** `@nestjs-modules/mailer@^2.x`, `handlebars@^4.x`

**phase-02-auth/TD-06 — Validation library.** Option A (`class-validator` + `class-transformer`). **Libraries:** `class-validator@^0.14.x`, `class-transformer@^0.5.x`

**phase-02-auth/TD-07 — Error response shape.** Option A (custom Domain Exception Filter) — machine-readable error codes the Next.js frontend can switch on; `{ statusCode, error, message }` envelope. **Libraries:** —

**phase-02-auth/TD-08 — Rate limiting.** Option A (`@nestjs/throttler`), scoped to `AuthModule`. **Libraries:** `@nestjs/throttler@^6.x`

**phase-02-auth/TD-09 — Refresh token format.** Recommendation was Option B (opaque); **implementation diverged** — JWT kept. **Libraries:** `@nestjs/jwt@^11.0.0`

**phase-02-auth/TD-10 — Channel nickname generation (signup).** Option A — strict `[a-z0-9_]` allowlist with `user_<random>` fallback. **Libraries:** —

**phase-02-auth-frontend/TD-01 — Session strategy.** Custom cookie-based session (no Auth.js): strict-BFF makes the backend the sole auth authority; a ~50-LOC helper over `next/headers` `cookies()` is grep-friendly, test-friendly via MSW+BFF integration tests, and free of Auth.js/Next 16 compatibility lag. **Libraries:** —

**phase-02-auth-frontend/TD-02 — Session cookie encoding.** `iron-session` — httpOnly + encrypted single cookie (one `session.destroy()` on logout) carrying minimal user metadata (`userId`, `email`, `channelSlug`) so `app/layout.tsx` (RSC) can render the authenticated chrome without a per-render `/auth/me` round-trip — "Phase 04+ gains compound here". **Libraries:** `iron-session`

**phase-02-auth-frontend/TD-03 — Token refresh coordination.** Server-side refresh in a single-flight helper (two concurrent upstream calls → one refresh), tested via MSW. **Libraries:** —

**phase-02-auth-frontend/TD-04 — Form handling.** `react-hook-form` + Zod resolvers — shadcn's canonical form primitive; Zod schemas-as-source-of-truth, same paradigm as env validation. **Libraries:** `react-hook-form`, `@hookform/resolvers`

**phase-02-auth-frontend/TD-05 — Mutation surface.** Route Handlers under `app/api/**` for every mutation (not Server Actions) — strict-BFF alignment, reuses the MSW test scaffold; sets the precedent for Phases 03–07. **Libraries:** —

**phase-02-auth-frontend/TD-06 — Auth state delivery to client.** RSC reads the session cookie and hydrates a Client Provider (`SessionProvider`) — no first-render flicker, no extra BFF endpoint; `router.refresh()` required after mid-session mutations. **Libraries:** —

**phase-02-auth-frontend/TD-07 — Confirmation/reset destination pages.** RSC-owns-the-token, Client Component owns the input. **Libraries:** —

**phase-03-videos/TD-01 — Queue.** `@nestjs/bullmq` + `bullmq`. **Libraries:** `@nestjs/bullmq`, `bullmq`

**phase-03-videos/TD-02 — Video upload protocol.** Presigned multipart upload direct-to-storage (10GB-capable, resumable, API never proxies bytes). **Libraries:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

**phase-03-videos/TD-03 — Worker process split.** Dedicated Video Worker process sharing the `VideosModule` codebase. **Libraries:** —

**phase-03-videos/TD-04 — Video processing tooling.** `fluent-ffmpeg` — `ffprobe` metadata + thumbnail extraction at 10% of duration. **Libraries:** `fluent-ffmpeg`

**phase-03-videos/TD-05 — Video streaming/download.** Presigned read URLs; the API never proxies bytes of large files; video UUID is the stable public identifier. **Libraries:** — (reuses `@aws-sdk/*`)

**phase-03-videos/TD-06 — Upload/processing status enum.** `VideoStatus` (`draft | processing | ready | error`) covers exclusively the technical pipeline; publication is a separate dimension (realized by `phase-04-videos-channel/TD-03`). **Libraries:** —

**phase-03-videos/TD-07 — Storage bucket layout.** Single bucket, UUID-keyed paths (`videos/{id}/...`). **Libraries:** —

**upload-cleanup-policy/TD-01 — Abandoned upload cleanup.** Option B (single scheduled cron via `@nestjs/schedule`) — revised 2026-09-21 from Option A after MinIO was found to silently drop `AbortIncompleteMultipartUpload`. **Libraries:** `@nestjs/schedule`

### From correlated ad-hoc decisions (confirmed by the user for this slice — all four candidates selected: `next-frontend-msw-foundation` (high), `next-frontend-openapi-typing` (high), `next-frontend-config-base` (medium), `openapi-docs-nestjs` (medium))

**next-frontend-config-base/TD-01 — Env schema validation library.** Option A (Zod 4) — typed `env` object with no `as` casts; the same Zod paradigm carries to forms. **Libraries:** zod

**next-frontend-config-base/TD-02 — Server/client boundary enforcement.** Option A (`@t3-oss/env-nextjs`) — type-level `NEXT_PUBLIC_` prefix enforcement + runtime Proxy leak detection in a single `lib/env.ts`. **Libraries:** `@t3-oss/env-nextjs`

**next-frontend-config-base/TD-03 — API URL key strategy.** Option A (Strict BFF — single server-only `API_URL`) — Route Handlers are the only NestJS caller; no CORS, no public backend URL. A public key later is non-breaking; removing one is breaking. Docker topology of the `API_URL` value is a separate concern. **Libraries:** —

**next-frontend-openapi-typing/TD-01 — Codegen tooling.** `openapi-typescript` + `openapi-fetch` — zero-runtime `paths` types plus a thin server-side client. **Libraries:** `openapi-typescript`, `openapi-fetch`

**next-frontend-openapi-typing/TD-02 — Spec sourcing under Docker bind-mount isolation.** Committed local copy at `next-frontend/openapi.json` + repo-root sync script (compose stacks stay independent). **Libraries:** —

**next-frontend-openapi-typing/TD-03 — Codegen timing.** Committed output + CI freshness check (`openapi.json` and `types.gen.ts`) — contract changes are PR-visible and impossible to merge stale. **Libraries:** —

**next-frontend-openapi-typing/TD-04 — Type sharing BFF↔Components.** Single `lib/api/contracts.ts` with explicit aliases; the only file that imports `paths` from `types.gen.ts`; every other consumer imports from `contracts.ts`. **Libraries:** —

**next-frontend-openapi-typing/TD-05 — MSW handler typing.** Hand-written handlers typed via `paths` — a stale fixture fails `tsc --noEmit` after `types.gen.ts` regenerates. **Libraries:** —

**next-frontend-msw-foundation/TD-01 — Handler module organization.** Per-domain modules under `mocks/handlers/<domain>.ts` + barrel `mocks/handlers/index.ts`; one happy-path handler per `paths` entry, error/edge scenarios via `server.use(...)` in the test file. **Libraries:** —

**next-frontend-msw-foundation/TD-02 — Node vs browser mock contexts.** Test-only `setupServer` at foundation; browser worker deferred until a real FE-offline-dev consumer exists. **Libraries:** —

**next-frontend-msw-foundation/TD-03 — Fixture factory pattern.** Hand-written deterministic defaults; opt-in seeded `@faker-js/faker` scoped to bulk-collection builders only, installed when the first bulk builder is authored (Phase 07 home grid / Phase 06 comment threads were the anticipated triggers). **Libraries:** — (`@faker-js/faker` deferred)

**next-frontend-msw-foundation/TD-04 — Handler set consumption.** Universal handler set in `setupServer` + per-test `server.use(...)` overrides + `onUnhandledRequest: "error"`. **Libraries:** —

**openapi-docs-nestjs/TD-01 — OpenAPI tooling.** `@nestjs/swagger` + CLI plugin (`classValidatorShim: true`). **Libraries:** `@nestjs/swagger`
**Revisions:** 2026-05-12 — CLI plugin only infers DTO schemas; operation docs, per-status response types and error-envelope contracts require explicit decorators (`@ApiOperation`, `@ApiResponse`, `@ApiBody`, `@ApiParam`, `@ApiQuery`, `@ApiExtraModels`) as part of the same chosen option.

**openapi-docs-nestjs/TD-02 — Spec artifact strategy.** Option C — runtime Swagger UI and exported static `openapi.json` (the offline-codegen input for the frontend). **Libraries:** —

**openapi-docs-nestjs/TD-03 — Swagger UI production exposure.** Option B — enabled only in dev/staging via env flag; `openapi.json` artifact stays available via the committed file. **Libraries:** —

## Inherited Conventions

- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`. _(from phase 01)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`, passed to `ConfigModule.forRoot({ validationSchema, validationOptions: { allowUnknown: true, abortEarly: false } })`. _(from phase 01)_
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`; the same factory is importable as a plain function for non-DI contexts (e.g., TypeORM CLI). _(from phase 01)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports the config factory and calls it as a plain function. _(from phase 01)_
- Database connection parameters are sourced from a single `databaseConfig` factory — never duplicated between `AppModule` and `data-source.ts`. _(from phase 01)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`), with `imports: [ConfigModule]`, `inject: [databaseConfig.KEY]`, `useFactory` returning options including `autoLoadEntities: true`, `synchronize: false`. _(from phase 01)_

_(All are backend conventions, consolidated from near-duplicate restatements in phases 02, 03 and the sibling slice; relevant to the backend changes required by cross-layer TD-04/TD-05. No frontend conventions are recorded in prior phase contexts — `phase-02-auth-frontend/context.md` reads "No inherited conventions from prior phases"; frontend constraints are carried by the inherited TDs above.)_

## Inherited Deferred Capabilities

| Capability | Status | Origin phase | Rationale |
|-----------|--------|--------------|-----------|
| Telas de frontend | deferred | phase-01-configuracao-base | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| Telas de cadastro, login, confirmação de conta e recuperação de senha | deferred | phase-02-auth | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Confirmação de conta via e-mail com link de ativação" | deferred | phase-02-auth-frontend | deferred_to_next_phase — UI landing screen de-scoped 2026-05-14; FE confirmation flow (TD-07) picked up by a future phase. BE side unchanged in `phase-02-auth`. |
| "Logout" | deferred | phase-02-auth-frontend | deferred_to_next_phase — logout button lives inside authenticated chrome (typically Phase 04). Phase 02 still implements POST `/api/auth/logout` (BFF route handler + `session.destroy()`) so the contract is ready when the chrome lands. |
| "Recuperação de senha (destination screen / set-new-password)" | deferred | phase-02-auth-frontend | deferred_to_next_phase — `/forgot-password` ships this phase sending the e-mail; the reset-password destination screen is absent from Figma → link destination remains a 404 until a later phase delivers the screen via `/screen-inventory` extension run. Documented as a known gap. |
| "Telas de cadastro, login, confirmação de conta e recuperação de senha" | deferred | phase-02-auth-frontend | the umbrella bullet's full coverage requires the confirmação and reset-password destination screens; both are deferred. The 3 ship-this-phase telas (signup, login, forgot-password) are inventoried and covered by their own verbs; the umbrella bullet itself is deferred to the phase that lands the missing screens. |
| Painel de gerenciamento de vídeos do canal (UI) _(from slice phase-04-videos-channel)_ | deferred | phase-04-videos-channel | Backend contract (listing/pagination) decided in that slice; panel UI itself belongs to the deferred frontend slice of Phase 04, mirroring Phase 02's backend-then-frontend sequencing. |
| Edição de vídeos a partir do painel (UI) _(from slice phase-04-videos-channel)_ | deferred | phase-04-videos-channel | Same `PATCH /videos/:id` backend contract as video-info editing (TD-02); the panel-triggered UI form is deferred to the frontend slice. |
| Edição das informações do canal (UI) _(from slice phase-04-videos-channel)_ | deferred | phase-04-videos-channel | Backend CRUD + nickname-collision policy decided in that slice (TD-05); the channel-edit form UI is deferred to the frontend slice. |
| Página pública do canal (UI) _(from slice phase-04-videos-channel)_ | deferred | phase-04-videos-channel | Backend listing/pagination contract decided in that slice (TD-04); the public channel page UI is deferred to the frontend slice. |

_(`phase-03-videos`'s `## Non-UI / Deferred Capabilities` reads `_None._` and contributes no rows. The last four rows are the UI capabilities this slice now delivers.)_

## UI Inventory

**Source:** `docs/inventories/screen-inventory-phase-04-videos-channel-frontend.md`
**Screens in scope:** 6

### UI ↔ Capability Join

| Screen | Route | Verb | Capability | Covering Component |
|--------|-------|------|------------|-------------------|
| Painel de gerenciamento de vídeos | /studio/videos | Exibir lista paginada de vídeos do canal com thumbnail, título, visualizações, likes, comentários, tempo de publicação e status | "Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status)" | VideoListRow |
| Painel de gerenciamento de vídeos | /studio/videos | Abrir a edição de um vídeo a partir da linha do painel | "Edição de vídeos a partir do painel" | VideoListRow |
| Tela de edição de vídeo | /studio/videos/[id]/edit | Carregar as informações atuais do vídeo para edição | "Edição de vídeos a partir do painel" | VideoEditForm |
| Tela de edição de vídeo | /studio/videos/[id]/edit | Exibir categorias de vídeo disponíveis para escolha | "Categorias de vídeo disponíveis na plataforma" | Category select |
| Tela de edição de vídeo | /studio/videos/[id]/edit | Salvar título, descrição e categoria editados do vídeo | "Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada" | Save Changes Button |
| Tela de edição de vídeo | /studio/videos/[id]/edit | Enviar thumbnail customizada do vídeo | "Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada" | Save Changes Button |
| Tela de edição de vídeo | /studio/videos/[id]/edit | Definir visibilidade do vídeo como público ou unlisted | "Visibilidade do vídeo: público (aparece para todos) ou unlisted (somente via link)" | Save Changes Button |
| Tela de edição de vídeo | /studio/videos/[id]/edit | Exibir se o vídeo está apto para publicação | "Fluxo de rascunho → publicação" | Status |
| Tela de edição de vídeo | /studio/videos/[id]/edit | Publicar vídeo em rascunho (ação única, só quando processado e ainda não publicado) | "Fluxo de rascunho → publicação" | PublishButton |
| Tela de edição do canal | /studio/channel | Carregar nickname, nome e descrição atuais do canal para pré-preencher o formulário de edição | "Edição das informações do canal: nickname, nome e descrição" | ChannelSettingsForm |
| Tela de edição do canal | /studio/channel | Salvar alterações de nickname, nome e descrição do canal, rejeitando nickname já em uso | "Edição das informações do canal: nickname, nome e descrição" | ChannelSettingsForm |
| Página pública do canal | /channel/[nickname] | Exibir informações públicas do canal (nome, nickname e descrição) | "Página pública do canal com informações e listagem de vídeos" | ChannelHeader |
| Página pública do canal | /channel/[nickname] | Exibir lista paginada de vídeos públicos publicados do canal | "Página pública do canal com informações e listagem de vídeos" | VideoCard |

### Server-connected Components

- `VideoListRow` (Painel de gerenciamento de vídeos) — `Reuse?: new`
- `VideoEditForm` (Tela de edição de vídeo) — `Reuse?: new`
- `Category select` (Tela de edição de vídeo) — `Reuse?: new`
- `Status` (Tela de edição de vídeo) — `Reuse?: new`
- `PublishButton` (Tela de edição de vídeo) — `Reuse?: components/ui/button.tsx`
- `Save Changes Button` (Tela de edição de vídeo) — `Reuse?: components/ui/button.tsx`
- `ChannelSettingsForm` (Tela de edição do canal) — `Reuse?: new`
- `Button — Save Changes` (Tela de edição do canal) — `Reuse?: components/ui/button.tsx`
- `ChannelHeader` (Página pública do canal) — `Reuse?: new`
- `VideoCard` (Página pública do canal) — `Reuse?: new`

### Open Questions from Inventory

_(verbatim bullets from the inventory's `## Open questions` section; ingested by plan-validate as OQ-N)_

- **Paginação numerada sem design** (telas `/studio/videos` e `/channel/[nickname]`): TD-02 exige links `?page=N`, mas nenhum frame desenha o controle. Precisa de design ou de decisão do implementador (`components/ui/pagination.tsx (new)`, `nav` rotulado, `aria-current="page"`).
- **Publicar sem arte no Figma** (`/studio/videos/[id]/edit`): o `PublishButton` e o estado do "Checks complete" foram acrescentados por decisão D11 e precisam de arte; falta também como o botão fica oculto/desabilitado (vídeo em processamento ou já publicado) e as variantes do Status.
- **Copy incorreta na tela de edição de vídeo:** o H1 diz "Channel Settings" e a descrição de exemplo é de canal; usar um título de edição de vídeo. Na tela de canal, "Display name" mostra o handle como valor e o "@" do handle deve ser só adorno visual.
- **Status e estados visuais do painel:** só "Public" está desenhado; faltam unlisted, draft, processing, ready, error e o tratamento de `published_at` ausente. Faltam também estados vazio, loading, erro e placeholder de thumbnail; na página pública, canal vazio, nickname inexistente e cabeçalho anônimo (login).
- **Estados de formulário ausentes** (edição de vídeo e de canal): validação, erro "nickname já em uso" (`components/auth/field-error.tsx` pode servir), pending/sucesso/falha do Save, guarda de alterações não salvas, estados de envio/erro/limites da thumbnail (backend: `image/*`, ≤5MB).
- **Controles inertes/desabilitados por decisão (D6/D7):** busca global, voz, "+", lista de inscrições (estática), filtro/busca/ordenação do painel e chips da página pública. Ativá-los exige capability e suporte de backend (filtros, ordenação); hoje só existem `page`, `pageSize` e `total`.
- **Omitidos por decisão (D8/D9/D17):** kebab de ações da linha (menu não desenhado), Subscribe, sino, contadores de inscritos/vídeos, verified badge, abas Video/About, banner e avatar do canal, e o item "Sign Out" do menu de conta. Voltam com a fase de inscrições, com um modelo de dados de banner/avatar ou com a capability de Logout.
- **Logout adiado com o design já existente (D17):** o menu de conta desenha "Sign Out", mas Logout não está no `covers_capabilities` deste slice e o item é omitido. O contrato `POST /api/auth/logout` já existe (Fase 02); ativá-lo exige adicionar a capability "Logout" à Fase 04 no `project-plan.md` e ao `covers_capabilities`.
- **Menu de conta difere do Figma (D15/D16):** é um drawer de 320px (não um dropdown), sem estados hover/focus, mobile, dark mode nem fallback de avatar desenhados. A identidade mostra `@channelSlug` e o e-mail (a sessão não tem nome do canal nem foto); trazer o nome do canal exigiria guardar `channelName` na sessão (Revision do TD-02 de auth-frontend) ou buscá-lo no servidor.
- **Navegação da casca (Left Menu):** só a SideNav expandida é planejada (D14); a variante recolhida do componente `62:1580` e o comportamento do hambúrguer (rail de ícones vs drawer, estado inicial, persistência) ficam indefinidos. Falta o estado ativo de "Your videos" e a regra de match de rota (exata vs prefixo; `/studio/videos/[id]/edit` marca "Your videos"?); os ícones da SideNav só têm uma variante (Home preenchido, os outros contorno). "Create" e "Upload video" duplicam um destino não definido (a UI de upload não existe no frontend); "Liked videos", "Subscriptions" e "Home" apontam para rotas de fases posteriores.
- **Rota `/watch/[id]`** (decisão do usuário): os cards linkam para a página de visualização, que só existe na Fase 05 (404 até lá).
- **Dados possivelmente sem suporte no backend:** duração nas thumbnails ("10:30", "15:41" — os dois valores divergem), Filename e Video Quality do CardVideoConfig, e "Last updated" do canal. Confirmar se os campos existem.
- **Idioma e formatação:** o copy do Figma está em inglês e a documentação em português; definir o idioma da UI e o formato de números/datas relativas ("212K views", "2 hours ago").
- **Detalhes do design a confirmar:** ícone do botão "Filter" parece "share"; "Video Quality" e "1080p HD" colidem no CardVideoConfig; o badge de duração do ThumbUpload fica fora do tile; cards da página pública mostram outro nome de canal; só há frames desktop 1440px (sem mobile/tablet); o IconButton precisa de uma variante ghost (glifo solto) para o hambúrguer e o ícone de fechar; `get_design_context` truncado em 25k tokens nas telas 1 e 4.
- Componentes planejados-mas-não-existentes (`Reuse?` com sufixo ` (new)`), gatilho de `phase-b.md` § B2.6 (bootstrap SI synthesis): `components/layout/{app-shell,top-nav,side-nav,side-nav-item,side-nav-subscription-list,subscription-nav-item,account-menu,account-menu-trigger}.tsx`; `components/ui/{search-field,avatar,section-header,select,textarea,badge,video-thumbnail,filter-chip,overlay,menu-item}.tsx`; `components/studio/{video-list-row,video-stats,video-sort-control,video-config-card,thumb-upload,privacy-option,video-edit-form,channel-summary,channel-settings-form}.tsx`; `components/channel/{channel-header,video-sort-filter,video-card}.tsx`; e os ícones `components/icons/{menu,search,mic,plus,home,subscriptions,your-videos,liked-videos,filter,sort,views,thumbs-up,comment,close,edit}-icon.tsx`. Confirmar com `plan-build` quais serão materializados nesta fase. O `components/ui/pagination.tsx` não está nesta lista porque não existe no Figma.

## Non-UI / Deferred Capabilities

_None._

## Testing Requirements

### next-frontend

_(per `testing-guide-next-frontend`; Vitest 4 + `msw/node` are wired, **Playwright is not yet installed** — the first phase that needs a browser test triggers the install)_

| Artifact type | Required layers |
|---|---|
| Page — async RSC (`async function Page()` with `await`) | `*.e2e-spec.ts` only — Vitest cannot render async Server Components |
| Page — sync RSC composing client children | Test client children directly; cover the rendered page via `*.e2e-spec.ts` |
| Layout with logic (auth gate / conditional render) | E2E only; none if it adds no logic |
| Client component (`"use client"`) with state/handlers (edit forms, thumbnail upload, publish action) | `*.test.tsx` — RTL + `// @vitest-environment jsdom`, mock `next/navigation`, MSW for fetch |
| Feature component (server, composes primitives, no logic) | Skip unit; cover via the page's E2E |
| shadcn UI primitive (`components/ui/*`) / icon (`components/icons/*`) | None — test consumers |
| `lib/` utility / boundary module with branching (e.g., session guard helper, `contracts.ts` aliases that reshape the wire shape) | `*.test.ts` |
| Custom hook (`hooks/*`) | `*.test.ts(x)` with `renderHook`, jsdom docblock |
| Route handler (`app/api/**/route.ts`) — proxy or with branching | `*.integration.test.ts` with MSW (+ `*.test.ts` for extracted pure logic) |

Cross-cutting rules: every upstream endpoint added to `paths` needs a hand-written MSW handler in `mocks/handlers/<domain>.ts` (+ barrel), typed via `paths`; Vitest runs `onUnhandledRequest: "error"`; no real network calls to the upstream; never `vi.mock` global `fetch`; assert role/accessible name/`aria-*` instead of Tailwind classes; `next/image` and `next/link` stay real.

### nestjs-project

_(per `testing-guide-nestjs-project`; applies only to the backend changes required by cross-layer TD-04/TD-05 — run inside the container with `--runInBand`)_

| Artifact type | Required layers |
|---|---|
| Controller (e.g., new thumbnail endpoint) | E2E only — no unit tests |
| Service with branching + DB (ownership / publication checks) | Unit: branch logic (mock repo) + Integration: DB contract |
| Service with side-effect dep (storage presign) | Integration: real capture / local adapter |
| Config / module with configured imports (storage public endpoint) | Unit: compilation test; env schema accept/reject |
| DTO / response shape change (e.g., `updatedAt` in list/PATCH responses) | E2E: response shape + one validation wiring test per endpoint |
