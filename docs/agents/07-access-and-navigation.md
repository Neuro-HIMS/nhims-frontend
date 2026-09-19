# 07 — Access and navigation

**NHIMS runs one facility per server.** Never pass, store or display a facility id — there's exactly one facility per deployment, so nothing needs to name it. `facilityId` fields still exist on some session/DTO shapes for backward compatibility with older backends; they're `@deprecated` and read only by the legacy fallback in `facility.service.ts`, never for access logic.

## 1. How access works (two layers + facility services)

1. **Role** (`user.role`) decides *what you can do inside* a section (e.g. only prescribers can order).
2. **Assigned sections** (`user.assignedModules`) decide *which sections you can open*. If the list is empty, the role's defaults apply.
3. **Facility services (single facility per server)** (`user.enabledHmisModuleKeys`) — if the facility has switched a service off in Facility settings, that section disappears for everyone. There is one facility, so this is a simple on/off switch per service, not a per-tenant setting.

All checks go through:

| Question | Helper |
|---|---|
| Can this user open section X? (menu, links, route guard) | `canAccessWorkspaceModule(user, module)` — `lib/access-control.ts` |
| Server-side page guard | `await requireModuleAccess("<module>")` — `lib/auth-guards.ts` |
| Where does this user land after sign-in? | `getLandingPathForUser(user)` |
| Can they see the full patient folder? | `canViewFullFolder(role)` — `lib/permissions.ts` |
| Can they order tests/medicines? | `canPlaceOrders(role)` |
| Can they record vitals? | `canRecordVitals(role)` |
| Which folder view do they get? | `folderSliceFor(role)` → FULL / LAB / PHARMACY / BILLING / RECORDS |

**Never** write `user.role === "NURSE"` in a component. If you need a new capability, add a named helper to `lib/permissions.ts` (e.g. `canAuthoriseLabResults`, `canDispense`, `canRecordPayments`, `canManageStaff`) and use it. The backend enforces the same rules — the UI hides what the user can't do; it doesn't grant anything.

**Facility identity** comes from `GET /facility` / `PUT /facility` (`services/facility.service.ts`, no id in the path), read through `hooks/use-facility.ts` (`queryKeys.facility.profile`). If the backend only has the legacy `/facilities/{id}` route, the service falls back to it once using the session's `facilityId` and logs a dev-only warning — don't build new code against the legacy path.

Hide, don't disable: if a user can't do something, don't show the button. Exception: show a disabled button with a reason when the action is *temporarily* unavailable ("Take payment first — this test hasn't been paid for").

## 2. Menu (`config/navigation.ts`)

| Group | Item (label) | Route | Module | Roles (defaults) |
|---|---|---|---|---|
| HOME | Home | `/dashboard` | dashboard | Facility admin, Super admin, HIO |
| PATIENTS | Find or register a patient | `/records` | records | Records officer, admins |
| | Appointments | `/appointments` | appointments | Records officer, admins |
| CARE | Emergency | `/emergency` | emergency | Nurse, Doctor, admins |
| | Outpatient clinic (OPD) | `/opd` | opd | Records officer, Nurse, Doctor, admins |
| | Nurse station | `/nurse` | nurse | Nurse, Doctor, admins |
| | Wards | `/wards` | wards | Nurse, Doctor, admins |
| | Antenatal care (ANC) | `/anc` | anc | Midwife, Doctor, admins |
| | Theatre and surgery | `/surgery` | surgery | Nurse, Doctor, admins |
| | Dental · Mental health · Physiotherapy | `/dental` `/mental-health` `/physiotherapy` | … | Doctor (+ Nurse for physio), admins |
| TESTS & MEDICINES | Laboratory | `/laboratory` | laboratory | Lab scientist, Lab tech, Doctor, admins |
| | Imaging (Radiology) | `/radiology` | radiology | Radiographer, Doctor, admins |
| | Pharmacy | `/pharmacy` | pharmacy | Pharmacist, Pharmacy tech, admins |
| | Blood bank | `/blood-bank` | blood-bank | Lab roles, Doctor, admins |
| MONEY | Prices and revenue | `/finance` | finance | Finance officer, Cashier, admins |
| | Bills and payments | `/billing` | billing | Cashier, admins |
| REPORTS | Reports | `/reports` | reports | HIO, admins, Doctor, Finance, Records, Cashier |
| ADMIN | Staff and access | `/users` | users | admins |
| | Facility settings | `/facility` | facility | admins |
| | Activity history | `/audit-log` | audit-log | admins |
| *(bottom)* | Feedback · Log out | — | — | everyone |
| *(user menu)* | My profile · Sign-in and security | `/settings/profile`, `/settings/security` | — | everyone |

