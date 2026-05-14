// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/context/auth-context.tsx
// REASON: New — React context wrapping useAuth; full-screen spinner while loading
//
// AuthProvider BLOCKS all rendering with a spinner until loading === false.
// This guarantees every route guard sees definitive role information.
// useAuthContext() throws a clear error if used outside the provider.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, type ReactNode } from "react";
import { useAuth, type AuthState }                   from "../hooks/use-auth";

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

// ─── Full-screen spinner ──────────────────────────────────────────────────────

function AuthSpinner() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
        <div className="absolute inset-3 rounded-full bg-accent/10" />
      </div>
      <p className="text-sm font-medium text-slate-500 tracking-wide animate-pulse">
        Verifying session…
      </p>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  // Block ALL rendering until auth state (including profile fetch) resolves.
  // Route guards receive a definitive role — no race condition possible.
  if (auth.loading) {
    return <AuthSpinner />;
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useAuthContext() must be used inside <AuthProvider>. " +
      "Wrap your component tree with <AuthProvider>.",
    );
  }
  return ctx;
}
