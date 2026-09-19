# Cashier / billing officer (`BIL`)

**Who** — front-of-house payment staff. Bills, payments (cash, Mobile Money, card), receipts, balances. **No clinical details.**
**Lands on** — `/billing?view=dashboard`
**Sections** — Bills and payments; Prices and revenue (view); Reports.
**Folder view** — `BILLING` slice (services rendered and prices only).

```
Orders / dispense / discharge create charges ─► BIL-02 Bills waiting ─► BIL-03 Bill ─► BIL-05 Take payment ─► receipt
   paid items unlock ─► Lab (LAB-01) / Pharmacy (PHA-01) / Imaging (RAD-01)
NHIS patient ─► charges go to the claim (FIN-05); only non-covered items are billed
```

---

### BIL-01 · Overview
**Requirements** — FR-BIL-004.
**Where** — `/billing?view=dashboard`
**Existing code** — `components/billing/views/billing-dashboard-view.tsx` (Evolve).
**Screen** — Page card "Bills and payments" — "Create bills, take payments and print receipts." Actions: primary "New bill". Stat cards: Waiting for payment (count + GH₵), Collected today (GH₵), Part paid, Cancelled today. "Collected today by method" (Cash / Mobile Money / Card) small bar chart (dataviz rules). Table "Waiting for payment" (top 10) → BIL-03.
**Data** — `billingService.dashboard()`.

### BIL-02 · Bills
**Where** — `/billing?view=bills`
**Existing code** — `components/billing/views/bills-view.tsx` (Evolve onto `DataTable`).
**Screen** — Toolbar: search (patient, bill number), filters (status, date, how they pay). Table: bill number, patient, date, items count, total, paid, balance, status pill (`BILL_STATUS`), action "Take payment" / "Open".
**Data** — `listBills`; refetch 30s.
**Empty** — first use: "No bills yet. Bills are created automatically when doctors order services, or you can create one." [New bill]

### BIL-03 · Bill details
**Requirements** — FR-BIL-001, 002, 006.
**Where** — `/billing?view=bills&billId=…`
**Existing code** — `bill-detail-view.tsx`, `charge-builder.tsx` (Evolve).
**Screen** — Banner (name, hospital number, NHIS pill). Card "Items": table (service, where from — Consultation/Lab/Pharmacy/Ward, quantity, price, covered by NHIS pill, amount); "Add item" (secondary) via `ChargeBuilder`; remove item (ghost trash + `ConfirmDialog`). Totals block: Subtotal, Discount ("Apply discount" with reason), NHIS covers, **Patient pays** (large), Paid so far, Balance. Primary "Take payment". Tertiary "Print bill". `destructive-outline` "Cancel bill" (`ConfirmDialog` + reason).
**Data** — `getInvoice`, `addCharges`, `removeCharge`, `applyDiscount`, `invoiceBill`, `cancelBill`, `chargeKinds`.
**Rules** — Outstanding balance from earlier visits shows `InlineNotice tone="warning"` "Ama has GH₵ 45.00 unpaid from 02/09/2026." (FR-BIL-008).

### BIL-04 · New bill
**Where** — `/billing?view=new` · **Existing** — `new-bill-view.tsx` (Evolve).
**Screen** — Step 1 patient (`PatientSearchPanel`, or "Walk-in customer" for over-the-counter), Step 2 items (`ChargeBuilder` from services and prices), Step 3 check → primary "Create bill" → BIL-03.
**Data** — `createBill`, `addCharges`.

### BIL-05 · Take payment and print receipt
**Requirements** — FR-BIL-003, 005, 006.
**Where** — dialog from BIL-02/03.
**Existing code** — `components/billing/views/payments-view.tsx` (payment dialog part) (Evolve).
**Screen** — Dialog "Take payment — Ama Mensah": amount due (large), amount received (`MoneyInput`, default = balance; less = part payment), method (Cash / Mobile Money / Card / Bank). Mobile Money → network, Mobile Money number, transaction number. Cash → "Change to give: GH₵ 5.00". Primary "Record payment". Then `SuccessPanel`: "Payment of GH₵ 120.00 recorded. Receipt R-000812." Actions: primary "Print receipt", "Send receipt by SMS" (**backend needed**), "Back to bills".
**Data** — `recordPayment(billId, …)`, `paymentMethods`. Invalidate bill, lists, `clinical.labWorklist`, `clinical.pharmacyQueue`, `clinical.radiologyWorklist`.
**States** — Error: "Payment wasn't recorded. Nothing was charged. Try again." (sticky).
**Hand-off** — paid lab/imaging/pharmacy items become "Ready" for those teams.
**Done when** — the lab/pharmacy row unlocks within 30s of payment.

### BIL-06 · Payments
**Where** — `/billing?view=payments`
**Screen** — Date range (default today), method filter; table: time, receipt number, patient, method, amount, taken by. Footer totals by method. "Download as spreadsheet". Reprint receipt from row menu.
**Data** — `listPayments`.

### BIL-07 · Reverse a payment (admins/finance)
**Screen** — Row menu "Reverse payment" → `ConfirmDialog` with reason; shows as neutral "Reversed" pill. **Backend to confirm** endpoint.
