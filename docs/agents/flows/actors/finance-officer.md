# Finance officer (`FIN`)

**Who** — manages prices, revenue reporting and NHIS claims.
**Lands on** — `/finance?view=dashboard`
**Sections** — Prices and revenue, Bills and payments (view), Reports.

```
FIN-02 Services and prices ─► used by bills (BIL) and orders
Visit ends / discharge ─► FIN-05 Claims (Draft) ─► FIN-06 Check claim ─► Ready ─► FIN-07 Send ─► Accepted | Questioned | Rejected ─► FIN-08 Fix and resend
FIN-09 Monthly claims summary
```

---

### FIN-01 · Overview
**Requirements** — FR-BIL-004, 007.
**Where** — `/finance?view=dashboard`
**Existing code** — `components/finance/views/finance-dashboard.tsx` (Evolve).
**Screen** — Page card "Prices and revenue" — "Set prices, track money coming in and manage NHIS claims." Stat cards: Collected this month, Owed by patients, NHIS claims waiting (count + GH₵), Claims needing action. Revenue by department (bar), last 30 days trend (line). "Claims needing action" table.
**Data** — `financeService.dashboard()`, `revenueSummary`.

### FIN-02 · Services and prices
**Requirements** — FR-BIL-002, FR-NHI-003.
**Where** — `/finance?view=catalog` (tab "Services and prices")
**Existing code** — `service-catalog-view.tsx`, `pricing-matrix-view.tsx` (Evolve; merge "Pricing matrix" into this tab as "Prices by patient type").
**Screen** — Table: service, group (Consultation, Lab, Imaging, Pharmacy, Ward, Procedure), NHIS price code (small grey), prices by patient type (Self-pay · NHIS · Company), active. Row → sheet to edit prices with "Starts on" date. "Add service" primary.
**Data** — `listServices`, `createService`, `updateService`, `serviceGroups`, `payerTypes`, `listPricingMatrix`, `addPricing`, `updatePricing`.
**Rules** — Price changes need a start date; old price kept in history.

### FIN-03 · Old prices (view only)
**Where** — tab under "More" → "Old prices". Read-only table from `listPricing`. Note: "These are prices from before the current price list. You can't change them."

### FIN-04 · Revenue
**Where** — `/finance?view=revenue` · **Existing** — `revenue-view.tsx`.
**Screen** — Period picker; totals; by department, by service group, by payment method (tables + charts); "Money owed, not yet paid" list. Download as spreadsheet.
**Data** — `revenueSummary`.

### FIN-05 · NHIS claims list
**Requirements** — FR-NHI-005, 008, 011.
**Where** — `/finance?view=nhis-claims`
**Existing code** — `nhis-claims-view.tsx` (Evolve).
**Screen** — Status tabs with counts: Needs action (Questioned + Rejected) · Draft · Ready to send · Sent · Accepted. Table: claim number, patient, NHIS number, visit date, amount, status pill (`CLAIM_STATUS`), reason (for questioned/rejected, in plain words), action. Bulk: select Ready → "Send selected claims".
**Data** — `listClaims`; key `billing.claims`.

### FIN-06 · Check a claim
**Requirements** — FR-NHI-004, 006.
**Screen** — Claim page: patient + NHIS pill (at date of service), visit summary (diagnoses names), line items (service, NHIS price code, quantity, amount, "Not covered" warning pills for invalid items). Edit/remove lines. Primary "Mark ready to send".
**Data** — `updateClaim`, `patchClaimStatus`.

### FIN-07 · Send claims and record responses
**Requirements** — FR-NHI-007, 008, 012.
**Screen** — "Send selected claims" → `ConfirmDialog` "Send 24 claims to NHIS (GH₵ 3,120.00)?" → progress → result summary. When NHIS can't be reached: "We couldn't reach NHIS. The claims are saved and will be sent when the connection is back." Responses update status; Questioned/Rejected show the reason.
**Data** — `patchClaimStatus`; **backend to confirm** batch submission endpoint and response intake.

### FIN-08 · Fix and resend
**Requirements** — FR-NHI-009.
**Screen** — From "Needs action": claim page with the reason in an `InlineNotice tone="error"`, edit lines / add supporting note, "Resend claim". History panel of every change (who, when, what).

### FIN-09 · NHIS monthly summary
**Requirements** — FR-NHI-010.
**Where** — "More" → "NHIS reports" · **Existing** — `nhis-reports-view.tsx`.
**Screen** — Month picker; totals: claims sent, value, accepted %, rejected %, top rejection reasons; "Create summary" (saves a version); list of saved versions with download.
**Data** — `listReports`, `generateReport`.
