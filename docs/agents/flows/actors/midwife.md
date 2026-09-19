# Midwife (`MID`)

**Who** — midwives running antenatal care (ANC), deliveries and postnatal care (PNC).
**Lands on** — `/anc`
**Sections** — Antenatal care (ANC); limited OPD.
**Folder view** — `FULL`; can place orders (`canPlaceOrders`).

```
(REC-05, where = ANC) ─► MID-01 Today's clients ─┬─ first visit ─► MID-02 Register pregnancy ─► MID-03 Visit
                                                  └─ returning ───► MID-03 Visit ─► MID-04 Risk check ─► next appointment
MID-04 high risk ─► refer to doctor (DOC-09) · MID-06 Delivery ─► baby registered ─► MID-07 Postnatal visits
```

---

### MID-01 · ANC home: today's clients
**Goal** — I see who's coming today, who's high risk and who's overdue.
**Requirements** — FR-ANC-008, 009.
**Where** — `/anc?view=clients` (tab "Clients")
**Existing code** — `components/anc/anc-workspace.tsx` (split into `components/anc/views/*`).
**Screen** — Page card "Antenatal care (ANC)" — "Care for pregnant women from booking to delivery." Stat row: Today's visits · High-risk mothers · Overdue visits · Due to deliver in 2 weeks. `WaitingList` for today (patient, weeks pregnant, visit number "Visit 3 of 8", risk pill, action "Start visit"). Table "All clients" with filters (risk, due month) and search.
**Data** — `ancService.dashboard()`, `clinicalService.today()` filtered to ANC visits; key `anc.all`.
**Empty** — "No ANC visits today."
**Depends on** — REC-05, FND-07.

### MID-02 · Register a pregnancy
**Goal** — I book a woman into ANC with the key dates worked out for me.
**Requirements** — FR-ANC-001, 006, 007.
**Where** — `/anc?view=clients&patientId=…&action=register`
**Screen** — `PatientBanner`. Form: Last menstrual period (date) → Expected delivery date calculated and shown ("EDD 12/04/2027 · 14 weeks pregnant today"), with "I have a scan date instead" option; Pregnancies before (gravida), Births before (parity); past complications (checkbox chips: previous caesarean, pre-eclampsia, bleeding, stillbirth…); booking tests: HIV (Positive / Negative / Declined / Not done), Syphilis (same). Primary "Register for ANC".
**Data** — `ancService.createPregnancy`; `listPregnancies(patientId)` to block a second active pregnancy.
**States** — Existing active pregnancy: `InlineNotice` "Ama already has an active pregnancy registered (EDD 12/04/2027)." + "Open it".
**Done when** — EDD math matches Naegele's rule (unit tested); risk evaluation runs on save.

### MID-03 · ANC visit
**Goal** — I record a visit in one screen, with doses tracked for me.
**Requirements** — FR-ANC-002…007.
**Where** — `/anc?view=visits&pregnancyId=…`
**Screen** — Banner + pregnancy strip (weeks, visit number, risk pill). Left: visit timeline (past visits). Right: form in `FormSection`s — Mother: BP, weight, urine protein, urine glucose, swelling (None / Feet / All over). Baby: fundal height cm, position (Head down / Bottom down / Sideways), heart rate. Given today: IPTp-SP (shows "This will be dose 3"), iron and folic acid, mosquito net given, other. Notes. Next appointment (date). Primary "Save visit".
**Data** — `ancService.addVisit`, `listVisits`; key `anc.visits(patientId)`.
**Hand-off** — MID-04 risk evaluation response.

### MID-04 · Risk flags and high-risk mothers
**Requirements** — FR-ANC-008.
**Screen** — After save, if risk criteria are met (e.g. BP ≥ 160/110): `CriticalAlert` "BP 160/110 — severe high blood pressure. Refer to a doctor now." with "Refer to doctor" (DOC-09 prefilled) and "I've dealt with this". Tab "High-risk mothers": table with reasons as pills.
**Data** — `riskLevel`, `riskEvalSummary` from `AncPregnancyDto`.

### MID-05 · Visit schedule and overdue
**Requirements** — FR-ANC-009.
**Screen** — Per pregnancy: 8-contact schedule as a simple step row (done / due / overdue pills). Overdue list on MID-01 with "Call" phone number and "Book visit".
**Data** — derived from visits + EDD; **backend to confirm** schedule rules.

### MID-06 · Record delivery
**Requirements** — FR-ANC-010, 011.
**Where** — `/anc?view=deliveries` (tab "Deliveries") → "Record delivery".
**Screen** — Stepped: Delivery (date/time, how: normal / assisted / caesarean — caesarean offers "Send to theatre"), who attended; Baby (sex, weight — under 2.5 kg shows warning pill "Low birth weight", Apgar 1 and 5 min, outcome: Born alive / Stillbirth — fresh / macerated); Mother (complications chips: heavy bleeding, tear…). Primary "Save delivery". Then success panel: "Delivery recorded." Actions "Register the baby" (creates patient linked to mother — **backend to confirm**), "Book postnatal visits".
**Data** — `ancService.recordDelivery(pregnancyId, …)`.

### MID-07 · Postnatal visits
**Requirements** — FR-ANC-011.
**Screen** — Schedule Day 1 · Day 3 · Week 6 auto-created; visit form (mother + baby checks). **Backend needed** (no PNC endpoints in `ancService`).
