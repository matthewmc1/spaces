# Spaces Brand & UI Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the generic Spaces UI into a branded, professional design system with custom tokens, base components, configurable board, analytics sidebar, and landing page.

**Architecture:** CSS custom properties as design tokens (Tailwind v4 `@theme inline`), ~11 reusable base components in `src/components/ui/`, restyled board/sidebar/dialogs, new analytics sidebar with inline SVG charts, conditional landing page.

**Tech Stack:** Next.js 16, Tailwind CSS v4, Inter font (next/font/google), Lucide React icons, dnd-kit, TanStack Query

**Design Spec:** `docs/specs/2026-04-03-spaces-brand-ui-design.md`

---

## File Structure

### New Files (~24)

```
frontend/src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx              # 4 variants, 3 sizes, loading
│   │   ├── Badge.tsx               # 5 variants, dot indicator
│   │   ├── Card.tsx                # 3 variants, configurable padding
│   │   ├── Input.tsx               # Label, hint, error, textarea mode
│   │   ├── Select.tsx              # Styled native select
│   │   ├── Dialog.tsx              # Modal with backdrop, slots
│   │   ├── DropdownMenu.tsx        # Trigger + floating menu
│   │   ├── Tooltip.tsx             # Delayed dark tooltip
│   │   ├── Skeleton.tsx            # Pulse animation variants
│   │   ├── MetricCard.tsx          # KPI card with trend + sparkline
│   │   └── Logo.tsx                # SVG mark + wordmark
│   ├── board/
│   │   ├── BoardHeader.tsx         # Space name + action buttons
│   │   ├── ColumnConfigDropdown.tsx # Column visibility checkboxes
│   │   └── TriageDrawer.tsx        # Slide-out Inbox/IceBox/Freezer
│   ├── analytics/
│   │   ├── AnalyticsSidebar.tsx    # Right sidebar container
│   │   ├── FlowSummary.tsx         # 2x2 KPI grid
│   │   ├── AlignmentHealth.tsx     # SVG ring progress
│   │   ├── ColumnDistribution.tsx  # Stacked bar
│   │   ├── CycleTimeTrend.tsx      # SVG sparkline
│   │   └── BottleneckAlert.tsx     # Conditional warning
│   └── landing/
│       ├── HeroSection.tsx         # Hero with CTAs
│       ├── FeatureCards.tsx        # 3-column features
│       └── Footer.tsx              # Minimal footer
├── hooks/
│   └── useColumnVisibility.ts      # localStorage column prefs
└── public/
    └── favicon.svg                 # Brand favicon
```

### Modified Files (~13)

```
frontend/src/
├── app/
│   ├── globals.css                 # Full token system
│   ├── layout.tsx                  # Inter font, favicon metadata
│   ├── page.tsx                    # Conditional landing page
│   ├── spaces/
│   │   ├── page.tsx                # Restyled with tokens
│   │   └── [id]/page.tsx           # App shell with analytics sidebar
├── types/
│   └── card.ts                     # Column color metadata
├── components/
│   ├── common/Sidebar.tsx          # Branded sidebar with Logo
│   ├── spaces/
│   │   ├── SpaceTree.tsx           # Token-based styling
│   │   ├── SpaceTreeNode.tsx       # Primary color active state
│   │   └── CreateSpaceDialog.tsx   # Uses Dialog + Input + Button
│   └── board/
│       ├── Board.tsx               # Board header, column config, triage, insights
│       ├── BoardColumn.tsx         # Column tints, accent lines, restyled
│       ├── BoardCard.tsx           # Priority stripe, new card design
│       └── CreateCardDialog.tsx    # Uses Dialog + Input + Select + Button
```

---

## Task 1: Design Tokens & Font Setup

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Rewrite globals.css with full token system**

Replace the entire contents of `frontend/src/app/globals.css` with:

```css
@import "tailwindcss";

@theme inline {
  /* Primary — Teal/Emerald */
  --color-primary-50: #f0fdfa;
  --color-primary-100: #ccfbf1;
  --color-primary-200: #99f6e4;
  --color-primary-500: #14b8a6;
  --color-primary-600: #0d9488;
  --color-primary-700: #0f766e;
  --color-primary-900: #134e4a;

  /* Neutral — Warm Slate */
  --color-neutral-50: #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-200: #e2e8f0;
  --color-neutral-300: #cbd5e1;
  --color-neutral-400: #94a3b8;
  --color-neutral-500: #64748b;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1e293b;
  --color-neutral-900: #0f172a;

  /* Semantic */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.12);

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Fonts */
  --font-sans: var(--font-inter), system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
}

body {
  background: var(--color-neutral-50);
  color: var(--color-neutral-800);
  font-family: var(--font-sans);
}
```

