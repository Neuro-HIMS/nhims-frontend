# 05 — UI copy (plain language)

Write the way a friendly senior colleague talks. Short, specific, calm, never blaming.

---

## 1. Rules

1. **No software/system jargon** (full list in §2). If a word only makes sense to a developer, replace it.
2. **Medical words staff use daily are fine** (triage, vitals, OPD, ANC, NHIS, ward, prescription, specimen). Spell out abbreviations the first time on a screen: "OPD (outpatient clinic)" or as the page description.
3. **Sentence case** everywhere: "Register patient", not "Register Patient". Proper nouns keep capitals (Ghana, NHIS, Mobile Money).
4. **Buttons = verb + object**, saying exactly what happens: "Save vitals", "Send to doctor", "Record payment", "Collect sample". Never "Submit", "OK", "Process", "Execute", "Confirm".
5. **Page titles** are nouns for places ("Nurse station", "Bills and payments"); **descriptions** say what you do here in one sentence ("See today's patients, triage them and record vitals.").
6. **Errors** = what happened + what to do next. Never blame ("You entered an invalid…" → "Enter a phone number with 10 digits").
7. **Placeholders show an example**, not an instruction: "e.g. 024 123 4567", not "Enter Phone".
8. **Units always**: "GH₵ 120.00", "37.5 °C", "120/80 mmHg", "68 kg", "SpO₂ 98%".
9. **Dates** `DD/MM/YYYY` in tables; "Mon 21 Sep" in headings; times 24h "14:05". Relative for queues: "Waiting 25 min".
10. **Names before numbers**: show "Ama Mensah · KBTH-12345678-26", never the number alone as a headline.
11. **Never show**: enum values, database IDs/UUIDs, HTTP codes, raw server messages, `null`/`undefined`/`NaN`, "N/A" (use "—" or "Not recorded").
12. **Numbers**: "1 patient", "3 patients" (pluralise correctly).

## 2. Glossary — replace these

