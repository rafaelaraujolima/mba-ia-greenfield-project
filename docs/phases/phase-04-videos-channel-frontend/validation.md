---
kind: phase
name: phase-04-videos-channel-frontend
status: clean
issue_count: 0
sources_mtime:
  docs/phases/phase-04-videos-channel-frontend/context.md: "2026-09-26T09:35:26-04:00"
  docs/decisions/technical-decisions-phase-04-videos-channel-frontend.md: "2026-09-24T19:42:10-04:00"
  docs/project-plan.md: "2026-09-17T19:27:23-04:00"
  docs/decisions/technical-decisions-phase-04-videos-channel.md: "2026-09-23T14:42:22-04:00"
issues:
  - id: IC-1
    status: resolved
    summary: "TD-01 is Scope: Frontend but UI Inventory is deferred — orphaned in plan"
    resolved_by: marker_frontend_runtime
  - id: IC-2
    status: resolved
    summary: "TD-02 is Scope: Frontend but UI Inventory is deferred — orphaned in plan"
    resolved_by: marker_frontend_runtime
  - id: IC-3
    status: resolved
    summary: "TD-03 is Scope: Frontend but UI Inventory is deferred — orphaned in plan"
    resolved_by: marker_frontend_runtime
  - id: AMB-1
    status: resolved
    summary: "UI ownership of video category/visibility/publish controls undefined"
    resolved_by: clarification
  - id: AMB-2
    status: resolved
    summary: "Video card navigation target depends on Phase 05 watch page"
    resolved_by: clarification
  - id: DG-1
    status: resolved
    summary: "No step regenerates openapi.json / FE types for Phase 03-04 endpoints"
    resolved_by: clarification
  - id: OQ-1
    status: resolved
    summary: "TD-01 pending — Guarda de Rotas Autenticadas"
    resolved_by: phase-04-videos-channel-frontend/TD-01
  - id: OQ-2
    status: resolved
    summary: "TD-02 pending — Dados e Paginação das Listagens de Vídeo"
    resolved_by: phase-04-videos-channel-frontend/TD-02
  - id: OQ-3
    status: resolved
    summary: "TD-03 pending — Cache e Revalidação da Página Pública do Canal"
    resolved_by: phase-04-videos-channel-frontend/TD-03
  - id: OQ-4
    status: resolved
    summary: "TD-04 pending — Endpoint Público de Storage para URLs Pré-assinadas"
    resolved_by: phase-04-videos-channel-frontend/TD-04
  - id: OQ-5
    status: resolved
    summary: "TD-05 pending — Entrega de Thumbnails à UI"
    resolved_by: phase-04-videos-channel-frontend/TD-05
  - id: OQ-6
    status: resolved
    summary: "Numbered pagination control has no Figma design (panel + public page)"
    resolved_by: clarification
  - id: OQ-7
    status: resolved
    summary: "Publish button and Status variants have no Figma art"
    resolved_by: clarification
  - id: OQ-8
    status: resolved
    summary: "Wrong copy in video-edit screen (H1 'Channel Settings') and channel mock values"
    resolved_by: clarification
  - id: OQ-9
    status: resolved
    summary: "Panel status variants and empty/loading/error states not designed"
    resolved_by: clarification
  - id: OQ-10
    status: resolved
    summary: "Form states missing (validation, nickname taken, pending/success, thumbnail)"
    resolved_by: clarification
  - id: OQ-11
    status: resolved
    summary: "Inert/disabled controls by decision (D6/D7) need capability + backend support"
    resolved_by: clarification
  - id: OQ-12
    status: resolved
    summary: "Elements omitted by decision (D8/D9) return with later phases"
    resolved_by: clarification
  - id: OQ-13
    status: resolved
    summary: "Navigation / authenticated chrome gaps (no /studio/channel entry, no logout)"
    resolved_by: clarification
  - id: OQ-14
    status: resolved
    summary: "Video cards link to /watch/[id], which is a 404 until Phase 05"
    resolved_by: clarification
  - id: OQ-15
    status: resolved
    summary: "Fields possibly unsupported by backend (duration, filename, quality, updated)"
    resolved_by: clarification
  - id: OQ-16
    status: resolved
    summary: "UI language and relative number/date formatting undefined"
    resolved_by: clarification
  - id: OQ-17
    status: resolved
    summary: "Minor design details to confirm (icon, spacing, sample data, breakpoints)"
    resolved_by: clarification
  - id: OQ-18
    status: resolved
    summary: "Planned (new) components trigger bootstrap SIs — confirm scope with plan-build"
    resolved_by: clarification
  - id: OQ-19
    status: resolved
    summary: "Logout deferred although the account menu design already draws Sign Out (D17)"
    resolved_by: clarification
  - id: OQ-20
    status: resolved
    summary: "Account menu is a drawer and its identity differs from Figma (D15/D16)"
    resolved_by: clarification
  - id: OQ-21
    status: resolved
    summary: "Left Menu: collapsed variant, hamburger behavior and active state undefined"
    resolved_by: clarification
