import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-subtle">
      <header className="p-5 sm:p-6">
        <Link href="/" aria-label="PixelForge AI home">
          <Wordmark />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center p-4 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
