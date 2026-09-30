---
kind: drift-report
phase: phase-04-videos-channel-frontend
plan_mtime: "2026-09-30T11:38:01-04:00"
---

# phase-04-videos-channel-frontend — Drift Report

## Screen: menu-lateral — audited at SI-04.30.0 (2026-09-30)

**Quick scan:** 10 alinhado · 3 drift menor · 0 drift relevante · 0 ausente

- IconButton (`icon-button.tsx`) → `alinhado`
- BrandLogo (`brand-logo.tsx`) → `alinhado`
- StreamTubeIcon (`streamtube-icon.tsx`) → `alinhado`
- AppShell (`app-shell.tsx`) → `alinhado`
- TopNav (`top-nav.tsx`) → `alinhado`
- SideNav (`side-nav.tsx`) → `drift menor` (2 changes)
- SideNavItem (`side-nav-item.tsx`) → `drift menor`
- SideNavSubscriptionList (`side-nav-subscription-list.tsx`) → `alinhado`
- SubscriptionNavItem (`subscription-nav-item.tsx`) → `drift menor`
- HomeIcon (`home-icon.tsx`) → `alinhado`
- SubscriptionsIcon (`subscriptions-icon.tsx`) → `alinhado`
- YourVideosIcon (`your-videos-icon.tsx`) → `alinhado`
- LikedVideosIcon (`liked-videos-icon.tsx`) → `alinhado`

### next-frontend/components/ui/icon-button.tsx — IconButton

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Note: plan flagged a known gap ("ghost variant needed for hamburger/close icons"). Current file already declares `variant: { default, outline, ghost }` with `ghost` as the `defaultVariants` value (`bg-transparent text-foreground hover:bg-muted`, no border/background) — this satisfies the glyph-only, no-background requirement exactly. Gap is already closed; no action needed.

### next-frontend/components/auth/brand-logo.tsx — BrandLogo

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Figma's TopNav wordmark ("Size=sm" component, 20px/28px/600 text) is byte-equivalent to the DS `text-h2` token already used by `size="md"` (`--text-h2: 20px`, `--text-h2--line-height: 28px`, `--text-h2--font-weight: 600`). The "sm"/"md" naming differs between Figma and code, but the consumed values match exactly (alias, not drift). `top-nav.tsx` already calls `<BrandLogo size="md" />`.

### next-frontend/components/icons/streamtube-icon.tsx — StreamTubeIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/layout/app-shell.tsx — AppShell

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Structural composition (TopNav + conditionally-rendered SideNav + main content + AccountMenu overlay) matches the Figma "Body" grouping under the TopNav.

### next-frontend/components/layout/top-nav.tsx — TopNav

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Height (`h-[62px]`), bottom border, and `px-4` match Figma's TopNav node (1440×62, `border-b`, `px-[var(--spacing-4,16px)]`) exactly. Figma's `gap-[var(--spacing-16,64px)]` at the root flex level is implemented instead via `ml-auto` sectioning for the search/actions clusters — functionally equivalent spacing behavior, intentionally adapted for the responsive `sm:` breakpoints already present in this file (Figma is a fixed 1440px frame). Not re-litigated in this shell-only SI.

### next-frontend/components/layout/side-nav.tsx — SideNav

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - +structure: ungroup "Home" and "Subscriptions" items above the first divider per Figma (the "You" heading in Figma groups only "Your videos" + "Liked videos", not all 4 items; current file puts all 4 under one "You" label)
  - retune group label typography: `text-label-md text-muted-foreground` → `text-h3 text-foreground` per Figma Inter/Heading/H3 demand (`--text-h3: 18px`, `--leading-28`, `--font-weight-600`) — applies to both the "You" and "Subscriptions" group labels
- **Prior:** _(none)_

### next-frontend/components/layout/side-nav-item.tsx — SideNavItem

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune typography: `text-label-lg` → `text-body-lg` per Figma Inter/Body/LG regular demand (`--text-body-lg: 16px/24px/400`); `text-label-lg` carries `font-weight: 500` where Figma's base (non-active) item text is `font-weight: 400`. The existing `data-[active=true]:font-weight-600` override for the active state is unaffected and stays.
- **Prior:** _(none)_

### next-frontend/components/layout/side-nav-subscription-list.tsx — SideNavSubscriptionList

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Pure layout wrapper (`flex flex-col`); no typography/token surface of its own — see SubscriptionNavItem below for the per-item drift.

### next-frontend/components/layout/subscription-nav-item.tsx — SubscriptionNavItem

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune typography: `text-label-md` → `text-body-lg` per Figma Inter/Body/LG regular demand (`--text-body-lg: 16px/24px/400` vs current `--text-label-md: 14px/20px/500`)
- **Prior:** _(none)_

