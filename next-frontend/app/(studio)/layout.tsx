import { authedUpstream } from "@/lib/api/authed-upstream";
import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

// The `limit` query param is not in the exported contract (backend OpenAPI
// documentation gap shared with the other listings).
type SubscriptionsQuery = { limit?: number };

const FOLLOWED_CHANNELS_LIMIT = 10;

export default async function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Defense-in-depth guard (TD-01): `proxy.ts` already does the optimistic
  // cookie-presence redirect; this unseals the session and redirects to
  // `/login?next=…` when it is not actually valid.
  await requireSession();

  // Followed channels for the left menu (social-interactions/TD-07). A failed
  // read hides the section instead of breaking the shell.
  const subscriptionsResult = await authedUpstream().GET("/subscriptions", {
    params: {
      query: {
        limit: FOLLOWED_CHANNELS_LIMIT,
      } satisfies SubscriptionsQuery as unknown as never,
    },
  });
  const subscriptions = subscriptionsResult.error
    ? []
    : (subscriptionsResult.data.items ?? []).map((item) => ({
        channelId: item.channelId ?? "",
        channelName: item.channelName ?? "",
        channelNickname: item.channelNickname ?? "",
      }));

  return <AppShell subscriptions={subscriptions}>{children}</AppShell>;
}
