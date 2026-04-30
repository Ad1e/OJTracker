import { useEffect, useCallback } from "react";
import { parseLocalDate } from "../hooks/useHoursCalc";

interface DeleteConfirmModalProps {
    /** ISO date string of the entry to delete — used only for display */
    entryDate: string;
    onConfirm: () => void;
    onCancel: () => void;
}

function formatDate(iso: string): string {
    return parseLocalDate(iso).toLocaleDateString("en-PH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export function DeleteConfirmModal({ entryDate, onConfirm, onCancel }: DeleteConfirmModalProps) {
    // Escape to cancel
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onCancel]);

    const handleBackdrop = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onCancel(); },
        [onCancel]
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={handleBackdrop}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm deletion"
        >
            <div className="w-full max-w-sm glass-card overflow-hidden animate-slide-up bg-surface">

                {/* Icon + Header */}
                <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-5 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                        </svg>
                    </div>

                    <div>
                        <h2 className="text-base font-display font-bold text-white">Delete entry?</h2>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            This will permanently remove the log entry for<br />
                            <span className="text-slate-300 font-medium">{formatDate(entryDate)}</span>.
                        </p>
                        <p className="text-xs text-slate-500 mt-2">This action cannot be undone.</p>
                    </div>
                </div>

                <div className="h-px bg-slate-700/50" />

                {/* Actions */}
                <div className="flex items-center gap-3 px-6 py-4">
                    <button
                        onClick={onCancel}
                        autoFocus
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 bg-transparent hover:bg-slate-800 rounded-xl transition-all border border-slate-700 hover:border-slate-600"
                    >
                        Keep entry
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-xl transition-all border border-red-500/50 active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.35)]"
                    >
                        Delete entry
                    </button>
                </div>
            </div>
        </div>
    );
}