# phase-04-videos-channel-frontend — Screen Inventory

> **Phase:** 04 — Gerenciamento de Vídeos e Canal (frontend slice)
> **Status:** Validated
> **Date:** 2026-09-24
> **Screens in scope:** 6

---

## Screen: Painel de gerenciamento de vídeos

**Route:** `/studio/videos`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=152-1824 (node `upxCB4CzKKTSOT9NpdAZ0u:152:1824`)
**Purpose (from project-plan.md):** "Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status)"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| AppShell layout (152:1824 Body / Main content) | Presentational | ✗ | `components/layout/app-shell.tsx (new)` | Layout de rota autenticada: TopNav + SideNav (256px) + área principal. Compartilhado pelas 4 telas (D6) |
| TopNav (152:1827; componente 62:1858) | Local-interactive | ✗ | `components/layout/top-nav.tsx (new)` | Casca global autenticada (menu, logo, busca, voz, criar, avatar); avatar vem da sessão (`components/auth/session-provider.tsx` ✓). Nenhuma capability desta slice o exige |
| MenuTrigger (I152:1827;62:1860) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | Alterna SideNav (variantes collapsed/expanded). No Figma é frame+imagem, não instância de IconButton; unificado como IconButton nas 4 telas. Comportamento não especificado |
| MenuIcon (I152:1827;62:1860) | Presentational | ✗ | `components/icons/menu-icon.tsx (new)` | Glifo hambúrguer |
| BrandLogo (3050:135) | Presentational | ✓ | `components/auth/brand-logo.tsx` | Herdado (phase-02); instância size=sm |
| StreamtubeIcon (3050:136) | Presentational | ✓ | `components/icons/streamtube-icon.tsx` | Herdado (phase-02); ícone dentro do BrandLogo |
| GlobalSearchField (I152:1827;62:1878) | Local-interactive | ✗ | `components/ui/search-field.tsx (new)` | **Inerte (D6):** busca global sem capability nesta slice. Componente Figma "Search" (158:4007): ícone à esquerda e limpar à direita, usado no TopNav e nos filtros |
| SearchIcon (I152:1827;62:1882; I158:4013;158:3894) | Presentational | ✗ | `components/icons/search-icon.tsx (new)` | Usado nos dois campos de busca |
| VoiceSearchButton (I152:1827;62:1883) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | **Inerte (D6):** voz não existe no plano. Visual difere do IconButton (círculo 46px sem borda vs 44x40); confirmar variante |
| MicIcon (I152:1827;62:1886) | Presentational | ✗ | `components/icons/mic-icon.tsx (new)` | — |
| IconButton "Create" (I152:1827;70:31) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | Herdado (phase-02). Glifo "add"; destino não definido no frame (provável fluxo de upload da fase 03) |
| PlusIcon (I152:1827;70:31;156:3581) | Presentational | ✗ | `components/icons/plus-icon.tsx (new)` | Glifo "add" dentro do IconButton |
| Avatar (I152:1827;62:1893; I152:1825;62:1675, 62:1679, 62:1683, 62:1687, 62:1691, 62:1695) | Presentational | ✗ | `components/ui/avatar.tsx (new)` | Avatar do usuário logado (TopNav, 36px) e dos canais da lista de inscrições (SideNav, 26px). Raster → `next/image`. Sem menu/dropdown desenhado |
| SideNav (152:1825; componente 62:1580) | Local-interactive | ✗ | `components/layout/side-nav.tsx (new)` | Navegação lateral; 2 variantes (collapsed/expanded) na descrição do componente, só expanded desenhada |
| SideNavItem (I152:1825;62:1620, 62:1630, 62:1653, 62:1664) | Local-interactive | ✗ | `components/layout/side-nav-item.tsx (new)` | Home, Subscriptions, Your videos, Liked videos. Navegação client-side (Next.js `<Link>`) |
| SideNavSectionHeading (I152:1825;62:1638, 62:1670) | Presentational | ✗ | new | Títulos "You" e "Subscriptions" |
| SideNavSubscriptionList (I152:1825;62:1672) | Presentational | ✗ | `components/layout/side-nav-subscription-list.tsx (new)` | **Placeholder estático (D6):** assinaturas são fase posterior; 6 itens de avatar + nome sem dados reais e sem verbo |
| HomeIcon (I152:1825;62:1622) | Presentational | ✗ | `components/icons/home-icon.tsx (new)` | — |
| SubscriptionsIcon (I152:1825;62:1632) | Presentational | ✗ | `components/icons/subscriptions-icon.tsx (new)` | — |
| YourVideosIcon (I152:1825;62:1655) | Presentational | ✗ | `components/icons/your-videos-icon.tsx (new)` | — |
| LikedVideosIcon (I152:1825;62:1666) | Presentational | ✗ | `components/icons/liked-videos-icon.tsx (new)` | — |
| PageHeading (152:2149) | Presentational | ✗ | new | `<h1>` "Channel content" (152:2151) + subtítulo "Manage your videos and content" (152:2152). Frame pai se chama "videos table" mas o conteúdo é lista |
| Button "Upload video" (152:2154) | Local-interactive | ✓ | `components/ui/button.tsx` | Variante primária. Navega para o fluxo de upload (fase 03); upload não é capability desta slice |
| FilterButtons — Filter (152:2183), Public (158:2949), Date (158:2954) | Local-interactive | ✓ | `components/ui/button.tsx` | **Desabilitados (D7):** sem capability nem suporte de backend (só page/pageSize/total). 3 instâncias de Button Variant=secondary Size=md (2515:133); sem estados abertos/dropdown desenhados |
| FilterIcon (I152:2183;2515:136) | Presentational | ✗ | `components/icons/filter-icon.tsx (new)` | No screenshot o glifo parece ícone de "share", não de filtro |
| VideoSearchField "Search your videos" (158:4013) | Local-interactive | ✗ | `components/ui/search-field.tsx (new)` | **Desabilitado (D7).** Mesmo componente Figma "Search" (158:4007) do TopNav |
| VideoCountLabel (158:3060) | Presentational | ✗ | new | "24 videos"; recebe `total` da lista paginada (props) |
| VideoSortControl (2726:2139) | Local-interactive | ✗ | `components/studio/video-sort-control.tsx (new)` | **Desabilitado (D7).** "Sort by: Latest" (158:3301); sem dropdown/opções desenhados |
| SortIcon (158:3311) | Presentational | ✗ | `components/icons/sort-icon.tsx (new)` | Glifo filter-list 16px |
| VideoListRow (VideoList 115:358; instâncias 158:3096, 158:3130, 158:3164, 158:3199, 158:3233, 158:3267) | Server-connected | ✗ | `components/studio/video-list-row.tsx (new)` | Linha 1088×160; depende de dados do backend (lista paginada numerada). Linha/thumbnail/título levam à página de edição do vídeo (não à watch page). Instância 1 se chama "VideoList", as demais "Video list" |
| VideoThumbnail (I158:3096;108:323) | Presentational | ✗ | `components/ui/video-thumbnail.tsx (new)` | 256×144, raster → `next/image`. Inclui overlay de duração "10:30" (108:325) |
| VideoTitleDescription (I158:3096;108:329, 108:335) | Presentational | ✗ | new | Título (1 linha, ellipsis) e descrição (14px, sem line-clamp definido; a linha 6 quebra em 2 linhas) |
| VideoStats (I158:3096;108:337, 108:342, 108:347) | Presentational | ✗ | `components/studio/video-stats.tsx (new)` | Visualizações, likes, comentários; placeholders (0) até fase posterior, mas exibidos |
| ViewsIcon (I158:3096;108:339) | Presentational | ✗ | `components/icons/views-icon.tsx (new)` | Glifo de olho 13.5×12 (D12: não reusa `eye-icon.tsx`, que é o olho de visibilidade de senha) |
| ThumbsUpIcon (I158:3096;108:344) | Presentational | ✗ | `components/icons/thumbs-up-icon.tsx (new)` | Ícone de likes |
| CommentIcon (I158:3096;108:349) | Presentational | ✗ | `components/icons/comment-icon.tsx (new)` | Ícone de comentários |
| PublishedTimeLabel (I158:3096;108:353; separadores 108:352, 108:354) | Presentational | ✗ | new | "2 days ago" + bullets "•"; derivado de `published_at` formatado no cliente |
| VisibilityStatusLabel (I158:3096;108:355) | Presentational | ✗ | `components/ui/badge.tsx (new)` | Só existe a variante "Public" (texto verde, token success-text). Sem variantes para unlisted / draft / processing / error |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Exibir lista paginada de vídeos do canal com thumbnail, título, visualizações, likes, comentários, tempo de publicação e status | VideoListRow | "Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status)" |
| Abrir a edição de um vídeo a partir da linha do painel | VideoListRow | "Edição de vídeos a partir do painel" |

