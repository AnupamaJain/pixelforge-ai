"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCredits } from "@/components/credits-provider";
import { describeCost } from "@/config/credits";

/**
 * Primary action. When the balance is short it becomes an upgrade prompt
 * rather than a disabled button — the server enforces the limit either way.
 */
export function GenerateButton({
  cost,
  loading,
  disabled,
  label = "Generate",
  onClick,
}: {
  cost: number;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  onClick: () => void;
}) {
  const { credits } = useCredits();
  const affordable = credits >= cost;

  if (!affordable) {
    return (
      <div className="space-y-2">
        <Button className="w-full" disabled>
          Not enough credits
        </Button>
        <p className="text-center text-xs text-fg-muted">
          This needs {describeCost(cost)}, you have {credits}.{" "}
          <Link href="/pricing" className="font-medium text-accent hover:underline">
            Upgrade
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        size="lg"
        loading={loading}
        disabled={disabled}
        onClick={onClick}
      >
        {!loading ? <Sparkles aria-hidden="true" /> : null}
        {loading ? "Generating…" : label}
      </Button>
      <p className="text-center text-xs text-fg-subtle">
        Costs {describeCost(cost)} · {credits} available
      </p>
    </div>
  );
}