- [ ] **Step 2: Update layout.tsx with Inter font and metadata**

Rewrite `frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/common/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Spaces",
  description: "Strategic planning and alignment platform",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Verify Next.js dev server starts**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/spaces
kill %1
```
Expected: 200

- [ ] **Step 5: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add frontend/src/app/globals.css frontend/src/app/layout.tsx
git commit -m "feat: design tokens and Inter font setup"
```

---

## Task 2: Base Components — Button, Badge, Card

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Badge.tsx`
- Create: `frontend/src/components/ui/Card.tsx`

- [ ] **Step 1: Create Button component**

Create `frontend/src/components/ui/Button.tsx`:

```tsx
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
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-primary-200",
  secondary:
    "bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 active:bg-neutral-300 focus-visible:ring-neutral-200",
  ghost:
    "bg-transparent text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 focus-visible:ring-neutral-200",
  danger:
    "bg-danger text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-200",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-9 px-3.5 text-sm gap-2 rounded-[var(--radius-md)]",
  lg: "h-11 px-5 text-base gap-2.5 rounded-[var(--radius-md)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      icon,
      iconRight,
      loading,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";
```

- [ ] **Step 2: Create Badge component**

Create `frontend/src/components/ui/Badge.tsx`:

```tsx
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

export function Badge({
  variant = "default",
  size = "sm",
  dot,
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Create Card component**

Create `frontend/src/components/ui/Card.tsx`:

```tsx
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
  default:
    "bg-neutral-50 border border-neutral-200 shadow-[var(--shadow-sm)]",
  elevated: "bg-white shadow-[var(--shadow-md)]",
  interactive:
    "bg-white border border-neutral-200 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] cursor-pointer transition-shadow",
};

const paddingClasses: Record<CardPadding, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  variant = "default",
  padding = "md",
  children,
  className = "",
  onClick,
}: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-md)] ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Verify compiles**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add frontend/src/components/ui/
git commit -m "feat: base components — Button, Badge, Card"
```

---

## Task 3: Base Components — Input, Select, Dialog, Skeleton

**Files:**
- Create: `frontend/src/components/ui/Input.tsx`
- Create: `frontend/src/components/ui/Select.tsx`
- Create: `frontend/src/components/ui/Dialog.tsx`
- Create: `frontend/src/components/ui/Skeleton.tsx`

- [ ] **Step 1: Create Input component**

Create `frontend/src/components/ui/Input.tsx`:

```tsx
"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface InputBaseProps {
  label?: string;
  hint?: string;
  error?: string;
}

type InputProps = InputBaseProps &
  InputHTMLAttributes<HTMLInputElement> & { multiline?: false };
type TextareaProps = InputBaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true };

const baseClasses =
  "w-full bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed";

const errorClasses =
  "border-danger focus:ring-red-200 focus:border-danger";

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps | TextareaProps
>(({ label, hint, error, className = "", ...props }, ref) => {
  const inputClasses = `${baseClasses} ${error ? errorClasses : ""} ${className}`;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      {props.multiline ? (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={inputClasses}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          className={inputClasses}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && (
        <p className="text-xs text-neutral-400">{hint}</p>
      )}
    </div>
  );
});
Input.displayName = "Input";
```

- [ ] **Step 2: Create Select component**

Create `frontend/src/components/ui/Select.tsx`:

```tsx
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
        {label && (
          <label className="block text-sm font-medium text-neutral-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-2 text-sm text-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 disabled:opacity-50 ${
            error ? "border-danger focus:ring-red-200" : ""
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
```

- [ ] **Step 3: Create Dialog component**

Create `frontend/src/components/ui/Dialog.tsx`:

```tsx
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

const widthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] w-full ${widthClasses[maxWidth]} mx-4`}
      >
        <div className="flex items-start justify-between p-5 pb-0">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-neutral-500">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[var(--radius-sm)] text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 pb-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Skeleton component**

Create `frontend/src/components/ui/Skeleton.tsx`:

```tsx
interface SkeletonProps {
  variant?: "text" | "circle" | "rectangle";
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
}: SkeletonProps) {
  const base = "animate-pulse bg-neutral-200";

  if (variant === "circle") {
    return (
      <div
        className={`${base} rounded-full ${className}`}
        style={{ width: width || "32px", height: height || "32px" }}
      />
    );
  }

  if (variant === "rectangle") {
    return (
      <div
        className={`${base} rounded-[var(--radius-md)] ${className}`}
        style={{ width: width || "100%", height: height || "80px" }}
      />
    );
  }

  return (
    <div
      className={`${base} rounded-[var(--radius-sm)] h-4 ${className}`}
      style={{ width: width || "100%" }}
    />
  );
}
```

- [ ] **Step 5: Verify compiles and commit**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npx tsc --noEmit
cd /Users/matthewmcgibbon/spaces
git add frontend/src/components/ui/
git commit -m "feat: base components — Input, Select, Dialog, Skeleton"
```

