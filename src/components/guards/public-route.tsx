import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../../context/auth-context";

export function PublicRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuthContext();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-accent animate-spin" />
      </div>
    );
  }
  if (user) return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  return <>{children}</>;
}
