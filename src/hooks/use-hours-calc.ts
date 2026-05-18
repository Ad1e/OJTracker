// ─── src/hooks/use-hours-calc.ts ─────────────────────────────────────────────
// Renamed from useHoursCalc.ts. Computes all internship statistics from
// a flat array of LogEntry records. Returns a stable, memoised HoursCalcResult.
// Uses decimal.js for precise financial calculations (no floating-point errors).
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import type { LogEntry, HoursCalcResult } from "../types";
import {
  sumDecimal,
  averageDecimal,
  progressPercent,
  roundDecimal,
} from "../utils/decimal-math";

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TARGET = 500;

// ─── Pure helpers (exported for use in components) ────────────────────────────

/**
 * Parse a YYYY-MM-DD string as LOCAL midnight (avoids UTC shift in UTC+8).
 * @example parseLocalDate("2026-04-30") → Date for Apr 30 in local timezone
 */
export function parseLocalDate(dateString: string): Date {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Checks if a YYYY-MM-DD string falls on a weekend (local timezone).
 */
function isWeekend(dateString: string): boolean {
  const [y, m, d] = dateString.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 = Sunday, 6 = Saturday
  return dow === 0 || dow === 6;
}

/**
 * Advance `startDate` by `workdays` working days (Mon–Fri only).
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

/**
 * Compute effective net hours from a 24h time range.
 * Deducts one hour for lunch break (minimum result is 0).
 * Uses Decimal for precise calculation.
 */
export function calcHoursWorked(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  const raw = (eh * 60 + em - (sh * 60 + sm)) / 60;
  const netHours = Math.max(0, raw - 1);
  // Return as number but with proper rounding via Decimal
  return roundDecimal(netHours, 2).toNumber();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Derives all OJT statistics from the current log entry array.
 * Fully memoised — only recomputes when `logs` or `targetHours` changes.
 * Uses Decimal for precise calculations (no floating-point errors).
 */
export function useHoursCalc(
  logs: LogEntry[],
  targetHours: number = DEFAULT_TARGET
): HoursCalcResult {
  return useMemo<HoursCalcResult>(() => {
    const workLogs  = logs.filter((e) => !e.isHoliday && !isWeekend(e.date));
    const holidays  = logs.filter((e) => e.isHoliday);

    // Use Decimal for precise hour calculations
    const totalRenderedDec = sumDecimal(workLogs.map(e => e.hoursWorked));
    const totalRendered = totalRenderedDec.toNumber();
    
    const remainingDec = roundDecimal(
      Math.max(0, targetHours - totalRendered),
      2
    );
    const remaining = remainingDec.toNumber();
    
    const percentComplete = Math.min(
      100,
      progressPercent(totalRendered, targetHours).toNumber()
    );
    
    const avgHoursPerDayDec = workLogs.length > 0
      ? averageDecimal(workLogs.map(e => e.hoursWorked))
      : sumDecimal([0]);
    const avgHoursPerDay = avgHoursPerDayDec.toNumber();

    let estimatedCompletionDate = "";
    if (remaining > 0 && avgHoursPerDay > 0) {
      const workdaysNeeded = Math.ceil(remaining / avgHoursPerDay);
      const today = new Date();
      const estDate = addWorkdays(today, workdaysNeeded);
      estimatedCompletionDate = estDate.toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    return {
      totalRendered,
      remaining,
      percentComplete,
      estimatedCompletionDate,
      avgHoursPerDay,
      workingDaysLogged: workLogs.length,
      holidayCount:      holidays.length,
    };
  }, [logs, targetHours]);
}
