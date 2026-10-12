# phase-06-social-interactions — Progress

**Status:** in_progress
**SIs:** 12/29 completed

### SI-06.0.1 — Custom-business simple group: thumbs-down-icon
- **Status:** completed
- **Tests:** no tests (icon components); existing icons suite 15 files / 20 tests passing, `npx tsc --noEmit` clean
- **Observations:**
  - Variante preenchida segue a convenção de `home-icon.tsx` (prop `filled` + `data-filled`) em vez de uma prop nova; `ThumbsUpIcon` sem a prop mantém o glifo anterior (uso em `video-stats.tsx` intacto).
  - Feature branch `feature/phase-06-social-interactions` criada a partir de `dev` com os artefatos de planejamento ainda sem commit; containers de ambos os subprojetos subidos.

### SI-06.1 — Criar entidades e migration das interações sociais
- **Status:** completed
- **Tests:** 19 passing (4 suites: reaction/comment/subscription entities + migrations); `npx tsc --noEmit` clean; eslint clean on touched files
- **Observations:**
  - Migration gerada pela CLI do TypeORM (`1791581244930-CreateSocialInteractions.ts`); a CLI emitiu `CREATE TYPE`/`DROP TYPE "reaction_type"` duas vezes porque as duas tabelas compartilham `enumName`, então removi a duplicata (um `CREATE TYPE` no início, um `DROP TYPE` no fim).
  - O spec `migrations.integration-spec.ts` passou a esperar 6 migrations e 10 tabelas e ganhou um teste extra para reverter a migration social e depois a de edição de vídeo.
  - `cleanAllTables` não foi alterado: as FKs `ON DELETE CASCADE` limpam as tabelas novas ao apagar `users`/`videos`/`channels`, e adicionar `DELETE` explícito quebraria suítes que sincronizam só parte das entidades.
  - `npm run lint` não foi usado porque tem `--fix` e a dívida de lint do backend é preexistente; rodei `eslint` sem `--fix` apenas nos arquivos desta SI.
  - A migration foi aplicada ao banco de desenvolvimento/teste compartilhado (`streamtube`) ao gerá-la.

### SI-06.2 — SubscriptionsService e SubscriptionsModule
- **Status:** completed
- **Tests:** 22 passing em 4 suítes do diretório `src/subscriptions` (service unit, service integration, module compile + entity do SI anterior); `npx tsc --noEmit` clean; eslint clean nos arquivos tocados
- **Observations:**
  - Constantes de `limit` de `GET /subscriptions` definidas em `subscriptions.constants.ts`: padrão 10 (o menu envia 10) e máximo 50; o plano deixava os valores `_undetermined_`, a validação do DTO fica no SI-06.4.
  - `subscribe` usa `INSERT ... ON CONFLICT DO NOTHING` (`orIgnore`) sobre a unique (`user_id`, `channel_id`) para ser idempotente sem transação.
  - O feed usa `innerJoinAndSelect` do canal para devolver `channelName`/`channelNickname` no SI-06.4 sem N+1; só vídeos `ready` + `public` + publicados (unlisted fora).
  - O container `nestjs-api` tinha caído entre SIs e foi reiniciado com `docker compose up -d`.

### SI-06.3 — Endpoints de inscrição (PUT/DELETE /channels/{nickname}/subscription)
- **Status:** completed
- **Tests:** 8 passing (E2E `test/subscriptions-subscribe.e2e-spec.ts`, autorado do spec `nestjs-project/specs/subscriptions-subscribe.plan.md`); module spec 1 passing; `npx tsc --noEmit` clean; eslint clean nos arquivos tocados
- **Observations:**
  - O SI não tem linhas de teste inline; o E2E veio do spec (JIT, passo 3a). Cenários 1.5/2.2 do spec viraram dois `it` (404 e 401) para PUT e DELETE.
  - O E2E foi escrito já tipado (`res.body as {...}`, `mailService` tipado) para não herdar os erros de `no-unsafe-*` do padrão dos E2E existentes.
  - `SubscriptionsController` usa `@Controller()` com caminhos completos por método (como `VideosController`), pois o SI-06.4 acrescenta `GET /subscriptions` no mesmo controller.

### SI-06.4 — Endpoints GET /subscriptions e GET /subscriptions/videos
- **Status:** completed
- **Tests:** 7 passing no E2E `test/subscriptions-lists.e2e-spec.ts` (spec `subscriptions-lists.plan.md`); junto com o E2E do SI-06.3 são 15 passing; `npx tsc --noEmit` clean; eslint clean nos arquivos tocados
- **Observations:**
  - `ListSubscriptionsDto` valida `limit` entre 1 e `MAX_FOLLOWED_CHANNELS_LIMIT` (50, definido no SI-06.2); `ListSubscriptionFeedDto` estende `ListChannelVideosDto` para manter a mesma convenção `page`/`pageSize` (máx. 100) da listagem pública do canal.
  - Um caso além do spec: `GET /subscriptions?limit=0` retorna 400 (valida o `@Min(1)` do `ListSubscriptionsDto`). O cenário 3.1 do spec (401 sem token nas duas rotas) virou um `it` por rota.

