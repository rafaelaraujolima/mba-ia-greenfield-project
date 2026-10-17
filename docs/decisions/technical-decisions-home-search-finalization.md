---
scope_type: phase
related_phases: [7]
status: pending
date: 2026-10-12
scope_description: "Fase 07: home com grid e filtro por categoria, busca por título e canal, header/navbar nas páginas públicas, paginação, responsividade, testes dos fluxos principais e ambiente de produção"
---

# Technical Decisions — Página Inicial, Busca e Finalização

_Subprojects in scope:_

- `nestjs-project/` — novo endpoint público de listagem/busca de vídeos (filtro por categoria, paginação) e contagem de views em lote (TD-01 a TD-04)
- `next-frontend/` — home, resultados de busca, header/navbar nas páginas públicas, comportamento do shell em mobile e cache da home/busca (TD-01, TD-03, TD-05, TD-06, TD-10)
- Repo-wide — estratégia de testes dos fluxos principais, topologia de produção e CI/CD (TD-07 a TD-09)

_Decisões herdadas (não reabertas):_ paginação por página/offset nas listagens de vídeo do canal e URL como estado via RSC + `searchParams` (`phase-04-videos-channel/TD-04`, `phase-04-videos-channel-frontend/TD-02`); regra unificada de visibilidade (`ready` + publicado + `public`; `unlisted` fora de listagens); BFF com Route Handlers e `optionalAuthedUpstream` (`social-interactions/TD-06`); Swagger desabilitado em produção (`openapi-docs-nestjs/TD-03`); categorias em tabela dedicada (`phase-04-videos-channel/TD-01`).

_Decisões herdadas que a fase 07 reavalia (delegadas por elas mesmas):_ cache e revalidação das páginas públicas (`phase-04-videos-channel-frontend/TD-03`) e cache de cliente para feed longo (`phase-04-videos-channel-frontend/TD-02`) — tratadas no TD-10.

---

## TD-01: Contract da listagem pública e da busca de vídeos

**Scope:** Cross-layer

**Capability:** Transversal — covers: "Página inicial com grid de vídeos (thumbnail, título, canal, visualizações e tempo de publicação)", "Filtro de vídeos por categoria na home", "Barra de busca (pesquisa por título e canal)"

**Context:** Hoje só existem listagens por canal; não há endpoint que liste vídeos de todos os canais. A home (com filtro de categoria) e os resultados de busca mostram o mesmo card de vídeo e as mesmas regras de visibilidade, diferindo no termo de busca. A forma do contrato (um endpoint ou dois) é cruzada entre backend e frontend e precisa ser fixada uma vez.

**Options:**

### Option A: Um endpoint `GET /videos` com filtros opcionais
- `GET /videos?q=&categoryId=&page=&pageSize=` devolve `{ items, page, pageSize, total }`. Sem `q` é a home; com `q` é a busca; `categoryId` filtra nos dois casos.
- **Pros:** um único shape, uma única query de visibilidade e um único conjunto de testes; o filtro por categoria funciona também na busca sem código extra.
- **Cons:** `q` e `categoryId` dividem o mesmo handler; a ordenação por relevância (se vier) mistura-se com a cronológica.

### Option B: Dois endpoints (`GET /videos` e `GET /search/videos`)
- A home usa a listagem cronológica; a busca tem endpoint próprio, com parâmetros e ordenação próprios.
- **Pros:** a busca pode evoluir (relevância, sugestões) sem tocar a home; contratos separados.
- **Cons:** duplica a regra de visibilidade e o shape de resposta; mais superfície para manter em sincronia.

**Recommendation:** Option A — as duas telas consomem o mesmo card e a mesma regra de visibilidade, e o plano não pede ordenação por relevância nem sugestões; separar agora só duplicaria contrato e testes. Se a busca ganhar relevância depois, extrair o endpoint é uma mudança localizada.

**Decision:** A (um `GET /videos` com `q`/`categoryId`/`page`/`pageSize`, resposta `{ items, page, pageSize, total }`; os chips de categoria também aparecem em `/search`, que aceita `categoryId` junto de `q`; `/search` sem `q` redireciona para `/`)

---

## TD-02: Técnica de busca por título e canal

**Scope:** Backend

**Capability:** "Barra de busca (pesquisa por título e canal)"

**Context:** A busca precisa casar o termo com o título do vídeo e com o nome/nickname do canal, sobre PostgreSQL 17 (única fonte de dados do projeto). A técnica define índices, migration e o comportamento percebido (substring vs palavras inteiras).

**Options:**

