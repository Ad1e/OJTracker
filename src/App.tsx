import { useState, useCallback } from "react";
import { useHoursCalc, type LogEntry } from "./hooks/useHoursCalc";
import { StatsCard } from "./components/StatsCard";
import { TimeLogTable } from "./components/TimeLogTable";
import { LogForm } from "./components/LogForm";
import seedData from "./data/journalData.json";

// ─── Seed data cast ───────────────────────────────────────────────────────────

const rawEntries = (seedData as any).entries || [];
const seed: LogEntry[] = rawEntries.map((e: any) => ({
  ...e,
  id: `log-${e.day}`,
}));

// ─── ID helper ────────────────────────────────────────────────────────────────

function genId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>(seed);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editTarget, setEditTarget] = useState<LogEntry | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ id: number, message: string, type: "success" | "edit" | "delete" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "edit" | "delete") => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(current => current?.id === id ? null : current);
    }, 3000);
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useHoursCalc(logs);
  const TARGET = 500;

  // ── Handlers ───────────────────────────────────────────────────────────────
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
    (data: Omit<LogEntry, "id" | "day"> & { id?: string; day?: number }) => {
      if (data.id) {
        // Update existing
        setLogs((prev) =>
          prev.map((l) => (l.id === data.id ? { ...l, ...data, id: l.id, day: l.day } : l))
        );
        showToast("Entry updated successfully", "edit");
      } else {
        // Append new
        // Auto-assign a day based on array length or max day for now (as demonstration)
        const nextDay = logs.length > 0 ? Math.max(...logs.map(l => l.day || 0)) + 1 : 1;
        setLogs((prev) => [...prev, { ...data, id: genId(), day: nextDay }]);
        showToast("New entry added", "success");
      }
    },
    [logs, showToast]
  );

  const handleDelete = useCallback((id: string) => {
    if (window.confirm("Delete this log entry?")) {
      setLogs((prev) => prev.filter((l) => l.id !== id));
      showToast("Entry deleted", "delete");
    }
  }, [showToast]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const progressWidth = `${Math.min(100, stats.percentComplete)}%`;

  return (
    <div className="min-h-screen bg-background text-slate-300 font-sans selection:bg-accent/30">

      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className="glass-card sticky top-0 z-30 border-b-0 rounded-none rounded-b-2xl mb-8 mx-4 sm:mx-6 mt-2 max-w-6xl xl:mx-auto">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Logo mark */}
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-display text-white tracking-tight leading-none">InternTrack</h1>
              <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">500-HOUR JOURNAL</p>
            </div>
          </div>

          {/* Header progress pill */}
          <div className="hidden sm:flex items-center gap-3 flex-1 max-w-xs ml-4">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full bg-accent transition-all duration-1000 ease-out`}
                style={{ width: progressWidth, boxShadow: '0 0 10px rgba(99, 102, 241, 0.8)' }}
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Entry
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 space-y-10">

        {/* Banner: show when complete */}
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

        {/* ── Stats grid ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-5 ml-1">
            Overview
          </h2>
          <StatsCard stats={stats} target={TARGET} />
        </section>

        {/* ── Master progress bar ─────────────────────────────────────── */}
        <section className="glass-card px-7 py-6 group hover:!translate-y-0">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h3 className="text-base font-display text-white">Total Progress</h3>
              <p className="text-sm text-slate-400 mt-1">
                {stats.remaining > 0
                  ? `${stats.remaining.toFixed(1)} hours remaining`
                  : "All hours completed!"}
              </p>
            </div>
            <span className="text-4xl font-display font-bold text-accent tabular-nums drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">
              {stats.percentComplete}%
            </span>
          </div>

          {/* Segmented bar */}
          <div className="relative h-4 bg-slate-800/80 rounded-full overflow-hidden shadow-inner border border-slate-700/50">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-600 to-accent transition-all duration-1000 ease-out"
              style={{ width: progressWidth }}
            >
              <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white/30 to-transparent" />
            </div>
            {/* 25 / 50 / 75% tick marks */}
            {[25, 50, 75].map((pct) => (
              <div
                key={pct}
                className="absolute inset-y-0 w-px bg-slate-700 pointer-events-none"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 font-medium mt-3 px-1">
            <span>0 h</span>
            <span>125 h</span>
            <span>250 h</span>
            <span>375 h</span>
            <span>{TARGET} h</span>
          </div>
        </section>

        {/* ── Log table ───────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5 ml-1">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Activity Log
            </h2>
            <span className="text-xs text-slate-400 font-medium bg-surface px-2.5 py-1 rounded-full border border-slate-700/50">
              {logs.length} total entr{logs.length !== 1 ? "ies" : "y"}
            </span>
          </div>
          <TimeLogTable
            logs={logs}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="text-center py-10 text-xs text-slate-600 font-medium border-t border-slate-800/50 mt-10">
        InternTrack &middot; {new Date().getFullYear()} &middot; Built with React + TypeScript
      </footer>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      <LogForm
        isOpen={modalOpen}
        mode={modalMode}
        initial={editTarget}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
      />

      {/* ── Toast Notification ────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
            <div className="glass-card !rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl border-slate-700/80 bg-surface/90">
                <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                    toast.type === 'success' ? 'bg-emerald-400 shadow-emerald-400/50' :
                    toast.type === 'edit' ? 'bg-accent shadow-accent/50' :
                    'bg-red-400 shadow-red-400/50'
                }`} />
                <span className="text-sm font-medium text-slate-200">{toast.message}</span>
            </div>
        </div>
      )}
    </div>
  );
}