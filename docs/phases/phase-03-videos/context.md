---
kind: phase
name: phase-03-videos
sources_mtime:
  docs/project-plan.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-phase-03-videos.md: "2026-09-20T15:32:08-04:00"
  docs/decisions/technical-decisions-upload-cleanup-policy.md: "2026-09-21T06:19:35-04:00"
  docs/decisions/technical-decisions-openapi-docs-nestjs.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-01-configuracao-base/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth/context.md: "2026-09-17T19:27:23-04:00"
  docs/phases/phase-02-auth-frontend/context.md: "2026-09-17T19:27:23-04:00"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-17T19:27:23-04:00"
---

# phase-03-videos — Context

## Scope

**Phase name:** Fase 03 — Upload e Processamento de Vídeos

**Capabilities** (literal, `docs/project-plan.md`):

- Serviço de armazenamento de arquivos (vídeos e thumbnails)
- Serviço de processamento em segundo plano (filas)
- Upload de vídeos com suporte a arquivos de até 10GB sem impacto na performance
- Pré-cadastro automático do vídeo como rascunho ao iniciar o upload
- Processamento automático do vídeo após upload (extração de duração e metadados)
- Geração automática de thumbnail a partir de um frame do vídeo
- URL única por vídeo, sem conflito com outros vídeos
- Reprodução via streaming (sem necessidade de download completo)
- Download do vídeo pelo usuário

**Out of scope:** _Not specified in project-plan.md._ (No explicit "fora do escopo" bullet exists for this phase in the source document.) By construction of the challenge brief (docs/task.md), the video UI (frontend) is explicitly out of scope for this phase — this phase is backend-only.

**Deliverables:** upload de até 10GB funcional, processamento automático do vídeo, streaming funcionando, URLs únicas geradas.

