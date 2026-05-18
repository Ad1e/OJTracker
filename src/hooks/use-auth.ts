// ─── src/hooks/use-auth.ts ────────────────────────────────────────────────────
// Single source of truth for authentication state.
//
// Why two-phase init?
//   supabase.auth.getSession() reads from localStorage instantly (no network).
//   onAuthStateChange fires AFTER a possible token-refresh round-trip, which
//   can take several seconds and caused the long "Verifying session…" delay.
//
// Phase 1 — getSession() (sync-like, instant):
//   Set user immediately. Start profile fetch in background.
//   Clear loading spinner right away.
//
// Phase 2 — onAuthStateChange (subsequent events only):
//   Handles SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
//   Skips INITIAL_SESSION to avoid duplicate profile fetches.
//
// Safety net: 5-second timeout forces loading=false if anything hangs.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { type User }                        from "@supabase/supabase-js";
import { supabase }                         from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id:        string;
  email:     string;
  full_name: string;
  is_admin:  boolean;
}

export interface AuthState {
  user:    User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn:  (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// ─── Profile fetcher ──────────────────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id:        data.id        as string,
    email:     data.email     as string,
    full_name: data.full_name as string,
    is_admin:  Boolean(data.is_admin),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // ── No Supabase (offline dev mode) ────────────────────────────────────
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let phase1Succeeded = false;

    // ── Safety net: never spin longer than 2 seconds ──────────────────────
    console.log("[useAuth] Setting safety timeout...");
    const timeout = setTimeout(() => {
      console.log("[useAuth] Safety timeout fired!");
      if (mounted) setLoading(false);
    }, 2000);

    // ── Phase 1: instant local session read (no network) ──────────────────
    console.log("[useAuth] Starting getSession()");
    
    // We race getSession against a 1-second timer because sometimes Supabase 
    // hangs trying to refresh an expired token on a slow/sleeping project.
    Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: { session: null }, error: Error }>((_, reject) => 
        setTimeout(() => reject(new Error("getSession timeout")), 1500)
      )
    ])
      .then(async ({ data: { session }, error }: any) => {
        console.log("[useAuth] getSession() resolved. Error:", error, "Session:", !!session);
        if (!mounted) return;
        if (error) {
          console.error("Auth session error:", error);
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        phase1Succeeded = true;
        clearTimeout(timeout);
        setLoading(false); // ← spinner gone as soon as session is known

        // Fetch profile in the background — doesn't block the UI
        if (currentUser) {
          try {
            const p = await fetchProfile(currentUser.id);
            if (!mounted) return;
            setProfile(p);
            setIsAdmin(p?.is_admin ?? false);
          } catch (e) {
            console.error("Profile fetch error:", e);
          }
        }
      })
      .catch((err) => {
        console.error("Auth getSession exception:", err);
        if (mounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      });

    // ── Phase 2: listen for future auth events ────────────────────────────
    // INITIAL_SESSION is skipped (already handled by getSession above).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[useAuth] onAuthStateChange event:", event);
        if (!mounted) return;

        // Skip INITIAL_SESSION ONLY if Phase 1 already successfully got the session
        if (event === "INITIAL_SESSION" && phase1Succeeded) {
           console.log("[useAuth] Skipping INITIAL_SESSION because Phase 1 succeeded");
           return;
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const p = await fetchProfile(currentUser.id);
          if (!mounted) return;
          setProfile(p);
          setIsAdmin(p?.is_admin ?? false);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }

        // Ensure loading is cleared even if Phase 1 somehow didn't fire
        clearTimeout(timeout);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // ── signIn ────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!supabase) return { error: "Supabase not configured" };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
      // onAuthStateChange SIGNED_IN event handles setting user + profile
    },
    [],
  );

  // ── signOut ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async (): Promise<void> => {
    // Clear state immediately — don't wait for Supabase
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    if (supabase) await supabase.auth.signOut();
  }, []);

  return { user, profile, isAdmin, loading, signIn, signOut };
}
