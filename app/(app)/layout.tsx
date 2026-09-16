import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth";
import { CreditsProvider } from "@/components/credits-provider";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

/**
 * Every authenticated screen is behind a session, so indexing it would only
 * surface a redirect. Noindex here covers the whole group.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Shell for every authenticated route. The plan and credit balance are read
 * server-side on each request, so the client never decides what it may access.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();

  // Middleware already gates these paths; this is the second line of defence.
  if (!auth) redirect("/login");

  return (
    <CreditsProvider initialCredits={auth.credits} plan={auth.planId}>
      <div className="flex min-h-dvh bg-bg">
        <Sidebar features={auth.plan.features} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header email={auth.user.email ?? ""} />
          <main id="main" className="flex-1 pb-20 lg:pb-0">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </CreditsProvider>
  );
}
