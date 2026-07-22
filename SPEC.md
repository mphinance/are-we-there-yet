# Are We There Yet?: the `event.json` and `config.json` schema

The app (`<trip>/index.html`) is generic. Everything specific to a day or trip
lives in that trip's `event.json`; the reused bits (your family, your home) live
once in the root `config.json`. This is the full field reference. Times are
24-hour `"HH:MM"` strings interpreted as local wall-clock on each day's date.

## `config.json` (shared, set up once)

`config.json` at the site root holds the pieces reused across every trip, so an
`event.json` never repeats them. All fields are optional.

```jsonc
{
  "site": {                            // the hub landing page
    "title": "Are We There Yet?",
    "tagline": "Pick a trip."
  },
  "family": {                          // reused roster; see "Who wants what"
    "rank": "The Hankos",              // optional label
    "emoji": "🚗",                     // optional
    "members": [ { "name": "Kilian", "emoji": "🎂" }, { "name": "Mom" } ]
  },
  "home": {                            // a shared map pin trips can point at
    "name": "Colgate, WI", "lat": 43.215, "lng": -88.246
  },
  "nearby": {                          // optional; nearby-food suggestions, see below
    "food": true, "radiusKm": 2, "minGapMin": 45
  },
  "trips": [                           // one entry per trip, rendered as a hub card
    { "slug": "zion", "title": "Red Rock Road Trip", "subtitle": "3 days in Zion",
      "dates": "Jul 18 to 20, 2026", "emoji": "🏜️", "primary": "#c1502e" }
  ]
}
```

