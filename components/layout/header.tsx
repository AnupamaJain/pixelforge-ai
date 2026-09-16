"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Coins, LogOut, Settings, CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCredits } from "@/components/credits-provider";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/utils";
import { Logo } from "@/components/brand";

export function Header({ email }: { email: string }) {
  const router = useRouter();
  const { credits, isPaid, planName } = useCredits();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Dismiss on outside click and on Escape.
  React.useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur-xl sm:px-6">
      <Link href="/app" className="lg:hidden" aria-label="PixelForge AI dashboard">
        <Logo />
      </Link>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Link
          href="/billing"
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] transition-colors hover:border-border-strong"
          title={`${formatNumber(credits)} credits remaining`}
        >
          <Coins aria-hidden="true" className="size-3.5 text-accent" />
          <span className="font-medium tabular-nums">{formatNumber(credits)}</span>
          <span className="hidden text-fg-muted sm:inline">credits remaining</span>
        </Link>

        {!isPaid ? (
          <Link href="/pricing">
            <Button size="sm">Upgrade</Button>
          </Link>
        ) : (
          <Badge variant="accent" className="hidden sm:inline-flex">
            {planName}
          </Badge>
        )}

        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-1 pr-2 transition-colors hover:border-border-strong"
          >
            <span
              aria-hidden="true"
              className="grid size-6 place-items-center rounded-full bg-accent text-[11px] font-semibold uppercase text-accent-fg"
            >
              {email.charAt(0)}
            </span>
            <ChevronDown aria-hidden="true" className="size-3.5 text-fg-subtle" />
            <span className="sr-only">Account menu for {email}</span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[--radius-md] border border-border bg-surface-raised shadow-lg"
            >
              <div className="border-b border-border px-3 py-2.5">
                <p className="truncate text-[13px] font-medium">{email}</p>
                <p className="text-xs text-fg-subtle">
                  {planName} plan
                </p>
              </div>

              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
              >
                <Settings aria-hidden="true" className="size-4" />
                Settings
              </Link>
              <Link
                href="/billing"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
              >
                <CreditCard aria-hidden="true" className="size-4" />
                Billing
              </Link>

              <button
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
              >
                <LogOut aria-hidden="true" className="size-4" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
