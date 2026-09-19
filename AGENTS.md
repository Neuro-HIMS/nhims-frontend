<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices. (Example: request interception lives in `proxy.ts`, not `middleware.ts`.)
<!-- END:nextjs-agent-rules -->

# NHIMS Frontend — Agent Rules

NHIMS is a hospital management system for Ghanaian health facilities. Users are nurses, doctors, midwives, records clerks, pharmacists, lab staff, cashiers and administrators — busy, often on slow internet and shared computers, not tech-savvy. **Every screen must be simple, intuitive, straightforward and well structured.**

The one test for every screen: *a new nurse on her first day knows within 5 seconds what the screen is for, what to do next, and whether anything is wrong.*

This file is the short version. The full rulebook lives in `docs/agents/` — read the doc listed for your task **before** writing code.

| Before you… | Read |
|---|---|
| Touch anything visual | `docs/agents/02-design-system.md` |
| Build or reuse a component | `docs/agents/03-components.md` |
| Add loading / empty / error / success handling | `docs/agents/04-states-and-feedback.md` |
| Write any text a user will see | `docs/agents/05-ui-copy.md` |
| Add a page, service, query, form | `docs/agents/06-architecture.md` |
| Touch roles, menu, route guards | `docs/agents/07-access-and-navigation.md` |
| Build a feature for a staff role | `docs/agents/flows/actors/<role>.md` |
| Build something that crosses roles | `docs/agents/flows/journeys/<journey>.md` |
| Decide what to build next | `docs/agents/build-plan.md` |
| Say "done" | `docs/agents/08-definition-of-done.md` |

---

## 1. Non-negotiable rules

### Visual (design system v2 — monochrome, dotted canvas)
1. **All colors come from tokens in `app/globals.css`.** No hex/rgb/hsl, no Tailwind palette colors (`bg-red-50`, `text-slate-500`, `bg-green-…`) in components. Need a new intent? Add a token + utility class in `globals.css` first.
2. **Look:** dark charcoal sidebar (`--sidebar`), white top bar, white page canvas with a faint dotted grid (`.canvas-dots`), white cards with a 1px `border-border` and `rounded-xl`, **black primary buttons**, soft pastel status pills with icon + text.
3. **One primary (solid black) button per screen or dialog.** Secondary = black outline (`variant="outline"`), tertiary = grey outline (`variant="secondary"`), row icons = `ghost`, red solid (`destructive`) only as the confirm button inside a confirmation dialog.
4. **Color is never the only signal.** Every status = pill with icon + words.
5. **Blue (`--accent`) is only for text links and focus rings.** Never for buttons.
6. **One red only** (`--destructive` = `--error`). Feedback colors (success/warning/pending/error/info/purple/neutral) and medical colors (`--clinical-*`, `--nhis-*`, `--result-*`) are separate systems — don't swap them.
7. No inline `style={{}}` for static design. No ad-hoc font stacks — use `font-sans` (Inter), `font-clinical` (tabular numbers for IDs, vitals, money, results).

### Words
8. **No software jargon on screen** — never: module, token, API, sync, backend, server, payload, config/configuration, catalog, matrix, legacy, snapshot, SKU, MSISDN, TOTP, encounter, endpoint, status codes, raw error text, database IDs, enum values (`MEDICAL_OFFICER`, `AT_VITALS`). Use the glossary in `docs/agents/05-ui-copy.md`.
9. Everyday medical words (triage, vitals, OPD, ANC, NHIS, ward) are fine; spell out abbreviations once per screen.
10. Sentence case everywhere. Buttons start with a verb and say what happens ("Save vitals", "Send to doctor"). Never "Submit", "OK", "Process".
11. Every error says **what happened and what to do next**. Never show `error.message` from the server directly — map it through `lib/api-errors.ts`.

### States
12. **Every data view ships with four states: loading (skeleton), empty (illustration + title + sentence + action), error (message + "Try again"), success (toast or confirmation).** A PR that only handles the happy path is not done.
13. Risky actions (delete, cancel, discharge, remove access, reverse payment) always go through `ConfirmDialog` naming the exact thing.
14. Critical medical alerts (allergy conflict, critical lab value, high-risk pregnancy) are pinned red alert cards on the patient page — never a disappearing toast.

### Code structure
15. **Page → workspace pattern.** `app/(workspace)/<module>/page.tsx` is a server component that calls `requireModuleAccess("<module>")` and renders `<ModuleWorkspace />` from `components/<module>/`.
16. Views are switched with `?view=` and listed with `ModuleSubNav` (max 5 visible tabs; extra go under "More").
17. All HTTP goes through `services/*.service.ts` using `apiClient`. Components never call `axios`/`fetch` directly.
18. All server state via TanStack Query with keys from `lib/query-keys.ts`. After a mutation, invalidate the affected keys — including the *next* role's queue (e.g. saving vitals invalidates the doctor's queue).
19. Forms: `react-hook-form` + `zod` schema in `schemas/`, fields via `components/ui/form.tsx`.
20. Access checks only through `lib/access-control.ts` and `lib/permissions.ts`. Never check `user.role === "…"` inline in a component.
21. Types for API data live in `types/*.types.ts`; convert backend enum values to words with a label map, never render them raw.
