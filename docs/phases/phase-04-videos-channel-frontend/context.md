---
kind: phase
name: phase-04-videos-channel-frontend
sources_mtime:
  docs/project-plan.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-phase-04-videos-channel-frontend.md: "2026-09-24T19:42:10-04:00"
  docs/decisions/technical-decisions-phase-04-frontend-contract-gaps.md: "2026-09-27T21:50:31-04:00"
  docs/decisions/technical-decisions-next-frontend-msw-foundation.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-next-frontend-openapi-typing.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-next-frontend-config-base.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-03-videos/context.md: "2026-09-23T14:42:16-04:00"
  docs/phases/phase-04-videos-channel/context.md: "2026-09-23T14:42:22-04:00"
  docs/phases/phase-04-videos-channel/library-refs.md: "2026-09-23T14:42:22-04:00"
  docs/inventories/screen-inventory-phase-04-videos-channel-frontend.md: "2026-09-26T09:29:35-04:00"
  .claude/skills/testing-guide-next-frontend/SKILL.md: "2026-09-17T19:27:23-04:00"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-17T19:27:23-04:00"
---

# phase-04-videos-channel-frontend — Context

## Scope

**Phase name:** Fase 04 — Gerenciamento de Vídeos e Canal

**Capabilities** (literal, `docs/project-plan.md`):

- Categorias de vídeo disponíveis na plataforma
- Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada
- Visibilidade do vídeo: público (aparece para todos) ou unlisted (somente via link)
- Fluxo de rascunho → publicação
- Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status)
- Edição de vídeos a partir do painel
- Edição das informações do canal: nickname, nome e descrição
- Página pública do canal com informações e listagem de vídeos

**Out of scope:** _Not specified._

**Deliverables:** edição completa de vídeos, rascunho/publicação, painel de gerenciamento, edição de canal, página pública do canal.

**Affected subprojects:**

- (none explicitly named in this section of project-plan.md — resolved via this slice's own decisions doc: `next-frontend/`, plus `nestjs-project/` for the Cross-layer TDs)

**Deferred subprojects:** _None._

**Sequencing notes:** _None._ (Only dependency note present: "Depende de: Fase 02, Fase 03".) This document is the frontend slice; `depends_on_slices: [phase-04-videos-channel]` (backend slice, already built).

**Neighbors (for boundary detection only):**

- **Phase 03:** Fase 03 — Upload e Processamento de Vídeos (Depende de: Fase 01, Fase 02).
- **Phase 05:** Fase 05 — Página de Visualização do Vídeo (Depende de: Fase 03, Fase 04).

## Decisions Index

| Ref | Source | Scope | Topic | Status | Decision | Libraries | Renders in |
|-----|--------|-------|-------|--------|----------|-----------|------------|
| phase-04-videos-channel-frontend/TD-01 | phase | Frontend | Guarda de Rotas Autenticadas (área de gerenciamento) | decided | C | — | frontend-runtime |
| phase-04-videos-channel-frontend/TD-02 | phase | Frontend | Estratégia de Dados e Paginação das Listagens de Vídeo | decided | A | — | frontend-runtime |
| phase-04-videos-channel-frontend/TD-03 | phase | Frontend | Cache e Revalidação da Página Pública do Canal | decided | A | — | frontend-runtime |
| phase-04-videos-channel-frontend/TD-04 | phase | Cross-layer | Endpoint Público de Storage para URLs Pré-assinadas | decided | A | — | — |
| phase-04-videos-channel-frontend/TD-05 | phase | Cross-layer | Entrega de Thumbnails à UI (contrato e `next/image`) | decided | A | — | — |
| phase-04-frontend-contract-gaps/TD-01 | ad-hoc | Cross-layer | Como o frontend obtém o canal do usuário logado | decided | A | — | — |
| phase-04-frontend-contract-gaps/TD-02 | ad-hoc | Cross-layer | Como a edição de vídeo carrega os campos editáveis | decided | A | — | — |
| phase-04-frontend-contract-gaps/TD-03 | ad-hoc | Frontend | Renovação de token em Server Components | decided | A | — | frontend-runtime |

_Source files:_

- phase-04-videos-channel-frontend — `docs/decisions/technical-decisions-phase-04-videos-channel-frontend.md` (scope_type: phase)
- phase-04-frontend-contract-gaps — `docs/decisions/technical-decisions-phase-04-frontend-contract-gaps.md` (scope_type: ad-hoc)

## Capability Coverage

| Capability (from project-plan.md) | Covered by |
|-----------------------------------|------------|
| Categorias de vídeo disponíveis na plataforma | phase-04-videos-channel/TD-01 _(inherited, from slice phase-04-videos-channel)_ |
| Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada | phase-04-videos-channel/TD-02 _(inherited)_; phase-04-frontend-contract-gaps/TD-02 |
| Visibilidade do vídeo: público (aparece para todos) ou unlisted (somente via link) | phase-04-videos-channel/TD-03 _(inherited)_; phase-04-frontend-contract-gaps/TD-02 |
| Fluxo de rascunho → publicação | phase-04-videos-channel/TD-03 _(inherited)_; phase-04-frontend-contract-gaps/TD-02 |
| Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status) | phase-04-videos-channel/TD-04 _(inherited)_; phase-04-videos-channel-frontend/TD-01, TD-02, TD-04, TD-05; phase-04-frontend-contract-gaps/TD-01, TD-03 |
| Edição de vídeos a partir do painel | phase-04-videos-channel/TD-02 _(inherited)_; phase-04-videos-channel-frontend/TD-01, TD-03, TD-05; phase-04-frontend-contract-gaps/TD-02, TD-03 |
| Edição das informações do canal: nickname, nome e descrição | phase-04-videos-channel/TD-05 _(inherited)_; phase-04-videos-channel-frontend/TD-01, TD-03; phase-04-frontend-contract-gaps/TD-01, TD-03 |
| Página pública do canal com informações e listagem de vídeos | phase-04-videos-channel/TD-04 _(inherited)_; phase-04-videos-channel-frontend/TD-02, TD-03, TD-04, TD-05; phase-04-frontend-contract-gaps/TD-03 |

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

