## 2026-10-13 (later) — the PWA finally became one: offline shell, update toast, install-after-first-punch

**Owner asked:** nothing new — this closes the standing "PWA slice" item (`vite-plugin-pwa` had been
a dependency since day one but was never wired: no manifest, no service worker, no install prompt,
no update toast).

**What landed**

1. **Manifest + service worker** (`apps/web/vite.config.js`). `VitePWA` with `registerType:
'prompt'`: a new version waits behind a toast and never swaps under a user mid-punch. The app
   shell (js/css/html/fonts/icons, 97 entries) is precached; `/api/**` is `NetworkOnly` (REST is
   truth, §5) and MSW's own `mockServiceWorker.js` is excluded from the precache — a stale mock
   worker must never outlive the mocks it was built with. `devOptions.enabled: false`: in dev, MSW
   owns fetch and a second worker only worsens the controller flakiness documented in
   `src/mocks/index.js`. Registration happens in the app (below), so `injectRegister: false`.
2. **`lib/installPrompt.js`** — the install-offer state machine, framework-free and unit-tested:
   captures `beforeinstallprompt`, offers **only after the server confirms a first punch** (§11.8's
   "not on load" rule) via `noteFirstPunch()` called from `usePunch`, suppresses re-offers for a
   week once one is shown (dismissing the toast counts as "not now"; the deferred prompt survives
   so the visible Install button still works), and degrades to "no flags" when localStorage is
   blocked. `appinstalled` clears the deferral.
3. **`shell/PwaUpdater.jsx`** — invisible host mounted in `App.jsx` inside `ToastProvider`:
   `useRegisterSW` (the real v2 API returns `[state, setState]` tuples — verified against the
   installed `dist/client/build/react.js`, not from memory) toasts "A new version is ready" with a
   working **Reload now** action, and renders the install toast when the lib says an offer is due.
   Offline-ready is deliberately silent.
4. **i18n** `common:pwa.{update,install}.*` in **both** en and ne (catalog parity test green);
   `index.html` gains `apple-touch-icon` + `mobile-web-app-capable`; `workbox-window` added to
   `apps/web` devDependencies (the plugin's optional peer — without it the build fails at
   `virtual:pwa-register/react` with "Rolldown failed to resolve import").

**Verified, not inferred**

- `pnpm build` → 4/4; `dist/manifest.webmanifest` present and linked from `dist/index.html`;
  `dist/sw.js` + workbox runtime emitted; script-checked the precache manifest: **no
  `mockServiceWorker`**, navigateFallback → `index.html`, both icon links in the built HTML.
- `pnpm exec vitest run` → **71 files, 718 tests, exit 0** (17 new: 13 lib + 4 component).
- `pnpm e2e` → **30 passed** (desktop-1280 + mobile-360, incl. the both-themes contrast audit).
- `pnpm lint` / `pnpm format:check` → clean.

**Files**

- `apps/web/vite.config.js`, `apps/web/index.html`, `apps/web/package.json` (+`workbox-window`).
- `apps/web/src/lib/installPrompt.js` (+test), `apps/web/src/shell/PwaUpdater.jsx` (+test),
  `apps/web/src/app/App.jsx`, `apps/web/src/features/attendance/hooks/usePunch.js`.
- `packages/i18n/locales/{en,ne}/common.json`, `vitest.config.js` (alias for the virtual module),
  `tests/pwa-register.stub.js`, `docs/frontend/offline-and-pwa.md` (new).

**Limitations, stated plainly**

- The install **toast** cannot appear in a headless/e2e run: `beforeinstallprompt` is a
  Chrome-only, engagement-heuristic event. Covered by unit/component tests with a faked event; the
  toast itself was not walked in a real browser this session.
- SVG-only icons: Chromium installables accept `image/svg+xml`, but **iOS Safari's apple-touch-icon
  still wants a PNG** — the link is present; iOS will fall back to a screenshot until raster icons
  are added (needs a design decision, not blocked on the backend).
- The manifest's `theme_color` is static `#F4F5F9`; the in-page `<meta theme-color>` follows the
  active theme via the pre-paint script. Per-theme splash screens would need two manifests.
- Queue **persistence** already shipped earlier (`queueStorage.js`); this slice is the shell half.

---

## 2026-10-12 (later still) — the board grew its card actions and its columns, the calendar grew holidays for _your_ region, and staff see only their own work

**Owner asked:** the board should read like the prototype's ("To do / In progress / Review / Revision / Done"
with the card's own buttons), a manager needs somewhere to **add more slots** for tasks, the calendar needs a
**holidays section depending on where the institution is**, and a staff board must show **only the work
referred to them, by hierarchy**.

**What landed**

1. **The card's lane buttons (prototype parity).** `CardActions.jsx` renders Start (To do, Revision),
   Send to review (In progress), Approve + Push back (Review), nothing in Done — the same moves the drag and
   keyboard paths make, so nobody has to drag to run the workflow. Push back deliberately does _not_ move the
   card on its own: it opens the issue/suggestion/severity dialog, because Revision requires a note (§7.6).
2. **"More slots" for managers.** `LaneSettingsDialog` + `LaneRowEditor` behind the header's **Board
   settings** button (rendered only when the server says `canManage`; the mock re-checks with 403
   `not_allowed`): rename any column, set a WIP limit, and **add a column** at the end of the board
   (`POST /tasks/lanes`, `PATCH /tasks/lanes/:id`). WIP limits advise — the header turns red and says so,
   the server never traps work in a lane.
3. **Calendar holidays by location.** `HolidaysSection.jsx` answers "which of these are mine?": national
   holidays always apply, a regional one applies only when its region matches the institution's — the
   section says "Baneshwor (Bagmati) observes 3 holidays this month", lists them with National/Regional
   badges, and folds the rest into "1 holiday in another region". Labelled as a sample list until contract
   request 27 exists.
4. **Hierarchy scope, end to end.** `mocks/scope.js` decides what a session may read _and_ write: an
   HR/manager session reads every task, a staff session only tasks in its own name or referred to it for
   review, `?scope=all` as staff is 403 `scope_denied`, and the revision trail is filtered to tasks the
   session can see. The board echoes what came back (`scope.self` line) rather than assuming a scope from a
   role label.

**Refactor on the way through** (the repo's 250-line file / 180-line component limits): `TaskCard` →
`CardActions`, `NewTaskForm` → `NewTaskFields`, and the whole pointer/keyboard move machine left
`TasksPage` for `hooks/useBoardDrag.js` — state and announcements in one place, the page back to rendering.

**Verified live, not inferred** (dev server on 5173, MSW mocks):

- Staff session (Priya Sharma): five lanes, card actions on the right lanes, and the note _"Showing only the
  work referred to you — tasks in your name and reviews assigned to you."_ — 5 cards, no Board settings.
- HR session (Sarah Mitchell): all 16 seeded cards, `canManage` button present; **added a column "Design QA"**
  → `POST /tasks/lanes 201`, the sixth lane rendered with its empty state and the dialog listed six columns.
- A move through the refactored hook: card **Start** → `PATCH /tasks/:id 200`, live region _"Moved Prepare the
  monthly payroll export to In progress."_, In progress 4/3 with the WIP warning; then the keyboard path on
  another card (Space → ArrowRight → Space) announced _"… → In progress"_ and the card changed lane.
- `documentElement.scrollWidth === innerWidth` at 360/768/1280 — no page-level horizontal overflow.

**Files**

- `apps/web/src/features/tasks/components/{CardActions,NewTaskFields,LaneSettingsDialog,LaneRowEditor}.jsx`,
  `hooks/useBoardDrag.js`, `mocks/{laneConfig,scope,checklist,seedHelpers,seedTasks,seedRevisions,store,handlers}.js`,
  `utils/{lanes,draft,nepal}.js`, i18n `tasks:actions|settings|scope|wip`.
- `apps/web/src/features/calendar/components/HolidaysSection.jsx`, `mocks/fixtures.js`, `hooks/useCalendar.js`,
  i18n `calendar:holidays.*`.
- Tests: `tasks/mocks/handlers.test.js` (23), `tasks/pages/TasksPage.test.jsx` (17),
  `calendar/pages/CalendarPage.test.jsx` (15), `e2e/theme.spec.js` (28 flows).

**Checks**

- `pnpm lint` → **exit 0** (ESLint + JS-only + import-boundary guards). `pnpm exec vitest run` → **62 files,
  652 tests, exit 0**. `pnpm e2e` → **28 passed** (desktop-1280 + mobile-360), including "staff moves a task
  with the keyboard and creates one". `pnpm build` → **4/4 tasks**.
- Looked at, both themes: board 1280 light + dark, 768 dark, 360 dark; calendar 1280 light + dark, 768 light,
  360 light.

**Limitations, stated plainly**

- `pnpm knip` exits 1 — pre-existing configuration hints plus pre-existing unused exports (`useDecideCorrection`,
  `weekdayNames`, …). **None of the new files or exports are flagged**; I did not touch the config.
- `pnpm check:cruiser` cannot run here: dependency-cruiser supports Node `^22 || ^24 || >=26` and this machine
  runs 25.2.1. Not a code failure — the guard simply never executed.
- MSW's worker goes dormant in a tab that sits idle (the failure mode already documented in
  `src/mocks/index.js`). During verification one `PATCH` fell through to the dev server and 404'd, which the
  board correctly reported as _"Move undone: We couldn't find that."_ — it succeeded after a reload. Worth
  knowing before reading any 404 in a long-lived tab as a product bug.
