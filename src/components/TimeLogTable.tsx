import React, { useState, useMemo, useCallback } from "react";
import type { LogEntry } from "../hooks/useHoursCalc";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = keyof Pick<LogEntry, "date" | "activity" | "hours">;
type SortDir = "asc" | "desc";

interface SortState {
    key: SortKey;
    dir: SortDir;
}

interface TimeLogTableProps {
    logs: LogEntry[];
    onEdit: (entry: LogEntry) => void;
    onDelete: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function highlight(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? (
            <mark key={i} className="bg-indigo-100 text-indigo-800 rounded px-0.5">
                {part}
            </mark>
        ) : (
            part
        )
    );
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
    return (
        <span className={`ml-1 inline-flex flex-col gap-[1px] opacity-${active ? "100" : "30"}`}>
            <svg
                className={`w-2.5 h-2.5 transition-colors ${active && dir === "asc" ? "text-indigo-600" : "text-slate-400"}`}
                viewBox="0 0 10 6" fill="currentColor"
            >
                <path d="M5 0L10 6H0L5 0Z" />
            </svg>
            <svg
                className={`w-2.5 h-2.5 transition-colors ${active && dir === "desc" ? "text-indigo-600" : "text-slate-400"}`}
                viewBox="0 0 10 6" fill="currentColor"
            >
                <path d="M5 6L0 0H10L5 6Z" />
            </svg>
        </span>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
    return (
        <tr>
            <td colSpan={5} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <svg className="w-10 h-10 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                        <rect x="9" y="3" width="6" height="4" rx="1" />
                        <line x1="9" y1="12" x2="15" y2="12" />
                        <line x1="9" y1="16" x2="13" y2="16" />
                    </svg>
                    <p className="text-sm font-medium">
                        {hasQuery ? "No entries match your search." : "No log entries yet."}
                    </p>
                    {!hasQuery && (
                        <p className="text-xs">Click <strong>Add Entry</strong> to get started.</p>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimeLogTable({ logs, onEdit, onDelete }: TimeLogTableProps) {
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
    const [filter, setFilter] = useState<"all" | "work" | "holiday">("all");

    // ── Sort handler ─────────────────────────────────────────────────────────
    const handleSort = useCallback(
        (key: SortKey) => {
            setSort((prev) =>
                prev.key === key
                    ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
                    : { key, dir: "asc" }
            );
        },
        []
    );

    // ── Filtered + sorted data ───────────────────────────────────────────────
    const processed = useMemo(() => {
        let result = [...logs];

        // Filter by type
        if (filter === "work") result = result.filter((e) => !e.isHoliday);
        if (filter === "holiday") result = result.filter((e) => e.isHoliday);

        // Search
        const q = query.toLowerCase().trim();
        if (q) {
            result = result.filter(
                (e) =>
                    e.activity.toLowerCase().includes(q) ||
                    e.date.includes(q) ||
                    String(e.hours).includes(q)
            );
        }

        // Sort
        result.sort((a, b) => {
            let cmp = 0;
            if (sort.key === "date") cmp = a.date.localeCompare(b.date);
            else if (sort.key === "activity") cmp = a.activity.localeCompare(b.activity);
            else if (sort.key === "hours") cmp = a.hours - b.hours;
            return sort.dir === "asc" ? cmp : -cmp;
        });

        return result;
    }, [logs, query, sort, filter]);

    // ── Totals row ────────────────────────────────────────────────────────────
    const visibleHours = useMemo(
        () => processed.filter((e) => !e.isHoliday).reduce((s, e) => s + e.hours, 0),
        [processed]
    );

    const thClass =
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 select-none cursor-pointer hover:text-slate-700 transition-colors";
    const tdClass = "px-4 py-3.5 text-sm text-slate-700 align-middle";

    return (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">

            {/* ── Toolbar ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">

                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search activities, dates…"
                        className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label="Clear search"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="currentColor">
                                <path d="M8.414 7l3.293-3.293a1 1 0 00-1.414-1.414L7 5.586 3.707 2.293A1 1 0 002.293 3.707L5.586 7 2.293 10.293a1 1 0 101.414 1.414L7 8.414l3.293 3.293a1 1 0 001.414-1.414L8.414 7z" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Filter pills */}
                <div className="flex gap-1.5">
                    {(["all", "work", "holiday"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                                }`}
                        >
                            {f === "all" ? "All" : f === "work" ? "Work Days" : "Holidays"}
                        </button>
                    ))}
                </div>

                {/* Results badge */}
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap sm:ml-auto">
                    {processed.length} result{processed.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* ── Table ───────────────────────────────────────────────────────── */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className={thClass} onClick={() => handleSort("date")} style={{ width: "130px" }}>
                                <span className="inline-flex items-center">
                                    Date <SortIcon active={sort.key === "date"} dir={sort.dir} />
                                </span>
                            </th>
                            <th className={thClass} onClick={() => handleSort("activity")}>
                                <span className="inline-flex items-center">
                                    Activity <SortIcon active={sort.key === "activity"} dir={sort.dir} />
                                </span>
                            </th>
                            <th className={`${thClass} text-right`} onClick={() => handleSort("hours")} style={{ width: "90px" }}>
                                <span className="inline-flex items-center justify-end w-full">
                                    Hours <SortIcon active={sort.key === "hours"} dir={sort.dir} />
                                </span>
                            </th>
                            <th className={`${thClass} text-center`} style={{ width: "100px" }}>Status</th>
                            <th className={`${thClass} text-center`} style={{ width: "90px" }}>Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-50">
                        {processed.length === 0 ? (
                            <EmptyState hasQuery={!!query} />
                        ) : (
                            processed.map((entry, idx) => (
                                <tr
                                    key={entry.id}
                                    className={`group transition-colors hover:bg-indigo-50/40 ${entry.isHoliday ? "bg-amber-50/40" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                        }`}
                                >
                                    {/* Date */}
                                    <td className={`${tdClass} font-mono text-xs text-slate-500 font-medium whitespace-nowrap`}>
                                        {formatDate(entry.date)}
                                    </td>

                                    {/* Activity */}
                                    <td className={`${tdClass} max-w-xs`}>
                                        <span className="line-clamp-2 leading-snug">
                                            {highlight(entry.activity, query)}
                                        </span>
                                    </td>

                                    {/* Hours */}
                                    <td className={`${tdClass} text-right font-semibold tabular-nums`}>
                                        {entry.isHoliday ? (
                                            <span className="text-slate-300">—</span>
                                        ) : (
                                            <span className="text-slate-800">{entry.hours}h</span>
                                        )}
                                    </td>

                                    {/* Status badge */}
                                    <td className={`${tdClass} text-center`}>
                                        {entry.isHoliday ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                Holiday
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                Work
                                            </span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className={`${tdClass} text-center`}>
                                        <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onEdit(entry)}
                                                title="Edit entry"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => onDelete(entry.id)}
                                                title="Delete entry"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                                    <path d="M10 11v6M14 11v6" />
                                                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>

                    {/* ── Totals footer ──────────────────────────────────────────── */}
                    {processed.length > 0 && (
                        <tfoot>
                            <tr className="border-t-2 border-slate-200 bg-slate-50">
                                <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Subtotal (visible rows)
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-indigo-700 tabular-nums">
                                    {visibleHours.toFixed(1)}h
                                </td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}