// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/router.tsx
// REASON: Update — canonical router with all new page locations
//
// Route tree:
//   RootLayout (AuthProvider wraps everything via Outlet)
//   ├── /login            PublicRoute → Auth (redirects if already logged in)
//   ├── /unauthorized     Unauthorized
//   ├── RouteGuard(admin) → Outlet
//   │   ├── /admin                    AdminDashboard
//   │   └── /admin/interns/:userId    AdminInternView
//   ├── RouteGuard(intern) → Outlet
//   │   └── /dashboard    InternDashboard
//   └── *                 → /login
// ─────────────────────────────────────────────────────────────────────────────
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import type { ReactNode }                        from "react";

import { AuthProvider }    from "./context/auth-context";
import { useAuthContext }  from "./context/auth-context";
import { RouteGuard }      from "./components/guards/route-guard";

import { Auth }            from "./components/UI/Auth";
import AdminDashboard      from "./pages/admin-dashboard";
import AdminInternView     from "./pages/admin-intern-view";
import InternDashboard     from "./pages/intern-dashboard";
import Unauthorized        from "./pages/unauthorized";

// ─── Root layout — provides AuthContext to every route ────────────────────────

function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

// ─── Public route (/login) ────────────────────────────────────────────────────
// Reactively redirects already-logged-in users once onAuthStateChange fires.

function PublicRoute({ children }: { children: ReactNode }) {
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

// ─── Router ───────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [

      // ── Public ──────────────────────────────────────────────────────────
      {
        path: "/login",
        element: <PublicRoute><Auth /></PublicRoute>,
      },

      // ── Access denied ────────────────────────────────────────────────────
      {
        path: "/unauthorized",
        element: <Unauthorized />,
      },

      // ── Admin-only ───────────────────────────────────────────────────────
      {
        element: (
          <RouteGuard requireAdmin={true}>
            <Outlet />
          </RouteGuard>
        ),
        children: [
          { path: "/admin",                 element: <AdminDashboard /> },
          { path: "/admin/interns/:userId", element: <AdminInternView /> },
        ],
      },

      // ── Intern-only ──────────────────────────────────────────────────────
      {
        element: (
          <RouteGuard requireAdmin={false}>
            <Outlet />
          </RouteGuard>
        ),
        children: [
          { path: "/dashboard", element: <InternDashboard /> },
        ],
      },

      // ── Catch-all ────────────────────────────────────────────────────────
      {
        path: "*",
        element: <Navigate to="/login" replace />,
      },
    ],
  },
]);
