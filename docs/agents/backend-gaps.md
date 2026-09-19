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
- Frontend status: not built yet

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
