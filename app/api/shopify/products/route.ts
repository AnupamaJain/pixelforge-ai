import { NextResponse, type NextRequest } from "next/server";

import { requireShopifySession } from "@/lib/shopify/session";
import { listProducts, ShopifyApiError } from "@/lib/shopify/client";
import { ShopifyAuthError } from "@/lib/shopify/auth";

export const runtime = "nodejs";

/**
 * GET /api/shopify/products
 *
 * Lists the merchant's catalogue for the embedded app. The shop is taken from
 * the verified session token, so a merchant cannot read another shop's
 * products by changing a parameter.
 */
export async function GET(request: NextRequest) {
  try {
    const install = await requireShopifySession(request);
    const products = await listProducts(install, 30);

    return NextResponse.json({
      shop: install.shop_domain,
      linked: Boolean(install.user_id),
      plan: install.plan,
      products,
    });
  } catch (error) {
    if (error instanceof ShopifyAuthError || error instanceof ShopifyApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[shopify] product list failed", error);
    return NextResponse.json({ error: "Could not load products." }, { status: 500 });
  }
}
