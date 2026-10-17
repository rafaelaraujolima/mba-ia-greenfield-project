# phase-06-social-interactions — Screen Inventory

> **Phase:** Interações Sociais
> **Status:** Validated
> **Date:** 2026-10-08
> **Screens in scope:** 3

---

> Escopo: apenas componentes e verbos da Fase 06. Chrome e componentes já inventariados nas Fases 04 e 05 (TopNav, SideNav shell, player, descrição, sidebar de sugestões, grid de vídeos) ficam fora; ver `screen-inventory-phase-04-videos-channel-frontend.md` e `screen-inventory-phase-05-video-watch-page.md`.

## Screen: Página de visualização do vídeo
**Route:** /watch/[id]
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/FC-Tube?node-id=152-2219

### Component inventory
| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| VideoReactionButtons — pill dividida: "like action" (152:2461), contador (152:2462, "1.2K"), dislike (152:2470, só ícone), divisor 1px (152:2469) | Server-connected | ✗ | `components/watch/video-reaction-buttons.tsx (new)` | Fill secondary, borda `border`, altura 41. Contagem compacta ("1.2K"). Dislike sem contagem. Estado do espectador vem do RSC (TD-06); mutação com `useOptimistic` + `router.refresh()` (TD-08). Só o estado inativo está desenhado |
| ThumbsDownIcon (165:2379 / 165:2384, 24px; 16px nos comentários) | Presentational | ✗ | `components/icons/thumbs-down-icon.tsx (new)` | Ausente no DS (só `thumbs-up-icon.tsx` existe). Usado no vídeo e nos comentários. Mesmo traço do thumbs-up; precisa de variante preenchida para o estado ativo |
| SubscribeButton (156:3972) | Server-connected | ✗ | `components/social/subscribe-button.tsx (new)` | Pill primary (999px), rótulo "Subscribe" Label/MD, min-w 80, no bloco do autor após nome e contagem de inscritos. Envolve `components/ui/button.tsx`. Compartilhado com a página do canal (see screen: Página pública do canal). Só o estado "não inscrito" está desenhado |
| CommentsSection — container + cabeçalho "4,256 Comments" (2732:2116, texto 158:3836) | Server-connected | ✗ | `components/social/comments-section.tsx (new)` | Cabeçalho H2 (20px semibold); contagem com separador de milhar. Dona da lista e do "carregar mais" por cursor keyset (TD-05), que não está desenhado |
| CommentSortLabel — "Sort by: Latest" (158:3856; ícone 158:3848) | Presentational | ✗ | new | Rótulo estático "Mais recentes" (decisão do usuário: só uma ordenação). Sem menu |
| CommentForm — linha de novo comentário (158:3857; avatar 158:3858, input 158:3860 "Add a comment...") | Server-connected | ✗ | `components/social/comment-form.tsx (new)` | Avatar 40px (`components/ui/avatar.tsx`) + input só com borda inferior (`components/ui/input.tsx`/`textarea.tsx`). Sem botões enviar/cancelar nem estados focus/digitando desenhados. Corpo em texto puro (TD-09). Reutilizado no Reply com `parentId` |
| CommentItem (158:3862, wrapper 158:3886; avatar 158:3863, autor 158:3885, corpo 158:3869, ações 2732:2115) | Server-connected | ✗ | `components/social/comment-item.tsx (new)` | "@DevStudent99" 14px, tempo relativo 12px muted. Só um comentário de topo desenhado; sem aninhados |
| CommentReactionButtons — like (158:3871, "245"), dislike (158:3877, só ícone) | Server-connected | ✗ | `components/social/comment-reaction-buttons.tsx (new)` | Ícones 16px sem fundo; contagem simples 12px muted. Sem estado ativo desenhado |
| ReplyButton (158:3882) | Local-interactive | ✓ | `components/ui/button.tsx` | Ghost pill 28px, "Reply" 14px muted. Só alterna o formulário de resposta; a mutação acontece no submit do CommentForm. Não há frame do formulário nem da thread |

