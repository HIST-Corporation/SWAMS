# features/dashboard

**Purpose:** Home for staff / manager / HR (Section 8.6). The screen every role opens first.

**Screens:** `/` (HomePage). States: loading (per-widget skeleton), error (per-widget ErrorState
with request ID + retry), offline (shell banner), denied (RequirePermission → NoAccessPage),
empty (each widget owns its own empty copy).

**Permissions:** none required for the index route; reviewer-only widgets are gated by
`can(principal, 'attendance.approve')` and their query never fires for a staff member
(Section 4.1). Org features are gated by entitlement.

**i18n:** en + ne via `useTranslation('dashboard')`; dates through `packages/i18n`, durations
via `formatDuration`.

---

## 5-line design plan (Section 9.9) — 2026-10-11 rebuild

Reference: the owner's "Example" workforce dashboard screenshot (dark rail, saturated stat
blocks, centrepiece chart, alert + team rail). Section 2 says replicate the **structure and
feel**, not the pixels — so the reference's _composition_ is taken wholesale and its _saturation_
is not, because 9.3 (colour discipline) and the 4.5:1 rule outrank it.

1. **Palette:** the reference's near-black rail becomes an **inverse nav surface** token pair
   (`--nav-bg` deep ink `#171B2B` light / `#1B2130` dark — never `#000`, which 9.10 forbids),
   with a solid **marigold** pill as the active item and `--accent` on the logo. The reference's
   yellow / red / blue stat blocks keep their _structure_ (label top-left, delta chip top-right,
   hero number below) but wear our sanctioned tint pairs — `primary-soft`, `accent-soft`,
   `success-soft` with their matching `*-text` foregrounds — so every pair clears 4.5:1 in both
   themes.
2. **Type roles:** greeting 28/1.2 · stat value 36/1.2 tabular · card label 14 `--text-muted` ·
   meta 12 `--text-faint`. The reference's small-caps labels become sentence case (9.4: no
   ALL-CAPS eyebrows). Devanagari lines take the 1.6 line-height.
3. **Layout:** asymmetric 5/7 top band — punch hero left, three stat panels right — then 8/4.
   The main column carries the Recharts week chart and the tasks list; the right rail carries
   the tinted "Needs you" alert, coming-up and team-now. Reviewers get the rail; staff span
   full width.
4. **One memorable element:** still the punch card and its confirmation (9.1). The chart is
   deliberately the second-loudest thing and animates nothing on its own (9.5).
5. **Content:** real fixture data only. The chart plots hours per weekday from
   `GET /attendance/history`; the "This week" delta compares against last week's rows from the
   same payload. Nothing on this screen is a number the server did not state (7.6, 9.6).

## Two layout variants

### Variant A — hero-left + stat panels, then 8/4 with a rail (chosen)

```text
┌ Good morning, Sita                Bhadra 12, 2083 / Aug 28   (topbar)
│ ┌── punch hero (r20, 5) ──┐ ┌ This week ▲+2h ┐ ┌ Leave left ┐ ┌ Due today ┐
│ │ 09:02 in · Baneshwor    │ └────────────────┘ └────────────┘ └───────────┘
│ │ [ Take a break ][ Clock ]    (primary tint)   (accent tint)  (success)
│ └─────────────────────────┘
│ ┌ Hours this week (8) ─────────────────────┐ ┌ Needs you (4) ─┐
│ │   ▂▅▃▇▁▁▁   real history rows, lazy      │ │ (danger tint)  │
│ └──────────────────────────────────────────┘ ├ Coming up ─────┤
│ ┌ Today's tasks — list with dividers (8) ──┐ │ Team now ──────┤
│ └──────────────────────────────────────────┘ └────────────────┘
```

### Variant B — full-width stat row above a full-width chart (rejected)

```text
┌ Good morning, Sita ─────────────────────────────────────┐
│ ┌ week ────┐ ┌ leave ───┐ ┌ tasks ───┐  3 equal cards,  │
│ └──────────┘ └──────────┘ └──────────┘  full width      │
│ ┌ hours this week ─────────────────────────────────────┐ │
│ └──────────────────────────────────────────────────────┘ │
│ needs you   │  coming up      │  team now                 │
└──────────────────────────────────────────────────────────┘
```

