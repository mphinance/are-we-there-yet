# Roadmap plans

Build-ready implementation plans for the five trip-planning features sketched in
[`../../IDEAS.md`](../../IDEAS.md). Each was researched against the actual code in
`index.html` and follows the same rules: optional and backward compatible,
offline-first, data-driven, no em dashes, `esc()` on every data-derived string.

Each doc is self-contained: schema, the ES5 helpers to add, the exact render
hooks (real function names and line regions), CSS, edge cases, and how to verify
offline with the bundled Chromium at `/opt/pw-browsers/chromium`.

## The plans

| # | Plan | Pain point it solves | Depends on |
|---|------|----------------------|------------|
| 1 | [Opening hours and windows](01-opening-hours.md) | Time-constrained things (hours, tide, daylight) | none |
| 2 | [Who wants what](02-who-wants-what.md) | Traveling with others who want different things | none |
| 3 | [Drive time and day-fit](03-drive-time.md) (shipped) | Things too far apart or too close in time | none |
| 4 | [Flex vs fixed replan](04-flex-replan.md) | Plans that flex when you run behind | reservations (shipped) |
| 5 | [Candidate pool and day-builder](05-day-builder.md) | Building the whole plan interactively | 1, 2, 3, 4 |

## Build order (why this sequence)

Items 1 to 4 are independent primitives and can ship in any order or in
parallel. Item 5 is deliberately last: it is the sum of the other four and
should compose their helpers (`itemWindows`, `legEstimate`, `whoChips`, the
flex/anchor logic) rather than reinvent them. Every conflict check in the
day-builder feature-detects its upstream helper, so partial delivery still works:
if drive-time has not shipped yet, the builder just skips the drive-fit warning.

Reservations (`bookings[]`) already shipped; item 4 ties into it (a `confirmed`
booking implies a fixed-time block) and item 5 reuses `BOOK_STATUS` for its
"still to book" reminders.

## Shared decisions the plans agreed on

These came up across multiple plans and are worth settling once:

- **`haversine()` and `fmtDist()` already exist** in `index.html` (around line
  1117), used by the geolocation nearest-place logic. Drive-time (item 3) and the
  day-builder (item 5) reuse them. No new distance math.
- **Window comparisons use wall-clock minutes-since-midnight, not epochs.** Both
  the schedule times and the window bounds are wall-clock strings in the event's
  timezone, so comparing them directly is timezone-correct with zero tz math.
  Only comparisons against live `now` need `zonedEpoch`/`todayStrTz`.
- **The `open` window shape is shared.** Item 1 defines it on places and schedule
  items; item 5's `candidates[]` reuse the exact same shape. Define the
  normalizer once (`normalizeWindows`).
- **Drafts and view-state live in localStorage, never written back to
  `event.json`.** The app fetches `event.json` read-only; the day-builder stores
  assignments under `daykit:<event.id>:plan`, the replanner under
  `daykit:<event.id>:slip:<date>`, matching the existing `:bring` / `:bookings`
  namespace. A "copy schedule JSON" export is the manual bridge back to the file.
- **Interaction stays framework-free and touch-first.** The day-builder uses
  tap-to-assign, not HTML5 drag-and-drop (which does not fire from touch on most
  mobile browsers). Pointer-events drag can be layered on later as enhancement.
- **Every plan bumps `sw.js` `CACHE`.** Coordinate the version if several land
  together so installed clients pull fresh assets once, not once per feature.