### Option A: `ILIKE '%termo%'` com índice GIN `pg_trgm`
- Habilita a extensão `pg_trgm` e cria índices GIN de trigramas em `videos.title`, `channels.name` e `channels.nickname`; a query usa `ILIKE` com o termo escapado.
- **Pros:** casa substring e erros de digitação leves, que é o que o usuário espera de uma barra de busca; sem configuração de idioma; índice acelera `ILIKE`.
- **Cons:** exige migration com `CREATE EXTENSION`; não faz ranking por relevância de forma nativa.

### Option B: Full-text search (`tsvector` + `plainto_tsquery`)
- Coluna gerada `tsvector` com GIN em título (e canal via join/coluna denormalizada), consulta por palavras.
- **Pros:** ranking (`ts_rank`), stemming por idioma.
- **Cons:** não casa prefixo/substring ("comp" não acha "computador") sem `:*`; exige escolher configuração de idioma para um conteúdo misto; o canal está em outra tabela.

### Option C: `ILIKE` sem índice
- Mesma query de A, sem extensão nem índice.
- **Pros:** nenhuma migration nova.
- **Cons:** varredura sequencial a cada busca; degrada com o crescimento da tabela.

**Recommendation:** Option A — entrega o comportamento de substring que uma barra de busca precisa, com índice, sem depender de configuração de idioma, e a extensão já vem nos binários do `postgres:17` usado no `compose.yaml`; a Option B só compensa se relevância virar requisito.

**Decision:** A (`ILIKE` + índice GIN `pg_trgm` em `videos.title`, `channels.name` e `channels.nickname`)

---

## TD-03: Paginação da home e dos resultados de busca

**Scope:** Cross-layer

**Capability:** "Paginação ou scroll infinito nas listagens de vídeos"

**Context:** A listagem global é a maior do sistema, e o plano aceita paginação ou scroll infinito. O projeto já usa offset com links nas listagens de canal e cursor com "carregar mais" nos comentários; esta TD escolhe o modelo da listagem global (depende de TD-01).

**Options:**

### Option A: Offset com links de página (`?page=`), RSC + `searchParams`
- Reaproveita `page`/`pageSize`, `getPaginationWindow` e `PaginationLinks`; a URL carrega página, categoria e termo.
- **Pros:** zero componente novo; URL compartilhável e funciona sem JavaScript; consistente com o canal.
- **Cons:** `OFFSET` alto degrada em tabelas muito grandes; um vídeo publicado entre duas páginas pode deslocar itens.

### Option B: Cursor com "carregar mais"
- Keyset por `published_at` + `id`, como os comentários, com botão "carregar mais" no cliente.
- **Pros:** performance estável; sem itens repetidos ou perdidos.
- **Cons:** cursor/estado acumulado no cliente; URL não representa a posição; mais código novo.

### Option C: Offset com scroll infinito no cliente
- `IntersectionObserver` carrega a próxima página (`?page=n`) e acrescenta ao grid.
- **Pros:** experiência contínua de feed.
- **Cons:** estado acumulado, perda de posição ao navegar de volta e acessibilidade do rodapé; mais componente e teste.

**Recommendation:** Option A — reaproveita o que já está decidido e implementado (links de página, URL como estado) e o volume esperado não justifica o custo do cursor; a Option B passa a valer se a medição mostrar degradação do `OFFSET` na listagem global.

**Decision:** A (offset `?page=`/`pageSize` com links, RSC + `searchParams`; o controle de paginação é derivado de `components/common/pagination-links.tsx`, sem frame no Figma)

---

## TD-04: Contagem de visualizações no grid

**Scope:** Backend

**Capability:** "Página inicial com grid de vídeos (thumbnail, título, canal, visualizações e tempo de publicação)"

**Context:** A contagem de views de cada vídeo mora apenas no Redis (`video-watch-page/TD-02`), e o painel de gestão ainda devolve `views: 0` como placeholder. O grid da home precisa da contagem para até `pageSize` vídeos por requisição.

**Options:**

### Option A: Leitura em lote do Redis por página (`MGET`)
- Após a query paginada, um único `MGET` dos contadores dos ids da página; o mesmo helper atende o painel de gestão.
- **Pros:** sem mudar o modelo de dados; uma ida ao Redis por página; resolve também o placeholder do painel.
- **Cons:** não permite ordenar por visualizações em SQL; a contagem some se o Redis for perdido sem persistência.

### Option B: Persistir `view_count` no PostgreSQL
- Coluna no vídeo, atualizada por job periódico a partir do Redis (ou por incremento direto).
- **Pros:** durabilidade e possibilidade de ordenar por popularidade.
- **Cons:** migration, job de sincronização e um segundo lugar com a contagem; fora do que o plano pede.

