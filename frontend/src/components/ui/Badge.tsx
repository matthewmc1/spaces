import { type ReactNode } from "react";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-neutral-100 text-neutral-600",
  primary: "bg-primary-100 text-primary-900",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-neutral-400",
  primary: "bg-primary-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "h-5 px-1.5 text-[11px]",
  md: "h-6 px-2 text-xs",
};

export function Badge({ variant = "default", size = "sm", dot, children, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
