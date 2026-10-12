---
kind: phase
name: phase-06-social-interactions
sources_mtime:
  docs/project-plan.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-social-interactions.md: "2026-10-08T18:35:19-04:00"
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
  docs/inventories/screen-inventory-phase-06-social-interactions.md: "2026-10-08T16:59:25-04:00"
  .claude/skills/testing-guide-nestjs-project/SKILL.md: "2026-09-17T19:27:23-04:00"
  .claude/skills/testing-guide-next-frontend/SKILL.md: "2026-09-17T19:27:23-04:00"
---

# phase-06-social-interactions — Context

## Scope

**Phase name:** Interações Sociais (Likes, Comentários, Inscrições)

**Capabilities** (literal, `docs/project-plan.md`):

- Like e dislike em vídeos (usuários autenticados)
- Comentários em vídeos (usuários autenticados)
- Respostas a comentários (comentários aninhados)
- Like e dislike em comentários (usuários autenticados)
- Inscrição em canais (seguir/deixar de seguir)
- Área de canais seguidos com acesso rápido aos vídeos
- Contagem de inscritos na página do canal
- Interface completa de comentários, likes e inscrições

**Out of scope:** _Not specified._
**Deliverables:** likes/dislikes funcionando, comentários com respostas, inscrição em canais, listagem de canais seguidos.
**Affected subprojects:** `nestjs-project` (backend) e `next-frontend` (frontend); não nomeados explicitamente em project-plan.md, inferidos das capabilities e do `CLAUDE.md`.
**Deferred subprojects:** _None._
**Sequencing notes:** Depende de: Fase 02, Fase 05. Resumo: "Likes/dislikes em vídeos e comentários, comentários com respostas e inscrição em canais."

**Neighbors (for boundary detection only):**

- **Phase 5:** Página de Visualização do Vídeo. Depende de: Fase 03, Fase 04.
- **Phase 7:** Página Inicial, Busca e Finalização. Depende de: todas as fases anteriores.

## Decisions Index

| Ref | Source | Scope | Topic | Status | Decision | Libraries |
|-----|--------|-------|-------|--------|----------|-----------|
| social-interactions/TD-01 | phase | Backend | Modelo de dados das reações (like/dislike) | decided | A | — |
| social-interactions/TD-02 | phase | Backend | Estratégia de contagens (likes, comentários, inscritos) | decided | A | — |
| social-interactions/TD-03 | phase | Cross-layer | Contrato das mutações de estado binário (reação e inscrição) | decided | A | — |
| social-interactions/TD-04 | phase | Backend | Modelo de hierarquia dos comentários (respostas aninhadas) | decided | A | — |
| social-interactions/TD-05 | phase | Cross-layer | Paginação e ordenação das listas de comentários e respostas | decided | B | — |
| social-interactions/TD-06 | phase | Cross-layer | Estado do usuário logado nas telas públicas (vídeo e canal) | decided | A | — |
| └─ _Last revision 2026-10-08: contrato de auth opcional nos endpoints públicos (AMB-1)_ | | | | | | |
| social-interactions/TD-07 | phase | Cross-layer | Área de canais seguidos — conteúdo e carregamento | decided | B | — |
| └─ _Last revision 2026-10-08: feed /subscriptions sem Figma, composto com VideoCard (IC-1)_ | | | | | | |
| social-interactions/TD-08 | phase | Frontend | Atualização da UI após mutações (otimista vs. confirmada) | decided | A | — |
| social-interactions/TD-09 | phase | Cross-layer | Formato e política do conteúdo do comentário | decided | A | — |

_Source files:_

- social-interactions — `docs/decisions/technical-decisions-social-interactions.md` (scope_type: phase, related_phases: [6])

## Capability Coverage

| Capability (from project-plan.md) | Covered by |
|-----------------------------------|------------|
| Like e dislike em vídeos (usuários autenticados) | social-interactions/TD-01, social-interactions/TD-02, social-interactions/TD-03, social-interactions/TD-06 |
| Comentários em vídeos (usuários autenticados) | social-interactions/TD-02, social-interactions/TD-04, social-interactions/TD-05, social-interactions/TD-09 |
| Respostas a comentários (comentários aninhados) | social-interactions/TD-04, social-interactions/TD-05 |
| Like e dislike em comentários (usuários autenticados) | social-interactions/TD-01, social-interactions/TD-02, social-interactions/TD-03 |
| Inscrição em canais (seguir/deixar de seguir) | social-interactions/TD-03, social-interactions/TD-06 |
| Área de canais seguidos com acesso rápido aos vídeos | social-interactions/TD-07 |
| Contagem de inscritos na página do canal | social-interactions/TD-02 |
| Interface completa de comentários, likes e inscrições | social-interactions/TD-06, social-interactions/TD-08 |

## Decisions Detail

### social-interactions/TD-01