### Observations

- Identidade do frame: "My videos list" (152:1824, 1440×1408). Mostra a casca autenticada (TopNav + SideNav) e a área principal "Channel content — Manage your videos and content" com botão "Upload video", filtros (Filter, Public, Date, "Search your videos"), contagem "24 videos" + "Sort by: Latest" e 6 linhas VideoList. Corresponde ao painel esperado, **sem controle de paginação**.
- Open question — paginação: nenhum componente de paginação numerada existe na árvore nem no screenshot (backend expõe page + pageSize + total; TD-02 exige links `?page=N`). "24 videos" indica mais de uma página, mas só 6 linhas aparecem. Um `components/ui/pagination.tsx (new)` precisa ser desenhado/planejado; não está na tabela por não existir no Figma.
- Open question — status: só "Public" está desenhado. Faltam unlisted, draft, processing, ready, error e o estado de publicação (`published_at` ausente em rascunho → "2 days ago" não se aplica).
- Estados de tela ausentes: vazio (canal sem vídeos / sem resultados), loading/skeleton, erro de carregamento, placeholder de thumbnail (processing/draft).
- Decisão D8 — kebab de ações da linha **omitido**: o botão existe na árvore (I158:3096;108:330/331), mas o glifo (108:333) é um frame vazio e o menu não está desenhado; a linha inteira leva à edição e o Publicar fica na tela de edição.
- Decisões D6/D7 — casca e controles: busca global, voz, "+" e lista de inscrições ficam inertes/estáticos; filtro/busca/ordenação do painel ficam desabilitados. Filtrar só a página carregada seria enganoso com paginação numerada de 24+ itens; ativá-los exige capability e suporte de backend.
- O ícone do botão "Filter" parece "share" (provável erro de ícone no Figma). Duração "10:30" (108:325) não está nas capabilities do painel; confirmar se o backend a expõe (rascunhos/processing não teriam).
- Thumbnails e avatares são raster; no Figma usam `<img>` cru, mas a implementação deve usar `next/image` (256×144; 36/26px). Linhas 2–6 usam `object-cover`, a linha 1 crop por porcentagem; padronizar.
- Header autenticado: o avatar abre o menu de conta (drawer), inventariado em "Menu de conta do usuário". Logout continua sem verbo (decisão 5; o item "Sign Out" do menu é omitido, D17).
- SideNav: "Home" aparece ativo enquanto a rota corresponde a "Your videos" (sem estado ativo desenhado). "Liked videos" e "Subscriptions" apontam para rotas de fases posteriores. Botão "Create" do TopNav e "Upload video" parecem duplicar o mesmo destino (rota vs modal não definido).
- A11y: botões só com ícone (menu, voz, criar, submit de busca) precisam de `aria-label`; campos de busca precisam de label acessível; layout só em 1440px.
- Reuse: `components/ui/button.tsx` inferido por nome + existência no filesystem (Code Connect não emitiu path). O `get_design_context` foi truncado no limite de 25k tokens do MCP; o código termina no componente raiz e bate com o screenshot, mas metadados finais podem não ter sido vistos.

---

## Screen: Tela de edição de vídeo

**Route:** `/studio/videos/[id]/edit`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=156-2790 (node `upxCB4CzKKTSOT9NpdAZ0u:156:2790`)
**Purpose (from project-plan.md):** "Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| AppShell layout (156:2790 frame) | Presentational | ✗ | `components/layout/app-shell.tsx (new)` | see screen: Painel de gerenciamento de vídeos |
| TopNav (156:2792) | Local-interactive | ✗ | `components/layout/top-nav.tsx (new)` | see screen: Painel de gerenciamento de vídeos (inclui MenuTrigger, GlobalSearchField, VoiceSearchButton, Create e avatar, todos sem verbo) |
| BrandLogo (3050:135) | Presentational | ✓ | `components/auth/brand-logo.tsx` | see screen: Painel de gerenciamento de vídeos |
| StreamtubeIcon (3050:136) | Presentational | ✓ | `components/icons/streamtube-icon.tsx` | see screen: Painel de gerenciamento de vídeos |
| IconButton "+" (70:31) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | see screen: Painel de gerenciamento de vídeos |
| Avatar (62:1893, 36px; SideNav 26px) | Presentational | ✗ | `components/ui/avatar.tsx (new)` | see screen: Painel de gerenciamento de vídeos. Figma emite `alt=""`; o avatar da conta precisa de alt significativo |
| SideNav (156:2791) | Local-interactive | ✗ | `components/layout/side-nav.tsx (new)` | see screen: Painel de gerenciamento de vídeos (lista de inscrições estática, D6) |
| Main heading "Channel Settings" (156:2794) | Presentational | ✗ | new | h1. **Copy incorreta no Figma** (é o título da tela de canal); ver Observations |
| VideoEditForm (Channel card frame 156:2796 + publish form 156:2798) | Server-connected | ✗ | `components/studio/video-edit-form.tsx (new)` | Container do formulário: carrega os dados atuais do vídeo, combina validação local e envio ao servidor (regra: form = Server-connected como unidade) |
| Card (156:2797) | Presentational | ✓ | `components/ui/card.tsx` | Herdado (phase-02). Superfície do "Channel card" que envolve campos e rodapé |
| Details heading (156:2814) | Presentational | ✗ | new | h2 "Details" puro-DOM |
| FormLabel x2 (2175:297 "Title", 2175:309 "Description") | Presentational | ✓ | `components/ui/label.tsx` | Herdado (phase-02). Asterisco de obrigatório existe no componente Figma mas não aparece |
| TextField "Title" (156:2815) | Local-interactive | ✓ | `components/ui/input.tsx` | Herdado como Input (phase-02). Pré-preenchido "My Awesome Video" |
| Textarea "Description" (156:2816) | Local-interactive | ✗ | `components/ui/textarea.tsx (new)` | Multi-linha, ~192px. Não existe em `components/ui/` |
| CardVideoConfig (156:3122) | Local-interactive | ✗ | `components/studio/video-config-card.tsx (new)` | Painel lateral somente leitura (328x385): preview preto com "0:00", "Video link" com ícone de copiar (156:3108), Filename, Video Quality. Copiar é client-only; dados via props do form |
| ThumbUpload (156:2612) | Presentational | ✗ | `components/studio/thumb-upload.tsx (new)` | Tile 266x151 com a thumbnail atual e badge de duração ("15:41"). Raster → `next/image`. Só pré-visualiza |
| Change Thumbnail Button (156:2812) | Local-interactive | ✓ | `components/ui/button.tsx` | **D10:** só escolhe o arquivo e pré-visualiza; o envio acontece no Save Changes. Variant=outline com ícone de upload |
| SectionHeader x3 (2390:2267 "Thumbnail", 2390:2270 "Category", 2390:2273 "Visibility") | Presentational | ✗ | `components/ui/section-header.tsx (new)` | Título 20px semi-bold + linha descritiva muted |
| Category select (2096:2238) | Server-connected | ✗ | `components/ui/select.tsx (new)` | Instância de Select (2179:263), 448px, "Science & Technology". Opções vêm da lista de categorias do servidor. Estados aberto/vazio/desabilitado não desenhados |
| PrivacyOption x2 (156:2822 Public, selecionado; 156:2821 Unlisted) | Local-interactive | ✗ | `components/studio/privacy-option.tsx (new)` | Cards estilo radio (ícone, título, descrição), 576px. Seleção local até salvar |
| Status (2771:2088) | Server-connected | ✗ | new | **D11:** "Checks complete. No issues found." com check_circle (156:2802) reflete a elegibilidade do vídeo para publicação. Só o estado de sucesso está desenhado |
| PublishButton (sem node no Figma) | Server-connected | ✓ | `components/ui/button.tsx` | **D11:** botão primário "Publicar" **sem arte no Figma**; ao lado de Save Changes no rodapé (156:2798). Habilitado só com vídeo pronto e ainda não publicado (ação única) |
| Cancel Button (156:2800) | Local-interactive | ✓ | `components/ui/button.tsx` | Variant=outline. Descarta edições e volta ao painel (navegação client) |
| Save Changes Button (156:2799) | Server-connected | ✓ | `components/ui/button.tsx` | Primário, 169px. Submit do form (regra Fase 02: SubmitButton é Server-connected). Envia título, descrição, categoria, visibilidade e a thumbnail escolhida |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Carregar as informações atuais do vídeo para edição | VideoEditForm | "Edição de vídeos a partir do painel" |
| Exibir categorias de vídeo disponíveis para escolha | Category select (2096:2238) | "Categorias de vídeo disponíveis na plataforma" |
| Salvar título, descrição e categoria editados do vídeo | Save Changes Button (156:2799) | "Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada" |
| Enviar thumbnail customizada do vídeo | Save Changes Button (156:2799) (arquivo escolhido em Change Thumbnail Button 156:2812) | "Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada" |
| Definir visibilidade do vídeo como público ou unlisted | Save Changes Button (156:2799) (valor escolhido em PrivacyOption x2) | "Visibilidade do vídeo: público (aparece para todos) ou unlisted (somente via link)" |
| Exibir se o vídeo está apto para publicação | Status (2771:2088) | "Fluxo de rascunho → publicação" |
| Publicar vídeo em rascunho (ação única, só quando processado e ainda não publicado) | PublishButton (sem node no Figma) | "Fluxo de rascunho → publicação" |

