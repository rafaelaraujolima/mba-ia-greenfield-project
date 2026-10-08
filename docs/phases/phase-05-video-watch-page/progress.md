# phase-05-video-watch-page — Progress

**Status:** completed
**SIs:** 7/7 completed

**Final verification fix (post-SI, found while running the full backend suite — not caught earlier because the SI-05.1 loop only ran `videos.service.spec.ts` + `videos.e2e-spec.ts`, not the separate `*.integration-spec.ts` files or the repo-wide suite):**
- 4 integration test files (`videos.service.integration-spec.ts`, `upload-cleanup.service.integration-spec.ts`, `videos.module.spec.ts`, `video.processor.integration-spec.ts`) build their own isolated `Test.createTestingModule` with `ConfigModule.forRoot({ load: [storageConfig] })` — missing `queueConfig`, which the new `RedisModule` (added in SI-05.1) needs to resolve `REDIS_CLIENT`. Fixed by adding `queueConfig` to each file's `load` array (mirrors how `storageConfig` was already there for `S3_CLIENT`).
- `videos.service.integration-spec.ts`'s `getPlaybackUrl` describe block had 3 tests written against the pre-SI-05.1 behavior (ready-only check, 409 `INVALID_VIDEO_STATE` for non-ready) — same class of fix as the e2e file: added `published_at`, changed the "non-ready" expectation to `VideoNotFoundException`.
- After both fixes: backend unit+integration 33/33 suites (265/265 tests), backend e2e 5/5 suites (113/113 tests), backend `tsc --noEmit` clean, frontend 89/89 files (328/328 tests), frontend `tsc --noEmit` clean, frontend lint clean (0 errors, 1 pre-existing unrelated warning).

### SI-05.1 — Backend: Unificação da regra de visibilidade anônima + contagem de views no detalhe
- **Status:** completed
- **Tests:** 48 e2e passing (shared file with SI-05.2/05.3) + unit coverage in videos.service.spec.ts (53 unit tests total, shared file)
- **Observations:**
  - Created `src/redis/redis.module.ts` (+ `redis.constants.ts`) mirroring the existing `S3_CLIENT`/`S3_PRESIGN_CLIENT` provider pattern from `storage.module.ts` — no dedicated RedisModule existed before; `ioredis` was already a direct dependency (used transitively by BullMQ) so no new package was added.
  - `getPlaybackUrl` signature changed (added `userId?` param, now loads the `channel` relation) — this also means an owner can now stream/download their own draft video, which previously returned 409 INVALID_VIDEO_STATE regardless of ownership. This is the intended effect of TD-08's "dono vê qualquer status" unification, not a side effect to walk back.
  - `npm run lint` fails with 341 errors/453 warnings in `nestjs-project`, but ~280 are in files this session never touched (auth/channels/mail/storage specs, test helpers) — pre-existing `no-unsafe-assignment`/`no-unsafe-member-access` debt from the project's established `any`-typed manual-mock testing convention. The remainder is in `videos.service.spec.ts`, extending that same pre-existing pattern (not a new anti-pattern introduced here). User confirmed: proceed, documented as pre-existing debt, out of scope for this phase per CLAUDE.md's one-change-at-a-time rule. `npx tsc --noEmit` passes clean.