**Affected subprojects:** `nestjs-project/` (not explicitly named in project-plan.md, but implied by the phase's content — upload API, background processing, storage — and confirmed by the challenge brief).

**Deferred subprojects:** `next-frontend/` — no video UI work in this phase.

**Sequencing notes:** "Depende de: Fase 01, Fase 02" — Phase 03 depends on Phase 01 (base project setup) and Phase 02 (signup/login/account management).

**Neighbors (for boundary detection only):**

- **Phase 02:** Fase 02 — Cadastro, Login e Gerenciamento de Conta: fluxo completo de criação de conta, confirmação por e-mail, login, logout e recuperação de senha. (Depende de: Fase 01)
- **Phase 04:** Fase 04 — Gerenciamento de Vídeos e Canal: edição das informações do vídeo, fluxo de rascunho e publicação, painel de administração do canal e página pública. (Depende de: Fase 02, Fase 03)

## Decisions Index

| Ref | Source | Scope | Topic | Status | Decision | Libraries |
|-----|--------|-------|-------|--------|----------|-----------|
| phase-03-videos/TD-01 | phase | Backend | Tecnologia de fila de processamento em segundo plano | decided | A | @nestjs/bullmq, bullmq |
| phase-03-videos/TD-02 | phase | Backend | Estratégia de upload de vídeos de até 10GB sem travar a API | decided | A | @aws-sdk/client-s3, @aws-sdk/s3-request-presigner |
| phase-03-videos/TD-03 | phase | Backend | Modelo de execução do worker de vídeo | decided | A | — |
| phase-03-videos/TD-04 | phase | Backend | Extração de metadados e geração de thumbnail | decided | A | fluent-ffmpeg |
| phase-03-videos/TD-05 | phase | Backend | URL única por vídeo e estratégia de streaming/download | decided | B | — |
| phase-03-videos/TD-06 | phase | Backend | Ciclo de status do vídeo e tratamento de falha de processamento | decided | B | — |
| phase-03-videos/TD-07 | phase | Backend | Organização de buckets/chaves no object storage | decided | A | — |
| upload-cleanup-policy/TD-01 | ad-hoc | Backend | Política de limpeza de uploads multipart abandonados e vídeos rascunho órfãos | decided | B (revisado) | @nestjs/schedule |

_Source files:_

- phase-03-videos — `docs/decisions/technical-decisions-phase-03-videos.md` (scope_type: phase)
- upload-cleanup-policy — `docs/decisions/technical-decisions-upload-cleanup-policy.md` (scope_type: ad-hoc)

## Capability Coverage

| Capability (from project-plan.md) | Covered by |
|-----------------------------------|------------|
| Serviço de armazenamento de arquivos (vídeos e thumbnails) | phase-03-videos/TD-07 |
| Serviço de processamento em segundo plano (filas) | phase-03-videos/TD-01, phase-03-videos/TD-03 |
| Upload de vídeos com suporte a arquivos de até 10GB sem impacto na performance | phase-03-videos/TD-02, upload-cleanup-policy/TD-01 |
| Pré-cadastro automático do vídeo como rascunho ao iniciar o upload | phase-03-videos/TD-06, upload-cleanup-policy/TD-01 |
| Processamento automático do vídeo após upload (extração de duração e metadados) | phase-03-videos/TD-03, phase-03-videos/TD-04, phase-03-videos/TD-06 |
| Geração automática de thumbnail a partir de um frame do vídeo | phase-03-videos/TD-04 |
| URL única por vídeo, sem conflito com outros vídeos | phase-03-videos/TD-05 |
| Reprodução via streaming (sem necessidade de download completo) | phase-03-videos/TD-05 |
| Download do vídeo pelo usuário | phase-03-videos/TD-05 |

## Decisions Detail

### phase-03-videos/TD-01

**Recommendation:** é o módulo oficial do NestJS para filas, entrega retry/backoff/progresso/concorrência nativamente (necessário para jobs de vídeo longos e falha-propensos, ver TD-06), e é o par mais idiomático para um worker de vídeo em NestJS. O custo de adicionar Redis ao Compose é aceitável: a arquitetura já prevê a fila como container dedicado e distinto do Postgres.
**Libraries:** @nestjs/bullmq, bullmq

### phase-03-videos/TD-02

**Recommendation:** é a única opção que atende simultaneamente aos três requisitos explícitos: suportar 10GB (acima do limite de PUT único), não travar a API (bytes nunca passam pelo processo Node) e permitir retomada em falha de conexão (reenvio por parte, não do arquivo inteiro). Confirmado como compatível com a API S3 usada pelo MinIO via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.
**Libraries:** @aws-sdk/client-s3, @aws-sdk/s3-request-presigner

### phase-03-videos/TD-03

**Recommendation:** é a arquitetura já prevista no diagrama C4 do projeto (container "Video Worker" separado da API), e evita que processamento pesado de vídeo degrade a latência da API. Ambos os processos compartilham o mesmo `VideosModule`/codebase; só o entrypoint de bootstrap difere.
**Libraries:** —

### phase-03-videos/TD-04

**Recommendation:** cobre com uma API estável exatamente as duas operações que esta fase precisa (`ffprobe` para metadados, `screenshots()` para thumbnail), evitando reescrever parsing de processo por nenhum benefício real. Thumbnail extraída em 10% da duração do vídeo (esclarecido via AMB-1 do `plan-validate`).
**Libraries:** fluent-ffmpeg

### phase-03-videos/TD-05

**Recommendation:** evita reimplementar `Range`/206 (o storage já faz isso corretamente) e mantém o princípio já decidido na TD-02: a API nunca deve proxear bytes de arquivos grandes. O UUID do vídeo (chave primária da entidade) é o identificador público estável; a URL pré-assinada é um ponteiro de curta duração e sem colisão para o objeto.
**Libraries:** — (reaproveita @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner já introduzidos na TD-02)

### phase-03-videos/TD-06

**Recommendation:** como a TD-01 já escolhe uma fila com `attempts`/`backoff` nativos, não hesitar em falhas transitórias antes de expor `error` ao usuário é ganho "de graça" e evita retrabalho de upload para problemas que se resolveriam sozinhos. O enum cobre exclusivamente o pipeline técnico de upload/processamento; a dimensão de publicação de conteúdo da Fase 04 é um campo separado (esclarecido via AMB-2 do `plan-validate`).
**Libraries:** — (reaproveita @nestjs/bullmq já introduzido na TD-01)

### phase-03-videos/TD-07

**Recommendation:** o UUID já elimina colisões sem precisar de um segundo bucket, e um único bucket é mais simples de provisionar e é consistente com o único container de Object Storage do diagrama de arquitetura.
**Libraries:** — (reaproveita @aws-sdk/client-s3 já introduzido na TD-02)

### upload-cleanup-policy/TD-01

**Recommendation:** divide a responsabilidade pela fronteira natural entre os dois recursos: o storage cuida do que é dele (partes multipart) através de um mecanismo nativo e garantido mesmo com a aplicação fora do ar, enquanto a aplicação cuida apenas do que é exclusivamente seu (o registro `draft` no Postgres, que o storage não enxerga). Isso é mais robusto que a Option B, que depende inteiramente do processo da aplicação estar de pé para proteger o storage contra custo ilimitado.
**Libraries:** @nestjs/schedule
**Revisions:**
- 2026-09-21 — Decisão alterada de Option A para Option B durante SI-03.1 do `/implement`. Rationale: confirmado empiricamente que o MinIO (release `RELEASE.2025-09-07T16-13-09Z`) descarta silenciosamente o campo `AbortIncompleteMultipartUpload` de uma lifecycle rule (aceita apenas quando combinado com `Expiration`, mas não o persiste). O cron único (Option B) cobre o mesmo risco via `ListMultipartUploadsCommand` + `AbortMultipartUploadCommand`, no mesmo `UploadCleanupService` que já limpa os `draft` órfãos.

## Inherited Decisions Detail

### openapi-docs-nestjs/TD-01

**Recommendation:** Option A (`@nestjs/swagger`) — é a única opção que preserva as decisões anteriores (`class-validator` em TD-06 de phase-02-auth) sem re-platform; o CLI plugin com `classValidatorShim: true` aproveita os decoradores `class-validator` existentes para inferir schemas, mantendo o boilerplate baixo. Nestia tem mérito técnico real mas o custo de migração do stack de validação inviabiliza-a sem uma decisão upstream de supersede de TD-06.
**Libraries:** @nestjs/swagger
**Revisions:**
- 2026-05-12 — Esclarece que o CLI plugin (`classValidatorShim: true`) cobre apenas inferência de schemas de DTOs; documentação de operações, respostas tipadas por status code, contratos de erro e exemplos exigem decoradores explícitos (`@ApiOperation`, `@ApiResponse`, `@ApiBody`, `@ApiParam`, `@ApiQuery`, `@ApiExtraModels`). Rationale: enriquecimento via decoradores explícitos faz parte da Option A escolhida, não é trabalho fora do escopo do TD.

### openapi-docs-nestjs/TD-02

**Recommendation:** Option C (Runtime UI + `openapi.json` exportado) — o custo marginal sobre Option A é apenas um npm script (~15 linhas) e o benefício é uma fundação correta para futura integração FE (codegen offline) sem perder a UI interativa que dev/QA usam.
**Libraries:** —

### openapi-docs-nestjs/TD-03

**Recommendation:** Option B (Apenas em dev/staging via env flag) — alinha com a postura defensiva já estabelecida em phase 02 e não compromete consumidores legítimos (o `openapi.json` commitado em TD-02 cumpre o papel de "spec consultável fora da UI").
**Libraries:** —

### phase-01-configuracao-base/TD-01

**Recommendation:** Option A (@nestjs/config) — Official, core-team-maintained, guaranteed NestJS 11 compatibility. The `registerAs()` factory pattern solves the TypeORM CLI sharing problem: the factory function can be imported as a plain function by `data-source.ts` while also serving as a DI injection token inside NestJS.
**Libraries:** @nestjs/config@^4.x

### phase-01-configuracao-base/TD-02

**Recommendation:** Option A (Joi) — First-class integration with `@nestjs/config` via `validationSchema`, requiring zero custom wiring. Handles string-to-number coercion natively.
**Libraries:** joi@^17.x

### phase-01-configuracao-base/TD-03

**Recommendation:** Option B (Namespaced/grouped with registerAs) — The project roadmap explicitly calls for auth, email, and storage in upcoming phases. Namespaced configs provide clear file boundaries per domain, typed injection via `ConfigType<typeof databaseConfig>`.
**Libraries:** —

### phase-01-configuracao-base/TD-04

**Recommendation:** Option A (Shared registerAs factory) — Natural outcome of choosing `@nestjs/config` with `registerAs`. `data-source.ts` imports it, calls `dotenv.config()`, then calls the factory. Zero duplication.
**Libraries:** dotenv (transitive via @nestjs/config)

### phase-02-auth/TD-01

**Recommendation:** Argon2id — For a greenfield project in 2026, Argon2id is the OWASP-recommended choice. The native build dependency is a one-time Docker setup cost.
**Libraries:** argon2@^0.41.x

### phase-02-auth/TD-02

**Recommendation:** Option A (@nestjs/passport) recommended; **Note:** Decision deliberately diverged — custom guards were preferred over `@nestjs/passport` to keep the dependency surface smaller; social login is not on the near-term roadmap.
**Libraries:** @nestjs/jwt@^11.0.0

### phase-02-auth/TD-03

**Recommendation:** Option A (Refresh Token Rotation) — Provides the strongest security model with automatic theft detection. PostgreSQL is already in the stack, so no new infrastructure needed.
**Libraries:** —

### phase-02-auth/TD-04

**Recommendation:** Option B (Random Opaque Tokens in DB) — Revocability is important: when a user requests a new password reset, previous tokens should be invalidated. The DB table can also serve future needs.
**Libraries:** —

### phase-02-auth/TD-05

**Recommendation:** Option A (@nestjs-modules/mailer) — Best NestJS integration with minimal boilerplate. Works with Mailpit for local development without external dependencies.
**Libraries:** @nestjs-modules/mailer@^2.x, handlebars@^4.x

### phase-02-auth/TD-06

**Recommendation:** Option A (class-validator + class-transformer) — This is a backend-only project (no shared schemas with frontend). class-validator is the documented NestJS approach.
**Libraries:** class-validator@^0.14.x, class-transformer@^0.5.x

### phase-02-auth/TD-07

**Recommendation:** Option A (Custom Domain Exception Filter) — Provides machine-readable error codes without RFC 9457 overhead. Single-consumer project (first-party frontend); `{ statusCode, error, message }` format with domain codes balances clarity and simplicity.
**Libraries:** —

### phase-02-auth/TD-08

**Recommendation:** Option A (@nestjs/throttler) — Native NestJS integration is decisive: the guard system allows scoping rate limiting via module-level `APP_GUARD`, with `@SkipThrottle()` for exemptions.
**Libraries:** @nestjs/throttler@^6.x

### phase-02-auth/TD-09

**Recommendation:** Option B (Opaque) recommended; **Note:** Decision deliberately diverged — JWT was kept to reuse the access-token signing/verification infrastructure (`@nestjs/jwt`), trading token size for a single token format across the codebase.
**Libraries:** @nestjs/jwt@^11.0.0

### phase-02-auth/TD-10

**Recommendation:** Option A — A strict `[a-z0-9_]` allowlist is the simplest and most portable choice: no extra dependencies, no edge cases around hyphen positioning, and the `user_<random>` fallback provides a valid handle even for extreme email prefixes.
**Libraries:** —

### phase-02-auth-frontend/TD-01

**Recommendation:** Custom BFF cookie-based session — the strict-BFF model already nominates the Route Handler as the only NestJS caller; cookie-based sessions are the natural match.
**Libraries:** —

### phase-02-auth-frontend/TD-02

**Recommendation:** `iron-session` encrypted container — defense in depth on cookie content (`httpOnly` blocks JS, encryption blocks accidental log/proxy inspection); single cookie to manage simplifies logout.
**Libraries:** iron-session

### phase-02-auth-frontend/TD-03

**Recommendation:** Transparent BFF refresh on upstream 401, single-flight — the single-flight detail is non-trivial and goes in the helper from day one, tested by MSW.
**Libraries:** —

### phase-02-auth-frontend/TD-04

**Recommendation:** `react-hook-form` + `@hookform/resolvers/zod` — decoupled from the mutation submission pathway; aligned with shadcn's canonical form primitive; Zod-first ergonomics match the rest of the FE foundation.
**Libraries:** react-hook-form, @hookform/resolvers

### phase-02-auth-frontend/TD-05

**Recommendation:** Route Handler POST + client `fetch` — strict-BFF alignment, every mutation stays visible under `app/api/**`.
**Libraries:** —

### phase-02-auth-frontend/TD-06

**Recommendation:** Server-rendered session + Provider in RSC layout — no first-render flicker, no round-trip; session delivered in the same response as page HTML.
**Libraries:** —

### phase-02-auth-frontend/TD-07

**Recommendation:** RSC processes token; Client form for reset input step — first-paint-correct; single integration pattern across confirmation and reset flows.
**Libraries:** —

## Inherited Conventions

- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`. _(from phase 01)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`, passed to `ConfigModule.forRoot({ validationSchema, validationOptions: { allowUnknown: true, abortEarly: false } })`. _(from phase 01)_
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`; the same factory is importable as a plain function for non-DI contexts (e.g., TypeORM CLI). _(from phase 01)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports the config factory and calls it as a plain function. _(from phase 01)_
- Database connection parameters are sourced from a single `databaseConfig` factory — never duplicated between `AppModule` and `data-source.ts`. _(from phase 01)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`), with `imports: [ConfigModule]`, `inject: [databaseConfig.KEY]`, `useFactory` returning options including `autoLoadEntities: true`, `synchronize: false`. _(from phase 01)_