### next-frontend/components/icons/home-icon.tsx — HomeIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Plan flagged a known gap ("appears FILLED/active in this frame: needs filled/outline variants"). File already implements a `filled` prop (`fill={filled ? "currentColor" : "none"}`) — gap already closed. Per the screen's own Behaviors spec ("Home / Subscriptions / Liked videos / itens de inscrição → sem destino"), Home never becomes the active item in this slice, so `side-nav.tsx` correctly never passes `filled`.

### next-frontend/components/icons/subscriptions-icon.tsx — SubscriptionsIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/icons/your-videos-icon.tsx — YourVideosIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

File already implements the `filled` prop; `side-nav.tsx` wires it to the route-prefix active check (`filled={isYourVideosActive}`), matching the UI Contract's noted gap resolution.

### next-frontend/components/icons/liked-videos-icon.tsx — LikedVideosIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

## Screen: menu-de-conta — audited at SI-04.31.0 (2026-09-30)

**Quick scan:** 5 alinhado · 3 drift menor · 0 drift relevante · 0 ausente

- AccountMenuTrigger (`account-menu-trigger.tsx`) → `drift menor` (1 change)
- Avatar (`avatar.tsx`) → `alinhado`
- Overlay (`overlay.tsx`) → `alinhado`
- AccountMenu (`account-menu.tsx`) → `drift menor` (4 changes)
- IconButton (`icon-button.tsx`) → `alinhado`
- CloseIcon (`close-icon.tsx`) → `alinhado`
- MenuItem (`menu-item.tsx`) → `drift menor` (2 changes)
- EditIcon (`edit-icon.tsx`) → `alinhado`

### next-frontend/components/layout/account-menu-trigger.tsx — AccountMenuTrigger

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune size: Avatar rendered without a size override defaults to 32px (`size-8`); Figma's TopNav avatar demand is 36px. Apply the same arbitrary-size-override convention already used by `AccountMenu`'s profile avatar (`className="size-16"`) — add `className="size-9"` to the `<Avatar>` instance (9 × 4px = 36px)
- **Prior:** _(none)_

### next-frontend/components/ui/avatar.tsx — Avatar

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Plan flagged "3 tamanhos (26/36/64)" as a concern, but none of those exact pixel values are declared `size` variants (`sm`=24px, `default`=32px, `lg`=40px). The component already supports arbitrary-size overrides via `className` (Tailwind `size-*` utilities merge cleanly through `cn()`), and `AccountMenu`'s profile avatar already uses this pattern successfully (`className="size-16"` = 64px, byte-exact to Figma). No change needed to the DS file itself — the gap is at call sites, tracked per-consumer below (see AccountMenuTrigger).

### next-frontend/components/ui/overlay.tsx — Overlay

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

`fixed inset-0` matches Figma's full-frame backdrop; `bg-overlay` resolves to `--overlay: #00000080` in `globals.css`, equivalent to Figma's `var(--overlay, rgba(0,0,0,0.5))` demand.

### next-frontend/components/layout/account-menu.tsx — AccountMenu

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune typography: "Account" title `text-label-lg` → `text-h3` per Figma Inter/Heading/H3 demand (`--text-h3: 18px/28px/600`) — current token is 16px/24px/500
  - retune typography: profile name line (`@{channelSlug}`) `text-label-lg` → `text-body-lg` per Figma Inter/Body/LG demand (`--text-body-lg: 16px/24px/400`) — size/line-height already match, font-weight drifts (500 vs 400)
  - +structure: profile block layout — Figma's "Profile" node lays the 64px avatar and the name/handle text column out horizontally (`gap-[16px]`, avatar left, text right); current file stacks them vertically and centers them (`flex flex-col items-center gap-2`). Retune to `flex flex-row items-center gap-4` with the text column left-aligned
  - retune size: close `IconButton` usage renders the default `size="md"` (20px icon slot) but Figma's close glyph is 24px; add `size="lg"` to the `<IconButton aria-label="Close">` call (the DS file's existing `lg` variant already renders icons at `size-6`/24px — no DS file change needed, only the call site)
- **Prior:** _(none)_

Drawer width (`w-80` = 320px), full-height positioning (`fixed inset-y-0 right-0`), and background (`bg-card`) already satisfy the plan's flagged "320px drawer, não dropdown" concern — no action needed on those dimensions. `shadow-drawer-left` (`-4px 0 24px 0 #00000080`) is a reasonable token-level equivalent of Figma's literal `drop-shadow(-4px 0px 12px rgba(0,0,0,0.5))`; kept as-is (token already exists, no bespoke shadow string to add).

### next-frontend/components/ui/icon-button.tsx — IconButton

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "alinhado (ghost default variant) at SI-04.30.0 honored"

Confirms the prior screen's finding: `ghost` is already the `defaultVariants` value, satisfying the close button's "no background" demand. No CONFLICT — both screens agree the DS file needs no change; this screen's only close-button gap (icon size) is a call-site concern tracked under AccountMenu above, not a DS file edit.

