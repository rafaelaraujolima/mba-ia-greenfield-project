# phase-04-videos-channel — Progress

**Status:** completed
**SIs:** 9/9 completed

### SI-04.1 — Categoria: entidade + migration
- **Status:** completed
- **Tests:** 2 passing
- **Observations:**
  - Added `categories` cleanup line to the shared `cleanAllTables` test helper (`src/test/create-test-data-source.ts`) so future entities referencing categories can rely on it too.

### SI-04.2 — Categoria: módulo + endpoint GET /categories
- **Status:** completed
- **Tests:** 3 passing
- **Observations:** none

### SI-04.3 — Vídeo: colunas de edição + migration
- **Status:** completed
- **Tests:** 9 passing
- **Observations:** none

### SI-04.4 — Vídeo: edição de informações (PATCH /videos/:id)
- **Status:** completed
- **Tests:** 61 passing (combined with videos.module.spec.ts, videos.service.integration-spec.ts, test/videos.e2e-spec.ts — all needed a constructor-signature touch-up for the new `categoriesService` dependency)
- **Observations:**
  - `VideosService`'s constructor gained a `categoriesService` parameter — every pre-existing `new VideosService(...)` call site in `videos.service.spec.ts` (19 total) needed the new arg inserted; also added `Category` to the entity arrays in `videos.module.spec.ts` and `videos.service.integration-spec.ts` since `VideosModule` now imports `CategoriesModule`.
  - Added `CategoriesService.findById(id)` (not in the original Tech Spec wording) to support the category-existence check in `VideosService.update`.

### SI-04.5 — Vídeo: upload de thumbnail customizada
- **Status:** completed
- **Tests:** 54 passing (27 unit + 27 e2e)
- **Observations:**
  - `tsconfig.json`'s `"types"` array was pinned to `["jest", "node"]`, so `@types/multer`'s global `Express.Multer.File` augmentation never loaded — added `"multer"` to the array.
  - Fix-loop attempt 1/3: e2e `POST /videos/:id/thumbnail` success test expected `200` but got Nest's default `201` for POST — added `@HttpCode(HttpStatus.OK)` to the controller handler. Re-run confirmed the fix.
  - `MAX_THUMBNAIL_FILE_SIZE_BYTES` (5MB) was not explicitly named in the Tech Spec's Error Catalog trigger text — chosen as a reasonable default consistent with the project's existing size-limit pattern (`MAX_VIDEO_FILE_SIZE_BYTES`).

### SI-04.6 — Vídeo: publicação (POST /videos/:id/publish)
- **Status:** completed
- **Tests:** 62 passing (unit + e2e)
- **Observations:** none

### SI-04.7 — Canal: listagem paginada do painel (GET /channels/:id/videos)
- **Status:** completed
- **Tests:** 86 passing (unit + integration + e2e)
- **Observations:**
  - `pageSize` capped at 100 in `ListChannelVideosDto` (`@Max(100)`) — the Tech Spec named no upper bound; chosen to prevent unbounded queries. `views`/`likes`/`comments` return `0` placeholders per the AMB-3 clarification.
  - Route lives on `VideosController` (`@Get('channels/:id/videos')`) per the SI's technical action, not a `ChannelsController` — SI-04.8 introduces that controller for the public routes.

### SI-04.8 — Canal: página pública + listagem pública
- **Status:** completed
- **Tests:** full suite green — 229 unit+integration, 92 e2e
- **Observations:**
  - Plan defect resolved with the user: `GET /channels/:id/videos` (panel, SI-04.7) and `GET /channels/:nickname/videos` (public) had the same route pattern. User chose to move the panel route to `GET /channels/:id/manage/videos`; controller, e2e tests and the plan doc (SI-04.7, API Contracts, Authorization Matrix, Deliverables) were updated. The API Contracts heading also carried a wrong SI ref (SI-04.5) — corrected to SI-04.7.
  - Deviation from the plan text: `GET /channels/:nickname/videos` lives in `VideosController` (not `ChannelsController`) to avoid a `ChannelsModule` ↔ `VideosModule` circular dependency (`VideosModule` already imports `ChannelsModule`). `ChannelsController` serves only `GET /channels/:nickname`. `ChannelsModule` was not added to `AppModule` — it is already loaded through `VideosModule`/`AuthModule`.
  - Fix-loop attempt 1/3: SI-04.3's `Video.category` relation broke 13 spec files whose TypeORM entity arrays omitted `Category` (not caught earlier because only SI-scoped tests were run). Added `Category` to all of them and rewrote `src/database/migrations.integration-spec.ts` (5 migrations, 6 tables, revert test now checks the video editing columns). A botched batch `perl` edit (unescaped `/` in the replacement) corrupted 4 files' first line; fixed and verified with `tsc`.

### SI-04.9 — Canal: edição de informações (PATCH /channels/:id)
- **Status:** completed
- **Tests:** 23 passing (unit + e2e for the touched files)
- **Observations:**
  - `UpdateChannelDto.nickname` validates `^[a-z0-9_]+$` (max 50, matching the column) — mirrors the allowlist of `phase-02-auth/TD-10`; the Tech Spec named no format for edits.
  - Collision is checked up front (`findByNickname`) and a Postgres unique violation on `nickname` (race between check and save) is also mapped to `NICKNAME_ALREADY_EXISTS`. Unchanged nickname skips the collision check.
  - `npm run lint` baseline is already red (~280 errors, mostly `no-unsafe-member-access` on `res.body` and `as any` mocks in specs that pre-date this phase, e.g. `test/auth.e2e-spec.ts`, `src/auth/auth.service.spec.ts`; production-code errors are the pre-existing `err as any` in `channels.service.ts:19-23` and `create-test-data-source.ts:9`). This phase's new specs follow the same pattern and add to that count; lint was not made green here (out of scope) — surfaced for the final verification.
