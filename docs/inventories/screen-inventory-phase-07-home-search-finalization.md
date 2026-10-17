# phase-07-home-search-finalization — Screen Inventory

> **Phase:** Página Inicial, Busca e Finalização
> **Status:** Validated
> **Date:** 2026-10-12
> **Screens in scope:** 2

---

> Escopo: apenas componentes e verbos da Fase 07. Chrome já inventariado nas Fases 04 a 06 (TopNav, SideNav, VideoCard, TabMenu, lista de canais seguidos) entra como reuso; ver `screen-inventory-phase-04-videos-channel-frontend.md`, `screen-inventory-phase-05-video-watch-page.md` e `screen-inventory-phase-06-social-interactions.md`. As capabilities "Layout responsivo para dispositivos móveis", "Testes dos fluxos principais da plataforma" e "Ambiente de produção e deploy" são transversais e não geram verbo de UI.

## Screen: Página inicial (Home)

**Route:** `/`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948 (node `upxCB4CzKKTSOT9NpdAZ0u:143:948`)
**Purpose (from project-plan.md):** "Página inicial com grid de vídeos (thumbnail, título, canal, visualizações e tempo de publicação)"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| TopNav (147:563) | Local-interactive | ✓ | `components/layout/top-nav.tsx` | Herdado da fase 04. Container do header; só existe a variante logada no Figma (ver Observations). |
| Menu trigger (I147:563;62:1859) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | Botão hambúrguer que abre/recolhe a SideNav (estado só no cliente). Ícone `components/icons/menu-icon.tsx`. |
| BrandLogo (3050:135) | Presentational | ✓ | `components/auth/brand-logo.tsx` | Variante `Size=sm`; wordmark StreamTube. |
| SearchField (I147:563;62:1878) | Server-connected | ✓ | `components/ui/search-field.tsx` | Herdado; hoje desabilitado no código. Nesta fase passa a ser funcional: submete a navegação para `/search?q=`. Segmento de input + botão lupa (62:1881, `components/icons/search-icon.tsx`). |
| VoiceSearchButton (I147:563;62:1883) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | Microfone sem capability associada; **mantido desabilitado** (comportamento atual). Ícone `components/icons/mic-icon.tsx`. |
| IconButton "Create" (I147:563;70:31) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | Ícone `add` (`components/icons/plus-icon.tsx`); presente só na variante logada. |
| AccountMenuTrigger (I147:563;62:1892) | Server-connected | ✓ | `components/layout/account-menu-trigger.tsx` | Avatar 36px do usuário logado; para o visitante anônimo a variante derivada exibe a ação "Sign in" no lugar. Abre `components/layout/account-menu.tsx`. |
| SideNav (152:1499) | Local-interactive | ✓ | `components/layout/side-nav.tsx` | Herdado da fase 04. 256px no desktop. |
| SideNavItem ×4 (62:1620, 62:1630, 62:1653, 62:1664) | Local-interactive | ✓ | `components/layout/side-nav-item.tsx` | Home, Subscriptions, Your videos, Liked videos. Links de navegação do framework. |
| SideNavSubscriptionList (62:1672) | Server-connected | ✓ | `components/layout/side-nav-subscription-list.tsx` | Herdado da fase 06 (canais seguidos reais); sem verbo novo nesta fase. |
| TabMenu (143:1150) | Server-connected | ✓ | `components/watch/tab-menu.tsx` | Mesmo componente do Figma (67:231) usado nas sugestões da fase 05. Aqui é o filtro por categoria da Home: chip "All" (ativo, sem filtro) mais um chip por categoria vinda do backend. Chip visual: `components/ui/filter-chip.tsx`. |
| ScrollAffordance (I143:1150;67:269) | Local-interactive | ✓ | `components/watch/tab-menu.tsx` | Seta com sombra à direita da linha de chips (rolagem horizontal); parte do TabMenu. |
| VideoCard ×8 (149:650, 149:670, 149:711, 149:731, 152:1419, 152:1439, 152:1459, 152:1479) | Server-connected | ✓ | `components/channel/video-card.tsx` | Variante default (com avatar do canal): thumbnail, título, canal, visualizações e tempo de publicação. 266px (min 240, max 360), grid `flex-wrap` com gap 24px. |
| VideoThumbnail (I149:650;143:2507) | Presentational | ✓ | `components/ui/video-thumbnail.tsx` | Dentro de cada VideoCard. |
| Avatar do canal (I149:650;143:2512) | Presentational | ✓ | `components/ui/avatar.tsx` | 40px; dentro de cada VideoCard. |
| ProgressCircular (149:1185) | Presentational | ✗ | new | Indicador de 40px abaixo do grid; **só estado de loading** (paginação é por links). Sem equivalente em `components/ui`. |
| PaginationLinks (não está no Figma) | Server-connected | ✓ | `components/common/pagination-links.tsx` | Renderizado abaixo do grid (`?page=N`, `?category=`), reuso das fases 04 e 06. O Figma não desenha controle de paginação (ver Observations). |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Exibir grid de vídeos publicados com thumbnail, título, canal, visualizações e tempo de publicação | VideoCard | "Página inicial com grid de vídeos (thumbnail, título, canal, visualizações e tempo de publicação)" |
| Filtrar a listagem de vídeos da home por categoria | TabMenu | "Filtro de vídeos por categoria na home" |
| Pesquisar vídeos por título e canal | SearchField | "Barra de busca (pesquisa por título e canal)" |
| Exibir avatar do usuário autenticado ou ação de entrar conforme a sessão | AccountMenuTrigger | "Header/navbar com logo, barra de busca, botão de login/avatar e navegação" |
| Navegar entre páginas da listagem de vídeos | PaginationLinks | "Paginação ou scroll infinito nas listagens de vídeos" |

