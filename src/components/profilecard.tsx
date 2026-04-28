import type { TraineeProfileData } from "./traineeprofile";
import type { HoursCalcResult } from "../hooks/useHoursCalc";

interface ProfileCardProps {
    profile: TraineeProfileData;
    onEdit?: () => void;
    stats?: HoursCalcResult;
}

function getInitials(name: string): string {
    return name
        .split(/[\s,]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

function ProfileAvatar({
    src,
    name,
    size = "md",
}: {
    src: string | null;
    name: string;
    size?: "sm" | "md" | "lg";
}) {
    const dim = { sm: "w-8 h-8 text-xs", md: "w-11 h-11 text-sm", lg: "w-16 h-16 text-xl" }[size];
    return (
        <div className={`${dim} rounded-full shrink-0 ring-1 ring-slate-600 overflow-hidden flex items-center justify-center bg-slate-800`}>
            {src ? (
                <img src={src} alt={name} className="w-full h-full object-cover" />
            ) : (
                <span className="font-display font-bold text-slate-300 select-none">{getInitials(name) || "PL"}</span>
            )}
        </div>
    );
}

export function ProfileStrip({ profile, onEdit }: ProfileCardProps) {
    return (
        <div className="flex items-center gap-3">
            <ProfileAvatar src={profile.avatarDataUrl} name={profile.name} size="sm" />
            <div className="hidden sm:block">
                <p className="text-xs font-semibold text-white leading-none">{profile.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{profile.department}</p>
            </div>
            {onEdit && (
                <button
                    onClick={onEdit}
                    title="Edit profile"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-accent hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                    aria-label="Edit profile"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export function ProfileCard({ profile, onEdit, stats }: ProfileCardProps) {
    return (
        <div className="glass-card p-5 relative overflow-hidden group">
            <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-accent/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <ProfileAvatar src={profile.avatarDataUrl} name={profile.name} size="lg" />
                    <div>
                        <p className="font-display font-bold text-white text-base leading-tight">{profile.name}</p>
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent/10 text-indigo-300 ring-1 ring-accent/20">
                            <span className="w-1 h-1 rounded-full bg-accent" />
                            {profile.department}
                        </span>
                    </div>
                </div>

                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-700"
                        aria-label="Edit profile"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="h-px bg-slate-700/60 mb-4" />

            <div className="space-y-2.5">
                <DetailRow label="Supervisor" value={profile.supervisor} />
                <DetailRow label="School" value={profile.school || "Batangas State University"} />
                <DetailRow label="Target Hours" value={`${profile.totalRequiredHours.toLocaleString()} hours`} />
                <DetailRow
                    label="Start Date"
                    value={profile.startDate
                        ? new Date(profile.startDate + "T00:00:00").toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                          })
                        : "Not set"}
                />

                {stats && (
                    <>
                        <div className="h-px bg-slate-700/60 my-2" />
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <svg className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                                <polyline points="13 2 13 9 20 9" />
                            </svg>
                            <div className="min-w-0">
                                <p className="text-[11px] text-indigo-300 uppercase tracking-wider font-semibold">Est. Completion</p>
                                <p className="text-xs text-indigo-200 font-semibold mt-1 break-words">
                                    {stats.estimatedCompletionDate || "All hours completed! 🎉"}
                                </p>
                                {stats.remaining > 0 && (
                                    <p className="text-[10px] text-indigo-300/70 mt-1">
                                        {stats.remaining.toFixed(1)}h remaining · {stats.avgHoursPerDay.toFixed(1)}h/day avg
                                    </p>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start gap-2.5">
            <div className="min-w-0">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
                <p className="text-xs text-slate-300 font-medium leading-snug mt-0.5 break-words">{value}</p>
            </div>
        </div>
    );
}