advisories: []
---

# phase-04-videos-channel-frontend — Validation

## Findings

### Inconsistencies

_None._ (`## UI Inventory` is populated, so the Scope-Subsection orphan check does not apply; every verb in the UI ↔ Capability Join cites one of the 8 capabilities of this slice.)

### Ambiguities

_None._

### Missing Decisions

_None._ (All 8 capability bullets map to at least one TD in `## Capability Coverage` — the first four through the sibling slice's TDs. The FE↔BE contract-sync strategy is inherited from `next-frontend-openapi-typing/TD-01..05` and `openapi-docs-nestjs/TD-02`.)

### Dependency Gaps

_None._

### Inherited Constraint Conflicts

_None._

### Unresolved Open Questions

_None._

### UI Coverage Gaps

_None._ (All 8 capabilities have at least one verb in the UI ↔ Capability Join.)

### Capability Consistency

_None._ All 8 `covers_capabilities` entries of this slice match a bullet in `project-plan.md` Fase 04 verbatim; the sibling slice `phase-04-videos-channel` declares none.

## Cross-slice Advisories

_None._ The union of `covers_capabilities` across the two slices of Phase 04 covers all 8 bullets (the previous MC-cross-1..4 no longer apply: this slice now claims them).

## Resolved Issues

- **IC-1** _(resolved_by marker_frontend_runtime)_ — TD `phase-04-videos-channel-frontend/TD-01` re-classified as `Renders in: frontend-runtime`; UI Inventory body flipped to the logic-only placeholder. Decisions Detail + Decisions Index row patched in context.md. The user's remark on this issue ("preciso remover essa obrigação de Figma") is recorded as a separate follow-up task: make `/screen-inventory` (and dependents) accept a source other than Figma so a slice can reach `ui_in_scope: true` without a Figma file; not addressed in this run. _(Superseded in practice: the slice reached `ui_in_scope: true` with a real Figma inventory.)_
- **IC-2** _(resolved_by marker_frontend_runtime)_ — TD `phase-04-videos-channel-frontend/TD-02` re-classified as `Renders in: frontend-runtime`; UI Inventory body already logic-only (coalesced with IC-1).
- **IC-3** _(resolved_by marker_frontend_runtime)_ — TD `phase-04-videos-channel-frontend/TD-03` re-classified as `Renders in: frontend-runtime`; UI Inventory body already logic-only (coalesced with IC-1).
- **AMB-1** _(resolved_by clarification)_ — Video category, visibility and publish controls are in scope for this slice: the edit form exposes title, description, category (`GET /categories`), visibility (`public | unlisted`) and thumbnail, and the panel exposes the one-way Publish action (`POST /videos/:id/publish`). Follow-up: extend this slice's `covers_capabilities` with the four corresponding bullets (see MC-cross-1..4). _(Done: `covers_capabilities` now lists all 8 bullets.)_
- **AMB-2** _(resolved_by clarification)_ — Video cards (public channel page and panel thumbnails/titles) link to the watch route `/watch/[id]`, which returns 404 until Phase 05 delivers the page (accepted known gap, same pattern as the Phase 02 reset-password destination). Panel rows also link to the video edit page of this slice.
- **DG-1** _(resolved_by clarification)_ — This slice's plan includes a prerequisite SI executed before any typed-contract work: export the backend `openapi.json`, run `scripts/sync-openapi.sh` and `npm run openapi:types`, and commit both artifacts per `next-frontend-openapi-typing/TD-03`.
- **OQ-1** _(resolved_by phase-04-videos-channel-frontend/TD-01)_ — TD-01 decided: Option C (`proxy.ts` otimista + `requireSession()` em todo acesso a dados do servidor).
- **OQ-2** _(resolved_by phase-04-videos-channel-frontend/TD-02)_ — TD-02 decided: Option A (RSC + `searchParams`, URL como estado, paginação por links).
- **OQ-3** _(resolved_by phase-04-videos-channel-frontend/TD-03)_ — TD-03 decided: Option A (renderização dinâmica sem cache).
- **OQ-4** _(resolved_by phase-04-videos-channel-frontend/TD-04)_ — TD-04 decided: Option A (`STORAGE_PUBLIC_ENDPOINT` só para assinar URLs de leitura).
- **OQ-5** _(resolved_by phase-04-videos-channel-frontend/TD-05)_ — TD-05 decided: Option A (`GET /videos/:id/thumbnail` 302 via BFF).
- **OQ-6** _(resolved_by clarification)_ — Numbered pagination control has no design. The implementer builds `components/ui/pagination.tsx` from the design system (numbered links `?page=N` per TD-02, labeled `nav`, `aria-current="page"`) for both `/studio/videos` and `/channel/[nickname]`; it enters the plan as a component/SI and the designer confirms afterwards.
- **OQ-7** _(resolved_by clarification)_ — Publish button and Status variants have no Figma art. Implemented from the design system: primary "Publicar" button next to Save Changes, disabled unless the video is `ready` and not yet published (one-way action); the Status shows processing / ready / published / failed with text + tokens. Art for both is recorded as pending from the designer.
- **OQ-8** _(resolved_by clarification)_ — Copy errors are corrected at implementation time and noted: the video-edit H1 becomes a video-edit title (e.g., "Edit video") instead of "Channel Settings"; Figma mock values ("@techmaster2024" as display name, sample descriptions) never reach the code; the "@" of the handle is a visual adornment and not part of the nickname value. The designer is told outside the pipeline.
- **OQ-9** _(resolved_by clarification)_ — Status and screen states are defined by the implementer from the design system: badge variants for public / unlisted / draft / processing / error (and `published_at` absent for drafts), and empty / loading / error / not-found states for the panel and the public page (empty channel, unknown nickname, anonymous header with login).
- **OQ-10** _(resolved_by clarification)_ — Form states follow the Phase 02 patterns (react-hook-form + Zod, `components/auth/field-error.tsx`, pending state that disables submit, success feedback, `aria-invalid` + `aria-describedby`), including the "nickname já em uso" error from `NICKNAME_ALREADY_EXISTS` and thumbnail upload states (sending / error / `image/*` ≤5MB limit).
- **OQ-11** _(resolved_by clarification)_ — Acknowledged, no change: inert/disabled controls (global search, voice, "+", static subscriptions list, panel filter/search/sort, public-page sort chips) stay as decided in D6/D7; activation needs a capability and backend support in a later phase.
- **OQ-12** _(resolved_by clarification)_ — Acknowledged, no change: elements omitted by D8/D9 (row kebab, Subscribe, bell, subscriber/video counters, verified badge, Video/About tabs, channel banner and avatar) return with the subscriptions phase or a banner/avatar data model.
- **OQ-13** _(resolved_by clarification)_ — User answer: "Já existe design". The navigation / authenticated-chrome design (entry to `/studio/channel`, SideNav active state, destinations for "Create" / "Upload video", account menu with Logout) already exists in Figma, but **those frames are not in the inventory** (`screen-inventory-phase-04-videos-channel-frontend.md` only holds the 4 screens; their shell is inventoried as drawn there). Until an inventory extension run adds them, the plan covers only what the 4 frames show. To bring them in: run `/screen-inventory phase-04-videos-channel-frontend` (extension run) with the URLs of those frames, then `/plan-context`, `/plan-validate`, `/plan-resolve`. Logout still has no capability in this slice's `covers_capabilities` (decision 5).
- **OQ-14** _(resolved_by clarification)_ — Acknowledged, no change: video cards link to `/watch/[id]`, a known-gap 404 until Phase 05 (same as AMB-2).
- **OQ-15** _(resolved_by clarification)_ — Fields possibly missing from the backend (thumbnail duration, Filename and Video Quality of the side card, channel "Last updated") are verified during implementation and omitted when the backend does not expose them; no new backend work in this slice beyond the `updatedAt` already planned in TD-05.
- **OQ-16** _(resolved_by clarification)_ — UI copy is English, as in Figma and the Phase 02 screens; compact numbers and relative time use the runtime's `Intl.NumberFormat` / `Intl.RelativeTimeFormat`, with no new library.
- **OQ-17** _(resolved_by clarification)_ — Minor design details (Filter icon that looks like "share", "Video Quality" / "1080p HD" collision, duration badge outside the tile, channel name in cards, desktop-only 1440px frames) are corrected at implementation from the design system, with responsive behavior defined by the implementer; the designer is told outside the pipeline.
- **OQ-18** _(resolved_by clarification)_ — All planned `(new)` components in the inventory (`components/layout/*`, `components/ui/*`, `components/studio/*`, `components/channel/*` and the icons) are materialized in this slice through bootstrap SIs (author + test), including those for inert/disabled controls, which are still rendered.
- **OQ-19** _(resolved_by clarification)_ — Logout stays deferred even though the account menu design already draws "Sign Out": the item is omitted from this slice (D17), Logout is not in `covers_capabilities`, and no change to `project-plan.md` is made. The backend contract `POST /api/auth/logout` from Phase 02 stays ready for when the capability enters a phase.
- **OQ-20** _(resolved_by clarification)_ — D15/D16 stand and the implementer defines the drawer states from the design system: the account menu is built with an accessible Dialog/Sheet primitive (focus trap, Esc and backdrop click close it, focus returns to the avatar), hover/focus/mobile/dark states follow the design system, and the avatar falls back to initials. Identity stays `@channelSlug` plus e-mail from the session, with no session-shape change.
- **OQ-21** _(resolved_by clarification)_ — Left Menu behavior is defined by the implementer from the design system: only the expanded SideNav is planned (D14); the hamburger toggles show/hide of the SideNav (no collapsed variant for now); the active item uses route-prefix matching (`/studio/videos` and `/studio/videos/*` mark "Your videos") and exposes `aria-current="page"`; the filled/outline icon variants are created by the implementer; "Create" and "Upload video" stay inert; Home, Subscriptions and Liked videos belong to future phases.
