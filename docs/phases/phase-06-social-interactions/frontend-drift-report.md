---
kind: drift-report
phase: phase-06-social-interactions
plan_mtime: "2026-10-08T18:36:10-04:00"
---

# phase-06-social-interactions — Drift Report

> Method note: the audits below diff the DS files on disk against the Figma values already transcribed in the plan's UI Contracts (node ids, sizes, radii, variants). The Figma MCP was not queried again at audit time.

## Screen: watch-page-social — audited at SI-06.18.0 (2026-10-12)

**Quick scan:** 3 alinhado · 1 drift menor · 1 drift relevante · 0 ausente

- Button (`button.tsx`) → `drift menor` (exception)
- Avatar (`avatar.tsx`) → `alinhado`
- Input (`input.tsx`) → `drift relevante` (exception)
- ThumbsUpIcon (`thumbs-up-icon.tsx`) → `alinhado`
- ThumbsDownIcon (`thumbs-down-icon.tsx`) → `alinhado`

### next-frontend/components/ui/button.tsx — Button

- **Status:** drift menor
- **Decision:** `exception`
  - reason: the ReplyButton (158:3882) is a ghost pill 28px; `variant="ghost" size="sm"` is 36px high. The 28px height is a one-off for the comment row and is applied through `className` on the ReplyButton call site instead of adding a size to the shared primitive. SubscribeButton uses `default`/`secondary` unchanged.
- **Prior:** _(none)_

### next-frontend/components/ui/avatar.tsx — Avatar

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/ui/input.tsx — Input

- **Status:** drift relevante
- **Decision:** `exception`
  - reason: the comment input (158:3860) only has a bottom border, while the DS Input has a full border and background. Used once, so CommentForm overrides it with `className` (`border-0 border-b rounded-none bg-transparent px-0`) instead of adding a variant that no other screen needs.
- **Prior:** _(none)_

### next-frontend/components/icons/thumbs-up-icon.tsx — ThumbsUpIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/icons/thumbs-down-icon.tsx — ThumbsDownIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

**Audit note:** both thumbs icons already carry the `filled` variant (created at SI-06.0.1), so no DS edit is needed at SI-06.18a.

## Screen: channel-page-social — audited at SI-06.19.0 (2026-10-12)

**Quick scan:** 1 alinhado · 0 drift menor · 1 drift relevante · 0 ausente

- ChannelHeader (`channel-header.tsx`) → `drift relevante`
- Button (`button.tsx`) → `alinhado`

### next-frontend/components/channel/channel-header.tsx — ChannelHeader

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +meta line (156:3518) with the compact subscriber count in an `aria-live="polite"` region
  - +`action` slot beside the title for the SubscribeButton (omitted bell stays omitted, per D9)
- **Prior:** _(none)_

### next-frontend/components/ui/button.tsx — Button

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** `watch-page-social` kept Button unchanged (exception on the 28px reply height only) — no conflict.

## Screen: left-menu-subscriptions — audited at SI-06.20.0 (2026-10-12)

**Quick scan:** 2 alinhado · 1 drift menor · 1 drift relevante · 0 ausente

- SideNavSubscriptionList (`side-nav-subscription-list.tsx`) → `drift relevante`
- SubscriptionNavItem (`subscription-nav-item.tsx`) → `drift relevante`
- Avatar (`avatar.tsx`) → `drift menor` (exception)
- SideNavItem (`side-nav-item.tsx`) → `alinhado`

### next-frontend/components/layout/side-nav-subscription-list.tsx — SideNavSubscriptionList

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - replace `PLACEHOLDER_SUBSCRIPTIONS` with a `subscriptions` prop (`{ channelId, channelName, channelNickname }[]`); render nothing when empty
- **Prior:** _(none)_

### next-frontend/components/layout/subscription-nav-item.tsx — SubscriptionNavItem

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - render as a `next/link` to `/channel/[nickname]` with `active` state (`bg-card`, `aria-current`), hover token and `title` for the truncated name
- **Prior:** _(none)_

### next-frontend/components/ui/avatar.tsx — Avatar

- **Status:** drift menor
- **Decision:** `exception`
  - reason: Figma uses 26px; DS `size="sm"` is 24px. Same token family, 2px off, and the avatar scale is shared by other screens; kept as-is.
- **Prior:** `watch-page-social` used `Avatar` `lg` unchanged — no conflict.

### next-frontend/components/layout/side-nav-item.tsx — SideNavItem

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_
