// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/hooks/use-admin.ts
// REASON: New — admin data layer: all interns with stats + per-intern log CRUD
//
// Key rule: addEntryForIntern stamps user_id = internUserId (NOT auth.uid()).
// This correctly attributes hours to the intern, not the admin.
//
// Schema:
//   interns.user_id    → auth.users.id (uuid)
//   log_entries.user_id → auth.users.id (uuid)
//   interns.company_id → companies.id
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { devError } from "../lib/logger";
import type { LogEntry, LogEntryRow } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InternStatus = "on-track" | "at-risk" | "behind" | "completed";

export interface InternSummary {
  id: string;    // interns.id (DB PK)
  userId: string;    // interns.user_id = auth.users.id
  schoolId: string;    // interns.intern_id (school-assigned)
  name: string;
  requiredHours: number;
  enrolledAt: string;
  companyId: string;
  companyName: string;
  supervisorName: string;
  hoursRendered: number;
  percentComplete: number;
  lastActive: string | null;
  totalDays: number;
  status: InternStatus;
}

export interface AdminStats {
  totalInterns: number;
  completed: number;
  atRisk: number;
  behind: number;
  onTrack: number;
  totalHoursLogged: number;
}

export interface UseAdminReturn {
  interns: InternSummary[];
  stats: AdminStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseAdminInternLogsReturn {
  entries: LogEntry[];
  loading: boolean;
  error: string | null;
  addEntryForIntern: (entry: Omit<LogEntry, "id" | "createdAt">) => Promise<LogEntry | null>;
  updateEntry: (id: string, patch: Partial<Omit<LogEntry, "id" | "createdAt">>) => Promise<LogEntry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_STATS: AdminStats = {
  totalInterns: 0, completed: 0, atRisk: 0, behind: 0, onTrack: 0, totalHoursLogged: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveStatus(pct: number, lastActive: string | null): InternStatus {
  if (pct >= 100) return "completed";
  if (!lastActive) return "behind";
  const daysSince = Math.floor(
    (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (pct < 30 || daysSince > 7) return "behind";
  if (pct < 60 || daysSince > 3) return "at-risk";
  return "on-track";
}

function rowToLogEntry(row: LogEntryRow): LogEntry {
  return {
    id: row.id,
    day: row.day,
    date: row.date,
    startTime: row.start_time ?? "08:00",
    endTime: row.end_time ?? "17:00",
    hoursWorked: Number(row.hours_worked),
    activity: row.activity,
    isHoliday: Boolean(row.is_holiday),
    createdAt: row.created_at ?? undefined,
  };
}

// ─── useAdmin — roster of all interns with aggregated stats ──────────────────

export function useAdmin(): UseAdminReturn {
  const [interns, setInterns] = useState<InternSummary[]>([]);
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        // ── Fetch interns + log_entries in parallel (2 queries) ─────────────
        const [internRes, logRes] = await Promise.all([
          supabase!
            .from("interns")
            .select(`
              id,
              intern_id,
              name,
              required_hours,
              enrolled_at,
              company_id,
              user_id,
              companies ( name, supervisor_name )
            `),
          supabase!
            .from("log_entries")
            .select("user_id, hours_worked, date, is_holiday"),
        ]);

        if (internRes.error) throw new Error(internRes.error.message);
        if (logRes.error) throw new Error(logRes.error.message);
        if (cancelled) return;

        type LogRow = {
          user_id: string; hours_worked: number | string;
          date: string; is_holiday: boolean | null;
        };

        // UPDATED: companies is an array of objects when selected through an inner query join in Supabase client
        type InternRow = {
          id: string; intern_id: string; name: string;
          required_hours: number | string; enrolled_at: string;
          company_id: string; user_id: string;
          companies: { name: string; supervisor_name: string }[] | null;
        };

        // Group log_entries by user_id — O(n) aggregation
        const logsByUser = new Map<string, LogRow[]>();
        for (const log of (logRes.data ?? []) as LogRow[]) {
          const bucket = logsByUser.get(log.user_id) ?? [];
          bucket.push(log);
          logsByUser.set(log.user_id, bucket);
        }

        const mapped: InternSummary[] = ((internRes.data ?? []) as InternRow[]).map((s) => {
          const logs = logsByUser.get(s.user_id) ?? [];
          const workLogs = logs.filter((l) => !l.is_holiday);
          const hoursRendered = workLogs.reduce((sum, l) => sum + Number(l.hours_worked), 0);
          const requiredHours = Number(s.required_hours);
          const percentComplete = Math.min(100, Math.round((hoursRendered / requiredHours) * 100));
          const sortedDates = logs.map((l) => l.date).sort((a, b) => b.localeCompare(a));

          // Safe lookup for the first item in the nested relation array
          const companyInfo = s.companies && s.companies.length > 0 ? s.companies[0] : null;

          return {
            id: s.id,
            userId: s.user_id,
            schoolId: s.intern_id,
            name: s.name,
            requiredHours,
            enrolledAt: s.enrolled_at,
            companyId: s.company_id,
            companyName: companyInfo?.name ?? "—",
            supervisorName: companyInfo?.supervisor_name ?? "—",
            hoursRendered: parseFloat(hoursRendered.toFixed(2)),
            percentComplete,
            lastActive: sortedDates[0] ?? null,
            totalDays: workLogs.length,
            status: deriveStatus(percentComplete, sortedDates[0] ?? null),
          };
        });

        if (cancelled) return;
        setInterns(mapped);

        const totalHours = mapped.reduce((s, i) => s + i.hoursRendered, 0);
        setStats({
          totalInterns: mapped.length,
          completed: mapped.filter((i) => i.status === "completed").length,
          atRisk: mapped.filter((i) => i.status === "at-risk").length,
          behind: mapped.filter((i) => i.status === "behind").length,
          onTrack: mapped.filter((i) => i.status === "on-track").length,
          totalHoursLogged: parseFloat(totalHours.toFixed(2)),
        });
        setError(null);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load interns");
          setInterns([]);
          setStats(EMPTY_STATS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [tick]);

  return { interns, stats, loading, error, refetch };
}

// ─── useAdminInternLogs — logs for ONE intern, CRUD for admin ─────────────────

export function useAdminInternLogs(internUserId: string): UseAdminInternLogsReturn {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SELECT: fetch this intern's logs
  useEffect(() => {
    if (!supabase || !internUserId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    supabase
      .from("log_entries")
      .select("*")
      .eq("user_id", internUserId)
      .order("date", { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) { setError(err.message); }
        else { setEntries((data ?? []).map(rowToLogEntry)); setError(null); }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [internUserId]);

  // INSERT — uses INTERN's user_id, not admin's auth.uid()
  const addEntryForIntern = useCallback(
    async (entry: Omit<LogEntry, "id" | "createdAt">): Promise<LogEntry | null> => {
      if (!supabase) return null;
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
          user_id: internUserId,  // ← INTERN's user_id, not admin's
        })
        .select()
        .single();

      if (err || !data) { devError("addEntryForIntern failed", err?.message); return null; }
      const newEntry = rowToLogEntry(data as LogEntryRow);
      setEntries((prev) => [newEntry, ...prev]);
      return newEntry;
    },
    [internUserId],
  );

  // UPDATE — admin can update any row (RLS admin policy)
  const updateEntry = useCallback(
    async (id: string, patch: Partial<Omit<LogEntry, "id" | "createdAt">>): Promise<LogEntry | null> => {
      if (!supabase) return null;
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
        .eq("user_id", internUserId)
        .select()
        .single();

      if (err || !data) { devError("admin updateEntry failed", err?.message); return null; }
      const updated = rowToLogEntry(data as LogEntryRow);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    },
    [internUserId],
  );

  // DELETE — admin can delete any row (optimistic with rollback)
  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      const snapshot = entries.find((e) => e.id === id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (!supabase) return false;

      const { error: err } = await supabase
        .from("log_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", internUserId);

      if (err) {
        devError("admin deleteEntry failed", err.message);
        if (snapshot) setEntries((prev) => [...prev, snapshot].sort((a, b) => b.date.localeCompare(a.date)));
        return false;
      }
      return true;
    },
    [entries, internUserId],
  );

  return { entries, loading, error, addEntryForIntern, updateEntry, deleteEntry };
}

// ─── Company type + hook ──────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  address: string;
  supervisorName: string;
  supervisorEmail: string;
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase
      .from("companies")
      .select("id, name, address, supervisor_name, supervisor_email")
      .order("name")
      .then(({ data }) => {
        setCompanies(
          ((data ?? []) as any[]).map((r) => ({
            id: r.id,
            name: r.name,
            address: r.address ?? "",
            supervisorName: r.supervisor_name ?? "",
            supervisorEmail: r.supervisor_email ?? "",
          })),
        );
        setLoading(false);
      });
  }, []);

  const createCompany = useCallback(
    async (data: Omit<Company, "id">): Promise<Company | null> => {
      if (!supabase) return null;
      const { data: row, error } = await supabase
        .from("companies")
        .insert({
          name: data.name,
          address: data.address,
          supervisor_name: data.supervisorName,
          supervisor_email: data.supervisorEmail,
        })
        .select()
        .single();
      if (error || !row) return null;
      const c: Company = {
        id: (row as any).id, name: (row as any).name,
        address: (row as any).address ?? "",
        supervisorName: (row as any).supervisor_name ?? "",
        supervisorEmail: (row as any).supervisor_email ?? "",
      };
      setCompanies((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
      return c;
    },
    [],
  );

  return { companies, loading, createCompany };
}

// ─── Unregistered profiles (no interns row yet) ───────────────────────────────

export interface UnregisteredProfile {
  id: string;   // auth.users.id / profiles.id
  email: string;
  full_name: string;
}

export function useUnregisteredProfiles() {
  const [profiles, setProfiles] = useState<UnregisteredProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    // Fetch all non-admin profiles AND all intern user_ids in parallel, diff client-side
    Promise.all([
      supabase!.from("profiles").select("id, email, full_name").eq("is_admin", false),
      supabase!.from("interns").select("user_id"),
    ]).then(([profileRes, internRes]) => {
      const internUserIds = new Set((internRes.data ?? []).map((r: any) => r.user_id as string));
      const unregistered = ((profileRes.data ?? []) as any[])
        .filter((p) => !internUserIds.has(p.id))
        .map((p) => ({ id: p.id, email: p.email, full_name: p.full_name }));
      setProfiles(unregistered);
      setLoading(false);
    });
  }, []);

  return { profiles, loading };
}

// ─── registerIntern ───────────────────────────────────────────────────────────

export interface RegisterInternPayload {
  userId: string;   // auth.users.id of the user to register
  name: string;
  schoolId: string;   // intern_id — school-assigned number
  requiredHours: number;
  enrolledAt: string;   // ISO date
  companyId: string;
}

export async function registerIntern(
  payload: RegisterInternPayload,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };
  const { error } = await supabase.from("interns").insert({
    user_id: payload.userId,
    name: payload.name,
    intern_id: payload.schoolId,
    required_hours: payload.requiredHours,
    enrolled_at: payload.enrolledAt,
    company_id: payload.companyId,
  });
  return { error: error?.message ?? null };
}