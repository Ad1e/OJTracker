// ─── src/hooks/index.ts — barrel ─────────────────────────────────────────────
export { useEntries }                                    from "./use-entries";
export { useHoursCalc, calcHoursWorked, parseLocalDate } from "./use-hours-calc";
export { useAuth }                                       from "./use-auth";
export { useAdmin, useAdminInternLogs }                  from "./use-admin";
export type { InternSummary, AdminStats, InternStatus, UseAdminReturn, UseAdminInternLogsReturn } from "./use-admin";
export type { AuthState, Profile }                       from "./use-auth";
