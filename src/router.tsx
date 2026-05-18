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

import { RouteGuard }      from "./components/guards/route-guard";
import { PublicRoute }     from "./components/guards/public-route";
import { RootLayout }      from "./layouts/root-layout";

import { Auth }            from "./components/UI/Auth";
import AdminDashboard      from "./pages/admin-dashboard";
import AdminInternView     from "./pages/admin-intern-view";
import InternDashboard     from "./pages/intern-dashboard";
import Unauthorized        from "./pages/unauthorized";

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
