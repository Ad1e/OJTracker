// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/pages/intern-dashboard.tsx
// REASON: New — intern personal dashboard; all data scoped to auth.uid()
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from "react";
import { useAuthContext }      from "../context/auth-context";
import { useEntries }          from "../hooks/use-entries";
import { useHoursCalc }        from "../hooks/use-hours-calc";
import { supabase }            from "../lib/supabase";
import { ProfileCard }         from "../components/features/profile/profile-card";
import { StatsCard }           from "../components/features/hours/stats-card";
import { TimeLogTable }        from "../components/features/attendance/time-log-table";
import { LogForm }             from "../components/features/attendance/log-form";
import { DeleteConfirmModal }  from "../components/features/attendance/delete-confirm-modal";
import type { LogEntry, TraineeProfileData, FormMode } from "../types";

// ─── intern profile fetch ─────────────────────────────────────────────────────

interface InternProfile { requiredHours: number; enrolledAt: string; companyName: string; supervisorName: string; }

function useInternProfile(userId: string | null) {
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  useEffect(() => {
    if (!userId || !supabase) { setLoading(false); return; }
    let cancelled = false;
    supabase.from("interns")
      .select("id, intern_id, name, required_hours, enrolled_at, companies ( name, supervisor_name )")
      .eq("user_id", userId).maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          // Real DB error — show the message
          setError(err.message);
          setLoading(false);
          return;
        }
        if (!data) {
          // No intern row for this user yet
          setError("Your intern profile hasn't been set up yet. Please contact your administrator.");
          setLoading(false);
          return;
        }
        const row = data as any;
        setProfile({ requiredHours: Number(row.required_hours), enrolledAt: row.enrolled_at, companyName: row.companies?.name ?? "—", supervisorName: row.companies?.supervisor_name ?? "—" });
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);
  return { profile, loading, error };
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatChip({ label, value, accent = "indigo" }: { label: string; value: string | number; accent?: "indigo" | "emerald" | "amber" }) {
  const c = { indigo: "ring-indigo-500/20 bg-indigo-500/5 text-indigo-300", emerald: "ring-emerald-500/20 bg-emerald-500/5 text-emerald-300", amber: "ring-amber-500/20 bg-amber-500/5 text-amber-300" }[accent];
  return (
    <div className={`glass-card p-4 ring-1 ${c}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-display font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

function HoursProgress({ rendered, required }: { rendered: number; required: number }) {
  const pct = Math.min(100, required > 0 ? Math.round((rendered / required) * 100) : 0);
  const done = pct >= 100;
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-bold text-white">OJT Progress</h3>
        <span className={`text-sm font-bold tabular-nums ${done ? "text-emerald-400" : "text-indigo-400"}`}>{pct}%</span>
      </div>
      <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${done ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-gradient-to-r from-indigo-600 to-accent"}`}
          style={{ width: `${pct}%`, boxShadow: done ? "0 0 12px rgba(52,211,153,0.5)" : "0 0 12px rgba(99,102,241,0.5)" }} />
      </div>
      <div className="flex justify-between mt-2 text-[11px] text-slate-500 tabular-nums">
        <span>{rendered.toFixed(1)} h rendered</span>
        <span>{done ? <span className="text-emerald-400 font-semibold">🎉 Complete!</span> : `${(required - rendered).toFixed(1)} h remaining of ${required} h`}</span>
      </div>
    </div>
  );
}

function EmptyLogs({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="glass-card p-14 flex flex-col items-center text-center gap-5">
      <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center bg-slate-800/30">
        <svg className="w-9 h-9 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="12" y1="9" x2="12" y2="15" />
        </svg>
      </div>
      <div>
        <p className="text-base font-display font-semibold text-white">No log entries yet</p>
        <p className="text-sm text-slate-500 mt-1">Start tracking your OJT hours by adding your first entry.</p>
      </div>
      <button id="empty-add-entry" onClick={onAdd} className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-indigo-400 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">+ Add First Entry</button>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function InternDashboard() {
  const { user, profile: authProfile, signOut } = useAuthContext();
  const { profile: internProfile, loading: profileLoading, error: profileError } = useInternProfile(user?.id ?? null);
  const { entries, loading: entriesLoading, error: entriesError, addEntry, updateEntry, deleteEntry } = useEntries();
  const stats = useHoursCalc(entries, internProfile?.requiredHours ?? 500);

  const [modal, setModal] = useState<{ open: boolean; mode: FormMode; target: LogEntry | null }>({ open: false, mode: "add", target: null });
  const [deleteTarget, setDeleteTarget] = useState<LogEntry | null>(null);
  const openAdd    = useCallback(() => setModal({ open: true, mode: "add",  target: null }), []);
  const openEdit   = useCallback((e: LogEntry) => setModal({ open: true, mode: "edit", target: e }), []);
  const closeModal = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  const handleSubmit = useCallback(async (data: Omit<LogEntry, "id" | "createdAt"> & { id?: string }) => {
    if (modal.mode === "edit" && data.id) await updateEntry(data.id, data);
    else await addEntry({ ...data, day: entries.length + 1 });
  }, [modal.mode, addEntry, updateEntry, entries.length]);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTarget) { await deleteEntry(deleteTarget.id); setDeleteTarget(null); }
  }, [deleteTarget, deleteEntry]);

  const traineeProfile: TraineeProfileData | null = internProfile ? {
    name: authProfile?.full_name ?? "—", department: internProfile.companyName,
    supervisor: internProfile.supervisorName, school: "Batangas State University",
    totalRequiredHours: internProfile.requiredHours, avatarDataUrl: null, startDate: internProfile.enrolledAt,
  } : null;

  if (profileLoading || entriesLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center gap-3 text-slate-400">
      <div className="w-8 h-8 relative"><div className="absolute inset-0 rounded-full border-2 border-slate-800" /><div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" /></div>
      <span className="text-sm font-medium">Loading your dashboard…</span>
    </div>
  );

  if (profileError || entriesError) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="glass-card max-w-sm p-8 text-center">
        <p className="text-sm font-semibold text-red-400 mb-2">Could not load dashboard</p>
        <p className="text-xs text-slate-500 mb-5">{profileError ?? entriesError}</p>
        <button onClick={signOut} className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-4">Sign out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-slate-300 font-sans">
      <header className="sticky top-0 z-30 glass-card rounded-none border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest leading-none mb-0.5">OJTracker</p>
              <p className="text-sm font-display font-bold text-white leading-tight">{authProfile?.full_name ?? "Intern Dashboard"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button id="header-add-entry" onClick={openAdd} className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-bold hover:bg-indigo-400 transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Add Entry
            </button>
            <button id="header-signout" onClick={signOut} title="Sign out" className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border border-transparent hover:border-slate-700">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {traineeProfile && <div className="lg:col-span-1"><ProfileCard profile={traineeProfile} stats={stats} /></div>}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <HoursProgress rendered={stats.totalRendered} required={internProfile?.requiredHours ?? 500} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip label="Days Rendered"  value={stats.workingDaysLogged} accent="indigo" />
              <StatChip label="Hours Rendered" value={`${stats.totalRendered.toFixed(1)} h`} accent="indigo" />
              <StatChip label="Remaining"      value={`${stats.remaining.toFixed(1)} h`} accent={stats.remaining === 0 ? "emerald" : "amber"} />
              <StatChip label="Avg / Day"      value={`${stats.avgHoursPerDay.toFixed(1)} h`} accent="indigo" />
            </div>
          </div>
        </div>

        <StatsCard stats={stats} target={internProfile?.requiredHours ?? 500} />

        <section>
          <div className="flex items-center justify-between mb-4">
            <div><h2 className="text-base font-display font-bold text-white">Activity Log</h2><p className="text-xs text-slate-500 mt-0.5">{entries.length} entr{entries.length !== 1 ? "ies" : "y"} · your records only</p></div>
            {entries.length > 0 && (
              <button id="table-add-entry" onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-semibold hover:bg-accent hover:text-white transition-all">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Add Entry
              </button>
            )}
          </div>
          {entries.length === 0 ? <EmptyLogs onAdd={openAdd} /> : (
            <TimeLogTable logs={entries} onEdit={openEdit} onDelete={(id) => setDeleteTarget(entries.find((e) => e.id === id) ?? null)} />
          )}
        </section>
      </main>

      <LogForm isOpen={modal.open} mode={modal.mode} initial={modal.target} onSubmit={handleSubmit} onClose={closeModal} />
      {deleteTarget && <DeleteConfirmModal entryDate={deleteTarget.date} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
