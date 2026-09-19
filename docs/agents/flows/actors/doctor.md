# Doctor / medical officer (`DOC`)

**Who** — clinicians in OPD, emergency, wards and specialist clinics. Consult, diagnose, order tests and medicines, admit, refer, discharge, act on results.
**Lands on** — `/opd?view=queue` *(change `DEFAULT_MODULE_BY_ROLE.MEDICAL_OFFICER` from `nurse` to `opd`)*
**Sections** — OPD, Nurse station, Emergency, Wards, ANC, Laboratory (results), Imaging (results), specialist clinics, Reports.
**Folder view** — `FULL`; `canPlaceOrders` = true.

```
(NUR-04) ─► DOC-01 Patients waiting ─► DOC-02 Open patient ─► DOC-03 Notes ─► DOC-04 Diagnosis
                                         ├─► DOC-05 Lab tests ─► (LAB) ─► DOC-08 Results ─┐
                                         ├─► DOC-06 Imaging ─► (RAD) ─► DOC-08 ───────────┤
                                         ├─► DOC-07 Prescribe ─► (PHA)                     │
                                         └─► DOC-13 Finish visit: send home + follow-up ◄──┘
                                              ├─► DOC-09 Refer ─► (other doctor / facility)
                                              └─► DOC-10 Admit ─► (NUR-07) ─► DOC-11 Ward rounds ─► DOC-12 Discharge
```

The consultation is **one page** (`/opd?view=consult&encounterId=…`) with a patient banner, a left column (summary + history) and a right column of task cards. DOC-02…DOC-13 are cards/panels on that page, built one slice at a time.

---

### DOC-01 · Patients waiting for me
**Goal** — I see who's ready for me, most urgent first, and call the next one.
**Requirements** — FR-OPD-001, FR-OPD-014.
**Where** — `/opd?view=queue` (tab "Patients waiting")
**Existing code** — `components/clinical/opd/opd-consult-queue.tsx`, `opd-workspace.tsx` (Evolve onto `WaitingList`).
**Screen** — Page card "Outpatient clinic (OPD)" — "See patients, record notes and decide next steps." Toggle "My patients / All doctors". Stat row: Waiting · With me · Results back · Finished today. `WaitingList` columns: wait, patient, triage pill, complaint, vitals summary (e.g. "T 38.9 °C · BP 150/95" with warnings), stage pill, action "Call in" (→ transition to `IN_CONSULTATION`, assign me, open DOC-02). A separate small card "Results back" lists patients whose lab/imaging results arrived (DOC-08).
**Data** — `clinicalService.today()` filtered to consultation stage (or `search({status})`), `assignClinician`, `transition`. Keys `opd.queue`, `clinical.today`. Refetch 30s.
**States** — Empty: "No patients waiting for you. New patients will appear here after the nurse has seen them."
**Done when** — landing works for doctors; "Call in" moves the patient to "With doctor" for everyone.
**Depends on** — NUR-04, FND-07.

### DOC-02 · Consultation page and patient summary
**Goal** — when I open a patient I see what matters before I speak to them.
**Requirements** — FR-OPD-013, FR-REG-007, FR-LAB-010.
**Where** — `/opd?view=consult&encounterId=…`
**Existing code** — `components/clinical/folder/*`, `folder-header.tsx` (Evolve into `PatientBanner` + `components/clinical/consultation/` Build).
**Screen** — `PatientBanner` (allergies prominent), `CriticalAlert`s. **Left column** "Summary": today's triage + vitals (with flags), active problems/alerts, current medicines, last 3 visits timeline (date, diagnosis, medicines) with "See full history" → folder tabs. **Right column** cards in order: Notes (DOC-03), Diagnosis (DOC-04), Tests (DOC-05/06), Medicines (DOC-07), Next step (DOC-13).
**Data** — `getFolder(encounterId)`, `encounterVitals`, `listAlerts(patientId)`, `byPatient(patientId)`.
**Done when** — allergies visible without scrolling at 1280×720; all data loads with skeletons per card.

