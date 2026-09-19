# J11 · Emergency arrival

**Story** — An unconscious man is brought in. Care starts before his details are known.

```
NURSE    NUR-11 quick register ("Unknown patient", sex, approx age) ─► Emergency triage (NUR-02) ─► vitals (NUR-03)
DOCTOR   DOC-01 (Emergency at top) ─► DOC-02… orders (critical path: DOC-05/07) ─► DOC-10 admit or DOC-13 send home
RECORDS  REC-06 complete his details later (or merge with his existing record — FR-REG-006, backend needed)
```

| # | Role | Slice | Note |
|---|---|---|---|
| 1 | Nurse | NUR-11 | Visit created as Emergency; ⚠ pill everywhere |
| 2 | Nurse | NUR-02/03 | "Tell a doctor now." notice |
| 3 | Doctor | DOC-01…13 | same components as OPD |
| 4 | Records | REC-06 | identity completed; "Unknown patient" replaced |

**Rules** — Payment never blocks emergency orders (lab/pharmacy rows show "Emergency — pay later" instead of disabled). **Backend to confirm.**

**Build order** — after J01 slices: NUR-11 → emergency flags in WaitingList → REC-06 completion.

**Test** — Quick-register unknown male ~40; triage Emergency; doctor sees him first; orders are actionable before payment; records later adds his name.
