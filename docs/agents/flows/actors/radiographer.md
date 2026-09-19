# Radiographer (`RAD`)

**Who** — imaging staff. Receive scan requests, perform scans, write/enter reports.
**Lands on** — `/radiology?view=worklist`
**Sections** — Imaging (Radiology).

```
(DOC-06) ─► RAD-01 Scans to do ─► RAD-02 Start / finish scan ─► RAD-03 Write report ─► (DOC-08)
```

---

### RAD-01 · Scans to do
**Requirements** — FR-RAD-001, 002.
**Where** — `/radiology?view=worklist` (tab "To do")
**Existing code** — `components/radiology/radiology-workspace.tsx` (split into views, onto `WaitingList`).
**Screen** — Page card "Imaging (Radiology)" — "Scans requested by doctors, and their reports." Stat row: Waiting · Scanning · To report · Reported today. `WaitingList`: wait, patient, exam + body part, reason, urgency pill, payment, status pill (`IMAGING_STATUS`), action "Start scan" / "Write report".
**Data** — `clinicalService.radiologyWorklist()`, key `clinical.radiologyWorklist`, refetch 30s.
**Empty** — "No scans waiting."

### RAD-02 · Start and finish a scan
**Screen** — Request card (exam, body part, reason, doctor, pregnancy status for women 12–50 — warning pill if unknown). Primary "Start scan" → "Scan done".
**Data** — `updateRadiologyOrderStatus(id, IN_PROGRESS | COMPLETED…)`.
**Rules** — Cancel (`ConfirmDialog` + reason) notifies the doctor.

### RAD-03 · Write the report
**Requirements** — FR-RAD-003, 004, 006.
**Where** — `/radiology?view=reports&orderId=…`
**Screen** — Banner + request summary; report form: Findings, Impression (conclusion), Recommendations; optional attachments (`UploadDropzone`, JPEG/PDF, "max 20 MB") — **backend to confirm** upload. Primary "Save report" (status → Report ready).
**Data** — `submitRadiologyReport`, `getRadiologyOrder`.
**Hand-off** — doctor sees report in DOC-08 + bell "Report ready: Chest X-ray for Kofi Asante".

### RAD-04 · Reports
**Where** — `/radiology?view=reports` — table of reported scans with filters (date, exam), open → read-only report + "Print report".
