# Make a new day from photos

Daykit's whole point: you should never hand-write `event.json`. You take a
couple of photos and let Claude turn them into structured data with real GPS
coordinates. Here is the workflow.

## 1. Take the photos

You need two or three shots. Clearer is better, but Claude tolerates glare,
angles, and a thumb in the corner.

- **The schedule.** The paper grid of times and activities. If there are
  multiple team columns (like Tiger/Wolf vs Bear), get the whole thing so the
  right column can be picked out.
- **The map.** The event's paper map or flyer showing where each activity is.
- **A location fix (optional but ideal).** A screenshot of the venue in Google
  Maps, or just tell Claude the venue name and town. That is how the pins get
  real latitude and longitude instead of guesses.

## 2. Hand them to Claude with this prompt

> Here are photos of an event: a schedule grid, a map of the venue, and its
> location. Build me a Daykit `event.json` following the schema in `SPEC.md`.
>
> - I am on the **____** team / track, so use that column of the schedule.
> - The event is on **____ (date)** at **____ (venue, town)**.
> - Geocode the venue to real `lat`/`lng`, and place each activity pin at its
>   approximate real-world position based on the map and the venue's aerial
>   layout. Approximate is fine; the "find me" GPS does the precise work.
> - Include first aid, restrooms, lunch, and parking as `service` places if
>   they are on the map.
> - Add a sensible `bring` checklist and any end-of-day notes you can read off
>   the sheet.
>
> Output only the `event.json`.

## 3. Drop it in and ship

1. Replace `event.json` with the new one.
2. Bump the `CACHE` version string in `sw.js` (e.g. `daykit-v1` -> `daykit-v2`)
   so installed phones pull the fresh data instead of the cached old day.
3. Update `name` / `short_name` / `description` in `manifest.json`.
4. Optionally re-theme by editing the `theme` block in `event.json`, and
   regenerate icons with `node gen-icons.js` if you want a new look.
5. Commit and redeploy. Everyone re-opens the page and installs the new day.

## Notes on accuracy

- **Times** are the one thing to double-check by eye. Claude reads them well,
  but a smudged `1:05` vs `1:55` matters when you are running between stations.
- **Pin positions** are approximate on purpose. The map is a guide; the live
  GPS "find me" is what actually tells you where you are and what is nearest.
- **One track per file.** If your family has kids on two different tracks,
  make two `event.json` files (and two deploys, or a small switcher). Keeping
  each day to one clean column is what makes it glanceable.
