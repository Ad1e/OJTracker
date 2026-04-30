/**
 * Application-wide constants
 * Single source of truth for magic values
 */

// ─── Hours Calculation ──────────────────────────────────────────────────

export const HOURS_CONFIG = {
  DEFAULT_TARGET_HOURS: 500, // Default total hours required
  STANDARD_HOURS_PER_DAY: 8, // Standard working hours per day
  BREAK_HOUR: 1, // Break deduction per day
  EFFECTIVE_HOURS_PER_DAY: 8 - 1, // 7 hours effective work per day
} as const;

// ─── UI Configuration ──────────────────────────────────────────────────

export const UI_CONFIG = {
  // Toast timings (milliseconds)
  TOAST_DURATION_SUCCESS: 3000,
  TOAST_DURATION_ERROR: 5000, // Errors stay longer
  TOAST_DURATION_EDIT: 3000,

  // Modal
  MODAL_ANIMATION_DURATION: 200,

  // Pagination / Table
  ITEMS_PER_PAGE: 10,
  MAX_SEARCH_RESULTS: 50,
} as const;

// ─── Date/Time Configuration ─────────────────────────────────────────

export const DATE_CONFIG = {
  LOCALE: "en-PH",
  TIME_FORMAT: "HH:mm",
  DATE_FORMAT: "yyyy-MM-dd",
  DISPLAY_DATE_FORMAT: "MMM dd, yyyy",
} as const;

// ─── Validation Rules ──────────────────────────────────────────────────

export const VALIDATION_RULES = {
  MIN_START_HOUR: 5, // Earliest start time (5 AM)
  MAX_START_HOUR: 16, // Latest start time (4 PM)
  MAX_HOURS_PER_DAY: 12, // Sanity check
  MIN_HOURS_PER_DAY: 1,
  MIN_PROFILE_NAME_LENGTH: 2,
  MAX_PROFILE_NAME_LENGTH: 100,
  MIN_ACTIVITY_LENGTH: 3,
  MAX_ACTIVITY_LENGTH: 500,
  MIN_REQUIRED_HOURS: 100,
  MAX_REQUIRED_HOURS: 2000,
} as const;

// ─── Server Configuration ──────────────────────────────────────────────

export const SERVER_CONFIG = {
  PORT: 3001,
  API_BASE_URL: "http://localhost:3001",
  ENDPOINTS: {
    ENTRIES: "/api/entries",
    ENTRIES_BY_ID: (id: string) => `/api/entries/${id}`,
    HEALTH: "/health",
  },
} as const;

// ─── Feature Flags ────────────────────────────────────────────────────

export const FEATURE_FLAGS = {
  ENABLE_CHART_ANALYTICS: true,
  ENABLE_PROFILE_PICTURE: false, // Reserved for future
  ENABLE_EXPORT_TO_PDF: false, // Reserved for future
  ENABLE_DARK_MODE: false, // Reserved for future
  ENABLE_OFFLINE_MODE: false, // Reserved for future
  DEBUG_MODE: false,
} as const;

// ─── CSS/Tailwind Configuration ─────────────────────────────────────

export const THEME_COLORS = {
  primary: "indigo",
  secondary: "slate",
  success: "emerald",
  warning: "amber",
  error: "red",
  info: "sky",
} as const;

export const INPUT_CLASSES = {
  base: "rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition",
  error: "border-red-500 focus:border-red-500 focus:ring-red-200",
  disabled: "bg-slate-100 text-slate-500 cursor-not-allowed",
} as const;

export const BUTTON_CLASSES = {
  base: "px-4 py-2 rounded font-medium transition",
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
  secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300",
  danger: "bg-red-600 text-white hover:bg-red-700",
  small: "px-2 py-1 text-sm",
  large: "px-6 py-3 text-base",
} as const;

// ─── Error Messages ────────────────────────────────────────────────

export const ERROR_MESSAGES = {
  VALIDATION_REQUIRED_FIELD: "This field is required",
  VALIDATION_INVALID_TIME: "Please enter a valid time",
  VALIDATION_INVALID_DATE: "Please enter a valid date",
  VALIDATION_END_BEFORE_START: "End time must be after start time",
  VALIDATION_HOURS_TOO_HIGH: "Hours per day cannot exceed 12",
  NETWORK_ERROR: "Network error. Please check your connection.",
  NETWORK_TIMEOUT: "Request timed out. Please try again.",
  SUPABASE_ERROR: "Database error. Please try again later.",
  AUTH_ERROR: "Authentication failed. Please log in again.",
  NOT_FOUND: "The requested entry was not found.",
  GENERIC_ERROR: "An unexpected error occurred. Please try again.",
  INSUFFICIENT_DATA: "Not enough data to calculate statistics.",
} as const;

// ─── Success Messages ────────────────────────────────────────────────

export const SUCCESS_MESSAGES = {
  ENTRY_ADDED: "Time entry added successfully",
  ENTRY_UPDATED: "Time entry updated successfully",
  ENTRY_DELETED: "Time entry deleted successfully",
  PROFILE_SAVED: "Profile saved successfully",
  PROFILE_LOADED: "Profile loaded successfully",
} as const;
