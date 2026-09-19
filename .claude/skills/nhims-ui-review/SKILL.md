---
name: nhims-ui-review
description: Review an NHIMS screen or set of changed files against the v2 design system (clinical navy, dotted canvas, navy primary buttons, visible selected radios/checkboxes, pastel status pills), component reuse and the loading/empty/error/success rules. Use before finishing any UI change or when asked to audit a screen.
---

# NHIMS UI review

Review the given files (default: `git diff --name-only` against main, `.tsx`/`.css` only). Read `docs/agents/02-design-system.md`, `03-components.md`, `04-states-and-feedback.md` first.

## Mechanical checks (run these)

```bash
# hardcoded colors / Tailwind palette colors
rg -nP "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\((?!var)" <files>
rg -n "\b(bg|text|border|ring|from|to|via)-(red|green|blue|amber|yellow|emerald|sky|orange|rose|slate|gray|zinc|neutral|stone|indigo|violet|teal|cyan|lime|pink|fuchsia|purple)-[0-9]{2,3}\b" <files>
# static inline styles
rg -n "style=\{\{" <files>
# deprecated classes
rg -n "dashboard-(tab|shell-header|online|icon-btn)|result-abnormal|notice-info" <files>
# raw enums / ids on screen (spot check)
rg -n ">\s*\{[a-zA-Z.]*(status|role|station|priority)\}\s*<" <files>
```

## Judgement checks (per screen)

1. Starts with `PageCard` (title + real description); `ModuleSubNav` ≤ 5 visible tabs.
2. Cards: `rounded-xl border-border bg-card`, dashed dividers between stacked sections.
3. Exactly one `variant="default"` button visible per screen/dialog; destructive solid only inside `ConfirmDialog`. Primary is hospital navy, not black.
3b. Radios/checkboxes/switches: unchecked outline is visible; checked fill is `--primary`. Labeled tiles use `ChoiceOption`. Reject `has-data-checked` without the Radix `data-state` custom variant, and reject near-black `--primary`.
4. Lists use `DataTable`/`WaitingList`; statuses use `StatusPill` with icon + words.
5. Patient screens show `PatientBanner`; critical info uses `CriticalAlert`, not toasts.
6. Four states present for every query; skeletons match layout; empty state is the right kind with an action where possible.
7. Errors go through `getFriendlyError`; no `error.message` rendered.
8. Risky actions use `ConfirmDialog` with specific title and button labels.
9. Works at 1280 and 768 (sidebar collapse, table → cards); nothing below 12px; icon buttons have `aria-label`.
10. No duplicated component that exists in `components/common` or `components/clinical`.

## Output

A table: file · line · rule broken · fix. Then "Looks right" notes for anything that passes but is borderline. Don't rewrite files unless asked.
