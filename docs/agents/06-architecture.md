# 06 — Frontend architecture

Stack: Next.js 16 (App Router, `proxy.ts` for request interception), React 19, TypeScript, Tailwind v4 (tokens in `app/globals.css`), shadcn/Radix primitives in `components/ui`, TanStack Query 5, Zustand, react-hook-form + zod, axios (`services/api-client.ts`), sonner toasts, lucide icons, date-fns, recharts.

> Read `node_modules/next/dist/docs/` before using any Next API you're unsure about — this Next version differs from older training data.

---

## 1. Folder layout and ownership

```
app/
  (auth)/login, change-password          ← unauthenticated pages
  (workspace)/layout.tsx                  ← server: session check, mustChangePassword redirect, DashboardShell
  (workspace)/<module>/page.tsx           ← server: requireModuleAccess("<module>") → <XWorkspace/>
components/
  ui/                                     ← primitives (shadcn). Restyle via tokens only.
  common/                                 ← app-wide building blocks (states, pills, tables, dialogs)
  layouts/                                ← shell + ModuleSubNav + PageCard
  clinical/                               ← patient-wide: folder tabs, PatientBanner, WaitingList, pills, CriticalAlert
  <module>/
    <module>-workspace.tsx                ← "use client"; reads ?view=, renders PageCard + ModuleSubNav + view
    views/<view-name>-view.tsx            ← one file per ?view=
    lib/<module>-labels.ts | -utils.ts    ← module-only helpers and nav constant
config/navigation.ts                      ← menu items, groups, allowed roles
lib/                                      ← access-control, permissions, query-keys, dates, api-errors, status-labels, notify
services/<area>.service.ts                ← HTTP only; returns typed data (unwraps ApiResponse)
schemas/<area>.schema.ts                  ← zod schemas for forms
store/                                    ← zustand (auth, ui, offline, notifications) — UI state only
types/<area>.types.ts                     ← backend DTOs and enums
```

## 2. Page → workspace → view

```tsx
// app/(workspace)/nurse/page.tsx  (server component)
import { requireModuleAccess } from "@/lib/auth-guards";
import { NurseWorkspace } from "@/components/nurse/nurse-workspace";

export default async function NursePage() {
  await requireModuleAccess("nurse");
  return <NurseWorkspace />;
}
```

```tsx
// components/nurse/nurse-workspace.tsx
"use client";
export function NurseWorkspace() {
  const view = useSearchParams().get("view") ?? "visits";
  return (
    <div className="space-y-6">
      <PageCard title="Nurse station" description="See today's patients, triage them and record vitals." />
      <ModuleSubNav items={NURSE_NAV} basePath="/nurse" />
      {view === "visits" && <VisitsQueueView />}
      {view === "triage" && <TriageView />}
      …
    </div>
  );
}
```

- Views get their context from the URL: `?view=triage&encounterId=…` / `?patientId=…`. This makes every step linkable, refresh-safe and lets one role hand a link to another.
- Unknown `view` → fall back to the default view (never a blank page).
- Placeholder modules use `ClinicalServiceModuleWorkspace` but must show the "This section isn't ready yet" empty state — no module keys or service IDs on screen.

## 3. Services (HTTP)

- One object per backend area, e.g. `clinicalService.recordVitals(encounterId, payload)`.
- Every method: `apiClient.<verb><ApiResponse<T>>(path, …)` then `return res.data.data`.
- Base URL `/api/v1` (same origin via rewrite). CSRF and token refresh are handled in `api-client.ts` — don't reimplement.
- Downloads/exports: pass `timeout: EXPORT_REQUEST_TIMEOUT_MS`, `responseType: "blob"`; trigger download with a helper, show "Preparing download…".
- **No new endpoints without backend agreement.** If you need one, add a typed stub marked `// TODO(backend): <METHOD> <path> — <why>` and list it in your summary.

Existing service surface (use these; see files for payload types):

| Service | Methods |
|---|---|
| `authService` | login, logout, getCurrentUser, reissueSession, changePassword, forgotPassword, resetPasswordWithToken, begin/completeTotpEnrollment, disableTotp |
| `patientsService` | search, getById, register, update, peekNextReference, verifyNhis |
| `appointmentsService` | search, today, byPatient, get, book, reschedule, checkIn, start, complete, noShow, cancel, clinicians |
| `clinicalService` | encounters (today, search, byPatient, byId, transition, assignClinician, cancel, complete, blockers, encounterBill), vitals, triage, consultation notes, conditions (diagnosis list), lab (placeLabOrder, labWorklist, getLabOrder, updateLabOrderStatus, submitLabResults, labCriticalAlertsInbox, acknowledgeLabCriticalAlert, label PDF, catalog), radiology (place, worklist, status, report), prescriptions (place, pharmacyWorklist, status, dispense, label PDF), admissions (admit, activeAdmissions, discharge), referrals (place, inbox, decide, letter PDF), alerts, treatments, getFolder |
| `ipdService` | board, nursingOverview, list/add MAR, list/add TPR |
| `ancService` | dashboard, listPregnancies, createPregnancy, listVisits, addVisit, recordDelivery |
| `pharmacyInventoryService` | suppliers CRUD, inventory items CRUD, stockOverview, listLots, listMovements, receiveStock, adjustLot, export/import CSV |
| `billingService` | dashboard, listBills, billsForPatient, getInvoice, createBill, addCharges, removeCharge, applyDiscount, invoiceBill, cancelBill, recordPayment, listPayments, paymentMethods, chargeKinds |
| `financeService` | dashboard, services/prices, pricing matrix, revenueSummary, NHIS claims (list, create, update, patchClaimStatus), reports |
| `reportsService` | listDefinitions, runDhims2, runMonthly, downloadDhims2Csv, downloadMonthlyCsv |
| `usersService` | list, getById, create, updateStatus, updateAccess, resetPassword, accessReview |
| `facilityService` | get, update |
| `auditApiService` | listEvents |

