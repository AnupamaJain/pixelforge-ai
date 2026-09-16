import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { COLORS, FONT } from "../theme";
import { CheckIcon, FadeUp, PopIn, Wordmark } from "../components/primitives";

/**
 * Comparison — 16:9, ~18 seconds.
 *
 * The sharpest expression of the USP: side by side, them versus us. Built for
 * paid social and retargeting, where the viewer already knows the category and
 * needs one reason to switch.
 *
 * The "them" side is an honest characterisation of how img2img pipelines fail
 * (the product is regenerated), not a claim about any named competitor.
 */

export const COMPARISON_DURATION = 540; // 18s

function Split() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({ frame: frame - 18, fps, config: { damping: 200 } });
  // Distortion ramps on the "them" side to show the product drifting.
  const drift = interpolate(frame, [40, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ padding: 70, justifyContent: "center" }}>
      <FadeUp delay={0}>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: COLORS.fg,
            textAlign: "center",
            margin: "0 0 46px",
          }}
        >
          Same product. Two approaches.
        </h2>
      </FadeUp>

      <div style={{ display: "flex", gap: 44, justifyContent: "center" }}>
        {/* Generic AI */}
        <div style={{ opacity: reveal, width: 520 }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 25,
              fontWeight: 600,
              color: "#A43E2C",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Generic AI tools
          </div>
          <div
            style={{
              position: "relative",
              height: 420,
              borderRadius: 22,
              border: `3px solid #E9B8B0`,
              background: COLORS.bgMuted,
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile("showcase/scene-wood.webp")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Img
                src={staticFile("showcase/product-cutout.png")}
                style={{
                  width: 300,
                  height: 300,
                  objectFit: "contain",
                  // The product visibly drifting from what was photographed.
                  // Pushed hard on purpose: a comparison shot only works if
                  // the failure is legible at a glance and at thumbnail size.
                  transform: `skewX(${drift * 11}deg) scaleX(${1 + drift * 0.22}) scaleY(${1 - drift * 0.06}) rotate(${drift * 3}deg)`,
                  filter: `hue-rotate(${drift * 85}deg) saturate(${1 + drift * 2.6}) contrast(${1 + drift * 0.5}) blur(${drift * 3.4}px)`,
                }}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {["Product regenerated", "Label distorted", "Colour shifted"].map(
              (label, index) => (
                <PopIn key={label} delay={70 + index * 12}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontFamily: FONT,
                      fontSize: 23,
                      color: "#A43E2C",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>✕</span>
                    {label}
                  </div>
                </PopIn>
              ),
            )}
          </div>
        </div>

        {/* PixelForge */}
        <div style={{ opacity: reveal, width: 520 }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 25,
              fontWeight: 600,
              color: COLORS.accent,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            PixelForge AI
          </div>
          <div
            style={{
              position: "relative",
              height: 420,
              borderRadius: 22,
              border: `3px solid ${COLORS.accent}`,
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile("showcase/scene-wood.webp")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Img
                src={staticFile("showcase/product-cutout.png")}
                style={{
                  width: 300,
                  height: 300,
                  objectFit: "contain",
                  filter: "drop-shadow(0 16px 30px rgba(0,0,0,0.34))",
                }}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {[
              "Your original pixels",
              "Label untouched",
              "Verified, or refunded",
            ].map((label, index) => (
              <PopIn key={label} delay={70 + index * 12}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: FONT,
                    fontSize: 23,
                    color: COLORS.success,
                  }}
                >
                  <CheckIcon size={22} />
                  {label}
                </div>
              </PopIn>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Close() {
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: 90 }}
    >
      <FadeUp delay={0}>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: 74,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            color: COLORS.fg,
            textAlign: "center",
            margin: 0,
            maxWidth: 1250,
            lineHeight: 1.1,
          }}
        >
          We only generate the scene.
        </h2>
      </FadeUp>

      <FadeUp delay={16}>
        <p
          style={{
            fontFamily: FONT,
            fontSize: 34,
            color: COLORS.fgMuted,
            marginTop: 26,
            textAlign: "center",
          }}
        >
          Your product is never redrawn.
        </p>
      </FadeUp>

      <FadeUp delay={30}>
        <div style={{ marginTop: 50 }}>
          <Wordmark size={54} />
        </div>
      </FadeUp>

      <FadeUp delay={40}>
        <div
          style={{
            marginTop: 36,
            padding: "22px 54px",
            borderRadius: 16,
            background: COLORS.accent,
            color: COLORS.accentFg,
            fontFamily: FONT,
            fontSize: 31,
            fontWeight: 600,
          }}
        >
          Try it free
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

export function Comparison() {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Sequence from={0} durationInFrames={400}>
        <Split />
      </Sequence>
      <Sequence from={400} durationInFrames={140}>
        <Close />
      </Sequence>
    </AbsoluteFill>
  );
}