---

## Task 4: Logo SVG & Favicon

**Files:**
- Create: `frontend/src/components/ui/Logo.tsx`
- Create: `frontend/public/favicon.svg`

- [ ] **Step 1: Create Logo component**

Create `frontend/src/components/ui/Logo.tsx`:

```tsx
interface LogoProps {
  variant?: "full" | "mark" | "text";
  size?: number;
  className?: string;
}

function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      {/* Back layer — lightest */}
      <rect x="6" y="4" width="20" height="16" rx="3" fill="#99f6e4" />
      {/* Middle layer */}
      <rect x="4" y="8" width="20" height="16" rx="3" fill="#5eead4" />
      {/* Front layer — primary */}
      <rect x="8" y="12" width="20" height="16" rx="3" fill="#14b8a6" />
    </svg>
  );
}

function LogoText({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-semibold tracking-[0.02em] text-neutral-800 ${className}`}
    >
      Spaces
    </span>
  );
}

export function Logo({ variant = "full", size = 32, className = "" }: LogoProps) {
  if (variant === "mark") {
    return <LogoMark size={size} className={className} />;
  }

  if (variant === "text") {
    return <LogoText className={className} />;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <LogoText className="text-lg" />
    </div>
  );
}
```

- [ ] **Step 2: Create favicon SVG**

Create `frontend/public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect x="4" y="6" width="18" height="14" rx="3" fill="#99f6e4"/>
  <rect x="10" y="12" width="18" height="14" rx="3" fill="#14b8a6"/>
</svg>
```

- [ ] **Step 3: Remove boilerplate SVGs from public/**

```bash
cd /Users/matthewmcgibbon/spaces/frontend/public
rm -f globe.svg next.svg vercel.svg file.svg window.svg
```

- [ ] **Step 4: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add frontend/src/components/ui/Logo.tsx frontend/public/
git commit -m "feat: Logo component and favicon SVG"
```

---

## Task 5: MetricCard + Column Metadata

**Files:**
- Create: `frontend/src/components/ui/MetricCard.tsx`
- Modify: `frontend/src/types/card.ts`

- [ ] **Step 1: Create MetricCard component**

Create `frontend/src/components/ui/MetricCard.tsx`:

```tsx
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  className?: string;
}

const trendConfig = {
  up: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  down: { icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50" },
  flat: { icon: Minus, color: "text-neutral-400", bg: "bg-neutral-50" },
};

export function MetricCard({
  label,
  value,
  trend,
  trendValue,
  className = "",
}: MetricCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;

  return (
    <div
      className={`bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4 ${className}`}
    >
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
        {label}
      </p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-2xl font-semibold font-mono text-neutral-800">
          {value}
        </span>
        {trendInfo && trendValue && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-mono px-1.5 py-0.5 rounded-full ${trendInfo.bg} ${trendInfo.color}`}
          >
            <trendInfo.icon className="w-3 h-3" />
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add column color metadata to card types**

Add to `frontend/src/types/card.ts`, replacing the existing `COLUMNS` array:

```typescript
export const COLUMNS: {
  key: Column;
  label: string;
  borderColor: string;
  bgColor: string;
}[] = [
  { key: "inbox", label: "Inbox", borderColor: "border-t-slate-400", bgColor: "bg-slate-50" },
  { key: "icebox", label: "Ice Box", borderColor: "border-t-sky-400", bgColor: "bg-sky-50" },
  { key: "freezer", label: "Freezer", borderColor: "border-t-blue-500", bgColor: "bg-blue-50" },
  { key: "planned", label: "Planned", borderColor: "border-t-teal-500", bgColor: "bg-teal-50" },
  { key: "in_progress", label: "In Progress", borderColor: "border-t-amber-500", bgColor: "bg-amber-50" },
  { key: "review", label: "Review", borderColor: "border-t-orange-400", bgColor: "bg-orange-50" },
  { key: "done", label: "Done", borderColor: "border-t-emerald-500", bgColor: "bg-emerald-50" },
];
```

- [ ] **Step 3: Verify and commit**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npx tsc --noEmit
cd /Users/matthewmcgibbon/spaces
git add frontend/src/components/ui/MetricCard.tsx frontend/src/types/card.ts
git commit -m "feat: MetricCard component and column color metadata"
```

---

## Task 6: Sidebar Overhaul

**Files:**
- Modify: `frontend/src/components/common/Sidebar.tsx`
- Modify: `frontend/src/components/spaces/SpaceTree.tsx`
- Modify: `frontend/src/components/spaces/SpaceTreeNode.tsx`

- [ ] **Step 1: Restyle Sidebar with Logo and tokens**

Rewrite `frontend/src/components/common/Sidebar.tsx`:

```tsx
"use client";

