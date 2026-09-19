@AGENTS.md

# Working in this repo with Claude Code

## How to pick up work

1. Find the slice you're building in `docs/agents/build-plan.md` (IDs like `NUR-03`, `LAB-02`).
2. Open its actor file in `docs/agents/flows/actors/` — each slice lists the route, screens, services, query keys, states, hand-off and acceptance criteria.
3. If the slice hands a patient to another role, also open the journey in `docs/agents/flows/journeys/` so the hand-off (queue invalidation, status change, notification) is built too.
4. Use the **`nhims-build-slice`** skill to build it. It walks you through: read → plan → build → states → copy → review → verify.
5. Before saying done, run the **`nhims-ui-reviewer`** and **`nhims-copy-reviewer`** subagents on the changed files and fix what they report.

## Skills in this repo (`.claude/skills/`)

| Skill | Use when |
|---|---|
| `nhims-build-slice` | Building any feature slice from the flow docs |
| `nhims-new-module` | Adding a new module/section (page + workspace + nav + access) |
| `nhims-ui-review` | Checking a screen against the design system and states rules |
| `nhims-plain-copy` | Writing or reviewing any user-facing text |

## Subagents (`.claude/agents/`)

| Agent | Does |
|---|---|
| `nhims-ui-reviewer` | Reviews changed files for token misuse, hardcoded colors, missing states, button hierarchy, layout drift |
| `nhims-copy-reviewer` | Reviews every user-facing string for jargon, casing, vague buttons, raw errors, enum leakage |
| `nhims-access-checker` | Reviews role/module guards, nav visibility and permission helpers for a change |

## Working rules for Claude

- Read the relevant `docs/agents/*` file before editing — don't guess the pattern from one nearby file; older files may still carry pre-redesign styling. The docs win over existing code.
- When you touch an older screen, bring it up to the current rules in the part you touch (tokens, states, copy). Don't rewrite unrelated screens in the same change.
- Keep changes scoped to one slice. Mention any follow-up you noticed rather than silently expanding scope.
- Never invent backend endpoints. If a slice needs an endpoint that isn't in `services/`, stop and list it as a backend dependency in your summary; build the UI against a typed service stub marked `// TODO(backend): …`.
- Run `pnpm lint` and `pnpm build` before finishing.

---

# Frontend UI Design System Rules

The full spec lives in `docs/agents/02-design-system.md` — this is the condensed, enforceable version.

## Single Source of Truth
- All color, typography, radius, and semantic UI tokens must be defined in `app/globals.css` under `:root` and `@theme inline`.
- Shared visual patterns must be implemented as semantic utility classes in `app/globals.css` (example: `.canvas-dots`, `.login-hero`, `.alert-critical`, `.facility-chip`, `.sidebar-shell`, `.status-pill-*`).
- Components and pages must consume these tokens/classes instead of hardcoded values.

## Non-Negotiable Constraints
- Do not hardcode hex/rgb/hsl colors, or Tailwind palette colors (`bg-red-50`, `text-slate-500`, etc.), in page/layout/component files.
- Do not use inline `style={{ ... }}` for visual design unless it is truly dynamic (for example transform/position calculated at runtime).
- Do not introduce ad-hoc font stacks in components; use design tokens (`font-sans`, `font-clinical`, `font-mono`) only.
- Do not create one-off spacing/shape systems per page; reuse Tailwind scale + tokenized radius.

## Typography
- Default UI text uses `font-sans` (Inter via global token mapping).
- Clinical identifiers/codes/numeric values, money and vitals use `font-clinical` (tabular numbers).
- Heading hierarchy should remain consistent with global `h1-h6` defaults in `globals.css`.

