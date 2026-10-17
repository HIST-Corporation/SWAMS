# Staff Home — design plan (Section 9.9)

**Last verified:** 2026-10-08 · Owner: Design Lead · Build: slice 3 (R1) · Screens: `/` (staff lens)

## 1. Five-line design plan

1. **Palette:** the page background is `--bg`; one hero surface (`--surface` + `--shadow-1`,
   radius `--radius-hero-card` 20) carries the punch card; the two secondary stats are _tinted
   panels_ (`--primary-soft` for hours, `--accent-soft` for leave) — no white-card grid; indigo
   icon chip for attendance, marigold for leave; status text uses `--*-text` tokens only.
2. **Type roles:** greeting = 28px/1.2 (xl), hero timer = 36px/1.2 tabular, panel labels = 14px
   `--text-muted`, meta = 12px `--text-faint`; Devanagari lines get 1.6 line-height; one family
   (Mukta) everywhere; no ALL-CAPS eyebrows.
3. **Layout sketch:** asymmetric 8/4 — hero punch card left, two tinted stat panels stacked
   right; below, a plain divided list "Needs you" (the only section with a count), then today's
   tasks as a list (not cards) with the team presence row as a quiet footer strip.
4. **One memorable element:** the punch card and its confirmation — the TimerRing completes with a
   short tactile settle when you clock in (reduced-motion: instant state change, live region
   announcement). Everything else on the page is calm (9.1, 9.5).
5. **Content:** real fixture data only — Sita Shrestha, Baneshwor, `Bhadra 12, 2083 / Aug 28`,
   `रू` amounts via the NPR formatter, team avatars = initials on chip tints.

## 2. Two layout variants

### Variant A — hero-left + tinted stat rail (chosen)

```text
┌ Good morning, Sita            Bhadra 12, 2083 / Aug 28   [lang][theme][bell][SS]
├──────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────┐ ┌──────────────┐ ┌──────────────┐           │
│ │ HERO · punch card (r20)      │ │ This week    │ │ Leave left   │           │
│ │ 09:02 in · Baneshwor         │ │ 31h 40m      │ │ 11 days      │           │
│ │ [▶ 4h 18m live]              │ │ +2h OT       │ │ (accent tint)│           │
│ │ ( Take a break ) (Clock out) │ │ (indigo tint)│ └──────────────┘           │
│ └──────────────────────────────┘ └──────────────┘                            │
│ Needs you (2)                                                               │
│   Review Rajan's PR                              due today                   │
│   Sign off timesheet                             due today                   │
├────────────────────────────────┬─────────────────────────────────────────────┤
│ Today's tasks (list, dividers) │ Team now (avatar strip, scrolls on mobile)  │
│ ▸ Send invoice export   15:00  │ (RA)(AT)(PG)(SR)(BK)                        │
│ ▸ Update onboarding doc today  │                                             │
└────────────────────────────────┴─────────────────────────────────────────────┘
360px: rail stacks under hero; bottom tabs Home·Attendance·Work·Leave·More; sticky Clock action
```

### Variant B — three equal cards + two lists (rejected)

```text
┌ Good morning, Sita ──────────────────────────────────────┐
│ ┌ punch ────────┐ ┌ leave ──────┐ ┌ week ──────────────┐ │
│ │ equal width   │ │ equal width │ │ equal width        │ │
│ └───────────────┘ └─────────────┘ └────────────────────┘ │
│ Needs you (2)  │  Today's tasks  │  Team now            │
└──────────────────────────────────────────────────────────┘
```

**Why A:** the punch card is the hero of staff Home (8.1.1, 9.1) and must dominate at 360px —
equal columns (B) demote it to "one of three cards", which is exactly the identical-card-grid AI
tell (9.10). A also gives exceptions first billing: "Needs you" is a full-width band directly
under the fold-line, while B splits attention three ways. A matches the prototype's structure and
feel (bold hero stat card + soft tinted panels) without recoloring the old layout wholesale.

## 3. States (designed before happy path)

| State            | Design                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- |
| loading          | shell skeleton already covers Home; hero shows a shimmer block at hero size (no spinner) |
| empty (new hire) | hero invites the first punch: "Clock in to start your day" + one button                  |
| error            | inline card under the greeting: what happened + request ID under "Details" + retry       |
| denied           | `RequirePermission` → designed no-access page (who can grant it)                         |
| offline          | shell banner + hero switches to "queued on this device" chip with sync count (7.2)       |

**Build note (2026-10-12):** variant A shipped, including the "Team now" avatar strip this plan
called for — it reads `GET /presence`, which now lists the whole 15-person demo roster with sites.
A staff Home also gained its own work queue per role (`GET /staff/board`, contract request 26), the
panel the prototype's staff login promises with its four role cards. See
`apps/web/src/features/dashboard/README.md`.

## 4. Critique pass (to complete at build, Section 9.9 step 4)

- [ ] Review at 360 / 768 / 1280 in **both** themes; verify text pairs with the token tests.
- [ ] Remove one decoration (current candidate: the greeting's date chip could merge into the
      topbar meta slot).
- [ ] AI-tell checklist 9.10 signed off; screenshots pasted into the PR.
