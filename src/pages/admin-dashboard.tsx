// ─── src/pages/admin-dashboard.tsx ───────────────────────────────────────────
// Admin roster + intern registration flow.
//
// How the intern/admin system works:
//   1. A user signs up → row in auth.users + profiles (is_admin = false by default)
//   2. Admin opens "Register Intern" → picks the user, sets school ID / hours / company
//   3. Admin clicks Register → row inserted into interns table
//   4. Intern can now log in and see their dashboard (/dashboard)
//
// Admin never manually touches Supabase SQL editor.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from "react";
import { useNavigate }                    from "react-router-dom";
import { useAuthContext }                 from "../context/auth-context";
import {
  useAdmin, useCompanies, useUnregisteredProfiles, registerIntern,
}                                         from "../hooks/use-admin";
import type {
  InternSummary, InternStatus, Company, RegisterInternPayload,
}                                         from "../hooks/use-admin";

// ─── Reusable UI pieces ───────────────────────────────────────────────────────

const STATUS_STYLES: Record<InternStatus, string> = {
  "completed": "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  "on-track":  "bg-indigo-500/10  text-indigo-300  ring-indigo-500/20",
  "at-risk":   "bg-amber-500/10   text-amber-300   ring-amber-500/20",
  "behind":    "bg-red-500/10     text-red-300     ring-red-500/20",
};
const STATUS_LABELS: Record<InternStatus, string> = {
  "completed": "Completed", "on-track": "On Track", "at-risk": "At Risk", "behind": "Behind",
};

