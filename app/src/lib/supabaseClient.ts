import { createClient } from "@supabase/supabase-js";

export const PLACEHOLDER_SUPABASE_URL = "http://127.0.0.1:54321";
export const PLACEHOLDER_SUPABASE_KEY = "resol-placeholder-anon-key";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? PLACEHOLDER_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_SUPABASE_KEY;

export const isPlaceholderSupabase =
  url === PLACEHOLDER_SUPABASE_URL || key === PLACEHOLDER_SUPABASE_KEY;

// Single browser client; the wallet session (signInWithWeb3) is persisted here.
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
