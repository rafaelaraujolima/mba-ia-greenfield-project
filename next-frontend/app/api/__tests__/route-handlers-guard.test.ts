import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Regression-guard sweep (SI-04.18): every **mutation** Route Handler
 * (POST/PUT/PATCH/DELETE) under `app/api/videos/**` and `app/api/channels/**`
 * must call `requireSession()`.
 *
 * Documented exceptions — both are non-mutation (`GET`) handlers, so they
 * are already outside this sweep's scope by method alone; listed here for
 * traceability with the SI, not because the scanner special-cases them:
 * - `GET /api/videos/[id]/thumbnail` (session optional).
 * - `GET /api/auth/refresh` (doesn't require an input session; also outside
 *   the videos/channels directories this sweep scans).
 *
 * `ANONYMOUS_MUTATION_EXEMPTIONS` below is the escape hatch for a *mutation*
 * method that is intentionally anonymous — the sweep still runs for these
 * files, it just doesn't flag the listed method:
 * - `POST /api/videos/[id]/views` (SI-05.4, video-watch-page/TD-02/TD-06):
 *   anonymous view-count registration, same `@Public()` contract as the
 *   backend endpoint it forwards to; client identity for dedup is the
 *   request IP, not a session.
 *
 * The sweep scans whatever is on disk under `app/api/videos/**` and
 * `app/api/channels/**` as screen-wiring SIs add real handlers (the first,
 * `GET /api/videos/[id]/thumbnail`, landed in SI-04.32b — a documented
 * exception per above, not a mutation handler). The `findUnguardedMutationHandlers`
 * logic is unit-tested against in-memory fixtures further down so the sweep
 * is provably falsifiable: it fails if a matching real mutation handler is
 * ever added without calling `requireSession()` or being added here with a
 * justification comment.
 */

const MUTATION_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;
type MutationMethod = (typeof MUTATION_METHODS)[number];

function isMutationMethod(method: string): method is MutationMethod {
  return (MUTATION_METHODS as readonly string[]).includes(method);
}

interface Violation {
  file: string;
  method: string;
}

const ANONYMOUS_MUTATION_EXEMPTIONS: readonly Violation[] = [
  { file: "videos/[id]/views/route.ts", method: "POST" },
];

function isExempt(file: string, method: string): boolean {
  return ANONYMOUS_MUTATION_EXEMPTIONS.some(
    (e) => e.file === file && e.method === method
  );
}

const EXPORT_PATTERN =
  /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(|export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*[:=]/g;

/**
 * Pure scanning logic over in-memory file contents (path -> source text).
 * Kept separate from filesystem access so it can be exercised with fixtures
 * regardless of what currently exists on disk.
 */
export function findUnguardedMutationHandlers(
  files: Record<string, string>
): Violation[] {
  const violations: Violation[] = [];

  for (const [file, content] of Object.entries(files)) {
    const matches = [...content.matchAll(EXPORT_PATTERN)]
      .map((m) => ({ method: m[1] ?? m[2] ?? "", index: m.index ?? 0 }))
      .sort((a, b) => a.index - b.index);

    matches.forEach((match, i) => {
      if (!isMutationMethod(match.method)) return;

      const bodyEnd =
        i + 1 < matches.length ? matches[i + 1].index : content.length;
      const body = content.slice(match.index, bodyEnd);

      if (
        !body.includes("requireSession(") &&
        !isExempt(file, match.method)
      ) {
        violations.push({ file, method: match.method });
      }
    });
  }

  return violations;
}

function collectRouteFiles(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  if (!existsSync(root)) return files;

  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name === "route.ts") {
        files[relative(root, full)] = readFileSync(full, "utf-8");
      }
    }
  }

  walk(root);
  return files;
}

describe("findUnguardedMutationHandlers (sweep logic, fixture-based)", () => {
  it("flags a mutation handler that never calls requireSession()", () => {
    const violations = findUnguardedMutationHandlers({
      "videos/route.ts": `
        import { NextResponse } from "next/server";
        export async function POST(request: Request) {
          return NextResponse.json({}, { status: 201 });
        }
      `,
    });

    expect(violations).toEqual([{ file: "videos/route.ts", method: "POST" }]);
  });

  it("does not flag a mutation handler that calls requireSession()", () => {
    const violations = findUnguardedMutationHandlers({
      "videos/route.ts": `
        import { requireSession } from "@/lib/auth/session";
        export async function POST(request: Request) {
          const session = await requireSession({ routeHandler: true });
          if (session instanceof Response) return session;
          return new Response(null, { status: 201 });
        }
      `,
    });

    expect(violations).toEqual([]);
  });

  it("does not flag GET handlers (non-mutation), even without requireSession()", () => {
    const violations = findUnguardedMutationHandlers({
      "videos/[id]/thumbnail/route.ts": `
        export async function GET(request: Request) {
          return new Response(null, { status: 200 });
        }
      `,
    });

    expect(violations).toEqual([]);
  });

  it("evaluates each exported handler in a multi-export file independently", () => {
    const violations = findUnguardedMutationHandlers({
      "videos/[id]/route.ts": `
        import { requireSession } from "@/lib/auth/session";

        export async function GET(request: Request) {
          return new Response(null, { status: 200 });
        }

        export async function PATCH(request: Request) {
          const session = await requireSession({ routeHandler: true });
          if (session instanceof Response) return session;
          return new Response(null, { status: 200 });
        }

        export async function DELETE(request: Request) {
          return new Response(null, { status: 204 });
        }
      `,
    });

    expect(violations).toEqual([
      { file: "videos/[id]/route.ts", method: "DELETE" },
    ]);
  });

  it("does not flag an exempted anonymous mutation handler", () => {
    const violations = findUnguardedMutationHandlers({
      "videos/[id]/views/route.ts": `
        export async function POST(request: Request) {
          return new Response(null, { status: 204 });
        }
      `,
    });

    expect(violations).toEqual([]);
  });

  it("supports the const-arrow export form", () => {
    const violations = findUnguardedMutationHandlers({
      "channels/route.ts": `
        export const POST = async (request: Request) => {
          return new Response(null, { status: 201 });
        };
      `,
    });

    expect(violations).toEqual([{ file: "channels/route.ts", method: "POST" }]);
  });
});

describe("app/api/videos and app/api/channels — requireSession() sweep", () => {
  const apiRoot = join(import.meta.dirname, "..");
  const scanDirs = ["videos", "channels"];

  it("every mutation handler under app/api/videos/** and app/api/channels/** calls requireSession()", () => {
    const files = scanDirs.reduce<Record<string, string>>((acc, dir) => {
      const dirFiles = collectRouteFiles(join(apiRoot, dir));
      for (const [path, content] of Object.entries(dirFiles)) {
        acc[`${dir}/${path}`] = content;
      }
      return acc;
    }, {});

    const violations = findUnguardedMutationHandlers(files);

    expect(violations).toEqual([]);
  });
});
