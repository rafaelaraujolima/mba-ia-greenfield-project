---
scope_type: phase
related_phases: [6]
status: pending
date: 2026-10-08
scope_description: "Interações sociais: likes/dislikes em vídeos e comentários, comentários com respostas, inscrição em canais, área de canais seguidos e contagens"
---

# Technical Decisions — Interações Sociais (Fase 06)

_Subprojects in scope:_

- `nestjs-project/` — novas entidades (reações, comentários, inscrições), endpoints autenticados, estratégia de contagem e consulta da área de seguidos (TD-01, TD-02, TD-04 e a parte backend das TDs cross-layer).
- `next-frontend/` — interface de likes, comentários e inscrições nas telas públicas (vídeo e canal) e no menu lateral (TD-08 e a parte frontend das TDs cross-layer).

> **Nota de verificação:** o servidor MCP do context7 estava indisponível durante esta pesquisa (`MCP_DOCKER` desconectado). Afirmações que dependem de API de biblioteca (React 19 `useOptimistic`, decoradores `@Tree` do TypeORM) foram escritas com base em conhecimento prévio e estão sinalizadas no texto com **[verificar]** — conferir na documentação oficial das versões instaladas (`react@19.2.4`, `next@16.2.6`, `typeorm@^0.3.28`) antes do `/plan-build`.

> **Decisões herdadas que restringem esta fase (não reabertas):** mutações via Route Handlers `app/api/**` com `requireSession()` (`phase-02-auth-frontend/TD-05`, `phase-04-videos-channel-frontend/TD-01`); sessão entregue ao cliente via Provider no root layout, `router.refresh()` após mutações (`phase-02-auth-frontend/TD-06`); Redis já na stack (`phase-03-videos/TD-01`); contrato tipado via OpenAPI + `openapi-fetch` (`next-frontend-openapi-typing`); erros via filtro de domínio (`phase-02-auth/TD-07`); página de vídeo e página do canal renderizadas dinamicamente sem cache (`video-watch-page/TD-04`, `phase-04-videos-channel-frontend/TD-03`).

---

## TD-01: Modelo de dados das reações (like/dislike) em vídeos e comentários

**Scope:** Backend

**Capability:** Transversal — covers: Like e dislike em vídeos (usuários autenticados); Like e dislike em comentários (usuários autenticados)

**Context:** Vídeos e comentários recebem a mesma reação binária e mutuamente exclusiva (um usuário tem no máximo uma reação por alvo: like **ou** dislike). A escolha define entidades, integridade referencial e as consultas de contagem da TD-02.

**Options:**

### Option A: Duas tabelas dedicadas (`video_reactions`, `comment_reactions`)
- Cada tabela com `user_id`, `video_id`/`comment_id` (FK), `type` (enum `like | dislike`) e `UNIQUE(user_id, alvo)`.
- **Pros:** FK real com `ON DELETE CASCADE` (apagar vídeo/comentário limpa as reações); índice simples por alvo para contagem; migrations independentes.
- **Cons:** duplicação de entidade/serviço (~2x código estruturalmente idêntico).

### Option B: Tabela única polimórfica (`reactions` com `target_type` + `target_id`)
- Uma entidade e um serviço para ambos os alvos.
- **Pros:** menos código; extensível a novos alvos.
- **Cons:** `target_id` sem FK real — integridade só por código, reações órfãs ao apagar o alvo; índices compostos maiores.

### Option C: Tabela única com duas FKs anuláveis (`video_id`, `comment_id`) + `CHECK` de exclusividade
- Uma entidade, FKs reais, `CHECK (exatamente uma FK não nula)` e dois índices únicos parciais.
- **Pros:** integridade referencial **e** uma única entidade.
- **Cons:** `CHECK`/índices parciais exigem SQL manual na migration (o TypeORM não os modela por decorators de forma idiomática); colunas anuláveis.

**Recommendation:** Option A — preserva integridade referencial e cascade com modelagem 100% idiomática no TypeORM, ao custo de duplicação mecânica que o projeto já aceita (entidade por conceito); a Option C só compensa se surgir um terceiro alvo de reação.

