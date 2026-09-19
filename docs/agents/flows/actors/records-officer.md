# Records officer (`REC`)

**Who** — front-desk / medical records staff. Registers patients, checks NHIS, starts visits, books and manages appointments. **No clinical notes, no billing.**
**Lands on** — `/records?view=search`
**Sections** — Find or register a patient (`records`), Appointments (`appointments`), OPD waiting list (read-only), Reports (own reports).
**Folder view** — `RECORDS` slice (demographics + visit list only).

```
Patient arrives ─► REC-01 Find patient ─┬─ found ──► REC-05 Start today's visit ─► (Nurse: NUR-01)
                                         └─ not found ─► REC-02 Register ─► REC-03 NHIS check ─► REC-04 Registered ─► REC-05
Phone call / follow-up ─► REC-08 Book appointment ─► REC-09 Today's appointments (check in) ─► (Nurse: NUR-01)
```

---

### REC-01 · Find a patient
**Goal** — I find an existing patient in seconds, by whatever the patient gives me.
**Requirements** — FR-REG-005.
**Where** — `/records?view=search` (also from the header search `?q=`).
**Existing code** — `components/records/views/client-lookup-view.tsx`, `patient-result-card.tsx`, `hospital-patient-card.tsx`, `components/patient-search/patient-search-panel.tsx` (Evolve into the single `PatientSearchPanel`).
**Screen** — Page card "Find or register a patient" — "Find a patient or register someone new." Action: black "Register new patient". Big search card: one input "Hospital number, NHIS number, name or phone" with segmented "Search by" (Anything · Hospital number · NHIS number · Name). Results: patient cards (name bold, age · sex, hospital number, phone, NHIS pill, last visit date) with actions "Start today's visit" (primary on the card), "View details".
**Data** — `patientsService.search({mode, q | firstName,lastName})`, key `queryKeys.patients.search(params)`. Debounce 300ms, min 2 chars.
**Rules** — Detect input type automatically in "Anything" mode (digits with hospital-number pattern → id; NHIS pattern → nhis; else name).
**States** — Before search: tip "Ask the patient for their hospital card or NHIS card — it's the fastest way to find them." No results: "No patient found for "{q}". Check the spelling or try their phone or NHIS number." + black "Register new patient" (pre-fills the name). Error: ErrorState.
**Hand-off** — "Start today's visit" → REC-05 with `patientId`.
**Done when** — search by each of the 4 kinds works; Enter searches; results keyboard navigable; no internal IDs shown.
**Depends on** — FND-01…05.

### REC-02 · Register a new patient (with duplicate check)
**Goal** — I register a new patient once, without creating duplicates.
**Requirements** — FR-REG-001, 003, 004, 007, 008.
**Where** — `/records?view=register`
**Existing code** — `components/records/views/registration-view.tsx`, `components/records/shared/*` (Evolve to stepped form).
**Screen** — `StepIndicator`: **Personal details → Contact and next of kin → NHIS → Health details → Check and save**.
1. Personal: first name, other names, last name, sex (radio), date of birth (date picker) *or* "Don't know exact date" → age in years, occupation (select).
2. Contact: phone (`PhoneInput`), GPS/digital address, town, next of kin name, relationship, phone.
3. NHIS: "Does the patient have NHIS?" Yes/No; if yes → REC-03 inline.
4. Health: known allergies (chips: drug / food / other, or "No known allergies" checkbox — one must be chosen), blood group (optional).
5. Check and save: read-only summary in `FormSection`s with "Edit" links; consent checkbox "The patient agreed to have their details recorded."
**Duplicate check** — after step 1 (on "Continue"), search name + DOB + phone. If matches: `InlineNotice tone="warning"` "This patient may already be registered" with match cards → "Use this patient" (→ REC-05) or "No, this is a new patient".
**Data** — `patientsService.peekNextReference` (show "Hospital number will be KBTH-…"), `patientsService.search`, `patientsService.register`. Schema `schemas/patient.schema.ts` (Build).
**States** — `SaveIndicator` + session draft. Field errors inline. Save error keeps all steps' data.
**Hand-off** — REC-04.
**Done when** — can't save without sex, name, DOB/age, allergy answer, consent; duplicate warning appears for a matching record; draft survives a refresh.
**Depends on** — REC-01, FND-09.

### REC-03 · Check NHIS membership
**Goal** — I know straight away whether NHIS will cover this patient.
**Requirements** — FR-NHI-001, 002; FR-REG-002.
**Where** — inside REC-02 step 3, REC-06 edit, and REC-05 (re-check at each visit).
**Existing code** — part of `registration-view.tsx` (Evolve into `components/records/nhis-check.tsx`).
**Screen** — NHIS number input + secondary button "Check NHIS". Result card:
- `VERIFIED` → success pill "NHIS active" + member name + scheme + "Valid until 31/12/2026".
- `NOT_FOUND` / expired → error pill "NHIS expired" or "NHIS number not found" + "The patient may need to pay for this visit." + option "Continue as self-pay".
- `PENDING_GATEWAY` → pending pill "NHIS not confirmed yet" + "We couldn't reach NHIS right now. You can continue — confirm before billing."
- `INVALID_FORMAT` → field error "Check the NHIS number — it should look like 12345678."
**Data** — `patientsService.verifyNhis`.
**Done when** — all four outcomes render with words + pill; the visit can always continue; name mismatch with member name shows a warning.

