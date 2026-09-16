import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";

/**
 * Shared motion primitives.
 *
 * Springs rather than linear easing — the slight overshoot reads as deliberate
 * rather than mechanical at 30fps.
 */

/** Fades and lifts children in, starting at `delay` frames. */
export function FadeUp({
  children,
  delay = 0,
  distance = 24,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 100, mass: 0.6 },
  });

  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * distance}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Scales in from slightly small — used for badges and cards. */
export function PopIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 180, mass: 0.7 },
  });

  return (
    <div
      style={{
        opacity: interpolate(progress, [0, 0.4], [0, 1], {
          extrapolateRight: "clamp",
        }),
        transform: `scale(${interpolate(progress, [0, 1], [0.86, 1])})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = "accent",
  delay = 0,
}: {
  children: React.ReactNode;
  variant?: "accent" | "success" | "outline";
  delay?: number;
}) {
  const palette = {
    accent: { bg: COLORS.accentSoft, fg: COLORS.accent, border: "transparent" },
    success: { bg: "#E8F5EE", fg: COLORS.success, border: "transparent" },
    outline: { bg: "transparent", fg: COLORS.fgMuted, border: COLORS.border },
  }[variant];

  return (
    <PopIn delay={delay}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 22px",
          borderRadius: 999,
          background: palette.bg,
          border: `2px solid ${palette.border}`,
          color: palette.fg,
          fontFamily: FONT,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        {children}
      </div>
    </PopIn>
  );
}

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill={COLORS.accent} />
      <rect x="7" y="7" width="8" height="8" rx="1.5" fill="#fff" opacity="0.95" />
      <rect x="17" y="7" width="8" height="8" rx="1.5" fill="#fff" opacity="0.55" />
      <rect x="7" y="17" width="8" height="8" rx="1.5" fill="#fff" opacity="0.55" />
      <rect x="17" y="17" width="4" height="4" rx="1" fill="#fff" opacity="0.95" />
      <rect x="22" y="17" width="3" height="3" rx="0.75" fill="#fff" opacity="0.7" />
      <rect x="17" y="22" width="3" height="3" rx="0.75" fill="#fff" opacity="0.7" />
    </svg>
  );
}

export function Wordmark({ size = 56 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <Logo size={size} />
      <span
        style={{
          fontFamily: FONT,
          fontSize: size * 0.62,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: COLORS.fg,
        }}
      >
        PixelForge <span style={{ color: COLORS.accent }}>AI</span>
      </span>
    </div>
  );
}

/** Hairline grid backdrop, matching the site's hero treatment. */
export function GridBackdrop({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        backgroundImage: `linear-gradient(to right, ${COLORS.border} 1px, transparent 1px), linear-gradient(to bottom, ${COLORS.border} 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
        maskImage: "linear-gradient(to bottom, black 45%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 45%, transparent 100%)",
      }}
    />
  );
}

export function CheckIcon({
  size = 28,
  color = COLORS.success,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={color} />
      <path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
