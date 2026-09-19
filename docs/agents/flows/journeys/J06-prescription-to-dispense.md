# J06 · Prescription → dispense (including out of stock)

**Requirements** — FR-OPD-008…010, FR-PHX-001…008.

```
DOCTOR    DOC-07 prescribe ─► allergy conflict? ─► blocked until changed/justified
                          └► Prescribed ─► (self-pay: Waiting to pay ─► BIL-05) ─► Ready to collect
PHARMACY  PHA-01 list ─► PHA-02 check (allergy, dose, NHIS limits) ─► PHA-03 dispense (batch) ─► Given
                                                        └► PHA-04 some not in stock ─► Partly given ─► doctor told
STOCK     quantity reduced ─► low stock / expiring alerts (PHA-06, ADM-01)
```

| # | Role | Slice | Status | Signal |
|---|---|---|---|---|
| 1 | Doctor | DOC-07 | Prescribed / Ready to collect | `clinical.pharmacyQueue` |
| 2 | Cashier (self-pay) | BIL-05 | Ready to collect | `clinical.pharmacyQueue` |
| 3 | Pharmacist | PHA-02 → PHA-03 | Given | `pharmacyInventory.all`, NHIS lines → claim |
| 3a | Pharmacist | PHA-04 | Partly given + reason | bell to doctor |
| 4 | System | — | Low stock alert if below reorder level | PHA-06 stat, ADM-01 alerts |

**Build order** — PHA-09 (medicines exist) → PHA-07 (stock exists) → DOC-07 → PHA-01 → PHA-02 → PHA-03 → PHA-04 → PHA-06.

**Test** — Patient with "Penicillin" allergy: doctor tries amoxicillin → blocked `CriticalAlert`. Prescribe paracetamol + a drug with 0 stock → pharmacist dispenses paracetamol, marks other "Not in stock" → status "Partly given", doctor bell. Stock for paracetamol reduced; if under reorder level, "Low stock" pill appears.