**Decision:** Option A

---

## TD-02: Estratégia de contagens (likes, comentários, inscritos)

**Scope:** Backend

**Capability:** Transversal — covers: Like e dislike em vídeos (usuários autenticados); Like e dislike em comentários (usuários autenticados); Comentários em vídeos (usuários autenticados); Contagem de inscritos na página do canal

**Context:** Contagens são consumidas em várias telas: detalhe do vídeo, lista de comentários (likes e nº de respostas), painel de gerenciamento (hoje devolve `likes`/`comments` como placeholders `0` — contrato já exposto) e página do canal (inscritos). Diferente do contador de views (`video-watch-page/TD-02`, Redis), aqui a escrita é **autenticada e de baixa frequência**, e a linha de reação/inscrição precisa existir no PostgreSQL de qualquer forma (unicidade por usuário). Depende de TD-01.

**Options:**

### Option A: `COUNT` agregado na leitura
- Contagem calculada via `GROUP BY` sobre as tabelas de reação/comentário/inscrição, em lote por página de resultados, apoiada por índices `(alvo, type)`.
- **Pros:** sempre consistente (fonte única da verdade), zero drift, nenhuma coluna ou escrita extra.
- **Cons:** custo cresce com o volume de linhas por alvo; listas paginadas exigem agregação em lote em vez de leitura direta.

### Option B: Colunas contadoras denormalizadas
- `like_count`, `comment_count`, `subscriber_count` atualizados por incremento atômico na mesma transação da mutação.
- **Pros:** leitura O(1); listas triviais.
- **Cons:** risco de drift (exige rotina de reconciliação), contenção em linha quente (vídeo/canal populares), toda mutação grava em duas tabelas.

### Option C: Contadores em Redis (padrão do `viewCount`)
- Chave por alvo, `INCR/DECR` junto à mutação.
- **Pros:** reuso do padrão já presente; leitura rápida.
- **Cons:** duas fontes de verdade para dado que o PostgreSQL já guarda por usuário; perda/rebuild em flush do Redis; sem atomicidade com a transação do banco.

**Recommendation:** Option A — o volume esperado é baixo, a agregação em lote por página (poucas dezenas de itens) com índices é barata, e evita criar uma segunda fonte de verdade para dados que já têm linha por usuário; a Option B fica como evolução localizada se houver medição que a justifique.

**Decision:** Option A

---

## TD-03: Contrato das mutações de estado binário (reação e inscrição)

**Scope:** Cross-layer

**Capability:** Transversal — covers: Like e dislike em vídeos (usuários autenticados); Like e dislike em comentários (usuários autenticados); Inscrição em canais (seguir/deixar de seguir)

**Context:** Reações e inscrições são estados do tipo "definido/removido" disparados por cliques repetíveis (duplo clique, retry, UI otimista — TD-08). A semântica HTTP escolhida define o contrato do backend, o Route Handler do BFF e o comportamento do cliente. Nota de contrato: o cliente `authedUpstream` hoje expõe apenas `GET | POST | PATCH` (`lib/api/authed-upstream.ts`), sem `PUT`/`DELETE`.

**Options:**

### Option A: `PUT`/`DELETE` idempotentes sobre sub-recurso singular
- `PUT /videos/:id/reaction` com `{ type }` e `DELETE` para remover; idem `PUT|DELETE /comments/:id/reaction` e `PUT|DELETE /channels/:id/subscription`. A resposta devolve o estado final e a contagem.
- **Pros:** idempotente (repetição não inverte estado), REST fiel às regras do projeto, ideal para UI otimista; trocar like↔dislike é um único `PUT`.
- **Cons:** exige estender o `authedUpstream` (e o BFF) com `PUT`/`DELETE`; dois verbos por recurso.

### Option B: `POST` de toggle por ação
- `POST /videos/:id/like`, `/dislike` (e equivalentes) que alternam o estado.
- **Pros:** só usa `POST`, já suportado pelo `authedUpstream`; endpoints simples.
- **Cons:** não idempotente — duplo clique/retry inverte o estado; like→dislike precisa de lógica de exclusão mútua em dois endpoints; UI otimista pode divergir do servidor.

