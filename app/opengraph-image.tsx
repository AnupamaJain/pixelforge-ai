import { ImageResponse } from "next/og";
import { SITE } from "@/config/seo";

export const runtime = "nodejs";
export const alt = SITE.tagline;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default Open Graph card, rendered at request time.
 *
 * Kept to system fonts and flat colour so it renders fast and never depends on
 * a remote font fetch that could fail and break the card.
 */
export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FDFCFB",
          padding: "72px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#EA580C",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 28, fontWeight: 600, color: "#1C1917" }}>
            PixelForge AI
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: "#1C1917",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: "900px",
            }}
          >
            Product photography without the photoshoot
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#57534E",
              lineHeight: 1.4,
              maxWidth: "820px",
            }}
          >
            Your product stays pixel-identical in every generated scene.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            fontSize: 22,
            color: "#78716C",
          }}
        >
          <div
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              background: "#FFF1E7",
              color: "#EA580C",
              display: "flex",
            }}
          >
            Verified, not promised
          </div>
        </div>
      </div>
    ),
    size,
  );
}
