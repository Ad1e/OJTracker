import { Outlet } from "react-router-dom";
import { AuthProvider } from "../providers/auth-provider";

export function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