### Option C: `POST` único com `{ type }` onde repetir o mesmo tipo remove a reação
- `POST /videos/:id/reactions { type }`; mesmo tipo duas vezes desfaz.
- **Pros:** um endpoint por alvo.
- **Cons:** toggle implícito (mesma não-idempotência de B); inscrição ainda precisa de contrato próprio.

**Recommendation:** Option A — a idempotência é o que torna seguro o duplo clique e a UI otimista; o custo (estender `authedUpstream` com `PUT`/`DELETE`) é localizado e único, e vale para os três recursos.

**Decision:** Option A

---

## TD-04: Modelo de hierarquia dos comentários (respostas aninhadas)

**Scope:** Backend

**Capability:** Transversal — covers: Comentários em vídeos (usuários autenticados); Respostas a comentários (comentários aninhados)

**Context:** O plano pede "comentários aninhados" sem fixar a profundidade. O modelo define o esquema, a consulta de leitura e a paginação das TD-05. O Figma da Fase 05 desenha a seção de comentários (cabeçalho com contagem, campo de entrada, um comentário com likes e botão "Reply"), mas **não desenha as respostas** — o formato "raiz + respostas" é, portanto, uma premissa a confirmar no `/screen-inventory`.

**Options:**

### Option A: `parent_id` com profundidade máxima 2 (raiz + respostas)
- Coluna `parent_id` autorreferente; responder a uma resposta anexa a nova resposta ao **raiz** da thread (podendo citar o autor respondido).
- **Pros:** leitura simples (raízes paginadas + respostas de um raiz em um nível), paginação trivial, sem recursão; casa com a UI usual de "ver respostas".
- **Cons:** perde árvore profunda; se "aninhados" significar profundidade arbitrária, não atende.

### Option B: `parent_id` com profundidade ilimitada (adjacency list)
- Mesma coluna, sem limite, lida por CTE recursiva.
- **Pros:** fidelidade total à árvore de conversa.
- **Cons:** CTE vira SQL cru no TypeORM; paginar/ordenar por árvore é complexo; indentação profunda complica a UI.

### Option C: Closure table / `@Tree` do TypeORM
- Tabela auxiliar de ancestrais (ou decorators `@Tree`) para consultar subárvores diretamente. **[verificar]** suporte e trade-offs de `@Tree` na doc do TypeORM 0.3.
- **Pros:** consulta de subárvore simples e eficiente.
- **Cons:** escrita extra (linhas de closure a cada comentário), complexidade e custo desproporcionais para a UI prevista.

**Recommendation:** Option A — entrega "respostas a comentários" com a menor superfície (sem recursão, paginação direta) e é o modelo mais comum para esse tipo de UI; **se a intenção do produto for profundidade arbitrária, a escolha correta passa a ser a Option B** — essa é a decisão a confirmar com o dono do produto.

**Decision:** Option A

---

## TD-05: Paginação e ordenação das listas de comentários e respostas

**Scope:** Cross-layer

**Capability:** Transversal — covers: Comentários em vídeos (usuários autenticados); Respostas a comentários (comentários aninhados)

**Context:** A paginação por `?page&pageSize` decidida em `phase-04-videos-channel/TD-04` foi justificada para listagens de vídeos **de um canal** (volume pequeno) e não é vinculante aqui. Comentários são uma lista de escrita frequente, lida por "carregar mais" e ordenada por "Latest" (Figma da Fase 05) — com inserções concorrentes, offset duplica/pula itens. A decisão afeta a forma da resposta do backend e o comportamento do cliente. Depende de TD-04.

**Options:**

### Option A: Offset (`?page&pageSize`), consistente com a Fase 04
- **Pros:** padrão já usado e testado no projeto; o frontend reaproveita utilitários de paginação.
- **Cons:** itens duplicados/pulados com inserções concorrentes; páginas profundas custam mais; paginação por links (URL como estado) não se adapta bem a "carregar mais" dentro de uma thread.

