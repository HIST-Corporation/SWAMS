# attendance (slices 3–4, R1–R2)

**Last verified:** 2026-10-11 · Owner: Frontend · Screens: `/`, `/attendance`, `/attendance/history`, `/attendance/team`, Home (`PunchCard` hero)

Punch in/out, the live day timer, and attendance history. This is the hero slice of the app
(§9.1): staff open Home, tap once, and know where their day stands.

## Purpose and screens

| Route                     | Screen                                               | Audience             | Permission                                                 |
| ------------------------- | ---------------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| `/` (hero)                | `PunchCard`                                          | everyone             | `attendance.read` + `attendance` entitlement               |
| `/attendance`             | `TodayPage`                                          | everyone             | same                                                       |
| `/attendance/history`     | `HistoryPage`                                        | everyone             | same                                                       |
| `/attendance/team`        | `TeamBoardPage` (+ `TeamBoardRow`, `TeamExceptions`) | reviewers            | `attendance.approve` + `attendance` entitlement            |
| `/attendance/corrections` | `CorrectionsPage` + `CorrectionQueue`                | everyone + reviewers | submit: `attendance.correct`; review: `attendance.approve` |

## 5-line design plan (§9.9)

1. **Palette:** one hero surface (`--surface`, `--shadow-1`, `rounded-hero`); the timer ring is the
   only saturated element (`--primary` stroke on `--surface-sunken` track); status language uses
   `--warning-soft/--warning-text` for queued and `--danger-soft/--danger-text` for errors.
2. **Type roles:** hero timer 24px tabular, section title 16px, body/labels 14px, meta 12px;
   one family (Mukta); no ALL-CAPS eyebrows.
3. **Layout:** hero-left (ring + action) with the status note stacked beside it; the two columns
   collapse to one below `sm`. History is a _record list_, never a shrunken table.
4. **One memorable element:** the ring. It answers the punch — it fills as the day's expected
   minutes pass and settles when the server confirms. Reduced motion removes the transition only.
5. **Content:** real fixture data — Baneshwor/Lalitpur/Pokhara, `09:02`–`17:18`, `8h 06m`,
   "Late arrival", Nepali labels checked in the same PR.

### Two variants considered

- **A (chosen) — ring + inline status beside it.** The next action is one tap from the ring;
  the status note replaces the action area rather than stacking below it, so a queued punch or a
  policy problem never pushes the button off-screen at 360px.
- **B — action bar under a full-width ring.** Rejected: at 360px the ring eats the fold and the
  primary action scrolls away; it also split attention between two equal-weight blocks.

## Workflow states (Section 7.1)

`idle → checking → submitting → settled(working | idle)` with `permissionHelp`, `queued`,
`syncing`, `needsReview` and `error` beside it. The machine is in
`machines/punch.machine.js`; components render from `status` only.

Key rules implemented:

- the **server record is the only clock** — `startedAt` comes from the punch response, never the
  client (a client clock drift is a notice, not a time source);
- a **failed location/area check saves the punch** and lands in `needsReview`; it never blocks a
  worker from recording their day (anti-surveillance rule, §3);
- **one idempotency key per attempt**, reused on retry, cleared once the server confirms, so a
  retry or an offline flush can never double-post;
- `PUNCH_ANYWAY` appears only when the org policy sets `allowOverride`.

## Offline (Section 7.2)

`machines/offline-queue.machine.js` owns unsent punches: ordered per entity (a clock-out can never
overtake its clock-in), deduped by key, exponential backoff (`retryDelayMs`), and a `flushFailed`
state so a dead network never claims connectivity. The hook (`hooks/usePunch.js`) performs the
flush while the machine is `syncing` and reports `FLUSH_DONE` / `FLUSH_FAILED` back.

`queueStorage.js` persists the unsent tail to `localStorage` (key
`swams.queue.attendance.v1`, ≤50 items, `sent` never stored): a queued punch
survives a hard reload while offline and resumes from storage; an interrupted
`sending` flight restores as `queued` (the idempotency key makes the retry
safe); shapeless or corrupt storage loads as `[]`; storage failures fall back
to the in-memory session queue. Tested in `queueStorage.test.js`.

## States covered

| State   | Where                                                              |
| ------- | ------------------------------------------------------------------ |
| loading | hero-sized skeleton (no spinner) while `today`/`policy` load       |
| empty   | `idle` invites the first punch; history has a designed empty state |
| error   | inline note with the request ID under "Details" + retry            |
| denied  | `permissionHelp` with the reason and (when allowed) an override    |
| offline | `queued` chip with a sync-now action and a waiting count           |

## Permissions and entitlement

