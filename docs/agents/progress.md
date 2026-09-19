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

**Next stage:** Stage 2 — Facility admin: set up the facility and staff (J12): ADM-08 → ADM-09 → ADM-10 → ADM-11 → ADM-02 → ADM-03 → ADM-04 → ADM-05 → ADM-06 → ADM-07 → ADM-12 (ADM-01 Home deferred to Stage 13). Reads: `flows/actors/facility-admin.md`, `flows/journeys/J12-staff-onboarding.md`, `03-components.md`. Builds FND-02 (StatusPill), FND-03 (states), FND-04 (DataTable), FND-09 (UploadDropzone).
