import React, { useState, useEffect, useCallback, useRef } from "react";
import type { LogEntry } from "../hooks/useHoursCalc";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormMode = "add" | "edit";

interface LogFormProps {
    isOpen: boolean;
    mode: FormMode;
    initial?: LogEntry | null;
    onSubmit: (entry: Omit<LogEntry, "id" | "day"> & { id?: string; day?: number }) => void;
    onClose: () => void;
}

type FormData = {
    date: string;
    startTime: string;
    endTime: string;
    category: string;
    activity: string;
    hoursWorked: string;
    isHoliday: boolean;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
    return new Date().toISOString().split("T")[0];
}

const EMPTY: FormData = {
    date: today(),
    startTime: "08:00 AM",
    endTime: "05:00 PM",
    category: "Development",
    activity: "",
    hoursWorked: "8",
    isHoliday: false,
};

function validate(data: FormData): FormErrors {
    const errors: FormErrors = {};
    if (!data.date) errors.date = "Required";
    if (!data.activity.trim()) errors.activity = "Activity description is required.";
    if (!data.isHoliday) {
        const h = parseFloat(data.hoursWorked);
        if (isNaN(h) || h <= 0) errors.hoursWorked = "Enter a positive number.";
        if (h > 24) errors.hoursWorked = "Cannot exceed 24.";
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
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {label} {required && <span className="text-accent">*</span>}
            </label>
            {children}
            {error && (
                <p className="text-[11px] text-red-400 font-medium flex items-center gap-1 mt-0.5">
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
    "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent shadow-inner transition-colors";

const inputErrorClass =
    "w-full px-3 py-2.5 text-sm rounded-lg border border-red-500/50 bg-red-900/10 text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors";

// ─── Component ────────────────────────────────────────────────────────────────

export function LogForm({ isOpen, mode, initial, onSubmit, onClose }: LogFormProps) {
    const [form, setForm] = useState<FormData>(EMPTY);
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitted, setSubmitted] = useState(false);
    const firstInputRef = useRef<HTMLInputElement>(null);

    // FIX: Added `initial?.id` to dependency array so the effect re-fires when
    // opening the modal for a DIFFERENT entry (even if mode and isOpen don't change).
    // This prevents the flash-of-previous-data bug when switching between entries.
    useEffect(() => {
        if (isOpen) {
            if (mode === "edit" && initial) {
                setForm({
                    date: initial.date,
                    startTime: initial.startTime || "08:00 AM",
                    endTime: initial.endTime || "05:00 PM",
                    category: initial.category || "Development",
                    activity: initial.activity,
                    hoursWorked: String(initial.hoursWorked),
                    isHoliday: initial.isHoliday,
                });
            } else {
                setForm(EMPTY);
            }
            setErrors({});
            setSubmitted(false);
            setTimeout(() => firstInputRef.current?.focus(), 80);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, mode, initial, initial?.id]); // FIX: include initial?.id

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
            ...(initial?.day ? { day: initial.day } : {}),
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            category: form.category,
            activity: form.activity.trim(),
            hoursWorked: form.isHoliday ? 0 : parseFloat(form.hoursWorked),
            isHoliday: form.isHoliday,
        });
        onClose();
    }, [form, initial, onSubmit, onClose]);

    const handleBackdrop = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={handleBackdrop}
            role="dialog"
            aria-modal="true"
            aria-label={mode === "add" ? "Add log entry dialog" : "Edit log entry dialog"}
        >
            <div className="w-full max-w-lg glass-card overflow-hidden animate-slide-up bg-surface">

                {/* ── Header ──────────────────────────────────────────────────── */}
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

                {/* ── Body ────────────────────────────────────────────────────── */}
                <div className="px-6 py-5 flex flex-col gap-5">

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Date" required error={errors.date}>
                            <input
                                ref={firstInputRef}
                                type="date"
                                value={form.date}
                                max={today()}
                                onChange={(e) => set("date", e.target.value)}
                                className={errors.date ? inputErrorClass : inputClass}
                                style={{ colorScheme: 'dark' }}
                            />
                        </Field>
                        
                        <Field label="Category" required>
                            <select 
                                value={form.category}
                                onChange={(e) => set("category", e.target.value)}
                                className={inputClass}
                            >
                                <option value="Development">Development</option>
                                <option value="Design/Media">Design/Media</option>
                                <option value="QA/Collaboration">QA/Collaboration</option>
                                <option value="Training">Training</option>
                                <option value="Documentation">Documentation</option>
                                <option value="Events">Events</option>
                                <option value="Admin">Admin</option>
                                <option value="Operations">Operations</option>
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Start Time">
                            <input
                                type="text"
                                value={form.startTime}
                                placeholder="08:00 AM"
                                onChange={(e) => set("startTime", e.target.value)}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="End Time">
                            <input
                                type="text"
                                value={form.endTime}
                                placeholder="05:00 PM"
                                onChange={(e) => set("endTime", e.target.value)}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <Field label="Activity Description" required error={errors.activity}>
                        <textarea
                            value={form.activity}
                            onChange={(e) => set("activity", e.target.value)}
                            placeholder="e.g. Started Developing KLIMA User Interface…"
                            rows={3}
                            className={`${errors.activity ? inputErrorClass : inputClass} resize-none`}
                        />
                    </Field>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <Field label="Total Hours" required={!form.isHoliday} error={errors.hoursWorked}>
                                <input
                                    type="number"
                                    value={form.hoursWorked}
                                    min={0}
                                    max={24}
                                    step={0.5}
                                    disabled={form.isHoliday}
                                    onChange={(e) => set("hoursWorked", e.target.value)}
                                    className={`${errors.hoursWorked ? inputErrorClass : inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                                />
                            </Field>
                        </div>

                        <div className="col-span-2 mt-1">
                            <Field label="Mark as Holiday">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.isHoliday}
                                    onClick={() => set("isHoliday", !form.isHoliday)}
                                    className={`relative inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-all ${
                                        form.isHoliday
                                            ? "border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                                            : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-700/50 hover:text-slate-200"
                                    }`}
                                >
                                    <span className="text-base">{form.isHoliday ? "🏖️" : "📅"}</span>
                                    {form.isHoliday ? "Holiday" : "Work Day"}
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
                            <p>
                                Holiday entries are <strong>excluded</strong> from your hour total.
                                The 500-hour target is unchanged.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Footer ──────────────────────────────────────────────────── */}
                <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-400 focus:outline-none hover:text-slate-200 bg-transparent hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2.5 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-indigo-400 active:scale-95 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-indigo-400/50 focus:outline-none"
                    >
                        {mode === "add" ? "Add Entry" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}