### phase-04-frontend-contract-gaps/TD-01

**Recommendation:** o endpoint também é necessário para pré-preencher a edição do canal, então é a única opção que resolve os dois usos sem alterar tokens (B) nem o contrato de login (C); o custo é uma chamada no login.
**Libraries:** —

### phase-04-frontend-contract-gaps/TD-02

**Recommendation:** o mínimo de superfície nova; os campos adicionados são metadados que a Fase 05 também vai precisar, e a regra de visibilidade existente continua valendo.
**Libraries:** —

### phase-04-frontend-contract-gaps/TD-03

**Recommendation:** mantém o proxy otimista (TD-01), aproveita o helper de refresh já decidido na Fase 02 e limita o custo ao caso raro de token expirado.
**Renders in:** frontend-runtime
**Libraries:** —

## Inherited Decisions Detail

### phase-01-configuracao-base/TD-01

**Recommendation:** Option A (@nestjs/config) — Official, core-team-maintained, guaranteed NestJS 11 compatibility. The `registerAs()` factory pattern solves the TypeORM CLI sharing problem: the factory function can be imported as a plain function by `data-source.ts` while also serving as a DI injection token inside NestJS. Building a custom module recreates solved functionality; third-party packages carry maintenance risk.
**Libraries:** @nestjs/config@^4.x

### phase-01-configuracao-base/TD-02

**Recommendation:** Option A (Joi) — First-class integration with `@nestjs/config` via `validationSchema`, requiring zero custom wiring. Handles string-to-number coercion natively. Using a different tool for env validation vs. request validation is reasonable — env config is validated once at startup, DTOs are validated per-request. Zod is elegant but adds a third validation paradigm to the project.
**Libraries:** joi@^17.x

### phase-01-configuracao-base/TD-03

**Recommendation:** Option B (Namespaced/grouped with registerAs) — The project roadmap explicitly calls for auth, email, and storage in upcoming phases. Namespaced configs provide clear file boundaries per domain, typed injection via `ConfigType<typeof databaseConfig>`, and natural scalability. The `registerAs()` factory is dual-purpose: DI token inside NestJS and plain importable function for `data-source.ts`. Initial files for Phase 01: `src/config/database.config.ts`, `src/config/app.config.ts`.
**Libraries:** —

### phase-01-configuracao-base/TD-04

**Recommendation:** Option A (Shared registerAs factory) — Natural outcome of choosing `@nestjs/config` with `registerAs`. The factory is already callable by design. `data-source.ts` imports it, calls `dotenv.config()`, then calls the factory. Zero duplication, minimal code, no extra abstraction.
**Libraries:** dotenv (transitive via @nestjs/config)

### phase-02-auth/TD-01

**Recommendation:** Argon2id — For a greenfield project in 2026, Argon2id is the OWASP-recommended choice. The native build dependency is a one-time Docker setup cost. The project has no legacy constraints favoring bcrypt. OWASP minimum: 19MiB memory, 2 iterations.
**Libraries:** argon2@^0.41.x

### phase-02-auth/TD-02

