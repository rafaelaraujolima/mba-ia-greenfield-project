---
kind: phase
name: phase-07-home-search-finalization
status: clean
issue_count: 0
sources_mtime:
  docs/phases/phase-07-home-search-finalization/context.md: "2026-10-14T19:28:23-04:00"
  docs/decisions/technical-decisions-home-search-finalization.md: "2026-10-14T19:20:42-04:00"
issues:
  - id: ICC-1
    status: resolved
    summary: "TD-05 expõe a área de seguidos nas páginas públicas, contra social-interactions/TD-07"
    resolved_by: social-interactions/TD-07
  - id: UIG-1
    status: resolved
    summary: "'Layout responsivo' tem TD mas nenhum verbo no inventário"
    resolved_by: non_ui_capability
  - id: UIG-2
    status: resolved
    summary: "'Testes dos fluxos principais' tem TD mas nenhum verbo no inventário"
    resolved_by: non_ui_capability
  - id: UIG-3
    status: resolved
    summary: "'Ambiente de produção e deploy' tem TD mas nenhum verbo no inventário"
    resolved_by: non_ui_capability
  - id: AMB-1
    status: resolved
    summary: "'Fluxos principais' dos testes não estão enumerados"
    resolved_by: home-search-finalization/TD-07
  - id: AMB-2
    status: resolved
    summary: "Escopo de telas e breakpoints do layout responsivo indefinidos"
    resolved_by: home-search-finalization/TD-06
  - id: OQ-1
    status: resolved
    summary: "TD-01 pendente — contrato da listagem pública e da busca"
    resolved_by: home-search-finalization/TD-01
  - id: OQ-2
    status: resolved
    summary: "TD-02 pendente — técnica de busca por título e canal"
    resolved_by: home-search-finalization/TD-02
  - id: OQ-3
    status: resolved
    summary: "TD-03 pendente — paginação da home e dos resultados"
    resolved_by: home-search-finalization/TD-03
  - id: OQ-4
    status: resolved
    summary: "TD-04 pendente — contagem de visualizações no grid"
    resolved_by: home-search-finalization/TD-04
  - id: OQ-5
    status: resolved
    summary: "TD-05 pendente — header/navbar e shell nas páginas públicas"
    resolved_by: home-search-finalization/TD-05
  - id: OQ-6
    status: resolved
    summary: "TD-06 pendente — shell em dispositivos móveis"
    resolved_by: home-search-finalization/TD-06
  - id: OQ-7
    status: resolved
    summary: "TD-07 pendente — estratégia de testes dos fluxos principais"
    resolved_by: home-search-finalization/TD-07
  - id: OQ-8
    status: resolved
    summary: "TD-08 pendente — topologia do ambiente de produção"
    resolved_by: home-search-finalization/TD-08
  - id: OQ-9
    status: resolved
    summary: "TD-09 pendente — pipeline de CI/CD"
    resolved_by: home-search-finalization/TD-09
  - id: OQ-10
    status: resolved
    summary: "Inventário: chips de categoria também em /search?"
    resolved_by: home-search-finalization/TD-01
  - id: OQ-11
    status: resolved
    summary: "Inventário: /search sem q redireciona ou lista tudo?"
    resolved_by: home-search-finalization/TD-01
  - id: OQ-12
    status: resolved
    summary: "Inventário: controle de paginação sem frame no Figma"
    resolved_by: home-search-finalization/TD-03
  - id: OQ-13
    status: resolved
    summary: "Inventário: SideNav em mobile depende do TD-06"
    resolved_by: home-search-finalization/TD-06
  - id: OQ-14
    status: resolved
    summary: "Inventário: SideNav para visitantes anônimos depende do TD-05"
    resolved_by: home-search-finalization/TD-05
  - id: OQ-15
    status: resolved
    summary: "TD-10 pendente — cache e revalidação da home e da busca"
    resolved_by: home-search-finalization/TD-10
---

