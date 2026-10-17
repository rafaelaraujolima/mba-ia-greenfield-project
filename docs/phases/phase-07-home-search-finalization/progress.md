# Phase 07 — Home, Search and Finalization — Progress

**Status:** in_progress
**SIs:** 17/22 completed

### SI-07.1 — Infra: extensão pg_trgm e índices trigram da busca
- **Status:** completed
- **Tests:** migrations.integration-spec.ts 5/5 passing
- **Observations:** migration written by hand (the TypeORM CLI cannot generate a GIN trigram index); `@Index(..., { synchronize: false })` added to Video and Channel so `migration:generate` and `synchronize` do not try to drop the indexes. Docker Desktop was started to run the test.

### SI-07.2 — Contadores de visualização em lote
- **Status:** completed
- **Tests:** videos.service.integration-spec.ts 26/26; social-counts-viewer-state.e2e-spec.ts 5/5
- **Observations:** the manage-panel `@ApiOperation` description no longer says views is a placeholder.

### SI-07.3 — Serviço de listagem pública e busca de vídeos
- **Status:** completed
- **Tests:** videos.service.spec.ts + videos.service.integration-spec.ts 87/87 passing (3 new unit, 5 new integration); tsc and eslint clean on touched files
- **Observations:** SI-07.1 follow-up: `synchronize: false` is missing from TypeORM 0.3.28 `IndexOptions` typings (runtime honors it), so tsc failed on the SI-07.1 entity decorators; fixed with `UNSYNCHRONIZED_INDEX` in `src/database/unsynchronized-index.options.ts`. Items returned by `findPublic` are `Video & { viewCount }` with `channel` joined; the controller (SI-07.4) maps them.

### SI-07.4 — Endpoint GET /videos
- **Status:** completed
- **Tests:** videos-public-list.e2e-spec.ts 5/5 (from spec videos-public-list.plan.md); videos.e2e-spec.ts and swagger.e2e-spec.ts still passing; tsc and eslint clean
- **Observations:** spec scenario 1.2 also checks the nickname path only via integration (SI-07.3); e2e covers title and channel name.

### SI-07.5 — Infra: sincronizar OpenAPI e tipos do frontend
- **Status:** completed
- **Tests:** no tests (Infra); AC checked: /videos present in both openapi.json, export idempotent (cmp), `tsc --noEmit` exit 0 in next-frontend
- **Observations:** `next-frontend/openapi.json` is gitignored (only `nestjs-project/openapi.json` and `lib/api/types.gen.ts` are committed). `.github/workflows/openapi-freshness.yml` cited in next-frontend/CLAUDE.md does not exist in the repo yet (SI-07.17 creates CI). Host `npm run` fails for frontend scripts (Windows shell); ran inside the next-frontend container. Query param types for `GET /videos` come out of the OpenAPI export; check in SI-07.6 whether q/categoryId/page/pageSize are typed (known caveat: Swagger plugin does not run in the ts-node export).

### SI-07.6 — Aliases de contrato e mocks MSW de GET /videos
- **Status:** completed
- **Tests:** mocks/handlers/__tests__/videos.test.ts 24/24 (7 new for GET /videos); all mocks tests 64/64; tsc exit 0; eslint clean
- **Observations:** the GET /videos handler lives in the existing mocks/handlers/videos.ts (already registered in index.ts). Catalog is 45 deterministic videos (3 pages), 3 channels, categories category-fixture-id-1..3; "Aprenda Docker" is the known search hit; `q=force-error-query` answers 500 for the E2E error scenario. Generated item fields are all optional (OpenAPI export has no required lists), so the catalog keeps title/channel fields beside the item. Failing GET /categories for the E2E degrade scenario is not mocked yet; handle in SI-07.11b/spec authoring.

