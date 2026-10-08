---
scope_type: phase
related_phases: [5]
status: pending
date: 2026-09-30
scope_description: "Página de visualização do vídeo: player, sugestões, contagem de visualizações, acesso anônimo e unlisted"
---

# Technical Decisions — Página de Visualização do Vídeo

_Subprojects in scope:_

- `nestjs-project/` — nova capability "contagem de visualizações" (sem mecanismo existente) e o endpoint de sugestões por categoria (query nova, embora reaproveite o modelo de vídeo/categoria já decidido na Fase 04).
- `next-frontend/` — player de vídeo com controles customizados; layout da página é composição de primitivos já existentes (VideoThumbnail, VideoCard, etc.), sem decisão nova além da escolha de tecnologia do player.

---

## TD-01: Tecnologia do player de vídeo

**Scope:** Frontend

**Capability:** Player de vídeo com controles: play/pause, volume e barra de progresso

**Context:** A Fase 03 já decidiu que streaming é feito via redirect para URL pré-assinada (`phase-03-videos/TD-05`) — o player só precisa consumir uma tag `<video>` apontando para essa URL (via o mesmo padrão de passthrough BFF já usado para thumbnail/stream). A decisão em aberto é **como construir os controles** (play/pause, volume, barra de progresso) sobre essa tag. O projeto não usa bibliotecas de UI externas (ícones, primitivos shadcn — tudo construído com tokens do design system, per `.claude/rules/next-frontend-ui.md`) e `radix-ui` (já instalado, `^1.4.3`) inclui um primitivo `Slider` não utilizado ainda — relevante para a barra de progresso e o controle de volume.

**Options:**

### Option A: `<video>` nativo + controles customizados (Radix Slider + DS tokens)
- Controla o elemento `HTMLVideoElement` diretamente (`play()`, `pause()`, `currentTime`, `volume`) e usa o primitivo `Slider` do `radix-ui` (já instalado) para a barra de progresso e o volume, estilizado com os tokens do design system, seguindo o mesmo padrão dos outros primitivos (`select.tsx`, `pagination.tsx`).
- **Pros:** zero dependência nova; consistente com a convenção do projeto de não usar bibliotecas de UI externas; controles totalmente customizáveis via Figma.
- **Cons:** a lógica de sincronizar UI com os eventos do `<video>` (`timeupdate`, `volumechange`, buffering) precisa ser escrita à mão.

### Option B: Vidstack (player headless)
- Biblioteca de componentes headless para mídia, compatível com React 19, que abstrai os eventos do `<video>`/`<audio>` em hooks/componentes prontos para compor controles customizados.
- **Pros:** menos código de sincronização de estado escrito à mão; suporta HLS/DASH prontos para o caso de o projeto evoluir o streaming no futuro.
- **Cons:** nova dependência no projeto; a maior parte das features (HLS, legendas, cast) não é usada nesta fase, que só precisa de play/pause/volume/progresso sobre um MP4 simples.

### Option C: Video.js
- Player maduro e amplamente adotado, com sistema de plugins e skinning próprio.
- **Pros:** muito testado, documentação extensa.
- **Cons:** o sistema de skinning é baseado em CSS/classe antiga, pouco natural de integrar com Tailwind v4 + tokens do projeto; mais pesado que o necessário para os três controles pedidos nesta fase.

**Recommendation:** Option A — os controles pedidos (play/pause, volume, progresso) são exatamente o que `radix-ui`'s `Slider` + a API nativa do `HTMLVideoElement` já cobrem sem dependência nova, e mantém a mesma convenção "sem biblioteca de UI externa" já seguida em todo o projeto (ícones, primitivos shadcn). Vidstack (Option B) só se pagaria se o projeto adotasse HLS/DASH, o que não está no escopo desta fase.

**Decision:** Option A

---

## TD-02: Estratégia de contagem de visualizações

**Scope:** Backend

**Capability:** Contagem de visualizações

