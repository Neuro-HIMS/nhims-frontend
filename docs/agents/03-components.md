# 03 — Components

Reuse before you build. If a pattern appears on two screens, it belongs in `components/common/` (app-wide) or `components/clinical/` (patient/clinical-wide) — never copied between modules.

Status key: **Exists** = use as is · **Evolve** = exists but must be brought up to v2 · **Build** = create it (first slice that needs it builds it, see `build-plan.md` → `FND-*`).

---

## 1. Shell and navigation

| Component | Path | Status | Notes |
|---|---|---|---|
| `DashboardShell` | `components/layouts/dashboard-shell.tsx` | Exists | Sidebar + header + `<main className="canvas-dots">` |
| `AppSidebar` | `components/layouts/app-sidebar.tsx` | Exists | Reads `NAV_ITEMS`, groups by `NAV_GROUP_ORDER`, filters by `canAccessWorkspaceModule` |
| `AppHeader` | `components/layouts/app-header.tsx` | Evolve | Add greeting + role pill + navy facility badge per 02 §3 |
| `ModuleSubNav` | `components/layouts/module-subnav.tsx` | Exists | `?view=` tabs, max 5 visible, rest under "More"; active tab = navy text + navy underline |
| `PageHeader` → `PageCard` | `components/layouts/page-header.tsx` | Evolve | Wrap in a card (02 §5). Keep `PageHeader` name as alias until migrated |

```ts
// components/layouts/page-card.tsx
interface PageCardProps {
  title: string;              // plain words, sentence case
  description: string;        // one helpful sentence — required, never placeholder text
  actions?: React.ReactNode;  // max one primary button
  children?: React.ReactNode; // optional body (e.g. stat tiles)
}
```

## 2. Layout blocks

| Component | Path | Status | Contract |
|---|---|---|---|
| `SectionCard` | `components/common/section-card.tsx` | Build | `{ title; description?; actions?; children; footer? }` — the standard white card |
| `FormSection` | `components/common/form-section.tsx` | Build | `{ title; description?; children }` — bold subtitle + dashed divider above |
| `StatCard` | `components/common/stat-card.tsx` | Build | `{ label; value: string \| number; hint?; tone?: PillTone; href? }` — uses `.stat-card-label` / `.stat-card-value` |
| `StepIndicator` | `components/common/step-indicator.tsx` | Build | `{ steps: string[]; current: number }` — navy for done/current, grey for upcoming |

## 3. Data display

### `StatusPill` — Build (`components/common/status-pill.tsx`)

```ts
type PillTone = "success" | "warning" | "pending" | "error" | "info" | "purple" | "neutral";
interface StatusPillProps { tone: PillTone; icon?: LucideIcon; children: string; }
```
Renders `.status-pill .status-pill-{tone}` with a 12px icon. **Every status in the app goes through this.**

Pair it with label maps in `lib/status-labels.ts` (Build) so enums never reach the screen:

```ts
export const ENCOUNTER_STATUS: Record<EncounterStatus, { label: string; tone: PillTone; icon: LucideIcon }> = {
  CHECKED_IN:      { label: "Arrived",               tone: "info",    icon: LogIn },
  AT_VITALS:       { label: "Waiting for vitals",    tone: "pending", icon: Clock },
  AT_CONSULTATION: { label: "Waiting for doctor",    tone: "pending", icon: Clock },
  IN_CONSULTATION: { label: "With doctor",           tone: "info",    icon: Stethoscope },
  AT_LAB:          { label: "At the lab",            tone: "purple",  icon: FlaskConical },
  AT_PHARMACY:     { label: "At the pharmacy",       tone: "purple",  icon: Pill },
  AT_BILLING:      { label: "Waiting to pay",        tone: "pending", icon: Wallet },
  ADMITTED:        { label: "Admitted",              tone: "info",    icon: BedDouble },
  COMPLETED:       { label: "Visit finished",        tone: "success", icon: CheckCircle2 },
  CANCELLED:       { label: "Cancelled",             tone: "neutral", icon: XCircle },
  NO_SHOW:         { label: "Didn't come",           tone: "error",   icon: UserX },
  SCHEDULED:       { label: "Booked",                tone: "neutral", icon: CalendarDays },
};
```
The full set of maps (appointments, triage, lab, imaging, prescriptions, bills, claims, NHIS, admissions, beds, users) is in `05-ui-copy.md` §5.

