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

### DOC-04 · Save diagnoses on a visit  (needed by: DOC-04)
- Method & path: confirm endpoint
- Frontend status: not built yet

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
