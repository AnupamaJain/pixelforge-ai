import { NextResponse, type NextRequest } from "next/server";

import { isShopifyConfigured, isValidShopDomain, shopifyAppUrl } from "@/config/shopify";
import { verifyOAuthState, verifyQueryHmac } from "@/lib/shopify/auth";
import { exchangeCodeForToken, registerWebhooks, saveInstall, getInstall } from "@/lib/shopify/client";

export const runtime = "nodejs";

/**
 * GET /api/shopify/callback
 *
 * Completes OAuth. Anyone can hit this URL with arbitrary parameters, so the
 * order matters: verify the HMAC over the query string first, then the state,
 * and only then exchange the code. Skipping either check lets an attacker
 * install the app against a shop they do not own.
 */
export async function GET(request: NextRequest) {
  if (!isShopifyConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const shop = params.get("shop");
  const code = params.get("code");
  const state = params.get("state");

  if (!isValidShopDomain(shop) || !code || !state) {
    return NextResponse.json({ error: "Invalid callback." }, { status: 400 });
  }

  // 1. Is this really from Shopify?
  if (!verifyQueryHmac(params)) {
    return NextResponse.json({ error: "Signature verification failed." }, { status: 401 });
  }

  // 2. Did we start this flow, for this shop, recently?
  const cookieState = request.cookies.get("shopify_oauth_state")?.value;
  if (!verifyOAuthState(state, shop) || (cookieState && cookieState !== state)) {
    return NextResponse.json({ error: "Invalid OAuth state." }, { status: 401 });
  }

  try {
    const token = await exchangeCodeForToken(shop, code);
    await saveInstall({ shop, accessToken: token.access_token, scope: token.scope });

    // Compliance webhooks are mandatory for App Store listing; registering
    // them at install time is what review checks for.
    const install = await getInstall(shop);
    if (install) await registerWebhooks(install, shopifyAppUrl());

    const response = NextResponse.redirect(`${shopifyAppUrl()}/shopify?shop=${shop}`);
    response.cookies.delete("shopify_oauth_state");
    return response;
  } catch (error) {
    console.error("[shopify] install failed", {
      shop,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Could not complete installation. Please try again." },
      { status: 502 },
    );
  }
}
