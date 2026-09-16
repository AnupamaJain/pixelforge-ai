"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="PixelForge AI home">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[--radius-sm] px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link href="/app">
              <Button size="sm">Open workspace</Button>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-[--radius-sm] px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg"
              >
                Log in
              </Link>
              <Link href="/signup">
                <Button size="sm">Start creating</Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-[--radius-sm] p-2 text-fg-muted md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-border bg-bg md:hidden">
          <nav aria-label="Mobile" className="flex flex-col p-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-[--radius-sm] px-3 py-2.5 text-sm text-fg-muted hover:bg-bg-muted hover:text-fg"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-4">
              <ThemeToggle />
              <div className="flex gap-2">
                {isAuthenticated ? (
                  <Link href="/app">
                    <Button size="sm">Open workspace</Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="secondary" size="sm">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/signup">
                      <Button size="sm">Start creating</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
