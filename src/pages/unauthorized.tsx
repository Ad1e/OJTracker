// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/pages/unauthorized.tsx
// REASON: New — 403 access-denied page shown when intern visits /admin
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans">
      <div className="glass-card max-w-sm w-full p-10 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-7 h-7 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        {/* Text */}
        <h1 className="text-xl font-display font-extrabold text-white mb-2 tracking-tight">
          Access Denied
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          You don't have permission to view this page.
          Only administrators can access the admin panel.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-indigo-400 transition-all shadow-[0_0_15px_rgba(99,102,241,0.25)]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Dashboard
          </Link>
          <Link
            to="/login"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-4"
          >
            Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  );
}
