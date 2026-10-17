# SWAMS Frontend — Design Research & Direction

**Date:** 2026-10-10 · **Scope:** the visual and interaction direction for the authenticated app and the public marketing site.

This records the §4 design-research deliverable. It distinguishes what was actually inspected from what is reasoned from the supplied prototypes and established design systems. It does **not** claim live browser research that did not happen.

---

## 1. What was actually reviewed (FACT)

- **The two supplied prototypes** (read-only copies in `design-prototype/`): `SWAMS_Unified.html` (the ~4,400-line HR + staff prototype) and `SWAMS_Landing.html` (the dark, gradient-heavy landing page). Both were audited screen-by-screen into `docs/design/screen-inventory.md`.
- **The binding product brief** `docs/FRONTEND_PROMPT.md`, whose §3 already carries a competitor table (Deputy, Connecteam, Homebase, OnTheClock, Zoho People, Keka, greytHR, Truein, RigoHR, NepalHRM, Leave Balance) with Nepal table-stakes identified: BS/AD dual dates, Nepali fiscal year, holiday calendar, en/ne UI, NPR lakh/crore grouping.
- **The shipped token system** vs the prototype's, diffed in `docs/design/token-diff.md`.

**Limitation (stated honestly):** this session did not perform new live scraping of the listed vendor sites. The competitor observations below are inherited from the repo's own §3 research (dated Oct 2026, vendor-reported) plus established design-system principles. Where a claim is a design principle rather than a verified vendor fact, it is marked as reasoning.

## 2. Shortcomings of the supplied prototypes (FINDINGS)

The owner's stated dissatisfaction is justified on structural, not just cosmetic, grounds:

- **Landing page:** dark canvas with layered purple-blue gradients and glows, decorative grids behind sections, a bento grid for every content block, pill-heavy containers, and DM Sans/Syne pairing. Attractive but generic-SaaS; it reads as a template rather than a workforce product, and the heavy decoration competes with the actual value proposition.
- **Unified app:** two near-duplicate shells (HR + staff) with repeated markup, inline event handlers, hardcoded sample content, and several prototype-only views (personas, journeys, design-system, database, case-study) mixed in with real product screens. It ships **no** loading/empty/error/denied/offline states and uses cosmetic role-switching instead of real guards. Status is often communicated by color alone.

## 3. Patterns worth adopting (REASONING + inherited research)

| Pattern                                                | Why it works                                                       | Where it landed                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| Exception-first home ("what needs me")                 | A daily-use ops tool should lead with action, not vanity totals    | `NeedsYou` band on Home                                      |
| "Who's in now" live board                              | Managers' first question is presence, not a report                 | team attendance + presence strip                             |
| Layered punch checks with a clear "needs review" state | A failed geofence/device check should never silently block a punch | punch machine `needsReview`                                  |
| Explicit sync state on queued actions                  | Mobile sync bugs are the top complaint class in this category      | offline-queue chips (queued/sending/sent)                    |
| Approval with an undo window                           | Prevents mis-taps on consequential decisions                       | contract request 8 (pending backend)                         |
| Nepali-first content, dual dates, en/ne                | Local trust and table-stakes compliance                            | `packages/i18n`, `packages/domain`                           |
| Calm, dense, scannable enterprise UI                   | It is opened every day on a mid-range phone and a desktop          | tokens: restrained shadows, subtle borders, tabular numerals |

## 4. Patterns deliberately rejected (OPINION)

- Gradient/glow backgrounds, glassmorphism-as-default, neon accents, decorative grids behind every section, bento-everything, oversized marketing type inside dashboards, and emoji-as-icons — the prototype's signature moves. They reduce scan speed and credibility for a back-office tool.
- Surveillance affordances (screenshots, keystroke tracking). Not built; location is read only at punch, with plain-language consent.
- A second identical shell per role. One config-driven shell, permission-shaped content instead.

## 5. Final design direction (OPINION — implemented)

A **light-first, warm-neutral enterprise SaaS** language: soft ivory/grey canvas (`--bg #F4F5F9` light / `#0E1118` dark), white raised surfaces, deep-ink text, muted slate support text, a restrained indigo primary plus a warm marigold support hue (a familiar Nepali colour) so the product is not generic blue SaaS. Clear type hierarchy, consistent tokenised spacing/radii/elevation, subtle borders, purposeful colour, and tabular numerals for times and counts. Semantic colours carry success/warning/danger/info, always paired with a text label (never colour alone).

- **App:** lower design variance, higher density — familiarity and scanning win.
- **Marketing:** higher variance, one orchestrated moment — the animated product preview hero is the single memorable element; everything else stays quiet.

## 6. Navigation, dashboard and accessibility direction (OPINION)

- **Navigation:** one permission/entitlement/release-driven config; grouped sidebar on desktop, bottom tabs + "More" on mobile; hidden items never leave empty groups; locked (never dead-linked) when an entitlement is missing.
- **Dashboard:** answer "what's happening / what needs me / what can I do", with each metric traceable to a data source and a next action. Charts only where they answer a real question, with text/table alternatives.
- **Accessibility:** WCAG 2.2 AA target — semantic landmarks, logical headings, visible focus, labelled controls, `aria-live` status regions, reduced-motion support, ≥4.5:1 text contrast in **both** themes, keyboard paths for every consequential action. Automated `jsx-a11y` lint plus manual keyboard walks; an automated pass is not claimed as proof of full compliance.

## 7. Source references

- Supplied prototypes: `design-prototype/SWAMS_Unified.html`, `design-prototype/SWAMS_Landing.html`.
- Competitive table and Nepal table-stakes: `docs/FRONTEND_PROMPT.md` §3 (vendor-reported, Oct 2026 — re-verify before any marketing use).
- Token mapping: `docs/design/token-diff.md`. Screen inventory: `docs/design/screen-inventory.md`.
- Design-system principles referenced: WCAG 2.2, Atlassian/Polari s/GOV.UK-style foundations (density, focus, semantic colour, calm enterprise UI). No proprietary assets, branding, or layouts were copied.
