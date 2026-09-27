/**
 * Shopify request-authentication tests.
 *
 * Every inbound Shopify request is attacker-reachable — anyone can POST to a
 * webhook URL or craft an OAuth callback. The HMAC is the only thing that
 * separates a genuine request from a forged one, so these tests assert the
 * negative cases as hard as the positive ones.
 *
 * Run with `npm run test:shopify`.
 */

process.env.SHOPIFY_API_SECRET = "test_secret_do_not_use_in_production";
process.env.SHOPIFY_API_KEY = "test_key";

import crypto from "node:crypto";
import {
  createOAuthState,
  verifyOAuthState,
  verifyQueryHmac,
  verifySessionToken,
  verifyWebhookHmac,
  ShopifyAuthError,
} from "../lib/shopify/auth";
import { isValidShopDomain } from "../config/shopify";

const SECRET = process.env.SHOPIFY_API_SECRET!;
const SHOP = "demo-store.myshopify.com";

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail?: string) =>
  ok
    ? (pass++, console.log(`  PASS  ${name}`))
    : (fail++, console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`));

/** Signs a query string exactly as Shopify does. */
function signQuery(params: Record<string, string>): URLSearchParams {
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  const hmac = crypto.createHmac("sha256", SECRET).update(sorted).digest("hex");
  return new URLSearchParams({ ...params, hmac });
}

console.log("\n== Query HMAC (OAuth callback) ==");
const valid = signQuery({ shop: SHOP, code: "abc123", timestamp: "1700000000" });
check("accepts a genuine signature", verifyQueryHmac(valid));

const tampered = new URLSearchParams(valid);
tampered.set("shop", "evil-store.myshopify.com");
check("rejects a tampered shop param", !verifyQueryHmac(tampered));

const tamperedCode = new URLSearchParams(valid);
tamperedCode.set("code", "stolen");
check("rejects a tampered code param", !verifyQueryHmac(tamperedCode));

check("rejects a missing hmac", !verifyQueryHmac(new URLSearchParams({ shop: SHOP })));

const wrongHmac = new URLSearchParams(valid);
wrongHmac.set("hmac", "0".repeat(64));
check("rejects a wrong hmac of correct length", !verifyQueryHmac(wrongHmac));

// An added parameter changes the payload, so the original signature must fail.
const extra = new URLSearchParams(valid);
extra.set("injected", "1");
check("rejects an injected extra param", !verifyQueryHmac(extra));

console.log("\n== Webhook HMAC ==");
const body = JSON.stringify({ id: 123, shop_domain: SHOP });
const goodSig = crypto.createHmac("sha256", SECRET).update(body, "utf8").digest("base64");
check("accepts a genuine webhook", verifyWebhookHmac(body, goodSig));
check("rejects a modified body", !verifyWebhookHmac(JSON.stringify({ id: 999 }), goodSig));
check("rejects a missing signature", !verifyWebhookHmac(body, null));
check("rejects an empty signature", !verifyWebhookHmac(body, ""));

// Re-serialising JSON changes byte order and must invalidate the signature —
// this is why the raw body has to be used.
const reparsed = JSON.stringify(JSON.parse(body), ["shop_domain", "id"]);
check(
  "rejects a re-serialised body (raw bytes matter)",
  reparsed === body || !verifyWebhookHmac(reparsed, goodSig),
);

console.log("\n== OAuth state ==");
const state = createOAuthState(SHOP);
check("accepts its own state", verifyOAuthState(state, SHOP));
check("rejects state issued for another shop", !verifyOAuthState(state, "other.myshopify.com"));
check("rejects a forged state", !verifyOAuthState(Buffer.from("a:b:c:d").toString("base64url"), SHOP));
check("rejects malformed state", !verifyOAuthState("not-base64!!", SHOP));

// Re-sign an old timestamp correctly: expiry must still reject it.
const oldIssued = String(Date.now() - 20 * 60 * 1000);
const oldPayload = `${SHOP}:deadbeef:${oldIssued}`;
const oldSig = crypto.createHmac("sha256", SECRET).update(oldPayload).digest("hex");
const oldState = Buffer.from(`${oldPayload}:${oldSig}`).toString("base64url");
check("rejects a correctly-signed but expired state", !verifyOAuthState(oldState, SHOP));

console.log("\n== Session token (App Bridge JWT) ==");
function makeToken(payload: Record<string, unknown>, secret = SECRET): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body64}`).digest("base64url");
  return `${header}.${body64}.${sig}`;
}

const now = Math.floor(Date.now() / 1000);
const base = {
  iss: `https://${SHOP}/admin`,
  dest: `https://${SHOP}`,
  aud: "test_key",
  sub: "1",
  exp: now + 60,
  nbf: now - 10,
  iat: now,
};

let ok = false;
try { verifySessionToken(makeToken(base)); ok = true; } catch { /* ignore */ }
check("accepts a genuine session token", ok);

const rejects = (token: string, label: string) => {
  let threw = false;
  try { verifySessionToken(token); } catch (e) { threw = e instanceof ShopifyAuthError; }
  check(label, threw);
};

rejects(makeToken(base, "wrong_secret"), "rejects a token signed with the wrong secret");
rejects(makeToken({ ...base, exp: now - 120 }), "rejects an expired token");
rejects(makeToken({ ...base, nbf: now + 600 }), "rejects a not-yet-valid token");
rejects(makeToken({ ...base, dest: "https://evil.example.com" }), "rejects a non-Shopify dest");
rejects("not.a.jwt", "rejects a malformed token");

// Algorithm confusion: a token claiming alg:none must not be accepted.
const noneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
const noneBody = Buffer.from(JSON.stringify(base)).toString("base64url");
rejects(`${noneHeader}.${noneBody}.`, "rejects alg:none (algorithm confusion)");

console.log("\n== Shop domain validation ==");
check("accepts a valid shop", isValidShopDomain(SHOP));
check("rejects a non-Shopify host", !isValidShopDomain("evil.com"));
check("rejects a subdomain attack", !isValidShopDomain("evil.com/x.myshopify.com"));
check("rejects a path traversal", !isValidShopDomain("shop.myshopify.com/../admin"));
check("rejects an empty value", !isValidShopDomain(""));
check("rejects null", !isValidShopDomain(null));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
