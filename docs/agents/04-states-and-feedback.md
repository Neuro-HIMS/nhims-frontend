# 04 — States and feedback

Every screen that loads or changes data must handle **loading, empty, error and success**. Use `QueryState` / `DataTable` so you can't forget one.

---

## 1. Loading

- Show **skeletons shaped like the final layout** (`TableSkeleton`, `CardSkeleton`, `FormSkeleton`, `BannerSkeleton`). Never a blank area or a lone centred spinner.
- Keep page chrome (page card, tabs, toolbar) visible while the body loads.
- After **8 seconds** still loading, show under the skeleton: "This is taking longer than usual. Your internet may be slow."
- Background refetches (queues refresh every 30s) must **not** flash skeletons — keep old data, optionally a tiny "Updating…" in the card header.
- Buttons that trigger mutations: disabled + spinner + "Saving…" / "Sending…" / "Recording payment…".

## 2. Empty — pick the right kind

Layout (centred inside the card): greyscale illustration → **bold title** → one grey sentence → black button if there's a next step.

| Kind | When | Example |
|---|---|---|
| **First use** | Nothing has ever been created | **No bills yet.** Bills you create will appear here. [Create a bill] |
| **All done (good news)** | A queue is empty because work is finished | **No patients waiting.** Everyone has been seen. *(good-news tone, no button)* |
| **No search results** | A search returned nothing | **No patient found for "Kofi Asante".** Check the spelling or search by phone or NHIS number. [Register new patient] |
| **Filters too narrow** | Filters hide everything | **Nothing matches these filters.** [Clear filters] |
| **Needs a choice first** | Screen needs a patient/visit selected | **Choose a patient to see their prescriptions.** [Find a patient] |
| **Not set up yet** | Facility hasn't configured something | **No lab tests set up yet.** Add the tests your lab offers so doctors can order them. [Add a test] *(only show button to roles who can set it up; others: "Ask your facility administrator.")* |
| **Coming soon** | Module not built yet | **This section isn't ready yet.** You'll be able to manage dental visits here soon. *(no technical detail)* |

## 3. Errors

### 3.1 Map every error to friendly words

Build `lib/api-errors.ts` and use it everywhere (it replaces the three ad-hoc helpers in `users-management-utils.ts`, `finance-utils.ts`, `folder-treatments.tsx`):

```ts
export type FriendlyError = { title: string; message: string; fieldErrors?: Record<string, string>; reference?: string };
export function getFriendlyError(error: unknown, context?: string): FriendlyError;
```

| Situation | Title | Message |
|---|---|---|
| No response / network error / timeout | We couldn't connect | Check your internet connection and try again. |
| 400 with `fieldErrors` | Some details need fixing | *(map each field message to plain words; show under fields)* |
| 400 without fields | That didn't work | Check the details and try again. |
| 401 (after refresh fails) | You've been signed out | You were signed out to keep patient records safe. Sign in again to continue. |
| 403 | You don't have access | You don't have access to this. If you need it, ask your facility administrator. |
| 404 | We couldn't find that | It may have been removed or moved. Go back and try again. |
| 409 | Someone else changed this | This was updated by someone else while you were working. Refresh to see the latest, then try again. |
| 413 / file too large | This file is too large | Choose a file under {max} MB. |
| 422 / business rule | *(use the backend message only if it's already plain language and from an allow-list; else)* That couldn't be saved | *(context-specific next step)* |
| 5xx | Something went wrong on our side | Please try again in a moment. If it keeps happening, tell your facility administrator. Reference: {id} |

Never render `error.message`, stack traces, HTTP codes, or JSON. A short `Reference: 4F2A` is allowed so support can trace it.

### 3.2 Where errors appear

| Error type | Pattern |
|---|---|
| Field validation | Red border + small red icon + message below the field. Validate on blur and on submit, not on every keystroke. **Never clear what the user typed.** |
| Form has several errors | `InlineNotice tone="error"` at the top: "2 things need fixing" with links that focus each field |
| Page/section failed to load | `ErrorState` inside that card with "Try again"; the rest of the page stays usable |
| Action failed | `notify.error(...)` toast that **stays until closed**, e.g. "Payment wasn't saved. Nothing was charged. Try again." Keep the dialog/form open with data intact |
| No access to a page | Server guard redirects to the user's home; if a view inside a page is forbidden, show `EmptyState` "You don't have access to this page…" |
| Not found | Friendly page with "Go to home" |
| Upload failed | Red border on the dropzone + message ("This file is too large. Choose a file under 20 MB.") |

## 4. Success

- **Routine save** → `notify.success` toast (bottom-right, ~4s) with what happened and what's next: "Vitals saved. Ama Mensah is now waiting for the doctor."
- **Milestones** (patient registered, visit started, bill paid, claim sent, report submitted) → `SuccessPanel` with next actions ("Print card", "Book appointment", "Send to triage").
- After success, the row/pill updates in place (invalidate queries) — the user should *see* the new status, not just read the toast.

## 5. Warnings

- `InlineNotice tone="warning"` or `"pending"` inside the relevant card: "NHIS not confirmed yet. You can continue, but confirm before billing."
- **Unsaved changes:** when navigating away from a dirty form: dialog "You have unsaved changes. Leave anyway?" — [Stay on this page] [Leave without saving].
- **Out-of-range values** (vitals, doses): amber message under the field, not a blocker unless clinically required: "Temperature is high (39.2 °C). Check and continue."

## 6. Offline and slow connection

- `OfflineBanner` only when `navigator.onLine` is false or requests fail with network errors: "You're offline. Your work is saved on this computer and will send when the internet is back."
- Long forms show `SaveIndicator`.
- If a mutation can't be queued offline, say so plainly: "You're offline, so this payment can't be recorded yet. Try again when you're back online."

## 7. Confirmations (risky actions)

Use `ConfirmDialog` for: delete, cancel a visit/appointment/bill/order, reverse or void payment, discharge, deactivate staff, remove access, reject a specimen, mark "didn't come".

- Title names the exact thing: "Cancel Ama Mensah's appointment on 21/09/2026?"
- One grey line on the consequence: "This can't be undone. The slot will be freed for someone else."
- Buttons: tertiary **"Keep appointment"** (left), solid red **"Yes, cancel appointment"** (right). Never "OK"/"Confirm".
- If a reason is required, put the field in the dialog (`footerExtra`) and disable confirm until filled.

## 8. Critical medical alerts

- Allergy conflicts, critical lab values, high-risk pregnancy flags → `CriticalAlert` pinned at the top of the patient page, error tone, ⚠ icon.
- Needs an explicit action to acknowledge ("I've told the doctor", "Change prescription"). Acknowledgement is recorded (e.g. `acknowledgeLabCriticalAlert`).
- Also shown as a count in the header bell for the responsible clinician.
- Never a toast; never color-only; never hidden behind a tab.

## 9. Session and permission edges

- `mustChangePassword` → user is sent to `/change-password` before anything else, with: "Please choose a new password to continue."
- Signed out mid-task → after re-login, return to the same page; keep unsaved form data where possible (session storage draft).
