import { NextResponse } from "next/server";

import type {
  LoginDto,
  LoginTokenPair,
  Channel,
  ApiErrorEnvelope,
} from "@/lib/api/contracts";
import { upstream } from "@/lib/api/upstream";
import { setSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = (await request.json()) as LoginDto;

  const { data, error, response } = await upstream.POST("/auth/login", {
    body: body as never,
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  const tokens = data as LoginTokenPair;
  const accessToken = tokens.access_token ?? "";
  const refreshToken = tokens.refresh_token ?? "";

  // Fetch the user's own channel with the just-issued access token (TD-01)
  // to populate channelId/channelSlug in the session. If this fails, no
  // session may be written at all — fail the login rather than leave a
  // partial session (no tokens sealed, no cookie set).
  const channelResult = await upstream.GET("/channels/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (channelResult.error) {
    return NextResponse.json<ApiErrorEnvelope>(
      channelResult.error as ApiErrorEnvelope,
      { status: channelResult.response.status }
    );
  }

  const channel = channelResult.data as Channel;

  // Seal tokens into the iron-session cookie — tokens never cross to the browser.
  await setSession({
    accessToken,
    refreshToken,
    // /channels/me exposes only the channel's own id (no separate account id);
    // this platform is one channel per user, so it is the only identifier available.
    userId: channel.id ?? "",
    email: (body as Record<string, string>).email ?? "",
    channelSlug: channel.nickname ?? "",
    channelId: channel.id ?? "",
  });

  // FE-facing body omits access_token / refresh_token (per API Contract).
  return NextResponse.json({}, { status: 200 });
}