**Recommendation:** preserva integridade referencial e cascade com modelagem 100% idiomática no TypeORM, ao custo de duplicação mecânica que o projeto já aceita (entidade por conceito); a Option C só compensa se surgir um terceiro alvo de reação.
**Libraries:** —

### social-interactions/TD-02

**Recommendation:** o volume esperado é baixo, a agregação em lote por página (poucas dezenas de itens) com índices é barata, e evita criar uma segunda fonte de verdade para dados que já têm linha por usuário; a Option B fica como evolução localizada se houver medição que a justifique.
**Libraries:** —

### social-interactions/TD-03

**Recommendation:** a idempotência é o que torna seguro o duplo clique e a UI otimista; o custo (estender `authedUpstream` com `PUT`/`DELETE`) é localizado e único, e vale para os três recursos.
**Libraries:** —

### social-interactions/TD-04

**Recommendation:** entrega "respostas a comentários" com a menor superfície (sem recursão, paginação direta) e é o modelo mais comum para esse tipo de UI; **se a intenção do produto for profundidade arbitrária, a escolha correta passa a ser a Option B** — essa é a decisão a confirmar com o dono do produto.
**Libraries:** —

### social-interactions/TD-05

**Recommendation:** comentários são um feed de escrita frequente cujo uso natural é "carregar mais"; o cursor evita o drift do offset, e o custo (estado acumulado no cliente) é pequeno e restrito a esta UI. A ordenação fica em "Latest" (única mostrada no Figma); outras ordenações não são capability desta fase.
**Libraries:** —

### social-interactions/TD-06

**Recommendation:** as telas já são dinâmicas e sem cache, então servir o estado do usuário na mesma resposta custa pouco e elimina o flicker; o ponto de atenção é o tratamento de token expirado em rota pública, que precisa ser resolvido na implementação.
**Libraries:** —
**Revisions:**
- 2026-10-08 — Define o contrato de autenticação opcional nos endpoints públicos que devolvem estado do espectador (`GET /videos/:id`, `GET /channels/:nickname` e a lista de comentários): guard opcional no backend; token válido devolve `viewerState` (curtido/inscrito); token ausente, inválido ou expirado devolve 200 anônimo, sem estado. O BFF usa o helper de refresh existente (`phase-02-auth-frontend/TD-03`, `phase-04-frontend-contract-gaps/TD-03`) antes da chamada quando há sessão. Rationale: contrato do endpoint fechado no `/plan-resolve` (AMB-1) para o `/plan-build` escrever API Contracts sem ambiguidade; leitura pública não quebra se o refresh falhar.

### social-interactions/TD-07

**Recommendation:** cobre as duas leituras de "acesso rápido" sem retrabalho, pois lista e feed usam a mesma tabela de inscrições; **a existência de uma tela de feed deve ser confirmada contra o Figma** na etapa de `/screen-inventory`, e a TD pode ser reduzida à Option A se não houver tela desenhada.
**Libraries:** —
**Revisions:**
- 2026-10-08 — Confirma a Opção B sem frame de feed no Figma: a página `/subscriptions` é renderizada dentro do `AppShell` (menu visível) e compõe o grid de `VideoCard` existente com os vídeos publicados dos canais seguidos (`published_at DESC`, paginação por URL da Fase 04); o acesso a partir de páginas públicas não ganha link novo (a área de seguidos vive no shell `(studio)`). Rationale: tela de feed não desenhada, composta a partir de componentes existentes (IC-1, OQ-1, AMB-2).

### social-interactions/TD-08

**Recommendation:** usa primitivas já instaladas, dá resposta imediata aos cliques e se apoia na idempotência da TD-03; a Option B é aceitável se a equipe preferir um único modelo mental, a custo de latência percebida.
**Libraries:** —

### social-interactions/TD-09

**Recommendation:** o plano não pede formatação, o texto puro mantém a menor superfície de ataque sem dependências, e links/menções podem entrar depois como evolução isolada do render (Option B) sem mudar o contrato de armazenamento.
**Libraries:** —

## Inherited Decisions Detail

_(inherited TDs from prior phases — phases-reader, then correlator-confirmed docs; dedupe applied)_

### phase-01-configuracao-base/TD-01

**Recommendation:** Option A (@nestjs/config) — Official, core-team-maintained, guaranteed NestJS 11 compatibility. The `registerAs()` factory pattern solves the TypeORM CLI sharing problem: the factory function can be imported as a plain function by `data-source.ts` while also serving as a DI injection token inside NestJS. Building a custom module recreates solved functionality; third-party packages carry maintenance risk.
**Libraries:** `@nestjs/config@^4.x`

### phase-01-configuracao-base/TD-02

**Recommendation:** Option A (Joi) — First-class integration with `@nestjs/config` via `validationSchema`, requiring zero custom wiring. Handles string-to-number coercion natively. Using a different tool for env validation vs. request validation is reasonable — env config is validated once at startup, DTOs are validated per-request. Zod is elegant but adds a third validation paradigm to the project.
**Libraries:** `joi@^17.x`