### next-frontend/components/icons/close-icon.tsx — CloseIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

24px viewBox glyph, no hardcoded width/height — sizes correctly via the consuming `IconButton`'s icon-slot utility once that call site passes `size="lg"` (see AccountMenu decision above).

### next-frontend/components/ui/menu-item.tsx — MenuItem

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune gap: `gap-3` (12px) → `gap-4` (16px) per Figma `gap-[var(--spacing-4,16px)]` demand on the "Item" node — both spacing tokens, same family
  - retune typography: `text-label-lg` → `text-body-lg` per Figma Inter/Body/LG demand (`--text-body-lg: 16px/24px/400`) — current token carries `font-weight: 500` where Figma's item text is `400`
- **Prior:** _(none)_

### next-frontend/components/icons/edit-icon.tsx — EditIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

## Screen: painel-de-videos — audited at SI-04.32.0 (2026-09-30)

**Quick scan:** 11 alinhado · 4 drift menor · 0 drift relevante · 0 ausente

- Button (`button.tsx`) → `alinhado`
- IconButton (`icon-button.tsx`) → `alinhado`
- SearchField (`search-field.tsx`) → `drift menor` (1 change — exception)
- Avatar (`avatar.tsx`) → `alinhado`
- VideoThumbnail (`video-thumbnail.tsx`) → `alinhado`
- Badge (`badge.tsx`) → `drift menor` (1 change)
- Pagination (`pagination.tsx`) → `alinhado`
- VideoListRow (`video-list-row.tsx`) → `drift menor` (1 change)
- VideoStats (`video-stats.tsx`) → `alinhado`
- VideoSortControl (`video-sort-control.tsx`) → `drift menor` (1 change)
- FilterIcon (`filter-icon.tsx`) → `alinhado`
- SortIcon (`sort-icon.tsx`) → `alinhado`
- ViewsIcon (`views-icon.tsx`) → `alinhado`
- ThumbsUpIcon (`thumbs-up-icon.tsx`) → `alinhado`
- CommentIcon (`comment-icon.tsx`) → `alinhado`

### next-frontend/components/ui/button.tsx — Button

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Figma's three button treatments on this screen are all reachable via existing composition, no DS file change needed: "Upload video" (bg-primary, pill radius 999px, px-16/py-8, text-14 medium white) is `variant="default" size="sm"` (bg-primary, text-label-md≈14px, px-4/py-2) with a call-site `className="rounded-[var(--radius-full)]"` override for the pill corner — the same override-at-call-site convention already established for `AccountMenuTrigger`'s Avatar size (SI-04.31.0, "no change to DS file itself, gap is at call-site"). The "Filter"/"Public"/"Date" filter chips (bg-secondary, border-border, rounded-16, px-24/py-8, text-16 medium) map to `variant="secondary" size="md"` closely enough (`rounded-[var(--radius-4)]`, `px-6`/`py-2`, `text-label-lg`) — these are disabled/inert per D7, so pixel-perfect radius fidelity on a non-interactive chip is not worth a DS-level change.

### next-frontend/components/ui/icon-button.tsx — IconButton

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "alinhado (ghost default variant) at SI-04.30.0/SI-04.31.0 honored"

Reused unchanged for the shared shell's hamburger/voice/create triggers on this screen (not screen-specific to the video list itself). No CONFLICT — both prior screens and this one agree no DS file change is needed.

### next-frontend/components/ui/search-field.tsx — SearchField

- **Status:** drift menor
- **Decision:** `exception "field is disabled per D7 (non-interactive); Figma's video-panel field shows the search glyph trailing (right) vs. this component's established leading (left) icon convention (reused byte-identical from TopNav, SI-04.30.0) — a cosmetic difference on an inert element that does not warrant a second SearchField layout variant. Revisit if/when 'Search your videos' becomes interactive in a later phase."`
- **Prior:** _(none)_

### next-frontend/components/ui/avatar.tsx — Avatar

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "alinhado at SI-04.31.0 honored"

Not used directly by this screen's own capability (TopNav avatar is shell-owned, audited at SI-04.30.0/31.0); listed in the Reused DS set only because the shell renders through this screen too. No change.

### next-frontend/components/ui/video-thumbnail.tsx — VideoThumbnail

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Figma's `thumb` node is exactly 256×144 with the duration chip ("10:30") anchored to the bottom-right corner over the image. `VideoListRow` already composes this component at `h-36 w-64` (144px × 256px, Tailwind `h-36`/`w-64`), and the component's own `bottom-1 right-1` duration-overlay placement matches the Figma anchor. No change.

