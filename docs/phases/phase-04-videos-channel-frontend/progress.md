# phase-04-videos-channel-frontend — Progress

**Status:** completed
**SIs:** 53/53 completed

## Final verification (all 53 SIs)

- **Backend** (nestjs-project): `tsc --noEmit` 0 errors · unit+integration 253/253 passing · e2e 105/105 passing.
- **Frontend** (next-frontend): `tsc --noEmit` 0 errors · `npm run lint` 0 errors (1 pre-existing unrelated warning) · full suite 83 files / 309 tests passing.
- **Accepted known gap:** `nestjs-project`'s `npm run lint` reports 634 problems (314 errors, 320 warnings) — confirmed via stash-diff during SI-04.12 to be pre-existing, repo-wide debt (`@typescript-eslint/no-unsafe-member-access`/`no-unsafe-argument` on `res.body.*` in e2e specs, `any`-typed TypeORM mocks), not introduced by this phase's SI-04.10–04.13. One new site fits the same pre-existing pattern (`channels.service.ts`'s `isPgUniqueViolationOnColumn` helper, an `err as any` cast to read Postgres error fields). **User decision (2026-09-30): accepted as known debt, not blocking phase completion.** No follow-up task filed.

### SI-04.0.1 — Infra: install batch shadcn primitives
- **Status:** completed
- **Tests:** no tests (Infra)
- **Observations:**
  - shadcn generator emitted `lucide-react` icon imports and `import { cn } from "cn"` in `avatar.tsx`, `badge.tsx`, `select.tsx`, `pagination.tsx`, `textarea.tsx` — fixed to `@/lib/utils` and project has no icon library per `.claude/rules/next-frontend-ui.md`, so created 5 new custom icons (`chevron-down`, `chevron-up`, `chevron-left`, `chevron-right`, `more-horizontal`) and rewired `select.tsx`/`pagination.tsx` to use them.
  - `pagination.tsx` used `size="default"` on `Button`, which has no such variant (`sm|md|lg|icon`) — changed Prev/Next to `size="sm"`.
  - `button.tsx`, `card.tsx`, `checkbox.tsx`, `icon-button.tsx`, `input.tsx`, `label.tsx` untouched (confirmed via `git status`).

### SI-04.0.2 — Tests shadcn batch
- **Status:** completed
- **Tests:** 17 passing
- **Observations:**
  - Radix Select's pointer-driven open interaction threw `hasPointerCapture is not a function` under jsdom on the first run; added `hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`/`scrollIntoView` polyfills to `vitest.setup.ts`, following the same pattern already used there for `ResizeObserver`. Global setup change, but scoped to filling jsdom API gaps — no test behavior changed.

### SI-04.0.3 — Custom-ui: filter-chip.tsx
- **Status:** completed
- **Tests:** 4 passing
- **Observations:** none

### SI-04.0.4 — Custom-ui: menu-item.tsx
- **Status:** completed
- **Tests:** 2 passing
- **Observations:** none

### SI-04.0.5 — Custom-ui: overlay.tsx
- **Status:** completed
- **Tests:** 2 passing
- **Observations:** none

### SI-04.0.6 — Custom-ui: search-field.tsx
- **Status:** completed
- **Tests:** 3 passing
- **Observations:**
  - First implementation left the `<input>` uncontrolled (`value` prop passed through as-is, `undefined` in the common case) while tracking a separate `internalValue` state that was never fed back to the DOM — the clear button updated state but the visible input value never changed. Rewrote to always bind `value={currentValue}` (either the controlled prop or the internal state).

### SI-04.0.7 — Custom-ui: section-header.tsx
- **Status:** completed
- **Tests:** 3 passing
- **Observations:** none

### SI-04.0.8 — Custom-ui: video-thumbnail.tsx
- **Status:** completed
- **Tests:** 4 passing
- **Observations:**
  - Test originally queried `getByRole("img")`, but `alt=""` (intentional — decorative image inside a link with visible text) removes the implicit img role in jsdom; switched to `container.querySelector("img")`.
  - `next/image` rewrites `src` to `/_next/image?url=<encoded>&...`; the assertion now extracts and checks the `url` search param via the URL API instead of substring-matching the rewritten string.

### SI-04.0.9 — Custom-business simple group: close, comment, edit, filter, home icons
- **Status:** completed
- **Tests:** 6 passing (home-icon covers both outline/filled variants)
- **Observations:** none

### SI-04.0.10 — Custom-business simple group: liked-videos, menu, mic, plus, search icons
- **Status:** completed
- **Tests:** 5 passing
- **Observations:** none

### SI-04.0.11 — Custom-business simple group: sort, subscriptions, thumbs-up, views, your-videos icons
- **Status:** completed
- **Tests:** 8 passing (views-icon confirms distinctness from eye-icon; your-videos-icon covers both variants)
- **Observations:** none

### SI-04.0.12 — Custom-business simple group: casca
- **Status:** completed
- **Tests:** 16 passing
- **Observations:**
  - `side-nav-subscription-list.test.tsx` transiently hit the known Vitest forks-pool worker-start timeout 3x before passing on the 4th isolated attempt — environment flakiness, not a code defect (same class as SI-04.0.21's note).

### SI-04.0.13 — Custom-business simple group: studio
- **Status:** completed
- **Tests:** 7 passing (channel-summary 1, video-stats 2, video-sort-control 1, video-list-row 3)
- **Observations:**
  - `VideoThumbnail`'s `alt` prop is required (no default) — first pass omitted it in `video-list-row.tsx` and caused a `tsc` failure; fixed by passing `alt=""` (decorative thumbnail, matches the existing pattern already used elsewhere in the codebase).
  - `video-sort-control.test.tsx` hit the known Vitest forks-pool worker-start timeout when run alone/in small batches multiple times across two verification rounds — same pre-existing environment flakiness documented for SI-04.0.21/SI-04.0.12; eventually observed passing (1/1) in an isolated attempt, no assertion ever failed.

### SI-04.0.14 — Custom-business simple group: channel
- **Status:** completed
- **Tests:** 5 passing (channel-header 2, video-card 2, video-sort-filter 1)
- **Observations:**
  - Same `VideoThumbnail` `alt` prop fix applied to `video-card.tsx` (see SI-04.0.13 note).

### SI-04.0.15 — Custom-business complex: account-menu.tsx
- **Status:** completed
- **Tests:** 6 passing
- **Observations:**
  - `SessionState` has no `nickname` field (only `channelSlug`/`email`) — initials for the 64px avatar fallback are derived from `channelSlug` (first two chars, uppercased) rather than a separate nickname.
  - `Avatar`'s `size` prop only supports `default|sm|lg` (max 40px), not the 64px D16 spec — used `className="size-16"` to override via tailwind-merge instead of extending the primitive (same drift noted earlier for the screen inventory, not reconciled globally in this SI).

### SI-04.0.16 — Custom-business complex: side-nav.tsx
- **Status:** completed
- **Tests:** 3 passing
- **Observations:**
  - `TopNav` (SI-04.0.12) hardcodes `aria-controls="studio-side-nav"` on the hamburger button, so `SideNav`'s `id` prop defaults to `"studio-side-nav"` to match without requiring `AppShell` to wire it explicitly.
  - Home/Subscriptions/Liked videos items use `href="#"` placeholders (no destination per plan — future phases); only "Your videos" routes anywhere in this slice.

### SI-04.0.17 — Custom-business complex: app-shell.tsx
- **Status:** completed
- **Tests:** 3 passing
- **Observations:**
  - `app-shell.test.tsx` hit the known Vitest forks-pool worker-start timeout when run standalone/in a 3-file batch with only new files; passed cleanly once combined with `top-nav.test.tsx` (an already-passing file) in the batch — same environment flakiness pattern as other complex client components this session.

### SI-04.0.18 — Custom-business complex: channel-settings-form.tsx
- **Status:** completed
- **Tests:** 4 passing
- **Observations:**
  - `onSubmit` is a plain async prop (the real BFF call is wired in SI-04.34b per the plan); the form maps a rejection with `error.message === "NICKNAME_ALREADY_EXISTS"` to an inline field error via `setError`, matching the AC without depending on any specific error-envelope shape yet.
  - Used a manual `<p id="nickname-error">` + `aria-describedby` for the nickname field instead of the shared `FieldError` component, since `FieldError` doesn't accept an `id` prop and the AC specifically requires `aria-describedby` wiring; other fields keep using `FieldError` as-is.

### SI-04.0.19 — Custom-business complex: privacy-option.tsx
- **Status:** completed
- **Tests:** 5 passing
- **Observations:** none

### SI-04.0.20 — Custom-business complex: thumb-upload.tsx
- **Status:** completed
- **Tests:** 4 passing
- **Observations:**
  - The file input's `accept="image/*"` made `@testing-library/user-event`'s `upload()` silently refuse to fire `onChange` for a non-matching file (accept-validation is on by default in the installed version) — the non-image-file test needed `userEvent.setup({ applyAccept: false })` to exercise the component's own JS-level type check, which is the actual behavior under test (a user can still drag-drop a mismatched file past the native picker).

### SI-04.0.21 — Custom-business complex: video-config-card.tsx
- **Status:** completed
- **Tests:** 5 passing
- **Observations:**
  - jsdom in this container did not let `navigator.clipboard.writeText` be reliably shadowed by either `Object.defineProperty` or `vi.stubGlobal("navigator", ...)` — the real async function kept resolving at assertion time. Refactored the component to accept an `onCopyLink` prop (defaults to `navigator.clipboard.writeText`), so tests inject a spy instead of fighting the browser-API mock; production behavior (AC "chama navigator.clipboard.writeText") is unchanged via the default.
  - Running `video-config-card.test.tsx` alone reliably hit a Vitest `forks` pool worker-start timeout in this container (`[vitest-pool-runner]: Timeout waiting for worker to respond`), reproduced 4 times isolated; running it together with any other test file in the same invocation passes cleanly every time. Treated as environment flakiness, not a code defect — worth a note for CI if it recurs there.

### SI-04.0.22 — Custom-business complex: video-edit-form.tsx
- **Status:** completed
- **Tests:** 7 passing
- **Observations:**
  - No separate `PublishButton` component was created — the plan mentions it inline in the footer alongside Cancel/Save Changes with no dedicated Dependencies/SI of its own, so it's a plain `Button` (`secondary` variant) inside `video-edit-form.tsx`, disabled unless `status === "ready" && publishedAt == null`.
  - `categoryId`/`visibility` are wired via `react-hook-form`'s `Controller` (Radix `Select` and the `role="radiogroup"` of two `PrivacyOption`s aren't native inputs compatible with `register`); thumbnail file is tracked as separate local state (not an RHF field) since `onSave`'s contract takes it as a distinct `thumbnailFile` property.
  - This closes the full bootstrap "casca" group (SI-04.0.1–0.22).

### SI-04.10 — Backend: STORAGE_PUBLIC_ENDPOINT e cliente S3 de assinatura
- **Status:** completed
- **Tests:** 36 (videos.service.spec) + 2 (storage.module.spec, new file) + 8 (env.validation.integration-spec + videos.module.spec) + 19 (videos.service.integration-spec) + 35 (videos.e2e-spec) all passing
- **Observations:**
  - `compose.yaml` was NOT edited — `STORAGE_*` vars aren't declared under `nestjs-api`'s `environment:` block; the container reads them from the volume-mounted `.env` via `ConfigModule`, so `.env`/`.env.example` is the actual pass-through mechanism. The plan's "repassá-lo em compose.yaml" step had no analogous existing pattern to mirror.
  - `requestUploadParts`'s `getSignedUrl` call (an upload/write URL) was deliberately left on the internal `S3_CLIENT`, matching the AC that only read URLs (stream/download/thumbnail) move to the presign client.
  - `videos.service.spec.ts`'s constructor now takes a second S3 client mock param — updated across all 35 pre-existing call sites in that file mechanically (same shape, new mock injected).

### SI-04.11 — Backend: GET /videos/:id/thumbnail e updatedAt nas respostas
- **Status:** completed
- **Tests:** 41 (videos.service.spec) + 24 (videos.service.integration-spec) + 39 (videos.e2e-spec) + 10 (channels.e2e-spec) all passing
- **Observations:**
  - `npm run lint` reports 295 errors/316 warnings project-wide, almost entirely `@typescript-eslint/no-unsafe-member-access` on `res.body.*` in e2e spec files (supertest's `res.body` is typed `any`) — confirmed pre-existing repo-wide debt (identical errors on untouched `test/auth.e2e-spec.ts`), not introduced by this SI's 2 new assertion lines which follow the exact same pre-existing pattern as adjacent lines. Flagged as a candidate for a separate cleanup task; not fixed here per Scope Limits. **This must be resolved (or explicitly accepted) before the phase's final `npm run lint` Definition-of-Done gate.**
  - `GET /channels/:nickname/videos`'s `updatedAt` e2e coverage lives in `test/channels.e2e-spec.ts` (not `videos.e2e-spec.ts`, despite the plan's Tests table only naming the latter) — the endpoint's existing e2e test suite was already in that file.

### SI-04.12 — Backend: GET /channels/me e detalhe do vídeo enriquecido
- **Status:** completed
- **Tests:** 15 (channels.service.spec) + 13 (channels.e2e-spec) + 40 (videos.e2e-spec) all passing
- **Observations:**
  - `GET /channels/me` declared between `PATCH /channels/:id` and `GET /channels/:nickname` so NestJS matches the literal segment before the `:nickname` param route; e2e confirms it's not swallowed by `:nickname="me"`.
  - Confirmed the project-wide `npm run lint` failure count (634 problems) is pre-existing, not introduced by this SI, by stashing the change and re-running lint against the SI-04.11 baseline (already 551 problems) — same `no-unsafe-member-access` pattern on `res.body.*` and TypeORM `any`-typed mocks used throughout the existing test suites. Confirms the SI-04.11 note: this is repo-wide debt that needs a dedicated cleanup pass (or an eslint-config decision) before the phase's final `npm run lint` DoD gate can pass.

### SI-04.13 — Pré-requisito: sincronizar openapi.json e regenerar types.gen.ts
- **Status:** completed
- **Tests:** no tests (Infra); gate verified via `tsc --noEmit` (0 errors) + idempotency check (byte-identical md5 on a second sync/regen pass)
- **Observations:**
  - `nestjs-api`'s app server had to be started temporarily (only the keep-alive placeholder was running) to run `npm run openapi:export`; stopped again afterward to restore the infra-only default per `nestjs-project/CLAUDE.md`.
  - `next-frontend/openapi.json` is gitignored (only `nestjs-project/openapi.json` and `next-frontend/lib/api/types.gen.ts` are tracked) — present and current on disk, just doesn't show in `git status`.
  - Cross-referenced every `### API Contracts` BFF-tier `(derived: ...)` line against the regenerated `nestjs-project/openapi.json`: all response-body field lists match exactly (including every `updatedAt` addition and the `GET /videos/:id` enrichment fields). Three documentation-granularity (not functional) gaps noted for awareness, no plan edits made: (1) the generated OpenAPI collapses multiple `errorCode`s into one prose description per HTTP status — `types.gen.ts` can't statically discriminate error codes, consumers still branch on the runtime string; (2) `401` isn't explicitly documented on several protected endpoints (likely a global-guard response never decorated per-route) — harmless since the BFF synthesizes its own 401 via `requireSession()`; (3) `GET /videos/:id/thumbnail`'s 302 response doesn't document `Location`/`Cache-Control` headers, consistent with the pre-existing pattern on `/stream` and `/download`.

### SI-04.14 — Guarda de rotas autenticadas (Setup)
- **Status:** completed
- **Tests:** 10 files / 45 tests passing (lib/auth + components/auth); full suite 90/90 of what ran passed (worker-pool timeouts on ~42 unrelated files under full-parallel load, confirmed non-real by isolated reruns)
- **Observations:**
  - `requireSession()` implemented as a single exported name with **overloads** (`requireSession()` for RSC → redirects; `requireSession({ routeHandler: true })` for Route Handlers → returns a 401 `Response`), matching the plan's single-signature Setup snippet as closely as Next 16 semantics allow.
  - `proxy.ts` does a presence-only cookie check and sets an `x-pathname` request header (via `NextResponse.next({ request: { headers } })`) so `requireSession()`'s RSC branch can build the `next` redirect target — Next has no built-in "current pathname" API for RSCs. Falls back to `/` if the header is absent (route outside `/studio/*`, where proxy didn't run).
  - Confirmed via `node_modules/next/dist/docs/.../proxy.md` that Next 16's Proxy defaults to the **Node.js runtime**, not Edge — so there's no crypto-availability constraint; the optimistic presence-only check in `proxy.ts` vs. full validation in `requireSession()` is a deliberate architectural split per TD-01, not an Edge-runtime workaround.
  - **Out-of-scope infra fix bundled in (flagged, not silent):** `vitest.setup.ts` unconditionally referenced the `Element` global at module top-level, breaking every default-`node`-environment test file repo-wide (`ReferenceError: Element is not defined`) — confirmed pre-existing on the branch before this SI's changes. Fixed with a 1-line `typeof Element !== "undefined"` guard around the Radix polyfills, since it was blocking verification of this SI's own ACs.
  - `login-form.tsx` now reads `next` via `useSearchParams()` + `safeNext(next, "/")` and navigates there post-login (previously called only `router.refresh()` with no navigation); `login/page.tsx` wrapped in `<Suspense>` per Next's CSR-bailout rule for `useSearchParams()`.
  - `SessionData` gained `channelId`; confirmed `SessionState`/`useSession()` (the client-exposed shape) was NOT touched — no token or channelId-adjacent secret reaches the client provider.

