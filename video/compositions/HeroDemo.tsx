import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

import { COLORS, FONT } from "../theme";
import {
  Badge,
  CheckIcon,
  FadeUp,
  GridBackdrop,
  PopIn,
  Wordmark,
} from "../components/primitives";

/**
 * Hero demo — 16:9, ~24 seconds.
 *
 * Tells the pixel-identical story as a sequence rather than a claim:
 * upload → cut out → scene generated around it → composited back → verified.
 * That is the one thing competitors can't say, so the video spends most of its
 * runtime on it.
 */

const SCENE = {
  hook: { from: 0, duration: 110 },
  problem: { from: 110, duration: 130 },
  pipeline: { from: 240, duration: 270 },
  outcome: { from: 510, duration: 110 },
  cta: { from: 620, duration: 100 },
};

export const HERO_DEMO_DURATION = 720; // 24s at 30fps

function Card({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        border: `2px solid ${COLORS.border}`,
        background: COLORS.surface,
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(28,25,23,0.10)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Hook() {
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: 100 }}
    >
      <GridBackdrop />
      <div style={{ position: "relative", textAlign: "center" }}>
        <FadeUp delay={0}>
          <Wordmark size={54} />
        </FadeUp>
        <FadeUp delay={14}>
          <h1
            style={{
              fontFamily: FONT,
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: COLORS.fg,
              margin: "44px 0 0",
              maxWidth: 1250,
            }}
          >
            Product photography
            <br />
            without the photoshoot
          </h1>
        </FadeUp>
        <FadeUp delay={30}>
          <p
            style={{
              fontFamily: FONT,
              fontSize: 36,
              color: COLORS.fgMuted,
              marginTop: 32,
              letterSpacing: "-0.01em",
            }}
          >
            One photo in. A whole catalogue out.
          </p>
        </FadeUp>
      </div>
    </AbsoluteFill>
  );
}

/** The objection every seller already has about AI images. */
function Problem() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: 100 }}
    >
      <FadeUp delay={0}>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: 62,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: COLORS.fg,
            textAlign: "center",
            margin: 0,
            maxWidth: 1100,
          }}
        >
          Every other AI tool redraws your product
        </h2>
      </FadeUp>

      <div style={{ display: "flex", gap: 40, marginTop: 64 }}>
        {[
          { label: "Warped label", delay: 16 },
          { label: "Shifted colour", delay: 26 },
          { label: "Invented details", delay: 36 },
        ].map((item) => {
          const shake = interpolate(
            (frame - item.delay) % 40,
            [0, 10, 20, 30, 40],
            [0, -2.5, 0, 2.5, 0],
            { extrapolateRight: "clamp" },
          );
          return (
            <PopIn key={item.label} delay={item.delay}>
              <div
                style={{
                  width: 300,
                  padding: "34px 28px",
                  borderRadius: 20,
                  border: `2px solid #E9B8B0`,
                  background: "#FDF2F0",
                  textAlign: "center",
                  transform: `rotate(${shake}deg)`,
                }}
              >
                <div style={{ fontSize: 44 }}>⚠️</div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 27,
                    fontWeight: 600,
                    color: "#A43E2C",
                    marginTop: 14,
                  }}
                >
                  {item.label}
                </div>
              </div>
            </PopIn>
          );
        })}
      </div>

      <FadeUp delay={52}>
        <p
          style={{
            fontFamily: FONT,
            fontSize: 31,
            color: COLORS.fgMuted,
            marginTop: 56,
          }}
        >
          Unusable on a product page.
        </p>
      </FadeUp>
    </AbsoluteFill>
  );
}

