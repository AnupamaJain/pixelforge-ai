/**
 * Video design tokens.
 *
 * Mirrors the application's light-theme palette from app/globals.css so the
 * marketing videos read as the same product, not a separate brand.
 */

export const COLORS = {
  bg: "#FDFCFB",
  bgSubtle: "#FAF8F6",
  bgMuted: "#F2EFEC",
  surface: "#FFFFFF",
  border: "#E7E2DC",
  borderStrong: "#CEC7BE",
  fg: "#1C1917",
  fgMuted: "#6B635C",
  fgSubtle: "#918A82",
  accent: "#EA580C",
  accentFg: "#FFFFFF",
  accentSoft: "#FFF1E7",
  success: "#2A8F5F",
} as const;

export const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif';

export const FPS = 30;

/** Frame counts for the standard beats, so timings stay consistent. */
export const BEAT = {
  quick: 12,
  short: 20,
  normal: 30,
  long: 45,
} as const;