## Inherited Deferred Capabilities

| Capability | Status | Origin phase | Rationale |
|-----------|--------|--------------|-----------|
| Telas de frontend | deferred | phase-01-configuracao-base | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| Telas de cadastro, login, confirmação de conta e recuperação de senha | deferred | phase-02-auth | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Confirmação de conta via e-mail com link de ativação" | deferred | phase-02-auth-frontend | UI landing screen de-scoped 2026-05-14; FE confirmation flow picked up by a future phase. |
| "Logout" | deferred | phase-02-auth-frontend | Logout button lives inside authenticated chrome (typically Phase 04). |
| "Recuperação de senha (destination screen / set-new-password)" | deferred | phase-02-auth-frontend | The reset-password destination screen is absent from Figma → link destination remains a 404 until a later phase delivers the screen. |
| "Telas de cadastro, login, confirmação de conta e recuperação de senha" (umbrella bullet) | deferred | phase-02-auth-frontend | The umbrella bullet is deferred to the phase that lands the missing confirmação/reset-password screens. |

_None of the above are addressed by Phase 03 (backend-only, video-scoped) — carried forward informationally._

## Non-UI / Deferred Capabilities

_None._

## Testing Requirements

### nestjs-project

| Artifact created | Required tests |
|---|---|
| Entity (`*.entity.ts`) | Integration: constraints, defaults, `select: false` |
| Service with branching + DB | Unit: branch logic (mock repo) + Integration: DB contract |
| Service with DB only (no branching) | Integration: DB contract |
| Service with configured lib (JWT, cache, queue) | Unit: real lib with test config |
| Service with side-effect dep (storage, queue publish) | Integration: real capture service / local adapter |
| Module with configured imports | Unit: compilation test |
| Controller | E2E only — do NOT write unit tests |
| DTO | E2E: one validation wiring test per endpoint |
| Guard (delegates to service for business logic) | E2E + Unit if complex internal logic |
| Guard (simple, delegates to Passport) | E2E only |
| Pipe (custom transformation/validation) | Unit |
| Interceptor (response transform, logging) | Unit and/or E2E |
| Exception Filter | Unit + E2E |
| Middleware | E2E |

Source: `testing-guide-nestjs-project` Skill, §3 Feature Implementation Checklist. Per §1/§2 of the same guide: mock across module boundaries (not within); do not mock configured libs (e.g., a real BullMQ/Redis or real MinIO/S3-compatible instance in integration tests, not a mocked client); integration tests prove the DB/external-system contract, E2E tests prove the HTTP contract — neither substitutes the other. This governs how Phase 03's queue, storage, and worker integrations must be tested (real Redis/MinIO via Compose, not mocks). Applies equally to the scheduled cleanup job (`upload-cleanup-policy/TD-01`) — its cron/lifecycle behavior must be exercised against real Redis/MinIO fixtures, not mocked storage clients.

### next-frontend

_Deferred subproject — no video UI work in this phase; testing requirements not applicable._
