import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.ts";
import type { LogEntry } from "./useHoursCalc";
import fallbackData from "../data/journalData.json";

// ─── Row mapper ───────────────────────────────────────────────────────────────
// DB columns are snake_case; LogEntry fields are camelCase.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLogEntry(row: Record<string, any>): LogEntry {
  return {
    id: row.id as string,
    day: row.day as number,
    date: row.date as string,
    startTime: (row.start_time as string) ?? "08:00",
    endTime: (row.end_time as string) ?? "17:00",
    hoursWorked: Number(row.hours_worked),
    activity: row.activity as string,
    isHoliday: Boolean(row.is_holiday),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseEntriesReturn {
  entries: LogEntry[];
  loading: boolean;
  error: string | null;
  addEntry: (entry: Omit<LogEntry, "id" | "createdAt">) => Promise<LogEntry | null>;
  updateEntry: (id: string, patch: Partial<Omit<LogEntry, "id" | "createdAt">>) => Promise<LogEntry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
}

export function useEntries(): UseEntriesReturn {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    if (!supabase) {
      console.warn("[useEntries] Supabase not configured. Using fallback data.");
      const mockEntries = fallbackData.entries.map((e, index) => ({
        id: `mock-${index + 1}`,
        day: e.day,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        hoursWorked: e.hoursWorked,
        activity: e.activity,
        isHoliday: e.isHoliday,
        createdAt: new Date().toISOString(),
      }));

      setTimeout(() => {
        if (!mounted) return;
        setEntries(mockEntries.sort((a, b) => b.date.localeCompare(a.date)));
        setError(null);
        setLoading(false);
      }, 500);
      return () => { mounted = false; };
    }

    supabase
      .from("log_entries")
      .select("*")
      .order("date", { ascending: false })
      .then(({ data, error: err }) => {
        if (!mounted) return;
        if (err) {
          setError(err.message);
        } else {
          setEntries((data ?? []).map(toLogEntry));
          setError(null);
        }
        setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  // ── Add ─────────────────────────────────────────────────────────────────
  const addEntry = useCallback(
    async (entry: Omit<LogEntry, "id" | "createdAt">): Promise<LogEntry | null> => {
      if (!supabase) {
        const newEntry = { ...entry, id: `mock-${crypto.randomUUID()}`, createdAt: new Date().toISOString() } as LogEntry;
        setEntries((prev) => [newEntry, ...prev]);
        return newEntry;
      }

      const { data, error: err } = await supabase
        .from("log_entries")
        .insert({
          day: entry.day,
          date: entry.date,
          start_time: entry.startTime,
          end_time: entry.endTime,
          hours_worked: entry.hoursWorked,
          activity: entry.activity,
          is_holiday: entry.isHoliday,
        })
        .select()
        .single();

      if (err || !data) {
        console.error("[useEntries] addEntry failed:", err?.message);
        return null;
      }

      const newEntry = toLogEntry(data);
      // Prepend so it appears at the top (table sorts by date desc)
      setEntries((prev) => [newEntry, ...prev]);
      return newEntry;
    },
    []
  );

  // ── Update ───────────────────────────────────────────────────────────────
  const updateEntry = useCallback(
    async (
      id: string,
      patch: Partial<Omit<LogEntry, "id" | "createdAt">>
    ): Promise<LogEntry | null> => {
      if (!supabase) {
        let updated: LogEntry | null = null;
        setEntries((prev) => prev.map((e) => {
          if (e.id === id) {
            updated = { ...e, ...patch } as LogEntry;
            return updated;
          }
          return e;
        }));
        return updated;
      }

      const { data, error: err } = await supabase
        .from("log_entries")
        .update({
          ...(patch.date !== undefined && { date: patch.date }),
          ...(patch.startTime !== undefined && { start_time: patch.startTime }),
          ...(patch.endTime !== undefined && { end_time: patch.endTime }),
          ...(patch.hoursWorked !== undefined && { hours_worked: patch.hoursWorked }),
          ...(patch.activity !== undefined && { activity: patch.activity }),
          ...(patch.isHoliday !== undefined && { is_holiday: patch.isHoliday }),
        })
        .eq("id", id)
        .select()
        .single();

      if (err || !data) {
        console.error("[useEntries] updateEntry failed:", err?.message);
        return null;
      }

      const updated = toLogEntry(data);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    },
    []
  );

  // ── Delete (optimistic with rollback) ────────────────────────────────────
  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      // Snapshot for rollback
      const snapshot = entries.find((e) => e.id === id);

      // Optimistic removal
      setEntries((prev) => prev.filter((e) => e.id !== id));

      if (!supabase) {
        return true;
      }

      const { error: err } = await supabase
        .from("log_entries")
        .delete()
        .eq("id", id);

      if (err) {
        console.error("[useEntries] deleteEntry failed:", err.message);
        // Rollback: re-insert the snapshotted entry in place
        if (snapshot) {
          setEntries((prev) =>
            [...prev, snapshot].sort((a, b) => b.date.localeCompare(a.date))
          );
        }
        return false;
      }

      return true;
    },
    [entries]
  );

  return { entries, loading, error, addEntry, updateEntry, deleteEntry };
}