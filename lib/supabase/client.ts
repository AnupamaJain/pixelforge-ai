"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Uses the anon key only — every privileged operation
 * goes through an API route backed by the service role.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