**Recommendation:** Option A (@nestjs/passport) — The project plan includes only email/password auth for now, but the plugin architecture costs little and future phases may add social login. Aligns with official NestJS docs, making onboarding and maintenance easier.
**Libraries:** @nestjs/jwt@^11.0.0

### phase-02-auth/TD-03

**Recommendation:** Option A (Refresh Token Rotation) — Provides the strongest security model with automatic theft detection. The DB write overhead is acceptable for a video platform (auth refresh is infrequent vs. video operations). PostgreSQL is already in the stack, so no new infrastructure needed. Race conditions can be mitigated with a short grace period for the old token.
**Libraries:** —

### phase-02-auth/TD-04

**Recommendation:** Option B (Random Opaque Tokens in DB) — Revocability is important: when a user requests a new password reset, previous tokens should be invalidated. The DB table is trivial to implement, and the tokens table can also serve future needs (e.g., API keys). Keeps email tokens decoupled from the JWT auth system.
**Libraries:** —

### phase-02-auth/TD-05

**Recommendation:** Option A (@nestjs-modules/mailer) — Best NestJS integration with minimal boilerplate. Supports SMTP (matching the architecture diagram), works with MailHog/Mailpit for local development without external dependencies, and scales to any SMTP provider in production. Template engine support (Handlebars) simplifies email formatting. No vendor lock-in.
**Libraries:** @nestjs-modules/mailer@^2.x, handlebars@^4.x

### phase-02-auth/TD-06

**Recommendation:** Option A (class-validator + class-transformer) — This is a backend-only project (no shared schemas with frontend), so Zod's single-source-of-truth advantage is less impactful. class-validator is the documented NestJS approach, and the project already uses decorators extensively (TypeORM entities, NestJS DI). Fewer integration surprises with NestJS 11.
**Libraries:** class-validator@^0.14.x, class-transformer@^0.5.x

### phase-02-auth/TD-07

**Recommendation:** Option A (Custom Domain Exception Filter) — Provides machine-readable error codes that the Next.js frontend can switch on, without the overhead of RFC 9457's URI-based type system. The project is single-consumer (first-party frontend), so a simple `{ statusCode, error, message }` format with domain codes balances clarity and simplicity. The custom filter cost is low — two small files.
**Libraries:** —

### phase-02-auth/TD-08

**Recommendation:** Option A (@nestjs/throttler) — Native NestJS integration is decisive: the guard system allows scoping rate limiting to `AuthModule` only via module-level `APP_GUARD`, with `@SkipThrottle()` for exemptions. The project is single-instance with no distributed requirements, so in-memory storage is sufficient. Using express-rate-limit would bypass NestJS's DI and guard lifecycle for no clear benefit.
**Libraries:** @nestjs/throttler@^6.x

### phase-02-auth/TD-09

**Recommendation:** Option B (Opaque) — Since DB lookup is mandatory (TD-03), JWT signature adds no security value. Opaque tokens are shorter, leak no data, and are simpler to generate.
**Libraries:** @nestjs/jwt@^11.0.0

### phase-02-auth/TD-10

**Recommendation:** Option A — The platform is a video sharing service with URL-based channel handles. A strict `[a-z0-9_]` allowlist is the simplest and most portable choice: no extra dependencies, no edge cases around hyphen positioning, and the `user_<random>` fallback provides a valid handle even for extreme email prefixes. Hyphens can always be added in a future iteration if user feedback justifies it.
**Libraries:** —

### phase-02-auth-frontend/TD-01

**Recommendation:** Three reasons. (1) **Architectural fit.** The strict-BFF model in `next-frontend-config-base/TD-03` already nominates the Route Handler as the only NestJS caller; cookie-based sessions are the natural match, and Auth.js's framework adds layers between the BFF and the cookie that buy nothing because the backend is the auth authority. (2) **Smaller blast radius.** A ~50-LOC session helper is grep-friendly, debuggable, and test-friendly via the existing MSW+BFF integration test pattern. (3) **Compatibility with Next.js 16 / React 19.** Built-in `next/headers` `cookies()` is the canonical primitive both runtimes already use.
**Libraries:** —

### phase-02-auth-frontend/TD-02

**Recommendation:** Three reasons. (1) **Defense in depth on the cookie content** — `httpOnly` blocks JS, encryption blocks accidental log/proxy inspection. (2) **Single cookie to manage** simplifies logout and avoids the orphan-cookie failure mode of Option A. (3) **Room to carry minimal user metadata** (`userId`, `email`, `channelSlug`) lets `app/layout.tsx` RSC render the authenticated chrome without a per-render `/auth/me` round-trip — Phase 04+ gains compound here.
**Libraries:** iron-session

### phase-02-auth-frontend/TD-03

