# Daykit

A drop-in pocket app for a single day or a whole trip. Point Claude at
photos of a paper schedule, an event map, or a printed itinerary, and it
fills in one `event.json`. The app renders that into an installable PWA with
a live schedule, a map, find-me GPS, and an offline itinerary. It runs fully
offline once installed, so it works in a field or a national park with no
signal.

This started as a fork of Operation Callahan (a one-off Cedar Point trip app)
and was generalized so anything from a one-day camp to a week-long vacation
can be dropped in.

## The idea

The app code never changes. A single `event.json` describes the whole thing:
title, dates, location with GPS, the schedule (one day or many), and every
place on the map. Swap that one file and you have a different event.

The hard part, turning a photographed schedule, map, or itinerary into clean
structured data with real GPS coordinates, is done by Claude (or any capable
AI). See [NEW-EVENT.md](NEW-EVENT.md) for the exact workflow and prompt.

```
  📷 photos of schedule / map / itinerary  ->  🤖 Claude OCR + geocode  ->  event.json  ->  📱 installable PWA
```

## One day or many

- **Single day** (a camp, a conference, a wedding): one date, one schedule.
  This is the bundled `event.json`, the Bear (Popsicle Pirates) track at PAC
  Summer Blast Adventure WEST, St. John's Northwestern Academy, Delafield WI.
- **Multi-day** (a vacation, a road trip, a festival weekend): a `days[]`
  array, each with its own date, schedule, and places. A day switcher appears
  at the top, the header shows "Day 2 of 5" or a countdown to the trip, and
  the map filters to the selected day's stops. See
  [`samples/vacation.json`](samples/vacation.json) for a 3-day Door County
  example.

Single-day files need no `days[]` at all. The app treats a flat top-level
`schedule` as a one-day trip, so old files keep working.

## What the app does

Three tabs, no backend, no build step.

- **Schedule** - A live "right now / up next" banner with a countdown to the
  next thing, plus the day as a timeline. On the event day, the current block
  is highlighted and finished blocks are dimmed. A pulsing "up in 5 minutes"
  nudge tells you when to start walking. Every block links to its spot on the
  map, with one-tap walking directions to your next stop. On trips, a day
  switcher scrolls across the top.
- **Map** - A Leaflet map with a colored pin for every stop (activities,
  food, lodging, services). "Find me" drops your live GPS and names the
  nearest stop. "Mark my car" saves where you parked. On trips, the map shows
  the selected day's stops with a "Show all" toggle.
- **Info** - Location and Open-in-Maps, where you're staying, a packing
  checklist that saves to the phone, live weather, and good-to-know notes.

The whole thing installs to the home screen and works offline.

## Run it locally

Plain static HTML. No npm needed to run it.

```
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000`. Geolocation works on `localhost` and on
HTTPS (like GitHub Pages), but browsers block it on plain `file://` URLs, so
serve it rather than double-clicking the file if you want GPS.

To preview the multi-day sample, copy it over the live file first:
`cp samples/vacation.json event.json` (then restore with git when done).

## Deploy to GitHub Pages

Pages is HTTPS, so GPS and installability both work with no backend.

1. Push to `main`.
2. In the repo, go to **Settings > Pages > Build and deployment**.
3. Set **Source** to "Deploy from a branch", pick `main`, folder `/ (root)`,
   and **Save**.
4. Wait about a minute. The live URL is `https://<user>.github.io/<repo>/`.

The `.nojekyll` file disables Jekyll so the `assets/` folder serves. Keep it.

## Make it your own day or trip

1. Read [NEW-EVENT.md](NEW-EVENT.md).
2. Photograph the schedule, map, or itinerary.
3. Hand the photos to Claude with the prompt in that file. You get a fresh
   `event.json` (single-day or multi-day).
4. Drop it in, bump `CACHE` in `sw.js`, update `name` in `manifest.json`,
   and redeploy.

## Files

| File | What it is |
|------|------------|
| `index.html` | The entire app: shell, three tabs, map, live clock, day switcher, PWA wiring. Data-driven, never needs editing per event. |
| `event.json` | The one file that describes a day or a trip. Swap this to change events. |
| `samples/vacation.json` | A 3-day multi-day trip example. |
| `manifest.json` | PWA metadata (name, icons, colors). |
| `sw.js` | Service worker. Caches the shell and `event.json` for offline use. |
| `gen-icons.js` | Regenerates the app icons via Playwright. |
| `NEW-EVENT.md` | How to turn photos into a new `event.json` with Claude. |
| `SPEC.md` | The `event.json` schema, field by field. |
| `.nojekyll` | Lets GitHub Pages serve the `assets/` folder. |

## Credits

- Weather via [Open-Meteo](https://open-meteo.com/) (no API key)
- Map tiles (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- Map rendering by [Leaflet](https://leafletjs.com/) 1.9.4
