// ─── src/config/environment.ts ───────────────────────────────────────────────
// ONLY file allowed to read import.meta.env.
// Uses Zod for validated, typed access. Gracefully handles missing Supabase
// vars so the Express fallback path in use-entries.ts continues to work.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";

const schema = z.object({
  VITE_SUPABASE_URL:      z.string().url().optional().or(z.literal("")),
  VITE_SUPABASE_ANON_KEY: z.string().optional().or(z.literal("")),
  VITE_API_BASE_URL:      z.string().default("http://localhost:3001"),
  VITE_DEFAULT_TARGET_HOURS: z.coerce.number().min(100).max(2000).default(500),
  VITE_LOCALE:            z.string().default("en-PH"),
  VITE_DEBUG_MODE:        z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  VITE_ENABLE_OFFLINE_MODE: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  // Throw at module load time so the app fails fast with a clear message
  const issues = parsed.error.flatten().fieldErrors;
  throw new Error(
    `[environment] Invalid configuration:\n${JSON.stringify(issues, null, 2)}`
  );
}

const _env = parsed.data;

/** Typed, validated environment values — do NOT use import.meta.env elsewhere. */
export const env = {
  supabaseUrl:      _env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey:  _env.VITE_SUPABASE_ANON_KEY ?? "",
  apiBaseUrl:       _env.VITE_API_BASE_URL,
  defaultTargetHours: _env.VITE_DEFAULT_TARGET_HOURS,
  locale:           _env.VITE_LOCALE,
  isDev:            import.meta.env.DEV as boolean,
  isDebug:          _env.VITE_DEBUG_MODE,
  isOfflineMode:    _env.VITE_ENABLE_OFFLINE_MODE,
} as const;

export function isSupabaseConfigured(): boolean {
  return !!(env.supabaseUrl && env.supabaseAnonKey);
}
