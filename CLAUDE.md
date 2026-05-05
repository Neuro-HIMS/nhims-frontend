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

## Workspace Layout Architecture

The workspace uses **GlobalDhimsHeader** (full-width dark blue header with module tab bar) + scrollable main:

```
<GlobalDhimsHeader />   ← dark blue, logo + module tabs (filtered by access) + user dropdown
<main>
  <PageContent />        ← scrollable, max-w-screen-2xl
</main>
```

`GlobalDhimsHeader` filters module tabs to only modules the user can access via `canUserAccessModule`. Each tab opens a dropdown sub-nav.

`sidebar.tsx` and `topbar.tsx` have been deleted — do not recreate them.

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