/**
 * Environment configuration loader
 * Centralizes all environment variable access with type safety and validation
 */

interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  api: {
    baseUrl: string;
  };
  app: {
    defaultTargetHours: number;
    locale: string;
    debugMode: boolean;
    enableOfflineMode: boolean;
  };
}

/**
 * Validate that required environment variables are set
 */
function validateEnvironment(): string[] {
  const errors: string[] = [];

  const required = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
  ] as const;

  for (const key of required) {
    if (!import.meta.env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  return errors;
}

/**
 * Load and parse environment configuration
 */
function loadConfig(): EnvironmentConfig {
  const errors = validateEnvironment();

  if (errors.length > 0) {
    console.warn("[Config] Environment validation warnings:", errors);
    if (import.meta.env.VITE_ENABLE_OFFLINE_MODE !== "true") {
      console.warn("[Config] Some features may not work. Set VITE_ENABLE_OFFLINE_MODE=true to use fallback mode.");
    }
  }

  return {
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL || "",
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
    },
    api: {
      baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
    },
    app: {
      defaultTargetHours: parseInt(import.meta.env.VITE_DEFAULT_TARGET_HOURS || "500", 10),
      locale: import.meta.env.VITE_LOCALE || "en-PH",
      debugMode: import.meta.env.VITE_DEBUG_MODE === "true",
      enableOfflineMode: import.meta.env.VITE_ENABLE_OFFLINE_MODE === "true",
    },
  };
}

// Validate and load config once on app startup
const config = loadConfig();

/**
 * Get application configuration
 */
export function getConfig(): Readonly<EnvironmentConfig> {
  return Object.freeze(config);
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(config.supabase.url && config.supabase.anonKey);
}

/**
 * Check if offline mode is enabled
 */
export function isOfflineMode(): boolean {
  return config.app.enableOfflineMode;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return config.app.debugMode;
}

// Log config status in development
if (import.meta.env.DEV) {
  console.log(
    "[Config] Supabase configured:",
    isSupabaseConfigured() ? "✓" : "✗ (using offline mode)"
  );
  console.log("[Config] Offline mode:", isOfflineMode() ? "enabled" : "disabled");
  console.log("[Config] Debug mode:", isDebugMode() ? "enabled" : "disabled");
}

export default config;