### SI-06.5 — ReactionsService e ReactionsModule
- **Status:** completed
- **Tests:** 110 passing em 8 suítes (novas: util de visibilidade, `ReactionsService` unit e integration, `ReactionsModule`; regressão: `VideosService` unit/integration e `VideosModule`; mais o spec de entidades do SI-06.1); `npx tsc --noEmit` clean; eslint clean nos arquivos novos/tocados
- **Observations:**
  - A regra de visibilidade foi extraída para `src/videos/video-visibility.util.ts` (`isVideoVisibleTo`) e `VideosService.assertViewable` delega a ela; `getThumbnailUrl` mantém sua regra própria (somente `public`), que difere da unificada e não foi tocada.
  - `ReactionsService` valida a visibilidade do vídeo (e, para comentário, do vídeo do comentário) sem importar `VideosModule`: usa `TypeOrmModule.forFeature([Video, Comment])` e o util, evitando a dependência circular prevista no SI-06.11.
  - `COMMENT_NOT_FOUND` também é devolvido quando o comentário existe mas o vídeo dele não é visível ao solicitante, para não vazar a existência de comentários de vídeos privados.
  - `upsert` do TypeORM usa `ON CONFLICT (user_id, video_id)` sobre a unique criada no SI-06.1.
  - Não rodei `eslint` em `videos.service.ts` (arquivo com dívida de lint preexistente); `tsc` e os testes de regressão cobrem a mudança.

### SI-06.6 — Endpoints de reação em vídeos (PUT/DELETE /videos/{id}/reaction)
- **Status:** completed
- **Tests:** 8 passing (E2E `test/video-reactions.e2e-spec.ts`, spec `video-reactions.plan.md`); `ReactionsModule` spec 1 passing; `npx tsc --noEmit` clean; eslint clean nos arquivos tocados
- **Observations:**
  - O `:id` das rotas usa `ParseUUIDPipe`: um id que não é UUID responde 400 em vez de 500 do Postgres (comportamento mais seguro que o das rotas antigas de vídeo; o contrato do plano só descreve 404 para vídeo inexistente).
  - `SetReactionDto` ganhou `@ApiProperty` com o enum para o contrato OpenAPI refletir `like`/`dislike` no SI-06.12.
  - Os cenários 3.2 e 3.3 do spec (404 e 401) viraram um `it` por rota; o 404 cobre vídeo inexistente e vídeo rascunho de outro canal.

### SI-06.7 — Endpoints de reação em comentários (PUT/DELETE /comments/{id}/reaction)
- **Status:** completed
- **Tests:** 8 passing (E2E `test/comment-reactions.e2e-spec.ts`, spec `comment-reactions.plan.md`); junto com o E2E do SI-06.6 são 16 passing; `npx tsc --noEmit` clean; eslint clean nos arquivos tocados
- **Observations:**
  - Rotas de comentário adicionadas ao `ReactionsController` do SI-06.6 reaproveitando `SetReactionDto` e `ParseUUIDPipe`.
  - O container `nestjs-api` caiu novamente entre SIs (segunda vez) e foi reiniciado com `docker compose up -d`; os testes foram rodados depois disso.
  - O E2E cria o comentário diretamente pelo repositório (o endpoint de criação só chega no SI-06.9); o vídeo é criado `ready`/`public`/publicado para a regra de visibilidade do `ReactionsService` passar.

### SI-06.8 — CommentsService e CommentsModule
- **Status:** completed
- **Tests:** 32 passing em 5 suítes de `src/comments` (cursor util, service unit, service integration, module compile + entity do SI-06.1); `npx tsc --noEmit` clean; eslint clean nos arquivos tocados
- **Observations:**
  - Limites de página definidos em `comments.constants.ts` (padrão 20, máximo 50), que o plano deixava `_undetermined_`; a validação do `limit` entra no DTO do SI-06.10.
  - O cursor é base64url de `{ t: created_at ISO, i: id }` e a paginação usa comparação de linha `(created_at, id) < (:t, :i)` com `take(limit + 1)` para saber se há próxima página sem COUNT extra; o teste de integração insere um comentário novo entre páginas e confirma que nenhum item repete nem some.
  - `totalCount` conta todos os comentários do vídeo, incluindo respostas, como o contrato prevê.
  - `CommentsModule` importa `ReactionsModule` e usa `forFeature([Comment, Video, Channel])`; não importa `VideosModule`/`ChannelsModule`.
  - A criação de arquivos por heredoc no shell falhou nesta SI (aspas) e foi refeita pelo editor; nenhum arquivo parcial ficou.

