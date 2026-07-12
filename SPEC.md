# Are We There Yet?: the `event.json` schema

The app (`index.html`) is generic. Everything specific to a day or trip lives
in `event.json`. This is the full field reference. Times are 24-hour
`"HH:MM"` strings interpreted as local wall-clock on each day's date.

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
    "note": "Free-form clarifier shown on the Info tab."
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
    "items": ["Ride the coaster", "Earn the patch"]  // the checklist entries
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

## `schedule` items

```jsonc
{
  "start": "09:30", "end": "12:00",
  "title": "Hike Peninsula State Park",
  "place": "pennpark",   // optional, id of a place; adds a map link + walk directions
  "also": "beach",       // optional, a second place id shown in the subtitle
  "note": "bring water", // optional free text in the subtitle
  "session": 1,          // optional, shows a numbered pill
  "all": true            // optional, "ALL" pill + highlight (whole-group block)
}
```

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
  "days": ["2026-07-17"]       // optional: limit this pin to specific day dates
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

## Live behavior

- On a day that is today, the Schedule tab shows a live "right now / up next"
  card with a ticking countdown, highlights the current block, dims past
  ones, and shows a pulsing nudge in the final 5 minutes with walking
  directions to the next stop.
- On any other day, it shows that day's plan with a "coming up" or "past day"
  header and no live highlighting.
- On multi-day trips, the header shows the date range and "Day X of N" or a
  countdown to the trip. The day switcher defaults to today when the trip is
  running.
- "Find me" and "Mark my car" use `navigator.geolocation`, so they need HTTPS
  or localhost and the user's permission.
- Weather (Open-Meteo, no key) shows for the selected day when its date is
  within forecast range, and hides otherwise.

## Stack

Plain static HTML/CSS/JS. Leaflet 1.9.4 + OpenStreetMap tiles, Open-Meteo for
weather, no API keys, no build step. One hard style rule inherited from the
workspace: no em dashes anywhere. Use periods, commas, or "and".
