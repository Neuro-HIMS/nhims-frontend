# J08 · ANC booking → visits → delivery → postnatal

**Requirements** — FR-ANC-001…012.

```
RECORDS  REC-01/02 find or register ─► REC-05 start visit (where: ANC)
MIDWIFE  MID-01 today ─► MID-02 register pregnancy (LMP → EDD) ─► MID-03 visit ─► MID-04 risk check ─► next appointment
         (repeat MID-03 each contact; MID-05 tracks the 8-contact schedule and overdue)
         MID-04 high risk ─► DOC-09 referral to doctor
         MID-06 delivery ─► baby registered (linked to mother) ─► MID-07 postnatal (day 1, day 3, week 6)
HIO      ANC numbers flow into the monthly GHS report (HIO-02)
```

| # | Role | Slice | Change | Signal |
|---|---|---|---|---|
| 1 | Records | REC-05 (ANC) | visit Waiting | MID-01 |
| 2 | Midwife | MID-02 | pregnancy registered, EDD | `anc.all` |
| 3 | Midwife | MID-03 | visit saved; dose count increments | `anc.visits` |
| 4 | Midwife | MID-04 | risk flag → `CriticalAlert` | high-risk list, optional referral |
| 5 | Midwife | MID-06 | delivery recorded | baby record, PNC schedule |
| 6 | Midwife | MID-07 | postnatal visits | — |

**Build order** — MID-01 → MID-02 → MID-03 → MID-04 → MID-05 → MID-06 → MID-07 (needs backend).

**Test** — Register pregnancy with LMP 90 days ago → EDD and "13 weeks" correct. Visit with BP 165/112 → critical alert and referral option. Record delivery with 2.3 kg baby → "Low birth weight" pill.