### DOC-03 · Consultation notes
**Goal** — I write my notes in a familiar structure and never lose them.
**Requirements** — FR-OPD-004.
**Screen** — Card "Notes" with four labelled textareas: What the patient says (history) · What I found (examination) · My assessment · Plan. `SaveIndicator`, autosave every 10s + on blur. Previous notes for this visit listed below (read-only, with author/time, "Edit" for own notes).
**Data** — `createConsultationNote`, `updateConsultationNote`, `listConsultationNotes`; key `clinical.consultations(encounterId)`.
**Done when** — closing the tab and reopening restores the draft; saved notes show author and time.

### DOC-04 · Diagnosis
**Requirements** — FR-OPD-005, FR-SRV-001, FR-OPD-016.
**Screen** — Card "Diagnosis": search box ("Search diagnosis, e.g. malaria") → results show name first, code small and grey; selected diagnoses as removable chips with "Main" toggle (max 5). Notifiable diseases show a warning pill "Must be reported" and a checkbox "Flag for disease surveillance".
**Data** — `clinicalService.conditions(q)` via `ClassificationPicker` (Evolve). Save with the consultation note or **backend to confirm** a diagnosis endpoint.
**Done when** — keyboard search works; codes never lead the label.

### DOC-05 · Order lab tests
**Goal** — I request tests quickly and the lab gets them straight away.
**Requirements** — FR-OPD-006, FR-LAB-001.
**Screen** — Card "Tests" → "Order lab tests" (secondary) opens a side sheet: search tests from the lab list (grouped: Blood, Urine, Malaria…), common panel shortcuts, urgency (Routine / Urgent / Immediately), note to the lab. Primary "Send to lab". Ordered tests list: name, urgency, status pill (`LAB_STATUS`), payment state ("Waiting to pay" if self-pay).
**Data** — `clinicalService.catalog()` (lab items), `placeLabOrder`, `listLabOrdersForEncounter`. Invalidate `clinical.labOrders(id)`, `clinical.labWorklist`.
**Hand-off** — Lab "To do" (LAB-01); for self-pay patients the cashier first (J02).
**States** — Toast "2 tests sent to the lab."
**Done when** — lab sees the order within 30s; urgent orders sort to the top there.
**Depends on** — DOC-02, LAB-08 (test list exists).

### DOC-06 · Order imaging
**Requirements** — FR-OPD-007, FR-RAD-001.
**Screen** — Same pattern: exam type, body part, reason for the scan (required), urgency. Primary "Send to imaging".
**Data** — `placeRadiologyOrder`, `listRadiologyOrdersForEncounter`.
**Hand-off** — RAD-01.

### DOC-07 · Prescribe medicines
**Goal** — I prescribe safely; I'm stopped if there's an allergy conflict.
**Requirements** — FR-OPD-008, 009, 010.
**Screen** — Card "Medicines" → side sheet: search drug (name + strength + form, stock pill "In stock / Low / Out of stock"), dose, how often (chips: once daily, twice daily, three times, four times, as needed), how long (days), route, quantity (auto-calculated, editable), instructions. Lines list. **Allergy conflict** → `CriticalAlert` inside the sheet, can't add without choosing "Choose another medicine" or "Prescribe anyway — I've checked" + reason. **Interaction** → warning notice. Primary "Send to pharmacy".
**Data** — drug list from `clinicalService.catalog()` / `pharmacyInventoryService.stockOverview`; `placePrescription`, `listPrescriptionsForEncounter`. Invalidate `clinical.prescriptions(id)`, `clinical.pharmacyQueue`. **Backend to confirm**: allergy/interaction check response.
**Hand-off** — Pharmacy "Prescriptions waiting" (PHA-01).
**Done when** — conflict can't be missed or dismissed silently; quantity math is right.

### DOC-08 · Results and critical alerts
**Goal** — I see new results without hunting, and critical ones reach me immediately.
**Requirements** — FR-LAB-005, FR-LAB-010, FR-RAD-004.
**Where** — consultation "Tests" card; OPD "Results back" card; header bell.
**Screen** — Each order row expands to the result table (`LabResultValue` with range + flag) or imaging report text. Critical result → `CriticalAlert` on the patient page + bell item "Critical result: Potassium 6.8 for Ama Mensah" → "I've seen this" (records acknowledgement) and quick actions (Order more tests, Change medicines, Admit).
**Data** — `listLabOrdersForEncounter`, `getLabOrder`, `labCriticalAlertsInbox`, `acknowledgeLabCriticalAlert`, `getRadiologyOrder`.
**Done when** — a critical result entered in LAB-04 shows on the doctor's screen within 30s and can't be closed without acknowledging.
**Depends on** — LAB-03/04, RAD-03.

