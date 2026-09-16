"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ShowcaseImage } from "@/config/showcase";

/**
 * Draggable before/after comparison.
 *
 * Works with pointer, touch and keyboard (arrow keys move the divider), and
 * exposes the position as a slider to assistive technology.
 */
export function CompareSlider({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  className,
}: {
  before: ShowcaseImage;
  after: ShowcaseImage;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}) {
  const [position, setPosition] = React.useState(50);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);

  const updateFromClientX = React.useCallback((clientX: number) => {
    const element = containerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }, []);

  React.useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (!draggingRef.current) return;
      event.preventDefault();
      updateFromClientX(event.clientX);
    }
    function onPointerUp() {
      draggingRef.current = false;
    }

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [updateFromClientX]);

  return (
    <div
      ref={containerRef}
      onPointerDown={(event) => {
        draggingRef.current = true;
        updateFromClientX(event.clientX);
      }}
      className={cn(
        "relative aspect-square w-full touch-none select-none overflow-hidden rounded-[--radius-lg] border border-border",
        className,
      )}
    >
      {/* After (full width, underneath) */}
      <Image
        src={after.src}
        alt={after.alt}
        fill
        sizes="(max-width: 1024px) 100vw, 40rem"
        className="object-cover"
      />

      {/* Before (clipped to the divider) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={before.src}
          alt={before.alt}
          fill
          sizes="(max-width: 1024px) 100vw, 40rem"
          className="object-cover"
        />
      </div>

      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-fg">
        {afterLabel}
      </span>

      {/* Divider + handle */}
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
        style={{ left: `${position}%` }}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Compare before and after"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`${Math.round(position)}% revealing ${afterLabel}`}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 4));
            if (event.key === "ArrowRight") setPosition((p) => Math.min(100, p + 4));
          }}
          className="pointer-events-auto absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border-2 border-white bg-black/40 backdrop-blur"
        >
          <span aria-hidden="true" className="text-[11px] font-bold text-white">
            ⟺
          </span>
        </div>
      </div>
    </div>
  );
}