### Verbs of intent
| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| curtir vídeo | VideoReactionButtons (152:2461) | Like e dislike em vídeos (usuários autenticados) |
| descurtir vídeo | VideoReactionButtons (152:2470) | Like e dislike em vídeos (usuários autenticados) |
| inscrever-se no canal | SubscribeButton (156:3972) | Inscrição em canais (seguir/deixar de seguir) |
| cancelar inscrição no canal | SubscribeButton (156:3972) | Inscrição em canais (seguir/deixar de seguir) |
| listar comentários | CommentsSection (2732:2116) | Comentários em vídeos (usuários autenticados) |
| enviar comentário | CommentForm (158:3857) | Comentários em vídeos (usuários autenticados) |
| curtir comentário | CommentReactionButtons (158:3871) | Like e dislike em comentários (usuários autenticados) |
| descurtir comentário | CommentReactionButtons (158:3877) | Like e dislike em comentários (usuários autenticados) |
| responder comentário | CommentForm (158:3857) via ReplyButton (158:3882) | Respostas a comentários (comentários aninhados) |

### Observations
- Estados desenhados: apenas o padrão/inativo de cada controle. Não desenhados: like/dislike ativo (vídeo e comentário), "Subscribed", foco/digitação/envio do input, estado vazio, loading/skeleton, erro, "carregar mais", kebab de comentário (editar/excluir) e a thread de respostas. Só um comentário aparece.
- Estados ativos ("curtido", "Inscrito") não existem no Figma; derivá-los dos tokens existentes: ícone preenchido para like/dislike ativo e variante secondary do `components/ui/button.tsx` para "Inscrito" (rótulos em português: "Inscrever-se"/"Inscrito"). Interaction: `aria-pressed` nos toggles.
- Dislike (vídeo e comentário) não exibe contagem no Figma; a UI não expõe contagem de dislikes. A API ainda precisa informar o estado do espectador.
- Formatos de contagem: likes do vídeo e inscritos em notação compacta ("1.2K", "9.88K"), total de comentários com separador de milhar ("4,256"), likes de comentário simples ("245"). Requer formatadores (`Intl.NumberFormat`).
- A contagem de inscritos (152:2454) pertence ao `components/watch/channel-info.tsx` (Fase 05) e deve atualizar após a mutação via `router.refresh()`. O SubscribeButton fica dentro do bloco do autor, então `channel-info.tsx` precisa de um slot para ele.
- Usuário dono do canal do vídeo: Subscribe oculto, decidido no RSC; a API rejeita auto-inscrição (decisão do usuário).
- Anônimo: contagens visíveis para todos; like/dislike/subscribe/comentar/responder exigem login (redirect ou prompt, nenhum desenhado). A linha de novo comentário mostra avatar, ou seja, assume espectador logado; não há variante anônima.
- Interaction: o ReplyButton revela um CommentForm inline com `parentId` abaixo do comentário, profundidade máxima 2 (TD-04); respostas como CommentItems recuados atrás de um toggle "Ver N respostas". Nada disso está desenhado (ver Open questions).
- a11y: botões de ícone precisam de `aria-label`; o input de comentário precisa de rótulo acessível (só há placeholder no Figma); o total de comentários é um heading.
- Reuse: ReplyButton, avatar e input reutilizam `components/ui/*`; ícone de ordenação (`sort-icon.tsx`) só se o rótulo "Sort by" mantiver o glifo.
- Capability "Comentários em vídeos (usuários autenticados)" cobre a escrita; a leitura é pública (visão geral do projeto), então "listar comentários" fica mapeado a ela mesmo para anônimos.

## Screen: Página pública do canal
**Route:** /channel/[nickname]
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=155-1926

### Component inventory
| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| ChannelHeader (156:3513; conteúdo 156:3514, info 156:3515) | Server-connected | ✓ | `components/channel/channel-header.tsx` | Componente existente sendo ESTENDIDO (a Fase 04 omitiu Subscribe/sino/contadores, D9). Linha de meta 156:3518: "@TechMasteryPlus • 2.4M subscribers • 1.2K videos" (Inter 16/24, muted). Precisa da contagem de inscritos e do estado de inscrição do espectador vindos do RSC (TD-06, TD-02) |
| SubscribeButton (instância Button 156:3536) | Server-connected | ✗ | `components/social/subscribe-button.tsx (new)` | Pill preenchida primary (999px), "Subscribe" Label/MD, padding 16/8, min-w 80 (~100x36). Só o estado não inscrito desenhado. Mesmo componente da página de vídeo (see screen: Página de visualização do vídeo). Envolve `components/ui/button.tsx` |
| SubscriberCount — texto "2.4M subscribers" (156:3521) | Server-connected | ✗ | new | Texto simples na linha de meta, dentro do ChannelHeader, separado por "•" (156:3520). Contagem por COUNT na leitura (TD-02), notação compacta |

