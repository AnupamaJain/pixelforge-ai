import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

import { requireAuthContext } from "@/lib/auth";
import { limitUpload, RateLimitError } from "@/lib/rate-limit";
import {
  UPLOADS_BUCKET,
  createSignedUrl,
  uploadImage,
  uploadObjectPath,
  validateImageUpload,
} from "@/lib/storage";
import { BadRequestError, errorResponse } from "@/lib/api/respond";

export const runtime = "nodejs";

/**
 * POST /api/uploads — accept a user image for image-to-image or upscaling.
 *
 * The file is validated by magic bytes (not the declared MIME type) and stored
 * under the caller's own namespace. Returns the storage path plus a signed
 * preview URL; the raw path is only ever usable by its owner.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    const limit = limitUpload(auth.user.id);
    if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);

    const formData = await request.formData().catch(() => {
      throw new BadRequestError("Expected a multipart form upload.");
    });

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new BadRequestError("No image was provided.");
    }

    const { data, contentType } = await validateImageUpload(file);

    const path = uploadObjectPath({
      userId: auth.user.id,
      uploadId: randomUUID(),
      contentType,
    });

    await uploadImage({ bucket: UPLOADS_BUCKET, path, data, contentType });
    const previewUrl = await createSignedUrl(UPLOADS_BUCKET, path);

    return NextResponse.json({ path, previewUrl, contentType }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