**Recommendation:** The single-flight detail is non-trivial and goes in the helper from day one — tested by MSW with a "two concurrent intercepted upstream calls; one refresh expected" assertion. Option B's client-driven pattern is rejected because it doesn't replace Option A. Option C's pre-emptive timer is rejected because the failure modes (multiple tabs, sleep/wake) outweigh the latency saving.
**Libraries:** —

### phase-02-auth-frontend/TD-04

**Recommendation:** Three reasons. (1) **Decoupled from TD-05** — works with Route Handlers OR Server Actions. (2) **Aligned with shadcn's canonical form primitive** — `npx shadcn@latest add form` produces react-hook-form wrappers. (3) **Zod-first developer ergonomics match the rest of the FE foundation.**
**Libraries:** react-hook-form, @hookform/resolvers

### phase-02-auth-frontend/TD-05

**Recommendation:** Three reasons. (1) **Strict-BFF alignment** — every mutation stays visible under `app/api/**`. (2) **Test scaffold already exists** for Route-Handlers-as-functions. (3) **Single mutation surface** — Phase 02 sets the precedent for Phases 03–07.
**Libraries:** —

### phase-02-auth-frontend/TD-06

**Recommendation:** Two reinforcing reasons. (1) **No first-render flicker, no round-trip** — the session is delivered in the same response as the page HTML. (2) **No new BFF endpoint** — the cookie is the source of truth, RSC reads it, the Provider broadcasts it. The `router.refresh()` requirement after mid-session mutations is a small price for the structural benefits.
**Libraries:** —

### phase-02-auth-frontend/TD-07

**Recommendation:** Three reasons. (1) **First-paint-correct.** (2) **Single integration pattern across both flows** — confirmation is RSC-only; reset is RSC + Client form. (3) **Email-prefetch behavior** is solved at the backend's idempotent-confirmation level.
**Libraries:** —

### phase-03-videos/TD-01

**Recommendation:** é o módulo oficial do NestJS para filas, entrega retry/backoff/progresso/concorrência nativamente (necessário para jobs de vídeo longos e falha-propensos), e é o par mais idiomático para um worker de vídeo em NestJS.
**Libraries:** @nestjs/bullmq, bullmq

### phase-03-videos/TD-02

**Recommendation:** é a única opção que atende simultaneamente aos três requisitos explícitos: suportar 10GB, não travar a API e permitir retomada em falha de conexão. Confirmado como compatível com a API S3 usada pelo MinIO via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.
**Libraries:** @aws-sdk/client-s3, @aws-sdk/s3-request-presigner

### phase-03-videos/TD-03

**Recommendation:** é a arquitetura já prevista no diagrama C4 do projeto (container "Video Worker" separado da API), e evita que processamento pesado de vídeo degrade a latência da API.
**Libraries:** —

### phase-03-videos/TD-04

**Recommendation:** cobre com uma API estável exatamente as duas operações que esta fase precisa (`ffprobe` para metadados, `screenshots()` para thumbnail), evitando reescrever parsing de processo por nenhum benefício real.
**Libraries:** fluent-ffmpeg

### phase-03-videos/TD-05

**Recommendation:** evita reimplementar `Range`/206 (o storage já faz isso corretamente) e mantém o princípio já decidido na TD-02: a API nunca deve proxear bytes de arquivos grandes. O UUID do vídeo é o identificador público estável; a URL pré-assinada é um ponteiro de curta duração e sem colisão para o objeto.
**Libraries:** — (reaproveita @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner já introduzidos na TD-02)

### phase-03-videos/TD-06

**Recommendation:** como a TD-01 já escolhe uma fila com `attempts`/`backoff` nativos, não hesitar em falhas transitórias antes de expor `error` ao usuário é ganho "de graça". O enum cobre exclusivamente o pipeline técnico de upload/processamento; a dimensão de publicação de conteúdo da Fase 04 é um campo separado.
**Libraries:** — (reaproveita @nestjs/bullmq já introduzido na TD-01)

### phase-03-videos/TD-07

**Recommendation:** o UUID já elimina colisões sem precisar de um segundo bucket, e um único bucket é mais simples de provisionar e é consistente com o único container de Object Storage do diagrama de arquitetura.
**Libraries:** — (reaproveita @aws-sdk/client-s3 já introduzido na TD-02)

### upload-cleanup-policy/TD-01