### SI-04.15 — Estratégia de dados e paginação (Setup)
- **Status:** completed
- **Tests:** 16 passing (12 pagination helper + 4 PaginationLinks)
- **Observations:**
  - Added `asChild` support to `components/ui/pagination.tsx`'s `PaginationLink` (via Radix `Slot.Root`) so numbered links can wrap `next/link` instead of a plain `<a>`, per the project's navigation rule. Deliberately did NOT extend `asChild` to `PaginationPrevious`/`PaginationNext` — they hardcode two children internally (icon + span), which violates `Slot.Root`'s single-child requirement; those two still render the primitive's original `<a href>`. Flagged as a minor pre-existing inconsistency, not fixed here (out of scope).
  - `getPaginationWindow` clamps the current page into `[1, totalPages]` and slides a fixed-width window (default 5) that never overruns the edges; shows all pages when `totalPages <= windowSize`.

### SI-04.16 — Cache da página pública (Setup)
- **Status:** completed
- **Tests:** 1 passing
- **Observations:** `next.config.ts` was already bare (no `cacheComponents`, no existing config options) — just added the guard test reading the file source and asserting no match for `/cacheComponents/`.

### SI-04.17 — app/api/auth/login/route.ts → guarda de rotas
- **Status:** completed
- **Tests:** 10 passing (6 login integration + 4 refresh integration); full suite 113/113 of what ran passed (36 unrelated files hit the known worker-pool timeout, confirmed infra noise)
- **Observations:**
  - **Worth flagging to the user:** `GET /channels/me`'s 200 body only exposes `{ id, name, nickname, description, updatedAt }` — no separate account/user id. Since this platform is one channel per user, `userId` in the session is populated from `channel.id` (the only identifier the endpoint returns), not a true distinct user id. Decoding the JWT for a real user id was explicitly rejected as TD-01 Option B in `docs/decisions/technical-decisions-phase-04-frontend-contract-gaps.md`, so this is the decided tradeoff, not a shortcut — but it means `session.userId === session.channelId` in practice for this slice.
  - Removed a stray `console.log(error, data, response)` debug line found in the pre-existing login route — it would have logged raw tokens to server logs.
  - `lib/auth/refresh.ts` needed NO change — it already preserved `channelId`/`channelSlug` from SI-04.14's `SessionData` work; added regression assertions instead of modifying it.
  - Added a minimal `GET /channels/me` MSW handler directly in `mocks/handlers/auth.ts` (not the full `mocks/handlers/channels.ts` module, which is SI-04.20's scope) — just enough for this SI's own login tests.

### SI-04.18 — Guarda de rotas autenticadas (Verification)
- **Status:** completed
- **Tests:** 30 passing (lib/auth + __tests__/proxy.test.ts + app/api/__tests__); Phase 02 auth component regression suite 33/33 passing
- **Observations:**
  - SI-04.14's existing `require-session.test.ts`/`safe-next.test.ts` already fully covered this SI's AC1/AC2 — verified adequate, not duplicated.
  - The `requireSession()`-sweep regression guard (`app/api/__tests__/route-handlers-guard.test.ts`) exports a pure `findUnguardedMutationHandlers()` unit-tested against 5 in-memory fixtures to prove it's falsifiable today; `app/api/videos/**` and `app/api/channels/**` don't exist yet (confirmed via `find`), so the real-directory sweep currently runs vacuously (0 files) but will catch any future mutation handler that omits `requireSession()` once those routes are built in SI-04.33b/34b.
  - `proxy.test.ts` verified the `x-pathname` forwarding mechanism against `node_modules/next/dist/server/web/spec-extension/response.js` rather than assuming the wire format.

### SI-04.19 — BFF: aliases, upstream autenticado e next/image
- **Status:** completed
- **Tests:** 7 passing (authed-upstream.integration); combined re-run with refresh.integration confirmed 11/11 non-flaky
- **Observations:**
  - **next/image decision (for the plan record):** used `unoptimized` on `VideoThumbnail`, not `remotePatterns`. Verified by reading `node_modules/next/dist/server/image-optimizer.js`: for a local `src` (our case, `/api/videos/{id}/thumbnail`), `next/image`'s internal-fetch path does NOT follow redirects — only external/absolute srcs do — so a bare `302` response from the thumbnail endpoint would throw `ImageError(400, "internal response is invalid")` regardless of visibility. `unoptimized` makes the browser issue a plain `<img>` request that follows the 302 natively. `images.localPatterns` was still added (satisfies the AC and Next's dev-time src validation) even though `unoptimized` bypasses that check — keeps the config forward-compatible if a future route handler proxies bytes instead of redirecting.
  - `paths` import audit: only `lib/api/contracts.ts` (the authorized barrel) and `lib/api/upstream.ts` (the typed client itself, explicitly carved out by the BFF rule file) import `paths` directly — no violations found elsewhere.
  - Found and fixed a genuine MSW-timing trap while writing the test: `openapi-fetch`'s `createClient()` captures `globalThis.fetch` at module-load time, not per-request — a top-level `await import(...)` resolves before `mocks/setup.ts`'s `beforeAll(() => server.listen())` runs, binding a pre-MSW `fetch` that would hit real DNS. Fixed by deferring the import into the test file's own `beforeAll`, matching the existing pattern in `app/api/auth/login/__tests__/route.integration.test.ts`.
  - **Flagged for awareness:** the Vitest forks-pool worker-start timeout is now hitting ~35-40% of files on full-suite runs in this environment (not just the occasional 1-2 files noted earlier in the session) — consistently on Docker-for-Windows, a different random file set each run, never a real assertion failure. Worth an infra ticket if it keeps escalating; not investigated further as out of this SI's scope.

