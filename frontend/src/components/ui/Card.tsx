import { type ReactNode } from "react";

type CardVariant = "default" | "elevated" | "interactive";
type CardPadding = "sm" | "md" | "lg";

interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-neutral-50 border border-neutral-200 shadow-[var(--shadow-sm)]",
  elevated: "bg-white shadow-[var(--shadow-md)]",
  interactive: "bg-white border border-neutral-200 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] cursor-pointer transition-shadow",
};

const paddingClasses: Record<CardPadding, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({ variant = "default", padding = "md", children, className = "", onClick }: CardProps) {
  return (
    <div className={`rounded-[var(--radius-md)] ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
