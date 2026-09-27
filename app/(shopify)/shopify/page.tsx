import type { Metadata } from "next";
import { isShopifyConfigured, isValidShopDomain } from "@/config/shopify";
import { ShopifyApp } from "./app";

export const metadata: Metadata = {
  title: "PixelForge AI for Shopify",
  robots: { index: false, follow: false },
};

export default async function ShopifyPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop } = await searchParams;

  if (!isShopifyConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-xl font-semibold">Not configured</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Set <code className="rounded bg-bg-muted px-1">SHOPIFY_API_KEY</code> and{" "}
          <code className="rounded bg-bg-muted px-1">SHOPIFY_API_SECRET</code> to
          enable the Shopify app.
        </p>
      </div>
    );
  }

  return <ShopifyApp shop={isValidShopDomain(shop) ? shop : null} />;
}