### SI-04.20 — MSW: handlers de vídeos, canais e categorias
- **Status:** completed
- **Tests:** 17 (videos) + 16 (channels) passing
- **Observations:**
  - SI-04.17's temporary `GET /channels/me` handler (in `mocks/handlers/auth.ts`) was **removed**, not left alone — kept both would violate the project's one-handler-per-(method,path) MSW convention. Preserved its exact default fixture values (`channel-fixture-id`/`fixture-channel`) verbatim in the new `buildChannel()` factory since `app/api/auth/login/__tests__/route.integration.test.ts` asserts on them; re-ran that suite (6/6 pass) to confirm no regression.
  - **Cross-SI regression caught and fixed:** this SI's full-suite run surfaced a genuine (non-flaky, reproduced in isolation) failure in `components/ui/__tests__/video-thumbnail.test.tsx`, caused by SI-04.19 adding `unoptimized` to `VideoThumbnail`'s `<Image>` — the test still expected `next/image`'s `/_next/image?url=...` rewrite format, which `unoptimized` mode skips. Fixed by updating the test to assert the raw `src` directly; re-verified 4/4 passing plus this SI's own 33 tests (37/37 total in the combined re-run).

### SI-04.21 — Renovação de token em Server Components (Setup)
- **Status:** completed
- **Tests:** 4 smoke tests passing (exhaustive behavior tests deferred to SI-04.22 per plan)
- **Observations:**
  - `safeNext(nextParam, "")` used with an empty-string sentinel fallback — missing `next` and rejected (absolute/protocol-relative) `next` both collapse to the same `!next` branch, returning 400 with `{statusCode, error: "BAD_REQUEST", message}`.
  - The smoke test drives `withRefresh()` with a synthetic fetcher (401 then 200) mirroring the existing `authed-upstream.ts` idiom from SI-04.19, rather than a real upstream round trip.