### DOC-09 · Refer a patient
**Requirements** — FR-OPD-011. See journey J13.
**Where** — "Next step" card → "Refer"; incoming at `/opd?view=referrals` (tab "Referrals").
**Existing code** — `components/clinical/opd/opd-referrals-inbox.tsx`, `folder/folder-referrals.tsx` (Evolve).
**Screen** — Dialog: Internal (department/clinic + doctor) or External (facility name, contact); reason; summary (pre-filled from notes/diagnoses, editable); urgency. Primary "Send referral"; then "Print referral letter". Inbox: table of referrals to me/my clinic with pill (Sent / Accepted / Declined / Done) and "Accept" / "Decline (reason)".
**Data** — `placeReferral`, `listReferralsForEncounter`, `referralInbox`, `decideReferral`, `openReferralLetterPdf`.

### DOC-10 · Admit to a ward
**Requirements** — FR-OPD-012, FR-IPD-002.
**Screen** — Dialog "Admit Ama Mensah": ward (with free-bed counts), bed (only free beds, from board), working diagnosis (pre-filled), reason. Primary "Admit to ward". Success panel: "Ama Mensah is admitted to Female Medical Ward, bed 4." Actions: "Go to ward", "Back to my patients".
**Data** — `ipdService.board`, `clinicalService.admit(encounterId, …)`. Invalidate `ipd.wards`, `clinical.admissions(id)`, `clinical.today`.
**Hand-off** — Nurse beds/ward care (NUR-07/08).

### DOC-11 · Ward round notes
**Requirements** — FR-IPD-003.
**Where** — `/wards?view=admissions&admissionId=…`
**Existing code** — `AdmissionsView` in `wards-workspace.tsx` (split out).
**Screen** — Admissions table (patient, ward/bed, day of stay, doctor, diagnosis) → admission page: banner + bed, daily progress note (same 4-part notes), orders (reuse DOC-05/06/07 components), vitals/TPR/MAR read-only summary.
**Data** — `activeAdmissions`, consultation notes on the admission's encounter.

### DOC-12 · Discharge summary
**Requirements** — FR-IPD-008, 009.
**Screen** — Page/card "Discharge summary": final diagnoses, what was done, medicines to take home (pre-filled from active prescriptions, editable → becomes a prescription for pharmacy), follow-up (date → books appointment), outcome (Went home / Moved to another facility / Left against advice / Died — death needs date, time, cause). Primary "Discharge patient" (`ConfirmDialog`). Then "Print discharge summary".
**Data** — `clinicalService.discharge(admissionId, …)`. Invalidate `ipd.wards`, billing lists.
**Hand-off** — Nurse confirms leaving (NUR-10); Cashier bill (BIL-02); NHIS claim draft (FIN-05); pharmacy gets take-home medicines.

### DOC-13 · Finish the visit and book follow-up
**Requirements** — FR-APT-005, FR-OPD-014.
**Screen** — Card "Next step": options Send home · Refer (DOC-09) · Admit (DOC-10) · Wait for results (keeps visit open; patient stays in "Results back"). Follow-up: "Book follow-up in 2 weeks" (date picker, clinic) → creates appointment. Primary "Finish visit". If things are unfinished, show "Things to finish first" list (from `blockers`) — e.g. "Lab result for Full blood count isn't back yet." — with "Finish anyway" (records reason).
**Data** — `clinicalService.blockers`, `complete(id, force)`, `appointmentsService.book`; follow-ups view `opd-followup-planner.tsx` (`/opd?view=followup`).
**Hand-off** — Cashier (if unpaid items), Pharmacy, Records (follow-up appointment).
**Done when** — the patient leaves "With doctor" for everyone; follow-up shows in REC-09 on that day.

### DOC-14 · Treatments and procedures
**Where** — consultation "Treatments" card / folder tab.
**Existing code** — `folder/folder-treatments.tsx` (Evolve; move its `apiErrorMessage` into `lib/api-errors.ts`).
**Data** — `listTreatments`, `createTreatment`, `updateTreatmentStatus`.
