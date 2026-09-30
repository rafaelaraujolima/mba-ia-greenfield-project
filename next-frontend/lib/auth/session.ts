import { getIronSession, type SessionOptions } from "iron-session";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/lib/env";

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  channelSlug: string;
  channelId: string;
  isLoggedIn: boolean;
}

export interface UnauthorizedEnvelope {
  statusCode: 401;
  error: "UNAUTHORIZED";
  message: string;
}

export const sessionOptions: SessionOptions = {
  password: env.SESSION_PASSWORD,
  cookieName: "streamtube_session",
  ttl: 60 * 60 * 24 * 14, // 14 days (matches refresh-token horizon)
  cookieOptions: {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function setSession(data: Omit<SessionData, "isLoggedIn">) {
  const session = await getSession();
  session.accessToken = data.accessToken;
  session.refreshToken = data.refreshToken;
  session.userId = data.userId;
  session.email = data.email;
  session.channelSlug = data.channelSlug;
  session.channelId = data.channelId;
  session.isLoggedIn = true;
  await session.save();
}

export async function destroySession() {
  const session = await getSession();
  session.destroy();
}

function unauthorizedResponse(): Response {
  const envelope: UnauthorizedEnvelope = {
    statusCode: 401,
    error: "UNAUTHORIZED",
    message: "Authentication required",
  };

  return new Response(JSON.stringify(envelope), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Defense-in-depth session guard (TD-01). `proxy.ts` only does an optimistic,
 * presence-only cookie check for UX; this is the real check — it unseals the
 * iron-session cookie and validates `isLoggedIn`.
 *
 * - Called with no options (or `{ routeHandler: false }`) from an RSC: redirects
 *   to `/login?next=<current path>` when there is no valid session. `redirect()`
 *   throws, so the return type is narrowed to always resolve `SessionData`.
 * - Called with `{ routeHandler: true }` from a Route Handler: returns a 401
 *   `Response` with the same `{ statusCode, error: "UNAUTHORIZED", message }`
 *   envelope used by `lib/auth/refresh.ts`, instead of redirecting (Route
 *   Handlers are called by `fetch`, not navigated to — a redirect response
 *   would not be followed the way a browser navigation would).
 */
export async function requireSession(): Promise<SessionData>;
export async function requireSession(options: {
  routeHandler: true;
}): Promise<SessionData | Response>;
export async function requireSession(options?: {
  routeHandler?: boolean;
}): Promise<SessionData | Response> {
  const session = await getSession();

  if (session.isLoggedIn) {
    return session;
  }

  if (options?.routeHandler) {
    return unauthorizedResponse();
  }

  const requestHeaders = await headers();
  const next = requestHeaders.get("x-pathname") ?? "/";
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