import { SpaceTree } from "@/components/spaces/SpaceTree";
import { Logo } from "@/components/ui/Logo";
import { Settings } from "lucide-react";
import Link from "next/link";

interface SidebarProps {
  activeSpaceId?: string;
}

export function Sidebar({ activeSpaceId }: SidebarProps) {
  return (
    <aside className="w-64 bg-neutral-100 border-r border-neutral-200 h-screen flex flex-col">
      <div className="p-4 border-b border-neutral-200">
        <Link href="/spaces">
          <Logo variant="full" size={24} />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SpaceTree activeSpaceId={activeSpaceId} />
      </div>
      <div className="p-3 border-t border-neutral-200">
        <button className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 rounded-[var(--radius-md)] transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Restyle SpaceTree with token classes**

Rewrite `frontend/src/components/spaces/SpaceTree.tsx` — replace all `gray-*` classes with `neutral-*` tokens, replace `blue-*` with `primary-*`. The Plus button should use `text-neutral-400 hover:text-neutral-600`. Section header uses `text-xs font-semibold text-neutral-400 uppercase tracking-wider`.

- [ ] **Step 3: Restyle SpaceTreeNode with primary active state**

In `frontend/src/components/spaces/SpaceTreeNode.tsx`, change:
- Active state from `bg-blue-100 text-blue-700` to `bg-primary-100 text-primary-700`
- Hover from `hover:bg-gray-100` to `hover:bg-neutral-100`
- Default text from `text-gray-700` to `text-neutral-700`
- Chevron icons from `text-gray-400` to `text-neutral-400`

- [ ] **Step 4: Verify and commit**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npx tsc --noEmit
cd /Users/matthewmcgibbon/spaces
git add frontend/src/components/common/Sidebar.tsx frontend/src/components/spaces/
git commit -m "feat: branded sidebar with Logo, token-based styling"
```

---

## Task 7: Board Card & Column Restyle

**Files:**
- Modify: `frontend/src/components/board/BoardCard.tsx`
- Modify: `frontend/src/components/board/BoardColumn.tsx`

- [ ] **Step 1: Restyle BoardCard with priority stripe and token classes**

Rewrite `frontend/src/components/board/BoardCard.tsx` with:
- Left priority stripe (3px, rounded-l) colored by priority
- White bg, `shadow-[var(--shadow-sm)]`, `rounded-[var(--radius-md)]`
- Hover: `shadow-[var(--shadow-md)]`, border shifts to `neutral-300`
- Drag state: `shadow-[var(--shadow-xl)]`, `opacity-90`, `rotate-1`, `scale-[1.02]`
- Priority badge using the spec colors (rose for P0, amber for P1, yellow for P2, slate for P3)
- All text colors use neutral-* tokens
- Badge component for labels
- Mono font for any numeric content

- [ ] **Step 2: Restyle BoardColumn with tints and accent lines**

Rewrite `frontend/src/components/board/BoardColumn.tsx` with:
- Use `COLUMNS` metadata for `borderColor` and `bgColor` (from card.ts)
- Top accent: `border-t-[3px]` with column-specific color
- Background: column-specific `-50` tint
- Header: `text-base font-semibold text-neutral-700` + Badge for card count (mono font, default variant)
- Width: `w-[280px] flex-shrink-0`
- Empty state: dashed border, neutral-400 text, plus icon
- Drop indicator: `ring-2 ring-primary-300 ring-inset`
- Gap between cards: `space-y-2`

- [ ] **Step 3: Verify drag-and-drop still works**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add frontend/src/components/board/BoardCard.tsx frontend/src/components/board/BoardColumn.tsx
git commit -m "feat: restyled board cards with priority stripe, branded columns"
```

---

## Task 8: Board Header, Column Config, Triage Drawer

**Files:**
- Create: `frontend/src/components/board/BoardHeader.tsx`
- Create: `frontend/src/components/board/ColumnConfigDropdown.tsx`
- Create: `frontend/src/components/board/TriageDrawer.tsx`
- Create: `frontend/src/hooks/useColumnVisibility.ts`
- Modify: `frontend/src/components/board/Board.tsx`

- [ ] **Step 1: Create useColumnVisibility hook**

Create `frontend/src/hooks/useColumnVisibility.ts`:

```typescript
"use client";

import { useState, useCallback } from "react";
import type { Column } from "@/types/card";

const DEFAULT_VISIBLE: Column[] = ["planned", "in_progress", "review", "done"];
const TRIAGE_COLUMNS: Column[] = ["inbox", "icebox", "freezer"];

function getStorageKey(spaceId: string) {
  return `spaces-columns-${spaceId}`;
}

export function useColumnVisibility(spaceId: string) {
  const [visible, setVisible] = useState<Column[]>(() => {
    if (typeof window === "undefined") return DEFAULT_VISIBLE;
    const stored = localStorage.getItem(getStorageKey(spaceId));
    return stored ? JSON.parse(stored) : DEFAULT_VISIBLE;
  });

  const toggle = useCallback(
    (column: Column) => {
      setVisible((prev) => {
        const next = prev.includes(column)
          ? prev.filter((c) => c !== column)
          : [...prev, column];
        localStorage.setItem(getStorageKey(spaceId), JSON.stringify(next));
        return next;
      });
    },
    [spaceId]
  );

  const showAll = useCallback(() => {
    const all: Column[] = [
      "inbox", "icebox", "freezer", "planned", "in_progress", "review", "done",
    ];
    setVisible(all);
    localStorage.setItem(getStorageKey(spaceId), JSON.stringify(all));
  }, [spaceId]);

  return { visible, toggle, showAll, TRIAGE_COLUMNS };
}
```

- [ ] **Step 2: Create BoardHeader component**

Create `frontend/src/components/board/BoardHeader.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/Button";
import { Inbox, Columns3, PanelRight } from "lucide-react";

interface BoardHeaderProps {
  spaceName: string;
  spaceDescription?: string;
  triageOpen: boolean;
  onToggleTriage: () => void;
  insightsOpen: boolean;
  onToggleInsights: () => void;
  columnConfigSlot: React.ReactNode;
}

export function BoardHeader({
  spaceName,
  spaceDescription,
  triageOpen,
  onToggleTriage,
  insightsOpen,
  onToggleInsights,
  columnConfigSlot,
}: BoardHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-800">
          {spaceName}
        </h1>
        {spaceDescription && (
          <p className="text-sm text-neutral-500 mt-0.5">
            {spaceDescription}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant={triageOpen ? "secondary" : "ghost"}
          size="sm"
          icon={<Inbox className="w-4 h-4" />}
          onClick={onToggleTriage}
        >
          Triage
        </Button>
        {columnConfigSlot}
        <Button
          variant={insightsOpen ? "secondary" : "ghost"}
          size="sm"
          icon={<PanelRight className="w-4 h-4" />}
          onClick={onToggleInsights}
        >
          Insights
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ColumnConfigDropdown**

Create `frontend/src/components/board/ColumnConfigDropdown.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Columns3 } from "lucide-react";
import { COLUMNS, type Column } from "@/types/card";

interface ColumnConfigDropdownProps {
  visible: Column[];
  onToggle: (column: Column) => void;
  onShowAll: () => void;
}

export function ColumnConfigDropdown({
  visible,
  onToggle,
  onShowAll,
}: ColumnConfigDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        icon={<Columns3 className="w-4 h-4" />}
        onClick={() => setOpen(!open)}
      >
        Columns
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-neutral-200 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-20 py-1">
          {COLUMNS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={visible.includes(key)}
                onChange={() => onToggle(key)}
                className="rounded border-neutral-300 text-primary-500 focus:ring-primary-200"
              />
              {label}
            </label>
          ))}
          <div className="border-t border-neutral-100 mt-1 pt-1 px-3 pb-1">
            <button
              onClick={onShowAll}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Show all columns
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create TriageDrawer**

