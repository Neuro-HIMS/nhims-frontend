# Facility administrator (`ADM`)

**Who** — senior staff responsible for NHIMS in one facility. Staff accounts and access, facility settings, activity history, facility dashboard. Can open every section in their facility.
**Lands on** — `/dashboard`
**Sections** — everything; Admin group is theirs.

```
New staff ─► ADM-03 Add staff ─► ADM-04 Job and access ─► temporary password ─► (ALL-01/02 new staff signs in)
Leaver ─► ADM-05 Deactivate · Forgotten password ─► ADM-06 Reset
Setup ─► ADM-08 Facility details ─► ADM-09 Services on/off ─► ADM-10 Hours and booking rules ─► ADM-11 Diagnosis list
Oversight ─► ADM-01 Home ─► ADM-12 Activity history
```

---

### ADM-01 · Home (facility dashboard)
**Requirements** — FR-ADM-006.
**Where** — `/dashboard` (tabs Overview · Key numbers · Alerts)
**Existing code** — `components/dashboard/dashboard-workspace.tsx` (Evolve).
**Screen** — Page card "Home" — "Your facility at a glance." Stat cards (each links to its section): Patients waiting now · Beds used (18 of 24) · Tests waiting · Low stock items · NHIS claims needing action · Collected today. Alerts card: critical results not yet seen by a doctor, medicines out of stock, staff who must change password. Key numbers tab: charts (visits per day, top diagnoses) following dataviz rules.
**Data** — composed from `clinical.today`, `ipd.board`, `labWorklist`, `stockOverview`, `financeService.dashboard`; **backend to confirm** a single summary endpoint.

### ADM-02 · Staff
**Requirements** — FR-ADM-002.
**Where** — `/users?view=staff` (tab "Staff")
**Existing code** — `components/users/users-management-workspace.tsx`, `staff-accounts-view.tsx` (Evolve).
**Screen** — Page card "Staff and access" — "Staff accounts and what each person can open." Primary "Add staff member". Table: name, username, job (`ROLE_LABELS`), sections count ("6 sections"), status pill (Active / Inactive / Must change password), last sign-in, actions menu: Change access, Reset password, Deactivate/Reactivate.
**Data** — `usersService.list`, key `admin.users`.

### ADM-03 · Add a staff member
**Where** — `/users?view=new` or sheet · **Existing** — `user-management-create-view.tsx` (Evolve).
**Screen** — Name, username (suggested), email, phone, job (select of role labels) → "Sections they can open" pre-ticked with the usual set for that job (checkbox groups mirroring the sidebar groups) + "Give the usual access for this job" button to reset. Primary "Create account". Success panel shows the **temporary password** in a copy box: "Temporary password — share it with Ama privately. She'll choose her own when she first signs in." + "Copy".
**Data** — `usersService.create`. Convert with `toBackendModuleKey`.

### ADM-04 · Job and access
**Requirements** — FR-ADM-003.
**Where** — `/users/role-assignment/[userId]`
**Existing code** — `components/users/role-assignment-view.tsx`, `role-assignment-page.tsx`, `users-management-constants.ts` (Evolve; remove "module" wording).
**Screen** — Banner with the person; Job select; checkbox groups by sidebar group (Patients, Care, Tests and medicines, Money, Reports, Admin) with each section's plain label and one-line description; sections switched off at the facility shown disabled with "Switched off for this facility". Primary "Save access". Changing job asks "Also change their sections to the usual set for a Nurse?" [Keep current sections] [Use usual sections].
**Data** — `usersService.updateAccess`; invalidate `admin.users`, `admin.user(id)`.

### ADM-05 · Deactivate / reactivate
**Screen** — `ConfirmDialog` "Deactivate Kofi Asante's account? He won't be able to sign in. His past work stays in the records." [Keep account] [Yes, deactivate].
**Data** — `usersService.updateStatus`.

### ADM-06 · Reset password
**Screen** — `ConfirmDialog` then copy box with temporary password (as ADM-03). Person gets `mustChangePassword`.
**Data** — `usersService.resetPassword`.

### ADM-07 · Check who can open what
**Where** — `/users?view=access` · **Existing** — `access-review-view.tsx` (Evolve).
**Screen** — Matrix table: staff × sections (✓ / —), filter by job/section; highlights "More access than usual for their job" (warning pill). Download as spreadsheet.
**Data** — `usersService.accessReview`.

### ADM-08 · Facility details
**Requirements** — FR-ADM-004.
**Where** — `/facility?view=profile` (tab "Facility details")
**Existing code** — `components/facility/facility-settings-workspace.tsx` (1,084 lines — split into `components/facility/views/*`).
**Screen** — Cards: Identity (name, facility code, level, ownership), Logo (`UploadDropzone` with preview — updates header), Contact (address, phone, email). Each card "Edit" → inline save.
**Data** — `facilityService.get/update`; after logo change `authService.reissueSession` to refresh header.

### ADM-09 · Services on/off
**Where** — `/facility?view=services`
**Screen** — List of services (Emergency, OPD, Wards, ANC, Theatre, Dental, Mental health, Lab, Imaging, Pharmacy, Physiotherapy, Blood bank, Records) with switch + one-line description + capacity (e.g. beds). Turning off: `ConfirmDialog` "Switch off Dental? It will disappear from everyone's menu." Changes apply on next sign-in/reissue — say so.
**Data** — `facilityService.update`; maps via `config/facility-service-modules.ts`.

### ADM-10 · Opening hours and booking rules
**Where** — `/facility?view=config` (tab "Opening hours and booking rules").
**Screen** — Clinic hours per day, appointment length, max bookings per slot, how long before a waiting patient shows as "waiting long". Plain labels only.

### ADM-11 · Diagnosis list
**Where** — `/facility?view=conditions` · **Existing** — `facility-conditions-dictionary.tsx` (Evolve).
**Screen** — Table: diagnosis name, code (grey), group, must-be-reported pill, active. Search. "Add diagnosis". Import/download via `UploadDropzone` + "Download template" (spreadsheet), result summary in words.
**Data** — `conditionsPaged`, `createCondition`, `updateCondition`, `importConditions`, `exportConditions`.

### ADM-12 · Activity history
**Requirements** — FR-ADM-001, 007.
**Where** — `/audit-log` · **Existing** — `components/audit-log/audit-log-workspace.tsx` (Evolve onto `DataTable` with expandable rows).
**Screen** — Page card "Activity history" — "Who did what, and when." Filters: person, kind (Staff actions / Sign-ins and security / Automatic changes), date range, patient. Rows: time, person (name + job), what happened as a sentence ("Changed Ama Mensah's phone number"), patient (if any); expand → before/after in plain labels, device/IP small grey.
**Data** — `auditApiService.listEvents`, key `admin.auditLog`.
