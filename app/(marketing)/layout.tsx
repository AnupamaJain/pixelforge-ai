import { getUser } from "@/lib/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { LightboxProvider } from "@/components/marketing/lightbox";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <LightboxProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader isAuthenticated={Boolean(user)} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
    </LightboxProvider>
  );
}
