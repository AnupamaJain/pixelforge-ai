import type { Metadata } from "next";
import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsView } from "./view";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const auth = await requireAuthContext();
  const admin = createAdminClient();

  const [profile, balance] = await Promise.all([
    admin
      .from("profiles")
      .select("display_name, created_at")
      .eq("id", auth.user.id)
      .maybeSingle(),
    admin
      .from("credit_balances")
      .select("balance, lifetime_granted, lifetime_spent")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
  ]);

  return (
    <SettingsView
      userId={auth.user.id}
      email={auth.user.email ?? ""}
      displayName={profile.data?.display_name ?? ""}
      memberSince={profile.data?.created_at ?? auth.user.created_at}
      planName={auth.plan.name}
      credits={balance.data?.balance ?? 0}
      lifetimeGranted={balance.data?.lifetime_granted ?? 0}
      lifetimeSpent={balance.data?.lifetime_spent ?? 0}
    />
  );
}
