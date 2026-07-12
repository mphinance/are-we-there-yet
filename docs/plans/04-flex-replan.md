# Plan 4: Flexible vs fixed, and a replan nudge

Solves the plans-flex pain point. Mark a schedule block `flex:true` (can slide)
versus anchored (a booked, fixed-time thing). When you are running behind, the app
offers to slide the flexible blocks later and names which fixed ones that now
threatens: "push the beach an hour and you still make the 6:00 fish boil, but the
lighthouse tour closes at 4."

## Schema (one field on a schedule item)

```jsonc
{ "start": "09:30", "end": "12:00", "title": "Hike Peninsula State Park", "place": "pennpark",
  "flex": true,            // can slide later when behind. Absent or false = anchored.
  "booking": "WSI-88213"   // optional: matches a bookings[] ref/title. If that
                           // booking is confirmed, the item is force-anchored.
}
```

**Default when unmarked is anchored.** An old `event.json` has no `flex:true`
items, so the feature stays inert and paints nothing (backward compatible), and a
booked tour never moves because the author forgot a flag. The author opts into
looseness, which matches the loose-plan trips.

**Booking tie:** if `item.booking` resolves against `normalizeBookings()` by
`ref` then exact title and the match is `confirmed`, force `flex=false`. A cheaper
fallback: an item whose `place` equals a confirmed booking's place is treated as
anchored and can borrow that booking's `when` label. Adds nothing to the bookings
schema.

## Behind-schedule detection and slide

There is no arrival sensor, so the slip `D = max(D_auto, D_user)`:

- **D_auto**: in `renderNow()`'s `cur` loop, when the current block is flex,
  `over = Date.now() - zonedEpoch(day.date, cur.end, tz)` (same epoch the
  countdown `data-until` already uses at ~:616). Positive `over` means it is
  running long. `statusOf()` is not changed; the overrun is read independently.
- **D_user**: a quick +15 / +30 / +60 control, held in memory and mirrored to
  `localStorage`.

Detection runs only for the real today, gated by `todayIndex()`/`isTodayD` like
`renderNudge`. `computeSlide(day, now, D)`: freeze past blocks via `statusOf`;
resolve each remaining item's `anchored = !flex || bookingConfirmed`; if nothing
is movable return inactive (covers all-fixed and old files). For each movable
block project `start' = start + D`; for each downstream anchored block A, if the
latest movable block before A has `end' > A.start`, A is threatened, else safe.
Returns `{active, D, movable, safe, threatened}`, which yields the roadmap
sentence directly.

## Render and interaction

Render home is `renderNow()`, appended to the now-card via a `renderSlip(day,
now)` helper, bound like the existing `[data-goplace]` handlers. Also add a
`.flexpill`/`.anchorpill` to `renderSchedule()` rows and, when a slip is active, a
projected-time overlay badge that never overwrites the printed schedule.

**Actionable, collapsible, not a passive banner.** The value is the tradeoff, and
a passive banner can only say "you are late" which the countdown already implies.
Collapsed default is a one-line chip ("Running ~15 min behind. Slide flex
blocks?"); expanded shows +15/+30/+60/Reset and the live tradeoff line. Kept
calm (no pulse) so it does not compete with the true 5-minute `.nudge`.

**Ephemeral, never mutates data.** The slide never writes `event.json` and never
rewrites printed times. `D` lives in memory, mirrored to
`daykit:<event.id>:slip:<date>` (per-day, so multi-day works and a mid-afternoon
relaunch restores it). Projected times are overlay badges; Reset clears the key;
the slip auto-clears when the day is over.

## CSS (near `.nudge`, ~:152)

`.slip` panel reusing the `.nudge` shape without the pulse animation, `.slip
.opts` button row, `.slip .ok` green ("still make it", reuse `#2e9e5b`), `.slip
.warn` amber/red (reuse `.bkby.soon`/`.bkby.over` colors), `.slip-chip` collapsed
trigger, `.flexpill`/`.anchorpill` row pills, `.slipped` projected-time badge.

## Edge cases

Nothing flexible or absent field: inert, no chip. All flex: "nothing booked is at
risk", still slidable. Slide that violates a fixed block: reported in `.warn`,
named with `fmt12(A.start)`, but not blocked (the user may skip the flex block).
Past blocks frozen, never rewritten. Multi-day: per-date key, live only on today.
DST: conflict math is pure epoch (`zonedEpoch + D`); the wall-clock label uses a
`shiftHM` clamped at 23:59 so it never rolls into the next date.

## Verify offline

Use `page.clock.install({ time: ... })` before `goto` so `todayStrTz` returns the
trip date and `now` lands mid-schedule. Best fixture is `samples/vacation.json`
day 2026-07-18 (hike and beach flex, lighthouse anchored). Assert the chip
appears, click +30, assert the panel names the safe anchor and the threatened one
with its time. For the auto-overrun path, `page.clock.setFixedTime` past a flex
block's end and assert the chip reads "~N min behind". Prove offline with
`context.setOffline(true)` and re-run the clicks; the slip uses only in-file data.
