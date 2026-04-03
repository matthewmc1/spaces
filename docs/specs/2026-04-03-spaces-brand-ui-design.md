# Spaces Brand & UI Design Specification

**Date:** 2026-04-03
**Status:** Draft
**Author:** Design session with Claude

---

## 1. Brand Overview

**Personality:** Calm & professional. Trustworthy, focused, mature. Think Notion meets a strategic planning tool.

**Core message:** "Strategic alignment, visible everywhere." Spaces helps teams, programs, and orgs see whether day-to-day work aligns with strategic goals.

**Visual principles:**
- Generous whitespace — let content breathe
- Muted, purposeful color — color conveys meaning, not decoration
- Subtle depth — light shadows and borders, not heavy 3D effects
- Data clarity — metrics are readable at a glance, not buried in chrome
- Consistency — every element follows the same token system

---

## 2. Color System

### 2.1 Primary Palette — Teal/Emerald

The primary teal conveys growth, progress, and clarity.

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary-50` | `#f0fdfa` | Subtle backgrounds, hover states |
| `--color-primary-100` | `#ccfbf1` | Light fills, selected states |
| `--color-primary-200` | `#99f6e4` | Active borders |
| `--color-primary-500` | `#14b8a6` | Primary buttons, links, accents |
| `--color-primary-600` | `#0d9488` | Button hover |
| `--color-primary-700` | `#0f766e` | Pressed states |
| `--color-primary-900` | `#134e4a` | Dark text on primary bg |

### 2.2 Neutral Palette — Warm Slate

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-neutral-50` | `#f8fafc` | Page backgrounds |
| `--color-neutral-100` | `#f1f5f9` | Card backgrounds, sidebar bg |
| `--color-neutral-200` | `#e2e8f0` | Borders, dividers |
| `--color-neutral-300` | `#cbd5e1` | Disabled borders |
| `--color-neutral-400` | `#94a3b8` | Placeholder text, muted icons |
| `--color-neutral-500` | `#64748b` | Secondary text |
| `--color-neutral-600` | `#475569` | Body text |
| `--color-neutral-700` | `#334155` | Headings |
| `--color-neutral-800` | `#1e293b` | Primary text |
| `--color-neutral-900` | `#0f172a` | Highest contrast |

### 2.3 Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | `#10b981` | Done, passing, positive trends |
| `--color-warning` | `#f59e0b` | At risk, attention needed |
| `--color-danger` | `#ef4444` | Critical, P0, errors, blockers |
| `--color-info` | `#3b82f6` | Informational, external links |

### 2.4 Kanban Column Colors

Each column has a border color (accent line) and a subtle background tint.

| Column | Border | Background | Meaning |
|--------|--------|------------|---------|
| Inbox | `#94a3b8` (slate-400) | `#f8fafc` (slate-50) | Unsorted, needs triage |
| Ice Box | `#38bdf8` (sky-400) | `#f0f9ff` (sky-50) | Good idea, needs definition |
| Freezer | `#3b82f6` (blue-500) | `#eff6ff` (blue-50) | Uncertain value, parked |
| Planned | `#14b8a6` (teal-500) | `#f0fdfa` (teal-50) | Ready for work |
| In Progress | `#f59e0b` (amber-500) | `#fffbeb` (amber-50) | Active work |
| Review | `#fb923c` (orange-400) | `#fff7ed` (orange-50) | Awaiting review |
| Done | `#10b981` (emerald-500) | `#ecfdf5` (emerald-50) | Delivered |

### 2.5 Priority Colors

| Priority | Badge BG | Badge Text | Left Stripe |
|----------|----------|------------|-------------|
| P0 — Critical | `#ffe4e6` (rose-100) | `#be123c` (rose-700) | `#ef4444` (red-500) |
| P1 — High | `#fef3c7` (amber-100) | `#b45309` (amber-700) | `#f59e0b` (amber-500) |
| P2 — Medium | `#fefce8` (yellow-50) | `#a16207` (yellow-700) | `#eab308` (yellow-500) |
| P3 — Low | `#f1f5f9` (slate-100) | `#64748b` (slate-500) | `#cbd5e1` (slate-300) |
| None | transparent | — | transparent |

