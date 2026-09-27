import { NextResponse, type NextRequest } from "next/server";

import { isShopifyConfigured, isValidShopDomain, shopifyAppUrl } from "@/config/shopify";
import { createOAuthState } from "@/lib/shopify/auth";
import { authorizeUrl } from "@/lib/shopify/client";

export const runtime = "nodejs";

/**
 * GET /api/shopify/install?shop=<shop>.myshopify.com
 *
 * Entry point for an install. Shopify requires OAuth to begin immediately,
 * before the app renders anything, so this redirects straight to the consent
 * screen.
 *
 * `shop` is attacker-controlled and is used to build the redirect target, so
 * it is validated against Shopify's domain format first. Without that check
 * this is an open redirect.
 */
export async function GET(request: NextRequest) {
  if (!isShopifyConfigured()) {
    return NextResponse.json(
      { error: "The Shopify app is not configured on this server." },
      { status: 503 },
    );
  }

  const shop = request.nextUrl.searchParams.get("shop");

  if (!isValidShopDomain(shop)) {
    return NextResponse.json(
      { error: "Provide a valid ?shop=your-store.myshopify.com" },
      { status: 400 },
    );
  }

  const state = createOAuthState(shop);
  const redirectUri = `${shopifyAppUrl()}/api/shopify/callback`;

  const response = NextResponse.redirect(
    authorizeUrl({ shop, state, redirectUri }),
  );

  // Belt and braces: the state is self-verifying, but pinning it to a cookie
  // also defends the callback against a cross-shop replay.
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
