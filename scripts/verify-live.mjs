/**
 * Live service verification.
 *
 * Exercises the flows that cannot be proven without real credentials: the
 * signup bootstrap trigger, atomic credit spend/refund, monthly-grant
 * idempotency, row-level security between two real users, and private storage.
 *
 * It creates two throwaway users, asserts against them, and deletes them in a
 * finally block so a failure mid-run still cleans up.
 *
 *   node --env-file=.env.local scripts/verify-live.mjs
 *
 * Safe to run against a live project: it touches only the users it creates.
 * It is NOT part of `npm test`, because it needs network and credentials.
 */

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SVC) {
  console.error(
    "\n  Missing Supabase credentials.\n" +
      "  Run with: node --env-file=.env.local scripts/verify-live.mjs\n",
  );
  process.exit(1);
}

const FREE_CREDITS = Number.parseInt(process.env.FREE_MONTHLY_CREDITS || "30", 10);
const admin = createClient(URL, SVC, { auth: { persistSession: false } });

let pass = 0;
let fail = 0;
const check = (name, ok, detail) =>
  ok
    ? (pass++, console.log(`  PASS  ${name}`))
    : (fail++, console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`));

const stamp = Date.now();
const PW = "VerifyLive!2026";
const created = [];

try {
  console.log("\n== Signup bootstrap ==");
  const { data: a, error: ea } = await admin.auth.admin.createUser({
    email: `verify.a.${stamp}@example.com`, password: PW, email_confirm: true,
  });
  check("user created", !ea && !!a?.user, ea?.message);
  if (!a?.user) throw new Error("cannot continue");
  created.push(a.user.id);
  const uid = a.user.id;

  await new Promise((r) => setTimeout(r, 1200));

  const [profile, balance, subscription, ledger] = await Promise.all([
    admin.from("profiles").select("*").eq("id", uid).maybeSingle(),
    admin.from("credit_balances").select("*").eq("user_id", uid).maybeSingle(),
    admin.from("subscriptions").select("*").eq("user_id", uid).maybeSingle(),
    admin.from("credit_transactions").select("*").eq("user_id", uid),
  ]);

  check("profile created by trigger", !!profile.data);
  check("profile defaults to FREE", profile.data?.plan === "FREE", profile.data?.plan);
  check("subscription created", !!subscription.data);
  check("ledger records the welcome grant", (ledger.data?.length ?? 0) > 0);
  check(
    `welcome grant matches config (${FREE_CREDITS})`,
    balance.data?.balance === FREE_CREDITS,
    `db granted ${balance.data?.balance}`,
  );

  console.log("\n== Credits ==");
  const start = balance.data.balance;
  const gen = await admin.from("generations").insert({
    user_id: uid, type: "TEXT_TO_IMAGE", status: "QUEUED", prompt: "verify",
    provider: "local", model: "dev-preview", image_count: 1, credit_cost: 5,
  }).select("id").single();

  const spend = await admin.rpc("spend_credits", {
    p_user_id: uid, p_amount: 5, p_type: "GENERATION",
    p_generation_id: gen.data.id, p_description: "verify",
  });
  check("spend deducts atomically", spend.data === start - 5, spend.error?.message);

  const over = await admin.rpc("spend_credits", {
    p_user_id: uid, p_amount: 10 ** 9, p_type: "GENERATION",
    p_generation_id: null, p_description: "overspend",
  });
  check("overspend rejected", /insufficient_credits/.test(over.error?.message ?? ""));

  const refund = await admin.rpc("refund_credits", {
    p_user_id: uid, p_amount: 5, p_generation_id: gen.data.id, p_description: "verify",
  });
  check("refund restores balance", refund.data === start);

  const again = await admin.rpc("refund_credits", {
    p_user_id: uid, p_amount: 5, p_generation_id: gen.data.id, p_description: "verify",
  });
  check("refund is idempotent per generation", again.data === start);

  const g1 = await admin.rpc("grant_monthly_credits", { p_user_id: uid, p_amount: 600, p_period: `v-${stamp}`, p_description: "v" });
  const g2 = await admin.rpc("grant_monthly_credits", { p_user_id: uid, p_amount: 600, p_period: `v-${stamp}`, p_description: "v" });
  check("monthly grant is idempotent per period", g1.data === g2.data && g1.data === start + 600);

  console.log("\n== Plan tiers ==");
  for (const plan of ["STARTER", "GROWTH", "AGENCY"]) {
    const r = await admin.from("subscriptions").update({ plan }).eq("user_id", uid).select("plan").maybeSingle();
    check(`subscriptions accepts ${plan}`, r.data?.plan === plan, r.error?.message);
  }

  console.log("\n== Row-level security ==");
  const { data: b } = await admin.auth.admin.createUser({
    email: `verify.b.${stamp}@example.com`, password: PW, email_confirm: true,
  });
  created.push(b.user.id);

  const asB = createClient(URL, ANON, { auth: { persistSession: false } });
  const signIn = await asB.auth.signInWithPassword({ email: `verify.b.${stamp}@example.com`, password: PW });
  check("second user can sign in", !signIn.error, signIn.error?.message);

  for (const table of ["profiles", "credit_balances", "credit_transactions", "generations", "subscriptions"]) {
    const column = table === "profiles" ? "id" : "user_id";
    const r = await asB.from(table).select("*").eq(column, uid);
    check(`cannot read another user's ${table}`, (r.data?.length ?? 0) === 0, `leaked ${r.data?.length}`);
  }

  const inflate = await asB.from("credit_balances").update({ balance: 10 ** 9 }).eq("user_id", b.user.id).select();
  check("client cannot inflate its own credits", (inflate.data?.length ?? 0) === 0);

  const upgrade = await asB.from("profiles").update({ plan: "AGENCY" }).eq("id", b.user.id).select("plan").maybeSingle();
  check("client cannot upgrade its own plan", upgrade.data?.plan !== "AGENCY", `became ${upgrade.data?.plan}`);

  console.log("\n== Storage ==");
  const { data: buckets } = await admin.storage.listBuckets();
  for (const id of ["generations", "uploads"]) {
    const bucket = buckets?.find((x) => x.id === id);
    check(`bucket ${id} is private`, !!bucket && bucket.public === false);
  }

  const key = `users/${uid}/generations/verify/test.png`;
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const upload = await admin.storage.from("generations").upload(key, png, { contentType: "image/png", upsert: true });
  check("server can write to storage", !upload.error, upload.error?.message);

  const signed = await admin.storage.from("generations").createSignedUrl(key, 60);
  check("signed URL minted", !!signed.data?.signedUrl, signed.error?.message);

  await admin.storage.from("generations").remove([key]);
} catch (error) {
  console.error("\n  fatal:", error.message);
  fail += 1;
} finally {
  console.log("\n== Cleanup ==");
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    console.log(`  removed ${id.slice(0, 8)}${error ? ` FAILED: ${error.message}` : ""}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