- **Open decision:** our lane labels are sentence case ("Review", "Revision") where the prototype prints
  "IN REVIEW" and "NEEDS REVISION". That is a wording choice, not a missing feature — say the word and the
  i18n strings change.

## 2026-10-12 (later) — the layout stopped wasting a third of the screen, and the rows stopped crowding

**Owner asked:** "there seems lots of white space in design and content seems too congested in most of the
parts — study well and make UI design more manageable too", with a screenshot of the staff Home.

**What the screen was actually doing** (measured live at 1440, staff session — the numbers are what made
the rest of this section possible):

| Symptom                                                                      | Measured before                                                                                                          | Now                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| A third of the page was empty to the right of the KPI row and the role board | board **816px** of a 1136px column (a 300px rail + 20px gap reserved for a reviewer panel a staff session never renders) | **1136px**                                                          |
| A 52px hole under the greeting while every other section sat 20px apart      | `PageHeader` carried `mb-7` **on top of** the page's `gap-6`                                                             | **24px**                                                            |
| The three KPI figures did not sit on one line                                | values at y=230 vs y=206 — the tile with a trend pill pushed its number 24px down                                        | **all at y=218**                                                    |
| Queue rows read as a wall                                                    | 3 pills + 2 text runs on one 71px line; title squeezed to **320px** of a 494px column                                    | title **660–675px**, urgency stacked on the right                   |
| Four 368px tiles each holding one digit                                      | 4 nested sunken cards                                                                                                    | one hairline-separated **stat strip**                               |
| 768px tablets got a 240px sidebar and a 464px content column                 | sidebar from `md`                                                                                                        | sidebar from **`lg`**, bottom rail to 1023px → **704px** of content |
| A lone third KPI tile beside half a row of nothing                           | 2-up grid, orphan cell                                                                                                   | the third tile **spans both columns** until a row can hold three    |

**The fixes, in the order they matter**

1. **A layout may only reserve space for something it will render.** `xl:grid-cols-[minmax(0,1fr)_300px]`
   now applies only for a reviewer session; a staff Home fills its column. That one conditional took the
   board from 816px to 1136px and made the page's right edge flush with the rows beneath it.
2. **One rhythm, owned by the page.** `PageHeader` no longer carries a bottom margin (it is used in
   exactly one place — `HomePage` — so this could be fixed at the source instead of everywhere).
3. **Rows get a right column instead of a fight for the middle.** Status and priority stack vertically in
   the queue; the meta line keeps the kind, the reference and the due date; the pod is separated from the
   queue by a hairline rather than by a gap, and carries a "3 of 4 in today" line counted from the rows
   the payload already stated.
4. **Counts became a strip, not four tiles**: hairlines (`[&:nth-child(2n)]:border-l` + `sm:first:border-l-0`)
   so the numbers still line up with the columns above them.
