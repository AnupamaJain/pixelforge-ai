import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Request proxy — Next 16's replacement for the deprecated `middleware`
 * convention. Refreshes the Supabase session and gates protected routes before
 * a request reaches any page.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, images, the Stripe webhook and the
    // Shopify surface. Those authenticate by HMAC or App Bridge session token
    // rather than by cookie, and Shopify pages render inside an admin iframe
    // where a redirect to /login would break the embed.
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/shopify|shopify|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