### Observations

- Identidade do frame: "Edit/Publish video" (156:2790, 1440x1373). Página dedicada (não modal) com a casca, um "Channel card" com título, descrição, card de info do vídeo somente leitura, thumbnail, categoria, escolha público/unlisted e rodapé com Cancel e Save Changes. Corresponde ao esperado, **exceto**: (1) não há ação "Publish"; (2) o H1 diz "Channel Settings" e o texto de exemplo da descrição ("Welcome to TechMaster Studio! …") é de canal, não de vídeo.
- Open question — Publicar (D11): o Figma não tem o botão nem indicador rascunho/publicado; o nome "Edit/Publish video", o nó "publish form" (156:2798) e o "Checks complete" sugerem a intenção. O PublishButton foi acrescentado no inventário seguindo o design system e precisa de arte. Também não está desenhado como Publicar fica oculto/desabilitado para vídeo em processamento ou já publicado, nem as variantes do Status (processing, failed, already-published).
- Estados ausentes: loading dos campos, validação/erro (título obrigatório, limites, contadores), foco/erro dos campos, Save pendente/desabilitado/sucesso/falha, guarda de alterações não salvas no Cancel. O Category select não tem estado aberto, vazio ou de erro, e não fica claro se a categoria é opcional.
- Open question — thumbnail (D10): sem estados de envio/erro, limites de tipo/tamanho ou preview do arquivo escolhido; não se sabe se há crop/validação de proporção. O `ThumbUpload` descreve a si mesmo como "placeholder de estado de upload", mas aqui mostra a thumbnail real.
- Inconsistências de design: badge de duração de ThumbUpload ("15:41") posicionado fora do tile (left 368 / top 207), cortado e invisível no screenshot; o preview do CardVideoConfig mostra "0:00". Em CardVideoConfig, "Video Quality" e "1080p HD" sem espaçamento colidem no screenshot. O preview preto com play é tratado como placeholder estático (playback não é capability desta slice).
- CardVideoConfig mostra Filename e Video Quality, que nenhuma capability nomeia; são contexto somente leitura e é preciso confirmar no backend se os campos existem. O "Video link" se relaciona com a visibilidade "unlisted (somente via link)".
- Shell: busca, voz, "+", avatar e lista de inscrições da SideNav não têm capability e ficam sem verbo. O avatar abre o menu de conta (ver "Menu de conta do usuário"); Logout sem verbo (decisão 5, D17). "Home" aparece ativo em vez de "Your videos".
- A11y: PrivacyOption x2 deve ser um radio group real (`role="radiogroup"`, setas, foco visível). O Category select precisa de nome acessível (SectionHeader "Category" via `aria-labelledby`, pois não há FormLabel). Ícone de copiar (156:3108) e IconButtons só de ícone precisam de nome acessível. "Checks complete" deve ser live region se mudar dinamicamente.
- Responsividade: só frame desktop 1440px; CardVideoConfig fixo em 328px ao lado dos campos e a SideNav colapsada não estão documentados para larguras menores.
- Todos os elementos do screenshot estão no `get_design_context`; nenhum path de Code Connect foi devolvido (paths de DS derivados por nome contra o filesystem).

---

## Screen: Tela de edição do canal

