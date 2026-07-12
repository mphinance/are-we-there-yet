# Setup

Getting your own copy running takes three edits. There is no build step and no
backend: it is static files on GitHub Pages.

The site is a **hub** (the landing page) plus **one folder per trip**. You set up
your family and home once, then add a folder for each trip.

## 1. Your family and home, once: `config.json`

`config.json` at the repo root is the one file you set up for yourself. Every
trip inherits from it, so you never retype the same people or your home address.

```jsonc
{
  "site": { "title": "Are We There Yet?", "tagline": "Pick a trip." },

  "family": {
    "rank": "The Hankos",              // optional label shown on the Info tab
    "members": [                        // the people who travel with you
      { "name": "Kilian", "emoji": "🎂" },
      { "name": "Mom" },
      { "name": "Dad" },
      { "name": "Grandma" },
      { "name": "Grandpa" }
    ]
  },

  "home": { "name": "Colgate, WI", "lat": 43.215, "lng": -88.246 },

  "trips": [ /* one line per trip, see step 2 */ ]
}
```

- **`family.members`** show up as tappable chips on each trip so you can filter
  the schedule to one person's wants. A bare `{ "name": "Sam" }` is enough; add a
  `color` or `emoji` if you like. Colors are picked automatically otherwise.
- **`home`** becomes a map pin any trip can point at with `"place": "home"` (for
  the "leave the house" and "drive home" stops), without repeating the address.
- A trip that lists its **own** `team.members` or a `home` place uses those
  instead, so you can override per trip.

## 2. Add a trip

From the repo root:

```
./new-trip.sh <slug> "Trip Title"      # e.g. ./new-trip.sh yellowstone "Yellowstone 2026"
```

That makes a `<slug>/` folder with a complete copy of the app (`index.html`,
`sw.js`, `assets/`) plus a starter `event.json` and `manifest.json`. The
`sw.js` needs no edits: it figures out its own offline cache name from the
folder.

Then add one line to the `trips` array in `config.json` so the hub lists it:

```jsonc
{ "slug": "yellowstone", "title": "Yellowstone 2026", "subtitle": "5 days in the park",
  "dates": "Aug 3 to 7, 2026", "emoji": "🦬", "primary": "#3f7d4f" }
```

## 3. Fill in the trip: `<slug>/event.json`

This is the actual itinerary: the dates, the schedule, the map pins, packing,
reservations, trip goals. Full field reference in [SPEC.md](SPEC.md). You do
**not** repeat the family or home here, they come from `config.json`.

Two ways to fill it:

- **By hand**, following [SPEC.md](SPEC.md).
- **From photos**, the easy way: hand Claude (or any capable AI) photos of a
  paper schedule, a map, or an itinerary and it writes the `event.json` for you.
  See [NEW-EVENT.md](NEW-EVENT.md) for the exact prompt.

Also set the `name` and `theme_color` in `<slug>/manifest.json` so the trip
installs to the home screen with its own name and color.

## 4. Ship it

Commit and push. GitHub Pages (from `main`, folder `/ (root)`) serves the hub at
your site root and each trip at `/<slug>/`. Pages is HTTPS, so GPS, reminders,
and installing to the home screen all work with no backend.

When you change the **app** (any trip's `index.html`), copy it to the other trip
folders so they stay identical and bump the shared `CACHE` version in `sw.js`
(the `PREFIX + 'vN'` line). When you only change a trip's **`event.json`**, no
version bump is needed; the app always fetches a fresh copy when online.

## The whole flow, in one breath

```
edit config.json (you, once)  ->  ./new-trip.sh <slug>  ->  fill <slug>/event.json
    ->  add the trip to config.json  ->  commit + push  ->  live at /<slug>/
```
