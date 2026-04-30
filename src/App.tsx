import { useState, useCallback, useEffect } from "react";
import { useHoursCalc } from "./hooks/useHoursCalc";
import type { LogEntry } from "./hooks/useHoursCalc";
import { useEntries } from "./hooks/useEntries";
import { StatsCard } from "./components/StatsCard";
import { TimeLogTable } from "./components/TimeLogTable";
import { LogForm } from "./components/LogForm";
import { Charts } from "./components/Charts";
import { TraineeProfile, type TraineeProfileData } from "./components/traineeprofile";
import { ProfileStrip } from "./components/profilecard";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { Auth } from "./components/Auth";
import { supabase } from "./lib/supabase";
import BsuLogoImg from "./assets/bsu-logo.png";

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {

  // ── Auth Session ──────────────────────────────────────────────────────────
  const [session, setSession] = useState<boolean>(() => {
    return !!localStorage.getItem("mock_session") || false;
  });

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(!!session);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(!!session);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleLogout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem("mock_session");
      setSession(false);
    }
  }, []);

  // ── Data layer: real Supabase CRUD (replaces api.ts + seed JSON) ──────────
  const { entries: logs, loading, error, addEntry, updateEntry, deleteEntry } = useEntries();

  // ── Profile (persisted to localStorage) ──────────────────────────────────
  const [profile, setProfile] = useState<TraineeProfileData | null>(() => {
    try { return JSON.parse(localStorage.getItem("practilog_profile") ?? "null"); }
    catch { return null; }
  });
  const [showProfileSetup, setShowProfileSetup] = useState(!profile);

  // ── Log form modal ────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editTarget, setEditTarget] = useState<LogEntry | null>(null);

  // ── Delete confirmation modal (replaces window.confirm) ───────────────────
  const [deleteTarget, setDeleteTarget] = useState<LogEntry | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: "success" | "edit" | "error";
  } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "edit" | "error") => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), 3000);
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const TARGET = profile?.totalRequiredHours ?? 500;
  const stats = useHoursCalc(logs, TARGET);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openAdd = useCallback(() => {
    setModalMode("add");
    setEditTarget(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((entry: LogEntry) => {
    setModalMode("edit");
    setEditTarget(entry);
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (data: Omit<LogEntry, "id" | "createdAt"> & { id?: string }) => {
      if (data.id) {
        const result = await updateEntry(data.id, data);
        showToast(result ? "Entry updated" : "Failed to update entry", result ? "edit" : "error");
      } else {
        // Compute next day number
        const nextDay = logs.length > 0 ? Math.max(...logs.map((l: LogEntry) => l.day)) + 1 : 1;
        const result = await addEntry({ ...data, day: nextDay });
        showToast(result ? "Entry added" : "Failed to add entry", result ? "success" : "error");
      }
    },
    [logs, addEntry, updateEntry, showToast]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const ok = await deleteEntry(deleteTarget.id);
    showToast(ok ? "Entry deleted" : "Failed to delete entry", ok ? "error" : "error");
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

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!session) {
    return <Auth onLogin={() => setSession(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-3 text-slate-400">
        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
        </svg>
        <span className="text-sm font-medium">Loading journal…</span>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card max-w-md p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-base font-display font-bold text-white mb-2">Could not connect</h2>
          <p className="text-sm text-slate-400 mb-1">{error}</p>
          <p className="text-xs text-slate-500">Check your Supabase environment variables in <code className="text-slate-400">.env.local</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-slate-300 font-sans selection:bg-accent/30">

      {/* Topbar */}
      <header className="glass-card sticky top-0 z-30 border-b border-slate-800 rounded-none rounded-b-2xl mb-8 mx-4 sm:mx-6 mt-2 max-w-6xl xl:mx-auto py-3">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={BsuLogoImg} alt="BSU" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-lg font-display text-white tracking-tight leading-none">PractiLog</h1>
              <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">BSU · {TARGET}-HOUR JOURNAL</p>
            </div>
          </div>

          {profile && <ProfileStrip profile={profile} onEdit={() => setShowProfileSetup(true)} />}

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>

          <div className="hidden sm:flex items-center gap-3 flex-1 max-w-xs ml-4">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-accent transition-all duration-1000 ease-out"
                style={{ width: progressWidth, boxShadow: "0 0 10px rgba(99,102,241,0.8)" }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-300 tabular-nums whitespace-nowrap">
              {stats.totalRendered.toFixed(0)} / {TARGET} h
            </span>
          </div>

          <button
            onClick={openAdd}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-semibold hover:bg-accent hover:text-white active:scale-95 transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Entry
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 space-y-10">

        {/* Completion banner */}
        {stats.percentComplete >= 100 && (
          <div className="glass-card !bg-emerald-900/20 !border-emerald-500/30 px-6 py-5 flex items-center gap-4">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-display font-semibold text-lg text-emerald-300">Internship complete!</p>
              <p className="text-sm text-emerald-400/80 mt-0.5">
                You've logged all {TARGET} required hours. Congratulations!
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-5 ml-1">Overview</h2>
          <StatsCard stats={stats} target={TARGET} />
        </section>

        {/* Master progress bar */}
        <section className="glass-card px-7 py-6 hover:!translate-y-0">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h3 className="text-base font-display text-white">Total Progress</h3>
              <p className="text-sm text-slate-400 mt-1 tabular-nums">
                {stats.remaining > 0 ? `${stats.remaining.toFixed(1)} hours remaining` : "All hours completed!"}
              </p>
            </div>
            <span className="text-4xl font-display font-bold text-accent tabular-nums drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">
              {stats.percentComplete}%
            </span>
          </div>

          <div className="relative h-4 bg-slate-800/80 rounded-full overflow-hidden shadow-inner border border-slate-700/50">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-600 to-accent transition-all duration-1000 ease-out"
              style={{ width: progressWidth }}
            >
              <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white/30 to-transparent" />
            </div>
            {[25, 50, 75].map((pct) => (
              <div key={pct} className="absolute inset-y-0 w-px bg-slate-700" style={{ left: `${pct}%` }} />
            ))}
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 font-medium mt-3 px-1">
            <span>0 h</span>
            <span>{TARGET * 0.25} h</span>
            <span>{TARGET * 0.5} h</span>
            <span>{TARGET * 0.75} h</span>
            <span>{TARGET} h</span>
          </div>
        </section>

        {/* Analytics */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-5 ml-1">Analytics</h2>
          <Charts logs={logs} />
        </section>

        {/* Log table */}
        <section>
          <div className="flex items-center justify-between mb-5 ml-1">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Activity Log</h2>
            <span className="text-xs text-slate-400 font-medium bg-surface px-2.5 py-1 rounded-full border border-slate-700/50">
              {logs.length} total entr{logs.length !== 1 ? "ies" : "y"}
            </span>
          </div>
          <TimeLogTable
            logs={logs}
            onEdit={openEdit}
            onDelete={(id) => setDeleteTarget(logs.find((l) => l.id === id) || null)}
          />
        </section>
      </main>

      {/* Profile Setup Modal */}
      {showProfileSetup && (
        <TraineeProfile
          onSave={handleProfileSave}
          onCancel={profile ? () => setShowProfileSetup(false) : undefined}
          canCancel={!!profile}
        />
      )}

      {/* Delete Confirmation Modal — replaces window.confirm */}
      {deleteTarget && (
        <DeleteConfirmModal
          entryDate={deleteTarget.date}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Footer */}
      <footer className="text-center py-10 text-xs text-slate-600 font-medium border-t border-slate-800/50 mt-10">
        PractiLog &middot; {new Date().getFullYear()} &middot; Built with React + TypeScript + Supabase
      </footer>

      {/* Log Entry Modal */}
      <LogForm
        isOpen={modalOpen}
        mode={modalMode}
        initial={editTarget}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="glass-card !rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl border-slate-700/80 bg-surface/90">
            <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${toast.type === "success" ? "bg-emerald-400 shadow-emerald-400/50" :
                toast.type === "edit" ? "bg-accent shadow-accent/50" :
                  "bg-red-400 shadow-red-400/50"
              }`} />
            <span className="text-sm font-medium text-slate-200">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}