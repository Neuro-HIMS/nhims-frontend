# Build plan

Build in phases. Within a phase, slices on different lines can be built in parallel. Every slice must meet `08-definition-of-done.md`. Tick slices off here as they merge.

---

## Phase 0 — Foundation (`FND`) — do first, everything depends on it

| ID | Slice | Delivers | Files |
|---|---|---|---|
| FND-01 | Shared helpers | `lib/status-labels.ts` (all label maps + `ROLE_LABELS`), `lib/api-errors.ts` (`getFriendlyError`, replaces 3 ad-hoc helpers), `lib/notify.ts` | lib/ |
| FND-02 | Pills | `StatusPill`, `TriagePill`, `NhisPill`, `AllergyPill`, `LabResultValue`; add `.result-low` / `.result-high` utilities | components/common, components/clinical, globals.css |
| FND-03 | States | `EmptyState`, `ErrorState`, `QueryState`, skeleton presets, greyscale illustrations | components/common |
| FND-04 | Table | `DataTable`, `TableToolbar`, `TablePagination`, tablet card mode | components/common/data-table |
| FND-05 | Layout blocks | `PageCard` (evolve `PageHeader`), `SectionCard`, `FormSection`, `StatCard`, `StepIndicator`, `InlineNotice`, `SuccessPanel`; `ConfirmDialog` requires explicit labels | components/layouts, components/common |
| FND-06 | Patient context | `PatientBanner` (from `folder-header`), `CriticalAlert` | components/clinical |
| FND-07 | Waiting list | `WaitingList` + `sortByUrgencyThenArrival` (unit tested) | components/clinical, lib |
| FND-08 | Shell polish + token debt | `AppHeader` greeting/role pill/facility switcher; remove deprecated `dashboard-*` classes when unused; rename `*_NAV` labels per `05-ui-copy` §3 | components/layouts, globals.css |
| FND-09 | Inputs | `UnitInput`, `MoneyInput`, `PhoneInput`, `UploadDropzone`; `lib/vitals-ranges.ts` | components/common, lib |
| FND-10 | Permissions | Named capability helpers in `lib/permissions.ts` (07 §4); doctor landing → OPD | lib |

## Phase 1 — Getting in (`ALL`)

ALL-01 Sign in · ALL-02 Forced password change · ALL-07 Session expiry · ALL-09 Not found / no access · ALL-06 Header (without feed) · ALL-04 Profile · ALL-05 Security · ALL-03 Forgot password · ALL-08 Feedback

## Phase 2 — The core outpatient visit (journey J01, J03)

| Line | Slices |
|---|---|
| Records | REC-01 → REC-02 → REC-03 → REC-04 → REC-05 → REC-06 → REC-07 |
| Appointments | REC-08 → REC-09 → REC-10 → REC-11 |
| Nurse | NUR-01 → NUR-02 → NUR-03 → NUR-04 → NUR-05 → NUR-06 |
| Doctor | DOC-01 → DOC-02 → DOC-03 → DOC-04 → DOC-13 |

✅ Milestone: a patient can be registered, triaged, seen and finished; J01 steps 1–6 and J03 pass.

## Phase 3 — Tests and medicines (J01 full, J04, J05, J06)

| Line | Slices |
|---|---|
| Lab | LAB-08 → LAB-01 → LAB-02 → LAB-03 → LAB-05 → LAB-04 → LAB-06 → LAB-07 |
| Doctor orders | DOC-05 → DOC-06 → DOC-07 → DOC-08 → DOC-14 |
| Imaging | RAD-01 → RAD-02 → RAD-03 → RAD-04 |
| Pharmacy | PHA-09 → PHA-07 → PHA-06 → PHA-01 → PHA-02 → PHA-03 → PHA-04 → PHA-05 → PHA-08 → PHA-10 → PHA-11 |

✅ Milestone: J01 complete end to end; J04, J05, J06 pass.

## Phase 4 — Money (J02, J09)

| Line | Slices |
|---|---|
| Cashier | BIL-01 → BIL-02 → BIL-03 → BIL-05 → BIL-04 → BIL-06 → BIL-07 |
| Finance | FIN-02 → FIN-01 → FIN-04 → FIN-05 → FIN-06 → FIN-07 → FIN-08 → FIN-09 → FIN-03 |

✅ Milestone: J02 and J09 pass.

## Phase 5 — Wards, maternity, emergency, referrals (J07, J08, J11, J13)

| Line | Slices |
|---|---|
| Wards | NUR-07 → DOC-10 → NUR-08 → NUR-09 → DOC-11 → DOC-12 → NUR-10 |
| Maternity | MID-01 → MID-02 → MID-03 → MID-04 → MID-05 → MID-06 → MID-07 |
| Emergency | NUR-11 |
| Referrals | DOC-09 |

## Phase 6 — Admin and reporting (J10, J12)

| Line | Slices |
|---|---|
| Admin | ADM-02 → ADM-03 → ADM-04 → ADM-05 → ADM-06 → ADM-07 → ADM-01 → ADM-08 → ADM-09 → ADM-10 → ADM-11 → ADM-12 |
| Reports | HIO-01 → HIO-02 → HIO-04 → HIO-05 → HIO-06 → HIO-03 |
| Super admin | SUP-03 *(SUP-01 "switch facility" and SUP-02 "facilities list" retired — single-facility migration, Stage 0)* |

## Phase 7 — Later / needs backend

LAB-09 Blood bank · HIO-07 Surveillance · MID-07 Postnatal · specialist clinics (Dental, Mental health, Physiotherapy, Theatre) on the `WaitingList → patient → record → next step` pattern · SMS receipts/reminders · notifications feed.

---

## Backend needs found while mapping flows

Build UI against typed stubs (`// TODO(backend)`) and raise these with the backend team:

| Slice | Need |
|---|---|
| Stage 0 | `GET`/`PUT /facility` singleton endpoint (no id in the path); stop requiring `facilityId` in user create |
| ALL-06 | Notifications feed for the header bell |
| ALL-04, ALL-08 | Profile edit; feedback submission |
| REC-05 | Single "start walk-in visit" call (today: book + check in) |
| DOC-04 | Save diagnoses on a visit (confirm endpoint) |
| DOC-07 | Allergy / interaction check response on prescribe |
| NUR-10 | Bed cleaning state; discharge confirmation by nurse |
| NUR-11 | Quick emergency registration; payment exemption for emergency orders |
| MID-05, MID-06, MID-07 | ANC schedule rules; baby registration linked to mother; postnatal visits |
| RAD-03 | Image/PDF attachment upload |
| PHA-02, PHA-04 | Query prescription with doctor; partial-dispense reason |
| BIL-05, BIL-07 | Part-payment allocation rule; SMS receipt; payment reversal |
| FIN-07 | Batch send to NHIA and response intake |
| HIO-01, HIO-03, HIO-04 | Report status + submission log; flag notes; direct DHIMS2 send |
| ADM-01 | Facility summary endpoint |
| SUP-01…03 | Facility list/switch; facility create; system-wide lists |
| J07 | Ward transfer |
| J11 | Merge duplicate patients |
