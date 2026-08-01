---
name: trip-post
description: Post a dispatch (a few lines and some photos) from a trip to its journal, so followers see it on the public GitHub Pages link. Use when the user shares trip photos or notes from the road and wants them published, or says "post this", "add to the journal", "write up today", "put this on the trip page".
---

# Post a dispatch from the trip

Turn what the user just sent (photos, a voice-note transcript, a few scrappy
lines) into a dated post in `<trip>/journal.json`, resize the photos, commit, and
push. GitHub Pages redeploys in a minute or two and everyone following the link
sees it.

The user is on a phone, probably on ship or rural wifi, probably tired. **Do the
whole thing in one pass and report the live URL.** Do not ask which trip, which
day, or what to title it unless it is genuinely ambiguous. Infer, state what you
inferred, and let them correct you.

## What you are writing into

`<trip>/journal.json`, alongside that trip's `event.json`:

```json
{
  "posts": [
    {
      "date": "2026-08-10",
      "time": "18:20",
      "title": "Kirkjufell in the rain",
      "place": "kirkjufell",
      "body": ["First paragraph.", "Second paragraph."],
      "photos": [
        { "src": "photos/kirkjufell-morning.jpg", "caption": "What this is." }
      ]
    }
  ]
}
```

- `date` (required) is the itinerary day the post belongs to, `YYYY-MM-DD`. The
  app files the post under that day, so it must match a day in `event.json`.
- `time`, `title`, `place`, `body`, `photos` are all optional.
- `body` is an array of paragraphs, plain text, no markdown.
- `place` is a place `id` from that trip's `event.json` `places[]`. It renders a
  tappable chip that jumps to the map pin. Only use an id that exists.
- `photos[].src` is relative to the trip folder.

Posts may be in any order in the file; the app sorts by date then time.

## Steps

1. **Pick the trip and the day.** Trip folders live at the repo root, listed in
   `config.json`. If only one trip is currently running, use it. Match the date
   against `<trip>/event.json` days: default to the day it is *now* in the trip's
   timezone, but if the user says "yesterday" or the photos are clearly from an
   earlier stop, use that day instead. Say which day you filed it under.

2. **Save the photos to disk.** Images the user attaches to the session need to
   exist as files before you can resize them. Write them out to the scratchpad
   first, then resize. Skip to step 4 if there are no photos.

3. **Resize.** Never commit a raw phone photo.

   ```
   PWEXEC=/opt/pw-browsers/chromium node gen-photos.js <trip> <image>...
   ```

   Writes `<trip>/photos/<slug>.jpg` at 1600px long edge, strips EXIF (so no GPS
   or camera serial goes public), and prints the `src` values to paste in. If it
   rejects a HEIC, tell the user their iPhone is set to High Efficiency and ask
   them to re-send, or set Camera > Formats > Most Compatible.

   Rename the slugs to something meaningful (`img-4821.jpg` becomes
   `kirkjufell-morning.jpg`) before writing them into the post.

4. **Write the post.** Append to the `posts` array. Keep the user's voice: if
   they sent three scrappy lines, the post is three scrappy lines cleaned up, not
   a travel-magazine paragraph. If they sent only photos and no words, write one
   plain factual sentence per photo from what you can actually see, and say you
   guessed so they can fix it.

   Write a `caption` for every photo. Captions are what a follower reads, and
   they double as the `alt` text.

5. **Validate before committing.** A malformed `journal.json` shows no posts.

   ```
   node -e "JSON.parse(require('fs').readFileSync('<trip>/journal.json'))"
   ```

6. **Commit and push** to the branch this session is assigned to, then confirm
   the PR exists (create it if not). Report the live URL:
   `https://<user>.github.io/are-we-there-yet/<trip>/`

## Rules

- **No em dashes**, anywhere, including inside JSON strings. Repo-wide style
  rule. Use periods, commas, or "and".
- **This repo is public.** Everything you write and every photo you commit is
  world-readable and permanent in git history. Keep out: reservation numbers,
  record locators, e-tickets, phone numbers, home or hotel addresses, license
  plates, boarding passes, and legal names beyond the first names already in
  `config.json`. If a photo has a document, screen, or luggage tag in it, say so
  and ask before committing it.
- **Never copy anything from the private planning repo** into a post.
- **Do not bump the `sw.js` cache version** for a post. `journal.json` and photos
  are served network-first and cache-on-view, so posts go live without it. Only
  bump when `index.html` itself changes.
- **Do not touch `event.json`.** The itinerary is the plan; the journal is what
  happened. If the user wants the plan changed, that is a separate edit.
- If the wifi drops mid-push, retry the push. The commit is already safe locally.
