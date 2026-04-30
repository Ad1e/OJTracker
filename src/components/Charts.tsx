import { useMemo } from "react";
import {
    LineChart, Line,
    BarChart, Bar,
    Cell,
    XAxis, YAxis,
    CartesianGrid, Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { LogEntry } from "../hooks/useHoursCalc";
import { parseLocalDate } from "../hooks/useHoursCalc";

// ─── Shared tooltip style ─────────────────────────────────────────────────────

const tooltipStyle = {
    contentStyle: {
        backgroundColor: "#1e293b",
        border: "1px solid rgba(71,85,105,0.5)",
        borderRadius: "8px",
        fontSize: "12px",
    },
    labelStyle: { color: "#e2e8f0" },
    itemStyle: { color: "#cbd5e1" },
};

// ─── 1. Cumulative Hours Trend ────────────────────────────────────────────────

function HoursTrendChart({ logs }: { logs: LogEntry[] }) {
    const data = useMemo(() => {
        const sorted = [...logs]
            .filter((e) => !e.isHoliday)
            .sort((a, b) => a.date.localeCompare(b.date));

        let cumulative = 0;
        return sorted.map((entry) => {
            cumulative += entry.hoursWorked;
            const d = parseLocalDate(entry.date);
            return {
                date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                total: cumulative,
                daily: entry.hoursWorked,
            };
        });
    }, [logs]);

    if (data.length === 0) return null;

    return (
        <div className="glass-card p-6 hover:!translate-y-0">
            <h3 className="text-sm font-display font-semibold text-white mb-1">Cumulative Hours Progress</h3>
            <p className="text-xs text-slate-500 mb-4">Total hours rendered over time</p>
            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.25)" />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v}h`, "Cumulative"]} />
                    <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ fill: "#818cf8", r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── 2. Weekly Hours Bar Chart ────────────────────────────────────────────────

function getISOWeekLabel(dateStr: string): string {
    const d = parseLocalDate(dateStr);
    // Find Monday of the week
    const day = d.getDay() || 7; // Mon=1, Sun=7
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function WeeklyBarChart({ logs }: { logs: LogEntry[] }) {
    const data = useMemo(() => {
        const weekMap: Record<string, number> = {};
        for (const entry of logs) {
            if (entry.isHoliday) continue;
            const week = getISOWeekLabel(entry.date);
            weekMap[week] = parseFloat(((weekMap[week] ?? 0) + entry.hoursWorked).toFixed(1));
        }
        // Sort weeks chronologically (they're "Mon DD" strings — sort by original date)
        const sorted = [...logs]
            .filter((e) => !e.isHoliday)
            .sort((a, b) => a.date.localeCompare(b.date));

        const seen = new Set<string>();
        const result: { week: string; hours: number }[] = [];
        for (const entry of sorted) {
            const w = getISOWeekLabel(entry.date);
            if (!seen.has(w)) {
                seen.add(w);
                result.push({ week: w, hours: weekMap[w] });
            }
        }
        return result;
    }, [logs]);

    if (data.length === 0) return null;

    return (
        <div className="glass-card p-6 hover:!translate-y-0">
            <h3 className="text-sm font-display font-semibold text-white mb-1">Weekly Hours</h3>
            <p className="text-xs text-slate-500 mb-4">Hours logged per work week (Mon–Sun)</p>
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.25)" vertical={false} />
                    <XAxis dataKey="week" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v}h`, "Hours"]} />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                        {data.map((_, i) => (
                            <Cell
                                key={i}
                                fill={`rgba(99,102,241,${0.4 + (i / Math.max(data.length - 1, 1)) * 0.6})`}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Charts({ logs }: { logs: LogEntry[] }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-1">
                <HoursTrendChart logs={logs} />
            </div>
            <div className="lg:col-span-1">
                <WeeklyBarChart logs={logs} />
            </div>
        </div>
    );
}