/** The four-step pipeline, which is the actual argument. */
function Pipeline() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Each step owns a 60-frame window.
  const step = Math.min(3, Math.floor(frame / 62));

  const steps = [
    { title: "1 · Your photo", caption: "Shot once, on any background" },
    { title: "2 · Cut out", caption: "The product is segmented" },
    { title: "3 · Scene generated", caption: "Only the surroundings — never the product" },
    { title: "4 · Composited back", caption: "Your original pixels, on top" },
  ];

  const cutProgress = spring({
    frame: frame - 62,
    fps,
    config: { damping: 200 },
  });
  const sceneProgress = spring({
    frame: frame - 124,
    fps,
    config: { damping: 200 },
  });
  const compositeProgress = spring({
    frame: frame - 186,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center" }}>
      <FadeUp delay={0}>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: 54,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: COLORS.fg,
            textAlign: "center",
            margin: "0 0 52px",
          }}
        >
          We only generate the scene
        </h2>
      </FadeUp>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        {/* Step 1–2: the product, then its cutout */}
        <div style={{ position: "relative" }}>
          <Card style={{ width: 340, height: 340 }}>
            <Img
              src={staticFile("showcase/product-watch.webp")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Checkerboard bleeds in as the background is removed. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: cutProgress * 0.85,
                backgroundImage: `linear-gradient(45deg, ${COLORS.bgMuted} 25%, transparent 25%), linear-gradient(-45deg, ${COLORS.bgMuted} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${COLORS.bgMuted} 75%), linear-gradient(-45deg, transparent 75%, ${COLORS.bgMuted} 75%)`,
                backgroundSize: "26px 26px",
                backgroundPosition: "0 0, 0 13px, 13px -13px, -13px 0px",
                mixBlendMode: "multiply",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: cutProgress,
              }}
            >
              <Img
                src={staticFile("showcase/product-cutout.png")}
                style={{
                  width: "88%",
                  height: "88%",
                  objectFit: "contain",
                }}
              />
            </div>
          </Card>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 22,
              color: COLORS.fgSubtle,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            Your photo
          </div>
        </div>

        <div style={{ fontSize: 44, color: COLORS.fgSubtle }}>→</div>

        {/* Step 3: scene generated */}
        <div style={{ position: "relative" }}>
          <Card style={{ width: 340, height: 340, position: "relative" }}>
            <Img
              src={staticFile("showcase/scene-wood.webp")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: sceneProgress,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: COLORS.bgMuted,
                opacity: 1 - sceneProgress,
              }}
            />
          </Card>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 22,
              color: COLORS.fgSubtle,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            Scene generated
          </div>
        </div>

        <div style={{ fontSize: 44, color: COLORS.fgSubtle }}>→</div>

        {/* Step 4: composited */}
        <div style={{ position: "relative" }}>
          <Card
            style={{
              width: 340,
              height: 340,
              position: "relative",
              borderColor:
                compositeProgress > 0.5 ? COLORS.accent : COLORS.border,
            }}
          >
            <Img
              src={staticFile("showcase/scene-wood.webp")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Multiply blend drops the product photo's white background out
                against the scene, which is what compositing actually looks
                like — far closer to the real output than a circular badge. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: 30,
                opacity: compositeProgress,
                transform: `scale(${interpolate(compositeProgress, [0, 1], [1.18, 1])})`,
              }}
            >
              <Img
                src={staticFile("showcase/product-cutout.png")}
                style={{
                  width: 260,
                  height: 260,
                  objectFit: "contain",
                  filter: "drop-shadow(0 16px 28px rgba(0,0,0,0.34))",
                }}
              />
            </div>
          </Card>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 22,
              color: COLORS.fgSubtle,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            Composited back
          </div>
        </div>
      </div>

      <FadeUp delay={8} style={{ marginTop: 48, textAlign: "center" }}>
        <p
          style={{
            fontFamily: FONT,
            fontSize: 30,
            color: COLORS.fg,
            fontWeight: 600,
            margin: 0,
          }}
        >
          {steps[step].title}
        </p>
        <p
          style={{
            fontFamily: FONT,
            fontSize: 25,
            color: COLORS.fgMuted,
            marginTop: 8,
          }}
        >
          {steps[step].caption}
        </p>
      </FadeUp>
    </AbsoluteFill>
  );
}