5. **StatTile reserves its head row only when it has one** (`empty:hidden`): a rail of plain figures (the
   team board's In / Late / On leave / Not in yet) dropped from 172px to 106px per tile, while the
   dashboard's rows — where every tile carries an icon or a pill — stay aligned. Alignment is now a
   convention the caller keeps, documented in the primitive.
6. **The tablet breakpoint moved.** At 768 (one of our three required widths) the sidebar plus page
   padding left 464px of content: phone-width content beside desktop chrome. The sidebar now appears at
   `lg`, the bottom rail carries the nav to 1023px, and the main padding follows the rail's breakpoint.
   Both Playwright projects (1280, 360) are unaffected.

**A defective test suite, repaired**

`pnpm e2e` was **failing 6 tests before this work** (3 tests × 2 projects), all from the previous slice's
changes that nothing re-ran: an agenda badge made `getByText('Holiday', { exact: true })` ambiguous, the
card's new keyboard grip made `/Prepare the monthly payroll export/` match twice, and the roster growing
from 6 to 15 people left `'3 of 6 in today'` stale. Each was repaired at the cause — scoping the query to
what it means (`getByLabel('Legend')`, the grid, the day-detail region), matching the control that now
owns the behaviour (the grip, not the title), and asserting the shape (`/\d+ of 8 in today/`) instead of a
fixture count — and the keyboard test now drives the grip it was written for. **28 passed, 0 failed.**

**Files**

- `packages/ui/src/patterns/{Card,StatTile}.jsx` — `PageHeader` has no bottom margin; `StatTile`'s head row
  collapses when it is empty.
- `apps/web/src/features/dashboard/pages/HomePage.jsx` — the rail is conditional and documented.
- `apps/web/src/features/dashboard/components/{KpiRow,StaffBoard}.jsx` — staff tiles gained icons (and the
  third spans two columns), counts strip, two-zone queue rows, pod hairline + presence line.
- `apps/web/src/shell/{Sidebar,BottomNav,AppShell}.jsx` — sidebar/nav breakpoint at `lg`, padding follows.
- `packages/i18n/locales/{en,ne}/dashboard.json` — `board.podIn`.
- `apps/web/e2e/theme.spec.js` — the three repaired flows.

**Verified**

- `pnpm lint` → **exit 0**; `pnpm exec vitest run` → **62 files, 633 tests, exit 0**; `pnpm e2e` →
  **28 passed** (desktop-1280 + mobile-360).
- Screenshots, staff Home: **1440 light, 1440 dark, 1280 light, 768 light, 360 light**. Reviewer Home:
  **1280 dark** (4 tiles aligned at y=329, charts + workforce rail balanced). Team attendance: 1280 dark,
  tiles back to 106px. `documentElement.scrollWidth === innerWidth` at every width checked.
- Live DOM measurements recorded above rather than eyeballed: board 816→1136, header gap 52→24, KPI value
  offset 24→0, queue title width 320→660, pod rail 300px with a 1px left border at `xl`, orphan tile gone
  at 768 (704px of content, sidebar hidden, bottom rail shown).

**Limitations, stated plainly**

- The three KPI tiles still stack one-per-row at 360: three values of 28px type do not fit side by side at
  phone width, so the phone scrolls ~500px of KPIs before the board. A denser phone tile is a design
  decision I did not take unilaterally.
- The reviewer's composition (charts + 300px rail + full-width rows) is the prototype's, and the rail ends
  higher than the queue beside it — the pod's new presence line reduces the slack, it does not remove it.
- Everything above is layout: no data, no endpoint and no claim on this screen changed.

## 2026-10-12 — the board grew a to-do list, the calendar grew words, the week grew a strip

**Owner asked:** "continue … improve UI design and study thoroughly, lots are missing, work on kanban
with deep research — it seems we can add a to-do list there, there are lots to add and edit — also in
calendar, attendance and many more".

**What I did**

- **Kanban: the card is now a document, not a summary.** `GET /tasks` rows carry `checklist` items with
  stable ids, and a card shows `2/5 done` plus a bar that only restates the number. The board itself is
  unchanged where it was right: five lanes, optimistic moves, rollback with the server's reason.
- **Kanban: a real detail panel (contract request 22).** `TaskDetailDialog` is the APG modal pattern —
  title, description, priority, due, assignee, reviewer, note and lane, plus the checklist. **One
  transaction**: Save sends only what changed, a cleared date/person goes as `null`, and the server's
  refusal (`reviewer_required`, `note_required`, …) is shown verbatim beside the still-open draft.
  Escape twice for a dirty draft. A refused edit never flashes as saved.
- **Kanban: dragging is no longer the only way to move work.** The keyboard machine moved onto a 24px
  grip (Space lift, ←/→ aim, Space drop, Escape cancel, `aria-describedby` instructions), and the panel's
  lane `select` is the single-pointer alternative WCAG 2.5.7 asks for.
- **Kanban: the API grew up.** `PATCH /tasks/:id` now edits fields as well as moving lanes (422
  `invalid_patch` when it names nothing, `unknown_reviewer`, `invalid_priority`, …), and
  `POST/PATCH/DELETE /tasks/:id/checklist…` serve the to-do list. Ticking is optimistic and rolls back;
  adding and removing wait for the server's id. Ticking every box does **not** move the task to Done.
- **Calendar: the month in words, and a URL.** Kind toggles (leave/holiday/meeting) filter grid,
  agenda and detail together; Saturday reads as the weekly off; a **Today** button returns to the
  current Nepal month; and the selected day lives in `?date=`, so a month can be linked or reloaded.
  BS dates are still blocked on the open converter request (1) — nothing here invents one.
- **Attendance: two real defects.** (a) every _failure_ path of `evaluatePreflight` dropped the `device`
  row, so the punch card listed only "Location" and a person could not tell the phone apart from the
  permission — the device row is now first in every outcome, with a test that pins it. (b) `summary.*`
  i18n existed but nothing rendered it: `/attendance` now carries a **week strip** derived from
  `GET /attendance/history` (Sunday-start Nepal weeks, a missed day drawn as a real gap, seven labelled
  columns) instead of a second source of truth.

**Continuation — the calendar month became a real grid (and a defect only the browser showed)**

- **`role="grid"` used to sit on a flat row of ~31 buttons**: no rows, no gridcells, 31 tab stops. A
  screen reader that announces a grid had nothing to walk, and a keyboard user tabbing into the month
  had to tab through every day. It is now `grid → one row per week → seven gridcells per row` (blanks
  included, so no row is a three-day stub), **one roving tab stop**, and the day itself answers the
  keys: ←/→ a day, ↑/↓ a week, Home/End the ends of the row (clamped to the month), PageUp/PageDown the
  month before/after with the day-of-month clamped, Enter/Space to select. Every move is announced by
  the day's own accessible name, which already carries the date, the weekly-off note and its events.
- **The defect the unit tests could not see.** A keyboard move off the end of a month stepped the month
  and then dropped focus on `<body>`: the grid is replaced by its skeleton while the next month is in
  flight, so a focus request held inside the component died with the unmount. The request now lives on
  the page (`focusIso`) and the grid asks for it back when it mounts — covered by a page test that holds
  the next month's fetch **open**, so the loading gap is in the test rather than only in the browser.
- `utils/month.js` gained `addDays`, `stepMonthIso` (month rollover with day clamping — 31 Jan + 1 month
  is 28 Feb, 29 Feb in a leap year) and `clampToMonth`, each with its own unit tests.
- Lint caught two things this rewrite introduced, and both were fixed rather than suppressed: `setState`
  inside an effect (the tab stop is now _derived_ from the selection instead of synced to it) and a key
  handler on a non-focusable `grid` (the days own their keys; the container needs no focus).
- **The desktop month was mostly empty space.** At 1280 the grid ran to `80rem`, so every cell was
  ~200px wide holding a 12px number and three 6px dots. The column is now `64rem` (the app's reading
  width) and a wide cell names its first event with a kind dot and counts the rest (`+1`), while small
  widths keep the dots — at 92px a title truncated to “Wee…”, which is worse than no title. Saturday
  cells dropped the `/60` alpha on `bg-surface-sunken`: the weekly off was technically token-coloured but
  invisible against white.

**Files added**

- `apps/web/src/features/tasks/components/{TaskDetailDialog,TaskDetailFields,ChecklistEditor,DialogField}.jsx`
- `apps/web/src/features/tasks/utils/{draft,nepal}.js` (+ `draft.test.js`)
- `apps/web/src/features/calendar/components/{MonthGrid,MonthAgenda,KindFilter}.jsx`
- `apps/web/src/features/attendance/weekStats.js` (+ `.test.js`)
- `apps/web/src/features/attendance/components/WeekStrip.jsx` (+ `.test.jsx`)
- `apps/web/src/features/tasks/README.md`
- `apps/web/src/features/calendar/README.md` (the feature's own notes: grid semantics, keyboard table,
  states, known gaps)
- `apps/web/src/features/calendar/utils/month.test.js`

**One more defect, found only in a real browser**

Closing the task panel did not return focus to the card: it used
`document.activeElement` at open time, and a click does not always focus a button in a real browser, so
focus landed on `<body>` — a keyboard user had to start again from the top of the page. The panel now
records the control the click came from (`event.currentTarget`) and restores focus there, verified by
clicking a card, closing, and reading `document.activeElement` back (it is the card's title button), plus
a second case in `TasksPage.test.jsx` that closes with Escape from the footer “Open” control.

**Verified**

- `pnpm lint` → exit 0 (ESLint + JS-only guard + import-boundary guard), re-run after the calendar
  rewrite.
- `npx vitest run` → **62 files, 633 tests, exit 0** (was 59/604 at the start of this slice; this
  continuation added the calendar's `utils/month.test.js` and 5 page tests, one of which pins the
  month-step focus path and one the wide-cell event hint).
- Browser, live dev server (`http://localhost:5173`, reused the running Vite server):
  - **Board (screenshots, 1280 dark · 768 light · 360 light):** a card's checklist bar and `2/4 done`,
    the revision note, the grip and Open controls; no horizontal overflow at any of the three widths
    (`documentElement.scrollWidth === innerWidth`).
  - **Panel (screenshots, 1280 dark and 360 light):** title/description/lane/priority/due/assignee/
    reviewer/note, the to-do list, and a full-screen sheet at 360. Ticking an item moved the card to
    `2/3 done` immediately; adding one appended it and cleared the field.
  - **Refusal path (screenshot):** choosing Review without a reviewer and saving printed
    “Add a reviewer before moving this task to Review.” beside the still-open draft; setting the
    reviewer and saving answered “Saved.” and moved the card to the Review lane.
  - **Keyboard move:** focusing a card's grip and pressing Space → ←/→ → Space moved it a lane, and the
    live region read “Moved Plan the Dashain leave roster to In progress.”
  - **Calendar (DOM, live):** grid labelled `Calendar` with 31 cells and 5 weekly-off cells; the day
    deep-linked from `?date=` is the selected one; switching Leave off left three agenda days and three
    grid dots plus a “Show all” affordance; picking 20 Oct from the agenda moved the grid selection, the
    day detail and the URL to `?date=2026-10-20`.
  - **Calendar grid keyboard (DOM, live, after the rewrite):** the live grid is 5 rows × 7 gridcells at
    1280 and 5 rows × 7 (42px days, headers pixel-aligned with the cells) at 360, with exactly one
    `tabindex="0"` day. Focused the 1st and pressed → then ↓: focus went to the 2nd, then the 9th, the
    selection stayed on the 1st and the tab stop followed the focus. Focused 31 Oct and pressed →: the
    month stepped to November, `1 Nov 2026. No events on this day.` became both the focused and the
    selected day and the URL became `?date=2026-11-01`; PageUp then returned to October on the 1st.
    Console showed nothing but the MSW `200 OK` lines for the calendar range requests.
  - **Calendar layout (screenshots, 1280 light · 1280 dark · 768 light · 360 light):** the month now
    fills its column at 1280 (day number + first event title + `+1`), reads cleanly in dark (selected 15
    ringed, today 12 bold with its accent underline, Saturdays visibly sunken), shows dots instead of
    truncated titles at 768, and keeps a 7-column month, the agenda in words and the bottom nav at 360
    with no horizontal overflow (`documentElement.scrollWidth === innerWidth`) and headers pixel-aligned
    with the day cells at every width.
  - **Attendance (DOM, live, dark):** the week strip renders seven columns (`Sun 8h`, `Mon 8h 06m`, then
    five day-gaps) with “16h 06m · 2 days · 2 days in”; the punch card is above it.

**Limitations, stated plainly**

- The task store is still a labelled fixture; the board's queue is sample data until assignments exist.
- No comments, activity, attachments or checklist reordering — the mock does not invent them.
- The detail panel is a modal, not a route-backed drawer: `/work/tasks?task=<id>` is the next step.
- BS/AD dual dates remain blocked on contract request 1; every date on these screens is AD.
- The preview screenshots stopped compositing partway through verification (the app's preview webview
  produced no frames), so the calendar and attendance checks above are DOM reads from the same running
  app rather than images — and the punch-card clock-in click had to be abandoned when the browser's
  native geolocation prompt blocked the tab. The punch pre-flight is covered by its unit tests instead.
- Every mock session is in memory: a page reload signs the demo user out (which is why the browser
  checks re-signed in more than once). Related and worth knowing for anyone verifying in the browser:
  in the window _immediately_ after a Vite HMR reload the MSW worker briefly is not intercepting yet, so
  a request fires at the dev server instead of the mock — one sign-in answered “That email or password
  didn't match.” and one calendar load came back with an empty month. Both were re-checked after a clean
  session and were correct (7 event-bearing days for October, the agenda and the day detail in words), so
  this is a dev-server race, **not** a product defect — but do not read a post-HMR response as truth.

## 2026-10-12 — every staff persona gets its own desk (role boards + 15-person roster)

**Owner asked:** "still some contents are missing in dashboard and login screen lets add few staff for
demo with sample content to it's easy to visualize like in html file with responsive wireframe" — then,
mid-slice: "instead of keeping Demo credentials in signin page autofill for now".

**What I did**

- **One roster, many lists.** `apps/web/src/mocks/roster.js` now defines every demo person once — id,
  name, shell job title, directory title, department, site, attendance presence, online status — and the
  attendance team board, the presence payload, the team directory and each persona's pod all derive from
  it. The cast grew from 6 to **15** (added Priya Sharma, James Wilson, Tina Nguyen, Raj Kumar, Aarati
  Bhandari, Nabin Shrestha, Kiran Lama, Anisha Gurung; Sita becomes HR Officer, Sarah Mitchell owns HR
  Manager), so the demo team reads like an office instead of three avatars. `mocks/fixtures.js` was split
  (roster vs sessions) to stay inside the 250-line rule.
- **`GET /staff/board` (contract request 26) + `StaffBoard`.** The prototype's staff login promises "each
  role is its own demo account — pick one to see that board", but all four personas opened an identical
  page. Frontend, Backend, QA and DevOps now each get their own queue (5–6 items: kind, meta, due,
  priority, status), their own counts and their own pod — all four verified in the browser, FE and QA
  screens side by side. The role is read from the **session**, never a parameter, so a persona cannot ask
  for another's queue (HR gets 403 `not_a_staff_board`, no token gets 401).
- **`TeamNow` strip** (the staff home plan's "Team now"): the roster's presence with sites and a
  `/n of /m in today` count, wrapping at every width. Reviewer Home still mounts neither widget.
- **A defect fixed while verifying:** the staff tasks list rendered `bare`, so it appeared as an
  unlabelled stack of rows beside the punch card; it is a titled card on both variants now.
- **Login screen:** the DEMO CREDENTIALS card is gone; the form opens **autofilled** with the selected
  role's demo account (password included), a role/persona switch swaps the whole account, a hand-typed
  address is never overwritten, and a line under the button keeps saying the credentials are demo data.
- **Attendance mock coherence:** a correction's requester and the team board's "who is me" row now come
  from the signed-in session (Priya when signed in as Priya), not a hard-coded name; the board grew to 8
  rows and its summary is derived from the rows it ships with.

**Files added**

- `apps/web/src/mocks/roster.js`
- `apps/web/src/features/dashboard/mocks/staffBoards.js`
- `apps/web/src/features/dashboard/components/{StaffBoard,TeamNow}.jsx` (+ `.test.jsx`)

**Files changed**

- `apps/web/src/mocks/fixtures.js`, `features/dashboard/{api.js,hooks/useDashboard.js,hooks/keys.js,
mocks/{fixtures,handlers,handlers.test}.js,pages/HomePage.jsx,README.md}`,
  `features/team/mocks/fixtures.js`, `features/attendance/mocks/{fixtures,handlers,handlers.test,
attendanceState}.js`, `features/auth/pages/{LoginPage.jsx,LoginPage.test.jsx}`,
  `features/auth/components/` (DemoCredentials deleted)
- `packages/i18n/locales/{en,ne}/{dashboard,nav,team,common}.json` (board.*, teamNow.summary, 6 job
  titles, 7 directory titles, 3 departments, `auth.demoAutofill`)
- `README.md`, `docs/FRONTEND_PROMPT.md` §8.8, `docs/api-contract/contract-requests.md` (row 13 gains
  `site`; row 26 added), `apps/web/src/features/dashboard/README.md`

**Verified (commands actually run)**

- `pnpm lint` → exit 0 (ESLint + JS-only guard + import-boundary guard)
- `npx vitest run` → **57 files, 581 tests, exit 0** (+20: 2 board contract tests, 7 component tests,
  roster-sync assertions in the presence and team-board tests)
- Browser, real dev server: FE Home and QA Home show **different** boards (badges, counts, queues and
  pods all differ); Team now lists 15 people with sites; **360 / 768 / 1280** stored `scrollWidth`
  equal to the viewport (no sideways scroll) in **light and dark**; HR Home mounts no role board and no
  Team now; login autofills per role and signs in with one click.

**Open decisions**

- The board's queue is a labelled fixture until assignments exist server-side; the honest path to
  remove `board.sampleNote` is the endpoint, not deleting the label.
- Auto-filled credentials are a demo convenience (no backend, mock sign-in on). If a real auth realm is
  ever switched on, the autofill must be gated the same way mocks are (`?mock=0`).

## 2026-10-12 — the prototype's whole dashboard, ported (reviewer board)

**Owner asked:** "continue also copy whole dashboard contents and design too from that file"
(`SWAMS_Unified.html`, `#page-dashboard`).

**What I did**

- Ported the four panels the 2026-10-11 rebuild had left out — **Attendance trend** (area chart
  with the target line), **Department attendance** (labelled bars), **Insights**, **Industry
  benchmark** — and the two it had replaced — the KPI row's **trend pills** (89.4% / +4 / 2
  pending / 3 unexcused) and **Today's meetings**. Reviewers now see the prototype's composition
  top to bottom; staff keep the personal board and mount none of it.
- **One payload owns the screen.** New `GET /org/dashboard` (contract request 25) feeds all six
  org panels, so React Query issues a single request and the tiles, the donut centre and the
  trend's last point cannot drift apart. Contract tests pin the invariants
  (`present = in + late`, `headcount = present + onLeave + absent`, `trend.at(-1).rate = kpi.rate
= asOf`, the quoted leading department = the top bar).
- **The two blocks with no endpoint are labelled, not faked.** Insights and the benchmark are org
  analytics nothing serves yet: figures from the labelled fixture, sentences from i18n keys with
  the server's params (the notifications shape), and a `PreviewNotice` naming that scope above the
  reviewer composition. The punch card, tasks, rail and "Needs you" stay the live flows.
- **Export writes a real file** instead of the prototype's toast over a dead button: `Export` (or
  `निर्यात`) downloads `swams-dashboard-YYYY-MM-DD.csv` built from the figures on screen, sharing
  one unit formatter with the benchmark table so the file cannot disagree with it.
- **Two defects found by looking at the rendered page, both fixed:** (1) the sidebar labelled
  every signed-in person "Staff" — it read `user.role`, which does not exist on the session, so
  the HR demo account was mislabelled; it now reads `principal.role` (AppShell passes it). (2) the
  benchmark table's 420px floor widened the whole page at 360px (`scrollWidth` 478 vs 360) because
  a grid item keeps `auto` as its minimum; `min-w-0` on that card makes the table scroll inside its
  own wrapper. Also repaired the trend chart's clipped "Target" label, and gave the donut's
  "Out"/"Not in" segment a token that is visible on the light lavender panel.
- `triggerBlobDownload` moved to `apps/web/src/lib/download.js` (DOM work belongs in the app, and
  §6.2 rule 1 forbids reaching into another feature's folders for it); reports imports it there.

**Files added**

- `apps/web/src/features/dashboard/components/{OrgTrendChart,OrgTrendCanvas,DepartmentBars,OrgInsights,TodayMeetings,BenchmarkTable}.jsx`
  (+ `OrgInsights.test.jsx`, `BenchmarkTable.test.jsx`, `DepartmentBars.test.jsx`)
- `apps/web/src/features/dashboard/utils/{units.js,orgSnapshot.js}` (+ `orgSnapshot.test.js`)
- `apps/web/src/lib/download.js`

**Files changed**

- `features/dashboard/{api.js,hooks/useDashboard.js,hooks/keys.js,mocks/fixtures.js,mocks/handlers.js,mocks/handlers.test.js}`,
  `components/{HomePage→pages/HomePage.jsx,KpiRow.jsx,WorkforcePanel.jsx,DonutCanvas.jsx}`, `README.md`
- `packages/i18n/src/formatters.js` (+ `formatPercent`, + test), `locales/{en,ne}/dashboard.json`
  (trend/dept/insight/meetings/bench/snapshot + 8 KPI keys), `locales/{en,ne}/common.json`
  (`home.export`, `home.sampleBadge`, `home.sampleBody`)
- `packages/ui/src/patterns/PreviewNotice.jsx` (optional `badgeKey`/`bodyKey`), `shell/{Sidebar,AppShell}.jsx`,
  `features/reports/hooks/useReports.js` + `ReportsPage.test.jsx` (helper moved)
- `apps/web/e2e/theme.spec.js` (+2 flows), `docs/api-contract/contract-requests.md` (row 25),
  `docs/GAP_ANALYSIS.md`

**Verified (commands actually run)**

- `pnpm lint` → exit 0 (ESLint + JS-only guard + import-boundary guard)
- `pnpm test` → **55 files, 566 tests, exit 0** (+18: 3 contract, 10 component, 4 CSV, 1 formatter)
- `pnpm build` → 4/4 tasks
- `pnpm e2e` → **28/28 passing** (desktop-1280 + mobile-360), including the new HR board flow
  (asserts all six panel headings, then **downloads the CSV and reads it** — `Present today,127`,
  `Engineering,96%`) and the staff isolation flow (no org panel, no Export button, no notice)
- Browser (MSW, signed in as Sarah): 1280 light + dark, 360 light + dark. Evidence from the page
  itself: `GET /api/v1/org/dashboard → 200` exactly **once** per load (the six panels share one
  request), Recharts (`OrgTrendCanvas`, `DonutCanvas`, `recharts.js`) arriving as separate lazy
  chunks after boot, `scrollWidth == clientWidth == 360` (no horizontal overflow), the benchmark
  table scrolling inside its own card (wrap 286 / content 420), the sidebar reading **HR**, and the
  rendered accessibility tree carrying the trend's numbers as a real `<table>`
  (Mon 84% … Mon 89.4%) plus the sr-only sentences behind the KPI chips.

**NOT verified / open (this turn)**

- `pnpm knip` → exit 1 on **16 unused exports, all pre-existing**, none from this turn's files;
  switching the workforce panel off `useTeamAttendance` had briefly orphaned that re-export, so it
  was dropped from `attendance/index.js` (17 → 16). The two dashboard endpoints with no consumer
  (`/presence`, `/org/overview` — contract rows 13–14) stay: they are documented contract coverage
  asserted in `handlers.test.js`, and deleting them would delete that coverage.
- The `OrgTrendChart` wrapper has no unit test: its canvas is Recharts behind `lazy()`, which jsdom
  renders as an empty box, so the panel is covered by the contract test (data + invariants), the
  `formatPercent` test, and the browser/e2e rendering — not by a component test. The chart's sr-only
  table is verified by the accessibility tree, not by a unit assertion.
- Nepali was checked by the catalog parity tests and one rendered key, not by eye on every panel.
- **Reload under the preview harness still lands on `/login`** — probed directly and it is
  environmental, not the app: the harness's reload starts a fresh `sessionStorage`, and the mock
  session (like a real httpOnly cookie) lives there, so a probe key set before the reload is gone
  afterwards too. Chromium/Playwright reloads keep the storage, which is why the e2e suite's reload
  test passes.
- Still open from before: roles-assignment editing + org policies (request 19), the console UI,
  BS/AD converter, PWA manifest/service worker, analytics (R3), and the wider fixture cast.

**Next step**

The dashboard is now at the edge of its (new) contract: everything the prototype showed is either
rendered from data or labelled as sample data. The open work is elsewhere — the console UI, or
replacing request 25's fixtures with a real analytics backend.

---

## 2026-10-11 (part 3) — design parity: demo accounts, role tabs, and the mock-drop fix

**Owner asked:** "I don't see these design, why? Also copy the internal design
from the files below, and make the demo accounts the same as in the image."

**Why the design was not visible (diagnosed on screen, not guessed)**

- The _internal_ design and the landing page were already ported: `apps/web`
  renders the SWAMS_Unified shell/Home, and `apps/marketing` (Next, :3000) is
  the SWAMS_Landing port — its hero still opens "Attendance, tasks, and teams.",
  the design's H1. The landing is a separate app on a separate port, so opening
  only :5173 never shows it.
- Three i18n defects **shipped raw keys to the screen** (visible in the owner's
  screenshots and reproduced): `EVENTS.TITLE` (HomePage asked the `common`
  namespace for a `dashboard` key), `presence.present` / `presence.onLeave`
  (the panel asked for keys the catalog spells `in` / `leave`), and in the
  sidebar `role:staff` + `footer.clock` (bare keys against the `nav.*` layout).
- A real blocker behind "I can't see it": MSW stops intercepting once the
  browser terminates its service worker (a backgrounded/occluded tab throttles
  MSW's 5 s keepalive past the idle timeout). Every mock endpoint then falls
  through to Vite — 404 for POST — so sign-in dies with "That email or password
  didn't match" and the internal design is unreachable until a manual reload.
  Reproduced here, root-caused to `activeClientIds` being lost with the worker,
  and verified that `MOCK_ACTIVATE` re-arms it.

**What I changed**

- **Demo accounts now match the design image** (HR `sarah@swams.com` / Staff
  `priya@swams.com`, password `password`). The email decides the portal, so the
  picker can never send Sarah to the staff workspace; the documented generic
  rule (any valid email + 8+ chars) still covers every other address.
- **Login screen parity:** the prototype's two gradient role tabs (a native
  radiogroup, the input covering each segment) and the DEMO CREDENTIALS card,
  whose rows fill the form in one tap. LoginPage went 278 → 237 lines by
  extracting `LoginRolePicker`, `DemoCredentials` and `rememberLogin.js`
  (file ≤ 250, component ≤ 180).
- **i18n repairs** above, plus the new `auth.demo*` keys in en + ne.
- **`rearmMockWorkerOnVisible()`** in `mocks/index.js`: on the way back to the
  foreground the page re-sends `MOCK_ACTIVATE`, so the demo survives a pause.

**Verification**

- `pnpm test` → 51 files, 546 tests, exit 0 (up from 512: +6 mock-switch/re-arm
  tests, +1 demo-portal contract test, +1 demo-card component test).
- `pnpm e2e` → 24/24 (desktop 1280 + mobile 360) after the picker was made
  pointer-clickable (the first run failed: the visually hidden radio needed a
  proxy; the input now covers the segment).
- `pnpm lint` → exit 0; `pnpm build` → 4/4 tasks; `pnpm knip` → unchanged,
  55 pre-existing findings, none from this turn's files.
- Browser: login at 1280 dark, 1280 light and 360 dark; signed in as Priya
  (Staff) and synced the HR path; Home renders with no raw keys.

What remains open:

- The wider fixture cast keeps §8.8's names (Sita Shrestha, Anita Thapa) while
  the _signed-in_ identities are the design's (Sarah Mitchell, Priya Sharma).
  Renaming the whole cast is a separate, purely cosmetic change.
- `pnpm knip` fails on 55 pre-existing dead-code findings (unrelated to this
  turn).

---

## 2026-10-11 (part 2) — PWA slice: offline queue persistence

**What I did (this turn)**

- Closed the slice-3 "Known gap": unsent punches now survive a hard reload.
  `features/attendance/queueStorage.js` persists the queue's unsent tail to
  `localStorage` (key `swams.queue.attendance.v1`, ≤50 items, `sent` never
  stored); `usePunch` restores it as the queue machine's `initialItems` and
  re-saves on every queue change. Restore rules, each tested: interrupted
  `sending` → `queued` (the idempotency key makes the retry safe), corrupt or
  shapeless storage → `[]`, dead storage (private mode/quota) → fall back to
  the in-memory session queue without breaking the punch flow.
- **The e2e hangs were environmental, not code:** two stale Vite dev-server
  processes were holding :5173 and :3001 without answering HTTP (curl → 000),
  so Playwright's `webServer` check polled forever with zero output. Killed
  them (`kill -9`); Playwright then started fresh servers and the suite ran
  normally.

**Also repaired (found by the final lint):** an external edit landed mid-turn on
`features/auth/pages/LoginPage.jsx` (demo-credentials panel) with three raw
user-visible email literals — the ESLint no-raw-strings rule flagged them (3
errors, lint had been green earlier in the turn). Moved the emails to
`auth.demoHrEmail/demoStaffEmail/demoMfaEmail` in `common.json` (en + ne,
catalog parity holds). Two `LoginPage.test.jsx` queries then failed because the
new panel body also says "valid email" / "8+ characters" — scoped them to the
exact error copy.

**Files added**

- `apps/web/src/features/attendance/queueStorage.js` (+6 storage tests)

**Files changed**

- `apps/web/src/features/attendance/hooks/usePunch.js` (restore on mount, save on change)
- `features/auth/pages/LoginPage.jsx` (raw demo emails → i18n keys) +
  `LoginPage.test.jsx` (exact-copy queries); `packages/i18n/locales/{en,ne}/common.json`
- `features/attendance/README.md` (known gap → shipped behavior), `docs/GAP_ANALYSIS.md`
  (§7.2 queue ✅; PWA row ❌ → 🟡)

**Verified (commands actually run)**

- `pnpm lint` → exit 0
- `pnpm test` → **50 files, 522 tests, exit 0** (+6: queueStorage)
- `pnpm build` → exit 0
- e2e boot path (`shell renders the home screen with no console errors`,
  `theme toggle`) → 2/2 passing on desktop-1280 with fresh servers — this path
  mounts `PunchCard` → `usePunch`, so the persistence change is exercised in a
  real browser.
- `pnpm e2e` (full suite, fresh servers) → **24/24 passing** (desktop-1280 +
  mobile-360, 13.9s). The slice-4 team-board flows from the previous turn also
  re-pass, so the persistence change regressed nothing.

**NOT verified / open (this turn)**

- The reload-while-offline flow itself (queue a punch offline → hard reload →
  item still queued → online → syncs once) is covered by unit tests
  (machine + storage) but was not walked in the browser.
- Remaining PWA work: `vite-plugin-pwa` (offline shell, manifest, icons,
  background sync, install prompt after first punch) — the shell/manifest half
  of the slice is still open.

---

## 2026-10-11 — slice 4 remainder: the team attendance board (Manager/HR views + exceptions)

## 2026-10-11 — slice 4 remainder: the team attendance board (Manager/HR views + exceptions)

**What I did (this turn)**

- Built the last open piece of binding slice 4: `/attendance/team` (`TeamBoardPage`)
  behind `attendance.approve` + the `attendance` entitlement (manager, HR, owner) —
  server-owned summary StatTiles, the presence list (`TeamBoardRow`, Avatar + presence
  word + site + clock-in + worked, stacked at 360px, grid at md+), and the "Needs
  attention" exceptions band (`TeamExceptions`: Late arrival / No punch recorded,
  linking into the correction queue). One `GET /attendance/team` request (new
  contract row 24) owns presence, exceptions and the summary so the three can
  never disagree. Reviewers reach it from the attendance Today's/History headers
  (the link never renders for staff); staff is guard-denied on direct visit.
- Hardened the team-board mock: a malformed `?date` now 422s `invalid_date`
  (documented: any well-formed date serves the same fixture board — past days
  are a real-API concern, stated, not faked).
- Two defects found by my own tests and fixed in the same pass: (1) page tests
  asserted tile copy before the query settled — they now await a row first; the
  error test wrongly expected the page header to vanish (the header is the page,
  not the data — it now asserts the board lists are absent instead); (2) the
  Nepali test called `initI18n({lng})` on the i18n singleton, which ignores the
  option after first init — it now switches language like the feature's own
  Nepali tests do. Also repaired a botched e2e edit that had swallowed the
  slice-8 task-board test's opening line (found by reading the file before
  running; `node --check` clean).
