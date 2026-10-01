# Backend gaps

One entry per missing or changed endpoint the frontend needs, written for the backend engineer. Seeded from `build-plan.md`'s "Backend needs found while mapping flows" table, plus the Stage 0 single-facility migration. Keep this ordered by journey/stage, no duplicates — add an entry whenever a slice is built against a typed stub (`// TODO(backend): …`).

---

### STAGE0-01 · Facility singleton endpoint  (needed by: Stage 0)
- Method & path: `GET /facility`, `PUT /facility`
- Request (`PUT`): `FacilitySettingsUpdateRequest` — same body the old `PUT /facilities/{id}` accepted
- Response: `ApiResponse<FacilitySettingsDto>` — same shape as today, scoped to the server's one facility
- Behaviour: no id in the path — the backend resolves "the facility" from the server/deployment, not from a path param
- Frontend status: `services/facility.service.ts` calls `/facility` first; if it 404s or 405s, it falls back once to the legacy `/facilities/{id}` (using the session's `facilityId`) and logs a dev-only warning. Remove the fallback once `/facility` ships.

### STAGE0-02 · Stop requiring `facilityId` on user create  (needed by: Stage 0)
- Method & path: `POST /users` (`usersService.create`)
- Change: `facilityId` should be optional/ignored — the backend assigns the server's one facility to every new account
- Frontend status: `facilityId` is no longer sent by `UsersManagementWorkspace`; the field stays optional and `@deprecated` on `CreateUserPayload` for old backends that still expect it

### ALL-06 · Notifications feed for the header bell  (needed by: ALL-06)
- Method & path: `GET /notifications` — not yet defined server-side; eventually compose from `labCriticalAlertsInbox` (doctor), `referralInbox`, stock overview low/expiring (pharmacist), or a dedicated feed
- Frontend status: `services/notifications.service.ts` calls the real endpoint (will 404 today); with `NEXT_PUBLIC_MOCK_AREAS=notifications` it shows `services/mocks/fixtures/notifications.ts` instead, refreshed every 30s. Without it, the bell correctly shows the empty state ("You're all caught up.") rather than an error.

### ALL-04 · Profile edit  (needed by: ALL-04)
- Method & path: not yet defined
- Frontend status: My profile is read-only until this exists

### ALL-08 · Feedback submission  (needed by: ALL-08)
- Method & path: `POST /feedback` — not yet defined server-side
- Frontend status: `services/feedback.service.ts` calls the real endpoint (will 404 today); with `NEXT_PUBLIC_MOCK_AREAS=feedback` it succeeds without a network call, so the dialog's happy path is fully testable

### REC-05 · Single "start walk-in visit" call  (needed by: REC-05, J01)
- Today: book + check in as two calls
- Frontend status: built against the two-call workaround (`components/records/start-visit-dialog.tsx` calls `appointmentsService.book()` then `.checkIn()`). Works, but a single call would remove the window where a booked-but-not-checked-in appointment could be left behind if the second call fails.

### REC-01 · Patient search summary is missing age and last-visit date
- Method & path: `GET /patients/search` → `PatientSummaryDto`
- Need: `PatientSummaryDto` has `dobDisplay` but no raw birth date (so age can't be derived) and no last-visit date
- Frontend status: `patient-result-card.tsx` shows DOB instead of age, and omits last-visit date, per the spec's result-card layout

### REC-08 · No time-slot availability endpoint  (needed by: REC-08)
- Need: the spec's booking screen shows "time slot chips (free / taken — words not only color)" — this needs a per-clinician/per-day list of free/taken slots, which no current endpoint provides
- Frontend status: `booking-form.tsx` keeps a plain time input (`type="time"`) instead of slot chips. Not blocking — booking still works — but there's no way to see at a glance whether a time is already taken by another patient

### REC-10 · Appointment details popover not built
- The spec calls for "each booking a small card with time + name + status pill. Click → details popover with the same actions as REC-09" on the calendar view
- Frontend status: `calendar-view.tsx` lets you click a day to see that day's list (with a status pill), but there's no popover with check-in/reschedule/cancel actions from the calendar itself — those all happen from Today's queue (`?view=queue`) today. Scoped down given the size of Stage 4; worth a follow-up if calendar-first workflows turn out to matter

### NUR-01 · Can't tell "not yet triaged" from "triaged as Routine" in the queue list
- Need: the actor doc's NUR-01 screen wants a "Not triaged yet" pill distinct from an actual Routine triage decision
- `EncounterDto.status` has one combined `AT_VITALS` station covering both "hasn't been triaged" and "triaged, still needs vitals" — and `EncounterDto.priority` defaults to something before any triage is recorded, indistinguishable from a genuine Routine choice, without an extra per-row call to check for a triage record
- Frontend status: `visits-queue-view.tsx`'s stat row and status pill follow the real backend granularity (Waiting for vitals / Waiting for doctor / With doctor / Finished today) rather than inventing a distinction the list endpoint can't actually support. The "Start triage" vs "Record vitals" action label is derived from `status` (SCHEDULED/CHECKED_IN → "Start triage", AT_VITALS → "Record vitals") as a reasonable proxy instead

### NUR-02/03 · `TriagePriorityCode` (4 values) vs `EncounterDto.priority` (3 values)
- `RecordTriagePayload.priority` accepts `SEMI_URGENT`, but `EncounterDto.priority`'s type is only `ROUTINE | URGENT | EMERGENCY` — need to confirm the backend actually persists and returns `SEMI_URGENT` on the encounter after a semi-urgent triage, or whether it collapses to one of the other three
- Frontend status: `triage-view.tsx` sends `SEMI_URGENT` as recorded; `PatientBanner`/`visits-queue-view.tsx` display whatever `encounter.priority` comes back as, without assuming it round-trips cleanly

### REC-02 · Duplicate check can only search by name
- Method & path: `POST /patients/search` (`mode: "name"`)
- Need: the actor doc asks for a name + DOB + phone duplicate search; the search endpoint only supports `id` / `nhis` / `name` modes, no combined filter
- Frontend status: `registration-view.tsx`'s duplicate check searches by name only after step 1 and shows all name matches for the officer to eyeball — a reasonable approximation, not a true DOB/phone-narrowed match

### DOC-04 · Save diagnoses on a visit — resolved, no new endpoint needed  (needed by: DOC-04)
- Diagnoses are saved on the consultation note (`POST/PUT /clinical/encounters/{id}/consultation-notes`: `provisionalClassificationId`, `principalClassificationId`, new/old case, `additionalDiagnoses`). The note **requires** a principal + provisional diagnosis, so the frontend sets provisional = the doctor's "main" diagnosis and keeps the notes as a local draft until one is chosen.
- Frontend status: built on the existing endpoint (`components/clinical/consultation/`).
- Nice to have: let a note be saved **without** a diagnosis (history/exam first, diagnosis later) so notes reach the record — and other staff — sooner.

### DOC-04-notifiable · "Must be reported" flag on diagnoses  (needed by: DOC-04, HIO-07)
- Method & path: add `notifiable: boolean` (and optionally `reportWithinHours`) to `ClinicalConditionDto` from `GET /clinical/conditions`
- Behaviour: set per diagnosis in the facility's diagnosis list (IDSR notifiable diseases)
- Frontend status: stopgap name match in `lib/notifiable-diseases.ts`

### DOC-04-surveillance · Flag a case for disease surveillance  (needed by: DOC-04, HIO-07)
- Method & path: `POST /clinical/surveillance-flags`
- Request: `{ encounterId: string; patientId: string; conditionId: string; conditionName: string }`
- Response: `ApiResponse<{ id; encounterId; patientId; conditionId; conditionName; flaggedAt }>` — idempotent per encounter + condition
- Frontend status: mocked in `services/mocks/handlers/surveillance.ts` (area `surveillance`)

### DOC-13-force-reason · Reason when finishing a visit with results outstanding  (needed by: DOC-13)
- Method & path: `POST /clinical/encounters/{id}/complete?force=true` — add a `reason` (body or param) and keep it on the visit
- Frontend status: the doctor must type a reason before "Finish anyway", but it can't be sent yet (`// TODO(backend)` in `next-step-card.tsx`)

### ADM-11-empty-description · Creating a diagnosis with `description: ""` returns 500  (bug)
- Method & path: `POST /clinical/conditions` with `"description": ""` → `500 Unexpected server error`; omitting it or sending text works
- Frontend status: not affected (the form omits an empty description)

### DOC-07 · Allergy / interaction check on prescribe  (needed by: DOC-07)
- Frontend status: not built yet

### NUR-10 · Bed cleaning state; discharge confirmation by nurse  (needed by: NUR-10)
- Frontend status: not built yet

### NUR-11 · Quick emergency registration; payment exemption for emergency orders  (needed by: NUR-11)
- Frontend status: not built yet

### MID-05, MID-06, MID-07 · ANC schedule rules; baby registration linked to mother; postnatal visits
- Frontend status: not built yet

### RAD-03 · Image/PDF attachment upload  (needed by: RAD-03)
- Frontend status: not built yet

### PHA-02, PHA-04 · Query prescription with doctor; partial-dispense reason
- Frontend status: not built yet

### BIL-05, BIL-07 · Part-payment allocation rule; SMS receipt; payment reversal
- Frontend status: not built yet

### FIN-07 · Batch send to NHIA and response intake
- Frontend status: not built yet

### HIO-01, HIO-03, HIO-04 · Report status + submission log; flag notes; direct DHIMS2 send
- Frontend status: not built yet

### ADM-01 · Facility summary endpoint
- Frontend status: not built yet

### J07 · Ward transfer
- Frontend status: not built yet

### J11 · Merge duplicate patients
- Frontend status: not built yet

### DOC-13-today-list · "Today's visits" includes future bookings made today  (bug; needed by: NUR-01, DOC-01, ADM-01)
- Method & path: `GET /clinical/encounters/today`
- Seen: a follow-up booked today for 14 days later (status `SCHEDULED`, `scheduledFor` in the future) is returned as one of today's visits
- Expected: visits checked in today, or scheduled for today
- Frontend status: filtered out client-side by `lib/todays-visits.ts` (`isOnTodaysList`) in the nurse and doctor lists; dashboard still to do (Stage 15)

### LAB-08 · What each test measures, normal ranges and critical limits  (needed by: LAB-03, LAB-04, LAB-08, DOC-08)
- Method & path: `GET /clinical/catalog/services/{id}/lab-setup`, `PUT /clinical/catalog/services/{id}/lab-setup`
- Shape: `{ serviceId; sampleType: string; parameters: Array<{ name; unit; kind: "number"|"choice"|"text"; choices?: string[]; abnormalChoices?: string[]; ranges?: Array<{ sex?: "M"|"F"; fromAge?: number; toAge?: number; low?: number; high?: number }>; criticalLow?: number; criticalHigh?: number }> }` (see `lib/lab-results.ts`)
- Behaviour: per test in the lab list; the results screen shows the patient's range and flags Low/High/Critical as the lab types. Ideally the backend also re-checks flags on submit (today it trusts the `flag` sent)
- Frontend status: mocked in `services/mocks/handlers/lab.ts` with suggested values for the 10 tests the facility lists (`fixtures/lab-parameters.ts`, area `lab-setup`); without the mock, tests have no preset measurements and staff type result lines

### LAB-02-reject · Reject a sample with a reason  (needed by: LAB-02, J04)
- Method & path: `POST /clinical/lab-orders/{id}/reject` `{ reason: string }`
- Behaviour: order → rejected (or cancelled) with the reason stored and shown to the doctor; bell notification to the requesting doctor ("Sample for Full blood count was rejected: haemolysed. Please request a new sample.")
- Frontend status: status set to `CANCELLED` via the real endpoint; reason + bell mocked in memory (area `lab-reject`) — so the reason only shows in the same browser session

### LAB-04-history · Acknowledged critical alerts for "Critical today"  (needed by: LAB-04)
- Method & path: `GET /clinical/lab/critical-alerts?from=<today>&status=ALL` — today's alerts including acknowledged ones, with who acknowledged and when
- Frontend status: Critical today lists open alerts only ("Waiting for doctor")

### LAB-05-return · Authorising (not "authorise now") doesn't send the patient back to the doctor
- Seen: `PATCH /clinical/lab-orders/{id}/status {AUTHORISED}` leaves the visit at the lab; only `submitResults(authoriseImmediately: true)` calls `returnFromLab()`
- Frontend status: after authorising or rejecting the last open test, the frontend moves the visit back to "Waiting for doctor" itself (`returnPatientIfAllDone` in `lab-order-view.tsx`)

### LAB-04-inbox-roles · Lab staff can't read the critical-alert inbox  (needed by: LAB-04)
- Seen: `GET /clinical/lab/critical-alerts` allows MEDICAL_OFFICER, MIDWIFE, NURSE, FACILITY_ADMIN, SUPER_ADMIN, HIO only — LAB_SCIENTIST / LAB_TECH get 403
- Need: lab roles read access (they raise these alerts and follow them up)
- Frontend status: lab staff see today's critical results from the worklist instead, without the "doctor has seen it" state

### STAGE0-02b · System administrator must still send `facilityId` when creating staff  (bug vs. single-facility)
- Seen: `POST /users` as SUPER_ADMIN without `facilityId` → 404 "facilityId is required for Super Admin user creation"
- Frontend status: `usersService.create` retries once with the session's facility id (`LEGACY(single-facility)`)

### RAD-02-cancel · Cancel a scan with a reason  (needed by: RAD-02, J05)
- Method & path: `POST /clinical/radiology-orders/{id}/cancel` `{ reason }` (today `PATCH …/status CANCELLED` stores an empty reason)
- Behaviour: keep the reason on the order (`cancellationReason`) and notify the requesting doctor
- Frontend status: status change real; reason + bell mocked (`imaging-cancel`)

### RAD-03 · Attach images / PDFs to an imaging report  (needed by: RAD-03)
- Method & path: `GET/POST /clinical/radiology-orders/{id}/attachments` (multipart; JPEG, PNG, PDF; max 20 MB) → `{ id, fileName, contentType, url, sizeBytes }`
- Frontend status: mocked in memory (`imaging-attachments`); without the mock the drop zone is hidden with "Attaching images isn't available yet"

### BIL-APPEND-CLOSED · A settled visit bill rejects every later order  (BLOCKER — needed by: DOC-05, DOC-06, DOC-07, J01, J06)
- Seen: `Bill.recomputeStatus()` marks a bill `PAID` as soon as nothing is owed. On an NHIS visit, that happens when the consultation is created (fully covered). On a cash visit, it happens when the cashier takes the consultation fee. After that, `BillingService.appendItem` throws `422 "Bill is closed; cannot append items"`, so the doctor can't order a lab test, a scan or a medicine on that visit. `ensureBillForEncounter` returns the existing (closed) bill instead of opening a new one.
- Expected: orders keep adding to the visit bill (reopen a fully covered/paid bill to `PARTIAL`, which `Bill.reopen()` already supports, or open a follow-on bill for the visit)
- Confirmed 2026-10-01 on a fresh NHIS visit: no bill at check-in. The first order (Malaria RDT) creates the bill, which is fully covered, so it closes as PAID straight away. The second order (FBC) is refused. So on NHIS visits only the **first** order of the whole visit goes through, which breaks J01 at the prescription step.
- Frontend status: the message is reworded in `lib/api-errors.ts` (`KNOWN_MESSAGES`). J06 was verified on a cash visit before payment. NHIS visits can't get prescriptions until this is fixed.

### PHA-04-not-given · Record medicines not given without dispensing anything  (needed by: PHA-04, DOC-07)
- Method & path: `PATCH /clinical/prescriptions/{id}/lines/{lineId}` `{ status: "NOT_GIVEN", reason }` (or `pharmacyNotes` on the status PATCH)
- Behaviour: keep the line's reason on the record; notify the prescriber ("Amoxicillin wasn't given: out of stock")
- Frontend status: when at least one medicine is given, the reasons go into `pharmacyNotes` on the dispense call. When nothing is given there's no call to make: the pharmacist still gets the printable "Medicines not given" list, but nothing is recorded and the doctor isn't told.

### PHA-04-finish · Pharmacy can't finish a visit while a medicine is still owed  (needed by: PHA-04, J01)
- Seen: `POST /clinical/encounters/{id}/complete` refuses with "1 open prescription(s)", and with `force=true` refuses with "Pharmacy staff cannot force-complete an encounter"
- Expected: either the pharmacist may close the remaining lines (not given, with a reason) so the prescription counts as finished, or may finish with a reason
- Frontend status: "Finish the visit" is offered only when everything was given. Otherwise the screen says the doctor or nurse can finish the visit.

### DOC-07-stock · Doctors can't see stock when prescribing  (needed by: DOC-07)
- Seen: `GET /pharmacy/stock/overview` and `/pharmacy/inventory-items` allow pharmacy staff and admins only
- Need: read-only stock status for prescribers (In stock / Low / Out per price-list entry)
- Frontend status: the prescribe dialog shows stock pills only for roles that can read stock; doctors prescribe without them

### PHA-09-catalog-roles · Pharmacy staff can't read the finance price list
- Seen: `GET /finance/catalog/services` → 403 for PHARMACIST
- Frontend status: the medicine form links price-list entries through `GET /clinical/catalog/services?group=PHARMACY` instead (works for pharmacy staff). No change needed unless pharmacy should see prices.

### DOC-14-allergy · Treatments aren't checked against allergies  (needed by: DOC-14)
- Seen: `POST /clinical/patients/{id}/treatments` accepts any medicine, even one matching an ALLERGY alert (prescriptions are checked; treatments aren't)
- Expected: the same token check as prescriptions, with an override reason stored on the order
- Frontend status: the treatment form runs the prescribing allergy check (`useAllergyCheck`): a direct match blocks the order, and a drug-group match needs a reason, which is saved in the instructions

### DOC-14-status-reason · Reason when a treatment is held back or cancelled  (needed by: DOC-14, ward rounds)
- Method & path: `PATCH /clinical/treatments/{id}/status` `{ status, reason }` (today only `status`)
- Frontend status: status changes ask for confirmation; no reason is stored

### BIL-02-status-filter · Bills list fails when filtered by status  (needed by: BIL-01, BIL-02)
- Seen: `GET /billing/bills?status=OPEN` (and PAID, PARTIAL, CANCELLED…) → 500; without `status` it works, and `search` works
- Frontend status: loads all bills and filters by status in the browser. Fine for now; slow once there are thousands of bills.

### BIL-04-walk-in · Bill a walk-in customer without a patient record  (needed by: BIL-04)
- Seen: `POST /billing/bills` → 422 "patientId is required"
- Need: optional `patientId` with a `customerName` for over-the-counter sales
- Frontend status: New bill requires choosing a registered patient; no walk-in option is shown

### BIL-07-reverse · Reverse a payment with a reason  (needed by: BIL-07)
- Method & path: `POST /billing/payments/{id}/reverse` `{ reason }`. `PaymentDto` gains `reversed`, `reversedAt`, `reversedByName`, `reversalReason`; the bill balance goes back up
- Who: FINANCE_OFFICER, FACILITY_ADMIN, SUPER_ADMIN
- Frontend status: mocked in memory (area `payment-reverse`): the payment shows "Reversed" and drops out of the totals, but bill balances don't change. Without the mock the menu item is hidden.

### BIL-05-receipt · Receipt PDF and SMS receipt  (needed by: BIL-05)
- Method & path: `GET /billing/payments/{id}/receipt.pdf`; `POST /billing/payments/{id}/send-sms`
- Frontend status: the receipt is printed from the page (`ReceiptCard` + `printArea`); "Send receipt by SMS" isn't shown

### BIL-06-cashier · Who took each payment, and payments by date  (needed by: BIL-06)
- Seen: `PaymentDto` has only `receivedByUserId` (no name, no patient name), and `GET /billing/payments` returns just the latest 200 with no date filter
- Need: `receivedByName`, `patientName`, `patientPublicId` on PaymentDto; `GET /billing/payments?from=&to=&method=` with paging
- Frontend status: patient names come from the bills list; no "taken by" column; date filters work within the latest 200 (the page says so)

### BIL-02-cap · The bills list stops at the latest 100  (needed by: BIL-01, BIL-02)
- Seen: without `status`, `GET /billing/bills` returns `findTop100ByFacility_IdOrderByIssuedAtDesc` and applies `search` *after* the cap (`BillingOperationsService.listBills`), so older bills can't be found by search
- Need: paged `GET /billing/bills?page=&size=&status=&search=&from=&to=` with the search done in the query
- Frontend status: searching also looks up matching patients and loads all of their bills (`billsForPatient`, paged); the overview and list say "latest 100 bills"; reprinting a receipt for an older bill loads that bill directly

### FIN-08-edit-lines · Changing a claim that already has lines fails  (BUG — needed by: FIN-06, FIN-08, FIN-07)
- Seen: `PUT /finance/nhis/claims/{id}` → 500 when the claim already has lines. `replaceClaimLines` deletes and re-inserts in one transaction, and the inserts hit the unique `(claim_id, line_no)` before the deletes are flushed (`uq_nhis_line_pos`, V28).
- Expected: flush the delete first (or update lines in place)
- Frontend status: lines and note are read-only once a claim has lines, with a plain explanation. Resending unchanged lines works. NHIS's reason can't be saved on such claims (see FIN-07-response).

### FIN-07-response · NHIS's answer and reason on a claim  (needed by: FIN-07, FIN-08, FIN-09)
- Need: `PATCH /finance/nhis/claims/{id}/status` `{ status, reason }`, with `reason`, `answeredAt` and `answeredByName` on `FinanceNhisClaimDto`
- Frontend status: the reason is saved in the claim notes ("NHIS said: …"), which only works while the claim has no lines. With sample data on, it's kept in memory (area `nhis-response`).

### FIN-07-send · Send claims to NHIA  (needed by: FIN-07)
- Seen: no NHIA connection. `SUBMITTED` is only a status.
- Frontend status: "Mark selected as sent" / "Mark as sent", worded as "send them through the NHIA claims portal as usual, then mark them here"

### FIN-02-future-price · A price with a later start date is charged straight away  (BUG — needed by: FIN-02)
- Seen: `ServicePricingRepository.findFirst…ActiveTrueOrderByEffectiveFromDesc` picks the newest start date even when it's in the future
- Expected: only prices with `effectiveFrom <= today` (and `effectiveTo` empty or later)
- Frontend status: new prices always start today; no future start date is offered

### FIN-09-period · The NHIS summary isn't for one month  (needed by: FIN-09)
- Seen: `POST /finance/nhis/reports/generate` totals every claim, whatever `periodLabel` says
- Frontend status: the month figures on screen are worked out from the claims; the saved summary is labelled with the month and says it covers all claims at the time it was saved

### FIN-01-departments · Money by department  (needed by: FIN-01, FIN-04)
- Need: `receivedByServiceGroup` in `/finance/revenue/summary`
- Frontend status: not shown ("Money by department isn't available yet")

### FIN-08-history · Claim history for finance officers  (needed by: FIN-08)
- Seen: `GET /audit/events` is admin-only
- Need: `GET /finance/nhis/claims/{id}/history` for finance roles
- Frontend status: admins see the history from audit events; finance officers see created and last-changed times

### WRD-setup · No way to set up wards and beds  (BLOCKER for a real ward board — needed by: NUR-07, DOC-10)
- Seen: wards and beds are only seeded by migration V21 for facilities that existed then. This facility has none (`GET /ipd/board` → `wards: []`), and there's no API to add them.
- Need: `GET/POST/PUT /ipd/wards` and `/ipd/wards/{id}/beds` (name, code, beds, switch off) for the facility administrator
- Frontend status: Facility settings → **Wards and beds** sets up wards (name, code, type, who it's for, location) and beds (number, type, notes, switch off; beds in use can't be switched off or renumbered). With sample data on (area `ipd-wards`) it is saved in this browser (`localStorage`). The bed board, admit dialog and ward screens read it through `ipdService.wardSource()`, and occupancy comes from the real active admissions, matched by ward and bed name. Admissions are real (ward/bed names, no `bedId`). When the server has wards of its own, those are used and shown read-only in settings. Swap `listConfiguredWards/saveWard/addBeds/saveBed` to the real endpoints when they exist.

### WRD-bed-day · Discharge needs a price-list entry coded IPD_BED_DAY
- Seen: `POST /clinical/admissions/{id}/discharge` → 422 "IPD bed-day catalogue row missing for facility — run migrations (V34) or create service IPD_BED_DAY", for facilities created after V34
- Frontend status: the message is reworded (`KNOWN_MESSAGES`) to tell staff to ask finance to add a "Ward bed (per day)" service with code IPD_BED_DAY. Added through Services and prices in the local test data.

### NUR-10 · Confirm the patient left; bed being cleaned  (needed by: NUR-10, NUR-07)
- Need: `POST /clinical/admissions/{id}/left` (who, when), bed state `CLEANING` on the board, and `POST /ipd/beds/{id}/ready`
- Frontend status: in-memory sample data (area `bed-cleaning`): "Going home" list → "Confirm they've left" → bed "Being cleaned" → "Mark bed ready". Without sample data the bed is free at discharge and Going home explains that.

### NUR-08-who · Who gave a dose / took observations
- Seen: `IpdMarEntryDto` and `IpdTprReadingDto` have no `givenByName` / `recordedByName` (the nurse is stored on the MAR row but not returned)
- Frontend status: times are shown, names aren't

### DOC-12-death · Death details on discharge
- Need: `dateOfDeath`, `causeOfDeath` on the discharge request and `AdmissionDto`
- Frontend status: required in the form and written at the start of the discharge summary
