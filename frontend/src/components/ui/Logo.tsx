interface LogoProps {
  variant?: "full" | "mark" | "text";
  size?: number;
  className?: string;
}

function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="6" y="4" width="20" height="16" rx="3" fill="#99f6e4" />
      <rect x="4" y="8" width="20" height="16" rx="3" fill="#5eead4" />
      <rect x="8" y="12" width="20" height="16" rx="3" fill="#14b8a6" />
    </svg>
  );
}

function LogoText({ className = "" }: { className?: string }) {
  return (
    <span className={`font-[family-name:var(--font-display)] tracking-[-0.02em] text-neutral-800 ${className}`}>
      Spaces
    </span>
  );
}

export function Logo({ variant = "full", size = 32, className = "" }: LogoProps) {
  if (variant === "mark") return <LogoMark size={size} className={className} />;
  if (variant === "text") return <LogoText className={className} />;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <LogoText className="text-lg" />
    </div>
  );
}
