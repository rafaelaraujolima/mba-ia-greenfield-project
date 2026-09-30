/**
 * Validates a `next` redirect target as a same-origin relative path.
 *
 * Rejects:
 * - Absolute URLs (`https://evil.com`) — anything not starting with `/`.
 * - Protocol-relative URLs (`//evil.com`) — the browser (and some server
 *   redirect handling) treats a leading `//` as "same scheme, different
 *   host", so it is an open-redirect vector even though it "starts with /".
 * - Anything that resolves to a different origin once parsed as a URL
 *   (belt-and-braces against backslash / control-character tricks browsers
 *   sometimes normalize as `//`, e.g. `/\evil.com`).
 *
 * Accepts same-origin relative paths (`/studio/videos`).
 *
 * Reused by the login redirect (SI-04.14/17) and the refresh Route Handler
 * (SI-04.21) — keep this generic, no caller-specific defaults baked in here
 * beyond the `fallback` parameter.
 */
export function safeNext(
  next: string | null | undefined,
  fallback = "/"
): string {
  if (!next) {
    return fallback;
  }

  if (!next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  try {
    const resolved = new URL(next, "http://same-origin.invalid");
    if (resolved.origin !== "http://same-origin.invalid") {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return next;
}