### Medical pills — Build (`components/clinical/`)

| Component | Contract | Rule |
|---|---|---|
| `TriagePill` | `{ priority: TriagePriorityCode \| "PENDING" }` | Uses `--clinical-*` tokens; Emergency has ⚠ |
| `NhisPill` | `{ status: "ACTIVE" \| "INACTIVE" \| "SUSPENDED" \| "UNKNOWN" \| "PENDING" }` | "NHIS active" / "NHIS expired" / "NHIS suspended" / "NHIS not confirmed yet" |
| `AllergyPill` | `{ allergies: string[] }` | Error tone "Allergies: A, B" or neutral "No known allergies" |
| `LabResultValue` | `{ value; unit; flag: "NORMAL" \| "LOW" \| "HIGH" \| "CRITICAL"; refRange }` | Low ↓ blue, High ↑ orange, Critical red pill; always shows word + range |

### `DataTable` — Build (`components/common/data-table/`)

The one table for lists. Built on `components/ui/table.tsx`.

```ts
interface DataTableProps<T> {
  columns: DataTableColumn<T>[];     // { key; header; cell(row); sortable?; className?; hideOnTablet? }
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  isLoading: boolean;
  error?: unknown;                   // renders ErrorState inside the table card
  onRetry?: () => void;
  empty: EmptyStateProps;            // required — you must decide the empty copy
  toolbar?: React.ReactNode;         // <TableToolbar …/>
  onRowClick?: (row: T) => void;     // makes rows .table-row-interactive + keyboard focusable
  rowActions?: (row: T) => React.ReactNode;
  selectable?: boolean;              // checkbox column — only with bulk actions
  expandable?: (row: T) => React.ReactNode;
  pagination?: { page; pageSize; total; onPageChange };
  mobileCard?: (row: T) => React.ReactNode; // stacked card under 1024px
}
```
Sub-components: `TableToolbar` (`{ search?: {value; onChange; placeholder}; filters?: ReactNode; actions?: ReactNode }`), `TablePagination`, `TableSkeleton`.

### `WaitingList` — Build (`components/clinical/waiting-list.tsx`)

A `DataTable` preset for every queue (nurse, doctor, lab, imaging, pharmacy, cashier, ward). Columns: wait time (longest first, turns `warning` after a threshold), patient (name + hospital number), triage pill, reason/what's needed, status pill, action ("Start", "Open"). Sorted: Emergency → Urgent → Semi-urgent → Routine, then arrival time (FR-OPD-001).

```ts
interface WaitingListProps<T> {
  items: T[] | undefined; isLoading: boolean; error?: unknown; onRetry?: () => void;
  getPatient: (t: T) => { name: string; hospitalNumber: string; age?: string; sex?: string };
  getPriority?: (t: T) => TriagePriorityCode | "PENDING";
  getArrivedAt: (t: T) => string;
  getWhat: (t: T) => string;          // "Vitals", "Full blood count", "3 medicines"
  getStatus: (t: T) => { label: string; tone: PillTone; icon: LucideIcon };
  primaryActionLabel: string;         // "Start triage", "Collect sample", "Dispense"
  onOpen: (t: T) => void;
  empty: EmptyStateProps;             // usually the "All done" variant
  refetchIntervalMs?: number;         // queues refresh every 30s
}
```

## 4. Patient context

| Component | Path | Status | Notes |
|---|---|---|---|
| `PatientBanner` | `components/clinical/patient-banner.tsx` | Evolve from `folder/folder-header.tsx` | Sticky white card: name, age · sex, hospital number, NHIS pill, triage pill, allergy pill, visit number. Identical everywhere. Takes a patient id / encounter id and loads its own data |
| `PatientSearchPanel` | `components/patient-search/patient-search-panel.tsx` | Evolve | The one patient search: hospital number, NHIS number, name, phone. Results as patient cards (`.patient-result-card`). Used by records, nurse, lab, pharmacy |
| `CriticalAlert` | `components/clinical/critical-alert.tsx` | Build | Pinned error card at top of the patient page; `{ title; body; acknowledgeLabel; onAcknowledge }`; cannot be dismissed without the action |
| Patient folder tabs | `components/clinical/folder/*` | Evolve | Visits, Vitals, Notes (consultations), Tests (lab/imaging orders), Medicines (rx), Treatments, Admissions, Referrals, Bills, Alerts. Tabs shown depend on `folderSliceFor(role)` |

