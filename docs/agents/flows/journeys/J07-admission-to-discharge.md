# J07 · Admission → ward care → discharge → bill

**Requirements** — FR-OPD-012, FR-IPD-001…010, FR-NHI-005.

```
DOCTOR   DOC-10 admit (ward, free bed, diagnosis) ─► visit: Admitted, bed: Occupied
NURSE    NUR-07 beds ─► NUR-08 medicines given (MAR) ─► NUR-09 observations (TPR)   (daily)
DOCTOR   DOC-11 ward round notes + orders (DOC-05/06/07 components)                  (daily)
DOCTOR   DOC-12 discharge summary (outcome, take-home medicines, follow-up) ─► Ready to go home
NURSE    NUR-10 confirm they've left ─► bed: Being cleaned ─► Mark bed ready ─► Free
CASHIER  BIL-02/03 bill with ward days, medicines, tests ─► BIL-05 payment      (self-pay)
FINANCE  FIN-05 claim Draft                                                        (NHIS)
PHARMACY PHA-01 take-home medicines
RECORDS  REC-09 follow-up appointment on its date
```

| # | Role | Slice | Change | Signal |
|---|---|---|---|---|
| 1 | Doctor | DOC-10 | Admitted; bed Occupied | `ipd.wards`, `clinical.today` |
| 2 | Nurse | NUR-07/08/09 | doses and observations recorded | admission page |
| 3 | Doctor | DOC-11 | notes, orders | lab/imaging/pharmacy lists |
| 4 | Doctor | DOC-12 | Discharged (outcome) | NUR-10 list, billing, claims, pharmacy |
| 5 | Nurse | NUR-10 | bed Being cleaned → Free | `ipd.wards` |
| 6 | Cashier / Finance | BIL-03 / FIN-05 | bill / claim | — |

**Alternate** — Transfer between wards (FR-IPD-006: **backend to confirm**) · Death (DOC-12 outcome "Died" requires date, time, cause) · Left against advice.

**Build order** — NUR-07 → DOC-10 → NUR-08 → NUR-09 → DOC-11 → DOC-12 → NUR-10 → bill/claim checks.

**Test** — Admit Kofi to a free bed (bed count drops by one); record 2 doses and one TPR; doctor writes a round note; discharge with take-home medicine and follow-up; nurse confirms left; bed goes Being cleaned → Free; pharmacy sees take-home prescription; bill includes ward days.
