import type { Metadata } from "next";
import Script from "next/script";

/**
 * Embedded Shopify app shell.
 *
 * App Bridge must load from Shopify's CDN with the API key on the script tag —
 * bundling it is explicitly unsupported and breaks inside the admin iframe.
 */
export const metadata: Metadata = {
  title: "PixelForge AI for Shopify",
  robots: { index: false, follow: false },
};

export default function ShopifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        data-api-key={process.env.SHOPIFY_API_KEY}
        strategy="beforeInteractive"
      />
      <div className="min-h-dvh bg-bg">{children}</div>
    </>
  );
}
