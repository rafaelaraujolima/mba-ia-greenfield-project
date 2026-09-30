import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { config, proxy } from "@/proxy";
import { sessionOptions } from "@/lib/auth/session";

describe("proxy", () => {
  it("matches only /studio/:path*", () => {
    expect(config.matcher).toEqual(["/studio/:path*"]);
  });

  it("redirects to /login?next=<path+search> when no session cookie is present", () => {
    const request = new NextRequest(
      "http://localhost:3001/studio/videos?tab=drafts"
    );

    const response = proxy(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/studio/videos?tab=drafts");
  });

  it("lets the request through (optimistically) when the session cookie is present", () => {
    const request = new NextRequest("http://localhost:3001/studio/videos", {
      headers: { cookie: `${sessionOptions.cookieName}=sealed-value` },
    });

    const response = proxy(request);

    // NextResponse.next() sets this marker instead of a `location` header —
    // no redirect happened.
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it("forwards the current path+search via x-pathname for requireSession()'s redirect target", () => {
    const request = new NextRequest(
      "http://localhost:3001/studio/videos?tab=drafts",
      { headers: { cookie: `${sessionOptions.cookieName}=sealed-value` } }
    );

    const response = proxy(request);

    // NextResponse.next({ request: { headers } }) encodes the overridden
    // request headers as x-middleware-request-<name> on the response.
    expect(response.headers.get("x-middleware-request-x-pathname")).toBe(
      "/studio/videos?tab=drafts"
    );
  });

  it("does not redirect for a cookie presence check alone — a garbage cookie value still passes through (optimistic, not the real check)", () => {
    const request = new NextRequest("http://localhost:3001/studio/settings", {
      headers: { cookie: `${sessionOptions.cookieName}=not-a-real-sealed-value` },
    });

    const response = proxy(request);

    expect(response.headers.get("location")).toBeNull();
  });
});