**Recommendation:** divide a responsabilidade pela fronteira natural entre os dois recursos: o storage cuida do que é dele (partes multipart) através de um mecanismo nativo e garantido mesmo com a aplicação fora do ar, enquanto a aplicação cuida apenas do que é exclusivamente seu (o registro `draft` no Postgres, que o storage não enxerga).
**Libraries:** @nestjs/schedule
**Revisions:**
- 2026-09-21 — Decisão alterada de Option A para Option B durante SI-03.1 do `/implement`. Rationale: confirmado empiricamente que o MinIO (release `RELEASE.2025-09-07T16-13-09Z`) descarta silenciosamente o campo `AbortIncompleteMultipartUpload` de uma lifecycle rule. O cron único (Option B) cobre o mesmo risco via `ListMultipartUploadsCommand` + `AbortMultipartUploadCommand`, no mesmo `UploadCleanupService` que já limpa os `draft` órfãos.

### phase-04-videos-channel/TD-01 _(from slice phase-04-videos-channel)_

**Recommendation:** Decision: B (tabela dedicada `categories` + FK `videos.category_id`). Categoria não é um estado técnico interno, é uma taxonomia de conteúdo reutilizada em pelo menos mais duas fases já planejadas para filtro/sugestão; uma tabela evita migration a cada ajuste na lista de categorias.
**Libraries:** —

### phase-04-videos-channel/TD-02 _(from slice phase-04-videos-channel)_

**Recommendation:** Decision: A (upload direto via API, `FileInterceptor` + `@nestjs/platform-express`). Thumbnails são pequenas o suficiente para não recriar o problema que o fluxo pré-assinado do vídeo existe para resolver; sobrescreve a mesma chave já usada pela thumbnail automática (`videos/{id}/thumbnail.jpg`).
**Libraries:** @types/multer (dev) — cache Context7 em `docs/phases/phase-04-videos-channel/library-refs.md`

### phase-04-videos-channel/TD-03 _(from slice phase-04-videos-channel)_

**Recommendation:** Decision: A (campos independentes `visibility` enum + `published_at` timestamp nullable). `phase-03-videos/TD-06` já deixou explícito que a publicação seria "um campo/estado separado"; `published_at` também resolve o campo "tempo de publicação" do painel de gerenciamento.
**Libraries:** —

### phase-04-videos-channel/TD-04 _(from slice phase-04-videos-channel)_

**Recommendation:** Decision: A (`?page=1&pageSize=20`, TypeORM `skip`/`take`). Volume de vídeos por canal é tipicamente pequeno; paginação numerada é o padrão mais natural para um painel de administração.
**Libraries:** —

### phase-04-videos-channel/TD-05 _(from slice phase-04-videos-channel)_

**Recommendation:** Decision: A (409 em colisão, sem sufixo automático, sem redirect de nickname antigo). O projeto não pede preservação de links históricos; rejeitar colisão com 409 é o comportamento correto para uma edição explícita.
**Libraries:** —

### next-frontend-msw-foundation/TD-01

**Recommendation:** Option B (per-domain modules + barrel). Three reasons. (1) MSW's own best-practice recommends it. (2) Domain ownership tracks the codebase, not the project plan — handler files mirror `components/`/`app/api/` vocabulary and remain stable as phases come and go. (3) Append-only growth with minimal merge conflicts — each phase touches a new file plus one line in the barrel.
**Libraries:** —

### next-frontend-msw-foundation/TD-02

**Recommendation:** Option A (test-only, `setupServer` only at the foundation). The browser worker is a future capability with no documented current consumer; wiring it now is speculative investment, and wiring it incoherently would actively mislead developers under strict BFF.
**Libraries:** —

### next-frontend-msw-foundation/TD-03

**Recommendation:** Option D (hand-written deterministic defaults as the default + opt-in seeded faker scoped to bulk-collection builders only; `@faker-js/faker` installed only when the first bulk builder is authored — not at foundation).
**Libraries:** —

### next-frontend-msw-foundation/TD-04

**Recommendation:** Option A (universal handler set loaded into `setupServer` + per-test `server.use(...)` overrides + `onUnhandledRequest: "error"`).
**Libraries:** —

### next-frontend-openapi-typing/TD-01

**Recommendation:** Option A (`openapi-typescript` + `openapi-fetch`). Three reinforcing reasons. (1) Strict BFF makes the SDK surface valueless on the client — only Route Handlers call upstream. (2) Types-first matches the rest of the FE foundation. (3) MSW typing is solved by the same `paths` symbol — hand-written handlers type resolver returns off `paths[...]`.
**Libraries:** openapi-typescript, openapi-fetch

### next-frontend-openapi-typing/TD-02

**Recommendation:** Option B (committed local copy at `next-frontend/openapi.json` + repo-root sync script). Preserves the compose-stack independence; drift is eliminated structurally when paired with TD-03's CI freshness check; the committed local file is a real artifact in PR review.
**Libraries:** —