### phase-01-configuracao-base/TD-03

**Recommendation:** Option B (Namespaced/grouped with registerAs) — The project roadmap explicitly calls for auth, email, and storage in upcoming phases. Namespaced configs provide clear file boundaries per domain, typed injection via `ConfigType<typeof databaseConfig>`, and natural scalability. The `registerAs()` factory is dual-purpose: DI token inside NestJS and plain importable function for `data-source.ts`. Initial files for Phase 01: `src/config/database.config.ts`, `src/config/app.config.ts`.
**Libraries:** —

### phase-01-configuracao-base/TD-04

**Recommendation:** Option A (Shared registerAs factory) — Natural outcome of choosing `@nestjs/config` with `registerAs`. The factory is already callable by design. `data-source.ts` imports it, calls `dotenv.config()`, then calls the factory. Zero duplication, minimal code, no extra abstraction.
**Libraries:** `dotenv` (transitive via `@nestjs/config`)

### phase-02-auth/TD-01

**Recommendation:** Argon2id — For a greenfield project in 2026, Argon2id is the OWASP-recommended choice. The native build dependency is a one-time Docker setup cost. The project has no legacy constraints favoring bcrypt. OWASP minimum: 19MiB memory, 2 iterations.
**Libraries:** `argon2@^0.41.x`

### phase-02-auth/TD-02

**Recommendation:** Option A (@nestjs/passport) — The project plan includes only email/password auth for now, but the plugin architecture costs little and future phases may add social login. Aligns with official NestJS docs, making onboarding and maintenance easier.
**Note:** Decision deliberately diverged from the Recommendation during implementation — custom guards were preferred over `@nestjs/passport` to keep the dependency surface smaller; social login is not on the near-term roadmap, so the plugin-architecture benefit did not justify the extra abstraction layer.
**Libraries:** `@nestjs/jwt@^11.0.0`

### phase-02-auth/TD-03

**Recommendation:** Option A (Refresh Token Rotation) — Provides the strongest security model with automatic theft detection. The DB write overhead is acceptable for a video platform (auth refresh is infrequent vs. video operations). PostgreSQL is already in the stack, so no new infrastructure needed. Race conditions can be mitigated with a short grace period for the old token.
**Libraries:** —

### phase-02-auth/TD-04

**Recommendation:** Option B (Random Opaque Tokens in DB) — Revocability is important: when a user requests a new password reset, previous tokens should be invalidated. The DB table is trivial to implement, and the tokens table can also serve future needs (e.g., API keys). Keeps email tokens decoupled from the JWT auth system.
**Libraries:** —

### phase-02-auth/TD-05

**Recommendation:** Option A (@nestjs-modules/mailer) — Best NestJS integration with minimal boilerplate. Supports SMTP (matching the architecture diagram), works with MailHog/Mailpit for local development without external dependencies, and scales to any SMTP provider in production. Template engine support (Handlebars) simplifies email formatting. No vendor lock-in.
**Libraries:** `@nestjs-modules/mailer@^2.x`, `handlebars@^4.x`

### phase-02-auth/TD-06

**Recommendation:** Option A (class-validator + class-transformer) — This is a backend-only project (no shared schemas with frontend), so Zod's single-source-of-truth advantage is less impactful. class-validator is the documented NestJS approach, and the project already uses decorators extensively (TypeORM entities, NestJS DI). Fewer integration surprises with NestJS 11.
**Libraries:** `class-validator@^0.14.x`, `class-transformer@^0.5.x`

### phase-02-auth/TD-07

**Recommendation:** Option A (Custom Domain Exception Filter) — Provides machine-readable error codes that the Next.js frontend can switch on, without the overhead of RFC 9457's URI-based type system. The project is single-consumer (first-party frontend), so a simple `{ statusCode, error, message }` format with domain codes balances clarity and simplicity. The custom filter cost is low — two small files.
**Libraries:** —

### phase-02-auth/TD-08

**Recommendation:** Option A (@nestjs/throttler) — Native NestJS integration is decisive: the guard system allows scoping rate limiting to `AuthModule` only via module-level `APP_GUARD`, with `@SkipThrottle()` for exemptions. The project is single-instance with no distributed requirements, so in-memory storage is sufficient. Using express-rate-limit would bypass NestJS's DI and guard lifecycle for no clear benefit.
**Libraries:** `@nestjs/throttler@^6.x`

### phase-02-auth/TD-09

**Recommendation:** Option B (Opaque) — Since DB lookup is mandatory (TD-03), JWT signature adds no security value. Opaque tokens are shorter, leak no data, and are simpler to generate.
**Note:** Decision deliberately diverged from the Recommendation — JWT was kept to reuse the access-token signing/verification infrastructure (`@nestjs/jwt`), trading token size and base64-readability for a single token format across the codebase.
**Libraries:** `@nestjs/jwt@^11.0.0`