### SI-04.22 — Renovação de token em Server Components (Verification)
- **Status:** completed
- **Tests:** 7 (route.integration) + 2 (authed-upstream-refresh-chain.integration) passing; Phase 02's refresh.integration.test.ts (4/4) confirmed unchanged and passing
- **Observations:**
  - Removed SI-04.21's smoke test file (`route.smoke.test.ts`) — its coverage was a strict subset of this SI's MSW-backed `route.integration.test.ts` (the route's internal `withRefresh` fetcher trigger was always synthetic by design, but the actual token-refresh call already went through MSW in both files, so "smoke vs integration" collapsed to duplicate coverage with no unit-speed advantage).
  - This closes the entire Frontend Runtime / BFF group (SI-04.14–04.22). Next up: the 6 screen-wiring SIs (SI-04.30.0–35b), which require live Figma calls for the visual-shell (`Xa`) sub-SIs.

### SI-04.30.0 — Drift audit: Menu lateral (Left Menu)
- **Status:** completed
- **Tests:** no tests (audit-only, report is the deliverable)
- **Observations:**
  - Figma MCP access worked fully (`get_design_context` + `get_screenshot` against node 150:959) — no fallback to the written UI Contract needed.
  - 10 alinhado, 3 drift menor, 0 drift relevante, 0 ausente. The plan's flagged gap ("IconButton needs a ghost variant") was already closed — `ghost` is an existing variant and the default.
  - Real drift found: SideNav's grouping/typography didn't match Figma — "You" heading in Figma only scopes Your videos+Liked videos (Home/Subscriptions sit ungrouped above), and group labels/item text used the wrong type scale (`text-label-md`/`text-label-lg` instead of `text-h3`/`text-body-lg`).
  - Created `docs/phases/phase-04-videos-channel-frontend/frontend-drift-report.md` (first drift report of the phase).

### SI-04.30a — Tela de Menu lateral (visual shell)
- **Status:** completed
- **Tests:** no dedicated tests (shell smoke-gated by build AC); 10 pre-existing tests across the touched components re-verified passing
- **Observations:**
  - Applied the 3 auto-Edit decisions from the drift audit: `side-nav.tsx` regrouped + retyped, `side-nav-item.tsx` and `subscription-nav-item.tsx` retyped `text-label-*` → `text-body-lg`.
  - Created `next-frontend/app/(studio)/layout.tsx` (new route group) rendering `AppShell` around `children` — visual-only at this stage, no data fetching.
  - Confirmed SideNav 256px / TopNav 62px fidelity against the Figma screenshot; both were already correct from earlier bootstrap SIs.

### SI-04.30b — Tela de Menu lateral (lógica & wiring)
- **Status:** completed
- **Tests:** no dedicated test file — plan's own Tests table for this SI is empty (layout is a pure Server Component; behavior covered by the E2E spec via `/plan-test-specs`, which can't execute yet since the `/studio/videos` pages it targets don't exist until later screen SIs)
- **Observations:**
  - Added `await requireSession()` (SI-04.14) at the top of `app/(studio)/layout.tsx`, gating the entire `(studio)` route group.
  - Confirmed no separate `SessionProvider` is needed in this layout — the root `app/layout.tsx` already wraps the tree, and `AppShell`/`AccountMenu` already consume it via `useSession()`.

### SI-04.31.0 — Drift audit: Menu de conta do usuário
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:**
  - Figma MCP worked fully (node 150:1267). 5 alinhado, 3 drift menor, 0 relevante, 0 ausente. No CONFLICT vs `menu-lateral`'s prior audit (`IconButton` alinhado/skip in both).
  - Real drift found: `AccountMenuTrigger`'s Avatar had no size override (defaulted 32px vs Figma's 36px); `AccountMenu`'s title/profile-name type scale and profile-block layout (vertical/centered vs Figma's horizontal avatar+text row) didn't match; close `IconButton` needed `size="lg"`; `MenuItem` gap/type scale off.
  - The plan's flagged "320px drawer not dropdown" and "ghost IconButton" concerns were already satisfied by existing code — confirmed, not re-flagged.