# phase-07-home-search-finalization — Validation

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

- **ICC-1** _(resolved_by social-interactions/TD-07)_ — `TD-05` leva o `SideNav` com a área de seguidos às páginas públicas; revisão registrada em `social-interactions/TD-07` (2026-10-14): a área de seguidos passa a aparecer no shell das páginas públicas para usuários logados, e o visitante anônimo continua sem ela.
- **UIG-1** _(resolved_by non_ui_capability)_ — "Layout responsivo para dispositivos móveis" marcado non-ui. Rationale: _[manual — edit context.md to add details]_.
- **UIG-2** _(resolved_by non_ui_capability)_ — "Testes dos fluxos principais da plataforma" marcado non-ui. Rationale: _[manual — edit context.md to add details]_.
- **UIG-3** _(resolved_by non_ui_capability)_ — "Ambiente de produção e deploy" marcado non-ui. Rationale: _[manual — edit context.md to add details]_.
- **AMB-1** _(resolved_by home-search-finalization/TD-07)_ — Fluxos principais dos testes: cadastro/confirmação/login; upload → publicar → assistir; comentar, reagir e inscrever-se; buscar e navegar home → busca → vídeo. Registrado na decisão do TD-07 (Option C).
- **AMB-2** _(resolved_by home-search-finalization/TD-06)_ — Responsividade: telas públicas (home, busca, vídeo, canal) abaixo do breakpoint `md`; o studio permanece desktop-first. Registrado na decisão do TD-06.
- **OQ-1** _(resolved_by home-search-finalization/TD-01)_ — Option A: um `GET /videos` com `q`/`categoryId`/`page`/`pageSize`.
- **OQ-2** _(resolved_by home-search-finalization/TD-02)_ — Option A: `ILIKE` + índice GIN `pg_trgm`.
- **OQ-3** _(resolved_by home-search-finalization/TD-03)_ — Option A: offset com links `?page=`, RSC + `searchParams`.
- **OQ-4** _(resolved_by home-search-finalization/TD-04)_ — Option A: `MGET` em lote no Redis por página.
- **OQ-5** _(resolved_by home-search-finalization/TD-05)_ — Option A: grupo `(public)` com o mesmo `AppShell`.
- **OQ-6** _(resolved_by home-search-finalization/TD-06)_ — Option A: mobile-first, `SideNav` em gaveta.
- **OQ-7** _(resolved_by home-search-finalization/TD-07)_ — Option C: MSW por tela + smoke full-stack curto.
- **OQ-8** _(resolved_by home-search-finalization/TD-08)_ — Option A: Compose de produção em uma VM + proxy reverso.
- **OQ-9** _(resolved_by home-search-finalization/TD-09)_ — Option A: GitHub Actions com deploy a partir de `main`.
- **OQ-10** _(resolved_by home-search-finalization/TD-01)_ — Os chips de categoria aparecem também em `/search`, que aceita `categoryId` junto de `q`.
- **OQ-11** _(resolved_by home-search-finalization/TD-01)_ — `/search` sem `q` redireciona para `/`.
- **OQ-12** _(resolved_by home-search-finalization/TD-03)_ — O controle de paginação é derivado de `components/common/pagination-links.tsx`, sem frame no Figma (drift consciente).
- **OQ-13** _(resolved_by home-search-finalization/TD-06)_ — Em mobile o `SideNav` é uma gaveta aberta pelo botão de menu e que fecha ao navegar.
- **OQ-14** _(resolved_by home-search-finalization/TD-05)_ — O `SideNav` do visitante anônimo mostra só itens públicos (Home); Subscriptions, Your videos, Liked videos e a lista de canais seguidos ficam ocultos até o login.
- **OQ-15** _(resolved_by home-search-finalization/TD-10)_ — Option A: renderização dinâmica sem cache na home e na busca (reavalia `phase-04-videos-channel-frontend/TD-03` e `TD-02`, mantendo o comportamento).