**Route:** `/studio/channel`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=154-1367 (node `upxCB4CzKKTSOT9NpdAZ0u:154:1367`)
**Purpose (from project-plan.md):** "Edição das informações do canal: nickname, nome e descrição"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| AppShell layout — Body (2735:2140) + Main content (2735:2139) | Presentational | ✗ | `components/layout/app-shell.tsx (new)` | see screen: Painel de gerenciamento de vídeos |
| TopNav (154:1369; componente 62:1858) | Local-interactive | ✗ | `components/layout/top-nav.tsx (new)` | see screen: Painel de gerenciamento de vídeos |
| MenuTrigger (I154:1369;62:1860) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | see screen: Painel de gerenciamento de vídeos |
| BrandLogo (3050:135) | Presentational | ✓ | `components/auth/brand-logo.tsx` | see screen: Painel de gerenciamento de vídeos |
| StreamtubeIcon (3050:136) | Presentational | ✓ | `components/icons/streamtube-icon.tsx` | see screen: Painel de gerenciamento de vídeos |
| GlobalSearchField (I154:1369;62:1878) | Local-interactive | ✗ | `components/ui/search-field.tsx (new)` | see screen: Painel de gerenciamento de vídeos (inerte, D6). No Figma é um frame com texto "Search", não um input |
| VoiceSearchButton (I154:1369;62:1883) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | see screen: Painel de gerenciamento de vídeos (inerte, D6) |
| CreateButton — IconButton (I154:1369;70:31) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | see screen: Painel de gerenciamento de vídeos |
| AccountAvatar (I154:1369;62:1893) | Presentational | ✗ | `components/ui/avatar.tsx (new)` | see screen: Painel de gerenciamento de vídeos |
| SideNav (154:1368; componente 62:1580) | Local-interactive | ✗ | `components/layout/side-nav.tsx (new)` | see screen: Painel de gerenciamento de vídeos |
| SideNavItem (I154:1368;62:1620, ;62:1630, ;62:1653, ;62:1664) | Local-interactive | ✗ | `components/layout/side-nav-item.tsx (new)` | see screen: Painel de gerenciamento de vídeos |
| SideNavSectionTitle (I154:1368;62:1638 "You", ;62:1671 "Subscriptions") | Presentational | ✗ | new | see screen: Painel de gerenciamento de vídeos |
| Divider (I154:1368;62:1635, ;62:1697) | Presentational | ✗ | new | Linhas separadoras da SideNav |
| SubscriptionNavItem (I154:1368;62:1673, ;62:1677, ;62:1681, ;62:1685, ;62:1689, ;62:1693) | Presentational | ✗ | `components/layout/subscription-nav-item.tsx (new)` | see screen: Painel de gerenciamento de vídeos (SideNavSubscriptionList — placeholder estático, D6) |
| PageTitle h1 "Channel Settings" (154:1372) | Presentational | ✗ | new | Puro-DOM, Inter Bold 24 |
| Card — Channel card (154:1486; Card 154:1509) | Presentational | ✓ | `components/ui/card.tsx` | Herdado (phase-02). Container do resumo do canal |
| ChannelSummary (154:1488 header row; 154:1492 info) | Presentational | ✗ | `components/studio/channel-summary.tsx (new)` | **D9:** somente nome (154:1494) e handle (154:1495), alimentados pelo mesmo carregamento do formulário. Banner, avatar e contadores ("1.2M subscribers", "342 videos") omitidos; sem verbo |
| Card — Canal (154:1512; Card 154:1513) | Presentational | ✓ | `components/ui/card.tsx` | Herdado (phase-02). Container do formulário de edição |
| ChannelSettingsForm (154:1682 campos + 154:1683 rodapé, dentro de Canal 154:1512) | Server-connected | ✗ | `components/studio/channel-settings-form.tsx (new)` | Form com validação local e envio ao servidor → Server-connected como unidade. Campos: handle (nickname), display name (nome), description. Deve suportar o erro "nickname já em uso" |
| SectionHeading h2 "Basic Information" (154:1535), "Description" (154:1590) | Presentational | ✗ | new | Inter Semi Bold 20. "Description" faz as vezes de label do textarea (ver a11y) |
| FormLabel — "Channel handle" (2175:253), "Display name" (2175:263) | Presentational | ✓ | `components/ui/label.tsx` | Herdado (phase-02). Sem asterisco de obrigatório visível |
| Input — TextField "Channel handle" (154:1537) e "Display name" (154:1570) | Local-interactive | ✓ | `components/ui/input.tsx` | Herdado (phase-02). Altura 36. Confirmar suporte a supporting text e estado de erro no Input do repo |
| FieldHelperText (I154:1537;82:6314 "Your unique identifier on StreamTube", I154:1570;82:6314 "The name that appears on your channel") | Presentational | ✗ | new | Supporting text de 12px; existe no contexto mas não no screenshot |
| Textarea — Description (154:1580; componente 2120:224) | Local-interactive | ✗ | `components/ui/textarea.tsx (new)` | see screen: Tela de edição de vídeo. Altura 120px, sem supporting text, contador nem label próprio |
| LastUpdatedStatus (2749:2088; alarm 156:2106, texto 154:1688) | Presentational | ✗ | new | "Last updated: January 15, 2024"; valor vem dos dados do canal e deve refletir a atualização após salvar |
| Button — Cancel (154:1713; outline sm, 2502:133) | Local-interactive | ✓ | `components/ui/button.tsx` | Descartar/voltar sem I/O. Confirmar variante outline/sm no Button do repo |
| Button — Save Changes (154:1696; 101:209) | Server-connected | ✓ | `components/ui/button.tsx` | Submit do form (regra Fase 02: SubmitButton é Server-connected; alinhado à tela de edição de vídeo). Precisa de estado pending/disabled |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Carregar nickname, nome e descrição atuais do canal para pré-preencher o formulário de edição | ChannelSettingsForm | "Edição das informações do canal: nickname, nome e descrição" |
| Salvar alterações de nickname, nome e descrição do canal, rejeitando nickname já em uso | ChannelSettingsForm (botão Save Changes 154:1696) | "Edição das informações do canal: nickname, nome e descrição" |

### Observations

- Identidade do frame: "Channel Settings" (154:1367, 1440x1226). Casca + título "Channel Settings", card de resumo somente leitura (banner, avatar, "TechMaster Studio", "@techmaster2024", "1.2M subscribers", "342 videos") e card de edição com "Basic Information" (Channel handle, Display name), "Description" (textarea) e rodapé com "Last updated", Cancel e Save Changes. Corresponde ao esperado; o card de resumo é extra (D9: só nome e nickname permanecem).
- Decisão D9 — banner, avatar e contadores do card de resumo **omitidos**: a capability cobre só nickname, nome e descrição e não há dado no backend para banner/avatar; contagem de inscritos pertence a features sociais posteriores.
- Vocabulário e mock: "Channel handle" = nickname e "Display name" = nome. O handle aparece como "@techmaster2024", mas o formato do nickname é minúsculas/dígitos/underscore, então o "@" deve ser só adorno visual (Figma não deixa explícito; confirmar). O campo "Display name" também mostra "@techmaster2024" (provável erro de mock). Textos do Figma em inglês.
- Estados ausentes: erro "nickname já em uso" (sem variante de erro nos campos; `components/auth/field-error.tsx` já existe e pode servir), validação de formato do nickname, obrigatoriedade e limites de nome/descrição, loading/pending em Save, sucesso, erro genérico, Save desabilitado sem alterações, semântica de Cancel e guarda de alterações não salvas, foco/hover/disabled dos campos. Não há aviso de que trocar o nickname quebra links antigos (sem redirect do nickname anterior).
- Discrepâncias contexto vs screenshot: os supporting texts existem no `get_design_context` (`absolute bottom-[-20px]`) mas não aparecem no screenshot, provavelmente cortados por `overflow-clip` de "Fields row" (2747:2090). Não há espaço reservado para mensagens de erro abaixo dos campos. O textarea encosta na divisória do rodapé e o texto de exemplo termina cortado.
- Header autenticado: o avatar abre o menu de conta; o item "Edit Channel" → `/studio/channel` é o caminho até esta tela (D15), sem item extra na SideNav. Logout sem verbo (decisão 5, D17).
- Shell fora do escopo (busca, voz, "+", lista de inscrições): sem capability; inertes/estáticos (D6), classificados como Local-interactive/Presentational e sem verbos.
- A11y: "Description" usa h2 como label, então o textarea precisa de `label`/`aria-labelledby`. A busca precisa de `<input type="search">` com nome acessível. Botões só com ícone precisam de nome acessível. O erro de nickname precisa de `aria-invalid` + `aria-describedby`. Hierarquia: h1 "Channel Settings", h2 "Basic Information"/"Description".
- Paridade com o repo: o TextField do Figma é estilo Material com slot de supporting text (verificar `components/ui/input.tsx`); Button precisa da variante outline/sm; BrandLogo mora em `components/auth/` mas é reusado na casca. Layout só desktop (SideNav fixa 256px).

