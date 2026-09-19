---
name: nhims-new-module
description: Add a new NHIMS section/module (route, workspace, sub-tabs, menu entry, role access, facility service gating) the standard way. Use when creating a new area such as a specialist clinic, blood bank or an admin page.
---

# Add a new NHIMS section

1. **Name it in plain words** — menu label, page title, one-line description, up to 5 sub-tab names. Check `docs/agents/05-ui-copy.md` §3 and add the new row there.
2. **Module key** — add to `AppModule` in `types/auth.types.ts` (kebab-case). If the backend stores it as an enum, conversions go through `lib/module-keys.ts`.
3. **Path** — add to `MODULE_PATHS` in `lib/access-control.ts`.
4. **Menu** — add a `NavItem` to `config/navigation.ts` with `group` (one of the seven groups) and `allowedRoles`. Pick an outline Lucide icon in the sidebar icon map.
5. **Facility gating** — if the section is a facility service line, map it in `config/facility-service-modules.ts`.
6. **Default landing** — update `DEFAULT_MODULE_BY_ROLE` only if this becomes a role's main work area.
7. **Page** — `app/(workspace)/<module>/page.tsx`: server component, `await requireModuleAccess("<module>")`, render the workspace.
8. **Workspace** — `components/<module>/<module>-workspace.tsx` ("use client"): `PageCard`, `ModuleSubNav` with a `<MODULE>_NAV` constant in `components/<module>/lib/`, `?view=` switch with a default view; one file per view in `components/<module>/views/`.
9. **Not ready yet?** Use the "This section isn't ready yet." empty state — never show module keys or service IDs.
10. **Docs** — add the section to `docs/agents/07-access-and-navigation.md` §2/§3 and create or extend the actor file with slices; add them to `build-plan.md`.
11. Run the `nhims-access-checker` subagent, then `pnpm lint && pnpm build`.
