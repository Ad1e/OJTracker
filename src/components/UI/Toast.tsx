/**
 * Improved Toast Notification System
 * Replaces inline toast management in App.tsx
 */

import { createContext, useContext, useCallback, type ReactNode, useState } from "react";
import type { Toast } from "../../types";
import { UI_CONFIG } from "../../config/constants";

interface ToastContextType {
  toast: Toast | null;
  showToast: (message: string, type: "success" | "edit" | "error") => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Toast Context Provider
 * Wrap your app with this to enable toast notifications
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: "success" | "edit" | "error") => {
    const id = Date.now();
    
    // Determine if toast should auto-close
    const autoClose = type !== "error";
    
    // Determine timeout based on type
    let timeout: number = UI_CONFIG.TOAST_DURATION_SUCCESS;
    if (type === "error") {
      timeout = UI_CONFIG.TOAST_DURATION_ERROR;
    } else if (type === "edit") {
      timeout = UI_CONFIG.TOAST_DURATION_EDIT;
    }

    setToast({ id, message, type, autoClose });

    if (autoClose) {
      setTimeout(() => {
        setToast((current: Toast | null) => (current?.id === id ? null : current));
      }, timeout);
    }
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Hook to use toast notifications
 * @example
 * const { showToast } = useToast();
 * showToast("Success!", "success");
 */
export function useToast(): Pick<ToastContextType, "showToast" | "hideToast"> {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return { showToast: context.showToast, hideToast: context.hideToast };
}

/**
 * Toast Display Component
 * Render this in your app to display the toast
 * @example
 * <ToastContainer />
 */
export function ToastContainer() {
  const context = useContext(ToastContext);
  if (!context) return null;

  const { toast, hideToast } = context;

  if (!toast) return null;

  const bgColors: Record<Toast["type"], string> = {
    success: "bg-emerald-50 border-emerald-200",
    edit: "bg-sky-50 border-sky-200",
    error: "bg-red-50 border-red-200",
  };

  const textColors: Record<Toast["type"], string> = {
    success: "text-emerald-800",
    edit: "text-sky-800",
    error: "text-red-800",
  };

  const iconColors: Record<Toast["type"], string> = {
    success: "text-emerald-500",
    edit: "text-sky-500",
    error: "text-red-500",
  };

  const icons: Record<Toast["type"], ReactNode> = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    edit: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <div
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
          ${bgColors[toast.type]} ${textColors[toast.type]}
          pointer-events-auto
          animate-in fade-in slide-in-from-bottom-4 duration-300
        `}
        role="alert"
        aria-live={toast.type === "error" ? "assertive" : "polite"}
        aria-atomic="true"
      >
        <div className={`flex-shrink-0 ${iconColors[toast.type]}`}>
          {icons[toast.type]}
        </div>

        <p className="text-sm font-medium">{toast.message}</p>

        {toast.type === "error" && (
          <button
            onClick={hideToast}
            className="ml-2 text-sm opacity-70 hover:opacity-100 focus:outline-none"
            aria-label="Close notification"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
