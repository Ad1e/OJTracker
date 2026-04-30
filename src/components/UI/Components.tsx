/**
 * Enhanced UI Components - Reusable styled components library
 * Provides beautiful, consistent UI elements across the app
 */

import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";

// ─── Card Components ───────────────────────────────────────────────────────

export interface CardProps {
  children: ReactNode;
  className?: string;
  elevation?: "sm" | "md" | "lg";
  hover?: boolean;
}

export function Card({ children, className = "", elevation = "md", hover = false }: CardProps) {
  const elevationMap = {
    sm: "shadow-md",
    md: "shadow-lg",
    lg: "shadow-xl",
  };

  return (
    <div
      className={`
        rounded-lg bg-white border border-slate-200 p-6
        transition-smooth
        ${elevationMap[elevation]}
        ${hover ? "hover:shadow-xl hover:-translate-y-0.5" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ─── Button Components ─────────────────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface StyledButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  children,
  disabled,
  ...props
}: StyledButtonProps) {
  const variantMap = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
    outline: "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50",
  };

  const sizeMap = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`
        font-medium rounded-lg transition-smooth focus-ring
        ${variantMap[variant]}
        ${sizeMap[size]}
        ${fullWidth ? "w-full" : ""}
        ${disabled || loading ? "disabled-state" : "active:scale-95"}
      `}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// ─── Input Components ─────────────────────────────────────────────────────

export interface StyledInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  icon,
  className = "",
  ...props
}: StyledInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input
          className={`
            w-full px-4 py-2 rounded-lg border transition-smooth focus-ring
            ${icon ? "pl-10" : ""}
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"}
            ${props.disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-slate-500">{helperText}</p>}
    </div>
  );
}

// ─── Badge Components ─────────────────────────────────────────────────────

export type BadgeColor = "indigo" | "emerald" | "amber" | "red" | "slate";

export interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline" | "soft";
}

export function Badge({ children, color = "indigo", size = "md", variant = "solid" }: BadgeProps) {
  const colorMap = {
    indigo: {
      solid: "bg-indigo-600 text-white",
      outline: "border-2 border-indigo-600 text-indigo-600",
      soft: "bg-indigo-100 text-indigo-700",
    },
    emerald: {
      solid: "bg-emerald-600 text-white",
      outline: "border-2 border-emerald-600 text-emerald-600",
      soft: "bg-emerald-100 text-emerald-700",
    },
    amber: {
      solid: "bg-amber-600 text-white",
      outline: "border-2 border-amber-600 text-amber-600",
      soft: "bg-amber-100 text-amber-700",
    },
    red: {
      solid: "bg-red-600 text-white",
      outline: "border-2 border-red-600 text-red-600",
      soft: "bg-red-100 text-red-700",
    },
    slate: {
      solid: "bg-slate-600 text-white",
      outline: "border-2 border-slate-600 text-slate-600",
      soft: "bg-slate-100 text-slate-700",
    },
  };

  const sizeMap = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium transition-smooth
        ${colorMap[color][variant]}
        ${sizeMap[size]}
      `}
    >
      {children}
    </span>
  );
}

// ─── Alert Components ─────────────────────────────────────────────────────

export type AlertType = "info" | "success" | "warning" | "error";

export interface AlertProps {
  children: ReactNode;
  type?: AlertType;
  onClose?: () => void;
  title?: string;
}

export function Alert({ children, type = "info", onClose, title }: AlertProps) {
  const typeMap = {
    info: {
      bg: "bg-sky-50 border-sky-200",
      text: "text-sky-800",
      icon: "text-sky-500",
      title: "text-sky-900",
    },
    success: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-800",
      icon: "text-emerald-500",
      title: "text-emerald-900",
    },
    warning: {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      icon: "text-amber-500",
      title: "text-amber-900",
    },
    error: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-800",
      icon: "text-red-500",
      title: "text-red-900",
    },
  };

  const icons = {
    info: <InfoIcon />,
    success: <SuccessIcon />,
    warning: <WarningIcon />,
    error: <ErrorIcon />,
  };

  return (
    <div
      className={`
        rounded-lg border-l-4 p-4 animate-slide-in-down
        ${typeMap[type].bg}
      `}
      role="alert"
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${typeMap[type].icon}`}>{icons[type]}</div>
        <div className="flex-1">
          {title && <h3 className={`font-semibold ${typeMap[type].title}`}>{title}</h3>}
          <p className={`${typeMap[type].text} ${title ? "mt-1" : ""}`}>{children}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`flex-shrink-0 ${typeMap[type].text} hover:opacity-70 transition-smooth`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Icon Components ───────────────────────────────────────────────────────

function InfoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M7.08 6.47a9 9 0 1 1 9.84 0" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ─── Skeleton Loading Component ────────────────────────────────────────────

export function Skeleton({ className = "", count = 1 }: { className?: string; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`
            bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200
            animate-pulse rounded-lg
            ${className}
          `}
        />
      ))}
    </>
  );
}

// ─── Empty State Component ──────────────────────────────────────────────────

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon && <div className="text-6xl mb-4 opacity-50">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      {description && <p className="text-slate-600 text-center mb-4 max-w-sm">{description}</p>}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ─── Divider Component ─────────────────────────────────────────────────────

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-slate-200 my-4 ${className}`} />;
}
