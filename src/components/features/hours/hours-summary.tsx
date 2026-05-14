// ─── src/components/features/hours/hours-summary.tsx ────────────────────────
// Renamed from HoursSummary.tsx. Import paths updated.
// Uses JournalWeek from src/types instead of inline interface.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import type { JournalWeek } from "../../../types";

interface HoursSummaryProps {
  weeks:        JournalWeek[];
  targetHours?: number;
}

export function HoursSummary({ weeks, targetHours = 500 }: HoursSummaryProps) {
  const summary = useMemo(() =>
    weeks.map((w) => ({ week: w.week, period: w.period, days: w.days.length, hours: w.totalHours })),
    [weeks]
  );

  const totalDays  = useMemo(() => summary.reduce((s, r) => s + r.days, 0), [summary]);
  const totalHours = useMemo(() => summary.reduce((s, r) => s + r.hours, 0), [summary]);
  const remaining  = Math.max(0, targetHours - totalHours);
  const daysNeeded = remaining > 0 ? Math.ceil(remaining / 10) : 0;

  const thClass = "px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400";
  const tdClass = "px-5 py-3 text-sm text-slate-300 border-b border-slate-700/40";

  return (
    <div className="space-y-6">
      {/* Weekly Table */}
      <div className="glass-card overflow-hidden hover:!translate-y-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50 bg-slate-800/30">
          <span className="text-xl">📊</span>
          <div>
            <h3 className="text-base font-display font-bold text-white">Hours Summary (Weeks 1–{weeks.length})</h3>
            <p className="text-xs text-slate-500 mt-0.5">Weekly breakdown · {totalDays} days total</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead className="bg-slate-800/50">
              <tr>
                <th className={thClass} style={{ width: "180px" }}>Week</th>
                <th className={`${thClass} text-center`} style={{ width: "100px" }}>Days</th>
                <th className={`${thClass} text-right`}  style={{ width: "120px" }}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row, idx) => (
                <tr key={row.week} className={`transition-colors hover:bg-slate-800/50 ${idx % 2 === 0 ? "bg-surface" : "bg-slate-800/20"}`}>
                  <td className={`${tdClass} font-semibold text-slate-200`}>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold flex items-center justify-center tabular-nums">{row.week}</span>
                      Week {row.week}
                    </span>
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5 ml-7">{row.period}</p>
                  </td>
                  <td className={`${tdClass} text-center tabular-nums`}>
                    <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-slate-700/50 text-slate-300 text-xs font-semibold">{row.days}</span>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                      row.hours >= 40 ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" :
                      row.hours >= 30 ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20" :
                      "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                    }`}>{row.hours.toFixed(2)}h</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800/70 border-t-2 border-slate-600/60 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
                <td className="px-5 py-4 text-sm font-display font-bold text-white uppercase tracking-wider">TOTAL</td>
                <td className="px-5 py-4 text-center tabular-nums"><span className="text-sm font-bold text-slate-200">{totalDays} days</span></td>
                <td className="px-5 py-4 text-right tabular-nums"><span className="text-lg font-display font-bold text-accent drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">{totalHours.toFixed(2)} hrs</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Remaining to Target */}
      <div className="glass-card overflow-hidden hover:!translate-y-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50 bg-slate-800/30">
          <span className="text-xl">⏳</span>
          <h3 className="text-base font-display font-bold text-white">Remaining to {targetHours} Hours</h3>
        </div>
        <div className="divide-y divide-slate-700/40">
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-sm text-slate-400">Hours completed</span>
            <span className="text-sm font-bold text-emerald-300 tabular-nums">{totalHours.toFixed(2)} hrs</span>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-sm text-slate-400">Hours remaining</span>
            <span className={`text-sm font-bold tabular-nums ${remaining === 0 ? "text-emerald-300" : "text-amber-300"}`}>
              {remaining === 0 ? "Completed! 🎉" : `${remaining.toFixed(2)} hrs`}
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-sm text-slate-400">Days needed <span className="text-slate-600">(10 hrs/day)</span></span>
            <span className={`text-sm font-bold tabular-nums ${daysNeeded === 0 ? "text-emerald-300" : "text-indigo-300"}`}>
              {daysNeeded === 0 ? "Done!" : `${daysNeeded} days`}
            </span>
          </div>
        </div>
        <div className="px-6 pb-6 pt-2">
          <div className="flex justify-between text-[11px] text-slate-500 mb-2">
            <span>{totalHours.toFixed(0)} hrs completed</span>
            <span>{targetHours} hrs target</span>
          </div>
          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-accent transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(100, (totalHours / targetHours) * 100)}%`, boxShadow: "0 0 8px rgba(99,102,241,0.5)" }}
            />
          </div>
          <p className="text-right text-xs text-slate-500 mt-1.5 tabular-nums">
            {((totalHours / targetHours) * 100).toFixed(1)}% complete
          </p>
        </div>
      </div>
    </div>
  );
}