### next-frontend/components/ui/badge.tsx — Badge

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - +variant: add a `success` variant (`bg-transparent border-transparent p-0 text-success-text`, no pill background/border) to `badgeVariants` — Figma's "Public" visibility label (the only status variant drawn, per the UI Contract's own note "Só existe a variante 'Public'... Sem variantes para unlisted / draft / processing / error") renders as bare `success-text`-colored text, not a bordered/filled pill. `success-text` is an existing token (already consumed elsewhere in the project per the UI/testing rules); no new token introduced.
- **Prior:** _(none)_

### next-frontend/components/ui/pagination.tsx — Pagination

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Per the UI Contract, numbered pagination has no Figma design ("Open question — paginação numerada sem design"); the existing `nav`-labeled, `aria-current="page"` implementation already satisfies the TD-02 requirement this screen inherits. No drift to reconcile against a design that doesn't exist.

### next-frontend/components/studio/video-list-row.tsx — VideoListRow

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune status label: `<Badge variant="outline">{statusLabel}</Badge>` → `<Badge variant="success">{statusLabel}</Badge>` (depends on the `badge.tsx` edit above) — matches Figma's bare-text "Public" treatment instead of the current bordered pill
- **Prior:** _(none)_

Row composition (256×144 thumbnail, title, 2-line clamped description, stats row, status+time row), the 1088px max-width, and the `Link`-wraps-whole-row navigation to the edit page already match Figma's `VideoList` (115:358) node and the UI Contract's "Linha/thumbnail/título click → navegação client para `/studio/videos/[id]/edit`" behavior. Only the status-label styling drifts (see above).

### next-frontend/components/studio/video-stats.tsx — VideoStats

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Icon+count order (views, likes, comments) and `Intl.NumberFormat("en-US", { notation: "compact" })` formatting match Figma's "124K views" / "5.2K" / "432" stat row. Placeholders per the UI Contract ("views/likes/comments exibem 0" until a later phase) are a data concern, not a component drift.

### next-frontend/components/studio/video-sort-control.tsx — VideoSortControl

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune variant: `variant="outline"` → `variant="ghost"` — Figma's "Sort by: Latest" control has no visible border/container, just an icon + caption-sized muted text; `outline` renders a visible `border-foreground` box that Figma doesn't show
  - retune typography: add `text-caption text-muted-foreground` override — `Button`'s default `size="sm"` renders `text-label-md` (14px), but Figma's sort-row text is `Inter/Caption` (12px/18px/400), matching the `text-caption` utility already registered in `app/globals.css`
- **Prior:** _(none)_

### next-frontend/components/icons/filter-icon.tsx — FilterIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

The UI Contract itself flags an unresolved Figma-authoring inconsistency ("No screenshot o glifo parece ícone de 'share', não de filtro") — this is a caveat about the *design file's* glyph choice, not a codebase-vs-Figma value drift for this audit to correct. The existing funnel-shaped `FilterIcon` is the semantically correct glyph for a disabled (D7) "Filter" button; no change.

### next-frontend/components/icons/sort-icon.tsx — SortIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Three-line, decreasing-width "filter-list" glyph matches Figma's 16px "Filter list" icon (node 158:3311) used next to "Sort by: Latest".

### next-frontend/components/icons/views-icon.tsx — ViewsIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Eye glyph at the 13.5×12 aspect Figma specifies (per D12, intentionally distinct from `eye-icon.tsx`, which is the password-visibility glyph). Consumed inside `VideoStats` at `size-4` (16px) — sizing is a call-site concern already correctly wired, not a DS file change.

### next-frontend/components/icons/thumbs-up-icon.tsx — ThumbsUpIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

### next-frontend/components/icons/comment-icon.tsx — CommentIcon

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

16px viewBox glyph; consumed inside `MenuItem` which sizes descendant SVGs to `size-4` (16px) — matches Figma's 16px "Frame" demand exactly.

## Screen: edicao-de-video — audited at SI-04.33.0 (2026-09-30)

**Quick scan:** 6 alinhado · 5 drift menor · 0 drift relevante · 0 ausente

- VideoEditForm (`video-edit-form.tsx`) → `alinhado`
- Card (`card.tsx`) → `alinhado`
- FormLabel (`label.tsx`) → `alinhado`
- Input (`input.tsx`) → `alinhado`
- Textarea (`textarea.tsx`) → `drift menor` (1 change)
- CardVideoConfig (`video-config-card.tsx`) → `drift menor` (1 change — exception)
- ThumbUpload (`thumb-upload.tsx`) → `drift menor` (1 change)
- Button (`button.tsx`) → `alinhado`
- SectionHeader (`section-header.tsx`) → `alinhado`
- Select (`select.tsx`) → `drift menor` (1 change)
- PrivacyOption (`privacy-option.tsx`) → `drift menor` (2 changes)

Note on D11/PublishButton: per the plan's own note, "PublishButton" has no dedicated Figma art — the Figma frame's footer only draws Cancel + Save Changes (confirmed by `get_design_context`/`get_screenshot` against node `156:2790`, image shows no third action button). `video-edit-form.tsx` already implements Publish as an inline `variant="secondary"` `Button` instance, not a standalone DS file, so it gets no dedicated audit row — consistent with `button.tsx` covering all three button treatments on this screen (Cancel/Save Changes/Publish) as one DS file.

