/**
 * Shopify app configuration.
 *
 * The Shopify App Store is the highest-intent channel for this product: people
 * arrive already trying to solve product photography. See GTM.md §4.1.
 *
 * Two constraints shape this integration:
 *
 *  1. Apps distributed through the App Store MUST charge through Shopify's
 *     Billing API — Stripe is not permitted inside the app. So a Shopify
 *     install bills separately from a direct web subscription.
 *  2. Three compliance webhooks are mandatory and an app is rejected without
 *     them, even if it stores no customer data.
 */

/** Admin API version. Shopify ships quarterly; pin it and bump deliberately. */
export const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";

/**
 * Least privilege. `write_products` covers uploading generated images back
 * onto a product; nothing here touches orders or customers, which keeps the
 * review surface small and the privacy story simple.
 */
export const SHOPIFY_SCOPES = [
  "read_products",
  "write_products",
] as const;

export function shopifyScopeString(): string {
  return SHOPIFY_SCOPES.join(",");
}

export function shopifyApiKey(): string | undefined {
  return process.env.SHOPIFY_API_KEY;
}

export function shopifyApiSecret(): string | undefined {
  return process.env.SHOPIFY_API_SECRET;
}

export function isShopifyConfigured(): boolean {
  return Boolean(shopifyApiKey() && shopifyApiSecret());
}

export function shopifyAppUrl(): string {
  return (
    process.env.SHOPIFY_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * Shop domains are used to build API URLs and are attacker-supplied on every
 * OAuth and webhook request, so they are validated against Shopify's format
 * rather than trusted. Anything else is rejected outright.
 */
export function isValidShopDomain(shop: string | null | undefined): shop is string {
  if (!shop) return false;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

/** Plans offered through Shopify billing, mirroring config/plans.ts pricing. */
export const SHOPIFY_PLANS = [
  { id: "STARTER", name: "Starter", amount: 49, trialDays: 7 },
  { id: "GROWTH", name: "Growth", amount: 149, trialDays: 7 },
  { id: "AGENCY", name: "Agency", amount: 499, trialDays: 7 },
] as const;

export type ShopifyPlanId = (typeof SHOPIFY_PLANS)[number]["id"];
