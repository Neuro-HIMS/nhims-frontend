# J03 · Booked appointment to visit

**Story** — A follow-up is booked (by records or by the doctor at the end of a visit). On the day, the patient arrives, is checked in and goes to the nurse.
**Requirements** — FR-APT-001…005.

```
RECORDS / DOCTOR   REC-08 book  |  DOC-13 "Book follow-up"
                         │ appointment: Booked
RECORDS (on the day) REC-09 Today ─► Check in ─► visit: Waiting for vitals ─► NUR-01
                                  └► after slot time: Mark as didn't come / Reschedule / Cancel
```

| # | Role | Slice | Change | Signal |
|---|---|---|---|---|
| 1 | Records or doctor | REC-08 / DOC-13 | Appointment **Booked** | REC-09/REC-10 on that date |
| 2 | Records | REC-09 Check in | **Arrived**; visit created/advanced → Waiting for vitals | `clinical.today` → NUR-01 |
| 3 | Nurse → Doctor | NUR-01…04 → DOC-01 | as J01 | — |
| 4 | Doctor | DOC-01 Call in | appointment **Being seen** | REC-09 pill |
| 5 | Doctor | DOC-13 Finish | appointment **Done** | REC-09 pill |
| alt | Records | REC-09 | **Didn't come** / **Cancelled** (reason) / rescheduled | REC-11 history |

**Build order** — REC-08 → REC-09 (check-in) → REC-10 → REC-11; DOC-13 follow-up uses the REC-08 form in a dialog.

**Test** — Book Ama for tomorrow 09:30 → change system date or book today → check in → nurse sees her → doctor finishes → appointment shows "Done". Book another, don't check in, after slot mark "Didn't come" (confirm dialog), check history.