### SI-07.7 — Layout do grupo (public) com renderização dinâmica (Setup)
- **Status:** completed
- **Tests:** no tests (Setup SI); `npm run build` passes in the container, `tsc --noEmit` exit 0, eslint clean
- **Observations:** `npm run build` needs `API_URL` and `SESSION_PASSWORD` (>=32 chars) in the container env; without them the build fails on env validation (pre-existing, unrelated to the group). Relevant to the production Dockerfile (SI-07.15): build args/env must supply them. The layout only returns children for now; the shell comes in SI-07.8. The placeholder `app/page.tsx` still serves `/` until SI-07.11a replaces it with `(public)/page.tsx`. Docker Desktop had stopped overnight and was restarted.

### SI-07.8 — Shell público ciente de sessão e migração das rotas públicas
- **Status:** completed
- **Tests:** components/layout 36/36 (new: SideNav visitor + Home active, TopNav visitor Sign in, AppShell visitor); full vitest 450/450; tsc exit 0 (after `next build` refreshed `.next/types`); eslint clean; `next build` OK with /watch/[id] and /channel/[nickname] under (public)
- **Observations:** `app/watch` and `app/channel` moved with `git mv` into `app/(public)/`; the redundant `dynamic` export was removed from the watch page. New `lib/api/followed-channels.ts` (uses `optionalAuthedUpstream`) is shared by the studio and public layouts. SideNav/TopNav got an `isLoggedIn` prop (default true, so studio is unchanged); AppShell reads it from the session and hides AccountMenu for visitors. SideNav Home now links to `/` (was `#`) and is active on `/`. The watch/channel pages now render inside AppShell (h-screen with scrolling main), which they did not before: Playwright specs for watch/channel were NOT re-run in this SI (they need the host runner against the dev server) and the desktop-only suggestions column is handled in SI-07.10. Run the Playwright suite at final verification.

### SI-07.9 — Busca funcional no TopNav
- **Status:** completed
- **Tests:** components/layout/__tests__/top-nav-search.test.tsx 6/6 (new); full vitest 456/456; tsc exit 0; eslint clean
- **Observations:** the TopNav search is a new client component `components/layout/top-nav-search.tsx` (form role=search, 100-char limit, trim, empty ignored, prefilled from `q` only on /search, keeps `category` and drops `page` on a new search). It re-mounts on a URL term change via `key` (the lint rule forbids setState in an effect). Existing tests that render TopNav/AppShell (top-nav, app-shell, account-menu.wiring) needed `useRouter`/`useSearchParams` in their `next/navigation` mock. The mobile second-row search is SI-07.10 (the field is still `hidden sm:flex` for now). Voice search button stays disabled.

### SI-07.10 — Shell responsivo
- **Status:** completed
- **Tests:** components/layout/__tests__/app-shell-drawer.test.tsx 5/5 (new); full vitest 462/462; tsc exit 0; eslint clean; `next build` OK
- **Observations:** `AppShell` got a `responsive` prop (set only by the `(public)` layout) so the studio keeps its desktop-first shell; below `md` (matchMedia via useSyncExternalStore, desktop assumed on the server) the SideNav is an overlay drawer opened by the menu button, closed by a link click, Escape or the backdrop, returning focus to the menu button. TopNav search now wraps to a second row below `sm` (single search instance, `order-last`), TopNav takes a `menuButtonRef`. Watch page stacks the suggestions column below `md`; the channel page got 16px gutters and full-width cards below `sm`. Visual behavior (CSS breakpoints) is not asserted by jsdom tests; check it in the browser/Playwright with a mobile viewport at final verification. The grid column reduction for Home/Search cards is applied in SI-07.11a/12a when the grid is built.

### SI-07.11.0 — Drift audit: Home
- **Status:** completed
- **Tests:** no tests (audit-only); report written to frontend-drift-report.md (created); no code touched by this SI
- **Observations:** 13 components audited: 10 alinhado, 1 drift menor (SearchField, exception), 2 drift relevante (TabMenu: retune text-body-md to text-body-lg, gap-2 to gap-3.5, +href option; VideoCard: +'avatar' layout with 40px initials Avatar, gap-4, existing default kept as the no-avatar variant used by the channel page). Figma thumbnails on Home carry no duration badge: SI-07.11b should not pass durationSeconds to VideoCard on Home. ProgressCircular (new) is created in SI-07.11a. The `git diff HEAD -- next-frontend` AC cannot be empty here because SI-07.6 to 07.10 are still uncommitted; verified instead that this SI wrote only the report file. Review/edit the report Decisions before SI-07.11a applies them.

