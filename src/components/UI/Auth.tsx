// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/components/UI/Auth.tsx
// REASON: Update — role-based redirect after login via useEffect
//
// Post-login strategy:
//   signIn() → onAuthStateChange fires → updates user + isAdmin in context
//   useEffect watches (pendingNav + user + isAdmin) → navigates once settled
//   This avoids the race condition of navigating before isAdmin is populated.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { useAuthContext }      from "../../context/auth-context";
import { supabase }            from "../../lib/supabase";
import BsuLogoImg              from "../../assets/bsu-logo.png";

export function Auth() {
  const navigate                           = useNavigate();
  const { user, isAdmin, loading, signIn } = useAuthContext();

  const [isLogin,    setIsLogin]    = useState(true);
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  // Flag: set to true on successful signIn to trigger navigation effect
  const [pendingNav, setPendingNav] = useState(false);

  // ── Navigate once isAdmin is definitively resolved after login ───────────
  // Waits for onAuthStateChange to fire and populate isAdmin before navigating.
  useEffect(() => {
    if (pendingNav && !loading && user) {
      navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
    }
  }, [pendingNav, loading, user, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (isLogin) {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err);
        setSubmitting(false);
      } else {
        // Keep submitting=true (button disabled) until navigation fires
        setPendingNav(true);
      }
    } else {
      if (!supabase) {
        setError("Sign-up is not available in offline mode.");
        setSubmitting(false);
        return;
      }
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message);
      } else {
        alert("Check your email to confirm your account, then sign in.");
        setIsLogin(true);
      }
      setSubmitting(false);
    }
  };

  const isDisabled = submitting || pendingNav;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {/* Logo + heading */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-20 h-20 mx-auto flex items-center justify-center mb-4">
          <img
            src={BsuLogoImg}
            alt="BSU Logo"
            className="w-full h-full object-contain drop-shadow-xl"
          />
        </div>
        <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">
          {isLogin ? "Sign in to OJTracker" : "Create an account"}
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          {isLogin ? "Track your OJT hours securely." : "Join your company's OJT program."}
        </p>
        {!supabase && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-sm">
            <p className="font-semibold">Offline mode — Supabase not configured.</p>
          </div>
        )}
      </div>

      {/* Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-card py-8 px-4 sm:rounded-2xl sm:px-10 border border-slate-800 shadow-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isDisabled}
                  placeholder="intern@bsu.edu.ph"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isDisabled}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 transition-all text-sm"
                />
              </div>
            </div>

            {/* Inline error */}
            {error && (
              <div
                id="auth-error"
                className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2"
              >
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="auth-submit"
              type="submit"
              disabled={isDisabled}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-accent hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
            >
              {isDisabled && (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                </svg>
              )}
              {isDisabled
                ? (pendingNav ? "Redirecting…" : "Signing in…")
                : isLogin ? "Sign in" : "Create account"
              }
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-7 pt-6 border-t border-slate-700/50 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              disabled={isDisabled}
              className="text-sm text-slate-500 hover:text-slate-200 disabled:opacity-50 transition-colors"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-accent font-semibold underline underline-offset-4 decoration-accent/30">
                {isLogin ? "Sign up" : "Sign in"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
