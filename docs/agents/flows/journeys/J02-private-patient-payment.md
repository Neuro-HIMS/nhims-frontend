# J02 · Private (self-pay) patient: pay before service

**Story** — Kofi has no valid NHIS. The doctor orders a test and medicines; Kofi pays at the cashier; then the lab and pharmacy can serve him.
**Requirements** — FR-OPD-015, FR-BIL-001…006.

## Swimlane

```
DOCTOR    DOC-05 order test / DOC-07 prescribe ─► items "Waiting to pay"
                                   │ charges added to Kofi's bill
CASHIER   BIL-02 bills ◄───────────┘ ─► BIL-03 bill ─► BIL-05 take payment ─► receipt
                                                          │ items → "Ready"
LAB       LAB-01 row unlocks ◄────────────────────────────┤
PHARMACY  PHA-01 row unlocks ◄────────────────────────────┘
```

## Steps and hand-offs

| # | Role | Slice | Change | Signal |
|---|---|---|---|---|
| 1 | Doctor | DOC-05 / DOC-07 | Orders created with "Waiting to pay" | Bill lines appear (BIL-02); lab/pharmacy rows show disabled with reason |
| 2 | Doctor | DOC-13 | Visit stage → **Waiting to pay** | Cashier list |
| 3 | Cashier | BIL-03 → BIL-05 | Payment recorded (full or part) | Invalidate `clinical.labWorklist`, `clinical.pharmacyQueue`, `clinical.radiologyWorklist` |
| 4 | Lab / Pharmacy | LAB-01 / PHA-01 | Rows become actionable ("Ready for sample" / "Ready to collect") | — |

## Alternate paths

- **Part payment** → only the items covered by the amount become ready? **Backend to confirm** the allocation rule; UI shows which items are paid per line.
- **Patient can't pay** → cashier leaves bill open; doctor sees "Waiting to pay" on the order; nothing is dispensed.
- **Outstanding balance from before** → BIL-03 warning (FR-BIL-008).

## Build it in pieces

BIL-02, BIL-03, BIL-05 after DOC-05/07 and LAB-01/PHA-01 exist. Add the disabled-with-reason state to LAB-01 and PHA-01.

## End-to-end test script

1. Register Kofi as self-pay; take him through NUR-04 → DOC-01.
2. Doctor orders Full blood count and paracetamol → both show "Waiting to pay".
3. Lab and pharmacy see the rows with action disabled: "Waiting for payment at the cashier".
4. Cashier opens Kofi's bill, takes GH₵ amount by Mobile Money → receipt.
5. Within 30s lab and pharmacy rows become actionable.
