# Ideas: from a day-of app to a trip planner

This started as a day-of pocket app: a fixed schedule you glance at while you
run between stations. The Slack thread that kicked this off was about the messier
job that comes _before_ that: figuring out a trip where you want to see or do all
the unique things a place has to offer that interest you. That job has real
friction, and Philip named it well:

1. Some things are **time constrained** (open only certain hours, seasonal, tide
   or daylight dependent).
2. Some things are **too far apart or too time consuming** to do on the same day.
3. Some things are **too close in time** to each other to both fit.
4. You **travel with others**, and different people want different things.
5. Some things **require tickets or reservations** to be worked out.
6. Some things **can flex** to different times if plans change.

The app is deliberately zero-backend and data-driven: everything specific to an
event lives in `event.json`, and every field is optional so old files keep
working (see `CLAUDE.md`). So the plan is to grow the data model one optional
field at a time, each one earning its keep against a real pain point above, and
render nothing when a field is absent.

## Shipped in this PR

### Reservations and tickets (pain point 5)

A `bookings[]` array on `event.json`, surfaced as a "Reservations and tickets"
card on the Info tab. Each booking carries a `status` (`confirmed`, `todo`,
`waitlist`), an optional `by` book-by deadline that turns amber as it nears and
red when it's overdue, plus a confirmation `ref`, a booking `url`, a `place` for
directions, and a free-text `note`. A header count keeps "3 still to book" in
front of you, and checking one off persists offline like the packing list.
Schema in `SPEC.md`, samples in `event.json` and `samples/vacation.json`.

This is the most self-contained of the six and the one you feel first: the trip
falls apart when the thing you wanted sells out while you were deciding.

## Next up (roadmap, roughly in build order)

Each of these now has a build-ready implementation plan in
[`docs/plans/`](docs/plans/README.md), researched against the actual code:
schema, the ES5 helpers to add, exact render hooks, CSS, edge cases, and how to
verify offline. The short version is below; follow the link for the detail.

### 1. Opening hours and windows (pain point 1)

Plan: [`docs/plans/01-opening-hours.md`](docs/plans/01-opening-hours.md).

Add an optional `open` window to a `place`, or an `earliest`/`latest` to a
schedule item: "the lighthouse only does tours on the hour, 10 to 4," "tide is
low enough to walk the cliffs only 11 to 2." Render a small clock pill on the
stop and, on the live "up next" card, warn when the current plan would arrive
outside the window. Purely additive, and it makes the schedule honest about the
constraints it's already implicitly built around.

### 2. Wants and who's-in (pain point 4)

Plan: [`docs/plans/02-who-wants-what.md`](docs/plans/02-who-wants-what.md).

Let a schedule item, goal, or a new `candidates[]` pool carry a `who` list of
names drawn from `team`. Render little initial chips, and add a filter on the
Schedule and Goals tabs: "show me just Dad's must-dos," "what does everyone
agree on." The trip-goal `must` / `stretch` split already gestures at this; this
makes it per-person so the group can see where wants overlap and where they'll
split up. Names come from an expanded `team.members[]`.

### 3. Drive time and "can these share a day" (pain points 2 and 3)

Plan: [`docs/plans/03-drive-time.md`](docs/plans/03-drive-time.md).

Every `place` already has `lat`/`lng`. A rough straight-line distance between
consecutive stops (times a road-factor fudge) gives a good-enough drive estimate
with no routing API and no network, which matters offline in a park with no
signal. Surface it as a "~40 min drive" chip between stops, and flag when a day's
stops don't physically fit the hours between them, or when two things you want
are so far apart they can't share a day. This is the clearest answer to "too far
apart" and "too close together."

### 4. Flexible vs fixed, and a replan nudge (pain point 6)

Plan: [`docs/plans/04-flex-replan.md`](docs/plans/04-flex-replan.md).

Mark a schedule item `flex: true` (can move) vs anchored (a booked tour at a
fixed time). When the live countdown shows you're running behind, offer to slide
the flexible blocks later and tell you which fixed ones that now threatens: "push
the beach an hour and you still make the 6:00 fish boil, but the lighthouse tour
closes at 4." The app already tracks live time and the next stop; this turns that
into a lightweight replanner.

### 5. Candidate pool and day-builder (pain points 2, 3, 4 together)

Plan: [`docs/plans/05-day-builder.md`](docs/plans/05-day-builder.md), including a
four-slice delivery so it lands incrementally rather than as a big-bang rewrite.

A pre-trip mode: instead of a fixed `schedule`, start from a `candidates[]` list
of everything you might do, each tagged with duration, hours, who wants it, and
whether it's booked. Drag them onto days; the app checks them against drive time,
opening hours, and reservations as you go, and flags conflicts. This is the big
one, and it's really the sum of ideas 1 through 4. It turns the app from "show me
the plan" into "help me build the plan," which is exactly the guided interactive
process the thread asked for. Everything above is a down payment on this.

## Design rules these all follow

- **Optional and backward compatible.** Every new field is additive; absent
  fields render nothing, never an error. Old `event.json` files keep working.
- **Offline first.** No new network dependencies. Distance and time math is done
  from coordinates already in the file, because the whole point is that it works
  in a field with no signal.
- **Data-driven, not hardcoded.** Nothing event-specific goes in `index.html`;
  it goes in `event.json` and is documented in `SPEC.md`, sampled in both
  `event.json` and `samples/vacation.json`, and prompted for in `NEW-EVENT.md`.
- **Glanceable.** The value is a plan you can read at a glance while standing in
  a parking lot. New features earn their pixels or they don't ship.
