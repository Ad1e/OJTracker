import React, { useState, useEffect, useCallback, useRef } from "react";
import type { LogEntry } from "../hooks/useHoursCalc";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormMode = "add" | "edit";

interface LogFormProps {
    isOpen: boolean;
    mode: FormMode;
    /** Pre-populated when mode === "edit" */
    initial?: LogEntry | null;
    onSubmit: (entry: Omit<LogEntry, "id"> & { id?: string }) => void;
    onClose: () => void;
}

type FormData = {
    date: string;
    activity: string;
    hours: string;        // string for controlled input, parsed on submit
    isHoliday: boolean;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
    return new Date().toISOString().split("T")[0];
}

const EMPTY: FormData = {
    date: today(),
    activity: "",
    hours: "8",
    isHoliday: false,
};

function validate(data: FormData): FormErrors {
    const errors: FormErrors = {};
    if (!data.date) errors.date = "Date is required.";
    if (!data.activity.trim()) errors.activity = "Activity description is required.";
    if (!data.isHoliday) {
        const h = parseFloat(data.hours);
        if (isNaN(h) || h <= 0) errors.hours = "Enter a positive number.";
        if (h > 24) errors.hours = "Cannot exceed 24 hours.";
    }
    return errors;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FieldProps {
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}

function Field({ label, error, required, children }: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {label} {required && <span className="text-indigo-500">*</span>}
            </label>
            {children}
            {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm.75 8.25h-1.5v-1.5h1.5v1.5zm0-3h-1.5v-3h1.5v3z" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}

const inputClass =
    "w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent focus:bg-white transition";

const inputErrorClass =
    "w-full px-3 py-2.5 text-sm rounded-xl border border-red-300 bg-red-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition";

// ─── Component ────────────────────────────────────────────────────────────────

export function LogForm({ isOpen, mode, initial, onSubmit, onClose }: LogFormProps) {
    const [form, setForm] = useState<FormData>(EMPTY);
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitted, setSubmitted] = useState(false);
    const firstInputRef = useRef<HTMLInputElement>(null);

    // Populate form when editing
    useEffect(() => {
        if (isOpen) {
            if (mode === "edit" && initial) {
                setForm({
                    date: initial.date,
                    activity: initial.activity,
                    hours: String(initial.hours),
                    isHoliday: initial.isHoliday,
                });
            } else {
                setForm(EMPTY);
            }
            setErrors({});
            setSubmitted(false);
            // Focus first input after transition
            setTimeout(() => firstInputRef.current?.focus(), 80);
        }
    }, [isOpen, mode, initial]);

    // Re-validate on change once the user has tried to submit
    useEffect(() => {
        if (submitted) setErrors(validate(form));
    }, [form, submitted]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleSubmit = useCallback(() => {
        setSubmitted(true);
        const errs = validate(form);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        onSubmit({
            ...(initial?.id ? { id: initial.id } : {}),
            date: form.date,
            activity: form.activity.trim(),
            hours: form.isHoliday ? 0 : parseFloat(form.hours),
            isHoliday: form.isHoliday,
        });
        onClose();
    }, [form, initial, onSubmit, onClose]);

    // ── Backdrop click ────────────────────────────────────────────────────────
    const handleBackdrop = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={handleBackdrop}
            role="dialog"
            aria-modal="true"
            aria-label={mode === "add" ? "Add new log entry" : "Edit log entry"}
        >
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden animate-[modalIn_0.2s_ease-out]">

                {/* ── Header ──────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">
                            {mode === "add" ? "New Log Entry" : "Edit Entry"}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {mode === "add" ? "Record your work hours for the day." : "Update this log entry."}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 14 14" fill="currentColor">
                            <path d="M8.414 7l3.293-3.293a1 1 0 00-1.414-1.414L7 5.586 3.707 2.293A1 1 0 002.293 3.707L5.586 7 2.293 10.293a1 1 0 101.414 1.414L7 8.414l3.293 3.293a1 1 0 001.414-1.414L8.414 7z" />
                        </svg>
                    </button>
                </div>

                {/* ── Body ────────────────────────────────────────────────────── */}
                <div className="px-6 py-5 flex flex-col gap-5">

                    {/* Date */}
                    <Field label="Date" required error={errors.date}>
                        <input
                            ref={firstInputRef}
                            type="date"
                            value={form.date}
                            max={today()}
                            onChange={(e) => set("date", e.target.value)}
                            className={errors.date ? inputErrorClass : inputClass}
                        />
                    </Field>

                    {/* Activity */}
                    <Field label="Activity Description" required error={errors.activity}>
                        <textarea
                            value={form.activity}
                            onChange={(e) => set("activity", e.target.value)}
                            placeholder="e.g. Integrated REST API with the inventory module…"
                            rows={3}
                            className={`${errors.activity ? inputErrorClass : inputClass} resize-none`}
                        />
                    </Field>

                    {/* Hours + Holiday toggle side-by-side */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Hours */}
                        <Field label="Hours Worked" required={!form.isHoliday} error={errors.hours}>
                            <input
                                type="number"
                                value={form.hours}
                                min={0}
                                max={24}
                                step={0.5}
                                disabled={form.isHoliday}
                                onChange={(e) => set("hours", e.target.value)}
                                className={`${errors.hours ? inputErrorClass : inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                            />
                        </Field>

                        {/* Holiday toggle */}
                        <Field label="Mark as Holiday">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={form.isHoliday}
                                onClick={() => set("isHoliday", !form.isHoliday)}
                                className={`mt-0.5 relative inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all ${form.isHoliday
                                        ? "border-amber-300 bg-amber-50 text-amber-700"
                                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-amber-200 hover:bg-amber-50/40"
                                    }`}
                            >
                                <span className="text-base">{form.isHoliday ? "🏖️" : "📅"}</span>
                                {form.isHoliday ? "Holiday" : "Work Day"}
                            </button>
                        </Field>
                    </div>

                    {/* Holiday notice */}
                    {form.isHoliday && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                            <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <p>
                                Holiday entries are <strong>excluded</strong> from your hour total.
                                The 500-hour target is unchanged.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Footer ──────────────────────────────────────────────────── */}
                <div className="flex items-center justify-end gap-2 px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200"
                    >
                        {mode === "add" ? "Add Entry" : "Save Changes"}
                    </button>
                </div>
            </div>

            {/* Keyframe injected once */}
            <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
        </div>
    );
}