### phase-02-auth/TD-10

**Recommendation:** Option A — The platform is a video sharing service with URL-based channel handles. A strict `[a-z0-9_]` allowlist is the simplest and most portable choice: no extra dependencies, no edge cases around hyphen positioning, and the `user_<random>` fallback provides a valid handle even for extreme email prefixes. Hyphens can always be added in a future iteration if user feedback justifies it.
**Libraries:** —

### phase-02-auth-frontend/TD-01

**Recommendation:** Three reasons. (1) **Architectural fit.** The strict-BFF model in `next-frontend-config-base/TD-03` already nominates the Route Handler as the only NestJS caller; cookie-based sessions are the natural match, and Auth.js's framework adds layers between the BFF and the cookie that buy nothing because the backend is the auth authority — Auth.js's value (DB adapters, OAuth providers, magic-link, `getServerSession` helpers) is mostly unused in this configuration. (2) **Smaller blast radius.** A ~50-LOC session helper is grep-friendly, debuggable, and test-friendly via the existing MSW+BFF integration test pattern; a misconfigured Auth.js callback is a longer fault-isolation loop. (3) **Compatibility with Next.js 16 / React 19.** Built-in `next/headers` `cookies()` is the canonical primitive both runtimes already use; Auth.js v5 versions track Next.js majors with a lag, adding compatibility risk that Option A does not have. Option C is rejected as unsafe (`localStorage` for refresh tokens) and architecturally regressive (loses RSC personalization).
**Libraries:** —

### phase-02-auth-frontend/TD-02

**Recommendation:** Three reasons. (1) **Defense in depth on the cookie content** — `httpOnly` blocks JS, encryption blocks accidental log/proxy inspection; the marginal cost is one ~3KB dep. (2) **Single cookie to manage** simplifies logout (one `session.destroy()` call) and avoids the orphan-cookie failure mode of Option A. (3) **Room to carry minimal user metadata** (`userId`, `email`, `channelSlug`) lets `app/layout.tsx` RSC render the authenticated chrome (avatar, channel name) without a per-render `/auth/me` round-trip — Phase 04+ gains compound here. Option A is a viable downgrade if the team rejects `iron-session` for any reason; the migration A→B (or B→A) is a one-Route-Handler refactor with no test changes downstream because the BFF interface is unchanged. Option C is rejected: it solves a problem (server-side revocation) the project does not have at the cost of infrastructure the project does not own.
**Libraries:** iron-session

### phase-02-auth-frontend/TD-03

**Recommendation:** The single-flight detail is non-trivial and goes in the helper from day one — tested by MSW with a "two concurrent intercepted upstream calls; one refresh expected" assertion. Option B's client-driven pattern is rejected because it doesn't replace Option A (RSC still needs server-side refresh) — adopting B means doing both. Option C's pre-emptive timer is rejected because the failure modes (multiple tabs, sleep/wake) outweigh the latency saving and force a `"use client"` shell near the root.
**Libraries:** —

### phase-02-auth-frontend/TD-04

**Recommendation:** Three reasons. (1) **Decoupled from TD-05** — works with Route Handlers OR Server Actions; the form code does not change if TD-05 is revisited later. (2) **Aligned with shadcn's canonical form primitive** — the project already commits to `radix-nova` shadcn (`components.json`); `npx shadcn@latest add form` produces react-hook-form wrappers; choosing react-hook-form means using the supported primitive instead of hand-rolling around it. (3) **Zod-first developer ergonomics match the rest of the FE foundation** — `next-frontend-config-base/TD-01` chose Zod 4 for env; the same schemas-as-source-of-truth pattern carries to forms with zero new validator paradigm. Option B is rejected for impedance with shadcn's primitive and for over-investing in progressive-enhancement that the strict-BFF model does not require. Option C is rejected for the per-field boilerplate and the loss of client-side feedback on a project that values quick, type-safe form iteration.
**Libraries:** react-hook-form, @hookform/resolvers

### phase-02-auth-frontend/TD-05

**Recommendation:** Three reasons. (1) **Strict-BFF alignment.** `next-frontend-config-base/TD-03` named Route Handlers as the BFF surface; Option A keeps every mutation visible under `app/api/**`. (2) **Test scaffold already exists** — `next-frontend/CLAUDE.md` § Testing and `next-frontend-msw-foundation` were authored for Route-Handlers-as-functions; Option A reuses them with zero invention. (3) **Single mutation surface** — Phase 02 sets the precedent for Phases 03–07; uniformity beats per-mutation idiom-picking when the cost of inconsistency compounds (Option C). Option B has real ergonomic appeal for the simplest forms but fragments the BFF surface and forces test-pattern reinvention; if the team later wants progressive enhancement for specific forms, the migration A→B is per-form and doesn't require touching unrelated routes — A is the safer default and the cheaper baseline.
**Libraries:** —

