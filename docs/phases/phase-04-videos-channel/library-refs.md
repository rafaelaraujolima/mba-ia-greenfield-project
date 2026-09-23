---
libs:
  "@types/multer":
    version: "^2.x (types for multer runtime, transitive via @nestjs/platform-express)"
    context7_id: "/expressjs/multer"
    fetched_at: "2026-09-22T19:35:00-04:00"
sources_mtime:
  docs/decisions/technical-decisions-phase-04-videos-channel.md: "2026-09-22T19:27:23-04:00"
---

# phase-04-videos-channel — Library Reference Cache

### @types/multer

Types-only package (DefinitelyTyped) for `multer`, the runtime already installed transitively via `@nestjs/platform-express`. Context7 does not index `@types/multer` separately — the distilled excerpt below is from `multer` itself (`/expressjs/multer`), since the types mirror this exact runtime API and `phase-04-videos-channel/TD-02`'s implementation (`FileInterceptor` + `@UploadedFile()`) consumes it directly.

**Relevant surface for TD-02 (thumbnail upload via `FileInterceptor`):**

### File filter + size/count limits

```javascript
const multer = require('multer')
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only images allowed'))
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10
  }
})
```

In NestJS, this maps to `FileInterceptor('thumbnail', { limits: { fileSize }, fileFilter })` — or, per TD-02's Recommendation, the native Nest pipes `ParseFilePipe` + `FileTypeValidator` + `MaxFileSizeValidator` as an alternative to the raw multer `fileFilter`/`limits` options.

### `Express.Multer.File` shape (what `@types/multer` types)

The `file` object passed to `fileFilter` and available as `req.file` (single) / `req.files` (array) — and consumed via `@UploadedFile() file: Express.Multer.File` in the Nest controller — exposes: `fieldname`, `originalname`, `encoding`, `mimetype`, `size`, plus storage-engine-specific fields (`buffer` for `memoryStorage`, `path`/`destination`/`filename` for `diskStorage`).

### `MulterError` handling

```javascript
if (err instanceof multer.MulterError) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).send('File too large')
  }
}
```

Relevant if TD-02's implementation wants explicit multer-level error mapping distinct from Nest's `ParseFilePipe` validation-exception path (both are viable per the TD's Recommendation).

Source: [expressjs/multer](https://github.com/expressjs/multer) via Context7 (`/expressjs/multer`), fetched 2026-09-22.