Create `frontend/src/components/board/TriageDrawer.tsx`:

```tsx
"use client";

import { X } from "lucide-react";
import { BoardColumn } from "./BoardColumn";
import type { Card, Column } from "@/types/card";

const TRIAGE_COLUMNS: { key: Column; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "icebox", label: "Ice Box" },
  { key: "freezer", label: "Freezer" },
];

interface TriageDrawerProps {
  open: boolean;
  onClose: () => void;
  cardsByColumn: Record<Column, Card[]>;
  onAddCard?: () => void;
}

export function TriageDrawer({
  open,
  onClose,
  cardsByColumn,
  onAddCard,
}: TriageDrawerProps) {
  if (!open) return null;

  return (
    <div className="flex-shrink-0 w-[320px] border-r border-neutral-200 bg-white overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-700">Triage</h3>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600 rounded-[var(--radius-sm)] hover:bg-neutral-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        {TRIAGE_COLUMNS.map(({ key, label }) => (
          <BoardColumn
            key={key}
            column={key}
            label={label}
            cards={cardsByColumn[key] || []}
            onAddCard={key === "inbox" ? onAddCard : undefined}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update Board.tsx to integrate header, column config, triage, and insights**

Rewrite `frontend/src/components/board/Board.tsx` to:
- Import and use `BoardHeader`, `ColumnConfigDropdown`, `TriageDrawer`
- Import `useColumnVisibility(spaceId)` for column filtering
- Add state: `triageOpen`, `insightsOpen`
- Filter COLUMNS by `visible` before rendering
- Render triage drawer when `triageOpen`
- Pass `insightsOpen`/`onToggleInsights` to header (sidebar integration comes in Task 10)
- Accept `spaceName` and `spaceDescription` as props

- [ ] **Step 6: Verify and commit**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npx tsc --noEmit
cd /Users/matthewmcgibbon/spaces
git add frontend/src/components/board/ frontend/src/hooks/useColumnVisibility.ts
git commit -m "feat: board header, column configuration, triage drawer"
```