- An e2e duplicate-name strict-mode trap avoided before it fired: the staff
  name appears on the board AND in the exceptions band, so the HR test asserts
  `.first()`.

**Files added**

- `apps/web/src/features/attendance/pages/TeamBoardPage.jsx` (+4 page tests)
- `apps/web/src/features/attendance/components/{TeamBoardRow,TeamExceptions}.jsx`
  (+3 component tests incl. Nepali `ढिलो`)
- `packages/i18n/locales/{en,ne}/attendance.json` — `team.board/boardEmpty/column/noExceptions/openQueue`

**Files changed**

- `apps/web/src/routes/index.jsx` (`attendance/team` behind `RequirePermission`),
  `features/attendance/pages/{TodayPage,HistoryPage}.jsx` (reviewer-only "Team
  attendance" links), `features/attendance/mocks/{handlers.js,handlers.test.js}`
  (date validation + 2 contract tests), `apps/web/e2e/theme.spec.js` (HR board
  flow + staff denial), `docs/api-contract/contract-requests.md` (row 24),
  `docs/{GAP_ANALYSIS}.md` (slice 4 → ✅), `features/attendance/README.md`

**Verified (commands actually run)**

- `pnpm lint` → exit 0 (`check-js-only` ok, `check-boundaries` ok)
- `pnpm test` → **49 files, 516 tests, exit 0** (+9 since part 6: 4 page + 3 row + 2 contract; +97 since turn start)
- `pnpm build` → exit 0
- `pnpm e2e` → **24/24 passing** (desktop-1280 + mobile-360): the two new slice-4
  flows (HR board: summary + rows + exceptions band; staff: no link + guard
  denial) pass on both widths. Note: the first full run reported 22/24 —
  the only failures were the two pre-existing boot tests on mobile-360
  (`ERR_CONNECTION_REFUSED` — the shared dev server wasn't up yet when that
  worker's first navigations fired; nothing to do with this turn's code).
  A targeted re-run of those two passed 2/2, so the suite is green end to end.
- Slice 4 is now complete to the edge of its contracts. Remaining build-order
  work: console UI (needs its ADR — separate deploy + auth realm), slice 10
  messages/video hardening, or the PWA slice (offline queue persistence).

**NOT verified / open (this turn)**

- Nepali copy was checked by unit/parity tests (incl. `ढिलो` on the row), not by eye on screen.
- Dark theme at 360/768/1280 was **not** re-checked visually — the new components
  carry no raw colour literals (covered by the ESLint raw-literal rule,
  `pnpm lint` exit 0) and reuse the themed `StatTile`/`Badge`/`Avatar` primitives.

---

## 2026-10-10 — master-prompt completion check + slice 6 (Notifications, Settings)

**Completion verdict: the master prompt is NOT complete.** Audited the repo against the binding
`docs/FRONTEND_PROMPT.md` (§18 build order) and the pasted master prompt; brought
`docs/GAP_ANALYSIS.md` up to date (it was still claiming slices 4–10 unstarted — slices 4, 5 and
much of 7–10 are now built). Remaining: audit viewer, roles matrix, policies, reports/CSV, task
board, calendar, console, AI/mobile, BS↔AD converter, PWA, and most of the `docs/frontend/` set.

**What I did (this turn)**

- Repaired the broken `ForgotPasswordForm.test.jsx` an interrupted turn had left (lint error + 5
  failing tests) — rewritten with the repo's own test patterns, now 6/6 passing.
- Built **slice 6 (core)**: notifications + settings, with the Topbar bell repaired (it was a
  nonfunctional button — the prompt forbids those).
- Repaired the mock `POST /auth/refresh` token rotation: it issued a token it never stored, so any
  real page reload bounced a valid session to `/login`. The e2e suite exposed this.
- Fixed the e2e suite (was 4/4 failing — it assumed a session a fresh browser never has) and the
  Sidebar label placement (`aria-label` moved from `<aside>` to the inner `<nav>`).
- Verified everything: lint, tests, build, and the full Playwright suite on desktop + mobile.

**Files added**

- `apps/web/src/features/notifications/` — `api.js`, `hooks/{keys,useNotifications}.js`,
  `mocks/{fixtures,handlers}.js` (+6 contract tests), `components/{NotificationBell,NotificationRow}.jsx`
  (+6 component tests), `index.js`
- `apps/web/src/features/settings/` — `pages/SettingsPage.jsx` (+4 component tests), `index.js`
- `packages/i18n/locales/{en,ne}/{notifications,settings}.json` — new namespaces, en/ne parity
- `apps/web/e2e/theme.spec.js` — sign-in helper, bell smoke test, HR settings + staff denial tests
  (10 tests: desktop + mobile, all passing)

**Files changed**

- `apps/web/src/shell/{Topbar,Sidebar}.jsx` (working bell; label on the nav), `app/nav.config.js`
  (`settings` released), `routes/index.jsx` (`/settings` behind `RequirePermission`),
  `app/nav-access.test.js` (admin group now ships), `mocks/handlers.js` (aggregated),
  `i18n.js` (namespaces), `persistPreferences.js` (`persistLanguage`, boolean contract),
  `ThemeProvider.setTheme` (returns the persist result for honest save feedback),
  `features/auth/mocks/handlers.js` (`PATCH /me/preferences` merges + echoes; refresh rotates
  the stored token)
- `docs/{GAP_ANALYSIS,PROGRESS}.md`, `docs/api-contract/contract-requests.md` (rows 17–19)

**Verified (commands actually run)**

- `pnpm lint` → exit 0 (`check-js-only` ok, `check-boundaries` ok)
- `pnpm test` → **38 files, 446 tests, exit 0** (was 35 files / 419 tests)
- `pnpm build` → exit 0 (web, marketing, console, tokens)
- `pnpm e2e` → **10/10 passing** (desktop-1280 + mobile-360): sign-in flow, theme persistence,
  console-clean shell, bell panel, HR settings save, staff denial

**Part 2 — audit viewer (this section added after the part-1 verification above)**

**Files added**

- `apps/web/src/features/audit/` — `api.js`, `hooks/{keys,useAudit}.js`,
  `mocks/{fixtures,handlers}.js` (+5 contract tests), `pages/AuditPage.jsx` (+5 page tests),
  `index.js`
- `packages/i18n/locales/{en,ne}/audit.json` — new namespace, en/ne parity

**Files changed**

- `apps/web/src/routes/index.jsx` (`/audit` behind `RequirePermission`), `app/nav.config.js`
  (`audit` released), `app/nav-access.test.js` (admin group is now settings + audit),
  `mocks/handlers.js` (aggregated), `i18n.js` (namespace)
- `apps/web/e2e/theme.spec.js` — HR audit filters + pagination test, staff denial test

**Verified (commands actually run)**

- `pnpm lint` → exit 0 (`check-js-only` ok, `check-boundaries` ok)
- `pnpm test` → **40 files, 460 tests, exit 0** (+14 since part 1: 5 contract + 5 page + 4
  auto-generated i18n parity tests for the new `audit` namespace; +41 since turn start)
- `pnpm build` → exit 0 (web, marketing, console, tokens)
- `pnpm e2e` → **14/14 passing** (desktop-1280 + mobile-360): HR filters to one invitation,
  pagination collapses, page two exists server-side; staff never sees the link and is denied

Two defects found by the tests and fixed in the same pass: (1) the audit h1 and a screen-reader
h2 duplicated the accessible name "Audit log" — the h2 now reads the subtitle; (2) a genuine
strict-mode lesson — the filter `<option>` and the row text share copy, so row queries scope to
`listitem`, never the bare text.

**Part 3 — roles matrix on /settings (this section added after part-2 verification)**

The last slice-6 gap that has no backend dependency: the screen inventory lists `RolesMatrix`
under `/settings`. The matrix renders every canonical permission (grouped by area) against the
five canonical roles from `ROLE_BUNDLES` — grants show a check + "Granted", absences a dash +
"Not granted" (never colour alone), row/column headers carry `scope`, and the table scrolls
horizontally inside a card at narrow widths. Editing assignments is deliberately **not**
offered: that needs a roles-assignment API (contract request 19), and a fake toggle would
pretend to save. Policies and the geofence editor stay open for the same reason.

**Files added**

- `apps/web/src/features/settings/components/RolesMatrix.jsx` (+3 component tests)

**Files changed**

- `apps/web/src/features/settings/pages/SettingsPage.jsx` (mounts the matrix, doc comment updated)
- `packages/i18n/locales/{en,ne}/settings.json` (`roles.*`: titles, role names, area names,
  one-sentence description per permission key — en/ne parity, catalog test covers it)
- `apps/web/e2e/theme.spec.js` (HR settings test now asserts the matrix renders)

**Verified (commands actually run)**

- `pnpm lint` → exit 0
- `pnpm test` → **41 files, 463 tests, exit 0** (+3: RolesMatrix; +44 since turn start)
- `pnpm build` → exit 0
- `pnpm e2e` → **14/14 passing** (desktop-1280 + mobile-360)

Two test defects found and fixed in the same pass, both mine: a `within(tr)` query expecting
columnheaders that live outside the row subtree, and an e2e locator where the matrix's
"Settings" permission-area heading collided with the page h1 (fixed with `level: 1`); the
matrix row assertion also searched the first table although `settings.manage` lives in the
settings-area table (now page-wide, each permission row appears exactly once).

**Part 4 — slice 7: reports + CSV (this section added after part-3 verification)**

`/reports` ships behind `reports.read` (manager, HR, owner): a report-type select
(attendance | leave | tasks), an AD from/to range defaulting to the last 30 Nepal-calendar days,
summary StatTiles, and a responsive table (horizontal scroll at 360px). Every number comes from
the server; the page never derives a total. The CSV export is genuine: `GET /reports.csv` is
rendered by the server from the SAME `deriveReport` function as the JSON, so the file cannot
disagree with the table; the browser saves the blob with a dated filename. Inverted ranges are
blocked client-side (inline alert, query disabled) and the mock 422s them too, plus malformed
dates and unknown types — all asserted in the contract tests. BS dates stay out (§24, converter
blocked). Analytics (`/analytics`, R3) remains out of scope.

**Files added**

- `apps/web/src/features/reports/` — `api.js`, `hooks/{keys,useReports}.js`,
  `utils/{range,download}.js`, `mocks/{fixtures,handlers}.js` (+6 contract tests),
  `pages/ReportsPage.jsx` (+6 page tests), `index.js`
- `packages/i18n/locales/{en,ne}/reports.json` — new namespace, en/ne parity

**Files changed**

- `apps/web/src/routes/index.jsx` (`/reports` behind `RequirePermission`), `app/nav.config.js`
  (`reports` released — Insights group now appears for permitted roles), `app/nav-access.test.js`
  (HR groups: overview/work/people/insights/admin), `mocks/handlers.js`, `i18n.js`
- `apps/web/e2e/theme.spec.js` — HR reports + real CSV download test
- `docs/api-contract/contract-requests.md` — request 21

**Verified (commands actually run)**

- `pnpm lint` → exit 0
- `pnpm test` → **43 files, 479 tests, exit 0** (+16: 6 contract + 6 page + 4 i18n parity;
  +60 since turn start)
- `pnpm build` → exit 0
- `pnpm e2e` → **16/16 passing** (desktop-1280 + mobile-360), including a real browser
  download of the CSV with the expected filename

Three of my own test/code defects found and fixed in the same pass: the new
`react-hooks/refs` rule rejects render-time ref writes (reset now destructured from the
mutation), a caption used a quoted `'${type}'` instead of a template literal, and a
`getByLabelText(/^report/i)` matched both the form label ("Reports") and the field ("Report").

**Part 5 — slice 8: the task board (this section added after part-4 verification)**

`/work/tasks` ships the §7.6 kanban behind `tasks.read` + the `tasks` entitlement (staff,
manager, HR): five lanes (To do → In progress → Review → Revision → Done), pointer drag with
valid/invalid lane previews, and the full keyboard path — Space lifts, ←/→ aim, Space drops,
Escape cancels — announced in a polite live region at every step. Every move is one optimistic
`PATCH /tasks/:id` that **rolls back to the snapshot with the server's message** when rejected;
the mock enforces the same rules the real API must own (422 `reviewer_required` for a task with
no reviewer, 422 `note_required` for Revision, 422 `invalid_lane`, 404 `not_found`) and the
client preview refuses the same moves before they are attempted. Revision stops at an inline
note prompt (focus-managed, Escape cancels). Inline create (`POST /tasks`) shows server errors
verbatim and confirms with a status line. WIP limits stay open — the prompt says "warning, not
hard stop" but no policy contract exists to source the limit from.

One store now serves **both** `GET /tasks?due=today` (Home) and `GET /tasks` (board), moved out
of the dashboard mock so the two views can never disagree; Home's `TodayTasks` formats the
calendar date per locale (`tasks.dueOn`). The mobile bottom nav gains the Task board tab
(ordered Dashboard · Attendance · Tasks · Leave · More) — `nav-access` tests updated.

**Files added**

- `apps/web/src/features/tasks/` — `api.js`, `hooks/{keys,useTasks}.js`,
  `components/{BoardLane,TaskCard,NotePrompt,NewTaskForm}.jsx`,
  `mocks/{seeds,store,handlers}.js` (+7 contract tests), `pages/TasksPage.jsx` (+6 page tests),
  `index.js`
- `packages/i18n/locales/{en,ne}/tasks.json` — new namespace, en/ne parity

**Files changed**

- `features/dashboard/mocks/{handlers,fixtures}.js` (+test): `/tasks` serving removed (moved to
  the tasks store); `components/TodayTasks.jsx` (+test) formats calendar dates;
  `mocks/handlers.js` aggregate; `app/nav.config.js` (`tasks` released); `routes/index.jsx`
  (`/work/tasks`); `app/nav-access.test.js` (board visible; mobile tab order); `i18n.js`
- `apps/web/e2e/theme.spec.js` — staff keyboard-move + create flow (desktop + mobile)

**Verified (commands actually run)**

- `pnpm lint` → exit 0
- `pnpm test` → **45 files, 495 tests, exit 0** (+16 since part 4; +76 since turn start)
- `pnpm build` → exit 0
- `pnpm e2e` → **18/18 passing** (desktop-1280 + mobile-360), including a real keyboard lift →
  aim → drop asserted through the live region, and a server-confirmed create

Six of my own defects found and fixed in the same pass: `AlertCircle` imported from `@swams/ui`
instead of lucide (unit tests missed it because the overdue path never rendered — the bundler
caught it); an e2e insertion that split the previous test's closing tokens; keyboard tests
focusing the `li` after focusability moved to the card `<button>`; react-query's second
`mutationFn` argument defeating three `toHaveBeenCalledWith` assertions; the lane `h2` reading
"To do1 task" (JSX whitespace) which broke the strict-mode heading lookup; and a lane `li`
`tabIndex` that the jsx-a11y gates rejected twice before the card became a native `<button>`.

**Part 6 — slice 8 remainder: the calendar (this section added after part-5 verification)**

`/calendar` ships behind `team.read` (everyone) as the AD month grid for Asia/Kathmandu.
The mock returns **only event-bearing days** pre-grouped by kind (leave | holiday | meeting)
— the contract (request 23) keeps empty days a presentation concern, and the client fills
the grid. The cursor derives from `nepalParts`, never the browser timezone (§24); bounds
default to the current Nepal month, and the mock 422s malformed dates, inverted ranges and

> 92-day windows. Every day is a native button whose accessible name spells out the date
> and each event title in words — the dots are decorative; the words carry the meaning
> (§8.9). Selecting a day renders its events as Badged rows below the grid, so 360px never
> squeezes a week of chips. Month navigation announces the new month in the polite live
> region. BS dates stay out (§24, converter blocked); week/day views stay open.

**Files added**

- `apps/web/src/features/calendar/` — `api.js`, `hooks/{keys,useCalendar}.js`,
  `utils/month.js`, `mocks/{fixtures,handlers}.js` (+4 contract tests),
  `pages/CalendarPage.jsx` (+4 page tests), `index.js`
- `packages/i18n/locales/{en,ne}/calendar.json` — new namespace, en/ne parity

**Files changed**

- `app/nav.config.js` (`calendar` released — People group), `routes/index.jsx` (`/calendar`
  behind `RequirePermission`), `mocks/handlers.js`, `i18n.js`
- `apps/web/e2e/theme.spec.js` — staff calendar flow (grid + legend + day select + month nav)

**Verified (commands actually run)**

- `pnpm lint` → exit 0
- `pnpm test` → **47 files, 507 tests, exit 0** (+12 since part 5; +88 since turn start)
- `pnpm build` → exit 0
- `pnpm e2e` → **20/20 passing** (desktop-1280 + mobile-360)

Three of my own defects found and fixed in the same pass: an insert that split the previous
test's closing tokens (Playwright refused `test()` inside a test — the same class as last
part); a stray `});` left at EOF; and two over-eager text queries — `getByText('Sun')` racing
the loading skeleton (the weekday headers only exist after the query settles, so it must
`findByText`), and `getByText('Holiday')` matching the subtitle's "holidays" (fixed with
`exact: true`). Also made the month-nav test derive its expected bounds from `nepalToday()`
instead of hardcoding October/November, so it survives month rollover.

