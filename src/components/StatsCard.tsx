import React from "react";
import type { HoursCalcResult } from "../hooks/useHoursCalc";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatItem {
    id: string;
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ReactNode;
    accent: "indigo" | "emerald" | "amber";
    /** 0–100 fill for the mini arc/progress; omit to hide */
    fill?: number;
}

interface StatsCardProps {
    stats: Pick<
        HoursCalcResult,
        | "totalRendered"
        | "remaining"
        | "percentComplete"
        | "estimatedCompletionDate"
        | "avgHoursPerDay"
        | "workingDaysLogged"
        | "holidayCount"
    >;
    /** Total hours required — defaults to 500 */
    target?: number;
}

// ─── SVG Mini-Arc ─────────────────────────────────────────────────────────────

interface MiniArcProps {
    percent: number;
    accent: StatItem["accent"];
}

const arcColorStroke: Record<StatItem["accent"], string> = {
    indigo: "#818cf8", // lighter indigo
    emerald: "#34d399",
    amber: "#fbbf24",
};

function MiniArc({ percent, accent }: MiniArcProps) {
    const r = 22;
    const cx = 28;
    const cy = 28;
    const circumference = 2 * Math.PI * r;
    const dashOffset = circumference - (percent / 100) * circumference;

    const [offset, setOffset] = React.useState(circumference);
    
    React.useEffect(() => {
        // Trigger animation after mount
        const t = setTimeout(() => setOffset(dashOffset), 50);
        return () => clearTimeout(t);
    }, [dashOffset]);

    return (
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
            {/* Track */}
            <circle
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke="currentColor"
                className="text-slate-700/50"
                strokeWidth="5"
            />
            {/* Fill */}
            <circle
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={arcColorStroke[accent]}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
        </svg>
    );
}

// ─── Icons (inline SVG to keep zero dependencies) ────────────────────────────

const IconClock = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const IconTarget = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

const IconTrendUp = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

// ─── Single Card ──────────────────────────────────────────────────────────────

function Card({ item }: { item: StatItem }) {
    return (
        <div className="glass-card relative flex flex-col justify-between p-6 overflow-hidden group">

            {/* Subtle corner decoration */}
            <div
                className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full mix-blend-screen opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
                style={{ background: arcColorStroke[item.accent] }}
            />

            {/* Header */}
            <div className="flex items-start justify-between mb-4 relative z-10">
                <span className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 shadow-sm backdrop-blur-md ${
                    item.accent === 'indigo' ? 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30' :
                    item.accent === 'emerald' ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' :
                    'bg-amber-500/10 text-amber-300 ring-amber-500/30'
                }`}>
                    <span className={item.accent === 'indigo' ? 'text-indigo-400' : item.accent === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}>{item.icon}</span>
                    {item.label}
                </span>

                {item.fill !== undefined && (
                    <MiniArc percent={item.fill} accent={item.accent} />
                )}
            </div>

            {/* Value */}
            <div className="relative z-10">
                <p className="font-display text-4xl font-bold tracking-tight text-white drop-shadow-sm tabular-nums">
                    {item.value}
                </p>
                {item.sub && (
                    <p className="mt-1.5 text-[13px] text-slate-400 font-medium leading-snug">{item.sub}</p>
                )}
            </div>

            {/* Bottom micro-progress bar */}
            {item.fill !== undefined && (
                <div className="mt-6 relative z-10">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-2">
                        <span>Progress</span>
                        <span className="text-slate-300 tabular-nums">{item.fill}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800/80 shadow-inner border border-slate-700/50 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${
                                item.accent === 'indigo' ? 'bg-gradient-to-r from-indigo-600 to-indigo-400' :
                                item.accent === 'emerald' ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                                'bg-gradient-to-r from-amber-600 to-amber-400'
                            } transition-all duration-1000 ease-out`}
                            style={{ width: `${item.fill}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── StatsCard (Grid) ─────────────────────────────────────────────────────────

/**
 * Renders three stat cards derived from `useHoursCalc`.
 *
 * Layout: a responsive 3-column grid (stacks to 1-col on mobile).
 */
export function StatsCard({ stats, target = 500 }: StatsCardProps) {
    const {
        totalRendered,
        remaining,
        percentComplete,
        estimatedCompletionDate,
        avgHoursPerDay,
        workingDaysLogged,
        holidayCount,
    } = stats;

    const items: StatItem[] = [
        {
            id: "rendered",
            label: "Hours Rendered",
            value: `${totalRendered.toFixed(1)} h`,
            sub: `${workingDaysLogged} working day${workingDaysLogged !== 1 ? "s" : ""} logged  ·  ${holidayCount} holiday${holidayCount !== 1 ? "s" : ""}`,
            icon: <IconClock />,
            accent: "indigo",
            fill: percentComplete,
        },
        {
            id: "remaining",
            label: "Hours Remaining",
            value: `${remaining.toFixed(1)} h`,
            sub: estimatedCompletionDate
                ? `Est. completion: ${estimatedCompletionDate}`
                : "🎉 Target achieved!",
            icon: <IconTarget />,
            accent: remaining === 0 ? "emerald" : "amber",
        },
        {
            id: "percent",
            label: "Completion",
            value: `${percentComplete}%`,
            sub: `Avg ${avgHoursPerDay} h/day  ·  Goal: ${target} h`,
            icon: <IconTrendUp />,
            accent: percentComplete >= 100 ? "emerald" : "indigo",
            fill: percentComplete,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
                <Card key={item.id} item={item} />
            ))}
        </div>
    );
}