## 5. States and feedback (see 04 for when)

| Component | Path | Status | Contract |
|---|---|---|---|
| `EmptyState` | `components/common/empty-state.tsx` | Build (wrap `components/ui/empty.tsx`) | `{ illustration: IllustrationName; title; description; action?: {label; onClick \| href}; secondaryAction?; tone?: "default" \| "good-news" }` |
| `ErrorState` | `components/common/error-state.tsx` | Build | `{ error: unknown; onRetry?: () => void; title? }` — message from `getFriendlyError(error)` |
| `QueryState` | `components/common/query-state.tsx` | Build | Wraps a query: `{ query; skeleton: ReactNode; empty: EmptyStateProps; isEmpty?(data) ; children(data) }` — guarantees all four states |
| Skeletons | `components/common/skeletons.tsx` | Build | `TableSkeleton rows`, `CardSkeleton`, `FormSkeleton fields`, `BannerSkeleton` — from `components/ui/skeleton.tsx` |
| `InlineNotice` | `components/common/inline-notice.tsx` | Build | `{ tone: "info" \| "warning" \| "pending" \| "error" \| "success"; title?; children; action? }` — soft banner inside a card |
| `SuccessPanel` | `components/common/success-panel.tsx` | Build | Milestone confirmation with next actions: `{ title; description; actions: {label; onClick; variant}[] }` |
| `ConfirmDialog` | `components/common/confirm-dialog.tsx` | Evolve | Require specific `title` and `confirmLabel` (no default "Confirm"); default `cancelLabel` → "Go back" |
| `SaveIndicator` | `components/common/save-indicator.tsx` | Exists | "Saved" / "Saving…" / "Not saved yet" on long forms |
| `OfflineBanner` | `components/common/offline-banner.tsx` | Exists | Only when offline |
| Toasts | `sonner` via `components/ui/sonner.tsx` | Exists | Use `notify.success/error/info` helpers from `lib/notify.ts` (Build) so wording and durations are consistent |
| Illustrations | `components/common/illustrations/` | Build | `no-results`, `all-done`, `empty-list`, `choose-patient`, `error`, `offline`, `no-access`, `upload` — greyscale SVG |

## 6. Inputs

| Component | Path | Status | Notes |
|---|---|---|---|
| Form primitives | `components/ui/form.tsx`, `field.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx` | Exists | Restyle only via tokens. Checked = `data-[state=checked]` + `--primary` fill |
| `ChoiceOption` | `components/ui/choice-option.tsx` | Exists | Wrap every labeled radio/checkbox tile. Uses `.choice-option` so selected is obvious |
| `DatePickerField` | `components/ui/date-picker-field.tsx` | Exists | All dates. Display `DD/MM/YYYY` via `lib/dates.ts` |
| `UnitInput` | `components/common/unit-input.tsx` | Build | Input with suffix unit ("°C", "mmHg", "kg", "%") + optional out-of-range warning under it |
| `MoneyInput` | `components/common/money-input.tsx` | Build | "GH₵" prefix, 2 decimals, tabular |
| `PhoneInput` | `components/common/phone-input.tsx` | Build | Ghana format, example placeholder |
| `UploadDropzone` | `components/common/upload-dropzone.tsx` | Build | 02 §9; `{ accept; maxSizeMb; onFile; helperText; state }` |
| `ClassificationPicker` | `components/clinical/classification-picker.tsx` | Evolve | Diagnosis search — shows the diagnosis name first, code as small grey text |
| `Combobox` / `Command` | `components/ui/combobox.tsx`, `command.tsx` | Exists | Searchable pickers (drugs, tests, staff) |

## 7. Rules for new components

1. Props use domain words (`patientName`, `hospitalNumber`), not backend names (`patientPublicId` → expose as `hospitalNumber`).
2. No component renders a raw enum, ID or server message.
3. Every list/queue component takes an `empty` prop — the caller must write the empty copy.
4. No hardcoded colors; tone props map to tokens.
5. Keyboard and screen-reader support is part of the component, not the page.
6. Put a short JSDoc on each exported component saying when to use it.