**NOT verified / open (updated)**

- Nepali copy was checked by unit/parity tests, not by eye on screen.
- The signed-out boot still emits two 401 console probes (expected refresh behavior, filtered in
  the e2e assertion); the worker-claim reload flake noted earlier is unchanged, pre-existing.
- Live-browser walks of the new panel/page were replaced by Playwright runs (Videos not stored).
- Still open: roles-assignment editing + org policies (need the roles/settings API — contract
  request 19), projects, task detail drawer, WIP limits + calendar week/day views (policy /
  UX contracts), console (needs its ADR), AI/mobile, BS converter, PWA, remaining
  `docs/frontend/` files.

**Next step**

Slice 8 is done to the edge of its contracts. Remaining build-order work: console UI (needs
its ADR — separate deploy + auth realm), slice 10 messages/video hardening, or the PWA slice
(offline queue persistence).

---

## 2026-10-09 — master-prompt gap audit + slice 3 (Staff Home + Punch)

**What I did**

- Audited the repository against both the binding `docs/FRONTEND_PROMPT.md` (§18 build order) and
  the pasted **SWAMS Frontend Master Prompt**, and wrote the result to `docs/GAP_ANALYSIS.md`
  (slice status, cross-cutting infrastructure, component inventory, docs set, marketing, console).
  Headline: slices 0–2 are done, slices 3–10 are not; slice 3 was the binding next step.
