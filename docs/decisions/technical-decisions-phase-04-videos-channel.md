---
scope_type: phase
related_phases: [4]
status: pending
date: 2026-09-22
scope_description: "Backend foundation for Phase 04: video category taxonomy, custom thumbnail upload, the visibility/publish-flow data model (public vs unlisted, draft vs published — distinct from the existing upload/processing status enum), and pagination for the channel management panel and public channel video listings. Frontend (management panel UI, public channel page) is deferred to a follow-up research pass, mirroring how Phase 02's frontend was researched separately from its backend."
---

# Technical Decisions — Phase 04: Gerenciamento de Vídeos e Canal (Backend)

_Subprojects in scope:_

- `nestjs-project/` — owns every decision in this document: category data model, custom thumbnail upload endpoint, visibility/publish-flow fields on `Video`, and pagination shape for channel-scoped video listings (management panel + public channel page).
- `next-frontend/` — Frontend deferred: the management panel, video edit forms, channel edit forms, and public channel page (`Painel de gerenciamento de vídeos do canal`, `Edição de vídeos a partir do painel`, `Edição das informações do canal`, `Página pública do canal`) will be addressed in a follow-up research pass once the backend contract below is decided — same sequencing Phase 02 used (backend researched first, frontend screens researched as a separate later pass). No open decision in this document; `TD-04` (pagination) is `Cross-layer` because the response shape is being fixed now for the backend to implement, but no frontend implementation choice is made here.

---

## TD-01: Modelo de dados para categorias de vídeo

**Scope:** Backend

**Capability:** Categorias de vídeo disponíveis na plataforma

**Context:** `Video` não tem hoje nenhum campo de categoria. A categoria escolhida nesta fase também é reutilizada em fases futuras já planejadas — sugestões por categoria na sidebar (Fase 05) e filtro por categoria na home (Fase 06/07) — o que pesa a favor de um modelo que suporte consultas e, potencialmente, metadados de exibição sem exigir nova migration a cada mudança na lista de categorias.

**Options:**

### Option A: Enum fixo (`videos.category` como Postgres enum via TypeORM)
- Coluna `category` do tipo `enum` na própria tabela `videos`, com os valores fixos definidos em código (mesmo padrão já usado para `VideoStatus`).
- **Pros:** zero tabela extra, sem joins; migração inicial simples; consistente com o padrão já estabelecido para o enum de status técnico do vídeo.
- **Cons:** adicionar, renomear ou remover uma categoria exige uma nova migration (Postgres `ALTER TYPE ... ADD VALUE` tem restrições de transação); não há espaço para metadados por categoria (ex.: slug de URL, ordem de exibição) sem sobrecarregar o enum.

### Option B: Tabela dedicada `categories` (id, name, slug) + FK `videos.category_id`
- Tabela de referência com as categorias disponíveis, e `videos.category_id` como FK nullable (nullable até o vídeo ser categorizado).
- **Pros:** extensível sem DDL (adicionar categoria = `INSERT`, não migration); suporta metadados futuros (slug, ordem) sem redesenho; junta-se naturalmente às queries de listagem/filtro por categoria que as Fases 05/06/07 já preveem.
- **Cons:** uma tabela + FK + seed a mais para manter; toda query de vídeo que precise exibir o nome da categoria precisa de um join (mitigável com `relations`/`select` específico do TypeORM).

**Recommendation:** Option B (tabela dedicada) — categoria aqui não é um estado técnico interno (como `VideoStatus`), é uma taxonomia de conteúdo reutilizada em pelo menos mais duas fases já planejadas para filtro/sugestão; uma tabela evita migration a cada ajuste na lista de categorias (uma mudança de produto plausível e barata de fazer via seed) e mantém aberta a porta para metadados de exibição sem redesenho de schema.

**Decision:** B (tabela dedicada `categories` + FK `videos.category_id`)

---

## TD-02: Upload de thumbnail customizada

**Scope:** Backend

**Capability:** Transversal — covers: Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada, Edição de vídeos a partir do painel

