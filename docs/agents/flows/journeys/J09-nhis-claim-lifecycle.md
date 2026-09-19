# J09 · NHIS claim lifecycle

**Requirements** — FR-NHI-003…012.

```
SYSTEM   visit finished / discharge ─► claim Draft (covered consultation, tests, medicines, ward days)
FINANCE  FIN-05 Draft tab ─► FIN-06 check lines (invalid items flagged) ─► Ready to send
         FIN-07 send selected ─► Sent ─► NHIA response ─► Accepted | Questioned | Rejected
         FIN-08 Needs action ─► fix lines / add note ─► resend ─► Sent …
         FIN-09 monthly summary (accepted %, top rejection reasons)
```

| # | Role | Slice | Status |
|---|---|---|---|
| 1 | System | (J01/J07 end) | Draft |
| 2 | Finance | FIN-06 | Ready to send |
| 3 | Finance | FIN-07 | Sent (or saved to send later if NHIS unreachable) |
| 4 | NHIA | — | Accepted / Questioned / Rejected (+ reason) |
| 5 | Finance | FIN-08 | Sent again |
| 6 | Finance | FIN-09 | monthly summary |

**Words** — rejection reasons shown in plain language (e.g. "The patient's NHIS wasn't active on the visit date.", "This medicine isn't on the NHIS medicines list.", "A claim for this visit was already sent.").

**Build order** — FIN-05 → FIN-06 → FIN-07 → FIN-08 → FIN-09 (FIN-07 response handling needs backend confirmation).

**Test** — Finish an NHIS visit → claim Draft with correct lines. Mark ready → send → simulate rejection → appears in "Needs action" with reason → edit → resend → history shows each step.
