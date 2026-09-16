/**
 * Marketplace export presets.
 *
 * Every marketplace enforces its own image rules and rejects uploads that miss
 * them. These presets encode the published requirements so an export is
 * accepted first time.
 */

export interface ExportPreset {
  id: string;
  name: string;
  group: "marketplace" | "social" | "print";
  width: number;
  height: number;
  /** "contain" pads to the exact canvas; "cover" crops to fill it. */
  fit: "contain" | "cover";
  /** Pad colour when fitting. Marketplaces usually mandate pure white. */
  background: string;
  format: "png" | "jpeg";
  quality: number;
  notes: string;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: "amazon-main",
    name: "Amazon — main image",
    group: "marketplace",
    width: 2000,
    height: 2000,
    fit: "contain",
    background: "#FFFFFF",
    format: "jpeg",
    quality: 92,
    notes: "Pure white background, product filling ~85% of the frame.",
  },
  {
    id: "shopify-square",
    name: "Shopify — square",
    group: "marketplace",
    width: 2048,
    height: 2048,
    fit: "contain",
    background: "#FFFFFF",
    format: "jpeg",
    quality: 90,
    notes: "Shopify's recommended square product size.",
  },
  {
    id: "etsy-listing",
    name: "Etsy — listing",
    group: "marketplace",
    // Etsy recommends 2000px on the SHORTEST side, so the short edge — not the
    // long one — has to clear 2000. 5:4 landscape is what search thumbnails crop to.
    width: 2500,
    height: 2000,
    fit: "cover",
    background: "#FFFFFF",
    format: "jpeg",
    quality: 90,
    notes: "5:4 landscape, 2000px on the shortest side as Etsy recommends.",
  },
  {
    id: "ebay-listing",
    name: "eBay — listing",
    group: "marketplace",
    width: 1600,
    height: 1600,
    fit: "contain",
    background: "#FFFFFF",
    format: "jpeg",
    quality: 90,
    notes: "Minimum 1600px on the longest side for zoom.",
  },
  {
    id: "instagram-square",
    name: "Instagram — square",
    group: "social",
    width: 1080,
    height: 1080,
    fit: "cover",
    background: "#FFFFFF",
    format: "jpeg",
    quality: 88,
    notes: "Feed post, 1:1.",
  },
  {
    id: "instagram-portrait",
    name: "Instagram — portrait",
    group: "social",
    width: 1080,
    height: 1350,
    fit: "cover",
    background: "#FFFFFF",
    format: "jpeg",
    quality: 88,
    notes: "Feed post, 4:5 — the largest feed footprint.",
  },
  {
    id: "story-reel",
    name: "Story / Reel",
    group: "social",
    width: 1080,
    height: 1920,
    fit: "cover",
    background: "#FFFFFF",
    format: "jpeg",
    quality: 88,
    notes: "Full-screen vertical, 9:16.",
  },
  {
    id: "pinterest-pin",
    name: "Pinterest — pin",
    group: "social",
    width: 1000,
    height: 1500,
    fit: "cover",
    background: "#FFFFFF",
    format: "jpeg",
    quality: 88,
    notes: "Standard 2:3 pin.",
  },
  {
    id: "print-300dpi",
    name: "Print — A4 at 300dpi",
    group: "print",
    width: 2480,
    height: 3508,
    fit: "contain",
    background: "#FFFFFF",
    format: "png",
    quality: 100,
    notes: "Lossless, suitable for print. Upscale first for best results.",
  },
];

export const EXPORT_GROUPS = [
  { id: "marketplace", label: "Marketplaces" },
  { id: "social", label: "Social" },
  { id: "print", label: "Print" },
] as const;

export function getExportPreset(id: string): ExportPreset | undefined {
  return EXPORT_PRESETS.find((preset) => preset.id === id);
}

export const EXPORT_PRESET_IDS = EXPORT_PRESETS.map((preset) => preset.id);
