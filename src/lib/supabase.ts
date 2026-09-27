"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: SupabaseClient<any> | null = null;

/** Singleton browser client. The whole app is client-rendered, so a plain
 * localStorage-persisted session (the supabase-js default) is enough — no
 * cookie/middleware plumbing needed. */
export function getSupabase() {
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