**Context:** "Edição de vídeos a partir do painel" não introduz nenhum mecanismo novo — é o mesmo endpoint `PATCH /videos/:id` (título/descrição/categoria/thumbnail) descrito abaixo, apenas disparado a partir da UI do painel de gerenciamento em vez de outro ponto da interface. Não há alternativa técnica de backend distinta para "editar a partir do painel" vs. "editar" — por isso esta TD cobre as duas capacidades (resolvido via `research/SKILL.md`'s teste (d)+(a): sem contrato cross-component adicional, sem lacuna de melhores práticas). O vídeo já tem uma thumbnail gerada automaticamente pelo worker (`thumbnail_key`, `phase-03-videos/TD-04`). Esta fase permite que o dono substitua essa thumbnail por uma imagem própria. Ao contrário do vídeo original (até 10GB — motivo do fluxo multipart pré-assinado da `phase-03-videos/TD-02`), uma imagem de thumbnail é tipicamente pequena (poucos MB), o que muda o cálculo de custo/benefício entre proxiar o upload pela API ou repetir o fluxo pré-assinado.

**Options:**

### Option A: Upload direto via API (multipart/form-data)
- O cliente envia o arquivo de imagem no corpo da requisição como `multipart/form-data`; a API recebe via `@UseInterceptors(FileInterceptor('thumbnail'))` + `@UploadedFile() file: Express.Multer.File` (`@nestjs/platform-express`, doc oficial confirmada via context7 nesta pesquisa), valida tipo/tamanho, e faz o upload para o storage (`PutObjectCommand`, reaproveitando o `S3_CLIENT` já existente) antes de responder.
- **Pros:** fluxo de uma única requisição, simples de implementar e de consumir; quase nenhuma dependência nova — `multer` (runtime) já está instalado como transitiva de `@nestjs/platform-express` (confirmado no lockfile), só falta `@types/multer` como dev dependency para tipar `Express.Multer.File`; adequado ao tamanho pequeno do arquivo — não reintroduz o problema (API travada por upload grande) que motivou o fluxo multipart pré-assinado do vídeo em si.
- **Cons:** a API fica ocupada durante o upload da imagem (aceitável dado o tamanho); validação de MIME/tamanho precisa ser feita na própria API (`multer` `fileFilter`/`limits`, ou os pipes `ParseFilePipe`/`FileTypeValidator`/`MaxFileSizeValidator` do próprio Nest).

### Option B: URL pré-assinada de escrita (mesmo padrão do vídeo original)
- Repete o fluxo da `phase-03-videos/TD-02`: a API gera uma `PutObjectCommand` pré-assinada, o cliente faz o `PUT` direto no storage, e a API só é notificada depois para atualizar `thumbnail_key`.
- **Pros:** reaproveita 100% um padrão já decidido e implementado; a API nunca recebe bytes de arquivo.
- **Cons:** três requisições (pedir URL, `PUT` no storage, confirmar) para um arquivo de poucos MB — complexidade desproporcional ao problema original que esse padrão resolve (arquivos grandes o suficiente para travar a API, o que uma thumbnail não é).

**Recommendation:** Option A — thumbnails são pequenas o suficiente para não recriar o problema que o fluxo pré-assinado do vídeo existe para resolver; um upload direto via `FileInterceptor` entrega o mesmo resultado com uma única requisição e apenas uma dependência nova, `@types/multer` (dev-only, para tipar `Express.Multer.File`). A thumbnail customizada deve sobrescrever a mesma chave já usada pela thumbnail automática (`videos/{id}/thumbnail.jpg`, convenção da `phase-03-videos/TD-07`) — mantém a invariante de no máximo uma thumbnail ativa por vídeo, sem precisar rastrear qual está em uso.

**Decision:** A (upload direto via API, `FileInterceptor` + `@nestjs/platform-express`)
**Libraries:** @types/multer (dev)

---

## TD-03: Modelo de visibilidade e fluxo de rascunho → publicação

**Scope:** Backend

**Capability:** Transversal — covers: Visibilidade do vídeo: público (aparece para todos) ou unlisted (somente via link), Fluxo de rascunho → publicação

**Context:** `Video.status` (`draft | processing | ready | error`) já existe, mas cobre **exclusivamente** o pipeline técnico de upload/processamento — isso já foi esclarecido explicitamente na `phase-03-videos/TD-06` (AMB-2 do `plan-validate` daquela fase): "a dimensão de publicação de conteúdo (rascunho ↔ publicado) da Fase 04 é um campo/estado separado, fora do escopo desta TD." Esta TD decide como esse campo/estado separado é modelado, e como ele se combina com `status` e com a regra de visibilidade pública/unlisted para determinar quem pode ver um vídeo.

**Options:**

### Option A: Campos independentes — `visibility` enum (`public`, `unlisted`) + `published_at` (timestamp nullable)
- `Video` ganha duas colunas novas, ortogonais ao `status` técnico existente. `published_at IS NULL` = rascunho editorial; preenchido = publicado. Visibilidade pública efetiva exige `status=ready AND published_at IS NOT NULL AND visibility=public`; um vídeo `unlisted` publicado é acessível via link direto (`GET /videos/:id`, já com a lógica de visibilidade da `phase-03-videos/TD-06`) mas não aparece em listagens públicas do canal.
- **Pros:** cada dimensão (técnica vs. editorial) evolui e é consultada independentemente; `published_at` também entrega, sem coluna extra, o "tempo de publicação" que o painel de gerenciamento precisa exibir.
- **Cons:** a regra de visibilidade pública combina três condições (`status` + `visibility` + `published_at`) — precisa de um índice composto para listagens públicas performáticas em escala.

### Option B: Enum único `publication_status` (`draft`, `published_public`, `published_unlisted`)
- Substitui as duas dimensões por uma única coluna combinando publicação e visibilidade.
- **Pros:** uma única coluna a checar nas queries de visibilidade.
- **Cons:** mistura duas dimensões ortogonais — um vídeo pode estar tecnicamente `processing` e já ter sido marcado para publicar assim que ficar pronto, estado que fica inexprimível num único enum sem também misturar com `status`; contraria diretamente a decisão já registrada na `phase-03-videos/TD-06` de manter o pipeline técnico separado da dimensão de publicação.

**Recommendation:** Option A — a `phase-03-videos/TD-06` já deixou explícito que a publicação seria "um campo/estado separado" desta fase; um enum único (Option B) reabriria essa decisão e criaria estados inexprimíveis (pipeline técnico e intenção editorial avançando em paralelo). `published_at` como timestamp, em vez de boolean, também resolve de graça o campo "tempo de publicação" pedido pelo painel de gerenciamento.

**Decision:** A (campos independentes `visibility` enum + `published_at` timestamp nullable)

---

## TD-04: Estratégia de paginação para listagens de vídeo do canal

**Scope:** Cross-layer

**Capability:** Transversal — covers: Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status), Página pública do canal com informações e listagem de vídeos

