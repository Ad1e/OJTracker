// ─── src/pages/AdminPage.tsx ──────────────────────────────────────────────────
// Admin dashboard page — thin wrapper that feeds hooks into AdminDashboard.
// Route: /admin  (AdminRoute guard enforces admin-only access)
// ─────────────────────────────────────────────────────────────────────────────
import { useAuthContext }     from "../context/auth-context";
import { useAdminInterns } from "../hooks/use-admin-interns";
import { AdminDashboard }  from "../components/features/admin/AdminDashboard";

export default function AdminPage() {
  const { signOut }        = useAuthContext();
  const { interns, stats, loading, error } = useAdminInterns();

  return (
    <AdminDashboard
      interns={interns}
      stats={stats}
      loading={loading}
      error={error}
      onLogout={signOut}
    />
  );
}
