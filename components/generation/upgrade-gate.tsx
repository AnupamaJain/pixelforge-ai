import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown in place of a workspace when the feature needs a Pro plan. */
export function UpgradeGate({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
        <Lock aria-hidden="true" className="size-5" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{description}</p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Link href="/pricing">
          <Button className="w-full sm:w-auto">Upgrade to Pro</Button>
        </Link>
        <Link href="/generate">
          <Button variant="secondary" className="w-full sm:w-auto">
            Back to Generate
          </Button>
        </Link>
      </div>
    </div>
  );
}