### SI-04.31a — Tela de Menu de conta (visual shell)
- **Status:** completed
- **Tests:** no dedicated tests (shell smoke-gated by build AC)
- **Observations:** Applied all drift decisions mechanically to `account-menu-trigger.tsx`, `account-menu.tsx`, `menu-item.tsx`. tsc clean.

### SI-04.31b — Tela de Menu de conta (lógica & wiring)
- **Status:** completed
- **Tests:** 15 passing (3 new wiring + 6 account-menu + 3 account-menu-trigger + 3 app-shell)
- **Observations:**
  - Acceptance criteria were already substantially satisfied by existing wiring from earlier bootstrap SIs — no new wiring code needed, only the dedicated `account-menu.wiring.test.tsx` covering the full `AppShell`-composed flow (avatar click → panel with session identity + no-fetch assertion → Edit Channel href → focus return on close), distinct from the existing isolated component tests.
  - Did not run the full project suite for this SI (scoped to directly-affected files only) — flagged as a gap against the phase-level full-suite run still pending at the end.

### SI-04.32.0 — Drift audit: Painel de gerenciamento de vídeos
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:** Figma MCP worked (node 152:1824). 11 alinhado, 4 drift menor: `badge.tsx` needed a `success` variant (Figma's "Public" label is plain colored text, not a bordered badge) → `video-list-row.tsx` swapped to it; `video-sort-control.tsx` swapped `outline`→`ghost` + smaller muted text; `search-field.tsx` icon-position difference marked `exception` (cosmetic, disabled/inert field anyway).

### SI-04.32a — Tela do Painel (visual shell)
- **Status:** completed
- **Tests:** no dedicated tests (shell smoke-gated by build AC)
- **Observations:** Built with static placeholder data first (3 rows matching Figma), then proceeded directly to 32b's full rewrite rather than pausing at a separate checkpoint — the page needed a full rewrite anyway once real data wiring started.

### SI-04.32b — Tela do Painel (lógica & wiring)
- **Status:** completed
- **Tests:** 4 (thumbnail route passthrough) + route-handlers-guard.test.ts updated (6/6, removed a now-stale "no handlers yet" assertion)
- **Observations:**
  - **Worth flagging — backend OpenAPI gap:** `GET /channels/{id}/manage/videos` accepts `page`/`pageSize` via `@Query()` at runtime but the NestJS controller has no `@ApiQuery` decorators, so the generated types type this operation's query params as `never`. Bridged narrowly in `page.tsx` with a documented `satisfies ManageVideosQuery as unknown as never` cast (correct at runtime, only the compile-time type is bridged). **Recommend a follow-up backend task to add `@ApiQuery` decorators** so the cast can be removed — this is real debt, not cosmetic.
  - **MSW + `redirect: "manual"` incompatibility:** the thumbnail route needs `redirect: "manual"` to capture the upstream's raw 302/Location. Going through the typed `upstream`/`authedUpstream` clients in that mode caused real DNS lookups in tests (`openapi-fetch` builds its own `Request` before the final `fetch()`, bypassing MSW's interceptor in that specific mode). Worked around with a direct `fetch()` call in that one route handler only — a documented, scoped deviation from the BFF rule's "always use `upstream`" default.
  - Playwright isn't installed (known pre-existing gap) — page-level ACs (session+listing, `?page=2` wiring, row-click navigation, no-session redirect) were verified by code-path tracing + existing component tests rather than a fresh E2E run, per the plan's own "Pages → E2E only, authored externally" rule.

