import "server-only";

import {
  SHOPIFY_API_VERSION,
  isValidShopDomain,
  shopifyApiKey,
  shopifyApiSecret,
  shopifyScopeString,
} from "@/config/shopify";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Shopify Admin API client.
 *
 * Access tokens are durable credentials that can read and write a merchant's
 * catalogue, so they are only ever read server-side from `shopify_installs`
 * (a table with no RLS policies at all) and never returned to a browser.
 */

export class ShopifyApiError extends Error {
  readonly status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "ShopifyApiError";
    this.status = status;
  }
}

export interface ShopifyInstall {
  shop_domain: string;
  access_token: string;
  scope: string;
  user_id: string | null;
  plan: string;
  billing_status: string | null;
}

/** Exchanges an OAuth code for a durable offline access token. */
export async function exchangeCodeForToken(
  shop: string,
  code: string,
): Promise<{ access_token: string; scope: string }> {
  if (!isValidShopDomain(shop)) {
    throw new ShopifyApiError("Invalid shop domain", 400);
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: shopifyApiKey(),
      client_secret: shopifyApiSecret(),
      code,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    // The body can echo the client secret back in some error shapes.
    throw new ShopifyApiError(`Token exchange failed (${response.status})`);
  }

  return (await response.json()) as { access_token: string; scope: string };
}

/** Loads an active install. Returns null for unknown or uninstalled shops. */
export async function getInstall(shop: string): Promise<ShopifyInstall | null> {
  if (!isValidShopDomain(shop)) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("shopify_installs")
    .select("shop_domain, access_token, scope, user_id, plan, billing_status")
    .eq("shop_domain", shop)
    .is("uninstalled_at", null)
    .maybeSingle();

  return (data as ShopifyInstall | null) ?? null;
}

export async function saveInstall(params: {
  shop: string;
  accessToken: string;
  scope: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("shopify_installs").upsert(
    {
      shop_domain: params.shop,
      access_token: params.accessToken,
      scope: params.scope,
      // A reinstall clears the previous uninstall marker.
      uninstalled_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "shop_domain" },
  );

  if (error) throw new ShopifyApiError(`Failed to persist install: ${error.message}`);
}

/** Marks a shop uninstalled and discards its token. */
export async function markUninstalled(shop: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("shopify_installs")
    .update({
      // The token is void after uninstall; keeping it is needless exposure.
      access_token: "",
      uninstalled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("shop_domain", shop);
}

/** Authenticated Admin API request. */
async function adminFetch(
  install: ShopifyInstall,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(
    `https://${install.shop_domain}/admin/api/${SHOPIFY_API_VERSION}${path}`,
    {
      ...init,
      headers: {
        "X-Shopify-Access-Token": install.access_token,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    },
  );

  if (response.status === 401 || response.status === 403) {
    throw new ShopifyApiError("This shop's authorisation has expired. Reinstall the app.", 401);
  }

  if (response.status === 429) {
    // Shopify's leaky bucket. Surfacing this plainly is better than retrying
    // blindly and compounding the throttle.
    throw new ShopifyApiError("Shopify is rate limiting this shop. Try again shortly.", 429);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ShopifyApiError(`Shopify API ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  status: string;
  image: { src: string } | null;
  imageCount: number;
}

/** Lists products, newest first, with just the fields the UI needs. */
export async function listProducts(
  install: ShopifyInstall,
  limit = 30,
): Promise<ShopifyProduct[]> {
  const response = await adminFetch(
    install,
    `/products.json?limit=${Math.min(250, limit)}&fields=id,title,handle,status,images,image`,
  );

  const payload = (await response.json()) as {
    products: {
      id: number;
      title: string;
      handle: string;
      status: string;
      image?: { src: string } | null;
      images?: unknown[];
    }[];
  };

  return (payload.products ?? []).map((product) => ({
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    image: product.image ?? null,
    imageCount: product.images?.length ?? 0,
  }));
}

/**
 * Attaches a generated image to a product.
 *
 * Uploaded as base64 rather than by URL: our storage URLs are short-lived
 * signed links, and Shopify fetches asynchronously, so a URL could easily
 * expire before it is read.
 */
export async function attachProductImage(params: {
  install: ShopifyInstall;
  productId: string;
  imageBase64: string;
  filename: string;
  altText?: string;
}): Promise<{ id: string; src: string }> {
  const response = await adminFetch(
    params.install,
    `/products/${encodeURIComponent(params.productId)}/images.json`,
    {
      method: "POST",
      body: JSON.stringify({
        image: {
          attachment: params.imageBase64,
          filename: params.filename,
          alt: params.altText?.slice(0, 512),
        },
      }),
    },
  );

  const payload = (await response.json()) as { image: { id: number; src: string } };
  return { id: String(payload.image.id), src: payload.image.src };
}

/** Registers the webhooks the App Store requires, plus app/uninstalled. */
export async function registerWebhooks(
  install: ShopifyInstall,
  appUrl: string,
): Promise<{ topic: string; ok: boolean }[]> {
  const topics = [
    "app/uninstalled",
    "customers/data_request",
    "customers/redact",
    "shop/redact",
  ];

  const results = [];
  for (const topic of topics) {
    try {
      await adminFetch(install, "/webhooks.json", {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            topic,
            address: `${appUrl}/api/shopify/webhooks`,
            format: "json",
          },
        }),
      });
      results.push({ topic, ok: true });
    } catch {
      // A duplicate registration errors; that is not a failure worth aborting
      // the install for.
      results.push({ topic, ok: false });
    }
  }
  return results;
}

export function authorizeUrl(params: {
  shop: string;
  state: string;
  redirectUri: string;
}): string {
  const query = new URLSearchParams({
    client_id: shopifyApiKey() ?? "",
    scope: shopifyScopeString(),
    redirect_uri: params.redirectUri,
    state: params.state,
  });
  return `https://${params.shop}/admin/oauth/authorize?${query}`;
}