- Built **slice 3**: the punch workflow, staff Home hero, and attendance history.
- Repaired three defects the interrupted previous turn had left behind:
  `session.machine.test.js` did not parse (a duplicated `it(` block) and two of its tests asserted
  behaviour the machine does not have; `authApi.js` had an unused constant plus
  `waitForMockWorkerIfBootRestore`, which never actually waited.

**Files added**

- `apps/web/src/features/attendance/` — `machines/punch.machine.js` (+24 tests),
  `machines/offline-queue.machine.js` (+14 tests), `hooks/usePunch.js`, `hooks/useAttendance.js`,
  `api.js`, `keys.js`, `policy.js` (+7 tests), `components/{PunchCard,PunchStatusNote,TimerRing,PunchHistoryRow}.jsx`
  (+5 component tests), `pages/{TodayPage,HistoryPage}.jsx`, `mocks/*` (+8 contract tests), README
- `packages/domain/src/geo.js` (+5 tests) — haversine distance / fence check
- `packages/i18n/locales/{en,ne}/attendance.json` — new namespace, 43 keys, key-for-key parity

**Files changed**

- `apps/web/src/app/nav.config.js` (attendance: `enabled: true`), `apps/web/src/routes/index.jsx`
  (`/attendance`, `/attendance/history` behind `RequirePermission`), `apps/web/src/mocks/handlers.js`
  (aggregate attendance handlers), `apps/web/src/features/dashboard/pages/HomePage.jsx` (hero),
  `packages/i18n/src/i18n.js` (register the namespace), `packages/i18n/locales/{en,ne}/common.json`
  (greeting keys, `requestId`), `packages/domain/src/index.js`, `apps/web/src/app/nav-access.test.js`
