import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let attempted = false;

export function getSupabaseClient(): SupabaseClient | null {
  if (attempted) return client;
  attempted = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  client = createClient(url, anonKey);
  return client;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}
