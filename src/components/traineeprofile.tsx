import React, { useState, useRef, useCallback, useEffect } from "react";

export interface TraineeProfileData {
    name: string;
    department: string;
    supervisor: string;
    school: string;
    totalRequiredHours: number;
    avatarDataUrl: string | null;
    startDate: string;
}

interface TraineeProfileProps {
    onSave: (profile: TraineeProfileData) => void;
    initial?: Partial<TraineeProfileData>;
    onCancel?: () => void;
    canCancel?: boolean;
}

function getInitials(name: string): string {
    return name
        .split(/[\s,]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

const inputClass =
    "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent shadow-inner transition-colors";

const inputErrorClass =
    "w-full px-3 py-2.5 text-sm rounded-lg border border-red-500/50 bg-red-900/10 text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors";

function Field({
    label,
    error,
    required,
    hint,
    children,
}: {
    label: string;
    error?: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {label} {required && <span className="text-accent">*</span>}
            </label>
            {children}
            {hint && !error && <p className="text-[11px] text-slate-500">{hint}</p>}
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

function AvatarUpload({
    value,
    name,
    onChange,
}: {
    value: string | null;
    name: string;
    onChange: (dataUrl: string | null) => void;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const processFile = useCallback(
        (file: File) => {
            if (!file.type.startsWith("image/")) return;
            const reader = new FileReader();
            reader.onload = (e) => onChange((e.target?.result as string) || null);
            reader.readAsDataURL(file);
        },
        [onChange]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    const initials = getInitials(name) || "PL";

    return (
        <div className="flex flex-col items-center gap-3">
            <div
                className={`relative w-24 h-24 rounded-full cursor-pointer group transition-all duration-200 ${
                    dragging
                        ? "ring-2 ring-accent ring-offset-2 ring-offset-slate-900 scale-105"
                        : "ring-1 ring-slate-700 hover:ring-accent/50"
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                role="button"
                aria-label="Upload profile photo"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            >
                {value ? (
                    <img src={value} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                    <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
                        <span className="font-display text-2xl font-bold text-slate-400 select-none">{initials}</span>
                    </div>
                )}

                <div className="absolute inset-0 rounded-full bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 pointer-events-none">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-[10px] text-white font-semibold">{value ? "Change" : "Upload"}</span>
                </div>
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processFile(file);
                }}
            />

            <div className="text-center">
                <p className="text-xs text-slate-400 font-medium">{value ? "Click to change photo" : "Upload your photo"}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">JPG, PNG</p>
            </div>

            {value && (
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="text-[11px] text-slate-500 hover:text-red-400 transition-colors font-medium"
                >
                    Remove photo
                </button>
            )}
        </div>
    );
}

function StepDots({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-2">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                        i === current
                            ? "w-6 h-1.5 bg-accent shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                            : i < current
                            ? "w-1.5 h-1.5 bg-indigo-700"
                            : "w-1.5 h-1.5 bg-slate-700"
                    }`}
                />
            ))}
        </div>
    );
}

const TOTAL_STEPS = 2;

export function TraineeProfile({ onSave, initial, onCancel, canCancel = true }: TraineeProfileProps) {
    const [step, setStep] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState<TraineeProfileData>({
        name: initial?.name ?? "Mazan, Aldwin C.",
        department: initial?.department ?? "CICS-IT-4202",
        supervisor: initial?.supervisor ?? "Engr. Rodrigo Rodolfo A. Irineo Jr.",
        school: initial?.school ?? "Batangas State University",
        totalRequiredHours: initial?.totalRequiredHours ?? 500,
        avatarDataUrl: initial?.avatarDataUrl ?? null,
        startDate: initial?.startDate ?? "2026-02-19",
    });
    const [errors, setErrors] = useState<Partial<Record<keyof TraineeProfileData, string>>>({});

    useEffect(() => {
        setForm({
            name: initial?.name ?? "Mazan, Aldwin C.",
            department: initial?.department ?? "CICS-IT-4202",
            supervisor: initial?.supervisor ?? "Engr. Rodrigo Rodolfo A. Irineo Jr.",
            school: initial?.school ?? "Batangas State University",
            totalRequiredHours: initial?.totalRequiredHours ?? 500,
            avatarDataUrl: initial?.avatarDataUrl ?? null,
            startDate: initial?.startDate ?? "2026-02-19",
        });
        setStep(0);
        setSubmitted(false);
        setErrors({});
    }, [initial]);

    const set = useCallback(<K extends keyof TraineeProfileData>(key: K, value: TraineeProfileData[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    const validateStep0 = useCallback(() => {
        const e: Partial<Record<keyof TraineeProfileData, string>> = {};
        if (!form.name.trim()) e.name = "Full name is required.";
        if (!form.department.trim()) e.department = "Department/Section is required.";
        return e;
    }, [form]);

    const validateStep1 = useCallback(() => {
        const e: Partial<Record<keyof TraineeProfileData, string>> = {};
        if (!form.supervisor.trim()) e.supervisor = "Supervisor name is required.";
        if (form.totalRequiredHours < 1) e.totalRequiredHours = "Must be at least 1 hour.";
        return e;
    }, [form]);

    const handleNext = () => {
        const e = validateStep0();
        setSubmitted(true);
        if (Object.keys(e).length > 0) {
            setErrors(e);
            return;
        }
        setErrors({});
        setStep(1);
    };

    const handleSave = () => {
        const e = validateStep1();
        setSubmitted(true);
        if (Object.keys(e).length > 0) {
            setErrors(e);
            return;
        }
        onSave(form);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-lg glass-card overflow-hidden bg-surface animate-slide-up">
                <div className="relative px-6 pt-6 pb-5 border-b border-slate-700/50 bg-slate-800/30 overflow-hidden">
                    <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                                <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">Trainee Setup</span>
                            </div>
                            <h2 className="text-lg font-display font-bold text-white tracking-tight">
                                {step === 0 ? "Your Profile" : "Internship Details"}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {step === 0 ? "Tell us who you are." : "Configure your internship parameters."}
                            </p>
                        </div>
                        <StepDots current={step} total={TOTAL_STEPS} />
                    </div>
                </div>

                {step === 0 && (
                    <div className="px-6 py-5 flex flex-col gap-5">
                        <AvatarUpload value={form.avatarDataUrl} name={form.name} onChange={(v) => set("avatarDataUrl", v)} />

                        <div className="h-px bg-slate-700/50" />

                        <Field label="Full Name" required error={submitted ? errors.name : undefined}>
                            <input
                                type="text"
                                value={form.name}
                                placeholder="Mazan, Aldwin C."
                                onChange={(e) => set("name", e.target.value)}
                                className={submitted && errors.name ? inputErrorClass : inputClass}
                                autoFocus
                            />
                        </Field>

                        <Field label="Department / Section" required error={submitted ? errors.department : undefined}>
                            <input
                                type="text"
                                value={form.department}
                                placeholder="CICS-IT-4202"
                                onChange={(e) => set("department", e.target.value)}
                                className={submitted && errors.department ? inputErrorClass : inputClass}
                            />
                        </Field>

                        <Field label="School / University">
                            <input
                                type="text"
                                value={form.school}
                                placeholder="Batangas State University"
                                onChange={(e) => set("school", e.target.value)}
                                className={inputClass}
                            />
                        </Field>
                    </div>
                )}

                {step === 1 && (
                    <div className="px-6 py-5 flex flex-col gap-5">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                            <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden ring-1 ring-slate-600 flex items-center justify-center bg-slate-700">
                                {form.avatarDataUrl ? (
                                    <img src={form.avatarDataUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-slate-300">{getInitials(form.name) || "PL"}</span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{form.name || "-"}</p>
                                <p className="text-[11px] text-slate-400 truncate">{form.department || "-"}</p>
                            </div>
                        </div>

                        <Field label="Training Supervisor" required error={submitted ? errors.supervisor : undefined}>
                            <input
                                type="text"
                                value={form.supervisor}
                                placeholder="Engr. Rodrigo Rodolfo A. Irineo Jr."
                                onChange={(e) => set("supervisor", e.target.value)}
                                className={submitted && errors.supervisor ? inputErrorClass : inputClass}
                                autoFocus
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Required Hours" required error={submitted ? errors.totalRequiredHours : undefined}>
                                <input
                                    type="number"
                                    value={form.totalRequiredHours}
                                    min={1}
                                    max={9999}
                                    onChange={(e) => set("totalRequiredHours", parseInt(e.target.value, 10) || 500)}
                                    className={submitted && errors.totalRequiredHours ? inputErrorClass : inputClass}
                                />
                            </Field>

                            <Field label="OJT Start Date">
                                <input
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) => set("startDate", e.target.value)}
                                    className={inputClass}
                                    style={{ colorScheme: "dark" }}
                                />
                            </Field>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between px-6 pb-6 pt-2">
                    <div className="flex items-center gap-2">
                        {canCancel && onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 bg-transparent hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700"
                            >
                                Cancel
                            </button>
                        )}
                        {step > 0 && (
                            <button
                                type="button"
                                onClick={() => setStep(0)}
                                className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 bg-transparent hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700"
                            >
                                Back
                            </button>
                        )}
                    </div>

                    {step < TOTAL_STEPS - 1 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-indigo-400 active:scale-95 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-indigo-400 active:scale-95 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                        >
                            Save Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
