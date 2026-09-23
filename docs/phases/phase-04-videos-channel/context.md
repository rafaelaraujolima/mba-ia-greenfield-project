---
kind: phase
name: phase-04-videos-channel
sources_mtime:
  docs/project-plan.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-phase-04-videos-channel.md: "2026-09-22T19:27:23-04:00"
  docs/decisions/technical-decisions-next-frontend-msw-foundation.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-03-videos/context.md: "2026-09-22T08:58:36-04:00"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-17T19:27:23-04:00"
---

# phase-04-videos-channel — Context

## Scope

**Phase:** Fase 04 — Gerenciamento de Vídeos e Canal (slice: `phase-04-videos-channel`, backend-first; frontend slice deferred to a future `/research` pass)

**Capabilities:**

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

**Affected subprojects:** `nestjs-project/` (all 5 TDs in this slice).

**Deferred subprojects:** `next-frontend/` — management panel, video edit forms, channel edit forms, and public channel page UI are deferred to a follow-up `/research` pass, mirroring Phase 02's backend-then-frontend sequencing.

**Sequencing:** Depende de: Fase 02, Fase 03.

## Neighbors

- **Phase 03 — Upload e Processamento de Vídeos** (depende de: Fase 01, Fase 02).
- **Phase 05 — Página de Visualização do Vídeo** (depende de: Fase 03, Fase 04).

## Decisions Index

| Ref | Scope | Topic | Status | Decision | Libraries |
|-----|-------|-------|--------|----------|-----------|
| phase-04-videos-channel/TD-01 | Backend | Modelo de dados para categorias de vídeo | decided | B | — |
| phase-04-videos-channel/TD-02 | Backend | Upload de thumbnail customizada (Transversal — também cobre "Edição de vídeos a partir do painel") | decided | A | @types/multer (dev) |
| phase-04-videos-channel/TD-03 | Backend | Modelo de visibilidade e fluxo de rascunho → publicação | decided | A | — |
| phase-04-videos-channel/TD-04 | Cross-layer | Paginação de listagens de vídeo do canal (Transversal — painel + página pública) | decided | A | — |
| phase-04-videos-channel/TD-05 | Backend | Política de troca de nickname do canal | decided | A | — |

## Capability Coverage

| Capability | Covering TD(s) |
|-----------|-----------------|
| Categorias de vídeo disponíveis na plataforma | TD-01 |
| Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada | TD-02 |
| Visibilidade do vídeo: público ou unlisted | TD-03 |
| Fluxo de rascunho → publicação | TD-03 |
| Painel de gerenciamento de vídeos do canal | TD-04 |
| Edição de vídeos a partir do painel | TD-02 |
| Edição das informações do canal: nickname, nome e descrição | TD-05 |
| Página pública do canal com informações e listagem de vídeos | TD-04 |

All 8 capability bullets are covered (0 uncovered).

## Decisions Detail

**phase-04-videos-channel/TD-01 — Modelo de dados para categorias de vídeo.** Decision: B (tabela dedicada `categories` + FK `videos.category_id`). Categoria não é um estado técnico interno (como `VideoStatus`), é uma taxonomia de conteúdo reutilizada em pelo menos mais duas fases já planejadas para filtro/sugestão; uma tabela evita migration a cada ajuste na lista de categorias e mantém aberta a porta para metadados de exibição sem redesenho de schema. **Libraries:** —

**phase-04-videos-channel/TD-02 — Upload de thumbnail customizada.** Decision: A (upload direto via API, `FileInterceptor` + `@nestjs/platform-express`). Thumbnails são pequenas o suficiente para não recriar o problema que o fluxo pré-assinado do vídeo existe para resolver; sobrescreve a mesma chave já usada pela thumbnail automática (`videos/{id}/thumbnail.jpg`, convenção da `phase-03-videos/TD-07`). **Libraries:** @types/multer (dev)

**phase-04-videos-channel/TD-03 — Modelo de visibilidade e fluxo de rascunho → publicação.** Decision: A (campos independentes `visibility` enum + `published_at` timestamp nullable). `phase-03-videos/TD-06` já deixou explícito que a publicação seria "um campo/estado separado"; `published_at` como timestamp também resolve o campo "tempo de publicação" do painel de gerenciamento. **Libraries:** —

