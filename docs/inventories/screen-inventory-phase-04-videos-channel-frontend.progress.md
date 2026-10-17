# phase-04-videos-channel-frontend — Screen Inventory Progress

**Status:** completed
**Screens:** 6/6 completed

## Reconciled screen list

| # | Screen name                              | URL (fileKey:nodeId)              | Status    |
|---|------------------------------------------|-----------------------------------|-----------|
| 1 | Painel de gerenciamento de vídeos        | upxCB4CzKKTSOT9NpdAZ0u:152:1824   | completed |
| 2 | Tela de edição de vídeo                  | upxCB4CzKKTSOT9NpdAZ0u:156:2790   | completed |
| 3 | Tela de edição do canal                  | upxCB4CzKKTSOT9NpdAZ0u:154:1367   | completed |
| 4 | Página pública do canal                  | upxCB4CzKKTSOT9NpdAZ0u:155:1926   | completed |
| 5 | Menu de conta do usuário (Account User Menu) | upxCB4CzKKTSOT9NpdAZ0u:150:1267 | completed |
| 6 | Menu lateral (Left Menu)                 | upxCB4CzKKTSOT9NpdAZ0u:150:959    | completed |

## Screens removed as out-of-scope

_None._

## Decisions log

- ✓ [DECISION 1: Edição de vídeo — página própria ou modal/drawer?] — resolved: página própria, rota `/studio/videos/[id]/edit` (applies to screen 2)
- ✓ [DECISION 2: Onde fica a ação Publicar?] — resolved: na tela de edição de vídeo (not in the panel row) (applies to screen 2)
- ✓ [DECISION 3: Edição de canal — tela própria ou seção/dialog?] — resolved: tela própria, rota `/studio/channel` (applies to screen 3)
- ✓ [DECISION 4: Rotas propostas] — resolved: confirmed — `/studio/videos` (1), `/studio/videos/[id]/edit` (2), `/studio/channel` (3), `/channel/[nickname]` (4)
- ✓ [DECISION 5: Header autenticado com avatar/logout] — resolved: "Logout" is not in the slice's `covers_capabilities`; register any logout affordance in Observations / Open questions, no verb of intent
- ✓ [DECISION 6: Casca do app (TopNav/SideNav) — busca global, voz, "+", lista de inscrições, Subscriptions/Liked videos] — resolved: (a) casca inventariada uma vez como `components/layout/*`; controles sem capability inertes/estáticos, sem verbos (applied to screens 1–4)
- ✓ [DECISION 7: Filtro/busca/ordenação — painel e chips da página pública] — resolved: (a) renderizar desabilitados e registrar em Open questions; Type Local-interactive (applied to screens 1 and 4)
- ✓ [DECISION 8: Kebab de ações da linha do painel] — resolved: (a) omitir; a linha inteira leva à edição (applied to screen 1: rows RowActionsButton/KebabIcon removed)
- ✓ [DECISION 9: Extras sociais/sem dado — Subscribe, sino, contadores, verified badge, abas, banner/avatar, resumo do canal] — resolved: (a) omitir; resumo do canal na edição vira Presentational (nome + nickname) sem verbo (applied to screens 3 and 4)
- ✓ [DECISION 10: Thumbnail — quando enviar] — resolved: (a) envio no Save Changes; Change Thumbnail Button Local-interactive (applied to screen 2)
- ✓ [DECISION 11: Publicar sem arte no Figma + Status "Checks complete"] — resolved: (a) PublishButton próprio (Server-connected) + Status reflete elegibilidade (Server-connected) (applied to screen 2)
- ✓ [DECISION 12: Ícone de views do painel] — resolved: (a) criar `components/icons/views-icon.tsx (new)` (applied to screen 1)
- ✓ [DECISION 13: Account User Menu e Left Menu (extension run) — componentes de casca sem rota própria] — resolved: inventariados como "telas" de casca compartilhada com pseudo-rota `(studio)/*` (todas as rotas autenticadas; a casca também aparece na página pública para usuário logado); qualquer affordance de Logout entra como observação, sem verbo (decisão 5) (applies to screens 5 and 6)
- ✓ [DECISION 14: Variante recolhida do SideNav (componente 62:1580)] — resolved: planejar só a expandida; a recolhida e o comportamento do hambúrguer viram Open question (sem gastar cota do Figma) (applied to screen 6)
- ✓ [DECISION 15: Destino do item "Edit Channel" e item "Channel settings" na SideNav] — resolved: "Edit Channel" → `/studio/channel`; a SideNav não ganha item extra (applied to screens 5 and 6)
- ✓ [DECISION 16: Origem da identidade do menu de conta] — resolved: só o que a sessão tem — `@channelSlug` + e-mail, avatar com fallback de iniciais; tudo Presentational, sem mudança de sessão nem de backend (applied to screen 5)
- ✓ [DECISION 17: Item "Sign Out" do menu de conta] — resolved: omitido; Logout segue adiado (decisão 5), registrado em Open questions (applied to screen 5: rows Sign Out / SignOutIcon removed)
- ✓ [Extension run consolidation: casca nas telas 5–6] — resolved: shell rows replaced by `see screen: Painel de gerenciamento de vídeos`; MenuTrigger unified as IconButton (ghost variant needed); SideNavHeading renamed SideNavSectionHeading; Observations of screens 1–4 updated (avatar/menu de conta/entrada para `/studio/channel`); Reconciliation summary and Open questions rewritten from scratch
- ✓ [Consolidation: shell repetido nas telas 2–4] — resolved: primeira ocorrência na tela 1; demais com `see screen: Painel de gerenciamento de vídeos`. MenuTrigger unificado como IconButton; Save Changes da tela 3 alinhado a Server-connected (regra SubmitButton da Fase 02); linhas genéricas de "Icons (glifos SVG)" das telas 3 e 4 removidas em favor das linhas por ícone da tela 1
