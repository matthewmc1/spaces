"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-primary-200",
  secondary: "bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 active:bg-neutral-300 focus-visible:ring-neutral-200",
  ghost: "bg-transparent text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 focus-visible:ring-neutral-200",
  danger: "bg-danger text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-200",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-9 px-3.5 text-sm gap-2 rounded-[var(--radius-md)]",
  lg: "h-11 px-5 text-base gap-2.5 rounded-[var(--radius-md)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", icon, iconRight, loading, disabled, children, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon ? <span className="shrink-0">{icon}</span> : null}
        {children}
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";
