import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Defense-in-depth guard (TD-01): `proxy.ts` already does the optimistic
  // cookie-presence redirect; this unseals the session and redirects to
  // `/login?next=…` when it isn't actually valid.
  await requireSession();

  return <AppShell>{children}</AppShell>;
}