**Context:** Não existe hoje nenhuma coluna ou mecanismo de contagem de visualizações no `Video` entity nem no fluxo de reprodução — esta é uma capability nova desta fase. Uma implementação naive (incrementar a cada requisição de metadata/stream) é trivialmente inflacionável por refresh, o que é o mesmo tipo de preocupação já levantado em "Pontos de Atenção" do `project-plan.md` para likes/dislikes anônimos ("evitar abusos"). Redis já está na stack (`phase-03-videos/TD-01`, usado por BullMQ), disponível como mecanismo de dedup com TTL sem introduzir nova infra.

**Options:**

### Option A: Incremento simples e irrestrito
- Um endpoint (`POST /videos/:id/views` ou incremento embutido em `GET /videos/:id`) soma 1 à contagem a cada chamada, sem nenhuma proteção.
- **Pros:** trivial de implementar, nenhuma infra adicional.
- **Cons:** inflacionável por refresh simples da página; qualquer bot/script conta como visualização.

### Option B: Dedup via Redis com TTL por (vídeo, cliente)
- Endpoint de incremento verifica uma chave Redis `view:{videoId}:{clientKey}` (`clientKey` = `sub` do JWT quando autenticado, ou um cookie anônimo gerado na primeira visita) antes de incrementar a coluna no Postgres; a chave expira após uma janela de tempo (ex. 30 minutos), permitindo contar de novo depois disso.
- **Pros:** reaproveita a infra Redis já presente na stack; TTL nativo do Redis resolve a expiração sem job de limpeza; baixo custo de implementação.
- **Cons:** se o Redis cair, a contagem para de acontecer (ou passa a contar sem dedup, dependendo de como o fallback é implementado) — trade-off aceitável dado que Redis já é uma dependência crítica do pipeline de upload (BullMQ).

### Option C: Dedup via tabela dedicada no Postgres
- Uma tabela `video_views` com `(video_id, client_key, viewed_at)` e uma constraint/consulta que só conta uma nova visualização se não houver uma entrada para o mesmo `(video_id, client_key)` dentro da janela de tempo.
- **Pros:** não depende do Redis estar de pé; histórico de visualizações fica auditável no Postgres.
- **Cons:** exige um job de limpeza (ou partição/índice) para não crescer indefinidamente; mais lento que uma checagem em memória do Redis para uma operação que acontece a cada view.

**Recommendation:** Option B — Redis já é uma dependência da stack (BullMQ, `phase-03-videos/TD-01`), e o TTL nativo resolve a janela de deduplicação sem precisar de um job de limpeza adicional, que a Option C exigiria.

**Decision:** Option B

---

## TD-03: Estratégia de sugestões de vídeos relacionados

**Scope:** Backend

**Capability:** Sugestões de vídeos da mesma categoria na sidebar

**Context:** O modelo de categoria (`category_id` no `Video`, FK opcional) já foi decidido na Fase 04 (`phase-04-videos-channel/TD-01`). A decisão em aberto é a query de seleção: como ordenar os candidatos dentro da categoria, e o que fazer quando a categoria do vídeo atual não tem vídeos públicos suficientes para preencher a sidebar (categoria vazia ou com poucos itens, ou vídeo sem categoria).

**Options:**

### Option A: Mesma categoria, sem fallback
- `SELECT ... WHERE category_id = X AND visibility = public AND status = ready AND published_at IS NOT NULL AND id != currentId ORDER BY published_at DESC LIMIT N`. Se houver menos de N resultados, a sidebar mostra só o que existir (ou fica vazia se o vídeo não tiver categoria).
- **Pros:** query simples, reaproveita o índice `category_id` já existente.
- **Cons:** sidebar pode ficar vazia ou quase vazia para vídeos sem categoria ou em categorias pouco populadas — impacto de UX relevante dado que a plataforma provavelmente terá poucas categorias com poucos vídeos publicados nesta fase do projeto.

### Option B: Mesma categoria com fallback para vídeos públicos em geral
- Executa a query da Option A; se o resultado tiver menos de N itens, completa o restante com os vídeos públicos mais recentes de qualquer categoria (excluindo os já selecionados e o vídeo atual).
- **Pros:** sidebar sempre populada quando existem vídeos públicos suficientes na plataforma, independente de quão específica for a categoria do vídeo atual.
- **Cons:** duas queries (ou uma `UNION`) em vez de uma; a rigor mistura "sugestão por categoria" com "vídeos recentes" quando o fallback entra em ação — aceitável, dado que o objetivo é manter a sidebar útil.

