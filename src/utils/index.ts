/**
 * Shared utility functions used across components
 */

import { DATE_CONFIG, VALIDATION_RULES } from "../config/constants";

// ─── String Utilities ──────────────────────────────────────────────────

/**
 * Generate initials from a full name
 * @example getInitials("John Doe") → "JD"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

/**
 * Highlight search terms in text
 * @example highlight("Hello World", "World") → "Hello <mark>World</mark>"
 */
export function highlight(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(`(${escapeRegex(searchTerm)})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Date/Time Utilities ────────────────────────────────────────────

/**
 * Format date string for display
 * @example formatDate("2026-04-30") → "Apr 30, 2026"
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(DATE_CONFIG.LOCALE, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format time to HH:mm format
 */
export function formatTime(time: string): string {
  if (!time.match(/^\d{2}:\d{2}$/)) return time;
  return time;
}

/**
 * Calculate hours between two time strings
 * @example calculateHours("08:00", "17:00") → 9
 */
export function calculateHours(startTime: string, endTime: string): number {
  try {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;

    return Math.round((endTotal - startTotal) / 60 * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * Get day of week number (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(dateString: string): number {
  return new Date(dateString).getDay();
}

/**
 * Check if date is weekend
 */
export function isWeekend(dateString: string): boolean {
  const day = getDayOfWeek(dateString);
  return day === 0 || day === 6;
}

/**
 * Check if date is a Philippine holiday (basic)
 * Note: This is a simplified check. Integrate holiday library for production
 */
export function isPHHoliday(_dateString: string): boolean {
  // Placeholder for future holiday integration
  return false;
}

// ─── Validation Utilities ────────────────────────────────────────────

/**
 * Validate time format
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

/**
 * Validate time range
 */
export function isValidTimeRange(startTime: string, endTime: string): {
  valid: boolean;
  error?: string;
} {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return { valid: false, error: "Invalid time format" };
  }

  if (startTime >= endTime) {
    return { valid: false, error: "End time must be after start time" };
  }

  const hours = calculateHours(startTime, endTime);
  if (hours > VALIDATION_RULES.MAX_HOURS_PER_DAY) {
    return { valid: false, error: `Hours cannot exceed ${VALIDATION_RULES.MAX_HOURS_PER_DAY}` };
  }

  if (hours < VALIDATION_RULES.MIN_HOURS_PER_DAY) {
    return { valid: false, error: `Minimum ${VALIDATION_RULES.MIN_HOURS_PER_DAY} hour required` };
  }

  return { valid: true };
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ─── Number Utilities ────────────────────────────────────────────────

/**
 * Round number to N decimal places
 */
export function roundTo(num: number, decimals: number = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Format number as currency (PH peso by default)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(DATE_CONFIG.LOCALE, {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${roundTo(value, decimals)}%`;
}

// ─── Array Utilities ────────────────────────────────────────────────

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Group array by key
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}

/**
 * Unique array items
 */
export function unique<T>(array: T[], keyFn?: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  return array.filter((item) => {
    const key = keyFn ? keyFn(item) : item;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Error Handling Utilities ───────────────────────────────────────

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number = 300
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
