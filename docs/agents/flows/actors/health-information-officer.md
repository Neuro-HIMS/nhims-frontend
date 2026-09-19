# Health information officer (`HIO`)

**Who** — GHS-designated data officer. Reviews data quality and produces the monthly GHS (DHIMS2) report and facility reports. Read-only on clinical records.
**Lands on** — `/reports`
**Sections** — Home, Reports.

```
Month ends ─► HIO-02 Monthly GHS report (choose month) ─► completeness + flags ─► HIO-03 Check flags ─► HIO-04 Download / send ─► logged
```

---

### HIO-01 · Reports home
**Where** — `/reports`
**Existing code** — `components/reports/reports-workspace.tsx` (Evolve).
**Screen** — Page card "Reports" — "Monthly GHS report and facility reports." Cards: "Monthly GHS report (DHIMS2)" with this month's status pill (Not started / Needs checking / Ready to send / Sent) and primary "Open report"; "Facility monthly report"; "Downloads". Last 6 months table: month, status pill, completeness %, sent on, by.
**Data** — `reportsService.listDefinitions`, `runDhims2(month)` summaries; **backend needed** for the submission log (FR-DH2-009).

### HIO-02 · Monthly GHS report (DHIMS2)
**Requirements** — FR-DH2-001…008.
**Where** — `/reports?view=dhims2&month=2026-08`
**Screen** — Month picker. Completeness card: big "94% complete" + bar + list "What's missing" (e.g. "No ANC data for August, but the ANC clinic was open."). Data sections as cards with tables: Outpatient attendance by age group and sex · Diseases (malaria, respiratory infections, diarrhoea…) · Antenatal and deliveries (ANC 1st, 4th+, IPTp doses, deliveries, low birth weight, maternal deaths) · Lab volumes · Inpatients (admissions, discharges, deaths, bed days). Unusual numbers carry a warning pill "Much higher than usual" with the 3-month average.
**Data** — `reportsService.runDhims2(month)`, key `reporting.dhims2(month)`.
**States** — Loading can take time: skeleton + "Adding up this month's data…".

### HIO-03 · Check flags
**Requirements** — FR-DH2-004, 007.
**Screen** — Each flag row: what's unusual, "Explain" (note) or "Open the records" (deep link to the source list, read-only). Status per flag (Needs checking / Explained / Fixed). "Mark report ready to send" enabled when all flags are handled.
**Data** — **Backend needed** (flag notes and report status).

### HIO-04 · Download or send
**Requirements** — FR-DH2-005, 006, 009.
**Screen** — Primary "Download for DHIMS2 (spreadsheet)"; secondary "Send to DHIMS2" (only if facility credentials are set, else note "Sending directly isn't set up for your facility. Download the spreadsheet and upload it to DHIMS2."). After send: success panel with confirmation and "Print confirmation".
**Data** — `downloadDhims2Csv(month)` (export timeout); direct send **backend needed**.

### HIO-05 · Facility monthly report
**Where** — `/reports?view=monthly` · **Data** — `runMonthly`, `downloadMonthlyCsv`.
**Screen** — Month picker; key numbers by department; download.

### HIO-06 · Downloads
**Where** — `/reports?view=exports` (tab "Downloads") · **Data** — `listExportDefinitions`.
**Screen** — List of available spreadsheets with a one-line description each and "Download". No file-format jargon beyond "spreadsheet".

### HIO-07 · Weekly disease surveillance (later)
**Requirements** — FR-SRV-002…004. Weekly case counts by disease, age, sex; outbreak alerts. **Backend needed.**
