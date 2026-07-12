# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repo.

## What this is

"Are We There Yet?" is a single-file, zero-backend PWA for one day or a whole
trip. All app logic lives in one `index.html`; everything specific to a given
event lives in one `event.json`. Swap that file and you have a different event.
The app runs fully offline once installed (service worker + cached tiles), so it
works in a field or national park with no signal.

Origin: a fork of a one-off Cedar Point trip app ("Operation Callahan"),
generalized into a reusable day/trip kit.

## Site layout (multi-trip)

The deployed site is a **hub plus one folder per trip**:

- **`/index.html`** is the hub: a small landing page that reads **`/trips.json`**
  and renders a card linking to each trip folder. It is NOT the app.
- **`/<trip>/`** (e.g. `zion/`, `callahan/`) each hold a **complete, self-
  contained copy of the app**: `index.html`, that trip's `event.json`,
  `manifest.json`, `sw.js`, and `assets/`. Each is independently installable and
  offline-capable, and all its paths are relative so the folder just works.
- The **canonical app source is `zion/index.html`.** To change app behavior,
  edit it and copy it to the other trip folders (`cp zion/index.html
  callahan/index.html`). The single-file app is the same in every trip folder;
  only the `event.json`, `manifest.json` name/theme, and `sw.js` cache prefix
  differ.

**To add a trip:** make a folder, copy the app files in
(`cp zion/{index.html,sw.js} newtrip/` and `cp -r zion/assets newtrip/`), write
its `event.json`, give `manifest.json` a name/theme and `sw.js` a unique
`PREFIX` (e.g. `awty-newtrip-`), and add an entry to `/trips.json`.

## Architecture (the app)

- **`<trip>/index.html`** is the entire app: HTML shell, all CSS in one
  `<style>`, and all JS in one `<script>`. No framework, no build step, no
  bundler. Plain ES5-flavored JS (`var`, `function`, no modules). It fetches
  `event.json` (relative, so its own folder's) at load, normalizes single-day
  and multi-day shapes into one internal form, and renders four tabs: Schedule,
  Map, Kids, Info.
- **`<trip>/event.json`** is the only file you edit per event. Full schema in
  `SPEC.md`. Never hardcode event specifics into `index.html`; add a field and
  drive it from data instead.
- **`<trip>/sw.js`** is the service worker. It caches the shell, `event.json`,
  and any map tiles the user saves offline. Each trip's cache name is
  **prefixed** (`awty-<trip>-vN`) and its activate cleanup only deletes its own
  prefix, so sibling trips keep their offline caches (`caches.keys()` is
  per-origin). **Bump that trip's `CACHE` version whenever you change its
  `index.html`, `event.json`, or other cached assets**, or installed clients
  keep serving the old version. The root `sw.js` (prefix `awty-hub-`) caches the
  hub and `trips.json`.
- **`manifest.json`** is PWA metadata. **`gen-icons.js`** regenerates icons and
  **`screenshots.js`** regenerates the `docs/` showcase images, both via
  Playwright.
- **`samples/vacation.json`** is a 3-day multi-day example kept in sync with the
  schema. **`NEW-EVENT.md`** is the human/Claude workflow for turning photos of
  a schedule or map into a new `event.json`. **`SPEC.md`** is the field-by-field
  schema reference.

Third-party runtime deps are loaded from CDNs at runtime (Leaflet 1.9.4 +
OpenStreetMap tiles for the map, Open-Meteo for weather, no API keys). The only
npm dependency is Playwright, used solely for icon and screenshot generation.

## Conventions

- **No em dashes anywhere** (code, comments, JSON strings, docs). Use periods,
  commas, or "and". This is a hard style rule inherited from the workspace.
- Match the surrounding style in `index.html`: ES5 idioms, terse helpers,
  `esc()` all user/data-derived strings before putting them in HTML.
- Keep features **data-driven and backward compatible**. New `event.json`
  fields must be optional so existing files keep working, and the app should
  render nothing (not error) when a field is absent. See `normalizeLists()` and
  the `bring`/`lists`/`notes` blocks in `renderInfo()` for the pattern.
- Per-item UI state (checklists) persists to `localStorage` under a
  `daykit:<event.id>:<feature>` key namespace.

## Data model quick reference

`event.json` is single-day (top-level `date` + `schedule`) or multi-day
(`days[]`). Both normalize to the same internal shape. Key optional fields:
`title`, `subtitle`, `timezone` (IANA; schedule times are wall-clock in this
zone), `theme`, `location`, `team`, `places[]` (map pins, `kind` sets color),
`schedule[]` items (`start`/`end`/`title`/`place`), `bring[]` (packing
checklist), `lists[]` (trip-goal checklists: `must` and `stretch` tones),
`notes[]`, `closingNote`. See `SPEC.md` for the authoritative reference.

## Running and verifying

Serve the repo root statically (geolocation needs localhost or HTTPS, not
`file://`), then open a trip folder:

```
npx serve .            # or: python -m http.server 8000
# hub at /  ·  a trip at /zion/  ·  /callahan/
```

Note: some static servers rewrite `/<trip>/index.html` and drop the trailing
slash, which breaks the app's relative `event.json` fetch. Open the folder URL
`/<trip>/` (trailing slash) instead, which is what the hub links to and what
GitHub Pages serves.

To preview `samples/vacation.json`, copy it over a trip's event
(`cp samples/vacation.json zion/event.json`, restore with git afterward).

To verify a UI change, drive the app headless with Playwright and observe the
real rendered result rather than trusting the code alone. The bundled Chromium
lives at `/opt/pw-browsers/chromium`; pass it as `executablePath` (or set
`PWEXEC=/opt/pw-browsers/chromium` for `screenshots.js`). External resources
(OSM tiles, Open-Meteo) may be blocked in the sandbox, so the Map tab can render
blank here; the other tabs render fully offline.

Regenerate showcase images after a visible change:

```
PWEXEC=/opt/pw-browsers/chromium npm run shots   # writes docs/screenshot-*.png
```

The Map shot needs network for tiles; skip committing a blank one when offline.

## Deploy

GitHub Pages from `main`, folder `/ (root)`. `.nojekyll` must stay so `assets/`
serves. Pages is HTTPS, so GPS, reminders, and installability all work with no
backend.

## When you change things

1. Keep the app (`<trip>/index.html`) generic and data-driven.
2. Edit the canonical `zion/index.html`, then copy it to the other trip folders
   so they stay identical (`cp zion/index.html callahan/index.html`).
3. If you add an `event.json` field: document it in `SPEC.md`, add a sample to a
   trip's `event.json` and to `samples/vacation.json`, mention it in
   `README.md`, and add a prompt hint in `NEW-EVENT.md` so generated files
   include it.
4. Bump `CACHE` in each changed trip's `sw.js` (its `awty-<trip>-vN`).
5. Regenerate `docs/` screenshots if the change is visible.