### Option B: Keyset por cursor (`created_at`, `id`) com "carregar mais"
- Resposta `{ items, nextCursor }`; raízes e respostas de cada thread paginam de forma independente.
- **Pros:** estável sob inserções, custo constante por página, adequado a feed de escrita frequente.
- **Cons:** o cliente acumula páginas em estado local (primeiro uso de fetch client-side incremental no projeto, que até aqui usou URL como estado — `phase-04-videos-channel-frontend/TD-02`); só ordenação estável por tempo (outras ordenações, como "mais curtidos", exigem outro cursor).

### Option C: Limite fixo sem paginação
- Retorna os N mais recentes (e as respostas inline).
- **Pros:** mais simples.
- **Cons:** comentários além de N ficam inacessíveis; não atende "interface completa".

**Recommendation:** Option B — comentários são um feed de escrita frequente cujo uso natural é "carregar mais"; o cursor evita o drift do offset, e o custo (estado acumulado no cliente) é pequeno e restrito a esta UI. A ordenação fica em "Latest" (única mostrada no Figma); outras ordenações não são capability desta fase.

**Decision:** Option B

---

## TD-06: Estado do usuário logado nas telas públicas (vídeo e canal)

**Scope:** Cross-layer

**Capability:** Transversal — covers: Like e dislike em vídeos (usuários autenticados); Inscrição em canais (seguir/deixar de seguir); Interface completa de comentários, likes e inscrições

**Context:** A página de vídeo (`/watch/[id]`) e a do canal são RSC anônimas por decisão da Fase 05 (`video-watch-page/TD-06`, Option A "nunca lê a sessão"), que já antecipava que a Fase 06 introduziria affordances logadas. Agora a tela precisa saber **a reação do usuário e se ele já é inscrito** para renderizar os botões no estado correto. O root layout já entrega `isLoggedIn` ao cliente via `SessionProvider` (`phase-02-auth-frontend/TD-06`); o que falta é o **dado por usuário**. Os endpoints `GET /videos/:id` já aceitam usuário opcional no backend. **Se a escolha for A, esta TD substitui (supersedes) `video-watch-page/TD-06`.**

**Options:**

### Option A: RSC lê a sessão e busca o estado do usuário no servidor
- Leitura não-lançadora da sessão; quando há token, `GET /videos/:id` e `GET /channels/:nickname` devolvem campos adicionais (`viewerReaction`, `viewerSubscribed`).
- **Pros:** primeira renderização já correta (sem flicker), sem round-trip extra, alinhado ao princípio "first-paint-correct" da Fase 02; as páginas já são dinâmicas e sem cache, então personalizar não custa cache.
- **Cons:** a página deixa de ser idêntica para todo visitante; token expirado em rota `@Public` precisa degradar para anônimo ou renovar (a renovação em RSC da `phase-04-frontend-contract-gaps/TD-03` cobre só rotas autenticadas) — **[verificar]** como o guard global trata token inválido em `@Public`.

### Option B: RSC permanece anônimo; ilhas client buscam o estado após hidratar
- Endpoint BFF dedicado (ex.: `GET /api/videos/[id]/viewer-state`) chamado pelo cliente quando `isLoggedIn`.
- **Pros:** HTML idêntico para todos; nenhuma leitura de sessão ou lógica de refresh no RSC; mantém a TD-06 da Fase 05 intacta.
- **Cons:** flicker (botões mudam de estado após a carga), round-trip extra por tela, um endpoint extra no backend e no BFF.

**Recommendation:** Option A — as telas já são dinâmicas e sem cache, então servir o estado do usuário na mesma resposta custa pouco e elimina o flicker; o ponto de atenção é o tratamento de token expirado em rota pública, que precisa ser resolvido na implementação.

**Decision:** Option A

**Revisions:**

