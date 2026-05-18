import type { ReactNode } from "react";
import { useAuth } from "../hooks/use-auth";
import { AuthContext } from "../context/auth-context";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.loading) {
    return <AuthSpinner />;
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}