The source of truth is `NAV_ITEMS[].allowedRoles`; this table must be kept in step with it.

## 3. Where each role lands and what they see

| Role | Lands on | Menu shows (by default) |
|---|---|---|
| Records officer | `/records?view=search` | Find or register a patient, Appointments, OPD (read-only list), Reports |
| Nurse | `/nurse?view=visits` | Nurse station, OPD, Emergency, Wards, Theatre |
| Doctor | `/opd?view=queue` *(change from nurse default)* | OPD, Nurse station, Emergency, Wards, ANC, Lab, Imaging, specialist clinics, Reports |
| Midwife | `/anc` | Antenatal care |
| Lab scientist / tech | `/laboratory?view=worklist` | Laboratory, Blood bank |
| Radiographer | `/radiology?view=worklist` | Imaging |
| Pharmacist / tech | `/pharmacy?view=queue` | Pharmacy |
| Cashier (billing officer) | `/billing?view=dashboard` | Bills and payments, Prices and revenue, Reports |
| Finance officer | `/finance?view=dashboard` | Prices and revenue, Reports |
| HIO | `/reports` | Home, Reports |
| Facility admin | `/dashboard` | Everything in their facility |
| Super admin | `/dashboard` | Everything |

> Change needed: `DEFAULT_MODULE_BY_ROLE.MEDICAL_OFFICER` is `"nurse"` today; doctors should land on OPD (their queue). Slice `DOC-01`.

## 4. Inside-section permissions (target helpers)

| Capability | Who | Helper |
|---|---|---|
| Register / edit patient demographics | Records officer, admins | `canEditDemographics` *(build)* |
| Start a visit / check in | Records officer, Nurse, admins | `canStartVisit` *(build)* |
| Triage + vitals | Nurse, Midwife, Doctor, admins | `canRecordVitals` |
| Write consultation notes, diagnose | Doctor, Midwife | `canWriteClinicalNotes` *(build)* |
| Order tests / imaging / medicines, admit, refer | Doctor, Midwife, admins | `canPlaceOrders` |
| Enter lab results | Lab scientist, Lab tech | `canEnterLabResults` *(build)* |
| Authorise lab results | Lab scientist | `canAuthoriseLabResults` *(build)* |
| Report imaging | Radiographer | `canReportImaging` *(build)* |
| Dispense | Pharmacist, Pharmacy tech | `canDispense` *(build)* |
| Manage stock, suppliers, formulary | Pharmacist | `canManageStock` *(build)* |
| Create bills, take payments | Cashier, Finance officer | `canRecordPayments` *(build)* |
| Set prices, manage claims | Finance officer, admins | `canManagePrices`, `canManageClaims` *(build)* |
| Run / send DHIMS2 report | HIO, admins | `canSubmitDhims2` *(build)* |
| Manage staff and access | Facility admin, Super admin | `isAdmin` |
| Facility settings | Facility admin, Super admin | `isAdmin` |

## 5. URL conventions

- `/<module>?view=<view>` for tabs.
- Context params: `patientId`, `encounterId` (show as "visit" on screen), `orderId`, `billId`, `admissionId`, `month=YYYY-MM`.
- Cross-role links deep-link into the right view, e.g. the doctor's "View result" → `/opd?view=consult&encounterId=…&tab=tests`.
- The global header search goes to `/records?view=search&q=…` (only for roles with records access). Other roles use the search inside their own section.
