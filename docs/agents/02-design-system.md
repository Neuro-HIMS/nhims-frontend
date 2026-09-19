# 02 — Design system (v2: monochrome with dotted canvas)

The visual language is **clean, calm and business-like**: black, white and greys, with color used **only** to carry meaning (status pills, alerts, destructive actions). Everything is defined as tokens in `app/globals.css` — this document explains how to use them.

> Rule zero: if you're about to type a hex code, a Tailwind palette color (`red-500`, `slate-400`, `emerald-…`), or `style={{ color }}` — stop. Use a token below, or add a new token to `globals.css` first.

---

## 1. Tokens

Tokens are HSL triplets in `:root` and exposed to Tailwind via `@theme inline`, so `--success-bg` becomes `bg-success-bg`, `--muted-foreground` becomes `text-muted-foreground`, etc.

### 1.1 Base (monochrome)

| Token | Tailwind | Use |
|---|---|---|
| `--background` | `bg-background` | Page canvas (white) — use with `.canvas-dots` |
| `--canvas-dot` | — | Dot color for the grid (used by `.canvas-dots`) |
| `--card` | `bg-card` | Cards, tables, dialogs, inputs (white) |
| `--surface-subtle` | `bg-surface-subtle` | Table header row, filter/toolbar band |
| `--surface-muted` / `--muted` | `bg-surface-muted` / `bg-muted` | Upload areas, row hover, skeletons, icon-button fills |
| `--border` | `border-border` | Every border and divider (1px) |
| `--foreground` | `text-foreground` | Main text |
| `--muted-foreground` | `text-muted-foreground` | Descriptions, helper text, section labels |
| `--text-disabled` | `text-text-disabled` | Disabled text |
| `--primary` | `bg-primary` | **Black** — primary buttons, facility switcher, checked checkboxes, active sub-tab underline |
| `--primary-hover` | `hover:bg-primary-hover` | Primary hover |
| `--accent` / `--ring` | `text-accent`, focus ring | **Blue — text links and focus rings only** |
| `--destructive` | `bg-destructive`, `text-destructive` | The one red: delete/cancel, error borders |
| `--brand` / `--sidebar*` | via `.sidebar-*` classes | Sidebar chrome only |

### 1.2 Feedback and status sets (strong / soft background / border)

Each has three tokens: `--x`, `--x-bg`, `--x-border` → `text-x`, `bg-x-bg`, `border-x-border`.

| Set | Meaning | Examples |
|---|---|---|
| `success` | Done, good | Saved, Paid, Dispensed, Completed, NHIS active, Bed free |
| `warning` | Needs attention soon | Low stock, Expiring soon, No data yet, Unsaved changes, Urgent triage |
| `pending` | Waiting on something | Waiting, Awaiting payment, NHIS not confirmed yet, Semi-urgent triage |
| `error` | Failed, danger, critical | Failed, Rejected, Critical result, Allergy, NHIS expired, Emergency triage |
| `info` | In progress, neutral tip | Being seen, Sample collected, Under review |
| `purple` | Sent onward / referred | Referred, Sent to doctor, Sent to lab |
| `neutral` | Not started / draft | Requested, Draft, Cancelled |

### 1.3 Medical status (separate system — don't reuse feedback tokens for these)

| Area | Tokens | Rule |
|---|---|---|
| Triage | `--clinical-emergency/-urgent/-semi-urgent/-routine` (+ `-bg`) | Emergency red ⚠, Urgent orange, Semi-urgent amber, Routine green — always with the word |
| NHIS | `--nhis-active/-inactive/-pending` (+ `-bg`) | "NHIS active" / "NHIS expired" / "NHIS not confirmed yet" |
| Lab result | `--result-normal/-low/-high/-critical` (+ `-bg`) | Normal plain; Low blue + ↓ "Low"; High orange + ↑ "High"; Critical red pill ⚠ "Critical" |

> Known debt: `.result-abnormal` in `globals.css` paints both low and high in the low (blue) color. Add `.result-low` and `.result-high` utilities and migrate; don't use `.result-abnormal` in new code.

### 1.4 Deprecated — do not use in new code

`.dashboard-shell-header`, `.dashboard-tab*`, `.dashboard-tabbar`, `.dashboard-online-*`, `.dashboard-icon-btn`, `--dashboard-*` tokens (old navy top tab bar), `--notice-info-*` (use `info` set), `--login-hero-*` gradients. Remove them when the last usage is gone.

