import type { Metadata, Viewport } from "next";
import { ThemeProvider, themeScript } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE, siteUrl } from "@/config/seo";
import {
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "@/lib/seo/structured-data";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    // Page titles already carry the brand via seoTitle(), so no suffix here.
    template: "%s",
  },
  description: SITE.description,
  metadataBase: new URL(siteUrl()),
  applicationName: SITE.name,
  keywords: [
    "ai product photography",
    "product photo generator",
    "ecommerce product images",
    "product image background generator",
    "amazon product image requirements",
    "bulk product photography",
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: siteUrl(),
    siteName: SITE.name,
    locale: SITE.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    creator: SITE.twitter,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131211" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Site-wide structured data. Page-level schema is added per route. */}
        <JsonLd
          data={[organizationSchema(), websiteSchema(), softwareApplicationSchema()]}
        />
        {/* First stop for keyboard users on every page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[--radius-sm] focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-accent-fg"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
