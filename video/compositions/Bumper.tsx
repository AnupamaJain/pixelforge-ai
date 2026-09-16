import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { COLORS, FONT } from "../theme";
import { CheckIcon, Wordmark } from "../components/primitives";

/**
 * Bumper — 6 seconds.
 *
 * Built for YouTube pre-roll and retargeting, where six seconds is the whole
 * budget. One claim, one visual, one action — no setup, no build.
 *
 * Renders at any aspect ratio: layout keys off useVideoConfig() rather than
 * assuming landscape, so the same composition serves 16:9 and 9:16.
 */

export const BUMPER_DURATION = 180; // 6s

export function Bumper() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;

  const enter = spring({ frame, fps, config: { damping: 200, stiffness: 90 } });
  const swap = spring({ frame: frame - 45, fps, config: { damping: 200 } });
  const stamp = spring({ frame: frame - 95, fps, config: { damping: 12, stiffness: 160 } });
  const outro = spring({ frame: frame - 130, fps, config: { damping: 200 } });

  const tileSize = isPortrait ? 560 : 380;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: isPortrait ? 80 : 60,
      }}
    >
      {/* Headline retreats as the proof stamp lands */}
      <div
        style={{
          opacity: enter * (1 - outro),
          transform: `translateY(${(1 - enter) * 20 - outro * 30}px)`,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: FONT,
            fontSize: isPortrait ? 62 : 58,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            color: COLORS.fg,
            margin: 0,
            lineHeight: 1.12,
          }}
        >
          Your product.
          {isPortrait ? <br /> : " "}
          Never redrawn.
        </h1>
      </div>

      {/* Product, then product-in-scene */}
      <div
        style={{
          position: "relative",
          width: tileSize,
          height: tileSize,
          marginTop: isPortrait ? 56 : 36,
          borderRadius: 26,
          overflow: "hidden",
          border: `3px solid ${swap > 0.5 ? COLORS.accent : COLORS.border}`,
          opacity: enter * (1 - outro),
          transform: `scale(${interpolate(enter, [0, 1], [0.9, 1]) * (1 - outro * 0.12)})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: COLORS.bgMuted,
            opacity: 1 - swap,
          }}
        />
        <Img
          src={staticFile("showcase/scene-wood.webp")}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: swap,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: isPortrait ? 40 : 28,
          }}
        >
          <Img
            src={staticFile("showcase/product-cutout.png")}
            style={{
              width: "76%",
              height: "76%",
              objectFit: "contain",
              filter: `drop-shadow(0 ${14 * swap}px ${26 * swap}px rgba(0,0,0,${0.34 * swap}))`,
            }}
          />
        </div>

        {/* Verification stamp */}
        <div
          style={{
            position: "absolute",
            bottom: isPortrait ? 22 : 14,
            left: "50%",
            transform: `translateX(-50%) scale(${interpolate(stamp, [0, 1], [0.7, 1])})`,
            opacity: stamp,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: isPortrait ? "12px 24px" : "9px 18px",
            borderRadius: 999,
            background: "#E8F5EE",
            // nowrap: at landscape tile width the label was breaking onto two
            // lines and covering the product it is making a claim about.
            whiteSpace: "nowrap",
          }}
        >
          <CheckIcon size={isPortrait ? 24 : 18} />
          <span
            style={{
              fontFamily: FONT,
              fontSize: isPortrait ? 22 : 17,
              fontWeight: 600,
              color: COLORS.success,
              whiteSpace: "nowrap",
            }}
          >
            0 pixels changed
          </span>
        </div>
      </div>

      {/* Outro overlays rather than cuts, so six seconds still feels unhurried */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: outro,
          background: COLORS.bg,
        }}
      >
        <Wordmark size={isPortrait ? 62 : 54} />
        <div
          style={{
            marginTop: 34,
            padding: isPortrait ? "24px 56px" : "20px 46px",
            borderRadius: 16,
            background: COLORS.accent,
            color: COLORS.accentFg,
            fontFamily: FONT,
            fontSize: isPortrait ? 36 : 30,
            fontWeight: 600,
          }}
        >
          Try it free
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