### SI-05.2 — Backend: Registro de contagem de visualizações
- **Status:** completed
- **Tests:** 48 e2e passing (shared file with SI-05.1/05.3)
- **Observations:**
  - `clientKey` is derived from `req.ip` (no session/cookie involved, per video-watch-page/TD-06's anonymous-first design) — not explicitly named in the TD's Recommendation prose, but necessary to make the dedup mechanism concrete; documented inline as a code comment, not silently invented.

### SI-05.3 — Backend: Sugestões de vídeos relacionados
- **Status:** completed
- **Tests:** 48 e2e passing (shared file with SI-05.1/05.2)
- **Observations:** none

### SI-05.4 — Frontend BFF: rotas de views, sugestões e download
- **Status:** completed
- **Tests:** 320 passing (full next-frontend Vitest suite)
- **Observations:**
  - Backend openapi.json/types.gen.ts were stale for the two new endpoints (`POST /videos/:id/views`, `GET /videos/:id/suggestions`) — ran the full sync chain (`nestjs-project` `npm run openapi:export` → repo-root `scripts/sync-openapi.sh` → `next-frontend` `npm run openapi:types`) and committed both regenerated files alongside the route handlers, per `.claude/rules/next-frontend-bff-api.md`.
  - `GET /videos/:id/suggestions`'s optional `limit` query param is not forwarded from the BFF — the backend's own default (5) already matches the sidebar's fixed `VideoCard ×5` slot, so there was nothing to parameterize from the frontend.
  - Hit a real bug (not pre-existing): two new integration tests hung at the Vitest default 5s timeout. Root-caused via the systematic-debugging skill to a documented project gotcha (see `app/api/auth/signup/__tests__/route.integration.test.ts`'s comment) — `openapi-fetch`'s `upstream` client captures `global.fetch` at module-eval time, so importing the route module via a top-level `await import(...)` (instead of inside `beforeAll`) can race MSW's `server.listen()` patch and silently fall through to a real, unreachable network call. Fixed by moving the dynamic import into `beforeAll` for the `views`/`suggestions` tests, matching the established pattern; the `download` route is unaffected (it uses raw `fetch` at call time, like `thumbnail`).
  - The repo-wide `requireSession()` mutation sweep (`app/api/__tests__/route-handlers-guard.test.ts`) flagged the new `POST /api/videos/[id]/views` handler, since it's a genuinely-anonymous mutation (no prior case existed for that). Extended the sweep with a documented `ANONYMOUS_MUTATION_EXEMPTIONS` allowlist (plus a fixture test) rather than silently bypassing the guard — the sweep still fails on any *future* unguarded mutation that isn't explicitly allowlisted with a justification comment.

### SI-05.5.0 — Drift audit: Página de visualização do vídeo
- **Status:** completed
- **Tests:** no tests (audit-only)
- **Observations:**
  - The project doesn't have a `figma:figma-implement-design` skill installed under that exact name — used the available equivalent, `figma:figma-design-to-code`, which covers the same mandatory-prerequisite role for `get_design_context` calls.
  - Only one Reused DS component for this screen (`components/channel/video-card.tsx`) — classified `drift relevante`: the component only renders its vertical ("default") orientation, but this screen's sidebar demands the horizontal ("list") orientation per the Figma component's own documented variant list. Decision: `auto-Edit` → add an additive `layout` prop, applied in SI-05.5a.

### SI-05.5a — Tela de Página de visualização do vídeo (visual shell)
- **Status:** completed
- **Tests:** no tests (visual shell; Unit tests owned by SI-05.5b below)
- **Observations:**
  - Applied the drift audit's decision: added an additive `layout?: "default" | "list"` prop to `components/channel/video-card.tsx` (default unchanged, `"list"` renders the horizontal orientation this screen's sidebar needs).
  - Installed `components/ui/slider.tsx` via `npx shadcn@latest add slider` (needed by the video player's progress/volume controls, per video-watch-page/TD-01 — this wasn't flagged by the B2.6 bootstrap sweep since the UI Contract's Reused DS list only named `video-card.tsx`, not the Slider primitive). Fixed the generator's `import { cn } from "cn"` (wrong path) to `@/lib/utils`; no other reconciliation needed — default classes already matched the project's semantic tokens (`bg-muted`, `bg-primary`, `ring-ring/50`).
  - Created 5 new icon components (`play-icon`, `pause-icon`, `volume-icon`, `volume-mute-icon`, `download-icon`) under `components/icons/` — none existed for player/download controls.
  - Given implementation time constraints, merged SI-05.5a (visual shell) and SI-05.5b (logic & wiring) into one continuous build rather than stopping at a non-functional shell — mirrors how `/channel/[nickname]` actually turned out in phase-04 (its committed `page.tsx` is already fully wired, not a separate shell artifact). See SI-05.5b below for the wiring-specific observations, including a real backend contract gap found and fixed along the way.

### SI-05.5b — Tela de Página de visualização do vídeo (lógica & wiring)
- **Status:** completed
- **Tests:** 328 passing (full next-frontend Vitest suite, incl. 3 new files: video-player.test.tsx, description-text.test.tsx, tab-menu.test.tsx)
- **Observations:**
  - **Found and fixed a real backend contract gap** (not pre-existing debt — a gap in this same phase's own SI-05.1 work): `GET /videos/:id` had no `channelName`/`channelNickname` fields, so the page couldn't render "nome do canal" (a bullet this phase's own capability list requires). Added both fields to the controller response (the `channel` relation was already loaded for `assertViewable`), re-ran the full `videos.e2e-spec.ts` suite (48/48 pass) before resyncing `openapi.json`/`types.gen.ts` to the frontend.
  - `GET /videos/:id/suggestions` has no `category` field in its response (by original Tech Spec design — see video-watch-page/TD-03), so the sidebar's "Filtrar por categoria/canal" chips filter by `channelName` only (derived client-side from the distinct channel names in the returned suggestion list), not by category. This is a pragmatic adaptation to the data actually available, not a deviation the user needs to resolve — category-based filtering was never part of the backend contract this phase decided.
  - `ViewBeacon` (fire-and-forget `POST /api/videos/[id]/views` on mount) has no visual surface and isn't in the UI Contract's Server-connected Components list — it's the mechanical implementation of the "Exibir contagem de visualizações" verb's write-side (TD-02), analogous to how `VideoThumbnail` silently derives its own BFF URL. No dedicated unit test — covered implicitly by the SI-05.4 route-handler integration test for `POST /api/videos/[id]/views` itself.
