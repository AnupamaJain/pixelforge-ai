/**
 * Assigns a plan to a user without Stripe.
 *
 * Until self-serve billing is live, this is how an early customer gets onto a
 * paid plan: it sets the subscription and grants that plan's monthly credits
 * through the same idempotent function the Stripe webhook uses, so the two
 * paths cannot drift.
 *
 *   node --env-file=.env.local scripts/set-plan.mjs <email> <FREE|STARTER|GROWTH|AGENCY>
 */

import { createClient } from "@supabase/supabase-js";

const [, , email, plan] = process.argv;
const VALID = ["FREE", "STARTER", "GROWTH", "AGENCY"];

if (!email || !VALID.includes(plan)) {
  console.error(`\n  usage: node --env-file=.env.local scripts/set-plan.mjs <email> <${VALID.join("|")}>\n`);
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// listUsers is paginated; walk it rather than assuming the first page.
let user = null;
for (let page = 1; page <= 20 && !user; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if (data.users.length < 200) break;
}

if (!user) {
  console.error(`\n  no user with email ${email}\n`);
  process.exit(1);
}

const CREDITS = {
  FREE: Number(process.env.FREE_MONTHLY_CREDITS ?? 30),
  STARTER: Number(process.env.STARTER_MONTHLY_CREDITS ?? 600),
  GROWTH: Number(process.env.GROWTH_MONTHLY_CREDITS ?? 2500),
  AGENCY: Number(process.env.AGENCY_MONTHLY_CREDITS ?? 10000),
};

await admin.from("subscriptions").update({
  plan,
  status: "active",
  updated_at: new Date().toISOString(),
}).eq("user_id", user.id);

await admin.from("profiles").update({ plan }).eq("id", user.id);

if (plan !== "FREE") {
  const period = `manual-${plan}-${new Date().toISOString().slice(0, 7)}`;
  const { data: balance } = await admin.rpc("grant_monthly_credits", {
    p_user_id: user.id,
    p_amount: CREDITS[plan],
    p_period: period,
    p_description: `${plan} plan credits (manual)`,
  });
  console.log(`\n  ${email} -> ${plan}, balance now ${balance}\n`);
} else {
  console.log(`\n  ${email} -> FREE\n`);
}