---

## 3. Typography

### 3.1 Font Stack

- **Primary:** Inter (Google Fonts, variable weight 400–700)
- **Monospace:** JetBrains Mono (for metrics, counts, data values)
- **Fallback:** system-ui, -apple-system, sans-serif

Load Inter via `next/font/google` for optimal performance (font subsetting, self-hosted).

### 3.2 Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-xs` | 11px / 0.6875rem | 400 | 16px | Badges, timestamps, metadata |
| `--text-sm` | 13px / 0.8125rem | 400 | 20px | Descriptions, labels, secondary |
| `--text-base` | 14px / 0.875rem | 400 | 22px | Body text, form inputs |
| `--text-lg` | 16px / 1rem | 500 | 24px | Card titles, section headers |
| `--text-xl` | 18px / 1.125rem | 600 | 28px | Page titles, space names |
| `--text-2xl` | 24px / 1.5rem | 700 | 32px | Dashboard headings |
| `--text-3xl` | 30px / 1.875rem | 700 | 36px | Landing page hero |
| `--text-mono` | 12px / 0.75rem | 400 | 18px | Metrics, counts, data |

---

## 4. Spacing, Radius & Shadows

### 4.1 Spacing (8px grid)

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

### 4.2 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Badges, small elements |
| `--radius-md` | 6px | Cards, buttons, inputs |
| `--radius-lg` | 8px | Dialogs, panels |
| `--radius-xl` | 12px | Large containers |
| `--radius-full` | 9999px | Avatars, pill badges |

### 4.3 Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | Cards at rest |
| `--shadow-md` | `0 2px 8px rgba(0,0,0,0.06)` | Hover, elevated cards |
| `--shadow-lg` | `0 4px 16px rgba(0,0,0,0.08)` | Dialogs, dropdowns |
| `--shadow-xl` | `0 8px 32px rgba(0,0,0,0.12)` | Drag overlay |

---

## 5. Logo & Favicon

### 5.1 Logo Mark — "Nested Planes"

Three rounded rectangles, slightly offset and overlapping, creating a sense of layered depth:
- **Back layer:** `primary-200` (lightest teal)
- **Middle layer:** `primary-400`
- **Front layer:** `primary-500` (main teal)

Each rectangle is progressively smaller and offset down-right, conveying:
- Spaces within spaces (nesting)
- Strategic alignment (layered priorities)
- Depth and organization

The mark works at 16px (favicon), 24px (nav), 32px (header), and 64px+ (marketing).

At 16px favicon size, simplify to 2 overlapping shapes for legibility.

### 5.2 Wordmark

- "Spaces" in Inter Semibold (600)
- Letter-spacing: +0.02em
- Color: `neutral-800` on light, white on dark backgrounds

### 5.3 Lockup Variants

1. **Full horizontal:** Mark (left) + wordmark (right), 8px gap
2. **Compact:** Mark only (favicon, mobile nav, app icon)
3. **Text only:** Wordmark alone (breadcrumbs, dense UI)

### 5.4 Favicon

- SVG favicon for all modern browsers (sharp at any resolution)
- PNG fallback at 32x32 and 16x16
- Apple touch icon at 180x180
- Use the simplified 2-layer mark

---

## 6. Icon System

### 6.1 Library

Continue using **Lucide React** (already installed). 800+ icons, consistent 24px grid, 1.5px stroke width.

### 6.2 Icon Sizing

| Context | Size | Tailwind |
|---------|------|----------|
| Inline with text-sm | 14px | `w-3.5 h-3.5` |
| Inline with text-base | 16px | `w-4 h-4` |
| Buttons | 18px | `w-4.5 h-4.5` |
| Navigation | 20px | `w-5 h-5` |
| Page headers | 24px | `w-6 h-6` |

### 6.3 Icon Colors

- Default: `neutral-400` (muted)
- Interactive: `neutral-600` default, `primary-500` on hover
- Active/selected: `primary-600`
- Destructive actions: `danger` (red-500)

### 6.4 Key Icon Mappings