function StatusBadge({ status }: { status: InternStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${STATUS_STYLES[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function MiniBar({ pct }: { pct: number }) {
  const colour = pct >= 100 ? "bg-emerald-400" : pct >= 60 ? "bg-indigo-400" : pct >= 30 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colour}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: "indigo" | "emerald" | "amber" | "red" }) {
  const c = { indigo: "border-indigo-500/20 text-indigo-300", emerald: "border-emerald-500/20 text-emerald-300", amber: "border-amber-500/20 text-amber-300", red: "border-red-500/20 text-red-300" }[accent];
  return (
    <div className={`glass-card p-5 border ${c}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-display font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm bg-slate-900/60 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/50 transition";

// ─── Register Intern Modal ────────────────────────────────────────────────────

interface RegisterModalProps {
  onClose:    () => void;
  onSuccess:  () => void;
}

function RegisterInternModal({ onClose, onSuccess }: RegisterModalProps) {
  const { profiles, loading: profilesLoading } = useUnregisteredProfiles();
  const { companies, loading: companiesLoading, createCompany } = useCompanies();

  // form state
  const [userId,        setUserId]        = useState("");
  const [name,          setName]          = useState("");
  const [schoolId,      setSchoolId]      = useState("");
  const [requiredHours, setRequiredHours] = useState(500);
  const [enrolledAt,    setEnrolledAt]    = useState(new Date().toISOString().slice(0, 10));
  const [companyId,     setCompanyId]     = useState("");

  // new company sub-form
  const [showNewCompany,    setShowNewCompany]    = useState(false);
  const [newCompanyName,    setNewCompanyName]    = useState("");
  const [newCompanyAddr,    setNewCompanyAddr]    = useState("");
  const [newSupervisorName, setNewSupervisorName] = useState("");
  const [newSupervisorEmail,setNewSupervisorEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Auto-fill name from profile selection
  const handleUserChange = useCallback((id: string) => {
    setUserId(id);
    const found = profiles.find((p) => p.id === id);
    if (found) setName(found.full_name || found.email.split("@")[0]);
  }, [profiles]);

  const handleCreateCompany = useCallback(async () => {
    if (!newCompanyName.trim()) return;
    const c = await createCompany({
      name: newCompanyName, address: newCompanyAddr,
      supervisorName: newSupervisorName, supervisorEmail: newSupervisorEmail,
    });
    if (c) {
      setCompanyId(c.id);
      setShowNewCompany(false);
      setNewCompanyName(""); setNewCompanyAddr(""); setNewSupervisorName(""); setNewSupervisorEmail("");
    }
  }, [createCompany, newCompanyName, newCompanyAddr, newSupervisorName, newSupervisorEmail]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !companyId) { setError("Please select a user and a company."); return; }
    setSubmitting(true);
    setError(null);
    const payload: RegisterInternPayload = { userId, name, schoolId, requiredHours, enrolledAt, companyId };
    const { error: err } = await registerIntern(payload);
    if (err) { setError(err); setSubmitting(false); return; }
    onSuccess();
  }, [userId, name, schoolId, requiredHours, enrolledAt, companyId, onSuccess]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg glass-card overflow-hidden animate-slide-up">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/50">
          <div>
            <h2 className="text-base font-display font-bold text-white">Register New Intern</h2>
            <p className="text-xs text-slate-500 mt-0.5">Create an intern profile for a signed-up user</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* How it works banner */}
        <div className="px-6 py-3 bg-indigo-500/5 border-b border-indigo-500/10">
          <p className="text-xs text-indigo-300/80 leading-relaxed">
            <span className="font-semibold text-indigo-300">How it works:</span>{" "}
            The intern must first sign up at <span className="font-mono text-indigo-200">/login</span>. Then select their
            account below, fill in the details, and click Register. They'll immediately be able to log in and see their dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* User picker */}
          <Field label="User account">
            {profilesLoading ? (
              <div className="text-xs text-slate-500 py-2">Loading users…</div>
            ) : profiles.length === 0 ? (
              <div className="text-xs text-amber-400 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3">
                No unregistered users found. All signed-up users already have intern profiles, or no one has signed up yet.
              </div>
            ) : (
              <select
                value={userId}
                onChange={(e) => handleUserChange(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Select a user…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ? `${p.full_name} (${p.email})` : p.email}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {/* Name */}
          <Field label="Full name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Juan dela Cruz" required />
          </Field>

          {/* School ID + Hours row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="School Intern ID">
              <input type="text" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className={inputCls} placeholder="e.g. 2024-00123" required />
            </Field>
            <Field label="Required Hours">
              <input type="number" value={requiredHours} onChange={(e) => setRequiredHours(Number(e.target.value))} className={inputCls} min={1} max={9999} required />
            </Field>
          </div>

          {/* Enrolled date */}
          <Field label="Enrolled Date">
            <input type="date" value={enrolledAt} onChange={(e) => setEnrolledAt(e.target.value)} className={inputCls} required />
          </Field>

          {/* Company picker */}
          <Field label="Company">
            {companiesLoading ? (
              <div className="text-xs text-slate-500 py-2">Loading companies…</div>
            ) : (
              <div className="space-y-2">
                <select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setShowNewCompany(false); }} className={inputCls}>
                  <option value="">Select a company…</option>
                  {companies.map((c: Company) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.supervisorName || "No supervisor"}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCompany((v) => !v)}
                  className="text-xs text-accent hover:text-indigo-300 transition-colors underline underline-offset-4"
                >
                  {showNewCompany ? "↑ Cancel new company" : "+ Create new company"}
                </button>
              </div>
            )}
          </Field>

          {/* New company sub-form */}
          {showNewCompany && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">New Company</p>
              <Field label="Company Name">
                <input type="text" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} className={inputCls} placeholder="Acme Corp" />
              </Field>
              <Field label="Address">
                <input type="text" value={newCompanyAddr} onChange={(e) => setNewCompanyAddr(e.target.value)} className={inputCls} placeholder="Batangas City" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Supervisor Name">
                  <input type="text" value={newSupervisorName} onChange={(e) => setNewSupervisorName(e.target.value)} className={inputCls} placeholder="John Smith" />
                </Field>
                <Field label="Supervisor Email">
                  <input type="email" value={newSupervisorEmail} onChange={(e) => setNewSupervisorEmail(e.target.value)} className={inputCls} placeholder="john@acme.com" />
                </Field>
              </div>
              <button
                type="button"
                onClick={handleCreateCompany}
                disabled={!newCompanyName.trim()}
                className="w-full py-2 rounded-lg bg-slate-700 border border-slate-600 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-50 transition"
              >
                Add Company
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">{error}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-400 hover:text-white hover:border-slate-600 transition">
              Cancel
            </button>
            <button
              id="register-intern-submit"
              type="submit"
              disabled={submitting || profiles.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-indigo-400 disabled:opacity-50 transition shadow-[0_0_15px_rgba(99,102,241,0.3)]"
            >
              {submitting ? "Registering…" : "Register Intern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate             = useNavigate();
  const { profile, signOut } = useAuthContext();
  const { interns, stats, loading, error, refetch } = useAdmin();

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<InternStatus | "all">("all");
  const [showRegister, setShowRegister] = useState(false);

  const filtered = useMemo(() => {
    let list = interns;
    if (statusFilter !== "all") list = list.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.companyName.toLowerCase().includes(q) ||
        i.schoolId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [interns, search, statusFilter]);

  const handleRegisterSuccess = useCallback(() => {
    setShowRegister(false);
    refetch(); // reload roster so new intern appears immediately
  }, [refetch]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center gap-3 text-slate-400">
      <div className="w-8 h-8 relative">
        <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
      </div>
      <span className="text-sm font-medium">Loading roster…</span>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="glass-card max-w-sm p-8 text-center">
        <p className="text-sm font-semibold text-red-400 mb-2">Failed to load admin data</p>
        <p className="text-xs text-slate-500 mb-4">{error}</p>
        <button onClick={refetch} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-indigo-400 transition-all">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-slate-300 font-sans">

      {/* Header */}
      <header className="sticky top-0 z-30 glass-card rounded-none border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest leading-none mb-0.5">OJTracker</p>
              <p className="text-sm font-display font-bold text-white">{profile?.full_name ?? "Admin Dashboard"}</p>
            </div>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20 uppercase tracking-wider">Admin</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="register-intern-btn"
              onClick={() => setShowRegister(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-bold hover:bg-indigo-400 transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Register Intern
            </button>
            <button id="admin-signout" onClick={signOut} title="Sign out" className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border border-transparent hover:border-slate-700">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Interns" value={stats.totalInterns}                       accent="indigo"  />
          <StatCard label="Completed"     value={stats.completed}                           accent="emerald" />
          <StatCard label="At Risk"       value={stats.atRisk}                              accent="amber"   />
          <StatCard label="Total Hours"   value={`${stats.totalHoursLogged.toFixed(0)} h`} accent="indigo"  />
        </div>

        {/* Empty state — no interns at all */}
        {interns.length === 0 && (
          <div className="glass-card p-12 flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center bg-slate-800/30">
              <svg className="w-9 h-9 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <div>
              <p className="text-base font-display font-semibold text-white">No interns registered yet</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Interns must first <span className="text-slate-300 font-medium">sign up at /login</span>, then you register them here to grant access to their dashboard.
              </p>
            </div>
            <button
              onClick={() => setShowRegister(true)}
              className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-indigo-400 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
            >
              + Register First Intern
            </button>
          </div>
        )}

        {/* Search + filter */}
        {interns.length > 0 && (
          <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                id="admin-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, company, or school ID…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-900/50 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 transition"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "on-track", "at-risk", "behind", "completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter === s ? "bg-accent text-white" : "bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"}`}
                >
                  {s === "all" ? "All" : STATUS_LABELS[s as InternStatus]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Roster table */}
        {interns.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
              <h2 className="text-sm font-display font-bold text-white">Intern Roster</h2>
              <span className="text-xs text-slate-500">{filtered.length} intern{filtered.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-800/50">
                  <tr>
                    {["Name / School ID", "Company", "Enrolled", "Hours", "Progress", "Status", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-500">No interns match your search.</td></tr>
                  ) : filtered.map((intern: InternSummary) => (
                    <tr key={intern.id} className="group hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-white">{intern.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{intern.schoolId}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-300">{intern.companyName}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-mono whitespace-nowrap">
                        {new Date(intern.enrolledAt + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-300 tabular-nums">
                        {intern.hoursRendered.toFixed(1)} / {intern.requiredHours} h
                      </td>
                      <td className="px-4 py-3.5 min-w-[120px]"><MiniBar pct={intern.percentComplete} /></td>
                      <td className="px-4 py-3.5"><StatusBadge status={intern.status} /></td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => navigate(`/admin/interns/${intern.userId}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent hover:text-white"
                        >
                          View ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Register modal */}
      {showRegister && (
        <RegisterInternModal
          onClose={() => setShowRegister(false)}
          onSuccess={handleRegisterSuccess}
        />
      )}
    </div>
  );
}
