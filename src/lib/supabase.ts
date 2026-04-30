import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Export null if env vars are missing so the app doesn't crash on boot.
// This allows useEntries.ts to fallback to mock data when not configured.
export const supabase = url && key ? createClient(url, key) : null;
