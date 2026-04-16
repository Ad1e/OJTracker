import { useState, useCallback } from "react";
import { useHoursCalc, type LogEntry } from "./hooks/useHoursCalc";
import { StatsCard } from "./components/StatsCard";
import { TimeLogTable } from "./components/TimeLogTable";
import { LogForm } from "./components/LogForm";
import seedData from "./data/journalData.json";

// ─── Seed data cast ───────────────────────────────────────────────────────────

const seed: LogEntry[] = (seedData as LogEntry[]);

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
    (data: Omit<LogEntry, "id"> & { id?: string }) => {
      if (data.id) {
        // Update existing
        setLogs((prev) =>
          prev.map((l) => (l.id === data.id ? { ...l, ...data, id: l.id } : l))
        );
      } else {
        // Append new
        setLogs((prev) => [...prev, { ...data, id: genId() }]);
      }
    },
    []
  );

  const handleDelete = useCallback((id: string) => {
    if (window.confirm("Delete this log entry?")) {
      setLogs((prev) => prev.filter((l) => l.id !== id));
    }
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const progressWidth = `${Math.min(100, stats.percentComplete)}%`;
  const progressColor =
    stats.percentComplete >= 100
      ? "bg-emerald-500"
      : stats.percentComplete >= 60
        ? "bg-indigo-500"
        : "bg-indigo-400";

  return (
    <div className="min-h-screen bg-slate-100 font-sans">

      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-none">InternTrack</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">500-Hour Internship Journal</p>
            </div>
          </div>

          {/* Header progress pill */}
          <div className="hidden sm:flex items-center gap-3 flex-1 max-w-xs">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${progressColor} transition-all duration-700`}
                style={{ width: progressWidth }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600 tabular-nums whitespace-nowrap">
              {stats.totalRendered.toFixed(0)} / {TARGET} h
            </span>
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200"
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Banner: show when complete */}
        {stats.percentComplete >= 100 && (
          <div className="rounded-2xl bg-emerald-600 text-white px-6 py-4 flex items-center gap-3 shadow-md">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-base">Internship complete!</p>
              <p className="text-sm opacity-80">
                You've logged all {TARGET} required hours. Congratulations!
              </p>
            </div>
          </div>
        )}

        {/* ── Stats grid ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Overview
          </h2>
          <StatsCard stats={stats} target={TARGET} />
        </section>

        {/* ── Master progress bar ─────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-700">Total Progress</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {stats.remaining > 0
                  ? `${stats.remaining.toFixed(1)} hours remaining`
                  : "All hours completed!"}
              </p>
            </div>
            <span className="text-3xl font-extrabold text-indigo-600 tabular-nums">
              {stats.percentComplete}%
            </span>
          </div>

          {/* Segmented bar */}
          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${progressColor} transition-all duration-1000`}
              style={{ width: progressWidth }}
            />
            {/* 25 / 50 / 75% tick marks */}
            {[25, 50, 75].map((pct) => (
              <div
                key={pct}
                className="absolute inset-y-0 w-px bg-white/60"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-2">
            <span>0 h</span>
            <span>125 h</span>
            <span>250 h</span>
            <span>375 h</span>
            <span>{TARGET} h</span>
          </div>
        </section>

        {/* ── Log table ───────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Activity Log
            </h2>
            <span className="text-xs text-slate-400">
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
      <footer className="text-center py-8 text-xs text-slate-400">
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
    </div>
  );
}