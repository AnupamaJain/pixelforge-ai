import { type NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/auth";
import { GENERATIONS_BUCKET, downloadImage } from "@/lib/storage";
import { createZip, renderExport, requireExportPreset } from "@/lib/storage/export";
import { createAdminClient } from "@/lib/supabase/admin";
import { exportSchema } from "@/lib/validation/schemas";
import {
  BadRequestError,
  errorResponse,
  NotFoundError,
  PlanRestrictionError,
} from "@/lib/api/respond";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/export — render images to a marketplace preset and return them.
 *
 * A single image streams directly; several come back as a ZIP. Everything is
 * scoped by user_id, so an id belonging to someone else simply isn't found.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    if (!auth.plan.features.marketplaceExport) {
      throw new PlanRestrictionError(
        "Marketplace export is available on paid plans. Upgrade to export Amazon- and Shopify-ready images.",
      );
    }

    const body = await request.json().catch(() => {
      throw new BadRequestError("Invalid request body.");
    });
    const input = exportSchema.parse(body);
    const preset = requireExportPreset(input.presetId);

    const admin = createAdminClient();
    const { data: outputs } = await admin
      .from("generation_outputs")
      .select("id, storage_path, generation_id")
      .in("id", input.outputIds)
      .eq("user_id", auth.user.id);

    if (!outputs || outputs.length === 0) {
      throw new NotFoundError("Those images could not be found.");
    }

    const rendered = await Promise.all(
      outputs.map(async (output) => {
        const stored = await downloadImage(GENERATIONS_BUCKET, output.storage_path);
        const result = await renderExport({ image: stored.data, preset });
        return {
          name: `${preset.id}-${output.generation_id}-${output.id.slice(0, 8)}.${result.extension}`,
          data: result.data,
          contentType: result.contentType,
        };
      }),
    );

    if (rendered.length === 1) {
      const [file] = rendered;
      return new Response(new Uint8Array(file.data), {
        headers: {
          "Content-Type": file.contentType,
          "Content-Disposition": `attachment; filename="${file.name}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const zip = createZip(rendered.map(({ name, data }) => ({ name, data })));

    return new Response(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${preset.id}-export.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
