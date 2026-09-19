# J04 · Lab request → result → doctor (including critical values)

**Requirements** — FR-LAB-001…010, FR-OPD-006.

```
DOCTOR  DOC-05 order (urgency, note) ──────────────► Requested
LAB     LAB-01 to do ─► LAB-02 collect ──────────► Being tested
             └► reject (reason) ─► doctor told ───► (doctor re-orders)
        LAB-03 enter results ─► flags computed ───► Result entered
             └► critical? ─► LAB-04 confirm told ─► critical alert created
        LAB-05 authorise ─────────────────────────► Result ready
DOCTOR  DOC-08 result in Tests card + bell ─► (critical) acknowledge ─► act (orders / admit)
```

| # | Role | Slice | Status | Signal to next |
|---|---|---|---|---|
| 1 | Doctor | DOC-05 | Requested (Ready for sample if NHIS/paid) | `clinical.labWorklist` |
| 2 | Lab | LAB-02 | Being tested | doctor's Tests card pill |
| 2a | Lab | LAB-02 reject | Rejected + reason | bell to doctor |
| 3 | Lab | LAB-03 | Result entered | "Waiting to authorise" filter |
| 3a | Lab | LAB-04 | Critical alert | `labCriticalInbox`, doctor bell, `CriticalAlert` on patient page |
| 4 | Scientist | LAB-05 | Result ready | `clinical.folder(encounterId)`, bell "Result ready" |
| 5 | Doctor | DOC-08 | acknowledged (critical) | alert moves to "Doctor has seen it" in LAB "Critical today" |

**Build order** — LAB-08 (tests exist) → DOC-05 → LAB-01 → LAB-02 → LAB-03 → LAB-05 → DOC-08 → LAB-04 (critical path last, but before release).

**Test** — Order Potassium (Urgent). Collect; enter 6.8 → critical dialog must block until "I have told the doctor" is ticked. Doctor screen within 30s shows red `CriticalAlert`; can't dismiss without "I've seen this". Lab "Critical today" updates to "Doctor has seen it". Also test rejection path → doctor bell message in plain words.
