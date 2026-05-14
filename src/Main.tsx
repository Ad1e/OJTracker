// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/main.tsx
// REASON: Update — AuthProvider now lives inside RootLayout in router.tsx,
// so main.tsx only needs RouterProvider. No BrowserRouter wrapper needed.
// ─────────────────────────────────────────────────────────────────────────────
import { StrictMode }     from "react";
import { createRoot }     from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router }         from "./router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
