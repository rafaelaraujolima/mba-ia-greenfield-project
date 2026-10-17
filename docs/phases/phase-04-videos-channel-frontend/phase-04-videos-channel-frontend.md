---
kind: phase
name: phase-04-videos-channel-frontend
test_specs_aware: true
sources_mtime:
  docs/phases/phase-04-videos-channel-frontend/context.md: "2026-09-27T21:50:48-04:00"
  docs/decisions/technical-decisions-phase-04-videos-channel-frontend.md: "2026-09-24T19:42:10-04:00"
  docs/decisions/technical-decisions-phase-04-frontend-contract-gaps.md: "2026-09-27T21:50:31-04:00"
  docs/phases/phase-04-videos-channel/library-refs.md: "2026-09-23T14:42:22-04:00"
---

# Phase 04 — Gerenciamento de Vídeos e Canal (Frontend)

## Objective

Entregar, no frontend (`next-frontend/`), o painel de gerenciamento de vídeos do canal, a edição de vídeo (título, descrição, categoria, thumbnail customizada, visibilidade e publicação de rascunho), a edição das informações do canal e a página pública do canal com listagem paginada de vídeos — consumindo o backend da slice `phase-04-videos-channel` via BFF, com a casca autenticada compartilhada (TopNav, SideNav e menu de conta) — e, no backend, as mudanças pontuais exigidas por TD-04/TD-05 (URL pública de storage e endpoint de thumbnail por redirect presigned) e pelas lacunas de contrato decididas em `phase-04-frontend-contract-gaps/TD-01..03` (canal do usuário logado, detalhe de vídeo enriquecido, renovação de token em Server Components).

---

## Step Implementations

### SI-04.0.1 — Infra: install batch shadcn primitives

**Description:** Instalar os primitives shadcn (`avatar`, `badge`, `pagination`, `select`, `textarea`) exigidos pelos UI Contracts desta slice; commitar os arquivos gerados em `components/ui/`.

**Technical actions:**

1. Rodar `docker compose exec next-frontend npx shadcn@latest add avatar badge pagination select textarea` — gera `components/ui/<name>.tsx` por primitive (estilo `radix-nova`, tokens do `app/globals.css`).
2. Commitar `components/ui/avatar.tsx`, `badge.tsx`, `pagination.tsx`, `select.tsx` e `textarea.tsx`; conferir que nenhum arquivo existente (`button`, `card`, `checkbox`, `icon-button`, `input`, `label`) foi sobrescrito.

**Tests:** _(empty — Infra)_

**Dependencies:** none

**Acceptance criteria:**

- `components/ui/avatar.tsx`, `badge.tsx`, `pagination.tsx`, `select.tsx` e `textarea.tsx` existem em `next-frontend/`.
- `docker compose exec next-frontend npx tsc --noEmit` sai com código 0 com os arquivos gerados.
- `git diff` não mostra alterações em `components/ui/button.tsx`, `card.tsx`, `checkbox.tsx`, `icon-button.tsx`, `input.tsx` nem `label.tsx`.

---

### SI-04.0.2 — Tests shadcn batch (≤5 files)

**Description:** Testes unitários dos primitives instalados em SI-04.0.1 — variantes, a11y, `data-slot` e handlers.

**Technical actions:**

1. Criar um arquivo de teste por primitive em `components/ui/__tests__/` (`avatar`, `badge`, `pagination`, `select`, `textarea`), seguindo o padrão de `checkbox.test.tsx` e `icon-button.test.tsx`.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `avatar.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" — variantes de tamanho, fallback de iniciais, a11y, data-slot | `components/ui/__tests__/avatar.test.tsx` |
| `badge.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" — variantes, data-slot | `components/ui/__tests__/badge.test.tsx` |
| `pagination.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" — `nav` rotulado, `aria-current="page"`, links `?page=N` | `components/ui/__tests__/pagination.test.tsx` |
| `select.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" — seleção, a11y, data-slot | `components/ui/__tests__/select.test.tsx` |
| `textarea.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" — value/onChange, a11y, data-slot | `components/ui/__tests__/textarea.test.tsx` |

**Dependencies:** SI-04.0.1

**Acceptance criteria:**

- Cada primitive do batch tem um arquivo de teste unitário que exercita todas as variantes CVA, atributos ARIA, âncoras `data-slot` e handlers de evento.
- `docker compose exec next-frontend npx vitest run components/ui/__tests__` passa.

---

### SI-04.0.3 — Custom-ui: filter-chip.tsx

**Description:** Criar `components/ui/filter-chip.tsx` conforme o UI Contract da página pública — primitive não disponível no registry shadcn.

**Technical actions:**

1. Criar `components/ui/filter-chip.tsx` — chip com variantes active/normal e suporte a `disabled` (chips Latest / Popular / Oldest ficam desabilitados, D7), estilizado com tokens de `app/globals.css` e `cn(...)`.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `filter-chip.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" + custom-logic — variantes active/normal, `disabled`, a11y, data-slot | `components/ui/__tests__/filter-chip.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- `components/ui/filter-chip.tsx` existe e exporta `FilterChip` com as variantes active e normal.
- Um `FilterChip` com `disabled` não dispara `onClick` e expõe o atributo `disabled`.
- `docker compose exec next-frontend npx tsc --noEmit` sai com código 0.

---

### SI-04.0.4 — Custom-ui: menu-item.tsx

**Description:** Criar `components/ui/menu-item.tsx` conforme o UI Contract do menu de conta — item de menu com geometria própria, diferente do `SideNavItem`.

**Technical actions:**

1. Criar `components/ui/menu-item.tsx` — link de navegação client-side (`next/link`) com ícone de 16px à esquerda, padding 16px, `border-b` e sem raio, aceitando `href`, `icon` e `children`.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `menu-item.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" + custom-logic — renderiza `<a>` com `href`, ícone, foco visível, data-slot | `components/ui/__tests__/menu-item.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- `components/ui/menu-item.tsx` existe e exporta `MenuItem`.
- Um `MenuItem` com `href="/studio/channel"` renderiza um link para essa rota com o texto e o ícone informados.
- `docker compose exec next-frontend npx tsc --noEmit` sai com código 0.

---

### SI-04.0.5 — Custom-ui: overlay.tsx

**Description:** Criar `components/ui/overlay.tsx` conforme o UI Contract do menu de conta — backdrop de tela inteira.

**Technical actions:**

1. Criar `components/ui/overlay.tsx` — backdrop `inset-0` com o token `--overlay` (já presente em `app/globals.css`), aceitando `onClick` para fechar; o comportamento de fechar fica a cargo do container.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `overlay.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" + custom-logic — renderiza com o token, dispara `onClick`, data-slot | `components/ui/__tests__/overlay.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- `components/ui/overlay.tsx` existe e exporta `Overlay`.
- Clicar no `Overlay` dispara o `onClick` recebido.
- `docker compose exec next-frontend npx tsc --noEmit` sai com código 0.

---

### SI-04.0.6 — Custom-ui: search-field.tsx

**Description:** Criar `components/ui/search-field.tsx` conforme o UI Contract — campo de busca usado inerte no TopNav e desabilitado nos filtros do painel.

**Technical actions:**

1. Criar `components/ui/search-field.tsx` — `<input type="search">` com ícone de busca à esquerda e botão de limpar à direita, aceitando `disabled`, `aria-label` e `placeholder`; ícone via `components/icons/search-icon.tsx` (SI-04.0.10).

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `search-field.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" + custom-logic — `disabled`, nome acessível, limpar restaura vazio, data-slot | `components/ui/__tests__/search-field.test.tsx` |

**Dependencies:** SI-04.0.10

**Acceptance criteria:**

- `components/ui/search-field.tsx` existe e exporta `SearchField`.
- Um `SearchField` com `disabled` não aceita digitação e expõe o atributo `disabled`.
- O campo expõe nome acessível via `aria-label`.

---

### SI-04.0.7 — Custom-ui: section-header.tsx

**Description:** Criar `components/ui/section-header.tsx` conforme o UI Contract da edição de vídeo — cabeçalho de seção com título e linha descritiva.

**Technical actions:**

1. Criar `components/ui/section-header.tsx` — título de 20px semi-bold e linha descritiva `muted-foreground`, aceitando `id` para uso em `aria-labelledby` (nome acessível do Category select).

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `section-header.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" + custom-logic — título, descrição opcional, `id` repassado, data-slot | `components/ui/__tests__/section-header.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- `components/ui/section-header.tsx` existe e exporta `SectionHeader`.
- Um `SectionHeader` com `id="category-heading"` renderiza o título com esse `id`.
- `docker compose exec next-frontend npx tsc --noEmit` sai com código 0.

---

### SI-04.0.8 — Custom-ui: video-thumbnail.tsx

**Description:** Criar `components/ui/video-thumbnail.tsx` conforme o UI Contract do painel e da página pública — thumbnail via `next/image` com overlay de duração.

**Technical actions:**

1. Criar `components/ui/video-thumbnail.tsx` — imagem raster via `next/image` (nunca `<img>`) com `src` do BFF `/api/videos/{id}/thumbnail?v={updatedAt}` (per `phase-04-videos-channel-frontend/TD-05`), variantes de tamanho (256×144 no painel; aspecto 421.69/239 e radius 16px na página pública), placeholder quando o vídeo não tem thumbnail, e overlay de duração formatada (`mm:ss`) quando `durationSeconds` for informado.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `video-thumbnail.tsx` | Unit per testing-guide-next-frontend § "UI Primitives" + custom-logic — `src` com `?v=`, placeholder sem thumbnail, formatação da duração, `alt` vazio dentro de link, data-slot | `components/ui/__tests__/video-thumbnail.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- `components/ui/video-thumbnail.tsx` existe e exporta `VideoThumbnail`.
- Um `VideoThumbnail` com `videoId="abc"` e `version="2026-01-01T00:00:00.000Z"` renderiza uma imagem cujo `src` referencia `/api/videos/abc/thumbnail` com o parâmetro `v`.
- Um `VideoThumbnail` com `durationSeconds={630}` exibe `10:30`.
- Sem thumbnail disponível, renderiza o placeholder em vez da imagem.

---

### SI-04.0.9 — Custom-business simple group: close, comment, edit, filter, home icons

**Description:** Criar cinco ícones SVG customizados (sem estado nem lógica), seguindo o padrão de `components/icons/`.

**Technical actions:**

1. Criar `components/icons/close-icon.tsx` — glifo "close" de 24px.
2. Criar `components/icons/comment-icon.tsx` — ícone de comentários.
3. Criar `components/icons/edit-icon.tsx` — glifo de 16px (lápis sobre quadrado).
4. Criar `components/icons/filter-icon.tsx` — glifo do botão "Filter" (o Figma desenha um glifo parecido com "share"; usar o glifo de filtro e anotar a divergência).
5. Criar `components/icons/home-icon.tsx` — variantes contorno e preenchida (estado ativo).

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `close-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderiza SVG, repassa props, `aria-hidden` por padrão | `components/icons/__tests__/close-icon.test.tsx` |
| `comment-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" | `components/icons/__tests__/comment-icon.test.tsx` |
| `edit-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" | `components/icons/__tests__/edit-icon.test.tsx` |
| `filter-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" | `components/icons/__tests__/filter-icon.test.tsx` |
| `home-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" — variantes contorno e preenchida | `components/icons/__tests__/home-icon.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- Os cinco arquivos existem em `components/icons/` e cada um exporta seu componente.
- Cada ícone renderiza um `<svg>` que repassa `className` e demais props.
- `HomeIcon` renderiza formas distintas para as variantes contorno e preenchida.

---

### SI-04.0.10 — Custom-business simple group: liked-videos, menu, mic, plus, search icons

**Description:** Criar cinco ícones SVG customizados (sem estado nem lógica), seguindo o padrão de `components/icons/`.

**Technical actions:**

1. Criar `components/icons/liked-videos-icon.tsx` — apenas variante contorno (a preenchida não está desenhada).
2. Criar `components/icons/menu-icon.tsx` — glifo hambúrguer.
3. Criar `components/icons/mic-icon.tsx` — glifo de microfone.
4. Criar `components/icons/plus-icon.tsx` — glifo "add".
5. Criar `components/icons/search-icon.tsx` — usado nos dois campos de busca.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `liked-videos-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderiza SVG, repassa props, `aria-hidden` por padrão | `components/icons/__tests__/liked-videos-icon.test.tsx` |
| `menu-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" | `components/icons/__tests__/menu-icon.test.tsx` |
| `mic-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" | `components/icons/__tests__/mic-icon.test.tsx` |
| `plus-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" | `components/icons/__tests__/plus-icon.test.tsx` |
| `search-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" | `components/icons/__tests__/search-icon.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- Os cinco arquivos existem em `components/icons/` e cada um exporta seu componente.
- Cada ícone renderiza um `<svg>` que repassa `className` e demais props.

---

### SI-04.0.11 — Custom-business simple group: sort, subscriptions, thumbs-up, views, your-videos icons

**Description:** Criar cinco ícones SVG customizados (sem estado nem lógica), seguindo o padrão de `components/icons/`.

**Technical actions:**

1. Criar `components/icons/sort-icon.tsx` — glifo filter-list de 16px.
2. Criar `components/icons/subscriptions-icon.tsx` — apenas variante contorno.
3. Criar `components/icons/thumbs-up-icon.tsx` — ícone de likes.
4. Criar `components/icons/views-icon.tsx` — glifo de olho 13.5×12 (D12: não reusa `eye-icon.tsx`, que é o olho de visibilidade de senha).
5. Criar `components/icons/your-videos-icon.tsx` — variantes contorno e preenchida (item ativo nas rotas `(studio)/*`).

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `sort-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderiza SVG, repassa props, `aria-hidden` por padrão | `components/icons/__tests__/sort-icon.test.tsx` |
| `subscriptions-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" | `components/icons/__tests__/subscriptions-icon.test.tsx` |
| `thumbs-up-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" | `components/icons/__tests__/thumbs-up-icon.test.tsx` |
| `views-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" | `components/icons/__tests__/views-icon.test.tsx` |
| `your-videos-icon.tsx` | Unit per testing-guide-next-frontend § "Client Components" — variantes contorno e preenchida | `components/icons/__tests__/your-videos-icon.test.tsx` |

**Dependencies:** none

**Acceptance criteria:**

- Os cinco arquivos existem em `components/icons/` e cada um exporta seu componente.
- `ViewsIcon` é um componente distinto de `EyeIcon` (`components/icons/eye-icon.tsx` permanece inalterado).
- `YourVideosIcon` renderiza formas distintas para as variantes contorno e preenchida.

---

### SI-04.0.12 — Custom-business simple group: casca (top-nav, side-nav-item, side-nav-subscription-list, subscription-nav-item, account-menu-trigger)

**Description:** Criar os componentes de casca sem estado próprio (props-driven), consumidos por `AppShell`, `SideNav` e `AccountMenu`.

**Technical actions:**

1. Criar `components/layout/top-nav.tsx` — casca global autenticada (menu, logo, busca, voz, criar, avatar); busca e voz inertes (D6); recebe `onMenuToggle` e o gatilho da conta via props; usa `BrandLogo` (link para `/`), `SearchField`, `IconButton` (variante ghost) e `Avatar`.
2. Criar `components/layout/side-nav-item.tsx` — item com ícone + label (linha 46px, px 14, raio 8), `<Link>` do `next/link`, prop `active` que aplica `aria-current="page"`.
3. Criar `components/layout/subscription-nav-item.tsx` — item estático avatar (26px) + nome, sem destino (D6).
4. Criar `components/layout/side-nav-subscription-list.tsx` — placeholder estático com 6 `SubscriptionNavItem`, sem dados reais e sem verbo (D6).
5. Criar `components/layout/account-menu-trigger.tsx` — botão do avatar (36px) com `aria-haspopup="dialog"` e `aria-expanded`, disparando `onClick`.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `top-nav.tsx` | Unit per testing-guide-next-frontend § "Client Components" — controles inertes, `aria-label` nos botões só de ícone, `onMenuToggle` | `components/layout/__tests__/top-nav.test.tsx` |
| `side-nav-item.tsx` | Unit per testing-guide-next-frontend § "Client Components" — `href`, `aria-current="page"` quando ativo | `components/layout/__tests__/side-nav-item.test.tsx` |
| `subscription-nav-item.tsx` | Unit per testing-guide-next-frontend § "Client Components" — avatar + nome | `components/layout/__tests__/subscription-nav-item.test.tsx` |
| `side-nav-subscription-list.tsx` | Unit per testing-guide-next-frontend § "Client Components" — renderiza 6 itens estáticos | `components/layout/__tests__/side-nav-subscription-list.test.tsx` |
| `account-menu-trigger.tsx` | Unit per testing-guide-next-frontend § "Client Components" — `aria-haspopup`, `aria-expanded`, `onClick` | `components/layout/__tests__/account-menu-trigger.test.tsx` |

**Dependencies:** SI-04.0.1, SI-04.0.6, SI-04.0.10

**Acceptance criteria:**

- Os cinco arquivos existem em `components/layout/` e cada um exporta seu componente.
- `SideNavItem` com `active` expõe `aria-current="page"`; sem `active`, não expõe.
- `TopNav` expõe `aria-label` nos botões de menu, voz e criar, e o campo de busca tem nome acessível.
- `AccountMenuTrigger` expõe `aria-expanded` refletindo a prop de estado aberto.

---

### SI-04.0.13 — Custom-business simple group: studio (channel-summary, video-list-row, video-sort-control, video-stats)

**Description:** Criar os componentes de estúdio sem estado próprio (props-driven) usados pelo painel de vídeos e pela edição de canal.

**Technical actions:**

1. Criar `components/studio/channel-summary.tsx` — somente nome e handle do canal (D9: sem banner, avatar nem contadores), dentro de `Card`.
2. Criar `components/studio/video-stats.tsx` — visualizações, likes e comentários com `ViewsIcon`, `ThumbsUpIcon` e `CommentIcon`; exibe `0` quando os placeholders vierem zerados.
3. Criar `components/studio/video-sort-control.tsx` — "Sort by: Latest" com `SortIcon`, renderizado desabilitado (D7).
4. Criar `components/studio/video-list-row.tsx` — linha 1088×160 com `VideoThumbnail` (256×144), título (1 linha, ellipsis), descrição, `VideoStats`, tempo de publicação relativo (`Intl.RelativeTimeFormat`, ausente em rascunho) e `Badge` de visibilidade/status; a linha inteira é `<Link>` para `/studio/videos/{id}/edit`.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `channel-summary.tsx` | Unit per testing-guide-next-frontend § "Client Components" — nome e handle | `components/studio/__tests__/channel-summary.test.tsx` |
| `video-stats.tsx` | Unit per testing-guide-next-frontend § "Client Components" — contadores formatados com `Intl.NumberFormat` | `components/studio/__tests__/video-stats.test.tsx` |
| `video-sort-control.tsx` | Unit per testing-guide-next-frontend § "Client Components" — desabilitado | `components/studio/__tests__/video-sort-control.test.tsx` |
| `video-list-row.tsx` | Unit per testing-guide-next-frontend § "Client Components" — link para a edição, rascunho sem tempo de publicação, badge por status/visibilidade | `components/studio/__tests__/video-list-row.test.tsx` |

**Dependencies:** SI-04.0.1, SI-04.0.8, SI-04.0.9, SI-04.0.11

**Acceptance criteria:**

- Os quatro arquivos existem em `components/studio/` e cada um exporta seu componente.
- `VideoListRow` de um vídeo `id="abc"` renderiza um link para `/studio/videos/abc/edit`.
- `VideoListRow` de um rascunho (`publishedAt: null`) não exibe tempo de publicação.
- `VideoSortControl` renderiza com o controle desabilitado.

---

### SI-04.0.14 — Custom-business simple group: channel (channel-header, video-card, video-sort-filter)

**Description:** Criar os componentes da página pública do canal, props-driven e sem estado próprio.

**Technical actions:**

1. Criar `components/channel/channel-header.tsx` — nome do canal como `<h1>`, nickname e descrição (D9: sem contadores, banner, avatar, Subscribe nem verified badge).
2. Criar `components/channel/video-card.tsx` — thumbnail (`VideoThumbnail`), título (2 linhas), "N views • tempo relativo" (`Intl.NumberFormat` compacto + `Intl.RelativeTimeFormat`); o card inteiro é um único `<Link>` para `/watch/{id}` com o título como nome acessível.
3. Criar `components/channel/video-sort-filter.tsx` — três `FilterChip` (Latest / Popular / Oldest) renderizados desabilitados (D7).

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `channel-header.tsx` | Unit per testing-guide-next-frontend § "Client Components" — h1 com o nome, nickname, descrição nula | `components/channel/__tests__/channel-header.test.tsx` |
| `video-card.tsx` | Unit per testing-guide-next-frontend § "Client Components" — link único para `/watch/{id}`, formatação de views e tempo | `components/channel/__tests__/video-card.test.tsx` |
| `video-sort-filter.tsx` | Unit per testing-guide-next-frontend § "Client Components" — chips desabilitados | `components/channel/__tests__/video-sort-filter.test.tsx` |

**Dependencies:** SI-04.0.3, SI-04.0.8

**Acceptance criteria:**

- Os três arquivos existem em `components/channel/` e cada um exporta seu componente.
- `ChannelHeader` renderiza o nome do canal em um `<h1>`.
- `VideoCard` de um vídeo `id="abc"` renderiza um único link para `/watch/abc`.
- Os três chips de `VideoSortFilter` estão desabilitados.

---

### SI-04.0.15 — Custom-business complex: account-menu.tsx

**Description:** Criar `components/layout/account-menu.tsx` — drawer de conta com estado aberto/fechado 100% client e identidade lida da sessão, per Notes "Estado aberto/fechado 100% client; a identidade vem da sessão (SessionProvider, sem fetch)".

**Technical actions:**

1. Criar `components/layout/account-menu.tsx` — painel lateral direito de 320px, altura total, fundo `--card`, drop-shadow; `role="dialog"` + `aria-modal`, título "Account" como nome acessível, focus trap, Esc e clique no `Overlay` fecham, foco devolvido ao gatilho, scroll do body bloqueado enquanto aberto; bloco de perfil com `Avatar` de 64px (fallback de iniciais do nickname), `@{channelSlug}` na 1ª linha e o e-mail na 2ª (D16), lidos via `useSession()`; item "Edit Channel" (`MenuItem` + `EditIcon`) para `/studio/channel` (D15); `IconButton` (variante ghost) com `CloseIcon` para fechar; sem item "Sign Out" (D17).

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `account-menu.tsx` | Unit per testing-guide-next-frontend § "Client Components" baseline — renderiza identidade da sessão, item "Edit Channel" com `href="/studio/channel"` | `components/layout/__tests__/account-menu.test.tsx` |
| `account-menu.tsx` | Unit: state assertions per Notes signal — abrir/fechar, Esc, clique no backdrop, devolução de foco, `aria-modal` | (same file) |