**Context:** Tanto o painel de gerenciamento (todos os vídeos do canal, qualquer status, visível só ao dono) quanto a página pública do canal (só vídeos `ready`+publicados+`public`, visível a qualquer um) precisam de um endpoint de listagem paginada. A forma de paginação é uma decisão de contrato (afeta o formato da resposta que o frontend consumirá quando a pesquisa de frontend desta fase acontecer), por isso `Cross-layer`, mesmo que a implementação de UI fique para depois.

**Options:**

### Option A: Paginação por página/offset (`?page=1&pageSize=20`, `LIMIT/OFFSET`)
- TypeORM `skip`/`take` nativos sobre a query já filtrada por `channel_id` (e por visibilidade, no caso da página pública).
- **Pros:** simples de implementar e de consumir; natural para uma UI de painel administrativo com números de página ("ir para a página 3"); resposta inclui total de itens/páginas sem custo adicional relevante na escala esperada.
- **Cons:** degrada em tabelas muito grandes (OFFSET alto = scan); pode pular ou repetir itens se a lista mudar entre requisições consecutivas (ex.: um vídeo novo publicado entre duas páginas carregadas).

### Option B: Paginação por cursor (keyset, `?cursor=...&limit=20`, ordenado por `created_at`+`id`)
- Cada página retorna um cursor opaco apontando para o próximo lote, sem depender de `OFFSET`.
- **Pros:** performance estável independente da profundidade da paginação; sem duplicação/salto de itens quando a lista muda entre requisições.
- **Cons:** sem "pular para a página N" (natural para "carregar mais"/scroll infinito, menos natural para numeração explícita de página); mais código no backend para codificar/decodificar o cursor.

