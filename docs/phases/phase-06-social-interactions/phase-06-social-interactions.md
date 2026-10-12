---
kind: phase
name: phase-06-social-interactions
test_specs_aware: true
sources_mtime:
  docs/phases/phase-06-social-interactions/context.md: "2026-10-08T18:36:10-04:00"
  docs/decisions/technical-decisions-social-interactions.md: "2026-10-08T18:35:19-04:00"
---

# Phase 06 — Interações Sociais (Likes, Comentários, Inscrições)

## Objective

Entregar likes/dislikes em vídeos e comentários, comentários com respostas aninhadas (profundidade máxima 2), inscrição em canais com contagem de inscritos e a área de canais seguidos (lista no menu lateral e página de feed), com a interface completa nas telas de vídeo, canal e menu lateral.

---

## Step Implementations

### SI-06.0.1 — Custom-business simple group: thumbs-down-icon

**Description:** Criar o ícone `thumbs-down`, ausente do DS, e dar ao `thumbs-up` existente a variante preenchida do estado ativo, usados pelos controles de reação de vídeo e de comentário.

**Technical actions:**

1. Criar `components/icons/thumbs-down-icon.tsx` conforme o UI Contract da tela de vídeo (165:2379 / 165:2384; 24px, 16px nos comentários), no mesmo traço de `thumbs-up-icon.tsx`
2. Adicionar a variante preenchida (estado ativo), selecionada por prop, a `thumbs-down-icon.tsx` e a `components/icons/thumbs-up-icon.tsx`, sem alterar o uso atual do `thumbs-up`

**Tests:** _(empty — icon components are static SVG, no test per testing-guide-next-frontend § "Icons")_

**Dependencies:** none

**Acceptance criteria:**

- `components/icons/thumbs-down-icon.tsx` exporta `ThumbsDownIcon`, que renderiza o glifo vazado por padrão e o preenchido quando a prop de estado ativo é verdadeira
- `ThumbsUpIcon` renderiza o glifo atual quando usado sem a nova prop e o preenchido quando a prop de estado ativo é verdadeira
- `npx tsc --noEmit` no `next-frontend` termina sem erro após as mudanças

---

### SI-06.1 — Criar entidades e migration das interações sociais

**Description:** Criar as quatro entidades (`VideoReaction`, `CommentReaction`, `Comment`, `Subscription`) e a migration que cria o enum de reação, as tabelas, as FKs, as uniques e os índices do Data Model.

**Technical actions:**

1. Criar `src/reactions/entities/reaction-type.enum.ts`, `video-reaction.entity.ts` e `comment-reaction.entity.ts` conforme o Data Model, com unique (`user_id`, alvo) e índice (alvo, `type`) (per `social-interactions/TD-01`)
2. Criar `src/comments/entities/comment.entity.ts` conforme o Data Model, com `parent_id` auto-referente e os dois índices de listagem (per `social-interactions/TD-04`)
3. Criar `src/subscriptions/entities/subscription.entity.ts` conforme o Data Model, com unique (`user_id`, `channel_id`) e índices por `channel_id` e (`user_id`, `created_at`)
4. Gerar a migration `CreateSocialInteractions` em `src/database/migrations/` com o enum `reaction_type`, as quatro tabelas, FKs com `ON DELETE CASCADE`, uniques e índices, e `down` reversível

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideoReaction`, `CommentReaction` | Integration: unique (usuário, alvo), enum de `type`, cascade ao remover vídeo/comentário | `src/reactions/entities/reaction.entities.integration-spec.ts` |
| `Comment` | Integration: auto-referência por `parent_id`, cascade das respostas, `body` obrigatório | `src/comments/entities/comment.entity.integration-spec.ts` |
| `Subscription` | Integration: unique (`user_id`, `channel_id`), cascade ao remover canal/usuário | `src/subscriptions/entities/subscription.entity.integration-spec.ts` |
| Migration `CreateSocialInteractions` | Integration: `up` cria tabelas e índices, `down` remove | `src/database/migrations.integration-spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- Após rodar as migrations, as tabelas `video_reactions`, `comment_reactions`, `comments` e `subscriptions` existem com as colunas e constraints do Data Model
- Inserir duas reações do mesmo usuário no mesmo vídeo (ou comentário) viola a unique e falha
- Inserir duas inscrições do mesmo usuário no mesmo canal viola a unique e falha
- Remover um vídeo remove em cascata seus comentários, respostas e reações de vídeo; remover um comentário remove suas respostas e reações
- Reverter a migration remove as quatro tabelas e o enum `reaction_type` sem erro

---

### SI-06.2 — SubscriptionsService e SubscriptionsModule

**Description:** Entregar a regra de negócio de inscrições (inscrever/cancelar idempotente, contagem, lista de seguidos e feed de vídeos) em um módulo próprio, sem depender de `VideosModule`/`ChannelsModule`.

**Technical actions:**

1. Criar `CannotSubscribeOwnChannelException` (`CANNOT_SUBSCRIBE_OWN_CHANNEL`, 403) em `src/common/exceptions/domain.exception.ts` conforme o Error Catalog
2. Criar `src/subscriptions/subscriptions.service.ts` com `subscribe(userId, nickname)` idempotente (insert que ignora a unique), recusando o canal do próprio usuário, e `unsubscribe(userId, nickname)` idempotente; o canal é resolvido por `nickname` via repositório de `Channel` (`ChannelNotFoundException` se inexistente) (per `social-interactions/TD-03`)
3. Em `SubscriptionsService`, criar `countByChannelIds(channelIds)` (`COUNT` em lote, per `social-interactions/TD-02`) e `findSubscribedChannelIds(userId, channelIds)` para o `viewerState`
4. Em `SubscriptionsService`, criar `listFollowed(userId, limit)` (inscrição mais recente primeiro) e `listFeedVideos(userId, page, pageSize)` com join `subscriptions` → `videos` filtrando `ready` + `public` + `published_at` não nulo, `published_at DESC` (per `social-interactions/TD-07`); constantes de `limit` em `src/subscriptions/subscriptions.constants.ts` (valores definidos na implementação, ver API Contracts)
5. Criar `src/subscriptions/subscriptions.module.ts` (`TypeOrmModule.forFeature([Subscription, Channel, Video])`, exporta `SubscriptionsService`) e registrá-lo em `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `SubscriptionsService` | Unit: ramificações (canal próprio, idempotência, canal inexistente) com repositório mockado | `src/subscriptions/subscriptions.service.spec.ts` |
| `SubscriptionsService` | Integration: unique, contagem, lista de seguidos e feed contra o banco real | `src/subscriptions/subscriptions.service.integration-spec.ts` |
| `SubscriptionsModule` | Unit: compilação do módulo (DI) | `src/subscriptions/subscriptions.module.spec.ts` |

**Dependencies:** SI-06.1 — as entidades e a migration precisam existir antes do service

**Acceptance criteria:**

- Inscrever o mesmo usuário duas vezes no mesmo canal deixa exatamente um registro em `subscriptions`
- Inscrever-se no canal cujo `user_id` é o do próprio usuário lança `CANNOT_SUBSCRIBE_OWN_CHANNEL` e não grava registro
- Cancelar uma inscrição inexistente não lança erro
- `listFollowed` devolve os canais ordenados da inscrição mais recente para a mais antiga e respeita o `limit`
- O feed devolve apenas vídeos `ready`, `public` e publicados dos canais seguidos, do mais recente para o mais antigo, e exclui rascunhos e vídeos de canais não seguidos

---

### SI-06.3 — Endpoints de inscrição (PUT/DELETE /channels/{nickname}/subscription)

**Description:** Expor a inscrição e o cancelamento como sub-recurso idempotente do canal, autenticado e com `204`.

**Route:** PUT /channels/{nickname}/subscription, DELETE /channels/{nickname}/subscription
**Test Specs:** see `nestjs-project/specs/subscriptions-subscribe.plan.md`
**Authorization:** Authenticated (Authorization Matrix); `PUT` recusa o dono do canal

**Technical actions:**

1. Criar `src/subscriptions/subscriptions.controller.ts` com `PUT /channels/:nickname/subscription` e `DELETE /channels/:nickname/subscription`, ambos `204` e usando `@CurrentUser()` (per `social-interactions/TD-03`; contrato em `### API Contracts` → `PUT /channels/{nickname}/subscription` e `DELETE /channels/{nickname}/subscription`)
2. Documentar os dois endpoints com `@ApiBearerAuth`, `@ApiOperation` e `@ApiResponse` (`204`, `401`, `403`, `404` com `ApiErrorEnvelope`) para o contrato OpenAPI
3. Registrar `SubscriptionsController` em `SubscriptionsModule`

**Tests:** _(empty — controller covered by E2E in the /plan-test-specs spec; no unit test per testing-guide)_

**Dependencies:** SI-06.2 — o service precisa existir antes do controller

**Acceptance criteria:**

- `PUT /channels/{nickname}/subscription` com token válido de outro usuário retorna `204` e passa a existir uma inscrição
- `PUT /channels/{nickname}/subscription` repetido retorna `204` sem criar um segundo registro
- `PUT /channels/{nickname}/subscription` no canal do próprio usuário retorna `403` com `CANNOT_SUBSCRIBE_OWN_CHANNEL`
- `DELETE /channels/{nickname}/subscription` com inscrição existente retorna `204` e a inscrição deixa de existir; sem inscrição também retorna `204`
- Qualquer das duas rotas com `nickname` inexistente retorna `404` com `CHANNEL_NOT_FOUND`, e sem token retorna `401`

---

### SI-06.4 — Endpoints GET /subscriptions e GET /subscriptions/videos

**Description:** Expor a lista de canais seguidos (menu lateral) e o feed de vídeos dos canais seguidos (página `/subscriptions`) para o usuário autenticado.

**Route:** GET /subscriptions, GET /subscriptions/videos
**Test Specs:** see `nestjs-project/specs/subscriptions-lists.plan.md`
**Authorization:** Authenticated (Authorization Matrix)

**Technical actions:**

1. Em `SubscriptionsController`, criar `GET /subscriptions` com `ListSubscriptionsDto` (`limit` opcional, validado com `class-validator`) devolvendo `{ items: [{ channelId, channelName, channelNickname, subscribedAt }] }` (contrato em `### API Contracts` → `GET /subscriptions`)
2. Em `SubscriptionsController`, criar `GET /subscriptions/videos` com `ListSubscriptionFeedDto` reaproveitando a convenção `page`/`pageSize` de `ListChannelVideosDto` e devolvendo `{ items, page, pageSize, total }` (contrato em `### API Contracts` → `GET /subscriptions/videos`, per `social-interactions/TD-07`)
3. Documentar os dois endpoints com `@ApiBearerAuth`, `@ApiOperation` e `@ApiResponse` (`200`, `400`, `401`) para o contrato OpenAPI

**Tests:** _(empty — controller covered by E2E in the /plan-test-specs spec; no unit test per testing-guide)_

**Dependencies:** SI-06.3 — mesmo controller; SI-06.2 — queries de lista e feed

**Acceptance criteria:**

- `GET /subscriptions` com token válido retorna `200` com `items` ordenados da inscrição mais recente para a mais antiga e no máximo `limit` itens
- `GET /subscriptions` de usuário sem inscrições retorna `200` com `items: []`
- `GET /subscriptions/videos` retorna `200` apenas com vídeos publicados dos canais seguidos, por `published_at` decrescente, com `page`, `pageSize` e `total`
- `GET /subscriptions/videos?page=0` retorna `400` com erro de validação
- Ambas as rotas sem token retornam `401`

---

### SI-06.5 — ReactionsService e ReactionsModule

**Description:** Entregar a regra de negócio das reações (definir/remover idempotente, contagem de likes e estado do espectador) para vídeos e comentários, reaproveitando a regra de visibilidade da Fase 05 sem criar dependência circular entre módulos.

**Technical actions:**

1. Extrair a regra de visibilidade unificada de `VideosService.findOne` para `src/videos/video-visibility.util.ts` (função pura que recebe vídeo e `userId` opcional) e fazer `VideosService.findOne` delegar a ela, sem mudar o comportamento (per `video-watch-page/TD-08` herdada)
2. Criar `CommentNotFoundException` (`COMMENT_NOT_FOUND`, 404) em `src/common/exceptions/domain.exception.ts` conforme o Error Catalog
3. Criar `src/reactions/reactions.service.ts` com `setVideoReaction`/`removeVideoReaction` e `setCommentReaction`/`removeCommentReaction` idempotentes (upsert pela unique (`user_id`, alvo); trocar `type` atualiza o registro único), validando o vídeo com o util de visibilidade (`VideoNotFoundException`) e o comentário (`CommentNotFoundException`) (per `social-interactions/TD-01`, `social-interactions/TD-03`)
4. Em `ReactionsService`, criar `countVideoLikes(videoIds)` e `countCommentLikes(commentIds)` (`COUNT` agrupado em lote, per `social-interactions/TD-02`) e `findVideoReaction(userId, videoId)`/`findCommentReactions(userId, commentIds)` para o `viewerState`
5. Criar `src/reactions/reactions.module.ts` (`TypeOrmModule.forFeature([VideoReaction, CommentReaction, Video, Comment])`, exporta `ReactionsService`) e registrá-lo em `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `video-visibility.util.ts` | Unit: dono vê qualquer vídeo; anônimo só vê `ready` + publicado + `public`/`unlisted` | `src/videos/video-visibility.util.spec.ts` |
| `ReactionsService` | Unit: ramificações (vídeo/comentário inexistente, idempotência, troca de `type`) com repositório mockado | `src/reactions/reactions.service.spec.ts` |
| `ReactionsService` | Integration: upsert, unique, `COUNT` em lote e estado do espectador contra o banco real | `src/reactions/reactions.service.integration-spec.ts` |
| `ReactionsModule` | Unit: compilação do módulo (DI) | `src/reactions/reactions.module.spec.ts` |

**Dependencies:** SI-06.1 — entidades e migration

**Acceptance criteria:**

- Definir `like` duas vezes para o mesmo usuário e vídeo deixa um único registro em `video_reactions`; definir `dislike` em seguida troca o `type` desse mesmo registro
- Remover uma reação inexistente não lança erro
- Definir reação em vídeo que o solicitante não pode ver lança `VIDEO_NOT_FOUND`; em comentário inexistente lança `COMMENT_NOT_FOUND`
- `countVideoLikes` conta apenas reações `like`, agrupadas por vídeo, e devolve `0` para vídeos sem reação
- Os testes existentes de `VideosService.findOne` continuam passando após a extração do util de visibilidade

---

### SI-06.6 — Endpoints de reação em vídeos (PUT/DELETE /videos/{id}/reaction)

**Description:** Expor a reação do usuário a um vídeo como sub-recurso idempotente, autenticado e com `204`.

**Route:** PUT /videos/{id}/reaction, DELETE /videos/{id}/reaction
**Test Specs:** see `nestjs-project/specs/video-reactions.plan.md`
**Authorization:** Authenticated (Authorization Matrix)

**Technical actions:**

1. Criar `src/reactions/dto/set-reaction.dto.ts` (`SetReactionDto`: `type` obrigatório, enum `ReactionType`) com `class-validator` (contrato em `### API Contracts` → `PUT /videos/{id}/reaction`)
2. Criar `src/reactions/reactions.controller.ts` com `PUT /videos/:id/reaction` (corpo `SetReactionDto`) e `DELETE /videos/:id/reaction`, ambos `204` e usando `@CurrentUser()` (per `social-interactions/TD-03`)
3. Documentar os endpoints com `@ApiBearerAuth`, `@ApiOperation` e `@ApiResponse` (`204`, `400`, `401`, `404` com `ApiErrorEnvelope`) e registrar `ReactionsController` em `ReactionsModule`