**Dependencies:** SI-04.0.1, SI-04.0.4, SI-04.0.5, SI-04.0.9

**Acceptance criteria:**

- `components/layout/account-menu.tsx` existe e exporta `AccountMenu`.
- Aberto, o painel expõe `role="dialog"` com `aria-modal="true"` e o nome acessível "Account".
- Com sessão `channelSlug: "techmaster"` e `email: "a@b.com"`, o painel exibe `@techmaster` e `a@b.com`.
- Pressionar Esc ou clicar no backdrop fecha o painel; o item "Edit Channel" aponta para `/studio/channel`; não há item "Sign Out".

---

### SI-04.0.16 — Custom-business complex: side-nav.tsx

**Description:** Criar `components/layout/side-nav.tsx` — navegação lateral expandida com item ativo por prefixo de rota (estado derivado da rota; `local` toggle de visibilidade controlado pelo `AppShell`).

**Technical actions:**

1. Criar `components/layout/side-nav.tsx` — `<nav aria-label>` de 256px (D14: só a variante expandida) com seção "You" (Home, Subscriptions, Your videos, Liked videos via `SideNavItem` + ícones), divisores, títulos de seção e `SideNavSubscriptionList`; item ativo por prefixo de rota via `usePathname()` (`/studio/videos` e `/studio/videos/[id]/edit` marcam "Your videos") com `aria-current="page"`; só "Your videos" tem destino (`/studio/videos`); demais itens sem destino (fases posteriores); prop `id` para `aria-controls` do hambúrguer.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `side-nav.tsx` | Unit per testing-guide-next-frontend § "Client Components" baseline — landmark `nav` rotulado, itens e seções renderizados | `components/layout/__tests__/side-nav.test.tsx` |
| `side-nav.tsx` | Unit: state assertions per Notes signal — item ativo por prefixo de rota | (same file) |

**Dependencies:** SI-04.0.9, SI-04.0.10, SI-04.0.11, SI-04.0.12

**Acceptance criteria:**

- `components/layout/side-nav.tsx` existe e exporta `SideNav`.
- Com o pathname `/studio/videos`, "Your videos" expõe `aria-current="page"` e nenhum outro item o expõe.
- Com o pathname `/studio/videos/abc/edit`, "Your videos" continua ativo.
- O `<nav>` tem `aria-label`.

---

### SI-04.0.17 — Custom-business complex: app-shell.tsx

**Description:** Criar `components/layout/app-shell.tsx` — layout de rota autenticada (TopNav + SideNav + área principal) que detém o estado de mostrar/ocultar a SideNav e o de abrir/fechar o menu de conta, per Notes "Layout de rota autenticada: TopNav + SideNav (256px) + área principal. Compartilhado pelas 4 telas (D6)".

**Technical actions:**

1. Criar `components/layout/app-shell.tsx` — Client Component com estado local de visibilidade da SideNav (hambúrguer alterna, `aria-expanded` + `aria-controls`) e de abertura do `AccountMenu` (gatilho no avatar do `TopNav`); compõe `TopNav`, `SideNav`, `AccountMenu` e o slot `children` da área principal; refluxo do conteúdo quando a SideNav é ocultada.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `app-shell.tsx` | Unit per testing-guide-next-frontend § "Client Components" baseline — renderiza TopNav, SideNav e `children` | `components/layout/__tests__/app-shell.test.tsx` |
| `app-shell.tsx` | Unit: toggle assertions per Notes signal — hambúrguer oculta/mostra a SideNav; avatar abre o AccountMenu | (same file) |

**Dependencies:** SI-04.0.12, SI-04.0.15, SI-04.0.16

**Acceptance criteria:**

- `components/layout/app-shell.tsx` existe e exporta `AppShell`.
- Clicar no hambúrguer oculta a SideNav e um segundo clique a mostra de novo; o botão reflete o estado em `aria-expanded`.
- Clicar no avatar abre o `AccountMenu`.
- O conteúdo passado em `children` é renderizado na área principal.

---

### SI-04.0.18 — Custom-business complex: channel-settings-form.tsx

**Description:** Criar `components/studio/channel-settings-form.tsx` — formulário de edição do canal com `react-hook-form` + Zod (per `phase-02-auth-frontend/TD-04`), per Notes "Form com validação local e envio ao servidor → Server-connected como unidade".

**Technical actions:**

1. Criar `components/studio/channel-settings-form.tsx` — Client Component com campos handle (nickname), display name (nome) e description (`Textarea`), `FormLabel`/`Input` existentes, `FieldError` para erros e "Last updated" derivado de `updatedAt`; Save Changes com estado pending/disabled e Cancel (volta sem I/O); aceita `channel` (valores iniciais) e `onSubmit` por props (a chamada ao BFF é ligada em SI-04.34b); mapeia `NICKNAME_ALREADY_EXISTS` para erro inline no handle com `aria-invalid` + `aria-describedby`.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `channel-settings-form.tsx` | Unit per testing-guide-next-frontend § "Client Components" baseline — pré-preenchimento, submit com valores editados | `components/studio/__tests__/channel-settings-form.wiring.test.tsx` |
| `channel-settings-form.tsx` | Unit: state assertions per Notes signal — erro `NICKNAME_ALREADY_EXISTS` inline, Save pending/disabled | (same file) |

**Dependencies:** SI-04.0.1

**Acceptance criteria:**

- `components/studio/channel-settings-form.tsx` existe e exporta `ChannelSettingsForm`.
- Os campos iniciam com os valores de `channel` (nickname, nome, descrição).
- Quando `onSubmit` rejeita com `NICKNAME_ALREADY_EXISTS`, o campo handle exibe o erro inline com `aria-invalid="true"`.
- Durante o envio, o botão Save Changes fica desabilitado.

---

### SI-04.0.19 — Custom-business complex: privacy-option.tsx

**Description:** Criar `components/studio/privacy-option.tsx` — opção estilo radio (ícone, título, descrição) para público/unlisted, per Notes "Seleção local até salvar".

**Technical actions:**

1. Criar `components/studio/privacy-option.tsx` — card de 576px com semântica de radio (`role="radio"`, `aria-checked`, foco visível) para uso dentro de um `role="radiogroup"` com navegação por setas; aceita `value` (`public` | `unlisted`), `selected`, `onSelect`, ícone, título e descrição; a seleção é local até o Save Changes.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `privacy-option.tsx` | Unit per testing-guide-next-frontend § "Client Components" baseline — renderiza título e descrição | `components/studio/__tests__/privacy-option.test.tsx` |
| `privacy-option.tsx` | Unit: toggle/state assertions per Notes signal — seleção via clique e teclado, `aria-checked` | (same file) |

**Dependencies:** none

**Acceptance criteria:**

- `components/studio/privacy-option.tsx` existe e exporta `PrivacyOption`.
- Uma opção com `selected` expõe `aria-checked="true"`; sem `selected`, `aria-checked="false"`.
- Clicar ou pressionar Enter/Espaço na opção dispara `onSelect` com seu `value`.

---

### SI-04.0.20 — Custom-business complex: thumb-upload.tsx

**Description:** Criar `components/studio/thumb-upload.tsx` — tile de thumbnail com escolha de arquivo e pré-visualização local (D10: o envio acontece no Save Changes), per Notes "Só pré-visualiza".

**Technical actions:**

1. Criar `components/studio/thumb-upload.tsx` — tile 266×151 que exibe a thumbnail atual (`VideoThumbnail`, `next/image`) e, ao escolher um arquivo, a pré-visualização local via `URL.createObjectURL` (revogada ao trocar/desmontar); valida no cliente `image/*` e ≤5MB e informa erro inline; expõe `onFileChange(file | null)` e o botão "Change Thumbnail" (`Button` variant outline) que aciona o seletor de arquivo.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `thumb-upload.tsx` | Unit per testing-guide-next-frontend § "Client Components" baseline — renderiza thumbnail atual e botão | `components/studio/__tests__/thumb-upload.test.tsx` |
| `thumb-upload.tsx` | Unit: state assertions per Notes signal — pré-visualização após escolher arquivo, erro para arquivo não-imagem ou >5MB | (same file) |

**Dependencies:** SI-04.0.8

**Acceptance criteria:**

- `components/studio/thumb-upload.tsx` existe e exporta `ThumbUpload`.
- Escolher um arquivo PNG de 1MB chama `onFileChange` com o arquivo e troca a pré-visualização.
- Escolher um arquivo `text/plain` exibe erro inline e não chama `onFileChange` com o arquivo.
- Escolher uma imagem maior que 5MB exibe erro inline.

---

### SI-04.0.21 — Custom-business complex: video-config-card.tsx

**Description:** Criar `components/studio/video-config-card.tsx` — painel lateral somente leitura da edição de vídeo, per Notes "Copiar é client-only; dados via props do form".

**Technical actions:**

1. Criar `components/studio/video-config-card.tsx` — card de 328px com preview estático preto ("0:00", sem playback), "Video link" com ícone de copiar que copia o link no cliente (`navigator.clipboard`) e mostra confirmação local, e Video Quality derivada de `height` (ex.: `1080p`) e duração de `durationSeconds`; Filename omitido (o backend não o expõe) e campos ausentes são omitidos.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `video-config-card.tsx` | Unit per testing-guide-next-frontend § "Client Components" baseline — renderiza link, qualidade e duração | `components/studio/__tests__/video-config-card.test.tsx` |
| `video-config-card.tsx` | Unit: state assertions per Notes signal — copiar chama `navigator.clipboard.writeText` e mostra confirmação | (same file) |

**Dependencies:** none

**Acceptance criteria:**

- `components/studio/video-config-card.tsx` existe e exporta `VideoConfigCard`.
- Com `height: 1080`, exibe `1080p`; com `height: null`, omite Video Quality.
- Clicar no ícone de copiar chama `navigator.clipboard.writeText` com o link informado.
- Não há campo Filename.

---

### SI-04.0.22 — Custom-business complex: video-edit-form.tsx

**Description:** Criar `components/studio/video-edit-form.tsx` — container do formulário de edição de vídeo com `react-hook-form` + Zod (per `phase-02-auth-frontend/TD-04`), per Notes "Container do formulário: carrega os dados atuais do vídeo, combina validação local e envio ao servidor".

**Technical actions:**

1. Criar `components/studio/video-edit-form.tsx` — Client Component com título (`Input`), descrição (`Textarea`), `ThumbUpload`, categoria (`Select` com `SectionHeader` via `aria-labelledby`), visibilidade (`PrivacyOption` x2 em `role="radiogroup"`), `VideoConfigCard`, Status ("Checks complete. No issues found." como live region, só com `status=ready`) e rodapé com Cancel, Save Changes e `PublishButton` (habilitado só com `status=ready` e sem `publishedAt`); recebe `video`, `categories` e handlers (`onSave`, `onPublish`) por props — a ligação ao BFF é feita em SI-04.33b; Save com pending/disabled e erros inline por campo.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `video-edit-form.tsx` | Unit per testing-guide-next-frontend § "Client Components" baseline — pré-preenchimento e submit com valores editados | `components/studio/__tests__/video-edit-form.wiring.test.tsx` |
| `video-edit-form.tsx` | Unit: state assertions per Notes signal — Publish habilitado só com `ready` e não publicado, seleção de visibilidade, erros por `errorCode` | (same file) |

**Dependencies:** SI-04.0.1, SI-04.0.7, SI-04.0.19, SI-04.0.20, SI-04.0.21

**Acceptance criteria:**

- `components/studio/video-edit-form.tsx` existe e exporta `VideoEditForm`.
- Com `status: "processing"`, o botão Publicar está desabilitado; com `status: "ready"` e `publishedAt: null`, está habilitado; com `publishedAt` definido, está desabilitado.
- Enviar o formulário chama `onSave` com título, descrição, `categoryId`, `visibility` e o arquivo de thumbnail escolhido (quando houver).
- O grupo de visibilidade expõe `role="radiogroup"` e o Select de categoria tem nome acessível "Category".

---

### SI-04.10 — Backend: STORAGE_PUBLIC_ENDPOINT e cliente S3 de assinatura

**Description:** Fazer as URLs pré-assinadas de leitura (stream, download e thumbnail) apontarem para uma origem de storage alcançável pelo navegador, sem alterar o cliente interno usado em upload/multipart/cron (per `phase-04-videos-channel-frontend/TD-04`).

**Technical actions:**

1. Adicionar `publicEndpoint` (`STORAGE_PUBLIC_ENDPOINT`) em `src/config/storage.config.ts` e validá-lo como obrigatório (`Joi.string().uri().required()`) em `src/config/env.validation.ts` (per `phase-04-videos-channel-frontend/TD-04`)
2. Documentar `STORAGE_PUBLIC_ENDPOINT` em `.env.example` (`http://localhost:9000` em dev — origem voltada ao navegador, exceção deliberada à regra de nomes de serviço do `CLAUDE.md`) e repassá-lo em `compose.yaml`
3. Declarar o token `S3_PRESIGN_CLIENT` em `src/storage/storage.constants.ts` e registrar em `src/storage/storage.module.ts` um segundo `S3Client` configurado com `publicEndpoint`, exportado junto de `S3_CLIENT`
4. Trocar em `VideosService.getPlaybackUrl` (e nos demais usos de `getSignedUrl` de leitura em `src/videos/videos.service.ts`) o cliente injetado para `S3_PRESIGN_CLIENT`; upload/multipart/cron seguem em `S3_CLIENT`

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `env.validation` | Integration: `STORAGE_PUBLIC_ENDPOINT` ausente falha a validação | `src/config/env.validation.integration-spec.ts` |
| `VideosService.getPlaybackUrl` | Unit: branch logic (mock repo) — a URL assinada usa o cliente de assinatura | `src/videos/videos.service.spec.ts` |
| `StorageModule` | Unit: expõe `S3_CLIENT` e `S3_PRESIGN_CLIENT` | `src/videos/videos.module.spec.ts` |

**Dependencies:** none

**Acceptance criteria:**

- A aplicação falha na inicialização quando `STORAGE_PUBLIC_ENDPOINT` não está definido.
- `GET /videos/:id/stream` retorna `200` com uma URL cujo host é o de `STORAGE_PUBLIC_ENDPOINT` (não `minio`).
- Upload multipart e o cron de limpeza continuam usando o endpoint interno (`STORAGE_ENDPOINT`).

---

### SI-04.11 — Backend: GET /videos/:id/thumbnail e updatedAt nas respostas

**Description:** Entregar a thumbnail à UI por redirect 302 para URL pré-assinada, aplicando a regra de visibilidade, e expor `updatedAt` como versão de cache nas listagens e nas respostas de PATCH/thumbnail (per `phase-04-videos-channel-frontend/TD-05`).

**Technical actions:**

1. Adicionar `VideosService.getThumbnailUrl(id, userId?)` — aplica a regra de visibilidade (dono vê qualquer status; anônimo/não-dono só vê vídeo `ready` + publicado + `public`), lança `VideoNotFoundException` quando o vídeo não é visível ou não tem `thumbnail_key`, e assina a URL com `S3_PRESIGN_CLIENT` (per `phase-04-videos-channel-frontend/TD-05`)
2. Adicionar handler `GET /videos/:id/thumbnail` (`@Public()`, sem `@ApiBearerAuth`) em `VideosController` respondendo `302` com `Location` e `Cache-Control` curto (per `### API Contracts` → `GET /videos/:id/thumbnail`)
3. Incluir `updatedAt` (`updated_at`) nos itens de `GET /channels/:id/manage/videos` e `GET /channels/:nickname/videos` e nas respostas de `PATCH /videos/:id` e `POST /videos/:id/thumbnail`
4. Documentar em OpenAPI (`@ApiOperation` + `@ApiResponse` 302/404 com `ApiErrorEnvelope`) o novo endpoint e atualizar os schemas dos quatro endpoints alterados

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `VideosService.getThumbnailUrl` | Unit: branch logic (mock repo) — visibilidade por principal, sem `thumbnail_key` | `src/videos/videos.service.spec.ts` |
| `VideosService.getThumbnailUrl` | Integration: regra de visibilidade contra o banco | `src/videos/videos.service.integration-spec.ts` |
| `VideosController` (GET /videos/:id/thumbnail, `updatedAt`) | E2E | `test/videos.e2e-spec.ts` |

**Dependencies:** SI-04.10

**Acceptance criteria:**

- `GET /videos/:id/thumbnail` de um vídeo `ready`, publicado e `public`, sem autenticação, retorna `302` com `Location` para uma URL pré-assinada.
- `GET /videos/:id/thumbnail` de um rascunho, sem autenticação, retorna `404` com `errorCode: "VIDEO_NOT_FOUND"`.
- `GET /videos/:id/thumbnail` de um rascunho pelo dono retorna `302`.
- `GET /videos/:id/thumbnail` de um vídeo sem `thumbnail_key` retorna `404`.
- Os itens de `GET /channels/:id/manage/videos` e `GET /channels/:nickname/videos` e as respostas `200` de `PATCH /videos/:id` e `POST /videos/:id/thumbnail` incluem `updatedAt`.

---

### SI-04.12 — Backend: GET /channels/me e detalhe do vídeo enriquecido

**Description:** Implementar as duas lacunas de contrato decididas em `phase-04-frontend-contract-gaps`: o frontend precisa conhecer o canal do usuário logado (TD-01) e carregar no formulário os campos editáveis do vídeo (TD-02).

**Technical actions:**

1. Adicionar `ChannelsService.findByOwner(userId)` retornando o canal do usuário autenticado (lança `ChannelNotFoundException` quando não há canal) — per `phase-04-frontend-contract-gaps/TD-01`
2. Adicionar handler `GET /channels/me` em `ChannelsController`, declarado **antes** de `GET /channels/:nickname`, com resposta `id`, `name`, `nickname`, `description`, `updatedAt` (per `### API Contracts` → `GET /channels/me`) e `@ApiBearerAuth('access-token')`
3. Enriquecer a resposta de `GET /videos/:id` em `VideosController` com `description`, `categoryId`, `visibility`, `publishedAt`, `thumbnailKey` e `updatedAt` — per `phase-04-frontend-contract-gaps/TD-02`, sem alterar campos existentes nem a regra de visibilidade
4. Incluir `updatedAt` na resposta `200` de `PATCH /channels/:id`
5. Atualizar a documentação OpenAPI dos três endpoints (`@ApiResponse` com os schemas novos)

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `ChannelsService.findByOwner` | Unit: branch logic (mock repo) — canal existente, ausente | `src/channels/channels.service.spec.ts` |
| `ChannelsController` (GET /channels/me, PATCH `updatedAt`) | E2E | `test/channels.e2e-spec.ts` |
| `VideosController` (GET /videos/:id enriquecido) | E2E | `test/videos.e2e-spec.ts` |

**Dependencies:** SI-04.11

**Acceptance criteria:**

- `GET /channels/me` autenticado retorna `200` com `id`, `name`, `nickname`, `description` e `updatedAt` do canal do usuário.
- `GET /channels/me` sem autenticação retorna `401`.
- `GET /channels/me` não é interpretado como `GET /channels/:nickname` com `nickname = "me"`.
- `GET /videos/:id` pelo dono retorna `200` incluindo `description`, `categoryId`, `visibility`, `publishedAt`, `thumbnailKey` e `updatedAt`, mantendo os campos anteriores.
- `PATCH /channels/:id` como dono retorna `200` incluindo `updatedAt`.

---

### SI-04.13 — Pré-requisito: sincronizar openapi.json e regenerar types.gen.ts

**Description:** Trazer para o frontend o contrato dos endpoints de vídeo, canal e categorias (o `next-frontend/openapi.json` atual só tem `/auth/*`), pela cadeia `openapi.json` → `lib/api/types.gen.ts` (per `next-frontend-openapi-typing/TD-03`).

**Technical actions:**

1. Exportar o `openapi.json` do backend com os endpoints das SIs 04.11 e 04.12 já documentados e rodar, da raiz do repositório, `bash scripts/sync-openapi.sh` (host-only) para atualizar `next-frontend/openapi.json`
2. Rodar `docker compose exec next-frontend npm run openapi:types` para regenerar `next-frontend/lib/api/types.gen.ts`
3. Rodar `docker compose exec next-frontend npx tsc --noEmit` e corrigir os consumidores que quebrarem contra o novo contrato
4. Reconciliar as linhas `derived` de `### API Contracts` (BFF tier) com o `openapi.json` gerado e anotar divergências no plano
5. Commitar `next-frontend/openapi.json` e `next-frontend/lib/api/types.gen.ts` no mesmo PR (o guard `openapi-freshness.yml` falha se houver drift)

**Tests:** _(empty — Infra; gate de contrato via `tsc --noEmit` e `openapi-freshness.yml`)_

**Dependencies:** SI-04.11, SI-04.12

**Acceptance criteria:**

- `next-frontend/openapi.json` contém `/videos/{id}`, `/videos/{id}/thumbnail`, `/videos/{id}/publish`, `/channels/me`, `/channels/{id}`, `/channels/{nickname}`, `/channels/{id}/manage/videos`, `/channels/{nickname}/videos` e `/categories`.
- `next-frontend/lib/api/types.gen.ts` expõe esses caminhos em `paths` e `docker compose exec next-frontend npx tsc --noEmit` sai com código 0.
- Reexecutar `sync-openapi.sh` e `npm run openapi:types` não produz diff nos dois arquivos.

---

### SI-04.14 — Guarda de rotas autenticadas (Setup): proxy.ts + requireSession() + validação de next

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### phase-04-videos-channel-frontend/TD-01 — Guarda de Rotas Autenticadas (área de gerenciamento)`

**Technical actions:**

1. Criar `next-frontend/proxy.ts` (Next 16) byte-verbatim do Setup do TD-01: `matcher` `["/studio/:path*"]` e redirect otimista para `/login?next=…` sem sessão válida no cookie `streamtube_session`
2. Adicionar `channelId` a `SessionData` e exportar `requireSession()` em `next-frontend/lib/auth/session.ts`: em RSC redireciona para `/login?next=…`; em Route Handler devolve `401` com o envelope `{ statusCode, error: "UNAUTHORIZED", message }` já usado por `lib/auth/refresh.ts`
3. Criar `next-frontend/lib/auth/safe-next.ts` — valida o parâmetro `next` como same-origin (rejeita URLs absolutas e `//host`), reutilizado por SI-04.14 (login), SI-04.21 (refresh) e SI-04.30b (proxy)
4. Honrar `next` validado em `app/(auth)/login/` no redirect pós-login