### Verbs of intent
| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| inscrever-se no canal | SubscribeButton (156:3536) | Inscrição em canais (seguir/deixar de seguir) |
| cancelar inscrição no canal | SubscribeButton (156:3536) | Inscrição em canais (seguir/deixar de seguir) |
| exibir contagem de inscritos | ChannelHeader (156:3513) / SubscriberCount (156:3521) | Contagem de inscritos na página do canal |
| exibir estado de inscrição do espectador | SubscribeButton (156:3536) | Interface completa de comentários, likes e inscrições |

### Observations
- Desenhado e relevante: Subscribe (somente não inscrito), sino (158:2691), "2.4M subscribers", "1.2K videos". O contador de vídeos não é capability da Fase 06 e não entra na tabela; já pode ser derivado de dados existentes.
- Sino (158:2691, IconButton 44x44, fill `secondary` + borda `border`, 999px) **omitido** por decisão do usuário (igual à D9 da Fase 04). Notificações ficam para outra fase, que exigiria `components/icons/bell-icon.tsx (new)`.
- Estados não desenhados: inscrito, hover, foco, loading/otimista, erro. "Inscrito" deriva da variante secondary de `components/ui/button.tsx` (rótulos "Inscrever-se"/"Inscrito").
- Dono do canal vendo a própria página: Subscribe oculto, decidido no RSC; API rejeita auto-inscrição (decisão do usuário).
- Anônimo: vê a contagem; o clique em Subscribe deve levar ao login. A página pública não tem chrome de autenticação hoje e nenhum prompt está desenhado.
- Interaction: mutação com `useOptimistic` + `router.refresh()` (TD-08), atualizando a contagem de inscritos.
- a11y: Subscribe como `<button>` com `aria-pressed` (ou nome acessível que muda); contagem atualizada em região `aria-live="polite"`.
- Banner, avatar, abas ("Video", "About") e selo de verificado não são Phase 06 e permanecem omitidos (D9 da Fase 04).
- Reuse: `ChannelHeader` já existe (Fase 04 `(new)` promovido para existente).