**Recommendation:** Option A (página/offset) — o volume de vídeos por canal nesta plataforma é tipicamente pequeno (dezenas a poucas centenas, não milhões), faixa em que a degradação de performance do `OFFSET` não é um problema real; a paginação numerada também é o padrão mais natural para um painel de administração, e evita a complexidade extra de cursor sem ganho perceptível nesta escala.

**Decision:** A (`?page=1&pageSize=20`, TypeORM `skip`/`take`)

---

## TD-05: Política de troca de nickname do canal

**Scope:** Backend

**Capability:** Edição das informações do canal: nickname, nome e descrição

**Context:** Nome e descrição são edição CRUD trivial (`PATCH` validado por `class-validator`, sem alternativas reais — resolvido pela convenção já estabelecida do projeto, não é uma decisão estratégica). Nickname é diferente: é único no banco (`channels.nickname` `UNIQUE`) e compõe a URL pública do canal (listagem/página pública, `TD-04`). Na criação automática (`phase-02-auth/TD-10`), uma colisão é resolvida silenciosamente por sufixo aleatório (`appendRandomSuffix`) porque é o sistema quem escolhe o valor. Numa edição explícita, o usuário digita o nickname desejado — aplicar o mesmo sufixo silencioso devolveria um valor diferente do pedido, o que é uma UX ruim. Esta TD decide o comportamento de colisão na edição de nickname, e se a troca quebra URLs antigas.

**Options:**

### Option A: Rejeitar colisão com 409, sem sufixo automático; sem redirect de nickname antigo
- `PATCH /channels/:id` valida unicidade do novo nickname antes de salvar; em colisão, lança uma nova exceção de domínio (409), sem tentar sufixo automático. Ao trocar de nickname, o nickname antigo fica livre para outro canal usar; links antigos usando o nickname antigo deixam de resolver (404).
- **Pros:** comportamento simples e previsível — o usuário recebe exatamente o nickname que pediu, ou um erro claro; reaproveita o padrão de exceção de domínio já estabelecido (`DomainException`, `phase-02-auth/TD-07`); nenhuma tabela ou lógica extra de histórico.
- **Cons:** links compartilhados antes da troca (redes sociais, favoritos) quebram sem aviso.

### Option B: Rejeitar colisão com 409 + manter histórico de nicknames para redirect
- Mesma validação de colisão da Option A, mas adiciona uma tabela (ou coluna) de histórico de nicknames antigos por canal; a resolução da página pública do canal (`TD-04`) consulta o nickname atual primeiro e cai para o histórico se não encontrar, redirecionando (301) para a URL atual.
- **Pros:** links antigos continuam funcionando via redirect — melhor experiência para quem compartilhou a URL antes da troca.
- **Cons:** tabela/lógica extra sem nenhum requisito explícito do projeto pedindo isso; nicknames liberados por um canal poderiam colidir com o histórico de outro (precisa de mais uma regra de unicidade); complexidade desproporcional para um requisito que não menciona preservação de links.

**Recommendation:** Option A — o projeto não pede preservação de links históricos em nenhum lugar (`project-plan.md` só pede "edição... de nickname"); Option B resolve um problema não solicitado com custo real (tabela extra, regra de unicidade adicional). Rejeitar colisão com 409 (em vez do sufixo automático silencioso usado na criação) é o comportamento correto para uma edição explícita: o usuário pediu um valor específico, e a API deve honrar esse pedido ou recusar claramente — nunca substituir silenciosamente pelo que ele pediu por outra coisa.

**Decision:** A (409 em colisão, sem sufixo automático, sem redirect de nickname antigo)

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|---------------|--------|
| TD-01 | Backend | Modelo de dados para categorias de vídeo | Option B (tabela dedicada `categories`) | **B** |
| TD-02 | Backend | Upload de thumbnail customizada | Option A (upload direto via API) | **A** |
| TD-03 | Backend | Modelo de visibilidade e fluxo de publicação | Option A (campos independentes `visibility`+`published_at`) | **A** |
| TD-04 | Cross-layer | Paginação de listagens de vídeo do canal | Option A (página/offset) | **A** |
| TD-05 | Backend | Política de troca de nickname do canal | Option A (409 na colisão, sem redirect de nickname antigo) | **A** |
