// ─── src/hooks/use-user-role.ts ───────────────────────────────────────────────
// Resolves the authenticated user's role by inspecting the database.
//
// Role resolution logic (matches actual DB schema):
//   1. Check profiles.is_admin WHERE profiles.id = auth.users.id
//        true  → role = "admin"  (ONLY explicit grant)
//        false / null / no row → continue
//   2. Resolve users row: users.auth_id = auth.users.id → get users.id
//   3. Check interns.user_id = users.id → role = "intern"
//   4. Fallback → role = "intern"  (principle of least privilege)
//      Errors also fall back to "intern" — never silently grant admin.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { supabase }            from "../lib/supabase";

export type UserRole = "intern" | "admin" | "loading";

export interface RoleResult {
  role:     UserRole;
  userId:   string | null;   // Supabase auth UID
  email:    string | null;
  internId: string | null;   // DB interns row id (interns only)
}

const DEFAULT: RoleResult = { role: "loading", userId: null, email: null, internId: null };

export function useUserRole(session: boolean): RoleResult {
  const [result, setResult] = useState<RoleResult>(DEFAULT);

  useEffect(() => {
    if (!session) {
      setResult(DEFAULT);
      return;
    }

    // ── Mock / offline session ─────────────────────────────────────────────
    if (!supabase) {
      // Default offline role to intern so existing dev flow works unchanged.
      // Change to "admin" here if you want to test the admin panel offline.
      setResult({ role: "intern", userId: "mock", email: "mock@local", internId: null });
      return;
    }

    let cancelled = false;

    async function resolve() {
      try {
        // 1. Get the authenticated user from Supabase Auth
        const { data: { user }, error: userErr } = await supabase!.auth.getUser();
        if (userErr || !user) { setResult({ ...DEFAULT, role: "intern" }); return; }

        const authId = user.id;           // auth.users.id
        const email  = user.email ?? null;

        // 2. Check profiles.is_admin (profiles.id = auth.users.id)
        // maybeSingle() returns null (not an error) when no row exists.
        const { data: profile } = await supabase!
          .from("profiles")
          .select("is_admin")
          .eq("id", authId)
          .maybeSingle();

        if (profile?.is_admin === true) {
          if (!cancelled) setResult({ role: "admin", userId: authId, email, internId: null });
          return;
        }

        // 3. Resolve users row: users.auth_id = authId
        const { data: userRow } = await supabase!
          .from("users")
          .select("id")
          .eq("auth_id", authId)
          .maybeSingle();

        if (userRow) {
          // 4. Check interns.user_id = users.id
          const { data: intern } = await supabase!
            .from("interns")
            .select("id")
            .eq("user_id", userRow.id)
            .single();

          if (intern) {
            if (!cancelled) setResult({ role: "intern", userId: authId, email, internId: intern.id });
            return;
          }
        }

        // 5. No matching intern record — default to intern (least privilege).
        //    If you expect this user to be an admin, set profiles.is_admin = true.
        if (!cancelled) setResult({ role: "intern", userId: authId, email, internId: null });

      } catch {
        // On any unexpected error, fall back to intern — never silently grant admin.
        if (!cancelled) setResult({ role: "intern", userId: null, email: null, internId: null });
      }
    }

    void resolve();
    return () => { cancelled = true; };
  }, [session]);

  return result;
}