**Nearby food (`nearby`):** when `nearby.food` is true, a long lunch or dinner gap
with nothing food-related already planned gets a "find a place to eat" button on
the Schedule. Tapping it queries the free, keyless OpenStreetMap Overpass API for
restaurants, cafes, and fast food near that stop and lists the closest few with
distance and a map link. It needs a connection only when tapped, and does nothing
offline or when disabled. `radiusKm` (default 2) and `minGapMin` (default 45)
tune it. Put `nearby` in `config.json` for all trips, or in a single trip's
`event.json` to override (a trip's `nearby` wins over the shared one).

**Inheritance:** when a trip's `event.json` omits `team.members`, the app fills
them from `family.members`. When `home` is set, the app adds a place with id
`home` (kind `hub`) that any schedule item can reference with `"place": "home"`.
A trip that defines its own `team.members`, `team.rank`, or a `home` place
overrides the shared value. Absent `config.json` changes nothing.

## Single day vs multi-day

A file is **single-day** if it has a top-level `date` and `schedule`, and
**multi-day** if it has a `days[]` array. The app normalizes both into the
same internal shape, so single-day files never need a `days` array.

```jsonc
{
  "id": "door-county-getaway",         // slug, used as a localStorage namespace
  "title": "Door County Getaway",
  "subtitle": "3-day Wisconsin coast trip",  // optional, header eyebrow
  "timezone": "America/Chicago",       // IANA zone. Schedule times are wall-clock IN this zone,
                                       // so countdowns and reminders are correct even on a phone
                                       // set to another timezone. Omit to use the device's zone.
                                       // Can also be set per-day inside a days[] entry.

  "theme": { "primary": "#1d9bd1", "accent": "#0e7ea6", "sun": "#4fc3e8",
             "water": "#0e7ea6", "ink": "#0b2733", "bg": "#f0f9fc", "card": "#ffffff" },

  "location": {                        // trip-level default center + label
    "name": "Fish Creek, Door County, WI",
    "address": "optional",
    "lat": 45.1319, "lng": -87.2409, "zoom": 12
  },

  "team": {                            // optional
    "emoji": "🚗",                     // optional badge glyph (defaults to 👥)
    "rank": "The Hankos",
    "name": "optional",
    "note": "Free-form clarifier shown on the Info tab.",
    "members": [ /* optional people, see "Who wants what" below */ ]
  },

  "bring":  ["Layers", "Swimsuits"],   // optional; saved checklist on Info
  "lists":  [ /* optional trip-goal checklists, see below */ ],
  "notes":  ["Cherry season peaks in July."],  // optional; trip-level bullets
  "closingNote": "Safe drive home.",   // optional; shown when the day is over

  "places": [ /* shared across all days, see below */ ],

  // --- MULTI-DAY: use days[] ---
  "days": [
    {
      "date": "2026-07-17",            // yyyy-mm-dd
      "title": "Arrive Fish Creek",    // optional; shown as the day's heading
      "location": { "lat": 45.13, "lng": -87.24, "zoom": 13 },  // optional per-day center
      "closingNote": "optional",       // optional per-day override
      "notes": ["optional per-day notes"],
      "schedule": [ /* items, see below */ ]
    }
  ]

  // --- SINGLE-DAY: use these instead of days[] ---
  // "date": "2026-07-11",
  // "schedule": [ /* items */ ]
}
```

## Who wants what (`team.members` and `who`)

Optional. When you travel with a group, different people want different things.
List the people in `team.members[]` (or once in `config.json` `family.members`,
which every trip inherits when it omits its own), then tag schedule items,
trip-goal entries, and bookings with a `who`. The app draws small initial chips
and adds a filter above the Schedule and Trip goals so the group can see where
wants overlap
("what does everyone agree on") and where they will split up ("just Dad's").

```jsonc
"team": {
  "rank": "The Hankos",
  "members": [
    { "name": "Dad", "color": "#1d9bd1", "initials": "D", "emoji": "🧔" },
    { "name": "Mom", "color": "#e4562b" },   // initials derived from the name
    { "name": "Ivy" },                        // color derived from a name hash, offline
    "Theo"                                     // a bare string becomes { name: "Theo" }
  ]
}
```

Every member field except `name` is optional. `color` defaults to a stable
offline color hashed from the name, `initials` to the first letters ("Mary Beth"
becomes "MB"), and `emoji`, when set, shows on the chip instead of the initials.

A `who` attaches in three places and always degrades array to string to absent:

```jsonc
{ "title": "Super Splash", "who": ["Dad", "Ivy"] }   // schedule item
{ "text": "Earn the patch", "who": ["Ivy"] }          // trip-goal item (list-level who is the default)
{ "title": "Kayak rental", "who": ["Dad", "Ivy"] }    // booking
```

Accepted `who` values: an array of names, a single name string, or `"Everyone"`
(expands to all members and collapses to one `ALL` chip). A name that is not a
member still shows as a dashed "unknown" chip and stays filterable. Bookings keep
their existing free-text behavior: `who` becomes chips only when every token is a
known member, so `"who": "One adult per den"` stays plain text.

The filter is in-memory (optionally remembered per event under
`daykit:<event.id>:whofilter`) and has two modes: "Anyone" (show items at least
one selected person wants) and "Everyone agrees" (show only items every selected
person is on). It renders nothing when there are fewer than two members, so a
file without `members` is unchanged.

## `lists` (trip goals)

Optional priority checklists on the Info tab, saved offline per item like the
packing list. Use them to separate the must-do reasons for the trip from the
would-be-awesome extras. Each list renders as its own titled block with a
tone-colored pill and a "N of M done" progress line.

```jsonc
"lists": [
  {
    "tone": "must",              // "must" (the point), "stretch" (bonus), or any
                                 // other string (neutral styling). Sets color + pill.
    "title": "The whole point",  // optional; falls back to a tone default label
    "note": "Try to hit them all.", // optional subtitle under the heading
    "who": "Everyone",           // optional list-level default (see "Who wants what")
    "items": [                   // the checklist entries: strings or {text, who}
      "Ride the coaster",                            // inherits the list-level who
      { "text": "Earn the patch", "who": ["Ivy"] }   // per-item who overrides it
    ]
  },
  {
    "tone": "stretch",
    "title": "Bonus adventures",
    "note": "If we get the time.",
    "items": ["Tour the lighthouse", "Take the ferry"]
  }
]
```

A shorthand object form is also accepted and normalized to the same shape:
`"lists": { "must": ["..."], "stretch": ["..."] }`. `must` renders in the theme
accent with a "Must do" pill, `stretch` in the water blue with an "If we get
time" pill; any other tone gets neutral styling. Omit `lists` entirely and the
section does not appear.

## `kids` (Kids tab trivia and facts)

Optional. Learning content for the Kids tab, tuned to the trip. Two independent
parts, each shown only when present, so a trip can supply either, both, or
neither and nothing breaks.

```jsonc
"kids": {
  "facts": [                       // optional; "Did you know?" card
    "Iceland is one of the only countries on Earth with zero mosquitoes.",
    "The Icelandic word for obsidian is hrafntinna, raven's flint."
  ],
  "trivia": [                      // optional; a "Trivia" boredom buster
    {
      "q": "What makes obsidian in real life?",   // required question text
      "choices": [                                // 2 to 4 answer options
        "Lava that cools super fast",
        "Sand squished for a million years"
      ],
      "answer": 0,                                // index into choices of the right one
      "fact": "It cools too fast to grow crystals, so it freezes into glass."
                                                  // optional; shown after answering
    }
  ]
}
```

`facts` renders a "Did you know?" card with an "Another one" button that cycles
through the list (starting on a random one). `trivia` adds a **Trivia** button to
the Boredom busters, which asks the questions in a shuffled order, one at a time,
keeps a score, reveals the `fact` after each answer, and celebrates a perfect
run. Questions are asked in-session only, no persistence. Omit `kids` entirely
and nothing about the Kids tab changes.

## `bookings` (reservations and tickets)

Optional. The things that have to be worked out ahead of time: tour tickets,
dinner seatings, ferries, campsites, permits. Renders as a "Reservations and
tickets" card on the Info tab with a "N still to book" header count. Each row
has a checkbox you tick when it's handled; `confirmed` items start ticked, and
your ticks persist offline per item like the packing list (under the
`daykit:<event.id>:bookings` key).

```jsonc
"bookings": [
  {
    "title": "Eagle Bluff Lighthouse tour",  // required
    "status": "todo",        // "todo" (needs booking), "confirmed" (locked in),
                             // or "waitlist" (pending). Sets the pill color.
                             // Anything unrecognized falls back to "todo".
    "when": "Sat Jul 18, around 12:15pm",  // optional free-text reservation time
    "by": "2026-07-15",      // optional book-by deadline (yyyy-mm-dd). Shows a
                             // countdown that turns amber within 14 days and red
                             // when overdue. Hidden once the row is handled.
    "ref": "WSI-88213",      // optional confirmation or reference number
    "url": "https://...",    // optional booking link (Book / View)
    "place": "lighthouse",   // optional place id; adds a Directions link
    "who": "Everyone",       // optional; free text, or member names for chips
                             // (see "Who wants what")
    "note": "Sells out in summer."  // optional free text
  }
]
```

A string shorthand is accepted and treated as a `todo` with just a title:
`"bookings": ["Book the ferry", "Reserve a campsite"]`. Omit `bookings`
entirely and the section does not appear.

## `prep` (the Prep tab: what still has to happen before you go)

Optional. The jobs that are not reservations: check the passports, ask the
operator a question, fix a wrong calendar entry, buy the boots. Renders as a
**Prep** tab holding a countdown, a month calendar from this month through
departure, and a checklist. Ticks persist offline under
`daykit:<event.id>:prep`.

```jsonc
"prep": [
  {
    "title": "Check all three names against the passports",  // required
    "by": "2026-07-19",     // optional deadline (yyyy-mm-dd). Places the task on
                            // the calendar and drives the urgency colour: red
                            // when overdue, amber within 7 days.
    "owner": "Mom",         // optional free-text chip. Who owns the job, which
                            // is often not who is going.
    "who": "Everyone",      // optional; member names render as chips
    "url": "https://...",   // optional link (Open)
    "note": "Five minutes with three passports.",  // optional free text
    "done": false           // optional starting state; a user tick overrides it
  }
]
```

A string shorthand works: `"prep": ["Renew the passports"]`.

**The tab merges two sources.** Every `prep` entry, plus every `bookings` entry
that is not `confirmed` *and* carries a `by` date — because an unbooked booking
is a pre-trip job too. A `prep` task whose title matches a booking's wins, so
listing a thing in both places shows it once. Keep the split clean and you never
hit that: **`bookings` is what you reserve, `prep` is what you do.**

The tab hides itself when both sources are empty, so trips that don't need it
never see it.

The calendar runs from the first of the current month through the end of the
departure month. It marks today, tints every trip day, fills the departure day
solid, and puts up to three dots on any day with tasks. Tap a day to highlight
its tasks in the list; tap again or hit the button to clear.

**The countdown** reads from `days[0].date`, so it needs no configuration.

## Opening hours and time windows

Optional. A stop that is only available certain hours (a tour on the hour, a
tide window, a seasonal or daylight-only spot). The window can live in two
places that feed the same check:

- On a **place**, as `open`. Intrinsic hours that apply every day the place is
  visited.
- On a **schedule item**, as `window` (or the flat `earliest`/`latest`). A
  per-occurrence constraint that overrides the place's `open` for that one stop,
  which cleanly handles seasonal or per-day differences.

The effective window for a stop is the item constraint if present, else the
place's `open`, else none. All of these shapes are accepted for either field:

```jsonc
"open": "10:00-16:00"                            // string shorthand
"open": ["10:00", "16:00"]                        // pair
"open": [["10:00","16:00"], ["18:00","20:00"]]    // multiple windows
"open": { "label": "Tours on the hour", "windows": [["10:00","16:00"]] }

"window": "11:00-14:00"                            // same shapes on an item
"earliest": "11:00", "latest": "14:00"            // flat shorthand
```

Times are wall-clock `HH:MM` in the event timezone and are compared as
minutes-since-midnight, so no timezone math is involved. A window whose start is
later than its end wraps past midnight (for example `"22:00-02:00"`). Multiple
windows are comma-joined and a time matches if it falls inside any of them.

A windowed stop shows a small clock pill on the Schedule tab: neutral when the
planned start is inside the window, red when it is outside. On the current day,
the live "right now / up next" card and the up-in-5 nudge add a warning when the
plan would land outside the window. The app checks the window bounds, not an
hourly cadence, so "Tours on the hour" is modeled as one continuous window with
a descriptive `label` that becomes the pill text. Absent or malformed values
render nothing, so older files are unaffected.

## Flex vs fixed, and the replan slip (`flex` and `booking`)

Optional. Mark a schedule block `flex: true` when it can slide later (a hike, a
beach, an open-ended stroll). Everything else is **anchored** by default: a
booked, fixed-time thing that should not move. An old file has no `flex` items,
so the feature stays inert and paints nothing, and a tour never moves because
the author forgot a flag. The author opts into looseness.

```jsonc
{ "start": "09:30", "end": "12:00", "title": "Hike Peninsula State Park", "flex": true }
{ "start": "18:00", "end": "20:00", "title": "Fish boil", "flex": true, "booking": "WSI-88213" }
```

When the current day runs behind (auto-detected when a flex block runs past its
printed end, or when you tap a +15 / +30 / +60 control), the "right now" card
grows a calm, collapsible slip panel. It slides the flexible blocks by that many
minutes and names the tradeoff: which anchored blocks you still make and which
ones the slide now threatens ("push the beach an hour and you still make the
6:00 fish boil, but the lighthouse tour is at risk"). On the Schedule tab each
row shows a **Flex** or **Fixed** pill, and while a slip is active the flexible
rows get a projected-time overlay badge next to the printed time.

The slide is **ephemeral**. It never rewrites `event.json` or the printed times.
Your declared slip is stored per day under `daykit:<event.id>:slip:<date>` (so
multi-day trips and a mid-afternoon relaunch both work), Reset clears it, and it
auto-clears when the day is over. Conflict math is done in pure epoch time, so it
stays correct across a DST boundary.

**Booking tie:** a `booking` on an item matches a `bookings[]` entry by its `ref`
or its exact `title`. If that booking is `confirmed`, the item is forced anchored
even when marked `flex`. As a cheaper fallback, an item whose `place` equals a
confirmed booking's place is also treated as anchored. This keeps a locked-in
reservation from sliding, and adds nothing to the bookings schema.

## `schedule` items

```jsonc
{
  "start": "09:30", "end": "12:00",
  "title": "Hike Peninsula State Park",
  "place": "pennpark",   // optional, id of a place; adds a map link + walk directions
  "also": "beach",       // optional, a second place id shown in the subtitle
  "note": "bring water", // optional free text in the subtitle
  "session": 1,          // optional, shows a numbered pill
  "all": true,           // optional, "ALL" pill + highlight (whole-group block)
  "window": "11:00-14:00", // optional open window for this stop (see Opening hours)
  // "earliest": "11:00", "latest": "14:00"  // flat shorthand for the same thing
  "who": ["Dad", "Ivy"],  // optional, who wants this (see "Who wants what")
  "flex": true,          // optional. This block can slide later when you run behind.
                         // Absent or false means anchored (a fixed-time thing).
  "booking": "WSI-88213", // optional. Ties this block to a bookings[] entry by ref
                         // or exact title. A confirmed booking forces it anchored.
  "dist": 5.4,           // optional trail distance in miles (number), or a free string.
  "gain": 1500,          // optional elevation gain in feet (number), or a free string.
  "level": "strenuous"   // optional difficulty: easy / moderate / strenuous (any string).
}
```

`dist`, `gain`, and `level` render as a compact stat line under the title and in
the map popup. When `dist` and `gain` are numbers they are also summed into a
"Today: 11.4 mi, 1,750 ft" glance line under the schedule heading. Difficulty is
color-coded (easy green, moderate amber, strenuous red). All three are optional
and render nothing when absent.

## `places`

```jsonc
{
  "id": "inn",                 // referenced by schedule items
  "name": "Whistling Swan Inn",
  "kind": "lodging",           // sets pin color, see table
  "icon": "lodging",           // see icon keys
  "lat": 45.1316, "lng": -87.2412,
  "address": "optional",       // shown for lodging on the Info tab
  "desc": "optional popup text",
  "days": ["2026-07-17"],      // optional: limit this pin to specific day dates
  "open": "10:00-16:00"        // optional open window (see Opening hours)
}
```

On multi-day trips the map shows the selected day's referenced stops, plus
any `service`/`lodging` places (ambient, shown every day) and any place whose
`days` includes that date. A "Show all stops" toggle reveals everything. On
single-day files, every place shows.

## `kind` values and pin colors

| kind | color | use for |
|------|-------|---------|
| `hub` | purple | main field, flags, HQ |
| `activity` | orange (theme accent) | stations, events |
| `water` | blue | pool, splash, beach |
| `service` | green | first aid, restrooms, lunch, parking |
| `lodging` | magenta | hotel, cabin, inn (listed on Info) |
| `food` | amber | restaurants, cafes |
| `sight` | steel blue | landmarks, parks, tours |
| `travel` | slate | transit, drives, stops |

## `icon` keys

`flag`, `compass`, `water`, `truck`, `target`, `rocket`, `aid`, `rest`,
`lunch`, `parking`, `lodging`, `food`, `coffee`, `sight`, `transport`,
`flight`, `train`, `hike`, `beach`, `shop`, `star`, `pin` (fallback). Add
more by editing the `ICONS` map in `index.html`.

## `travel` (drive-time estimates)

Optional. Tunes the rough travel estimate the Schedule tab shows between
consecutive stops. The app takes the straight-line distance between two stops'
places (using their `lat`/`lng`), multiplies by a road-factor to approximate the
real route, and divides by an assumed speed. It is a good-enough offline guess
with no routing API and no network, meant to catch "these two are too far apart to
share a day", not to give a turn-by-turn ETA. Between each pair of stops with
coordinates it renders a "~24 min drive" (or walk) chip, and when the travel time
does not fit the gap between the stops it flags the leg and adds a "Timing check"
card for that day.

```jsonc
"travel": {
  "roadFactor": 1.3,     // route distance vs straight line. Default 1.3.
  "mph": 45,             // assumed driving speed. Default 45 (blends town + highway).
  "walkMph": 3,          // assumed walking speed. Default 3.
  "walkUnderMi": 0.3,    // legs under this road distance render as a walk. Default 0.3.
  "graceMin": 5          // slack before a short leg is flagged as not fitting. Default 5.
}
```

Can also be set per day inside a `days[]` entry, which overrides the trip-level
value for that day. Every key is optional; omit `travel` entirely and the
defaults apply. Stops without coordinates, or consecutive stops at the same
place, render no chip.

## Live behavior

- On a day that is today, the Schedule tab shows a live "right now / up next"
  card with a ticking countdown, highlights the current block, dims past
  ones, and shows a pulsing nudge in the final 5 minutes with walking
  directions to the next stop.
- On any other day, it shows that day's plan with a "coming up" or "past day"
  header and no live highlighting.
- When the current day has flexible blocks (`flex: true`) and you fall behind,
  the "right now" card offers a slip panel that slides them and names which
  anchored blocks stay safe versus at risk. See "Flex vs fixed" above.
- On multi-day trips, the header shows the date range and "Day X of N" or a
  countdown to the trip. The day switcher defaults to today when the trip is
  running.
- "Find me" and "Mark my car" use `navigator.geolocation`, so they need HTTPS
  or localhost and the user's permission.
- Weather (Open-Meteo, no key) shows for the selected day when its date is
  within forecast range, and hides otherwise. On a rainy day (50%+ chance) it
  adds a "pack the rain shell" hint, and any schedule block whose hours line up
  with high rain odds gets a "🌧 60%" badge.
- Sunrise, sunset, and the evening golden hour show for the selected day,
  computed offline from the location's coordinates (no API), so they work with
  no signal.
- The Schedule tab lands you on the current block when you open it, and floats a
  "Now" pill when that block scrolls out of view. Tapping it jumps back.
- When the "Who wants" filter is active, a banner spells out whose stops are
  showing, with one tap to clear it.
- The Map draws the selected day's stops as an ordered route line and notes the
  day's total driving time in the legend.
- All animations respect the operating system's reduce-motion setting.

## Stack

Plain static HTML/CSS/JS. Leaflet 1.9.4 + OpenStreetMap tiles, Open-Meteo for
weather, no API keys, no build step. One hard style rule inherited from the
workspace: no em dashes anywhere. Use periods, commas, or "and".
