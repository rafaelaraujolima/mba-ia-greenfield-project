import type { Channel } from "@/lib/api/contracts";

// Channel: mirrors the GET /channels/me response shape verbatim.
// NOTE: id/nickname defaults are load-bearing — the login BFF integration
// test (app/api/auth/login/__tests__/route.integration.test.ts) asserts
// session.channelId === "channel-fixture-id" and
// session.channelSlug === "fixture-channel" against this default.
const baseChannel: Channel = {
  id: "channel-fixture-id",
  name: "Fixture Channel",
  nickname: "fixture-channel",
  description: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const buildChannel = (overrides: Partial<Channel> = {}): Channel => ({
  ...baseChannel,
  ...overrides,
});