`attendance.read` + the `attendance` entitlement via `nav.config.js` and `RequirePermission`.
The write path additionally assumes `attendance.write` — the server is the real gate; a denied
punch returns a normal error, never a fabricated success.

## Week strip

`/attendance` carries a seven-column week strip under the punch card so a person sees how the
week is going without leaving the page. It is derived from `GET /attendance/history`, not a
second endpoint, so the strip and the history table can never disagree about a day (§7.6).

- **Nepal weeks, not browser weeks.** Weeks start **Sunday in Asia/Kathmandu**, computed from
  Nepal wall-clock parts. Dates are compared as `YYYY-MM-DD` strings, so the comparison is exact.
- **A gap is a real zero.** `weekStats` and `weekSeries` (in `weekStats.js`, pure and
  unit-tested) return a zero-minute day rather than dropping it, so a missed day shows as a gap
  instead of being smoothed away — and `elapsed` (1 on Sunday, 7 once Saturday is done) stops an
  unfinished week reading as a collapse.
- **The bar never carries meaning alone.** Each column is a label, a bar and the value in words
  (§8.9); the bar only restates the number beside it.
- **States first.** Loading is a skeleton; failure is the shared `ErrorState` with retry (§8.5).

Deliberately not shared with Home's week panel: that one needs a wider window for its
week-over-week delta and keeps its own copy of the arithmetic.

## Mocks — labelled, never production

`features/attendance/mocks/*` implements the endpoints MSW serves. Documented rules:

- first accepted punch of the day is a clock-in, the next is a clock-out; a clock-in while a
  session is open returns `409 already_clocked_in`;
- a punch with no location while the policy requires one is saved and flagged `no_location`;
- a repeated `idempotencyKey` returns the stored record (that is the point of the key);
- `POST /attendance/punch?scenario=offline` fails at the network layer so the queued/sync UI can be
  exercised by hand;
- **limitation:** `GET /attendance/history` returns a fixed 14-day fixture and does not merge
  today's recorded punches. The real API must return real days (see the contract requests).

## Tests (`2026-10-11` — slice 4 team board added)

`pnpm exec vitest run apps/web/src/features/attendance`

- `machines/punch.machine.test.js` — 24 transition tests (every branch, both kinds, offline, conflicts)
- `machines/offline-queue.machine.test.js` — 14 tests (dedupe, ordering, backoff, retry, discard)
- `policy.test.js` — 8 pre-flight cases (no policy, denied, unsupported, inside/outside fence, and a
  guard that every outcome reports the `device` row first — the failure paths used to drop it, so the
  punch card listed only "Location" and a person could not tell the phone apart from the permission)
- `mocks/handlers.test.js` — 10 contract tests for the endpoints (shape drift fails here; team board 422s a malformed `?date`)
- `components/PunchHistoryRow.test.jsx` — 5 component tests (en + ne, exception copy)
- `components/TeamBoardRow.test.jsx` — 3 component tests (en presence word, no-punch dash, ne `ढिलो`)
- `queueStorage.test.js` — 6 storage tests (round-trip minus sent, sending→queued restore, needs_attention kept, corrupt/shapeless loads `[]`, dead backend falls back)
- `weekStats.test.js` — 8 tests (Sunday-start Nepal week, a real zero, `elapsed` clamps to 1–7,
  the browser timezone is ignored)
- `components/WeekStrip.test.jsx` — 5 tests (one week of history, total + worked days, all seven
  columns in order with the gaps intact, scheduled-so-far, error state with retry)
- `pages/TeamBoardPage.test.jsx` — 4 page tests (summary + rows + attention band, clean-day message, error, empty board)

## 2026-10-11 — slice 4 remainder: the team attendance board

`/attendance/team` (`TeamBoardPage`) is the manager/HR lens slice 4 asked for: server-owned
summary tiles, the presence list (`TeamBoardRow`, Avatar + presence word + site + clock-in +
worked — a stacked record at 360px, a grid row at md+), and the "Needs attention" exceptions
band (`TeamExceptions`: Late arrival / No punch recorded, linking into the correction queue).
One `GET /attendance/team` request (contract row 24) owns presence, exceptions and the
summary; the route is behind `attendance.approve` + the `attendance` entitlement, and
the attendance pages link to it only for reviewers. Malformed `?date` is 422
`invalid_date` in the mock; the fixture board serves any well-formed date (past days are
a real-API concern — documented, not faked).

## Open items

1. **BS/AD dual dates** are not shown yet — blocked on the verified BS converter (Open Decision),
   not on this feature.
2. Past-day boards: the mock serves the same fixture board for any well-formed `?date`; the
   real API must serve real days (see contract request 24).
3. The punch is not yet wired to the service worker's background sync (PWA slice);
   persistence across reloads now covers only the queue state.
