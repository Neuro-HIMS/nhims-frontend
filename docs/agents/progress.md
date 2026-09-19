# Progress log

One short block per stage. Read this first when resuming — it's the source of truth for what's actually done, not `build-plan.md`'s static table.

---

## Stage 0 — Single-facility migration + mock layer + agent-kit install (2026-09-19)

**Gap list:** `facilityId` was threaded through session/DTO types, page props, and the header's facility switcher; `services/facility.service.ts` took an id per call; `usersService.create` sent `facilityId`; My profile showed a raw "Facility ID". Access control (`lib/access-control.ts`) was never keyed on facility identity, so no logic there needed to change.

**Done:**
- `facilityService.get()`/`update()` are now a singleton contract (`GET`/`PUT /facility`, no id), with a one-time fallback to the legacy `/facilities/{id}` (session's `facilityId`) on 404/405, dev-only warning logged.
- `facilityId` dropped from `FacilitySettingsWorkspace`, `UsersManagementWorkspace`, `usersService.create` payload, and My profile. Kept only as optional/`@deprecated` on `AuthUser`, the session payload, and DTOs (`UserListItem`, `CreateUserPayload`, `EncounterDto`, `AuditEventDto`).
- Header facility badge is a static label for every role, including super admin (SUP-01/SUP-02 retired — see `flows/actors/super-admin.md`).
- New `hooks/use-facility.ts` (TanStack Query) is the one place facility identity is read from; `AppHeader` uses it with a session-field fallback while loading.
- Installed the agent kit at the repo root (`docs/agents/`, `.claude/skills/nhims-*`, `.claude/agents/nhims-*`) — was nested under `frontend/nhims-frontend-agent-kit/`, moved up so the harness discovers the skills/subagents. Merged `AGENTS.md`/`CLAUDE.md`.
- Mock layer built: `services/mocks/mock-config.ts` (`isMockEnabled`/`isAnyMockEnabled`, reads `NEXT_PUBLIC_MOCK_AREAS`), `services/mocks/with-mock.ts` (`withMock`, `?mockError=` hook), dev-only "Sample data" pill wired into `AppHeader`.
- Docs updated: `07-access-and-navigation.md` (facility-services line, `/facility` endpoint), `super-admin.md` (SUP-01/02 retired), `build-plan.md` (Phase 6 super admin row, backend-gaps seed), `02-design-system.md` §3, new `backend-gaps.md`.

**Mocks added:** none used yet (nothing was missing in this stage — infrastructure only).

**Reviewer:** access-checker pass (via general-purpose stand-in, since `.claude/agents/*` weren't registered yet this session) — clean, no blocking/should-fix findings, no access regressions.

**Open issues:** none. Backend gap logged: `GET`/`PUT /facility` singleton endpoint doesn't exist yet; frontend runs on the legacy-fallback path.

**Commit:** `e89c723`

---

## Stage 1 — Authentication and account (2026-09-19)

**Gap list (from `flows/actors/shared-all-staff.md`):** login form had no intro sentence, always showed the TOTP field (jargon label "Authenticator code"), no locked/offline states, and the *login* password field was wrongly validated against new-password complexity rules (a real bug — would reject valid existing passwords). No forgot-password UI existed despite the service methods already being real. Change-password forms had no live rule checklist, duplicated schemas in two places, and generic error handling. Security page was a raw TOTP setup dump (secret + otpauth URI as text, no QR code, "TOTP" everywhere). Profile page showed a raw "User ID", used an ad-hoc `formatRole` instead of a central label map, and a bare spinner for loading. No `/login?reason=expired`/`?next=` handling in the 401 interceptor. No `app/not-found.tsx`. Header bell had nothing to show (no feed, mocked or otherwise) and no deep-linking. `MEDICAL_OFFICER` landed on `/nurse` instead of `/opd`. No Feedback entry point existed.

**Foundation built (just-in-time):**
- FND-01: `lib/status-labels.ts` (`ROLE_LABELS`/`roleLabel`), `lib/notify.ts`, `lib/api-errors.ts` (`getFriendlyError`, full 04§3.1 status table).
- FND-05: `components/layouts/page-card.tsx` (`PageCard`, `page-header.tsx` now aliases it — was dead code, zero call sites, so safe), `components/common/inline-notice.tsx`, `components/common/success-panel.tsx`, `components/common/no-access-notice.tsx`; `ConfirmDialog` now requires `confirmLabel` and defaults `cancelLabel` to "Go back".
- FND-08: removed the now-fully-dead `dashboard-*` CSS (classes + tokens) — confirmed zero usages first.
- FND-10: `DEFAULT_MODULE_BY_ROLE.MEDICAL_OFFICER` → `"opd"`.
- Also built (not a named FND but shared across slices): `schemas/password.schema.ts` (`PASSWORD_RULES`, `newPasswordSchema`) + `components/common/password-rule-checklist.tsx`, used by ALL-02/ALL-03/ALL-05.

**Slices done:**
- ALL-01 Sign in — intro sentence, TOTP field hidden until the server says it's needed (`totp-required`/`totp-invalid` result kinds) or the user opts in via "I use a code from my phone", locked/inactive/expired/offline states, "Forgot your password?" link, fixed the login-password-complexity-regex bug, removed the credential-in-URL leak path (dropped the form's `action` attribute).
- ALL-02 Choose a new password (forced) — live rule checklist, exact spec copy, success toast, dotted-canvas background (was plain grey).
- ALL-03 Forgot / reset password — new `ForgotPasswordForm` (`/login?step=forgot`) and `ResetPasswordForm` (`/reset-password?token=`), both against the already-real `authService.forgotPassword`/`resetPasswordWithToken`.
- ALL-04 My profile — simplified to spec (name, job via `roleLabel`, facility, sections you can open), removed the raw "User ID", real skeleton loading state instead of a bare spinner.
- ALL-05 Sign-in and security — rebuilt the TOTP card as the spec's 3-step flow (QR code via `qrcode.react`, `InputOTP` for the code, status pill On/Off, `ConfirmDialog` for turning off); "TOTP" no longer appears anywhere on screen. Session-refresh card copy de-jargoned ("JWT" removed).
- ALL-06 Header — notifications bell now backed by a real (empty-by-default) service (`services/notifications.service.ts`) with a mocked feed behind `NEXT_PUBLIC_MOCK_AREAS=notifications`; items deep-link and show relative time.
- ALL-07 Log out and session expiry — `api-client.ts`'s 401 handler now redirects to `/login?reason=expired&next=<path>`; login form shows the exact spec message and returns to `next` after sign-in.
- ALL-08 Feedback — `FeedbackDialog` in the sidebar bottom, `services/feedback.service.ts` (real `POST /feedback` attempt, mockable via `NEXT_PUBLIC_MOCK_AREAS=feedback`).
- ALL-09 Not found / no access — `app/not-found.tsx` (dotted canvas + card + "Go to home"), `components/common/no-access-notice.tsx` for a future forbidden-view case.

**Mocks added:** `services/mocks/fixtures/notifications.ts` + `handlers/notifications.ts` (3 sample alerts). Feedback submission mocks to a no-op success. Both logged in `backend-gaps.md`.

**Reviewer:** ui-reviewer and copy-reviewer passes (general-purpose stand-ins). Findings fixed:
- Blocking: `notificationsService.feed()` was throwing unconditionally instead of resolving empty when unmocked (fixed); profile page's loading state was a bare spinner with no page chrome (fixed, now a skeleton-shaped `PageCard` + card).
- Should-fix: login form's native-submit credential-leak path narrowed (dropped `action`); `app-header.tsx` was using a local `formatRole` instead of `roleLabel()` (real bug — e.g. `HIO` → "Hio"), fixed and added a rule to `05-ui-copy.md` §1; "Confirm and turn on" → "Turn on", "Cancel" → "Cancel setup" (rule 4); instruction-style placeholders removed from username/password fields; `totpCode` zod max now has a plain message; split the "disabled"/"expired" login error copy.

**Verified:** `pnpm build` and `pnpm exec tsc --noEmit` clean. `pnpm lint` unchanged at 22 pre-existing errors / 34 warnings in untouched files (zero introduced by this stage). Screenshotted and visually confirmed: `/login` (intro sentence, collapsed code field, forgot link), `/login?step=forgot`, `/login?reason=expired`, `/reset-password` (no-token expired state), `/not-found` — all match the design brief exactly.

**Open issues:**
- Could not visually verify the authenticated screens (security page's QR/3-step flow, profile page, header notifications dropdown, sidebar Feedback dialog) — no test credentials available in this session. Should be checked against a real login on the next session before calling ALL-05/ALL-06 fully done.
- Two real backend gaps logged: `GET /notifications` and `POST /feedback` don't exist yet; frontend runs against mocks (opt-in via `NEXT_PUBLIC_MOCK_AREAS`) or a graceful empty/error state until they ship.

**Commit:** `2c57960`

---

## Stage 2 — Facility admin: set up the facility and staff (2026-09-19)

**Gap list:** `facility-settings-workspace.tsx` was a single 1,083-line file mixing state, save/load and three unrelated views; jargon throughout ("Diagnosis classifications (ICD-11)", "Operational configuration", a "Legacy ICD hint" field, raw "HMIS module · {key}" links); switching a service off had no confirmation and no "applies at next sign-in" notice. Staff and access had no way to pick sections at creation time (silently used role defaults, no UI), showed a hardcoded fake "Email verification: Not verified" column, and used an ad-hoc `formatRole`. "Role Assignment"/"Module Access"/"Apply Default Modules for Role" were the literal glossary-banned phrases. "Access Review" was a per-module list, not the staff×sections matrix the brief describes. "Audit Log" showed raw action codes, database-id fragments, and a permanently-visible IP column with no plain-language framing.

**Foundation built (just-in-time):** FND-02 (`StatusPill`, `TriagePill`, `NhisPill`, `AllergyPill`, `LabResultValue`, `.result-low`/`.result-high`), FND-03 (`EmptyState`, `ErrorState`, `QueryState`, skeleton presets, icon-in-circle illustrations), FND-04 (`DataTable`/`TableToolbar`/`TablePagination` with a tablet card mode), FND-09 partial (`UploadDropzone`, then `UnitInput` added mid-stage per review finding).

**Slices done:** ADM-08 Facility details (split into `components/facility/views/*`, logo via `UploadDropzone`), ADM-09 Services (per-service description, `ConfirmDialog` + "applies at next sign-in" on switch-off), ADM-10 Opening hours and booking rules (renamed from "Configuration", every field relabelled), ADM-11 Diagnosis list (renamed from "Diagnosis classifications (ICD-11)", status pill, bulk-add via `UploadDropzone` dialog), ADM-02 Staff (rebuilt on `DataTable`), ADM-03 Add staff member (real sections checkbox picker + "usual access" reset + success screen with copyable temporary password), ADM-04 Job and access (grouped checkboxes, facility-off sections shown disabled, job-change confirmation), ADM-05/06 Deactivate/Reactivate and Reset password (named confirmations, unified temporary-password copy box), ADM-07 Check who can open what (rebuilt as a real staff×sections matrix with a "more access than usual" warning pill and CSV export), ADM-12 Activity history (renamed from "Audit Log", humanized action text, person/kind/search filters, no raw IDs).

**Mocks added:** none — everything in this stage hits real, already-existing endpoints.

**Reviewer:** ui/copy/access-checker passes (general-purpose stand-ins). Two real bugs found and fixed:
- **Access-checker (blocking):** the facility-off/placeholder "disabled sections" check only ever looked at `enabledHmisModuleKeys`, which never contains non-facility-gated modules (Finance, Billing, Reports, Users, Facility settings, Activity history, Nurse station, Appointments, Home) — so Job and access wrongly greyed out and blocked admins from granting those to anyone. Add staff had the opposite gap: it never passed `disabledModules` at all. Fixed with one shared `hooks/use-disabled-sections.ts` built on the existing `isModuleEnabledAtFacility()`.
- **UI reviewer (blocking):** the diagnosis list and staff table both silently rendered their *empty* state on a failed load instead of a retryable error — a real outage would have looked like "nothing here yet." Fixed by wiring `ErrorState`/`DataTable`'s `error`/`onRetry` props through.
- Should-fix: extracted a page-local numeric-with-suffix input into the documented `UnitInput` (FND-09) instead of leaving a duplicate; fixed a real content bug (a field labelled "waiting long" threshold was actually the waiting-list refresh interval); Reload button's spinner was inside an unreachable branch.
- Copy reviewer: unified two different "temporary password" sentence templates into one; two backend free-text fields (`details` on activity events, diagnosis-import row errors) now go through the same plain-language filter `getFriendlyError` uses, so a technical backend string can't leak onto the screen; renamed "Device" (showing a raw IP) to "From".
- **User-reported mid-review:** status pills with longer text (e.g. "More access than usual") were wrapping inside a narrow table cell and rendering as a stretched oval instead of a pill. Fixed at the component level — `.status-pill` now forces `whitespace-nowrap`/`w-fit`/`shrink-0`, so no pill anywhere in the app can hit this again.

**Verified:** `pnpm build` and `pnpm exec tsc --noEmit` clean after every commit in this stage. `pnpm lint` back to the 22-error/32-warning pre-existing baseline (down 2 warnings from Stage 1's baseline — cleaned up dead `formatRole`/`extractErrorMessage` helpers along the way).

**Open issues:**
- Could not visually verify the authenticated screens myself (no test credentials) — the user did screenshot the Check who can open what matrix directly and caught the pill-wrapping bug live; everything else in this stage is unverified in a live browser.
- ADM-01 (Home/facility dashboard) is explicitly deferred to Stage 13 per the mission.
- ADM-07's matrix is now derived client-side from already-loaded staff data instead of calling `usersService.accessReview()` — that endpoint is unused by the UI now but left in place (real backend endpoint, no reason to delete it).
- Date convention tension noted, not resolved: `lib/dates.ts`'s existing `formatClinicalDate*` deliberately avoids DD/MM/YYYY for clinical safety (documented in its own comment); the design brief mandates DD/MM/YYYY for tables. Added separate `formatTableDate(Time)` for non-clinical admin screens rather than changing the clinical formatters — worth a deliberate decision later if the two need to converge.

**Commit:** `700b77b`, `ebee3a0`, `f9f62ab`

**Next stage:** Stage 3 — Records: find, register, start visit (J01 steps 1–3): REC-01 → REC-02 → REC-03 → REC-04 → REC-05 → REC-06 → REC-07. Reads: `flows/actors/records-officer.md`, `flows/journeys/J01-walk-in-opd-visit.md`. Builds FND-06 (`PatientBanner`), FND-09 (`PhoneInput`), `schemas/patient.schema.ts`.
