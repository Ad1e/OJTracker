import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.ts";
import type { LogEntry } from "./useHoursCalc";

// ─── Local API base URL ───────────────────────────────────────────────────────
// When Supabase is not configured the app falls back to the local Express
// server (server/index.ts). Vite proxies /api/* → http://localhost:3001 in dev.
const LOCAL_API = "/api";

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

// ─── Local API helpers ────────────────────────────────────────────────────────

/** Check whether the local Express server is reachable. */
async function isServerAlive(): Promise<boolean> {
  try {
    const res = await fetch("/health", { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Fetch all entries from the local Express server. */
async function fetchLocalEntries(): Promise<LogEntry[]> {
  const res = await fetch(`${LOCAL_API}/entries`);
  if (!res.ok) throw new Error(`GET /api/entries failed: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Unknown error");
  return (json.data as LogEntry[]).sort((a, b) => b.date.localeCompare(a.date));
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
      // ── Local Express backend path ──────────────────────────────────────
      (async () => {
        const alive = await isServerAlive();
        if (!mounted) return;

        if (!alive) {
          setError(
            "Local server is not running. Start it with: npm run server"
          );
          setLoading(false);
          return;
        }

        try {
          const data = await fetchLocalEntries();
          if (!mounted) return;
          setEntries(data);
          setError(null);
        } catch (err) {
          if (!mounted) return;
          setError((err as Error).message);
        } finally {
          if (mounted) setLoading(false);
        }
      })();

      return () => { mounted = false; };
    }

    // ── Supabase path ─────────────────────────────────────────────────────
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
        // ── Local backend ────────────────────────────────────────────────
        try {
          const res = await fetch(`${LOCAL_API}/entries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              day: entry.day,
              date: entry.date,
              startTime: entry.startTime,
              endTime: entry.endTime,
              hoursWorked: entry.hoursWorked,
              activity: entry.activity,
              isHoliday: entry.isHoliday,
            }),
          });

          const json = await res.json();
          if (!res.ok || !json.success) {
            console.error("[useEntries] addEntry failed:", json.error);
            return null;
          }

          const newEntry = json.data as LogEntry;
          setEntries((prev) => [newEntry, ...prev]);
          return newEntry;
        } catch (err) {
          console.error("[useEntries] addEntry network error:", err);
          return null;
        }
      }

      // ── Supabase ────────────────────────────────────────────────────────
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
        // ── Local backend ────────────────────────────────────────────────
        try {
          const res = await fetch(`${LOCAL_API}/entries/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(patch.date !== undefined && { date: patch.date }),
              ...(patch.startTime !== undefined && { startTime: patch.startTime }),
              ...(patch.endTime !== undefined && { endTime: patch.endTime }),
              ...(patch.hoursWorked !== undefined && { hoursWorked: patch.hoursWorked }),
              ...(patch.activity !== undefined && { activity: patch.activity }),
              ...(patch.isHoliday !== undefined && { isHoliday: patch.isHoliday }),
            }),
          });

          const json = await res.json();
          if (!res.ok || !json.success) {
            console.error("[useEntries] updateEntry failed:", json.error);
            return null;
          }

          const updated = json.data as LogEntry;
          setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
          return updated;
        } catch (err) {
          console.error("[useEntries] updateEntry network error:", err);
          return null;
        }
      }

      // ── Supabase ────────────────────────────────────────────────────────
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
        // ── Local backend ────────────────────────────────────────────────
        try {
          const res = await fetch(`${LOCAL_API}/entries/${id}`, { method: "DELETE" });
          const json = await res.json();

          if (!res.ok || !json.success) {
            console.error("[useEntries] deleteEntry failed:", json.error);
            if (snapshot) {
              setEntries((prev) =>
                [...prev, snapshot].sort((a, b) => b.date.localeCompare(a.date))
              );
            }
            return false;
          }
          return true;
        } catch (err) {
          console.error("[useEntries] deleteEntry network error:", err);
          if (snapshot) {
            setEntries((prev) =>
              [...prev, snapshot].sort((a, b) => b.date.localeCompare(a.date))
            );
          }
          return false;
        }
      }

      // ── Supabase ────────────────────────────────────────────────────────
      const { error: err } = await supabase
        .from("log_entries")
        .delete()
        .eq("id", id);

      if (err) {
        console.error("[useEntries] deleteEntry failed:", err.message);
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