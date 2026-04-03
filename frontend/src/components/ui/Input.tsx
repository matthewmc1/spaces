"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface InputBaseProps {
  label?: string;
  hint?: string;
  error?: string;
}

type InputProps = InputBaseProps & InputHTMLAttributes<HTMLInputElement> & { multiline?: false };
type TextareaProps = InputBaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true };

const baseClasses = "w-full bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed";
const errorClasses = "border-danger focus:ring-red-200 focus:border-danger";

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps | TextareaProps>(
  ({ label, hint, error, className = "", ...props }, ref) => {
    const inputClasses = `${baseClasses} ${error ? errorClasses : ""} ${className}`;
    return (
      <div className="space-y-1">
        {label && <label className="block text-sm font-medium text-neutral-700">{label}</label>}
        {props.multiline ? (
          <textarea ref={ref as React.Ref<HTMLTextAreaElement>} className={inputClasses} {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
        ) : (
          <input ref={ref as React.Ref<HTMLInputElement>} className={inputClasses} {...(props as InputHTMLAttributes<HTMLInputElement>)} />
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-neutral-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
