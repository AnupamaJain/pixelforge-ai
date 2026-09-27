import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireShopifySession } from "@/lib/shopify/session";
import { attachProductImage, ShopifyApiError } from "@/lib/shopify/client";
import { ShopifyAuthError } from "@/lib/shopify/auth";
import { GENERATIONS_BUCKET, downloadImage } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  outputId: z.string().uuid(),
  productId: z.string().regex(/^\d+$/, "Invalid product id"),
  altText: z.string().trim().max(400).optional(),
});

/**
 * POST /api/shopify/publish
 *
 * Pushes a generated image onto a Shopify product.
 *
 * The image is uploaded as base64 rather than by URL: our storage URLs are
 * short-lived signed links and Shopify fetches asynchronously, so a URL could
 * expire before it is read.
 */
export async function POST(request: NextRequest) {
  try {
    const install = await requireShopifySession(request);

    if (!install.user_id) {
      return NextResponse.json(
        { error: "Link this shop to a PixelForge account first." },
        { status: 409 },
      );
    }

    const body = await request.json().catch(() => null);
    const input = schema.parse(body);

    const admin = createAdminClient();

    // Scoped to the linked account, so one shop cannot publish another
    // account's images.
    const { data: output } = await admin
      .from("generation_outputs")
      .select("id, storage_path, generation_id, generations(prompt)")
      .eq("id", input.outputId)
      .eq("user_id", install.user_id)
      .maybeSingle();

    if (!output) {
      return NextResponse.json({ error: "That image could not be found." }, { status: 404 });
    }

    const stored = await downloadImage(GENERATIONS_BUCKET, output.storage_path);
    const parent = output.generations as unknown as { prompt?: string } | null;

    const image = await attachProductImage({
      install,
      productId: input.productId,
      imageBase64: stored.data.toString("base64"),
      filename: `pixelforge-${output.generation_id.slice(0, 8)}.png`,
      altText: input.altText ?? parent?.prompt,
    });

    await admin.from("shopify_publications").upsert(
      {
        user_id: install.user_id,
        output_id: output.id,
        shop_domain: install.shop_domain,
        shopify_product_id: input.productId,
        shopify_image_id: image.id,
      },
      { onConflict: "output_id,shopify_product_id" },
    );

    return NextResponse.json({ published: true, imageId: image.id });
  } catch (error) {
    if (error instanceof ShopifyAuthError || error instanceof ShopifyApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }
    console.error("[shopify] publish failed", error);
    return NextResponse.json({ error: "Could not publish that image." }, { status: 500 });
  }
}
