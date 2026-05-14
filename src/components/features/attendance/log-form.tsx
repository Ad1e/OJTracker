// ─── src/components/features/attendance/log-form.tsx ────────────────────────
// Renamed from LogForm.tsx. Handles both "add" and "edit" modes.
// FormData type is local — it is only used inside this file.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from "react";
import type { LogEntry, FormMode } from "../../../types";
import { calcHoursWorked } from "../../../hooks";
import { to12h } from "../../../utils";

// ─── Local types ──────────────────────────────────────────────────────────────

interface FormData {
  date: string;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  activity: string;
  isHoliday: boolean;
}

interface FormErrors {
  date?: string;
  startTime?: string;
  endTime?: string;
  timeRange?: string;
  activity?: string;
}

interface LogFormProps {
  isOpen: boolean;
  mode: FormMode;
  initial: LogEntry | null;
  onSubmit: (data: Omit<LogEntry, "id" | "createdAt"> & { id?: string }) => Promise<void>;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputClass =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent shadow-inner transition-colors";

const inputErrorClass =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-red-500/50 bg-red-900/10 text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors";

function today(): string {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const EMPTY: FormData = {
  date:        today(),
  startTime:   "08:00",
  endTime:     "18:00",
  hoursWorked: 0,
  activity:    "",
  isHoliday:   false,
};

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.date) errors.date = "Required";
  if (!data.isHoliday) {
    if (!data.startTime) errors.startTime = "Required";
    if (!data.endTime)   errors.endTime   = "Required";
    if (data.startTime && data.endTime) {
      const computed = calcHoursWorked(data.startTime, data.endTime);
      if (computed <= 0) {
        errors.timeRange = "End time must be after start time (with at least a 1-hour gap for lunch).";
      }
    }
  }
  if (!data.activity.trim() || data.activity.trim().length < 3) {
    errors.activity = "Activity must be at least 3 characters.";
  }
  if (data.activity.length > 500) {
    errors.activity = "Activity must be 500 characters or fewer.";
  }
  return errors;
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
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
  const [form,      setForm]      = useState<FormData>(EMPTY);
  const [errors,    setErrors]    = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const activityRef = useRef<HTMLTextAreaElement>(null);

