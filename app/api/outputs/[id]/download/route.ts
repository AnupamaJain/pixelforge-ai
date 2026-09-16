import { type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { GENERATIONS_BUCKET, downloadImage } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, NotFoundError } from "@/lib/api/respond";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/outputs/:id/download?format=png|jpeg
 *
 * Streams the image through our server rather than handing out a storage URL,
 * so ownership is enforced on every download and the private path stays hidden.
 */
export async function GET(request: NextRequest, context: Context) {
  try {
    const auth = await requireAuthContext();
    const { id } = await context.params;

    const requested = request.nextUrl.searchParams.get("format");
    const format = requested === "jpeg" || requested === "jpg" ? "jpeg" : "png";

    const admin = createAdminClient();
    const { data: output } = await admin
      .from("generation_outputs")
      .select("storage_path, generation_id")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!output) throw new NotFoundError("That image could not be found.");

    const stored = await downloadImage(GENERATIONS_BUCKET, output.storage_path);

    let body = stored.data;
    let contentType = stored.contentType;

    // Convert only when the stored format differs from what was asked for.
    const alreadyMatches =
      (format === "png" && contentType === "image/png") ||
      (format === "jpeg" && contentType === "image/jpeg");

    if (!alreadyMatches) {
      const sharp = (await import("sharp")).default;
      body =
        format === "jpeg"
          ? await sharp(stored.data).jpeg({ quality: 95 }).toBuffer()
          : await sharp(stored.data).png().toBuffer();
      contentType = format === "jpeg" ? "image/jpeg" : "image/png";
    }

    const extension = format === "jpeg" ? "jpg" : "png";

    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="generated-image-${output.generation_id}.${extension}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
