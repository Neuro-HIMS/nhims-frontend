# J05 · Imaging request → report

**Requirements** — FR-OPD-007, FR-RAD-001…006.

```
DOCTOR       DOC-06 order (exam, body part, reason, urgency) ─► Requested
RADIOGRAPHER RAD-01 to do ─► RAD-02 start ─► Scanning ─► scan done
             RAD-03 write report (+ attachments) ─► Report ready
DOCTOR       DOC-08 report in Tests card + bell
```

| # | Role | Slice | Status | Signal |
|---|---|---|---|---|
| 1 | Doctor | DOC-06 | Requested / Ready for scan | `clinical.radiologyWorklist` |
| 2 | Radiographer | RAD-02 | Scanning | doctor's pill |
| 3 | Radiographer | RAD-03 | Report ready | bell + `clinical.radiologyOrders(encounterId)` |
| 4 | Doctor | DOC-08 | read | — |
| alt | Radiographer | RAD-02 cancel (reason) | Cancelled | bell to doctor |

**Build order** — DOC-06 → RAD-01 → RAD-02 → RAD-03 → DOC-08 (imaging part) → RAD-04.

**Test** — Order chest X-ray with reason; radiographer starts/finishes and writes report; doctor sees "Report ready" and the text within 30s.