- 2026-10-08 — Define o contrato de autenticação opcional nos endpoints públicos que devolvem estado do espectador (`GET /videos/:id`, `GET /channels/:nickname` e a lista de comentários): guard opcional no backend; token válido devolve `viewerState` (curtido/inscrito); token ausente, inválido ou expirado devolve 200 anônimo, sem estado. O BFF usa o helper de refresh existente (`phase-02-auth-frontend/TD-03`, `phase-04-frontend-contract-gaps/TD-03`) antes da chamada quando há sessão. Rationale: contrato do endpoint fechado no `/plan-resolve` (AMB-1) para o `/plan-build` escrever API Contracts sem ambiguidade; leitura pública não quebra se o refresh falhar.

---

## TD-07: Área de canais seguidos — conteúdo e carregamento

**Scope:** Cross-layer

**Capability:** Área de canais seguidos com acesso rápido aos vídeos

**Context:** O menu lateral já tem `SideNavSubscriptionList` com **lista estática de placeholder** ("subscriptions are a future-phase capability"), dentro do app shell de `(studio)`; as páginas públicas (vídeo/canal) não têm esse chrome. "Acesso rápido aos vídeos" admite duas leituras: atalho para o canal ou feed dos vídeos novos. Depende de TD-03 (inscrição) e TD-02 (contagem).

**Options:**

### Option A: Lista de canais seguidos no menu lateral
- `GET` de inscrições alimenta a lista (substitui o placeholder); cada item leva à página pública do canal.
- **Pros:** menor escopo; reaproveita a página do canal; um endpoint simples.
- **Cons:** "acesso rápido aos vídeos" fica em dois cliques (menu → canal → vídeo); sem visão agregada de novidades.

### Option B: Lista no menu **e** página de feed (`/subscriptions`)
- Mesma lista do menu, mais uma página com os vídeos publicados dos canais seguidos (join `subscriptions` → `videos`, `published_at DESC`, paginada).
- **Pros:** atende literalmente "acesso rápido aos vídeos"; reaproveita `VideoCard` e a paginação por URL da Fase 04.
- **Cons:** mais um endpoint e uma tela; a consulta do feed cresce com o número de inscrições; o índice existente `videos(channel_id, visibility, published_at)` cobre o filtro por canal, mas a ordenação global `published_at DESC` entre vários canais pode pedir um índice adicional (avaliar na implementação).

### Option C: Somente a página de feed
- Sem lista no menu; entrada por link de navegação.
- **Pros:** uma única superfície.
- **Cons:** deixa o placeholder do menu sem fonte de dados; perde o atalho por canal.

**Recommendation:** Option B — cobre as duas leituras de "acesso rápido" sem retrabalho, pois lista e feed usam a mesma tabela de inscrições; **a existência de uma tela de feed deve ser confirmada contra o Figma** na etapa de `/screen-inventory`, e a TD pode ser reduzida à Option A se não houver tela desenhada.

**Decision:** Option B

**Revisions:**

- 2026-10-08 — Confirma a Opção B sem frame de feed no Figma: a página `/subscriptions` é renderizada dentro do `AppShell` (menu visível) e compõe o grid de `VideoCard` existente com os vídeos publicados dos canais seguidos (`published_at DESC`, paginação por URL da Fase 04); o acesso a partir de páginas públicas não ganha link novo (a área de seguidos vive no shell `(studio)`). Rationale: tela de feed não desenhada, composta a partir de componentes existentes (IC-1, OQ-1, AMB-2).

---

## TD-08: Estratégia de atualização da UI após mutações (otimista vs. confirmada)

**Scope:** Frontend

**Capability:** Interface completa de comentários, likes e inscrições

**Context:** Like/dislike/inscrição são cliques frequentes cujo feedback imediato importa; comentários criam um item cujo `id` e posição são atribuídos pelo servidor. A regra herdada manda `router.refresh()` após mutações (`phase-02-auth-frontend/TD-06`) e o projeto evita lib de cache cliente (`phase-04-videos-channel-frontend/TD-02`). Depende de TD-03.

**Options:**

