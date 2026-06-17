# Operation Callahan: Family Trip App

A single-page, static family trip app for a Cedar Point birthday run.
Deploys to GitHub Pages (HTTPS, so the browser Geolocation API works with no backend).

## The trip
- **Who:** Michael's parents drive his wife and son Kilian (turns 8 on Fri 6/19) to Cedar Point.
- **From:** Colgate, WI 53033 → Sandusky / Bayshore KOA (Deluxe Cabin).
- **Depart:** Thu 6/18, ~1pm Central. Arrive KOA ~8pm Eastern (Sandusky is ET, +1 hr).
- **Park day:** Fri 6/19 (birthday). **Drive home:** Sat 6/20 morning.
- **Kilian is 51 inches:** clears the entire 48-inch coaster tier, one inch short of the 52-inch club.

## Stack
- Plain static HTML/CSS/JS. Leaflet 1.9.4 + OpenStreetMap tiles (no API key).
- No build step. Open `index.html` or serve statically.
- Synthwave aesthetic (pink/cyan/purple on dark). Variables defined in `index.html` `:root`.

## Files
- `index.html`: the app shell + all tabs + travel map + countdown + packing. Orchestrator owns this.
- `assets/park.js`: in-park Cedar Point map module. Renders into `<section id="park">`, defines `window.onParkTabShown()`. Agent A owns this.
- `operation-callahan.html`: deluxe printable packing/briefing sheet.
- `README.md`: what it is + GitHub Pages deploy steps. Agent B owns this.
- `.nojekyll`: disable Jekyll on Pages.

## Hard style rules (from the workspace CLAUDE.md)
- **No em dashes anywhere.** Use periods, commas, or "and".
- Keep the synthwave look consistent with existing tabs (reuse `.card`, `.btn`, `.stat`, `.prog`, `.tag`).
- Concrete, skimmable copy.

## Contract for assets/park.js (Agent A)
- Render all park UI into `document.getElementById('park')`.
- Create its OWN Leaflet map instance (do not reuse the travel map's `map` var). Center on Cedar Point ~[41.478, -82.683], zoom ~16.
- Define `window.onParkTabShown = function(){ ... }` that initializes the map lazily on first open and calls `invalidateSize()` each time (Leaflet needs this when its container was hidden).
- Provide a "Find me in the park" button using `navigator.geolocation.watchPosition`, drop/update a "you" marker, and show distance to a chosen pin.
- Pin a curated set of family-relevant spots with the 51-inch rides highlighted (see park.js spec in the dispatch).
- Must not touch `index.html` or any other file.
