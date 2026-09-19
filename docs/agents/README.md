# NHIMS Frontend Rulebook (for humans and AI agents)

This folder is the single source of truth for **how the NHIMS frontend looks, reads, behaves and is built**. When existing code and these docs disagree, the docs win — bring the code you touch up to them.

## Files

| # | File | What it covers |
|---|---|---|
| 01 | [product-and-users](01-product-and-users.md) | Who uses NHIMS, their context, and design principles |
| 02 | [design-system](02-design-system.md) | Tokens, canvas, shell, cards, buttons, tables, pills, type, spacing |
| 03 | [components](03-components.md) | Every shared component: what exists, what to build, how to use it |
| 04 | [states-and-feedback](04-states-and-feedback.md) | Loading, empty, error, success, warning, offline, confirmations, critical alerts |
| 05 | [ui-copy](05-ui-copy.md) | Plain-language rules, jargon glossary, status label maps, message templates |
| 06 | [architecture](06-architecture.md) | Folder layout, page→workspace, services, queries, forms, errors |
| 07 | [access-and-navigation](07-access-and-navigation.md) | Roles, modules, menu groups, guards, what each role sees |
| 08 | [definition-of-done](08-definition-of-done.md) | Checklist every change must pass |
| — | [build-plan](build-plan.md) | All slices in build order with dependencies |
| — | [flows/](flows/README.md) | Per-actor flows and cross-actor end-to-end journeys |

## How the flows are organised

- **Actor files** (`flows/actors/`) — one per staff role. Each is split into small **slices** (e.g. `NUR-03 Record vitals`). A slice is the smallest piece that can be built, reviewed and shipped on its own.
- **Journey files** (`flows/journeys/`) — follow one patient across roles end to end (e.g. walk-in → registration → triage → consultation → lab → pharmacy → payment). They list which slices make up the journey and the **hand-offs** between roles, so the pieces join up.

Build slices one at a time; test journeys end to end once their slices exist.

## Source documents

These frontend rules implement the NHIMS project docs (charter, requirements `FR-*`, user flows, NHIS and DHIMS2 integration). Requirement IDs such as `FR-OPD-002` are referenced in slices so you can trace back.
