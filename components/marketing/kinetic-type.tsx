"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Typographic effects for the runtime showcase.
 *
 * All of them degrade to plain, readable text: the final string is always in
 * the DOM for assistive tech and for anyone with prefers-reduced-motion, and
 * the animation only ever decorates it. Nothing here gates comprehension on
 * motion completing.
 */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const listener = () => setReduced(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return reduced;
}

/** Fires once when the element first scrolls into view. */
function useInView<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  rootMargin = "-10% 0px",
): boolean {
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin, inView]);

  return inView;
}

/**
 * Letters rise into place individually.
 *
 * Words are kept as unbroken units so the line still wraps naturally and a
 * screen reader reads a sentence, not a column of characters.
 */
export function SplitReveal({
  text,
  className,
  delay = 0,
  stagger = 22,
  as: Tag = "span",
  id,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: "span" | "h2" | "h3" | "p";
  /** Lets a heading be targeted by aria-labelledby. */
  id?: string;
}) {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const reduced = usePrefersReducedMotion();

  const words = text.split(" ");
  let index = 0;

  return (
    <Tag
      ref={ref as React.Ref<never>}
      id={id}
      className={className}
      // The plain string is what assistive tech announces.
      aria-label={text}
    >
      {words.map((word, wordIndex) => (
        <span key={`${word}-${wordIndex}`} className="inline-block whitespace-nowrap">
          {[...word].map((char) => {
            const charDelay = delay + index * stagger;
            index += 1;
            return (
              <span
                key={charDelay}
                aria-hidden="true"
                className="inline-block"
                style={{
                  opacity: reduced || inView ? 1 : 0,
                  transform: reduced || inView ? "none" : "translateY(0.45em)",
                  transition: reduced
                    ? "none"
                    : `opacity 460ms cubic-bezier(0.22,1,0.36,1) ${charDelay}ms, transform 460ms cubic-bezier(0.22,1,0.36,1) ${charDelay}ms`,
                }}
              >
                {char}
              </span>
            );
          })}
          {wordIndex < words.length - 1 ? <span aria-hidden="true">&nbsp;</span> : null}
        </span>
      ))}
    </Tag>
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@*<>/\\";

/**
 * Decode-style scramble, used on values that change as the simulation runs.
 *
 * Each character locks in left to right, so the eye tracks a value resolving
 * rather than flickering. Spaces are never scrambled — that keeps word shape
 * stable and stops the layout jittering.
 */
export function ScrambleText({
  text,
  className,
  durationMs = 700,
  playKey,
}: {
  text: string;
  className?: string;
  durationMs?: number;
  /** Change this to replay the scramble — e.g. when the underlying value changes. */
  playKey?: string | number;
}) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = React.useState(text);

  React.useEffect(() => {
    if (reduced) {
      setDisplay(text);
      return;
    }

    let frame = 0;
    const totalFrames = Math.max(1, Math.round(durationMs / 16.7));
    let raf = 0;

    const tick = () => {
      const progress = frame / totalFrames;
      const locked = Math.floor(progress * text.length);

      setDisplay(
        [...text]
          .map((char, i) => {
            if (char === " ") return " ";
            if (i < locked) return char;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join(""),
      );

      frame += 1;
      if (frame <= totalFrames) raf = requestAnimationFrame(tick);
      else setDisplay(text);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, durationMs, reduced, playKey]);

  return (
    <span className={cn("tabular-nums", className)} aria-label={text}>
      <span aria-hidden="true">{display}</span>
    </span>
  );
}

/** Counts a number up when it scrolls into view. */
export function CountUp({
  to,
  durationMs = 1100,
  className,
  format = (n) => n.toLocaleString("en-US"),
}: {
  to: number;
  durationMs?: number;
  className?: string;
  format?: (value: number) => string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref);
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutExpo — fast start, long settle, reads as "resolving".
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, durationMs, reduced]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(value)}
    </span>
  );
}
