# System administrator / super admin (`SUP`)

**Who** — this server's system administrator. NHIMS runs one facility per server, so "super admin" now means *system administrator of this server*, not an operator of many facilities. Everything a facility admin can do, plus system-wide lists. **No patient care.**
**Lands on** — `/dashboard`

---

### ~~SUP-01 · Switch facility~~ — retired (Stage 0, single-facility migration)
There is one facility per server, so there is nothing to switch between. The black facility badge in the header is a static label for every role, including super admin — see `docs/agents/02-design-system.md` §3.

### ~~SUP-02 · Facilities~~ — retired (Stage 0, single-facility migration)
No facilities list — a server has exactly one facility, managed via the normal Facility settings screens (`ADM-08`…`ADM-11`).

### SUP-03 · System-wide lists
**Requirements** — FR-ADM-005.
**Screen** — Diagnosis list (as ADM-11), NHIS prices, medicines list defaults — each with import/download and "Starts on" dates. Folded into facility admin settings now that there's only one facility to administer.
**Data** — partial (`conditions*`); rest **backend needed.**

### SUP-04 · Everything else
Uses the facility admin slices (ADM-*) directly — there's no facility filter any more, since there's only one facility.
