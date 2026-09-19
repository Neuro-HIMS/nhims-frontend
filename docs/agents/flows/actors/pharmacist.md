# Pharmacist and pharmacy technician (`PHA`)

**Who** — dispensary staff. Review and dispense prescriptions, manage stock, suppliers and the medicine list.
**Lands on** — `/pharmacy?view=queue`
**Sections** — Pharmacy.
**Folder view** — `PHARMACY` slice (demographics, allergies, prescriptions — no clinical notes).

```
(DOC-07 / DOC-12) ─► PHA-01 Prescriptions waiting ─► PHA-02 Check prescription ─► PHA-03 Dispense ─┬─► done
                                                                                                    └─► PHA-04 Partly given (out of stock) ─► doctor told
Stock: PHA-06 Stock ─► PHA-07 Receive stock · PHA-08 Adjust · PHA-09 Medicines list · PHA-10 Suppliers · PHA-11 Spreadsheet import/export
```

---

### PHA-01 · Prescriptions waiting
**Requirements** — FR-PHX-001.
**Where** — `/pharmacy?view=queue` (tab "Prescriptions waiting")
**Existing code** — `components/pharmacy/pharmacy-workspace.tsx` (Evolve onto `WaitingList`).
**Screen** — Page card "Pharmacy" — "Dispense prescriptions and manage stock." Stat row: Ready to collect · Waiting to pay · Partly given · Low stock items (links to PHA-06). `WaitingList`: wait, patient, number of medicines, prescriber, how they pay (NHIS pill / Self-pay), status pill (`RX_STATUS`), action "Dispense".
**Data** — `clinicalService.pharmacyWorklist()`, key `clinical.pharmacyQueue`, refetch 30s.
**Rules** — "Waiting to pay" rows: action disabled with reason "Waiting for payment at the cashier".
**Empty** — "No prescriptions waiting."

### PHA-02 · Check the prescription
**Requirements** — FR-PHX-002.
**Where** — `/pharmacy?view=dispense&prescriptionId=…`
**Existing code** — `components/pharmacy/pharmacy-dispense-panel.tsx`, `pharmacy-patient-rx-view.tsx` (Evolve).
**Screen** — `PatientBanner` (allergies prominent). Prescription card: prescriber, date; lines (drug, strength, form, dose, how often, how long, quantity, stock pill). Warnings: allergy conflict (`CriticalAlert`), dose outside normal range, NHIS quantity limits ("NHIS covers up to 20 tablets"). Actions per line: "Query with doctor" (sends note; **backend to confirm**).
**Data** — `getPrescription`, `stockOverview`.

### PHA-03 · Dispense
**Requirements** — FR-PHX-003, 004, 008.
**Screen** — Per line: batch picker (earliest expiry first; shows batch number, expiry date, quantity left; expiring-soon warning pill), quantity given (defaults to prescribed). Counselling note (optional). Primary "Dispense and print labels".
**Data** — `dispensePrescription`, `openPharmacyDispenseLabelPdf`; invalidate `clinical.pharmacyQueue`, `clinical.prescription(id)`, `pharmacyInventory.all`.
**States** — Toast "3 medicines given to Ama Mensah. Labels are printing." If stock changed meanwhile (409): "Stock for Amoxicillin changed while you were working. Check the batch and try again."
**Hand-off** — NHIS lines join the claim (FIN-05); low-stock/expiry alerts to pharmacist + admin.

### PHA-04 · Partly given / out of stock
**Requirements** — FR-PHX-007.
**Screen** — Line option "Not in stock" or quantity < prescribed → reason required (Out of stock / Patient declined / Other). Status "Partly given"; doctor notified; patient told where else to buy ("Print list of medicines not given").

### PHA-05 · Find a patient's prescriptions
**Where** — `/pharmacy?view=search` · **Existing** — `pharmacy-search-view.tsx` (Evolve to shared `PatientSearchPanel`; placeholder "Hospital number, prescription number or name").

### PHA-06 · Stock
**Requirements** — FR-PHX-005, 006, 010.
**Where** — `/pharmacy?view=inventory` (tab "Stock"; inner tabs via `inventory-subnav.tsx`: Stock · Movements · Medicines list · Suppliers).
**Existing code** — `components/pharmacy/inventory/**` (Evolve onto `DataTable`; `filter-chip-bar.tsx` → `TableToolbar` filters).
**Screen** — Stat row: Low stock · Out of stock · Expiring in 30 days · Expired. Table: medicine, form/strength, quantity, reorder level, nearest expiry, status pill (In stock / Low / Out / Expiring soon), actions: "Receive stock", "Adjust", "See batches" (lots dialog). Header actions: primary "Receive stock", secondary "Import from spreadsheet", tertiary "Download stock list".
**Data** — `stockOverview`, `listLots`; keys `pharmacyInventory.overview/lots`.

### PHA-07 · Receive stock
**Requirements** — FR-PHX-009.
**Existing code** — `inventory/receive-stock-dialog.tsx` (Evolve).
**Screen** — Dialog: supplier, invoice number, then lines: medicine, batch number, expiry date, quantity, cost price. Primary "Add to stock".
**Data** — `receiveStock`. Toast "Stock received: 3 items added."

### PHA-08 · Adjust stock and see movements
**Existing code** — `inventory/adjust-stock-dialog.tsx`, `movements-page.tsx`.
**Screen** — Adjust: batch, new quantity or +/−, reason (Damaged, Expired, Count correction, Returned) — `ConfirmDialog` for write-offs. Movements: table (date, medicine, batch, change +/−, reason, by whom).
**Data** — `adjustLot`, `listMovements`.

### PHA-09 · Medicines list (formulary)
**Requirements** — FR-PHX-011. Pharmacists only.
**Existing code** — `inventory/inventory-item-form-dialog.tsx`, stock pages.
**Screen** — Table: name, strength, form, item code, reorder level, NHIS covered (pill), active. "Add medicine" → form.
**Data** — `list/create/update/deactivateInventoryItem`.

### PHA-10 · Suppliers
**Existing code** — `inventory/suppliers/*` (Evolve; the placeholders "Enter Street Number" etc. → examples).
**Data** — suppliers CRUD. Deactivate via `ConfirmDialog`.

### PHA-11 · Import / download stock spreadsheet
**Screen** — `UploadDropzone` ("Click to upload or drag and drop · Spreadsheet (.csv), max 20 MB") beside "Download template" block. Result: "42 rows added, 3 need fixing" with a table of problems in plain words.
**Data** — `importStockCsv`, `exportStockCsv`.
