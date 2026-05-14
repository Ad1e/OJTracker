// ─── src/App.tsx ─────────────────────────────────────────────────────────────
// Root application component. Delegates everything to the router.
// All route logic, auth context, and guards live in src/router.tsx.
// ─────────────────────────────────────────────────────────────────────────────
import { RouterProvider } from "react-router-dom";
import { router }         from "./router";

export default function App() {
  return <RouterProvider router={router} />;
}