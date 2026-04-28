import { useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { LogEntry } from "../hooks/useHoursCalc";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartsProps {
    logs: LogEntry[];
}

// ─── Colors ───────────────────────────────────────────────────────────────────

// FIX (Task 5): Added all compound/variant categories found in journalData.json.
// The fuzzy matcher below also handles any remaining unknown variants by
// checking if the category string includes one of the base known keys.
const CATEGORY_COLORS: Record<string, string> = {
    // Primary categories
    "Design/Media": "#818cf8",
    "Training": "#34d399",
    "QA/Collaboration": "#fbbf24",
    "Development": "#f87171",
    "Documentation": "#60a5fa",
    "Events": "#c084fc",
    "Admin": "#94a3b8",
    // Variant / compound categories from journalData.json
    "Media/Events": "#c084fc",
    "Operations/Admin": "#94a3b8",
    "Media/Admin": "#818cf8",
    "Media/Development": "#818cf8",
    "Planning/Development": "#f87171",
    "Development/Admin": "#f87171",
    "Development/Presentation": "#f87171",
    "Operations": "#64748b",
    "Media/Operations": "#818cf8",
    "Media": "#818cf8",
};

// FIX: Fuzzy match — if an exact entry exists use it; otherwise try to find
// a known base key that is contained in the category string. This future-proofs
// any new compound categories that might be added.
export const getColorForCategory = (category: string): string => {
    if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
    const baseKeys = [
        "Design/Media", "Training", "QA/Collaboration", "Development",
        "Documentation", "Events", "Admin", "Operations", "Media",
    ];
    for (const key of baseKeys) {
        if (category.includes(key)) return CATEGORY_COLORS[key] || "#6366f1";
    }
    return "#6366f1";
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

// ─── Main Charts Component ────────────────────────────────────────────────────

export function Charts({ logs }: ChartsProps) {
    return (
        <div className="space-y-6">
            <HoursTrendChart logs={logs} />
        </div>
    );
}
