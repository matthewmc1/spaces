interface SkeletonProps {
  variant?: "text" | "circle" | "rectangle";
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ variant = "text", width, height, className = "" }: SkeletonProps) {
  const base = "animate-pulse bg-neutral-200";
  if (variant === "circle") {
    return <div className={`${base} rounded-full ${className}`} style={{ width: width || "32px", height: height || "32px" }} />;
  }
  if (variant === "rectangle") {
    return <div className={`${base} rounded-[var(--radius-md)] ${className}`} style={{ width: width || "100%", height: height || "80px" }} />;
  }
  return <div className={`${base} rounded-[var(--radius-sm)] h-4 ${className}`} style={{ width: width || "100%" }} />;
}
