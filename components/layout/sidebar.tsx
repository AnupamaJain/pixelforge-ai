"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";

import { Wordmark } from "@/components/brand";
import type { PlanFeatures } from "@/config/plans";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SECONDARY_NAV } from "./nav-config";

export function Sidebar({ features }: { features: PlanFeatures }) {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg-subtle lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="PixelForge AI home">
          <Wordmark />
        </Link>
      </div>

      <nav aria-label="Workspace" className="flex flex-1 flex-col gap-1 p-3">
        {PRIMARY_NAV.map(({ href, label, Icon, ...rest }) => {
          const locked =
            "feature" in rest && rest.feature ? !features[rest.feature] : false;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-[--radius-sm] px-3 py-2 text-sm transition-colors",
                isActive(href)
                  ? "bg-surface font-medium text-fg shadow-sm"
                  : "text-fg-muted hover:bg-bg-muted hover:text-fg",
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {locked ? (
                <Lock
                  aria-label="Pro feature"
                  className="size-3 shrink-0 text-fg-subtle"
                />
              ) : null}
            </Link>
          );
        })}

        <div className="mt-auto space-y-1 border-t border-border pt-3">
          {SECONDARY_NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-[--radius-sm] px-3 py-2 text-sm transition-colors",
                isActive(href)
                  ? "bg-surface font-medium text-fg shadow-sm"
                  : "text-fg-muted hover:bg-bg-muted hover:text-fg",
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
