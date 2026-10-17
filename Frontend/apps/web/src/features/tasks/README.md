# tasks (slice 8)

The kanban board and the task detail panel behind `GET /tasks` (contract requests 11 and 22).
Everything here is built against the labelled MSW mock in `mocks/` — **no backend tasks endpoint
exists yet**, and nothing on this screen pretends otherwise.

## Purpose and screens

| Screen       | Route                          | Who                      |
| ------------ | ------------------------------ | ------------------------ |
| Task board   | `/work/tasks`                  | anyone with `tasks.read` |
| Task details | same route, `TaskDetailDialog` | same                     |

## 5-line design plan (§9.9)

1. **One board, five lanes** (To do → In progress → Review → Revision → Done) from `LANES`, the same
   list the server validates against.
2. **Every move is one optimistic PATCH** that the server can refuse with a reason; the card returns
   to its lane and the live region says why.
3. **Dragging is never the only way.** A pointer can drag, a keyboard user lifts with Space on the
   card's grip and aims with ←/→, and anyone can open the task and pick the lane from a labelled
   `select` — the single-pointer alternative WCAG 2.5.7 asks for.
4. **The to-do list lives inside the task** (checklist with stable item ids), and its progress shows
   on the card as `2/5 done` plus a bar that only restates the number.
5. **Two write paths, one truth:** drag/keyboard for the lane, the detail panel for the fields, both
   answering with the whole `record` so no screen holds two versions of one task.

## The card (§7.6)

Each card carries exactly three things: the **title**, which is a real button that opens the task
(mouse, touch and keyboard use the same control), the **facts that change triage** (priority,
assignee, due/overdue, checklist progress, revision note), and a **grip** — the one drag/keyboard
handle. Two tab stops per card, both meaningful; nothing is a clickable `<div>`.

## The detail panel (contract request 22)

`TaskDetailDialog` is the APG modal pattern: `role="dialog"`, `aria-modal`, the title as its
`aria-labelledby`, focus moved to the first field on open, Tab cycles inside, Escape closes, and
focus returns to the card the page remembered (`openerRef`). `document.body` stops scrolling while
it is open.

- **One transaction.** Save sends only the fields that changed (`utils/draft.js`, unit-tested);
  an emptied date or person is sent as `null` (cleared), never as an empty string. Changes save on
  the button, not silently on blur, and the button is disabled until something actually changed.
- **The server's answer is the only truth.** A refused patch (`reviewer_required`, `note_required`,
  `title_required`, …) is shown verbatim next to the still-open draft — nothing flashes as saved.
- **Escape twice for a dirty draft.** The first Escape warns; Discard or a second Escape closes, so
  unsaved words are never dropped silently.
- **The lane is a `select`.** Moving work never depends on dragging: with a reviewer set, "Review"
  and "Revision" are reachable with one pointer or the keyboard, which is the non-drag requirement
  of WCAG 2.5.7.

## The to-do list

`ChecklistEditor` writes the three checklist endpoints (`add` / `toggle` / `remove`). Ticking is
optimistic because it is small, frequent and reversible — the card's `2/5 done` moves with it and
rolls back with the server's reason if the write is refused. Adding and removing wait for the
server, because the new item's id comes back from it. Items have stable ids, so a tick always names
the item it belongs to; the count is derived from the items and never stored twice.

**Nothing cascades.** Ticking every box does NOT move the task to Done — that stays a deliberate
drag, keyboard drop or lane change, exactly like the prototype's board.

## States

| State   | Where                                                             |
| ------- | ----------------------------------------------------------------- |
| loading | five lane skeletons, `aria-busy`, no spinner                      |
| empty   | lane-level "Nothing here" copy; no events day copy for the list   |
| error   | shared `ErrorState` with the request ID and a retry               |
| denied  | route guard (`RequirePermission`) before the page mounts          |
| offline | not modelled here — moves simply fail and roll back with a reason |

## Accessibility

- Two labelled controls per card (title, grip); the grip carries `aria-describedby` pointing at the
  board's instructions, which are in the DOM for screen readers and never only in a tooltip.
- Optimistic moves announce through one polite live region: lifted, aimed, dropped, cancelled,
  rolled back.
- Day/lane counts and priorities are always words; colour never carries meaning alone (§8.9).
- Every target is at least 24×24 CSS px (SC 2.5.8): the grip is 24px square and the checklist rows are
  full-width labels with a 36px minimum height.

## Tests

`pnpm exec vitest run apps/web/src/features/tasks`

- `mocks/handlers.test.js` — 12 contract tests (auth, compact vs board rows from one store, moves and
  the §7.6 lane rules, field edits, empty-patch refusal, checklist add/tick/remove with their errors).
- `pages/TasksPage.test.jsx` — 10 board tests (lanes and counts, checklist progress on the card,
  keyboard move, Escape cancel, the Revision note prompt, rollback + announcement, creation, opening
  the panel and focus return, moving through the lane select, a refused edit shown verbatim).
- `components/TaskDetailDialog.test.jsx` — 9 panel tests (every field, save-only-what-changed, `null`
  for a cleared date, refused patch keeps the draft, dirty-close guard, checklist add/tick/remove,
  a refused checklist write surfaced).
- `utils/draft.test.js` — 5 pure tests (draft shape, changed fields only, `null` clearing, trimming).

## Open items

- `GET /tasks` is still a fixture store; the queue is labelled sample data until assignments exist.
- No comments/activity/attachments on a task: the mock does not invent them, and neither does the UI.
- The dialog is a modal rather than a route-backed drawer, so a task cannot be linked directly yet
  (`/work/tasks?task=<id>` would be the next step).
- Checklist reordering and "hide completed" are not built (order is server-array order).