### phase-02-auth-frontend/TD-06

**Recommendation:** Two reinforcing reasons. (1) **No first-render flicker, no round-trip** — the session is delivered in the same response as the page HTML; the Client Provider hydrates with the correct initial state; users never see "Login" briefly turn into their avatar. (2) **No new BFF endpoint** — the cookie is the source of truth, RSC reads it, the Provider broadcasts it; the BFF surface stays minimal. The `router.refresh()` requirement after mid-session mutations is a small price (one line in the relevant mutation handler) for the structural benefits. Option B is rejected for the double-read-and-flicker; Option C is dominated by Option B and rejected.
**Libraries:** —

### phase-02-auth-frontend/TD-07

**Recommendation:** Three reasons. (1) **First-paint-correct** — the user sees the right outcome on the first paint, no skeleton, no flicker. (2) **Single integration pattern across both flows** — confirmation is RSC-only; reset is RSC + Client form (TD-04, TD-05 patterns reused) — both share the "RSC owns the token, Client Component owns the input" split. (3) **Email-prefetch behavior** is solved at the backend's idempotent-confirmation level (a small note for `/plan-build` to confirm; not a separate TD). Option B's Route-Handler-as-link-target adds redirects for no clean gain. Option C is dominated.
**Libraries:** —

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

### phase-04-videos-channel/TD-01

**Recommendation:** Modelo de dados para categorias de vídeo. Decision: B (tabela dedicada `categories` + FK `videos.category_id`). Categoria não é um estado técnico interno (como `VideoStatus`), é uma taxonomia de conteúdo reutilizada em pelo menos mais duas fases já planejadas para filtro/sugestão; uma tabela evita migration a cada ajuste na lista de categorias e mantém aberta a porta para metadados de exibição sem redesenho de schema.
**Libraries:** —

### phase-04-videos-channel/TD-02

**Recommendation:** Upload de thumbnail customizada. Decision: A (upload direto via API, `FileInterceptor` + `@nestjs/platform-express`). Thumbnails são pequenas o suficiente para não recriar o problema que o fluxo pré-assinado do vídeo existe para resolver; sobrescreve a mesma chave já usada pela thumbnail automática (`videos/{id}/thumbnail.jpg`, convenção da `phase-03-videos/TD-07`).
**Libraries:** @types/multer (dev)

### phase-04-videos-channel/TD-03

**Recommendation:** Modelo de visibilidade e fluxo de rascunho → publicação. Decision: A (campos independentes `visibility` enum + `published_at` timestamp nullable). `phase-03-videos/TD-06` já deixou explícito que a publicação seria "um campo/estado separado"; `published_at` como timestamp também resolve o campo "tempo de publicação" do painel de gerenciamento.
**Libraries:** —

### phase-04-videos-channel/TD-04

**Recommendation:** Estratégia de paginação para listagens de vídeo do canal. Decision: A (`?page=1&pageSize=20`, TypeORM `skip`/`take`). Volume de vídeos por canal é tipicamente pequeno; paginação numerada é o padrão mais natural para um painel de administração.
**Libraries:** —

### phase-04-videos-channel/TD-05

**Recommendation:** Política de troca de nickname do canal. Decision: A (409 em colisão, sem sufixo automático, sem redirect de nickname antigo). O projeto não pede preservação de links históricos; rejeitar colisão com 409 é o comportamento correto para uma edição explícita.
**Libraries:** —

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

### video-watch-page/TD-07

**Recommendation:** a Option B reintroduz, do lado do download, exatamente o problema de memória que a Fase 03 already resolveu do lado do upload (vídeos de até 10GB não devem passar pela memória da aplicação/JS); um link simples com redirect 302 deixa o navegador lidar com arquivos de qualquer tamanho nativamente.
**Libraries:** —

### video-watch-page/TD-08

**Recommendation:** a Option B deixa consciente e documentado um vazamento de privacidade real (rascunho acessível anonimamente via UUID) exatamente na fase que tem todo o contexto para corrigi-lo; a Option C evita o risco de regressão da Option A, mas `findOne` é usado pelo formulário de edição sempre em contexto de dono (nunca exercitando o caminho anônimo), então o risco que a Option C tenta evitar não existe na prática — a duplicação de regra que ela introduz não se paga.
**Libraries:** —

### next-frontend-msw-foundation/TD-01

**Recommendation:** Option B (per-domain modules + barrel). A própria best-practice do MSW recomenda; a propriedade de domínio acompanha o código (`components/`, `app/api/`) e não o plano do projeto. Cada fase adiciona um arquivo `mocks/handlers/<domain>.ts` e uma linha no barrel `mocks/handlers/index.ts`.
**Libraries:** —

### next-frontend-msw-foundation/TD-02