### next-frontend-openapi-typing/TD-03

**Recommendation:** Option C (committed + CI freshness check covering `openapi.json` and `types.gen.ts`). It is the only option that makes contract drift both visible (in PR diffs) and impossible to merge accidentally (CI fail).
**Libraries:** —

### next-frontend-openapi-typing/TD-04

**Recommendation:** Option A (single `lib/api/contracts.ts` with explicit aliases) — the only file authorized to import `paths` from `types.gen.ts`; feature code consumes named aliases.
**Libraries:** —

### next-frontend-openapi-typing/TD-05

**Recommendation:** Option A (hand-written handlers, typed via `paths`). Reasons: (1) determinism over auto-generation — BFF integration tests assert on specific values. (2) coherence with TD-01 — `paths` is the single contract anchor. (3) scale fit — the manual cost is negligible at this stage.
**Libraries:** —

### next-frontend-config-base/TD-01

**Recommendation:** Option A (Zod 4). Three converging reasons: (1) type-inference matches the FE's strict-TS culture. (2) ecosystem gravity in Next.js / React 19 — Zod is the de-facto schema language for App Router. (3) direct enablement of TD-02 Option A (`@t3-oss/env-nextjs`).
**Libraries:** zod

### next-frontend-config-base/TD-02

**Recommendation:** Option A (`@t3-oss/env-nextjs`). The only option that combines type-level `NEXT_PUBLIC_` prefix enforcement, runtime Proxy-based leak detection, and single-file consumer ergonomics.
**Libraries:** @t3-oss/env-nextjs

### next-frontend-config-base/TD-03

**Recommendation:** Option A (Strict BFF — single server-only `API_URL`). Aligned with the BFF testing strategy already documented in `next-frontend/CLAUDE.md`; eliminates CORS, eliminates public exposure of the backend URL, produces the smallest correct foundation.
**Libraries:** —

### openapi-docs-nestjs/TD-01

**Recommendation:** Option A (`@nestjs/swagger` + CLI plugin) — é a única opção que preserva as decisões anteriores (`class-validator` em `phase-02-auth/TD-06`) sem re-platform; o CLI plugin com `classValidatorShim: true` aproveita os decoradores existentes para inferir schemas.
**Libraries:** @nestjs/swagger

### openapi-docs-nestjs/TD-02

**Recommendation:** Option C (Runtime UI + openapi.json exportado) — o custo marginal sobre Option A é apenas um npm script e o benefício é uma fundação correta para futura integração FE (codegen offline) sem perder a UI interativa que dev/QA usam.
**Libraries:** —

### openapi-docs-nestjs/TD-03

**Recommendation:** Option B (Apenas em dev/staging via env flag) — alinha com a postura defensiva já estabelecida na Fase 02 e não compromete consumidores legítimos (o `openapi.json` commitado em TD-02 cumpre o papel de "spec consultável fora da UI").
**Libraries:** —

## Inherited Conventions

- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`. _(from phase 02)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`, passed to `ConfigModule.forRoot({ validationSchema, ... })`. _(from phase 02)_
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`; the same factory is importable as a plain function. _(from phase 02)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports the config factory and calls it as a plain function. _(from phase 02)_
- Database connection parameters are sourced from a single `databaseConfig` factory — never duplicated between `AppModule` and `data-source.ts`. _(from phase 02)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`), with `imports: [ConfigModule]`, `inject: [databaseConfig.KEY]`, `useFactory` returning the connection options. _(from phase 02)_
- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`. _(from phase 03)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`. _(from phase 03)_
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`. _(from phase 03)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports the config factory and calls it as a plain function. _(from phase 03)_
- Database connection parameters are sourced from a single `databaseConfig` factory — never duplicated. _(from phase 03)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`). _(from phase 03)_
- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`. _(from slice phase-04-videos-channel)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`. _(from slice phase-04-videos-channel)_
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`. _(from slice phase-04-videos-channel)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports the config factory and calls it as a plain function. _(from slice phase-04-videos-channel)_
- Database connection parameters are sourced from a single `databaseConfig` factory — never duplicated. _(from slice phase-04-videos-channel)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`). _(from slice phase-04-videos-channel)_

## Inherited Deferred Capabilities

