import { useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogEntry {
    id: string;
    date: string;          // ISO 8601 → "YYYY-MM-DD"
    activity: string;
    hours: number;         // 0–24
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
            if (entry.isHoliday) {
                holidayCount++;
                // Holidays are skipped — they do NOT reduce the 500-hour target,
                // they simply don't contribute hours.
                continue;
            }

            totalRendered += entry.hours;
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