### SI-04.33.0 — Drift audit: Tela de edição de vídeo
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:** Figma MCP worked (node 156:2790). 6 alinhado, 5 drift menor (Textarea/Select token reconciliation, ThumbUpload/PrivacyOption ×2), 1 exception (VideoConfigCard, deferred visual polish). Figma's H1 wrongly reads "Channel Settings" (wrong copy for this screen) — noted, not propagated. `PublishButton` has no Figma art (D11) — consistent with it being an inline Button variant in `video-edit-form.tsx`, no separate audit row.

### SI-04.33a — Tela de edição de vídeo (visual shell)
- **Status:** completed
- **Tests:** no dedicated tests (shell smoke-gated by build AC)
- **Observations:**
  - Applied all 5 drift edits: `textarea.tsx`/`select.tsx` token reconciliation (never done since shadcn scaffold), `privacy-option.tsx` gained the missing visual radio-dot indicator, `thumb-upload.tsx`/`video-edit-form.tsx` threaded `durationSeconds` through to the thumbnail badge (was silently never rendering).
  - Created `app/(studio)/studio/videos/[id]/edit/page.tsx` with H1 "Edit video" (not "Channel Settings").

### SI-04.33b — Tela de edição de vídeo (lógica & wiring)
- **Status:** completed
- **Tests:** 5 (PATCH route) + 4 (thumbnail POST) + 3 (publish route) + 7 (video-edit-form.submit.test.tsx) = 19 passing; full suite re-verified 81 files/298 tests passing
- **Observations:**
  - **RSC/Client boundary:** `page.tsx` is a pure async RSC (can't pass functions to a Client Component except via Server Actions, and this project has never used Server Actions — every mutation elsewhere uses Route Handler + `fetch` + `router.refresh()`). Created `components/studio/video-edit-form-container.tsx`, a new `"use client"` wrapper owning the `fetch` calls, to keep that established pattern instead of introducing Server Actions for the first time here.
  - Added `VideoEditSubmitError` class (`field?: "categoryId" | "thumbnail"`) to `video-edit-form.tsx` so the container can steer errors to the right spot; added `publishError` state (Publish previously had no error handling at all).
  - **Real bug found and fixed post-hoc (surfaced only after the disk/Docker infra blocker was resolved — see below):** the new `video-edit-form.submit.test.tsx`'s happy-path test asserted `formData.get("thumbnail") instanceof File`, which is false even for a genuinely-sent file — MSW/undici re-parses the intercepted multipart body with its own `File` constructor, a different realm than the test's own `File` global, so `instanceof` fails across that boundary; the reconstructed File also loses its original name/size fidelity (`name: 'blob'`, wrong `size`) through the jsdom File → fetch → multipart → MSW round trip — a known environment limitation, not app behavior. Fixed by asserting the file-like shape + correct MIME type instead of `instanceof`/exact name. Traced via temporary debug instrumentation (removed before finishing) confirming the container's own logic (`thumbnailFile` state, FormData construction, fetch call) was correct throughout — the bug was purely in the test's assertion, not the shipped code.
  - **Infra blocker encountered and resolved mid-SI:** jsdom-environment Vitest tests became completely unable to start (`Failed to start forks worker`, 60s timeout) partway through this SI. Root-caused (with the user's help) to `node_modules` being served through the same slow Windows-drive Docker bind-mount as source files — `require('jsdom')` alone took ~85s, blowing past Vitest's hardcoded 60s worker-start timeout. Disk-space cleanup and Docker Desktop/WSL2 restarts did NOT fix it (confirmed the same ~85s latency persisted after both). The actual fix: added an anonymous Docker volume override for `node_modules` in `next-frontend/compose.yaml` (`- /home/node/app/node_modules`), so it lives on Docker's native Linux filesystem instead of the bind mount — standard Docker-on-Windows performance pattern. Required a `docker compose up -d --force-recreate`, a one-time `chown -R node:node` fix for the new volume's root-owned permissions, and `npm install` inside the container. Post-fix: full suite runs in ~17s (was 60s+ timeout per single file). **This is a persistent environment fix, not session-scoped** — confirmed by `git diff` on `compose.yaml`.
  - Client-side validation mirror was deliberately NOT extended (no `categoryId`-among-passed-categories refinement, no title/description length limits) because `UpdateVideoDto` in the generated OpenAPI spec still has `"properties": {}` — genuinely no documented field constraints yet; inventing limits would be fabricating constraints not backed by the contract.

### SI-04.34.0 — Drift audit: Tela de edição do canal
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:** Figma MCP worked (node 154:1367). 6 alinhado, 2 drift menor, 0 conflicts. `channel-settings-form.tsx` was missing Figma's supporting-text captions under handle/name fields and used `size="md"` footer buttons instead of `size="sm"`. Confirmed the plan's own flags (Input error-state/36px height, Button outline/sm variant) were already satisfied — no drift there.

### SI-04.34a — Tela de edição do canal (visual shell)
- **Status:** completed
- **Tests:** no dedicated tests (shell smoke-gated by build AC)
- **Observations:** Applied both drift edits to `channel-settings-form.tsx` (supporting-text captions, `size="sm"` buttons).

### SI-04.34b — Tela de edição do canal (lógica & wiring)
- **Status:** completed
- **Tests:** 7 (PATCH route incl. session rewrite) + 4 (channel-settings-form.submit) = 11 passing; full suite re-verified 83 files/309 tests passing, no worker timeouts
- **Observations:**
  - **New mechanic vs SI-04.33b:** after a successful upstream PATCH, `app/api/channels/[id]/route.ts` re-reads the live iron-session (not the `SessionData`-typed object `requireSession()` returns, which has no `.save()`) and rewrites `channelSlug` when the nickname changed, leaving `channelId` untouched. Verified by a dedicated test plus siblings confirming the session stays untouched on no-change and on `NICKNAME_ALREADY_EXISTS`.
  - Fixed a latent gap in the pre-existing `mocks/handlers/channels.ts` PATCH handler: it only echoed `id`/`nickname` back, silently dropping `name`/`description` from the response — extended it so a full update round-trip is actually assertable.
  - `channel-settings-form.tsx`'s Zod schema extended with a `nickname` regex (`/^[a-z0-9_]+$/`) mirroring the backend's `@Matches` validator exactly; `name`/`description` left unconstrained since `UpdateChannelDto` still has `properties: {}` in the generated spec — same judgment call as SI-04.33b's `UpdateVideoDto`.
  - `CHANNEL_NOT_OWNED` intentionally falls through to the generic thrown-error branch (surfaces as an uncaught rejection) per the plan's own "TBD — implementer decides, keep simple."

### SI-04.35.0 — Drift audit: Página pública do canal
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:** Figma MCP worked (node 155:1926). 2 alinhado, 3 drift menor, 1 drift relevante. The relevante finding: the UI Contract requires the channel name on each `VideoCard` but the component had no `channelName` prop at all — added it. Other drift: `ChannelHeader` type-scale (h2→h1, etc.), `VideoSortFilter` chip gap, `FilterChip` retuned from pill/bordered to Figma's `radius-2`/no-border/`bg-card` shape. `VideoThumbnail`/`Pagination` alinhado, prior SI-04.32.0 decisions honored, no CONFLICT.

### SI-04.35a — Página pública do canal (visual shell)
- **Status:** completed
- **Tests:** no dedicated tests (shell smoke-gated by build AC)
- **Observations:** Applied all drift edits to `channel-header.tsx`, `video-sort-filter.tsx`, `filter-chip.tsx`, `video-card.tsx` (new `channelName` prop).

### SI-04.35b — Página pública do canal (lógica & wiring)
- **Status:** completed
- **Tests:** no new tests (plan's own Tests table is empty — page-level behavior is E2E-only; full suite re-verified at 83 files/309 tests, unchanged count, confirming this SI added no test debt)
- **Observations:**
  - **Open question resolved:** no anonymous header/shell was designed in Figma for this route. Since `app/channel/[nickname]/page.tsx` sits outside the `(studio)/` route group, it never picks up `AppShell` — only the root layout (fonts + `SessionProvider`) wraps it, same as `/login`. No shell rendered at all; simplest resolution, matches existing precedent.
  - Uses the plain `upstream` client (no auth header) for both `GET /channels/{nickname}` and `GET /channels/{nickname}/videos` — genuinely anonymous, no `requireSession()` anywhere in this route tree.
  - No `'use cache'`/`revalidate`/`cacheTag` anywhere in `page.tsx` — confirmed by reading the final file, satisfying TD-03's no-cache decision.
  - This closes the final screen SI of the phase. Final phase-level verification (full backend + frontend suites, tsc both subprojects, lint both subprojects per the Deliverables checklist) is still pending — `npm run lint` has been run piecemeal per-SI all session but never as a single final gate alongside the backend's lint, and the nestjs-project lint debt flagged back in SI-04.11/04.12 (pre-existing `no-unsafe-member-access` on `res.body.*`) is still unresolved.
