# J13 · Referral (internal or external)

**Requirements** — FR-OPD-011.

```
DOCTOR A   DOC-09 refer (internal: clinic/doctor · external: facility) + summary ─► Sent ─► print letter
DOCTOR B   OPD "Referrals" tab (internal) ─► Accept ─► patient appears in their waiting list ─► consult (DOC-02…)
                                            └► Decline (reason) ─► Doctor A bell
EXTERNAL   printed referral letter travels with the patient; referral marked Done when closed
```

| # | Role | Slice | Status | Signal |
|---|---|---|---|---|
| 1 | Doctor A | DOC-09 | Sent | `referralInbox` for receiving clinic/doctor |
| 2 | Doctor B | DOC-09 inbox | Accepted / Declined | bell to Doctor A |
| 3 | Doctor B | DOC-01… | patient consulted | — |
| 4 | Either | — | Done | folder Referrals tab |

**Build order** — DOC-09 (send + letter) → inbox + decide → wire accepted referral into DOC-01 list.

**Test** — Doctor A refers Ama to the Eye clinic; letter prints; Doctor B (Eye) accepts; Ama appears in Doctor B's waiting list; Doctor A's folder shows "Accepted".