---

## 2. Page canvas

- The workspace `<main>` uses `.canvas-dots`: white with a faint 1px dot every 16px.
- Content sits in **white cards** on top, so dots only show in margins and gaps.
- Content column: `mx-auto w-full max-w-screen-xl` (≈1200–1280px), page padding `px-6 py-6` (`px-4` on tablets), gaps between cards `space-y-6`.

## 3. App frame (already built — reuse, don't rebuild)

| Part | File | Look |
|---|---|---|
| Sidebar | `components/layouts/app-sidebar.tsx` | ~240–260px, `--sidebar` charcoal; white "NHIMS" wordmark block aligned with the top bar; UPPERCASE group labels (11px, letter-spaced, muted); items = outline icon + label (`.sidebar-item`); active = lighter pill with hairline border (`.sidebar-item.active`); collapse (≡) to icons; Feedback + Log out pinned at bottom |
| Top bar | `components/layouts/app-header.tsx` | White, ~64px, bottom border. Left: small black square avatar + "Hello, **First Last**!" + role pill (green dot + "Nurse") — this whole block is the user menu (My profile / Sign-in and security). Middle: "Find a patient" search (only for roles with records access). Right: notifications bell with count, **static black facility badge** (logo in white circle + facility name, no chevron, not clickable — NHIMS runs one facility per server) |
| Offline bar | `components/common/offline-banner.tsx` | Slim `pending` band under the top bar — only when offline |

## 4. Page layout recipe

Every module page opens with a **header card** (title, one-line description, actions right), then the module's tabs, then content cards.

```tsx
<div className="space-y-6">
  <PageCard
    title="Nurse station"
    description="See today's patients, triage them and record vitals."
    actions={<Button>Start triage</Button>}   // at most one primary
  />
  <ModuleSubNav items={NURSE_NAV} basePath="/nurse" />
  <section className="rounded-xl border border-border bg-card">…</section>
</div>
```

(`PageCard` is the card-style evolution of `PageHeader` — see `03-components.md`.)

## 5. Cards

- `rounded-xl border border-border bg-card` — no shadow, or `shadow-[var(--shadow-card)]` at most.
- Header: `px-6 py-5`, title `text-lg font-semibold text-foreground`, description `text-sm text-muted-foreground mt-0.5`, actions `flex gap-2` on the right.
- Body: `px-6 pb-6`. Stacked sections inside a card are separated by a **dashed** divider: `border-t border-dashed border-border`.
- Nested panels (two side-by-side boxes inside a card): same card style, `grid gap-4 md:grid-cols-2`.

## 6. Buttons (`components/ui/button.tsx`)

| Intent | Variant | Look |
|---|---|---|
| Primary (one per screen/dialog) | `default` | Solid black, white text |
| Secondary | `outline` | White, black 1px border, black text |
| Tertiary / low importance | `secondary` | White, grey border, dark text |
| Row icon / quiet | `ghost` (`size="icon-sm"`) | Grey icon, darker on hover |
| Risky action outside a dialog | `destructive-outline` | Red text + red border |
| Confirm a risky action (inside `ConfirmDialog` only) | `destructive` | Solid red |
| Inline text link | `link` | Blue underline on hover |

- Sizes: `default` (36px) in tables/toolbars, `lg` (40px) for page-level primary actions and forms.
- Icon placement: leading icon for verbs ("+ Add supplier"), trailing icon for "opens elsewhere" (Import ↗).
- Loading: disable + spinner (`components/ui/spinner.tsx`) + "-ing…" label ("Saving…"). Prevent double submit.
- Order: in dialogs and form footers, primary on the **right**, cancel (tertiary) on its left.

## 7. Tables (the main pattern)

Match the reference "Suppliers" table:

