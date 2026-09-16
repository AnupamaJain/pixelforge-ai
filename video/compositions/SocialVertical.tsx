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
 * Vertical social cut — 9:16, ~15 seconds.
 *
 * Built for Reels, TikTok and Stories, where the first second decides whether
 * anyone sees the second. The hook is a cost comparison rather than a feature,
 * and all text sits well inside the safe area so platform UI doesn't cover it.
 */

export const SOCIAL_DURATION = 450; // 15s

const SAFE_TOP = 240;
const SAFE_BOTTOM = 320;

function Hook() {
  const frame = useCurrentFrame();

  // Ticks down from a photoshoot quote to our price — the whole pitch in one move.
  const price = Math.round(
    interpolate(frame, [12, 52], [2000, 49], { extrapolateRight: "clamp" }),
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `${SAFE_TOP}px 70px ${SAFE_BOTTOM}px`,
      }}
    >
      <FadeUp delay={0}>
        <p
          style={{
            fontFamily: FONT,
            fontSize: 42,
            color: COLORS.fgMuted,
            textAlign: "center",
            margin: 0,
          }}
        >
          A product photoshoot costs
        </p>
      </FadeUp>

      <FadeUp delay={8}>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 190,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            color: frame > 45 ? COLORS.accent : COLORS.fg,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            marginTop: 24,
          }}
        >
          ${price.toLocaleString("en-US")}
        </div>
      </FadeUp>

      <FadeUp delay={56}>
        <p
          style={{
            fontFamily: FONT,
            fontSize: 46,
            fontWeight: 600,
            color: COLORS.fg,
            textAlign: "center",
            marginTop: 36,
          }}
        >
          Or $49 a month.
        </p>
      </FadeUp>
    </AbsoluteFill>
  );
}

function Proof() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({ frame: frame - 20, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `${SAFE_TOP}px 70px ${SAFE_BOTTOM}px`,
      }}
    >
      <FadeUp delay={0}>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: 58,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: COLORS.fg,
            textAlign: "center",
            margin: "0 0 48px",
            lineHeight: 1.15,
          }}
        >
          Your product.
          <br />
          Never redrawn.
        </h2>
      </FadeUp>

      <div style={{ position: "relative", width: 620, height: 620 }}>
        {/* Generated scene */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 32,
            overflow: "hidden",
            border: `3px solid ${COLORS.border}`,
            opacity: reveal,
          }}
        >
          <Img
            src={staticFile("showcase/scene-wood.webp")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Real product composited on top */}
        {/* Multiply blend removes the product photo's white background
            against the scene — the same treatment the hero demo uses. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 70,
            transform: `scale(${interpolate(reveal, [0, 1], [1.2, 1])})`,
          }}
        >
          <Img
            src={staticFile("showcase/product-cutout.png")}
            style={{
              width: 460,
              height: 460,
              objectFit: "contain",
              filter: "drop-shadow(0 24px 46px rgba(0,0,0,0.36))",
            }}
          />
        </div>

        <PopIn
          delay={48}
          style={{ position: "absolute", bottom: -26, left: "50%", marginLeft: -170 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 30px",
              borderRadius: 999,
              background: "#E8F5EE",
              width: 340,
              justifyContent: "center",
            }}
          >
            <CheckIcon size={30} />
            <span
              style={{
                fontFamily: FONT,
                fontSize: 27,
                fontWeight: 600,
                color: COLORS.success,
              }}
            >
              0 pixels changed
            </span>
          </div>
        </PopIn>
      </div>
    </AbsoluteFill>
  );
}

function Close() {
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `${SAFE_TOP}px 70px ${SAFE_BOTTOM}px`,
      }}
    >
      <FadeUp delay={0}>
        <Wordmark size={70} />
      </FadeUp>

      <FadeUp delay={12}>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: 62,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            color: COLORS.fg,
            textAlign: "center",
            margin: "48px 0 0",
            lineHeight: 1.12,
          }}
        >
          One photo in.
          <br />
          A catalogue out.
        </h2>
      </FadeUp>

      <FadeUp delay={26}>
        <div
          style={{
            marginTop: 52,
            padding: "28px 68px",
            borderRadius: 20,
            background: COLORS.accent,
            color: COLORS.accentFg,
            fontFamily: FONT,
            fontSize: 42,
            fontWeight: 600,
          }}
        >
          Try it free
        </div>
      </FadeUp>

      <FadeUp delay={38}>
        <p
          style={{
            fontFamily: FONT,
            fontSize: 30,
            color: COLORS.fgSubtle,
            marginTop: 30,
          }}
        >
          30 free credits · No card
        </p>
      </FadeUp>
    </AbsoluteFill>
  );
}

export function SocialVertical() {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Sequence from={0} durationInFrames={150}>
        <Hook />
      </Sequence>
      <Sequence from={150} durationInFrames={190}>
        <Proof />
      </Sequence>
      <Sequence from={340} durationInFrames={110}>
        <Close />
      </Sequence>
    </AbsoluteFill>
  );
}