### SI-07.11a — Home (visual shell)
- **Status:** completed
- **Tests:** no tests (shell smoke-gated by build); `next build` OK, `tsc --noEmit` exit 0 (after build refreshed .next/types), eslint 0 errors, full vitest 462/462 (existing TabMenu and VideoCard tests still pass)
- **Observations:** applied the Drift Report decisions mechanically: TabMenu (body-lg text, gap-3.5, `{value,label,href}` options rendering a `<nav>` of links with aria-current; plain string options keep the tablist/button behavior) and VideoCard (`layout="avatar"`, gap-4, 40px initials Avatar; `default`/`list` untouched). SearchField exception is a no-op. New: `components/ui/progress-circular.tsx`, `components/home/home-video-grid.tsx` (responsive grid 1/2/3/4 columns, empty message), `app/(public)/page.tsx` (shell with "All" chip, empty grid, pagination; data wired in SI-07.11b), `app/(public)/loading.tsx` (skeleton grid + ProgressCircular). Removed the Next.js starter `app/page.tsx` (replaced by the (public) page at `/`). Sonar hint on TabMenu props not read-only was left (matches the file's prior style).

### SI-07.11b — Home (lógica & wiring)
- **Status:** completed
- **Tests:** unit/component all passing (full vitest; new: lib/__tests__/catalog.test.ts, components/home/__tests__/home-video-grid.test.tsx, tab-menu link cases, video-card avatar case, MSW error-category case); tsc exit 0; eslint 0 errors. E2E `tests/home-catalog.e2e-spec.ts` (authored from specs/home-catalog.plan.md) was written but NOT passing in this environment: see observations.
- **Observations:** E2E BLOCKER (environment): with the containerized dev server started as in CLAUDE.md (`MSW_ENABLED=true`, instrumentation confirmed running), MSW does not intercept the server-side upstream fetch (`getaddrinfo ENOTFOUND nestjs-api` from `upstream.GET`); the existing `tests/auth-login.e2e-spec.ts` fails the same way, so it is not specific to this SI. Needed on the host: `npx playwright install chromium` (done, browser v1223) and `node node_modules/@playwright/test/cli.js` because the host `.bin` shims are Linux symlinks. Needs investigation before the phase E2E can be trusted. Code: `lib/catalog.ts` (parseCategoryId, catalogHref, categoryChips, toHomeVideos), `app/(public)/page.tsx` wired to GET /videos and GET /categories in parallel (failed categories drop only the chips; failed videos throw to `app/(public)/error.tsx`), empty message per category. MSW: category fixture ids are now uuids (the catalog discards non-uuid `category`), reserved error category uuid `...0ee` makes GET /videos answer 500. Spec home-catalog.plan.md scenario 2.2 was narrowed: no MSW trigger exists to fail only GET /categories, so that degradation is covered by code review, not E2E. The Home grid does not pass durationSeconds (Figma has no badge).

### SI-07.12.0 — Drift audit: Resultados de busca
- **Status:** completed
- **Tests:** no tests (audit-only); section `## Screen: search` appended to frontend-drift-report.md; no code touched
- **Observations:** 6 components audited: 5 alinhado (TabMenu and VideoCard honor the SI-07.11.0 decisions already applied in SI-07.11a), 1 drift menor (SearchField, exception carried over from Home). The search screen has no Figma frame of its own (variant of the Home frame); SearchResultsHeading and EmptyResults are new, derived components with no Figma demand.

### SI-07.12a — Resultados de busca (visual shell)
- **Status:** completed
- **Tests:** no tests (shell smoke-gated by build); `next build` OK (`/search` dynamic), tsc exit 0, eslint 0 errors
- **Observations:** no drift decisions to apply (all skip/exception in the search report section). New: `components/search/search-results-heading.tsx` (h1 with term + aria-live total), `components/search/empty-results.tsx`, `app/(public)/search/page.tsx` (structure only; redirect, data, chips and pagination come in SI-07.12b), `app/(public)/search/loading.tsx` (re-exports the group skeleton).

### SI-07.12b — Resultados de busca (lógica & wiring)
- **Status:** completed
- **Tests:** full vitest 476/476 (new: search-results-heading, empty-results, parseSearchTerm); tsc exit 0; eslint 0 errors. E2E `tests/search-results.e2e-spec.ts` (from specs/search-results.plan.md) written but NOT run: same MSW interception blocker recorded in SI-07.11b.
- **Observations:** `app/(public)/search/page.tsx`: `q` trimmed/capped at 100 (`parseSearchTerm` in lib/catalog.ts), empty `q` redirects to `/`, GET /videos with q/categoryId/page plus GET /categories in parallel, chips and pagination links keep `q` and `category`, EmptyResults when total is 0, failed videos throw to the group `error.tsx`, failed categories only drop the chips. The pagination/category E2E scenario uses `q=a`, which matches titles/channels in the MSW catalog.

### SI-07.13 — Infra: Playwright full-stack
- **Status:** completed
- **Tests:** no tests (Infra). Verified: `--project=chromium` lists no fullstack test and the whole MSW suite passes 17/17 (auth 9, home 4, search 4); `--project=fullstack` runs the new smoke `tests/fullstack/stack-health.spec.ts` (1 passed against the real stack) and fails with an explicit "Full-stack environment is not running: ..." error when the API/Mailpit were down; full vitest 476/476 (fullstack folder excluded); tsc 0; eslint 0 errors.
- **Observations:** ROOT CAUSE of the E2E blocker from SI-07.11b/12b FOUND AND FIXED: Next re-patches `globalThis.fetch` after `instrumentation.ts` ran, bypassing MSW's interceptor. `instrumentation.ts` now pins MSW's fetch with `Object.defineProperty(globalThis, "fetch", { get, set: noop })` (only when `MSW_ENABLED=true`). With it the existing auth E2E passes and the Home/Search E2E written in SI-07.11b/12b pass (home 4/4, search 4/4), so the "E2E not run" notes on those two SIs are resolved. Also: `tests/fixtures.ts` now stubs the non-existent `fixture-storage.example.com` host (the thumbnail 302 target) so the page `load` event does not wait on DNS; the host `.bin` shims are Linux symlinks, run Playwright with `node node_modules/@playwright/test/cli.js`. Added: playwright.config.ts (projects chromium + fullstack), `tests/fullstack/fixtures.ts` (stack check incl. MSW detection, register/confirmEmail via Mailpit/loginViaUi/createConfirmedAccount helpers), `npm run test:e2e:fullstack`, `test:e2e` now `--project=chromium`, README section "Full-stack E2E", vitest `exclude` for `tests/fullstack/**`. The API container needed `npx nest start` (watch mode never became ready on the Windows bind mount) and the frontend must run with `API_URL=http://host.docker.internal:3000` (separate compose networks).

### SI-07.14 — Specs full-stack dos fluxos principais
- **Status:** pending
- **Tests:** no tests
- **Observations:** none

### SI-07.15 — Infra: Dockerfiles de produção
- **Status:** pending
- **Tests:** no tests
- **Observations:** none

### SI-07.16 — Infra: compose de produção, proxy e runbook
- **Status:** pending
- **Tests:** no tests
- **Observations:** none

### SI-07.17 — Infra: workflow de CI
- **Status:** pending
- **Tests:** no tests
- **Observations:** none

### SI-07.18 — Infra: workflow de deploy
- **Status:** pending
- **Tests:** no tests
- **Observations:** none