**Tests:** _(empty — controller covered by E2E in the /plan-test-specs spec; no unit test per testing-guide)_

**Dependencies:** SI-06.5 — service de reações

**Acceptance criteria:**

- `PUT /videos/{id}/reaction` com `{ "type": "like" }` e token válido retorna `204` e o usuário passa a ter exatamente uma reação `like` no vídeo
- `PUT /videos/{id}/reaction` com `{ "type": "dislike" }` depois de um `like` retorna `204` e a reação passa a ser `dislike`, ainda única
- `DELETE /videos/{id}/reaction` retorna `204` e remove a reação; repetir a chamada também retorna `204`
- `PUT /videos/{id}/reaction` com `type` ausente ou fora de `like`/`dislike` retorna `400` com erro de validação
- Vídeo inexistente ou não visível retorna `404` com `VIDEO_NOT_FOUND`; sem token retorna `401`

---

### SI-06.7 — Endpoints de reação em comentários (PUT/DELETE /comments/{id}/reaction)

**Description:** Expor a reação do usuário a um comentário como sub-recurso idempotente, autenticado e com `204`.

**Route:** PUT /comments/{id}/reaction, DELETE /comments/{id}/reaction
**Test Specs:** see `nestjs-project/specs/comment-reactions.plan.md`
**Authorization:** Authenticated (Authorization Matrix)

**Technical actions:**

1. Em `ReactionsController`, criar `PUT /comments/:id/reaction` (corpo `SetReactionDto`) e `DELETE /comments/:id/reaction`, ambos `204` e usando `@CurrentUser()` (per `social-interactions/TD-03`; contrato em `### API Contracts` → `PUT /comments/{id}/reaction` e `DELETE /comments/{id}/reaction`)
2. Documentar os endpoints com `@ApiBearerAuth`, `@ApiOperation` e `@ApiResponse` (`204`, `400`, `401`, `404` com `ApiErrorEnvelope`)

**Tests:** _(empty — controller covered by E2E in the /plan-test-specs spec; no unit test per testing-guide)_

**Dependencies:** SI-06.6 — mesmo controller e DTO (a entidade `Comment` já existe desde SI-06.1)

**Acceptance criteria:**

- `PUT /comments/{id}/reaction` com `{ "type": "like" }` e token válido retorna `204` e o usuário passa a ter exatamente uma reação `like` no comentário
- `PUT /comments/{id}/reaction` com `dislike` depois de `like` retorna `204` e troca a reação, ainda única
- `DELETE /comments/{id}/reaction` retorna `204` e remove a reação; repetir também retorna `204`
- Comentário inexistente retorna `404` com `COMMENT_NOT_FOUND`
- `type` inválido retorna `400` com erro de validação; sem token retorna `401`

---

### SI-06.8 — CommentsService e CommentsModule

**Description:** Entregar a regra de negócio dos comentários: criação de comentário e resposta (profundidade máxima 2), listagem de topo e de respostas paginada por cursor, com contagens e estado do espectador agregados em lote.

**Technical actions:**

1. Criar `CommentDepthExceededException` (`COMMENT_DEPTH_EXCEEDED`, 400) e `InvalidCursorException` (`INVALID_CURSOR`, 400) em `src/common/exceptions/domain.exception.ts` conforme o Error Catalog
2. Criar `src/comments/comment-cursor.util.ts` com codificação/decodificação do cursor opaco (base64 de `created_at` + `id`) lançando `InvalidCursorException` em cursor malformado (per `social-interactions/TD-05`)
3. Criar `src/comments/comments.service.ts` com `create(userId, videoId, dto)`: valida o vídeo com `video-visibility.util.ts` (`VideoNotFoundException`), grava `body` como texto puro após `trim` (per `social-interactions/TD-09`) e, com `parentId`, exige comentário de topo do mesmo vídeo (`CommentNotFoundException` / `CommentDepthExceededException`) (per `social-interactions/TD-04`)
4. Em `CommentsService`, criar `listTopLevel(videoId, { cursor, limit }, viewerId?)` e `listReplies(commentId, { cursor, limit }, viewerId?)` (ordem `created_at DESC, id DESC`, `nextCursor` nulo na última página) devolvendo `CommentItem` com `likeCount`, `replyCount`, `author` (`channelName`, `channelNickname`) e `viewerState` via `ReactionsService`, mais `totalCount` do vídeo (`COUNT` incluindo respostas, per `social-interactions/TD-02`)
5. Criar `src/comments/comments.module.ts` (`TypeOrmModule.forFeature([Comment, Video, Channel])`, importa `ReactionsModule`, exporta `CommentsService`) e registrá-lo em `AppModule`

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `comment-cursor.util.ts` | Unit: ida e volta do cursor, cursor malformado lança `INVALID_CURSOR` | `src/comments/comment-cursor.util.spec.ts` |
| `CommentsService` | Unit: ramificações de profundidade, pai de outro vídeo, vídeo invisível, `trim` do corpo com repositório mockado | `src/comments/comments.service.spec.ts` |
| `CommentsService` | Integration: paginação por cursor sem repetir/pular itens, contagens e `viewerState` contra o banco real | `src/comments/comments.service.integration-spec.ts` |
| `CommentsModule` | Unit: compilação do módulo (DI) | `src/comments/comments.module.spec.ts` |

**Dependencies:** SI-06.1 — entidades; SI-06.5 — `ReactionsService` e util de visibilidade

**Acceptance criteria:**

- Criar comentário sem `parentId` grava um comentário de topo com o corpo sem espaços nas pontas e devolve `likeCount: 0` e `replyCount: 0`
- Criar comentário com `parentId` de uma resposta lança `COMMENT_DEPTH_EXCEEDED`; com `parentId` de outro vídeo ou inexistente lança `COMMENT_NOT_FOUND`
- `listTopLevel` devolve os comentários do mais recente para o mais antigo e, seguindo `nextCursor`, percorre todos sem repetir nem pular nenhum, mesmo com novos comentários inseridos entre as chamadas
- `listTopLevel` informa em `totalCount` o total de comentários do vídeo incluindo respostas e em `replyCount` o número de respostas de cada item de topo
- Cursor que não decodifica lança `INVALID_CURSOR`

---

### SI-06.9 — Endpoint POST /videos/{id}/comments

**Description:** Expor a criação de comentário de topo e de resposta ao vídeo, autenticada.

**Route:** POST /videos/{id}/comments
**Test Specs:** see `nestjs-project/specs/comments-create.plan.md`
**Authorization:** Authenticated (Authorization Matrix)

**Technical actions:**

1. Criar `src/comments/dto/create-comment.dto.ts` (`CreateCommentDto`: `body` obrigatório e não vazio após `trim`, `parentId` uuid opcional) com `class-validator` (contrato e limites em `### API Contracts` → `POST /videos/{id}/comments` e `#### Validation Rules`; o tamanho máximo segue a definição das Validation Rules)
2. Criar `src/comments/comments.controller.ts` com `POST /videos/:id/comments` (`201`, usa `@CurrentUser()`) devolvendo o `CommentItem` criado (per `social-interactions/TD-04`, `social-interactions/TD-09`)
3. Documentar o endpoint com `@ApiBearerAuth`, `@ApiOperation` e `@ApiResponse` (`201`, `400`, `401`, `404` com `ApiErrorEnvelope`) e registrar `CommentsController` em `CommentsModule`

**Tests:** _(empty — controller covered by E2E in the /plan-test-specs spec; no unit test per testing-guide)_

**Dependencies:** SI-06.8 — service de comentários

**Acceptance criteria:**

- `POST /videos/{id}/comments` com `{ "body": "texto" }` e token válido retorna `201` com o comentário (`id`, `parentId: null`, `body`, `author`, `likeCount: 0`, `replyCount: 0`)
- `POST /videos/{id}/comments` com `parentId` de um comentário de topo do mesmo vídeo retorna `201` com `parentId` preenchido
- `POST /videos/{id}/comments` com `parentId` de uma resposta retorna `400` com `COMMENT_DEPTH_EXCEEDED`; com `parentId` inexistente ou de outro vídeo retorna `404` com `COMMENT_NOT_FOUND`
- `POST /videos/{id}/comments` com `body` vazio ou só espaços retorna `400` com erro de validação
- Vídeo inexistente ou não visível retorna `404` com `VIDEO_NOT_FOUND`; sem token retorna `401`

---

### SI-06.10 — Endpoints de listagem GET /videos/{id}/comments e GET /comments/{id}/replies

**Description:** Expor a leitura pública, paginada por cursor, dos comentários de topo de um vídeo e das respostas de um comentário, com estado do espectador quando há token válido.

**Route:** GET /videos/{id}/comments, GET /comments/{id}/replies
**Test Specs:** see `nestjs-project/specs/comments-list.plan.md`
**Authorization:** Anonymous (autenticação opcional; `viewerState` só com token válido)

**Technical actions:**

1. Criar `src/comments/dto/list-comments.dto.ts` (`ListCommentsDto`: `cursor` string opcional, `limit` inteiro positivo opcional) com `class-validator`
2. Em `CommentsController`, criar `GET /videos/:id/comments` e `GET /comments/:id/replies` com `@Public()`, lendo `request.user` (preenchido pelo `JwtAuthGuard` só quando o token é válido) para o `viewerState`; devolver `{ items, nextCursor, totalCount }` e `{ items, nextCursor }` conforme `### API Contracts` (per `social-interactions/TD-05`, `social-interactions/TD-06`)
3. Documentar os endpoints com `@ApiOperation` e `@ApiResponse` (`200`, `400`, `404` com `ApiErrorEnvelope`) para o contrato OpenAPI

**Tests:** _(empty — controller covered by E2E in the /plan-test-specs spec; no unit test per testing-guide)_

**Dependencies:** SI-06.9 — mesmo controller

**Acceptance criteria:**

- `GET /videos/{id}/comments` sem token retorna `200` com `items` dos comentários de topo do mais recente ao mais antigo, `nextCursor`, `totalCount` e `viewerState: null` em todos os itens
- `GET /videos/{id}/comments` com token válido retorna `viewerState.reaction` preenchido nos comentários em que o usuário reagiu
- `GET /videos/{id}/comments` com token expirado retorna `200` anônimo (sem `401`), com `viewerState: null`
- `GET /videos/{id}/comments?cursor=<nextCursor>` retorna a página seguinte sem repetir itens; `nextCursor` é `null` na última página; `cursor` inválido retorna `400` com `INVALID_CURSOR`
- `GET /comments/{id}/replies` retorna as respostas do comentário de topo com `parentId` preenchido; comentário inexistente ou que é uma resposta retorna `404` com `COMMENT_NOT_FOUND`

---

### SI-06.11 — Contagens e viewerState em vídeo, canal e painel de gestão

**Description:** Enriquecer os endpoints existentes `GET /videos/{id}`, `GET /channels/{nickname}` e `GET /channels/{id}/manage/videos` com as contagens reais e o estado do espectador, trocando os placeholders `0` do painel.

**Route:** GET /videos/{id}, GET /channels/{nickname}, GET /channels/{id}/manage/videos
**Test Specs:** see `nestjs-project/specs/social-counts-viewer-state.plan.md`
**Authorization:** Anonymous nas duas leituras públicas (autenticação opcional para `viewerState`); Owner no painel de gestão

**Technical actions:**

1. Importar `ReactionsModule`, `SubscriptionsModule` e `CommentsModule` em `VideosModule`, e `SubscriptionsModule` em `ChannelsModule` (módulos sociais não importam `VideosModule`/`ChannelsModule`, então não há dependência circular)
2. Em `GET /videos/:id`, acrescentar `likeCount` (`ReactionsService.countVideoLikes`), `channelSubscriberCount` (`SubscriptionsService.countByChannelIds`) e `viewerState` (`reaction`, `subscribed`, `isChannelOwner`; `null` para anônimos) lido de `@CurrentUser()` opcional (per `social-interactions/TD-02`, `social-interactions/TD-06`; contrato em `### API Contracts` → `GET /videos/{id} — campos adicionados`)
3. Em `GET /channels/:nickname`, acrescentar `subscriberCount` e `viewerState` (`subscribed`, `isChannelOwner`; `null` para anônimos) (contrato em `### API Contracts` → `GET /channels/{nickname} — campos adicionados`)
4. Em `GET /channels/:id/manage/videos`, substituir os placeholders `likes: 0`/`comments: 0` por contagens reais em lote para a página (`ReactionsService.countVideoLikes` e novo `CommentsService.countByVideoIds`, comentários incluindo respostas) (contrato em `### API Contracts` → `GET /channels/{id}/manage/videos — campos substituídos`)
5. Atualizar os `@ApiResponse` dos três endpoints com os novos campos para o contrato OpenAPI

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `VideosService` / `VideosController` | Integration: `likeCount`, `channelSubscriberCount` e `viewerState` contra o banco real | `src/videos/videos.service.integration-spec.ts` |
| `ChannelsService` / `ChannelsController` | Integration: `subscriberCount` e `viewerState` contra o banco real | `src/channels/channels.service.integration-spec.ts` |
| `CommentsService.countByVideoIds` | Integration: contagem em lote incluindo respostas | `src/comments/comments.service.integration-spec.ts` |
| `VideosModule` | Unit: compilação do módulo com os novos imports (DI) | `src/videos/videos.module.spec.ts` |
| `ChannelsModule` | Unit: compilação do módulo com o novo import (DI) | `src/channels/channels.module.spec.ts` |

**Dependencies:** SI-06.2 — contagem de inscritos; SI-06.5 — contagem de likes; SI-06.8 — contagem de comentários

**Acceptance criteria:**

- `GET /videos/{id}` sem token retorna `200` com `likeCount`, `channelSubscriberCount` e `viewerState: null`
- `GET /videos/{id}` com token válido de usuário que deu `like` e é inscrito retorna `viewerState: { reaction: "like", subscribed: true, isChannelOwner: false }`; com o token do dono do canal retorna `isChannelOwner: true`
- `GET /videos/{id}` com token expirado retorna `200` anônimo, com `viewerState: null`
- `GET /channels/{nickname}` retorna `subscriberCount` igual ao número de inscrições do canal e `viewerState` conforme o token
- `GET /channels/{id}/manage/videos` retorna em `likes` e `comments` as contagens reais de cada vídeo da página (zero para vídeos sem interação) e mantém `views` como antes

---

### SI-06.12 — Sincronizar o contrato OpenAPI e os tipos do frontend

**Description:** Regenerar o `openapi.json` do backend com os endpoints sociais e propagar a cópia local e os tipos gerados ao frontend, para que o BFF e os mocks enxerguem o contrato novo.

**Technical actions:**

1. Rodar `docker compose exec nestjs-api npm run openapi:export` para regenerar `nestjs-project/openapi.json` com os endpoints e os campos novos da fase
2. Rodar `bash scripts/sync-openapi.sh` no host para copiar o contrato a `next-frontend/openapi.json`
3. Rodar `docker compose exec next-frontend npm run openapi:types` para regenerar `next-frontend/lib/api/types.gen.ts`
4. Rodar `docker compose exec next-frontend npx tsc --noEmit` e corrigir os consumidores que quebrarem com os campos novos de `GET /videos/{id}` e `GET /channels/{nickname}`
5. Commitar `nestjs-project/openapi.json`, `next-frontend/openapi.json` e `next-frontend/lib/api/types.gen.ts` no mesmo PR (per `next-frontend-openapi-typing/TD-03`)

**Tests:** _(empty — Infra)_

**Dependencies:** SI-06.3, SI-06.4, SI-06.6, SI-06.7, SI-06.9, SI-06.10, SI-06.11 — todos os endpoints precisam existir no backend antes de o contrato ser exportado