### Observations

- **Mobile:** não existem frames mobile no Figma (só desktop, 1440 de largura). "Layout responsivo para dispositivos móveis" é transversal e não gera verbo; o comportamento responsivo (SideNav recolhida, grid com menos colunas, TopNav compacta) é derivado do desktop e fica como drift consciente (TD-06).
- **Header anônimo (drift consciente):** o Figma só tem a variante logada do TopNav (Create + avatar). A variante de visitante (ação "Sign in" no lugar de Create/avatar) é derivada e decidida pela sessão; não é componente novo.
- **Busca por voz:** o botão de microfone (62:1883) fica desabilitado, sem capability.
- **Selo de canal verificado omitido:** o Figma (I149:650;143:2519) mostra um selo em todos os cards, mas o domínio não tem o conceito; o card exibe só o nome do canal (drift consciente).
- **Chips da TabMenu:** os rótulos do Figma (Live, Mixes, Recently uploaded, Watched, Figma…) não são a taxonomia real. A Home usa "All" + as categorias de `GET /categories`; "Recently uploaded" e "Watched" não são reproduzidos (ordenação e histórico fora do escopo). O chip "Figma" com fade é artefato de rolagem.
- **Paginação:** o Figma só mostra o ProgressCircular abaixo do grid, sem controle de página. Por decisão do usuário a paginação é por links (alinha com `TD-03` Option A), e `PaginationLinks` entra abaixo do grid sem nó no Figma. A paginação numerada continua sem design (mesma lacuna das fases 04 e 06).
- **Localização do TabMenu:** o arquivo vive em `components/watch/tab-menu.tsx`; mover para `components/ui/` ou `components/common/` é refactor separado, fora desta fase.
- **Dados de exemplo:** "212K views" e "2 hours ago" são texto estático no Figma; a UI real formata contagem compacta e tempo relativo a partir de dados do servidor (visualizações vêm da leitura em lote do Redis, `TD-04`).
- **Interação:** o chip "All" representa ausência de filtro; trocar de categoria volta para a página 1.
- **a11y:** botões só com ícone (menu, microfone, lupa, Create) precisam de `aria-label`; os chips expõem estado ativo (`aria-current`/`aria-pressed`) e a linha rolável precisa ser navegável por teclado; o campo de busca precisa de rótulo acessível.
- **Itens só no screenshot:** nenhum componente visível no screenshot está ausente de `get_design_context`; a árvore retornada foi truncada após o ProgressCircular (149:1185).

---

## Screen: Resultados de busca

