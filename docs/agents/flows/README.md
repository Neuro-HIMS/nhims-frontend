# Flows: actors and journeys

Two views of the same system:

- **Actor files** (`actors/`) show everything **one role** does, split into **slices**. Build and ship one slice at a time.
- **Journey files** (`journeys/`) follow **one patient across roles**, end to end. They list the slices involved and the **hand-offs** that connect them. Use them to test the whole thing and to make sure no hand-off is missed.

## Actor files

| File | Role(s) | Slice prefix |
|---|---|---|
| [shared-all-staff](actors/shared-all-staff.md) | Everyone | `ALL` |
| [records-officer](actors/records-officer.md) | Records officer | `REC` |
| [nurse](actors/nurse.md) | Nurse | `NUR` |
| [doctor](actors/doctor.md) | Doctor (medical officer) | `DOC` |
| [midwife](actors/midwife.md) | Midwife | `MID` |
| [lab-staff](actors/lab-staff.md) | Lab scientist, lab technician | `LAB` |
| [radiographer](actors/radiographer.md) | Radiographer | `RAD` |
| [pharmacist](actors/pharmacist.md) | Pharmacist, pharmacy technician | `PHA` |
| [cashier](actors/cashier.md) | Billing officer (cashier) | `BIL` |
| [finance-officer](actors/finance-officer.md) | Finance officer | `FIN` |
| [health-information-officer](actors/health-information-officer.md) | HIO | `HIO` |
| [facility-admin](actors/facility-admin.md) | Facility administrator | `ADM` |
| [super-admin](actors/super-admin.md) | System administrator | `SUP` |

Foundation slices (`FND`) that every flow depends on are in [../build-plan.md](../build-plan.md).

## Journey files

| ID | Journey | Roles |
|---|---|---|
| [J01](journeys/J01-walk-in-opd-visit.md) | Walk-in outpatient visit (NHIS patient) | Records → Nurse → Doctor → Lab → Doctor → Pharmacy → Cashier |
| [J02](journeys/J02-private-patient-payment.md) | Private (self-pay) patient: pay before service | Doctor → Cashier → Lab / Pharmacy |
| [J03](journeys/J03-appointment-to-visit.md) | Booked appointment to visit | Records → Nurse/Doctor |
| [J04](journeys/J04-lab-request-to-result.md) | Lab request → result → doctor (incl. critical values) | Doctor → Lab → Doctor |
| [J05](journeys/J05-imaging-request-to-report.md) | Imaging request → report | Doctor → Radiographer → Doctor |
| [J06](journeys/J06-prescription-to-dispense.md) | Prescription → dispense (incl. out of stock) | Doctor → Pharmacist |
| [J07](journeys/J07-admission-to-discharge.md) | Admission → ward care → discharge → bill | Doctor → Nurse → Doctor → Cashier |
| [J08](journeys/J08-anc-to-delivery.md) | ANC booking → visits → delivery → postnatal | Records → Midwife → Doctor |
| [J09](journeys/J09-nhis-claim-lifecycle.md) | NHIS claim: draft → sent → accepted / rejected → resent | Cashier → Finance officer |
| [J10](journeys/J10-dhims2-monthly-report.md) | Monthly GHS (DHIMS2) report | HIO |
| [J11](journeys/J11-emergency-arrival.md) | Emergency arrival | Nurse/Doctor → Records → Ward |
| [J12](journeys/J12-staff-onboarding.md) | New staff member to first day | Facility admin → New staff |
| [J13](journeys/J13-referral.md) | Referral (internal or external) | Doctor → Doctor / other facility |

## Slice template

Every slice in an actor file uses this shape — keep it when you add new ones:

```md
### XXX-00 · Short name
**Goal** — one sentence from the user's point of view.
**Requirements** — FR-… IDs.
**Where** — route + view (+ URL params).
**Existing code** — file paths and whether to Evolve / Build.
**Screen** — layout top to bottom.
**Data** — service methods and query keys.
**Rules** — permissions, validation, business rules.
**States** — loading / empty / error / success specifics (only what's special; the defaults in 04 always apply).
**Hand-off** — who sees what next, what to invalidate.
**Done when** — acceptance criteria (testable, from the user's side).
**Depends on** — slice IDs.
```

"Backend needed" notes mark places where the current `services/` has no endpoint — build the UI with a typed stub and list the need; don't invent the API.

## Visit stages (shared vocabulary)

The backend tracks where a patient is in a visit (`EncounterStatus` / `EncounterStation`). On screen these are always words:

```
Booked → Arrived → Waiting for vitals → Waiting for doctor → With doctor
      → At the lab / At the pharmacy / Waiting to pay → (back to doctor) → Visit finished
                                                     ↘ Admitted → Discharged
```

Moving a patient between stages uses `clinicalService.transition(encounterId, …)`; buttons are named for the destination ("Send to doctor", "Send to lab", "Send to cashier").