**Acceptance criteria:**

- `next-frontend/openapi.json` contém os caminhos `/channels/{nickname}/subscription`, `/subscriptions`, `/subscriptions/videos`, `/videos/{id}/reaction`, `/comments/{id}/reaction`, `/videos/{id}/comments` e `/comments/{id}/replies`
- `next-frontend/lib/api/types.gen.ts` expõe esses caminhos em `paths` e os campos `likeCount`, `channelSubscriberCount`, `subscriberCount` e `viewerState`
- `docker compose exec next-frontend npx tsc --noEmit` termina com código 0
- `git diff --exit-code` após repetir os passos 1 a 3 não mostra diferenças nos três arquivos (spec e tipos em sincronia)

---

### SI-06.13 — authedUpstream com PUT/DELETE e leitura autenticada opcional

**Description:** Estender o cliente autenticado do BFF para as mutações idempotentes `PUT`/`DELETE` e criar a leitura com autenticação opcional usada pelas telas públicas para buscar o estado do espectador.

**Technical actions:**

1. Em `lib/api/authed-upstream.ts`, incluir `PUT` e `DELETE` em `UpstreamMethods` e em `authedUpstream()`, reaproveitando `withAuthHeader` e o ciclo de refresh de `callAuthed` (per `social-interactions/TD-03`)
2. Criar `lib/api/optional-authed-upstream.ts` (`import "server-only"`): lê a sessão sem lançar nem redirecionar; com `isLoggedIn` anexa `Authorization: Bearer <accessToken>`, sem sessão chama o `upstream` anônimo. Em Route Handlers usa `withRefresh` quando há sessão; em RSC não escreve cookie, então token expirado cai no anônimo (`viewerState: null`) (per `social-interactions/TD-06`, revisão de 2026-10-08)
3. Confirmar em `app/api/__tests__/route-handlers-guard.test.ts` que as novas rotas de mutação exigem `requireSession` e que as leituras `GET` públicas não precisam de exceção; ajustar `ANONYMOUS_MUTATION_EXEMPTIONS` somente se alguma mutação anônima nova existir (não existe nesta fase)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `authedUpstream` | Integration (MSW): `PUT`/`DELETE` anexam o bearer e fazem refresh e retry em `401` | `lib/api/__tests__/authed-upstream.integration.test.ts` |
| `optionalAuthedUpstream` | Integration (MSW): com sessão envia o bearer, sem sessão chama anônimo, token expirado em RSC não redireciona | `lib/api/__tests__/optional-authed-upstream.integration.test.ts` |
| Route handlers guard | Unit: varredura de `requireSession` nas rotas de mutação novas | `app/api/__tests__/route-handlers-guard.test.ts` |

**Dependencies:** none

**Acceptance criteria:**

- `authedUpstream({ routeHandler: true }).PUT(...)` e `.DELETE(...)` enviam `Authorization: Bearer <accessToken da sessão>` ao upstream e, em `401`, renovam a sessão uma única vez e repetem a chamada
- `optionalAuthedUpstream` com sessão logada envia o bearer da sessão; sem sessão envia a requisição sem `Authorization`
- `optionalAuthedUpstream` chamado de um Server Component com token expirado devolve a resposta anônima do upstream sem redirecionar nem lançar
- A varredura `route-handlers-guard` falha se uma rota de mutação nova não chamar `requireSession`

---

### SI-06.14 — Aliases de contrato e handlers MSW das interações sociais

**Description:** Dar aos consumidores nomes tipados para os shapes sociais e cobrir cada endpoint novo com handlers MSW determinísticos, para que os testes do BFF e os E2E não encontrem requisições sem handler.

**Technical actions:**

1. Em `lib/api/contracts.ts`, acrescentar os aliases passa-direto `CommentItem`, `CommentList`, `CommentReplies`, `SubscriptionList`, `SubscriptionFeed`, `SetReactionDto` e `CreateCommentDto`, indexando `paths` (per `next-frontend-openapi-typing/TD-04`)
2. Criar `mocks/factories/social.ts` com `buildCommentItem`, `buildCommentList`, `buildSubscriptionItem` e `buildSubscriptionFeed`, e estender `mocks/factories/video.ts` com `likeCount`, `channelSubscriberCount` e `viewerState` (e o factory de canal com `subscriberCount` e `viewerState`), todos tipados via `paths` (per `next-frontend-openapi-typing/TD-05`)
3. Criar `mocks/handlers/social.ts` com um handler por endpoint novo (`PUT`/`DELETE` de reação e de inscrição, `GET`/`POST` de comentários, `GET` de respostas, `GET /subscriptions`, `GET /subscriptions/videos`) e registrá-lo em `mocks/handlers/index.ts`; gatilhos reservados para erro e estado (`comment-not-found-id` → `404 COMMENT_NOT_FOUND`, nickname `own-channel` → `403 CANNOT_SUBSCRIBE_OWN_CHANNEL` no `PUT` e `viewerState.isChannelOwner: true` nas leituras do canal e dos vídeos desse canal, para os specs de dono) sem colidir com valores de outros domínios (per `next-frontend-msw-foundation/TD-01`, `next-frontend-msw-foundation/TD-04`)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `mocks/handlers/social.ts` | Unit: cada handler responde o status e o shape tipado esperados, incluindo os gatilhos de erro | `mocks/handlers/__tests__/social.test.ts` |

**Dependencies:** SI-06.12 — os tipos gerados precisam conter os caminhos novos

**Acceptance criteria:**

- `npx tsc --noEmit` termina sem erro com os aliases, factories e handlers novos
- Cada endpoint novo do contrato tem um handler MSW; uma requisição a eles em teste não falha com `request unhandled`
- O handler de comentários devolve `{ items, nextCursor, totalCount }` e o de respostas `{ items, nextCursor }` com o mesmo shape tipado do contrato
- O gatilho `comment-not-found-id` devolve `404` com `COMMENT_NOT_FOUND` e o nickname `own-channel` devolve `403` com `CANNOT_SUBSCRIBE_OWN_CHANNEL`

---

### SI-06.15 — Route Handlers BFF de reação em vídeos e comentários

**Description:** Expor ao navegador as mutações de reação por Route Handlers same-origin que fazem proxy autenticado ao upstream.

**Technical actions:**

1. Criar `app/api/videos/[id]/reaction/route.ts` com `PUT` e `DELETE`: `requireSession({ routeHandler: true })`, depois `authedUpstream({ routeHandler: true }).PUT`/`.DELETE` em `/videos/{id}/reaction`; devolver `204` sem corpo e repassar o envelope de erro do upstream com seu status (per `### API Contracts` → BFF tier `PUT /api/videos/{id}/reaction`, `DELETE /api/videos/{id}/reaction`; `social-interactions/TD-03`)
2. Criar `app/api/comments/[id]/reaction/route.ts` com `PUT` e `DELETE` pelo mesmo padrão, em `/comments/{id}/reaction` (per `### API Contracts` → BFF tier `PUT /api/comments/{id}/reaction`, `DELETE /api/comments/{id}/reaction`)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/videos/[id]/reaction/route.ts` | Integration (MSW): `204` em sucesso, repasse de `404 VIDEO_NOT_FOUND` e `400`, `401` sem sessão | `app/api/videos/[id]/reaction/__tests__/route.integration.test.ts` |
| `app/api/comments/[id]/reaction/route.ts` | Integration (MSW): `204` em sucesso, repasse de `404 COMMENT_NOT_FOUND` e `400`, `401` sem sessão | `app/api/comments/[id]/reaction/__tests__/route.integration.test.ts` |

**Dependencies:** SI-06.13 — `authedUpstream` com `PUT`/`DELETE`; SI-06.14 — aliases e handlers MSW

**Acceptance criteria:**

- `PUT /api/videos/{id}/reaction` com sessão válida e `{ "type": "like" }` retorna `204` e o upstream recebe `PUT /videos/{id}/reaction` com o bearer da sessão
- `DELETE /api/videos/{id}/reaction` com sessão válida retorna `204`
- `PUT /api/comments/{id}/reaction` e `DELETE /api/comments/{id}/reaction` se comportam da mesma forma sobre `/comments/{id}/reaction`
- Qualquer das quatro rotas sem sessão retorna `401` com `{ statusCode: 401, error: "UNAUTHORIZED", message }` e não chama o upstream
- Um `404` do upstream (`VIDEO_NOT_FOUND`/`COMMENT_NOT_FOUND`) é repassado com o mesmo status e envelope

---

### SI-06.16 — Route Handler BFF de inscrição em canais

**Description:** Expor ao navegador a inscrição e o cancelamento por um Route Handler same-origin com proxy autenticado ao upstream.

**Technical actions:**

1. Criar `app/api/channels/[nickname]/subscription/route.ts` com `PUT` e `DELETE`: `requireSession({ routeHandler: true })`, depois `authedUpstream({ routeHandler: true }).PUT`/`.DELETE` em `/channels/{nickname}/subscription`; devolver `204` sem corpo e repassar o envelope de erro do upstream com seu status (per `### API Contracts` → BFF tier `PUT /api/channels/{nickname}/subscription`, `DELETE /api/channels/{nickname}/subscription`; `social-interactions/TD-03`)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/channels/[nickname]/subscription/route.ts` | Integration (MSW): `204` em sucesso, repasse de `404 CHANNEL_NOT_FOUND` e `403 CANNOT_SUBSCRIBE_OWN_CHANNEL`, `401` sem sessão | `app/api/channels/[nickname]/subscription/__tests__/route.integration.test.ts` |

**Dependencies:** SI-06.13 — `authedUpstream` com `PUT`/`DELETE`; SI-06.14 — aliases e handlers MSW

**Acceptance criteria:**

- `PUT /api/channels/{nickname}/subscription` com sessão válida retorna `204` e o upstream recebe `PUT /channels/{nickname}/subscription` com o bearer da sessão
- `DELETE /api/channels/{nickname}/subscription` com sessão válida retorna `204`
- Sem sessão, as duas rotas retornam `401` com `{ statusCode: 401, error: "UNAUTHORIZED", message }` e não chamam o upstream
- `403 CANNOT_SUBSCRIBE_OWN_CHANNEL` e `404 CHANNEL_NOT_FOUND` do upstream são repassados com o mesmo status e envelope

---

### SI-06.17 — Route Handlers BFF de comentários e respostas

**Description:** Expor ao navegador a criação de comentário, o "carregar mais" da lista e o carregamento de respostas por Route Handlers same-origin, com autenticação opcional nas leituras.

**Technical actions:**

1. Criar `app/api/videos/[id]/comments/route.ts` com `POST`: `requireSession({ routeHandler: true })`, depois `authedUpstream({ routeHandler: true }).POST` em `/videos/{id}/comments` com o corpo `CreateCommentDto`; devolver `201` com o `CommentItem` e repassar o envelope de erro com seu status (per `### API Contracts` → BFF tier `POST /api/videos/{id}/comments`)
2. No mesmo arquivo, criar `GET` anônimo com autenticação opcional via `optionalAuthedUpstream` em `/videos/{id}/comments`, repassando `cursor` e `limit` e devolvendo `{ items, nextCursor, totalCount }`; sem sessão ou com token expirado devolve a lista anônima, nunca `401` (per `### API Contracts` → BFF tier `GET /api/videos/{id}/comments`; `social-interactions/TD-06`)
3. Criar `app/api/comments/[id]/replies/route.ts` com `GET` pelo mesmo padrão de autenticação opcional, em `/comments/{id}/replies`, devolvendo `{ items, nextCursor }` (per `### API Contracts` → BFF tier `GET /api/comments/{id}/replies`)

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `app/api/videos/[id]/comments/route.ts` | Integration (MSW): `POST` `201`/erros repassados/`401` sem sessão; `GET` anônimo, com sessão e com cursor | `app/api/videos/[id]/comments/__tests__/route.integration.test.ts` |
| `app/api/comments/[id]/replies/route.ts` | Integration (MSW): `GET` anônimo e com sessão, repasse de `404 COMMENT_NOT_FOUND` | `app/api/comments/[id]/replies/__tests__/route.integration.test.ts` |

**Dependencies:** SI-06.13 — `authedUpstream` e `optionalAuthedUpstream`; SI-06.14 — aliases e handlers MSW

**Acceptance criteria:**

- `POST /api/videos/{id}/comments` com sessão válida e `{ "body": "texto" }` retorna `201` com o comentário criado
- `POST /api/videos/{id}/comments` sem sessão retorna `401` com `{ statusCode: 401, error: "UNAUTHORIZED", message }` e não chama o upstream
- `POST /api/videos/{id}/comments` repassa `400 COMMENT_DEPTH_EXCEEDED`, `404 COMMENT_NOT_FOUND` e `404 VIDEO_NOT_FOUND` do upstream com o mesmo status
- `GET /api/videos/{id}/comments?cursor=...` sem sessão retorna `200` com `{ items, nextCursor, totalCount }`, sem `Authorization` no upstream e sem redirecionar
- `GET /api/videos/{id}/comments` com sessão logada envia o bearer ao upstream; `GET /api/comments/{id}/replies` retorna `200` com `{ items, nextCursor }` e repassa `404 COMMENT_NOT_FOUND`

---

### SI-06.18.0 — Drift audit: Página de visualização do vídeo

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página de visualização do vídeo`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219
   - Reused DS components: [`components/ui/button.tsx`, `components/ui/avatar.tsx`, `components/ui/input.tsx`, `components/icons/thumbs-up-icon.tsx`, `components/icons/thumbs-down-icon.tsx`]
   - Server-connected component names (no endpoints/auth/errors): [`VideoReactionButtons`, `SubscribeButton`, `CommentsSection`, `CommentForm`, `CommentItem`, `CommentReactionButtons`]
   - Target paths (read-only context for audit; no writes here): `app/watch/[id]/page.tsx` + `components/watch/video-reaction-buttons.tsx` + `components/social/subscribe-button.tsx` + `components/social/comments-section.tsx` + `components/social/comment-form.tsx` + `components/social/comment-item.tsx` + `components/social/comment-reaction-buttons.tsx`

   For each component in the Reused DS list, perform value-level diff against the file on disk and classify per the 4-value status enum (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`). Compose Decision per default policy (see `.claude/skills/plan-build/references/frontend-drift-report-schema.md` § Default decisions per status). Read prior sections of `frontend-drift-report.md` to build `prior_decisions`; populate `Prior` column with CONFLICT detection (executed by `/implement` per its SKILL.md cross-screen consultation algorithm). Write a `## Screen: watch-page-social — audited at SI-06.18.0 ({YYYY-MM-DD})` section to `frontend-drift-report.md` (append on first run, overwrite-in-place on re-run). **No code edits — verifiable via `git diff` at SI end.**

**Dependencies:** SI-06.0.1 — o audit lê `thumbs-down-icon.tsx` do disco

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` exists in the plan folder; section `## Screen: watch-page-social` exists with the current run's date in heading (appended on first run, overwritten in place on re-run per schema § Section ownership and update discipline).
- Every component in the Reused DS list has exactly one row in the table.
- Every row has a Decision column populated:
  - `alinhado` → `skip`
  - `drift menor` → `auto-Edit "<specifics>"` or `exception "<reason>"`
  - `drift relevante` → `auto-Edit "<specifics>"`, `exception "<reason>"`, or `CONFLICT: <one-liner>; <verb> "<specifics>"` (CONFLICT only when `prior_decisions` diverges; on CONFLICT rows `<verb>` is `auto-Edit` (default) or `exception` (override) — `create` and `skip` are categorically incompatible with `drift relevante`)
  - `componente ausente` → `create`
