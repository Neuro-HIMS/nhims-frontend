# 01 — Product and users

## What NHIMS is

A web-based hospital management system for Ghanaian health facilities (Ghana Health Service and private hospitals). It covers patient registration, appointments, triage and vitals, outpatient consultations, wards, antenatal care, laboratory, imaging, pharmacy and stock, bills and payments, NHIS claims, monthly GHS (DHIMS2) reporting, staff access and facility settings.

## Who uses it

| Person | Role key (code only) | Main job | Starts their day at |
|---|---|---|---|
| Records officer | `RECORDS_OFFICER` | Find/register patients, start visits, book appointments | Find a patient |
| Nurse | `NURSE` | Triage, vitals, waiting list, ward care (MAR/TPR) | Nurse station — today's visits |
| Doctor | `MEDICAL_OFFICER` | Consult, diagnose, order tests/medicines, admit, refer, discharge | OPD — patients waiting for me |
| Midwife | `MIDWIFE` | ANC booking and visits, risk flags, delivery, postnatal | Antenatal care — today's clients |
| Lab scientist / technician | `LAB_SCIENTIST`, `LAB_TECH` | Collect samples, enter and authorise results, critical values | Laboratory — tests to do |
| Radiographer | `RADIOGRAPHER` | Imaging requests, perform, report | Imaging — scans to do |
| Pharmacist / technician | `PHARMACIST`, `PHARMACY_TECH` | Dispense, stock, suppliers | Pharmacy — prescriptions waiting |
| Billing officer / cashier | `BILLING_OFFICER` | Bills, payments, receipts | Bills and payments |
| Finance officer | `FINANCE_OFFICER` | Prices, revenue, NHIS claims | Prices and revenue |
| Health information officer | `HIO` | Monthly GHS (DHIMS2) report, data quality | Reports |
| Facility administrator | `FACILITY_ADMIN` | Staff accounts and access, facility settings, activity history | Home dashboard |
| Super administrator | `SUPER_ADMIN` | Everything, across facilities | Home dashboard |

## Their context (design for this)

- **Time pressure:** queues of waiting patients; every extra click costs. Put the next action where the eye lands.
- **Interruptions:** staff jump between patients. Always show *which patient* is open (patient banner) and keep unsaved work visible.
- **Shared, older computers; 1280px laptops and 768px tablets.** Readable at a glance, no tiny text, big click targets (≥ 40×40px).
- **Slow or dropping internet.** Skeletons, not blank screens. Saved-on-this-computer messaging when offline. Don't lose typed data on errors.
- **Not tech-savvy.** Plain words. No codes, IDs or system messages as headlines.
- **Patient safety.** Allergies, critical results and triage urgency must be impossible to miss and identical everywhere.

## Design principles (in priority order)

1. **Safe** — critical information is prominent, consistent and never color-only.
2. **Obvious** — each screen has one job, a clear title, a one-line description and one primary action.
3. **Fast** — the most common task is the first thing on the screen; search is always one click away.
4. **Calm** — monochrome base; color only means something. Friendly, blame-free wording.
5. **Consistent** — the same pattern for every "waiting list → patient → record → next step" flow, in every department.
6. **Forgiving** — confirm before anything destructive, never clear what the user typed, tell them how to recover.

## The universal work pattern

Almost every clinical and service area follows the same four steps. Build them the same way everywhere:

```
1. Waiting list (table, most urgent/oldest first, filters, search)
      ↓ click a row
2. Patient (patient banner + the task-specific panel)
      ↓ record / enter / dispense / pay
3. Save (validation, success toast, status changes)
      ↓
4. Next step (send to the next station, print, book follow-up) → patient appears in the next role's waiting list
```
