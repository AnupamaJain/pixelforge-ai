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
    // Everything except static assets, images and the Stripe webhook
    // (which authenticates by signature, not by a session cookie).
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