- Every `exception` decision carries a one-liner justification.
- `git diff --name-only HEAD -- next-frontend` after the SI is empty (no code touched in target subproject; the report file lives outside `next-frontend` and is excluded from the scoped check by construction).

---

### SI-06.18a — Tela de visualização do vídeo (visual shell)

**Route:** /watch/[id]
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página de visualização do vídeo`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: watch-page-social`

**Technical actions:**

1. **Apply drift decisions** — read the Drift Report section for this screen. For each row, parse the Decision column and apply per the verb body:
   - `auto-Edit "<specifics>"` → apply `Edit` on the named DS file with the documented specifics
   - `create` → create the file (icons via Figma asset; components per spec)
   - `exception` / `skip` → no-op
   - `CONFLICT: <one-liner>; <verb> "<specifics>"` → strip the `CONFLICT: <one-liner>;` prefix (informational only) and apply the verb body per the rules above (`<verb>` is `auto-Edit` or `exception` on CONFLICT rows; `create`/`skip` cannot appear here per schema § Decision)

   No drift detection or auto-judgment in this step. The audit-SI did the analysis; this step is mechanical application.

2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219
   - Reused DS components: [`components/ui/button.tsx`, `components/ui/avatar.tsx`, `components/ui/input.tsx`, `components/icons/thumbs-up-icon.tsx`, `components/icons/thumbs-down-icon.tsx`] _(now reflecting any DS edits from action 1)_
   - Server-connected component names (no endpoints/auth/errors): [`VideoReactionButtons`, `SubscribeButton`, `CommentsSection`, `CommentForm`, `CommentItem`, `CommentReactionButtons`]
   - Target paths: `app/watch/[id]/page.tsx` + `components/watch/video-reaction-buttons.tsx` + `components/watch/channel-info.tsx` (slot do Subscribe) + `components/social/subscribe-button.tsx` + `components/social/comments-section.tsx` + `components/social/comment-form.tsx` + `components/social/comment-item.tsx` + `components/social/comment-reaction-buttons.tsx`

**Dependencies:** SI-06.18.0 + SI-06.0.1

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-Xb; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- All target paths exist, export expected components, and compile per `npx tsc --noEmit` and `npm run lint` in `next-frontend`.
- Rendering matches Figma node fidelity within tolerance of DS component set.
- No runtime imports beyond Reused DS list (stays visually scoped).

---

### SI-06.18b — Tela de visualização do vídeo (lógica & wiring: reações e inscrição)

**Test Specs:** see `next-frontend/specs/watch-page-reactions-subscribe.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página de visualização do vídeo`

**Technical actions:**

1. **Rendering strategy e leitura do estado do espectador** — em `app/watch/[id]/page.tsx` (Server Component dinâmico, sem `requireSession()`), trocar a leitura de `GET /videos/{id}` para `optionalAuthedUpstream`, obtendo `likeCount`, `channelSubscriberCount` e `viewerState`; repassar esses dados a `VideoReactionButtons` e `ChannelInfo` (per `social-interactions/TD-06`)
2. **Formatador de contagem** — criar `lib/format-count.ts` com a contagem compacta (`Intl.NumberFormat` notation compacta, ex.: `1.2K`) e o separador de milhar (ex.: `4,256`), reutilizado nas telas de vídeo e canal
3. **VideoReactionButtons** — implementar `components/watch/video-reaction-buttons.tsx` como Client Component: `useOptimistic` para ícone ativo e contagem, `fetch` para `PUT`/`DELETE /api/videos/{id}/reaction` (clicar na reação ativa chama `DELETE`), `router.refresh()` ao concluir e reversão em falha; `aria-pressed` e `aria-label` (per `social-interactions/TD-08`; endpoints em `### API Contracts` → BFF tier)
4. **SubscribeButton** — implementar `components/social/subscribe-button.tsx` como Client Component reutilizável pela tela do canal: `useOptimistic` alternando "Inscrever-se"/"Inscrito" (variante secondary), `fetch` para `PUT`/`DELETE /api/channels/{nickname}/subscription`, oculto quando `viewerState.isChannelOwner`; encaixá-lo no slot de `components/watch/channel-info.tsx`, que também passa a exibir `channelSubscriberCount` com o formatador (per `social-interactions/TD-08`)
5. **Error mapping e visitante anônimo** — por UI Contract `**Error Catalog → UX mapping:**`, tratar `401 UNAUTHORIZED` redirecionando para `/login?next=<caminho atual>` e visitante sem sessão (sessão do `SessionProvider`) redirecionando antes de chamar a API; falhas revertem o estado otimista

**Dependencies:**

- `SI-06.18a` (visual shell must exist before wiring).
- Backend SIs: `SI-06.11` (campos `likeCount`, `channelSubscriberCount`, `viewerState`), `SI-06.6` e `SI-06.3` (reação e inscrição), expostos ao frontend por `SI-06.12`.
- BFF/infra SIs: `SI-06.13` (`optionalAuthedUpstream`), `SI-06.14` (aliases e mocks), `SI-06.15` (BFF de reação), `SI-06.16` (BFF de inscrição).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/watch/video-reaction-buttons.tsx` | Unit per testing-guide-next-frontend § "Client Components" — alternância otimista, `DELETE` ao desativar, reversão em falha, redirect no `401` | `components/watch/__tests__/video-reaction-buttons.test.tsx` |
| `components/social/subscribe-button.tsx` | Unit per testing-guide-next-frontend § "Client Components" — alternância otimista, oculto para o dono, redirect para visitante anônimo | `components/social/__tests__/subscribe-button.test.tsx` |
| `components/watch/channel-info.tsx` | Unit per testing-guide-next-frontend § "Client Components" — slot do Subscribe e contagem de inscritos compacta | `components/watch/__tests__/channel-info.test.tsx` |
| `lib/format-count.ts` | Unit: contagem compacta e separador de milhar | `lib/__tests__/format-count.test.ts` |

E2E for the page (anonymous rendering, login redirect on click, owner hiding Subscribe) is authored externally by `/plan-test-specs` in the spec file referenced by `**Test Specs:**` above and consumed JIT by `/implement` Step 3. /plan-build does NOT emit E2E rows here. Page-level Unit testing is excluded by `testing-guide-next-frontend` artifact rule "Pages → E2E only".

**Acceptance criteria:**

- Um visitante anônimo abre `/watch/{id}` e vê a contagem de likes e a de inscritos, sem ser redirecionado para `/login`
- Um usuário logado que clica em like vê o ícone preenchido e a contagem subir imediatamente; `PUT /api/videos/{id}/reaction` é chamado com `{ "type": "like" }` e, ao clicar de novo, `DELETE /api/videos/{id}/reaction`
- Um usuário logado que clica em Subscribe vê o botão virar "Inscrito" e a contagem de inscritos subir; `PUT /api/channels/{nickname}/subscription` é chamado
- O dono do canal do vídeo não vê o botão Subscribe
- Um visitante anônimo que clica em like, dislike ou Subscribe é levado a `/login?next=/watch/{id}` sem chamada à API
- Quando a API responde erro à mutação, o estado volta ao anterior e a página é reconciliada por `router.refresh()`

---

### SI-06.18c — Tela de visualização do vídeo (lógica & wiring: comentários) (auto-split from SI-06.18b by /plan-build)

_Auto-split rationale: original SI-06.18b would have 9 Technical actions (reações, inscrição e a seção de comentários com formulário, respostas e reações de comentário); split per "complex state setup" — a seção de comentários forma um bloco de estado próprio (lista acumulada por cursor, respostas sob demanda, formulário inline)._

**Test Specs:** see `next-frontend/specs/watch-page-comments.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página de visualização do vídeo`

**Technical actions:**

1. **Primeira página de comentários no RSC** — em `app/watch/[id]/page.tsx`, ler `GET /videos/{id}/comments` com `optionalAuthedUpstream` em paralelo ao vídeo e passar `items`, `nextCursor` e `totalCount` a `CommentsSection`; comentários continuam públicos para anônimos (per `social-interactions/TD-05`, `social-interactions/TD-06`)
2. **CommentsSection** — implementar `components/social/comments-section.tsx` como Client Component: cabeçalho com o total formatado (heading), rótulo estático "Mais recentes" (sem menu), lista acumulada, botão "carregar mais" que chama `GET /api/videos/{id}/comments?cursor=<nextCursor>` e desabilita enquanto pendente, estado vazio em texto muted (per `social-interactions/TD-05`)
3. **CommentForm** — implementar `components/social/comment-form.tsx`: avatar + input, envio para `POST /api/videos/{id}/comments` com `{ body, parentId? }`, validação espelhada (`body` não vazio após `trim`; limite conforme Validation Rules), insere o comentário criado na lista, visitante anônimo redireciona para `/login?next=<caminho atual>` (per `social-interactions/TD-09`)
4. **CommentItem e respostas** — implementar `components/social/comment-item.tsx`: autor, tempo relativo, corpo como texto puro escapado, `ReplyButton` que abre `CommentForm` inline com `parentId`, e toggle "Ver N respostas" que carrega `GET /api/comments/{id}/replies` sob demanda com o mesmo "carregar mais"; sem botão Reply nas respostas (profundidade máxima 2) (per `social-interactions/TD-04`)
5. **CommentReactionButtons** — implementar `components/social/comment-reaction-buttons.tsx`: like com contagem simples e dislike sem contagem, `useOptimistic`, `PUT`/`DELETE /api/comments/{id}/reaction`, `aria-pressed`, `router.refresh()` e reversão em falha (per `social-interactions/TD-08`)

**Dependencies:**

- `SI-06.18a` (visual shell must exist before wiring) e `SI-06.18b` (mesma página; `page.tsx` e o formatador de contagem já wired).
- Backend SIs: `SI-06.9` e `SI-06.10` (criar e listar comentários), `SI-06.7` (reação em comentário), expostos ao frontend por `SI-06.12`.
- BFF/infra SIs: `SI-06.14` (aliases e mocks), `SI-06.15` (BFF de reação) e `SI-06.17` (BFF de comentários e respostas).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/social/comments-section.tsx` | Unit per testing-guide-next-frontend § "Client Components" — total formatado, "carregar mais" acumulando por cursor, estado vazio | `components/social/__tests__/comments-section.test.tsx` |
| `components/social/comment-form.tsx` | Unit per testing-guide-next-frontend § "Client Components" — envio com `parentId`, validação de corpo vazio, redirect do visitante anônimo | `components/social/__tests__/comment-form.test.tsx` |
| `components/social/comment-item.tsx` | Unit per testing-guide-next-frontend § "Client Components" — toggle de respostas sob demanda, Reply só em comentário de topo, texto escapado | `components/social/__tests__/comment-item.test.tsx` |
| `components/social/comment-reaction-buttons.tsx` | Unit per testing-guide-next-frontend § "Client Components" — alternância otimista, `DELETE` ao desativar, reversão em falha | `components/social/__tests__/comment-reaction-buttons.test.tsx` |

E2E for the page (anonymous reading, posting a comment, replying, loading more) is authored externally by `/plan-test-specs` in the spec file referenced by `**Test Specs:**` above and consumed JIT by `/implement` Step 3. /plan-build does NOT emit E2E rows here.

**Acceptance criteria:**

- Um visitante anônimo abre `/watch/{id}` e vê o total de comentários e a primeira página de comentários, com likes por comentário, sem ser redirecionado para `/login`
- Clicar em "carregar mais" chama `GET /api/videos/{id}/comments?cursor=<nextCursor>` e acrescenta os itens seguintes sem repetir os já exibidos; na última página o botão não aparece
- Um usuário logado que envia `{ body }` válido vê o novo comentário no topo da lista; um corpo vazio ou só espaços é bloqueado antes do envio
- Clicar em Reply num comentário de topo abre o formulário inline, e enviar cria uma resposta (`parentId` preenchido) listada ao expandir "Ver N respostas"; respostas não têm botão Reply
- Um texto de comentário com marcação HTML é exibido literalmente, sem ser interpretado
- Like e dislike de comentário atualizam ícone e contagem imediatamente, chamam `PUT`/`DELETE /api/comments/{id}/reaction` e revertem se a API falhar; para visitante anônimo levam a `/login?next=/watch/{id}`

---

### SI-06.19.0 — Drift audit: Página pública do canal

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página pública do canal`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926
   - Reused DS components: [`components/channel/channel-header.tsx`, `components/ui/button.tsx`]
   - Server-connected component names (no endpoints/auth/errors): [`ChannelHeader`, `SubscribeButton`, `SubscriberCount`]
   - Target paths (read-only context for audit; no writes here): `app/channel/[nickname]/page.tsx` + `components/channel/channel-header.tsx`

   For each component in the Reused DS list, perform value-level diff against the file on disk and classify per the 4-value status enum (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`). Compose Decision per default policy (see `.claude/skills/plan-build/references/frontend-drift-report-schema.md` § Default decisions per status). Read prior sections of `frontend-drift-report.md` to build `prior_decisions`; populate `Prior` column with CONFLICT detection (executed by `/implement` per its SKILL.md cross-screen consultation algorithm). Write a `## Screen: channel-page-social — audited at SI-06.19.0 ({YYYY-MM-DD})` section to `frontend-drift-report.md` (append on first run, overwrite-in-place on re-run). **No code edits — verifiable via `git diff` at SI end.**

**Dependencies:** none

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` exists in the plan folder; section `## Screen: channel-page-social` exists with the current run's date in heading (appended on first run, overwritten in place on re-run per schema § Section ownership and update discipline).
- Every component in the Reused DS list has exactly one row in the table.
- Every row has a Decision column populated:
  - `alinhado` → `skip`
  - `drift menor` → `auto-Edit "<specifics>"` or `exception "<reason>"`
  - `drift relevante` → `auto-Edit "<specifics>"`, `exception "<reason>"`, or `CONFLICT: <one-liner>; <verb> "<specifics>"` (CONFLICT only when `prior_decisions` diverges; on CONFLICT rows `<verb>` is `auto-Edit` (default) or `exception` (override) — `create` and `skip` are categorically incompatible with `drift relevante`)
  - `componente ausente` → `create`
- Every `exception` decision carries a one-liner justification.
- `git diff --name-only HEAD -- next-frontend` after the SI is empty (no code touched in target subproject; the report file lives outside `next-frontend` and is excluded from the scoped check by construction).

---

### SI-06.19a — Página pública do canal (visual shell)

**Route:** /channel/[nickname]
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página pública do canal`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: channel-page-social`

**Technical actions:**

1. **Apply drift decisions** — read the Drift Report section for this screen. For each row, parse the Decision column and apply per the verb body:
   - `auto-Edit "<specifics>"` → apply `Edit` on the named DS file with the documented specifics
   - `create` → create the file (icons via Figma asset; components per spec)
   - `exception` / `skip` → no-op
   - `CONFLICT: <one-liner>; <verb> "<specifics>"` → strip the `CONFLICT: <one-liner>;` prefix (informational only) and apply the verb body per the rules above (`<verb>` is `auto-Edit` or `exception` on CONFLICT rows; `create`/`skip` cannot appear here per schema § Decision)

   No drift detection or auto-judgment in this step. The audit-SI did the analysis; this step is mechanical application.

2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926
   - Reused DS components: [`components/channel/channel-header.tsx`, `components/ui/button.tsx`] _(now reflecting any DS edits from action 1)_
   - Server-connected component names (no endpoints/auth/errors): [`ChannelHeader`, `SubscribeButton`, `SubscriberCount`]
   - Target paths: `app/channel/[nickname]/page.tsx` + `components/channel/channel-header.tsx` (linha de meta com a contagem de inscritos e o slot do Subscribe)

