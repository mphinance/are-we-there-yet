# Operation Callahan

A static family trip web app for a Cedar Point birthday run. Kilian turns 8 on 6/19. It's set in Sandusky, Ohio. Yes, that Sandusky. Tommy Boy was right about it.

## What it does

Seven tabs, no backend, no build step.

- **Now** -- Trip overview, day-by-day weather summary, countdown clock (CT and ET), and quick tips (lockers are card-only, Ziploc the phones before the water rides, etc.)
- **Live Map** -- Leaflet map of the full Colgate-to-Sandusky toll route with GPS tracking. Tap "Start tracking my location" and it plots your position live, shows miles remaining, estimated arrival in Eastern time, and trip progress percentage.
- **Park Map** -- In-park Cedar Point map (rendered by `assets/park.js`). Pins family-relevant spots and highlights the 48-inch coasters Kilian clears. "Find me in the park" button for live GPS inside the park.
- **Route and Tolls** -- The toll route breakdown (Chicago Skyway, Indiana Toll Road, Ohio Turnpike) vs. the free Michigan loop, with cost estimates and timing notes.
- **Eats** -- Road stops (Das Dutchman Essenhaus, Tony Packo's, Tin Goose Diner) and Sandusky picks (Toft's, Sandusky Bay Pancake House). All of these also drop as pins on the Live Map.
- **Park Plan** -- Ride height guide for Kilian's 51 inches, rope-drop strategy, and the Friday battle plan.
- **Pack** -- Interactive checklist (state saves to localStorage) for birthday gear, the park day bag, the KOA cabin, and car packing. Links to the full printable sheet.

## Run it locally

This is plain static HTML. No npm, no build.

**Quickest option -- just open the file:**

```
open index.html
```

That works fine for everything except GPS tracking. Browsers block the Geolocation API on plain `file://` URLs. For tracking, serve it over localhost instead.

**With Node:**

```
npx serve .
```

**With Python:**

```
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser. The Geolocation API works on `localhost` without HTTPS.

## Deploy to GitHub Pages

This app is meant to live at `https://mphinance.github.io/callahan/`. Pages is HTTPS, so the Geolocation API works there with no backend required.

1. Create the repo at github.com/mphinance/callahan (or confirm it already exists).
2. Push the `main` branch:
   ```
   git remote add origin https://github.com/mphinance/callahan.git
   git push -u origin main
   ```
3. In the GitHub repo, go to **Settings > Pages > Build and deployment**.
4. Set **Source** to "Deploy from a branch", choose branch `main`, folder `/ (root)`, and click **Save**.
5. Wait about 60 seconds. Your live URL is `https://mphinance.github.io/callahan/`.

The `.nojekyll` file in this repo disables Jekyll processing so the `assets/` folder serves correctly. Do not remove it.

## Convoy mode (optional)

By default the app tracks only your own phone, which works with zero setup.

To get both vehicles on the same live map:

1. Create a free [Firebase](https://console.firebase.google.com/) project and add a Realtime Database.
2. Copy the Firebase web config (an object with `apiKey`, `databaseURL`, `projectId`, etc.).
3. Paste it into the `FIREBASE_CONFIG` block near the bottom of `index.html` (the variable is already there, set to `null`).
4. Everyone opens the page with the same crew code in the URL, e.g. `https://mphinance.github.io/callahan/?crew=callahan`.

Each phone appears as a pin on the shared map. Without a config, solo mode is active and nothing changes.

## Files

| File | What it is |
|------|------------|
| `index.html` | App shell, all tabs, travel map, countdown, packing checklist |
| `assets/park.js` | In-park Cedar Point map module, renders into the Park Map tab |
| `operation-callahan.html` | Full printable packing and trip briefing sheet |
| `SPEC.md` | Trip facts, stack notes, and per-agent contracts |
| `.nojekyll` | Disables Jekyll so GitHub Pages serves the assets/ folder correctly |

## Credits

- Weather via [NWS Sandusky](https://www.weather.gov/)
- Map tiles (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- Map rendering by [Leaflet](https://leafletjs.com/) 1.9.4

## Screenshots

Best viewed live. Once deployed, open `https://mphinance.github.io/callahan/` on a phone and tap through the tabs.

To add screenshots to this README, drop PNGs into a `docs/` folder named `screenshot-now.png`, `screenshot-live-map.png`, and `screenshot-park-map.png`, then uncomment the image lines below.

<!--
![Now tab](docs/screenshot-now.png)
![Live Map tab](docs/screenshot-live-map.png)
![Park Map tab](docs/screenshot-park-map.png)
-->
