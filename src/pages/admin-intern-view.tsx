// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/pages/admin-intern-view.tsx
// REASON: New — admin views/edits a specific intern's logs
//
// CRITICAL: addEntryForIntern stamps user_id = internUserId (NOT admin's uid).
// This correctly attributes hours to the intern in the database.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from "react";
import { useParams, Link }                  from "react-router-dom";
import { useAdminInternLogs }               from "../hooks/use-admin";
import { useHoursCalc }                     from "../hooks/use-hours-calc";
import { supabase }                         from "../lib/supabase";
import { TimeLogTable }                     from "../components/features/attendance/time-log-table";
import { LogForm }                          from "../components/features/attendance/log-form";
import { DeleteConfirmModal }               from "../components/features/attendance/delete-confirm-modal";
import type { LogEntry, FormMode }          from "../types";

// ─── Intern info fetch ────────────────────────────────────────────────────────

interface InternInfo {
  name:           string;
  schoolId:       string;
  requiredHours:  number;
  enrolledAt:     string;
  companyName:    string;
  supervisorName: string;
}

function useInternInfo(userId: string) {
  const [info,    setInfo]    = useState<InternInfo | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase || !userId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from("interns")
      .select("intern_id, name, required_hours, enrolled_at, companies ( name, supervisor_name )")
      .eq("user_id", userId).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as any;
        setInfo({
          name:           row?.name             ?? "Unknown Intern",
          schoolId:       row?.intern_id        ?? "—",
          requiredHours:  Number(row?.required_hours ?? 500),
          enrolledAt:     row?.enrolled_at      ?? "—",
          companyName:    row?.companies?.name              ?? "—",
          supervisorName: row?.companies?.supervisor_name   ?? "—",
        });
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);
  return { info, loading };
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-display font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminInternView() {
  const { userId = "" }                     = useParams<{ userId: string }>();
  const { info, loading: infoLoading }      = useInternInfo(userId);
  const {
    entries, loading: logsLoading, error,
    addEntryForIntern, updateEntry, deleteEntry,
  } = useAdminInternLogs(userId);

  const stats = useHoursCalc(entries, info?.requiredHours ?? 500);

  const [modal, setModal] = useState<{ open: boolean; mode: FormMode; target: LogEntry | null }>({ open: false, mode: "add", target: null });
  const [deleteTarget, setDeleteTarget] = useState<LogEntry | null>(null);

  const openAdd    = useCallback(() => setModal({ open: true, mode: "add",  target: null }), []);
  const openEdit   = useCallback((e: LogEntry) => setModal({ open: true, mode: "edit", target: e }), []);
  const closeModal = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  const handleSubmit = useCallback(async (data: Omit<LogEntry, "id" | "createdAt"> & { id?: string }) => {
    if (modal.mode === "edit" && data.id) {
      await updateEntry(data.id, data);
    } else {
      // addEntryForIntern stamps user_id = internUserId (not admin's uid)
      await addEntryForIntern({ ...data, day: entries.length + 1 });
    }
  }, [modal.mode, addEntryForIntern, updateEntry, entries.length]);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTarget) { await deleteEntry(deleteTarget.id); setDeleteTarget(null); }
  }, [deleteTarget, deleteEntry]);

  if (infoLoading || logsLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center gap-3 text-slate-400">
      <div className="w-8 h-8 relative">
        <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
      </div>
      <span className="text-sm font-medium">Loading intern data…</span>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="glass-card max-w-sm p-8 text-center">
        <p className="text-sm font-semibold text-red-400 mb-2">Error loading intern data</p>
        <p className="text-xs text-slate-500 mb-5">{error}</p>
        <Link to="/admin" className="text-accent hover:underline text-sm">← Back to Roster</Link>
      </div>
    </div>
  );

  const pct = Math.min(100, stats.totalRendered > 0 && (info?.requiredHours ?? 0) > 0
    ? Math.round((stats.totalRendered / (info?.requiredHours ?? 500)) * 100) : 0);

  return (
    <div className="min-h-screen bg-background text-slate-300 font-sans">

      {/* Header */}
      <header className="sticky top-0 z-30 glass-card rounded-none border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Back to roster">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-medium leading-none mb-0.5">Admin → Intern View</p>
            <p className="text-sm font-display font-bold text-white truncate">{info?.name ?? "Intern"}</p>
          </div>
          <button
            id="admin-intern-add-entry"
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-bold hover:bg-indigo-400 transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Entry
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Intern info card */}
        <div className="glass-card p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            {[
              { label: "School ID",   value: info?.schoolId       ?? "—" },
              { label: "Company",     value: info?.companyName     ?? "—" },
              { label: "Supervisor",  value: info?.supervisorName  ?? "—" },
              { label: "Enrolled",    value: info?.enrolledAt ? new Date(info.enrolledAt + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—" },
              { label: "Required",    value: `${info?.requiredHours ?? 500} h` },
              { label: "Completion",  value: `${pct}%` },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1">{item.label}</p>
                <p className="text-sm font-medium text-slate-200">{item.value}</p>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-5">
            <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-gradient-to-r from-indigo-600 to-accent"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[11px] text-slate-500 tabular-nums">
              <span>{stats.totalRendered.toFixed(1)} h rendered</span>
              <span>{pct >= 100 ? "🎉 Complete!" : `${stats.remaining.toFixed(1)} h remaining`}</span>
            </div>
          </div>
        </div>

        {/* Stats chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatChip label="Days Rendered"  value={stats.workingDaysLogged} />
          <StatChip label="Hours Rendered" value={`${stats.totalRendered.toFixed(1)} h`} />
          <StatChip label="Remaining"      value={`${stats.remaining.toFixed(1)} h`} />
          <StatChip label="Avg / Day"      value={`${stats.avgHoursPerDay.toFixed(1)} h`} />
        </div>

        {/* Log table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-display font-bold text-white">Activity Log</h2>
              <p className="text-xs text-slate-500 mt-0.5">{entries.length} entr{entries.length !== 1 ? "ies" : "y"} for {info?.name ?? "this intern"}</p>
            </div>
          </div>
          {entries.length === 0 ? (
            <div className="glass-card p-12 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center bg-slate-800/30">
                <svg className="w-7 h-7 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <line x1="12" y1="9" x2="12" y2="15" /><line x1="9" y1="12" x2="15" y2="12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">No logs for this intern</p>
                <p className="text-xs text-slate-500 mt-1">Add an entry to start tracking their hours.</p>
              </div>
              <button onClick={openAdd} className="px-5 py-2 rounded-xl bg-accent text-white text-sm font-bold hover:bg-indigo-400 transition-all">Add First Entry</button>
            </div>
          ) : (
            <TimeLogTable
              logs={entries}
              onEdit={openEdit}
              onDelete={(id) => setDeleteTarget(entries.find((e) => e.id === id) ?? null)}
            />
          )}
        </section>
      </main>

      <LogForm isOpen={modal.open} mode={modal.mode} initial={modal.target} onSubmit={handleSubmit} onClose={closeModal} />
      {deleteTarget && <DeleteConfirmModal entryDate={deleteTarget.date} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
