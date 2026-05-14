// ─── src/hooks/use-entries.ts ────────────────────────────────────────────────
// Data access layer for log_entries.
//
// Data isolation:
//   Every Supabase query is scoped with .eq("user_id", userId) so interns
//   can only read/write their own rows. RLS policies are the server-side
//   enforcement; this is the client-side guard.
//
// userId resolution:
//   1. If `overrideUserId` is supplied (admin viewing an intern) → use that
//   2. Otherwise → use the logged-in user's id from AuthContext
//
// Local fallback:
//   When supabase is null (no .env), proxies to the local Express server.
//   No user isolation in local mode (dev only).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { supabase }                         from "../lib/supabase";
import { useAuthContext }                   from "../context/auth-context";
import { devError }                         from "../lib/logger";
import type { LogEntry, LogEntryRow, UseEntriesReturn } from "../types";

// ─── Local API base ───────────────────────────────────────────────────────────

const LOCAL_API = "/api";

// ─── Row mapper ───────────────────────────────────────────────────────────────

function toLogEntry(row: LogEntryRow): LogEntry {
  return {
    id:          row.id,
    day:         row.day,
    date:        row.date,
    startTime:   row.start_time  ?? "08:00",
    endTime:     row.end_time    ?? "17:00",
    hoursWorked: Number(row.hours_worked),
    activity:    row.activity,
    isHoliday:   Boolean(row.is_holiday),
    createdAt:   row.created_at  ?? undefined,
  };
}

// ─── Local server helpers ─────────────────────────────────────────────────────

async function isServerAlive(): Promise<boolean> {
  try {
    const res = await fetch("/health", { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchLocalEntries(): Promise<LogEntry[]> {
  const res = await fetch(`${LOCAL_API}/entries`);
  if (!res.ok) throw new Error(`GET /api/entries failed: ${res.status}`);
  const json = await res.json() as { success: boolean; data: LogEntry[]; error?: { message: string } };
  if (!json.success) throw new Error(json.error?.message ?? "Unknown error");
  return json.data.sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param overrideUserId - Optional. When supplied, scopes all queries to this
 *   user_id instead of the logged-in user. Used by admin to view an intern's
 *   specific log history. Omit for all self-scoped intern operations.
 */
export function useEntries(overrideUserId?: string | null): UseEntriesReturn {
  const { user }   = useAuthContext();
  // Resolve the effective user_id for all queries
  const userId     = overrideUserId !== undefined ? overrideUserId : (user?.id ?? null);

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── SELECT ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    if (!supabase) {
      // ── Local Express path (dev only, no isolation) ──────────────────────
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

    // ── Supabase path ─────────────────────────────────────────────────────
    // Always filter by user_id — isolates intern data server-side.
    // RLS policies are the authoritative enforcement layer.
    let query = supabase
      .from("log_entries")
      .select("*")
      .order("date", { ascending: false });

    if (userId) query = query.eq("user_id", userId);

    query.then(({ data, error: err }) => {
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
  }, [userId]);

  // ── INSERT ──────────────────────────────────────────────────────────────────
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
          if (!res.ok || !json.success) { devError("addEntry failed", json.error); return null; }
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
          user_id:      userId,   // ← stamp owner; RLS enforces this server-side
        })
        .select()
        .single();

      if (err || !data) { devError("addEntry (supabase) failed", err?.message); return null; }
      const newEntry = toLogEntry(data as LogEntryRow);
      setEntries((prev) => [newEntry, ...prev]);
      return newEntry;
    },
    [userId],
  );

  // ── UPDATE ──────────────────────────────────────────────────────────────────
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
          if (!res.ok || !json.success) { devError("updateEntry failed", json.error); return null; }
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
        .eq("user_id", userId)  // ← double-check ownership; prevents cross-user edits
        .select()
        .single();

      if (err || !data) { devError("updateEntry (supabase) failed", err?.message); return null; }
      const updated = toLogEntry(data as LogEntryRow);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    },
    [userId],
  );

  // ── DELETE (optimistic with rollback) ───────────────────────────────────────
  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      const snapshot = entries.find((e) => e.id === id);
      setEntries((prev) => prev.filter((e) => e.id !== id)); // optimistic

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

      const { error: err } = await supabase
        .from("log_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", userId); // ← double-check ownership; prevents cross-user deletes

      if (err) {
        devError("deleteEntry (supabase) failed", err.message);
        if (snapshot) setEntries((prev) => [...prev, snapshot].sort((a, b) => b.date.localeCompare(a.date)));
        return false;
      }
      return true;
    },
    [entries, userId],
  );

  return { entries, loading, error, addEntry, updateEntry, deleteEntry };
}
