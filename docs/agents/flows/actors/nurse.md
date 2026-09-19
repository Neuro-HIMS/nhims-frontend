# Nurse (`NUR`)

**Who** — OPD, emergency and ward nurses. Triage, vitals, moving patients to the doctor, ward care (medicines given, observations), confirming discharge. **Can't diagnose or prescribe.**
**Lands on** — `/nurse?view=visits`
**Sections** — Nurse station, OPD (read), Emergency, Wards, Theatre.
**Folder view** — `FULL`, but write access only to vitals, triage, nursing notes, MAR/TPR.

```
(REC-05 / REC-09) ─► NUR-01 Today's patients ─► NUR-02 Triage ─► NUR-03 Vitals ─► NUR-04 Send to doctor ─► (DOC-01)
(DOC-10 admit) ─► NUR-07 Beds ─► NUR-08 Medicines given ─► NUR-09 Observations ─► (DOC-12 discharge) ─► NUR-10 Confirm discharge
```

---

### NUR-01 · Today's patients (waiting list)
**Goal** — I see who's waiting, most urgent and longest-waiting first, and start with them.
**Requirements** — FR-OPD-001, FR-OPD-014.
**Where** — `/nurse?view=visits` (tab "Today's patients")
**Existing code** — `components/nurse/views/visits-queue-view.tsx`, `components/nurse/lib/nurse-data.ts` (Evolve onto `WaitingList`).
**Screen** — Page card "Nurse station" — "See today's patients, triage them and record vitals." Stat row: Waiting for vitals · Waiting for doctor · With doctor · Finished today. `WaitingList`: wait time, patient, triage pill (or "Not triaged yet"), reason, stage pill, action "Start triage" / "Record vitals" / "Open". Filters: stage, triage, clinic. Search.
**Data** — `clinicalService.today()`, key `clinical.today`, refetch 30s. Sorting helper `sortByUrgencyThenArrival` in `lib/` (unit tested).
**Rules** — Emergency rows get `.triage-row-emergency` + ⚠ pill; waits over 60 min show a warning pill "Waiting 1 h 10 min".
**States** — Empty good-news: "No patients waiting. Everyone has been seen."
**Hand-off** — row action → NUR-02 with `encounterId`.
**Done when** — new check-ins appear without refresh; order is correct; nurse can start any row with one click.
**Depends on** — FND-07, REC-05.

### NUR-02 · Triage
**Goal** — I record why the patient came and how urgent it is.
**Requirements** — FR-OPD-003.
**Where** — `/nurse?view=triage&encounterId=…`
**Existing code** — `components/nurse/views/triage-view.tsx` (Evolve).
**Screen** — `PatientBanner`. Card "Triage": Main complaint (textarea, e.g. "Fever for 3 days"), Urgency as four large radio cards with colour + word + one-line guide (Emergency — "Life-threatening, needs care now"; Urgent; Semi-urgent; Routine), Notes (optional). Primary "Save and record vitals".
**Data** — `clinicalService.recordTriage(encounterId, …)`, history `triageHistory`. Invalidate `clinical.today`.
**Rules** — Emergency → `InlineNotice tone="error"` "Tell a doctor now." and offer "Send straight to doctor".
**Done when** — urgency pill updates in NUR-01 and the doctor's list order.
**Depends on** — NUR-01, FND-06.

### NUR-03 · Record vitals
**Goal** — I enter vitals fast and the system warns me if something is out of range.
**Requirements** — FR-OPD-002.
**Where** — same page as NUR-02 (second card) or `/nurse?view=triage&encounterId=…&step=vitals`.
**Existing code** — within `triage-view.tsx` / `patient-folder-view.tsx`; `components/clinical/folder/folder-vitals.tsx` (Evolve).
**Screen** — Card "Vitals": grid of `UnitInput`s — Blood pressure (systolic / diastolic mmHg), Temperature °C, Pulse /min, Breathing rate /min, SpO₂ %, Weight kg, Height cm, BMI (auto, read-only with label "Underweight / Healthy / Overweight / Obese"). Last recorded values shown in grey under each field ("Last: 120/80 on 02/09"). Amber message under out-of-range fields; red for dangerous values (e.g. SpO₂ < 90%) with "Tell a doctor now." Primary "Save vitals".
**Data** — `clinicalService.recordVitals(encounterId, …)`; `encounterVitals`, `patientVitals`. Range table in `lib/vitals-ranges.ts` (unit tested; adult/child ranges by age).
**States** — `SaveIndicator`; typed values kept on error.
**Hand-off** — NUR-04.
**Done when** — tab order follows the grid; decimal input works; ranges flag correctly; saved values appear in the folder.
**Depends on** — NUR-02, FND-09.

