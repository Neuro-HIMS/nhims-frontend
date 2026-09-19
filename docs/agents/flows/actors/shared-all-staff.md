# Everyone — sign in, account and shell (`ALL`)

Applies to every role. Build these first after the foundation slices — every other flow starts here.

---

### ALL-01 · Sign in
**Goal** — I sign in quickly and land on the screen I use most.
**Requirements** — NFR security; 05-authentication-authorization.
**Where** — `/login`
**Existing code** — `app/(auth)/login/page.tsx`, `components/layouts/login-form.tsx` (Evolve).
**Screen** — Dotted canvas (`.login-hero`). One centred white card (`rounded-xl`, `login-card`): NHIMS wordmark, "Sign in", one sentence ("Use the username and password your facility gave you."), Username, Password (show/hide), "6-digit code from your phone (only if you've turned this on)" — shown only after the server says a code is needed, or collapsed under "I use a code from my phone". Black full-width "Sign in". Link "Forgot your password?".
**Data** — `authService.login`; on success store user (`auth.store`), redirect to `getLandingPathForUser(user)` or `/change-password` if `mustChangePassword`.
**States** — Button "Signing in…". Wrong details: `InlineNotice tone="error"` "Username or password is incorrect." Code wrong: "That code didn't work. Check your phone and try again." Locked: "Your account is locked. Ask your facility administrator." Offline: "You're offline. Connect to the internet to sign in."
**Done when** — each role lands on its home (07 §3); errors never show server text; Enter key submits; password manager autofill works.
**Depends on** — FND-01, FND-05.

### ALL-02 · Choose a new password (forced)
**Goal** — after an admin reset, I set my own password before doing anything else.
**Where** — `/change-password` (workspace layout redirects here when `mustChangePassword`).
**Existing code** — `app/(auth)/change-password/page.tsx`, `components/layouts/change-password-form.tsx` (Evolve).
**Screen** — Same card as sign in. "Choose a new password", sentence "Please choose a new password to continue.", Current (temporary) password, New password, Confirm new password, live rule checklist (✓ at least 8 characters, ✓ a number…). Black "Save new password".
**Data** — `authService.changePassword` → `reissueSession` → landing path.
**States** — Mismatch under field: "Passwords don't match." Success toast: "Password changed. Welcome, Ama."
**Done when** — can't reach any workspace page until done; rules shown before typing.
**Depends on** — ALL-01.

### ALL-03 · Forgot / reset password
**Goal** — I can get back in if I forget my password.
**Where** — `/login?step=forgot`, `/reset-password?token=…` (Build route).
**Data** — `authService.forgotPassword`, `authService.resetPasswordWithToken`.
**States** — Always the same confirmation (don't reveal whether a user exists): "If that username exists, we've sent reset instructions to the email on the account. If you don't get them, ask your facility administrator." Expired link: "This reset link has expired. Ask for a new one."
**Depends on** — ALL-01.

### ALL-04 · My profile
**Where** — `/settings/profile` · **Existing** — `app/(workspace)/settings/profile/page.tsx`, `components/settings/*` (Evolve).
**Screen** — Page card "My profile" — "Your name and contact details." Read-only: job (role label), facility, username. Editable if backend allows: phone, email. **Backend needed** if profile edit endpoint missing.
**Done when** — no role codes shown; uses `ROLE_LABELS`.

### ALL-05 · Sign-in and security
**Where** — `/settings/security` · **Existing** — `components/settings/change-password-settings-card.tsx` (Evolve).
**Screen** — Two cards: "Change password" (as ALL-02, not forced) and "Extra sign-in protection" — explains in one sentence, status pill (On / Off), black "Turn on" → steps: 1 Install an authenticator app, 2 Scan this code, 3 Enter the 6-digit code. "Turn off" is `destructive-outline` + `ConfirmDialog`.
**Data** — `beginTotpEnrollment`, `completeTotpEnrollment`, `disableTotp`, `changePassword`.
**Done when** — the word TOTP never appears.

### ALL-06 · Header: greeting, role pill, facility, notifications
**Where** — every workspace page · **Existing** — `components/layouts/app-header.tsx` (Evolve), `store/notification.store.ts`.
**Screen** — "Hello, **Ama Mensah**!" + role pill (green dot + "Nurse"); "Find a patient" (roles with records access); bell with count → popover list of the user's alerts (critical lab results for the requesting doctor, results ready, referrals received, low stock for pharmacists). Each item is a sentence + time + link. Empty: "You're all caught up." Black facility switcher (logo + facility name); for single-facility users it's a static label, for super admins a menu (SUP-01).
**Data** — **Backend needed**: a notifications feed endpoint. Until then, compose from `labCriticalAlertsInbox` (doctor), `referralInbox`, stock overview low/expiring (pharmacist).
**Done when** — no dead icons; count matches the list; clicking an item deep-links to the right view.

### ALL-07 · Log out and session expiry
**Where** — sidebar bottom "Log out", user menu "Sign out".
**Data** — `authService.logout`; `api-client` handles 401 → refresh → `/login`.
**States** — Expired session on next action: redirect to `/login?reason=expired` showing "You were signed out to keep patient records safe. Sign in again to continue." After sign-in return to the previous URL (`?next=`).
**Done when** — unsaved drafts survive the round trip where a draft exists.

### ALL-08 · Feedback
**Where** — sidebar bottom "Feedback" → dialog: "Tell us what's working and what isn't", textarea, optional "Include this page's address". **Backend needed** (or `mailto:` fallback).

### ALL-09 · Not found and no access
**Where** — `app/not-found.tsx`, forbidden view states.
**Screen** — Dotted canvas + card: illustration, "We couldn't find that page." / "You don't have access to this page.", sentence, black "Go to home" (→ landing path).