| Concept | Lucide Icon |
|---------|-------------|
| Space | `Folder` |
| Card/Item | `SquareKanban` |
| Goal | `Target` |
| Metric | `BarChart3` |
| Alignment | `GitBranch` |
| Priority | `Flag` |
| Due date | `Calendar` |
| Assignee | `User` |
| Add/Create | `Plus` |
| Settings | `Settings` |
| Insights | `PanelRight` |
| Triage | `Inbox` |
| Collapse | `PanelLeftClose` |
| Expand | `PanelLeftOpen` |
| Drag handle | `GripVertical` |

---

## 7. Base Components

### 7.1 Button

```
Variants: primary | secondary | ghost | danger
Sizes: sm (h-7, text-xs) | md (h-9, text-sm) | lg (h-11, text-base)
States: default | hover | active | disabled | loading
Props: variant, size, icon (leading/trailing), iconOnly, loading, disabled
```

- **Primary:** `bg-primary-500 text-white` → hover `bg-primary-600` → active `bg-primary-700`
- **Secondary:** `bg-neutral-100 text-neutral-700 border-neutral-200` → hover `bg-neutral-200`
- **Ghost:** `bg-transparent text-neutral-600` → hover `bg-neutral-100`
- **Danger:** `bg-danger text-white` → hover darker shade
- **Disabled:** `opacity-50 cursor-not-allowed`
- **Loading:** Spinner replaces icon, text stays, button disabled

### 7.2 Badge

```
Variants: default | primary | success | warning | danger
Sizes: sm (h-5, text-xs) | md (h-6, text-sm)
Props: variant, size, dot (boolean — shows colored dot before text)
```

- Pill shape (`radius-full`)
- Font: mono for numeric badges

### 7.3 Card

```
Variants: default | elevated | outlined | interactive
Props: variant, padding (sm|md|lg), className
```

- **Default:** `bg-neutral-50 border-neutral-200 shadow-sm`
- **Elevated:** `bg-white shadow-md`
- **Interactive:** adds `hover:shadow-md cursor-pointer transition-shadow`

### 7.4 Input / Textarea

```
Sizes: sm | md | lg
States: default | focus | error | disabled
Props: size, error (string), label, hint
```

- `bg-white border-neutral-200` → focus `ring-2 ring-primary-200 border-primary-500`
- Error: `border-danger ring-danger/20` + error message below
- Label above, hint text below (neutral-400)

### 7.5 Select

Same styling as Input. Chevron icon on right. Native `<select>` element styled consistently.

### 7.6 Dialog (Modal)

```
Props: open, onClose, title, description, children, footer
```

- Backdrop: `bg-black/40` with fade-in
- Card: white, `shadow-xl`, `radius-lg`, max-width `md` (448px) or `lg` (512px)
- Header: title (text-lg, semibold) + optional description (text-sm, neutral-500) + close X
- Body: scrollable content area
- Footer: right-aligned action buttons

### 7.7 Sidebar (app shell)

- Fixed left, `w-64`, `bg-neutral-100`, `border-r border-neutral-200`
- Logo section at top (mark + wordmark)
- Navigation sections with uppercase label headers (text-xs, neutral-400, tracking-wider)
- Tree items with indent, expand/collapse, active highlighting
- Bottom section: user avatar + name, settings link

### 7.8 Dropdown Menu

```
Props: trigger (React node), items, align (start|end)
```

- `shadow-lg`, `radius-md`, `bg-white`, `border-neutral-200`
- Items: `px-3 py-2 text-sm` → hover `bg-primary-50 text-primary-700`
- Separator: `border-t border-neutral-100` with `my-1`
- Keyboard navigable (up/down/enter/escape)

### 7.9 Tooltip

- `bg-neutral-800 text-white text-xs px-2 py-1 radius-sm`
- Show delay: 300ms, hide: instant
- Arrow pointing to trigger

### 7.10 Skeleton

- `bg-neutral-200 animate-pulse radius-md`
- Variants matching content shapes: text line, circle (avatar), rectangle (card)

### 7.11 Metric Card

```
Props: label, value, trend (up|down|flat), trendValue (string), sparklineData (number[])
```

