// ─── src/hooks/use-admin-interns.ts ──────────────────────────────────────────
// Fetches all interns and aggregates their hours from log_entries.
//
// Schema reality:
//   interns.user_id    → auth.users.id  (uuid)
//   log_entries.user_id → auth.users.id  (uuid)
//
// Strategy: fetch interns + log_entries in parallel (2 queries),
// then group log_entries by user_id in JS for O(n) aggregation.
// No attendance_logs table — hours come from log_entries.hours_worked.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { supabase }            from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InternStatus = "on-track" | "at-risk" | "behind" | "completed";

export interface InternSummary {
  id:              string;   // interns.id
  internId:        string;   // school-assigned intern number
  name:            string;
  requiredHours:   number;
  enrolledAt:      string;   // ISO date string
  companyId:       string;
  companyName:     string;
  userId:          string;   // auth.users.id — links to log_entries.user_id
  hoursRendered:   number;
  percentComplete: number;
  lastActive:      string | null;
  totalDays:       number;
  status:          InternStatus;
}

export interface AdminStats {
  totalInterns:     number;
  completed:        number;
  atRisk:           number;
  behind:           number;
  totalHoursLogged: number;
}

export interface UseAdminInternsReturn {
  interns:  InternSummary[];
  stats:    AdminStats;
  loading:  boolean;
  error:    string | null;
  refetch:  () => void;
}

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

const EMPTY_STATS: AdminStats = {
  totalInterns: 0, completed: 0, atRisk: 0, behind: 0, totalHoursLogged: 0,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminInterns(): UseAdminInternsReturn {
  const [interns, setInterns]  = useState<InternSummary[]>([]);
  const [stats,   setStats]    = useState<AdminStats>(EMPTY_STATS);
  const [loading, setLoading]  = useState(true);
  const [error,   setError]    = useState<string | null>(null);
  const [tick,    setTick]     = useState(0);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase is not configured. Check your environment variables.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadInterns() {
      try {
        // Fetch interns + log_entries in parallel
        const [internRes, logRes] = await Promise.all([
          supabase!
            .from("interns")
            .select("id, intern_id, name, required_hours, enrolled_at, company_id, user_id, companies(name)"),
          supabase!
            .from("log_entries")
            .select("user_id, hours_worked, date, is_holiday"),
        ]);

        if (internRes.error) throw new Error(internRes.error.message);
        if (logRes.error)    throw new Error(logRes.error.message);
        if (cancelled) return;

        const rawInterns = internRes.data ?? [];
        const rawLogs    = logRes.data    ?? [];

        // Group log_entries by user_id for O(n) aggregation
        type LogRow = { user_id: string; hours_worked: number | string; date: string; is_holiday: boolean | null };
        const logsByUser = new Map<string, LogRow[]>();
        for (const log of rawLogs as LogRow[]) {
          const bucket = logsByUser.get(log.user_id) ?? [];
          bucket.push(log);
          logsByUser.set(log.user_id, bucket);
        }

        // Map each intern → InternSummary
        const mapped: InternSummary[] = (rawInterns as unknown as {
          id: string; intern_id: string; name: string;
          required_hours: number | string; enrolled_at: string;
          company_id: string; user_id: string;
          companies: { name: string } | null;
        }[]).map((s) => {
          const logs         = logsByUser.get(s.user_id) ?? [];
          const workLogs     = logs.filter((l) => !l.is_holiday);
          const hoursRendered = workLogs.reduce(
            (sum, l) => sum + Number(l.hours_worked), 0,
          );
          const requiredHours  = Number(s.required_hours);
          const percentComplete = Math.min(100, Math.round((hoursRendered / requiredHours) * 100));
          const sortedDates    = logs.map((l) => l.date).sort((a, b) => b.localeCompare(a));
          const lastActive     = sortedDates[0] ?? null;

          return {
            id:              s.id,
            internId:        s.intern_id,
            name:            s.name,
            requiredHours,
            enrolledAt:      s.enrolled_at,
            companyId:       s.company_id,
            companyName:     s.companies?.name ?? "—",
            userId:          s.user_id,
            hoursRendered:   parseFloat(hoursRendered.toFixed(2)),
            percentComplete,
            lastActive,
            totalDays:       workLogs.length,
            status:          deriveStatus(percentComplete, lastActive),
          };
        });

        if (cancelled) return;
        setInterns(mapped);

        const totalHoursLogged = mapped.reduce((s, i) => s + i.hoursRendered, 0);
        setStats({
          totalInterns:     mapped.length,
          completed:        mapped.filter((i) => i.status === "completed").length,
          atRisk:           mapped.filter((i) => i.status === "at-risk").length,
          behind:           mapped.filter((i) => i.status === "behind").length,
          totalHoursLogged: parseFloat(totalHoursLogged.toFixed(2)),
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

    void loadInterns();
    return () => { cancelled = true; };
  }, [tick]);

  return { interns, stats, loading, error, refetch };
}