### SI-06.9 — Endpoint POST /videos/{id}/comments
- **Status:** completed
- **Tests:** 7 passing (E2E `test/comments-create.e2e-spec.ts`, spec `comments-create.plan.md`); regressão: E2E de reações (16) e suítes `src/comments`+`src/reactions` (59) verdes; `npx tsc --noEmit` clean; eslint clean nos arquivos tocados
- **Observations:**
  - O plano deixava o tamanho máximo do corpo `_undetermined_`; fixei `COMMENT_BODY_MAX_LENGTH = 5000` em `comments.constants.ts` (DTO com `@MaxLength`). Vale confirmar o valor; mudar é só a constante.
  - `CreateCommentDto` aplica `trim` via `@Transform` antes do `@IsNotEmpty`, então corpo só com espaços é rejeitado com 400 (AC 4).
  - Pela regra `nestjs-dtos.md` DTOs de requisição não levam `@ApiProperty` manual; removi o `@ApiProperty` que eu havia colocado em `SetReactionDto` (SI-06.6) e usei JSDoc, deixando o plugin do Swagger inferir o enum.
  - Criei `comment-response.ts` (`toCommentResponse`) para serializar `createdAt` em ISO e reaproveitar no SI-06.10.

### SI-06.10 — Endpoints de listagem GET /videos/{id}/comments e GET /comments/{id}/replies
- **Status:** completed
- **Tests:** 7 passing (E2E `test/comments-list.e2e-spec.ts`, spec `comments-list.plan.md`); junto com o E2E do SI-06.9 são 14 passing; `npx tsc --noEmit` clean; eslint clean nos arquivos tocados
- **Observations:**
  - As duas rotas usam `@Public()` e leem `user?.sub`: o `JwtAuthGuard` existente já trata token ausente, inválido ou expirado como anônimo, então não foi preciso código novo de autenticação opcional (confirma a revisão da TD-06).
  - O token expirado do E2E é gerado com `JwtService.signAsync(..., { expiresIn: -60 })`.
  - `ListCommentsDto.limit` valida 1 a `MAX_COMMENTS_LIMIT` (50, definido no SI-06.8); `cursor` é só `@IsString()` — a decodificação e o `INVALID_CURSOR` ficam no service.
  - `GET /comments/{id}/replies` devolve 404 `COMMENT_NOT_FOUND` também para respostas (comentário que não é de topo) e para comentário de vídeo não visível, como o contrato do plano.

### SI-06.11 — Contagens e viewerState em vídeo, canal e painel de gestão
- **Status:** completed
- **Tests:** 179 passing em 19 suítes de `src/videos`, `src/channels` e `src/comments`; 5 passing no E2E `test/social-counts-viewer-state.e2e-spec.ts`; `npx tsc --noEmit` clean
- **Observations:**
  - A composição das contagens ficou em `VideoSocialStatsService` e `ChannelSocialStatsService`, para `VideosService`/`ChannelsService` não herdarem preocupações de reação, inscrição e comentário.
  - `views` do painel de gestão continua placeholder `0`, como o plano prevê.
  - O Docker Desktop estava parado no início da sessão e foi reiniciado junto com `docker compose up -d`.

### SI-06.12 — Sincronizar o contrato OpenAPI e os tipos do frontend
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.13 — authedUpstream com PUT/DELETE e leitura autenticada opcional
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.14 — Aliases de contrato e handlers MSW das interações sociais
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.15 — Route Handlers BFF de reação em vídeos e comentários
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.16 — Route Handler BFF de inscrição em canais
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.17 — Route Handlers BFF de comentários e respostas
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.18.0 — Drift audit: Página de visualização do vídeo
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.18a — Tela de visualização do vídeo (visual shell)
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.18b — Tela de visualização do vídeo (lógica & wiring: reações e inscrição)
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.18c — Tela de visualização do vídeo (lógica & wiring: comentários)
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.19.0 — Drift audit: Página pública do canal
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.19a — Página pública do canal (visual shell)
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.19b — Página pública do canal (lógica & wiring)
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.20.0 — Drift audit: Menu lateral (Left Menu)
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.20a — Menu lateral (visual shell)
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.20b — Menu lateral (lógica & wiring: canais seguidos)
- **Status:** pending
- **Tests:** pending
- **Observations:** none

### SI-06.20c — Menu lateral (lógica & wiring: página de feed /subscriptions)
- **Status:** pending
- **Tests:** pending
- **Observations:** none

