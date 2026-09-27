"use client";

import * as React from "react";
import { AlertCircle, Check, ExternalLink, Package, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";

/**
 * Embedded app UI.
 *
 * Every request carries an App Bridge session token, which the server verifies
 * and uses to resolve the shop — the shop is never taken from a query
 * parameter, or one merchant could read another's catalogue.
 */

interface Product {
  id: number;
  title: string;
  handle: string;
  status: string;
  image: { src: string } | null;
  imageCount: number;
}

declare global {
  interface Window {
    shopify?: { idToken?: () => Promise<string> };
  }
}

export function ShopifyApp({ shop }: { shop: string | null }) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [linked, setLinked] = React.useState(false);
  const [plan, setPlan] = React.useState("FREE");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  /** App Bridge mints a short-lived token per request; never cache it. */
  const authedFetch = React.useCallback(
    async (input: string, init: RequestInit = {}) => {
      const token = await window.shopify?.idToken?.();
      if (!token) throw new Error("App Bridge is not available. Open this app from Shopify admin.");
      return fetch(input, {
        ...init,
        headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
      });
    },
    [],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authedFetch("/api/shopify/products");
      const data = (await response.json()) as {
        products?: Product[];
        linked?: boolean;
        plan?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Could not load products.");
      setProducts(data.products ?? []);
      setLinked(Boolean(data.linked));
      setPlan(data.plan ?? "FREE");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  React.useEffect(() => {
    // App Bridge attaches asynchronously; give it a moment before first call.
    const timer = setTimeout(() => void load(), 400);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Wordmark />
        <div className="flex items-center gap-2">
          {shop ? <Badge variant="outline">{shop}</Badge> : null}
          <Badge variant={plan === "FREE" ? "outline" : "accent"}>{plan}</Badge>
        </div>
      </header>

      <h1 className="mt-8 text-2xl font-bold tracking-tight">
        Product photography without the photoshoot
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
        Pick products from your catalogue. We generate scenes around them and
        push the results straight back onto the product — with your product
        pixel-identical in every one.
      </p>

      {!linked ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[--radius-md] border border-accent/30 bg-accent-soft p-4">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0 text-accent" />
          <p className="flex-1 text-sm text-fg">
            Connect a PixelForge account to start generating.
          </p>
          <a
            href={`/signup?shopify=${encodeURIComponent(shop ?? "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm">
              Connect account
              <ExternalLink aria-hidden="true" />
            </Button>
          </a>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-[--radius-md] border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            <RefreshCw aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Your products{products.length ? ` (${products.length})` : ""}
        </h2>
        {selected.size > 0 ? (
          <span className="text-[13px] text-fg-muted">{selected.size} selected</span>
        ) : null}
      </div>

      {loading ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="h-20 animate-pulse rounded-[--radius-sm] bg-bg-muted" />
          ))}
        </ul>
      ) : products.length === 0 && !error ? (
        <div className="mt-3 rounded-[--radius-md] border border-dashed border-border p-10 text-center">
          <Package aria-hidden="true" className="mx-auto size-5 text-fg-subtle" />
          <p className="mt-3 text-sm text-fg-muted">
            No products found in this store yet.
          </p>
        </div>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {products.map((product) => {
            const isSelected = selected.has(product.id);
            return (
              <li key={product.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (next.has(product.id)) next.delete(product.id);
                      else next.add(product.id);
                      return next;
                    })
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[--radius-sm] border p-3 text-left transition-colors",
                    isSelected
                      ? "border-accent bg-accent-soft"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <span className="size-12 shrink-0 overflow-hidden rounded-[--radius-xs] bg-bg-muted">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image.src}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">
                      {product.title}
                    </span>
                    <span className="block text-xs text-fg-subtle">
                      {product.imageCount} image{product.imageCount === 1 ? "" : "s"}
                      {product.status !== "active" ? ` · ${product.status}` : ""}
                    </span>
                  </span>
                  {isSelected ? (
                    <Check aria-hidden="true" className="size-4 shrink-0 text-accent" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected.size > 0 ? (
        <div className="sticky bottom-4 mt-6 flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5 shadow-lg">
          <span className="text-[13px] font-medium">
            {selected.size} product{selected.size === 1 ? "" : "s"} selected
          </span>
          <a
            href={`/product-studio?shopify=${encodeURIComponent(shop ?? "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto"
          >
            <Button size="sm" disabled={!linked}>
              Generate scenes
              <ExternalLink aria-hidden="true" />
            </Button>
          </a>
        </div>
      ) : null}
    </div>
  );
}