/** The verification beat — the claim that is actually checkable. */
function Outcome() {
  const frame = useCurrentFrame();

  // Counts up to emphasise that this is a measurement, not a slogan.
  const pixels = Math.round(
    interpolate(frame, [10, 55], [0, 184320], { extrapolateRight: "clamp" }),
  );

  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: 100 }}
    >
      <PopIn delay={0}>
        <CheckIcon size={110} />
      </PopIn>

      <FadeUp delay={12}>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            color: COLORS.fg,
            textAlign: "center",
            margin: "40px 0 0",
          }}
        >
          Pixel-identical. Verified.
        </h2>
      </FadeUp>

      <FadeUp delay={24}>
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 44,
            fontFamily: FONT,
          }}
        >
          <div
            style={{
              padding: "24px 40px",
              borderRadius: 18,
              background: COLORS.bgMuted,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 46,
                fontWeight: 700,
                color: COLORS.fg,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {pixels.toLocaleString("en-US")}
            </div>
            <div style={{ fontSize: 22, color: COLORS.fgMuted, marginTop: 6 }}>
              pixels checked
            </div>
          </div>
          <div
            style={{
              padding: "24px 40px",
              borderRadius: 18,
              background: "#E8F5EE",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 46,
                fontWeight: 700,
                color: COLORS.success,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              0
            </div>
            <div style={{ fontSize: 22, color: COLORS.success, marginTop: 6 }}>
              changed
            </div>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={40}>
        <p
          style={{
            fontFamily: FONT,
            fontSize: 26,
            color: COLORS.fgMuted,
            marginTop: 40,
            textAlign: "center",
          }}
        >
          If a single pixel changes, the run fails and your credits come back.
        </p>
      </FadeUp>
    </AbsoluteFill>
  );
}

function Cta() {
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: 100 }}
    >
      <GridBackdrop opacity={0.4} />
      <div style={{ position: "relative", textAlign: "center" }}>
        <FadeUp delay={0}>
          <Wordmark size={64} />
        </FadeUp>

        <FadeUp delay={12}>
          <h2
            style={{
              fontFamily: FONT,
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              color: COLORS.fg,
              margin: "40px 0 0",
            }}
          >
            Start with 30 free credits
          </h2>
        </FadeUp>

        <FadeUp delay={24}>
          <div
            style={{
              display: "inline-flex",
              marginTop: 40,
              padding: "24px 56px",
              borderRadius: 16,
              background: COLORS.accent,
              color: COLORS.accentFg,
              fontFamily: FONT,
              fontSize: 32,
              fontWeight: 600,
            }}
          >
            Try it free
          </div>
        </FadeUp>

        <FadeUp delay={34}>
          <p
            style={{
              fontFamily: FONT,
              fontSize: 25,
              color: COLORS.fgSubtle,
              marginTop: 28,
            }}
          >
            No card required · Failed runs always refunded
          </p>
        </FadeUp>
      </div>
    </AbsoluteFill>
  );
}

export function HeroDemo() {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Sequence from={SCENE.hook.from} durationInFrames={SCENE.hook.duration}>
        <Hook />
      </Sequence>
      <Sequence from={SCENE.problem.from} durationInFrames={SCENE.problem.duration}>
        <Problem />
      </Sequence>
      <Sequence from={SCENE.pipeline.from} durationInFrames={SCENE.pipeline.duration}>
        <Pipeline />
      </Sequence>
      <Sequence from={SCENE.outcome.from} durationInFrames={SCENE.outcome.duration}>
        <Outcome />
      </Sequence>
      <Sequence from={SCENE.cta.from} durationInFrames={SCENE.cta.duration}>
        <Cta />
      </Sequence>
    </AbsoluteFill>
  );
}
