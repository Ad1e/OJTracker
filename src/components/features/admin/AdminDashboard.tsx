// ─── src/components/features/admin/AdminDashboard.tsx ────────────────────────
// Admin panel: intern roster list, summary stat bar, and per-intern detail view.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo }        from "react";
import type { InternSummary, AdminStats, InternStatus } from "../../../hooks/use-admin-interns";
import BsuLogoImg                   from "../../../assets/bsu-logo.png";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InternStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  "on-track":  { label: "On Track",  dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  "at-risk":   { label: "At Risk",   dot: "bg-amber-400",   text: "text-amber-300",   bg: "bg-amber-500/10",  border: "border-amber-500/20"  },
  "behind":    { label: "Behind",    dot: "bg-red-400",     text: "text-red-300",     bg: "bg-red-500/10",    border: "border-red-500/20"    },
  "completed": { label: "Completed", dot: "bg-indigo-400",  text: "text-indigo-300",  bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
};

function StatusBadge({ status }: { status: InternStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Progress bar (mini) ──────────────────────────────────────────────────────

function MiniProgress({ pct }: { pct: number }) {
  const color = pct >= 100 ? "from-indigo-500 to-violet-400"
              : pct >= 60  ? "from-emerald-600 to-emerald-400"
              : pct >= 30  ? "from-amber-600 to-amber-400"
              : "from-red-700 to-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 tabular-nums w-9 text-right shrink-0">{pct}%</span>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ stats }: { stats: AdminStats }) {
  const cards = [
    { value: stats.totalInterns,                      label: "Interns Enrolled",  icon: "👥", accent: "text-slate-200"   },
    { value: stats.completed,                         label: "Completed",          icon: "✅", accent: "text-indigo-300" },
    { value: stats.atRisk + stats.behind,             label: "Need Attention",     icon: "⚠️", accent: "text-amber-300"  },
    { value: `${stats.totalHoursLogged.toFixed(0)}h`, label: "Total Hours Logged", icon: "⏱️", accent: "text-emerald-300"},
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className="glass-card px-5 py-4 hover:!translate-y-0 flex items-center gap-4">
          <span className="text-2xl">{c.icon}</span>
          <div>
            <p className={`text-2xl font-display font-bold tabular-nums ${c.accent}`}>{c.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Intern Detail Panel ──────────────────────────────────────────────────────

function InternDetail({ intern, onClose }: { intern: InternSummary; onClose: () => void }) {
  const cfg = STATUS_CONFIG[intern.status];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 h-full w-full max-w-xl bg-slate-900 border-l border-slate-700/60 overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ animation: "slideInRight 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-lg font-bold text-accent">
              {intern.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-display font-semibold text-white">{intern.name}</h2>
              <p className="text-xs text-slate-500">{intern.internId} · {intern.companyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status + hours hero */}
          <div className={`rounded-2xl p-5 border ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Overall Status</p>
                <StatusBadge status={intern.status} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Started</p>
                <p className="text-sm font-semibold text-slate-300">{fmtDate(intern.enrolledAt)}</p>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold text-white tabular-nums">{intern.hoursRendered}h rendered</span>
                <span className="tabular-nums">{intern.requiredHours}h required</span>
              </div>
              <div className="h-3 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-400 transition-all duration-700"
                  style={{ width: `${intern.percentComplete}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-600">
                <span>0</span><span>{intern.requiredHours * 0.5}h</span><span>{intern.requiredHours}h</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-right tabular-nums">
              {intern.percentComplete >= 100
                ? "🎉 All required hours completed!"
                : `${(intern.requiredHours - intern.hoursRendered).toFixed(1)}h remaining`}
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Days Worked",  value: intern.totalDays,                             accent: "text-slate-200"  },
              { label: "Hours Done",   value: `${intern.hoursRendered.toFixed(1)}h`,         accent: "text-indigo-300" },
              { label: "Remaining",    value: `${(intern.requiredHours - intern.hoursRendered).toFixed(1)}h`, accent: intern.percentComplete >= 100 ? "text-emerald-300" : "text-amber-300" },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-3 text-center">
                <p className={`text-xl font-display font-bold tabular-nums ${s.accent}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Info grid */}
          <div className="glass-card !rounded-xl hover:!translate-y-0 divide-y divide-slate-700/40 overflow-hidden">
            {[
              { label: "Intern ID",       value: intern.internId },
              { label: "Company",         value: intern.companyName },
              { label: "Enrolled",        value: fmtDate(intern.enrolledAt) },
              { label: "Last Active",     value: relativeTime(intern.lastActive) },
              { label: "Required Hours",  value: `${intern.requiredHours}h` },
              { label: "Hours Rendered",  value: `${intern.hoursRendered}h` },
            ].map(row => (
              <div key={row.label} className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className="text-xs font-semibold text-slate-200">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Flags — only status-based since late/absent tracking is not in schema */}
          {intern.status === "behind" && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">⚠️ Flags</p>
              <ul className="space-y-2">
                <li className="text-xs text-slate-300">• <span className="text-red-300 font-semibold">Behind schedule</span> — projected to miss target hours</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Intern Roster Table ──────────────────────────────────────────────────────

type SortKey = "name" | "hoursRendered" | "percentComplete" | "lastActive" | "status";

function InternRoster({ interns, onSelect }: { interns: InternSummary[]; onSelect: (i: InternSummary) => void }) {
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<InternStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let list = interns.filter(i =>
      (filter === "all" || i.status === filter) &&
      (search === "" || i.name.toLowerCase().includes(search.toLowerCase()) || i.internId.includes(search))
    );
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name")           cmp = a.name.localeCompare(b.name);
      if (sortKey === "hoursRendered")  cmp = a.hoursRendered  - b.hoursRendered;
      if (sortKey === "percentComplete")cmp = a.percentComplete- b.percentComplete;
      if (sortKey === "lastActive")     cmp = (a.lastActive ?? "").localeCompare(b.lastActive ?? "");
      if (sortKey === "status")         cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [interns, search, filter, sortKey, sortAsc]);

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      {label} {sortKey === k ? (sortAsc ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div className="glass-card overflow-hidden hover:!translate-y-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-700/50 bg-slate-800/30">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            id="admin-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "on-track", "at-risk", "behind", "completed"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filter === f ? "bg-accent text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"}`}
            >
              {f === "all" ? "All" : f.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/40 bg-slate-800/20">
              <Th label="Name"       k="name" />
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden md:table-cell">Intern ID</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden lg:table-cell">Start Date</th>
              <Th label="Hours"      k="hoursRendered" />
              <Th label="Progress"   k="percentComplete" />
              <Th label="Status"     k="status" />
              <Th label="Last Active" k="lastActive" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500 text-sm">No interns match your filter.</td></tr>
            )}
            {filtered.map(intern => (
              <tr
                key={intern.id}
                onClick={() => onSelect(intern)}
                className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center text-sm font-bold text-accent shrink-0 group-hover:bg-accent/20 transition-colors">
                      {intern.name.charAt(0)}
                    </div>
                    <span className="font-medium text-white">{intern.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-slate-500 font-mono text-xs hidden md:table-cell">{intern.internId}</td>
                <td className="px-4 py-3.5 text-slate-400 text-xs hidden lg:table-cell">{fmtDate(intern.enrolledAt)}</td>
                <td className="px-4 py-3.5">
                  <span className="tabular-nums text-slate-300 font-semibold">{intern.hoursRendered}</span>
                  <span className="text-slate-600 text-xs"> / {intern.requiredHours}h</span>
                </td>
                <td className="px-4 py-3.5 min-w-[120px]">
                  <MiniProgress pct={intern.percentComplete} />
                </td>
                <td className="px-4 py-3.5"><StatusBadge status={intern.status} /></td>
                <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{relativeTime(intern.lastActive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-slate-700/40 bg-slate-800/20">
        <p className="text-[10px] text-slate-600">
          Showing {filtered.length} of {interns.length} interns · Click a row to view details
        </p>
      </div>
    </div>
  );
}

// ─── Admin Dashboard (main export) ───────────────────────────────────────────

interface AdminDashboardProps {
  interns:  InternSummary[];
  stats:    AdminStats;
  loading:  boolean;
  error:    string | null;
  onLogout: () => void;
}

export function AdminDashboard({ interns, stats, loading, error, onLogout }: AdminDashboardProps) {
  const [selected, setSelected] = useState<InternSummary | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-3 text-slate-400">
        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" /></svg>
        <span className="text-sm font-medium">Loading intern roster…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card max-w-sm p-8 text-center">
          <p className="text-red-400 text-sm font-medium mb-2">Failed to load interns</p>
          <p className="text-slate-500 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Slide-in panel keyframe */}
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      <div className="min-h-screen bg-background text-slate-300 font-sans selection:bg-accent/30">

        {/* Topbar */}
        <header className="glass-card sticky top-0 z-30 border-b border-slate-800 rounded-none rounded-b-2xl mb-8 mx-4 sm:mx-6 mt-2 max-w-6xl xl:mx-auto py-3">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={BsuLogoImg} alt="BSU" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-lg font-display text-white tracking-tight leading-none">SpartaShift</h1>
                <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">Admin · Supervisor Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Admin Mode
              </span>
              <button
                id="admin-logout"
                onClick={onLogout}
                title="Sign out"
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
          {/* Page title */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Overview</h2>
            <p className="text-xl font-display font-bold text-white">Intern Roster</p>
          </div>

          {/* Stats bar */}
          <StatsBar stats={stats} />

          {/* Roster */}
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 ml-1">All Interns</h2>
            <InternRoster interns={interns} onSelect={setSelected} />
          </section>
        </main>

        <footer className="text-center py-10 text-xs text-slate-600 font-medium border-t border-slate-800/50 mt-10">
          SpartaShift Admin &middot; {new Date().getFullYear()} &middot; Supervisor View
        </footer>

        {/* Detail panel */}
        {selected && <InternDetail intern={selected} onClose={() => setSelected(null)} />}
      </div>
    </>
  );
}