**Recommendation:** Option A — o plano pede só exibir a contagem, e a leitura em lote cumpre isso sem segunda fonte de verdade; a Option B só entra se "mais vistos" virar requisito.

**Decision:** A (`MGET` em lote no Redis por página)

---

## TD-05: Header/navbar e shell nas páginas públicas

**Scope:** Frontend

**Capability:** "Header/navbar com logo, barra de busca, botão de login/avatar e navegação"

**Context:** O `TopNav` e o `SideNav` só existem dentro do `AppShell` do grupo `(studio)`, com a busca desabilitada e o avatar assumindo sessão. Home, busca, vídeo e canal são públicas e hoje não têm header. A decisão é como compartilhar o chrome entre anônimos e logados.

**Options:**

### Option A: Grupo de rotas `(public)` com o mesmo `AppShell`, variante por sessão
- Um layout de grupo envolve home, busca, vídeo e canal; o `TopNav` mostra "Entrar" quando anônimo e o avatar quando logado; o `SideNav` esconde itens que exigem login.
- **Pros:** um único shell; busca e navegação consistentes em todas as páginas; reaproveita os componentes e testes existentes.
- **Cons:** o `AppShell` passa a ter ramos por sessão; mexe em rotas já em produção (vídeo e canal).

### Option B: Shell separado só com header nas páginas públicas
- Novo `PublicShell` com `TopNav` (sem `SideNav`), mantendo o `AppShell` do studio intacto.
- **Pros:** menor risco para o studio; páginas públicas mais enxutas.
- **Cons:** dois shells para manter; some a navegação lateral (Home, Subscriptions) para quem navega fora do studio.

**Recommendation:** Option A — o plano pede navegação consistente e o projeto já tem o shell com os componentes; manter dois shells duplicaria a busca e o menu de conta, e o ramo por sessão é pequeno e fica testável em um único lugar.

**Decision:** A (grupo de rotas `(public)` com o mesmo `AppShell`; o `SideNav` do visitante anônimo mostra só itens públicos — Home — e oculta Subscriptions, Your videos, Liked videos e a lista de canais seguidos até o login)

---

## TD-06: Comportamento do shell em dispositivos móveis

**Scope:** Frontend

**Capability:** "Layout responsivo para dispositivos móveis"

**Context:** O `SideNav` tem largura fixa (`w-64`), e as telas de vídeo (sidebar de 411px) e canal usam larguras fixas. É preciso definir como o shell e as páginas se adaptam abaixo do breakpoint `md` sem frames de mobile no Figma.

**Options:**

### Option A: Mobile-first com Tailwind e `SideNav` como gaveta sobreposta
- Abaixo de `md` o `SideNav` vira overlay aberto pelo botão de menu, o grid reduz colunas, e a sidebar de sugestões desce para baixo do vídeo.
- **Pros:** usa só utilitários e tokens existentes; comportamento padrão de apps de vídeo.
- **Cons:** o overlay exige gerenciar foco e fechamento (acessibilidade); sem design de referência, o resultado é derivado.

### Option B: Esconder o `SideNav` em mobile (sem gaveta)
- O menu lateral some abaixo de `md`; navegação só pelo header.
- **Pros:** muito simples; sem estado nem foco para gerenciar.
- **Cons:** perde acesso a Subscriptions e canais seguidos no celular.

**Recommendation:** Option A — preserva o acesso às inscrições (capability da fase 06) em mobile, e o custo adicional é um componente de overlay; a Option B é aceitável se a equipe preferir entregar primeiro e evoluir depois.

**Decision:** A (mobile-first com Tailwind, breakpoint `md`, vale para as telas públicas — home, busca, vídeo e canal; o studio permanece desktop-first; `SideNav` em gaveta aberta pelo botão de menu e que fecha ao navegar)

---

## TD-07: Estratégia de testes dos fluxos principais

**Scope:** Repo-wide

**Capability:** "Testes dos fluxos principais da plataforma"

**Context:** Hoje o Playwright roda contra o dev server do frontend com `MSW_ENABLED=true` (sem backend real), e há só dois specs de auth; os fluxos de ponta a ponta (cadastro → login → upload → publicação → assistir → comentar/inscrever) não têm cobertura que atravesse backend, worker e storage.

**Options:**

