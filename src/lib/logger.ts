// ─── src/lib/logger.ts ───────────────────────────────────────────────────────
// Centralised logging utility. All files must import from here instead of
// calling console.error/console.log directly.
// ─────────────────────────────────────────────────────────────────────────────
import { env } from "../config/environment";

/**
 * Logs an error message and optional payload, but only in development mode.
 * In production, errors should be sent to a monitoring service (e.g. Sentry).
 *
 * @param context - A short label identifying the caller (e.g. "use-entries/addEntry")
 * @param payload - Any additional data to log (optional)
 */
export function devError(context: string, payload?: unknown): void {
  if (env.isDev || env.isDebug) {
    // eslint-disable-next-line no-console
    console.error(`[OJTracker] ${context}`, payload ?? "");
  }
}

/**
 * Logs an info message — only in debug mode.
 */
export function devInfo(context: string, payload?: unknown): void {
  if (env.isDebug) {
    // eslint-disable-next-line no-console
    console.info(`[OJTracker] ${context}`, payload ?? "");
  }
}
