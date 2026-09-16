import { z } from "zod";
import {
  ASPECT_RATIO_IDS,
  BASE_SIZES,
  GUIDANCE_RANGE,
  IMAGE_COUNT_OPTIONS,
  STEPS_RANGE,
  STRENGTH_RANGE,
} from "@/config/generation";
import { STYLE_PRESETS } from "@/config/styles";

/**
 * Server-side validation for every generation parameter.
 * Routes parse untrusted input through these before any credit is spent.
 */

const styleIds = STYLE_PRESETS.map((style) => style.id) as [string, ...string[]];

const promptSchema = z
  .string()
  .trim()
  .min(1, "Enter a prompt describing the image you want.")
  .max(2000, "Prompts are limited to 2000 characters.");

const negativePromptSchema = z
  .string()
  .trim()
  .max(2000, "Negative prompts are limited to 2000 characters.")
  .optional()
  .nullable();

const seedSchema = z
  .number()
  .int()
  .min(0)
  .max(2_147_483_647)
  .optional()
  .nullable();

export const textToImageSchema = z.object({
  prompt: promptSchema,
  negativePrompt: negativePromptSchema,
  styleId: z.enum(styleIds).default("photorealistic"),
  aspectRatio: z.enum(ASPECT_RATIO_IDS as [string, ...string[]]).default("1:1"),
  baseSize: z
    .number()
    .int()
    .refine(
      (value) => (BASE_SIZES as readonly number[]).includes(value),
      "Unsupported image size.",
    )
    .default(1024),
  imageCount: z
    .number()
    .int()
    .refine(
      (value) => (IMAGE_COUNT_OPTIONS as readonly number[]).includes(value),
      "You can generate 1, 2 or 4 images at a time.",
    )
    .default(1),
  seed: seedSchema,
  steps: z.number().int().min(STEPS_RANGE.min).max(STEPS_RANGE.max).optional(),
  guidance: z.number().min(GUIDANCE_RANGE.min).max(GUIDANCE_RANGE.max).optional(),
  model: z.string().trim().max(120).optional(),
});

export const imageToImageSchema = textToImageSchema.extend({
  sourcePath: z.string().trim().min(1, "Upload a source image first.").max(400),
  strength: z
    .number()
    .min(STRENGTH_RANGE.min)
    .max(STRENGTH_RANGE.max)
    .default(STRENGTH_RANGE.default),
});

export const upscaleSchema = z
  .object({
    factor: z.union([z.literal(2), z.literal(4)]).default(2),
    /** Upscale an existing output... */
    outputId: z.string().uuid().optional(),
    /** ...or a freshly uploaded image. Exactly one is required. */
    sourcePath: z.string().trim().min(1).max(400).optional(),
  })
  .refine(
    (value) => Boolean(value.outputId) !== Boolean(value.sourcePath),
    "Provide either an existing image or an uploaded one, not both.",
  );

export const variationSchema = z.object({
  seed: seedSchema,
});

export const historyQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  type: z.enum(["TEXT_TO_IMAGE", "IMAGE_TO_IMAGE", "UPSCALE"]).optional(),
  styleId: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const galleryQuerySchema = z.object({
  favoritesOnly: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "true"),
  type: z.enum(["TEXT_TO_IMAGE", "IMAGE_TO_IMAGE", "UPSCALE"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  offset: z.coerce.number().int().min(0).default(0),
});

export type TextToImageInput = z.infer<typeof textToImageSchema>;
export type ImageToImageInput = z.infer<typeof imageToImageSchema>;
export type UpscaleInput = z.infer<typeof upscaleSchema>;

/** Formats a Zod failure into a single user-facing sentence. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request.";
}