### Option A: Playwright full-stack sobre o Docker Compose, com seed
- Sobe `nestjs-api`, worker, Postgres, Redis, MinIO e Mailpit; o frontend roda sem MSW; os specs percorrem os fluxos reais.
- **Pros:** exercita contrato, BFF, worker e storage de verdade; pega regressões de integração.
- **Cons:** lento e mais frágil; exige estado determinístico (seed/limpeza) e FFmpeg no ambiente.

### Option B: Manter apenas Playwright com MSW
- Specs por tela contra fixtures; sem backend real.
- **Pros:** rápido e estável; já existe.
- **Cons:** não prova integração real; fluxos como upload e processamento ficam sem cobertura.

### Option C: Híbrido — MSW por tela + suíte full-stack curta (smoke)
- Mantém os specs por tela com MSW e adiciona poucos specs full-stack só dos caminhos críticos (cadastro/login, upload→publicar→assistir, comentar/inscrever).
- **Pros:** cobertura de integração onde importa, com custo controlado; a suíte por tela segue rápida.
- **Cons:** dois modos de execução para manter; exige seed/limpeza para a suíte curta.

**Recommendation:** Option C — cobre os fluxos que o plano chama de "principais" com poucos specs de alto valor, sem trocar a base rápida já existente; a Option A inteira custa mais do que o ganho nesta escala.

**Decision:** C (MSW por tela + suíte full-stack curta; fluxos cobertos: cadastro/confirmação/login; upload → publicar → assistir; comentar, reagir e inscrever-se; buscar e navegar home → busca → vídeo)

---

## TD-08: Topologia do ambiente de produção

**Scope:** Repo-wide

**Capability:** "Ambiente de produção e deploy"

**Context:** O repositório só tem `Dockerfile.dev` e `compose.yaml` de desenvolvimento. A produção precisa rodar a API, o worker FFmpeg, o frontend, PostgreSQL, Redis e storage S3-compatível, com TLS e segredos fora do repositório.

**Options:**

### Option A: Docker Compose de produção em uma VM, com proxy reverso
- `compose.prod.yaml` com imagens multi-stage (API, worker, frontend), Postgres/Redis/MinIO em volumes e um proxy (Caddy/Traefik) com TLS automático; segredos por arquivo de env fora do git.
- **Pros:** reaproveita a estrutura já usada em desenvolvimento; custo e operação simples; o worker FFmpeg roda sem restrição de plataforma.
- **Cons:** ponto único de falha; backup, atualização do host e escala horizontal são manuais.

### Option B: PaaS gerenciado por componente
- Frontend em plataforma de Next.js, API e worker em containers gerenciados, Postgres/Redis/S3 gerenciados.
- **Pros:** menos operação; backups e escala embutidos.
- **Cons:** vários provedores, mais custo e mais configuração de rede/segredos; o worker de FFmpeg e uploads de até 10GB têm limites a validar em cada plataforma.

### Option C: Kubernetes
- Manifests/Helm para todos os componentes.
- **Pros:** escala e resiliência.
- **Cons:** complexidade desproporcional ao tamanho do projeto.

**Recommendation:** Option A — é o menor salto a partir do que já existe e mantém o worker e os uploads grandes sob controle; migrar para PaaS ou Kubernetes é possível depois porque as imagens multi-stage são reaproveitáveis.

**Decision:** A (`compose.prod.yaml` em uma VM, imagens multi-stage de API, worker e frontend e proxy reverso com TLS)

---

## TD-09: Pipeline de CI/CD

**Scope:** Repo-wide

**Capability:** "Ambiente de produção e deploy"

**Context:** Não há workflows no repositório (nem o de frescor do `openapi.json` citado nas regras do BFF). Para um ambiente de produção, é preciso decidir o que valida cada PR e como a imagem chega ao servidor (depende de TD-08).

**Options:**

### Option A: GitHub Actions com verificações de PR e deploy a partir de `main`
- Em PR: `tsc`, lint, testes unit/integration (com serviços), `next build` e checagem de `openapi.json`; em `main`: build e publicação das imagens e deploy por SSH/compose.
- **Pros:** o gate de qualidade do projeto (DoD) passa a ser automático; deploy reprodutível.
- **Cons:** os testes de backend exigem Postgres/Redis/MinIO no runner; o lint do backend tem dívida preexistente e precisa de baseline.

### Option B: CI apenas de verificação, deploy manual
- Mesmas verificações, sem etapa de deploy.
- **Pros:** menor risco inicial; sem segredos de deploy no CI.
- **Cons:** o deploy continua dependente de passos manuais e de quem os executa.

**Recommendation:** Option A — transforma o Definition of Done do projeto em gate automático e torna o deploy reprodutível; o custo (serviços no runner, baseline de lint) é pontual.