**Dependencies:** —

**Tests:** _(empty — Setup SI; smoke-gated by AC; behavior tests live in Migration + Verification SIs)_

**Acceptance criteria:**

- `next-frontend/proxy.ts` existe e protege `/studio/:path*`: uma requisição sem cookie de sessão a `/studio/videos` recebe redirect para `/login?next=/studio/videos`.
- `requireSession()` em RSC redireciona sem sessão; em Route Handler retorna `401` com `error: "UNAUTHORIZED"`.
- `safe-next` rejeita `next=https://evil.com` e `next=//evil.com` e aceita `next=/studio/videos`.
- `SessionData` inclui `channelId` e nenhum token é exposto ao Client Provider.
- A aplicação compila (`docker compose exec next-frontend npx tsc --noEmit` sai com código 0).

---

### SI-04.15 — Estratégia de dados e paginação (Setup): RSC + searchParams

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### phase-04-videos-channel-frontend/TD-02 — Estratégia de Dados e Paginação das Listagens de Vídeo`

**Technical actions:**

1. Criar em `next-frontend/lib/` um helper de paginação que normaliza `searchParams.page` (ausente, não numérico ou < 1 → `1`) e calcula a janela de páginas a partir de `{ page, pageSize, total }`
2. Criar `next-frontend/components/common/pagination-links.tsx` compondo o primitive `components/ui/pagination.tsx` (SI-04.0.1) com `next/link` (`?page=N`), `nav` rotulado e `aria-current="page"`, para uso pelo painel e pela página pública (composite compartilhado fora de `components/ui/`, reservado aos primitives shadcn)
3. Definir a convenção de leitura por RSC (`await searchParams` → `upstream.GET(…)` no servidor) usada pelas telas, conforme o Setup do TD-02

**Dependencies:** SI-04.0.2

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| helper de paginação (`lib/pagination.ts`) | Unit per testing-guide-next-frontend — normalização de `page` e janela de páginas | `lib/__tests__/pagination.test.ts` |
| `pagination-links.tsx` | Unit per testing-guide-next-frontend § "Client Components" — `nav` rotulado, links, `aria-current` | `components/common/__tests__/pagination-links.test.tsx` |

**Acceptance criteria:**

- O helper normaliza `page` ausente, `"abc"` e `"0"` para `1` e preserva `"3"` como `3`.
- `PaginationLinks` renderiza um `nav` rotulado com links `?page=N` e marca a página atual com `aria-current="page"`.
- A aplicação compila (`docker compose exec next-frontend npx tsc --noEmit` sai com código 0).

---

### SI-04.16 — Cache da página pública (Setup): renderização dinâmica sem cache

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### phase-04-videos-channel-frontend/TD-03 — Cache e Revalidação da Página Pública do Canal`

**Technical actions:**

1. Garantir que `next-frontend/next.config.ts` permaneça sem `cacheComponents` e que nenhuma página desta slice use `'use cache'`, `cacheTag` ou `export const revalidate`, per Setup do TD-03
2. Adicionar teste de guarda em `next-frontend/lib/__tests__/no-cache-config.test.ts` que falha se `next.config.ts` habilitar `cacheComponents` (protege a decisão até a Fase 07)

**Dependencies:** —

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `next.config.ts` | Unit per testing-guide-next-frontend — guarda: `cacheComponents` ausente | `lib/__tests__/no-cache-config.test.ts` |

**Acceptance criteria:**

- `next.config.ts` não contém `cacheComponents`.
- O teste de guarda passa e falha se `cacheComponents: true` for adicionado a `next.config.ts`.

---

### SI-04.17 — app/api/auth/login/route.ts → Guarda de rotas autenticadas (dados do canal na sessão)

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### phase-04-videos-channel-frontend/TD-01 — Guarda de Rotas Autenticadas (área de gerenciamento)` → Migração row for `next-frontend/app/api/auth/login/route.ts`

**Technical actions:**

1. Ler `next-frontend/app/api/auth/login/route.ts` — hoje grava `userId` e `channelSlug` vazios em `setSession` após `POST /auth/login`
2. Após o login bem-sucedido, chamar `GET /channels/me` com o access token recém-emitido (per `### API Contracts` → BFF tier → `POST /api/auth/login — emenda`, `phase-04-frontend-contract-gaps/TD-01`) e gravar `userId`, `channelId` e `channelSlug` (= `nickname`) na sessão; falha em `/channels/me` não pode deixar sessão parcial
3. Atualizar `next-frontend/lib/auth/refresh.ts` para preservar `channelId` e `channelSlug` ao regravar a sessão após o refresh
4. Estender `next-frontend/mocks/handlers/auth.ts` (ou o handler de canais da SI-04.20) para responder `GET /channels/me` nos testes do login

**Dependencies:** SI-04.14, SI-04.12, SI-04.13

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `app/api/auth/login/route.ts` | Integration per testing-guide-next-frontend — sessão passa a conter `channelId`/`channelSlug`; falha em `/channels/me`; pre-existing login tests must still pass | `app/api/auth/login/__tests__/route.integration.test.ts` |
| `lib/auth/refresh.ts` | Integration per testing-guide-next-frontend — refresh preserva `channelId` e `channelSlug` | `lib/auth/__tests__/refresh.integration.test.ts` |

**Acceptance criteria:**

- `POST /api/auth/login` com credenciais válidas grava na sessão `userId`, `channelId` e `channelSlug` do canal do usuário (nenhum vazio).
- O corpo `200` de `POST /api/auth/login` continua sem `access_token` nem `refresh_token`.
- Se `GET /channels/me` falha, a resposta é de erro e nenhuma sessão é gravada.
- Após um refresh de token, `channelId` e `channelSlug` permanecem na sessão.
- Os testes de login da Fase 02 continuam passando.

---

### SI-04.18 — Guarda de rotas autenticadas (Verification)

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### phase-04-videos-channel-frontend/TD-01 — Guarda de Rotas Autenticadas (área de gerenciamento)` → Verificação

**Technical actions:**

1. Adicionar os testes unitários de `requireSession()` (redirect em RSC, `401 UNAUTHORIZED` em Route Handler) e da validação same-origin do parâmetro `next` (rejeita `https://evil.com` e `//evil.com`), e o teste do `proxy.ts` (matcher `/studio/:path*` e redirect otimista)
2. Adicionar o teste que varre `app/api/videos/**/route.ts` e `app/api/channels/**/route.ts` e exige `requireSession()` em todo handler de mutação (exceção documentada: `GET /api/videos/[id]/thumbnail`, com sessão opcional; `GET /api/auth/refresh`, que não exige sessão de entrada)
3. Garantir que os testes das telas de auth da Fase 02 continuam no runner (regression guard)

**Dependencies:** SI-04.14, SI-04.17

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `requireSession()` | Integration per testing-guide-next-frontend — RSC redireciona, Route Handler responde `401` | `lib/auth/__tests__/require-session.test.ts` |
| validação de `next` | Unit per testing-guide-next-frontend — URLs externas rejeitadas | `lib/auth/__tests__/safe-next.test.ts` |
| `proxy.ts` | Unit per testing-guide-next-frontend — matcher e redirect otimista | `__tests__/proxy.test.ts` |
| Route Handlers da área autenticada | Regression guard per testing-guide-next-frontend — todo handler de mutação chama `requireSession()` | `app/api/__tests__/route-handlers-guard.test.ts` |

**Acceptance criteria:**

- `requireSession()` sem sessão redireciona (RSC) e retorna `401` com `error: "UNAUTHORIZED"` (Route Handler).
- `next=https://evil.com` e `next=//evil.com` são rejeitados pela validação same-origin.
- Todo Route Handler de mutação de `app/api/videos/**` e `app/api/channels/**` chama `requireSession()`; adicionar um handler sem a chamada faz o teste de varredura falhar.
- Os testes de auth da Fase 02 continuam passando.

---

### SI-04.19 — BFF: aliases de contrato, upstream autenticado e next/image

**Description:** Preparar a base BFF consumida pelas telas: aliases em `lib/api/contracts.ts`, chamada ao upstream com o access token da sessão, redirect para renovação quando um RSC recebe `401`, e configuração de `next/image` para o `src` de thumbnail (per `phase-04-videos-channel-frontend/TD-05`, `phase-04-frontend-contract-gaps/TD-03`).

**Technical actions:**

1. Adicionar em `next-frontend/lib/api/contracts.ts` aliases pass-through derivados de `paths` (única fonte autorizada a importar `paths`) para `Video`, `UpdateVideoDto`, `UpdateVideoResponse`, `UploadThumbnailResponse`, `PublishVideoResponse`, `Channel`, `UpdateChannelDto`, `ChannelVideoList`, `ManageVideoList`, `Category` e o envelope de erro reutilizado (`ApiErrorEnvelope`)
2. Criar `next-frontend/lib/api/authed-upstream.ts` (server-only) que executa chamadas ao `upstream` com o `Authorization: Bearer` do access token da sessão e reaproveita `withRefresh` (single-flight, per `phase-02-auth-frontend/TD-03`) em Route Handlers
3. Em contexto de RSC (não Route Handler), quando `authed-upstream` recebe `401` do upstream, chamar `redirect('/api/auth/refresh?next=' + encodeURIComponent(currentPath))` em vez de tentar `withRefresh()` diretamente — `cookies()` não pode ser gravado durante a renderização de um Server Component (per `phase-04-frontend-contract-gaps/TD-03`)
4. Configurar em `next-frontend/next.config.ts` `images.localPatterns` para `/api/videos/*/thumbnail` (com query) e validar como o otimizador trata o `302` para o host do `STORAGE_PUBLIC_ENDPOINT` (`remotePatterns` do host, ou `unoptimized` no `VideoThumbnail` para thumbnails de vídeos ainda privados, per `phase-04-videos-channel-frontend/TD-05`); registrar a conclusão no plano
5. Adicionar teste de integração do helper cobrindo `Authorization` anexado, refresh single-flight em Route Handler, e o redirect para `/api/auth/refresh` em contexto de RSC

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `lib/api/authed-upstream.ts` | Integration per testing-guide-next-frontend (MSW) — Bearer anexado, `401` em Route Handler → refresh → nova tentativa, `401` em RSC → redirect para `/api/auth/refresh` | `lib/api/__tests__/authed-upstream.integration.test.ts` |

**Dependencies:** SI-04.13, SI-04.14

**Acceptance criteria:**

- `lib/api/contracts.ts` exporta os aliases listados e nenhum outro arquivo (fora de `mocks/`) importa `paths` de `types.gen.ts`.
- Uma chamada via `authed-upstream` em Route Handler envia `Authorization: Bearer <accessToken da sessão>`; um `401` dispara exatamente um refresh mesmo com chamadas concorrentes.
- Uma chamada via `authed-upstream` em RSC, ao receber `401`, chama `redirect('/api/auth/refresh?next=...')` em vez de tentar renovar o token diretamente.
- `next.config.ts` aceita `src="/api/videos/abc/thumbnail?v=…"` no `next/image` sem erro de configuração.

---

### SI-04.20 — MSW: handlers de vídeos, canais e categorias

**Description:** Contribuir os handlers MSW por domínio e factories usados por testes e pelo `instrumentation.ts` (per `next-frontend-msw-foundation/TD-01..TD-04`).

**Technical actions:**

1. Criar `next-frontend/mocks/handlers/videos.ts` — handlers tipados (via `paths`, exceção documentada de `mocks/`) para `GET /videos/{id}`, `PATCH /videos/{id}`, `POST /videos/{id}/thumbnail`, `POST /videos/{id}/publish` e `GET /videos/{id}/thumbnail` (302), incluindo os erros do Error Catalog (`VIDEO_NOT_FOUND`, `VIDEO_NOT_OWNED`, `CATEGORY_NOT_FOUND`, `INVALID_FILE_TYPE`, `THUMBNAIL_SIZE_EXCEEDED`, `INVALID_VIDEO_STATE`)
2. Criar `next-frontend/mocks/handlers/channels.ts` — handlers para `GET /channels/me`, `GET /channels/{nickname}`, `GET /channels/{nickname}/videos`, `GET /channels/{id}/manage/videos` (paginados: `items`, `page`, `pageSize`, `total`), `PATCH /channels/{id}` (incluindo `NICKNAME_ALREADY_EXISTS`) e `GET /categories`
3. Criar factories em `next-frontend/mocks/factories/` (`video`, `channel`, `category`) e registrar os dois módulos no barrel `next-frontend/mocks/handlers/index.ts`, mantendo `onUnhandledRequest: "error"` no Vitest e `"bypass"` no `instrumentation.ts`

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `mocks/handlers/videos.ts` | Integration per testing-guide-next-frontend — cada handler responde o sucesso e os erros mapeados | `mocks/handlers/__tests__/videos.test.ts` |
| `mocks/handlers/channels.ts` | Integration per testing-guide-next-frontend — paginação e erros | `mocks/handlers/__tests__/channels.test.ts` |

**Dependencies:** SI-04.13

**Acceptance criteria:**

- `mocks/handlers/index.ts` exporta os handlers de `videos` e `channels` junto dos de `auth`.
- `GET /channels/{id}/manage/videos?page=2` no MSW retorna `{ items, page: 2, pageSize, total }` conforme a factory.
- `PATCH /channels/{id}` com nickname já em uso retorna `409` com `error: "NICKNAME_ALREADY_EXISTS"`.
- Uma requisição a caminho sem handler falha o teste (`onUnhandledRequest: "error"`).

---

### SI-04.21 — Renovação de token em Server Components (Setup): GET /api/auth/refresh

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### phase-04-frontend-contract-gaps/TD-03 — Renovação de token em Server Components`

**Technical actions:**

1. Criar `next-frontend/app/api/auth/refresh/route.ts` (`GET`) byte-verbatim do Setup do TD-03: lê `next` da query, valida same-origin via `safe-next` (SI-04.14), chama `withRefresh(...)` (helper single-flight de `lib/auth/refresh.ts`, per `phase-02-auth-frontend/TD-03`) e redireciona para `next` em caso de sucesso ou para `/login?next={next}` em caso de falha
2. Rejeitar com `400` quando `next` não é same-origin ou está ausente

**Dependencies:** SI-04.14

**Tests:** _(empty — Setup SI; smoke-gated by AC; behavior tests live in the Verification SI)_

**Acceptance criteria:**

- `GET /api/auth/refresh?next=/studio/videos` com refresh token válido renova a sessão e redireciona para `/studio/videos`.
- `GET /api/auth/refresh?next=/studio/videos` com refresh token inválido/expirado redireciona para `/login?next=/studio/videos`.
- `GET /api/auth/refresh?next=https://evil.com` retorna `400`.
- A aplicação compila (`docker compose exec next-frontend npx tsc --noEmit` sai com código 0).

---

### SI-04.22 — Renovação de token em Server Components (Verification)

**Frontend Runtime spec:** see `## Technical Specifications` → `### Frontend Runtime` → `#### phase-04-frontend-contract-gaps/TD-03 — Renovação de token em Server Components` → Verificação

**Technical actions:**

1. Adicionar os testes de integração de `GET /api/auth/refresh` (sucesso, falha, `next` inválido) listados na Verificação da spec
2. Adicionar o teste E2E-de-integração que confirma a cadeia completa: RSC recebe `401` (SI-04.19 ação 3) → redirect para `/api/auth/refresh` (SI-04.21) → volta ao destino original com a sessão renovada

**Dependencies:** SI-04.14, SI-04.19, SI-04.21

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `app/api/auth/refresh/route.ts` | Integration per testing-guide-next-frontend (MSW) — sucesso, refresh token inválido, `next` inválido | `app/api/auth/refresh/__tests__/route.integration.test.ts` |
| cadeia RSC 401 → refresh → retorno | Integration per testing-guide-next-frontend (MSW) — confirma que `authed-upstream` (SI-04.19) e o Route Handler (SI-04.21) compõem corretamente | `lib/api/__tests__/authed-upstream-refresh-chain.integration.test.ts` |

**Acceptance criteria:**

- Os testes de `GET /api/auth/refresh` listados na Verificação da spec passam.
- O teste de cadeia confirma que um `401` simulado do upstream em contexto de RSC resulta em renovação de sessão e retorno ao destino original, sem exigir novo login quando o refresh token é válido.
- O helper de refresh single-flight da Fase 02 (`lib/auth/refresh.ts`) e seus testes continuam inalterados.

---

### SI-04.30.0 — Drift audit: Menu lateral (Left Menu)

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Menu lateral (Left Menu)`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959
   - Reused DS components: [`components/ui/icon-button.tsx`, `components/auth/brand-logo.tsx`, `components/icons/streamtube-icon.tsx`, `components/layout/app-shell.tsx (new)`, `components/layout/top-nav.tsx (new)`, `components/layout/side-nav.tsx (new)`, `components/layout/side-nav-item.tsx (new)`, `components/layout/side-nav-subscription-list.tsx (new)`, `components/layout/subscription-nav-item.tsx (new)`, `components/icons/home-icon.tsx (new)`, `components/icons/subscriptions-icon.tsx (new)`, `components/icons/your-videos-icon.tsx (new)`, `components/icons/liked-videos-icon.tsx (new)`]
   - Server-connected component names (no endpoints/auth/errors): []
   - Target paths (read-only context for audit; no writes here): `app/(studio)/layout.tsx` + `components/layout/side-nav.tsx`

   For each component in the Reused DS list, perform value-level diff against the file on disk and classify per the 4-value status enum (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`). Compose Decision per default policy (see `.claude/skills/plan-build/references/frontend-drift-report-schema.md` § Default decisions per status). Note the known gap: `IconButton` needs a ghost variant (glifo solto, sem fundo) for the hamburger and the close icon. Read prior sections of `frontend-drift-report.md` to build `prior_decisions`; populate `Prior` column with CONFLICT detection (executed by `/implement` per its SKILL.md cross-screen consultation algorithm). Write a `## Screen: menu-lateral — audited at SI-04.30.0 ({YYYY-MM-DD})` section to `frontend-drift-report.md` (append on first run, overwrite-in-place on re-run). **No code edits — verifiable via `git diff` at SI end.**

**Dependencies:** SI-04.0.9, SI-04.0.10, SI-04.0.11, SI-04.0.12, SI-04.0.15, SI-04.0.16, SI-04.0.17

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` exists in the plan folder; section `## Screen: menu-lateral` exists with the current run's date in heading (appended on first run, overwritten in place on re-run per schema § Section ownership and update discipline).
- Every component in the Reused DS list has exactly one row in the table.
- Every row has a Decision column populated:
  - `alinhado` → `skip`
  - `drift menor` → `auto-Edit "<specifics>"` or `exception "<reason>"`
  - `drift relevante` → `auto-Edit "<specifics>"`, `exception "<reason>"`, or `CONFLICT: <one-liner>; <verb> "<specifics>"` (CONFLICT only when `prior_decisions` diverges; on CONFLICT rows `<verb>` is `auto-Edit` (default) or `exception` (override) — `create` and `skip` are categorically incompatible with `drift relevante`)
  - `componente ausente` → `create`
- Every `exception` decision carries a one-liner justification.
- `git diff --name-only HEAD -- next-frontend` after the SI is empty (no code touched in target subproject; the report file lives outside `next-frontend` and is excluded from the scoped check by construction).

---

### SI-04.30a — Tela de Menu lateral (Left Menu) (visual shell)

