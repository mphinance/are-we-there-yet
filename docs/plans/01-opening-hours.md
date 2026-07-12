# Plan 1: Opening hours and time windows

Solves the time-constrained pain point: a stop is only available certain hours
(tour on the hour 10 to 4, tide window 11 to 2, seasonal, daylight only). The app
shows the constraint on the stop and warns on the live "up next" card when the
plan would arrive outside the window.

## Schema

Two optional fields, because the constraint has two origins that feed one
normalizer.

```jsonc
// on a PLACE: intrinsic hours, apply every day the place appears
{ "id": "lighthouse", "name": "Eagle Bluff Lighthouse",
  "open": "10:00-16:00" }                              // string shorthand
  // "open": ["10:00","16:00"]                          // pair
  // "open": [["10:00","16:00"],["18:00","20:00"]]      // multiple windows
  // "open": { "label": "Tours on the hour", "windows": [["10:00","16:00"]] }

// on a SCHEDULE ITEM: per-occurrence constraint, wins over place.open
{ "start": "10:15", "end": "12:00", "title": "Cave Point cliffs", "place": "cavepoint",
  "window": "11:00-14:00" }                             // same shapes
  // "earliest": "11:00", "latest": "14:00"             // flat shorthand
```

`place.open` is defined once and reused; `item.window`/`earliest`/`latest` is
per-day and per-occurrence, which cleanly handles seasonal or per-day
differences. Effective window for an item is the item constraint if present, else
the place's `open`, else none.

## Helpers (add next to `normalizeBookings`, ~index.html:461)

`normalizeWindows(raw)` returns `[{s,e,label}]`, tolerant of every shape above,
`[]` when absent or malformed. `itemWindows(item)` applies the item-wins-over-
place precedence via `placeById`. `inWindows(wins, t)` tests a wall-clock `HH:MM`
against the windows, handling overnight wrap (`s > e`). `winLabel(wins)` builds
the pill text. Comparison is minutes-since-midnight (`hm()` already exists at
~:472), never `zonedEpoch`, so it is timezone-correct with no tz math. See the
full ES5 sketches in the research notes; the key guard is `isHM()` (regex
`^\d{1,2}:\d{2}$`) so malformed values drop to `[]` and render nothing.

## Render hooks

- **Schedule pill** in `renderSchedule()` (~:733-741): after building `sub`,
  compute a `winPill` (neutral when the start is inside, red `.warn` when
  outside) and inject it in `.what` after `esc(item.title)`, beside the session
  pill. Runs regardless of `today` so the schedule is honest days ahead.
- **Live up-next warning** in `renderNow()` (~:613-622): a `winWarn(item)` helper
  appended in both the `cur` and `nxt` branches, printing "Arrives 10:15, outside
  the window (11:00 to 14:00)." `statusOf()` stays untouched; window validity is
  orthogonal to now/past/future.
- **Nudge** in `renderNudge()` (~:677-682): when the up-in-5 nudge fires, append a
  heads-up if the next stop's start is outside its window.

## CSS (after the `.bkby` block, ~:251)

`.winpill` neutral pill (reuse the `.goalpill`/`.bkpill` 999px radius idiom),
`.winpill.warn` white-on-red reusing `#d64545` (already used by `.bkby.over`),
`.winwarn` red warning line.

## Edge cases

Absent or malformed field renders nothing (backward compatible). Overnight
windows wrap midnight. Multiple windows list comma-joined and match if inside
any. "Tour on the hour" is modeled as one continuous window with a descriptive
`label`; be honest in SPEC that the app checks the window, not the hourly
cadence. Per-day differences go on the item, which overrides the place.

## Verify offline

Schedule and now render fully offline. Serve statically, `cp
samples/vacation.json event.json` (restore after), drive headless with
`executablePath: "/opt/pw-browsers/chromium"`. Assert `.winpill` count, and that
the Cave Point row carries `.winpill.warn` (planned 10:15 vs 11:00 to 14:00). For
the live `.winwarn`, fake the clock with `page.clock.install` to a time on the
trip date shortly before the windowed stop.

## Sample data to add

`event.json`: `"open":"15:00-16:00"` on `supersplash` (its 15:05 session is
inside, neutral pill). `samples/vacation.json`: the label form on `lighthouse`
(noon tour inside, neutral), and `"window":"11:00-14:00"` on the Cave Point item
(10:15 start is outside, demonstrates the red warn). Plus SPEC.md, README.md,
NEW-EVENT.md, and the `sw.js` CACHE bump.
