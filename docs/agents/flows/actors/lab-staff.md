# Lab scientist and lab technician (`LAB`)

**Who** — laboratory staff. Collect/receive samples, run tests, enter results, flag critical values; scientists authorise results.
**Lands on** — `/laboratory?view=worklist`
**Sections** — Laboratory, Blood bank.
**Folder view** — `LAB` slice (demographics, requesting doctor, clinical note on the request — no full history).

```
(DOC-05) ─► LAB-01 To do ─► LAB-02 Collect sample (or reject) ─► LAB-03 Enter results ─► LAB-04 Critical? ─► LAB-05 Authorise ─► (DOC-08)
```

Status words (see `05-ui-copy.md`): Requested → Ready for sample → Being tested → Result entered → Result ready.

---

### LAB-01 · Tests to do
**Goal** — I see which tests to do next, urgent first, and whether they're paid.
**Requirements** — FR-LAB-001, 003.
**Where** — `/laboratory?view=worklist` (tab "To do")
**Existing code** — `components/laboratory/laboratory-workspace.tsx` (Evolve onto `WaitingList`).
**Screen** — Page card "Laboratory" — "Collect samples, enter results and flag critical values." Stat row: To collect · Being tested · Waiting to authorise · Critical today. `WaitingList`: wait, patient, test(s), urgency pill (Immediately / Urgent / Routine), requested by, status pill, payment ("Waiting to pay" pending pill for unpaid self-pay), action "Collect sample" / "Enter results".
**Data** — `clinicalService.labWorklist()`, key `clinical.labWorklist`, refetch 30s.
**Rules** — Unpaid self-pay orders show but the action is disabled with reason "Waiting for payment at the cashier" (FR J02).
**Empty** — "No tests waiting. New requests from doctors will appear here."
**Depends on** — DOC-05, FND-07.

### LAB-02 · Collect or reject a sample
**Requirements** — FR-LAB-002, 003, 006.
**Where** — `/laboratory?view=results&orderId=…` (sample step).
**Screen** — Banner (LAB slice) + request card (tests, urgency, doctor's note, sample type). Primary "Sample collected" (records time) and secondary "Print specimen label". `destructive-outline` "Reject sample" → dialog with reason (Not enough sample, Clotted, Haemolysed, Wrong tube, Label missing, Other) — required.
**Data** — `updateLabOrderStatus(id, IN_PROGRESS | REJECTED…)`, `openLabSpecimenLabelPdf`.
**Hand-off** — rejected → doctor is notified (bell) "Sample for Full blood count was rejected: haemolysed. Please request a new sample."
**Done when** — can't enter results for a rejected sample without a reason on record.

### LAB-03 · Enter results
**Goal** — I type results and the system tells me what's normal, low, high or critical.
**Requirements** — FR-LAB-004, 008.
**Where** — `/laboratory?view=results&orderId=…`
**Existing code** — `components/laboratory/lab-result-entry-view.tsx`, `lab-malaria-panel-form.tsx` (Evolve).
**Screen** — For each test, a table: what's measured, result input (number / choice for qualitative e.g. Positive/Negative), unit, normal range for this patient's age/sex, flag (`LabResultValue` live as you type). Specialised forms (malaria panel) keep their layout but use the same components. Comments. Primary "Save results" (status → Result entered). Secondary "Save draft".
**Data** — `getLabOrder`, `submitLabResults`; keys `clinical.labOrder(id)`, `clinical.labWorklist`.
**Done when** — flags compute correctly for boundary values (unit tests); tab moves row to row.

### LAB-04 · Critical value
**Requirements** — FR-LAB-005.
**Screen** — On save, if any value is critical: blocking `CriticalAlert` dialog "Critical result: Potassium 6.8 mmol/L (normal 3.5–5.1)." with required checkbox "I have told the requesting doctor (Dr Owusu)" + how (phone / in person) → "Confirm and save". Tab "Critical today" lists them with acknowledgement status (pill "Doctor has seen it" / "Waiting for doctor").
**Data** — backend creates the alert on `submitLabResults`; `labCriticalAlertsInbox`.
**Hand-off** — DOC-08 alert + bell.

### LAB-05 · Authorise results
**Requirements** — FR-LAB-007.
**Where** — tab "To do" filtered "Waiting to authorise", or same results page.
**Screen** — Read-only results + who entered them; primary "Authorise results" (scientists only — `canAuthoriseLabResults`). Technicians see "A lab scientist needs to authorise these results."
**Data** — `updateLabOrderStatus(id, AUTHORISED)`.
**Hand-off** — status "Result ready" for the doctor (DOC-08); invalidate `clinical.folder(encounterId)`.

### LAB-06 · Done today
**Where** — `/laboratory?view=done` — table of completed tests today with time taken (request → result). **Empty**: "No results finished yet today."

### LAB-07 · Find a patient's tests
**Where** — `/laboratory?view=search` · **Existing** — `laboratory-search-view.tsx`, `lab-patient-labs-view.tsx` (Evolve to shared `PatientSearchPanel` → patient's orders table).

### LAB-08 · Test list and settings
**Goal** — we set up the tests our lab offers so doctors can order them.
**Requirements** — FR-LAB-008, FR-BIL-002.
**Where** — `/laboratory?view=catalog` (tab "Tests and settings"; lab scientists + admins).
**Existing code** — `components/laboratory/laboratory-catalog-setup.tsx` (Evolve).
**Screen** — Table: test name, group, sample type, what's measured (count), normal ranges set (pill), price, active switch. "Add a test" (primary) → sheet: name, group, sample type, parameters (name, unit, ranges by sex/age, critical low/high).
**Data** — `clinicalService.catalog`, `createLabCatalogItem`, `updateLabCatalogItem`.
**Empty** — "No lab tests set up yet. Add the tests your lab offers so doctors can order them."

### LAB-09 · Blood bank (later)
**Where** — `/blood-bank` (Stock · Cross-match · Issued). Placeholder today → "This section isn't ready yet." **Backend needed.**