| Capability | Status | Origin phase | Rationale |
|-----------|--------|--------------|-----------|
| "Telas de frontend" | deferred | phase-01-configuracao-base | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Telas de cadastro, login, confirmação de conta e recuperação de senha" | deferred | phase-02-auth | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Confirmação de conta via e-mail com link de ativação" | deferred | phase-02-auth-frontend | UI landing screen de-scoped 2026-05-14; FE confirmation flow (TD-07) picked up by a future phase. BE side unchanged in `phase-02-auth`. |
| "Logout" | deferred | phase-02-auth-frontend | Logout button lives inside authenticated chrome (typically Phase 04). Phase 02 still implements `POST /api/auth/logout` (BFF route handler + `session.destroy()`) so the contract is ready when the chrome lands. |
| "Recuperação de senha (destination screen / set-new-password)" | deferred | phase-02-auth-frontend | `/forgot-password` ships this phase sending the e-mail; the reset-password destination screen is absent from Figma → link destination remains a 404 until a later phase delivers the screen via `/screen-inventory` extension run. |
| "Telas de cadastro, login, confirmação de conta e recuperação de senha" | deferred | phase-02-auth-frontend | The umbrella bullet's full coverage requires the confirmação and reset-password destination screens; both are deferred per the rows above. The 3 ship-this-phase telas (signup, login, forgot-password) are inventoried and covered by their own verbs. |
| "Painel de gerenciamento de vídeos do canal (UI)" | deferred | phase-04-videos-channel _(from slice phase-04-videos-channel)_ | Backend contract (listing/pagination) decided in that slice; panel UI itself belongs to this frontend slice, mirroring Phase 02's backend-then-frontend sequencing. Covering TD: TD-04. **Addressed in this slice** via TD-01/TD-02 + the UI Inventory below. |
| "Edição de vídeos a partir do painel (UI)" | deferred | phase-04-videos-channel _(from slice phase-04-videos-channel)_ | Same `PATCH /videos/:id` backend contract as video-info editing; the panel-triggered UI form is deferred to this frontend slice. Covering TD: TD-02. **Addressed in this slice.** |
| "Edição das informações do canal (UI)" | deferred | phase-04-videos-channel _(from slice phase-04-videos-channel)_ | Backend CRUD + nickname-collision policy decided in that slice; the channel-edit form UI is deferred to this frontend slice. Covering TD: TD-05. **Addressed in this slice.** |
| "Página pública do canal (UI)" | deferred | phase-04-videos-channel _(from slice phase-04-videos-channel)_ | Backend listing/pagination contract decided in that slice; the public channel page UI is deferred to this frontend slice. Covering TD: TD-04. **Addressed in this slice.** |

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
- `Save Changes Button` (Tela de edição do canal) — `Reuse?: components/ui/button.tsx`
- `ChannelHeader` (Página pública do canal) — `Reuse?: new`
- `VideoCard` (Página pública do canal) — `Reuse?: new`

### Open Questions from Inventory