**Recommendation:** Option A (test-only, `setupServer` apenas). O worker de browser é capacidade futura sem consumidor atual; ligá-lo agora seria investimento especulativo e, sob BFF estrito, enganoso.
**Libraries:** —

### next-frontend-msw-foundation/TD-03

**Recommendation:** Option D (defaults escritos à mão como padrão + faker seeded opt-in apenas para builders de coleção em massa). `@faker-js/faker` só é instalado quando o primeiro builder em massa for criado; cada shape tem `buildX(overrides?)`.
**Libraries:** —

### next-frontend-msw-foundation/TD-04

**Recommendation:** Option A (conjunto universal de handlers carregado no `setupServer` + `server.use(...)` por teste + `onUnhandledRequest: "error"`). O requisito "importar só o necessário" é atendido na autoria (TD-01); em runtime carregar todos os handlers é o modelo canônico do MSW v2 e não impõe custo.
**Libraries:** —

### next-frontend-openapi-typing/TD-01

**Recommendation:** Option A (`openapi-typescript` + `openapi-fetch`). BFF estrito torna o SDK gerado inútil no cliente; só Route Handlers chamam o upstream, e types-first combina com o restante da stack.
**Libraries:** openapi-typescript, openapi-fetch

### next-frontend-openapi-typing/TD-02

**Recommendation:** Option B (cópia local commitada em `next-frontend/openapi.json` + script de sync na raiz do repo). Preserva a independência dos composes e, junto com o check de CI da TD-03, elimina drift de forma estrutural.
**Libraries:** —

### next-frontend-openapi-typing/TD-03

**Recommendation:** Option C (commitado + check de frescor no CI cobrindo `openapi.json` e `types.gen.ts`). Torna o drift de contrato visível nos diffs de PR e impossível de mergear acidentalmente.
**Libraries:** —

### next-frontend-openapi-typing/TD-04

**Recommendation:** Option A (`lib/api/contracts.ts` único com aliases explícitos). Trata pass-through e reshape com o mesmo mecanismo, dá um único alvo de grep para "qual shape o BFF expõe" e desacopla os imports dos Components dos caminhos do App Router.
**Libraries:** —

### next-frontend-openapi-typing/TD-05

**Recommendation:** Option A (handlers MSW escritos à mão e tipados via `paths`). Determinismo em vez de geração automática; `paths` é a única âncora de contrato e uma fixture desatualizada falha no `tsc --noEmit`.
**Libraries:** —

### next-frontend-config-base/TD-01

**Recommendation:** Option A (Zod 4). Inferência de tipos casa com a cultura strict-TS do frontend e é a linguagem de schema de facto no App Router.
**Libraries:** zod

### next-frontend-config-base/TD-02

**Recommendation:** Option A (`@t3-oss/env-nextjs`). Única opção que combina enforcement de prefixo `NEXT_PUBLIC_` em tipos, detecção de vazamento em runtime via Proxy e um único ponto de import.
**Libraries:** @t3-oss/env-nextjs

### next-frontend-config-base/TD-03

**Recommendation:** Option A (BFF estrito — uma única `API_URL` server-only). Alinhada à estratégia de testes do BFF e a `next-frontend/CLAUDE.md`; elimina CORS e exposição pública da URL do backend.
**Libraries:** —

### openapi-docs-nestjs/TD-01

**Recommendation:** Option A (`@nestjs/swagger`) com CLI plugin (`classValidatorShim: true`) para aproveitar os decoradores `class-validator` existentes sem re-platform.
**Libraries:** @nestjs/swagger

### openapi-docs-nestjs/TD-02

**Recommendation:** Option C (Runtime UI + `openapi.json` exportado). Custo marginal de um npm script e fundação correta para codegen do frontend sem perder a UI interativa.
**Libraries:** —

### openapi-docs-nestjs/TD-03

**Recommendation:** Option B (Swagger UI apenas em dev/staging via env flag). O `openapi.json` commitado cumpre o papel de spec consultável fora da UI.
**Libraries:** —

## Inherited Conventions

_(from phases-reader — Phases 03, 04 e 05 restate the same bullets; deduped)_

- Backend config uses `@nestjs/config` with namespaced `registerAs(name, () => ({...}))` factories — one file per domain in `src/config/`. _(from phase 01)_
- Env variables are validated by a Joi schema in `src/config/env.validation.ts`, passed to `ConfigModule.forRoot({ validationSchema, validationOptions: { allowUnknown: true, abortEarly: false } })`. _(from phase 01)_
- Config is injected into modules via `ConfigType<typeof xxxConfig>` and `@Inject(xxxConfig.KEY)`; the same factory is importable as a plain function for non-DI contexts. _(from phase 01)_
- `data-source.ts` loads `.env` via `import 'dotenv/config'` at the top, then imports `databaseConfig` and calls it as a plain function. _(from phase 01)_
- Database connection parameters (host, port, etc.) are sourced from a single `databaseConfig` factory — never duplicated between `AppModule` and `data-source.ts`. _(from phase 01)_
- `TypeOrmModule.forRootAsync` is used (not `forRoot`), with `imports: [ConfigModule]`, `inject: [databaseConfig.KEY]`, `useFactory` returning options including `autoLoadEntities: true`, `synchronize: false`. _(from phase 01)_