**phase-04-videos-channel/TD-04 — Estratégia de paginação para listagens de vídeo do canal.** Decision: A (`?page=1&pageSize=20`, TypeORM `skip`/`take`). Volume de vídeos por canal é tipicamente pequeno; paginação numerada é o padrão mais natural para um painel de administração. **Libraries:** —

**phase-04-videos-channel/TD-05 — Política de troca de nickname do canal.** Decision: A (409 em colisão, sem sufixo automático, sem redirect de nickname antigo). O projeto não pede preservação de links históricos; rejeitar colisão com 409 é o comportamento correto para uma edição explícita. **Libraries:** —

## Inherited Decisions Detail

### From prior phases (lineage: Phase 01 → Phase 02 → Phase 03)

**phase-01-configuracao-base/TD-01 — Config module.** Option A (`@nestjs/config`) — official, guaranteed NestJS 11 compatibility; `registerAs()` factory is dual-purpose (DI token + plain function for `data-source.ts`). **Libraries:** `@nestjs/config@^4.x`

**phase-01-configuracao-base/TD-02 — Env validation.** Option A (Joi) — first-class `@nestjs/config` integration via `validationSchema`, native string-to-number coercion. **Libraries:** `joi@^17.x`

**phase-01-configuracao-base/TD-03 — Config file structure.** Option B (namespaced/grouped `registerAs`) — clear per-domain file boundaries, typed injection via `ConfigType<typeof xxxConfig>`. **Libraries:** —

**phase-01-configuracao-base/TD-04 — data-source.ts config sharing.** Option A (shared `registerAs` factory) — zero duplication between `AppModule` and `data-source.ts`. **Libraries:** `dotenv` (transitive)

**phase-02-auth/TD-01 — Password hashing.** Argon2id — OWASP-recommended for greenfield 2026; no legacy bcrypt constraint. **Libraries:** `argon2@^0.41.x`

**phase-02-auth/TD-02 — Auth strategy scaffolding.** Recommendation was `@nestjs/passport`; **implementation diverged** — custom guards were used instead to keep the dependency surface smaller (social login not on the near-term roadmap). **Libraries:** `@nestjs/jwt@^11.0.0`

**phase-02-auth/TD-03 — Refresh token strategy.** Option A (Refresh Token Rotation) — strongest security model, automatic theft detection; DB write overhead acceptable. **Libraries:** —

**phase-02-auth/TD-04 — Password-reset token storage.** Option B (random opaque tokens in DB) — revocability, trivial table, decoupled from JWT auth. **Libraries:** —

**phase-02-auth/TD-05 — Email delivery.** Option A (`@nestjs-modules/mailer`) — best NestJS integration, SMTP/Mailpit-compatible. **Libraries:** `@nestjs-modules/mailer@^2.x`, `handlebars@^4.x`

**phase-02-auth/TD-06 — Validation library.** Option A (`class-validator` + `class-transformer`) — documented NestJS approach, decorator-consistent with TypeORM entities. **Libraries:** `class-validator@^0.14.x`, `class-transformer@^0.5.x`

**phase-02-auth/TD-07 — Error response shape.** Option A (custom Domain Exception Filter) — machine-readable error codes for the Next.js frontend; `{ statusCode, error, message }` envelope. **Libraries:** —

**phase-02-auth/TD-08 — Rate limiting.** Option A (`@nestjs/throttler`) — native DI/guard integration, scoped to `AuthModule`. **Libraries:** `@nestjs/throttler@^6.x`

**phase-02-auth/TD-09 — Refresh token format.** Recommendation was Option B (opaque); **implementation diverged** — JWT was kept to reuse the access-token signing infrastructure. **Libraries:** `@nestjs/jwt@^11.0.0`

**phase-02-auth/TD-10 — Channel nickname generation (on signup).** Option A — strict `[a-z0-9_]` allowlist with `user_<random>` fallback on collision (`appendRandomSuffix`). Directly relevant precedent for this slice's TD-05 (nickname *edit* policy diverges deliberately from this creation-time auto-suffix behavior). **Libraries:** —