- `apps/web/src/features/auth/machines/session.machine.js` — added a `hasSession` guard so a
  restore/sign-in/MFA-verify that resolves **without** a session can no longer authenticate

**Verified (commands actually run)**

- `pnpm lint` → exit 0 (`check-js-only` ok, `check-boundaries` ok)
- `pnpm test` → **21 files, 278 tests, exit 0**
- `pnpm build` → exit 0 (web, marketing, console, tokens)
- Live app (`?mock=1`, Vite on :5173), staff portal, walked by hand:
  - Home hero renders the punch card with i18n resolved (en), site "Baneshwor", shift, policy note
  - **Clock in** → `needsReview` with "Saved for review", reason "Location missing", the
    `Location — Unavailable` check row, "Got it" → `working` with a live timer and
    "Checked in at 07:57"; `POST /api/v1/attendance/punch` → 200 in the MSW log
  - **Clock out** → `confirmOut` summary ("You worked 1m today. Overtime so far: 0m.") → punch 200
    → "Got it" → back to the idle **Clock in** state
  - `/attendance/history` → 10 rows (Present / Holiday / Late / On leave / Absent), times,
    `8h 06m` durations, "Late arrival" / "No punch recorded" exceptions, "Load more days"
  - 360px viewport: stacked records, bottom tabs (Dashboard · Attendance · More), no sideways scroll
