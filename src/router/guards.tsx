// ─── src/router/guards.tsx ───────────────────────────────────────────────────
// Client-side route guards. Server-side enforcement is via Supabase RLS.
//
// Guard behaviour:
//   UnauthRoute  — unauthenticated only; redirects logged-in users by role
//   AdminRoute   — admin only; intern → /unauthorized, unauthed → /login
//   InternRoute  — intern only; admin → /admin, unauthed → /login
//   RootRedirect — "/" and "*" → /admin or /dashboard based on role
//
// IMPORTANT: AuthProvider blocks rendering while loading=true, so guards
// always receive a definitive role — no loading state needed here.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from "react";
import { Navigate }       from "react-router-dom";
import { useAuthContext } from "../context/auth-context";

// ─── Guards ───────────────────────────────────────────────────────────────────

/** Only renders children for unauthenticated users. */
export function UnauthRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuthContext();
  if (!user) return <>{children}</>;
  return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
}

/** Admin-only guard.
 *  - Intern visiting /admin → /unauthorized
 *  - Unauthenticated → /login */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuthContext();
  if (!user)    return <Navigate to="/login"        replace />;
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

/** Intern-only guard.
 *  - Admin visiting /dashboard → /admin
 *  - Unauthenticated → /login */
export function InternRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuthContext();
  if (!user)   return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

/** Root "/" and "*" — redirect based on auth/role. */
export function RootRedirect() {
  const { user, isAdmin } = useAuthContext();
  if (!user) return <Navigate to="/login"     replace />;
  return       <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
}
