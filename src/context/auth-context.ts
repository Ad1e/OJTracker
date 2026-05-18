import { createContext, useContext } from "react";
import type { AuthState } from "../hooks/use-auth";

export const AuthContext = createContext<AuthState | null>(null);

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useAuthContext() must be used inside <AuthProvider>. " +
      "Wrap your component tree with <AuthProvider>."
    );
  }
  return ctx;
}