**Route:** (studio)/*
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Menu lateral (Left Menu)`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: menu-lateral`

**Technical actions:**

1. **Apply drift decisions** — read the Drift Report section for this screen. For each row, parse the Decision column and apply per the verb body:
   - `auto-Edit "<specifics>"` → apply `Edit` on the named DS file with the documented specifics
   - `create` → create the file (icons via Figma asset; components per spec)
   - `exception` / `skip` → no-op
   - `CONFLICT: <one-liner>; <verb> "<specifics>"` → strip the `CONFLICT: <one-liner>;` prefix (informational only) and apply the verb body per the rules above (`<verb>` is `auto-Edit` or `exception` on CONFLICT rows; `create`/`skip` cannot appear here per schema § Decision)

   No drift detection or auto-judgment in this step. The audit-SI did the analysis; this step is mechanical application.

2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959
   - Reused DS components: [`components/layout/app-shell.tsx`, `components/layout/top-nav.tsx`, `components/layout/side-nav.tsx`, `components/layout/side-nav-item.tsx`, `components/layout/side-nav-subscription-list.tsx`, `components/layout/subscription-nav-item.tsx`, `components/ui/icon-button.tsx`, ícones da casca] _(now reflecting any DS edits from action 1)_
   - Server-connected component names (no endpoints/auth/errors): []
   - Target paths: `app/(studio)/layout.tsx` + `components/layout/side-nav.tsx`

**Dependencies:** SI-04.30.0 + SI-04.0.9, SI-04.0.10, SI-04.0.11, SI-04.0.12, SI-04.0.15, SI-04.0.16, SI-04.0.17

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-Xb; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- All target paths exist, export expected components, and compile per `next-frontend` build command (`docker compose exec next-frontend npx tsc --noEmit`).
- Rendering matches Figma node fidelity within tolerance of DS component set (SideNav expandida de 256px, TopNav de 62px).
- No runtime imports beyond Reused DS list (stays visually scoped).

---

### SI-04.30b — Tela de Menu lateral (Left Menu) (lógica & wiring)

**Test Specs:** see `next-frontend/specs/studio-left-menu.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Menu lateral (Left Menu)`

**Technical actions:**

1. **Route guard application** — per UI Contract `**Auth requirement:**` (Authenticated): criar `next-frontend/app/(studio)/layout.tsx` (Server Component) que chama `requireSession()` (per `phase-04-videos-channel-frontend/TD-01`) e envolve os `children` das rotas `(studio)/*` em `AppShell`
2. **Rendering strategy application** — per UI Contract `**Rendering strategy:**` (Client Component para estado de mostrar/ocultar e item ativo por rota; `_No rendering architecture TD — implementer decides per screen (drift risk)._`): manter `"use client"` restrito ao `AppShell`/`SideNav`; o layout permanece Server Component
3. **Endpoint wiring** — _not applicable: no server-connected components in this screen_
4. **Error mapping** — _not applicable: sem endpoints_
5. **Client-side validation mirror** — _not applicable_

**Dependencies:**

- `SI-04.30a` (visual shell must exist before wiring).
- `SI-04.14` (`requireSession()`).

**Tests:** _(empty — layout is a Server Component; behavior covered by E2E spec via /plan-test-specs)_

**Acceptance criteria:**

- Uma requisição a `/studio/videos` sem sessão é redirecionada para `/login?next=/studio/videos` (layout + `proxy.ts`).
- Com sessão, as rotas `(studio)/*` renderizam TopNav, SideNav e o conteúdo da rota.
- Em `/studio/videos` e `/studio/videos/[id]/edit`, o item "Your videos" expõe `aria-current="page"`.
- O hambúrguer oculta e mostra a SideNav e reflete o estado em `aria-expanded`.

---

### SI-04.31.0 — Drift audit: Menu de conta do usuário (Account User Menu)

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-1267
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Menu de conta do usuário (Account User Menu)`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-1267
   - Reused DS components: [`components/layout/account-menu-trigger.tsx (new)`, `components/ui/avatar.tsx (new)`, `components/ui/overlay.tsx (new)`, `components/layout/account-menu.tsx (new)`, `components/ui/icon-button.tsx`, `components/icons/close-icon.tsx (new)`, `components/ui/menu-item.tsx (new)`, `components/icons/edit-icon.tsx (new)`]
   - Server-connected component names (no endpoints/auth/errors): []
   - Target paths (read-only context for audit; no writes here): `components/layout/account-menu.tsx` + `components/layout/account-menu-trigger.tsx`

   For each component in the Reused DS list, perform value-level diff against the file on disk and classify per the 4-value status enum (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`). Compose Decision per default policy (see `.claude/skills/plan-build/references/frontend-drift-report-schema.md` § Default decisions per status). Note: o Figma desenha um drawer de 320px (não um dropdown) e o `IconButton` de fechar exige a variante ghost. Read prior sections of `frontend-drift-report.md` to build `prior_decisions`; populate `Prior` column with CONFLICT detection (executed by `/implement` per its SKILL.md cross-screen consultation algorithm). Write a `## Screen: menu-de-conta — audited at SI-04.31.0 ({YYYY-MM-DD})` section to `frontend-drift-report.md` (append on first run, overwrite-in-place on re-run). **No code edits — verifiable via `git diff` at SI end.**

**Dependencies:** SI-04.0.1, SI-04.0.4, SI-04.0.5, SI-04.0.9, SI-04.0.12, SI-04.0.15

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` exists in the plan folder; section `## Screen: menu-de-conta` exists with the current run's date in heading (appended on first run, overwritten in place on re-run per schema § Section ownership and update discipline).
- Every component in the Reused DS list has exactly one row in the table.
- Every row has a Decision column populated:
  - `alinhado` → `skip`
  - `drift menor` → `auto-Edit "<specifics>"` or `exception "<reason>"`
  - `drift relevante` → `auto-Edit "<specifics>"`, `exception "<reason>"`, or `CONFLICT: <one-liner>; <verb> "<specifics>"` (CONFLICT only when `prior_decisions` diverges; on CONFLICT rows `<verb>` is `auto-Edit` (default) or `exception` (override) — `create` and `skip` are categorically incompatible with `drift relevante`)
  - `componente ausente` → `create`
- Every `exception` decision carries a one-liner justification.
- `git diff --name-only HEAD -- next-frontend` after the SI is empty (no code touched in target subproject; the report file lives outside `next-frontend` and is excluded from the scoped check by construction).

---

### SI-04.31a — Tela de Menu de conta do usuário (Account User Menu) (visual shell)

**Route:** (studio)/*
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-1267
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Menu de conta do usuário (Account User Menu)`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: menu-de-conta`

**Technical actions:**

1. **Apply drift decisions** — read the Drift Report section for this screen. For each row, parse the Decision column and apply per the verb body:
   - `auto-Edit "<specifics>"` → apply `Edit` on the named DS file with the documented specifics
   - `create` → create the file (icons via Figma asset; components per spec)
   - `exception` / `skip` → no-op
   - `CONFLICT: <one-liner>; <verb> "<specifics>"` → strip the `CONFLICT: <one-liner>;` prefix (informational only) and apply the verb body per the rules above (`<verb>` is `auto-Edit` or `exception` on CONFLICT rows; `create`/`skip` cannot appear here per schema § Decision)

   No drift detection or auto-judgment in this step. The audit-SI did the analysis; this step is mechanical application.

2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-1267
   - Reused DS components: [`components/layout/account-menu.tsx`, `components/layout/account-menu-trigger.tsx`, `components/ui/avatar.tsx`, `components/ui/overlay.tsx`, `components/ui/menu-item.tsx`, `components/ui/icon-button.tsx`, `components/icons/close-icon.tsx`, `components/icons/edit-icon.tsx`] _(now reflecting any DS edits from action 1)_
   - Server-connected component names (no endpoints/auth/errors): []
   - Target paths: `components/layout/account-menu.tsx` + `components/layout/account-menu-trigger.tsx`

**Dependencies:** SI-04.31.0 + SI-04.0.1, SI-04.0.4, SI-04.0.5, SI-04.0.9, SI-04.0.12, SI-04.0.15

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-Xb; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- All target paths exist, export expected components, and compile per `next-frontend` build command (`docker compose exec next-frontend npx tsc --noEmit`).
- Rendering matches Figma node fidelity within tolerance of DS component set (drawer de 320px, altura total, Overlay com o token `--overlay`).
- No runtime imports beyond Reused DS list (stays visually scoped).

---

### SI-04.31b — Tela de Menu de conta do usuário (Account User Menu) (lógica & wiring)

**Test Specs:** see `next-frontend/specs/account-user-menu.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Menu de conta do usuário (Account User Menu)`

**Technical actions:**

1. **Route guard application** — per UI Contract `**Auth requirement:**` (Authenticated): herdado do layout `(studio)` (SI-04.30b); sem guarda própria
2. **Rendering strategy application** — per UI Contract `**Rendering strategy:**` (Client Component; identidade da sessão via `SessionProvider`, per `phase-02-auth-frontend/TD-06`): ligar `AccountMenuTrigger`/`AccountMenu` no `AppShell` lendo `useSession()` (`channelSlug`, `email`); nenhum fetch
3. **Endpoint wiring** — _not applicable: no server-connected components in this screen_
4. **Error mapping** — _not applicable: sem endpoints_
5. **Client-side validation mirror** — _not applicable_

**Dependencies:**

- `SI-04.31a` (visual shell must exist before wiring).
- `SI-04.30b` (layout `(studio)` com `AppShell`).
- `SI-04.17` (a sessão passa a conter `channelSlug`, per `phase-04-frontend-contract-gaps/TD-01`).

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `components/layout/account-menu.tsx` (ligado ao `SessionProvider`) | Unit per testing-guide-next-frontend § "Client Components" — identidade da sessão, abrir/fechar pelo avatar, navegação de "Edit Channel" | `components/layout/__tests__/account-menu.wiring.test.tsx` |

E2E for the page (abrir o menu, navegar para `/studio/channel`) is authored externally by `/plan-test-specs` in the spec file referenced by `**Test Specs:**` above.

**Acceptance criteria:**

- Com a sessão de um usuário com `channelSlug: "techmaster"`, clicar no avatar abre o painel com `@techmaster` e o e-mail da sessão.
- Clicar em "Edit Channel" navega para `/studio/channel`.
- Fechar o painel devolve o foco ao avatar.
- Não há chamada de rede ao abrir o menu.

---

### SI-04.32.0 — Drift audit: Painel de gerenciamento de vídeos

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=152-1824
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Painel de gerenciamento de vídeos`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=152-1824
   - Reused DS components: [`components/ui/button.tsx`, `components/ui/icon-button.tsx`, `components/ui/search-field.tsx (new)`, `components/ui/avatar.tsx (new)`, `components/ui/video-thumbnail.tsx (new)`, `components/ui/badge.tsx (new)`, `components/ui/pagination.tsx (new)`, `components/studio/video-list-row.tsx (new)`, `components/studio/video-stats.tsx (new)`, `components/studio/video-sort-control.tsx (new)`, `components/icons/filter-icon.tsx (new)`, `components/icons/sort-icon.tsx (new)`, `components/icons/views-icon.tsx (new)`, `components/icons/thumbs-up-icon.tsx (new)`, `components/icons/comment-icon.tsx (new)`]
   - Server-connected component names (no endpoints/auth/errors): [`VideoListRow`]
   - Target paths (read-only context for audit; no writes here): `app/(studio)/studio/videos/page.tsx` + `components/studio/video-list-row.tsx`

   For each component in the Reused DS list, perform value-level diff against the file on disk and classify per the 4-value status enum (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`). Compose Decision per default policy (see `.claude/skills/plan-build/references/frontend-drift-report-schema.md` § Default decisions per status). Read prior sections of `frontend-drift-report.md` to build `prior_decisions`; populate `Prior` column with CONFLICT detection (executed by `/implement` per its SKILL.md cross-screen consultation algorithm). Write a `## Screen: painel-de-videos — audited at SI-04.32.0 ({YYYY-MM-DD})` section to `frontend-drift-report.md` (append on first run, overwrite-in-place on re-run). **No code edits — verifiable via `git diff` at SI end.**

**Dependencies:** SI-04.0.1, SI-04.0.6, SI-04.0.8, SI-04.0.9, SI-04.0.10, SI-04.0.11, SI-04.0.13

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` exists in the plan folder; section `## Screen: painel-de-videos` exists with the current run's date in heading (appended on first run, overwritten in place on re-run per schema § Section ownership and update discipline).
- Every component in the Reused DS list has exactly one row in the table.
- Every row has a Decision column populated:
  - `alinhado` → `skip`
  - `drift menor` → `auto-Edit "<specifics>"` or `exception "<reason>"`
  - `drift relevante` → `auto-Edit "<specifics>"`, `exception "<reason>"`, or `CONFLICT: <one-liner>; <verb> "<specifics>"` (CONFLICT only when `prior_decisions` diverges; on CONFLICT rows `<verb>` is `auto-Edit` (default) or `exception` (override) — `create` and `skip` are categorically incompatible with `drift relevante`)
  - `componente ausente` → `create`
- Every `exception` decision carries a one-liner justification.
- `git diff --name-only HEAD -- next-frontend` after the SI is empty (no code touched in target subproject; the report file lives outside `next-frontend` and is excluded from the scoped check by construction).

---

### SI-04.32a — Tela de Painel de gerenciamento de vídeos (visual shell)

**Route:** /studio/videos
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=152-1824
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Painel de gerenciamento de vídeos`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: painel-de-videos`

**Technical actions:**

1. **Apply drift decisions** — read the Drift Report section for this screen. For each row, parse the Decision column and apply per the verb body:
   - `auto-Edit "<specifics>"` → apply `Edit` on the named DS file with the documented specifics
   - `create` → create the file (icons via Figma asset; components per spec)
   - `exception` / `skip` → no-op
   - `CONFLICT: <one-liner>; <verb> "<specifics>"` → strip the `CONFLICT: <one-liner>;` prefix (informational only) and apply the verb body per the rules above (`<verb>` is `auto-Edit` or `exception` on CONFLICT rows; `create`/`skip` cannot appear here per schema § Decision)

   No drift detection or auto-judgment in this step. The audit-SI did the analysis; this step is mechanical application.

2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=152-1824
   - Reused DS components: [`components/ui/button.tsx`, `components/ui/search-field.tsx`, `components/ui/video-thumbnail.tsx`, `components/ui/badge.tsx`, `components/ui/pagination.tsx`, `components/studio/video-list-row.tsx`, `components/studio/video-stats.tsx`, `components/studio/video-sort-control.tsx`, ícones do painel] _(now reflecting any DS edits from action 1)_
   - Server-connected component names (no endpoints/auth/errors): [`VideoListRow`]
   - Target paths: `app/(studio)/studio/videos/page.tsx` + `components/studio/video-list-row.tsx`

**Dependencies:** SI-04.32.0 + SI-04.0.1, SI-04.0.6, SI-04.0.8, SI-04.0.9, SI-04.0.10, SI-04.0.11, SI-04.0.13

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-Xb; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- All target paths exist, export expected components, and compile per `next-frontend` build command (`docker compose exec next-frontend npx tsc --noEmit`).
- Rendering matches Figma node fidelity within tolerance of DS component set (heading "Channel content", botão "Upload video", filtros e busca desabilitados, contagem "N videos" e linhas de vídeo).
- No runtime imports beyond Reused DS list (stays visually scoped).

---

### SI-04.32b — Tela de Painel de gerenciamento de vídeos (lógica & wiring)

**Test Specs:** see `next-frontend/specs/studio-videos-panel.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Painel de gerenciamento de vídeos`

**Technical actions:**

1. **Route guard application** — per UI Contract `**Auth requirement:**` (Authenticated+Owner): a página chama `requireSession()` e usa o `channelId` da sessão (per `phase-04-frontend-contract-gaps/TD-01`; o dono só consegue listar o próprio canal, `CHANNEL_NOT_OWNED` não é esperado) (per `phase-04-videos-channel-frontend/TD-01`)
2. **Rendering strategy application** — per UI Contract `**Rendering strategy:**` (RSC async, dinâmica sem cache): criar `next-frontend/app/(studio)/studio/videos/page.tsx` lendo `searchParams.page` (helper da SI-04.15), sem `"use client"`, sem `'use cache'` (per `phase-04-videos-channel-frontend/TD-02`, `TD-03`), com `loading.tsx` e `error.tsx`
3. **Endpoint wiring** — per UI Contract `**Server-connected components:**`: no RSC, chamar `GET /channels/{id}/manage/videos` (`page`, `pageSize`) via `authed-upstream` (SI-04.19 — um `401` redireciona para `/api/auth/refresh` per TD-03) e mapear `items` para `VideoListRow` (com `updatedAt` como `?v=` da thumbnail), `total` para "N videos" e `PaginationLinks` (`?page=N`); criar `next-frontend/app/api/videos/[id]/thumbnail/route.ts` (`GET`) que repassa o `302` de `GET /videos/{id}/thumbnail`, com sessão opcional (per `### API Contracts` → BFF tier → `GET /api/videos/[id]/thumbnail`)
4. **Error mapping** — per UI Contract `**Error Catalog → UX mapping:**`: `UNAUTHORIZED` → redirect para `/api/auth/refresh` quando o 401 vier do RSC, senão `/login?next=`; `CHANNEL_NOT_OWNED` / `CHANNEL_NOT_FOUND` → `error.tsx` (implementador define o texto, per _TBD_ do UI Contract)
5. **Client-side validation mirror** — _not applicable: tela somente leitura_ (normalização de `page` já coberta pelo helper da SI-04.15)

**Dependencies:**

- `SI-04.32a` (visual shell must exist before wiring).
- `SI-04.30b` (layout `(studio)`).
- `SI-04.11` (`GET /videos/:id/thumbnail` e `updatedAt`).
- `SI-04.15`, `SI-04.16` (dados por RSC e sem cache).
- `SI-04.19`, `SI-04.21` (`authed-upstream` + redirect de refresh, aliases, `next/image`).
- `SI-04.20` (handlers MSW).

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `app/api/videos/[id]/thumbnail/route.ts` | Integration per testing-guide-next-frontend (MSW) — repassa `302` com sessão e sem sessão, `404` do upstream | `app/api/videos/[id]/thumbnail/__tests__/route.integration.test.ts` |

E2E for the page (guarda de rota, listagem paginada, navegação para a edição) is authored externally by `/plan-test-specs` in the spec file referenced by `**Test Specs:**` above and consumed JIT by `/implement` Step 3. Page-level Unit testing is excluded by `testing-guide-next-frontend` artifact rule "Pages → E2E only".

**Acceptance criteria:**

- `GET /studio/videos` com sessão exibe as linhas retornadas por `GET /channels/{id}/manage/videos` e a contagem `total`.
- `GET /studio/videos?page=2` solicita `page=2` ao upstream e marca a página 2 com `aria-current="page"`.
- Clicar em uma linha navega para `/studio/videos/{id}/edit`.
- `GET /api/videos/{id}/thumbnail` responde `302` repassando o `Location` do upstream; um `404 VIDEO_NOT_FOUND` do upstream é repassado como `404`.
- `GET /studio/videos` sem sessão redireciona para `/login?next=/studio/videos`.

---

### SI-04.33.0 — Drift audit: Tela de edição de vídeo

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=156-2790
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Tela de edição de vídeo`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=156-2790
   - Reused DS components: [`components/studio/video-edit-form.tsx (new)`, `components/ui/card.tsx`, `components/ui/label.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx (new)`, `components/studio/video-config-card.tsx (new)`, `components/studio/thumb-upload.tsx (new)`, `components/ui/button.tsx`, `components/ui/section-header.tsx (new)`, `components/ui/select.tsx (new)`, `components/studio/privacy-option.tsx (new)`]
   - Server-connected component names (no endpoints/auth/errors): [`VideoEditForm`, `Category select`, `Save Changes Button`, `Status`, `PublishButton`]
   - Target paths (read-only context for audit; no writes here): `app/(studio)/studio/videos/[id]/edit/page.tsx` + `components/studio/video-edit-form.tsx`

   For each component in the Reused DS list, perform value-level diff against the file on disk and classify per the 4-value status enum (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`). Compose Decision per default policy (see `.claude/skills/plan-build/references/frontend-drift-report-schema.md` § Default decisions per status). Note: o `PublishButton` não tem arte no Figma (D11) e o H1 "Channel Settings" do frame é copy incorreta. Read prior sections of `frontend-drift-report.md` to build `prior_decisions`; populate `Prior` column with CONFLICT detection (executed by `/implement` per its SKILL.md cross-screen consultation algorithm). Write a `## Screen: edicao-de-video — audited at SI-04.33.0 ({YYYY-MM-DD})` section to `frontend-drift-report.md` (append on first run, overwrite-in-place on re-run). **No code edits — verifiable via `git diff` at SI end.**

**Dependencies:** SI-04.0.1, SI-04.0.7, SI-04.0.19, SI-04.0.20, SI-04.0.21, SI-04.0.22

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` exists in the plan folder; section `## Screen: edicao-de-video` exists with the current run's date in heading (appended on first run, overwritten in place on re-run per schema § Section ownership and update discipline).
- Every component in the Reused DS list has exactly one row in the table.
- Every row has a Decision column populated:
  - `alinhado` → `skip`
  - `drift menor` → `auto-Edit "<specifics>"` or `exception "<reason>"`
  - `drift relevante` → `auto-Edit "<specifics>"`, `exception "<reason>"`, or `CONFLICT: <one-liner>; <verb> "<specifics>"` (CONFLICT only when `prior_decisions` diverges; on CONFLICT rows `<verb>` is `auto-Edit` (default) or `exception` (override) — `create` and `skip` are categorically incompatible with `drift relevante`)
  - `componente ausente` → `create`
- Every `exception` decision carries a one-liner justification.
- `git diff --name-only HEAD -- next-frontend` after the SI is empty (no code touched in target subproject; the report file lives outside `next-frontend` and is excluded from the scoped check by construction).

---

### SI-04.33a — Tela de edição de vídeo (visual shell)

**Route:** /studio/videos/[id]/edit
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=156-2790
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Tela de edição de vídeo`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: edicao-de-video`

**Technical actions:**

1. **Apply drift decisions** — read the Drift Report section for this screen. For each row, parse the Decision column and apply per the verb body:
   - `auto-Edit "<specifics>"` → apply `Edit` on the named DS file with the documented specifics
   - `create` → create the file (icons via Figma asset; components per spec)
   - `exception` / `skip` → no-op
   - `CONFLICT: <one-liner>; <verb> "<specifics>"` → strip the `CONFLICT: <one-liner>;` prefix (informational only) and apply the verb body per the rules above (`<verb>` is `auto-Edit` or `exception` on CONFLICT rows; `create`/`skip` cannot appear here per schema § Decision)

   No drift detection or auto-judgment in this step. The audit-SI did the analysis; this step is mechanical application.

2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=156-2790
   - Reused DS components: [`components/studio/video-edit-form.tsx`, `components/ui/card.tsx`, `components/ui/label.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/studio/video-config-card.tsx`, `components/studio/thumb-upload.tsx`, `components/ui/button.tsx`, `components/ui/section-header.tsx`, `components/ui/select.tsx`, `components/studio/privacy-option.tsx`] _(now reflecting any DS edits from action 1)_
   - Server-connected component names (no endpoints/auth/errors): [`VideoEditForm`, `Category select`, `Save Changes Button`, `Status`, `PublishButton`]
   - Target paths: `app/(studio)/studio/videos/[id]/edit/page.tsx` + `components/studio/video-edit-form.tsx`

**Dependencies:** SI-04.33.0 + SI-04.0.1, SI-04.0.7, SI-04.0.19, SI-04.0.20, SI-04.0.21, SI-04.0.22

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-Xb; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- All target paths exist, export expected components, and compile per `next-frontend` build command (`docker compose exec next-frontend npx tsc --noEmit`).
- Rendering matches Figma node fidelity within tolerance of DS component set (card de edição com título, descrição, thumbnail, categoria, visibilidade e rodapé com Cancel, Save Changes e Publicar).
- O H1 exibe um título de edição de vídeo (não "Channel Settings") e o exemplo de descrição é de vídeo.
- No runtime imports beyond Reused DS list (stays visually scoped).

---

### SI-04.33b — Tela de edição de vídeo (lógica & wiring)

**Test Specs:** see `next-frontend/specs/studio-video-edit.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Tela de edição de vídeo`

**Technical actions:**

1. **Route guard application** — per UI Contract `**Auth requirement:**` (Authenticated+Owner): `requireSession()` na página e em cada Route Handler; posse verificada pelo backend (`VIDEO_NOT_OWNED` → 403) (per `phase-04-videos-channel-frontend/TD-01`)
2. **Rendering strategy application** — per UI Contract `**Rendering strategy:**` (RSC carrega dados; formulário Client Component): criar `next-frontend/app/(studio)/studio/videos/[id]/edit/page.tsx` que carrega `GET /videos/{id}` e `GET /categories` via `authed-upstream` (não-encontrado → `notFound()`; um `401` redireciona para `/api/auth/refresh` per `phase-04-frontend-contract-gaps/TD-03`) e renderiza `VideoEditForm` com `video` e `categories`; `"use client"` só no formulário
3. **Endpoint wiring** — per UI Contract `**Server-connected components:**`: criar os Route Handlers `next-frontend/app/api/videos/[id]/route.ts` (`PATCH` → `PATCH /videos/{id}`), `next-frontend/app/api/videos/[id]/thumbnail/route.ts` (`POST` multipart → `POST /videos/{id}/thumbnail`, junto do `GET` da SI-04.32b) e `next-frontend/app/api/videos/[id]/publish/route.ts` (`POST` → `POST /videos/{id}/publish`), cada um com `requireSession()` + refresh single-flight e passando o erro do upstream (per `### API Contracts` → BFF tier); ligar `onSave` (PATCH e, se houver arquivo, POST thumbnail) e `onPublish` do `VideoEditForm`, seguidos de `router.refresh()`
4. **Error mapping** — per UI Contract `**Error Catalog → UX mapping:**`: `VIDEO_NOT_FOUND` → not-found; `CATEGORY_NOT_FOUND` → erro inline no Category select; `INVALID_FILE_TYPE` / `THUMBNAIL_SIZE_EXCEEDED` → erro inline na ThumbUpload; `INVALID_VIDEO_STATE` → mensagem de formulário + `router.refresh()`; `UNAUTHORIZED` → redirect `/login?next=`; `VIDEO_NOT_OWNED` → _TBD_ (implementador define)
5. **Client-side validation mirror** — per UI Contract `**Client-side validation mirror:**`: schema Zod com `visibility` (`public` | `unlisted`), `categoryId` uuid entre as opções, `thumbnail` `image/*` ≤5MB; limites de `title`/`description` a partir do `UpdateVideoDto` gerado (SI-04.13)

**Dependencies:**

- `SI-04.33a` (visual shell must exist before wiring).
- `SI-04.30b` (layout `(studio)`).
- `SI-04.12` (`GET /videos/:id` enriquecido, per `phase-04-frontend-contract-gaps/TD-02`) e `SI-04.11` (`updatedAt` em PATCH/thumbnail).
- `SI-04.15`, `SI-04.16` (dados por RSC e sem cache).
- `SI-04.19`, `SI-04.21` (`authed-upstream` + redirect de refresh, aliases), `SI-04.20` (handlers MSW).
- `SI-04.32b` (Route Handler `GET /api/videos/[id]/thumbnail`, mesmo arquivo do `POST` de thumbnail).

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `app/api/videos/[id]/route.ts` | Integration per testing-guide-next-frontend (MSW) — `PATCH` sucesso, `401` sem sessão, `403`, `404`, `CATEGORY_NOT_FOUND` | `app/api/videos/[id]/__tests__/route.integration.test.ts` |
| `app/api/videos/[id]/thumbnail/route.ts` (POST) | Integration per testing-guide-next-frontend (MSW) — multipart repassado, `INVALID_FILE_TYPE`, `THUMBNAIL_SIZE_EXCEEDED`, `401` | `app/api/videos/[id]/thumbnail/__tests__/post.integration.test.ts` |
| `app/api/videos/[id]/publish/route.ts` | Integration per testing-guide-next-frontend (MSW) — sucesso, `INVALID_VIDEO_STATE`, `401` | `app/api/videos/[id]/publish/__tests__/route.integration.test.ts` |
| `components/studio/video-edit-form.tsx` (ligado aos handlers) | Unit per testing-guide-next-frontend § "Client Components" — submit feliz (PATCH + thumbnail), mapeamento por `errorCode` por linha, validação pré-submit | `components/studio/__tests__/video-edit-form.submit.test.tsx` |

E2E for the page (guarda, edição completa, publicação) is authored externally by `/plan-test-specs` in the spec file referenced by `**Test Specs:**` above and consumed JIT by `/implement` Step 3. Page-level Unit testing is excluded by `testing-guide-next-frontend` artifact rule "Pages → E2E only".

**Acceptance criteria:**

- `PATCH /api/videos/{id}` com sessão e `title` válido retorna `200` com o vídeo atualizado; sem sessão retorna `401` com `error: "UNAUTHORIZED"`.
- `POST /api/videos/{id}/thumbnail` com arquivo não-imagem retorna `400` com `INVALID_FILE_TYPE`; o formulário exibe o erro inline abaixo da ThumbUpload.
- `POST /api/videos/{id}/publish` de um vídeo `ready` e não publicado retorna `200` com `publishedAt`; de um vídeo já publicado retorna `409` com `INVALID_VIDEO_STATE`.
- Salvar com um arquivo de thumbnail escolhido envia `PATCH` e depois `POST` da thumbnail, e a página reflete os dados persistidos após `router.refresh()`.
- Com `status: "processing"`, o botão Publicar está desabilitado e o Status não exibe "Checks complete".
- `GET /studio/videos/{id}/edit` de um vídeo inexistente exibe a página not-found.

---

### SI-04.34.0 — Drift audit: Tela de edição do canal

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=154-1367
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Tela de edição do canal`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=154-1367
   - Reused DS components: [`components/ui/card.tsx`, `components/studio/channel-summary.tsx (new)`, `components/studio/channel-settings-form.tsx (new)`, `components/ui/label.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx (new)`, `components/ui/button.tsx`, `components/auth/field-error.tsx`]
   - Server-connected component names (no endpoints/auth/errors): [`ChannelSettingsForm`]
   - Target paths (read-only context for audit; no writes here): `app/(studio)/studio/channel/page.tsx` + `components/studio/channel-settings-form.tsx`

   For each component in the Reused DS list, perform value-level diff against the file on disk and classify per the 4-value status enum (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`). Compose Decision per default policy (see `.claude/skills/plan-build/references/frontend-drift-report-schema.md` § Default decisions per status). Note: confirmar suporte a supporting text e estado de erro no `Input` do repo e a variante outline/sm do `Button`. Read prior sections of `frontend-drift-report.md` to build `prior_decisions`; populate `Prior` column with CONFLICT detection (executed by `/implement` per its SKILL.md cross-screen consultation algorithm). Write a `## Screen: edicao-do-canal — audited at SI-04.34.0 ({YYYY-MM-DD})` section to `frontend-drift-report.md` (append on first run, overwrite-in-place on re-run). **No code edits — verifiable via `git diff` at SI end.**

**Dependencies:** SI-04.0.1, SI-04.0.13, SI-04.0.18

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` exists in the plan folder; section `## Screen: edicao-do-canal` exists with the current run's date in heading (appended on first run, overwritten in place on re-run per schema § Section ownership and update discipline).
- Every component in the Reused DS list has exactly one row in the table.
- Every row has a Decision column populated:
  - `alinhado` → `skip`
  - `drift menor` → `auto-Edit "<specifics>"` or `exception "<reason>"`
  - `drift relevante` → `auto-Edit "<specifics>"`, `exception "<reason>"`, or `CONFLICT: <one-liner>; <verb> "<specifics>"` (CONFLICT only when `prior_decisions` diverges; on CONFLICT rows `<verb>` is `auto-Edit` (default) or `exception` (override) — `create` and `skip` are categorically incompatible with `drift relevante`)
  - `componente ausente` → `create`
- Every `exception` decision carries a one-liner justification.
- `git diff --name-only HEAD -- next-frontend` after the SI is empty (no code touched in target subproject; the report file lives outside `next-frontend` and is excluded from the scoped check by construction).

---

### SI-04.34a — Tela de edição do canal (visual shell)

**Route:** /studio/channel
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=154-1367
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Tela de edição do canal`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: edicao-do-canal`

**Technical actions:**

1. **Apply drift decisions** — read the Drift Report section for this screen. For each row, parse the Decision column and apply per the verb body:
   - `auto-Edit "<specifics>"` → apply `Edit` on the named DS file with the documented specifics
   - `create` → create the file (icons via Figma asset; components per spec)
   - `exception` / `skip` → no-op
   - `CONFLICT: <one-liner>; <verb> "<specifics>"` → strip the `CONFLICT: <one-liner>;` prefix (informational only) and apply the verb body per the rules above (`<verb>` is `auto-Edit` or `exception` on CONFLICT rows; `create`/`skip` cannot appear here per schema § Decision)

   No drift detection or auto-judgment in this step. The audit-SI did the analysis; this step is mechanical application.

2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=154-1367
   - Reused DS components: [`components/ui/card.tsx`, `components/studio/channel-summary.tsx`, `components/studio/channel-settings-form.tsx`, `components/ui/label.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/button.tsx`, `components/auth/field-error.tsx`] _(now reflecting any DS edits from action 1)_
   - Server-connected component names (no endpoints/auth/errors): [`ChannelSettingsForm`]
   - Target paths: `app/(studio)/studio/channel/page.tsx` + `components/studio/channel-settings-form.tsx`

**Dependencies:** SI-04.34.0 + SI-04.0.1, SI-04.0.13, SI-04.0.18

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-Xb; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- All target paths exist, export expected components, and compile per `next-frontend` build command (`docker compose exec next-frontend npx tsc --noEmit`).
- Rendering matches Figma node fidelity within tolerance of DS component set (título "Channel Settings", resumo com nome e handle, "Basic Information", "Description" e rodapé com "Last updated", Cancel e Save Changes).
- No runtime imports beyond Reused DS list (stays visually scoped).

---

### SI-04.34b — Tela de edição do canal (lógica & wiring)

**Test Specs:** see `next-frontend/specs/studio-channel-edit.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Tela de edição do canal`

**Technical actions:**

1. **Route guard application** — per UI Contract `**Auth requirement:**` (Authenticated+Owner): `requireSession()` na página e no Route Handler; posse verificada pelo backend (`CHANNEL_NOT_OWNED` → 403) (per `phase-04-videos-channel-frontend/TD-01`)
2. **Rendering strategy application** — per UI Contract `**Rendering strategy:**` (RSC carrega dados; formulário Client Component): criar `next-frontend/app/(studio)/studio/channel/page.tsx` que carrega `GET /channels/me` via `authed-upstream` (per `phase-04-frontend-contract-gaps/TD-01`; um `401` redireciona para `/api/auth/refresh` per TD-03) e renderiza `ChannelSummary` e `ChannelSettingsForm`; `"use client"` só no formulário
3. **Endpoint wiring** — per UI Contract `**Server-connected components:**`: criar `next-frontend/app/api/channels/[id]/route.ts` (`PATCH` → `PATCH /channels/{id}`) com `requireSession()` + refresh single-flight; quando o `nickname` muda, regravar `channelSlug` no cookie de sessão (per `### API Contracts` → BFF tier → `PATCH /api/channels/[id]`); ligar `onSubmit` do `ChannelSettingsForm` ao Route Handler e chamar `router.refresh()` em caso de sucesso (per `phase-02-auth-frontend/TD-06`)
4. **Error mapping** — per UI Contract `**Error Catalog → UX mapping:**`: `NICKNAME_ALREADY_EXISTS` → erro inline no campo "Channel handle" (`FieldError`, `aria-invalid` + `aria-describedby`), sem sufixo automático; `CHANNEL_NOT_FOUND` → not-found; `UNAUTHORIZED` → redirect `/login?next=`; `CHANNEL_NOT_OWNED` → _TBD_ (implementador define)
5. **Client-side validation mirror** — per UI Contract `**Client-side validation mirror:**`: schema Zod com `nickname` (minúsculas, dígitos e underscore) e limites de `name`/`description` a partir do `UpdateChannelDto` gerado (SI-04.13)

**Dependencies:**

- `SI-04.34a` (visual shell must exist before wiring).
- `SI-04.30b` (layout `(studio)`).
- `SI-04.12` (`GET /channels/me` e `updatedAt` no PATCH, per `phase-04-frontend-contract-gaps/TD-01`).
- `SI-04.17` (sessão com `channelId`/`channelSlug`).
- `SI-04.15`, `SI-04.16`, `SI-04.19`, `SI-04.20`, `SI-04.21`.

**Tests:**

| Artifact | Layer | Test file |
|---|---|---|
| `app/api/channels/[id]/route.ts` | Integration per testing-guide-next-frontend (MSW) — `PATCH` sucesso atualiza `channelSlug` na sessão, `NICKNAME_ALREADY_EXISTS`, `401`, `403` | `app/api/channels/[id]/__tests__/route.integration.test.ts` |
| `components/studio/channel-settings-form.tsx` (ligado ao handler) | Unit per testing-guide-next-frontend § "Client Components" — submit feliz, `NICKNAME_ALREADY_EXISTS` inline, validação pré-submit | `components/studio/__tests__/channel-settings-form.submit.test.tsx` |

E2E for the page (guarda, edição e conflito de nickname) is authored externally by `/plan-test-specs` in the spec file referenced by `**Test Specs:**` above and consumed JIT by `/implement` Step 3. Page-level Unit testing is excluded by `testing-guide-next-frontend` artifact rule "Pages → E2E only".

**Acceptance criteria:**

- `GET /studio/channel` com sessão pré-preenche nickname, nome e descrição a partir de `GET /channels/me`.
- `PATCH /api/channels/{id}` com sessão e dados válidos retorna `200` com `id`, `name`, `nickname`, `description` e `updatedAt`; sem sessão retorna `401` com `error: "UNAUTHORIZED"`.
- `PATCH /api/channels/{id}` com nickname já em uso retorna `409` com `NICKNAME_ALREADY_EXISTS`; o formulário exibe o erro no campo "Channel handle".
- Após trocar o nickname com sucesso, a sessão passa a conter o novo `channelSlug` e o menu de conta exibe `@{novo nickname}`.
- Salvar com sucesso atualiza "Last updated" com o novo `updatedAt`.

---

### SI-04.35.0 — Drift audit: Página pública do canal

**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página pública do canal`

**Technical actions:**

1. **Drift audit** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926
   - Reused DS components: [`components/channel/channel-header.tsx (new)`, `components/channel/video-sort-filter.tsx (new)`, `components/ui/filter-chip.tsx (new)`, `components/channel/video-card.tsx (new)`, `components/ui/video-thumbnail.tsx (new)`, `components/ui/pagination.tsx (new)`]
   - Server-connected component names (no endpoints/auth/errors): [`ChannelHeader`, `VideoCard`]
   - Target paths (read-only context for audit; no writes here): `app/channel/[nickname]/page.tsx` + `components/channel/video-card.tsx`

   For each component in the Reused DS list, perform value-level diff against the file on disk and classify per the 4-value status enum (`alinhado` / `drift menor` / `drift relevante` / `componente ausente`). Compose Decision per default policy (see `.claude/skills/plan-build/references/frontend-drift-report-schema.md` § Default decisions per status). Read prior sections of `frontend-drift-report.md` to build `prior_decisions`; populate `Prior` column with CONFLICT detection (executed by `/implement` per its SKILL.md cross-screen consultation algorithm). Write a `## Screen: pagina-publica-do-canal — audited at SI-04.35.0 ({YYYY-MM-DD})` section to `frontend-drift-report.md` (append on first run, overwrite-in-place on re-run). **No code edits — verifiable via `git diff` at SI end.**

**Dependencies:** SI-04.0.1, SI-04.0.3, SI-04.0.8, SI-04.0.14

**Tests:** _(empty — audit-only; the report is the deliverable)_

**Acceptance criteria:**

- `frontend-drift-report.md` exists in the plan folder; section `## Screen: pagina-publica-do-canal` exists with the current run's date in heading (appended on first run, overwritten in place on re-run per schema § Section ownership and update discipline).
- Every component in the Reused DS list has exactly one row in the table.
- Every row has a Decision column populated:
  - `alinhado` → `skip`
  - `drift menor` → `auto-Edit "<specifics>"` or `exception "<reason>"`
  - `drift relevante` → `auto-Edit "<specifics>"`, `exception "<reason>"`, or `CONFLICT: <one-liner>; <verb> "<specifics>"` (CONFLICT only when `prior_decisions` diverges; on CONFLICT rows `<verb>` is `auto-Edit` (default) or `exception` (override) — `create` and `skip` are categorically incompatible with `drift relevante`)
  - `componente ausente` → `create`
- Every `exception` decision carries a one-liner justification.
- `git diff --name-only HEAD -- next-frontend` after the SI is empty (no code touched in target subproject; the report file lives outside `next-frontend` and is excluded from the scoped check by construction).

---

### SI-04.35a — Página pública do canal (visual shell)

**Route:** /channel/[nickname]
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página pública do canal`
**Drift Report:** see `frontend-drift-report.md` → `## Screen: pagina-publica-do-canal`

**Technical actions:**

1. **Apply drift decisions** — read the Drift Report section for this screen. For each row, parse the Decision column and apply per the verb body:
   - `auto-Edit "<specifics>"` → apply `Edit` on the named DS file with the documented specifics
   - `create` → create the file (icons via Figma asset; components per spec)
   - `exception` / `skip` → no-op
   - `CONFLICT: <one-liner>; <verb> "<specifics>"` → strip the `CONFLICT: <one-liner>;` prefix (informational only) and apply the verb body per the rules above (`<verb>` is `auto-Edit` or `exception` on CONFLICT rows; `create`/`skip` cannot appear here per schema § Decision)

   No drift detection or auto-judgment in this step. The audit-SI did the analysis; this step is mechanical application.

2. **Visual shell generation** — invoke `figma:figma-implement-design` (narrow handoff per Decisão #31) with:
   - Figma URL: https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926
   - Reused DS components: [`components/channel/channel-header.tsx`, `components/channel/video-sort-filter.tsx`, `components/ui/filter-chip.tsx`, `components/channel/video-card.tsx`, `components/ui/video-thumbnail.tsx`, `components/ui/pagination.tsx`] _(now reflecting any DS edits from action 1)_
   - Server-connected component names (no endpoints/auth/errors): [`ChannelHeader`, `VideoCard`]
   - Target paths: `app/channel/[nickname]/page.tsx` + `components/channel/video-card.tsx`

**Dependencies:** SI-04.35.0 + SI-04.0.1, SI-04.0.3, SI-04.0.8, SI-04.0.14

**Tests:** _(empty — shell smoke-gated by build AC; Unit tests live in SI-Xb; E2E in /plan-test-specs spec)_

**Acceptance criteria:**

- All target paths exist, export expected components, and compile per `next-frontend` build command (`docker compose exec next-frontend npx tsc --noEmit`).
- Rendering matches Figma node fidelity within tolerance of DS component set (header do canal, chips desabilitados e grid de cards de 266px).
- No runtime imports beyond Reused DS list (stays visually scoped).

---

### SI-04.35b — Página pública do canal (lógica & wiring)

**Test Specs:** see `next-frontend/specs/public-channel-page.plan.md`
**UI Contract:** see `## Technical Specifications` → `### UI Contracts` → `#### Screen: Página pública do canal`

**Technical actions:**

1. **Route guard application** — per UI Contract `**Auth requirement:**` (Anonymous): página pública, sem `requireSession()` e sem redirect-if-authenticated; a sessão é lida apenas para decidir se a casca autenticada é exibida (cabeçalho anônimo não desenhado — implementador define pelo DS e anota como Open question) (per `phase-04-videos-channel-frontend/TD-01`, exclusão de `/channel/[nickname]`)
2. **Rendering strategy application** — per UI Contract `**Rendering strategy:**` (RSC async, dinâmica sem cache): criar `next-frontend/app/channel/[nickname]/page.tsx` lendo `searchParams.page`, sem `"use client"` e sem `'use cache'`, com `loading.tsx` (per `phase-04-videos-channel-frontend/TD-02`, `TD-03`)
3. **Endpoint wiring** — per UI Contract `**Server-connected components:**`: no RSC, chamar `GET /channels/{nickname}` e `GET /channels/{nickname}/videos` (`page`, `pageSize`) via `upstream` (sem token — página anônima, não passa por `authed-upstream`); mapear para `ChannelHeader`, `VideoCard` (thumbnail `/api/videos/{id}/thumbnail?v={updatedAt}`) e `PaginationLinks`; `notFound()` quando o canal não existe
4. **Error mapping** — per UI Contract `**Error Catalog → UX mapping:**`: `CHANNEL_NOT_FOUND` → `notFound()` (página 404 do canal); demais falhas → `error.tsx`
5. **Client-side validation mirror** — _not applicable_ (normalização de `page` já coberta pela SI-04.15)

**Dependencies:**

- `SI-04.35a` (visual shell must exist before wiring).
- `SI-04.30b` (`AppShell`, para o estado autenticado).
- `SI-04.11` (`updatedAt` em `GET /channels/:nickname/videos` e endpoint de thumbnail), `SI-04.32b` (Route Handler `GET /api/videos/[id]/thumbnail`).
- `SI-04.15`, `SI-04.16`, `SI-04.19`, `SI-04.20`.

**Tests:** _(empty — page-level behavior is E2E authored via /plan-test-specs; unit coverage lives in bootstrap SIs)_

**Acceptance criteria:**

- `GET /channel/{nickname}` sem sessão retorna a página com o nome do canal em um `<h1>` e os vídeos públicos publicados, sem redirecionar para `/login`.
- `GET /channel/{nickname}?page=2` solicita `page=2` ao upstream e marca a página 2 com `aria-current="page"`.
- `GET /channel/inexistente` exibe a página not-found.
- Cada `VideoCard` é um único link para `/watch/{id}`.
- Um vídeo publicado no painel aparece em `/channel/{nickname}` no carregamento seguinte, sem invalidação de cache.

---

## Technical Specifications

### API Contracts

> _Backend tier — mudanças de backend exigidas por esta slice. O contrato de negócio de `phase-04-videos-channel` (categories, PATCH/thumbnail/publish de vídeo, listagens, canal) está fechado no plano irmão e **não** é reaberto aqui; só as diferenças abaixo entram._

> _Backend changes without endpoint (TD-04, `phase-04-videos-channel-frontend/TD-04`):_ nova variável `STORAGE_PUBLIC_ENDPOINT` (`storage.config.ts`, `env.validation.ts`, `.env.example`, `compose.yaml`) e cliente S3 de assinatura dedicado (`storage.module.ts` novo provider + `VideosService.getPlaybackUrl`), usado apenas em `getSignedUrl` de leitura; upload/multipart/cron seguem no cliente interno. **(SI-04.10)**

#### GET /videos/:id/thumbnail (SI-04.11)

Novo endpoint irmão de `/stream` (per `phase-04-videos-channel-frontend/TD-05`). Público com usuário opcional (`@Public()`).

**Request path parameters:**
- id: string (uuid), required

**Response 302:** redirect para URL pré-assinada da thumbnail (assinada com o cliente de `STORAGE_PUBLIC_ENDPOINT`, per TD-04) — header `Location` + `Cache-Control` curto. Sem body.

**Error responses:**
- 404 VIDEO_NOT_FOUND: when the video does not exist or is not visible to the requester — regra de visibilidade: dono vê qualquer status; anônimo/não-dono só vê vídeo `ready` + publicado (`published_at` set) + `visibility=public`
- 404 _(errorCode undetermined — TD-05 only says "Sem `thumbnail_key` → 404"; reuse `VIDEO_NOT_FOUND` unless decided otherwise)_: when the video has no `thumbnail_key`

---

#### `updatedAt` nas respostas existentes (SI-04.11)

Adição aditiva de `updatedAt: string (date-time)` (valor da coluna `updated_at`, usado como parâmetro de versão `?v=` da thumbnail, per `phase-04-videos-channel-frontend/TD-05`) a:
- cada item de `GET /channels/:id/manage/videos`
- cada item de `GET /channels/:nickname/videos`
- `Response 200` de `PATCH /videos/:id`
- `Response 200` de `POST /videos/:id/thumbnail`

Documentar (OpenAPI) — `@ApiResponse` schema atualizado nos quatro endpoints, necessário para a cadeia `openapi.json` → `types.gen.ts`.

---

#### GET /channels/me (SI-04.12)

_Decidido em `phase-04-frontend-contract-gaps/TD-01`:_ nenhum endpoint existente entrega ao frontend o `id`/`nickname` do canal do usuário logado; o JWT carrega só `sub` e `email`, e `GET /channels/:id/manage/videos`, `PATCH /channels/:id` e `GET /channels/:nickname` exigem `id` ou `nickname`. Endpoint autenticado, declarado **antes** de `GET /channels/:nickname` no controller (evita que `me` seja capturado como nickname).

**Request headers:**
- Authorization: Bearer access-token

**Response 200:**
- id: string (uuid)
- name: string
- nickname: string
- description: string | null
- updatedAt: string (date-time)

**Error responses:**
- 401: when the requester is not authenticated
- 404 CHANNEL_NOT_FOUND: when the authenticated user has no channel

---

#### GET /videos/:id — enriquecimento da resposta (SI-04.12)

_Decidido em `phase-04-frontend-contract-gaps/TD-02`:_ a resposta atual de `GET /videos/:id` (`id`, `title`, `status`, `durationSeconds`, `width`, `height`, `createdAt`) não traz os campos que o formulário de edição precisa carregar. Adição aditiva (nenhum campo existente muda):

**Response 200 (campos adicionados):**
- description: string | null
- categoryId: string (uuid) | null
- visibility: string — one of `public`, `unlisted`
- publishedAt: string (date-time) | null
- thumbnailKey: string | null
- updatedAt: string (date-time)

**Error responses:** inalterados (404 VIDEO_NOT_FOUND).

---

#### PATCH /channels/:id — `updatedAt` na resposta (SI-04.12)

Adição aditiva de `updatedAt: string (date-time)` ao `Response 200` (alimenta "Last updated" da tela de edição do canal, refletindo a atualização após salvar).

---

> _BFF tier — frontend-exposed contract. O navegador chama apenas as rotas FE-facing abaixo (Route Handlers em `app/api/**`); leituras de dados das telas (`GET /categories`, `GET /videos/:id`, `GET /channels/me`, `GET /channels/:id/manage/videos`, `GET /channels/:nickname`, `GET /channels/:nickname/videos`) são feitas por RSC chamando `upstream` no servidor (per `phase-04-videos-channel-frontend/TD-02`) e **não** têm rota FE-facing. Linhas `derived` refletem o `openapi.json` após o SI-04.13 (pré-requisito: export do backend + `scripts/sync-openapi.sh` + `npm run openapi:types`), transcritas byte-verbatim do plano irmão `phase-04-videos-channel` (contrato-fonte atual ainda não contém `/videos`, `/channels`, `/categories`); o SI-04.13 reconcilia. Todo Route Handler de dados/mutação chama `requireSession()` (per `phase-04-videos-channel-frontend/TD-01`) e, quando o access token expira, redireciona para o Route Handler de renovação (per `phase-04-frontend-contract-gaps/TD-03`)._

#### GET /api/videos/[id]/thumbnail (SI-04.32b)

**forwards-to:** `GET /videos/{id}/thumbnail` *(derived: project contract source)*

**Request query parameters:**
- v: string, optional — versão de cache (`updatedAt`); consumida só pelo navegador/otimizador, **não** repassada ao upstream *(per phase-04-videos-channel-frontend/TD-05)*

**Response 302 (FE-facing):** repassa o redirect do upstream (`Location`, `Cache-Control`) — pass-through *(per phase-04-videos-channel-frontend/TD-05)*. Sessão opcional: com sessão, o BFF anexa o access token (dono vê thumbnails de rascunho); sem sessão, chama sem `Authorization` *(per phase-04-videos-channel-frontend/TD-05)*

**Error responses (FE-facing):**
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*

---

#### PATCH /api/videos/[id] (SI-04.33b)

**forwards-to:** `PATCH /videos/{id}` *(derived: project contract source)*

**Request headers:**
- Content-Type: application/json *(derived: project contract source)*

**Request body:** `UpdateVideoDto` *(derived: project contract source — fields per the project contract source; not re-spelled here to avoid duplication)*

**Response 200 (FE-facing):** `{ id, title, description, categoryId, visibility, status, publishedAt, updatedAt }` — pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 400 validation error: pass-through *(derived: project contract source)*
- 401 UNAUTHORIZED: sessão inválida/expirada *(per phase-04-videos-channel-frontend/TD-01)*
- 403 VIDEO_NOT_OWNED: pass-through *(derived: project contract source)*
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*
- 404 CATEGORY_NOT_FOUND: pass-through *(derived: project contract source)*

---

#### POST /api/videos/[id]/thumbnail (SI-04.33b)

**forwards-to:** `POST /videos/{id}/thumbnail` *(derived: project contract source)*

**Request headers:**
- Content-Type: multipart/form-data *(derived: project contract source)*

**Request body:** campo `thumbnail` (file) — repassado como `FormData` *(derived: project contract source — fields per source; not re-spelled here to avoid duplication)*

**Response 200 (FE-facing):** `{ id, thumbnailKey, updatedAt }` — pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 400 INVALID_FILE_TYPE: pass-through *(derived: project contract source)*
- 400 THUMBNAIL_SIZE_EXCEEDED: pass-through *(derived: project contract source)*
- 401 UNAUTHORIZED: sessão inválida/expirada *(per phase-04-videos-channel-frontend/TD-01)*
- 403 VIDEO_NOT_OWNED: pass-through *(derived: project contract source)*
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*

---

#### POST /api/videos/[id]/publish (SI-04.33b)

**forwards-to:** `POST /videos/{id}/publish` *(derived: project contract source)*

**Request headers:**
- Content-Type: application/json *(derived: project contract source)*

**Response 200 (FE-facing):** `{ id, publishedAt }` — pass-through *(derived: project contract source; reshape: none)*

**Error responses (FE-facing):**
- 401 UNAUTHORIZED: sessão inválida/expirada *(per phase-04-videos-channel-frontend/TD-01)*
- 403 VIDEO_NOT_OWNED: pass-through *(derived: project contract source)*
- 404 VIDEO_NOT_FOUND: pass-through *(derived: project contract source)*
- 409 INVALID_VIDEO_STATE: pass-through *(derived: project contract source)*

---

#### PATCH /api/channels/[id] (SI-04.34b)

**forwards-to:** `PATCH /channels/{id}` *(derived: project contract source)*

**Request headers:**
- Content-Type: application/json *(derived: project contract source)*

**Request body:** `UpdateChannelDto` *(derived: project contract source — fields per the project contract source; not re-spelled here to avoid duplication)*

**Response 200 (FE-facing):** `{ id, name, nickname, description, updatedAt }` — pass-through *(derived: project contract source; reshape: none)*

**Set-Cookie / session side-effect:** quando o `nickname` muda, o BFF atualiza `channelSlug` no cookie `streamtube_session` (iron-session) e o cliente chama `router.refresh()` para reentregar a sessão ao Provider *(per phase-02-auth-frontend/TD-06)*

**Error responses (FE-facing):**
- 400 validation error: pass-through *(derived: project contract source)*
- 401 UNAUTHORIZED: sessão inválida/expirada *(per phase-04-videos-channel-frontend/TD-01)*
- 403 CHANNEL_NOT_OWNED: pass-through *(derived: project contract source)*
- 404 CHANNEL_NOT_FOUND: pass-through *(derived: project contract source)*
- 409 NICKNAME_ALREADY_EXISTS: pass-through *(derived: project contract source)*

---

#### GET /api/auth/refresh (SI-04.14)

_Nova rota BFF, per `phase-04-frontend-contract-gaps/TD-03`._ Renova o access token quando um RSC recebe `401` do upstream e não pode gravar cookie diretamente (limite de `cookies()` fora de Server Function/Route Handler, confirmado na documentação do Next.js 16.2.2 — `cookies()` só lê cookies de entrada em Server Components).

**Request query parameters:**
- next: string, required — caminho de retorno; validado como same-origin antes do redirect *(per phase-04-frontend-contract-gaps/TD-03)*

**forwards-to:** `POST /auth/refresh` *(derived: project contract source)*, via o helper de refresh single-flight já existente *(per phase-02-auth-frontend/TD-03)*

**Set-Cookie / session side-effect:** regrava `accessToken`/`refreshToken` no cookie `streamtube_session` em caso de sucesso *(per phase-02-auth-frontend/TD-02)*

**Response 302 (FE-facing):** redirect para `next` em caso de sucesso *(per phase-04-frontend-contract-gaps/TD-03)*

**Error responses (FE-facing):**
- 302 → `/login?next={next}`: quando o refresh falha (refresh token inválido/expirado) *(per phase-04-frontend-contract-gaps/TD-03)*
- 400: quando `next` não é same-origin *(per phase-04-frontend-contract-gaps/TD-03)*

---

#### POST /api/auth/login — emenda (SI-04.17)

Emenda ao Route Handler existente da Fase 02 (`app/api/auth/login/route.ts`); só o delta:

**forwards-to:** `POST /auth/login` *(derived: project contract source)* seguido de `GET /channels/me` *(derived: project contract source)* com o access token recém-emitido.

**Set-Cookie / session side-effect:** além de `accessToken`/`refreshToken`/`email`, o cookie `streamtube_session` passa a guardar `userId`, `channelId` (novo campo de `SessionData`) e `channelSlug` (= `nickname`), hoje gravados vazios pelo handler; `requireSession()` expõe `channelId` aos handlers e RSC da área autenticada *(per phase-04-frontend-contract-gaps/TD-01)*

---

### Authorization Matrix

| Endpoint | Anonymous | Authenticated | Owner |
|----------|-----------|---------------|-------|
| GET /categories _(inherited — phase-04-videos-channel)_ | ✓ | ✓ | ✓ |
| GET /videos/:id _(existing — phase-03-videos; enriched per phase-04-frontend-contract-gaps/TD-02)_ | ✓ | ✓ | ✓ |
| GET /videos/:id/thumbnail | ✓ (só `ready` + publicado + `public`) | ✓ (idem) | ✓ (qualquer status) |
| PATCH /videos/:id _(inherited)_ | ✗ | ✗ | ✓ |
| POST /videos/:id/thumbnail _(inherited)_ | ✗ | ✗ | ✓ |
| POST /videos/:id/publish _(inherited)_ | ✗ | ✗ | ✓ |
| GET /channels/me | ✗ | ✓ | ✓ |
| GET /channels/:id/manage/videos _(inherited)_ | ✗ | ✗ | ✓ |
| GET /channels/:nickname/videos _(inherited)_ | ✓ | ✓ | ✓ |
| GET /channels/:nickname _(inherited)_ | ✓ | ✓ | ✓ |
| PATCH /channels/:id _(inherited)_ | ✗ | ✗ | ✓ |

### Error Catalog

Todos os códigos abaixo já existem no backend; esta slice não cria códigos novos (a thumbnail sem `thumbnail_key` reusa `VIDEO_NOT_FOUND` salvo decisão em contrário).

| errorCode | HTTP | Trigger |
|-----------|------|---------|
| VIDEO_NOT_FOUND | 404 | _(existing — `phase-03-videos`)_ Vídeo não encontrado / não visível; também thumbnail inexistente |
| VIDEO_NOT_OWNED | 403 | _(existing — `phase-03-videos`)_ Vídeo não pertence ao canal do requisitante |
| INVALID_VIDEO_STATE | 409 | _(existing — `phase-04-videos-channel`)_ Publicar vídeo que não está `ready` ou já publicado |
| CATEGORY_NOT_FOUND | 404 | _(existing — `phase-04-videos-channel`)_ `categoryId` inexistente |
| INVALID_FILE_TYPE | 400 | _(existing — `phase-04-videos-channel`)_ Thumbnail não é imagem |
| THUMBNAIL_SIZE_EXCEEDED | 400 | _(existing — `phase-04-videos-channel`)_ Thumbnail acima do limite (≤5MB) |
| CHANNEL_NOT_FOUND | 404 | _(existing — `phase-03-videos`)_ Canal não encontrado |
| CHANNEL_NOT_OWNED | 403 | _(existing — `phase-03-videos`)_ Canal não pertence ao requisitante |
| NICKNAME_ALREADY_EXISTS | 409 | _(existing — `phase-04-videos-channel`)_ Novo nickname já em uso |
| UNAUTHORIZED | 401 | _(existing — BFF envelope, `phase-02-auth-frontend`)_ Sessão inválida/expirada em Route Handler de dados/mutação |

---

### UI Contracts

#### Screen: Painel de gerenciamento de vídeos

**Route:** `/studio/videos`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=152-1824 (node `upxCB4CzKKTSOT9NpdAZ0u:152:1824`)
**Purpose:** "Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status)"

**Auth requirement:** Authenticated+Owner _(source: §Authorization Matrix — `GET /channels/:id/manage/videos`; guarda per phase-04-videos-channel-frontend/TD-01)_

**Rendering strategy:** Server Component (RSC) async lendo `searchParams.page`, renderização dinâmica sem cache, paginação numerada por links `?page=N` _(source: phase-04-videos-channel-frontend/TD-02, TD-03)_

**Reused DS components:**
- `components/layout/app-shell.tsx (new)` — AppShell layout — Layout de rota autenticada: TopNav + SideNav (256px) + área principal. Compartilhado pelas 4 telas (D6)
- `components/layout/top-nav.tsx (new)` — TopNav — Casca global autenticada (menu, logo, busca, voz, criar, avatar); avatar vem da sessão (`components/auth/session-provider.tsx` ✓). Nenhuma capability desta slice o exige
- `components/ui/icon-button.tsx` — MenuTrigger / VoiceSearchButton / IconButton "Create" — Alterna SideNav (variantes collapsed/expanded); voz e "+" inertes (D6); exige variante ghost (glifo solto)
- `components/icons/menu-icon.tsx (new)` — MenuIcon — Glifo hambúrguer
- `components/auth/brand-logo.tsx` — BrandLogo — Herdado (phase-02); instância size=sm
- `components/icons/streamtube-icon.tsx` — StreamtubeIcon — Herdado (phase-02); ícone dentro do BrandLogo
- `components/ui/search-field.tsx (new)` — GlobalSearchField / VideoSearchField — **Inerte (D6)** no TopNav e **Desabilitado (D7)** em "Search your videos"; componente Figma "Search" (158:4007): ícone à esquerda e limpar à direita
- `components/icons/search-icon.tsx (new)` — SearchIcon — Usado nos dois campos de busca
- `components/icons/mic-icon.tsx (new)` — MicIcon — —
- `components/icons/plus-icon.tsx (new)` — PlusIcon — Glifo "add" dentro do IconButton
- `components/ui/avatar.tsx (new)` — Avatar — Avatar do usuário logado (TopNav, 36px) e dos canais da lista de inscrições (SideNav, 26px). Raster → `next/image`. Sem menu/dropdown desenhado
- `components/layout/side-nav.tsx (new)` — SideNav — Navegação lateral; 2 variantes (collapsed/expanded) na descrição do componente, só expanded desenhada
- `components/layout/side-nav-item.tsx (new)` — SideNavItem — Home, Subscriptions, Your videos, Liked videos. Navegação client-side (Next.js `<Link>`)
- `components/layout/side-nav-subscription-list.tsx (new)` — SideNavSubscriptionList — **Placeholder estático (D6):** assinaturas são fase posterior; 6 itens de avatar + nome sem dados reais e sem verbo
- `components/icons/home-icon.tsx (new)` — HomeIcon — —
- `components/icons/subscriptions-icon.tsx (new)` — SubscriptionsIcon — —
- `components/icons/your-videos-icon.tsx (new)` — YourVideosIcon — —
- `components/icons/liked-videos-icon.tsx (new)` — LikedVideosIcon — —
- `components/ui/button.tsx` — Button "Upload video" / FilterButtons (Filter, Public, Date) — "Upload video": variante primária, navega para o fluxo de upload (fase 03); filtros **desabilitados (D7)**, Variant=secondary Size=md
- `components/icons/filter-icon.tsx (new)` — FilterIcon — No screenshot o glifo parece ícone de "share", não de filtro
- `components/studio/video-sort-control.tsx (new)` — VideoSortControl — **Desabilitado (D7).** "Sort by: Latest"; sem dropdown/opções desenhados
- `components/icons/sort-icon.tsx (new)` — SortIcon — Glifo filter-list 16px
- `components/studio/video-list-row.tsx (new)` — VideoListRow — Linha 1088×160; depende de dados do backend (lista paginada numerada). Linha/thumbnail/título levam à página de edição do vídeo (não à watch page)
- `components/ui/video-thumbnail.tsx (new)` — VideoThumbnail — 256×144, raster → `next/image`. Inclui overlay de duração "10:30" (108:325)
- `components/studio/video-stats.tsx (new)` — VideoStats — Visualizações, likes, comentários; placeholders (0) até fase posterior, mas exibidos
- `components/icons/views-icon.tsx (new)` — ViewsIcon — Glifo de olho 13.5×12 (D12: não reusa `eye-icon.tsx`, que é o olho de visibilidade de senha)
- `components/icons/thumbs-up-icon.tsx (new)` — ThumbsUpIcon — Ícone de likes
- `components/icons/comment-icon.tsx (new)` — CommentIcon — Ícone de comentários
- `components/ui/badge.tsx (new)` — VisibilityStatusLabel — Só existe a variante "Public" (texto verde, token success-text). Sem variantes para unlisted / draft / processing / error
- `components/ui/pagination.tsx (new)` — Pagination — não está no Figma (Open question — paginação numerada sem design); `nav` rotulado com links `?page=N` e `aria-current="page"` _(per phase-04-videos-channel-frontend/TD-02)_

**Server-connected components:**
- `VideoListRow` — verbs: Exibir lista paginada de vídeos do canal com thumbnail, título, visualizações, likes, comentários, tempo de publicação e status; Abrir a edição de um vídeo a partir da linha do painel | endpoint: RSC `upstream` → `GET /channels/{id}/manage/videos` (backend tier; sem rota FE-facing) + `GET /api/videos/[id]/thumbnail` (§API Contracts → BFF tier — see for `forwards-to` + request/response/projection) | reuse: `components/studio/video-list-row.tsx (new)`

**Behaviors:**

*Rendered states:*
- Loading: `loading.tsx` da rota com skeleton de linhas (estado não desenhado no Figma — implementador define pelo DS)
- Empty: canal sem vídeos — mensagem vazia com CTA "Upload video" (não desenhado)
- Success: até `pageSize` linhas + contagem `total` ("N videos") + paginação numerada; `views`/`likes`/`comments` exibem `0`; tempo de publicação relativo (`Intl.RelativeTimeFormat`), ausente em rascunho
- Error: falha de carregamento — erro da rota (`error.tsx`); detalhe abaixo

*Interactions:*
- Linha/thumbnail/título click → navegação client para `/studio/videos/[id]/edit`
- Link de página `?page=N` click → navegação de servidor da mesma rota (URL como estado)
- Filter / Public / Date / "Search your videos" / "Sort by: Latest" → desabilitados (D7), sem efeito
- Hambúrguer click → mostra/oculta a SideNav (OQ resolvida)

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `UNAUTHORIZED` | Redirect para `/login?next=` (mesma origem) via `requireSession()`; se o `401` vier de dentro do RSC, o Route Handler `GET /api/auth/refresh` (per `phase-04-frontend-contract-gaps/TD-03`) tenta renovar antes do login |
| `CHANNEL_NOT_OWNED` | _TBD — implementer decides per screen_ (não esperado: `channelId` vem da sessão via `phase-04-frontend-contract-gaps/TD-01`) |
| `CHANNEL_NOT_FOUND` | _TBD — implementer decides per screen_ |

**Client-side validation mirror:** not applicable — tela somente leitura; `page` inválido/ausente normaliza para 1.

**Accessibility notes:**
- Botões só com ícone (menu, voz, criar, submit de busca) precisam de `aria-label`; campos de busca com label acessível
- Thumbnails via `next/image` com `alt=""` dentro de link com texto; avatar da conta com alt significativo
- Paginação: `nav` rotulado e `aria-current="page"` na página atual
- SideNav: `<nav>` com `aria-label`, `aria-current="page"` no item ativo; hambúrguer com `aria-label`, `aria-expanded`, `aria-controls`

---

#### Screen: Tela de edição de vídeo

**Route:** `/studio/videos/[id]/edit`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=156-2790 (node `upxCB4CzKKTSOT9NpdAZ0u:156:2790`)
**Purpose:** "Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada"

**Auth requirement:** Authenticated+Owner _(source: §Authorization Matrix — `PATCH /videos/:id`, `POST /videos/:id/thumbnail`, `POST /videos/:id/publish`; guarda per phase-04-videos-channel-frontend/TD-01)_

**Rendering strategy:** Server Component (RSC) carrega vídeo e categorias no servidor; formulário como Client Component com `react-hook-form` + Zod; mutações por Route Handler + `router.refresh()` _(source: phase-04-videos-channel-frontend/TD-02; phase-02-auth-frontend/TD-04, TD-05, TD-06)_

**Reused DS components:**
- shell (`app-shell`, `top-nav`, `side-nav`, `side-nav-item`, `avatar`, ícones da casca) — see screen: Painel de gerenciamento de vídeos
- `components/studio/video-edit-form.tsx (new)` — VideoEditForm — Container do formulário: carrega os dados atuais do vídeo (per `phase-04-frontend-contract-gaps/TD-02`), combina validação local e envio ao servidor (regra: form = Server-connected como unidade)
- `components/ui/card.tsx` — Card — Herdado (phase-02). Superfície do "Channel card" que envolve campos e rodapé
- `components/ui/label.tsx` — FormLabel x2 ("Title", "Description") — Herdado (phase-02). Asterisco de obrigatório existe no componente Figma mas não aparece
- `components/ui/input.tsx` — TextField "Title" — Herdado como Input (phase-02). Pré-preenchido "My Awesome Video"
- `components/ui/textarea.tsx (new)` — Textarea "Description" — Multi-linha, ~192px. Não existe em `components/ui/`
- `components/studio/video-config-card.tsx (new)` — CardVideoConfig — Painel lateral somente leitura (328x385): preview preto com "0:00", "Video link" com ícone de copiar (156:3108), Filename, Video Quality. Copiar é client-only; dados via props do form
- `components/studio/thumb-upload.tsx (new)` — ThumbUpload — Tile 266x151 com a thumbnail atual e badge de duração ("15:41"). Raster → `next/image`. Só pré-visualiza
- `components/ui/button.tsx` — Change Thumbnail Button / Cancel Button / Save Changes Button / PublishButton — **D10:** Change Thumbnail só escolhe o arquivo e pré-visualiza (envio no Save Changes), Variant=outline com ícone de upload; Cancel outline, descarta e volta ao painel; Save Changes primário 169px, submit do form; **D11:** PublishButton primário "Publicar" **sem arte no Figma**, habilitado só com vídeo pronto e ainda não publicado (ação única)
- `components/ui/section-header.tsx (new)` — SectionHeader x3 ("Thumbnail", "Category", "Visibility") — Título 20px semi-bold + linha descritiva muted
- `components/ui/select.tsx (new)` — Category select — Instância de Select (2179:263), 448px. Opções vêm da lista de categorias do servidor. Estados aberto/vazio/desabilitado não desenhados
- `components/studio/privacy-option.tsx (new)` — PrivacyOption x2 (Public, Unlisted) — Cards estilo radio (ícone, título, descrição), 576px. Seleção local até salvar

**Server-connected components:**
- `VideoEditForm` — verbs: Carregar as informações atuais do vídeo para edição | endpoint: RSC `upstream` → `GET /videos/{id}` (backend tier, enriquecido per `phase-04-frontend-contract-gaps/TD-02`; sem rota FE-facing) | reuse: `components/studio/video-edit-form.tsx (new)`
- `Category select` — verbs: Exibir categorias de vídeo disponíveis para escolha | endpoint: RSC `upstream` → `GET /categories` (backend tier; sem rota FE-facing) | reuse: `components/ui/select.tsx (new)`
- `Save Changes Button` — verbs: Salvar título, descrição e categoria editados do vídeo; Enviar thumbnail customizada do vídeo; Definir visibilidade do vídeo como público ou unlisted | endpoint: `PATCH /api/videos/[id]`, `POST /api/videos/[id]/thumbnail` (§API Contracts → BFF tier — see for `forwards-to` + request/response/projection) | reuse: `components/ui/button.tsx`
- `Status` — verbs: Exibir se o vídeo está apto para publicação | endpoint: RSC `upstream` → `GET /videos/{id}` (`status`, `publishedAt`) | reuse: new
- `PublishButton` — verbs: Publicar vídeo em rascunho (ação única, só quando processado e ainda não publicado) | endpoint: `POST /api/videos/[id]/publish` (§API Contracts → BFF tier — see for `forwards-to` + request/response/projection) | reuse: `components/ui/button.tsx`

**Behaviors:**

*Rendered states:*
- Loading: `loading.tsx` da rota; Save/Publish com estado pending/disabled durante a mutação (não desenhado)
- Empty: not applicable (vídeo inexistente → not-found)
- Success: campos pré-preenchidos; após Save/Publish `router.refresh()` reflete os valores persistidos; Status "Checks complete. No issues found." só quando `status=ready`
- Error: erros de campo inline; erro de mutação por toast/mensagem de formulário; detalhe abaixo

*Interactions:*
- Change Thumbnail click → abre seletor de arquivo e pré-visualiza no ThumbUpload sem enviar (D10)
- Save Changes submit → `PATCH /api/videos/[id]` e, se houver arquivo escolhido, `POST /api/videos/[id]/thumbnail`; depois `router.refresh()`
- PrivacyOption click/setas → seleção local até salvar
- Publish click → `POST /api/videos/[id]/publish`; botão desabilitado/oculto se `status≠ready` ou já publicado
- Cancel click → navegação client para `/studio/videos` descartando edições
- Ícone de copiar "Video link" click → copia o link no cliente (sem I/O)

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `VIDEO_NOT_FOUND` | not-found da rota |
| `VIDEO_NOT_OWNED` | _TBD — implementer decides per screen_ |
| `CATEGORY_NOT_FOUND` | Erro inline no Category select; recarregar categorias |
| `INVALID_FILE_TYPE` | Erro inline abaixo da ThumbUpload ("apenas imagens") |
| `THUMBNAIL_SIZE_EXCEEDED` | Erro inline abaixo da ThumbUpload ("máx. 5MB") |
| `INVALID_VIDEO_STATE` | Mensagem de formulário; desabilita Publish e atualiza Status via `router.refresh()` |
| `UNAUTHORIZED` | Redirect para `/login?next=`, com tentativa de renovação via `GET /api/auth/refresh` primeiro |

**Client-side validation mirror:** _(source: §API Contracts — não há `#### Validation Rules` nesta slice; os limites de `title`/`description` vêm do `UpdateVideoDto` gerado após SI-04.13 — `_undetermined — constraints not spelled in the sibling plan_`)_
- `thumbnail`: `image/*`, máx. 5MB (espelha `INVALID_FILE_TYPE` / `THUMBNAIL_SIZE_EXCEEDED`)
- `visibility`: `public` | `unlisted`
- `categoryId`: uuid entre as opções carregadas (opcionalidade a confirmar — Open question)

**Accessibility notes:**
- PrivacyOption x2 como radio group real (`role="radiogroup"`, setas, foco visível)
- Category select com nome acessível (SectionHeader "Category" via `aria-labelledby`)
- Ícone de copiar e IconButtons só de ícone com nome acessível; "Checks complete" como live region se mudar dinamicamente
- H1 com copy de edição de vídeo (o Figma traz "Channel Settings" por engano — corrigir e anotar)
- Filename omitido (backend não expõe); "Video Quality" derivado de `height` (ex.: "1080p"), duração de `durationSeconds` — verificar na implementação e omitir o que faltar

---

#### Screen: Tela de edição do canal

**Route:** `/studio/channel`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=154-1367 (node `upxCB4CzKKTSOT9NpdAZ0u:154:1367`)
**Purpose:** "Edição das informações do canal: nickname, nome e descrição"

**Auth requirement:** Authenticated+Owner _(source: §Authorization Matrix — `GET /channels/me`, `PATCH /channels/:id`; guarda per phase-04-videos-channel-frontend/TD-01)_

**Rendering strategy:** Server Component (RSC) carrega o canal (`GET /channels/me`); formulário Client Component com `react-hook-form` + Zod; mutação por Route Handler + `router.refresh()` _(source: phase-04-videos-channel-frontend/TD-02; phase-02-auth-frontend/TD-04, TD-05, TD-06)_

**Reused DS components:**
- shell — see screen: Painel de gerenciamento de vídeos
- `components/ui/card.tsx` — Card (Channel card / Canal) — Herdado (phase-02). Container do resumo do canal e do formulário
- `components/studio/channel-summary.tsx (new)` — ChannelSummary — **D9:** somente nome e handle, alimentados pelo mesmo carregamento do formulário. Banner, avatar e contadores omitidos; sem verbo
- `components/studio/channel-settings-form.tsx (new)` — ChannelSettingsForm — Form com validação local e envio ao servidor → Server-connected como unidade. Campos: handle (nickname), display name (nome), description. Deve suportar o erro "nickname já em uso"
- `components/ui/label.tsx` — FormLabel — "Channel handle", "Display name" — Herdado (phase-02)
- `components/ui/input.tsx` — Input "Channel handle" e "Display name" — Herdado (phase-02). Altura 36. Confirmar suporte a supporting text e estado de erro no Input do repo
- `components/ui/textarea.tsx (new)` — Textarea — Description — see screen: Tela de edição de vídeo. Altura 120px, sem supporting text, contador nem label próprio
- `components/ui/button.tsx` — Cancel (outline sm) / Save Changes — Cancel descarta/volta sem I/O; Save Changes submit do form, precisa de estado pending/disabled
- `components/auth/field-error.tsx` — FieldError — reuso existente para o erro "nickname já em uso"

**Server-connected components:**
- `ChannelSettingsForm` — verbs: Carregar nickname, nome e descrição atuais do canal para pré-preencher o formulário de edição; Salvar alterações de nickname, nome e descrição do canal, rejeitando nickname já em uso | endpoint: RSC `upstream` → `GET /channels/me` (backend tier, per `phase-04-frontend-contract-gaps/TD-01`) e `PATCH /api/channels/[id]` (§API Contracts → BFF tier — see for `forwards-to` + request/response/projection) | reuse: `components/studio/channel-settings-form.tsx (new)`

**Behaviors:**

*Rendered states:*
- Loading: `loading.tsx` da rota; Save pending/disabled
- Empty: not applicable
- Success: campos pré-preenchidos; após Save, `router.refresh()` e "Last updated" reflete `updatedAt`; se o nickname mudou, sessão atualizada (`channelSlug`, per `phase-04-frontend-contract-gaps/TD-01`)
- Error: erro inline "nickname já em uso"; detalhe abaixo

*Interactions:*
- Save Changes submit → `PATCH /api/channels/[id]`; sucesso → `router.refresh()`
- Cancel click → volta sem I/O (semântica de guarda de alterações não especificada)

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `NICKNAME_ALREADY_EXISTS` | Erro inline no campo "Channel handle" (`FieldError`, `aria-invalid` + `aria-describedby`), sem sugestão automática de sufixo |
| `CHANNEL_NOT_OWNED` | _TBD — implementer decides per screen_ |
| `CHANNEL_NOT_FOUND` | not-found da rota |
| `UNAUTHORIZED` | Redirect para `/login?next=`, com tentativa de renovação via `GET /api/auth/refresh` primeiro |

**Client-side validation mirror:** _(source: §API Contracts — sem `#### Validation Rules`; limites vêm do `UpdateChannelDto` gerado após SI-04.13)_
- `nickname`: minúsculas, dígitos e underscore (formato do backend, per inventário); o "@" é só adorno visual
- `name`, `description`: `_undetermined — limits not spelled in the sibling plan_`

**Accessibility notes:**
- "Description" (h2) faz as vezes de label do textarea → `label`/`aria-labelledby`
- Erro de nickname com `aria-invalid` + `aria-describedby`
- Hierarquia: h1 "Channel Settings", h2 "Basic Information"/"Description"

---

#### Screen: Página pública do canal

**Route:** `/channel/[nickname]`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926 (node `upxCB4CzKKTSOT9NpdAZ0u:155:1926`)
**Purpose:** "Página pública do canal com informações e listagem de vídeos"

**Auth requirement:** Anonymous _(source: §Authorization Matrix — `GET /channels/:nickname`, `GET /channels/:nickname/videos`)_

**Rendering strategy:** Server Component (RSC) async lendo `searchParams.page`, renderização dinâmica sem cache, paginação numerada por links _(source: phase-04-videos-channel-frontend/TD-02, TD-03)_

**Reused DS components:**
- shell — see screen: Painel de gerenciamento de vídeos (TopNav só no estado autenticado; cabeçalho anônimo não desenhado)
- `components/channel/channel-header.tsx (new)` — ChannelHeader — Nome do canal como H1, nickname e descrição. **D9:** sem os contadores, banner nem avatar
- `components/channel/video-sort-filter.tsx (new)` — VideoSortFilter — **Desabilitado (D7):** ordenação Latest / Popular / Oldest sem capability nem suporte de backend (ordem fixa por `published_at`)
- `components/ui/filter-chip.tsx (new)` — FilterChip ×3 — **Desabilitados (D7).** Variantes active/normal no DS; no frame as 3 renderizam iguais, sem estado ativo visível
- `components/channel/video-card.tsx (new)` — VideoCard ×5 — Thumbnail, título (2 linhas), nome do canal e "212K views • 2 hours ago" (views = placeholder 0). Card inteiro linka para `/watch/[id]` (404 até fase posterior, decisão do usuário). **D9:** sem verified badge
- `components/ui/video-thumbnail.tsx (new)` — VideoThumbnail — see screen: Painel de gerenciamento de vídeos. Raster, aspecto 421.69/239, radius 16px; `next/image`
- `components/ui/pagination.tsx (new)` — Pagination — see screen: Painel de gerenciamento de vídeos

**Server-connected components:**
- `ChannelHeader` — verbs: Exibir informações públicas do canal (nome, nickname e descrição) | endpoint: RSC `upstream` → `GET /channels/{nickname}` (backend tier; sem rota FE-facing) | reuse: `components/channel/channel-header.tsx (new)`
- `VideoCard` — verbs: Exibir lista paginada de vídeos públicos publicados do canal | endpoint: RSC `upstream` → `GET /channels/{nickname}/videos` (backend tier) + `GET /api/videos/[id]/thumbnail` (§API Contracts → BFF tier — see for `forwards-to` + request/response/projection) | reuse: `components/channel/video-card.tsx (new)`

**Behaviors:**

*Rendered states:*
- Loading: `loading.tsx` da rota com skeleton do grid
- Empty: canal sem vídeos públicos — mensagem vazia (não desenhado)
- Success: header + grid de cards + paginação numerada; `views` = 0; tempo relativo de `publishedAt`
- Error: nickname inexistente → `notFound()`; demais falhas → `error.tsx`

*Interactions:*
- Card click → navegação client para `/watch/[id]` (404 até a Fase 05)
- Link de página `?page=N` → navegação de servidor da mesma rota
- Chips Latest / Popular / Oldest → desabilitados (D7)

**Error Catalog → UX mapping:**

| errorCode (from §Error Catalog) | UX treatment |
|---------------------------------|--------------|
| `CHANNEL_NOT_FOUND` | `notFound()` (página 404 do canal) |

**Client-side validation mirror:** not applicable — `page` inválido normaliza para 1.

**Accessibility notes:**
- Cada VideoCard é um único link com o título como nome acessível; `alt=""` das thumbnails dentro de link com texto
- Nome do canal é o `h1`; campo de busca da casca em `role="search"`; ordem de foco TopNav → SideNav → conteúdo
- Paginação: `nav` rotulado, `aria-current="page"`

---

#### Screen: Menu de conta do usuário (Account User Menu)

**Route:** `(studio)/*`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-1267 (node `upxCB4CzKKTSOT9NpdAZ0u:150:1267`)
**Purpose:** "Edição das informações do canal: nickname, nome e descrição" — o item "Edit Channel" é o ponto de entrada de navegação para essa edição; o menu em si não tem capability própria (casca compartilhada, sem verbo).

**Auth requirement:** Authenticated _(source: sessão — sem endpoints; guarda per phase-04-videos-channel-frontend/TD-01)_

**Rendering strategy:** Client Component (estado aberto/fechado 100% client); identidade lida da sessão via `SessionProvider` (sem fetch) _(source: phase-02-auth-frontend/TD-06)_

**Reused DS components:**
- `components/layout/account-menu-trigger.tsx (new)` — AccountMenuTrigger — Abre o AccountMenu ("shown over the Top nav after avatar click"). Só o estado de repouso existe: uma imagem de 36px, sem wrapper de botão nem hover/focus/aberto
- `components/ui/avatar.tsx (new)` — Avatar — 3 tamanhos (26/36/64): variantes de tamanho. **D16:** sem foto na sessão, usa fallback de iniciais do nickname
- `components/ui/overlay.tsx (new)` — Overlay — Backdrop de frame inteiro (`inset-0`) com o token `--overlay` (#00000080, existe no `globals.css`). Sem evidência de clique para fechar no Figma; isso fica a cargo do container do AccountMenu
- `components/layout/account-menu.tsx (new)` — AccountMenu — Painel lateral direito de 320px, altura total, fundo `--card`, drop-shadow. Estado aberto/fechado 100% client; a identidade vem da sessão (SessionProvider, sem fetch)
- `components/ui/icon-button.tsx` — IconButton (close) — Só fecha o painel; exige variante ghost (sem fundo)
- `components/icons/close-icon.tsx (new)` — CloseIcon — Glifo "close" de 24px
- `components/ui/menu-item.tsx (new)` — MenuItem "Edit Channel" — Link de navegação client-side → `/studio/channel` (D15), sem verbo. Geometria própria (ícone de 16px, padding 16px, `border-b`, sem raio), diferente do SideNavItem
- `components/icons/edit-icon.tsx (new)` — EditIcon — Glifo de 16px (lápis sobre quadrado); nome inferido do glifo

**Server-connected components:** _No server-connected components in this screen._

**Behaviors:**

*Rendered states:*
- Loading: not applicable
- Empty: not applicable
- Success: painel com "Account", bloco de perfil (`@{channelSlug}` na 1ª linha, e-mail na 2ª, avatar de iniciais) e item "Edit Channel"
- Error: not applicable

*Interactions:*
- Avatar click → abre AccountMenu (Overlay + painel)
- Ícone de fechar / clique no backdrop / Esc → fecha o painel e devolve o foco ao avatar
- "Edit Channel" click → navegação client para `/studio/channel`

**Error Catalog → UX mapping:** not applicable — sem endpoints.

**Client-side validation mirror:** not applicable.

**Accessibility notes:**
- Painel com `role="dialog"` + `aria-modal`, título "Account" como nome acessível, focus trap, foco devolvido ao avatar ao fechar, bloqueio de scroll do body
- Botão de fechar e gatilho de avatar com nome acessível (`aria-haspopup` / `aria-expanded` no gatilho); itens como `<a>`/`<button>` reais com foco visível
- Nome e handle truncam com ellipsis — expor `title`
- Sign Out omitido (D17); Logout segue adiado

---

#### Screen: Menu lateral (Left Menu)

**Route:** `(studio)/*`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959 (node `upxCB4CzKKTSOT9NpdAZ0u:150:959`)
**Purpose:** "Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status)" — servido só como ponto de entrada pelo item "Your videos"; o menu em si é casca compartilhada, sem capability própria.

**Auth requirement:** Authenticated _(source: sessão — sem endpoints; guarda per phase-04-videos-channel-frontend/TD-01)_

**Rendering strategy:** Client Component para o estado de mostrar/ocultar (hambúrguer) e para o item ativo por prefixo de rota; conteúdo estático _(source: `_No rendering architecture TD — implementer decides per screen (drift risk)._` — comportamento definido pelas OQ resolvidas)_

**Reused DS components:**
- shell — see screen: Painel de gerenciamento de vídeos (`app-shell`, `top-nav`, `side-nav`, `side-nav-item`, `side-nav-subscription-list`, ícones)
- `components/layout/subscription-nav-item.tsx (new)` — SubscriptionNavItem — see screen: Painel de gerenciamento de vídeos (placeholder estático, sem destino)
- `components/layout/side-nav.tsx (new)` — SideNav — **D14:** só a variante expandida é planejada (256px, borda direita, `overflow-clip`)
- `components/icons/home-icon.tsx (new)` — HomeIcon — Neste frame aparece PREENCHIDO (estado ativo): precisa de variantes preenchida/contorno
- `components/icons/your-videos-icon.tsx (new)` — YourVideosIcon — Só a variante contorno; falta a preenchida (o item ativo nas rotas `(studio)/*`)

**Server-connected components:** _No server-connected components in this screen._

**Behaviors:**

*Rendered states:*
- Loading: not applicable
- Empty: lista de inscrições é placeholder estático
- Success: SideNav expandida com "Your videos" ativo nas rotas `/studio/videos*` (match por prefixo, `aria-current="page"`)
- Error: not applicable

*Interactions:*
- Hambúrguer click → mostra/oculta a SideNav
- "Your videos" click → navegação client para `/studio/videos`
- Home / Subscriptions / Liked videos / itens de inscrição → sem destino (fases posteriores)

**Error Catalog → UX mapping:** not applicable — sem endpoints.

**Client-side validation mirror:** not applicable.

**Accessibility notes:**
- `<nav>` com `aria-label`; `aria-current="page"` no item ativo; hambúrguer com `aria-label`, `aria-expanded`, `aria-controls`
- Headings "You"/"Subscriptions" com nível definido ou rótulo de grupo; ícones e avatares decorativos (`alt=""`); BrandLogo como link para `/`

---

### Frontend Runtime

#### phase-04-videos-channel-frontend/TD-01 — Guarda de Rotas Autenticadas (área de gerenciamento)

**Pattern:** `proxy.ts` otimista + `requireSession()` em todo acesso a dados do servidor (defesa em profundidade). `proxy.ts` faz o redirect rápido (UX): lê o cookie `streamtube_session` (via `iron-session`) e redireciona para `/login?next=…` sem sessão válida. Um helper `requireSession()` (em `lib/auth/`) é chamado no início de **cada** RSC de dados da área e de **cada** Route Handler de mutação: redireciona (RSC) ou devolve 401 (Route Handler) quando a sessão é inválida. O parâmetro `next` é validado como same-origin antes do redirect pós-login (o Next documenta o risco de open redirect).

**Setup:**

```ts
// next-frontend/proxy.ts
export const config = { matcher: ["/studio/:path*"] };
export async function proxy(request: NextRequest) {
  // sem sessão válida no cookie streamtube_session → NextResponse.redirect(`/login?next=${pathname}${search}`)
}

// next-frontend/lib/auth/session.ts
export async function requireSession(): Promise<SessionData>; // RSC: redirect("/login?next=…"); Route Handler: 401 UNAUTHORIZED
```

**Aplicação:**

- **Adopts the pattern:** todas as rotas `(studio)/*` (`/studio/videos`, `/studio/videos/[id]/edit`, `/studio/channel`) e todo Route Handler de dados/mutação desta slice (`PATCH /api/videos/[id]`, `POST /api/videos/[id]/thumbnail`, `POST /api/videos/[id]/publish`, `PATCH /api/channels/[id]`, `POST /api/auth/login`).
- **Excludes / boundaries:**
  - `/channel/[nickname]` — página pública/anônima; não chama `requireSession()`
  - `GET /api/videos/[id]/thumbnail` — sessão opcional (anônimo vê thumbnails de vídeos publicados e públicos)
  - `GET /api/auth/refresh` — chamado exatamente quando `requireSession()`/`upstream` detecta 401 (per `phase-04-frontend-contract-gaps/TD-03`), não exige sessão válida de entrada (a validade está no refresh token do cookie)
  - rotas `(auth)/*` — inalteradas

**Migração:**

| File | Current behavior | Required change | Owning SI |
|------|-----------------|-----------------|-----------|
| `next-frontend/lib/auth/session.ts` | `SessionData` sem `channelId`; sem `requireSession()` | Adicionar `channelId` e exportar `requireSession()` | SI-04.14 (Setup) |
| `next-frontend/app/api/auth/login/route.ts` | Grava `userId`/`channelSlug` vazios | Buscar `GET /channels/me` e gravar `userId`, `channelId`, `channelSlug` (per `phase-04-frontend-contract-gaps/TD-01`) | SI-04.17 (Migration) |
| `next-frontend/app/(auth)/login/` (form de login) | Pós-login sem destino `next` | Honrar `next` validado como same-origin | SI-04.14 (Setup) |

**Verificação:**

- **Unit:** `requireSession()` redireciona/retorna 401 sem sessão; validação de `next` rejeita URLs externas e `//host`.
- **Integration:** cada Route Handler da área responde 401 sem sessão (teste que varre os handlers); cada RSC da área redireciona sem sessão.
- **E2E:** acessar `/studio/videos` sem sessão leva a `/login?next=/studio/videos` e, após login, retorna à rota.
- **Regression guards:** testes das telas de auth da Fase 02 continuam passando.

---

#### phase-04-videos-channel-frontend/TD-02 — Estratégia de Dados e Paginação das Listagens de Vídeo

**Pattern:** RSC + `searchParams` (URL como estado), paginação por links. A página é um RSC async: lê `searchParams.page`, chama `upstream.GET(…)` no servidor e renderiza a lista mais um componente de paginação numerada com `next/link` (`?page=N`). Mutações (publicar, alterar visibilidade) usam Route Handlers e disparam `router.refresh()` (padrão da `phase-02-auth-frontend/TD-06`).

**Setup:**

```tsx
// next-frontend/app/(studio)/studio/videos/page.tsx  (idem app/channel/[nickname]/page.tsx)
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  // await upstream.GET(…, { params: { query: { page: Number(page) || 1 } } })  → { items, page, pageSize, total }
}
```

**Aplicação:**

- **Adopts the pattern:** `VideoListRow` (painel), `VideoCard` (página pública) e `Pagination`; leituras de `GET /videos/{id}`, `GET /categories`, `GET /channels/me` nas páginas de edição também são feitas por RSC.
- **Excludes / boundaries:**
  - `VideoEditForm`, `ChannelSettingsForm`, `PublishButton` — mutações por Route Handler + `router.refresh()`, sem estado de dados no cliente
  - `GET /api/videos/[id]/thumbnail` — imagem servida por redirect, fora do fluxo de listagem

**Migração:** _No existing files require refactor — Setup SI is the only application of this pattern in the current phase._

**Verificação:**

- **Unit:** normalização de `page` (ausente/inválido → 1); `Pagination` renderiza `nav` rotulado com `aria-current="page"` e links `?page=N`.
- **Integration:** RSC do painel e da página pública com MSW (`mocks/handlers/videos.ts`, `mocks/handlers/channels.ts`), incluindo `total` > `pageSize`.
- **E2E:** navegar entre páginas pela URL e pelo botão voltar preserva o estado (Playwright ainda não instalado — ver riscos).
- **Regression guards:** testes existentes de auth continuam passando.

---

#### phase-04-videos-channel-frontend/TD-03 — Cache e Revalidação da Página Pública do Canal

**Pattern:** Renderização dinâmica sem cache (dados frescos a cada requisição). A página chama `upstream` a cada visita, sem `'use cache'`. Sem tags de invalidação. Não mexe em `next.config.ts` nem nas telas de auth; consistente com o layout raiz que já é dinâmico (lê `cookies()`). Reavaliar na Fase 07 (home/busca), onde tráfego e listagens compartilhadas justificam Cache Components.

**Setup:**

```ts
// next-frontend/next.config.ts — inalterado: sem `cacheComponents`; páginas sem `'use cache'`, `cacheTag` ou `export const revalidate`
```

**Aplicação:**

- **Adopts the pattern:** `/channel/[nickname]` (`ChannelHeader`, `VideoCard`) e as telas `(studio)/*`.
- **Excludes / boundaries:** nenhuma — não há cache a excluir nesta fase.

**Migração:** _No existing files require refactor — Setup SI is the only application of this pattern in the current phase._

**Verificação:**

- **Unit:** not applicable (decisão é ausência de configuração).
- **Integration:** publicar um vídeo / renomear o canal e recarregar `/channel/[nickname]` mostra o dado novo sem invalidação explícita.
- **E2E:** not applicable nesta fase.
- **Regression guards:** o build não exige `Suspense` adicional (flag `cacheComponents` não é ligada).

---

#### phase-04-frontend-contract-gaps/TD-03 — Renovação de token em Server Components

**Pattern:** RSC trata `401` redirecionando para um Route Handler que renova o token via refresh single-flight e volta ao destino, com `next` validado como same-origin. `cookies()` só lê cookies de entrada em Server Components — ler/gravar cookies de saída é exclusivo de Server Functions e Route Handlers (confirmado na documentação do Next.js 16.2.2, `docs/01-app/03-api-reference/04-functions/cookies.mdx`), então um RSC não pode renovar a sessão sozinho. O Route Handler `GET /api/auth/refresh` reaproveita o helper de refresh single-flight já decidido na Fase 02 (`phase-02-auth-frontend/TD-03`) e limita o custo ao caso raro de token expirado.

**Setup:**

```ts
// next-frontend/app/api/auth/refresh/route.ts
export async function GET(request: Request) {
  const next = new URL(request.url).searchParams.get("next");
  // validar next como same-origin (rejeitar URLs absolutas e "//host")
  // await withRefresh(...) — reaproveita o helper single-flight de lib/auth/refresh.ts
  // sucesso → NextResponse.redirect(next); falha → NextResponse.redirect(`/login?next=${next}`)
}
```

**Aplicação:**

- **Adopts the pattern:** todo RSC desta slice que chama `upstream` diretamente e pode receber `401` (`/studio/videos`, `/studio/videos/[id]/edit`, `/studio/channel`, `/channel/[nickname]`).
- **Excludes / boundaries:**
  - Route Handlers de mutação (`PATCH /api/videos/[id]`, etc.) — já usam `withRefresh()` diretamente (per `phase-02-auth-frontend/TD-03`), sem precisar de redirect
  - `GET /api/videos/[id]/thumbnail` — sessão opcional, não força renovação

**Migração:**

| File | Current behavior | Required change | Owning SI |
|------|-----------------|-----------------|-----------|
| `next-frontend/lib/api/authed-upstream.ts` | Chama `upstream` com o access token da sessão, sem tratar `401` fora de Route Handler | Em contexto de RSC, um `401` do upstream dispara `redirect('/api/auth/refresh?next=…')` em vez de tentar `withRefresh()` diretamente | SI-04.14 (Setup) |

**Verificação:**

- **Unit:** validação de `next` rejeita URLs externas e `//host` (mesma regra do TD-01).
- **Integration:** `GET /api/auth/refresh` com refresh token válido renova a sessão e redireciona a `next`; com refresh token inválido, redireciona a `/login?next=`.
- **E2E:** um RSC que recebe `401` do upstream não quebra a renderização — o usuário é redirecionado e volta à página original após a renovação.
- **Regression guards:** o helper de refresh single-flight da Fase 02 (`lib/auth/refresh.ts`) e seus testes continuam inalterados — este Route Handler o consome, não o substitui.

---

### UI ↔ API Traceability Matrix

| Verb | Component | Screen | Endpoint (from API Contracts) | TD ref |
|------|-----------|--------|-------------------------------|--------|
| Exibir lista paginada de vídeos do canal com thumbnail, título, visualizações, likes, comentários, tempo de publicação e status | VideoListRow | /studio/videos | RSC `upstream` → `GET /channels/{id}/manage/videos`; thumbnail: `GET /api/videos/[id]/thumbnail` → forwards-to `GET /videos/{id}/thumbnail` | phase-04-videos-channel-frontend/TD-02, TD-05 |
| Abrir a edição de um vídeo a partir da linha do painel | VideoListRow | /studio/videos | — _(navegação client para `/studio/videos/[id]/edit`; sem chamada)_ | phase-04-videos-channel-frontend/TD-01 |
| Exibir categorias de vídeo disponíveis para escolha | Category select | /studio/videos/[id]/edit | RSC `upstream` → `GET /categories` | phase-04-videos-channel-frontend/TD-02 |
| Carregar as informações atuais do vídeo para edição | VideoEditForm | /studio/videos/[id]/edit | RSC `upstream` → `GET /videos/{id}` | phase-04-frontend-contract-gaps/TD-02 |
| Salvar título, descrição e categoria editados do vídeo | Save Changes Button | /studio/videos/[id]/edit | `PATCH /api/videos/[id]` → forwards-to `PATCH /videos/{id}` | phase-02-auth-frontend/TD-05; phase-04-frontend-contract-gaps/TD-02 |
| Enviar thumbnail customizada do vídeo | Save Changes Button | /studio/videos/[id]/edit | `POST /api/videos/[id]/thumbnail` → forwards-to `POST /videos/{id}/thumbnail` | phase-02-auth-frontend/TD-05 |
| Definir visibilidade do vídeo como público ou unlisted | Save Changes Button | /studio/videos/[id]/edit | `PATCH /api/videos/[id]` → forwards-to `PATCH /videos/{id}` | phase-02-auth-frontend/TD-05; phase-04-frontend-contract-gaps/TD-02 |
| Exibir se o vídeo está apto para publicação | Status | /studio/videos/[id]/edit | RSC `upstream` → `GET /videos/{id}` | phase-04-frontend-contract-gaps/TD-02 |
| Publicar vídeo em rascunho (ação única, só quando processado e ainda não publicado) | PublishButton | /studio/videos/[id]/edit | `POST /api/videos/[id]/publish` → forwards-to `POST /videos/{id}/publish` | phase-02-auth-frontend/TD-05 |
| Carregar nickname, nome e descrição atuais do canal para pré-preencher o formulário de edição | ChannelSettingsForm | /studio/channel | RSC `upstream` → `GET /channels/me` | phase-04-frontend-contract-gaps/TD-01 |
| Salvar alterações de nickname, nome e descrição do canal, rejeitando nickname já em uso | ChannelSettingsForm | /studio/channel | `PATCH /api/channels/[id]` → forwards-to `PATCH /channels/{id}` | phase-02-auth-frontend/TD-05, TD-06 |
| Exibir informações públicas do canal (nome, nickname e descrição) | ChannelHeader | /channel/[nickname] | RSC `upstream` → `GET /channels/{nickname}` | phase-04-videos-channel-frontend/TD-02, TD-03 |
| Exibir lista paginada de vídeos públicos publicados do canal | VideoCard | /channel/[nickname] | RSC `upstream` → `GET /channels/{nickname}/videos`; thumbnail: `GET /api/videos/[id]/thumbnail` → forwards-to `GET /videos/{id}/thumbnail` | phase-04-videos-channel-frontend/TD-02, TD-03, TD-05 |

_Capabilities marked in `## Non-UI / Deferred Capabilities` are excluded from this matrix._

---

<!-- phase-a-complete -->

## Dependency Map

Bootstrap de componentes (`(new)` do inventário):

```
SI-04.0.1 (root — install shadcn)
├── SI-04.0.2 — depends on SI-04.0.1 (testes dos primitives)
SI-04.0.3, SI-04.0.4, SI-04.0.5, SI-04.0.7, SI-04.0.8 (roots — custom-ui: filter-chip, menu-item, overlay, section-header, video-thumbnail)
SI-04.0.9, SI-04.0.10, SI-04.0.11 (roots — ícones)
SI-04.0.19, SI-04.0.21 (roots — privacy-option, video-config-card)
SI-04.0.6 — depends on SI-04.0.10 (search-field usa search-icon)
SI-04.0.12 — depends on SI-04.0.1, SI-04.0.6, SI-04.0.10 (casca props-driven)
SI-04.0.13 — depends on SI-04.0.1, SI-04.0.8, SI-04.0.9, SI-04.0.11 (estúdio props-driven)
SI-04.0.14 — depends on SI-04.0.3, SI-04.0.8 (canal props-driven)
SI-04.0.15 — depends on SI-04.0.1, SI-04.0.4, SI-04.0.5, SI-04.0.9 (account-menu)
SI-04.0.16 — depends on SI-04.0.9, SI-04.0.10, SI-04.0.11, SI-04.0.12 (side-nav)
└── SI-04.0.17 — depends on SI-04.0.12, SI-04.0.15, SI-04.0.16 (app-shell)
SI-04.0.18 — depends on SI-04.0.1 (channel-settings-form)
SI-04.0.20 — depends on SI-04.0.8 (thumb-upload)
SI-04.0.22 — depends on SI-04.0.1, SI-04.0.7, SI-04.0.19, SI-04.0.20, SI-04.0.21 (video-edit-form)
```

Backend, contrato e Frontend Runtime:

```
SI-04.10 (root — STORAGE_PUBLIC_ENDPOINT)
└── SI-04.11 — depends on SI-04.10 (thumbnail + updatedAt)
    └── SI-04.12 — depends on SI-04.11 (channels/me + detalhe do vídeo, per contract-gaps/TD-01, TD-02)
        └── SI-04.13 — depends on SI-04.11, SI-04.12 (openapi sync → types.gen.ts)
            ├── SI-04.17 — depends on SI-04.14, SI-04.12, SI-04.13 (login grava canal na sessão)
            ├── SI-04.19 — depends on SI-04.13, SI-04.14 (aliases, authed-upstream + redirect de refresh, next/image)
            └── SI-04.20 — depends on SI-04.13 (handlers MSW)
SI-04.14 (root — proxy.ts + requireSession + safe-next)
├── SI-04.15 — depends on SI-04.0.2 (RSC + paginação)
├── SI-04.16 (root — sem cache)
├── SI-04.18 — depends on SI-04.14, SI-04.17 (verificação da guarda)
└── SI-04.21 — depends on SI-04.14 (Setup: GET /api/auth/refresh, per contract-gaps/TD-03)
    └── SI-04.22 — depends on SI-04.14, SI-04.19, SI-04.21 (verificação da cadeia RSC 401 → refresh)
```

Telas (cross-layer: Xb depende dos SIs de backend/BFF que entregam seus endpoints):

```
SI-04.30.0 — depends on SI-04.0.9, .0.10, .0.11, .0.12, .0.15, .0.16, .0.17
└── SI-04.30a
    └── SI-04.30b — depends on SI-04.30a, SI-04.14 (layout (studio) + requireSession)
        ├── SI-04.31.0 — depends on SI-04.0.1, .0.4, .0.5, .0.9, .0.12, .0.15
        │   └── SI-04.31a
        │       └── SI-04.31b — depends on SI-04.31a, SI-04.30b, SI-04.17
        ├── SI-04.32.0 — depends on SI-04.0.1, .0.6, .0.8, .0.9, .0.10, .0.11, .0.13
        │   └── SI-04.32a
        │       └── SI-04.32b — depends on SI-04.32a, SI-04.30b, SI-04.11, SI-04.15, SI-04.16, SI-04.19, SI-04.21, SI-04.20
        ├── SI-04.33.0 — depends on SI-04.0.1, .0.7, .0.19, .0.20, .0.21, .0.22
        │   └── SI-04.33a
        │       └── SI-04.33b — depends on SI-04.33a, SI-04.30b, SI-04.11, SI-04.12, SI-04.15, SI-04.16, SI-04.19, SI-04.21, SI-04.20, SI-04.32b
        ├── SI-04.34.0 — depends on SI-04.0.1, .0.13, .0.18
        │   └── SI-04.34a
        │       └── SI-04.34b — depends on SI-04.34a, SI-04.30b, SI-04.12, SI-04.17, SI-04.15, SI-04.16, SI-04.19, SI-04.20, SI-04.21
        └── SI-04.35.0 — depends on SI-04.0.1, .0.3, .0.8, .0.14
            └── SI-04.35a
                └── SI-04.35b — depends on SI-04.35a, SI-04.30b, SI-04.11, SI-04.32b, SI-04.15, SI-04.16, SI-04.19, SI-04.20
```

---

## Deliverables

- [ ] SI-04.0.1 — Infra: install batch shadcn primitives
- [ ] SI-04.0.2 — Tests shadcn batch (≤5 files)
- [ ] SI-04.0.3 — Custom-ui: filter-chip.tsx
- [ ] SI-04.0.4 — Custom-ui: menu-item.tsx
- [ ] SI-04.0.5 — Custom-ui: overlay.tsx
- [ ] SI-04.0.6 — Custom-ui: search-field.tsx
- [ ] SI-04.0.7 — Custom-ui: section-header.tsx
- [ ] SI-04.0.8 — Custom-ui: video-thumbnail.tsx
- [ ] SI-04.0.9 — Custom-business simple group: close, comment, edit, filter, home icons
- [ ] SI-04.0.10 — Custom-business simple group: liked-videos, menu, mic, plus, search icons
- [ ] SI-04.0.11 — Custom-business simple group: sort, subscriptions, thumbs-up, views, your-videos icons
- [ ] SI-04.0.12 — Custom-business simple group: casca
- [ ] SI-04.0.13 — Custom-business simple group: studio
- [ ] SI-04.0.14 — Custom-business simple group: channel
- [ ] SI-04.0.15 — Custom-business complex: account-menu.tsx
- [ ] SI-04.0.16 — Custom-business complex: side-nav.tsx
- [ ] SI-04.0.17 — Custom-business complex: app-shell.tsx
- [ ] SI-04.0.18 — Custom-business complex: channel-settings-form.tsx
- [ ] SI-04.0.19 — Custom-business complex: privacy-option.tsx
- [ ] SI-04.0.20 — Custom-business complex: thumb-upload.tsx
- [ ] SI-04.0.21 — Custom-business complex: video-config-card.tsx
- [ ] SI-04.0.22 — Custom-business complex: video-edit-form.tsx
- [ ] SI-04.10 — Backend: STORAGE_PUBLIC_ENDPOINT e cliente S3 de assinatura
- [ ] SI-04.11 — Backend: GET /videos/:id/thumbnail e updatedAt nas respostas
- [ ] SI-04.12 — Backend: GET /channels/me e detalhe do vídeo enriquecido
- [ ] SI-04.13 — Pré-requisito: sincronizar openapi.json e regenerar types.gen.ts
- [ ] SI-04.14 — Guarda de rotas autenticadas (Setup): proxy.ts + requireSession() + validação de next
- [ ] SI-04.15 — Estratégia de dados e paginação (Setup): RSC + searchParams
- [ ] SI-04.16 — Cache da página pública (Setup): renderização dinâmica sem cache
- [ ] SI-04.17 — app/api/auth/login/route.ts → Guarda de rotas autenticadas (dados do canal na sessão)
- [ ] SI-04.18 — Guarda de rotas autenticadas (Verification)
- [ ] SI-04.19 — BFF: aliases de contrato, upstream autenticado e next/image
- [ ] SI-04.20 — MSW: handlers de vídeos, canais e categorias
- [ ] SI-04.21 — Renovação de token em Server Components (Setup): GET /api/auth/refresh
- [ ] SI-04.22 — Renovação de token em Server Components (Verification)
- [ ] SI-04.30.0 — Drift audit: Menu lateral (Left Menu)
- [ ] SI-04.30a — Tela de Menu lateral (Left Menu) (visual shell)
- [ ] SI-04.30b — Tela de Menu lateral (Left Menu) (lógica & wiring)
- [ ] SI-04.31.0 — Drift audit: Menu de conta do usuário (Account User Menu)
- [ ] SI-04.31a — Tela de Menu de conta do usuário (Account User Menu) (visual shell)
- [ ] SI-04.31b — Tela de Menu de conta do usuário (Account User Menu) (lógica & wiring)
- [ ] SI-04.32.0 — Drift audit: Painel de gerenciamento de vídeos
- [ ] SI-04.32a — Tela de Painel de gerenciamento de vídeos (visual shell)
- [ ] SI-04.32b — Tela de Painel de gerenciamento de vídeos (lógica & wiring)
- [ ] SI-04.33.0 — Drift audit: Tela de edição de vídeo
- [ ] SI-04.33a — Tela de edição de vídeo (visual shell)
- [ ] SI-04.33b — Tela de edição de vídeo (lógica & wiring)
- [ ] SI-04.34.0 — Drift audit: Tela de edição do canal
- [ ] SI-04.34a — Tela de edição do canal (visual shell)
- [ ] SI-04.34b — Tela de edição do canal (lógica & wiring)
- [ ] SI-04.35.0 — Drift audit: Página pública do canal
- [ ] SI-04.35a — Página pública do canal (visual shell)
- [ ] SI-04.35b — Página pública do canal (lógica & wiring)

**Per-screen deliverables:**

- [ ] Screen Painel de gerenciamento de vídeos (/studio/videos) is routable
- [ ] Screen Painel de gerenciamento de vídeos (/studio/videos) renders loading, success, and error states
- [ ] Screen Painel de gerenciamento de vídeos (/studio/videos) passes component tests (per testing-guide-next-frontend layers)
- [ ] Screen Tela de edição de vídeo (/studio/videos/[id]/edit) is routable
- [ ] Screen Tela de edição de vídeo (/studio/videos/[id]/edit) renders loading, success, and error states
- [ ] Screen Tela de edição de vídeo (/studio/videos/[id]/edit) passes component tests (per testing-guide-next-frontend layers)
- [ ] Screen Tela de edição do canal (/studio/channel) is routable
- [ ] Screen Tela de edição do canal (/studio/channel) renders loading, success, and error states
- [ ] Screen Tela de edição do canal (/studio/channel) passes component tests (per testing-guide-next-frontend layers)
- [ ] Screen Página pública do canal (/channel/[nickname]) is routable
- [ ] Screen Página pública do canal (/channel/[nickname]) renders loading, success, and error states
- [ ] Screen Página pública do canal (/channel/[nickname]) passes component tests (per testing-guide-next-frontend layers)
- [ ] Screen Menu de conta do usuário ((studio)/*) is routable
- [ ] Screen Menu de conta do usuário ((studio)/*) passes component tests (per testing-guide-next-frontend layers)
- [ ] Screen Menu lateral ((studio)/*) is routable
- [ ] Screen Menu lateral ((studio)/*) passes component tests (per testing-guide-next-frontend layers)

**Full test suites:**

- [ ] Backend tests pass (`docker compose exec nestjs-api npm test`)
- [ ] Backend integration tests pass (`docker compose exec nestjs-api npm run test:integration`)
- [ ] E2E tests pass (`docker compose exec nestjs-api npm run test:e2e`)
- [ ] Type/compilation checks pass (`docker compose exec nestjs-api npx tsc --noEmit`)
- [ ] Lint passes (`docker compose exec nestjs-api npm run lint`)
- [ ] Frontend tests pass (`docker compose exec next-frontend npm test`)
- [ ] Frontend E2E tests pass (`docker compose exec next-frontend npm run test:e2e`)
- [ ] Type/compilation checks pass (`docker compose exec next-frontend npx tsc --noEmit`)
- [ ] Lint passes (`docker compose exec next-frontend npm run lint`)