## Inherited Deferred Capabilities

| Capability | Status | Origin phase | Rationale |
|-----------|--------|--------------|-----------|
| Telas de frontend | deferred | phase-01-configuracao-base | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| Telas de cadastro, login, confirmação de conta e recuperação de senha | deferred | phase-02-auth | `next-frontend/` is not initialized in this phase; UI surfaces start in a later phase. |
| "Confirmação de conta via e-mail com link de ativação" | deferred | phase-02-auth-frontend | deferred_to_next_phase — UI landing screen de-scoped 2026-05-14; FE confirmation flow (TD-07) picked up by a future phase. BE side unchanged in `phase-02-auth`. |
| "Logout" | deferred | phase-02-auth-frontend | deferred_to_next_phase — logout button lives inside authenticated chrome (typically Phase 04). Phase 02 still implements POST `/api/auth/logout` (BFF route handler + `session.destroy()`) so the contract is ready when the chrome lands. |
| "Recuperação de senha (destination screen / set-new-password)" | deferred | phase-02-auth-frontend | deferred_to_next_phase — `/forgot-password` ships this phase sending the e-mail; the reset-password destination screen is absent from Figma → link destination remains a 404 until a later phase delivers the screen. Known gap. |
| "Telas de cadastro, login, confirmação de conta e recuperação de senha" (umbrella) | deferred | phase-02-auth-frontend | Umbrella bullet deferred to the phase that lands the missing confirmação/reset-password screens; the 3 shipped telas (signup, login, forgot-password) are individually covered. |
| Painel de gerenciamento de vídeos do canal (UI) | deferred | phase-04-videos-channel | Backend contract decided; panel UI already delivered by sibling slice `phase-04-videos-channel-frontend`. |
| Edição de vídeos a partir do painel (UI) | deferred | phase-04-videos-channel | Same PATCH /videos/:id contract; panel UI already delivered by sibling frontend slice. |
| Edição das informações do canal (UI) | deferred | phase-04-videos-channel | Backend CRUD + nickname-collision policy decided; form UI already delivered by sibling frontend slice. |
| Página pública do canal (UI) | deferred | phase-04-videos-channel | Backend listing/pagination contract decided; public channel page UI already delivered by sibling frontend slice. |

## UI Inventory

**Source:** `docs/inventories/screen-inventory-phase-06-social-interactions.md`
**Screens in scope:** 3

### UI ↔ Capability Join

