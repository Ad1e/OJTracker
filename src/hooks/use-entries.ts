// ─── src/hooks/use-entries.ts ────────────────────────────────────────────────
// Renamed from useEntries.ts. Data access layer for log entries.
// Automatically switches between Supabase and the local Express server.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { devError } from "../lib/logger";
import type { LogEntry, LogEntryRow, UseEntriesReturn } from "../types";

// ─── Local API base ───────────────────────────────────────────────────────────
// Vite proxies /api/* → http://localhost:3001 in dev (vite.config.ts).
const LOCAL_API = "/api";

// ─── Row mapper ───────────────────────────────────────────────────────────────
// Maps a Supabase snake_case row to a camelCase LogEntry.

function toLogEntry(row: LogEntryRow): LogEntry {
  return {
    id:           row.id,
    day:          row.day,
    date:         row.date,
    startTime:    row.start_time  ?? "08:00",
    endTime:      row.end_time    ?? "17:00",
    hoursWorked:  Number(row.hours_worked),
    activity:     row.activity,
    isHoliday:    Boolean(row.is_holiday),
    createdAt:    row.created_at  ?? undefined,
  };
}

// ─── Local server health check ────────────────────────────────────────────────

async function isServerAlive(): Promise<boolean> {
  try {
    const res = await fetch("/health", { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Local server fetch ───────────────────────────────────────────────────────

async function fetchLocalEntries(): Promise<LogEntry[]> {
  const res = await fetch(`${LOCAL_API}/entries`);
  if (!res.ok) throw new Error(`GET /api/entries failed: ${res.status}`);
  const json = await res.json() as { success: boolean; data: LogEntry[]; error?: { message: string } };
  if (!json.success) throw new Error(json.error?.message ?? "Unknown error");
  return json.data.sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEntries(): UseEntriesReturn {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading]  = useState(true);
  const [error,   setError]    = useState<string | null>(null);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    if (!supabase) {
      // ── Local Express path ─────────────────────────────────────────────────
      (async () => {
        const alive = await isServerAlive();
        if (!mounted) return;

        if (!alive) {
          setError("Local server is not running. Start it with: npm run server");
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

    // ── Supabase path ──────────────────────────────────────────────────────
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

  // ── Add ────────────────────────────────────────────────────────────────────
  const addEntry = useCallback(
    async (entry: Omit<LogEntry, "id" | "createdAt">): Promise<LogEntry | null> => {
      if (!supabase) {
        try {
          const res = await fetch(`${LOCAL_API}/entries`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              day:         entry.day,
              date:        entry.date,
              startTime:   entry.startTime,
              endTime:     entry.endTime,
              hoursWorked: entry.hoursWorked,
              activity:    entry.activity,
              isHoliday:   entry.isHoliday,
            }),
          });
          const json = await res.json() as { success: boolean; data: LogEntry; error?: { message: string } };
          if (!res.ok || !json.success) {
            devError("addEntry failed", json.error);
            return null;
          }
          setEntries((prev) => [json.data, ...prev]);
          return json.data;
        } catch (err) {
          devError("addEntry network error", err);
          return null;
        }
      }

      const { data, error: err } = await supabase
        .from("log_entries")
        .insert({
          day:          entry.day,
          date:         entry.date,
          start_time:   entry.startTime,
          end_time:     entry.endTime,
          hours_worked: entry.hoursWorked,
          activity:     entry.activity,
          is_holiday:   entry.isHoliday,
        })
        .select()
        .single();

      if (err || !data) {
        devError("addEntry (supabase) failed", err?.message);
        return null;
      }
      const newEntry = toLogEntry(data as LogEntryRow);
      setEntries((prev) => [newEntry, ...prev]);
      return newEntry;
    },
    []
  );

  // ── Update ─────────────────────────────────────────────────────────────────
  const updateEntry = useCallback(
    async (id: string, patch: Partial<Omit<LogEntry, "id" | "createdAt">>): Promise<LogEntry | null> => {
      if (!supabase) {
        try {
          const res = await fetch(`${LOCAL_API}/entries/${id}`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(patch.date        !== undefined && { date:        patch.date }),
              ...(patch.startTime   !== undefined && { startTime:   patch.startTime }),
              ...(patch.endTime     !== undefined && { endTime:     patch.endTime }),
              ...(patch.hoursWorked !== undefined && { hoursWorked: patch.hoursWorked }),
              ...(patch.activity    !== undefined && { activity:    patch.activity }),
              ...(patch.isHoliday   !== undefined && { isHoliday:   patch.isHoliday }),
            }),
          });
          const json = await res.json() as { success: boolean; data: LogEntry; error?: { message: string } };
          if (!res.ok || !json.success) {
            devError("updateEntry failed", json.error);
            return null;
          }
          setEntries((prev) => prev.map((e) => (e.id === id ? json.data : e)));
          return json.data;
        } catch (err) {
          devError("updateEntry network error", err);
          return null;
        }
      }

      const { data, error: err } = await supabase
        .from("log_entries")
        .update({
          ...(patch.date        !== undefined && { date:         patch.date }),
          ...(patch.startTime   !== undefined && { start_time:   patch.startTime }),
          ...(patch.endTime     !== undefined && { end_time:     patch.endTime }),
          ...(patch.hoursWorked !== undefined && { hours_worked: patch.hoursWorked }),
          ...(patch.activity    !== undefined && { activity:     patch.activity }),
          ...(patch.isHoliday   !== undefined && { is_holiday:   patch.isHoliday }),
        })
        .eq("id", id)
        .select()
        .single();

      if (err || !data) {
        devError("updateEntry (supabase) failed", err?.message);
        return null;
      }
      const updated = toLogEntry(data as LogEntryRow);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    },
    []
  );

  // ── Delete (optimistic with rollback) ──────────────────────────────────────
  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      const snapshot = entries.find((e) => e.id === id);
      setEntries((prev) => prev.filter((e) => e.id !== id));

      if (!supabase) {
        try {
          const res  = await fetch(`${LOCAL_API}/entries/${id}`, { method: "DELETE" });
          const json = await res.json() as { success: boolean; error?: { message: string } };
          if (!res.ok || !json.success) {
            devError("deleteEntry failed", json.error);
            if (snapshot) setEntries((prev) => [...prev, snapshot].sort((a, b) => b.date.localeCompare(a.date)));
            return false;
          }
          return true;
        } catch (err) {
          devError("deleteEntry network error", err);
          if (snapshot) setEntries((prev) => [...prev, snapshot].sort((a, b) => b.date.localeCompare(a.date)));
          return false;
        }
      }

      const { error: err } = await supabase.from("log_entries").delete().eq("id", id);
      if (err) {
        devError("deleteEntry (supabase) failed", err.message);
        if (snapshot) setEntries((prev) => [...prev, snapshot].sort((a, b) => b.date.localeCompare(a.date)));
        return false;
      }
      return true;
    },
    [entries]
  );

  return { entries, loading, error, addEntry, updateEntry, deleteEntry };
}