1. **Toolbar band** — `bg-surface-subtle px-4 py-3 border-y border-border`, flex row: search input (search icon on the right, `max-w-sm`) then 1–3 filter selects ("Filter by ward", "Filter by status", "Filter by date"). Filters are white inputs, 8px radius.
2. **Header row** — `bg-surface-subtle`, `text-xs font-medium text-foreground`, sort icon on sortable columns.
3. **Columns** — checkbox (only if bulk actions exist) → small grey row number or ID (`font-clinical text-muted-foreground`) → expand chevron (only if rows expand) → main name (`font-medium`) → data → **status pill** → date (`DD/MM/YYYY`) → row actions (ghost icons; delete = red trash).
4. **Rows** — ~48px tall, `border-b border-border/60`, no zebra, hover `bg-surface-muted/60`, clickable rows use `.table-row-interactive` and are keyboard-focusable.
5. **Footer** — "Showing 1–20 of 134" left, pagination right.
6. **Tablet (<1024px)** — rows collapse to stacked cards (name + pill on top, 2–3 key facts, actions).

## 8. Status pills

One component, one shape: `.status-pill` + one of `.status-pill-{success|warning|pending|error|info|purple|neutral}` — rounded-full, soft background, thin darker border, **12px icon on the left**, 12px medium text. Use `<StatusPill tone="…" icon={…}>Words</StatusPill>` (see components). Never a colored dot alone; never raw enum text.

## 9. Upload areas and illustrations

- Upload box: `rounded-xl bg-surface-muted p-6 text-center`, white circle with an upload-cloud icon, "**Click to upload** or drag and drop", grey line with allowed types + max size. Drag-over: `border-2 border-dashed border-foreground`. Error: red border + message.
- Explanatory block beside it: bold title, short grey paragraph, one black button ("Download template").
- Illustrations: soft **greyscale** line drawings on a pale grey circle; used for all empty and error states. Store as inline SVG components in `components/common/illustrations/` using `currentColor` + muted tokens.

## 10. Forms

- One column inside a card; `max-w-2xl` for long forms. Labels above fields (`text-sm font-medium`), helper text below (`text-xs text-muted-foreground`).
- Inputs/selects: white, `border-border`, 8px radius, 40px tall, grey placeholder with an example ("e.g. 024 123 4567").
- Group fields under bold subtitles; separate groups with a dashed divider.
- Mark optional fields "(optional)"; don't mark required ones with `*`.
- Dates: always the date picker (`components/ui/date-picker-field.tsx`). Units shown as a suffix inside the input ("°C", "mmHg", "kg", "GH₵").
- Long forms become steps with a simple black/grey step indicator (Personal details → Contact → NHIS → Review).
- Error state: red border + small red icon + message under the field (see 04).

## 11. Patient banner

Whenever a patient is open, a white card pinned at the top of the content: **name** (bold), age · sex, hospital number (`font-clinical`, grey), and pills: NHIS status, triage, allergies (error pill "Allergies: Penicillin" or neutral "No known allergies"). Identical in every module. Built from `components/clinical/folder/folder-header.tsx` → evolve into `PatientBanner` (see 03).

## 12. Typography

- Font: **Inter** (`font-sans`). Tabular figures: `font-clinical` for IDs, vitals, money, results, dates in tables.
- Scale: page/card title 18px semibold (`text-lg`), section title 16px semibold (`text-base`), body/table 14px (`text-sm`), helper 12–13px (`text-xs`). Never below 12px. Stat numbers `text-3xl` via `.stat-card-value`.
- Text colors: `text-foreground`, `text-muted-foreground`, `text-text-disabled`. Nothing else for plain text.

## 13. Spacing, radius, borders, motion

- Spacing scale (4px base): 1, 2, 3, 4, 6, 8, 12 in Tailwind units (4–48px). Don't invent `mt-[13px]`.
- Radius: `rounded-lg` (8px) buttons/inputs, `rounded-xl` (12px) cards/dialogs/upload areas, `rounded-full` pills/avatars.
- Borders: 1px `border-border` unless signalling a state.
- Motion: 150–200ms color/opacity transitions only. No bouncing, no page-level animations. Respect `prefers-reduced-motion`.

## 14. Icons

Lucide, outline style, 16px in buttons/tables, 18px in the sidebar, 12px in pills. Navigation icons always have a text label. Decorative icons get `aria-hidden`.

## 15. Accessibility and responsiveness

- WCAG 2.1 AA: text contrast ≥ 4.5:1 (3:1 for large text/icons). The token set is chosen to pass — don't lighten text.
- Visible focus ring (`--ring`) on everything interactive; full keyboard use; screen-reader labels for icon buttons.
- Breakpoints: design at 1440; must work at **1280** (laptop) and **768** (tablet — sidebar collapses to icons, tables become cards). Phone: search and read-only views should not break.
- Minimum target 40×40px.