---

## Task 9: Restyle Dialogs with Base Components

**Files:**
- Modify: `frontend/src/components/spaces/CreateSpaceDialog.tsx`
- Modify: `frontend/src/components/board/CreateCardDialog.tsx`

- [ ] **Step 1: Rewrite CreateSpaceDialog using Dialog + Input + Button**

Rewrite `frontend/src/components/spaces/CreateSpaceDialog.tsx` to use:
- `Dialog` component (open/onClose/title)
- `Input` component for name (with label)
- `Input` with `multiline` for description (with label)
- Slug hint shown below name input using `hint` prop
- `Button` for cancel (variant="ghost") and create (variant="primary", loading state)
- Remove all inline modal markup — delegate to Dialog

- [ ] **Step 2: Rewrite CreateCardDialog using Dialog + Input + Select + Button**

Rewrite `frontend/src/components/board/CreateCardDialog.tsx` to use:
- `Dialog` component
- `Input` for title (autoFocus)
- `Input` with `multiline` for description
- `Select` for priority with options: None, P0-P3
- `Button` for cancel and submit
- Remove all inline modal markup

- [ ] **Step 3: Verify and commit**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npx tsc --noEmit
cd /Users/matthewmcgibbon/spaces
git add frontend/src/components/spaces/CreateSpaceDialog.tsx frontend/src/components/board/CreateCardDialog.tsx
git commit -m "feat: restyled dialogs using base components"
```

---

## Task 10: Analytics Sidebar

**Files:**
- Create: `frontend/src/components/analytics/AnalyticsSidebar.tsx`
- Create: `frontend/src/components/analytics/FlowSummary.tsx`
- Create: `frontend/src/components/analytics/AlignmentHealth.tsx`
- Create: `frontend/src/components/analytics/ColumnDistribution.tsx`
- Create: `frontend/src/components/analytics/CycleTimeTrend.tsx`
- Create: `frontend/src/components/analytics/BottleneckAlert.tsx`
- Modify: `frontend/src/app/spaces/[id]/page.tsx`

- [ ] **Step 1: Create FlowSummary widget**

Create `frontend/src/components/analytics/FlowSummary.tsx`:

```tsx
import { MetricCard } from "@/components/ui/MetricCard";

export function FlowSummary() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard label="In Flight" value={12} trend="up" trendValue="+3" />
      <MetricCard label="Cycle Time" value="4.2d" trend="down" trendValue="-0.8d" />
      <MetricCard label="Throughput" value="8/wk" trend="up" trendValue="+2" />
      <MetricCard label="Completion" value="73%" trend="flat" trendValue="0%" />
    </div>
  );
}
```

- [ ] **Step 2: Create AlignmentHealth widget**

Create `frontend/src/components/analytics/AlignmentHealth.tsx`:

```tsx
interface AlignmentHealthProps {
  percentage?: number;
  linkedCount?: number;
  totalCount?: number;
  orphanedGoals?: number;
}