**Dependencies:** SI-06.19.0

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-Xb; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- All target paths exist, export expected components, and compile per `npx tsc --noEmit` and `npm run lint` in `next-frontend`.
- Rendering matches Figma node fidelity within tolerance of DS component set.
- No runtime imports beyond Reused DS list (stays visually scoped).

---

### SI-06.19b — Página pública do canal (lógica & wiring)

**Test Specs:** see `next-frontend/specs/channel-page-subscribe.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página pública do canal`

**Technical actions:**

1. **Rendering strategy e leitura do estado do espectador** — em `app/channel/[nickname]/page.tsx` (Server Component dinâmico, sem `requireSession()`), trocar a leitura de `GET /channels/{nickname}` para `optionalAuthedUpstream`, obtendo `subscriberCount` e `viewerState`, e passá-los a `ChannelHeader` (per `social-interactions/TD-06`)
2. **Contagem de inscritos** — em `components/channel/channel-header.tsx`, exibir `SubscriberCount` (texto "N subscribers") na linha de meta com `lib/format-count.ts`, dentro de região `aria-live="polite"` para refletir a atualização após a mutação (per `social-interactions/TD-02`)
3. **Subscribe no cabeçalho** — encaixar o `SubscribeButton` de `components/social/subscribe-button.tsx` (criado em SI-06.18b) na linha do cabeçalho, oculto para o dono do canal (`viewerState.isChannelOwner`), com `router.refresh()` atualizando a contagem (per `social-interactions/TD-08`; endpoints em `### API Contracts` → BFF tier)
4. **Error mapping e visitante anônimo** — por UI Contract `**Error Catalog → UX mapping:**`, `401 UNAUTHORIZED` e visitante sem sessão redirecionam para `/login?next=<caminho atual>`; falha da mutação reverte o estado otimista

**Dependencies:**