| Screen | Route | Verb | Capability | Covering Component |
|--------|-------|------|------------|-------------------|
| Página de visualização do vídeo | /watch/[id] | curtir vídeo | Like e dislike em vídeos (usuários autenticados) | VideoReactionButtons |
| Página de visualização do vídeo | /watch/[id] | descurtir vídeo | Like e dislike em vídeos (usuários autenticados) | VideoReactionButtons |
| Página de visualização do vídeo | /watch/[id] | inscrever-se no canal | Inscrição em canais (seguir/deixar de seguir) | SubscribeButton |
| Página de visualização do vídeo | /watch/[id] | cancelar inscrição no canal | Inscrição em canais (seguir/deixar de seguir) | SubscribeButton |
| Página de visualização do vídeo | /watch/[id] | listar comentários | Comentários em vídeos (usuários autenticados) | CommentsSection |
| Página de visualização do vídeo | /watch/[id] | enviar comentário | Comentários em vídeos (usuários autenticados) | CommentForm |
| Página de visualização do vídeo | /watch/[id] | curtir comentário | Like e dislike em comentários (usuários autenticados) | CommentReactionButtons |
| Página de visualização do vídeo | /watch/[id] | descurtir comentário | Like e dislike em comentários (usuários autenticados) | CommentReactionButtons |
| Página de visualização do vídeo | /watch/[id] | responder comentário | Respostas a comentários (comentários aninhados) | CommentForm (via ReplyButton) |
| Página pública do canal | /channel/[nickname] | inscrever-se no canal | Inscrição em canais (seguir/deixar de seguir) | SubscribeButton |
| Página pública do canal | /channel/[nickname] | cancelar inscrição no canal | Inscrição em canais (seguir/deixar de seguir) | SubscribeButton |
| Página pública do canal | /channel/[nickname] | exibir contagem de inscritos | Contagem de inscritos na página do canal | ChannelHeader / SubscriberCount |
| Página pública do canal | /channel/[nickname] | exibir estado de inscrição do espectador | Interface completa de comentários, likes e inscrições | SubscribeButton |
| Menu lateral (Left Menu) | (studio)/* | listar canais seguidos pelo usuário | Área de canais seguidos com acesso rápido aos vídeos | SideNavSubscriptionList |
| Menu lateral (Left Menu) | (studio)/* | acessar vídeos dos canais seguidos | Área de canais seguidos com acesso rápido aos vídeos | SideNavItem "Subscriptions" (→ /subscriptions) |

### Server-connected Components

- `VideoReactionButtons` (Página de visualização do vídeo) — `Reuse?: new`
- `SubscribeButton` (Página de visualização do vídeo) — `Reuse?: new`
- `CommentsSection` (Página de visualização do vídeo) — `Reuse?: new`
- `CommentForm` (Página de visualização do vídeo) — `Reuse?: new`
- `CommentItem` (Página de visualização do vídeo) — `Reuse?: new`
- `CommentReactionButtons` (Página de visualização do vídeo) — `Reuse?: new`
- `ChannelHeader` (Página pública do canal) — `Reuse?: components/channel/channel-header.tsx`
- `SubscribeButton` (Página pública do canal) — `Reuse?: new`
- `SubscriberCount` (Página pública do canal) — `Reuse?: new`
- `SideNavSubscriptionList` (Menu lateral (Left Menu)) — `Reuse?: components/layout/side-nav-subscription-list.tsx`

### Open Questions from Inventory

- **OQ-1 — `/subscriptions` sem design.** TD-07 (Opção B) prevê uma página de feed `/subscriptions`, mas não existe frame no Figma (confirmado pelo usuário). A capability "Área de canais seguidos com acesso rápido aos vídeos" fica coberta apenas pela lista no menu (acesso a canais, não a vídeos). Definir como o feed será composto (reuso de `video-card`) ou adiar o feed.
- **OQ-2 — Profundidade das respostas.** TD-04 assume `parent_id` com profundidade máxima 2, mas o Figma só desenha o botão Reply: não há formulário nem thread. Confirmar o desenho (formulário inline com `parentId`, toggle "Ver N respostas") ou registrar como drift.
- **OQ-3 — Leitura de comentários por anônimos.** A capability "Comentários em vídeos (usuários autenticados)" menciona autenticação, mas a leitura é pública. Confirmar o mapeamento de "listar comentários" a essa capability.
- **OQ-4 — Estados ativos não desenhados.** Like/dislike ativo, "Inscrito", foco/erro/loading e estado vazio de comentários serão derivados dos tokens e variantes existentes (sem frame no Figma).
- **OQ-5 — Contrato do backend.** Auto-inscrição deve ser rejeitada pela API; TD-03 exige estender `authedUpstream` com PUT/DELETE; o estado do espectador (curtido/inscrito) precisa vir na resposta de vídeo, canal e lista de comentários.

## Non-UI / Deferred Capabilities

_None._

## Testing Requirements

### nestjs-project

| Artifact type | Required layers |
|---------------|-----------------|
| Entity (`*.entity.ts`) | Integration: constraints, defaults, `select: false` |
| Service with branching + DB | Unit (mock repo) + Integration (DB contract) |
| Service with DB only (no branching) | Integration (DB contract) |
| Service with configured lib (JWT, cache) | Unit: real lib with test config |
| Service with side-effect dep (email, storage) | Integration: real capture service (Mailpit) or local adapter |
| Module with configured imports | Unit: compilation test |
| Controller | E2E only — no unit tests |
| DTO | E2E: one validation wiring test per endpoint |
| Guard (business logic in service / simple Passport) | E2E (+ Unit if complex internal logic) |
| Strategy (Passport) | E2E via guard |
| Pipe | Unit |
| Interceptor | Unit and/or E2E |
| Exception Filter | Unit + E2E |
| Middleware | E2E |

_Relevante a esta fase: race conditions em likes/inscrições duplicadas (constraint única + `PUT` idempotente) pedem teste de integração._

### next-frontend

| Artifact type | Required layers |
|---------------|-----------------|
| Page — sync RSC, static | None at component level; E2E only if critical flow |
| Page — async RSC | `*.e2e-spec.ts` only (Vitest cannot render it) |
| Layout | None unless it adds logic; else via E2E |
| Client component (`"use client"`) with state/handlers | `*.test.tsx` — RTL + `jsdom` docblock, mock `next/navigation`, MSW for fetch |
| Feature component (server, composes primitives) | Skip unit; cover via page E2E |
| shadcn UI primitive / Icon | None |
| `lib/` utility / boundary module with branching | `*.test.ts` |
| Custom hook | `*.test.ts(x)` with `renderHook`, `jsdom` docblock |
| Route handler (`app/api/**/route.ts`) | `*.integration.test.ts` with MSW (+ `*.test.ts` for extracted pure logic) |

_Relevante a esta fase: todo endpoint novo em `paths` exige handler MSW escrito à mão e tipado; E2E Playwright roda no `next dev` containerizado com `MSW_ENABLED=true`._
