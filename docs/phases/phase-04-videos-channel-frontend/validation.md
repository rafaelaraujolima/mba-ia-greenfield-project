---
kind: phase
name: phase-04-videos-channel-frontend
status: clean
issue_count: 0
sources_mtime:
  docs/phases/phase-04-videos-channel-frontend/context.md: "2026-09-27T21:50:48-04:00"
  docs/decisions/technical-decisions-phase-04-videos-channel-frontend.md: "2026-09-24T19:42:10-04:00"
  docs/decisions/technical-decisions-phase-04-frontend-contract-gaps.md: "2026-09-27T21:50:31-04:00"
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

_None._ `## UI Inventory` is populated (not deferred/logic-only), so the Scope-Subsection orphan check does not apply to any `Scope: Frontend` TD (TD-01..03 of this slice's own doc, TD-03 of `phase-04-frontend-contract-gaps`). Every current-phase TD's `Capability:` field cites a bullet present in `## Scope`/`## Capability Coverage`. Every verb in the UI ↔ Capability Join cites one of the 8 capabilities of this slice.

### Ambiguities

_None._

### Missing Decisions

_None._ All 8 capability bullets now map to at least one TD in `## Capability Coverage`: "Categorias de vídeo disponíveis na plataforma" via the inherited sibling TD `phase-04-videos-channel/TD-01`; the other three video-editing bullets via the newly-decided `phase-04-frontend-contract-gaps/TD-02`. The FE↔BE contract-sync strategy (Decisão #29) is inherited from `openapi-docs-nestjs/TD-02` (Scope: Cross-layer, "OpenAPI Spec Artifact Strategy") — check does not fire.

### Dependency Gaps

_None._ The three contract gaps found while building the plan (channel-of-the-logged-in-user, video-edit field enrichment, token renewal inside RSC) are now resolved by this slice's own decided TDs (`phase-04-frontend-contract-gaps/TD-01..03`), not left as unaddressed prerequisites from a prior phase.

### Inherited Constraint Conflicts

_None._ `phase-04-frontend-contract-gaps/TD-01` extends the Phase 02 session shape (adds `channelId`) without contradicting `phase-02-auth-frontend/TD-02`'s cookie-session decision. `phase-04-frontend-contract-gaps/TD-03` explicitly reuses the single-flight refresh helper from `phase-02-auth-frontend/TD-03` rather than conflicting with it.

### Unresolved Open Questions

_None._ No TD in `## Decisions Index` is `pending`. Every bullet in `## UI Inventory → ### Open Questions from Inventory` matches, verbatim, an already-resolved OQ-6..OQ-21 from a prior revision (dropped per the merge rule — see `## Resolved Issues`).

### UI Coverage Gaps

_None._ All 8 capabilities have at least one verb in the UI ↔ Capability Join, including "Categorias de vídeo disponíveis na plataforma" (verb: "Exibir categorias de vídeo disponíveis para escolha" — Category select).

### Capability Consistency (slicing, phase mode only)

_None._ All 8 `covers_capabilities` entries of this slice match a bullet in `project-plan.md` Fase 04 verbatim (re-verified). The sibling slice `phase-04-videos-channel` declares no `covers_capabilities` (monolithic-fallback semantics — treated as covering all 8 bullets of its phase), so no mismatch to flag.

## Cross-slice Advisories

_None._ The union of `covers_capabilities` across the two slices of Phase 04 covers all 8 bullets.

## Active Suppressions

_(no rule loaded — `docs/rules/plan-validate/` is empty; section omitted per Hard rules. Included here only for completeness of this run's notes.)_

## Resolved Issues

- **IC-1** _(resolved_by marker_frontend_runtime)_ — TD `phase-04-videos-channel-frontend/TD-01` re-classified as `Renders in: frontend-runtime`; UI Inventory body flipped to the logic-only placeholder at the time. _(Superseded in practice: the slice reached `ui_in_scope: true` with a real Figma inventory.)_
- **IC-2** _(resolved_by marker_frontend_runtime)_ — TD `phase-04-videos-channel-frontend/TD-02` re-classified as `Renders in: frontend-runtime`; coalesced with IC-1.
- **IC-3** _(resolved_by marker_frontend_runtime)_ — TD `phase-04-videos-channel-frontend/TD-03` re-classified as `Renders in: frontend-runtime`; coalesced with IC-1.
- **AMB-1** _(resolved_by clarification)_ — Video category, visibility and publish controls are in scope for this slice: the edit form exposes title, description, category (`GET /categories`), visibility (`public | unlisted`) and thumbnail, and the panel exposes the one-way Publish action. `covers_capabilities` now lists all 8 bullets.
- **AMB-2** _(resolved_by clarification)_ — Video cards (public channel page and panel thumbnails/titles) link to the watch route `/watch/[id]`, which returns 404 until Phase 05 delivers the page (accepted known gap). Panel rows link to the video edit page of this slice.
- **DG-1** _(resolved_by clarification)_ — This slice's plan includes a prerequisite SI executed before any typed-contract work: export the backend `openapi.json`, run `scripts/sync-openapi.sh` and `npm run openapi:types`, and commit both artifacts per `next-frontend-openapi-typing/TD-03`.
- **OQ-1** _(resolved_by phase-04-videos-channel-frontend/TD-01)_ — TD-01 decided: Option C (`proxy.ts` otimista + `requireSession()` em todo acesso a dados do servidor).
- **OQ-2** _(resolved_by phase-04-videos-channel-frontend/TD-02)_ — TD-02 decided: Option A (RSC + `searchParams`, URL como estado, paginação por links).
- **OQ-3** _(resolved_by phase-04-videos-channel-frontend/TD-03)_ — TD-03 decided: Option A (renderização dinâmica sem cache).
- **OQ-4** _(resolved_by phase-04-videos-channel-frontend/TD-04)_ — TD-04 decided: Option A (`STORAGE_PUBLIC_ENDPOINT` só para assinar URLs de leitura).
- **OQ-5** _(resolved_by phase-04-videos-channel-frontend/TD-05)_ — TD-05 decided: Option A (`GET /videos/:id/thumbnail` 302 via BFF).
- **OQ-6** _(resolved_by clarification)_ — Numbered pagination control has no design. The implementer builds `components/ui/pagination.tsx` from the design system (numbered links `?page=N` per TD-02, labeled `nav`, `aria-current="page"`) for both `/studio/videos` and `/channel/[nickname]`.
- **OQ-7** _(resolved_by clarification)_ — Publish button and Status variants have no Figma art. Implemented from the design system: primary "Publicar" button next to Save Changes, disabled unless the video is `ready` and not yet published; the Status shows processing / ready / published / failed with text + tokens.
- **OQ-8** _(resolved_by clarification)_ — Copy errors are corrected at implementation time: the video-edit H1 becomes a video-edit title instead of "Channel Settings"; Figma mock values never reach the code; the "@" of the handle is a visual adornment.
- **OQ-9** _(resolved_by clarification)_ — Status and screen states are defined by the implementer from the design system: badge variants for public / unlisted / draft / processing / error, and empty / loading / error / not-found states for the panel and the public page.
- **OQ-10** _(resolved_by clarification)_ — Form states follow the Phase 02 patterns (react-hook-form + Zod, `components/auth/field-error.tsx`, pending state, success feedback, `aria-invalid` + `aria-describedby`), including "nickname já em uso" and thumbnail upload states.
- **OQ-11** _(resolved_by clarification)_ — Acknowledged, no change: inert/disabled controls (D6/D7) stay as decided; activation needs a capability and backend support in a later phase.
- **OQ-12** _(resolved_by clarification)_ — Acknowledged, no change: elements omitted by D8/D9 return with the subscriptions phase or a banner/avatar data model.
- **OQ-13** _(resolved_by clarification)_ — Navigation/chrome design exists in Figma but was not in the original inventory scope; addressed by the `screen-inventory` extension run that added the Account User Menu and Left Menu screens. Logout still has no capability in this slice's `covers_capabilities` (decision 5).
- **OQ-14** _(resolved_by clarification)_ — Acknowledged, no change: video cards link to `/watch/[id]`, a known-gap 404 until Phase 05 (same as AMB-2).
- **OQ-15** _(resolved_by clarification)_ — Fields possibly missing from the backend are verified during implementation and omitted when the backend does not expose them; no new backend work beyond `updatedAt` (TD-05) and the enrichment now decided in `phase-04-frontend-contract-gaps/TD-02`.
- **OQ-16** _(resolved_by clarification)_ — UI copy is English; compact numbers and relative time use the runtime's `Intl.NumberFormat` / `Intl.RelativeTimeFormat`, with no new library.
- **OQ-17** _(resolved_by clarification)_ — Minor design details are corrected at implementation from the design system, with responsive behavior defined by the implementer.
- **OQ-18** _(resolved_by clarification)_ — All planned `(new)` components in the inventory are materialized in this slice through bootstrap SIs (author + test).
- **OQ-19** _(resolved_by clarification)_ — Logout stays deferred even though the account menu design already draws "Sign Out": the item is omitted (D17), Logout is not in `covers_capabilities`. `POST /api/auth/logout` from Phase 02 stays ready.
- **OQ-20** _(resolved_by clarification)_ — D15/D16 stand and the implementer defines the drawer states from the design system: accessible Dialog/Sheet primitive, hover/focus/mobile/dark states per design system, avatar falls back to initials. Identity stays `@channelSlug` plus e-mail from the session — now formalized by `phase-04-frontend-contract-gaps/TD-01`, which adds `channelId` to the session and a `GET /channels/me` endpoint so the value is always fresh.
- **OQ-21** _(resolved_by clarification)_ — Left Menu behavior is defined by the implementer from the design system: only the expanded SideNav is planned (D14); hamburger toggles show/hide; active item uses route-prefix matching and exposes `aria-current="page"`; filled/outline icon variants are created by the implementer; "Create" and "Upload video" stay inert; Home, Subscriptions and Liked videos belong to future phases.
