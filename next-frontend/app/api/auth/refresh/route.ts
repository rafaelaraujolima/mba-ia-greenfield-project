import { NextResponse } from "next/server";

import { withRefresh } from "@/lib/auth/refresh";
import { safeNext } from "@/lib/auth/safe-next";

/**
 * Renews the session from a Server Component redirect chain (TD-01 —
 * `authed-upstream.ts`'s `callAuthed` redirects here on a 401 when it
 * cannot write cookies itself during RSC rendering).
 *
 * `next` must be a same-origin relative path (validated via `safeNext`,
 * SI-04.14) — anything else (missing, absolute, protocol-relative) is
 * rejected with 400 rather than silently falling back, since a redirect
 * target here comes from an untrusted query string.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nextParam = searchParams.get("next");

  // safeNext only ever falls back to the sentinel when `next` is missing
  // or fails the same-origin check — both are the 400 condition here.
  const next = safeNext(nextParam, "");
  if (!next) {
    return NextResponse.json(
      {
        statusCode: 400,
        error: "BAD_REQUEST",
        message: "Missing or invalid 'next' parameter",
      },
      { status: 400 }
    );
  }

  // Drive withRefresh()'s single-flight refresh-and-retry without a real
  // upstream call: the fetcher reports 401 on its first invocation
  // (forcing the refresh attempt), then reports success on a second
  // invocation — which withRefresh only makes if the refresh succeeded.
  let attempts = 0;
  const result = await withRefresh(async () => {
    attempts += 1;
    return new Response(null, { status: attempts === 1 ? 401 : 200 });
  });

  if (result.status === 200) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(
    new URL(`/login?next=${encodeURIComponent(next)}`, request.url)
  );
}
