import "server-only";

import crypto from "node:crypto";
import { isValidShopDomain, shopifyApiSecret } from "@/config/shopify";

/**
 * Shopify request authentication.
 *
 * Every inbound Shopify request — OAuth callbacks, webhooks, embedded app
 * calls — is attacker-reachable. Anyone can POST to a webhook URL or craft an
 * OAuth callback. The signature is the only thing separating a real Shopify
 * request from a forged one, so nothing here trusts a parameter before the
 * HMAC over it has been verified.
 *
 * All comparisons use timingSafeEqual. A plain `===` on a signature leaks
 * how much of the digest matched through response timing.
 */

function secretOrThrow(): string {
  const secret = shopifyApiSecret();
  if (!secret) throw new ShopifyAuthError("SHOPIFY_API_SECRET is not configured");
  return secret;
}

export class ShopifyAuthError extends Error {
  readonly status = 401;
  constructor(message: string) {
    super(message);
    this.name = "ShopifyAuthError";
  }
}

/** Constant-time compare of two hex/base64 strings of equal expected length. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies the HMAC on an OAuth callback or embedded app request.
 *
 * Shopify signs the query string with the app secret. The `hmac` and
 * `signature` params are excluded from the payload, and the remaining keys are
 * sorted — reconstructing this exactly is what makes the check meaningful.
 */
export function verifyQueryHmac(searchParams: URLSearchParams): boolean {
  const provided = searchParams.get("hmac");
  if (!provided) return false;

  const entries: string[] = [];
  const keys = [...searchParams.keys()].filter(
    (key) => key !== "hmac" && key !== "signature",
  );

  for (const key of [...new Set(keys)].sort()) {
    entries.push(`${key}=${searchParams.getAll(key).join(",")}`);
  }

  const digest = crypto
    .createHmac("sha256", secretOrThrow())
    .update(entries.join("&"))
    .digest("hex");

  return safeEqual(digest, provided);
}

/**
 * Verifies a webhook body signature.
 *
 * Must be given the RAW body. Parsing it first — even JSON.parse then
 * re-stringify — changes the bytes and invalidates the signature.
 */
export function verifyWebhookHmac(rawBody: string, header: string | null): boolean {
  if (!header) return false;

  const digest = crypto
    .createHmac("sha256", secretOrThrow())
    .update(rawBody, "utf8")
    .digest("base64");

  return safeEqual(digest, header);
}

/**
 * Verifies a session token from App Bridge.
 *
 * These are JWTs signed HS256 with the app secret. `jose` is not pulled in for
 * this: the algorithm is fixed and known, so verifying it directly avoids
 * both a dependency and the algorithm-confusion class of bug that comes from
 * trusting the token's own `alg` header.
 */
export interface SessionTokenPayload {
  iss: string;
  dest: string;
  aud: string;
  sub: string;
  exp: number;
  nbf: number;
  iat: number;
}

export function verifySessionToken(token: string): SessionTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new ShopifyAuthError("Malformed session token");

  const [headerB64, payloadB64, signatureB64] = parts;

  const expected = crypto
    .createHmac("sha256", secretOrThrow())
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  if (!safeEqual(expected, signatureB64)) {
    throw new ShopifyAuthError("Invalid session token signature");
  }

  let payload: SessionTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    throw new ShopifyAuthError("Unreadable session token payload");
  }

  const now = Math.floor(Date.now() / 1000);
  // 5s leeway for clock skew between Shopify and this server.
  if (payload.exp && payload.exp < now - 5) {
    throw new ShopifyAuthError("Session token expired");
  }
  if (payload.nbf && payload.nbf > now + 5) {
    throw new ShopifyAuthError("Session token not yet valid");
  }

  const shop = shopFromDest(payload.dest);
  if (!isValidShopDomain(shop)) {
    throw new ShopifyAuthError("Session token names an invalid shop");
  }

  return payload;
}

/** `dest` is `https://shop.myshopify.com`; the API needs just the hostname. */
export function shopFromDest(dest: string): string | null {
  try {
    return new URL(dest).hostname;
  } catch {
    return null;
  }
}

/** Single-use OAuth state, signed so it needs no server-side store. */
export function createOAuthState(shop: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const issued = Date.now().toString();
  const payload = `${shop}:${nonce}:${issued}`;
  const signature = crypto
    .createHmac("sha256", secretOrThrow())
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

/** Rejects a state that is forged, for a different shop, or older than 10 min. */
export function verifyOAuthState(state: string, shop: string): boolean {
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const parts = decoded.split(":");
  if (parts.length !== 4) return false;

  const [stateShop, nonce, issued, signature] = parts;
  if (stateShop !== shop) return false;

  const expected = crypto
    .createHmac("sha256", secretOrThrow())
    .update(`${stateShop}:${nonce}:${issued}`)
    .digest("hex");

  if (!safeEqual(expected, signature)) return false;

  const age = Date.now() - Number(issued);
  return Number.isFinite(age) && age >= 0 && age < 10 * 60 * 1000;
}