  // Reset / populate form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && initial) {
      const normaliseTime = (t: string): string => {
        if (!t) return "08:00";
        if (/^\d{2}:\d{2}$/.test(t)) return t;
        const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!m) return "08:00";
        let h = parseInt(m[1], 10);
        const min = m[2];
        const period = m[3].toUpperCase();
        if (period === "AM" && h === 12) h = 0;
        if (period === "PM" && h !== 12) h += 12;
        return `${String(h).padStart(2, "0")}:${min}`;
      };
      setForm({
        date:        initial.date,
        startTime:   normaliseTime(initial.startTime),
        endTime:     normaliseTime(initial.endTime),
        hoursWorked: initial.hoursWorked,
        activity:    initial.activity,
        isHoliday:   initial.isHoliday,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setSubmitted(false);
  }, [isOpen, mode, initial]);

  // Recompute hoursWorked whenever startTime/endTime/isHoliday changes
  useEffect(() => {
    if (form.isHoliday) {
      setForm((prev) => ({ ...prev, hoursWorked: 0 }));
    } else if (form.startTime && form.endTime) {
      setForm((prev) => ({
        ...prev,
        hoursWorked: calcHoursWorked(prev.startTime, prev.endTime),
      }));
    }
  }, [form.startTime, form.endTime, form.isHoliday]);

  // Revalidate on change once user has submitted once
  useEffect(() => {
    if (submitted) setErrors(validate(form));
  }, [form, submitted]);

  // Trap focus when open
  useEffect(() => {
    if (isOpen) setTimeout(() => activityRef.current?.focus(), 60);
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitted(true);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await onSubmit({
        ...(initial?.id && { id: initial.id }),
        day:         initial?.day ?? 0,
        date:        form.date,
        startTime:   form.isHoliday ? "" : form.startTime,
        endTime:     form.isHoliday ? "" : form.endTime,
        hoursWorked: form.hoursWorked,
        activity:    form.activity.trim(),
        isHoliday:   form.isHoliday,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [form, initial, onSubmit, onClose]);

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
      <div className="relative w-full max-w-lg glass-card overflow-hidden bg-surface animate-slide-up">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="relative px-6 pt-6 pb-5 border-b border-slate-700/50 bg-slate-800/30 overflow-hidden">
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">
                  {mode === "add" ? "New Entry" : "Edit Entry"}
                </span>
              </div>
              <h2 className="text-lg font-display font-bold text-white tracking-tight">
                {mode === "add" ? "Log a Work Day" : "Update Entry"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
              aria-label="Close form"
            >
              <svg className="w-4 h-4" viewBox="0 0 14 14" fill="currentColor">
                <path d="M8.414 7l3.293-3.293a1 1 0 00-1.414-1.414L7 5.586 3.707 2.293A1 1 0 002.293 3.707L5.586 7 2.293 10.293a1 1 0 101.414 1.414L7 8.414l3.293 3.293a1 1 0 001.414-1.414L8.414 7z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto max-h-[65vh]">

          {/* Date */}
          <Field label="Date" error={submitted ? errors.date : undefined}>
            <input
              id="log-form-date"
              type="date"
              value={form.date}
              onChange={(e) => setField("date", e.target.value)}
              className={submitted && errors.date ? inputErrorClass : inputClass}
              style={{ colorScheme: "dark" }}
            />
          </Field>

          {/* Activity */}
          <Field label="Activity / Tasks" error={submitted ? errors.activity : undefined}>
            <textarea
              id="log-form-activity"
              ref={activityRef}
              value={form.activity}
              onChange={(e) => setField("activity", e.target.value)}
              rows={3}
              placeholder="Describe what you worked on today…"
              className={`${submitted && errors.activity ? inputErrorClass : inputClass} resize-none leading-relaxed`}
            />
            <p className="text-[11px] text-slate-600 text-right tabular-nums">
              {form.activity.length}/500
            </p>
          </Field>

          {/* Time inputs */}
          {!form.isHoliday && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Time" error={submitted ? errors.startTime : undefined}>
                <input
                  id="log-form-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setField("startTime", e.target.value)}
                  className={submitted && errors.startTime ? inputErrorClass : inputClass}
                  style={{ colorScheme: "dark" }}
                />
              </Field>
              <Field label="End Time" error={submitted ? errors.endTime : undefined}>
                <input
                  id="log-form-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setField("endTime", e.target.value)}
                  className={submitted && errors.endTime ? inputErrorClass : inputClass}
                  style={{ colorScheme: "dark" }}
                />
              </Field>
            </div>
          )}

          {submitted && errors.timeRange && (
            <p className="text-[11px] text-red-400 font-medium flex items-center gap-1 -mt-3">
              <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm.75 8.25h-1.5v-1.5h1.5v1.5zm0-3h-1.5v-3h1.5v3z" />
              </svg>
              {errors.timeRange}
            </p>
          )}

          <div className="grid grid-cols-3 gap-4 items-start">
            {/* Total hours (read-only) */}
            <div className="col-span-1">
              <Field label="Total Hours">
                <div className={`${inputClass} flex items-center justify-between cursor-default opacity-70`}>
                  <span className="tabular-nums font-semibold text-slate-200">
                    {form.isHoliday ? "—" : `${form.hoursWorked}h`}
                  </span>
                  <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </Field>
            </div>

            {/* Holiday toggle */}
            <div className="col-span-2">
              <Field label="Mark as Holiday">
                <button
                  id="log-form-holiday-toggle"
                  type="button"
                  onClick={() => setField("isHoliday", !form.isHoliday)}
                  className={`${inputClass} flex items-center gap-2.5 cursor-pointer text-left transition-all ${form.isHoliday ? "border-amber-500/50 bg-amber-500/5 text-amber-200" : ""}`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${form.isHoliday ? "bg-amber-400/20 border-amber-500/60" : "border-slate-600"}`}>
                    {form.isHoliday && (
                      <svg className="w-2.5 h-2.5 text-amber-400" viewBox="0 0 12 10" fill="currentColor">
                        <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm">
                    {form.isHoliday ? "✨ Holiday / No-work day" : "Regular work day"}
                  </span>
                </button>
              </Field>
            </div>
          </div>

          {/* Holiday details */}
          {form.isHoliday && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-300">
              <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Holiday entries do not count toward rendered hours but are recorded in the log.</span>
            </div>
          )}

          {/* Time summary pill */}
          {!form.isHoliday && form.hoursWorked > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/15 text-xs text-indigo-300">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span>
                {to12h(form.startTime)} → {to12h(form.endTime)} ·{" "}
                <strong className="text-indigo-200">{form.hoursWorked}h</strong> net (1h lunch deducted)
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2 border-t border-slate-700/30">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 bg-transparent hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            id="log-form-submit"
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
