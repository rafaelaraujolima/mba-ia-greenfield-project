---
kind: phase
name: phase-06-social-interactions
status: clean
issue_count: 0
sources_mtime:
  docs/phases/phase-06-social-interactions/context.md: "2026-10-08T18:36:10-04:00"
  docs/decisions/technical-decisions-social-interactions.md: "2026-10-08T18:35:19-04:00"
issues:
  - id: IC-1
    status: resolved
    summary: "TD-07 Option B exige feed /subscriptions, mas o Figma não tem a tela"
    resolved_by: social-interactions/TD-07
  - id: ICC-1
    status: resolved
    summary: "TD-06 (RSC lê sessão) reverte video-watch-page/TD-06 sem supersede"
    resolved_by: video-watch-page/TD-06
  - id: AMB-1
    status: resolved
    summary: "Estado do espectador em endpoints públicos: auth opcional não definida"
    resolved_by: social-interactions/TD-06
  - id: AMB-2
    status: resolved
    summary: "Área de canais seguidos só alcançável no shell (studio), não nas públicas"
    resolved_by: social-interactions/TD-07
  - id: OQ-1
    status: resolved
    summary: "/subscriptions sem design (inventário OQ-1)"
    resolved_by: social-interactions/TD-07
  - id: OQ-2
    status: resolved
    summary: "Profundidade das respostas sem desenho (inventário OQ-2)"
    resolved_by: clarification
  - id: OQ-3
    status: resolved
    summary: "Leitura de comentários por anônimos vs capability autenticada (OQ-3)"
    resolved_by: clarification
  - id: OQ-4
    status: resolved
    summary: "Estados ativos/vazio/erro não desenhados (inventário OQ-4)"
    resolved_by: clarification
  - id: OQ-5
    status: resolved
    summary: "Contrato do backend: auto-inscrição, PUT/DELETE, estado do espectador"
    resolved_by: clarification
advisories: []
---

# phase-06-social-interactions — Validation

## Findings

### Inconsistencies

_None._

### Ambiguities

_None._

### Missing Decisions

_None._

### Dependency Gaps

_None._

### Inherited Constraint Conflicts

_None._

### Unresolved Open Questions

_None._

### UI Coverage Gaps

_None._

## Resolved Issues

- **IC-1** _(resolved_by social-interactions/TD-07)_ — TD-07 Option B exige feed `/subscriptions`, mas o Figma não tem a tela. Mantida a Opção B: a página de feed é composta com o grid de `VideoCard` existente dentro do `AppShell`; Revision anexada à TD-07.
- **ICC-1** _(resolved_by video-watch-page/TD-06)_ — TD-06 desta fase reverte `video-watch-page/TD-06`. Marcador `superseded-by: social-interactions/TD-06` inserido na TD antiga.
- **AMB-1** _(resolved_by social-interactions/TD-06)_ — Auth opcional nos endpoints públicos: token válido devolve `viewerState`; ausente, inválido ou expirado devolve 200 anônimo; o BFF faz refresh antes quando há sessão. Revision anexada à TD-06.
- **AMB-2** _(resolved_by social-interactions/TD-07)_ — A área de seguidos vive no shell `(studio)`; `/subscriptions` é renderizada com `AppShell`; sem link novo nas páginas públicas (limitação documentada na Revision da TD-07).
- **OQ-1** _(resolved_by social-interactions/TD-07)_ — Feed `/subscriptions` sem design: resolvida junto com IC-1.
- **OQ-2** _(resolved_by clarification)_ — Respostas: formulário inline com `parentId`, profundidade máxima 2 (TD-04 mantida), respostas recuadas atrás do toggle "Ver N respostas", carregadas sob demanda.
- **OQ-3** _(resolved_by clarification)_ — Leitura de comentários pública; escrita, resposta e reação exigem login. "Listar comentários" fica mapeado a "Comentários em vídeos (usuários autenticados)".
- **OQ-4** _(resolved_by clarification)_ — Estados ativos, foco, erro, loading e vazio derivados dos tokens e variantes existentes (ícone preenchido no ativo, variante secondary do Button em "Inscrito", mensagens muted); registrado como drift consciente.
- **OQ-5** _(resolved_by clarification)_ — Requisitos do plano: API rejeita auto-inscrição com erro de domínio; `authedUpstream` ganha PUT/DELETE (TD-03); `viewerState` nas respostas de vídeo, canal e comentários (TD-06 + revisão AMB-1).