Note on H1 copy: the Figma frame's H1 reads "Channel Settings" — confirmed wrong copy (this node is the video-edit screen, not the channel-settings screen audited separately at SI-04.34.0). Per the UI Contract's own Accessibility note ("H1 com copy de edição de vídeo — o Figma traz 'Channel Settings' por engano — corrigir e anotar"), SI-04.33a must NOT propagate "Channel Settings" into `page.tsx`'s H1.

### next-frontend/components/studio/video-edit-form.tsx — VideoEditForm

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Already built (SI-04.0.22) and exercised by `components/studio/__tests__/video-edit-form.wiring.test.tsx`. Field set (Title, Description, ThumbUpload, Category select, Visibility radiogroup, VideoConfigCard, Status live region, Save/Cancel/Publish footer) matches the Figma "Edit/Publish video" frame's composition 1:1. Container concerns (data fetching, error mapping, submit wiring) are out of scope for a DS-value audit — tracked in SI-04.33b.

### next-frontend/components/ui/card.tsx — Card

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "alinhado at SI-04.32.0 honored (no DS file change needed across screens)"

The DS file itself needs no change. Figma's "Channel card" surface (32px padding, `rounded-[var(--radius-3,12px)]`, `border-border`) is a page-level composition concern — `video-edit-form.tsx` currently renders as a bare `<form>` without a wrapping `<Card>`. Tracked as a page-composition action for SI-04.33a (wrap the form's content in `<Card className="p-8 gap-6">` at the page/shell level), not a DS-file edit — consistent with the established "gap is at call-site" pattern (SI-04.31.0 Avatar, SI-04.32.0 Button pill override).

### next-frontend/components/ui/label.tsx — FormLabel

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Figma's FormLabel text (Inter/Body/MD: 14px/20px/400) matches `text-body-md` applied by the component. Required-asterisk toggle exists in the Figma component but the UI Contract explicitly notes it "não aparece" on this screen's instances — no code change implied.

### next-frontend/components/ui/input.tsx — Input

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Figma's Title TextField: 36px height, `bg-input-background`, `border-border`, Inter/Body/LG (16px/24px/400) text. Current `Input` (`h-9` = 36px, `bg-input-background`, `border-border`, `text-body-lg`) matches exactly.

### next-frontend/components/ui/textarea.tsx — Textarea

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune background/border: `bg-transparent border-input` → `bg-input-background border-border` — Figma's Description Textarea uses the same `bg-input-background`/`border-border` treatment as the Title TextField (both are "Text field" instances per the design context); current file still carries un-reconciled shadcn scaffold defaults (`bg-transparent`, `dark:bg-input/30`, `text-sm`), never reconciled to project tokens per the "after shadcn add, reconcile" workflow rule
  - retune typography: `text-base`/`md:text-sm` → `text-body-lg` to match `Input`'s established Inter/Body/LG treatment for form field text
- **Prior:** _(none)_

### next-frontend/components/studio/video-config-card.tsx — CardVideoConfig

- **Status:** drift menor
- **Decision:** `exception "already-built, tested server-connected component (SI-04.0.22); Figma's play-icon overlay + bottom-right '0:00' duration corner + border-t section dividers + copy-icon-button are visual polish on a component whose data-bearing behavior (video link, Video Quality, Filename omission per UI Contract) is already correct and covered by components/studio/__tests__/video-config-card.test.tsx. Revisit as a follow-up visual-polish task rather than block SI-04.33b's wiring scope on pixel-level parity."`
- **Prior:** _(none)_

### next-frontend/components/studio/thumb-upload.tsx — ThumbUpload

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - +prop: thread a `durationSeconds` prop through to the internal `VideoThumbnail` call (`<VideoThumbnail videoId={videoId} version={version} durationSeconds={durationSeconds} .../>`) — Figma's ThumbUpload node shows a duration badge ("15:41") that `VideoThumbnail` already renders when given `durationSeconds` (see `video-thumbnail.tsx`'s existing `durationSeconds` prop, used correctly by `VideoListRow` per SI-04.32.0's audit), but `ThumbUpload` never receives/forwards the value, so the badge silently never renders on this screen. Wire the call site in SI-04.33b once `video.durationSeconds` is available from `GET /videos/{id}`.
- **Prior:** "VideoThumbnail duration overlay alinhado at SI-04.32.0 honored — this is a wiring gap in the new ThumbUpload consumer, not a VideoThumbnail DS defect"

### next-frontend/components/ui/button.tsx — Button

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "alinhado at SI-04.32.0 honored"

