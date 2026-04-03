"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <label className="block text-sm font-medium text-neutral-700">{label}</label>}
        <select
          ref={ref}
          className={`w-full bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-2 text-sm text-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 disabled:opacity-50 ${error ? "border-danger focus:ring-red-200" : ""} ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
