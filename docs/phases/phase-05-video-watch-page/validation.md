---
kind: phase
name: phase-05-video-watch-page
status: clean
issue_count: 0
sources_mtime:
  docs/phases/phase-05-video-watch-page/context.md: "2026-10-04T18:08:05-04:00"
  docs/decisions/technical-decisions-video-watch-page.md: "2026-10-04T09:36:07-04:00"
issues:
  - id: MD-1
    status: resolved
    summary: "Layout da página (vídeo + informações + sidebar) has no covering TD"
    resolved_by: video-watch-page/TD-04
  - id: MD-2
    status: resolved
    summary: "Descrição do vídeo com expansão/recolhimento has no covering TD"
    resolved_by: video-watch-page/TD-05
  - id: MD-3
    status: resolved
    summary: "Acesso anônimo à visualização de vídeos has no covering TD"
    resolved_by: video-watch-page/TD-04, video-watch-page/TD-06
  - id: MD-4
    status: resolved
    summary: "Botão de download do vídeo has no covering TD"
    resolved_by: video-watch-page/TD-07
  - id: MD-5
    status: resolved
    summary: "Vídeos unlisted acessíveis apenas via link direto has no covering TD"
    resolved_by: video-watch-page/TD-08
  - id: OQ-1
    status: resolved
    summary: "Localização exata do botão Download dentro do menu de overflow (kebab)"
    resolved_by: clarification
  - id: OQ-2
    status: resolved
    summary: "Mapeamento ícone→função do cluster de chrome do player (settings/captions/fullscreen)"
    resolved_by: clarification
  - id: UIG-1
    status: resolved
    summary: "Acesso anônimo à visualização de vídeos has TD coverage but no inventory verb"
    resolved_by: non_ui_capability
  - id: UIG-2
    status: resolved
    summary: "Vídeos unlisted acessíveis apenas via link direto has TD coverage but no inventory verb"
    resolved_by: non_ui_capability
---

# phase-05-video-watch-page — Validation

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

_None._ _(OQ-1, OQ-2 resolved by user clarification — see `## Resolved Issues`. The underlying inventory file still contains its own "## Open questions" prose verbatim, per the hard rule that this stage never edits inventories; the merge step correctly suppresses re-raising them since the prior revision already marked them resolved.)_

### UI Coverage Gaps

_None._ _(UIG-1, UIG-2 resolved — both capabilities now appear in `## Non-UI / Deferred Capabilities` with Status: non-ui, so Check 7's exclusion condition applies.)_

### Custom rule findings

_(no rules loaded in `docs/rules/plan-validate/`)_

## Resolved Issues

- **MD-1** _(resolved_by video-watch-page/TD-04)_ — Capability "Layout da página: vídeo principal + informações + sidebar com sugestões" now has a covering TD (composition/rendering strategy reusing the validated `phase-04-videos-channel-frontend` pattern).
- **MD-2** _(resolved_by video-watch-page/TD-05)_ — Capability "Descrição do vídeo com expansão/recolhimento" now has a covering TD (`<details>`/`<summary>` native interaction).
- **MD-3** _(resolved_by video-watch-page/TD-04, video-watch-page/TD-06)_ — Capability "Acesso anônimo à visualização de vídeos" now has covering TDs (anonymous RSC rendering, no `requireSession()`).
- **MD-4** _(resolved_by video-watch-page/TD-07)_ — Capability "Botão de download do vídeo" now has a covering TD (`<a>` link + BFF passthrough route).
- **MD-5** _(resolved_by video-watch-page/TD-08)_ — Capability "Vídeos unlisted acessíveis apenas via link direto" now has a covering TD (unified anonymous visibility rule across `findOne`/`stream`/`download`/`thumbnail`).
- **OQ-1** _(resolved_by clarification)_ — User confirmed: "Download" is a standalone button/icon (`DownloadAction`), not an item nested inside an overflow/kebab menu.
- **OQ-2** _(resolved_by clarification)_ — User confirmed standard icon order for the player's chrome cluster: Configurações (gear) → Legendas (CC) → Fullscreen (expand).
- **UIG-1** _(resolved_by non_ui_capability)_ — Capability "Acesso anônimo à visualização de vídeos" marked non-ui in `context.md`'s `## Non-UI / Deferred Capabilities`. Rationale: route/architecture behavior, not a rendered component.
- **UIG-2** _(resolved_by non_ui_capability)_ — Capability "Vídeos unlisted acessíveis apenas via link direto" marked non-ui in `context.md`'s `## Non-UI / Deferred Capabilities`. Rationale: backend visibility rule + listing-query filter, no distinct visual component.
