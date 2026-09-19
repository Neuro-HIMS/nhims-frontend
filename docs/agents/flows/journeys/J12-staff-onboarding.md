# J12 · New staff member to first day

```
FACILITY ADMIN  ADM-03 add staff (job → usual sections) ─► temporary password shown ─► shares privately
NEW STAFF       ALL-01 sign in ─► ALL-02 choose new password ─► lands on their home (07 §3)
                ALL-05 (optional) turn on extra sign-in protection
FACILITY ADMIN  ADM-04 adjust sections later · ADM-07 check who can open what · ADM-12 activity history
```

| # | Role | Slice | Check |
|---|---|---|---|
| 1 | Admin | ADM-03 | account Active + "Must change password" pill |
| 2 | New staff | ALL-01 → ALL-02 | can't open anything before changing password |
| 3 | New staff | landing | menu shows only their sections |
| 4 | Admin | ADM-04 | adding "Laboratory" shows it on their next sign-in |
| 5 | Admin | ADM-05 | deactivated user can't sign in: "Your account is inactive. Ask your facility administrator." |

**Build order** — ADM-02 → ADM-03 → ALL-01 → ALL-02 → ADM-04 → ADM-05 → ADM-06 → ADM-07.

**Test** — Create a nurse; sign in with temporary password → forced change → lands on Nurse station; menu = Nurse sections only; admin adds Laboratory → appears after sign-in; deactivate → sign-in blocked with friendly message.
