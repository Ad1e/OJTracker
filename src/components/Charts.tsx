import React, { useMemo } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import type { LogEntry } from "../hooks/useHoursCalc";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartsProps {
    logs: LogEntry[];
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
    "Design/Media": "#818cf8",
    "Training": "#34d399",
    "QA/Collaboration": "#fbbf24",
    "Development": "#f87171",
    "Documentation": "#60a5fa",
    "Events": "#c084fc",
    "Admin": "#94a3b8",
};

const getColorForCategory = (category: string): string => {
    return CATEGORY_COLORS[category] || "#6366f1";
};

// ─── Cumulative Hours Chart ───────────────────────────────────────────────────

function HoursTrendChart({ logs }: ChartsProps) {
    const data = useMemo(() => {
        const sorted = [...logs]
            .filter((e) => !e.isHoliday)
            .sort((a, b) => a.date.localeCompare(b.date));

        let cumulative = 0;
        return sorted.map((entry) => {
            cumulative += entry.hoursWorked;
            return {
                date: new Date(entry.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                hours: cumulative,
                daily: entry.hoursWorked,
            };
        });
    }, [logs]);

    if (data.length === 0) return null;

    return (
        <div className="glass-card p-6">
            <h3 className="text-base font-display font-semibold text-white mb-4">
                📈 Cumulative Hours Progress
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
                    <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid rgba(71, 85, 105, 0.5)",
                            borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#e2e8f0" }}
                        formatter={(value) => [`${value}h`, "Total Hours"]}
                    />
                    <Line
                        type="monotone"
                        dataKey="hours"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ fill: "#818cf8", r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Category Breakdown Chart ──────────────────────────────────────────────────

function CategoryBreakdownChart({ logs }: ChartsProps) {
    const data = useMemo(() => {
        const categoryMap: Record<string, number> = {};
        logs.forEach((entry) => {
            if (!entry.isHoliday) {
                categoryMap[entry.category] =
                    (categoryMap[entry.category] || 0) + entry.hoursWorked;
            }
        });

        return Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [logs]);

    if (data.length === 0) return null;

    return (
        <div className="glass-card p-6">
            <h3 className="text-base font-display font-semibold text-white mb-4">
                🎯 Hours by Category
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                            `${name}: ${value.toFixed(1)}h`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={getColorForCategory(entry.name)}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid rgba(71, 85, 105, 0.5)",
                            borderRadius: "8px",
                            color: "#e2e8f0",
                        }}
                        formatter={(value) => `${value.toFixed(1)}h`}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Daily Distribution Chart ──────────────────────────────────────────────────

function DailyDistributionChart({ logs }: ChartsProps) {
    const data = useMemo(() => {
        const dailyMap: Record<string, number> = {};
        logs.forEach((entry) => {
            if (!entry.isHoliday) {
                const dateStr = new Date(entry.date).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" }
                );
                dailyMap[dateStr] = (dailyMap[dateStr] || 0) + entry.hoursWorked;
            }
        });

        return Object.entries(dailyMap)
            .map(([date, hours]) => ({ date, hours }))
            .slice(-15); // Last 15 days
    }, [logs]);

    if (data.length === 0) return null;

    return (
        <div className="glass-card p-6">
            <h3 className="text-base font-display font-semibold text-white mb-4">
                📊 Last 15 Days Distribution
            </h3>
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
                    <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        style={{ fontSize: "11px" }}
                    />
                    <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid rgba(71, 85, 105, 0.5)",
                            borderRadius: "8px",
                            color: "#e2e8f0",
                        }}
                        formatter={(value) => `${value.toFixed(1)}h`}
                    />
                    <Bar
                        dataKey="hours"
                        fill="#6366f1"
                        radius={[8, 8, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Main Charts Component ────────────────────────────────────────────────────

export function Charts({ logs }: ChartsProps) {
    return (
        <div className="space-y-6">
            <HoursTrendChart logs={logs} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CategoryBreakdownChart logs={logs} />
                <DailyDistributionChart logs={logs} />
            </div>
        </div>
    );
}