Cancel (`variant="outline" size="md"`) and Save Changes (`variant="default" size="md"`) map directly to existing variants; both already implemented this way in `video-edit-form.tsx`. Publish (D11, no Figma art) reuses `variant="secondary" size="md"` — reasonable per-screen choice, no DS file change needed.

### next-frontend/components/ui/section-header.tsx — SectionHeader

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Figma's SectionHeader title style (Inter/Heading/H2: 20px/28px/600) is satisfied by the component's explicit `text-label-xl font-weight-600` (the file already force-overrides to weight 600, matching H2 semibold demand rather than `text-label-xl`'s own bundled weight). Description line (`text-body-md text-muted-foreground`) matches Figma's Inter/Body/MD muted description exactly.

### next-frontend/components/ui/select.tsx — Select

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune trigger surface: `bg-transparent ... dark:bg-input/30` → `bg-input-background` — Figma's Category select trigger is a solid `bg-input-background` (#e3e3e3) surface, not transparent; current file still carries un-reconciled shadcn scaffold defaults
  - retune trigger height: `data-[size=default]:h-8` (32px) → 36px (`h-9`) to match Figma's Select node (36h) and this screen's Input/Textarea height convention
  - retune radius: `rounded-lg` → `rounded-[var(--radius-1_5,6px)]` per Figma's Category select corner radius demand
  - retune typography: `text-sm` → `text-body-md` (14px/20px/400, matches Figma's Inter/Body/MD value text)
- **Prior:** _(none)_

Never reconciled after `shadcn add select` (per the UI rule's "reconcile once at install time" workflow) — this is the first screen to actually consume `Select`, so the gap was latent until now.

### next-frontend/components/studio/privacy-option.tsx — PrivacyOption

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - +visual: render the explicit radio-dot indicator (empty `border-2 border-border rounded-full` circle, `data-[selected=true]:border-primary` with a filled inner `bg-primary` dot) — Figma's PrivacyOption (node `156:2822`/`156:2821`) draws a real radio circle+dot to the left of the icon/title column; the current file only sets `role="radio"`/`aria-checked` with no visual indicator element at all, which is both a visual gap and an accessibility affordance gap (sighted users get no radio-button glyph, only a border/background color change)
  - retune radius: `rounded-[var(--radius-4)]` (16px) → `rounded-[var(--radius-1,4px)]` per Figma's PrivacyOption corner radius
  - retune selected background: `data-[selected=true]:bg-primary/5` → `data-[selected=true]:bg-input-background` — Figma's selected ("Public") state shows a flat `bg-input-background` (#e3e3e3) fill, not a tinted primary overlay
- **Prior:** _(none)_

---

## Screen: edicao-do-canal — audited at SI-04.34.0 (2026-09-30)

**Quick scan:** 6 alinhado · 2 drift menor · 0 drift relevante · 0 ausente

- Card (`card.tsx`) → `alinhado`
- ChannelSummary (`channel-summary.tsx`) → `alinhado`
- ChannelSettingsForm (`channel-settings-form.tsx`) → `drift menor` (2 changes)
- FormLabel (`label.tsx`) → `alinhado`
- Input (`input.tsx`) → `alinhado`
- Textarea (`textarea.tsx`) → `alinhado`
- Button (`button.tsx`) → `alinhado`
- FieldError (`field-error.tsx`) → `alinhado`

Figma MCP (`get_design_context`/`get_screenshot`) worked for this screen (node `154:1367`, file `upxCB4CzKKTSOT9NpdAZ0u`) — full audit performed against live design context, not just the written UI Contract.

### next-frontend/components/ui/card.tsx — Card

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "alinhado at SI-04.32.0/SI-04.33.0 honored (no DS file change needed across screens)"

The Figma frame draws two `Card` surfaces stacked vertically: the "Channel card" (banner/avatar/name/handle/subscriber+video counts — D9 omits everything but name+handle here) and the "Canal" card (Basic Information + Description + footer). Per D9, only the name+handle slice is built as `ChannelSummary`; it already wraps itself in `<Card>`. The settings-form card is a page-composition concern (wrap `ChannelSettingsForm` in `<Card className="p-8 gap-6">` at the page/shell level), not a DS-file edit — same "gap is at call-site" pattern already established for `video-edit-form.tsx` at SI-04.33.0.

### next-frontend/components/studio/channel-summary.tsx — ChannelSummary

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Matches D9 exactly: name (`text-label-lg`) + handle (`text-body-md text-muted-foreground`) inside a bare `Card`, no banner, no avatar, no subscriber/video counts, no verb. The Figma "Channel card" node (`154:1486`) does carry that extra chrome, but the UI Contract's own D9 note explicitly scopes it out — no action.

### next-frontend/components/studio/channel-settings-form.tsx — ChannelSettingsForm

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - +visual: render Figma's "Supporting text" line under each Basic Information field — `text-helper text-muted-foreground` caption reading "Your unique identifier on StreamTube" under the Channel handle field and "The name that appears on your channel" under the Display name field (Figma TextField instances `154:1537`/`154:1570` both carry a populated `Supporting text` slot that the current file omits entirely)
  - retune footer buttons: `size="md"` → `size="sm"` on both Cancel and Save Changes — Figma's footer Button instances (`154:1713`/`154:1696`) use the 14px/`px-4 py-2` treatment that matches this repo's `size="sm"` (`buttonVariants` sm: `px-4 py-2 text-label-md`), not `size="md"`'s 16px/`px-6 py-2`
- **Prior:** _(none)_

Not flagged: the "Last updated" row's small alarm/clock glyph next to the caption text (Figma node `156:2106`) has no equivalent icon component in `components/icons/` and is not called out in the UI Contract's own Behaviors/Accessibility notes (only the caption text is required) — treated as an `exception "no icon asset in the DS inventory yet; caption-only text satisfies the UI Contract's stated requirement, glyph is pure visual polish"` rather than a blocking drift item, to avoid scope creep into a new icon component during a wiring SI.

### next-frontend/components/ui/label.tsx — FormLabel

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "alinhado at SI-04.33.0 honored"

Figma's FormLabel (Inter/Body/MD 14px/20px/400, no required-asterisk shown on either field) matches the component as already reconciled for the video-edit screen.

### next-frontend/components/ui/input.tsx — Input

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "alinhado at SI-04.33.0 honored (Title TextField parity)"

Confirmed per the plan's explicit flag: `Input` already supports the error state via `aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20` (used today for the nickname-taken error), and height (`h-9` = 36px) matches both of this screen's TextField instances. `Input` itself has no dedicated "supporting text" slot — Figma composes that as a sibling node under the field, not inside the text-field component — so supporting text is a call-site composition concern (see `ChannelSettingsForm` row above), not an `Input` DS change.

### next-frontend/components/ui/textarea.tsx — Textarea

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "drift menor at SI-04.33.0 → auto-Edit (bg-input-background/border-border retune + text-body-lg retune) already applied; file on disk now matches Figma's Description Textarea treatment (120px height via the Description field's fixed `h-[120px]` State-layer, no supporting text/counter/own-label, consistent with this screen's Figma node which also shows no supporting-text slot populated on the Description Textarea)"

No conflict — this audit simply confirms the SI-04.33.0 reconciliation is already in effect and holds for this screen too.

### next-frontend/components/ui/button.tsx — Button

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "alinhado at SI-04.32.0/SI-04.33.0 honored"

Confirmed per the plan's explicit flag: the `outline`/`sm` combination needed for this screen's Cancel button already exists (`variant: outline` → `border-foreground bg-transparent text-foreground hover:bg-muted/40`; `size: sm` → `px-4 py-2 text-label-md`). No DS file change — the drift is in `channel-settings-form.tsx`'s call-site `size` prop (see that row above), not in `Button` itself.

### next-frontend/components/auth/field-error.tsx — FieldError

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** _(none)_

Already reused by `channel-settings-form.tsx` for the "Display name" field's error slot; the nickname field currently renders its own inline `<p>` instead of `FieldError` for the "already taken" message — functionally equivalent (same `text-caption text-destructive` styling FieldError applies) but inconsistent. Not flagged as drift since it's an internal consistency nit rather than a Figma-value mismatch — left as-is to keep SI-04.34a/b's diff minimal; worth a follow-up cleanup task outside this SI's scope.

---

## Screen: pagina-publica-do-canal — audited at SI-04.35.0 (2026-09-30)

**Quick scan:** 2 alinhado · 3 drift menor · 1 drift relevante · 0 ausente

- ChannelHeader (`channel-header.tsx`) → `drift menor` (3 changes)
- VideoSortFilter (`video-sort-filter.tsx`) → `drift menor` (1 change)
- FilterChip (`filter-chip.tsx`) → `drift menor` (4 changes)
- VideoCard (`video-card.tsx`) → `drift relevante` (1 missing prop + 2 retunes)
- VideoThumbnail (`video-thumbnail.tsx`) → `alinhado`
- Pagination (`pagination.tsx`) → `alinhado`

Figma MCP (`get_design_context`/`get_screenshot`) worked for this screen (node `155:1926`, file `upxCB4CzKKTSOT9NpdAZ0u`) — full audit performed against live design context (React+Tailwind reference code + rendered screenshot), not just the written UI Contract.

### next-frontend/components/channel/channel-header.tsx — ChannelHeader

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune typography: channel name `text-h2` (20px/28px/600) → `text-h1` (24px/32px/700) — Figma's "Tech Mastery Plus" title is `Inter/Heading/H1` (`font-['Inter:Bold'] text-[24px] leading-[32px]`), not H2
  - retune typography: nickname `text-body-md` (14px/20px/400) → `text-body-lg` (16px/24px/400) — Figma's `@TechMasteryPlus` meta row is `Inter/Body/LG` (`text-[16px] leading-[24px]`)
  - retune color: description `text-foreground` → `text-muted-foreground` — Figma's description line ("Your ultimate guide to...") renders in `var(--muted-foreground,#535353)`, not the default foreground color; size/weight (`text-body-md`) already match
- **Prior:** _(none)_

Per D9 (already encoded in the UI Contract), the component correctly omits banner, avatar, and subscriber/video counters — Figma's "channel header row" draws all three, but the UI Contract explicitly scopes them out for this slice. No action on that front.

### next-frontend/components/channel/video-sort-filter.tsx — VideoSortFilter

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune gap: `gap-2` (8px) → `gap-4` (16px) — Figma's "Filter chips" row uses `gap-[16px]` between the three chip instances
- **Prior:** _(none)_

### next-frontend/components/ui/filter-chip.tsx — FilterChip

- **Status:** drift menor
- **Decision:** `auto-Edit`
  - retune radius: `rounded-[var(--radius-full)]` (pill) → `rounded-[var(--radius-2)]` (8px) — Figma's FilterChip node is an 8px-radius rectangle, not a pill
  - retune surface: `border border-border bg-transparent` → `bg-card` (no border) — Figma's chip (both "active"/"normal" component variants reduce, in this frame, to a flat `bg-card` surface with no visible border; the rendered screenshot confirms no pill/border chrome around "Latest"/"Popular"/"Oldest")
  - retune padding: `px-4 py-1.5` → `px-3 py-2` — Figma's chip padding is `px-[var(--spacing-3,12px)] py-[var(--spacing-2,8px)]`
  - retune typography: `text-label-md` (14px/500) → `text-body-lg` (16px/400) — Figma's chip label is `Inter/Body/LG` regular, not a 500-weight label style
- **Prior:** _(none)_

All three chips are disabled per D7 with no active-state visible in this frame (confirmed by the screenshot — "Latest", "Popular", "Oldest" render identically); the `active` variant branch already in the component is untouched since this screen never sets it.

### next-frontend/components/channel/video-card.tsx — VideoCard

- **Status:** drift relevante
- **Decision:** `auto-Edit`
  - +prop: add a `channelName` prop and render it between the title and the views/time row — Figma's VideoCard draws "Flux Academy" as its own line under the title (the UI Contract's own Reused-DS bullet for this component explicitly lists "nome do canal" as required content), but the current `video-card.tsx` has no such prop or render path at all — the channel name is silently missing. Per D9, omit the verified-badge glyph next to it (no verified-badge icon asset in the DS inventory; out of scope here). The page (`SI-04.35b`) sources the value from the same `GET /channels/{nickname}` response already used for `ChannelHeader` — the per-item `/channels/{nickname}/videos` payload has no `channelName` field of its own (single-channel listing), so this is one value threaded to every card, not a per-item fetch.
  - retune typography: title `text-label-md` (14px/500) → `text-body-lg` (16px/400) — Figma's title text is `Inter/Body/LG` regular (`text-[16px] leading-[24px]`), not a 500-weight label style
  - retune typography: views/time row `text-caption` (12px) → `text-body-lg` (16px/400) — Figma's "212K views • 2 hours ago" row is `Inter/Body/LG` regular at 16px, not the 12px caption scale
- **Prior:** _(none)_

Width: Figma's VideoCard is a flexible `min-w-[240px] max-w-[360px] w-[266px]` grid item (`flex flex-wrap` grid, not a fixed column grid); the current component hardcodes `w-64` (256px) internally. Per the established "gap is at call-site" convention (SI-04.31.0 Avatar, SI-04.32.0 Button), the page composing the grid in SI-04.35a applies a `className="w-[266px]"` override per the plan's own acceptance criterion ("grid de cards de 266px") rather than changing the DS file's base width — noted here, not a separate DS-file decision row.

### next-frontend/components/ui/video-thumbnail.tsx — VideoThumbnail

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "alinhado at SI-04.32.0 honored"

Figma's `thumb` node (`aspect-[421.6875/239]` ≈ 1.764, `rounded-[var(--radius-4,16px)]`, `object-cover`) is visually indistinguishable at this scale from the component's existing `aspect-video` (1.778) + `rounded-[var(--radius-4)]` treatment already confirmed aligned for the management-panel screen. No change — `VideoCard` composes it with `className="aspect-video w-full"` as before.

### next-frontend/components/ui/pagination.tsx — Pagination

- **Status:** alinhado
- **Decision:** `skip`
- **Prior:** "alinhado at SI-04.32.0 honored"

The Figma frame for this screen shows no pagination control at all (5 cards, single page, no footer nav node) — consistent with the UI Contract's own prior note ("Open question — paginação numerada sem design"). No new design evidence to reconcile against; the existing `nav`-labeled, `aria-current="page"` implementation stands unchanged.