---

## Screen: Página pública do canal

**Route:** `/channel/[nickname]`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926 (node `upxCB4CzKKTSOT9NpdAZ0u:155:1926`)
**Purpose (from project-plan.md):** "Página pública do canal com informações e listagem de vídeos"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| PageLayout — frame "Channel Show" / Body / Main content (155:1926, 2737:2153, 2737:2152) | Presentational | ✗ | `components/layout/app-shell.tsx (new)` | see screen: Painel de gerenciamento de vídeos. Frame só desktop (1440x1284) |
| TopNav (155:1928; def 62:1858) | Local-interactive | ✗ | `components/layout/top-nav.tsx (new)` | see screen: Painel de gerenciamento de vídeos. Página pública: o TopNav só mostra o estado autenticado (ver Observations) |
| MenuTrigger — hamburger (I155:1928;62:1860) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | see screen: Painel de gerenciamento de vídeos |
| BrandLogo (3050:135) | Presentational | ✓ | `components/auth/brand-logo.tsx` | see screen: Painel de gerenciamento de vídeos. No header deve linkar para `/` |
| GlobalSearchField (I155:1928;62:1878) | Local-interactive | ✗ | `components/ui/search-field.tsx (new)` | see screen: Painel de gerenciamento de vídeos (inerte, D6) |
| VoiceSearchButton (I155:1928;62:1883) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | see screen: Painel de gerenciamento de vídeos (inerte, D6) |
| CreateButton — IconButton "add" (I155:1928;70:31) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | see screen: Painel de gerenciamento de vídeos |
| AccountAvatar (I155:1928;62:1893) | Presentational | ✗ | `components/ui/avatar.tsx (new)` | see screen: Painel de gerenciamento de vídeos |
| SideNav (155:1927; def 62:1580) | Local-interactive | ✗ | `components/layout/side-nav.tsx (new)` | see screen: Painel de gerenciamento de vídeos |
| SideNavItem ×4 — Home (I155:1927;62:1620, ativo), Subscriptions (…;62:1630), Your videos (…;62:1653), Liked videos (…;62:1664) | Local-interactive | ✗ | `components/layout/side-nav-item.tsx (new)` | see screen: Painel de gerenciamento de vídeos |
| SideNavSectionTitle — "You" (I155:1927;62:1637), "Subscriptions" (I155:1927;62:1670) | Presentational | ✗ | new | see screen: Painel de gerenciamento de vídeos |
| SideNavSubscriptionList — 6 itens (I155:1927;62:1672; itens 62:1673…62:1693) | Presentational | ✗ | `components/layout/side-nav-subscription-list.tsx (new)` | see screen: Painel de gerenciamento de vídeos (placeholder estático, D6) |
| Divider (I155:1927;62:1635, I155:1927;62:1697, I158:2613;158:2581; def 158:2041) | Presentational | ✗ | new | Separadores horizontais |
| ChannelHeader (156:3513; content 156:3514, info 156:3515) | Server-connected | ✗ | `components/channel/channel-header.tsx (new)` | Nome do canal como H1 (156:3517), nickname (156:3519) e descrição (156:3525). **D9:** sem os contadores "2.4M subscribers" (156:3521) e "1.2K videos" (156:3523), sem banner (156:3511) nem avatar (2405:2283) |
| VideoSortFilter — "Filter chips" (2737:2145) | Local-interactive | ✗ | `components/channel/video-sort-filter.tsx (new)` | **Desabilitado (D7):** ordenação Latest / Popular / Oldest sem capability nem suporte de backend (ordem fixa por `published_at`); "Popular" depende de views (placeholder 0) |
| FilterChip ×3 — Latest (158:2671), Popular (158:2674), Oldest (158:2677); def 158:2651 | Local-interactive | ✗ | `components/ui/filter-chip.tsx (new)` | **Desabilitados (D7).** Variantes active/normal no DS; no frame as 3 renderizam iguais, sem estado ativo visível |
| VideoGrid (156:3590) | Presentational | ✗ | new | flex-wrap, gap 24/40px, cards 266px (min 240, max 360). É onde o estado vazio e a paginação se encaixariam |
| VideoCard ×5 (156:3591, 156:3592, 156:3593, 156:3594, 156:3595; def 143:2505) | Server-connected | ✗ | `components/channel/video-card.tsx (new)` | Thumbnail, título (2 linhas), nome do canal e "212K views • 2 hours ago" (views = placeholder 0). Card inteiro linka para `/watch/[id]` (404 até fase posterior, decisão do usuário). **D9:** sem verified badge. Sem variantes de hover/foco/pressed. O Figma diz que o card também serve a Home e o video show, então o path pode migrar para um diretório compartilhado |
| VideoThumbnail (I156:3591;156:3805 … I156:3595;156:3805) | Presentational | ✗ | `components/ui/video-thumbnail.tsx (new)` | see screen: Painel de gerenciamento de vídeos. Raster, aspecto 421.69/239, radius 16px; `next/image` |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Exibir informações públicas do canal (nome, nickname e descrição) | ChannelHeader (156:3513) | "Página pública do canal com informações e listagem de vídeos" |
| Exibir lista paginada de vídeos públicos publicados do canal | VideoCard (156:3591–156:3595) | "Página pública do canal com informações e listagem de vídeos" |

### Observations

- Identidade do frame: "Channel Show" (155:1926, 1440x1284). Página completa de canal com casca, banner, avatar 128px, nome "Tech Mastery Plus", "@TechMasteryPlus", contadores, descrição, Subscribe + sino, abas Video/About, chips Latest/Popular/Oldest e grid de 5 VideoCards. Corresponde ao esperado, com extras fora do slice e **sem paginação numerada**.
- Decisão D9 — **omitidos** por falta de capability e de dado no backend: Subscribe (156:3536), sino (158:2691), contador de inscritos e de vídeos, verified badge, abas Video/About (158:2613; o conteúdo de "About" nem existe e a descrição já está no header), banner (156:3511) e avatar do canal (2405:2283). Voltam junto com a fase de inscrições ou com um modelo de banner/avatar.
- Open question — paginação: o TD define paginação numerada por URL (`?page=N`) com links, mas o frame não tem controle de paginação. Nenhum componente foi inventado; candidato natural: `components/ui/pagination.tsx (new)` com `nav` rotulado e `aria-current="page"`.
- Estados ausentes: canal sem vídeos (empty), nickname inexistente (not-found), erro, e cabeçalho anônimo. A página é pública, mas o TopNav só mostra o estado autenticado (avatar); o estado com botão de login não está desenhado. Não há versão mobile/tablet.
- Dados de amostra inconsistentes: os cards mostram "Flux Academy" enquanto o canal é "Tech Mastery Plus"; o nome do canal no card é redundante nesta página. "212K views" e "2 hours ago" exigem formatação abreviada/relativa a definir.
- Header autenticado: o avatar é classificado como Presentational por não ter affordance interativa neste frame; o gatilho do menu de conta é o `AccountMenuTrigger` inventariado em "Menu de conta do usuário". Logout sem verbo (decisão 5, D17).
- VideoCard: o card inteiro deve ser um único link para `/watch/[id]`, com o título como nome acessível; o `alt=""` das thumbnails no Figma é aceitável dentro de link com texto.
- SideNav: as seções "You" e "Subscriptions" são para usuário autenticado (visitante anônimo não tem equivalente desenhado). Destinos de "Subscriptions" e "Liked videos" não existem em nenhum slice planejado.
- a11y: botões só com ícone (menu, mic, "+") precisam de `aria-label`; o campo de busca deve estar em `role="search"`; o nome do canal é o `h1`; ordem de foco TopNav → SideNav → conteúdo.
- Idioma: o copy do Figma está em inglês ("views", "2 hours ago", "Latest") enquanto a documentação do projeto está em português; definir o idioma da UI e a localização de números/datas relativas.
- Metodologia: sem mapeamento de Code Connect; a saída do `get_design_context` foi truncada no limite de 25k tokens do MCP (após o JSX completo e as descrições), então os paths de DS foram derivados por nome contra o filesystem. Nenhum componente visível apenas no screenshot.

