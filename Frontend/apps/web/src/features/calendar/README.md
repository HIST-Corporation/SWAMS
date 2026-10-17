# calendar (slice 8)

The month view behind `GET /calendar` (contract request 23): leave, holidays and meetings for the whole
org on one month as seen in **Asia/Kathmandu**. Served by the labelled MSW fixtures in `mocks/` until the
real endpoint lands.

## Purpose and screens

| Screen       | Route                          | Who                     |
| ------------ | ------------------------------ | ----------------------- |
| Month view   | `/calendar`                    | anyone with `team.read` |
| Selected day | same route, `?date=YYYY-MM-DD` | same                    |

## 5-line design plan (§9.9)

1. **One month grid, Sunday-first** — how a Nepali office reads a month — with Saturday marked as the
   weekly off in words _and_ a sunken cell, never by colour alone. A day cell carries two hint shapes
   because it has two shapes: at 360–768px it is 42–92px wide and shows dots, from `lg` up it names the
   first event and counts the rest (`+2`) — a title at 92px would truncate to “Wee…”, which is noise.
   Both hints are `aria-hidden`: the cell's accessible name already spells every event out, so nothing
   is heard twice.
2. **The month also exists as words.** Under the grid, an agenda lists every day that has something
   booked: this is what a 360px phone actually reads, and picking a day there selects the same day in
   the grid.
3. **The legend is a control.** Each kind chip is a real toggle (`aria-pressed`) that filters the grid,
   the agenda and the day detail together, with a “Show all” way back.
4. **The selected day lives in the URL** (`?date=`), so a month can be linked, bookmarked or reloaded
   exactly as it was left; opening a link with a date in another month opens that month.
5. **Today is one button** — disabled when you are already on this month, so it never offers a loop.

## Keyboard and screen readers

The month is a real ARIA grid: `role="grid"` → one `role="row"` per week → seven `role="gridcell"`
per row (the leading and trailing blanks are cells too, hidden from assistive tech, so no row is a
stub). One day carries the tab stop (roving `tabindex`), never 31 of them, and the selected day is
where Tab lands:

| Key             | Moves to                                          |
| --------------- | ------------------------------------------------- |
| ← / →           | the day before / after                            |
| ↑ / ↓           | the same day a week earlier / later               |
| Home / End      | the ends of the focused row, clamped to the month |
| PageUp / PageDn | the month before / after, same day (clamped)      |
| Enter / Space   | selects the focused day                           |

Moving past an edge steps the month instead of silently stopping. The page owns that focus request
(`focusIso`) rather than the grid, because the grid is replaced by its skeleton while the next month
loads — a request held inside the component dies with the unmount and leaves focus on the document
(that was a real defect, caught in the browser and now covered by a test with a held-open fetch).

## States

| State   | Where                                                    |
| ------- | -------------------------------------------------------- |
| loading | 35 grid-shaped skeletons, `aria-busy`, no spinner        |
| empty   | “Nothing is booked this month” (or the filtered variant) |
| error   | shared `ErrorState` with the request id and a retry      |
| denied  | route guard (`RequirePermission`, `team.read`)           |

## Dates and i18n

- **AD only, deliberately.** Every date on this screen is Gregorian; the BS converter is still open
  (contract request 1) and nothing here invents a BS date. `formatDateAd` is the single formatter.
- The month is derived from Nepal wall-clock parts (`nepalParts`), never the browser timezone, so the
  month a night-shift worker sees is the org's month.
- Day cells carry a full accessible name — date, weekly-off note, and the day's events — because the
  dots alone would say nothing to a screen reader.

## Known gaps

- No BS dual dates (blocked on request 1), no week or day views, no drag-to-create.
- The grid is read a month at a time; there is no year picker, and the agenda cannot be scrolled to a
  month without stepping the grid.
- The agenda shows the whole month; a “this week” projection would need its own endpoint or the Home
  week series.
- Fixtures pin events to fixed days of the current Nepal month, so the grid always has content — the
  real API must return real dated rows.

## Tests

`pnpm exec vitest run apps/web/src/features/calendar`

- `mocks/handlers.test.js` — 4 contract tests for the range endpoint (auth, only event-bearing days,
  sorted, `invalid_date` / `invalid_range` / `range_too_long`).
- `pages/CalendarPage.test.jsx` — 14 tests: grid + legend + selected day in words, an empty day, a real
  Saturday reading as the weekly off, month stepping, the Today jump, kind filtering, the agenda and its
  URL write, a deep link landing on its day, the error retry, the grid's row/cell structure, arrow-key
  walking with a single tab stop, Home/End staying inside the month, an arrow off the end stepping the
  month while its fetch is still in flight, and the in-cell event hint (first title + `+1`, decorative
  while the control's name carries the whole day).
- `utils/month.test.js` — 5 tests for the Nepal-month derivation, day stepping, month rollover with day
  clamping (31 Jan → 28 Feb, and 29 Feb in a leap year) and the ISO guard.
- `utils/month.js` is exercised through those tests plus the deep-link case (`isIsoDate`).
