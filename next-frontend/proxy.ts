import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sessionOptions } from "@/lib/auth/session";

/**
 * Optimistic route guard for `/studio/*` (TD-01). This is a UX-only redirect:
 * it checks only whether the `streamtube_session` cookie is present, not
 * whether it is a valid/unexpired iron-session payload — unsealing it here
 * would duplicate the real check that already happens server-side.
 *
 * Proxy runs on the Node.js runtime by default in Next.js 16 (not Edge), so
 * there is no crypto-availability constraint forcing this to stay
 * presence-only — the constraint is architectural: `requireSession()` in
 * `lib/auth/session.ts` is the actual defense-in-depth (it unseals the cookie
 * and validates `isLoggedIn`), called at the start of every RSC/Route Handler
 * that needs a real session. This guard exists purely to avoid a flash of
 * protected UI before that check runs.
 *
 * The current pathname is also forwarded via the `x-pathname` request header
 * so `requireSession()` can build the same `next=` redirect target when it
 * has to perform the real (non-optimistic) redirect further down the tree.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", `${pathname}${search}`);

  const hasSessionCookie = request.cookies.has(sessionOptions.cookieName);

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/studio/:path*"],
};
