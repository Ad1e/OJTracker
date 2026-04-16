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

// ─── Accent maps ─────────────────────────────────────────────────────────────

const ringColor: Record<StatItem["accent"], string> = {
    indigo: "text-indigo-500",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
};

const badgeBg: Record<StatItem["accent"], string> = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
};

const progressTrack: Record<StatItem["accent"], string> = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
};

// ─── SVG Mini-Arc ─────────────────────────────────────────────────────────────

interface MiniArcProps {
    percent: number;
    accent: StatItem["accent"];
}

const arcColorStroke: Record<StatItem["accent"], string> = {
    indigo: "#6366f1",
    emerald: "#10b981",
    amber: "#f59e0b",
};

function MiniArc({ percent, accent }: MiniArcProps) {
    const r = 22;
    const cx = 28;
    const cy = 28;
    const circumference = 2 * Math.PI * r;
    const dashOffset = circumference - (percent / 100) * circumference;

    return (
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            {/* Track */}
            <circle
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke="#e2e8f0"
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
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
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
        <div className="relative flex flex-col justify-between rounded-2xl bg-white border border-slate-100 shadow-sm shadow-slate-100 p-6 overflow-hidden transition-shadow hover:shadow-md hover:shadow-slate-200">

            {/* Subtle corner decoration */}
            <div
                className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-[0.06]"
                style={{ background: arcColorStroke[item.accent] }}
            />

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${badgeBg[item.accent]}`}>
                    <span className={ringColor[item.accent]}>{item.icon}</span>
                    {item.label}
                </span>

                {item.fill !== undefined && (
                    <MiniArc percent={item.fill} accent={item.accent} />
                )}
            </div>

            {/* Value */}
            <div>
                <p className="text-4xl font-bold tracking-tight text-slate-800">
                    {item.value}
                </p>
                {item.sub && (
                    <p className="mt-1 text-sm text-slate-400 font-medium">{item.sub}</p>
                )}
            </div>

            {/* Bottom micro-progress bar */}
            {item.fill !== undefined && (
                <div className="mt-5">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                        <span>Progress</span>
                        <span>{item.fill}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div
                            className={`h-full rounded-full ${progressTrack[item.accent]} transition-all duration-700`}
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