- Two bugs found by that walkthrough and fixed:
  1. after a confirmed punch the card re-hydrated from the **stale** cached `today` query and showed
     a worker as still clocked in — fixed by only hydrating before the first punch of the mount and
     invalidating `attendance/today` when the server confirms a record;
  2. at 360px the history labels ran into their values ("In09:02") — labels now stack above values.

**NOT verified / open**

- Dark theme at 360/768/1280 was **not** re-checked visually. Evidence instead: the attendance
  feature contains no raw colour or `px` literals (grep + the ESLint raw-literal rule, `pnpm lint`
  exit 0) and the token contrast suite asserts both themes
  (`packages/design-tokens/src/tokens.test.js`, 71 assertions, passing). Light theme + 360px were
  checked by eye.
- After the final HMR churn the mock worker stopped answering `POST /api/v1/auth/login` (404) in the
  preview tab, so no further sign-in was possible. Login itself worked repeatedly earlier in the
  same session with the same code, and `[MSW] POST /api/v1/auth/refresh` was still handled. Same
  class as the known controller/reload flake below — environment, not app logic.
- Nepali was checked by unit test (component + catalog parity), not by eye on screen.
- The `?scenario=offline` queued/sync UI was **not** exercised in the browser; it is covered by the
  machine tests only.
- The environment still intermittently leaves a reloaded page without a service-worker controller,
  which shows as a 401-then-login on reload. **Pre-existing, unchanged, not caused by this work.**
- The offline queue is in-memory for the session; persistence lands with the PWA slice.

**Next step**

Slice 4: attendance corrections, then the manager/HR attendance views and the exceptions table.

---

## 2026-10-08 — slice 2 hardening, continued (post-recovery)

What I picked up:

- The remaining live failure was not a missing mock module. `apps/web/src/mocks/index.js` exists and is importable from the served `main.jsx`; the earlier "missing module" signal was a raw Node import probe against a file that only Vite's browser transform actually feeds to the page.
- The real app-side blocker was an empty/unpopulated MSW worker on some reloads, which produced `404` for auth requests and left the app on `/login`. Once the worker was active and a mock session existed, the login flow worked end to end and the signed-in session survived reload.
- One test regression appeared after my machine edit: `pnpm test` failed with an unhandled exception from `storeSession` and a login-page timeout in separate runs, which meant the machine change was not as safe as the session-machine unit suite alone suggested.

What I fixed:

- `apps/web/src/features/auth/machines/session.machine.js` — made `storeSession` read `event.output?.session` instead of assuming `event.output` is always present. The previous shape threw `TypeError: Cannot read properties of undefined (reading 'session')` from the action itself when an invoked action completed without an `output` field, and the existing tests did not cover that completion shape.

What I verified:

- Live app with `?mock=1`: worker active and controlling the page after reload; boot refresh intercepted and returning the correct signed-out `401` when no mock session exists; sign-in as `sita@himaldigital.com.np` → dashboard renders as "Good morning, Sita"; signed-in session survives a reload with `?mock=1`.
- `pnpm exec vitest run apps/web/src/features/auth/machines/session.machine.test.js` → 16/16.
- `pnpm exec vitest run apps/web/src/features/auth/pages/LoginPage.test.jsx` → 6/6.
- `pnpm test` → 19 test files, 235 tests, exit 0, no unhandled-error noise.
- `pnpm lint` → exit 0. `pnpm build` → exit 0.

What remains open:

- The environment can still leave a page without a service-worker controller for several seconds on some reloads. That is a SW activation timing issue rather than a mock-handler or app-logic bug.

---

<!-- END -->
