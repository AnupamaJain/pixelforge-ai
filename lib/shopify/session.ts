import "server-only";

import type { NextRequest } from "next/server";
import { isValidShopDomain } from "@/config/shopify";
import { ShopifyAuthError, shopFromDest, verifySessionToken } from "./auth";
import { getInstall, type ShopifyInstall } from "./client";

/**
 * Resolves the shop making an embedded-app request.
 *
 * The shop is taken from the *verified* session token, never from a query
 * parameter — otherwise any merchant could read another shop's catalogue by
 * changing `?shop=`.
 */
export async function requireShopifySession(
  request: NextRequest,
): Promise<ShopifyInstall> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw new ShopifyAuthError("Missing session token");

  const payload = verifySessionToken(token);
  const shop = shopFromDest(payload.dest);

  if (!isValidShopDomain(shop)) {
    throw new ShopifyAuthError("Session token names an invalid shop");
  }

  const install = await getInstall(shop);
  if (!install) throw new ShopifyAuthError("This shop has not installed the app");

  return install;
}
