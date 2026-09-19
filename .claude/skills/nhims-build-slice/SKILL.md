---
name: nhims-build-slice
description: Build one NHIMS feature slice (IDs like REC-02, NUR-03, LAB-04, FND-01) from docs/agents flows, following the design system, plain-language copy and four-state rules. Use whenever implementing or reworking a screen or flow step in this repo.
---

# Build an NHIMS slice

Follow these steps in order. Don't skip the reading steps — older code in the repo may not follow the current rules.

## 1. Read

1. Find the slice ID in `docs/agents/build-plan.md` and check its phase and that its **Depends on** slices exist. If a dependency is missing, stop and say which.
2. Read the slice in `docs/agents/flows/actors/<role>.md` (all fields).
3. If the slice has a **Hand-off**, read the journey in `docs/agents/flows/journeys/` that contains it.
4. Read `docs/agents/02-design-system.md`, `04-states-and-feedback.md`, `05-ui-copy.md`. Skim `03-components.md` for what already exists.
5. Open every file listed under **Existing code**, the services listed under **Data**, and `lib/query-keys.ts`.

## 2. Plan (write it out before coding)

- Route + `?view=` and URL params.
- Components you'll reuse (from `components/common`, `components/clinical`, `components/layouts`) and any you must build (build them generic, in the shared folder).
- Service methods and query keys; the invalidations for the hand-off (06 §4).
- Every string you'll show (title, description, labels, buttons, empty/error/success messages) — check each against the glossary.
- The four states for each data area.
- Permission helper(s) used.
- Backend gaps → typed stub with `// TODO(backend): …`.

## 3. Build

- Page → workspace → view pattern; `requireModuleAccess` on the page.
- `PageCard` first, `ModuleSubNav` if tabs, then `SectionCard`s.
- Tables via `DataTable` / queues via `WaitingList`; statuses via `StatusPill` + `lib/status-labels.ts`.
- Forms: zod schema in `schemas/`, react-hook-form, plain-language messages, `UnitInput`/`MoneyInput`/date picker as needed.
- Only tokens/utility classes for color; one navy primary button per screen/dialog. Choice tiles use `ChoiceOption`; checked controls use `data-[state=checked]` + `--primary`.
- Mutations: invalidate own data + next role's list; success message from 05 §4 templates; move the user to the next logical place.

## 4. States and copy pass

Go through the screen and confirm: skeleton loading, correct empty kind, friendly error with retry (via `getFriendlyError`), success feedback, confirm dialogs for risky actions, critical alerts pinned. Re-read every string against `05-ui-copy.md`.

## 5. Review

Run the `nhims-ui-reviewer` and `nhims-copy-reviewer` subagents on the changed files (and `nhims-access-checker` if you touched roles, nav or guards). Fix everything they report.

## 6. Verify

- `pnpm lint` and `pnpm build` pass.
- Walk the slice's **Done when** list as a user with that role (and the next role for hand-offs).
- In your summary: slice ID, files changed, how each "Done when" item was checked, backend needs, and follow-ups noticed. Tick the slice in `build-plan.md` only if everything passed.