**Why A:** three equal cards across the full width is precisely the identical-card-grid AI tell
(9.10), and it demotes the punch card from hero to "one of three" — which 9.1 forbids. A keeps
the punch card dominant at 360px (it keeps its own full-width row there), gives the stat panels
a 7-col slot where their differences show, and puts exceptions ("Needs you") in the rail where
the reference puts its risk bubble.

**Reference adaptations worth recording:** the reference's duplicate navigation (both a sidebar
_and_ a horizontal pill nav) is not ported — 8.4 gives us one nav config, and a second copy
would be decorative. Its search bar becomes the real command palette trigger already in the
topbar rather than a field that does nothing (9.6). Its month calendar has no backing contract
endpoint, so it is not faked.

## 2026-10-12 — the prototype's full `#page-dashboard`, ported

**Owner asked:** "copy whole dashboard contents and design too from that file." The 2026-10-11
rebuild had taken the reference's _composition_ but left four of its panels out (attendance
trend, department rates, insights, industry benchmark) and replaced two others (the KPI row's
trend pills, today's meetings). They are now all in, for reviewers:

```text
header            greeting + date            [Export] [Clock in / out]
notice            "Sample company figures" (§12.1 — see below)
┌ 1fr ────────────────────────────────┐ ┌ 300px ─────────────┐
│ 4 KPI tiles  (rate% / +4 / 2 pending │ │ Workforce overview │
│              / 3 unexcused)          │ │ donut + 2×2 legend │
│ ┌ Attendance trend ┐ ┌ Department ─┐ │ │ (spans both rows)  │
│ │ area + Target 85%│ │ attendance  │ │ │                    │
│ └──────────────────┘ └─────────────┘ │ │                    │
└──────────────────────────────────────┘ └────────────────────┘
┌ Insights ────────────────────────────┐ ┌ Today's meetings ──┐
└──────────────────────────────────────┘ └────────────────────┘
┌ Industry benchmark (metric / ours / industry / status) ─────┐
└─────────────────────────────────────────────────────────────┘
┌ punch card ──────────┐ ┌ today's tasks ──┐ ┌ coming up ┐┌ Needs you ┐
```

**One payload, one screen.** Every org panel reads `GET /org/dashboard` (contract request 25):
`KpiRow`, `OrgTrendChart`, `DepartmentBars`, `WorkforcePanel`, `OrgInsights`, `TodayMeetings`
and `BenchmarkTable` each call `useOrgDashboard()`, so React Query issues **one** request (verified
in the browser: a single `GET /org/dashboard → 200`) and the four tiles, the donut's centre and the
trend's last point can never disagree. The mock's contract test pins those invariants.

**The two blocks with no endpoint are labelled, not faked.** Insights and the benchmark are org
analytics that no API serves; their figures come from the labelled fixture and the sentence is
their i18n key with the server's params (the shape notifications already use), never a string
baked into a component. That scope carries a `PreviewNotice` at the top of the reviewer
composition, so nobody reads a fixture as production data (§12.1). The punch card, tasks, rail
and "Needs you" below it are the app's live flows.

**Where the prototype was not followed, and why:** its saturated `.sched-block` fills cannot
carry 11px text at 4.5:1 in both themes, so the meetings blocks keep their shape with the
`*-soft` / `*-text` pairs (9.3); its department bars printed the percentage in the bar's own
colour, which made colour a second copy of the number, so the number is plain ink and the bar is
`aria-hidden` (8.9); its Export button raised a toast over an empty download, so Export writes a
real CSV of the figures on screen (`utils/orgSnapshot.js`, sharing one unit formatter with the
table so the file cannot disagree with it); and its 12-hour meeting times render as the 24-hour
Nepal clock the rest of the product uses.

**Staffing.** Staff keep the personal board (this week / leave left / due today, the hours chart)
and never mount an org panel — no request fires for them (`enabled: canReview`), which the e2e
suite asserts. The reviewer's own punch card and personal week chart: the punch card stays (they
clock in too); the personal hours chart does not, because the org board is what that screen is for
and `/attendance/history` still has the worker's own hours.

