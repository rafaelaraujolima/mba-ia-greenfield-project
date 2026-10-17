# phase-06-social-interactions — Screen Inventory Progress

**Status:** completed
**Screens:** 3/3 completed

## Reconciled screen list

| # | Screen name                              | URL (fileKey:nodeId)                  | Status    |
|---|------------------------------------------|----------------------------------------|-----------|
| 1 | Página de visualização do vídeo          | upxCB4CzKKTSOT9NpdAZ0u:152:2219        | completed |
| 2 | Página pública do canal                  | upxCB4CzKKTSOT9NpdAZ0u:155:1926        | completed |
| 3 | Menu lateral (Left Menu, `(studio)/*`)   | upxCB4CzKKTSOT9NpdAZ0u:150:959         | completed |

## Screens removed as out-of-scope

- ~~Feed `/subscriptions`~~ — user: "Não existe no Figma"
- ~~Frame de thread de respostas~~ — user: "Só o botão Reply, sem frame de respostas"

## Decisions log

- ✓ [DECISION: sino de notificações (158:2691)] — resolved: omitir (igual à D9 da Fase 04)
- ✓ [DECISION: opções de ordenação de comentários] — resolved: só "Mais recentes", rótulo estático
- ✓ [DECISION: Subscribe para o dono do canal] — resolved: ocultar (RSC) e API rejeita auto-inscrição
- ✓ [DECISION: política do menu de inscritos] — resolved: limite de 10 + `/subscriptions`; seção oculta se vazia; sem indicador de conteúdo novo; fallback de iniciais
- Consolidação: SubscribeButton unificado em `components/social/subscribe-button.tsx` (duas telas); linha de `/subscriptions` removida da tabela do menu (sem Figma); contador de vídeos do canal fora da tabela (não é Fase 06)
- Nota: a primeira rodada dos sub-agentes bateu no limite do Figma MCP; menu e canal foram reextraídos após o usuário renovar os créditos
