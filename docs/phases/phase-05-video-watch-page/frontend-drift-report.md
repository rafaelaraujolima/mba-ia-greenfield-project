---
kind: drift-report
phase: phase-05-video-watch-page
plan_mtime: "2026-10-04T20:49:09-04:00"
---

# phase-05-video-watch-page — Drift Report

## Screen: video-watch-page — audited at SI-05.5.0 (2026-10-05)

**Quick scan:** 0 alinhado · 0 drift menor · 1 drift relevante · 0 ausente

- VideoCard (`video-card.tsx`) → `drift relevante` (1 change)

### components/channel/video-card.tsx — VideoCard

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +variant 'list' from Figma demand
- **Prior:** _(none)_

**Audit note (context, not part of the Decision contract):** the Figma component's own documented description (`VideoCard`, node `143:2505`) states: _"Layout variants: default (with avatar) / no-avatar (compact) / list (horizontal). Used on Home grid, Channel public view, and Video show recommendations."_ The currently implemented component only renders the vertical ("default") orientation — thumbnail stacked above title/metadata, fixed `w-64`. This screen's sidebar (node `158:3729` and siblings) demands the horizontal ("list") orientation: thumbnail and text side-by-side, full-width within the `max-w-[360px] min-w-[240px]` sidebar column. SI-05.5a applies this as an additive `layout` prop (e.g. `layout?: "default" | "list"`) on `VideoCard`, defaulting to the existing `"default"` behavior so the channel-page/grid usage (`phase-04-videos-channel-frontend`) is unaffected — new prop, no existing call site changes.