### Option A: `useOptimistic` nos toggles + reconciliação por `router.refresh()`; comentários aguardam o servidor
- **[verificar]** `useOptimistic` (React 19) e interação com Route Handlers/`router.refresh()` na doc de `react@19.2.4`/`next@16.2.6`.
- **Pros:** feedback instantâneo onde importa; rollback automático em erro; sem nova dependência; combina com a idempotência da TD-03 (Option A).
- **Cons:** dois comportamentos na mesma UI (toggles otimistas, comentários confirmados); contagens otimistas precisam ser reconciliadas.

### Option B: Sempre aguardar o servidor + `router.refresh()`
- **Pros:** um único modelo mental; sem estado otimista a reconciliar.
- **Cons:** latência visível a cada clique; `refresh()` re-renderiza a árvore inteira da página.

### Option C: Lib de cache cliente (SWR / React Query) com `mutate` otimista
- **Pros:** cache, revalidação e otimismo prontos.
- **Cons:** nova dependência e segunda camada de cache, contrariando a decisão de não adotar cache cliente; exigiria justificar a mudança de arquitetura para uma única fase.

**Recommendation:** Option A — usa primitivas já instaladas, dá resposta imediata aos cliques e se apoia na idempotência da TD-03; a Option B é aceitável se a equipe preferir um único modelo mental, a custo de latência percebida.

**Decision:** Option A

---

## TD-09: Formato e política do conteúdo do comentário

**Scope:** Cross-layer

**Capability:** Comentários em vídeos (usuários autenticados)

**Context:** O texto do comentário é entrada de usuário exibida a terceiros: a escolha define a validação no backend (`class-validator`), o espelho na validação cliente (`phase-02-auth-frontend/TD-04`) e a superfície de XSS no render. Depende de TD-04 apenas para a mesma entidade.

**Options:**

### Option A: Texto puro, com limite de tamanho, renderizado escapado
- Validação de tamanho no DTO e espelhada no formulário; render como texto (quebras de linha preservadas), sem links clicáveis.
- **Pros:** menor superfície de XSS (o React escapa por padrão); zero dependência nova; contrato simples.
- **Cons:** URLs e menções não viram links.

### Option B: Texto puro + autolink/menções no render do cliente
- Mesmo armazenamento; o cliente detecta URLs e `@nick` e os renderiza como links.
- **Pros:** UX melhor para links e menções.
- **Cons:** lógica de detecção/segurança de links (`rel`, esquemas permitidos) a manter; menções sem efeito de notificação criam expectativa.

### Option C: Subconjunto de Markdown sanitizado
- **Pros:** formatação rica.
- **Cons:** parser + sanitizador como dependências, maior risco de XSS, sem requisito no plano nem no Figma.

**Recommendation:** Option A — o plano não pede formatação, o texto puro mantém a menor superfície de ataque sem dependências, e links/menções podem entrar depois como evolução isolada do render (Option B) sem mudar o contrato de armazenamento.

**Decision:** Option A

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|---------------|--------|
| TD-01 | Backend | Modelo de dados das reações em vídeos e comentários | A (duas tabelas dedicadas) | Option A |
| TD-02 | Backend | Estratégia de contagens (likes, comentários, inscritos) | A (`COUNT` agregado na leitura) |Option A |
| TD-03 | Cross-layer | Contrato das mutações de estado binário (reação e inscrição) | A (`PUT`/`DELETE` idempotentes) |Option A |
| TD-04 | Backend | Modelo de hierarquia dos comentários | A (profundidade máxima 2) | Option A |
| TD-05 | Cross-layer | Paginação e ordenação de comentários e respostas | B (keyset por cursor) | Option B |
| TD-06 | Cross-layer | Estado do usuário logado nas telas públicas (substitui `video-watch-page/TD-06` se A) | A (RSC lê sessão) | Option A |
| TD-07 | Cross-layer | Área de canais seguidos — conteúdo e carregamento | B (lista no menu + feed) | Option B |
| TD-08 | Frontend | Atualização da UI após mutações | A (`useOptimistic` + `router.refresh()`) | Option A |
| TD-09 | Cross-layer | Formato e política do conteúdo do comentário | A (texto puro escapado) | Option A |
