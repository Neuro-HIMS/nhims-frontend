# J01 · Walk-in outpatient visit (NHIS patient)

**Story** — Ama Mensah walks in with a fever. She's registered, checked for NHIS, triaged, seen by a doctor, has a malaria test, gets medicines and leaves. Everything covered by NHIS goes on a claim.
**Requirements** — FR-REG-001…011, FR-OPD-001…015, FR-LAB-001…010, FR-PHX-001…004, FR-NHI-005.

## Swimlane

```
RECORDS      REC-01 find ─► REC-02 register ─► REC-03 NHIS ✓ ─► REC-05 start visit
                                                                    │ stage: Waiting for vitals
NURSE                                            NUR-01 list ◄──────┘
                                                 NUR-02 triage ─► NUR-03 vitals ─► NUR-04 send to doctor
                                                                                     │ stage: Waiting for doctor
DOCTOR                                           DOC-01 list ◄───────────────────────┘
                                                 DOC-02 open ─► DOC-03 notes ─► DOC-05 order malaria test
                                                                                     │ stage: At the lab
LAB                                              LAB-01 to do ◄──────────────────────┘
                                                 LAB-02 sample ─► LAB-03 results ─► LAB-05 authorise
                                                                                     │ "Result ready" + bell
DOCTOR                                           DOC-08 result ◄─────────────────────┘
                                                 DOC-04 diagnosis ─► DOC-07 prescribe ─► DOC-13 finish visit
                                                                                     │ stage: At the pharmacy
PHARMACY                                         PHA-01 list ◄───────────────────────┘
                                                 PHA-02 check ─► PHA-03 dispense ─► stage: Visit finished
FINANCE                                          FIN-05 claim (Draft) created from covered items
```

## Steps and hand-offs

| # | Role | Screen (slice) | What changes | Next role sees it via |
|---|---|---|---|---|
| 1 | Records | Find a patient (REC-01) → no match | — | — |
| 2 | Records | Register (REC-02, REC-03) | Patient created, NHIS active | — |
| 3 | Records | Start today's visit (REC-05) | Visit created → **Waiting for vitals** | `clinical.today` invalidated → NUR-01 |
| 4 | Nurse | Today's patients (NUR-01) → Triage (NUR-02) | Urgency set | NUR-01 order updates |
| 5 | Nurse | Vitals (NUR-03) → Send to doctor (NUR-04) | → **Waiting for doctor** | `opd.queue` → DOC-01 |
| 6 | Doctor | Call in (DOC-01) | → **With doctor**, doctor assigned | everyone's lists |
| 7 | Doctor | Notes (DOC-03), order test (DOC-05) | Lab order → Requested (NHIS: ready for sample) | `clinical.labWorklist` → LAB-01 |
| 8 | Lab | Collect (LAB-02), results (LAB-03), authorise (LAB-05) | Order → Result ready | `clinical.folder`, bell → DOC-08 |
| 9 | Doctor | Result (DOC-08), diagnosis (DOC-04), prescribe (DOC-07) | Prescription → Ready to collect | `clinical.pharmacyQueue` → PHA-01 |
| 10 | Doctor | Finish visit (DOC-13), follow-up booked | Visit stays open until dispensed / or completes | REC-09 on follow-up date |
| 11 | Pharmacist | Check (PHA-02) + dispense (PHA-03) | Prescription → Given; stock reduced | NHIS lines → claim |
| 12 | System | — | NHIS claim Draft | FIN-05 |

## Alternate paths

- **Patient already registered** → skip 2 (REC-01 → REC-05).
- **NHIS expired / not found** → REC-03 shows "NHIS expired"; visit continues as self-pay → follow **J02** for payment gating.
- **NHIS couldn't be checked** → "NHIS not confirmed yet"; cashier/finance re-check before claiming.
- **Emergency triage** → NUR-02 "Send straight to doctor"; list jumps to top (see J11).
- **Critical lab value** → LAB-04 + DOC-08 critical alert (see J04).
- **Out of stock** → PHA-04 partly given (see J06).
- **Doctor admits instead of sending home** → J07.

## Build it in pieces

1. FND-01…07 (labels, pills, states, table, page card, banner, waiting list).
2. REC-01 → REC-05 (patient reaches nurse).
3. NUR-01 → NUR-04 (patient reaches doctor).
4. DOC-01 → DOC-03, DOC-13 (simplest visit: consult and finish).
5. DOC-05 + LAB-01…05 + DOC-08 (lab loop).
6. DOC-04, DOC-07 + PHA-01…03 (prescribe and dispense).
7. FIN-05 claim draft visible.

After each step, run the part of the test script below that's now possible.

## End-to-end test script

1. Sign in as **Records officer**. Search "Test Ama Mensah" → no result → Register (DOB 12/03/1994, female, phone, allergy "No known allergies", NHIS valid test number). Expect: "NHIS active" pill; success panel with hospital number.
2. Start today's visit → OPD, reason "Fever", NHIS. Expect toast "Visit started… waiting for the nurse."
3. Sign in as **Nurse** (other browser). Within 30s Ama appears in Today's patients as "Waiting for vitals". Triage Urgent, "Fever 3 days". Vitals T 38.9 → amber warning shown. Send to doctor.
4. Sign in as **Doctor**. Ama is at the top (Urgent). Call in → stage "With doctor" (check nurse screen updates). Write notes; order Malaria RDT, Urgent. Toast "1 test sent to the lab."
5. Sign in as **Lab**. Ama in To do (Urgent). Collect sample → print label → enter Positive → save → authorise.
6. **Doctor**: bell shows "Result ready"; Tests card shows Positive. Add diagnosis "Malaria"; prescribe artemether-lumefantrine; Finish visit (with follow-up in 2 weeks).
7. **Pharmacist**: Ama in Prescriptions waiting (NHIS). Dispense with earliest-expiry batch. Toast "1 medicine given…".
8. **Finance**: claim for Ama in Draft with consultation, test and medicine lines.
9. Throughout: no enum text, no IDs as headlines, every status is a pill with words.
