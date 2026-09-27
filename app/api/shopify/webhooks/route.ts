import { NextResponse, type NextRequest } from "next/server";

import { isValidShopDomain } from "@/config/shopify";
import { verifyWebhookHmac } from "@/lib/shopify/auth";
import { markUninstalled } from "@/lib/shopify/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/shopify/webhooks
 *
 * Handles app/uninstalled plus the three compliance webhooks Shopify requires
 * of every App Store app — an app without them is rejected at review, even if
 * it stores no customer data.
 *
 * The raw body is read verbatim: parsing before verification changes the bytes
 * and invalidates the signature.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic") ?? "";
  const shop = request.headers.get("x-shopify-shop-domain") ?? "";

  if (!verifyWebhookHmac(rawBody, signature)) {
    // Do not reveal whether the topic or shop was recognised.
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isValidShopDomain(shop)) {
    return NextResponse.json({ error: "Unknown shop." }, { status: 400 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // A signed body that will not parse is still worth acknowledging, so
    // Shopify does not retry it indefinitely.
  }

  const admin = createAdminClient();

  try {
    switch (topic) {
      case "app/uninstalled":
        await markUninstalled(shop);
        break;

      case "customers/data_request":
      case "customers/redact":
      case "shop/redact": {
        // This app stores no Shopify customer data: its scopes are limited to
        // read_products and write_products. The events are recorded anyway so
        // a data request can be evidenced during review and afterwards.
        await admin.from("shopify_compliance_events").insert({
          shop_domain: shop,
          topic,
          payload,
        });

        if (topic === "shop/redact") {
          // Shop-level erasure: drop the install row entirely.
          await admin.from("shopify_installs").delete().eq("shop_domain", shop);
        }
        break;
      }

      default:
        // Unknown topics are acknowledged rather than errored, so Shopify does
        // not retry something we will never handle.
        break;
    }
  } catch (error) {
    console.error("[shopify] webhook handler failed", {
      topic,
      shop,
      message: error instanceof Error ? error.message : String(error),
    });
    // 500 asks Shopify to retry.
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
