---
name: nhims-plain-copy
description: Write or rewrite NHIMS user-facing text (titles, descriptions, buttons, labels, placeholders, toasts, errors, empty states, status labels) in plain, jargon-free language for hospital staff. Use whenever adding or reviewing any string a user will see.
---

# NHIMS plain-language copy

Read `docs/agents/05-ui-copy.md` fully first — its glossary, role names, menu names, templates and status maps are authoritative.

## Checklist for every string

1. Would a nurse on her first day understand it? If a developer word appears (module, token, API, sync, server, config, catalog, matrix, legacy, snapshot, SKU, MSISDN, TOTP, encounter, endpoint, invalid, payload), rewrite.
2. Sentence case.
3. Buttons: verb + object, says what happens ("Save vitals", not "Submit").
4. Errors: what happened + what to do next; no blame; no codes.
5. Empty states: title + one sentence + next step.
6. Success: what happened + where the patient went next.
7. Placeholders: an example ("e.g. 024 123 4567").
8. Units on every number; `DD/MM/YYYY` dates; names before numbers.
9. No enum values, IDs, `null`, `N/A` — use label maps from `lib/status-labels.ts` and "—" / "Not recorded".
10. Abbreviations spelled out once per screen.

## Output

When writing: give the final strings grouped by screen area. When reviewing: table of file · line · current text · suggested text · reason. If a new status or term is needed, add it to `05-ui-copy.md` and `lib/status-labels.ts` in the same change.
