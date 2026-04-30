import React, { useState, useEffect, useCallback, useRef } from "react";
import type { LogEntry } from "../hooks/useHoursCalc";
import { calcHoursWorked } from "../hooks/useHoursCalc";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormMode = "add" | "edit";

interface LogFormProps {
    isOpen: boolean;
    mode: FormMode;
    initial?: LogEntry | null;
    onSubmit: (entry: Omit<LogEntry, "id" | "createdAt"> & { id?: string }) => Promise<void>;
    onClose: () => void;
}

type FormData = {
    date: string;
    startTime: string;   // "HH:MM" — 24h, comes from <input type="time">
    endTime: string;
    activity: string;
    hoursWorked: number; // derived, never manually entered
    isHoliday: boolean;
};

type FormErrors = Partial<Record<keyof FormData | "timeRange", string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** Convert "HH:MM" 24h to "hh:MM AM/PM" for display labels */
export function to12h(time: string): string {
    const [h, m] = time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return time;
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

const EMPTY: FormData = {
    date: today(),
    startTime: "08:00",
    endTime: "17:00",
    activity: "",
    hoursWorked: 8,
    isHoliday: false,
};

function validate(data: FormData): FormErrors {
    const errors: FormErrors = {};
    if (!data.date) errors.date = "Required";
    if (!data.activity.trim()) errors.activity = "Activity description is required.";
    if (data.activity.trim().length > 500) errors.activity = "Max 500 characters.";

    if (!data.isHoliday) {
        if (!data.startTime) errors.startTime = "Required";
        if (!data.endTime) errors.endTime = "Required";
        // Validate time range is reasonable (at least 1h gap after break)
        if (data.startTime && data.endTime) {
            const computed = calcHoursWorked(data.startTime, data.endTime);
            if (computed <= 0) {
                errors.timeRange = "End time must be at least 1 hour after start time.";
            }
        }
    }

    return errors;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputClass =
    "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent shadow-inner transition-colors";

const inputErrorClass =
    "w-full px-3 py-2.5 text-sm rounded-lg border border-red-500/50 bg-red-900/10 text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors";

function Field({
    label,
    error,
    required,
    children,
}: {
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {label} {required && <span className="text-accent">*</span>}
            </label>
            {children}
            {error && (
                <p className="text-[11px] text-red-400 font-medium flex items-center gap-1 mt-0.5">
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm.75 8.25h-1.5v-1.5h1.5v1.5zm0-3h-1.5v-3h1.5v3z" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LogForm({ isOpen, mode, initial, onSubmit, onClose }: LogFormProps) {
    const [form, setForm] = useState<FormData>(EMPTY);
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitted, setSubmitted] = useState(false);
    const [saving, setSaving] = useState(false);
    const firstInputRef = useRef<HTMLInputElement>(null);

    // Populate form when opening
    useEffect(() => {
        if (!isOpen) return;
        if (mode === "edit" && initial) {
            // Normalise time to HH:MM (handles legacy "HH:MM AM/PM" seeds)
            const normaliseTime = (t: string): string => {
                if (!t) return "08:00";
                if (/^\d{2}:\d{2}$/.test(t)) return t; // already HH:MM
                // Legacy 12h → 24h conversion for existing seed data
                const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                if (!m) return "08:00";
                let h = parseInt(m[1], 10);
                const min = m[2];
                const period = m[3].toUpperCase();
                if (period === "PM" && h !== 12) h += 12;
                if (period === "AM" && h === 12) h = 0;
                return `${String(h).padStart(2, "0")}:${min}`;
            };

            setForm({
                date: initial.date,
                startTime: normaliseTime(initial.startTime),
                endTime: normaliseTime(initial.endTime),
                activity: initial.activity,
                hoursWorked: initial.hoursWorked,
                isHoliday: initial.isHoliday,
            });
        } else {
            setForm(EMPTY);
        }
        setErrors({});
        setSubmitted(false);
        setTimeout(() => firstInputRef.current?.focus(), 80);
    }, [isOpen, mode, initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-compute hoursWorked whenever times change
    useEffect(() => {
        if (form.isHoliday) {
            setForm((prev) => ({ ...prev, hoursWorked: 0 }));
            return;
        }
        const computed = calcHoursWorked(form.startTime, form.endTime);
        setForm((prev) => ({ ...prev, hoursWorked: computed }));
    }, [form.startTime, form.endTime, form.isHoliday]);

    // Re-validate live after first submit attempt
    useEffect(() => {
        if (submitted) setErrors(validate(form));
    }, [form, submitted]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleSubmit = useCallback(async () => {
        setSubmitted(true);
        const errs = validate(form);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setSaving(true);
        await onSubmit({
            ...(mode === "edit" && initial ? { id: initial.id } : {}),
            day: initial?.day ?? 0,
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            hoursWorked: form.hoursWorked,
            activity: form.activity.trim(),
            isHoliday: form.isHoliday,
        });
        setSaving(false);
        onClose();
    }, [form, mode, initial, onSubmit, onClose]);

    const handleBackdrop = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose(); },
        [onClose]
    );

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={handleBackdrop}
            role="dialog"
            aria-modal="true"
            aria-label={mode === "add" ? "Add log entry" : "Edit log entry"}
        >
            <div className="w-full max-w-lg glass-card overflow-hidden animate-slide-up bg-surface">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/50 bg-slate-800/30">
                    <div>
                        <h2 className="text-lg font-display font-bold text-white tracking-tight">
                            {mode === "add" ? "New Log Entry" : "Edit Entry"}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {mode === "add" ? "Record your work hours for the day." : "Update this log entry details."}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                        aria-label="Close dialog"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 14 14" fill="currentColor">
                            <path d="M8.414 7l3.293-3.293a1 1 0 00-1.414-1.414L7 5.586 3.707 2.293A1 1 0 002.293 3.707L5.586 7 2.293 10.293a1 1 0 101.414 1.414L7 8.414l3.293 3.293a1 1 0 001.414-1.414L8.414 7z" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">

                    <div className="grid grid-cols-1 gap-4">
                        <Field label="Date" required error={submitted ? errors.date : undefined}>
                            <input
                                ref={firstInputRef}
                                type="date"
                                value={form.date}
                                max={today()}
                                onChange={(e) => set("date", e.target.value)}
                                className={submitted && errors.date ? inputErrorClass : inputClass}
                                style={{ colorScheme: "dark" }}
                            />
                        </Field>
                    </div>

                    {/* FIX: type="time" — no more silent parse failures */}
                    {!form.isHoliday && (
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Start Time" error={submitted ? errors.startTime : undefined}>
                                <input
                                    type="time"
                                    value={form.startTime}
                                    onChange={(e) => set("startTime", e.target.value)}
                                    className={submitted && errors.startTime ? inputErrorClass : inputClass}
                                    style={{ colorScheme: "dark" }}
                                />
                            </Field>
                            <Field label="End Time" error={submitted ? errors.endTime : undefined}>
                                <input
                                    type="time"
                                    value={form.endTime}
                                    onChange={(e) => set("endTime", e.target.value)}
                                    className={submitted && errors.endTime ? inputErrorClass : inputClass}
                                    style={{ colorScheme: "dark" }}
                                />
                            </Field>
                        </div>
                    )}

                    {/* Time range error (shown below both fields) */}
                    {submitted && errors.timeRange && (
                        <p className="text-[11px] text-red-400 font-medium flex items-center gap-1 -mt-3">
                            <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
                                <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm.75 8.25h-1.5v-1.5h1.5v1.5zm0-3h-1.5v-3h1.5v3z" />
                            </svg>
                            {errors.timeRange}
                        </p>
                    )}

                    <Field label="Activity Description" required error={submitted ? errors.activity : undefined}>
                        <textarea
                            value={form.activity}
                            onChange={(e) => set("activity", e.target.value)}
                            placeholder="e.g. Developed login page UI, fixed mobile layout issues…"
                            rows={3}
                            maxLength={500}
                            className={`${submitted && errors.activity ? inputErrorClass : inputClass} resize-none`}
                        />
                        <p className="text-[11px] text-slate-600 text-right -mt-1">
                            {form.activity.length}/500
                        </p>
                    </Field>

                    <div className="grid grid-cols-3 gap-4 items-start">
                        {/* Auto-computed hours display */}
                        <div className="col-span-1">
                            <Field label="Total Hours">
                                <div className={`${inputClass} flex items-center justify-between cursor-default opacity-70`}>
                                    <span className="font-mono font-semibold text-accent">
                                        {form.isHoliday ? "—" : `${form.hoursWorked}h`}
                                    </span>
                                    <span className="text-[10px] text-slate-500 ml-2">auto</span>
                                </div>
                            </Field>
                        </div>

                        {/* Holiday toggle */}
                        <div className="col-span-2">
                            <Field label="Mark as Holiday">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.isHoliday}
                                    onClick={() => set("isHoliday", !form.isHoliday)}
                                    className={`relative inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-all ${form.isHoliday
                                            ? "border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                                            : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-700/50 hover:text-slate-200"
                                        }`}
                                >
                                    <span className="text-base">{form.isHoliday ? "🏖️" : "📅"}</span>
                                    {form.isHoliday ? "Holiday / Rest Day" : "Work Day"}
                                </button>
                            </Field>
                        </div>
                    </div>

                    {form.isHoliday && (
                        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 animate-slide-up">
                            <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <p>Holiday entries are <strong>excluded</strong> from your hour total. Your 500h target is unchanged.</p>
                        </div>
                    )}

                    {/* Time summary pill when valid */}
                    {!form.isHoliday && form.hoursWorked > 0 && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/15 text-xs text-indigo-300">
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>
                                {to12h(form.startTime)} → {to12h(form.endTime)} &nbsp;·&nbsp;
                                <strong className="text-indigo-200">{form.hoursWorked}h</strong> rendered (1h break deducted)
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2 border-t border-slate-700/30">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 bg-transparent hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700 disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-6 py-2.5 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-indigo-400 active:scale-95 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-indigo-400/50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving && (
                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                        )}
                        {saving ? "Saving…" : mode === "add" ? "Add Entry" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}