**Route:** `/search`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=143-948 (node `upxCB4CzKKTSOT9NpdAZ0u:143:948`)
**Purpose (from project-plan.md):** "Barra de busca (pesquisa por título e canal)"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| TopNav (147:563) | Local-interactive | ✓ | `components/layout/top-nav.tsx` | see screen: Página inicial (Home). O campo de busca vem preenchido com o termo `q` da URL. |
| SearchField (I147:563;62:1878) | Server-connected | ✓ | `components/ui/search-field.tsx` | see screen: Página inicial (Home) |
| SideNav (152:1499) | Local-interactive | ✓ | `components/layout/side-nav.tsx` | see screen: Página inicial (Home) |
| VideoCard ×N (149:650) | Server-connected | ✓ | `components/channel/video-card.tsx` | see screen: Página inicial (Home). Mesma grade; os itens são os vídeos que casam com o termo em título ou canal. |
| PaginationLinks (não está no Figma) | Server-connected | ✓ | `components/common/pagination-links.tsx` | see screen: Página inicial (Home). Links preservam `q` (e a categoria, quando houver). |
| SearchResultsHeading (não está no Figma) | Presentational | ✗ | new | Título com o termo pesquisado e o total de resultados (`<h1>`). Sem frame. |
| EmptyResults (não está no Figma) | Presentational | ✗ | new | Mensagem em texto muted para busca sem resultados. Sem frame. |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Exibir resultados da busca por título e canal em lista paginada | VideoCard | "Barra de busca (pesquisa por título e canal)" |
| Pesquisar vídeos por título e canal | SearchField | "Barra de busca (pesquisa por título e canal)" |
| Navegar entre páginas dos resultados | PaginationLinks | "Paginação ou scroll infinito nas listagens de vídeos" |

### Observations

- **Sem frame próprio:** a tela de resultados não existe no Figma. Por decisão do usuário ela é variante da Home (mesmo frame `143:948` como referência visual), em rota dedicada `/search?q=`; título e estado vazio são derivados dos tokens existentes (drift consciente, mesmo tratamento das telas da fase 06).
- **Filtro por categoria nos resultados:** a TabMenu não foi decidida para esta tela; se entrar, reaproveita o mesmo parâmetro de categoria da Home (ver Open questions).
- **Termo vazio:** `/search` sem `q` não está desenhado; comportamento (redirecionar à Home ou listar tudo) é decisão do plano.
- **a11y:** o total de resultados deve ser anunciado (`aria-live="polite"`) e o campo de busca mantém o termo.

---

## Reconciliation summary

| Capability (project-plan.md) | Covered by | Screens |
|---|---|---|
| "Página inicial com grid de vídeos (thumbnail, título, canal, visualizações e tempo de publicação)" | VideoCard | `/` |
| "Filtro de vídeos por categoria na home" | TabMenu | `/` |
| "Barra de busca (pesquisa por título e canal)" | SearchField, VideoCard | `/`, `/search` |
| "Header/navbar com logo, barra de busca, botão de login/avatar e navegação" | TopNav, SearchField, AccountMenuTrigger | `/`, `/search` |
| "Paginação ou scroll infinito nas listagens de vídeos" | PaginationLinks | `/`, `/search` |
| "Layout responsivo para dispositivos móveis" | — _(transversal, sem verbo de UI)_ | todas |
| "Testes dos fluxos principais da plataforma" | — _(transversal, sem verbo de UI)_ | — |
| "Ambiente de produção e deploy" | — _(transversal, sem verbo de UI)_ | — |

## Open questions

- Os chips de categoria também aparecem em `/search`? Se sim, a busca aceita `categoryId` junto com `q` (já previsto em `TD-01`); se não, a TabMenu é exclusiva da Home.
- `/search` sem o parâmetro `q`: redireciona para `/` ou lista todos os vídeos?
- A paginação por links (`?page=N`) não tem frame no Figma; é preciso confirmar o desenho do controle ou aceitar a derivação a partir de `components/common/pagination-links.tsx`.
- Em dispositivos móveis a SideNav vira gaveta sobreposta (`TD-06`, ainda `pending`); o resultado depende dessa decisão por não existirem frames mobile.
- O `TopNav` passa a viver nas páginas públicas (`TD-05`, ainda `pending`): confirmar se o `SideNav` também aparece para visitantes anônimos, já que "Subscriptions" e "Liked videos" exigem login.