export function AlignmentHealth({
  percentage = 65,
  linkedCount = 8,
  totalCount = 12,
  orphanedGoals = 2,
}: AlignmentHealthProps) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (percentage / 100) * circumference;
  const color =
    percentage >= 80
      ? "text-emerald-500"
      : percentage >= 50
        ? "text-amber-500"
        : "text-rose-500";
  const strokeColor =
    percentage >= 80
      ? "stroke-emerald-500"
      : percentage >= 50
        ? "stroke-amber-500"
        : "stroke-rose-500";

  return (
    <div className="bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
        Alignment Health
      </p>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              className={strokeColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span
            className={`absolute inset-0 flex items-center justify-center text-lg font-semibold font-mono ${color}`}
          >
            {percentage}%
          </span>
        </div>
        <div className="text-sm text-neutral-600 space-y-1">
          <p>
            {linkedCount} of {totalCount} cards linked
          </p>
          {orphanedGoals > 0 && (
            <p className="text-amber-600 text-xs">
              {orphanedGoals} orphaned goals
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ColumnDistribution widget**

Create `frontend/src/components/analytics/ColumnDistribution.tsx`:

```tsx
import { COLUMNS, type Column } from "@/types/card";

interface ColumnDistributionProps {
  counts?: Record<Column, number>;
}

const segmentColors: Record<Column, string> = {
  inbox: "bg-slate-400",
  icebox: "bg-sky-400",
  freezer: "bg-blue-500",
  planned: "bg-teal-500",
  in_progress: "bg-amber-500",
  review: "bg-orange-400",
  done: "bg-emerald-500",
};

export function ColumnDistribution({ counts }: ColumnDistributionProps) {
  const data = counts || {
    inbox: 3,
    icebox: 2,
    freezer: 1,
    planned: 5,
    in_progress: 4,
    review: 2,
    done: 8,
  };
  const total = Object.values(data).reduce((a, b) => a + b, 0);

  if (total === 0) return null;

  return (
    <div className="bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
        Distribution
      </p>
      <div className="flex h-6 rounded-full overflow-hidden">
        {COLUMNS.map(({ key }) => {
          const count = data[key] || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={key}
              className={`${segmentColors[key]} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${key}: ${count} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {COLUMNS.map(({ key, label }) => {
          const count = data[key] || 0;
          if (count === 0) return null;
          return (
            <span key={key} className="flex items-center gap-1 text-xs text-neutral-500">
              <span className={`w-2 h-2 rounded-full ${segmentColors[key]}`} />
              {label}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create CycleTimeTrend sparkline**

Create `frontend/src/components/analytics/CycleTimeTrend.tsx`:

```tsx
interface CycleTimeTrendProps {
  data?: number[];
  currentValue?: string;
}

export function CycleTimeTrend({
  data = [5.2, 4.8, 5.1, 4.5, 4.2, 3.9, 4.1, 4.0, 3.8, 4.2],
  currentValue = "4.2 days",
}: CycleTimeTrendProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 48;
  const width = 100;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
        Cycle Time
      </p>
      <p className="text-xl font-semibold font-mono text-neutral-800 mt-1">
        {currentValue}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full mt-2"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-[10px] text-neutral-400 text-right mt-0.5">
        Last 30 days
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Create BottleneckAlert widget**

Create `frontend/src/components/analytics/BottleneckAlert.tsx`:

```tsx
import { AlertTriangle } from "lucide-react";

interface BottleneckAlertProps {
  message?: string;
}

export function BottleneckAlert({ message }: BottleneckAlertProps) {
  if (!message) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] p-3 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      <p className="text-sm text-amber-700">{message}</p>
    </div>
  );
}
```

- [ ] **Step 6: Create AnalyticsSidebar container**

Create `frontend/src/components/analytics/AnalyticsSidebar.tsx`:

```tsx
"use client";

import { X } from "lucide-react";
import { FlowSummary } from "./FlowSummary";
import { AlignmentHealth } from "./AlignmentHealth";
import { ColumnDistribution } from "./ColumnDistribution";
import { CycleTimeTrend } from "./CycleTimeTrend";
import { BottleneckAlert } from "./BottleneckAlert";

interface AnalyticsSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AnalyticsSidebar({ open, onClose }: AnalyticsSidebarProps) {
  if (!open) return null;

  return (
    <aside className="w-[320px] flex-shrink-0 bg-white border-l border-neutral-200 h-full overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <h2 className="text-base font-semibold text-neutral-800">Insights</h2>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600 rounded-[var(--radius-sm)] hover:bg-neutral-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <FlowSummary />
        <AlignmentHealth />
        <ColumnDistribution />
        <CycleTimeTrend />
        <BottleneckAlert message="3 cards in Review for >5 days" />
      </div>
    </aside>
  );
}
```

- [ ] **Step 7: Integrate analytics sidebar into space detail page**

Update `frontend/src/app/spaces/[id]/page.tsx` to:
- Import `AnalyticsSidebar`
- Add `insightsOpen` state
- Pass it to the Board (which passes to BoardHeader)
- Render `AnalyticsSidebar` next to the main content area
- Layout: sidebar (left) + main (flex-1) + analytics (right, conditional)

- [ ] **Step 8: Verify and commit**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npx tsc --noEmit
cd /Users/matthewmcgibbon/spaces
git add frontend/src/components/analytics/ frontend/src/app/spaces/
git commit -m "feat: analytics sidebar with flow metrics, alignment health, sparklines"
```

---

## Task 11: Landing Page

**Files:**
- Create: `frontend/src/components/landing/HeroSection.tsx`
- Create: `frontend/src/components/landing/FeatureCards.tsx`
- Create: `frontend/src/components/landing/Footer.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create HeroSection**

Create `frontend/src/components/landing/HeroSection.tsx`:

```tsx
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-primary-50 to-white py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <Logo variant="full" size={48} className="justify-center mb-8" />
        <h1 className="text-3xl font-bold text-neutral-800 tracking-tight">
          Strategic alignment, visible everywhere.
        </h1>
        <p className="mt-4 text-lg text-neutral-500 max-w-xl mx-auto">
          Plan, prioritize, and deliver with clarity across every team and
          workstream.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/spaces">
            <Button size="lg">Get Started</Button>
          </Link>
          <Button variant="ghost" size="lg">
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create FeatureCards**

Create `frontend/src/components/landing/FeatureCards.tsx`:

```tsx
import { Folder, SquareKanban, Target } from "lucide-react";
import { type ReactNode } from "react";

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] bg-primary-50 text-primary-600 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-neutral-800">{title}</h3>
      <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export function FeatureCards() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard
          icon={<Folder className="w-6 h-6" />}
          title="Flexible Hierarchies"
          description="Nest spaces within spaces to mirror your org structure. Programs, teams, workstreams — organized your way."
        />
        <FeatureCard
          icon={<SquareKanban className="w-6 h-6" />}
          title="Kanban Flow"
          description="Triage, plan, execute, and deliver with a flow designed for strategic work. From inbox to done, with clarity at every stage."
        />
        <FeatureCard
          icon={<Target className="w-6 h-6" />}
          title="Goal Alignment"
          description="Link work to goals at any level. See at a glance whether day-to-day effort drives strategic outcomes."
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create Footer**

Create `frontend/src/components/landing/Footer.tsx`:

```tsx
export function Footer() {
  return (
    <footer className="bg-neutral-100 border-t border-neutral-200 py-8 px-6">
      <p className="text-center text-sm text-neutral-500">
        Built with Spaces
      </p>
    </footer>
  );
}
```

- [ ] **Step 4: Update page.tsx with conditional landing page**

Rewrite `frontend/src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  if (process.env.NEXT_PUBLIC_SHOW_LANDING !== "true") {
    redirect("/spaces");
  }

  return (
    <main>
      <HeroSection />
      <FeatureCards />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 5: Verify and commit**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npx tsc --noEmit
cd /Users/matthewmcgibbon/spaces
git add frontend/src/components/landing/ frontend/src/app/page.tsx
git commit -m "feat: landing page with hero, features, footer (gated by env var)"
```

---

## Task 12: Final Restyle — Spaces Page + App Shell

**Files:**
- Modify: `frontend/src/app/spaces/page.tsx`

- [ ] **Step 1: Restyle spaces welcome page**

Update `frontend/src/app/spaces/page.tsx` to use token-based classes:
- Replace `bg-white` with Sidebar's `bg-neutral-100`
- Replace `text-gray-*` with `text-neutral-*`
- Use `text-xl font-semibold text-neutral-800` for heading
- Use `text-sm text-neutral-500` for description

- [ ] **Step 2: Final verify — all compiles, no hardcoded gray/blue classes**

```bash
cd /Users/matthewmcgibbon/spaces/frontend && npx tsc --noEmit
```

Search for remaining hardcoded non-token classes:
```bash
grep -rn "gray-\|blue-600\|blue-700" frontend/src/components/ frontend/src/app/ || echo "Clean!"
```

- [ ] **Step 3: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add frontend/
git commit -m "feat: complete brand overhaul — all pages restyled with design tokens"
```

---

## Verification Summary

After all tasks, verify:

1. `npx tsc --noEmit` — no TypeScript errors
2. `npm run dev` starts and pages load
3. Inter font loads (check Network tab)
4. Favicon shows the teal nested planes mark
5. Sidebar uses Logo, teal accent colors, neutral backgrounds
6. Board cards have priority left stripe, branded badges
7. Column config dropdown shows/hides columns
8. Triage drawer slides out with Inbox/IceBox/Freezer
9. Analytics sidebar shows metric widgets with sparklines
10. Landing page renders when `NEXT_PUBLIC_SHOW_LANDING=true`
11. No hardcoded `gray-*` or `blue-*` classes remain in components

## What's Next (Phase 3)

- Wire analytics sidebar to real backend metrics endpoints
- Dark mode support
- Responsive/mobile layout
- Full charting library (Recharts) for dedicated dashboard page
- Motion/animation system
- Accessibility audit
