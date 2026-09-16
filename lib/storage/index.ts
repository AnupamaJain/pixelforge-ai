import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Object storage.
 *
 * Both buckets are private. Paths are namespaced per user and reach the browser
 * only as short-lived signed URLs, so one user's key can never address another
 * user's object.
 */

export const GENERATIONS_BUCKET = "generations";
export const UPLOADS_BUCKET = "uploads";

const SIGNED_URL_TTL_SECONDS = Number.parseInt(
  process.env.SIGNED_URL_TTL_SECONDS || "3600",
  10,
);

export const ALLOWED_UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function maxUploadBytes(): number {
  const mb = Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB || "10", 10);
  return (Number.isFinite(mb) ? mb : 10) * 1024 * 1024;
}

function extensionFor(contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  return "png";
}

export function generationObjectPath(params: {
  userId: string;
  generationId: string;
  index: number;
  contentType: string;
}): string {
  return `users/${params.userId}/generations/${params.generationId}/${params.index}.${extensionFor(params.contentType)}`;
}

export function uploadObjectPath(params: {
  userId: string;
  uploadId: string;
  contentType: string;
}): string {
  return `users/${params.userId}/uploads/${params.uploadId}.${extensionFor(params.contentType)}`;
}

export async function uploadImage(params: {
  bucket: string;
  path: string;
  data: Buffer;
  contentType: string;
}): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from(params.bucket)
    .upload(params.path, params.data, {
      contentType: params.contentType,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

export async function downloadImage(
  bucket: string,
  path: string,
): Promise<{ data: Buffer; contentType: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Storage download failed: ${error?.message ?? "not found"}`);
  }

  return {
    data: Buffer.from(await data.arrayBuffer()),
    contentType: data.type || "image/png",
  };
}

/** Mints a short-lived signed URL. Callers must verify ownership first. */
export async function createSignedUrl(
  bucket: string,
  path: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);

  if (error || !data) {
    // Logged without the path, which is a private storage key.
    console.error("[storage] failed to sign URL", { bucket, message: error?.message });
    return null;
  }

  return data.signedUrl;
}

/** Signs many paths at once for gallery grids. */
export async function createSignedUrls(
  bucket: string,
  paths: string[],
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrls(paths, ttlSeconds);

  if (error || !data) {
    console.error("[storage] batch signing failed", { bucket, message: error?.message });
    return result;
  }

  for (const entry of data) {
    if (entry.signedUrl && entry.path) result.set(entry.path, entry.signedUrl);
  }

  return result;
}

export async function deleteObjects(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).remove(paths);

  if (error) {
    console.error("[storage] delete failed", { bucket, message: error.message });
  }
}

/**
 * Validates an uploaded file by sniffing its magic bytes rather than trusting
 * the declared MIME type, and enforces the configured size ceiling.
 */
export async function validateImageUpload(
  file: File,
): Promise<{ data: Buffer; contentType: string }> {
  const limit = maxUploadBytes();

  if (file.size > limit) {
    throw new UploadValidationError(
      `Image is too large. The maximum is ${Math.round(limit / 1024 / 1024)}MB.`,
    );
  }

  if (file.size === 0) {
    throw new UploadValidationError("The uploaded file is empty.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(buffer);

  if (!sniffed) {
    throw new UploadValidationError(
      "Unsupported image format. Upload a PNG, JPEG or WebP file.",
    );
  }

  return { data: buffer, contentType: sniffed };
}

/** Magic-byte detection — the declared Content-Type is attacker-controlled. */
export function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 &&
    buffer[2] === 0x4e && buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export class UploadValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}