- **Paginação numerada sem design** (telas `/studio/videos` e `/channel/[nickname]`): TD-02 exige links `?page=N`, mas nenhum frame desenha o controle. Precisa de design ou de decisão do implementador (`components/ui/pagination.tsx (new)`, `nav` rotulado, `aria-current="page"`).
- **Publicar sem arte no Figma** (`/studio/videos/[id]/edit`): o `PublishButton` e o estado do "Checks complete" foram acrescentados por decisão D11 e precisam de arte; falta também como o botão fica oculto/desabilitado (vídeo em processamento ou já publicado) e as variantes do Status.
- **Copy incorreta na tela de edição de vídeo:** o H1 diz "Channel Settings" e a descrição de exemplo é de canal; usar um título de edição de vídeo. Na tela de canal, "Display name" mostra o handle como valor e o "@" do handle deve ser só adorno visual.
- **Status e estados visuais do painel:** só "Public" está desenhado; faltam unlisted, draft, processing, ready, error e o tratamento de `published_at` ausente. Faltam também estados vazio, loading, erro e placeholder de thumbnail; na página pública, canal vazio, nickname inexistente e cabeçalho anônimo (login).
- **Estados de formulário ausentes** (edição de vídeo e de canal): validação, erro "nickname já em uso" (`components/auth/field-error.tsx` pode servir), pending/sucesso/falha do Save, guarda de alterações não salvas, estados de envio/erro/limites da thumbnail (backend: `image/*`, ≤5MB).
- **Controles inertes/desabilitados por decisão (D6/D7):** busca global, voz, "+", lista de inscrições (estática), filtro/busca/ordenação do painel e chips da página pública. Ativá-los exige capability e suporte de backend (filtros, ordenação); hoje só existem `page`, `pageSize` e `total`.
- **Omitidos por decisão (D8/D9/D17):** kebab de ações da linha (menu não desenhado), Subscribe, sino, contadores de inscritos/vídeos, verified badge, abas Video/About, banner e avatar do canal, e o item "Sign Out" do menu de conta. Voltam com a fase de inscrições, com um modelo de dados de banner/avatar ou com a capability de Logout.
- **Logout adiado com o design já existente (D17):** o menu de conta desenha "Sign Out", mas Logout não está no `covers_capabilities` deste slice e o item é omitido. O contrato `POST /api/auth/logout` já existe (Fase 02); ativá-lo exige adicionar a capability "Logout" à Fase 04 no `project-plan.md` e ao `covers_capabilities`.
- **Menu de conta difere do Figma (D15/D16):** é um drawer de 320px (não um dropdown), sem estados hover/focus, mobile, dark mode nem fallback de avatar desenhados. A identidade mostra `@channelSlug` e o e-mail (a sessão não tem nome do canal nem foto); trazer o nome do canal exigiria guardar `channelName` na sessão (Revision do TD-02 de auth-frontend) ou buscá-lo no servidor.
- **Navegação da casca (Left Menu):** só a SideNav expandida é planejada (D14); a variante recolhida do componente `62:1580` e o comportamento do hambúrguer (rail de ícones vs drawer, estado inicial, persistência) ficam indefinidos. Falta o estado ativo de "Your videos" e a regra de match de rota (exata vs prefixo; `/studio/videos/[id]/edit` marca "Your videos"?); os ícones da SideNav só têm uma variante (Home preenchido, os outros contorno). "Create" e "Upload video" duplicam um destino não definido; "Liked videos", "Subscriptions" e "Home" apontam para rotas de fases posteriores.
- **Rota `/watch/[id]`** (decisão do usuário): os cards linkam para a página de visualização, que só existe na Fase 05 (404 até lá).
- **Dados possivelmente sem suporte no backend:** duração nas thumbnails ("10:30", "15:41" — os dois valores divergem), Filename e Video Quality do CardVideoConfig, e "Last updated" do canal. Confirmar se os campos existem.
- **Idioma e formatação:** o copy do Figma está em inglês e a documentação em português; definir o idioma da UI e o formato de números/datas relativas ("212K views", "2 hours ago").
- **Detalhes do design a confirmar:** ícone do botão "Filter" parece "share"; "Video Quality" e "1080p HD" colidem no CardVideoConfig; o badge de duração do ThumbUpload fica fora do tile; cards da página pública mostram outro nome de canal; só há frames desktop 1440px (sem mobile/tablet); o IconButton precisa de uma variante ghost (glifo solto) para o hambúrguer e o ícone de fechar; `get_design_context` truncado em 25k tokens nas telas 1 e 4.
- Componentes planejados-mas-não-existentes (`Reuse?` com sufixo ` (new)`), gatilho de `phase-b.md` § B2.6 (bootstrap SI synthesis): `components/layout/{app-shell,top-nav,side-nav,side-nav-item,side-nav-subscription-list,subscription-nav-item,account-menu,account-menu-trigger}.tsx`; `components/ui/{search-field,avatar,section-header,select,textarea,badge,video-thumbnail,filter-chip,overlay,menu-item}.tsx`; `components/studio/{video-list-row,video-stats,video-sort-control,video-config-card,thumb-upload,privacy-option,video-edit-form,channel-summary,channel-settings-form}.tsx`; `components/channel/{channel-header,video-sort-filter,video-card}.tsx`; e os ícones `components/icons/{menu,search,mic,plus,home,subscriptions,your-videos,liked-videos,filter,sort,views,thumbs-up,comment,close,edit}-icon.tsx`. Confirmar com `plan-build` quais serão materializados nesta fase. `components/ui/pagination.tsx` não está nesta lista porque não existe no Figma.

## Non-UI / Deferred Capabilities

_None._

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
| Server action / middleware / error-loading-not-found / metadata | See `artifacts/future-types.md` — depends on type |

### nestjs-project

| Artifact created | Required tests |
|---|---|
| Entity (`*.entity.ts`) | Integration: constraints, defaults, `select: false` |
| Service with branching + DB | Unit: branch logic (mock repo) + Integration: DB contract |
| Service with DB only (no branching) | Integration: DB contract |
| Service with configured lib (JWT, cache) | Unit: real lib with test config |
| Service with side-effect dep (email, storage) | Integration: real capture service (Mailpit) or local adapter |
| Module with configured imports | Unit: compilation test |
| Controller | E2E only — do NOT write unit tests |
| DTO | E2E: one validation wiring test per endpoint |
| Guard (delegates to service for business logic) | E2E + Unit if complex internal logic |
| Guard (simple, delegates to Passport) | E2E only |
| Strategy (Passport) | E2E via guard |
| Pipe (custom transformation/validation) | Unit |
| Interceptor (response transform, logging) | Unit and/or E2E |
| Exception Filter | Unit + E2E |
| Middleware | E2E |