## 4. Server state (TanStack Query)

- Keys only from `lib/query-keys.ts`. Add new keys there, hierarchically.
- Defaults (`lib/query-client.ts`): `staleTime 30s`, `retry 1`, refetch on focus/reconnect. **Waiting lists** add `refetchInterval: 30_000` and `placeholderData: keepPreviousData`.
- Mutations: `useMutation` in a small hook next to the view (`views/use-record-vitals.ts`) or in `hooks/<area>/`. On success:
  1. invalidate the thing you changed,
  2. invalidate **the next role's list** (hand-off),
  3. show the success message (05 §4),
  4. move the user to the next logical place.
- Show server field errors under fields via `getFriendlyError(error).fieldErrors` → `form.setError`.

### Hand-off invalidation map

| After… | Invalidate |
|---|---|
| Patient registered / visit started | `clinical.today`, `opd.queue` |
| Appointment checked in | `appointments…`, `clinical.today` |
| Triage / vitals saved | `clinical.vitals(id)`, `clinical.today`, `opd.queue` |
| Consultation note saved | `clinical.consultations(id)`, `clinical.folder(id)` |
| Lab / imaging ordered | `clinical.labOrders(id)` / `radiologyOrders(id)`, `clinical.labWorklist` / `radiologyWorklist`, billing lists |
| Lab result submitted | `clinical.labOrder(id)`, `clinical.labWorklist`, `clinical.labCriticalInbox`, `clinical.folder(encounterId)` |
| Prescription placed | `clinical.prescriptions(id)`, `clinical.pharmacyQueue`, billing lists |
| Dispensed | `clinical.pharmacyQueue`, `clinical.prescription(id)`, `pharmacyInventory.all` |
| Payment recorded | billing lists, `clinical.labWorklist`, `clinical.pharmacyQueue` (paid items become ready) |
| Admitted / discharged | `ipd.wards`, `clinical.admissions(id)`, `clinical.today` |
| Staff access changed | `admin.users`, `admin.user(id)` |

## 5. Forms

- Schema in `schemas/<area>.schema.ts` (zod). Messages in plain words: `z.string().min(10, "Enter a phone number with 10 digits")`.
- `react-hook-form` + `zodResolver`; fields via `components/ui/form.tsx`.
- Submit button disabled while submitting; never reset fields on error.
- Long forms: `SaveIndicator` + draft in `sessionStorage` (wrapped in try/catch), cleared on success.
- Dirty-form navigation guard (04 §5).

## 6. Client state

Zustand only for UI/session state: `auth.store` (current user), `ui.store` (sidebar collapsed etc.), `offline.store` (online flag, queued count), `notification.store` (bell count). Never mirror server data in Zustand.

## 7. Errors, toasts, labels (shared libs to build — `FND` slices)

| File | Exports |
|---|---|
| `lib/api-errors.ts` | `getFriendlyError(error, context?)` (04 §3) |
| `lib/notify.ts` | `notify.success(msg)`, `notify.error(errorOrMsg)` (sticky), `notify.info(msg)` |
| `lib/status-labels.ts` | `ROLE_LABELS`, `ENCOUNTER_STATUS`, `APPOINTMENT_STATUS`, `LAB_STATUS`, … (05 §5) |
| `lib/dates.ts` (exists) | `formatClinicalDate`, `formatClinicalDateTime`, `formatTime`, `formatRelative`, `formatAge` — always use these |

## 8. Printing and PDFs

Labels, receipts, referral letters and discharge summaries open via the service PDF helpers (`openLabSpecimenLabelPdf`, `openPharmacyDispenseLabelPdf`, `openReferralLetterPdf`) or a print-styled route. Buttons say what prints: "Print specimen label", "Print receipt".

## 9. Testing

- Every slice lists acceptance criteria — verify each manually in the running app with a user of that role.
- Add unit tests for pure helpers (`status-labels`, `api-errors`, sorting of waiting lists, dose/vitals range checks).
- If Playwright is added, one spec per journey in `e2e/<journey-id>.spec.ts`, logging in as each role in turn.
