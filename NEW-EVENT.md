# Make a new day or trip from photos

The whole point: you should never hand-write `event.json`. You take a
couple of photos and let Claude turn them into structured data with real GPS
coordinates. This works for a single day (a camp, a conference) or a whole
trip (a vacation, a road trip).

## 1. Gather the inputs

Clearer is better, but Claude tolerates glare, angles, and a thumb in the
corner.

- **The schedule or itinerary.** The paper grid, printout, or even a
  screenshot of an email. For a multi-day trip, one photo per day is fine, or
  a single itinerary that lists all days.
- **A map (optional).** The event's paper map or flyer showing where things
  are. For a vacation you usually do not have one, and that is fine, Claude
  geocodes the place names instead.
- **A location fix.** A screenshot of the venue in a map app, or just the
  venue name and town. That is how the pins get real latitude and longitude.

## 2. Hand them to Claude

### Single day

> Here are photos of an event: a schedule grid, a map of the venue, and its
> location. Build me a Are We There Yet? `event.json` following the schema in `SPEC.md`.
>
> - I am on the **____** team / track, so use that column of the schedule.
> - The event is on **____ (date)** at **____ (venue, town)**.
> - Geocode the venue to real `lat`/`lng`, and place each activity pin at its
>   approximate real-world position. Approximate is fine; the find-me GPS does
>   the precise work.
> - Include first aid, restrooms, lunch, and parking as `service` places if
>   they are on the map.
> - Add a sensible `bring` checklist and a `closingNote`.
> - Add a `lists` array with a `must` list (the whole point of the day) and a
>   `stretch` list (bonus things to do if there is time).
>
> Output only the `event.json`.

### Multi-day trip or vacation

> Here is my itinerary for a **____-day trip** to **____**, on
> **____ (start date) through ____ (end date)**. Build me a Daykit
> `event.json` with a `days[]` array following the schema in `SPEC.md`.
>
> - One entry in `days[]` per date, each with a short `title` and its
>   `schedule`.
> - Put hotels/cabins as `lodging` places, restaurants as `food`, landmarks
>   and parks as `sight`, beaches/pools as `water`. Geocode each to real
>   `lat`/`lng`.
> - Reference places from schedule items by `id` so each stop links to the
>   map and gets walking directions.
> - Pick a `theme` that fits the trip, add a `bring` packing list, and a few
>   `notes`.
> - Add a `lists` array with a `must` list (the reasons for the trip) and a
>   `stretch` list (would-be-awesome extras if time allows).
>
> Output only the `event.json`.

See [`samples/vacation.json`](samples/vacation.json) for what the multi-day
output looks like.

## 3. Drop it in and ship

1. Replace `event.json` with the new one.
2. Bump the `CACHE` version string in `sw.js` (e.g. `daykit-v6` ->
   `daykit-v7`) so installed phones pull the fresh data.
3. Update `name` / `short_name` / `description` in `manifest.json`.
4. Optionally regenerate icons with `node gen-icons.js` for a new look.
5. Commit and redeploy. Everyone re-opens the page and installs the new one.

## Notes on accuracy

- **Times** are the one thing to double-check by eye. A smudged `1:05` vs
  `1:55` matters when you are running between stations.
- **Pin positions** are approximate on purpose. The map is a guide; the live
  GPS find-me is what tells you where you are and what is nearest.
- **One track per file.** If two people are on different tracks or the trip
  splits up, make two `event.json` files (and two deploys, or a switcher).
  Keeping each to one clean plan is what makes it glanceable.