### Option C: Ordenação aleatória dentro da categoria
- Mesma query da Option A, mas `ORDER BY RANDOM()` em vez de `published_at DESC`, para variar as sugestões a cada visita.
- **Pros:** evita que a sidebar seja sempre idêntica para o mesmo vídeo.
- **Cons:** `ORDER BY RANDOM()` faz um full scan da tabela filtrada a cada chamada — aceitável no volume de dados desta fase do projeto, mas é uma escolha de performance a trocar por `published_at DESC` (que usa o índice existente) sem ganho funcional relevante aqui; pode ser combinada com a Option B depois, não é mutuamente exclusiva, mas decidir isso agora é prematuro sem dados de uso reais.

**Recommendation:** Option B — sem fallback, a sidebar de sugestões fica vazia exatamente nos casos mais comuns no estágio atual da plataforma (poucas categorias, poucos vídeos por categoria), o que anula o valor da feature; a Option C resolve um problema (repetição) que não foi levantado como capability nesta fase.

**Decision:** Option B

---

## TD-04: Estratégia de renderização e composição da página de vídeo

**Scope:** Frontend

**Capability:** Transversal — covers: Layout da página: vídeo principal + informações + sidebar com sugestões, Acesso anônimo à visualização de vídeos

**Context:** `phase-04-videos-channel-frontend/TD-02` já decidiu RSC + `searchParams` como padrão de dados, e `TD-03` decidiu renderização dinâmica sem cache — mas ambas foram decididas no contexto de telas autenticadas dentro de `(studio)/*`. A página pública do canal (`/channel/[nickname]`, já construída na Fase 04-FE) é a única tela anônima existente hoje e usa exatamente o mesmo padrão (RSC async, sem `requireSession()`, sem cache), fora do grupo `(studio)`. A pergunta em aberto é se `/watch/[id]` reaproveita esse padrão tal como está ou se merece uma convenção própria, já que a Fase 06 vai adicionar comentários/likes/inscrição nessa mesma tela (ainda anônima para visualização, mas com affordances que exigem sessão).

**Options:**

### Option A: Reaproveitar o padrão da página pública do canal
- RSC async sem `requireSession()`, sem `'use cache'`/`revalidate`/`cacheTag`, fora do grupo de rotas `(studio)/` — idêntico ao que `/channel/[nickname]` já faz.
- **Pros:** Zero padrão novo a documentar; o mesmo código que já funciona para o canal público funciona aqui. Consistente com as decisões já tomadas (TD-02/TD-03 da Fase 04-FE).
- **Cons:** Nenhum — é a aplicação direta de um padrão já validado em produção nesta mesma base de código.

### Option B: Introduzir um grupo de rotas `(public)/` dedicado
- Criar `app/(public)/watch/[id]/page.tsx` e mover `/channel/[nickname]` para o mesmo grupo, estabelecendo uma convenção explícita "rotas públicas vivem aqui", antecipando que a Fase 06 adicionará mais telas/afordances parcialmente anônimas.
- **Pros:** Convenção explícita para contribuidores futuros distinguirem rotas públicas de autenticadas à primeira vista na árvore de arquivos.
- **Cons:** Route groups do Next.js são uma escolha organizacional, não uma decisão de comportamento — podem ser introduzidos depois sem reabrir esta TD. Mover `/channel/[nickname]` para um novo grupo é um refactor fora do escopo desta fase, sem ganho funcional imediato.

**Recommendation:** Option A — a página pública do canal já validou exatamente este padrão (RSC anônimo, sem cache, fora de `(studio)/`) em produção nesta mesma base; reaproveitar evita documentar uma convenção nova para um comportamento que já existe. A reorganização em grupos de rotas (Option B) é prematura — pode ser feita depois, como refactor puro, sem impacto em nenhuma decisão de comportamento já tomada.

