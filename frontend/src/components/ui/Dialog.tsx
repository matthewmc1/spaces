"use client";

import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
}

const widthClasses = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

export function Dialog({ open, onClose, title, description, children, footer, maxWidth = "md" }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] w-full ${widthClasses[maxWidth]} mx-4`}>
        <div className="flex items-start justify-between p-5 pb-0">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">{title}</h2>
            {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-[var(--radius-sm)] text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 pb-5">{footer}</div>}
      </div>
    </div>
  );
}