### NUR-04 · Send to doctor
**Goal** — once triage and vitals are done, I send the patient to the doctor.
**Where** — footer of the triage page.
**Screen** — Secondary "Save and stay"; primary "Send to doctor". Optional doctor picker ("Any available doctor" / specific) → `assignClinician`.
**Data** — `clinicalService.transition(encounterId, { to: "AT_CONSULTATION", station: "CONSULTATION" })`; invalidate `clinical.today`, `opd.queue`.
**States** — Toast "Vitals saved. Ama Mensah is now waiting for the doctor." Back to NUR-01.
**Hand-off** — appears in **Doctor → Patients waiting** (DOC-01), in urgency order.
**Done when** — can't send without triage urgency and at least BP, temperature and pulse (show "Things to finish first" list).
**Depends on** — NUR-03.

### NUR-05 · Patient folder (nurse view)
**Goal** — I see the patient's history and today's details in one place.
**Where** — `/nurse?view=folder&encounterId=…`
**Existing code** — `components/nurse/views/patient-folder-view.tsx`, `components/clinical/folder/*` (Evolve).
**Screen** — `PatientBanner` + `CriticalAlert`s; tabs: Visits · Vitals (table + small trend chart) · Notes (read) · Tests · Medicines · Treatments · Admissions · Referrals · Alerts. Nurse can add vitals, nursing notes, medical alerts (e.g. allergy).
**Data** — `clinicalService.getFolder(encounterId)` (+ tab-specific queries).
**Done when** — tabs shown follow `folderSliceFor`; each tab has its own empty state ("No medicines prescribed on this visit.").

### NUR-06 · Find a patient (nurse)
**Where** — `/nurse?view=search` · **Existing** — `nurse-search-view.tsx` (Evolve to shared `PatientSearchPanel`, results link to NUR-05).

### NUR-07 · Beds
**Goal** — I see every bed and who's in it.
**Requirements** — FR-IPD-001, 005.
**Where** — `/wards?view=beds`
**Existing code** — `components/wards/wards-workspace.tsx` (BedBoardView — split into `components/wards/views/bed-board-view.tsx`).
**Screen** — Ward filter chips; per ward a card: "Male Medical Ward — 18 of 24 beds used". Grid of bed tiles: bed number, pill (Free / Occupied / Being cleaned / Reserved), patient name + days on ward ("Day 3"). Click occupied → admission panel; click free → "Admit a patient here" (doctor only).
**Data** — `ipdService.board()`, key `ipd.wards`.
**Done when** — statuses are words + colour; counts match.

### NUR-08 · Medicines given (MAR)
**Goal** — I record each dose I give, and see what's due.
**Requirements** — FR-IPD-004.
**Where** — `/wards?view=nursing&admissionId=…` (tab "Ward care")
**Existing code** — `WardsNursingMarTprView` inside `wards-workspace.tsx` (split out).
**Screen** — `PatientBanner` (+ bed). Card "Medicines due": list of active prescriptions with next due time, pill (Due now / Given / Missed / Not due yet), action "Record dose" → dialog: dose, route, time (defaults now), note, "Not given — reason" option. Card "Given today": table.
**Data** — `ipdService.listMar`, `addMar`; prescriptions from `listPrescriptionsForEncounter`.
**Rules** — Allergy conflict for a drug → `CriticalAlert` before recording.
**Done when** — recording updates due list immediately; every dose shows who gave it and when.

### NUR-09 · Observations (TPR chart)
**Where** — same page, card "Temperature, pulse and breathing".
**Screen** — Quick-add row (`UnitInput`s + time) and a simple line chart per measure (dataviz rules) with the table below.
**Data** — `ipdService.listTpr`, `addTpr`.

### NUR-10 · Confirm discharge and free the bed
**Goal** — after the doctor discharges, I confirm the patient has left and the bed is free.
**Requirements** — FR-IPD-008 (flow step 12).
**Where** — `/wards?view=discharge`
**Existing code** — `DischargeView` inside `wards-workspace.tsx`.
**Screen** — Table of "Ready to go home" patients (discharge written by doctor), actions "Confirm they've left" (`ConfirmDialog`: "Confirm Kofi Asante has left Male Medical Ward? Bed 12 will be marked for cleaning.") then bed goes Being cleaned → "Mark bed ready".
**Data** — `clinicalService.discharge` (if nurse confirmation is part of it) / **Backend needed** for bed cleaning state if not provided by `ipdService.board`.
**Hand-off** — discharge triggers bill (BIL-02) and NHIS claim draft (FIN-05).

### NUR-11 · Emergency board and triage
**Goal** — in Emergency, I see every patient at a glance by urgency.
**Where** — `/emergency?view=board`, `?view=triage`, `?view=handoff` (Handover).
**Existing code** — placeholder `ClinicalServiceModuleWorkspace` (Build `components/emergency/`).
**Screen** — Board = `WaitingList` grouped into Emergency / Urgent / Semi-urgent / Routine columns (cards on tablet). Quick-register: name (or "Unknown patient"), sex, approx age → creates patient + visit, records officer completes later (REC-06). Triage reuses NUR-02/03 components. Handover: list of patients with notes for the next shift.
**Data** — `clinicalService.search({ visitType: "EMERGENCY" })`; quick-register **backend to confirm**.
**Depends on** — NUR-02, NUR-03, REC-02.