- `SI-06.19a` (visual shell must exist before wiring) e `SI-06.18b` (`SubscribeButton` e `lib/format-count.ts`).
- Backend SIs: `SI-06.11` (`subscriberCount` e `viewerState` em `GET /channels/{nickname}`) e `SI-06.3` (inscrição), expostos ao frontend por `SI-06.12`.
- BFF/infra SIs: `SI-06.13` (`optionalAuthedUpstream`), `SI-06.14` (aliases e mocks) e `SI-06.16` (BFF de inscrição).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/channel/channel-header.tsx` | Unit per testing-guide-next-frontend § "Client Components" — contagem compacta, Subscribe oculto para o dono, `aria-live` na contagem | `components/channel/__tests__/channel-header.test.tsx` |

E2E for the page (anonymous view with count, login redirect on Subscribe, owner view without the button) is authored externally by `/plan-test-specs` in the spec file referenced by `**Test Specs:**` above and consumed JIT by `/implement` Step 3. /plan-build does NOT emit E2E rows here.

**Acceptance criteria:**

- Um visitante anônimo abre `/channel/{nickname}` e vê a contagem de inscritos em notação compacta, sem ser redirecionado para `/login`
- Um usuário logado que ainda não segue o canal vê "Inscrever-se"; ao clicar, o botão vira "Inscrito" e a contagem sobe imediatamente, com `PUT /api/channels/{nickname}/subscription`
- Clicar em "Inscrito" volta para "Inscrever-se" e a contagem desce, com `DELETE /api/channels/{nickname}/subscription`
- O dono do canal abrindo a própria página não vê o botão Subscribe
- Um visitante anônimo que clica em Subscribe é levado a `/login?next=/channel/{nickname}` sem chamada à API

---

### SI-06.20.0 — Drift audit: Menu lateral (Left Menu)

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Menu lateral (Left Menu)`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959
   - Reused DS components: [`components/layout/side-nav-subscription-list.tsx`, `components/layout/subscription-nav-item.tsx`, `components/ui/avatar.tsx`, `components/layout/side-nav-item.tsx`]
   - Server-connected component names (no endpoints/auth/errors): [`SideNavSubscriptionList`]
   - Target paths (read-only context for audit; no writes here): `app/(studio)/layout.tsx` + `components/layout/side-nav.tsx` + `components/layout/side-nav-subscription-list.tsx` + `components/layout/subscription-nav-item.tsx`

   For each component in the Reused DS list, perform value-level diff against the file on disk and classify per the 4-value status enum (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`). Compose Decision per default policy (see `.claude/skills/plan-build/references/frontend-drift-report-schema.md` § Default decisions per status). Read prior sections of `frontend-drift-report.md` to build `prior_decisions`; populate `Prior` column with CONFLICT detection (executed by `/implement` per its SKILL.md cross-screen consultation algorithm). Write a `## Screen: left-menu-social — audited at SI-06.20.0 ({YYYY-MM-DD})` section to `frontend-drift-report.md` (append on first run, overwrite-in-place on re-run). **No code edits — verifiable via `git diff` at SI end.**

**Dependencies:** none

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` exists in the plan folder; section `## Screen: left-menu-social` exists with the current run's date in heading (appended on first run, overwritten in place on re-run per schema § Section ownership and update discipline).
- Every component in the Reused DS list has exactly one row in the table.
- Every row has a Decision column populated:
  - `alinhado` → `skip`
  - `drift menor` → `auto-Edit "<specifics>"` or `exception "<reason>"`
  - `drift relevante` → `auto-Edit "<specifics>"`, `exception "<reason>"`, or `CONFLICT: <one-liner>; <verb> "<specifics>"` (CONFLICT only when `prior_decisions` diverges; on CONFLICT rows `<verb>` is `auto-Edit` (default) or `exception` (override) — `create` and `skip` are categorically incompatible with `drift relevante`)
  - `componente ausente` → `create`
- Every `exception` decision carries a one-liner justification.
- `git diff --name-only HEAD -- next-frontend` after the SI is empty (no code touched in target subproject; the report file lives outside `next-frontend` and is excluded from the scoped check by construction).

---

### SI-06.20a — Menu lateral (visual shell)

**Route:** (studio)/*
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Menu lateral (Left Menu)`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: left-menu-social`

**Technical actions:**

1. **Apply drift decisions** — read the Drift Report section for this screen. For each row, parse the Decision column and apply per the verb body:
   - `auto-Edit "<specifics>"` → apply `Edit` on the named DS file with the documented specifics
   - `create` → create the file (icons via Figma asset; components per spec)
   - `exception` / `skip` → no-op
   - `CONFLICT: <one-liner>; <verb> "<specifics>"` → strip the `CONFLICT: <one-liner>;` prefix (informational only) and apply the verb body per the rules above (`<verb>` is `auto-Edit` or `exception` on CONFLICT rows; `create`/`skip` cannot appear here per schema § Decision)

   No drift detection or auto-judgment in this step. The audit-SI did the analysis; this step is mechanical application.

2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959
   - Reused DS components: [`components/layout/side-nav-subscription-list.tsx`, `components/layout/subscription-nav-item.tsx`, `components/ui/avatar.tsx`, `components/layout/side-nav-item.tsx`] _(now reflecting any DS edits from action 1)_
   - Server-connected component names (no endpoints/auth/errors): [`SideNavSubscriptionList`]
   - Target paths: `components/layout/side-nav.tsx` + `components/layout/side-nav-subscription-list.tsx` + `components/layout/subscription-nav-item.tsx`

**Dependencies:** SI-06.20.0

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-Xb; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- All target paths exist, export expected components, and compile per `npx tsc --noEmit` and `npm run lint` in `next-frontend`.
- Rendering matches Figma node fidelity within tolerance of DS component set.
- No runtime imports beyond Reused DS list (stays visually scoped).

---

### SI-06.20b — Menu lateral (lógica & wiring: canais seguidos)

**Test Specs:** see `next-frontend/specs/studio-left-menu-subscriptions.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Menu lateral (Left Menu)`

**Technical actions:**

1. **Leitura dos canais seguidos no RSC** — em `app/(studio)/layout.tsx` (Server Component), buscar `GET /subscriptions` com `limit=10` via `authedUpstream()` e passar `subscriptions` por `AppShell` até `SideNav`; em falha da busca ou lista vazia, passar lista vazia sem quebrar o shell (per `social-interactions/TD-06`, `social-interactions/TD-07`)
2. **SideNavSubscriptionList com dados reais** — em `components/layout/side-nav-subscription-list.tsx`, remover `PLACEHOLDER_SUBSCRIPTIONS` e renderizar os `items` recebidos como `SubscriptionNavItem`
3. **SubscriptionNavItem** — em `components/layout/subscription-nav-item.tsx`, tornar o item um link para `/channel/{nickname}` com `Avatar` (fallback de iniciais), nome truncado com o nome completo acessível, fundo `--card` no item ativo e hover com token neutro
4. **Seção e atalho "Subscriptions"** — em `components/layout/side-nav.tsx`, ocultar o título "Subscriptions" e a lista quando não há canais seguidos e apontar o item "Subscriptions" para `/subscriptions`
5. **Atualização após seguir/deixar de seguir** — manter a lista consistente com as mutações das telas de vídeo e canal: o `router.refresh()` já chamado por `SubscribeButton` re-renderiza o layout `(studio)`; sem estado de cliente adicional

**Dependencies:**

- `SI-06.20a` (visual shell must exist before wiring).
- Backend SIs: `SI-06.4` (`GET /subscriptions`), exposto ao frontend por `SI-06.12`.
- Infra SIs: `SI-06.14` (aliases e mocks).

**Tests:**

| Artifact | Layer | Test file |
|----------|-------|-----------|
| `components/layout/subscription-nav-item.tsx` | Unit per testing-guide-next-frontend § "Client Components" — link para o canal, nome truncado acessível, item ativo | `components/layout/__tests__/subscription-nav-item.test.tsx` |
| `components/layout/side-nav-subscription-list.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderiza os itens recebidos | `components/layout/__tests__/side-nav-subscription-list.test.tsx` |
| `components/layout/side-nav.tsx` | Unit per testing-guide-next-frontend § "Client Components" — seção oculta sem canais seguidos, atalho para `/subscriptions` | `components/layout/__tests__/side-nav.test.tsx` |

E2E for the shell (menu listing followed channels after login, section hidden without subscriptions) is authored externally by `/plan-test-specs` in the spec file referenced by `**Test Specs:**` above and consumed JIT by `/implement` Step 3. /plan-build does NOT emit E2E rows here.

**Acceptance criteria:**

- Um usuário logado com inscrições abre qualquer rota `(studio)` e vê no menu até 10 canais seguidos, o mais recentemente seguido primeiro, cada um com avatar e nome
- Clicar num canal do menu navega para `/channel/{nickname}`
- Um usuário logado sem inscrições não vê o título "Subscriptions" nem a lista
- Se a busca de canais seguidos falhar, o shell `(studio)` continua renderizando, sem a seção
- O item "Subscriptions" do menu leva a `/subscriptions`

---

### SI-06.20c — Menu lateral (lógica & wiring: página de feed /subscriptions) (auto-split from SI-06.20b by /plan-build)

_Auto-split rationale: a página `/subscriptions` é uma rota própria, sem frame no Figma, com busca paginada independente do menu; split per "functional boundary" para manter o SI-06.20b só na lista do menu._

**Test Specs:** see `next-frontend/specs/subscriptions-feed.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Menu lateral (Left Menu)`

**Technical actions:**

1. **Página de feed** — criar `app/(studio)/subscriptions/page.tsx` (Server Component dinâmico, dentro do `AppShell` do `(studio)`) que lê `GET /subscriptions/videos` com `authedUpstream()` usando `page`/`pageSize` de `searchParams`, sem frame no Figma (per `social-interactions/TD-07`, revisão de 2026-10-08)
2. **Grid de vídeos** — renderizar os itens com `components/channel/video-card.tsx` existente e `components/common/pagination-links.tsx` para a paginação por URL (convenção da Fase 04); mostrar o nome do canal em cada card
3. **Estados da página** — estado vazio em texto muted (sem inscrições ou sem vídeos publicados) e `loading.tsx`/`error.tsx` ao lado da página seguindo o padrão das rotas existentes
4. **Autenticação** — usar o shell `(studio)` já autenticado e tratar `401` do upstream pelo redirecionamento de refresh de `authedUpstream()` (per `phase-04-videos-channel-frontend/TD-01`)

**Dependencies:**

- `SI-06.20b` (o item "Subscriptions" do menu aponta para esta rota).
- Backend SIs: `SI-06.4` (`GET /subscriptions/videos`), exposto ao frontend por `SI-06.12`.
- Infra SIs: `SI-06.14` (aliases e mocks).

**Tests:** _(empty — async RSC page; behavior covered by E2E in the /plan-test-specs spec)_

E2E for the page (feed listing, pagination by URL, empty state) is authored externally by `/plan-test-specs` in the spec file referenced by `**Test Specs:**` above and consumed JIT by `/implement` Step 3. /plan-build does NOT emit E2E rows here. Page-level Unit testing is excluded by `testing-guide-next-frontend` artifact rule "Pages → E2E only".

**Acceptance criteria:**

- Um usuário logado com inscrições abre `/subscriptions` e vê os vídeos publicados dos canais seguidos, do mais recente ao mais antigo, com o nome do canal em cada card
- `/subscriptions?page=2` mostra a segunda página e os links de paginação refletem a página atual
- Um usuário logado sem inscrições, ou cujos canais não têm vídeos publicados, vê o estado vazio em vez de uma lista
- Um visitante sem sessão que abre `/subscriptions` é levado a `/login` com `next=/subscriptions`
- O menu lateral continua visível na página, com o item "Subscriptions" em destaque

---

## Technical Specifications

### Data Model

> Convenções herdadas do backend: PK `uuid` gerada, colunas em `snake_case`, tabelas no plural, `created_at`/`updated_at` como `timestamptz`. Reações em tabelas separadas por alvo (per `social-interactions/TD-01`); contagens agregadas por `COUNT` na leitura, sem coluna denormalizada (per `social-interactions/TD-02`).

#### ReactionType (enum)

Valores: `like`, `dislike`. Compartilhado por `VideoReaction` e `CommentReaction` (um usuário tem no máximo uma reação por alvo: `like` **ou** `dislike`).

#### VideoReaction (`video_reactions`)

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, generated |
| user_id | uuid | not null, FK → `users.id` ON DELETE CASCADE |
| video_id | uuid | not null, FK → `videos.id` ON DELETE CASCADE |
| type | enum `ReactionType` | not null |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now(), atualizado a cada troca de `type` |

**Relations:** `VideoReaction` many-to-one `User`; `VideoReaction` many-to-one `Video`
**Indexes:** unique on (`user_id`, `video_id`); index on (`video_id`, `type`) para a contagem de likes

#### CommentReaction (`comment_reactions`)

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, generated |
| user_id | uuid | not null, FK → `users.id` ON DELETE CASCADE |
| comment_id | uuid | not null, FK → `comments.id` ON DELETE CASCADE |
| type | enum `ReactionType` | not null |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now(), atualizado a cada troca de `type` |

**Relations:** `CommentReaction` many-to-one `User`; `CommentReaction` many-to-one `Comment`
**Indexes:** unique on (`user_id`, `comment_id`); index on (`comment_id`, `type`) para a contagem de likes

#### Comment (`comments`)

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, generated |
| video_id | uuid | not null, FK → `videos.id` ON DELETE CASCADE |
| user_id | uuid | not null, FK → `users.id` ON DELETE CASCADE |
| parent_id | uuid | nullable, FK → `comments.id` ON DELETE CASCADE; `null` = comentário de topo |
| body | text | not null; texto puro, sem formatação (per `social-interactions/TD-09`) |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

**Relations:** `Comment` many-to-one `Video`; `Comment` many-to-one `User` (o autor é exibido pelo `Channel` do usuário: `channelName`, `channelNickname`); `Comment` self-reference (`parent_id`) one-to-many de respostas
**Indexes:** index on (`video_id`, `parent_id`, `created_at`, `id`) para a listagem de topo paginada por cursor; index on (`parent_id`, `created_at`, `id`) para a listagem de respostas
**Regra de profundidade (per `social-interactions/TD-04`):** profundidade máxima 2. Um comentário com `parent_id` não nulo só pode ter como pai um comentário cujo `parent_id` é `null`; respostas a respostas são rejeitadas no service (`COMMENT_DEPTH_EXCEEDED`). O pai deve pertencer ao mesmo `video_id`.

#### Subscription (`subscriptions`)

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, generated |
| user_id | uuid | not null, FK → `users.id` ON DELETE CASCADE (o inscrito) |
| channel_id | uuid | not null, FK → `channels.id` ON DELETE CASCADE |
| created_at | timestamptz | default now() |

**Relations:** `Subscription` many-to-one `User`; `Subscription` many-to-one `Channel`
**Indexes:** unique on (`user_id`, `channel_id`); index on `channel_id` para a contagem de inscritos; index on (`user_id`, `created_at`) para a lista de canais seguidos (mais recente primeiro) e para o feed
**Regra:** um usuário não pode se inscrever no próprio canal (`Channel.user_id` = `user_id`); a regra vive no service e a API devolve `CANNOT_SUBSCRIBE_OWN_CHANNEL`.

**Migration:** uma única migration (`CreateSocialInteractions`) cria o enum `reaction_type` e as quatro tabelas acima, com as constraints e índices listados.

### API Contracts

> _Backend tier (Scope-driven) seguido do BFF tier (frontend-exposed). Mutações de estado binário são sub-recursos idempotentes `PUT`/`DELETE` que respondem `204` (per `social-interactions/TD-03`). Leituras públicas usam `@Public()` com autenticação opcional: token válido popula `viewerState`; token ausente, inválido ou expirado devolve `200` anônimo com `viewerState: null` (per `social-interactions/TD-06`, revisão de 2026-10-08)._

> _Forma comum de `viewerState` (camelCase, igual ao restante da API): em vídeo `{ reaction: "like" | "dislike" | null, subscribed: boolean, isChannelOwner: boolean }`; em canal `{ subscribed: boolean, isChannelOwner: boolean }`; em comentário `{ reaction: "like" | "dislike" | null }`. Sempre `null` para anônimos._

#### PUT /channels/{nickname}/subscription (SI-06.3)

**Request headers:**
- Authorization: Bearer <access token>

**Response 204:** No content. Idempotente: inscrever-se num canal já seguido também devolve `204`.

**Error responses:**
- 401 UNAUTHORIZED: sem token válido
- 404 CHANNEL_NOT_FOUND: quando o `nickname` não existe
- 403 CANNOT_SUBSCRIBE_OWN_CHANNEL: quando o canal pertence ao usuário autenticado

---

#### DELETE /channels/{nickname}/subscription (SI-06.3)

**Request headers:**
- Authorization: Bearer <access token>

**Response 204:** No content. Idempotente: cancelar uma inscrição inexistente também devolve `204`.

**Error responses:**
- 401 UNAUTHORIZED: sem token válido
- 404 CHANNEL_NOT_FOUND: quando o `nickname` não existe

---

#### GET /subscriptions (SI-06.4)

**Request headers:**
- Authorization: Bearer <access token>

**Request query parameters:**
- limit: integer, optional — número máximo de canais devolvidos, mais recente primeiro (o menu lateral envia `10`); mínimo e máximo _undetermined — nenhuma TD fixa os limites; definidos como constantes de `subscriptions.constants.ts`_

**Response 200:**
- items: array of
  - channelId: string (uuid)
  - channelName: string
  - channelNickname: string
  - subscribedAt: string (date-time)

**Error responses:**
- 401 UNAUTHORIZED: sem token válido
- 400 validation error: quando `limit` não é inteiro válido

---

#### GET /subscriptions/videos (SI-06.4)

**Request headers:**
- Authorization: Bearer <access token>

**Request query parameters:**
- page: integer, optional — paginação por URL, mesma convenção de `GET /channels/{nickname}/videos` (per `social-interactions/TD-07`)
- pageSize: integer, optional — idem

**Response 200:**
- items: array of
  - id: string (uuid)
  - title: string
  - thumbnailKey: string | null
  - publishedAt: string (date-time)
  - updatedAt: string (date-time)
  - durationSeconds: number | null
  - channelName: string
  - channelNickname: string
- page: number
- pageSize: number
- total: number

Vídeos publicados (`ready`, `public`, `published_at` não nulo) dos canais seguidos, ordenados por `published_at DESC` (per `social-interactions/TD-07`).

**Error responses:**
- 401 UNAUTHORIZED: sem token válido
- 400 validation error: quando `page`/`pageSize` são inválidos

---

#### PUT /videos/{id}/reaction (SI-06.6)

**Request headers:**
- Authorization: Bearer <access token>
- Content-Type: application/json

**Request body:**
- type: string, required — `like` | `dislike`

**Response 204:** No content. Idempotente: repetir o mesmo `type` não altera o estado; um `type` diferente troca a reação existente (um único registro por usuário e vídeo).

**Error responses:**
- 401 UNAUTHORIZED: sem token válido
- 404 VIDEO_NOT_FOUND: vídeo inexistente ou não visível ao solicitante
- 400 validation error: quando `type` falta ou não é `like`/`dislike`

---

#### DELETE /videos/{id}/reaction (SI-06.6)

**Request headers:**
- Authorization: Bearer <access token>

**Response 204:** No content. Idempotente: remover uma reação inexistente também devolve `204`.

**Error responses:**
- 401 UNAUTHORIZED: sem token válido
- 404 VIDEO_NOT_FOUND: vídeo inexistente ou não visível ao solicitante

---

#### PUT /comments/{id}/reaction (SI-06.7)

**Request headers:**
- Authorization: Bearer <access token>
- Content-Type: application/json

**Request body:**
- type: string, required — `like` | `dislike`

**Response 204:** No content. Mesma semântica idempotente de `PUT /videos/{id}/reaction`.

**Error responses:**
- 401 UNAUTHORIZED: sem token válido
- 404 COMMENT_NOT_FOUND: comentário inexistente
- 400 validation error: quando `type` falta ou não é `like`/`dislike`

---

#### DELETE /comments/{id}/reaction (SI-06.7)

**Request headers:**
- Authorization: Bearer <access token>

**Response 204:** No content. Idempotente.

**Error responses:**
- 401 UNAUTHORIZED: sem token válido
- 404 COMMENT_NOT_FOUND: comentário inexistente

---

#### POST /videos/{id}/comments (SI-06.9)

Cria um comentário de topo ou, com `parentId`, uma resposta (profundidade máxima 2, per `social-interactions/TD-04`).

**Request headers:**
- Authorization: Bearer <access token>
- Content-Type: application/json

**Request body:**
- body: string, required — texto puro, não vazio após `trim` (per `social-interactions/TD-09`); tamanho máximo _undetermined — TD-09 define formato e escape, não o limite_
- parentId: string (uuid), optional — comentário de topo ao qual a resposta pertence

**Response 201:** `CommentItem`
- id: string (uuid)
- parentId: string (uuid) | null
- body: string
- createdAt: string (date-time)
- author: object — `channelName`: string, `channelNickname`: string
- likeCount: number
- replyCount: number
- viewerState: object | null — `{ reaction: "like" | "dislike" | null }`

**Error responses:**
- 401 UNAUTHORIZED: sem token válido
- 404 VIDEO_NOT_FOUND: vídeo inexistente ou não visível ao solicitante
- 404 COMMENT_NOT_FOUND: `parentId` inexistente ou pertencente a outro vídeo
- 400 COMMENT_DEPTH_EXCEEDED: quando `parentId` aponta para uma resposta (profundidade > 2)
- 400 validation error: quando `body` é vazio/inválido ou `parentId` não é uuid

---

#### GET /videos/{id}/comments (SI-06.10)

Rota pública com autenticação opcional. Lista os comentários de topo, mais recentes primeiro (`created_at DESC, id DESC`), paginados por cursor (per `social-interactions/TD-05`).

**Request query parameters:**
- cursor: string, optional — cursor opaco devolvido em `nextCursor`; ausente = primeira página
- limit: integer, optional — itens por página; padrão e máximo _undetermined — TD-05 fixa cursor + "carregar mais", não o tamanho da página_

**Response 200:**
- items: array of `CommentItem` (mesma forma do `POST /videos/{id}/comments`)
- nextCursor: string | null — `null` na última página
- totalCount: number — total de comentários do vídeo, incluindo respostas, calculado por `COUNT` (per `social-interactions/TD-02`)

**Error responses:**
- 404 VIDEO_NOT_FOUND: vídeo inexistente ou não visível ao solicitante
- 400 INVALID_CURSOR: quando `cursor` não pode ser decodificado
- 400 validation error: quando `limit` é inválido

---

#### GET /comments/{id}/replies (SI-06.10)

Rota pública com autenticação opcional. Lista as respostas de um comentário de topo com a mesma ordenação e paginação por cursor da listagem de topo.

**Request query parameters:**
- cursor: string, optional
- limit: integer, optional — mesmos limites da listagem de topo

**Response 200:**
- items: array of `CommentItem` (`parentId` preenchido, `replyCount` = 0)
- nextCursor: string | null

**Error responses:**
- 404 COMMENT_NOT_FOUND: comentário inexistente ou que não é de topo
- 400 INVALID_CURSOR: quando `cursor` não pode ser decodificado
- 400 validation error: quando `limit` é inválido

---

#### GET /videos/{id} — campos adicionados (SI-06.11)

Endpoint existente (Fase 05); a resposta `200` ganha:
- likeCount: number — total de reações `like` (`COUNT`)
- channelSubscriberCount: number — inscritos do canal do vídeo
- viewerState: object | null — `{ reaction: "like" | "dislike" | null, subscribed: boolean, isChannelOwner: boolean }`; `null` para anônimos

---

#### GET /channels/{nickname} — campos adicionados (SI-06.11)

Endpoint existente (Fase 04); a resposta `200` ganha:
- subscriberCount: number — inscritos do canal (`COUNT`, per `social-interactions/TD-02`)
- viewerState: object | null — `{ subscribed: boolean, isChannelOwner: boolean }`; `null` para anônimos

---

#### GET /channels/{id}/manage/videos — campos substituídos (SI-06.11)

Endpoint existente (Fase 04); `items[].likes` e `items[].comments` deixam de ser placeholders (`0`) e passam a refletir `COUNT` real de reações `like` e de comentários (incluindo respostas) por vídeo, agregados em lote para a página (per `social-interactions/TD-02`). `views` permanece como está.

---

#### Validation Rules — Interações sociais

- `type` (reações): required, `like` | `dislike`
- `body` (comentário): required, string, não vazio após `trim`, tamanho máximo _undetermined — TD-09 define formato/escape, não o limite_
- `parentId` (comentário): optional, uuid; deve ser comentário de topo do mesmo vídeo
- `cursor`: optional, string opaca produzida pelo servidor
- `limit` (comentários, inscrições): optional, inteiro positivo; limites _undetermined — nenhuma TD fixa os valores_
- `page`/`pageSize` (`GET /subscriptions/videos`): mesma validação da listagem pública do canal (Fase 04)

---

> _BFF tier — frontend-exposed contract. O navegador chama a rota FE-facing; a rota faz proxy do upstream conforme a arquitetura BFF documentada em `next-frontend/CLAUDE.md` (Route Handlers em `app/api/**`, cliente tipado `authedUpstream`). Os `forwards-to` abaixo apontam para endpoints novos do backend tier desta fase; seus aliases chegam a `lib/api/contracts.ts` quando o contrato OpenAPI é regenerado em SI-06.12._

#### PUT /api/videos/{id}/reaction (SI-06.15)

**forwards-to:** `PUT /videos/{id}/reaction` *(derived: project contract source)*

**Request headers:**
- Content-Type: application/json *(derived: project contract source)*

**Request body:** `SetReactionDto` *(derived: project contract source — fields per the project contract source; not re-spelled here to avoid duplication)*

**Response 204 (FE-facing):** No content — pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: envelope `{ statusCode, error: "UNAUTHORIZED", message }` quando não há sessão válida *(per phase-04-videos-channel-frontend/TD-01)*
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*
- 400 validation error: pass-through *(derived: project contract source)*

---

#### DELETE /api/videos/{id}/reaction (SI-06.15)

**forwards-to:** `DELETE /videos/{id}/reaction` *(derived: project contract source)*

**Response 204 (FE-facing):** No content — pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: envelope `{ statusCode, error: "UNAUTHORIZED", message }` quando não há sessão válida *(per phase-04-videos-channel-frontend/TD-01)*
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*

---

#### PUT /api/comments/{id}/reaction (SI-06.15)

**forwards-to:** `PUT /comments/{id}/reaction` *(derived: project contract source)*

**Request headers:**
- Content-Type: application/json *(derived: project contract source)*

**Request body:** `SetReactionDto` *(derived: project contract source — fields per the project contract source; not re-spelled here to avoid duplication)*

**Response 204 (FE-facing):** No content — pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: envelope `{ statusCode, error: "UNAUTHORIZED", message }` quando não há sessão válida *(per phase-04-videos-channel-frontend/TD-01)*
- 404 COMMENT_NOT_FOUND: pass-through *(derived: project contract source)*
- 400 validation error: pass-through *(derived: project contract source)*

---

#### DELETE /api/comments/{id}/reaction (SI-06.15)

**forwards-to:** `DELETE /comments/{id}/reaction` *(derived: project contract source)*

**Response 204 (FE-facing):** No content — pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: envelope `{ statusCode, error: "UNAUTHORIZED", message }` quando não há sessão válida *(per phase-04-videos-channel-frontend/TD-01)*
- 404 COMMENT_NOT_FOUND: pass-through *(derived: project contract source)*

---

#### PUT /api/channels/{nickname}/subscription (SI-06.16)

**forwards-to:** `PUT /channels/{nickname}/subscription` *(derived: project contract source)*

**Response 204 (FE-facing):** No content — pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: envelope `{ statusCode, error: "UNAUTHORIZED", message }` quando não há sessão válida *(per phase-04-videos-channel-frontend/TD-01)*
- 404 CHANNEL_NOT_FOUND: pass-through *(derived: project contract source)*
- 403 CANNOT_SUBSCRIBE_OWN_CHANNEL: pass-through *(derived: project contract source)*

---

#### DELETE /api/channels/{nickname}/subscription (SI-06.16)

**forwards-to:** `DELETE /channels/{nickname}/subscription` *(derived: project contract source)*

**Response 204 (FE-facing):** No content — pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: envelope `{ statusCode, error: "UNAUTHORIZED", message }` quando não há sessão válida *(per phase-04-videos-channel-frontend/TD-01)*
- 404 CHANNEL_NOT_FOUND: pass-through *(derived: project contract source)*

---

#### POST /api/videos/{id}/comments (SI-06.17)

**forwards-to:** `POST /videos/{id}/comments` *(derived: project contract source)*

**Request headers:**
- Content-Type: application/json *(derived: project contract source)*

**Request body:** `CreateCommentDto` *(derived: project contract source — fields per the project contract source; not re-spelled here to avoid duplication)*

**Response 201 (FE-facing):** `CommentItem` — pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: envelope `{ statusCode, error: "UNAUTHORIZED", message }` quando não há sessão válida *(per phase-04-videos-channel-frontend/TD-01)*
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*
- 404 COMMENT_NOT_FOUND: pass-through *(derived: project contract source)*
- 400 COMMENT_DEPTH_EXCEEDED: pass-through *(derived: project contract source)*
- 400 validation error: pass-through *(derived: project contract source)*

---

#### GET /api/videos/{id}/comments (SI-06.17)

Usado pelo botão "carregar mais" do cliente; a primeira página é lida pelo RSC direto no upstream (§ API Contracts → backend tier).

**forwards-to:** `GET /videos/{id}/comments` *(derived: project contract source)*

**Request query parameters:**
- cursor: string, optional *(derived: project contract source)*
- limit: integer, optional *(derived: project contract source)*

**Response 200 (FE-facing):** `{ items, nextCursor, totalCount }` — pass-through *(derived: project contract source; reshape: none)*

A rota é anônima com autenticação opcional: com sessão válida encaminha o bearer para que `viewerState` venha populado; sem sessão (ou com token expirado) devolve a lista anônima, sem redirecionar nem devolver `401` *(per social-interactions/TD-06)*.

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*
- 400 INVALID_CURSOR: pass-through *(derived: project contract source)*
- 400 validation error: pass-through *(derived: project contract source)*

---

#### GET /api/comments/{id}/replies (SI-06.17)

**forwards-to:** `GET /comments/{id}/replies` *(derived: project contract source)*

**Request query parameters:**
- cursor: string, optional *(derived: project contract source)*
- limit: integer, optional *(derived: project contract source)*

**Response 200 (FE-facing):** `{ items, nextCursor }` — pass-through *(derived: project contract source; reshape: none)*

Mesma regra de autenticação opcional de `GET /api/videos/{id}/comments` *(per social-interactions/TD-06)*.

**Error responses (FE-facing):**
- 404 COMMENT_NOT_FOUND: pass-through *(derived: project contract source)*
- 400 INVALID_CURSOR: pass-through *(derived: project contract source)*
- 400 validation error: pass-through *(derived: project contract source)*

---

> _Leituras feitas por Server Components (sem rota BFF): `GET /videos/{id}`, `GET /channels/{nickname}`, `GET /videos/{id}/comments` (primeira página), `GET /subscriptions` e `GET /subscriptions/videos` são chamadas direto no upstream pelo RSC, com o bearer da sessão quando existe (per `social-interactions/TD-06`); o contrato é o do backend tier acima._

### Authorization Matrix

| Endpoint | Anonymous | Authenticated | Owner |
|----------|-----------|---------------|-------|
| GET /videos/{id} | ✓ (sem `viewerState`) | ✓ (com `viewerState`) | ✓ |
| GET /channels/{nickname} | ✓ (sem `viewerState`) | ✓ (com `viewerState`) | ✓ |
| GET /videos/{id}/comments | ✓ (sem `viewerState`) | ✓ (com `viewerState`) | ✓ |
| GET /comments/{id}/replies | ✓ (sem `viewerState`) | ✓ (com `viewerState`) | ✓ |
| POST /videos/{id}/comments | ✗ | ✓ | ✓ |
| PUT /videos/{id}/reaction | ✗ | ✓ | ✓ |
| DELETE /videos/{id}/reaction | ✗ | ✓ | ✓ |
| PUT /comments/{id}/reaction | ✗ | ✓ | ✓ |
| DELETE /comments/{id}/reaction | ✗ | ✓ | ✓ |
| PUT /channels/{nickname}/subscription | ✗ | ✓ | ✗ (`CANNOT_SUBSCRIBE_OWN_CHANNEL`) |
| DELETE /channels/{nickname}/subscription | ✗ | ✓ | ✓ (no-op idempotente) |
| GET /subscriptions | ✗ | ✓ | ✓ |
| GET /subscriptions/videos | ✗ | ✓ | ✓ |
| GET /channels/{id}/manage/videos | ✗ | ✗ | ✓ (dono do canal) |

_Notas:_ as quatro leituras públicas usam `@Public()` e o `JwtAuthGuard` existente trata token inválido ou expirado como anônimo (sem `401`); a coluna Owner refere-se ao dono do canal/vídeo consultado. A visibilidade do vídeo segue a regra unificada da Fase 05 (`ready` + `published_at` + `public`/`unlisted`; o dono vê qualquer um).

---

### Error Catalog

| errorCode | HTTP | Trigger |
|-----------|------|---------|
| UNAUTHORIZED | 401 | Endpoint autenticado sem token válido (guard JWT); no BFF, mutação sem sessão iron-session válida |
| VIDEO_NOT_FOUND | 404 | Reação ou comentário em vídeo inexistente ou não visível ao solicitante (código existente) |
| CHANNEL_NOT_FOUND | 404 | Inscrição ou leitura de canal com `nickname` inexistente (código existente) |
| COMMENT_NOT_FOUND | 404 | Reação/resposta em comentário inexistente; `parentId` inexistente ou de outro vídeo; `GET /comments/{id}/replies` em comentário que não é de topo |
| CANNOT_SUBSCRIBE_OWN_CHANNEL | 403 | `PUT /channels/{nickname}/subscription` no canal do próprio usuário |
| COMMENT_DEPTH_EXCEEDED | 400 | `parentId` aponta para uma resposta (profundidade máxima 2) |
| INVALID_CURSOR | 400 | `cursor` das listagens de comentários não pode ser decodificado |
| VALIDATION_ERROR | 400 | Corpo/query inválidos (`type`, `body`, `parentId`, `limit`, `page`, `pageSize`) — envelope de validação já existente |

_Formato do erro herdado:_ `{ statusCode, error, message }` com o código de domínio em `error` (per `phase-02-auth/TD-07`); novos códigos são `DomainException` em `common/exceptions/domain.exception.ts`.

### UI Contracts

> _Escopo: apenas os componentes e verbos da Fase 06. Chrome e componentes já inventariados nas Fases 04 e 05 (TopNav, player, descrição, sidebar de sugestões, grid de vídeos) ficam fora deste contrato._

#### Screen: Página de visualização do vídeo

**Route:** `/watch/[id]`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219 (node `upxCB4CzKKTSOT9NpdAZ0u:152:2219`)
**Purpose:** "Like e dislike em vídeos (usuários autenticados)" — e, na mesma tela, "Comentários em vídeos (usuários autenticados)", "Respostas a comentários (comentários aninhados)", "Like e dislike em comentários (usuários autenticados)" e "Inscrição em canais (seguir/deixar de seguir)".

**Auth requirement:** Authenticated _(source: §Authorization Matrix — most-restrictive entre `PUT /videos/{id}/reaction`, `POST /videos/{id}/comments` e `PUT /channels/{nickname}/subscription`; a rota em si continua anônima: a página, a lista de comentários e as contagens renderizam para visitantes, e só as ações de escrita exigem login — não chamar `requireSession()` na página)_

**Rendering strategy:** Server Component (RSC) dinâmico e sem cache, que lê a sessão e busca o estado do espectador na mesma resposta, com ilhas Client Components para as mutações (`useOptimistic` + `router.refresh()`) _(source: social-interactions/TD-06, social-interactions/TD-08; rota anônima e sem cache per video-watch-page/TD-04)_

**Reused DS components:**
- `components/ui/button.tsx` — ReplyButton (158:3882) — Ghost pill 28px, "Reply" 14px muted. Só alterna o formulário de resposta; a mutação acontece no submit do CommentForm. Não há frame do formulário nem da thread. Base também do SubscribeButton
- `components/ui/avatar.tsx` — avatar 40px do CommentForm (158:3858) e do CommentItem (158:3863)
- `components/ui/input.tsx` — input só com borda inferior do CommentForm (158:3860, placeholder "Add a comment...")
- `components/icons/thumbs-up-icon.tsx` — ícone de like do vídeo (24px) e do comentário (16px); precisa de variante preenchida para o estado ativo
- `components/icons/thumbs-down-icon.tsx` (new) — ThumbsDownIcon (165:2379 / 165:2384, 24px; 16px nos comentários) — Ausente no DS (só `thumbs-up-icon.tsx` existe). Usado no vídeo e nos comentários. Mesmo traço do thumbs-up; precisa de variante preenchida para o estado ativo

**Server-connected components:**
- `VideoReactionButtons` — verbs: curtir vídeo, descurtir vídeo | endpoint: `PUT /api/videos/{id}/reaction` e `DELETE /api/videos/{id}/reaction` (§API Contracts → BFF tier — see for `forwards-to` + request/response/projection) | reuse: `components/watch/video-reaction-buttons.tsx (new)`
- `SubscribeButton` — verbs: inscrever-se no canal, cancelar inscrição no canal | endpoint: `PUT /api/channels/{nickname}/subscription` e `DELETE /api/channels/{nickname}/subscription` (§API Contracts → BFF tier) | reuse: `components/social/subscribe-button.tsx (new)`
- `CommentsSection` — verbs: listar comentários | endpoint: primeira página via `GET /videos/{id}/comments` lido pelo RSC (§API Contracts → backend tier); "carregar mais" via `GET /api/videos/{id}/comments` (§API Contracts → BFF tier) | reuse: `components/social/comments-section.tsx (new)`
- `CommentForm` — verbs: enviar comentário, responder comentário | endpoint: `POST /api/videos/{id}/comments` (§API Contracts → BFF tier) | reuse: `components/social/comment-form.tsx (new)`
- `CommentItem` — verbs: — (renderiza o item e carrega respostas sob demanda) | endpoint: `GET /api/comments/{id}/replies` (§API Contracts → BFF tier) | reuse: `components/social/comment-item.tsx (new)`
- `CommentReactionButtons` — verbs: curtir comentário, descurtir comentário | endpoint: `PUT /api/comments/{id}/reaction` e `DELETE /api/comments/{id}/reaction` (§API Contracts → BFF tier) | reuse: `components/social/comment-reaction-buttons.tsx (new)`

**Behaviors:**

*Rendered states:*
- Loading: `loading.tsx` existente da rota cobre a carga inicial; o "carregar mais" mostra o botão desabilitado enquanto a requisição está pendente. Skeleton específico não está desenhado (OQ-4 do inventário)
- Empty: sem comentários — mensagem em texto muted derivada dos tokens existentes (não desenhada no Figma)
- Success: vídeo com contagem de likes compacta (`1.2K`), total de comentários com separador de milhar (`4,256 Comments`), likes de comentário simples (`245`); dislikes não exibem contagem
- Error: falha de mutação reverte o estado otimista e reconcilia via `router.refresh()`; mapeamento por código abaixo

*Interactions:*
- Clique em like/dislike do vídeo ou do comentário → atualiza ícone (preenchido quando ativo) e contagem de forma otimista; `router.refresh()` reconcilia (per `social-interactions/TD-08`); clicar de novo na reação ativa chama `DELETE`
- Clique em Subscribe/Inscrito → alterna rótulo e variante do botão e a contagem de inscritos no `ChannelInfo`; o botão fica oculto para o dono do canal (`viewerState.isChannelOwner`, decidido no RSC)
- Clique em ReplyButton → abre `CommentForm` inline com `parentId` abaixo do comentário; respostas aparecem recuadas atrás do toggle "Ver N respostas", carregadas sob demanda (profundidade máxima 2, per `social-interactions/TD-04`)
- Visitante anônimo que clica em like/dislike/subscribe/comentar/responder → redireciona para `/login?next=<caminho atual>` (nenhum prompt está desenhado)
- `CommentSortLabel` — "Sort by: Latest" (158:3856) é rótulo estático "Mais recentes", sem menu (única ordenação, per `social-interactions/TD-05`); elemento DOM puro, sem componente próprio
- O `SubscribeButton` fica no bloco do autor; `components/watch/channel-info.tsx` (Fase 05) ganha um slot para ele e passa a exibir `channelSubscriberCount` em notação compacta

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `UNAUTHORIZED` | Redirect to `/login?next=<caminho atual>` |
| `VIDEO_NOT_FOUND` | _TBD — implementer decides per screen_ |
| `COMMENT_NOT_FOUND` | _TBD — implementer decides per screen_ |
| `CANNOT_SUBSCRIBE_OWN_CHANNEL` | _TBD — implementer decides per screen (botão oculto para o dono; não deve ocorrer)_ |
| `COMMENT_DEPTH_EXCEEDED` | _TBD — implementer decides per screen_ |
| `INVALID_CURSOR` | _TBD — implementer decides per screen_ |
| `VALIDATION_ERROR` | _TBD — implementer decides per screen_ |

**Client-side validation mirror:** _(source: §API Contracts → Validation Rules — Interações sociais)_

- `body`: required, não vazio após `trim`; tamanho máximo _undetermined — TD-09 define formato/escape, não o limite_
- `parentId`: preenchido pelo componente (comentário de topo do mesmo vídeo), não digitado pelo usuário

**Accessibility notes:**
- Botões de ícone (like, dislike, Subscribe) como `<button>` com `aria-label`; os toggles expõem `aria-pressed` (o estado ativo não está desenhado)
- O input de comentário precisa de rótulo acessível (visível ou `aria-label`) — o Figma tem apenas placeholder
- O total de comentários é um heading
- Dislike sem contagem visível: o estado ativo precisa ser comunicado por `aria-pressed`, não por texto

#### Screen: Página pública do canal

**Route:** `/channel/[nickname]`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926 (node `upxCB4CzKKTSOT9NpdAZ0u:155:1926`)
**Purpose:** "Inscrição em canais (seguir/deixar de seguir)" e "Contagem de inscritos na página do canal".

**Auth requirement:** Authenticated _(source: §Authorization Matrix — most-restrictive entre `PUT /channels/{nickname}/subscription` e `DELETE /channels/{nickname}/subscription`; a página e a contagem de inscritos continuam públicas — não chamar `requireSession()` na página)_

**Rendering strategy:** Server Component (RSC) dinâmico e sem cache; `ChannelHeader` recebe `subscriberCount` e `viewerState` do RSC e hospeda uma ilha Client Component para o Subscribe (`useOptimistic` + `router.refresh()`) _(source: social-interactions/TD-06, social-interactions/TD-08)_

**Reused DS components:**
- `components/channel/channel-header.tsx` — ChannelHeader (156:3513; conteúdo 156:3514, info 156:3515) — Componente existente sendo ESTENDIDO (a Fase 04 omitiu Subscribe/sino/contadores, D9). Linha de meta 156:3518: "@TechMasteryPlus • 2.4M subscribers • 1.2K videos" (Inter 16/24, muted)
- `components/ui/button.tsx` — base do SubscribeButton (pill primary "Subscribe"; variante secondary derivada para "Inscrito")

**Server-connected components:**
- `ChannelHeader` — verbs: exibir contagem de inscritos | endpoint: `GET /channels/{nickname}` lido pelo RSC (§API Contracts → backend tier: `subscriberCount`, `viewerState`) | reuse: `components/channel/channel-header.tsx`
- `SubscribeButton` — verbs: inscrever-se no canal, cancelar inscrição no canal, exibir estado de inscrição do espectador | endpoint: `PUT /api/channels/{nickname}/subscription` e `DELETE /api/channels/{nickname}/subscription` (§API Contracts → BFF tier — see for `forwards-to` + request/response/projection) | reuse: `components/social/subscribe-button.tsx (new)`
- `SubscriberCount` (texto "2.4M subscribers", 156:3521) — verbs: exibir contagem de inscritos | endpoint: `GET /channels/{nickname}` (§API Contracts → backend tier) | reuse: new

**Behaviors:**

*Rendered states:*
- Loading: `loading.tsx` existente da rota
- Empty: não aplicável (sem inscritos exibe `0 subscribers` em notação compacta)
- Success: nome, `@nickname`, contagem de inscritos compacta e botão Subscribe/Inscrito; o contador de vídeos (1.2K videos) não é Fase 06 e permanece omitido
- Error: falha de mutação reverte o estado otimista e reconcilia via `router.refresh()`

*Interactions:*
- Clique em Subscribe/Inscrito → alterna rótulo e variante do botão e atualiza a contagem de inscritos de forma otimista; `router.refresh()` reconcilia
- Visitante anônimo que clica em Subscribe → redireciona para `/login?next=<caminho atual>`
- Dono do canal vendo a própria página → Subscribe oculto (`viewerState.isChannelOwner`, decidido no RSC)
- O sino de notificações (158:2691) foi omitido por decisão: notificações não são capability da Fase 06 (igual à D9 da Fase 04)

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `UNAUTHORIZED` | Redirect to `/login?next=<caminho atual>` |
| `CHANNEL_NOT_FOUND` | _TBD — implementer decides per screen_ |
| `CANNOT_SUBSCRIBE_OWN_CHANNEL` | _TBD — implementer decides per screen (botão oculto para o dono; não deve ocorrer)_ |

**Client-side validation mirror:** _(nenhum campo de entrada nesta tela)_

**Accessibility notes:**
- Subscribe como `<button>` com `aria-pressed` (ou nome acessível que muda entre "Inscrever-se" e "Inscrito")
- A contagem de inscritos é atualizada após a mutação por `router.refresh()`, idealmente em região `aria-live="polite"`

#### Screen: Menu lateral (Left Menu)

**Route:** `(studio)/*`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959 (node `upxCB4CzKKTSOT9NpdAZ0u:150:959`)
**Purpose:** "Área de canais seguidos com acesso rápido aos vídeos".

**Auth requirement:** Authenticated _(source: §Authorization Matrix — `GET /subscriptions` e `GET /subscriptions/videos`; o menu só existe no shell `(studio)`, que já é autenticado)_

**Rendering strategy:** Server Component (RSC) dentro do shell `(studio)`: o RSC busca os canais seguidos do usuário e os passa à lista (substitui o placeholder estático) _(source: social-interactions/TD-06; lista no menu + página de feed per social-interactions/TD-07)_

**Reused DS components:**
- `components/layout/side-nav-subscription-list.tsx` — SideNavSubscriptionList (62:1672) e cabeçalho "Subscriptions" (62:1670) — Componente existente com placeholder estático (`PLACEHOLDER_SUBSCRIPTIONS`), substituído por dados reais; pilha vertical com gap 8px
- `components/layout/subscription-nav-item.tsx` — SubscriptionNavItem (62:1673…62:1693) — Link por canal; linha 38px, padding 14px, radius 8px, avatar 26px, nome Inter 16/24 em largura fixa de 147px (exige `truncate`); destino `/channel/[nickname]`
- `components/ui/avatar.tsx` — círculo 26px, só imagem no Figma; usar o fallback de iniciais do componente
- `components/layout/side-nav-item.tsx` — item "Subscriptions" (62:1630), 46px com ícone e rótulo; aponta para `/subscriptions`

**Server-connected components:**
- `SideNavSubscriptionList` — verbs: listar canais seguidos pelo usuário | endpoint: `GET /subscriptions` com `limit=10` lido pelo RSC (§API Contracts → backend tier) | reuse: `components/layout/side-nav-subscription-list.tsx`

**Behaviors:**

*Rendered states:*
- Loading: não aplicável (renderizado no servidor junto com o shell)
- Empty: sem inscrições a seção inteira é ocultada (estado vazio não desenhado; política decidida)
- Success: até 10 canais seguidos, inscrição mais recente primeiro, cada item com avatar e nome
- Error: falha na busca no RSC oculta a seção em vez de quebrar o shell

*Interactions:*
- Clique num item → navega para `/channel/[nickname]`; item ativo reaproveita o padrão do Home (fundo `--card`) quando a rota atual é o canal, e hover usa token neutro
- Clique no item "Subscriptions" (62:1630) → navega para `/subscriptions`, página de feed renderizada dentro do `AppShell` com o grid de `VideoCard` existente e paginação por URL (`GET /subscriptions/videos`); não há frame no Figma (per `social-interactions/TD-07`, revisão de 2026-10-08)
- Após seguir/deixar de seguir em outra tela, a lista é atualizada por `router.refresh()`
- Sem indicador de conteúdo novo, "Show more" ou "Browse channels" (não desenhados e fora de escopo); somente a variante expandida do SideNav é planejada

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `UNAUTHORIZED` | _TBD — implementer decides per screen_ |

**Client-side validation mirror:** _(nenhum campo de entrada nesta tela)_

**Accessibility notes:**
- follow DS defaults; nome do canal truncado deve manter o nome completo acessível (`title`/`aria-label`)

### UI ↔ API Traceability Matrix

| Verb | Component | Screen | Endpoint (from API Contracts) | TD ref |
|------|-----------|--------|-------------------------------|--------|
| curtir vídeo | VideoReactionButtons | /watch/[id] | PUT /api/videos/{id}/reaction → forwards-to PUT /videos/{id}/reaction | social-interactions/TD-03 |
| descurtir vídeo | VideoReactionButtons | /watch/[id] | PUT /api/videos/{id}/reaction → forwards-to PUT /videos/{id}/reaction (remover: DELETE /api/videos/{id}/reaction → forwards-to DELETE /videos/{id}/reaction) | social-interactions/TD-03 |
| inscrever-se no canal | SubscribeButton | /watch/[id] | PUT /api/channels/{nickname}/subscription → forwards-to PUT /channels/{nickname}/subscription | social-interactions/TD-03 |
| cancelar inscrição no canal | SubscribeButton | /watch/[id] | DELETE /api/channels/{nickname}/subscription → forwards-to DELETE /channels/{nickname}/subscription | social-interactions/TD-03 |
| listar comentários | CommentsSection | /watch/[id] | GET /videos/{id}/comments (RSC, upstream direto); GET /api/videos/{id}/comments → forwards-to GET /videos/{id}/comments ("carregar mais") | social-interactions/TD-05 |
| enviar comentário | CommentForm | /watch/[id] | POST /api/videos/{id}/comments → forwards-to POST /videos/{id}/comments | social-interactions/TD-09 |
| curtir comentário | CommentReactionButtons | /watch/[id] | PUT /api/comments/{id}/reaction → forwards-to PUT /comments/{id}/reaction | social-interactions/TD-03 |
| descurtir comentário | CommentReactionButtons | /watch/[id] | PUT /api/comments/{id}/reaction → forwards-to PUT /comments/{id}/reaction (remover: DELETE /api/comments/{id}/reaction → forwards-to DELETE /comments/{id}/reaction) | social-interactions/TD-03 |
| responder comentário | CommentForm (via ReplyButton) | /watch/[id] | POST /api/videos/{id}/comments → forwards-to POST /videos/{id}/comments (`parentId`); GET /api/comments/{id}/replies → forwards-to GET /comments/{id}/replies | social-interactions/TD-04 |
| inscrever-se no canal | SubscribeButton | /channel/[nickname] | PUT /api/channels/{nickname}/subscription → forwards-to PUT /channels/{nickname}/subscription | social-interactions/TD-03 |
| cancelar inscrição no canal | SubscribeButton | /channel/[nickname] | DELETE /api/channels/{nickname}/subscription → forwards-to DELETE /channels/{nickname}/subscription | social-interactions/TD-03 |
| exibir contagem de inscritos | ChannelHeader / SubscriberCount | /channel/[nickname] | GET /channels/{nickname} (RSC, upstream direto — `subscriberCount`) | social-interactions/TD-02 |
| exibir estado de inscrição do espectador | SubscribeButton | /channel/[nickname] | GET /channels/{nickname} (RSC, upstream direto — `viewerState`) | social-interactions/TD-06 |
| listar canais seguidos pelo usuário | SideNavSubscriptionList | (studio)/* | GET /subscriptions (RSC, upstream direto) | social-interactions/TD-07 |
| acessar vídeos dos canais seguidos | SideNavItem "Subscriptions" → /subscriptions | (studio)/* | GET /subscriptions/videos (RSC, upstream direto) | social-interactions/TD-07 |

_Capabilities marked in `## Non-UI / Deferred Capabilities` are excluded from this matrix (nenhuma nesta fase)._

---

## Dependency Map

```text
SI-06.0.1 (root — ícones thumbs-down / thumbs-up preenchido)
├── SI-06.18.0 — depends on SI-06.0.1 (audit lê o ícone do disco)
│   └── SI-06.18a — depends on SI-06.18.0 + SI-06.0.1
│       ├── SI-06.18b — depends on SI-06.18a + SI-06.3, SI-06.6, SI-06.11, SI-06.12, SI-06.13, SI-06.14, SI-06.15, SI-06.16
│       │   ├── SI-06.18c — depends on SI-06.18a + SI-06.18b + SI-06.7, SI-06.9, SI-06.10, SI-06.12, SI-06.14, SI-06.15, SI-06.17
│       │   └── SI-06.19b — depends on SI-06.19a + SI-06.18b (reuso do SubscribeButton) + SI-06.3, SI-06.11, SI-06.12, SI-06.13, SI-06.14, SI-06.16

SI-06.1 (root — entidades + migration)
├── SI-06.2 — depends on SI-06.1 (SubscriptionsService)
│   ├── SI-06.3 — depends on SI-06.2 (PUT/DELETE inscrição)
│   │   └── SI-06.4 — depends on SI-06.3, SI-06.2 (GET /subscriptions e /subscriptions/videos)
│   └── SI-06.11 — depends on SI-06.2, SI-06.5, SI-06.8 (contagens e viewerState)
├── SI-06.5 — depends on SI-06.1 (ReactionsService + util de visibilidade)
│   ├── SI-06.6 — depends on SI-06.5 (reação em vídeos)
│   │   └── SI-06.7 — depends on SI-06.6 (reação em comentários, mesmo controller)
│   └── SI-06.8 — depends on SI-06.1, SI-06.5 (CommentsService)
│       ├── SI-06.9 — depends on SI-06.8 (POST comentários)
│       │   └── SI-06.10 — depends on SI-06.9 (GET comentários e respostas)
│       └── SI-06.11
└── SI-06.12 — depends on SI-06.3, SI-06.4, SI-06.6, SI-06.7, SI-06.9, SI-06.10, SI-06.11 (sincroniza OpenAPI e tipos)
    └── SI-06.14 — depends on SI-06.12 (aliases e handlers MSW)
        ├── SI-06.15 — depends on SI-06.13 + SI-06.14 (BFF de reação)
        ├── SI-06.16 — depends on SI-06.13 + SI-06.14 (BFF de inscrição)
        ├── SI-06.17 — depends on SI-06.13 + SI-06.14 (BFF de comentários)
        ├── SI-06.20b — depends on SI-06.20a + SI-06.4, SI-06.12, SI-06.14 (lista no menu)
        │   └── SI-06.20c — depends on SI-06.20b + SI-06.4, SI-06.12, SI-06.14 (página /subscriptions)
        └── (SI-06.18b, SI-06.18c e SI-06.19b acima)

SI-06.13 (root, independente — authedUpstream PUT/DELETE + optionalAuthedUpstream)
└── SI-06.15, SI-06.16, SI-06.17 (acima)

SI-06.19.0 (root, independente — audit do canal)
└── SI-06.19a — depends on SI-06.19.0
    └── SI-06.19b (acima)

SI-06.20.0 (root, independente — audit do menu)
└── SI-06.20a — depends on SI-06.20.0
    └── SI-06.20b (acima)
```

---

## Deliverables

- [ ] SI-06.0.1 — Custom-business simple group: thumbs-down-icon
- [ ] SI-06.1 — Criar entidades e migration das interações sociais
- [ ] SI-06.2 — SubscriptionsService e SubscriptionsModule
- [ ] SI-06.3 — Endpoints de inscrição (PUT/DELETE /channels/{nickname}/subscription)
- [ ] SI-06.4 — Endpoints GET /subscriptions e GET /subscriptions/videos
- [ ] SI-06.5 — ReactionsService e ReactionsModule
- [ ] SI-06.6 — Endpoints de reação em vídeos (PUT/DELETE /videos/{id}/reaction)
- [ ] SI-06.7 — Endpoints de reação em comentários (PUT/DELETE /comments/{id}/reaction)
- [ ] SI-06.8 — CommentsService e CommentsModule
- [ ] SI-06.9 — Endpoint POST /videos/{id}/comments
- [ ] SI-06.10 — Endpoints de listagem GET /videos/{id}/comments e GET /comments/{id}/replies
- [x] SI-06.11 — Contagens e viewerState em vídeo, canal e painel de gestão
- [ ] SI-06.12 — Sincronizar o contrato OpenAPI e os tipos do frontend
- [ ] SI-06.13 — authedUpstream com PUT/DELETE e leitura autenticada opcional
- [ ] SI-06.14 — Aliases de contrato e handlers MSW das interações sociais
- [ ] SI-06.15 — Route Handlers BFF de reação em vídeos e comentários
- [ ] SI-06.16 — Route Handler BFF de inscrição em canais
- [ ] SI-06.17 — Route Handlers BFF de comentários e respostas
- [ ] SI-06.18.0 — Drift audit: Página de visualização do vídeo
- [ ] SI-06.18a — Tela de visualização do vídeo (visual shell)
- [ ] SI-06.18b — Tela de visualização do vídeo (lógica & wiring: reações e inscrição)
- [ ] SI-06.18c — Tela de visualização do vídeo (lógica & wiring: comentários)
- [ ] SI-06.19.0 — Drift audit: Página pública do canal
- [ ] SI-06.19a — Página pública do canal (visual shell)
- [ ] SI-06.19b — Página pública do canal (lógica & wiring)
- [ ] SI-06.20.0 — Drift audit: Menu lateral (Left Menu)
- [ ] SI-06.20a — Menu lateral (visual shell)
- [ ] SI-06.20b — Menu lateral (lógica & wiring: canais seguidos)
- [ ] SI-06.20c — Menu lateral (lógica & wiring: página de feed /subscriptions)

**Per-screen deliverables:**

- [ ] Screen Página de visualização do vídeo (/watch/[id]) is routable
- [ ] Screen Página de visualização do vídeo (/watch/[id]) renders loading, success, and error states
- [ ] Screen Página de visualização do vídeo (/watch/[id]) passes component tests (per testing-guide-next-frontend layers)
- [ ] Screen Página pública do canal (/channel/[nickname]) is routable
- [ ] Screen Página pública do canal (/channel/[nickname]) renders loading, success, and error states
- [ ] Screen Página pública do canal (/channel/[nickname]) passes component tests (per testing-guide-next-frontend layers)
- [ ] Screen Menu lateral ((studio)/*) is routable
- [ ] Screen Menu lateral ((studio)/*) renders loading, success, and error states
- [ ] Screen Menu lateral ((studio)/*) passes component tests (per testing-guide-next-frontend layers)

**Full test suites:**

- [ ] Backend tests pass (`cd nestjs-project && docker compose exec nestjs-api npm test -- --runInBand`)
- [ ] Backend E2E tests pass (`cd nestjs-project && docker compose exec nestjs-api npm run test:e2e`)
- [ ] Backend type/compilation checks pass (`cd nestjs-project && docker compose exec nestjs-api npx tsc --noEmit`)
- [ ] Backend lint passes (`cd nestjs-project && docker compose exec nestjs-api npm run lint`)
- [ ] Frontend tests pass (`cd next-frontend && docker compose exec next-frontend npm test`)
- [ ] Frontend E2E tests pass (`cd next-frontend && npx playwright test`, com o dev server em `MSW_ENABLED=true`)
- [ ] Frontend type/compilation checks pass (`cd next-frontend && docker compose exec next-frontend npx tsc --noEmit`)
- [ ] Frontend lint passes (`cd next-frontend && docker compose exec next-frontend npm run lint`)
