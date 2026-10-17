---
kind: drift-report
phase: phase-07-home-search-finalization
plan_mtime: "2026-10-14T19:58:29-04:00"
---

# phase-07-home-search-finalization — Drift Report

## Screen: home — audited at SI-07.11.0 (2026-10-17)

**Quick scan:** 10 alinhado · 1 drift menor · 2 drift relevante · 0 ausente

- TopNav (`top-nav.tsx`) → `alinhado`
- IconButton (`icon-button.tsx`) → `alinhado`
- BrandLogo (`brand-logo.tsx`) → `alinhado`
- SearchField (`search-field.tsx`) → `drift menor` (exception)
- AccountMenuTrigger (`account-menu-trigger.tsx`) → `alinhado`
- SideNav (`side-nav.tsx`) → `alinhado`
- SideNavItem (`side-nav-item.tsx`) → `alinhado`
- SideNavSubscriptionList (`side-nav-subscription-list.tsx`) → `alinhado`
- TabMenu (`tab-menu.tsx`) → `drift relevante` (3 changes)
- VideoCard (`video-card.tsx`) → `drift relevante` (3 changes)
- VideoThumbnail (`video-thumbnail.tsx`) → `alinhado`
- Avatar (`avatar.tsx`) → `alinhado`
- PaginationLinks (`pagination-links.tsx`) → `alinhado`

### next-frontend/components/layout/top-nav.tsx — TopNav

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/ui/icon-button.tsx — IconButton

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/auth/brand-logo.tsx — BrandLogo

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/ui/search-field.tsx — SearchField

- **Status:** drift menor
- **Decision:** `exception`
  - reason: Figma draws the TopNav search as a segmented pill (secondary fill, 44px, trailing search button) while this component keeps the established leading-icon, transparent field reused since phase 04. The field is functional in phase 07 but the visual divergence is cosmetic and shared with the studio TopNav, so a second layout variant is not warranted here.
- **Prior:** _(none)_

### next-frontend/components/layout/account-menu-trigger.tsx — AccountMenuTrigger

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/layout/side-nav.tsx — SideNav

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/layout/side-nav-item.tsx — SideNavItem

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/layout/side-nav-subscription-list.tsx — SideNavSubscriptionList

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/watch/tab-menu.tsx — TabMenu

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - retune typography: text-body-md → text-body-lg per Figma 'Inter/Body/LG' demand — 14px/20px → 16px/24px on the chip label
  - retune gap: gap-2 → gap-3.5 per Figma chip row demand — 8px → 14px
  - +prop 'href' from Figma demand — each option may carry a link target so the filter navigates by URL (active chip marked with aria-current) instead of only calling onValueChange; existing string options and onValueChange behavior stay for the watch suggestions use
- **Prior:** _(none)_

### next-frontend/components/channel/video-card.tsx — VideoCard

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +layout 'avatar' from Figma demand — Figma default (with avatar) variant: 40px channel Avatar (initials fallback, no image in the API) beside the text column with gap-3.5; the existing 'default' stays as the Figma 'no-avatar' compact variant used by the channel page
  - retune gap: avatar variant only — thumbnail-to-info gap-2 → gap-4 per Figma 16px
  - +prop 'channelName' initials for the avatar fallback from Figma demand — reuse the existing channelName prop; no new data field
- **Prior:** _(none)_

### next-frontend/components/ui/video-thumbnail.tsx — VideoThumbnail

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/ui/avatar.tsx — Avatar

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/common/pagination-links.tsx — PaginationLinks

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

## Screen: search — audited at SI-07.12.0 (2026-10-17)

**Quick scan:** 5 alinhado · 1 drift menor · 0 drift relevante · 0 ausente

- TopNav (`top-nav.tsx`) → `alinhado`
- SearchField (`search-field.tsx`) → `drift menor` (exception)
- SideNav (`side-nav.tsx`) → `alinhado`
- TabMenu (`tab-menu.tsx`) → `alinhado`
- VideoCard (`video-card.tsx`) → `alinhado`
- PaginationLinks (`pagination-links.tsx`) → `alinhado`

### next-frontend/components/layout/top-nav.tsx — TopNav

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/ui/search-field.tsx — SearchField

- **Status:** drift menor
- **Decision:** `exception`
  - reason: same cosmetic divergence from Figma's segmented search pill already accepted for the Home screen; the field keeps the shared TopNav look, now prefilled with the `q` term.
- **Prior:** "exception at SI-07.11.0 — 'segmented pill vs leading-icon field is cosmetic and shared with the studio TopNav'"

### next-frontend/components/layout/side-nav.tsx — SideNav

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/watch/tab-menu.tsx — TabMenu

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "auto-Edit (body-lg text, gap-3.5, href options) at SI-07.11.0 honored"

### next-frontend/components/channel/video-card.tsx — VideoCard

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "auto-Edit (+layout 'avatar') at SI-07.11.0 honored"

### next-frontend/components/common/pagination-links.tsx — PaginationLinks

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_