---

## Screen: Menu de conta do usuário (Account User Menu)

**Route:** `(studio)/*`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-1267 (node `upxCB4CzKKTSOT9NpdAZ0u:150:1267`)
**Purpose (from project-plan.md):** "Edição das informações do canal: nickname, nome e descrição" — o item "Edit Channel" é o ponto de entrada de navegação para essa edição; o menu em si não tem capability própria (casca compartilhada, sem verbo).

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| TopNav (150:1269) | Local-interactive | ✗ | `components/layout/top-nav.tsx (new)` | see screen: Painel de gerenciamento de vídeos (inclui BrandLogo, campo de busca, voz, "+" e o avatar; fica parcialmente oculto pelo Overlay/Aside no render) |
| AccountMenuTrigger — avatar do TopNav (I150:1269;62:1892) | Local-interactive | ✗ | `components/layout/account-menu-trigger.tsx (new)` | Abre o AccountMenu ("shown over the Top nav after avatar click"). Só o estado de repouso existe: uma imagem de 36px, sem wrapper de botão nem hover/focus/aberto |
| Avatar (I150:1269;62:1893 36px; I150:1373;116:383 64px; SideNav 26px) | Presentational | ✗ | `components/ui/avatar.tsx (new)` | see screen: Painel de gerenciamento de vídeos. Este frame confirma 3 tamanhos (26/36/64): o componente precisa de variantes de tamanho. **D16:** sem foto na sessão, usa fallback de iniciais do nickname |
| SideNav (152:1734) | Local-interactive | ✗ | `components/layout/side-nav.tsx (new)` | see screen: Painel de gerenciamento de vídeos (fundo do frame, escurecido pelo Overlay; itens, títulos e divisores idênticos ao já inventariado) |
| Overlay (150:1394) | Presentational | ✗ | `components/ui/overlay.tsx (new)` | Backdrop de frame inteiro (`inset-0`) com o token `--overlay` (#00000080, existe no `globals.css`). Sem evidência de clique para fechar no Figma; isso fica a cargo do container do AccountMenu |
| AccountMenu — Aside (150:1373; componente 121:399) | Local-interactive | ✗ | `components/layout/account-menu.tsx (new)` | Painel lateral direito de 320px, altura total, fundo `--card`, drop-shadow. Estado aberto/fechado 100% client; a identidade vem da sessão (SessionProvider, sem fetch) |
| PanelTitle "Account" (I150:1373;116:376) | Presentational | ✗ | new | 18px semibold; deve ser o título acessível do painel |
| IconButton, close (I150:1373;116:377) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | Só fecha o painel. O Figma desenha só o glifo de 24px, sem chip nem borda: exige uma variante ghost (sem fundo) do IconButton |
| CloseIcon (glifo de I150:1373;116:377) | Presentational | ✗ | `components/icons/close-icon.tsx (new)` | Glifo "close" de 24px |
| ProfileBlock (I150:1373;116:381) | Presentational | ✗ | new | Avatar 64px + duas linhas de texto; sem affordance de clique |
| DisplayName (I150:1373;116:385) | Presentational | ✗ | new | 16px com ellipsis. Figma: "TechMaster Studio" (nome do canal). **D16:** exibe `@{channelSlug}` da sessão, porque a sessão não tem o nome do canal |
| Handle (I150:1373;116:386) | Presentational | ✗ | new | 14px `muted-foreground` com ellipsis. Figma: "@techmaster2024". **D16:** exibe o e-mail da sessão |
| MenuItem "Edit Channel" (I150:1373;116:388) | Local-interactive | ✗ | `components/ui/menu-item.tsx (new)` | Link de navegação client-side → `/studio/channel` (D15), sem verbo. Geometria própria (ícone de 16px, padding 16px, `border-b`, sem raio), diferente do SideNavItem |
| EditIcon (I150:1373;116:390) | Presentational | ✗ | `components/icons/edit-icon.tsx (new)` | Glifo de 16px (lápis sobre quadrado); nome inferido do glifo, o Figma só chama o nó de "Frame" |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| _No server-connected components in this screen._ | — | — |

### Observations

- Identidade do frame: "Account User Menu" (150:1267, 1440×1024). Composição de página inteira: TopNav de 62px + SideNav de 256px escurecidos por um Overlay, e um "Aside" de 320px ancorado à borda direita, de topo a base, com drop-shadow. Cabeçalho "Account" com ícone de fechar, bloco de perfil (avatar 64px, nome, @handle) e itens de menu. Corresponde só em parte ao esperado: o contêiner é um **drawer/side panel de altura total, não um dropdown ancorado ao avatar** (a descrição do componente diz "Account dropdown menu (320×1024)", mas a geometria é de drawer). A identidade mostra nome + @handle, sem e-mail. O Aside cobre o canto superior direito do TopNav, então o gatilho (avatar) fica oculto no render.
- Decisão D15 — "Edit Channel" leva a `/studio/channel`: o Figma não nomeia o destino, mas é o único caminho desenhado até a edição de canal. A SideNav **não** ganha item "Channel settings". O menu não tem outros itens (nada de "Your channel"/página pública, "Your videos", configurações, trocar conta, tema, idioma ou ajuda).
- Decisão D16 — identidade a partir da sessão: a sessão da Fase 02 só guarda `userId`, `email` e `channelSlug`. O menu mostra `@{channelSlug}` (1ª linha) e o e-mail (2ª linha); avatar com fallback de iniciais. **Difere do Figma** (nome do canal, @handle e foto); tudo Presentational, sem chamada ao servidor e sem mudança de sessão. Trazer o nome do canal e a foto exigiria guardar `channelName` na sessão (Revision do TD-02 de auth-frontend) ou buscar no servidor, e nenhum dado de avatar existe no backend.
- Decisão D17 — "Sign Out" **omitido**: o item existe no frame (I150:1373;116:393, com o ícone I150:1373;116:395), em segundo lugar depois de "Edit Channel". Logout não é capability do slice (decisão 5), então o item e seu ícone não entram no inventário nem no plano. O contrato `POST /api/auth/logout` já existe da Fase 02. O "Logout" adiado da Fase 02 segue adiado.
- Interação aberto/fechado: só o estado aberto está desenhado; o fechado é o TopNav sem Overlay nem Aside. Como fechar: só o ícone de fechar; clique no backdrop e Esc não estão no Figma, mas são esperados para um overlay. Animação de entrada/saída não é especificada. A sombra do painel usa rgba fixo (sem token de sombra).
- A11y: o painel precisa de semântica de dialog modal (`role="dialog"` + `aria-modal`, ou um primitivo Dialog/Sheet) com o título "Account" como nome acessível, focus trap, foco devolvido ao avatar ao fechar e bloqueio de scroll do body. O botão de fechar (só ícone, `alt=""` no Figma) e o gatilho de avatar precisam de nome acessível (`aria-haspopup` / `aria-expanded` no gatilho). Os itens devem ser `<a>`/`<button>` reais, com foco visível. Nome e handle truncam com ellipsis, então nomes longos perdem informação sem `title`.
- Lacunas de design: sem hover/focus/pressed nos itens, no ícone de fechar e no avatar; sem variante mobile (painel fixo em 320px) nem dark mode; o cabeçalho do painel tem 69px contra 62px do TopNav e não alinha com a borda inferior dele. Rótulos em inglês ("Account", "Edit Channel").
- Reuso: o ícone de fechar herda o IconButton por função, mas exige a variante ghost, que o conjunto atual do Figma não tem (a mesma variante serve ao MenuTrigger da SideNav). O MenuItem não reaproveita o SideNavItem por ter geometria diferente.
- Fora do escopo do slice (sem verbos): busca, voz, "+", hambúrguer e a lista de inscrições da SideNav (ver o painel de vídeos). Nenhum componente visível apenas no screenshot; o lado direito do TopNav existe na árvore mas fica oculto pelo Overlay/Aside.

---

## Screen: Menu lateral (Left Menu)

**Route:** `(studio)/*`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959 (node `upxCB4CzKKTSOT9NpdAZ0u:150:959`)
**Purpose (from project-plan.md):** "Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status)" — servido só como ponto de entrada pelo item "Your videos"; o menu em si é casca compartilhada, sem capability própria.

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| AppShell (frame 150:959 + Body 2703:2203) | Presentational | ✗ | `components/layout/app-shell.tsx (new)` | see screen: Painel de gerenciamento de vídeos. TopNav (62px) + Body (SideNav 256px + slot de conteúdo) |
| TopNav (150:962, instância de 62:1858) | Local-interactive | ✗ | `components/layout/top-nav.tsx (new)` | see screen: Painel de gerenciamento de vídeos. Aqui só importa o MenuTrigger que alterna a SideNav |
| MenuTrigger (I150:962;62:1860) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | see screen: Painel de gerenciamento de vídeos. Único gatilho desenhado de expandir/recolher; glifo solto 40×34.4 (não é instância de IconButton), exige a variante ghost do IconButton |
| SideNav (152:1588, instância de 62:1580) | Local-interactive | ✗ | `components/layout/side-nav.tsx (new)` | see screen: Painel de gerenciamento de vídeos. **D14:** só a variante expandida é planejada (256px, borda direita, `overflow-clip`) |
| SideNavItem (62:1620 Home, 62:1630 Subscriptions, 62:1653 Your videos, 62:1664 Liked videos) | Local-interactive | ✗ | `components/layout/side-nav-item.tsx (new)` | see screen: Painel de gerenciamento de vídeos. Linha 46px, px 14, raio 8, ícone + label 16px. Link de navegação client-side, sem verbo; estado ativo em Observations |
| SideNavSectionHeading ("You" 62:1637; "Subscriptions" 62:1670) | Presentational | ✗ | new | see screen: Painel de gerenciamento de vídeos |
| SideNavSubscriptionList (62:1672) | Presentational | ✗ | `components/layout/side-nav-subscription-list.tsx (new)` | see screen: Painel de gerenciamento de vídeos (placeholder estático, D6) |
| SubscriptionNavItem (62:1673 … 62:1693) | Presentational | ✗ | `components/layout/subscription-nav-item.tsx (new)` | see screen: Painel de gerenciamento de vídeos (placeholder estático, sem destino) |
| Divider (62:1635, 62:1697) | Presentational | ✗ | new | see screen: Painel de gerenciamento de vídeos |
| HomeIcon (62:1622) | Presentational | ✗ | `components/icons/home-icon.tsx (new)` | see screen: Painel de gerenciamento de vídeos. Neste frame aparece PREENCHIDO (estado ativo): precisa de variantes preenchida/contorno |
| SubscriptionsIcon (62:1632) | Presentational | ✗ | `components/icons/subscriptions-icon.tsx (new)` | see screen: Painel de gerenciamento de vídeos. Só a variante contorno está desenhada |
| YourVideosIcon (62:1655) | Presentational | ✗ | `components/icons/your-videos-icon.tsx (new)` | see screen: Painel de gerenciamento de vídeos. Só a variante contorno; falta a preenchida (o item ativo nas rotas `(studio)/*`) |
| LikedVideosIcon (62:1666) | Presentational | ✗ | `components/icons/liked-videos-icon.tsx (new)` | see screen: Painel de gerenciamento de vídeos. Só a variante contorno está desenhada |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| _No server-connected components in this screen._ | — | — |

### Observations

- Identidade do frame: "Left Menu" (150:959, 1440×1024, desktop). Casca autenticada completa: TopNav (1440×62) + Body com a SideNav EXPANDIDA (256px) + área de conteúdo vazia. Corresponde ao esperado só em parte: tem itens com ícone + label, headings, divisores, lista de inscrições e um estado ativo fraco (Home), mas **não tem a variante recolhida**, o gatilho pressionado, hover/focus nem estado ativo por rota. A descrição do componente 62:1580 diz "2 variants for collapsed and expanded states", então a variante recolhida existe no arquivo, mas fora deste frame. Não há item de Logout.
- Decisão D14 — só a variante expandida é planejada: a recolhida (largura, itens só com ícone, tooltip) não foi extraída para poupar a cota do Figma e vira Open question. Como o hambúrguer do TopNav é o único gatilho e a variante recolhida não está definida, o comportamento de recolher/expandir também fica indefinido (rail de ícones estilo YouTube ou drawer sobreposto, estado inicial por breakpoint, persistência da preferência, animação, refluxo do conteúdo).
- Decisão D15 — a SideNav **não** ganha item "Channel settings": o caminho até `/studio/channel` é o "Edit Channel" do menu de conta.
- Estado ativo: o único item diferenciado é Home (62:1620), com fundo `--card` (que pode ser igual a `--background` no tema claro, então sem contraste visível: verificar no `globals.css`) e ícone PREENCHIDO; os demais têm ícone de contorno e texto regular. O wrapper do grupo "You" (62:1641) tem `opacity 0.9`, provável resíduo de design. **Não há estado ativo desenhado para "Your videos" (`/studio/videos`)**, que é o que as telas `(studio)/*` precisam. É preciso definir a regra de match de rota (exata vs prefixo; `/studio/videos/[id]/edit` deve marcar "Your videos"?) e o item ativo deve expor `aria-current="page"`.
- Itens e destinos (nenhum destino desenhado; nenhum tem hover, focus ou pressed): Home (destino indefinido, fase posterior); Subscriptions (fase posterior); Your videos (destino acordado `/studio/videos`); Liked videos (fase posterior); 6 linhas de inscrição (avatar + nome, placeholder estático D6, sem destino).
- Fora do escopo desta slice: Home, Subscriptions (item e seção), Liked videos e a lista de 6 canais pertencem a fases posteriores (D6). Não há Logout no frame. O "+" (Create) e a busca/voz do TopNav também estão fora da slice; destinos e comportamentos não estão definidos.
- Estados não desenhados: hover/focus-visible/pressed dos itens, item desabilitado, lista de inscrições vazia ou em loading, e rolagem/overflow (a SideNav tem `overflow-clip` e altura total, então uma lista longa seria cortada). Labels com largura fixa de 147px, sem truncamento com reticências para nomes longos.
- Responsivo: só existe o desktop 1440×1024 (SideNav fixa em 256px, TopNav com `min-w 320`); sem layout tablet/mobile, sem drawer sobreposto e sem regra de quando o menu recolhe sozinho.
- A11y: envolver em `<nav>` com `aria-label`; `aria-current="page"` no item ativo; os headings "You" e "Subscriptions" usam estilo H3 (definir nível ou usar rótulo de grupo); ícones e avatares são decorativos (`alt=""`); o hambúrguer precisa de `aria-label`, `aria-expanded` e `aria-controls`; o BrandLogo deveria ser link para Home (não desenhado como tal).
- Estrutura: "Subscriptions" aparece duas vezes (item de navegação 62:1630 e heading da lista 62:1670). O Divider 62:1697 existe na árvore ao fim da seção, mas não fica visível no screenshot. O componente 62:1580 descreve "brand" dentro da SideNav, mas a instância deste frame não contém marca (o logo está no TopNav).
- O TopNav deste frame também contém o campo de busca (I150:962;62:1879), o botão de busca (62:1881) e o botão de voz (62:1883, 46×46, que não é IconButton); já inventariados no painel de vídeos. Nenhum componente visível apenas no screenshot.

---

## Reconciliation summary

| Capability (project-plan.md) | Covered by | Screens |
|---|---|---|
| "Categorias de vídeo disponíveis na plataforma" | Category select | /studio/videos/[id]/edit |
| "Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada" | VideoEditForm + Save Changes Button (com Change Thumbnail Button) | /studio/videos/[id]/edit |
| "Visibilidade do vídeo: público (aparece para todos) ou unlisted (somente via link)" | PrivacyOption x2 + Save Changes Button | /studio/videos/[id]/edit |
| "Fluxo de rascunho → publicação" | PublishButton + Status | /studio/videos/[id]/edit |
| "Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status)" | VideoListRow (entrada pelo item "Your videos" da SideNav) | /studio/videos, (studio)/* (Left Menu) |
| "Edição de vídeos a partir do painel" | VideoListRow (abre a edição) + VideoEditForm (carrega o vídeo) | /studio/videos, /studio/videos/[id]/edit |
| "Edição das informações do canal: nickname, nome e descrição" | ChannelSettingsForm + Save Changes Button (entrada pelo item "Edit Channel" do menu de conta) | /studio/channel, (studio)/* (Account User Menu) |
| "Página pública do canal com informações e listagem de vídeos" | ChannelHeader + VideoCard | /channel/[nickname] |

## Open questions

- **Paginação numerada sem design** (telas `/studio/videos` e `/channel/[nickname]`): TD-02 exige links `?page=N`, mas nenhum frame desenha o controle. Precisa de design ou de decisão do implementador (`components/ui/pagination.tsx (new)`, `nav` rotulado, `aria-current="page"`).
- **Publicar sem arte no Figma** (`/studio/videos/[id]/edit`): o `PublishButton` e o estado do "Checks complete" foram acrescentados por decisão D11 e precisam de arte; falta também como o botão fica oculto/desabilitado (vídeo em processamento ou já publicado) e as variantes do Status.
- **Copy incorreta na tela de edição de vídeo:** o H1 diz "Channel Settings" e a descrição de exemplo é de canal; usar um título de edição de vídeo. Na tela de canal, "Display name" mostra o handle como valor e o "@" do handle deve ser só adorno visual.
- **Status e estados visuais do painel:** só "Public" está desenhado; faltam unlisted, draft, processing, ready, error e o tratamento de `published_at` ausente. Faltam também estados vazio, loading, erro e placeholder de thumbnail; na página pública, canal vazio, nickname inexistente e cabeçalho anônimo (login).
- **Estados de formulário ausentes** (edição de vídeo e de canal): validação, erro "nickname já em uso" (`components/auth/field-error.tsx` pode servir), pending/sucesso/falha do Save, guarda de alterações não salvas, estados de envio/erro/limites da thumbnail (backend: `image/*`, ≤5MB).
- **Controles inertes/desabilitados por decisão (D6/D7):** busca global, voz, "+", lista de inscrições (estática), filtro/busca/ordenação do painel e chips da página pública. Ativá-los exige capability e suporte de backend (filtros, ordenação); hoje só existem `page`, `pageSize` e `total`.
- **Omitidos por decisão (D8/D9/D17):** kebab de ações da linha (menu não desenhado), Subscribe, sino, contadores de inscritos/vídeos, verified badge, abas Video/About, banner e avatar do canal, e o item "Sign Out" do menu de conta. Voltam com a fase de inscrições, com um modelo de dados de banner/avatar ou com a capability de Logout.
- **Logout adiado com o design já existente (D17):** o menu de conta desenha "Sign Out", mas Logout não está no `covers_capabilities` deste slice e o item é omitido. O contrato `POST /api/auth/logout` já existe (Fase 02); ativá-lo exige adicionar a capability "Logout" à Fase 04 no `project-plan.md` e ao `covers_capabilities`.
- **Menu de conta difere do Figma (D15/D16):** é um drawer de 320px (não um dropdown), sem estados hover/focus, mobile, dark mode nem fallback de avatar desenhados. A identidade mostra `@channelSlug` e o e-mail (a sessão não tem nome do canal nem foto); trazer o nome do canal exigiria guardar `channelName` na sessão (Revision do TD-02 de auth-frontend) ou buscá-lo no servidor.
- **Navegação da casca (Left Menu):** só a SideNav expandida é planejada (D14); a variante recolhida do componente `62:1580` e o comportamento do hambúrguer (rail de ícones vs drawer, estado inicial, persistência) ficam indefinidos. Falta o estado ativo de "Your videos" e a regra de match de rota (exata vs prefixo; `/studio/videos/[id]/edit` marca "Your videos"?); os ícones da SideNav só têm uma variante (Home preenchido, os outros contorno). "Create" e "Upload video" duplicam um destino não definido (a UI de upload não existe no frontend); "Liked videos", "Subscriptions" e "Home" apontam para rotas de fases posteriores.
- **Rota `/watch/[id]`** (decisão do usuário): os cards linkam para a página de visualização, que só existe na Fase 05 (404 até lá).
- **Dados possivelmente sem suporte no backend:** duração nas thumbnails ("10:30", "15:41" — os dois valores divergem), Filename e Video Quality do CardVideoConfig, e "Last updated" do canal. Confirmar se os campos existem.
- **Idioma e formatação:** o copy do Figma está em inglês e a documentação em português; definir o idioma da UI e o formato de números/datas relativas ("212K views", "2 hours ago").
- **Detalhes do design a confirmar:** ícone do botão "Filter" parece "share"; "Video Quality" e "1080p HD" colidem no CardVideoConfig; o badge de duração do ThumbUpload fica fora do tile; cards da página pública mostram outro nome de canal; só há frames desktop 1440px (sem mobile/tablet); o IconButton precisa de uma variante ghost (glifo solto) para o hambúrguer e o ícone de fechar; `get_design_context` truncado em 25k tokens nas telas 1 e 4.
- Componentes planejados-mas-não-existentes (`Reuse?` com sufixo ` (new)`), gatilho de `phase-b.md` § B2.6 (bootstrap SI synthesis): `components/layout/{app-shell,top-nav,side-nav,side-nav-item,side-nav-subscription-list,subscription-nav-item,account-menu,account-menu-trigger}.tsx`; `components/ui/{search-field,avatar,section-header,select,textarea,badge,video-thumbnail,filter-chip,overlay,menu-item}.tsx`; `components/studio/{video-list-row,video-stats,video-sort-control,video-config-card,thumb-upload,privacy-option,video-edit-form,channel-summary,channel-settings-form}.tsx`; `components/channel/{channel-header,video-sort-filter,video-card}.tsx`; e os ícones `components/icons/{menu,search,mic,plus,home,subscriptions,your-videos,liked-videos,filter,sort,views,thumbs-up,comment,close,edit}-icon.tsx`. Confirmar com `plan-build` quais serão materializados nesta fase. O `components/ui/pagination.tsx` não está nesta lista porque não existe no Figma.
