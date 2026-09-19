# J10 · Monthly GHS (DHIMS2) report

**Requirements** — FR-DH2-001…009.

```
HIO  HIO-01 Reports home (month status) ─► HIO-02 open month ─► completeness % + what's missing + unusual numbers
     HIO-03 explain or fix each flag ─► Ready to send
     HIO-04 download spreadsheet (upload to DHIMS2)  or  send directly ─► Sent ─► confirmation logged
```

| # | Slice | Status |
|---|---|---|
| 1 | HIO-01 | Not started |
| 2 | HIO-02 | Needs checking |
| 3 | HIO-03 | Ready to send |
| 4 | HIO-04 | Sent / Send failed (reason in words) |

**Depends on data from** — J01 (OPD attendance, diagnoses, lab volumes), J07 (inpatients), J08 (ANC and deliveries).

**Build order** — HIO-01 → HIO-02 → HIO-04 (download) → HIO-03 and direct send (backend needed).

**Test** — Pick last month → completeness shows; a department with no data shows in "What's missing"; download produces a spreadsheet; status updates.
