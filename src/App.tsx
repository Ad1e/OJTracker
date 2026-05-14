// ─── src/App.tsx ─────────────────────────────────────────────────────────────
// Root application component. Wires auth, data, and routing.
// All imports now use the barrel files and the new kebab-case paths.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect, useMemo } from "react";
import { useHoursCalc, useEntries }                  from "./hooks";
import type { LogEntry, TraineeProfileData }          from "./types";
import { StatsCard, HoursSummary }                    from "./components/features/hours";
import { TimeLogTable, LogForm, DeleteConfirmModal }  from "./components/features/attendance";
import { TraineeProfile, ProfileStrip }               from "./components/features/profile";
import { Auth }                                       from "./components/Auth";
import { PredictorCard, WeeklyCard }                  from "./components/Charts";
import { supabase }                                   from "./lib/supabase";
import BsuLogoImg                                     from "./assets/bsu-logo.png";
import journalData                                    from "./data/journalData.json";
import type { JournalWeek }                           from "./types";

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {

  // ── Auth session ──────────────────────────────────────────────────────────
  const [session, setSession] = useState<boolean>(() => !!localStorage.getItem("mock_session"));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => setSession(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = useCallback(async () => {
    if (supabase) { await supabase.auth.signOut(); }
    else          { localStorage.removeItem("mock_session"); setSession(false); }
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { entries: logs, loading, error, addEntry, updateEntry, deleteEntry } = useEntries();

  // ── Profile ───────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<TraineeProfileData | null>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("practilog_profile") ?? "null") as TraineeProfileData | null;
      if (stored) {
        stored.name       = journalData.trainee;
        stored.department = journalData.course;
        stored.supervisor = journalData.supervisor;
        return stored;
      }
      return null;
    } catch { return null; }
  });
  const [showProfileSetup, setShowProfileSetup] = useState(!profile);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalOpen,   setModalOpen]   = useState(false);
  const [modalMode,   setModalMode]   = useState<"add" | "edit">("add");
  const [editTarget,  setEditTarget]  = useState<LogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LogEntry | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ id: number; message: string; type: "success" | "edit" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "edit" | "error") => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), 3000);
  }, []);

  // ── Active tab ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"dashboard" | "summary">("dashboard");

  // ── Stats ─────────────────────────────────────────────────────────────────
  const TARGET = profile?.totalRequiredHours ?? 500;
  const stats  = useHoursCalc(logs, TARGET);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openAdd  = useCallback(() => { setModalMode("add");  setEditTarget(null);  setModalOpen(true); }, []);
  const openEdit = useCallback((entry: LogEntry) => { setModalMode("edit"); setEditTarget(entry); setModalOpen(true); }, []);

  const handleSubmit = useCallback(
    async (data: Omit<LogEntry, "id" | "createdAt"> & { id?: string }) => {
      if (data.id) {
        const result = await updateEntry(data.id, data);
        showToast(result ? "Entry updated" : "Failed to update entry", result ? "edit" : "error");
      } else {
        const nextDay = logs.length > 0 ? Math.max(...logs.map((l) => l.day)) + 1 : 1;
        const result  = await addEntry({ ...data, day: nextDay });
        showToast(result ? "Entry added" : "Failed to add entry", result ? "success" : "error");
      }
    },
    [logs, addEntry, updateEntry, showToast]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const ok = await deleteEntry(deleteTarget.id);
    showToast(ok ? "Entry deleted" : "Failed to delete entry", ok ? "success" : "error");
    setDeleteTarget(null);
  }, [deleteTarget, deleteEntry, showToast]);

  const handleProfileSave = useCallback((data: TraineeProfileData) => {
    setProfile(data);
    setShowProfileSetup(false);
    localStorage.setItem("practilog_profile", JSON.stringify(data));
    showToast("Profile saved", "success");
  }, [showToast]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const progressWidth = `${Math.min(100, stats.percentComplete)}%`;

  // Late instances — days where hoursWorked < expected for that date range
  const lates = useMemo(() => {
    const getExpectedHours = (date: string): number => {
      if (date < "2026-03-09")                                      return 8;
      if (date >= "2026-03-16" && date <= "2026-03-19")             return 8;
      if (date >= "2026-03-30" && date <= "2026-03-31")             return 8;
      if (date >= "2026-04-27" && date <= "2026-04-30")             return 8;
      return 10;
    };
    return logs
      .filter((e) => !e.isHoliday)
      .filter((e) => e.hoursWorked < getExpectedHours(e.date))
      .map((e) => {
        const expected       = getExpectedHours(e.date);
        const deduction      = parseFloat((expected - e.hoursWorked).toFixed(2));
        const deductionMins  = Math.round(deduction * 60);
        const [yr, mo, dy]   = e.date.split("-").map(Number);
        const label          = new Date(yr, mo - 1, dy).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "2-digit" });
        return { ...e, expected, deduction, deductionMins, label };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [logs]);

  const totalDeducted = parseFloat(lates.reduce((s, l) => s + l.deduction, 0).toFixed(2));

  // ── Early returns ─────────────────────────────────────────────────────────
  if (!session) return <Auth onLogin={() => setSession(true)} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-3 text-slate-400">
        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" /></svg>
        <span className="text-sm font-medium">Loading journal…</span>
      </div>
    );
  }

  if (error) {
    const isServerError = error.includes("Local server") || error.includes("/api/entries");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card max-w-md p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          {isServerError ? (
            <>
              <h2 className="text-base font-display font-bold text-white mb-2">Backend server not running</h2>
              <p className="text-sm text-slate-400 mb-3">Start the local Express server in a separate terminal:</p>
              <code className="block bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-accent font-mono mb-4">npm run server</code>
              <p className="text-xs text-slate-500">Or start both at once with <code className="text-slate-400">npm run dev:all</code></p>
            </>
          ) : (
            <>
              <h2 className="text-base font-display font-bold text-white mb-2">Could not connect</h2>
              <p className="text-sm text-slate-400 mb-1">{error}</p>
              <p className="text-xs text-slate-500">Check your Supabase environment variables in <code className="text-slate-400">.env.local</code></p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-slate-300 font-sans selection:bg-accent/30">

      {/* Topbar */}
      <header className="glass-card sticky top-0 z-30 border-b border-slate-800 rounded-none rounded-b-2xl mb-8 mx-4 sm:mx-6 mt-2 max-w-6xl xl:mx-auto py-3">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={BsuLogoImg} alt="BSU" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-lg font-display text-white tracking-tight leading-none">SpartaShift</h1>
              <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">BSU · {TARGET} - Hour Tracker</p>
            </div>
          </div>

          {profile && <ProfileStrip profile={profile} onEdit={() => setShowProfileSetup(true)} />}

          <button onClick={handleLogout} title="Sign out" className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>

          <div className="hidden sm:flex items-center gap-3 flex-1 max-w-xs ml-4">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div className="h-full rounded-full bg-accent transition-all duration-1000 ease-out" style={{ width: progressWidth, boxShadow: "0 0 10px rgba(99,102,241,0.8)" }} />
            </div>
            <span className="text-xs font-semibold text-slate-300 tabular-nums whitespace-nowrap">{stats.totalRendered.toFixed(0)} / {TARGET} h</span>
          </div>

          <button onClick={openAdd} className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-semibold hover:bg-accent hover:text-white active:scale-95 transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Entry
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
        {/* Tab navigation */}
        <div className="flex gap-1.5 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50 w-fit">
          {([
            { id: "dashboard", label: "Dashboard",    icon: "📈" },
            { id: "summary",   label: "Hours Summary", icon: "📊" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? "bg-accent text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"}`}
            >
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard tab */}
        {activeTab === "dashboard" && (
          <>
            {stats.percentComplete >= 100 && (
              <div className="glass-card !bg-emerald-900/20 !border-emerald-500/30 px-6 py-4 flex items-center gap-4">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="font-display font-semibold text-base text-emerald-300">Internship complete!</p>
                  <p className="text-xs text-emerald-400/80 mt-0.5">You've logged all {TARGET} required hours. Congratulations!</p>
                </div>
              </div>
            )}

            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 ml-1">Overview</h2>
              <StatsCard stats={stats} target={TARGET} />
            </section>

            <section className="glass-card px-6 py-4 hover:!translate-y-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-display font-semibold text-white">Total Progress</h3>
                  <span className="text-xs text-slate-500 tabular-nums">{stats.totalRendered.toFixed(1)} / {TARGET} h</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 tabular-nums">{stats.remaining > 0 ? `${stats.remaining.toFixed(1)} h remaining` : "✅ All done!"}</span>
                  <span className="text-xl font-display font-bold text-accent tabular-nums drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">{stats.percentComplete}%</span>
                </div>
              </div>
              <div className="relative h-3 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-600 to-accent transition-all duration-1000 ease-out" style={{ width: progressWidth }}>
                  <div className="absolute top-0 right-0 bottom-0 w-6 bg-gradient-to-l from-white/30 to-transparent" />
                </div>
                {[25, 50, 75].map((pct) => <div key={pct} className="absolute inset-y-0 w-px bg-slate-700/80" style={{ left: `${pct}%` }} />)}
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 font-medium mt-1.5 px-0.5">
                <span>0</span><span>{TARGET * 0.25}</span><span>{TARGET * 0.5}</span><span>{TARGET * 0.75}</span><span>{TARGET} h</span>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 ml-1">Analytics</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2"><PredictorCard logs={logs} target={TARGET} /></div>
                <div className="lg:col-span-1">
                  <div className="glass-card overflow-hidden hover:!translate-y-0">
                    <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Recent Activity</span>
                      <span className="text-[10px] text-slate-500 bg-surface border border-slate-700/50 px-2 py-0.5 rounded-full tabular-nums">{logs.filter((l) => !l.isHoliday).length} work days</span>
                    </div>
                    <div className="divide-y divide-slate-700/30">
                      {[...logs].filter((l) => !l.isHoliday).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((entry) => {
                        const [yr, mo, dy] = entry.date.split("-").map(Number);
                        const lbl = new Date(yr, mo - 1, dy).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
                        return (
                          <div key={entry.id} className="px-4 py-3.5 hover:bg-slate-800/40 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] text-slate-500 font-mono tabular-nums mb-0.5">{lbl} · Day {entry.day}</p>
                                <p className="text-xs text-slate-300 leading-snug line-clamp-2">{entry.activity}</p>
                              </div>
                              <span className="text-sm font-bold text-indigo-300 tabular-nums shrink-0 mt-0.5">{entry.hoursWorked}h</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 py-2.5 border-t border-slate-700/50 bg-slate-800/20"><p className="text-[10px] text-slate-500 text-center">See full log below ↓</p></div>
                  </div>
                </div>
              </div>
            </section>

            <section><WeeklyCard logs={logs} target={TARGET} /></section>

            {lates.length > 0 && (
              <section>
                <div className="glass-card overflow-hidden hover:!translate-y-0">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 bg-slate-800/30">
                    <div className="flex items-center gap-2"><span className="text-base">⏰</span><h2 className="text-sm font-display font-semibold text-white">Late Instances</h2></div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 tabular-nums">{lates.length} late day{lates.length !== 1 ? "s" : ""}</span>
                      <span className="text-xs font-bold text-red-400 tabular-nums bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">-{totalDeducted}h total</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700/40 bg-slate-800/20">
                          <th className="text-left px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Day</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Date</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden sm:table-cell">Activity</th>
                          <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Expected</th>
                          <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Rendered</th>
                          <th className="text-right px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Deducted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {lates.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-3 text-slate-500 font-mono tabular-nums">#{l.day}</td>
                            <td className="px-4 py-3 text-slate-300 font-medium whitespace-nowrap">{l.label}</td>
                            <td className="px-4 py-3 text-slate-500 hidden sm:table-cell max-w-[240px] truncate">{l.activity}</td>
                            <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{l.expected}h</td>
                            <td className="px-4 py-3 text-right text-slate-300 tabular-nums font-medium">{l.hoursWorked}h</td>
                            <td className="px-5 py-3 text-right"><span className="inline-flex items-center gap-1 text-red-400 font-bold tabular-nums"><span className="text-red-500/60">-</span>{l.deductionMins} min</span></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-700/50 bg-slate-800/30">
                          <td colSpan={4} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Total deducted</td>
                          <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums font-bold">{lates.reduce((s, l) => s + l.hoursWorked, 0).toFixed(2)}h</td>
                          <td className="px-5 py-2.5 text-right"><span className="text-red-400 font-bold tabular-nums">-{totalDeducted}h</span></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-4 ml-1">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Activity Log</h2>
                <span className="text-xs text-slate-400 font-medium bg-surface px-2.5 py-1 rounded-full border border-slate-700/50">{logs.length} total entr{logs.length !== 1 ? "ies" : "y"}</span>
              </div>
              <TimeLogTable logs={logs} onEdit={openEdit} onDelete={(id) => setDeleteTarget(logs.find((l) => l.id === id) ?? null)} />
            </section>
          </>
        )}

        {/* Hours Summary tab */}
        {activeTab === "summary" && (
          <HoursSummary weeks={journalData.weeks as JournalWeek[]} targetHours={TARGET} />
        )}
      </main>

      {/* Profile Setup Modal */}
      {showProfileSetup && (
        <TraineeProfile onSave={handleProfileSave} onCancel={profile ? () => setShowProfileSetup(false) : undefined} canCancel={!!profile} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal entryDate={deleteTarget.date} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />
      )}

      {/* Footer */}
      <footer className="text-center py-10 text-xs text-slate-600 font-medium border-t border-slate-800/50 mt-10">
        PractiLog &middot; {new Date().getFullYear()} &middot; Built with React + TypeScript + Supabase
      </footer>

      {/* Log Entry Modal */}
      <LogForm isOpen={modalOpen} mode={modalMode} initial={editTarget} onSubmit={handleSubmit} onClose={() => setModalOpen(false)} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="glass-card !rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl border-slate-700/80 bg-surface/90">
            <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${toast.type === "success" ? "bg-emerald-400 shadow-emerald-400/50" : toast.type === "edit" ? "bg-accent shadow-accent/50" : "bg-red-400 shadow-red-400/50"}`} />
            <span className="text-sm font-medium text-slate-200">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}