### REC-04 · Patient registered
**Goal** — I see it worked and do the next thing in one click.
**Screen** — `SuccessPanel`: "Ama Mensah is registered." "Hospital number KBTH-12345678-26." Actions: black "Start today's visit", secondary "Print patient card", tertiary "Book an appointment", "Register another patient".
**Data** — invalidate `patients.all`.
**Depends on** — REC-02.

### REC-05 · Start today's visit (walk-in)
**Goal** — I send an arrived patient to the nurse.
**Requirements** — FR-REG-010, 011; FR-OPD-015.
**Where** — dialog from REC-01/REC-04, or `/records?view=manage&patientId=…`.
**Existing code** — `components/booking/booking-form-dialog.tsx`, `booking-form.tsx` (Evolve).
**Screen** — Dialog "Start today's visit for Ama Mensah": Where to (OPD / ANC / Lab only / Imaging only / Emergency), Reason (short text), Doctor (optional "Any available doctor"), How they'll pay (NHIS — shows NHIS pill, re-check button / Self-pay / Company), Priority (Routine / Urgent / Emergency — Emergency shows note "Take the patient to Emergency now; you can finish details later"). Black "Send to nurse".
**Data** — `appointmentsService.book({ scheduledFor: now, … })` then `appointmentsService.checkIn(id)` (creates/advances the visit). Invalidate `clinical.today`, `opd.queue`, appointments today. **Backend to confirm**: a single "walk-in visit" call would be cleaner.
**Hand-off** — Patient appears in **Nurse → Today's patients** (NUR-01) as "Waiting for vitals"; ANC visits go to Midwife (MID-01).
**States** — Success toast "Visit started. Ama Mensah is now waiting for the nurse. Visit number V-20260918-0183."
**Done when** — the nurse sees the patient within 30s without refreshing; NHIS status at visit time is stored.
**Depends on** — REC-01, REC-03.

### REC-06 · Patient details (view and edit)
**Goal** — I correct a patient's details without losing the old ones.
**Requirements** — FR-REG-009, FR-REG-007.
**Where** — `/records?view=manage&patientId=…`
**Existing code** — `patient-records-management-view.tsx` (Evolve).
**Screen** — `PatientBanner`; cards: Personal, Contact and next of kin, NHIS (with REC-03), Allergies, Blood group. Each card has "Edit" (secondary) → inline edit with "Save changes" / "Cancel". "Change history" link (activity filtered to this patient — ADM-12).
**Data** — `patientsService.getById`, `patientsService.update`; key `patients.detail(id)`.
**Rules** — Records officer edits demographics; allergies editable by records and clinical roles.
**Done when** — edits show a success toast and the banner updates; allergy changes appear in every clinical view.

### REC-07 · Visit history
**Where** — `/records?view=visits&patientId=…` · **Existing** — `visit-history-view.tsx` (Evolve).
**Screen** — Patient picker if none; table: date, visit number, where (OPD/ANC…), doctor, stage pill (visit status label), payment (NHIS/self-pay). No clinical details for records officers.
**Data** — `clinicalService.byPatient(patientId)`.
**Empty** — "No visits yet for Ama Mensah."

### REC-08 · Book an appointment
**Goal** — I book a patient into a clinic slot.
**Requirements** — FR-APT-001, 002, 005.
**Where** — `/appointments?view=book`
**Existing code** — `components/appointments/appointments-workspace.tsx`, `components/booking/*` (Evolve).
**Screen** — Two columns: left = patient (search via `PatientSearchPanel` → mini patient card), right = form card: clinic/visit type, doctor (from `appointmentsService.clinicians`, optional), date (date picker), time slot chips (free / taken — words not only color), duration, reason, how they'll pay. Black "Book appointment".
**Data** — `appointmentsService.book`.
**States** — Slot taken error: "That time was just taken. Choose another time." Success panel: "Appointment booked for Tue 22 Sep at 09:30 with Dr Owusu." Actions: "Book another", "Print appointment slip".
**Depends on** — REC-01.

### REC-09 · Today's appointments
**Goal** — I check in patients who arrive and deal with no-shows.
**Requirements** — FR-APT-004.
**Where** — `/appointments?view=queue` (tab label "Today").
**Existing code** — `components/appointments/views/queue-view.tsx` (Evolve to `DataTable`).
**Screen** — Stat row: Booked · Arrived · Being seen · Done · Didn't come. Table: time, patient, clinic, doctor, status pill (`APPOINTMENT_STATUS`), actions: "Check in" (primary per row until arrived), menu: Reschedule, Mark as didn't come, Cancel.
**Data** — `appointmentsService.today`, `checkIn`, `noShow`, `cancel`, `reschedule`. Refetch 30s.
**Rules** — "Didn't come" only after the slot time; cancel/no-show via `ConfirmDialog` (cancel needs a reason).
**Hand-off** — Check in → patient to Nurse (NUR-01).
**Empty** — "No appointments today." + "Book an appointment".
**Done when** — check-in updates the pill immediately and the nurse sees the patient.

### REC-10 · Appointment calendar
**Where** — `/appointments?view=calendar` · **Existing** — `calendar-view.tsx` (Evolve).
**Screen** — Week view by default, day/month toggle, filter by clinic/doctor; each booking a small card with time + name + status pill. Click → details popover with the same actions as REC-09.

### REC-11 · Past appointments
**Where** — `/appointments?view=history` · **Existing** — `history-view.tsx` (Evolve).
**Screen** — Table with date range + status + clinic filters; export "Download as spreadsheet".