**Files.** `components/{OrgTrendChart,OrgTrendCanvas,DepartmentBars,OrgInsights,TodayMeetings,BenchmarkTable}.jsx`
(+ `OrgInsights`/`BenchmarkTable`/`DepartmentBars` tests), `utils/{units,orgSnapshot}.js`
(+ test), `mocks/{fixtures,handlers}.js` (+ 3 contract tests), `lib/download.js` (the blob helper
moved out of reports so no feature reaches into another's folders).

## 2026-10-12 — a staff Home that is someone's desk (role board + roster)

**Owner asked:** "still some contents are missing in dashboard and login screen, lets add few staff for demo
with sample content … easy to visualize like in html file". Chosen scope: **per-persona role boards + a
bigger shared roster**.

```text
staff Home  greeting + [Clock in / out]
            ┌ this week ┐ ┌ leave left ┐ ┌ due today ┐      (3 KPI tiles)
            ┌ YOUR BOARD: frontend queue + counts + YOUR POD ┐   ← new, per persona
            ┌ Hours this week ┐ ┌ Coming up ┐
            ┌ Today (punch) ┐ ┌ TODAY'S TASKS ┐
            ┌ TEAM NOW: the roster, 15 people, with sites ┐        ← new
reviewer    unchanged: org board, insights, benchmark, punch, tasks, rail, Needs you
            (no role board, no Team now — those are a staff desk's, not a manager's)
```

1. **One roster, many lists** (`src/mocks/roster.js`). Every demo person is defined once: id,
   name, job title (`nav.job.*`), directory title (`team.json`), department, site, attendance
   presence and online status. The attendance team board, the presence strip, the team directory
   and every persona's pod derive from it, so adding a colleague is one row and no two widgets can
   name the same id differently. The roster is 15 people (Sarah, Sita, Ramesh, Anita, Priya, James,
   Prakash, Tina, Sunita, Raj, Bibek, Aarati, Nabin, Kiran, Anisha) — the demo team now reads like
   an office, not three avatars.
2. **`GET /staff/board` (contract request 26)** gives each role card its own queue and pod: the
   prototype's staff login promises "each role is its own account — pick one to see that board",
   and until now all four personas opened the same page. The role is read from the **session**
   (never a query parameter), so a persona cannot ask for someone else's queue, and an HR session
   gets 403 `not_a_staff_board`. `counts` ships from the payload and is asserted to sum to the
   queue it describes; the pod resolves roster ids server-side.
3. **`StaffBoard` + `TeamNow` components.** The board is a labelled `Card`: counts row, queue rows
   (kind badge, meta, due, priority, status — all words, no colour-only meaning), the pod, and a
   note that the queue is sample data until assignments exist. `TeamNow` is the roster's presence
   strip (`GET /presence`, now carrying `site`), with `/n of /m in today` and the designed empty
   state. Both wrap at every width — checked at 360, 768 and 1280.
4. **A defect fixed on the way:** the staff tasks list rendered `bare` in the grid, so it arrived
   as an unlabelled stack of rows beside the punch card. It is now a titled `Card` on both
   variants ("Today's tasks"), the same fix the coming-up rail already had.
5. **Login screen (`features/auth`)** — the owner's follow-up: the DEMO CREDENTIALS card is gone
   and the form now opens **autofilled** with the selected role's demo account, password included;
   role/persona switches swap address and password together (but never overwrite a hand-typed
   address), and a line under the button still says the credentials are demo data. Covered in
   `features/auth/README`-adjacent tests (see `LoginPage.test.jsx`).

**States covered:** loading (skeleton per new widget), error (`ErrorState` + request ID + retry),
empty ("Your queue is clear", "Nobody on the roster yet"), denied/hidden (HR never mounts the
board; a session without `staffRole` fetches nothing).

**Files:** `src/mocks/{roster.js,fixtures.js}`, `mocks/{staffBoards.js,fixtures.js,handlers.js,handlers.test.js}`,
`components/{StaffBoard,TeamNow}.jsx` (+ tests), `pages/HomePage.jsx`, `hooks/{useDashboard.js,keys.js}`,
`api.js`, `features/team/mocks/fixtures.js`, `features/attendance/mocks/{fixtures,handlers}.js`,
`features/auth/pages/LoginPage.jsx`, `locales/{en,ne}/{dashboard,nav,team,common}.json`.

## 2026-10-12 — the composition was wasting a third of the screen

**Owner asked:** "lots of white space in design and content seems too congested in most of the parts".
The measurements and the full record live in `docs/PROGRESS.md`; what a future reader needs here is the
_shape_ of the fix:

```text
before (staff, 1440)                      after
┌ 1fr          ┐ ┌ 300px, EMPTY ┐        ┌ 1fr ────────────────────────┐
│ 3 KPI tiles  │ │              │        │ 3 KPI tiles (aligned)       │
│ role board   │ │              │        │ role board: counts strip,   │
└──────────────┘ └──────────────┘        │   queue 2-zone rows, pod    │
┌ punch ──┐ ┌ tasks ──┐  (full width)    └─────────────────────────────┘
```

1. **A reserved track must be something you will render.** The `1fr 300px` split is reviewer-only now;
   a staff Home has no workforce panel, so the 300px rail was an empty column that cost the KPI row and
   the role board 320px of width.
2. **The page owns the rhythm.** `PageHeader` lost its `mb-7` (it is used only here), so the gap under the
   greeting is the page's own 24px instead of 52px.
3. **Every tile in a rail gets a head element.** The staff KPI tiles gained icons; without one, the tile
   that had a trend pill pushed its figure 24px below its neighbours'. `StatTile`'s head row collapses when
   empty, so a plain rail (the team board) stays compact instead of paying for the convention.
4. **A row is two zones, not a queue of pills.** Queue rows: what/where on the left (title, then kind +
   reference + due), urgency on the right (status over priority). The title went from 320px to ~660px.
5. **Counts are a strip with hairlines**, not four sunken cards around one digit each, and the pod rail is
   separated by a hairline and states how much of the pod is in today — counted from the rows the payload
   stated, never derived from anything else (7.6).
6. **Tablets get the content width.** At 768 (a required width) the 240px sidebar left 464px of content;
   the sidebar now starts at `lg` and the bottom rail carries nav to 1023px.

## States

| State   | Design                                                              |
| ------- | ------------------------------------------------------------------- |
| loading | per-widget `Skeleton`; the chart shows a block at chart height      |
| empty   | "No days recorded this week" / "Nothing due today" with a next step |
| error   | per-widget `ErrorState` with request ID + retry                     |
| denied  | `RequirePermission` → NoAccessPage                                  |
| offline | shell banner; widgets keep serving cached rows                      |

## Tests

`weekStats.test.js` — week window and the new per-weekday series + last-week delta.
Shell and access tests cover the nav config, not the pixel styling.

## Open decisions

- The inverse (dark) nav surface is an addition to Section 8.2's palette, added as tokens with
  contrast tests. If the owner later picks a different brand colour, `--nav-active-bg` is the
  one value to re-pick.
- **The org board is labelled sample data until request 25 lands.** If the owner wants the notice
  gone, the honest path is the endpoint, not deleting the label.
- **`--panel-dot1` is lime in dark** (`#D7FF3E`) and violet in light, so the donut's dominant
  segment flips hue between themes while the KPI hero stays blue. That is the token set's own
  choice (see `docs/design/token-diff.md`), not this feature's — worth one decision if the owner
  wants the panel to read the same in both themes.
- **The KPI chips use warning for "pending" and danger for "unexcused"**, where the prototype
  painted both red: two amber/red pills on one screen would imply two failures, and the words
  beside them already say which is which.
- `TeamTodaySummary.jsx` and `TeamPresence.jsx` were deleted in this rebuild: neither was
  imported anywhere, and their content duplicated PresenceMeter ("who's in") and NeedsYou (the
  queue link) on the same screen.
