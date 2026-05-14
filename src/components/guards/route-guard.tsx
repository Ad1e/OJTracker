// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/components/guards/route-guard.tsx
// REASON: New — client-side route protection with 5-step logic
//
// Step 1: loading → full-screen spinner (AuthProvider normally handles this)
// Step 2: no user → /login
// Step 3: requireAdmin=true && !isAdmin → /unauthorized
// Step 4: requireAdmin=false && isAdmin → /admin
// Step 5: render children
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode }  from "react";
import { Navigate }        from "react-router-dom";
import { useAuthContext }  from "../../context/auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RouteGuardProps {
  /**
   * true  → admin-only route  (intern redirected to /unauthorized)
   * false → intern-only route (admin redirected to /admin)
   * omit  → any authenticated user
   */
  requireAdmin?: boolean;
  children: ReactNode;
}

// ─── Fallback spinner ─────────────────────────────────────────────────────────

function GuardSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 relative">
        <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
      </div>
    </div>
  );
}

// ─── Guard ────────────────────────────────────────────────────────────────────

export function RouteGuard({ requireAdmin, children }: RouteGuardProps) {
  const { user, isAdmin, loading } = useAuthContext();

  // 1. Auth still resolving (defensive — AuthProvider normally blocks first)
  if (loading) return <GuardSpinner />;

  // 2. Not authenticated → login
  if (!user) return <Navigate to="/login" replace />;

  // 3. Admin-only route but user is not admin → access denied
  if (requireAdmin === true && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 4. Intern-only route but user is admin → admin dashboard
  if (requireAdmin === false && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // 5. All checks passed
  return <>{children}</>;
}
