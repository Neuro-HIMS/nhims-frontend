# 08 — Definition of done

A slice is done only when **every** box is ticked. Paste this list into your PR description and tick it.

## Look
- [ ] Uses the v2 look: cool dotted canvas, white bordered cards (`rounded-xl border-border`), navy primary buttons, pastel status pills with icon + text.
- [ ] No hex/rgb/hsl, no Tailwind palette colors (`red-500`, `slate-…`), no static inline styles in changed files.
- [ ] Exactly one primary (solid navy) button per screen/dialog; destructive solid red only inside `ConfirmDialog`.
- [ ] Radios, checkboxes and switches show a clear selected vs unselected state (`data-[state=checked]` + `--primary` fill). Labeled tiles use `ChoiceOption`.
- [ ] Page starts with `PageCard` (title + one-line description), then `ModuleSubNav` if the section has tabs.
- [ ] Tables follow the table pattern (toolbar band, grey header, 48px rows, pills, row actions, pagination/"Showing x–y of z").
- [ ] Patient-specific screens show `PatientBanner`.
- [ ] Works at 1280px and 768px (sidebar collapses, tables become cards); text ≥ 12px; targets ≥ 40px.
- [ ] Keyboard usable, visible focus, icon buttons have `aria-label`.

## Words
- [ ] No jargon from the glossary (`05-ui-copy.md` §2); no enum values, IDs, HTTP codes or raw server messages on screen.
- [ ] Sentence case; buttons are verb + object; placeholders are examples; units shown.
- [ ] Every status goes through `StatusPill` + a label map in `lib/status-labels.ts`.

## States
- [ ] Loading = skeleton matching the layout (no blank, no lone spinner).
- [ ] Empty = the right kind (first use / all done / no results / filters / choose first / not set up).
- [ ] Error = friendly message via `getFriendlyError` + "Try again"; typed data kept.
- [ ] Success = toast or `SuccessPanel` that says what happened and where the patient went next; the screen visibly updates.
- [ ] Risky actions use `ConfirmDialog` naming the exact thing.
- [ ] Critical medical info (allergies, critical results, high risk) shown with `CriticalAlert`/pills, not toasts.

## Code
- [ ] Page → workspace → view pattern; access guarded with `requireModuleAccess`; capability checks via `lib/permissions.ts` helpers.
- [ ] HTTP only via `services/*`; no new endpoints invented (backend needs listed if any).
- [ ] Query keys from `lib/query-keys.ts`; hand-off invalidations done (06 §4).
- [ ] Forms use zod schemas with plain-language messages.
- [ ] No duplicated component that already exists in `components/common` / `components/clinical`.
- [ ] `pnpm lint` and `pnpm build` pass.

## Flow
- [ ] All acceptance criteria of the slice are met, tested as a user with that role.
- [ ] If the slice hands off to another role, the next role sees the patient in their list without refreshing (≤ 30s).
- [ ] `nhims-ui-reviewer` and `nhims-copy-reviewer` found nothing outstanding.
