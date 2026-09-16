"use client";

import * as React from "react";
import type { PlanId } from "@/config/plans";

interface CreditsContextValue {
  credits: number;
  plan: PlanId;
  isPro: boolean;
  /** Optimistically set the balance after a server response reports it. */
  setCredits: (credits: number) => void;
  /** Re-reads the authoritative balance from the server. */
  refresh: () => Promise<void>;
}

const CreditsContext = React.createContext<CreditsContextValue | null>(null);

export function useCredits(): CreditsContextValue {
  const context = React.useContext(CreditsContext);
  if (!context) throw new Error("useCredits must be used inside <CreditsProvider>");
  return context;
}

/**
 * Holds the credit balance for the session.
 *
 * This is a display cache only. Every spend is authorised and recorded
 * server-side; the number here is refreshed from /api/usage and is never
 * treated as authoritative.
 */
export function CreditsProvider({
  initialCredits,
  plan,
  children,
}: {
  initialCredits: number;
  plan: PlanId;
  children: React.ReactNode;
}) {
  const [credits, setCredits] = React.useState(initialCredits);

  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch("/api/usage", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { credits?: number };
      if (typeof data.credits === "number") setCredits(data.credits);
    } catch {
      // A failed refresh just leaves the cached number in place.
    }
  }, []);

  const value = React.useMemo(
    () => ({ credits, plan, isPro: plan === "PRO", setCredits, refresh }),
    [credits, plan, refresh],
  );

  return (
    <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>
  );
}
