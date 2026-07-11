# Daykit: the `event.json` schema

The app (`index.html`) is generic. Everything specific to a day lives in
`event.json`. This is the full field reference. Times are 24-hour
`"HH:MM"` strings interpreted as local wall-clock on `date`.

```jsonc
{
  "id": "summer-blast-west-bear",     // slug, used as a localStorage namespace
  "title": "Summer Blast Adventure WEST",
  "subtitle": "PAC Cub Scout Day Camp", // optional, shown as the header eyebrow
  "date": "2026-07-11",                // yyyy-mm-dd, the day this runs
  "timezone": "America/Chicago",       // informational; times render in the device's local zone

  "team": {                            // optional
    "name": "Popsicle Pirates",
    "rank": "Bear",
    "note": "Free-form clarifier shown on the Info tab."
  },

  "theme": {                           // optional, all keys optional. CSS colors.
    "primary": "#f28c1a",  "accent": "#e4562b",
    "sun": "#f2b21a",      "water": "#1d9bd1",
    "ink": "#2a1a00",      "bg": "#fff7ea",  "card": "#ffffff"
  },

  "location": {
    "name": "St. John's Northwestern Academy",
    "address": "1101 N Genesee St, Delafield, WI 53018",  // optional
    "lat": 43.06565, "lng": -88.40245,
    "zoom": 17                         // starting map zoom, optional (default 17)
  },

  "bring":  ["Swimsuit and towel", "Sunscreen"],   // optional; render as a saved checklist
  "notes":  ["Turn in your name tag for your patch."], // optional; bullet list

  "places": [                          // every pin on the map
    {
      "id": "archery",                 // referenced by schedule items
      "name": "Archery",
      "kind": "activity",              // hub | activity | water | service  (sets pin color)
      "icon": "target",                // see icon keys below
      "lat": 43.06478, "lng": -88.40340,
      "desc": "Teach then shoot."      // optional popup text
    }
  ],

  "schedule": [                        // in order; each becomes a timeline row
    {
      "start": "08:45", "end": "09:35",
      "title": "Pathfinders",
      "place": "pathfinders",          // optional, id of a place; adds a map link
      "session": 1,                    // optional, shows a numbered pill
      "all": true,                     // optional, shows an "ALL" pill (whole-camp block)
      "also": "touchatruck",           // optional, a second place id shown in the subtitle
      "transition": true               // optional, marks a walk/transition block
    }
  ]
}
```

## `kind` values and pin colors

| kind | color | use for |
|------|-------|---------|
| `hub` | purple | the main field, flags, HQ |
| `activity` | orange (theme accent) | stations you rotate through |
| `water` | blue | pool, splash, anything wet |
| `service` | green | first aid, restrooms, lunch, parking |

## `icon` keys

`flag`, `compass`, `water`, `truck`, `target`, `rocket`, `aid`, `rest`,
`lunch`, `parking`, `pin` (fallback). Add more by editing the `ICONS` map
in `index.html`.

## Live behavior

- On `date`, the Schedule tab shows a live "right now / up next" card with a
  ticking countdown, highlights the current block, and dims past ones.
- On any other day, it shows the full schedule with a "not today" note and no
  live highlighting.
- "Find me" uses `navigator.geolocation.watchPosition`, so it needs HTTPS or
  localhost and the user's permission.

## Stack

Plain static HTML/CSS/JS. Leaflet 1.9.4 + OpenStreetMap tiles, no API key,
no build step. One hard style rule inherited from the workspace: no em
dashes anywhere. Use periods, commas, or "and".