## Screen: Menu lateral (Left Menu)
**Route:** (studio)/*
**Figma:** https://www.figma.com/design/upxCB4CzKKTSOT9NpdAZ0u/?node-id=150-959

### Component inventory
| Component (Figma node) | Type | In DS? | Reuse? | Notes |
|---|---|---|---|---|
| SideNavSectionHeading — "Subscriptions" (62:1670, texto 62:1671) | Presentational | ✓ | `components/layout/side-nav-subscription-list.tsx` | Inter semibold 18/28; texto estático no topo da lista, dentro do contêiner 62:1669 |
| SideNavSubscriptionList (62:1672) | Server-connected | ✓ | `components/layout/side-nav-subscription-list.tsx` | Componente existente com placeholder estático (`PLACEHOLDER_SUBSCRIPTIONS`), substituído por dados reais: RSC busca os canais seguidos do usuário (TD-06). Pilha vertical, gap 8px, 6 itens no Figma |
| SubscriptionNavItem ×6 (62:1673, 62:1677, 62:1681, 62:1685, 62:1689, 62:1693) | Presentational | ✓ | `components/layout/subscription-nav-item.tsx` | Link por canal; dados vêm do pai. Linha 38px, padding 14px, radius 8px, avatar 26px, gap 28px, nome Inter 16/24 em largura fixa de 147px (exige `truncate`). Destino: `/channel/[nickname]` |
| SubscriptionAvatar (62:1675, 62:1679, 62:1683, 62:1687, 62:1691, 62:1695) | Presentational | ✓ | `components/ui/avatar.tsx` | Círculo 26px, só imagem; sem fallback desenhado, usar o fallback de iniciais do componente |
| SideNavItem "Subscriptions" (62:1630) | Presentational | ✓ | `components/layout/side-nav-item.tsx` | Item de navegação de 46px com ícone e rótulo; aponta para `/subscriptions` (sem protótipo no Figma). Estados ativo/hover/foco não desenhados |

### Verbs of intent
| Verb | Component | Capability (project-plan.md) |
|---|---|---|
| listar canais seguidos pelo usuário | SideNavSubscriptionList (62:1672) | Área de canais seguidos com acesso rápido aos vídeos |
| acessar vídeos dos canais seguidos | SideNavItem "Subscriptions" (62:1630) → `/subscriptions` | Área de canais seguidos com acesso rápido aos vídeos |

### Observations
- Itens desenhados (6): Lofi man, Juxtopposed, Olivier Larose, Techo Tips, Hydra Gaming, Lora Gaming; cada um com avatar e nome apenas.
- Não desenhados: indicador de conteúdo novo, "Show more", "Browse channels", estado vazio, loading, hover e ativo nos itens de inscrição, truncamento de nome.
- Política adotada (decisão do usuário): limite fixo de 10 canais (inscrição mais recente primeiro); o restante pelo item "Subscriptions" → `/subscriptions`; sem inscrições, a seção é ocultada; sem indicador de conteúdo novo; avatar com fallback de iniciais.
- Interaction: item ativo reutiliza o padrão do Home (fundo `--card`) quando a rota atual for o canal; hover com token neutro.
- A capability "Inscrição em canais (seguir/deixar de seguir)" não tem controle nesta tela; o menu apenas reflete o resultado. A lista deve ser atualizada após seguir/deixar de seguir (`router.refresh()`).
- Anônimo ou falha na busca do RSC (TD-06): ocultar a seção em vez de quebrar o shell. O menu existe somente no shell `(studio)`; páginas públicas (/watch, /channel) não têm chrome.
- Somente a variante expandida é planejada: a descrição do SideNav cita uma variante recolhida, mas só a expandida está desenhada neste frame (D14 da Fase 04).
- O destino `/subscriptions` não tem frame no Figma (confirmado pelo usuário); ver Open questions.

## Reconciliation summary

| Component | Screens | Classification | Reuse? |
|---|---|---|---|
| SubscribeButton | Página de visualização do vídeo, Página pública do canal | Server-connected (consistente) | `components/social/subscribe-button.tsx (new)` |
| ThumbsDownIcon | Página de visualização do vídeo | Presentational | `components/icons/thumbs-down-icon.tsx (new)` |
| VideoReactionButtons | Página de visualização do vídeo | Server-connected | `components/watch/video-reaction-buttons.tsx (new)` |
| CommentsSection, CommentForm, CommentItem, CommentReactionButtons | Página de visualização do vídeo | Server-connected | `components/social/*.tsx (new)` |
| ChannelHeader | Página pública do canal | Server-connected (estendido) | `components/channel/channel-header.tsx` |
| SideNavSubscriptionList, SubscriptionNavItem | Menu lateral | Server-connected / Presentational (existentes, dados reais) | `components/layout/*.tsx` |

- Componentes novos (`(new)`): 7 arquivos de componente (`subscribe-button`, `video-reaction-buttons`, `comments-section`, `comment-form`, `comment-item`, `comment-reaction-buttons`, `thumbs-down-icon`).
- Itens `new` (DOM puro): CommentSortLabel, SubscriberCount.
- Verbos server-connected: 15 linhas em 3 telas, cobrindo as 8 capabilities do slice.

## Open questions

- **OQ-1 — `/subscriptions` sem design.** TD-07 (Opção B) prevê uma página de feed `/subscriptions`, mas não existe frame no Figma (confirmado pelo usuário). A capability "Área de canais seguidos com acesso rápido aos vídeos" fica coberta apenas pela lista no menu (acesso a canais, não a vídeos). Definir como o feed será composto (reuso de `video-card`) ou adiar o feed.
- **OQ-2 — Profundidade das respostas.** TD-04 assume `parent_id` com profundidade máxima 2, mas o Figma só desenha o botão Reply: não há formulário nem thread. Confirmar o desenho (formulário inline com `parentId`, toggle "Ver N respostas") ou registrar como drift.
- **OQ-3 — Leitura de comentários por anônimos.** A capability "Comentários em vídeos (usuários autenticados)" menciona autenticação, mas a leitura é pública. Confirmar o mapeamento de "listar comentários" a essa capability.
- **OQ-4 — Estados ativos não desenhados.** Like/dislike ativo, "Inscrito", foco/erro/loading e estado vazio de comentários serão derivados dos tokens e variantes existentes (sem frame no Figma).
- **OQ-5 — Contrato do backend.** Auto-inscrição deve ser rejeitada pela API; TD-03 exige estender `authedUpstream` com PUT/DELETE; o estado do espectador (curtido/inscrito) precisa vir na resposta de vídeo, canal e lista de comentários.
