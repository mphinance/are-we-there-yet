# Daykit

A drop-in, day-of-event pocket app. Point Claude at a photo of a paper
schedule and a map, and it fills in one `event.json`. The app renders that
into an installable PWA with a live schedule, a campus map, and find-me GPS.
It runs fully offline once installed, so it works in a field with no signal.

This started as a fork of Operation Callahan (a one-off Cedar Point trip app)
and was generalized so any single day can be dropped in.

## The idea

The app code never changes. A single `event.json` describes the whole day:
title, date, team, location with GPS, the schedule, and every place on the
map. Swap that one file and you have a different day.

The hard part, turning a photographed paper schedule and a paper map into
clean structured data with real GPS coordinates, is done by Claude (or any
capable AI). See [NEW-DAY.md](NEW-DAY.md) for the exact workflow and prompt.

```
  📷 photos of schedule + map  ->  🤖 Claude OCR + geocode  ->  event.json  ->  📱 installable PWA
```

## The bundled example: Summer Blast West, Bear day

The `event.json` in this repo is a real, built-from-photos example: the
**Bear (Popsicle Pirates)** track at **PAC Summer Blast Adventure WEST**,
St. John's Northwestern Academy, Delafield WI. Registration at 8:00,
Pathfinders, Archery, lunch and Touch a Truck, BB Guns, Bottle Rockets, and
Super Splash to close, then flags at 4:00.

## What the app does

Three tabs, no backend, no build step.

- **Schedule** - A live "right now / up next" banner with a countdown to the
  next transition, plus the full day as a timeline. On the event day, the
  current block is highlighted and finished blocks are dimmed. Every block
  links straight to its spot on the map.
- **Map** - A Leaflet map of the venue with a colored pin for every activity
  and service (first aid, restrooms, lunch, parking). "Find me" drops your
  live GPS position and tells you the nearest station and how far it is.
- **Info** - Location with an "Open in Maps" link, team notes, a "bring"
  checklist that saves to the phone, and good-to-know reminders.

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

## Deploy to GitHub Pages

Pages is HTTPS, so GPS and installability both work with no backend.

1. Push this branch.
2. In the repo, go to **Settings > Pages > Build and deployment**.
3. Set **Source** to "Deploy from a branch", pick the branch, folder
   `/ (root)`, and **Save**.
4. Wait about a minute. The live URL is `https://<user>.github.io/<repo>/`.

The `.nojekyll` file disables Jekyll so the `assets/` folder serves. Keep it.

## Make it your own day

1. Read [NEW-DAY.md](NEW-DAY.md).
2. Take clear photos of the schedule and the map.
3. Hand them to Claude with the prompt in that file. You get a fresh
   `event.json`.
4. Drop the new `event.json` in, bump `CACHE` in `sw.js`, and update the
   `name` in `manifest.json`. Redeploy.

## Files

| File | What it is |
|------|------------|
| `index.html` | The entire app: shell, three tabs, map, live clock, PWA wiring. Data-driven, never needs editing per event. |
| `event.json` | The one file that describes a day. Swap this to change events. |
| `manifest.json` | PWA metadata (name, icons, colors). |
| `sw.js` | Service worker. Caches the shell and `event.json` for offline use. |
| `gen-icons.js` | Regenerates the app icons via Playwright. |
| `NEW-DAY.md` | How to turn photos into a new `event.json` with Claude. |
| `SPEC.md` | The `event.json` schema, field by field. |
| `.nojekyll` | Lets GitHub Pages serve the `assets/` folder. |

## Credits

- Map tiles (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- Map rendering by [Leaflet](https://leafletjs.com/) 1.9.4