**Decision:** A (GitHub Actions com verificações em PR e deploy a partir de `main`)

---

## TD-10: Estratégia de cache e revalidação da home e da busca

**Scope:** Frontend

**Capability:** Transversal — covers: "Página inicial com grid de vídeos (thumbnail, título, canal, visualizações e tempo de publicação)", "Barra de busca (pesquisa por título e canal)", "Paginação ou scroll infinito nas listagens de vídeos"

**Context:** `phase-04-videos-channel-frontend/TD-03` manteve as páginas públicas dinâmicas e sem cache e mandou reavaliar na fase 07, onde a home e a busca concentram o tráfego anônimo; `phase-04-videos-channel-frontend/TD-02` fez o mesmo para cache de cliente. O layout raiz lê a sessão, então toda rota já é dinâmica; a pergunta é só se a **listagem pública** (idêntica para todos os visitantes) passa a ser cacheada. A decisão interage com a frescura das views (TD-04), com a paginação por URL (TD-03) e com o determinismo dos testes (TD-07). O projeto está em Next 16.2.6 com `cacheComponents` desligado e usa `force-dynamic` no watch.

**Options:**

### Option A: Manter renderização dinâmica sem cache
- Cada visita à home ou à busca consulta o NestJS (Postgres + `MGET` no Redis do TD-04), como nas demais páginas públicas.
- **Pros:** zero mudança de arquitetura; dados sempre frescos (vídeo recém-publicado e views atualizados); testes e E2E determinísticos; consistente com canal e vídeo.
- **Cons:** toda requisição anônima chega ao backend; sem proteção contra pico de tráfego na home.

### Option B: Cache de dados com revalidação por tempo, só na leitura da listagem
- A leitura pública de `GET /videos` passa por `fetch` com `next.revalidate` (ou `unstable_cache`) de dezenas de segundos, chaveada por `q`, `categoryId` e `page`; a página continua dinâmica por causa da sessão.
- **Pros:** reduz carga no backend de forma localizada, sem flag global; a página segue com o header por sessão.
- **Cons:** frescura limitada (publicação e contagem de views atrasam até o TTL); o cache persiste entre execuções e exige desligá-lo em testes/E2E; mais um ponto de invalidação a documentar.

### Option C: Cache Components (`cacheComponents` + `use cache`)
- Liga a flag global, envolve a listagem em `use cache` com `cacheLife` e isola a parte dinâmica (sessão) em fronteiras de `Suspense`.
- **Pros:** shell estático com dados cacheados; é o modelo previsto para o Next 16.
- **Cons:** mudança transversal (a flag altera como todas as rotas são avaliadas; `force-dynamic` do watch e o layout raiz que lê cookies precisam ser reorganizados); alto custo para um ganho ainda não medido.

**Recommendation:** Option A — não há requisito de desempenho no plano nem medição que mostre o problema, o layout raiz já força a renderização dinâmica, e as Options B/C trocam frescura e determinismo de testes por um ganho não medido; a Option B fica como evolução localizada se a observação em produção (TD-08) apontar carga na listagem.

**Decision:** A (renderização dinâmica sem cache na home e na busca)

**Renders in:** frontend-runtime

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|---------------|--------|
| TD-01 | Cross-layer | Contract da listagem pública e da busca de vídeos | Option A (um `GET /videos` com `q`/`categoryId`) | A |
| TD-02 | Backend | Técnica de busca por título e canal | Option A (`ILIKE` + GIN `pg_trgm`) | A |
| TD-03 | Cross-layer | Paginação da home e dos resultados | Option A (offset + links, URL como estado) | A |
| TD-04 | Backend | Contagem de visualizações no grid | Option A (`MGET` em lote no Redis) | A |
| TD-05 | Frontend | Header/navbar e shell nas páginas públicas | Option A (grupo `(public)` com o mesmo `AppShell`) | A |
| TD-06 | Frontend | Shell em dispositivos móveis | Option A (mobile-first, `SideNav` em gaveta) | A |
| TD-07 | Repo-wide | Estratégia de testes dos fluxos principais | Option C (MSW por tela + smoke full-stack) | C |
| TD-08 | Repo-wide | Topologia do ambiente de produção | Option A (Compose de produção + proxy reverso) | A |
| TD-09 | Repo-wide | Pipeline de CI/CD | Option A (GitHub Actions com deploy a partir de `main`) | A |
| TD-10 | Frontend | Estratégia de cache e revalidação da home e da busca | Option A (dinâmico sem cache) | A |