**phase-02-auth-frontend/TD-01 — Session strategy.** Custom cookie-based session (no Auth.js) — strict-BFF model makes the backend the sole auth authority. **Libraries:** —

**phase-02-auth-frontend/TD-02 — Session cookie encoding.** `iron-session` — httpOnly + encrypted, single cookie, room for minimal user metadata (`userId`, `email`, `channelSlug`). **Libraries:** `iron-session`

**phase-02-auth-frontend/TD-03 — Token refresh coordination.** Single-flight refresh helper, tested via MSW two-concurrent-calls assertion. **Libraries:** —

**phase-02-auth-frontend/TD-04 — Form handling.** `react-hook-form` + Zod resolvers — matches shadcn's canonical form primitive. **Libraries:** `react-hook-form`, `@hookform/resolvers`

**phase-02-auth-frontend/TD-05 — Mutation surface.** Route Handlers under `app/api/**` for every mutation — strict-BFF alignment, reuses existing MSW test scaffold. **Libraries:** —

**phase-02-auth-frontend/TD-06 — Auth state delivery to client.** RSC reads the session cookie and hydrates a Client Provider — no first-render flicker, no extra BFF round-trip. **Libraries:** —

**phase-02-auth-frontend/TD-07 — Email-confirmation/reset destination pages.** RSC-owns-the-token pattern shared between confirmation and reset flows. **Libraries:** —

**phase-03-videos/TD-01 — Queue.** `@nestjs/bullmq` + `bullmq` — official NestJS queue module, native retry/backoff/progress for long video-processing jobs. **Libraries:** `@nestjs/bullmq`, `bullmq`

**phase-03-videos/TD-02 — Video upload protocol.** Presigned multipart upload direct-to-storage — supports 10GB files without blocking the API process, resumable. **Libraries:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

**phase-03-videos/TD-03 — Worker process split.** Dedicated Video Worker process (separate entrypoint, shared `VideosModule` codebase) — matches the C4 diagram, isolates heavy processing from API latency. **Libraries:** —

**phase-03-videos/TD-04 — Video processing tooling.** `fluent-ffmpeg` — stable API for `ffprobe` metadata + thumbnail extraction (10% of video duration). **Libraries:** `fluent-ffmpeg`

