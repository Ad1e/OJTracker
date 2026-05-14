import { useMemo } from "react";
import type { LogEntry } from "../types";
import { parseLocalDate } from "../hooks/use-hours-calc";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartsProps {
    logs: LogEntry[];
    target?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
        month: "short", day: "numeric", year: "numeric", ...opts,
    });
}

/** Add n Mon–Thu working days — timezone-safe (uses local date getters). */
function addWorkingDays(fromIso: string, days: number): string {
    const [y, m, d] = fromIso.split("-").map(Number);
    const cur = new Date(y, m - 1, d);
    let added = 0;
    while (added < days) {
        cur.setDate(cur.getDate() + 1);
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 5 && dow !== 6) added++;
    }
    const yy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, "0");
    const dd = String(cur.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}

// ─── Keyframes (injected once) ────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(167,139,250,0.8); }
  70%  { box-shadow: 0 0 0 8px rgba(167,139,250,0); }
  100% { box-shadow: 0 0 0 0 rgba(167,139,250,0); }
}
@keyframes shimmer-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(500%); }
}
`;

// ─── 1. Completion Predictor ──────────────────────────────────────────────────

function CompletionPredictor({ logs, target }: { logs: LogEntry[]; target: number }) {
    const info = useMemo(() => {
        const work = [...logs]
            .filter((e) => !e.isHoliday)
            .sort((a, b) => a.date.localeCompare(b.date));

        if (work.length === 0) return null;

        const totalHours = parseFloat(work.reduce((s, e) => s + e.hoursWorked, 0).toFixed(2));
        const remaining  = parseFloat(Math.max(0, target - totalHours).toFixed(2));
        const avgPerDay  = parseFloat((totalHours / work.length).toFixed(2));
        const daysNeeded = remaining > 0 ? Math.ceil(remaining / avgPerDay) : 0;
        const pct        = parseFloat(Math.min(100, (totalHours / target) * 100).toFixed(1));

        const startDate  = work[0].date;

        // Always project from TODAY so pre-filled future entries don't skew the date
        const todayObj = new Date();
        const todayIso = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;
        const estEndDate = remaining > 0 ? addWorkingDays(todayIso, daysNeeded) : todayIso;

        const [sy, sm, sd] = startDate.split("-").map(Number);
        const calDays = Math.round((Date.now() - new Date(sy, sm - 1, sd).getTime()) / 86_400_000);

        return { totalHours, remaining, avgPerDay, daysNeeded, pct, startDate, estEndDate, calDays, workDays: work.length, done: remaining === 0 };
    }, [logs, target]);

    if (!info) return null;

    // "Today" marker: clamp so label never overflows the edges
    const todayLeft = Math.min(92, Math.max(8, info.pct));

    return (
        <div className="glass-card overflow-hidden hover:!translate-y-0">

            {/* ── HERO: Est. finish ───────────────────────────────────────── */}
            <div className="relative px-7 pt-7 pb-6 bg-gradient-to-br from-slate-800/70 to-slate-900/90 border-b border-slate-700/50 overflow-hidden">
                {/* ambient glow blobs */}
                <div className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 rounded-full bg-violet-600/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-indigo-600/8 blur-2xl" />

                <div className="relative flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                            🗓️ Estimated Internship End
                        </p>
                        <p
                            className={`text-4xl font-display font-bold tracking-tight leading-none ${info.done ? "text-emerald-300" : "text-amber-300"}`}
                            style={{ textShadow: info.done ? "0 0 24px rgba(52,211,153,0.5)" : "0 0 24px rgba(251,191,36,0.4)" }}
                        >
                            {fmtDate(info.estEndDate, { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-sm text-slate-400 mt-2">
                            {info.done
                                ? "🎉 You've completed all required hours!"
                                : `${info.daysNeeded} Mon–Thu working days remaining`}
                        </p>
                    </div>

                    <div className="shrink-0 text-right">
                        <div className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border ${info.done
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"}`}>
                            <span className={`w-2 h-2 rounded-full ${info.done ? "bg-emerald-400" : "bg-indigo-400 animate-pulse"}`} />
                            {info.pct}%
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">{info.totalHours}h / {target}h</p>
                        <p className="text-[11px] text-slate-600 mt-0.5 tabular-nums">{info.remaining}h left</p>
                    </div>
                </div>
            </div>

            <div className="px-7 py-6 space-y-8">

                {/* ── PROGRESS BAR ─────────────────────────────────────────── */}
                <div>
                    <div className="relative h-7 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                        {/* Fill */}
                        <div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-600 via-violet-500 to-violet-400 transition-all duration-1000 ease-out overflow-hidden"
                            style={{ width: `${info.pct}%`, minWidth: info.pct > 0 ? "2.5rem" : 0 }}
                        >
                            {/* Shimmer sweep */}
                            <div
                                className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                                style={{ animation: "shimmer-slide 2.5s linear infinite" }}
                            />
                        </div>

                        {/* Pulsing dot at tip */}
                        {!info.done && (
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-violet-300 border-2 border-slate-900 z-10 transition-all duration-1000"
                                style={{
                                    left: `calc(${info.pct}% - 10px)`,
                                    animation: "pulse-ring 1.4s ease-in-out infinite",
                                }}
                            />
                        )}

                        {/* Centered % label */}
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow select-none z-20">
                            {info.totalHours}h rendered &nbsp;·&nbsp; {info.pct}%
                        </span>
                    </div>

                    {/* Tick marks */}
                    <div className="flex justify-between text-[10px] text-slate-700 mt-1.5 px-1 tabular-nums">
                        <span>0</span>
                        <span>{target * 0.25}h</span>
                        <span>{target * 0.5}h</span>
                        <span>{target * 0.75}h</span>
                        <span>{target}h</span>
                    </div>
                </div>

                {/* ── MILESTONE TIMELINE ───────────────────────────────────── */}
                <div className="relative" style={{ height: "88px" }}>
                    {/* Grey track */}
                    <div className="absolute left-4 right-4" style={{ top: "20px", height: "3px", background: "rgba(71,85,105,0.5)", borderRadius: "9999px" }} />
                    {/* Green→indigo fill up to today */}
                    <div
                        className="absolute left-4 transition-all duration-1000"
                        style={{
                            top: "20px", height: "3px", borderRadius: "9999px",
                            width: `calc(${todayLeft}% - 1rem)`,
                            background: "linear-gradient(to right, #10b981, #6366f1)",
                        }}
                    />
                    {/* Dashed amber remainder */}
                    {!info.done && (
                        <div
                            className="absolute right-4"
                            style={{
                                top: "19px", height: "3px",
                                left: `calc(${todayLeft}% + 0rem)`,
                                borderTop: "3px dashed rgba(251,191,36,0.4)",
                            }}
                        />
                    )}

                    {/* ● STARTED — left edge */}
                    <div className="absolute" style={{ left: "0%", top: "8px" }}>
                        <div className="flex flex-col items-center gap-1.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(52,211,153,0.4)]">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            </div>
                            <div className="text-center" style={{ marginTop: "4px" }}>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Started</p>
                                <p className="text-xs font-semibold text-slate-300 mt-0.5 whitespace-nowrap">
                                    {fmtDate(info.startDate, { month: "short", day: "numeric" })}
                                </p>
                                <p className="text-[9px] text-slate-600 whitespace-nowrap">{info.calDays}d ago</p>
                            </div>
                        </div>
                    </div>

                    {/* ● TODAY — proportional position */}
                    <div className="absolute flex flex-col items-center" style={{ left: `${todayLeft}%`, top: "8px", transform: "translateX(-50%)" }}>
                        <div className="w-7 h-7 rounded-full bg-indigo-500/30 border-2 border-indigo-400 flex items-center justify-center shadow-[0_0_14px_rgba(99,102,241,0.6)] animate-pulse">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-300" />
                        </div>
                        <div className="text-center mt-1.5 whitespace-nowrap">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">Today</p>
                            <p className="text-xs font-semibold text-indigo-300 mt-0.5">
                                {new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                            </p>
                            <p className="text-[9px] text-slate-600">{info.workDays} days in</p>
                        </div>
                    </div>

                    {/* ○ EST. END — right edge */}
                    <div className="absolute flex flex-col items-end" style={{ right: "0%", top: "8px" }}>
                        <div className="flex flex-col items-center gap-1.5">
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${info.done
                                ? "bg-emerald-500/20 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                                : "bg-amber-500/10 border-amber-400/60 border-dashed shadow-[0_0_10px_rgba(251,191,36,0.25)]"}`}>
                                <span className={`w-2.5 h-2.5 rounded-full ${info.done ? "bg-emerald-400" : "bg-amber-400/70"}`} />
                            </div>
                            <div className="text-center mt-1.5">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500 whitespace-nowrap">Est. Finish</p>
                                <p className={`text-xs font-bold mt-0.5 whitespace-nowrap ${info.done ? "text-emerald-300" : "text-amber-300"}`}>
                                    {fmtDate(info.estEndDate, { month: "short", day: "numeric" })}
                                </p>
                                <p className="text-[9px] text-slate-600 whitespace-nowrap">
                                    {info.done ? "Done! 🎉" : `${info.daysNeeded} days left`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── STAT PILLS ───────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Avg pace", value: `${info.avgPerDay}h`, sub: "per work day", accent: "indigo" },
                        { label: "Days worked", value: `${info.workDays}`, sub: "Mon–Thu logged", accent: "slate" },
                        {
                            label: "Days to go",
                            value: info.done ? "Done!" : `${info.daysNeeded}`,
                            sub: info.done ? "🎉 All done" : "Mon–Thu days",
                            accent: info.done ? "emerald" : "amber",
                        },
                    ].map((s) => {
                        const colorMap: Record<string, string> = {
                            indigo: "text-indigo-300",
                            slate: "text-slate-200",
                            emerald: "text-emerald-300",
                            amber: "text-amber-300",
                        };
                        return (
                            <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-4 text-center">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">{s.label}</p>
                                <p className={`text-2xl font-display font-bold tabular-nums ${colorMap[s.accent]}`}>{s.value}</p>
                                <p className="text-[10px] text-slate-600 mt-1">{s.sub}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── 2. Weekly Breakdown ──────────────────────────────────────────────────────

function weekKey(dateStr: string): string {
    const d = parseLocalDate(dateStr);
    const day = d.getDay() || 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - day + 1);
    const yy = mon.getFullYear();
    const mm = String(mon.getMonth() + 1).padStart(2, "0");
    const dd = String(mon.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}

function WeeklyBreakdown({ logs, target }: { logs: LogEntry[]; target: number }) {
    const weeks = useMemo(() => {
        const map: Record<string, { label: string; hours: number; days: number; key: string }> = {};
        for (const e of logs) {
            if (e.isHoliday) continue;
            const key = weekKey(e.date);
            if (!map[key]) {
                const d = parseLocalDate(key);
                const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                map[key] = { key, label, hours: 0, days: 0 };
            }
            map[key].hours = parseFloat((map[key].hours + e.hoursWorked).toFixed(2));
            map[key].days++;
        }
        return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
    }, [logs]);

    const maxHours   = Math.max(...weeks.map((w) => w.hours), 1);
    const grandTotal = weeks.reduce((s, w) => s + w.hours, 0);
    const fullWeek   = 40;

    return (
        <div className="glass-card overflow-hidden hover:!translate-y-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <h3 className="text-sm font-display font-semibold text-white">Weekly Breakdown</h3>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">{weeks.length} weeks logged</span>
            </div>

            <div className="px-6 py-4 space-y-3">
                {weeks.map((w, i) => {
                    const barPct = (w.hours / maxHours) * 100;
                    const isFullWeek = w.hours >= fullWeek;
                    return (
                        <div key={w.key} className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-500 font-mono w-10 shrink-0 tabular-nums">Wk {i + 1}</span>
                            <span className="text-[10px] text-slate-600 w-14 shrink-0 hidden sm:block">{w.label}</span>
                            <div className="flex-1 h-6 bg-slate-800/80 rounded-lg overflow-hidden border border-slate-700/30 relative">
                                <div
                                    className={`h-full rounded-lg transition-all duration-700 ease-out ${isFullWeek
                                        ? "bg-gradient-to-r from-indigo-700 to-indigo-500"
                                        : "bg-gradient-to-r from-indigo-900 to-indigo-700"}`}
                                    style={{ width: `${barPct}%` }}
                                />
                                <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-semibold text-white/60">
                                    {w.days}d
                                </span>
                            </div>
                            <span className={`text-xs font-bold tabular-nums w-14 text-right shrink-0 ${isFullWeek ? "text-indigo-300" : "text-slate-500"}`}>
                                {w.hours.toFixed(1)}h
                            </span>
                        </div>
                    );
                })}

                {/* Grand total */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-700/40">
                    <span className="text-[10px] text-slate-500 font-bold uppercase w-10 shrink-0">Total</span>
                    <span className="w-14 shrink-0 hidden sm:block" />
                    <div className="flex-1 h-6 bg-slate-800/80 rounded-lg overflow-hidden border border-slate-700/30 relative">
                        <div
                            className="h-full rounded-lg bg-gradient-to-r from-violet-700 to-accent transition-all duration-700"
                            style={{ width: `${Math.min(100, (grandTotal / target) * 100)}%` }}
                        />
                        <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-semibold text-white/60">
                            of {target}h
                        </span>
                    </div>
                    <span className="text-sm font-display font-bold text-accent tabular-nums w-14 text-right shrink-0 drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]">
                        {grandTotal.toFixed(1)}h
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Named exports (used separately in App layout) ───────────────────────────

export function PredictorCard({ logs, target = 500 }: ChartsProps) {
    return (
        <>
            <style>{KEYFRAMES}</style>
            <CompletionPredictor logs={logs} target={target} />
        </>
    );
}

export function WeeklyCard({ logs, target = 500 }: ChartsProps) {
    return <WeeklyBreakdown logs={logs} target={target} />;
}

// ─── Combined (kept for backward compat) ─────────────────────────────────────

export function Charts({ logs, target = 500 }: ChartsProps) {
    return (
        <>
            <style>{KEYFRAMES}</style>
            <div className="space-y-6">
                <CompletionPredictor logs={logs} target={target} />
                <WeeklyBreakdown logs={logs} target={target} />
            </div>
        </>
    );
}