| Don't write | Write |
|---|---|
| Module / Your modules / Module access | Section / Your sections / What this person can open |
| Role assignment / Apply default modules for role | Job and access / Give the usual access for this job |
| Access review | Check who can open what |
| Audit log (User / Security / System events) | Activity history (Staff actions / Sign-ins and security / Automatic changes) |
| Two-factor authentication (TOTP) | Extra sign-in protection (code from your phone) |
| Authenticator code (if enabled) | 6-digit code from your phone (only if you've turned this on) |
| One-time reset token | Temporary password — share it with this person privately |
| Encounter / Choose encounter | Visit / Choose a visit |
| Worklist | To do |
| Queue (as a page name) | Waiting list |
| Catalog & setup / Service catalog | Test list and settings / Services and prices |
| Pricing matrix / Legacy prices / Tariffs | Prices by patient type / Old prices (view only) / NHIS prices |
| Exports hub / Standard CSV extracts | Downloads / Download as spreadsheet |
| Configuration / Operational configuration | Settings / Opening hours and booking rules |
| Diagnosis classifications (ICD-11) | Diagnosis list (code shown small and grey) |
| Accruals | Money owed, not yet paid |
| Snapshots | Saved versions |
| SKU | Item code |
| MSISDN / MoMo Txn ref | Mobile Money number / Mobile Money transaction number |
| Lot / batch (to non-pharmacists) | Batch |
| MAR / TPR | Medicines given (MAR) / Temperature, pulse and breathing (TPR) |
| Station | Stage / where the patient is |
| Transition encounter | Send to … |
| Assign clinician | Choose doctor |
| Blockers | Things to finish first |
| Slice / folder slice | *(never shown)* |
| Sync / syncing | Sending / Saved on this computer |
| Payload, endpoint, API, server, backend | *(never shown — rewrite the sentence)* |
| Invalid | "Check …" / "Enter …" |
| Failed to fetch / Could not load X run | We couldn't open this. Check your internet and try again. |
| Unauthorized / Forbidden | You don't have access to this. |
| Seeded / legacy JWT | *(never shown)* |
| Coming soon (with module keys) | This section isn't ready yet. |

### Role names

| Code | Show |
|---|---|
| `RECORDS_OFFICER` | Records officer |
| `NURSE` | Nurse |
| `MEDICAL_OFFICER` | Doctor |
| `MIDWIFE` | Midwife |
| `LAB_SCIENTIST` | Lab scientist |
| `LAB_TECH` | Lab technician |
| `PHARMACIST` | Pharmacist |
| `PHARMACY_TECH` | Pharmacy technician |
| `RADIOGRAPHER` | Radiographer |
| `FINANCE_OFFICER` | Finance officer |
| `BILLING_OFFICER` | Cashier |
| `HIO` | Health information officer |
| `FACILITY_ADMIN` | Facility administrator |
| `SUPER_ADMIN` | System administrator |

Put this map in `lib/status-labels.ts` as `ROLE_LABELS`.

## 3. Menu and page names (authoritative)

These match `config/navigation.ts` — sub-tabs are the target names; rename existing `*_NAV` constants to these.

| Section (menu label) | Page description | Sub-tabs (max 5) |
|---|---|---|
| Home | Your facility at a glance. | Overview · Key numbers · Alerts |
| Find or register a patient | Find a patient or register someone new. | Find a patient · Register new patient · Patient details · Visit history |
| Appointments | Book and manage patient appointments. | Book · Today · Calendar · Past appointments |
| Emergency | Patients who need urgent care now. | Board · Triage · Handover |
| Outpatient clinic (OPD) | See patients, record notes and decide next steps. | Patients waiting · Consultation · Referrals · Follow-ups |
| Nurse station | See today's patients, triage them and record vitals. | Today's patients · Triage · Find a patient · Patient folder |
| Wards | Beds, admissions, ward care and discharge. | Beds · Admissions · Ward care · Discharge |
| Antenatal care (ANC) | Care for pregnant women from booking to delivery. | Clients · Visits · High-risk mothers · Deliveries |
| Laboratory | Collect samples, enter results and flag critical values. | To do · Enter results · Done today · Find a patient · Tests and settings |
| Imaging (Radiology) | Scans requested by doctors, and their reports. | To do · Reports |
| Pharmacy | Dispense prescriptions and manage stock. | Prescriptions waiting · Find a patient · Dispense · Stock |
| Bills and payments | Create bills, take payments and print receipts. | Overview · Bills · New bill · Payments |
| Prices and revenue | Set prices, track money coming in and manage NHIS claims. | Overview · Services and prices · Revenue · NHIS claims · More (Old prices, NHIS reports) |
| Reports | Monthly GHS report and facility reports. | Monthly GHS report (DHIMS2) · Facility monthly report · Downloads |
| Staff and access | Staff accounts and what each person can open. | Staff · Job and access · Check who can open what |
| Facility settings | Your facility's details, services and rules. | Facility details · Services · Opening hours and booking rules · Diagnosis list |
| Activity history | Who did what, and when. | All activity |

## 4. Message templates

| Situation | Template |
|---|---|
| Saved + hand-off | "{Thing} saved. {Patient} is now {where}." → "Vitals saved. Ama Mensah is now waiting for the doctor." |
| Sent | "Sent to {place}. They'll see {patient} in their list now." |
| Payment | "Payment of GH₵ {amount} recorded. Receipt {number} is ready to print." |
| Partial | "{n} of {m} medicines dispensed. The rest are marked as out of stock." |
| Load failed | "We couldn't load {thing}. Check your internet and try again." |
| Save failed | "{Thing} wasn't saved. {Reassurance if money/meds}. Try again." |
| Empty queue | "No {people} waiting. {Reassurance}." |
| Search none | "No {thing} found for "{query}". {How to widen}." |
| Confirm title | "{Verb} {specific thing}?" → "Discharge Kofi Asante from Male Medical Ward?" |
| Confirm buttons | "Keep {thing}" / "Yes, {verb} {thing}" |

## 5. Status label maps (put all in `lib/status-labels.ts`)

| Domain | Code → label (tone) |
|---|---|
| Appointment | SCHEDULED → Booked (pending) · CHECKED_IN → Arrived (info) · IN_PROGRESS → Being seen (warning) · COMPLETED → Done (success) · NO_SHOW → Didn't come (error) · CANCELLED → Cancelled (neutral) |
| Visit (encounter) | see `03-components.md` §3 |
| Triage | EMERGENCY → Emergency · URGENT → Urgent · SEMI_URGENT → Semi-urgent · ROUTINE → Routine · pending → Not triaged yet (neutral) |
| Lab order | ORDERED → Requested (neutral) · PAID / CLAIMED → Ready for sample (pending) · IN_PROGRESS → Being tested (info) · COMPLETED → Result entered (purple) · AUTHORISED → Result ready (success) · CANCELLED → Cancelled (neutral) |
| Lab flag | NORMAL → Normal · LOW → Low ↓ · HIGH → High ↑ · CRITICAL → Critical ⚠ |
| Imaging | ORDERED → Requested (neutral) · READY → Ready for scan (pending) · IN_PROGRESS → Scanning (info) · COMPLETED → Report ready (success) · CANCELLED → Cancelled (neutral) |
| Prescription | ORDERED → Prescribed (neutral) · AWAITING_PAYMENT → Waiting to pay (pending) · READY → Ready to collect (info) · PARTIALLY_DISPENSED → Partly given (warning) · DISPENSED → Given (success) · CANCELLED → Cancelled (neutral) |
| Bill | draft → Being prepared (neutral) · open/invoiced → Waiting for payment (pending) · part-paid → Part paid (warning) · paid → Paid (success) · cancelled → Cancelled (neutral) · NHIS → Covered by NHIS (info) |
| NHIS claim | Draft (neutral) · Ready to send (info) · Sent (purple) · Accepted (success) · Questioned (warning) · Rejected (error) |
| NHIS membership | ACTIVE → NHIS active · INACTIVE → NHIS expired · SUSPENDED → NHIS suspended · UNKNOWN / pending → NHIS not confirmed yet |
| Admission | ADMITTED → On the ward (info) · DISCHARGED → Discharged (success) · TRANSFERRED → Moved to another ward (purple) |
| Bed | Free (success) · Occupied (info) · Being cleaned (pending) · Reserved (purple) · Out of use (neutral) |
| Referral | Sent (purple) · Accepted (success) · Declined (error) · Done (success) |
| Staff account | Active (success) · Inactive (neutral) · Must change password (pending) · Locked (error) |
| Stock | In stock (success) · Low stock (warning) · Out of stock (error) · Expiring soon (warning) · Expired (error) |
| DHIMS2 report | Not started (neutral) · Needs checking (warning) · Ready to send (info) · Sent (success) · Send failed (error) |

Where the backend enum differs from the above, map the real enum from `types/*.types.ts` — the labels and tones are what matter.
