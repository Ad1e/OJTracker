// ─── src/pages/AdminInternView.tsx ───────────────────────────────────────────
// Admin viewing a specific intern's full log history.
// Route: /admin/interns/:userId  (AdminRoute guard enforces admin-only access)
// ─────────────────────────────────────────────────────────────────────────────
import { useParams, Link }   from "react-router-dom";
import { useEntries }        from "../hooks/use-entries";
import { useHoursCalc }      from "../hooks/use-hours-calc";
import { TimeLogTable }      from "../components/features/attendance";

const DEFAULT_REQUIRED = 500;

export default function AdminInternView() {
  const { userId }                               = useParams<{ userId: string }>();
  // overrideUserId — tells useEntries to scope to this specific intern
  // (admin can see any row; RLS allows it)
  const { entries, loading, error }              = useEntries(userId ?? null);
  const stats                                    = useHoursCalc(entries, DEFAULT_REQUIRED);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-3 text-slate-400">
        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
        </svg>
        <span className="text-sm font-medium">Loading intern data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card max-w-sm p-8 text-center">
          <p className="text-red-400 text-sm font-medium mb-4">{error}</p>
          <Link to="/admin" className="text-accent hover:underline text-sm">← Back to Admin</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-slate-300 font-sans">
      <header className="glass-card sticky top-0 z-30 border-b border-slate-800 rounded-none px-6 py-4 flex items-center gap-4">
        <Link to="/admin" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Roster
        </Link>
        <div className="h-4 w-px bg-slate-700" />
        <h1 className="text-sm font-display font-semibold text-white">Intern Log View</h1>
        <span className="ml-auto text-xs text-slate-500 font-mono">{userId}</span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Hours Rendered",  value: `${stats.totalRendered.toFixed(1)} h` },
            { label: "Remaining",       value: `${stats.remaining.toFixed(1)} h` },
            { label: "Completion",      value: `${stats.percentComplete}%` },
          ].map((s) => (
            <div key={s.label} className="glass-card p-5 hover:!translate-y-0">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-display font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Log table (read-only for admin — no edit/delete handlers) */}
        <TimeLogTable
          logs={entries}
          onEdit={() => undefined}
          onDelete={() => undefined}
        />
      </main>
    </div>
  );
}