- Label: `text-xs text-neutral-500 uppercase tracking-wider`
- Value: `text-2xl font-semibold font-mono text-neutral-800`
- Trend: green arrow-up for positive, red arrow-down for negative, neutral for flat
- Trend value: `text-xs font-mono` next to arrow
- Optional sparkline: 60px wide mini line chart below value
- Card wrapper: `bg-white border-neutral-200 shadow-sm p-4 radius-md`

---

## 8. Board Design

### 8.1 Layout

**Default view:** Shows 4 active columns — Planned, In Progress, Review, Done.

**Triage drawer:** Toggled by a "Triage" button (with `Inbox` icon) in the board header. Slides in from the left as a 320px panel showing Inbox → Ice Box → Freezer columns stacked or in mini-columns. Cards can be dragged from triage into the main board's Planned column.

**Column configuration:** "Columns" dropdown in the board header with checkboxes to show/hide each of the 7 columns. Selections persist in localStorage per space.

### 8.2 Board Header

- Space name (text-xl, semibold)
- Space description (text-sm, neutral-500) — collapsed by default, expand on click
- Action buttons (right-aligned): "Triage" toggle, "Columns" dropdown, "Insights" toggle
- All buttons use the `ghost` variant

### 8.3 Column Design

- Background: column-specific `-50` tint
- Top accent: 3px solid line in column color
- Header: column label (text-lg, semibold, neutral-700) + card count (mono, pill badge)
- Add card: `Plus` icon ghost button in header (visible on hover or always for Inbox)
- Empty state: dashed border area, "No cards" text (neutral-400), "+" icon
- Min height: 120px
- Width: 280px flex-shrink-0
- Gap between columns: 16px (space-4)
- Overflow-y: auto (scroll within column)

### 8.4 Card Design

- Background: white
- Border: `neutral-200`, `radius-md`
- Shadow: `shadow-sm` at rest, `shadow-md` on hover
- **Left priority stripe:** 3px wide, rounded on left side, colored by priority
- Padding: `12px` (space-3)
- Title: `text-base font-medium text-neutral-800`
- Description: `text-sm text-neutral-500 line-clamp-2`
- Footer row: priority badge + label badges + assignee avatar (24px circle) + due date
- Hover: border shifts to `neutral-300`, shadow elevates
- **Drag state:** `shadow-xl`, `opacity-90`, `rotate-1` (1 degree tilt), scale 1.02
- **Drop placeholder:** dashed border, primary-100 bg, height matches card

### 8.5 Drag & Drop Behavior

- Activation: 5px drag distance (prevent accidental drags)
- Visual: card lifts with shadow-xl, source position shows dashed placeholder
- Invalid drop targets: visually muted (lower opacity)
- Optimistic: card moves instantly, rolls back on API error with toast notification

---

## 9. Analytics Sidebar

### 9.1 Structure

- Toggle: "Insights" button (ghost, `PanelRight` icon) in board header
- Width: 320px, slides in from right
- Background: white, `border-l border-neutral-200`
- Header: "Insights" (text-lg, semibold) + close button
- Content: scrollable stack of metric widgets with `space-6` (24px) gaps

### 9.2 Widgets

#### Flow Summary (KPI Row)
- 2x2 grid of Metric Cards
- Metrics: Cards in Flight (count), Avg Cycle Time (days), Weekly Throughput (cards/week), Completion Rate (%)
- Each with trend indicator vs. previous period

#### Alignment Health
- Circular progress indicator (SVG ring)
- Center: percentage value (mono, text-2xl)
- Color: success (>80%), warning (50-80%), danger (<50%)
- Below: "X of Y cards linked to goals"
- Warning line: "Z orphaned goals" if any (with warning icon)

#### Column Distribution
- Horizontal stacked bar chart
- Each segment colored by column color
- Hover tooltip: column name + count + percentage
- Height: 24px
- Labels below for columns with >10% share

#### Cycle Time Trend
- Mini line chart, 60px tall, full width
- Last 30 days
- Current value: large mono number
- Line color: primary-500
- Y-axis: hidden. X-axis: "30d" label only

