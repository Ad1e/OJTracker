import { useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogEntry {
    id: string;            // We'll generate/map this in App.tsx
    day: number;
    date: string;          // ISO 8601 → "YYYY-MM-DD"
    startTime: string;
    endTime: string;
    hoursWorked: number;   // 0–24
    activity: string;
    isHoliday: boolean;
}

export interface HoursCalcResult {
    /** Sum of hours for all non-holiday entries */
    totalRendered: number;
    /** Hours still needed to hit the target */
    remaining: number;
    /** 0–100, clamped */
    percentComplete: number;
    /** Number of distinct working days logged */
    workingDaysLogged: number;
    /** Number of holiday entries */
    holidayCount: number;
    /**
     * Estimated completion date string (locale-formatted).
     * Returns null if the target is already met.
     */
    estimatedCompletionDate: string | null;
    /** Average hours per logged working day */
    avgHoursPerDay: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUIRED_HOURS = 500 as const;
const HOURS_PER_WORKDAY = 8 as const;
const MS_PER_DAY = 1_000 * 60 * 60 * 24;

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Checks if a date string (YYYY-MM-DD format) falls on a weekend.
 */
function isWeekend(dateString: string): boolean {
    const date = new Date(dateString);
    const dow = date.getDay(); // 0 = Sunday, 6 = Saturday
    return dow === 0 || dow === 6;
}

/**
 * Utility: safely parse a local "YYYY-MM-DD" string into a Date object
 * preventing timezone shifts.
 */
export function parseLocalDate(dateString: string): Date {
    const [y, m, d] = dateString.split("-").map(Number);
    return new Date(y, m - 1, d);
}

/**
 * Utility: Calculate hours worked, assuming a 1-hour break if duration >= 5 hours.
 */
export function calcHoursWorked(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const start = startH + startM / 60;
    const end = endH + endM / 60;

    let diff = end - start;
    if (diff <= 0) return 0;
    
    // Auto-deduct 1 hour break for 5+ hours shift, but cap minimum at 4 hours if so
    if (diff >= 5) diff -= 1;
    
    return parseFloat(diff.toFixed(1));
}

/**
 * Returns a locale date string offset by `days` calendar days from today.
 * Skips weekends to give a more realistic estimate.
 */
function addWorkdays(startDate: Date, workdays: number): Date {
    const result = new Date(startDate.getTime());
    let added = 0;

    while (added < workdays) {
        result.setTime(result.getTime() + MS_PER_DAY);
        const dow = result.getDay(); // 0 = Sunday, 6 = Saturday
        if (dow !== 0 && dow !== 6) {
            added++;
        }
    }

    return result;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * `useHoursCalc`
 *
 * Accepts an array of `LogEntry` items and derives all statistics needed
 * by the dashboard in a single, memoised pass.
 *
 * @param logs   - Journal entries from `journalData.json`
 * @param target - Total hours required (default: 500)
 */
export function useHoursCalc(
    logs: LogEntry[],
    target: number = REQUIRED_HOURS
): HoursCalcResult {
    return useMemo<HoursCalcResult>(() => {
        // ── Single pass over the log array ──────────────────────────────────────
        let totalRendered = 0;
        let workingDaysLogged = 0;
        let holidayCount = 0;

        for (const entry of logs) {
            if (entry.isHoliday || isWeekend(entry.date)) {
                if (entry.isHoliday) {
                    holidayCount++;
                }
                // Holidays and weekends are skipped — they do NOT reduce the 500-hour target,
                // they simply don't contribute hours.
                continue;
            }

            totalRendered += entry.hoursWorked;
            workingDaysLogged++;
        }

        // ── Derived values ───────────────────────────────────────────────────────
        const remaining = Math.max(0, target - totalRendered);

        const percentComplete = Math.min(
            100,
            parseFloat(((totalRendered / target) * 100).toFixed(2))
        );

        const avgHoursPerDay =
            workingDaysLogged > 0
                ? parseFloat((totalRendered / workingDaysLogged).toFixed(2))
                : 0;

        // ── Estimated completion date ────────────────────────────────────────────
        let estimatedCompletionDate: string | null = null;

        if (remaining > 0) {
            // Use the actual average if we have data; fall back to a standard workday
            const effectiveHoursPerDay =
                avgHoursPerDay > 0 ? avgHoursPerDay : HOURS_PER_WORKDAY;

            const workdaysNeeded = Math.ceil(remaining / effectiveHoursPerDay);
            const completionDate = addWorkdays(new Date(), workdaysNeeded);

            estimatedCompletionDate = completionDate.toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        }

        return {
            totalRendered,
            remaining,
            percentComplete,
            workingDaysLogged,
            holidayCount,
            estimatedCompletionDate,
            avgHoursPerDay,
        };
    }, [logs, target]);
}
