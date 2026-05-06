import React, { useState, useMemo, useCallback } from "react";
import type { LogEntry } from "../hooks/useHoursCalc";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = keyof Pick<LogEntry, "date" | "activity" | "hoursWorked">;
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
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const splitRegex = new RegExp(`(${escaped})`, "gi");
    const testRegex = new RegExp(`^${escaped}$`, "i");
    const parts = text.split(splitRegex);
    return parts.map((part, i) =>
        testRegex.test(part) ? (
            <mark key={i} className="bg-indigo-500/20 text-indigo-300 rounded px-0.5">
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
            <svg className={`w-2.5 h-2.5 transition-colors ${active && dir === "asc" ? "text-indigo-400" : "text-slate-400"}`} viewBox="0 0 10 6" fill="currentColor">
                <path d="M5 0L10 6H0L5 0Z" />
            </svg>
            <svg className={`w-2.5 h-2.5 transition-colors ${active && dir === "desc" ? "text-indigo-400" : "text-slate-400"}`} viewBox="0 0 10 6" fill="currentColor">
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
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center bg-slate-800/30">
                        <svg className="w-9 h-9 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                            <rect x="9" y="3" width="6" height="4" rx="1" />
                            <line x1="9" y1="12" x2="15" y2="12" />
                            <line x1="9" y1="16" x2="13" y2="16" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-300">
                            {hasQuery ? "No entries match your search." : "No log entries yet."}
                        </p>
                        {!hasQuery && (
                            <p className="text-xs text-slate-500 mt-1">Click <strong className="text-slate-400">Add Entry</strong> to get started.</p>
                        )}
                    </div>
                </div>
            </td>
        </tr>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function TimeLogTable({ logs, onEdit, onDelete }: TimeLogTableProps) {
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
    const [filter, setFilter] = useState<"all" | "work" | "holiday">("all");
    const [page, setPage] = useState(1);

    const handleSort = useCallback((key: SortKey) => {
        setPage(1);
        setSort((prev) =>
            prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
        );
    }, []);

    const handleFilter = useCallback((f: "all" | "work" | "holiday") => {
        setFilter(f);
        setPage(1);
    }, []);

    const handleQuery = useCallback((q: string) => {
        setQuery(q);
        setPage(1);
    }, []);

    // ── Filtered + sorted data ───────────────────────────────────────────────
    const processed = useMemo(() => {
        let result = [...logs];
        if (filter === "work") result = result.filter((e) => !e.isHoliday);
        if (filter === "holiday") result = result.filter((e) => e.isHoliday);

        const q = query.toLowerCase().trim();
        if (q) {
            result = result.filter(
                (e) =>
                    e.activity.toLowerCase().includes(q) ||
                    e.date.includes(q) ||
                    String(e.hoursWorked).includes(q)
            );
        }

        result.sort((a, b) => {
            let cmp = 0;
            if (sort.key === "date") cmp = a.date.localeCompare(b.date);
            else if (sort.key === "activity") cmp = a.activity.localeCompare(b.activity);
            else if (sort.key === "hoursWorked") cmp = a.hoursWorked - b.hoursWorked;
            return sort.dir === "asc" ? cmp : -cmp;
        });

        return result;
    }, [logs, query, sort, filter]);

    // ── Pagination ────────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageSlice = processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const visibleHours = useMemo(
        () => processed.filter((e) => !e.isHoliday).reduce((s, e) => s + e.hoursWorked, 0),
        [processed]
    );

    const thClass =
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 select-none cursor-pointer transition-colors";
    const tdClass = "px-4 py-3.5 text-sm text-slate-300 align-middle border-b border-slate-700/50";

    return (
        <div className="glass-card overflow-hidden">

            {/* ── Toolbar ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-5 border-b border-slate-700/50 bg-slate-800/30">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => handleQuery(e.target.value)}
                        placeholder="Search activities, dates…"
                        className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-700 bg-surface text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition"
                    />
                    {query && (
                        <button
                            onClick={() => handleQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
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
                            onClick={() => handleFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f
                                ? "bg-accent text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                                : "bg-surface border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                                }`}
                        >
                            {f === "all" ? "All" : f === "work" ? "Work Days" : "Holidays"}
                        </button>
                    ))}
                </div>

                <span className="text-xs text-slate-400 font-medium whitespace-nowrap sm:ml-auto">
                    {processed.length} result{processed.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* ── Table ───────────────────────────────────────────────────────── */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                    <thead className="bg-slate-800/50">
                        <tr>
                            <th className={thClass} onClick={() => handleSort("date")} style={{ width: "130px" }}>
                                <span className="inline-flex items-center">Date <SortIcon active={sort.key === "date"} dir={sort.dir} /></span>
                            </th>
                            <th className={thClass} onClick={() => handleSort("activity")}>
                                <span className="inline-flex items-center">Activity <SortIcon active={sort.key === "activity"} dir={sort.dir} /></span>
                            </th>
                            <th className={`${thClass} text-right`} onClick={() => handleSort("hoursWorked")} style={{ width: "90px" }}>
                                <span className="inline-flex items-center justify-end w-full">Hours <SortIcon active={sort.key === "hoursWorked"} dir={sort.dir} /></span>
                            </th>
                            <th className={`${thClass} text-center`} style={{ width: "100px" }}>Status</th>
                            <th className={`${thClass} text-center`} style={{ width: "90px" }}>Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-700/30">
                        {pageSlice.length === 0 ? (
                            <EmptyState hasQuery={!!query} />
                        ) : (
                            pageSlice.map((entry, idx) => (
                                <tr
                                    key={entry.id}
                                    className={`group transition-colors hover:bg-slate-800/40 ${entry.isHoliday ? "bg-amber-900/10" : idx % 2 === 0 ? "bg-surface" : "bg-slate-800/20"}`}
                                >
                                    <td className={`${tdClass} font-mono text-xs text-slate-500 font-medium whitespace-nowrap`}>
                                        {formatDate(entry.date)}
                                    </td>
                                    <td className={`${tdClass} max-w-xs`}>
                                        <span className="line-clamp-2 leading-snug">
                                            {highlight(entry.activity, query)}
                                        </span>
                                    </td>
                                    <td className={`${tdClass} text-right font-semibold tabular-nums`}>
                                        {entry.isHoliday ? (
                                            <span className="text-slate-600">—</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                                {entry.hoursWorked}h
                                            </span>
                                        )}
                                    </td>
                                    <td className={`${tdClass} text-center`}>
                                        {entry.isHoliday ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Holiday
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Work
                                            </span>
                                        )}
                                    </td>
                                    <td className={`${tdClass} text-center`}>
                                        <div className="inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEdit(entry)} title="Edit entry"
                                                className="p-1.5 rounded border border-transparent hover:border-slate-600 hover:bg-slate-800/80 text-slate-400 hover:text-accent transition-all">
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button onClick={() => onDelete(entry.id)} title="Delete entry"
                                                className="p-1.5 rounded border border-transparent hover:border-red-900/50 hover:bg-red-900/20 text-slate-400 hover:text-red-400 transition-all">
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
                            <tr className="bg-slate-800/50 border-t border-slate-700/50 shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
                                <td colSpan={2} className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-widest text-right">
                                    Subtotal (all filtered rows)
                                </td>
                                <td className="px-4 py-3.5 text-right font-display text-lg font-bold text-accent tabular-nums drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                                    {visibleHours.toFixed(1)}h
                                </td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* ── Pagination bar ────────────────────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-700/50 bg-slate-800/20">
                    <span className="text-xs text-slate-500 tabular-nums">
                        Page <span className="text-slate-300 font-semibold">{safePage}</span> of{" "}
                        <span className="text-slate-300 font-semibold">{totalPages}</span>
                        <span className="ml-2 text-slate-600">
                            ({(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, processed.length)} of {processed.length})
                        </span>
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(1)} disabled={safePage === 1}
                            className="px-2 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all">«</button>
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                            className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all">‹ Prev</button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => Math.abs(p - safePage) <= 2)
                            .map((p) => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`w-8 h-7 rounded text-xs font-semibold transition-all ${p === safePage
                                        ? "bg-accent text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                                        : "text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"}`}
                                >{p}</button>
                            ))}

                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                            className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all">Next ›</button>
                        <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                            className="px-2 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all">»</button>
                    </div>
                </div>
            )}
        </div>
    );
}