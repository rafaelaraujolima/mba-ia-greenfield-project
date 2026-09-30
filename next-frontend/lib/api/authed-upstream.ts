import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { withRefresh } from "@/lib/auth/refresh";
import { getSession } from "@/lib/auth/session";

import { upstream } from "./upstream";

export interface AuthedUpstreamOptions {
  /**
   * Pass `true` when calling from a Route Handler. A `401` from upstream then
   * triggers `withRefresh()`'s single-flight refresh-and-retry.
   *
   * Omit (or pass `false`) when calling from a Server Component. Next.js
   * forbids writing cookies during RSC rendering (`cookies()` can only be
   * read, not written, from a Server Component — see
   * `docs/01-app/03-api-reference/04-functions/cookies.mdx` in the Next.js
   * repo), so a `401` instead redirects to `/api/auth/refresh?next=<path>`,
   * a Route Handler that performs the refresh and can write the cookie.
   */
  routeHandler?: boolean;
}

type UpstreamMethods = Pick<typeof upstream, "GET" | "POST" | "PATCH">;

async function currentPath(): Promise<string> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-pathname") ?? "/";
}

/**
 * Merges `Authorization: Bearer <accessToken>` into an `openapi-fetch` call's
 * `init` rest-tuple (`InitParam<Init>` — `[]`, `[Init?]`, or `[Init]`),
 * preserving the tuple's shape so it can be re-spread into the underlying
 * `upstream.<METHOD>(url, ...init)` call untouched.
 */
function withAuthHeader<Init extends readonly unknown[]>(
  init: Init,
  accessToken: string
): Init {
  const current = init[0] as { headers?: Record<string, unknown> } | undefined;

  const merged = {
    ...(current as object | undefined),
    headers: {
      ...current?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  };

  return [merged, ...init.slice(1)] as unknown as Init;
}

async function callAuthed<T extends { response: Response }>(
  invoke: (accessToken: string) => Promise<T>,
  options?: AuthedUpstreamOptions
): Promise<T> {
  if (!options?.routeHandler) {
    const session = await getSession();
    const result = await invoke(session.accessToken);

    if (result.response.status === 401) {
      const path = await currentPath();
      redirect(`/api/auth/refresh?next=${encodeURIComponent(path)}`);
    }

    return result;
  }

  // Route Handler: delegate the 401 → refresh → retry cycle to withRefresh()'s
  // single-flight helper. Re-reads the session on each invocation of this
  // fetcher so the retry picks up the freshly refreshed access token.
  let last: T | undefined;
  await withRefresh(async () => {
    const session = await getSession();
    last = await invoke(session.accessToken);
    return last.response;
  });

  return last as T;
}

/**
 * Authenticated upstream client. Wraps `@/lib/api/upstream`'s typed
 * `openapi-fetch` client, attaching `Authorization: Bearer <access token>`
 * read from the current session to every call.
 *
 * Usage mirrors `upstream` itself:
 *
 *   const { data, error, response } = await authedUpstream({ routeHandler: true })
 *     .GET("/channels/me", {});
 */
export function authedUpstream(options?: AuthedUpstreamOptions): UpstreamMethods {
  return {
    GET: (url, ...init) =>
      callAuthed(
        (accessToken) => upstream.GET(url, ...withAuthHeader(init, accessToken)),
        options
      ),
    POST: (url, ...init) =>
      callAuthed(
        (accessToken) => upstream.POST(url, ...withAuthHeader(init, accessToken)),
        options
      ),
    PATCH: (url, ...init) =>
      callAuthed(
        (accessToken) => upstream.PATCH(url, ...withAuthHeader(init, accessToken)),
        options
      ),
  };
}
