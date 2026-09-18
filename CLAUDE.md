@AGENTS.md

# Frontend UI Design System Rules

## Single Source of Truth
- All color, typography, radius, and semantic UI tokens must be defined in `app/globals.css` under `:root` and `@theme inline`.
- Shared visual patterns must be implemented as semantic utility classes in `app/globals.css` (example: `.login-hero`, `.alert-critical`, `.facility-chip`, `.sidebar-shell`).
- Components and pages must consume these tokens/classes instead of hardcoded values.

## Non-Negotiable Constraints
- Do not hardcode hex/rgb/hsl colors in page/layout/component files.
- Do not use inline `style={{ ... }}` for visual design unless it is truly dynamic (for example transform/position calculated at runtime).
- Do not introduce ad-hoc font stacks in components; use design tokens (`font-sans`, `font-clinical`, `font-mono`) only.
- Do not create one-off spacing/shape systems per page; reuse Tailwind scale + tokenized radius.

## Typography
- Default UI text uses `font-sans` (DM Sans via global token mapping).
- Clinical identifiers/codes/numeric values use `font-clinical`.
- Heading hierarchy should remain consistent with global `h1-h6` defaults in `globals.css`.

## Color & Semantics
- Status and intent colors must use semantic tokens (`--clinical-*`, `--nhis-*`, `--result-*`, `--destructive`, etc.).
- Header/login surfaces must use existing semantic utility classes/tokens, not local color choices.
- If a new UI intent is needed, add a new token/class in `globals.css` first, then consume it in components.
- `--brand` (navy) is chrome only — sidebar, logo marks. `--primary` (blue) is the one "main action" color — buttons, links, selected items, focus rings. Don't use `--brand` for interactive elements or `--primary` for navigation chrome.
- One red only: `--destructive`/`--error` (`4 76% 40%`). Never introduce a second red.
- Feedback colors (`success`/`warning`/`error`/`info`, each with a `-bg` pair) are for system messages (saved/failed/pending/tip). Medical status colors (`--clinical-*` triage, `--nhis-*`, `--result-*` lab flags) are a **separate** system — don't reuse feedback tokens for triage/lab/NHIS status or vice versa, even where the hue overlaps.
- Lab results: low is blue (`--result-low`), high is amber (`--result-high`), critical is red (`--result-critical`) — never the same color for low and high.
- Color is never the only signal — pair every status color with a word and/or icon.

## Workspace Layout Architecture

Redesigned 2026-09 per the NHIMS design brief. The workspace uses a **left-hand menu** (`AppSidebar`) grouped by type of work, plus a light **top header** (`AppHeader`) with global patient search, and a scrollable main:

```
<AppSidebar />            ← navy, collapsible to icons, items grouped (Home/Patients/Care/
                             Tests and medicines/Money/Reports/Admin), filtered by access
<AppHeader />              ← light surface, facility name/logo, global "Find a patient"
                             search, notifications, user menu — nothing else
<main>
  <PageContent />          ← scrollable, max-w-screen-2xl
</main>
```

- `components/layouts/app-sidebar.tsx` renders `NAV_ITEMS` from `config/navigation.ts`, filtered to accessible modules via `canAccessWorkspaceModule`, grouped by `NAV_GROUP_ORDER`/`NAV_GROUP_LABELS`. Collapse state persists to `localStorage`.
- `components/layouts/app-header.tsx` is intentionally minimal: facility branding, patient search (only for roles with `records` access), notifications, user menu (My profile / Sign-in and security / Sign out). Do not add non-functional icons (no "Messages", no "Applications" grid) and do not add a permanent "Online" badge — only show connectivity state when actually offline (`OfflineBanner`).
- Do not recreate the old `GlobalDhimsHeader` dark-blue tab-bar-with-dropdowns pattern.
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

**Sub-navigation** uses `ModuleSubNav` from `@/components/layouts/module-subnav`. Sub-nav items are defined per module in the workspace component (not in `navigation.ts`).

## PR/Change Checklist
- No hardcoded colors in edited page/layout/component files.
- No new inline visual style blocks for static design.
- New visual variants are tokenized in `globals.css` and reused.
- Login and shell pages preserve design consistency with the global theme.
- Module pages must use `ModuleSubNav` for sub-navigation.
- Module pages must follow the page → workspace pattern.