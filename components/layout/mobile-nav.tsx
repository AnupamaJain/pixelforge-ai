"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "./nav-config";

/**
 * Bottom bar for small screens — a purpose-built navigation rather than a
 * shrunken sidebar, so targets stay thumb-sized.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Workspace"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
    >
      <ul className="flex">
        {MOBILE_NAV.map(({ href, label, Icon }) => {
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-accent" : "text-fg-subtle hover:text-fg",
                )}
              >
                <Icon aria-hidden="true" className="size-[18px]" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
