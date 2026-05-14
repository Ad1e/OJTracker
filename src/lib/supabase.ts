// ─── src/lib/supabase.ts ─────────────────────────────────────────────────────
// Supabase client singleton.
// Reads ONLY from src/config/environment.ts — never import.meta.env directly.
// Exports null when Supabase is not configured so the Express fallback works.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "../config/environment";

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(env.supabaseUrl, env.supabaseAnonKey)
  : null;
