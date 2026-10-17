# phase-05-video-watch-page — Screen Inventory

> **Phase:** Página de Visualização do Vídeo
> **Status:** Validated
> **Date:** 2026-09-30
> **Screens in scope:** 1

---

## Screen: Página de visualização do vídeo

**Route:** `/watch/[id]`
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219 (node `upxCB4CzKKTSOT9NpdAZ0u:152:2219`)
**Purpose (from project-plan.md):** "Layout da página: vídeo principal + informações + sidebar com sugestões"

### Component inventory

| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| TopNav (62:1858 / 152:2221) | Local-interactive | ✓ | `components/layout/top-nav.tsx` | shared chrome |
| BrandLogo (3050:135) | Presentational | ✓ | `components/auth/brand-logo.tsx` | — |
| SearchField (152:2221;62:1878/1879) | Local-interactive | ✓ | `components/ui/search-field.tsx` | — |
| Voice search IconButton (62:1883) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | — |
| Create IconButton (70:31, "add") | Local-interactive | ✓ | `components/ui/icon-button.tsx` | — |
| Account Avatar (62:1892/1893) | Presentational | ✓ | `components/ui/avatar.tsx` | logged-in user avatar |
| VideoPlayer container (152:2323 / 108:304) | Server-connected | ✗ | `components/video/video-player.tsx (new)` | carrega/reproduz o stream a partir do Object Storage; container pai |
| PlayPauseButton (108:262) | Local-interactive | ✗ | `components/ui/icon-button.tsx` | opera sobre mídia já carregada |
| Sound/Volume control (108:266) | Local-interactive | ✗ | `components/ui/slider.tsx (new)` | TD-01: construído sobre o primitivo `Slider` do `radix-ui` |
| Progress bar / scrubber (108:249 "timeline") | Local-interactive | ✗ | `components/ui/slider.tsx (new)` | mesma TD-01, instância diferente |
| Fullscreen/settings/caption icons (108:276–108:294) | Local-interactive | ✗ | new | chrome do player; mapeamento ícone→função inferido do screenshot, não confirmado por nome de layer |
| VideoTitle (152:2442) | Presentational | ✗ | new | texto simples |
| ChannelAvatar (2409:2276) | Presentational | ✓ | `components/ui/avatar.tsx` | avatar do canal do vídeo |
| ChannelInfo — nome do canal (152:2449) | Server-connected | ✗ | new | exibe o nome do canal vindo com os dados do vídeo |
| ShareButton (158:2697) | Local-interactive | ✓ | `components/ui/button.tsx` | compartilhar/copiar link, sem I/O |
| MoreOptionsButton — kebab (158:2855) | Local-interactive | ✓ | `components/ui/icon-button.tsx` | abre menu de overflow |
| DownloadAction (sub-item do menu 158:2855) | Server-connected | ✗ | new | **Nota:** `get_design_context` não expõe os itens do menu expandido; localização exata do botão "Download" dentro do kebab não confirmada — confirmar na implementação (SI de wiring) |
| DescriptionCard wrapper (158:4025) | Presentational | ✓ | `components/ui/card.tsx` | — |
| ViewCount text (152:2490, "10K views") | Server-connected | ✗ | new | — |
| UploadDate text (152:2491, "3 weeks ago") | Server-connected | ✗ | new | — |
| DescriptionText body (152:2493) | Server-connected | ✗ | new | descrição do vídeo vinda do backend |
| "Show More" toggle (152:2493, texto final) | Local-interactive | ✗ | new | expande/recolhe texto já carregado |
| TabMenu — chips de categoria/canal (156:3978) | Server-connected | ✗ | `components/ui/tab-menu.tsx (new)` | filtra as sugestões da sidebar |
| VideoCard ×5 (158:3729, 158:3767, 158:3784, 158:3802, 158:3819) | Server-connected | ✓ | `components/channel/video-card.tsx` | lista de sugestões da sidebar |
| VerifiedBadge icon (I158:3729;143:2541 etc.) | Presentational | ✗ | new | selo ao lado do nome do canal nos cards da sidebar |

### Verbs of intent

| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| Carregar e reproduzir o stream de vídeo a partir do Object Storage | VideoPlayer container | "Player de vídeo com controles: play/pause, volume e barra de progresso" |
| Exibir nome do canal do vídeo | ChannelInfo | "Layout da página: vídeo principal + informações + sidebar com sugestões" |
| Exibir data de publicação do vídeo | UploadDate text | "Layout da página: vídeo principal + informações + sidebar com sugestões" |
| Disparar download do vídeo | DownloadAction | "Botão de download do vídeo" |
| Exibir contagem de visualizações do vídeo | ViewCount text | "Contagem de visualizações" |
| Exibir descrição do vídeo | DescriptionText body | "Descrição do vídeo com expansão/recolhimento" |
| Filtrar sugestões de vídeo por categoria/canal | TabMenu | "Sugestões de vídeos da mesma categoria na sidebar" |
| Exibir lista de vídeos sugeridos da mesma categoria na sidebar | VideoCard ×5 | "Sugestões de vídeos da mesma categoria na sidebar" |

### Observations

- **Acesso anônimo à visualização de vídeos** e **Vídeos unlisted acessíveis apenas via link direto** não têm componente próprio — são comportamentos de rota/visibilidade (a página renderiza sem exigir sessão; o acesso unlisted depende só de ter o link, sem listagem) a serem implementados no RSC da página, não um componente visual. Coberto na Reconciliation summary sem componente.
- O Figma modela a tela completa incluindo **comentários** (header com contagem, controle de ordenação, input, lista de itens, reações), **like/dislike** e **botão de inscrição (Subscribe)** — nenhuma dessas funcionalidades está entre as 8 capabilities da Fase 05; todas pertencem explicitamente à Fase 06 ("Like e dislike em vídeos", "Comentários em vídeos", "Respostas a comentários", "Inscrição em canais", "Contagem de inscritos"). **Excluídas deste inventário** (não aparecem na tabela de componentes nem nos verbs) — ficam para o inventário da Fase 06, quando essa fase for planejada.
- Um botão "next/skip" (nó 108:264) foi identificado no player mas não pôde ser confirmado nem pelo usuário nem pela evidência do Figma — **removido do inventário** por ora; se necessário, adicionar em uma extensão futura.
- `get_design_context` truncou antes de resolver totalmente o cluster de ícones de chrome do player (configurações/legendas/fullscreen, nós 108:276–108:294); o mapeamento ícone→função foi inferido do screenshot (um ícone de engrenagem, um de câmera/legenda, um de expandir), não confirmado por nome de layer.
- Nenhum componente de slider/range existe ainda no DS (confirmado contra o snapshot do filesystem e a TD-01); tanto a barra de progresso quanto o controle de volume precisam de `components/ui/slider.tsx`, construído sobre o primitivo `Slider` do `radix-ui` (já instalado).

---

## Reconciliation summary

| Capability (project-plan.md) | Covered by | Screens |
|---|---|---|
| "Player de vídeo com controles: play/pause, volume e barra de progresso" | VideoPlayer container, PlayPauseButton, Sound/Volume control, Progress bar/scrubber | /watch/[id] |
| "Layout da página: vídeo principal + informações + sidebar com sugestões" | VideoTitle, ChannelInfo, UploadDate text, TabMenu, VideoCard ×5 | /watch/[id] |
| "Descrição do vídeo com expansão/recolhimento" | DescriptionText body, "Show More" toggle | /watch/[id] |
| "Contagem de visualizações" | ViewCount text | /watch/[id] |
| "Sugestões de vídeos da mesma categoria na sidebar" | TabMenu, VideoCard ×5 | /watch/[id] |
| "Acesso anônimo à visualização de vídeos" | — (comportamento de rota: RSC sem `requireSession()`, não um componente) | /watch/[id] |
| "Botão de download do vídeo" | DownloadAction | /watch/[id] |
| "Vídeos unlisted acessíveis apenas via link direto (sem aparecer em listagens)" | — (comportamento de rota/visibilidade, não um componente) | /watch/[id] |

## Open questions

- Confirmar a localização exata do item "Download" dentro do menu de overflow (kebab, nó 158:2855) — `get_design_context` não expõe os itens do menu expandido.
- Confirmar o mapeamento ícone→função do cluster de chrome do player (configurações/legendas/fullscreen, nós 108:276–108:294) — inferido do screenshot, não confirmado por nome de layer.
