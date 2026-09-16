import Link from "next/link";
import { Wordmark } from "@/components/brand";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Create account" },
      { href: "/app", label: "Workspace" },
      { href: "/billing", label: "Billing" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg-subtle">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Wordmark />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-muted">
              A focused creative workspace for generating, transforming and
              upscaling images with AI.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-[13px] font-semibold text-fg">{column.title}</h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-fg-muted transition-colors hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PixelForge AI. All rights reserved.</p>
          {/* Attribution required by the Apache-2.0 licence of our engine dependency. */}
          <p>
            Image generation powered by open-source diffusion models. PixelForge AI
            is not affiliated with or endorsed by Invoke or Stability AI.
          </p>
        </div>
      </div>
    </footer>
  );
}
