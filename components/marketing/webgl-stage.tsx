"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * WebGL product stage.
 *
 * Not decoration — it argues the product's case in three dimensions. The
 * generated scene is a curved backdrop with real depth; the customer's product
 * is a flat, textured plane suspended in front of it, never touched by the
 * environment. Orbiting shows the world move while the product stays exactly
 * as photographed.
 *
 * Three.js is imported dynamically so ~600KB stays out of the initial bundle,
 * and the scene only builds once it scrolls into view. On reduced-motion or
 * missing WebGL it falls back to a static image, which is why `fallbackSrc`
 * is required rather than optional.
 */

export function WebglStage({
  sceneSrc,
  productSrc,
  fallbackSrc,
  className,
}: {
  sceneSrc: string;
  productSrc: string;
  fallbackSrc: string;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [status, setStatus] = React.useState<"idle" | "ready" | "fallback">("idle");
  const [hint, setHint] = React.useState(true);

  // Lets sceneSrc change without rebuilding the scene graph.
  const swapSceneRef = React.useRef<((src: string) => void) | null>(null);
  const latestSceneRef = React.useRef(sceneSrc);
  latestSceneRef.current = sceneSrc;

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStatus("fallback");
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || disposed || cleanup) return;
        observer.disconnect();

        void (async () => {
          try {
            const THREE = await import("three");
            if (disposed) return;

            const width = container.clientWidth;
            const height = container.clientHeight;

            const renderer = new THREE.WebGLRenderer({
              antialias: true,
              alpha: true,
              powerPreference: "low-power",
            });
            // Cap DPR: past 2x the cost is real and the gain is not visible.
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(width, height);
            container.appendChild(renderer.domElement);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
            camera.position.set(0, 0.2, 5.4);

            const loader = new THREE.TextureLoader();
            const load = (src: string) =>
              new Promise<InstanceType<typeof THREE.Texture>>((resolve, reject) =>
                loader.load(src, resolve, undefined, reject),
              );

            const [sceneTex, productTex] = await Promise.all([
              load(sceneSrc),
              load(productSrc),
            ]);
            if (disposed) return;

            sceneTex.colorSpace = THREE.SRGBColorSpace;
            productTex.colorSpace = THREE.SRGBColorSpace;

            // --- Backdrop: curved, so orbiting reveals genuine depth ---------
            // Wide, gently curved sweep. A tighter arc left white gutters at
            // the edges of the frame.
            const backdropGeo = new THREE.CylinderGeometry(
              6.2, 6.2, 8.2, 80, 1, true, Math.PI * 0.80, Math.PI * 0.40,
            );
            const backdropMat = new THREE.MeshBasicMaterial({
              map: sceneTex,
              side: THREE.BackSide,
            });
            const backdrop = new THREE.Mesh(backdropGeo, backdropMat);
            backdrop.position.z = -2.6;
            scene.add(backdrop);

            // Swap the backdrop map when the visitor picks another scene.
            swapSceneRef.current = (src: string) => {
              loader.load(src, (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                const previous = backdropMat.map;
                backdropMat.map = tex;
                backdropMat.needsUpdate = true;
                previous?.dispose();
              });
            };

            // --- Product: a flat plane. Its pixels are never lit or shaded. --
            // Texture.image is typed as {} — it is an HTMLImageElement here.
            const source = productTex.image as { width?: number; height?: number } | undefined;
            const aspect = (source?.width ?? 1) / (source?.height ?? 1);
            // Sized so the product reads as an object placed in the scene
            // rather than a poster filling it.
            const productHeight = 2.0;
            const product = new THREE.Mesh(
              new THREE.PlaneGeometry(productHeight * aspect, productHeight),
              new THREE.MeshBasicMaterial({
                map: productTex,
                transparent: true,
                // Kills the dark halo where semi-transparent edge pixels would
                // otherwise composite against the backdrop.
                alphaTest: 0.02,
                depthWrite: false,
              }),
            );
            product.position.set(0, 0.05, 1.4);
            scene.add(product);

            // --- Contact shadow, so the product sits in the world ------------
            const shadowCanvas = document.createElement("canvas");
            shadowCanvas.width = shadowCanvas.height = 128;
            const ctx = shadowCanvas.getContext("2d");
            if (ctx) {
              const grd = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
              grd.addColorStop(0, "rgba(0,0,0,0.42)");
              grd.addColorStop(1, "rgba(0,0,0,0)");
              ctx.fillStyle = grd;
              ctx.fillRect(0, 0, 128, 128);
            }
            const shadow = new THREE.Mesh(
              new THREE.PlaneGeometry(2.6, 0.9),
              new THREE.MeshBasicMaterial({
                map: new THREE.CanvasTexture(shadowCanvas),
                transparent: true,
                depthWrite: false,
              }),
            );
            shadow.position.set(0, -1.12, 1.35);
            shadow.rotation.x = -Math.PI / 2.6;
            scene.add(shadow);

            // --- Interaction: drag to orbit, gentle drift when idle ----------
            let targetX = 0;
            let targetY = 0;
            let currentX = 0;
            let currentY = 0;
            let dragging = false;
            let lastPointer = 0;

            const onPointerDown = (event: PointerEvent) => {
              dragging = true;
              lastPointer = event.clientX;
              setHint(false);
              renderer.domElement.setPointerCapture(event.pointerId);
            };
            const onPointerMove = (event: PointerEvent) => {
              const rect = container.getBoundingClientRect();
              const nx = (event.clientX - rect.left) / rect.width - 0.5;
              const ny = (event.clientY - rect.top) / rect.height - 0.5;

              if (dragging) {
                targetX += (event.clientX - lastPointer) * 0.004;
                lastPointer = event.clientX;
              } else {
                // Hover parallax, deliberately subtle.
                targetX = nx * 0.42;
                targetY = ny * 0.18;
              }
            };
            const onPointerUp = (event: PointerEvent) => {
              dragging = false;
              try { renderer.domElement.releasePointerCapture(event.pointerId); } catch {}
            };

            renderer.domElement.addEventListener("pointerdown", onPointerDown);
            container.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);

            const onResize = () => {
              const w = container.clientWidth;
              const h = container.clientHeight;
              camera.aspect = w / h;
              camera.updateProjectionMatrix();
              renderer.setSize(w, h);
            };
            window.addEventListener("resize", onResize);

            let raf = 0;
            let running = true;
            const clock = new THREE.Clock();

            const tick = () => {
              if (!running) return;
              const t = clock.getElapsedTime();

              if (!dragging) targetX += Math.sin(t * 0.18) * 0.0012;

              // Critically-damped-ish follow; no spring overshoot.
              currentX += (targetX - currentX) * 0.06;
              currentY += (targetY - currentY) * 0.06;

              // The world rotates. The product counter-rotates to stay flat-on,
              // which is the entire point being made.
              backdrop.rotation.y = currentX * 0.9;
              backdrop.position.x = -currentX * 0.6;
              product.position.x = -currentX * 0.25;
              product.position.y = 0.1 - currentY * 0.4;
              shadow.position.x = -currentX * 0.25;
              camera.position.y = 0.25 + currentY * 0.5;
              camera.lookAt(0, 0, 0);

              renderer.render(scene, camera);
              raf = requestAnimationFrame(tick);
            };

            // Stop rendering when scrolled away — a idle WebGL loop is pure
            // battery drain on a marketing page.
            const visibility = new IntersectionObserver(
              ([entry]) => {
                if (entry.isIntersecting && !running) {
                  running = true;
                  tick();
                } else if (!entry.isIntersecting) {
                  running = false;
                  cancelAnimationFrame(raf);
                }
              },
              { rootMargin: "100px" },
            );
            visibility.observe(container);

            tick();
            setStatus("ready");

            cleanup = () => {
              swapSceneRef.current = null;
              running = false;
              cancelAnimationFrame(raf);
              visibility.disconnect();
              window.removeEventListener("resize", onResize);
              window.removeEventListener("pointerup", onPointerUp);
              container.removeEventListener("pointermove", onPointerMove);
              renderer.domElement.removeEventListener("pointerdown", onPointerDown);
              scene.traverse((object) => {
                const mesh = object as { geometry?: { dispose(): void }; material?: { map?: { dispose(): void }; dispose(): void } };
                mesh.geometry?.dispose();
                mesh.material?.map?.dispose();
                mesh.material?.dispose();
              });
              renderer.dispose();
              renderer.domElement.remove();
            };
          } catch {
            // No WebGL, blocked context, or texture failure — show the image.
            if (!disposed) setStatus("fallback");
          }
        })();
      },
      { rootMargin: "200px" },
    );

    observer.observe(container);

    return () => {
      disposed = true;
      observer.disconnect();
      cleanup?.();
    };
  }, [sceneSrc, productSrc]);

  React.useEffect(() => {
    swapSceneRef.current?.(sceneSrc);
  }, [sceneSrc]);

  // On narrow viewports the hint overlaps the product, so retire it shortly
  // after the scene appears even if nobody has interacted.
  React.useEffect(() => {
    if (status !== "ready") return;
    const timer = setTimeout(() => setHint(false), 4200);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[--radius-lg] border border-border bg-bg-muted",
        className,
      )}
    >
      <div
        ref={containerRef}
        className="size-full cursor-grab touch-pan-y active:cursor-grabbing"
        role="img"
        aria-label="Interactive 3D view: a generated scene with depth, and the product suspended flat in front of it, unchanged."
      />

      {status !== "ready" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fallbackSrc}
          alt="Product composited into a generated scene"
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}

      {status === "ready" && hint ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
          Drag to orbit — the product never moves
        </div>
      ) : null}
    </div>
  );
}
