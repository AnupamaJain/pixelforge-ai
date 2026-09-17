"use client";

import * as React from "react";
import { X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Clickable imagery with real-time effects.
 *
 * Every image on the marketing page is interactive:
 *  - hover tilts it toward the cursor (a real 3D transform, not a scale)
 *  - clicking fires a ripple from the exact click point
 *  - it then expands into a lightbox using a FLIP transition, so the image
 *    appears to grow from where it sat rather than cross-fading
 *  - inside the lightbox, moving the pointer pans the zoomed image
 *
 * All of it degrades: prefers-reduced-motion drops the tilt, the ripple and
 * the FLIP transition, leaving a plain open/close. The lightbox itself is a
 * <dialog>, so focus trapping and Escape come from the platform.
 */

interface LightboxItem {
  src: string;
  alt: string;
  caption?: string;
}

interface LightboxContextValue {
  open: (item: LightboxItem, origin: DOMRect) => void;
}

const LightboxContext = React.createContext<LightboxContextValue | null>(null);

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = React.useState<LightboxItem | null>(null);
  const [origin, setOrigin] = React.useState<DOMRect | null>(null);
  const [settled, setSettled] = React.useState(false);
  const [pan, setPan] = React.useState({ x: 50, y: 50 });
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion();

  const open = React.useCallback((next: LightboxItem, rect: DOMRect) => {
    setItem(next);
    setOrigin(rect);
    setSettled(false);
    setPan({ x: 50, y: 50 });
  }, []);

  const close = React.useCallback(() => {
    setSettled(false);
    // Let the shrink transition play before unmounting.
    setTimeout(() => setItem(null), reduced ? 0 : 220);
  }, [reduced]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (item && !dialog.open) {
      dialog.showModal();
      // Two frames: one to mount at the origin rect, one to animate to centre.
      requestAnimationFrame(() => requestAnimationFrame(() => setSettled(true)));
    } else if (!item && dialog.open) {
      dialog.close();
    }
  }, [item]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      close();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [close]);

  // FLIP: start at the thumbnail's rect, transition to the centred size.
  const flipStyle = React.useMemo<React.CSSProperties>(() => {
    if (!origin || reduced) return {};
    if (settled) return {};

    const centreX = window.innerWidth / 2;
    const centreY = window.innerHeight / 2;
    const originX = origin.left + origin.width / 2;
    const originY = origin.top + origin.height / 2;
    const scale = Math.max(0.15, origin.width / Math.min(window.innerWidth * 0.9, 1100));

    return {
      transform: `translate(${originX - centreX}px, ${originY - centreY}px) scale(${scale})`,
      opacity: 0.4,
    };
  }, [origin, settled, reduced]);

  const value = React.useMemo(() => ({ open }), [open]);

  return (
    <LightboxContext.Provider value={value}>
      {children}

      <dialog
        ref={dialogRef}
        aria-label={item?.alt ?? "Image viewer"}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        className="m-auto max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        {item ? (
          <div className="flex min-h-dvh w-screen items-center justify-center p-4 sm:p-8">
            <figure
              className="relative w-full max-w-[1100px]"
              style={{
                ...flipStyle,
                transition: reduced
                  ? "none"
                  : "transform 420ms cubic-bezier(0.22,1,0.36,1), opacity 260ms ease-out",
              }}
              onPointerMove={(event) => {
                if (reduced) return;
                const rect = event.currentTarget.getBoundingClientRect();
                setPan({
                  x: ((event.clientX - rect.left) / rect.width) * 100,
                  y: ((event.clientY - rect.top) / rect.height) * 100,
                });
              }}
              onPointerLeave={() => setPan({ x: 50, y: 50 })}
            >
              <div className="overflow-hidden rounded-[--radius-lg] border border-white/15 bg-black/20 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full select-none"
                  style={{
                    // Pointer position drives a gentle push, so the image feels
                    // inspectable rather than static.
                    transform: reduced
                      ? undefined
                      : `scale(1.04) translate(${(50 - pan.x) * 0.05}%, ${(50 - pan.y) * 0.05}%)`,
                    transition: "transform 240ms ease-out",
                  }}
                />
              </div>

              {item.caption ? (
                <figcaption className="mt-3 text-center text-[13px] text-white/75">
                  {item.caption}
                </figcaption>
              ) : null}

              <button
                onClick={close}
                aria-label="Close image"
                className="absolute -top-3 right-0 grid size-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:-right-3"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </figure>
          </div>
        ) : null}
      </dialog>
    </LightboxContext.Provider>
  );
}

/**
 * An image that tilts on hover, ripples on click, and expands into the
 * lightbox. Falls back to a plain image when rendered outside the provider,
 * so it can never break a page by being used in the wrong place.
 */
export function ClickableImage({
  src,
  alt,
  caption,
  className,
  imgClassName,
  priority,
  sizes,
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const context = React.useContext(LightboxContext);
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
  const [ripples, setRipples] = React.useState<{ id: number; x: number; y: number }[]>([]);
  const rippleId = React.useRef(0);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const element = ref.current;
    if (!element) return;

    if (!reduced) {
      const rect = element.getBoundingClientRect();
      const id = rippleId.current++;
      setRipples((current) => [
        ...current,
        { id, x: event.clientX - rect.left, y: event.clientY - rect.top },
      ]);
      setTimeout(() => setRipples((c) => c.filter((r) => r.id !== id)), 650);
    }

    context?.open({ src, alt, caption }, element.getBoundingClientRect());
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      onPointerMove={(event) => {
        if (reduced) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setTilt({
          // Capped at ±6deg — past that it reads as a gimmick.
          x: (((event.clientY - rect.top) / rect.height) - 0.5) * -6,
          y: (((event.clientX - rect.left) / rect.width) - 0.5) * 6,
        });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      aria-label={`View larger: ${alt}`}
      className={cn(
        "group relative block w-full overflow-hidden rounded-[--radius-md] border border-border bg-bg-muted",
        "transition-shadow duration-300 hover:shadow-xl",
        className,
      )}
      style={{
        transform: reduced
          ? undefined
          : `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 260ms cubic-bezier(0.22,1,0.36,1), box-shadow 300ms",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        sizes={sizes}
        className={cn(
          "w-full transition-transform duration-500 group-hover:scale-[1.03]",
          imgClassName,
        )}
      />

      {/* Sheen follows the tilt. */}
      {!reduced ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.y * 6}% ${50 - tilt.x * 6}%, rgba(255,255,255,0.22), transparent 55%)`,
          }}
        />
      ) : null}

      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full bg-white/45"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 8,
            height: 8,
            transform: "translate(-50%, -50%)",
            animation: "ripple 620ms cubic-bezier(0.22,1,0.36,1) forwards",
          }}
        />
      ))}

      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100"
      >
        <ZoomIn className="size-3.5" />
      </span>
    </button>
  );
}