#### Bottleneck Alert (conditional)
- Only appears when items are aging beyond average
- Warning card: amber background, amber border
- Icon: `AlertTriangle`
- Message: "3 cards in Review for >5 days"
- Links to filter board by those cards

### 9.3 Chart Library

Use **lightweight, SVG-based inline charts** — no heavy charting library for Phase 2.
- Sparklines: hand-rolled SVG `<polyline>` (simple, ~20 lines of code)
- Circular progress: SVG `<circle>` with `stroke-dasharray`
- Stacked bar: CSS flexbox with colored divs

Full charting library (Recharts or similar) deferred to Phase 3 when we add dedicated dashboard pages.

---

## 10. Landing Page

### 10.1 Structure

Gated behind `NEXT_PUBLIC_SHOW_LANDING=true` env var. When false, `/` redirects to `/spaces` (current behavior).

When enabled:

**Hero section:**
- Full-width, `bg-gradient-to-b from-primary-50 to-white`
- Logo mark (64px) + "Spaces" wordmark (text-3xl)
- Tagline: "Strategic alignment, visible everywhere." (text-2xl, neutral-700)
- Subtitle: "Plan, prioritize, and deliver with clarity across every team and workstream." (text-lg, neutral-500)
- CTAs: "Get Started" (primary button, lg) + "Learn More" (ghost button, lg)
- Generous vertical padding: `py-24`

**Feature section (below hero):**
- Three feature cards in a row
- Each: icon (24px, primary-500) + title (text-lg) + description (text-sm, neutral-500)
- Features: "Flexible Hierarchies" (Folder icon), "Kanban Flow" (SquareKanban icon), "Goal Alignment" (Target icon)

**Footer:**
- Minimal: "Built with Spaces" + link to docs
- neutral-100 bg, neutral-500 text

---

## 11. Page Layouts

### 11.1 App Shell

```
+---+-----------------------------------+-------+
|   |          Board Header             | Insights
| S |                                   |  Side  |
| i |     Board / Content Area          |  bar   |
| d |                                   |  (opt) |
| e |                                   |        |
| b |                                   |        |
| a |                                   |        |
| r |                                   |        |
+---+-----------------------------------+-------+
 64px        flex-1                       320px
```

- Sidebar: always visible, 64px collapsed / 256px expanded
- Main content: flex-1, scrollable
- Analytics sidebar: 320px, collapsible, right side

### 11.2 Responsive Behavior (future)

- Desktop (>1280px): full layout as above
- Tablet (768-1280px): sidebar collapsed by default, analytics as overlay
- Mobile (<768px): bottom nav, full-screen board with swipeable columns

(Responsive is Phase 3 — design for desktop-first.)

---

## 12. Implementation Scope

### What's in this spec:
1. Design tokens (CSS custom properties in globals.css)
2. Font setup (Inter via next/font/google)
3. Logo SVG + favicon generation
4. 11 base components (Button, Badge, Card, Input, Textarea, Select, Dialog, Sidebar, Dropdown, Tooltip, Skeleton, MetricCard)
5. Board redesign (configurable columns, triage drawer, updated card/column styling)
6. Analytics sidebar (5 metric widgets with inline SVG charts)
7. Landing page template (hero + features + footer)
8. Restyle all existing pages to use the new design system

### What's NOT in this spec:
- Dark mode (Phase 3)
- Responsive/mobile (Phase 3)
- Full charting library integration (Phase 3)
- Animation/motion system beyond basic transitions (Phase 3)
- Accessibility audit beyond semantic HTML + focus states (Phase 3)

---

## 13. Verification Plan

1. **Design tokens:** All CSS variables defined and used — no hardcoded colors/sizes in components
2. **Components:** Each base component renders correctly in isolation
3. **Board:** Columns configurable, triage drawer toggles, cards have priority stripes, drag-and-drop works
4. **Analytics sidebar:** Opens/closes, displays placeholder metrics, inline charts render
5. **Landing page:** Hero renders when env var is set, redirects when not
6. **Favicon:** Custom SVG favicon displays in browser tab
7. **Typography:** Inter loads, all text uses the type scale
8. **Consistency:** No component uses raw Tailwind color classes — all go through tokens
