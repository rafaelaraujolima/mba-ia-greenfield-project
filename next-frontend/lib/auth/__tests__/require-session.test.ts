import { vi, describe, it, expect, beforeEach } from "vitest";

// In-memory cookie store shared across the mock and assertions — same
// pattern as session.test.ts.
const cookieMap = new Map<string, string>();

// Request headers the "current RSC" is reading from — lets us assert
// requireSession() forwards the `x-pathname` proxy sets into the redirect.
let requestHeaderMap = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (name: string) =>
      cookieMap.has(name) ? { name, value: cookieMap.get(name)! } : undefined,
    set: (name: string, value: string) => {
      cookieMap.set(name, value);
    },
    delete: (name: string) => {
      cookieMap.delete(name);
    },
  }),
  headers: vi.fn().mockImplementation(async () => ({
    get: (name: string) => requestHeaderMap.get(name) ?? null,
  })),
}));

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const { getSession, setSession, requireSession } = await import(
  "@/lib/auth/session"
);

const SAMPLE: Parameters<typeof setSession>[0] = {
  accessToken: "at-abc",
  refreshToken: "rt-xyz",
  userId: "user-1",
  email: "alice@example.com",
  channelSlug: "alice-channel",
  channelId: "channel-1",
};

describe("requireSession", () => {
  beforeEach(() => {
    cookieMap.clear();
    requestHeaderMap = new Map();
    redirectMock.mockClear();
  });

  it("returns the session when logged in (RSC form)", async () => {
    await setSession(SAMPLE);

    const session = await requireSession();
    expect(session.isLoggedIn).toBe(true);
    expect(session.userId).toBe(SAMPLE.userId);
  });

  it("returns the session when logged in (route handler form)", async () => {
    await setSession(SAMPLE);

    const result = await requireSession({ routeHandler: true });
    expect(result).not.toBeInstanceOf(Response);
    expect((await getSession()).isLoggedIn).toBe(true);
  });

  it("redirects to /login?next=<current path> when not logged in (RSC form)", async () => {
    requestHeaderMap.set("x-pathname", "/studio/videos");

    await expect(requireSession()).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Fstudio%2Fvideos"
    );
    expect(redirectMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to / when no x-pathname header is present (RSC form)", async () => {
    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT:/login?next=%2F");
  });

  it("returns a 401 UNAUTHORIZED envelope when not logged in (route handler form)", async () => {
    const result = await requireSession({ routeHandler: true });

    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(401);
    const body = (await response.json()) as {
      statusCode: number;
      error: string;
      message: string;
    };
    expect(body).toEqual({
      statusCode: 401,
      error: "UNAUTHORIZED",
      message: expect.any(String),
    });
  });
});