## Color & Semantics (design system v2 — monochrome, dotted canvas)
- `--brand` (near-black charcoal, `#111827`) is sidebar/nav chrome only. `--primary` (black) is the one "main action" color — buttons, the facility switcher, checked checkboxes, selected items. `--accent` (blue, `#2563EB`) is text links and focus rings **only** — never buttons.
- One red only: `--destructive` = `--error` (`#DC2626`). Never introduce a second red.
- Feedback sets — `success` / `warning` / `pending` / `error` / `info` / `purple` / `neutral` — each ship as a strong/`-bg`/`-border` trio, for system messages (saved/failed/waiting/tip). Medical status colors (`--clinical-*` triage, `--nhis-*`, `--result-*` lab flags) are a **separate** system — don't swap feedback tokens for triage/lab/NHIS status or vice versa, even where the hue overlaps.
- Triage: Emergency = error red, Urgent = warning orange, Semi-urgent = pending amber, Routine = success green.
- Lab results: low is blue (`--result-low`/info), high is orange (`--result-high`/warning), critical is red (`--result-critical`) — never the same color for low and high.
- Status is always a **pill** (`.status-pill-*` / `.appt-pill-*`): soft bg + border + icon + words. Color is never the only signal.
- Page canvas is white with the faint dotted grid (`.canvas-dots`); cards/dialogs are solid white (`rounded-xl`, `border-border`) sitting on top so no dots show through.

## Workspace Layout Architecture

Left-hand dark sidebar (`AppSidebar`) + white top bar (`AppHeader`) + dotted-canvas scrollable main:

```
<AppSidebar />   ← near-black charcoal, ~240px (icons-only when collapsed), white top-left
                    header block ("NHIMS"), items grouped (Home/Patients/Care/Tests and
                    medicines/Money/Reports/Admin) filtered by access, Log out pinned at the bottom
<AppHeader />    ← white, 64px. Left: avatar + greeting + role pill, itself the user menu
                    (My profile / Sign-in and security). Right: global "Find a patient"
                    search, notifications, and a static black facility badge (NHIMS runs
                    one facility per server — no facility switcher, no menu on it).
<main className="canvas-dots">
  <PageContent />  ← scrollable, max-w-screen-2xl, white dotted-grid canvas behind cards
</main>
```

- `components/layouts/app-sidebar.tsx` renders `NAV_ITEMS` from `config/navigation.ts`, filtered to accessible modules via `canAccessWorkspaceModule`, grouped by `NAV_GROUP_ORDER`/`NAV_GROUP_LABELS`. Collapse state persists to `localStorage`.
- `components/layouts/app-header.tsx` is intentionally minimal: greeting + role pill, patient search (only for roles with `records` access), notifications, facility switcher. Do not add non-functional icons (no "Messages", no "Applications" grid) and do not add a permanent "Online" badge — only show connectivity state when actually offline (`OfflineBanner`).
- Sign out lives in the sidebar (pinned at the bottom), not in a header dropdown.
- Do not recreate the old `GlobalDhimsHeader` dark-blue tab-bar-with-dropdowns pattern, and don't reintroduce a blue/navy "brand" primary button color — primary is black.
- `sidebar.tsx` and `topbar.tsx` (the old, pre-`AppSidebar` files) stay deleted — `AppSidebar`/`AppHeader` are the current, authoritative shell.

## Module Page Pattern

Every module page must follow this structure:

```tsx
// page.tsx (server component)
await requireModuleAccess("module-name");
return <ModuleWorkspace />;

// module-workspace.tsx ("use client")
const view = searchParams.get("view") ?? "default-view";
return (
  <div className="space-y-4">
    <h1>Module Title</h1>
    <ModuleSubNav items={SUB_NAV} basePath="/module-path" />
    <div className="pt-2">{/* view-specific content */}</div>
  </div>
);
```

**Sub-navigation** uses `ModuleSubNav` from `@/components/layouts/module-subnav`. Sub-nav items are defined per module in the workspace component (not in `navigation.ts`). At most 5 tabs show directly — beyond that, `ModuleSubNav` collapses the rest under "More" automatically.

## PR/Change Checklist

See `docs/agents/08-definition-of-done.md` for the full list. Minimum bar:
- No hardcoded colors in edited page/layout/component files.
- No new inline visual style blocks for static design.
- New visual variants are tokenized in `globals.css` and reused.
- Login and shell pages preserve design consistency with the global theme.
- Module pages must use `ModuleSubNav` for sub-navigation.
- Module pages must follow the page → workspace pattern.
- Every data view has loading, empty, error and success states.
- No jargon in user-facing text — check against `docs/agents/05-ui-copy.md`.