**Decision:** Option A

---

## TD-05: Interação de expansão/recolhimento da descrição do vídeo

**Scope:** Frontend

**Capability:** Descrição do vídeo com expansão/recolhimento

**Context:** É um toggle de UI client-side trivial, mas existem alternativas reais com trade-offs de acessibilidade e de necessidade (ou não) de um Client Component boundary — vale decidir explicitamente para não deixar cada implementador escolher de forma inconsistente com outras partes da base (ex.: `VideoCard`'s `line-clamp-2`, que não tem toggle).

**Options:**

### Option A: `line-clamp-N` (Tailwind) + botão "Show more"/"Show less"
- CSS `line-clamp` corta o texto em N linhas; um botão alterna um estado `collapsed` (Client Component).
- **Pros:** Já usado em outras partes do projeto (`VideoCard`'s `line-clamp-2`). Simples de implementar.
- **Cons:** Não há como saber de antemão se o texto realmente excede N linhas — uma descrição curta mostraria um botão "Show more" que não faz nada perceptível, ou o botão precisa ser condicionalmente omitido via medição (que esta opção não inclui).

### Option B: `<details>`/`<summary>` nativo
- Elemento HTML nativo com semântica de disclosure embutida; nenhum JavaScript necessário, permanece um Server Component.
- **Pros:** Zero JavaScript client-side — o componente nem precisa de `"use client"`. Acessibilidade embutida pelo navegador (`aria-expanded` implícito, ativação por teclado, anúncio por leitor de tela) sem código adicional. Consistente com a convenção do projeto de preferir primitivos nativos antes de construir algo customizado.
- **Cons:** Estilização do marcador/seta padrão do `<summary>` exige um pouco de CSS para remover o triângulo nativo e aplicar o visual do design system, mas é um ajuste cosmético pontual, não uma limitação funcional.

### Option C: Medição de altura via JS (`scrollHeight` vs `clientHeight`)
- Um `useEffect` com `ref` mede se o conteúdo realmente excede a altura visível antes de decidir mostrar o botão de toggle.
- **Pros:** Resolve com precisão o problema da Option A (só mostra o botão quando a descrição de fato precisa ser truncada).
- **Cons:** Exige Client Component + `useEffect` + medição no DOM para um toggle cosmético — desproporcional para a necessidade.

**Recommendation:** Option B — é a única opção que não exige nenhum JavaScript client-side (permanece Server Component) e já vem com acessibilidade completa embutida pelo navegador, sem replicar manualmente o que a Option A/C exigiriam. O ajuste de estilo do marcador do `<summary>` é cosmético, não funcional.

**Decision:** Option B

---

## TD-06: Regra de acesso anônimo para a página de vídeo

**Scope:** Frontend

**Capability:** Acesso anônimo à visualização de vídeos

**Context:** `phase-04-videos-channel-frontend/TD-01` decidiu o padrão de guarda para rotas **autenticadas** ("server-side check colocado com o data fetch... pensado para se estender às Fases 05–07"), mas `/watch/[id]` é uma rota **anônima** — a pergunta aqui é distinta: ela nunca chama `requireSession()`, mas deveria ler a sessão de forma opcional (se presente) para ajustar a UI (ex.: mostrar o avatar do usuário logado), ou permanecer totalmente agnóstica à sessão nesta fase? O inventário de telas (Observations) já registrou que o Figma não desenhou nenhum cabeçalho para visitante anônimo.

**Options:**

### Option A: RSC totalmente anônimo
- Nunca chama `requireSession()` nem lê a sessão de forma alguma; a página é idêntica para visitantes logados e anônimos.
- **Pros:** Mais simples; nenhuma leitura condicional de sessão para manter. Replica exatamente o que `/channel/[nickname]` já faz.
- **Cons:** Nenhum elemento de chrome reflete que o usuário está logado nesta tela especificamente (mas isso já é esperado — a Fase 06 é quem introduz affordances logadas aqui, como like/comentário).

### Option B: RSC com sessão opcional
- Lê a sessão (se presente, via uma variante não-lançadora de `getSession()`) só para decidir se mostra um elemento de chrome de usuário logado, mesmo que a capability desta fase não exija autenticação.
- **Pros:** Prepara o terreno para a Fase 06 (que vai precisar saber se o usuário está logado nesta mesma tela).
- **Cons:** Investimento especulativo agora — o Figma desta tela (confirmado pelo inventário) não desenha nenhum chrome para usuário logado; a leitura de sessão ficaria sem consumidor até a Fase 06 chegar.

**Recommendation:** Option A — o Figma desta fase não tem nenhum elemento condicionado à sessão (confirmado no inventário de telas), e replicar o padrão já validado da página pública do canal (que também não lê sessão) evita introduzir um consumidor sem uso real até a Fase 06.

**Decision:** Option A

---

## TD-07: Download do vídeo a partir da tela de visualização

**Scope:** Cross-layer

**Capability:** Botão de download do vídeo

**Context:** `phase-03-videos/TD-05` já decidiu URLs pré-assinadas de leitura para streaming/download, e o backend já expõe `GET /videos/:id/download` (`@Public()`, redirect 302 para URL pré-assinada com `Content-Disposition: attachment`) desde a Fase 03 — confirmado em `videos.controller.ts`. `phase-04-videos-channel-frontend/TD-04` já nomeia a Fase 05 como dependente exatamente deste mecanismo. O que falta decidir é como o botão da tela de visualização dispara esse download no frontend.

**Options:**

### Option A: Link `<a>` simples para uma rota BFF de passthrough
- Um `<a href="/api/videos/[id]/download" download>` aponta para uma nova Route Handler `GET` que repassa o redirect 302 do upstream — mesmo padrão já usado para `/api/videos/[id]/thumbnail` (SI-04.32b).
- **Pros:** Zero JavaScript customizado — o navegador segue o redirect e salva o arquivo nativamente, usando seu próprio gerenciador de downloads, sem nunca carregar o arquivo em memória do JS.
- **Cons:** Nenhum — é a extensão direta de um padrão já construído e testado.

### Option B: Fetch client-side + blob + clique programático
- JS faz `fetch()` do arquivo, monta um `Blob`, cria uma URL de objeto e dispara um clique programático num `<a>` temporário — permite mostrar um indicador de progresso.
- **Pros:** Possibilita feedback visual de progresso durante o download.
- **Cons:** O arquivo inteiro passa pela memória do navegador como um `Blob` antes de ser salvo — justamente o problema que a decisão de streaming/presigned-URL da Fase 03 (upload de até 10GB) existe para evitar do lado do upload; aplicar a mesma armadilha no download é regressivo para vídeos grandes.

**Recommendation:** Option A — a Option B reintroduz, do lado do download, exatamente o problema de memória que a Fase 03 already resolveu do lado do upload (vídeos de até 10GB não devem passar pela memória da aplicação/JS); um link simples com redirect 302 deixa o navegador lidar com arquivos de qualquer tamanho nativamente.

**Decision:** Option A

---

## TD-08: Regra de visibilidade para acesso anônimo a vídeo unlisted

**Scope:** Backend

**Capability:** Vídeos unlisted acessíveis apenas via link direto (sem aparecer em listagens)

**Context:** A metade "não aparecer em listagens" já está satisfeita — toda query de listagem (`GET /channels/:nickname/videos`, `GET /channels/:id/manage/videos`) já filtra por `visibility=public`, decidido em `phase-04-videos-channel/TD-03`. Mas a metade "acessível via link direto" expõe uma inconsistência real já existente no código: `VideosService.findOne` (usado por `GET /videos/:id`) e `getPlaybackUrl` (usado por `/stream` e `/download`) hoje só verificam `status === READY` para não-donos — **ignorando `visibility` e `published_at` completamente** (confirmado lendo `videos.service.ts`); ou seja, um rascunho processado mas ainda não publicado já é hoje transmissível/baixável por qualquer um que tenha o UUID. Já `getThumbnailUrl` (`/thumbnail`) é mais estrita: `ready` + `published_at` definido + `visibility=public` — o que excluiria vídeos unlisted até da própria miniatura. Nenhuma das duas regras existentes é a que a Fase 05 precisa (`ready` + publicado + `public` OU `unlisted`); esta TD decide a regra única que os quatro endpoints (`findOne`, `/stream`, `/download`, `/thumbnail`) devem compartilhar.

**Options:**

### Option A: Unificar os quatro endpoints numa única regra
- Dono vê qualquer status; anônimo/não-dono vê apenas `status=ready` + `published_at` definido + `visibility IN (public, unlisted)`. Corrige, como efeito colateral, o vazamento de rascunhos em `findOne`/`stream`/`download`.
- **Pros:** Uma única regra para manter; fecha o vazamento de rascunho detectado nesta pesquisa; a suíte E2E já existente da Fase 04 para esses quatro endpoints já testa o split dono/anônimo com granularidade suficiente para capturar qualquer regressão.
- **Cons:** Toca código que já está em produção desde a Fase 03/04 — exige re-rodar/estender os testes E2E desses quatro endpoints.

### Option B: Deixar `findOne`/`stream`/`download` como estão; regra nova só para o necessário da Fase 05
- Mantém o comportamento atual dos três endpoints (aceitando o vazamento de rascunho como débito pré-existente, fora do escopo); adiciona uma verificação separada só onde a Fase 05 precisa (ex.: um guard específico chamado pelo BFF antes de renderizar a página).
- **Pros:** Não toca nenhum código já testado da Fase 03/04.
- **Cons:** Deixa conscientemente um bug de privacidade sem correção (rascunho acessível anonimamente via UUID) justamente na fase que teria o contexto completo para corrigi-lo.

### Option C: Unificar a regra, mas como método novo e paralelo (`findViewableOrFail`) só para a tela de visualização
- Mesma regra da Option A, mas implementada num método novo, usado só pelas chamadas da tela de visualização — `findOne`/`getPlaybackUrl` (usados pelo formulário de edição, já restrito ao dono) continuam intocados.
- **Pros:** Evita qualquer risco de regressão em `findOne`/`getPlaybackUrl`, já que `findOne` hoje também é usado pelo formulário de edição (que é sempre dono, então nunca disparou o caminho anônimo de qualquer forma).
- **Cons:** Duas regras de visibilidade paralelas para manter sincronizadas conforme futuras fases (ex.: Fase 06) adicionarem mais nuances de visibilidade.

**Recommendation:** Option A — a Option B deixa consciente e documentado um vazamento de privacidade real (rascunho acessível anonimamente via UUID) exatamente na fase que tem todo o contexto para corrigi-lo; a Option C evita o risco de regressão da Option A, mas `findOne` é usado pelo formulário de edição sempre em contexto de dono (nunca exercitando o caminho anônimo), então o risco que a Option C tenta evitar não existe na prática — a duplicação de regra que ela introduz não se paga.

**Decision:** Option A

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|---------------|--------|
| TD-01 | Frontend | Tecnologia do player de vídeo | Option A (`<video>` nativo + Radix Slider) | Option A |
| TD-02 | Backend | Estratégia de contagem de visualizações | Option B (dedup via Redis com TTL) | Option B |
| TD-03 | Backend | Estratégia de sugestões de vídeos relacionados | Option B (mesma categoria + fallback) | Option B |
| TD-04 | Frontend | Estratégia de renderização e composição da página de vídeo | Option A (reaproveitar padrão da página pública do canal) | Option A |
| TD-05 | Frontend | Interação de expansão/recolhimento da descrição | Option B (`<details>`/`<summary>` nativo) | Option B |
| TD-06 | Frontend | Regra de acesso anônimo para a página de vídeo | Option A (RSC totalmente anônimo) | Option A |
| TD-07 | Cross-layer | Download do vídeo a partir da tela de visualização | Option A (link simples + BFF passthrough) | Option A |
| TD-08 | Backend | Regra de visibilidade para acesso anônimo a vídeo unlisted | Option A (unificar os quatro endpoints) | Option A |
