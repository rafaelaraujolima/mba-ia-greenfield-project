import "server-only";

import { withRefresh } from "@/lib/auth/refresh";
import { getSession } from "@/lib/auth/session";

import { withAuthHeader, type AuthedUpstreamOptions } from "./authed-upstream";
import { upstream } from "./upstream";

type OptionalUpstreamMethods = Pick<typeof upstream, "GET">;

/** `true` when the JWT `exp` claim is in the past (unreadable token → false). */
function isExpired(accessToken: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1] ?? "", "base64url").toString()
    ) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

/**
 * Runs `withToken` with the session's access token when there is a usable
 * session, falling back to `anonymous`. Never throws or redirects for lack
 * of — or an expired — session.
 */
async function callOptional<T extends { response: Response }>(
  withToken: (accessToken: string) => Promise<T>,
  anonymous: () => Promise<T>,
  options?: AuthedUpstreamOptions
): Promise<T> {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return anonymous();
  }

  if (!options?.routeHandler) {
    if (isExpired(session.accessToken)) {
      return anonymous();
    }
    const result = await withToken(session.accessToken);
    return result.response.status === 401 ? anonymous() : result;
  }

  let last: T | undefined;
  let needsRefresh = isExpired(session.accessToken);
  await withRefresh(async () => {
    if (needsRefresh) {
      // Synthetic 401: makes withRefresh() renew the session first.
      needsRefresh = false;
      return new Response(null, { status: 401 });
    }
    const fresh = await getSession();
    last = await withToken(fresh.accessToken);
    return last.response;
  });

  // Refresh failed (session destroyed): fall back to the anonymous read.
  return last ?? anonymous();
}

/**
 * Upstream client for public reads that enrich the response with the viewer
 * state when a session exists (social-interactions/TD-06). The anonymous
 * response is always the fallback.
 *
 * - No session: calls upstream without `Authorization`.
 * - Session, Route Handler (`routeHandler: true`): an expired access token is
 *   refreshed through `withRefresh()` before the call, so the viewer state is
 *   still resolved.
 * - Session, Server Component: cookies cannot be written while rendering, so
 *   an expired token is not refreshed; the call is made anonymously
 *   (`viewerState: null`).
 */
export function optionalAuthedUpstream(
  options?: AuthedUpstreamOptions
): OptionalUpstreamMethods {
  return {
    GET: (url, ...init) =>
      callOptional(
        (accessToken) => upstream.GET(url, ...withAuthHeader(init, accessToken)),
        () => upstream.GET(url, ...init),
        options
      ),
  };
}