**phase-03-videos/TD-05 — Video streaming/download.** Presigned read URLs, no API byte-proxying — video UUID is the stable public identifier. **Libraries:** — (reuses `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)

**phase-03-videos/TD-06 — Upload/processing status enum.** `VideoStatus` (`draft | processing | ready | error`) covers **exclusively** the technical upload/processing pipeline — publication (draft↔published editorial state) is explicitly a **separate** field/dimension left to Phase 04 (this is the direct precedent this slice's TD-03 builds on). **Libraries:** — (reuses `@nestjs/bullmq`)

**phase-03-videos/TD-07 — Storage bucket layout.** Single bucket, UUID-keyed paths — no collision risk, simplest provisioning. **Libraries:** — (reuses `@aws-sdk/client-s3`)

**upload-cleanup-policy/TD-01 — Abandoned upload cleanup.** Option B (single scheduled cron via `@nestjs/schedule`, `ListMultipartUploadsCommand` + `AbortMultipartUploadCommand`) — **revised 2026-09-21** from originally-decided Option A (MinIO lifecycle rule) after empirical confirmation that MinIO `RELEASE.2025-09-07T16-13-09Z` silently drops `AbortIncompleteMultipartUpload` lifecycle rules unless combined with `Expiration`. **Libraries:** `@nestjs/schedule`

### From correlated ad-hoc decisions (confirmed this session: high/medium relevance — `next-frontend-openapi-typing`, `openapi-docs-nestjs`, `next-frontend-msw-foundation`; `next-frontend-config-base` excluded as low-relevance)

**openapi-docs-nestjs/TD-01 — OpenAPI tooling.** `@nestjs/swagger` + CLI plugin (`classValidatorShim: true`) — preserves the existing `class-validator`/`class-transformer` stack (`phase-02-auth/TD-06`) without re-platforming to Nestia/typia. **Libraries:** `@nestjs/swagger`
**Revisions:** 2026-05-12 — clarified that the CLI plugin only infers DTO schemas; operation docs, per-status response types, and error-envelope contracts (`phase-02-auth/TD-07`) require explicit decorators (`@ApiOperation`, `@ApiResponse`, `@ApiBody`, etc.) as part of the same chosen option, not out-of-scope work.

**openapi-docs-nestjs/TD-02 — Spec artifact strategy.** Option C (Cross-layer) — runtime Swagger UI **and** exported static `openapi.json` — covers both interactive human use and offline FE codegen. **Libraries:** —

**openapi-docs-nestjs/TD-03 — Swagger UI production exposure.** Option B — enabled only in dev/staging via env flag; `openapi.json` artifact remains available in prod via the committed file. **Libraries:** —

**next-frontend-openapi-typing/TD-01 — Codegen tooling.** `openapi-typescript` + `openapi-fetch` — zero-runtime types (`paths` `.d.ts`), thin optional fetch wrapper; avoids an unused-on-client generated SDK under the strict-BFF model. **Libraries:** `openapi-typescript`, `openapi-fetch`

**next-frontend-openapi-typing/TD-02 — Spec sourcing under Docker bind-mount isolation.** Committed local copy at `next-frontend/openapi.json` + repo-root sync script — preserves compose-stack independence, drift caught by TD-03's CI check. **Libraries:** —

**next-frontend-openapi-typing/TD-03 — Codegen execution timing.** Committed output + CI freshness check (`git diff --exit-code` on `openapi.json` and `types.gen.ts`) — contract changes are both PR-visible and impossible to merge stale. **Libraries:** —

**next-frontend-openapi-typing/TD-04 — Type sharing BFF↔Components.** Single `lib/api/contracts.ts` barrel with explicit aliases off the `paths` type — one grep target, handles both pass-through and reshaped BFF responses. **Libraries:** —

**next-frontend-openapi-typing/TD-05 — MSW handler typing.** Hand-written handlers typed via `paths` (no auto-generated/faker-randomized mocks) — deterministic fixtures for assertion-based tests. **Libraries:** —

**next-frontend-msw-foundation/TD-01 — Handler module organization.** Per-domain modules under `mocks/handlers/<domain>.ts` + barrel `mocks/handlers/index.ts` — MSW's own recommended pattern, append-only growth per phase (Phase 04 would own `mocks/handlers/channels.ts`). **Libraries:** —

**next-frontend-msw-foundation/TD-02 — Node vs. browser mock contexts.** Test-only `setupServer` at foundation; browser Service Worker deferred until a real FE-offline-dev consumer exists. **Libraries:** —

**next-frontend-msw-foundation/TD-03 — Fixture factory pattern.** Hand-written deterministic defaults by default; opt-in seeded `faker-js` scoped to bulk-collection builders only (installed only when the first bulk builder is authored). **Libraries:** — (`@faker-js/faker` deferred)

**next-frontend-msw-foundation/TD-04 — Handler set consumption per phase.** Universal handler set loaded into `setupServer` + per-test `server.use(...)` overrides + `onUnhandledRequest: "error"` — canonical MSW v2 pattern; per-phase scoping is structural via TD-01's domain files, not runtime subsetting. **Libraries:** —

## Inherited Conventions

_(from phase 01, confirmed through phase 02 and phase 03 — near-duplicate restatements in each phase's own context.md consolidated here)_

- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`.
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`, passed to `ConfigModule.forRoot({ validationSchema, validationOptions: { allowUnknown: true, abortEarly: false } })`.
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`; the same factory is importable as a plain function for non-DI contexts (e.g., TypeORM CLI).
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports the config factory and calls it as a plain function.
- Database connection parameters are sourced from a single `databaseConfig` factory — never duplicated between `AppModule` and `data-source.ts`.
- `TypeOrmModule.forRootAsync` is used (not `forRoot`), with `imports: [ConfigModule]`, `inject: [databaseConfig.KEY]`, `useFactory` returning options including `autoLoadEntities: true`, `synchronize: false`.

## Inherited Deferred Capabilities

| Capability | Status | Origin phase | Rationale |
|-----------|--------|--------------|-----------|
| Telas de frontend | deferred | phase-01-configuracao-base | `next-frontend/` not initialized in that phase; UI surfaces start later. |
| Telas de cadastro, login, confirmação de conta e recuperação de senha | deferred | phase-02-auth | `next-frontend/` not initialized in that phase; UI surfaces start later. |
| "Confirmação de conta via e-mail com link de ativação" | deferred | phase-02-auth-frontend | UI landing screen de-scoped 2026-05-14; picked up by a future phase. BE side unchanged. |
| "Logout" | deferred | phase-02-auth-frontend | Logout button lives inside authenticated chrome (typically Phase 04). BE contract (`POST /api/auth/logout`) already ships. |
| "Recuperação de senha (destination screen)" | deferred | phase-02-auth-frontend | Reset-password destination screen absent from Figma; link is a known-gap 404 until a later phase delivers it. |
| "Telas de cadastro, login, confirmação de conta e recuperação de senha" (umbrella) | deferred | phase-02-auth-frontend | Umbrella bullet deferred pending the confirmação/reset-password screens above; the 3 shipped screens (signup, login, forgot-password) are individually covered. |

(`phase-03-videos`'s `## Non-UI / Deferred Capabilities` reads `_None._` — contributes no rows.)

## UI Inventory

_No screen inventory — UI↔API sync deferred. Run /screen-inventory 4 (or /screen-inventory phase-04-videos-channel) and then rerun /plan-context 4 to activate UI checks._

## Non-UI / Deferred Capabilities

| Capability | Type | Rationale | Covering TD(s) |
|-----------|------|-----------|-----------------|
| Painel de gerenciamento de vídeos do canal (UI) | deferred | Backend contract (listing/pagination) decided in this slice; panel UI itself belongs to the deferred frontend slice of Phase 04, mirroring Phase 02's backend-then-frontend sequencing. | TD-04 |
| Edição de vídeos a partir do painel (UI) | deferred | Same `PATCH /videos/:id` backend contract as video-info editing (TD-02); the panel-triggered UI form is deferred to the frontend slice. | TD-02 |
| Edição das informações do canal (UI) | deferred | Backend CRUD + nickname-collision policy decided in this slice (TD-05); the channel-edit form UI is deferred to the frontend slice. | TD-05 |
| Página pública do canal (UI) | deferred | Backend listing/pagination contract decided in this slice (TD-04); the public channel page UI is deferred to the frontend slice. | TD-04 |

## Testing Requirements

**`nestjs-project`** (per `testing-guide-nestjs-project`):

| Artifact created | Required tests |
|---|---|
| Entity (`*.entity.ts`) | Integration: constraints, defaults, `select: false` |
| Service with branching + DB | Unit: branch logic (mock repo) + Integration: DB contract |
| Service with DB only (no branching) | Integration: DB contract |
| Service with side-effect dep (storage upload) | Integration: real capture / local adapter |
| Module with configured imports | Unit: compilation test |
| Controller | E2E only — no unit tests |
| DTO | E2E: one validation wiring test per endpoint |

**`next-frontend`:** deferred — this slice's frontend work is deferred to a future `/research` pass; testing requirements will be gathered when that slice is planned.

---

_Source files: `docs/project-plan.md`, `docs/decisions/technical-decisions-phase-04-videos-channel.md`, `docs/decisions/technical-decisions-next-frontend-msw-foundation.md`, `docs/decisions/technical-decisions-next-frontend-openapi-typing.md`, `docs/decisions/technical-decisions-openapi-docs-nestjs.md`, `docs/phases/phase-01-configuracao-base/context.md`, `docs/phases/phase-02-auth/context.md`, `docs/phases/phase-02-auth-frontend/context.md`, `docs/phases/phase-03-videos/context.md`, `.claude/skills/testing-guide-nestjs-project/SKILL.md`._
