# Plan 5: Candidate pool and day-builder

The flagship, and the sum of plans 1 to 4. A pre-trip mode: instead of a fixed
schedule, start from a `candidates[]` list of everything you might do, each tagged
with duration, hours, who wants it, and whether it is booked. Assign them onto
days; the app checks each placement against drive time, opening hours, and
reservations, flagging conflicts as you build. This turns the app from "show me
the plan" into "help me build the plan", the guided interactive process the
origin Slack thread asked for.

Land it AFTER plans 1 to 4 so it composes their helpers rather than duplicating
them. Every conflict check feature-detects its upstream helper, so partial
delivery still works.

## Schema

New top-level optional `candidates[]`, sibling of `schedule`/`days`/`bookings`.
Absent means no Plan tab and the app is byte-for-byte unchanged.

```jsonc
"candidates": [
  {
    "id": "lighthouse",            // required stable slug; namespaces the draft, dedupes
    "title": "Eagle Bluff Lighthouse tour",
    "place": "lighthouse",         // optional; enables map link + drive-time
    "duration": 60,                // optional minutes; drive-fit + slot length
    "open": { "from": "10:00", "to": "16:00" },  // optional; SAME shape as plan 1
    "who": ["Mom","Ava"],          // optional; plan 2 members
    "priority": "must",            // optional; reuses LIST_TONES
    "booked": "todo",              // optional; booking status or a bookings[] id
    "url": "https://...",
    "fixedStart": "12:15",         // optional; present = anchored (plan 4), absent = flexible
    "note": "Sells out in summer."
  }
]
```

`normalizeCandidates(raw)` mirrors `normalizeBookings`: `[]` for non-array, bare
string becomes `{id:slug, title}`, default every field, drop entries with no
title, coerce unknown `priority` to `other`.

**Assignment storage is a localStorage draft only, never written to
`event.json`.** The app fetches the file read-only; writing back would break the
zero-backend contract. Draft key `daykit:<event.id>:plan`:

```
{ "assign": { "<candId>": "<yyyy-mm-dd>" | "unassigned" },
  "at":     { "<candId>": "HH:MM" } }
```

The fixed-schedule path is untouched. Stale ids (candidate removed in a newer
file) are pruned on load by intersecting with current candidate ids. A later
"Copy schedule JSON" button serializes the draft into `schedule[]`/`days[]` shape
for manual paste-back, the bridge from built plan to committed plan.

## UI surface: a conditional fifth "Plan" tab

Recommended over a mode toggle on Schedule. Schedule is the glanceable day-of
surface, and `renderNow`/`renderNudge`/the 1s clock loop all assume a fixed
`day.schedule`; bolting a builder onto it risks regressing the core experience. A
separate tab isolates the pre-trip builder. The tab is gated on data: only files
with `candidates[]` get five tabs, everything else stays at four (backward compat
at the UI level, not just the data level).

Wiring: add one `<button data-tab="plan">` (hidden by default, unhidden in
`boot()` when candidates exist) and one `<section id="tab-plan">`; `showTab()`
already switches panels generically, add a `plan` case that lazy-renders like
`kids`. `renderPlan()` groups candidates into an unassigned pool plus one card per
day, reusing the `renderSchedule` row structure and `placeById`.

## Interaction: tap-to-assign, not drag-and-drop

HTML5 drag does not fire from touch on most mobile browsers; making it work needs
Pointer Events plus manual hit-testing, exactly the framework-shaped complexity
this app avoids. Tap-to-assign is a few `addEventListener("click")` calls,
accessible, robust offline, and matches every other interaction in the file. Each
pool card has "Add to day" revealing an inline day picker; placed cards get
"Move" and "Remove". Handlers are delegated from the panel root and re-render the
whole panel (cheap for this size) via `assignCand(id, date)` writing the draft.
Pointer-events drag can be layered on later as pure enhancement.

## Conflict checks (reuse plans 1 to 4)

- **Opening hours (1):** reuse `itemWindows`/`inWindows` to flag a candidate whose
  slot falls outside its `open` window.
- **Drive time (3):** walk each day's ordered candidates and reuse `legEstimate`
  between consecutive placed candidates; render the same drive chip in a warning
  state when the gap is too short.
- **Reservations (shipped):** cross-reference `normalizeBookings`; a `todo`/
  `waitlist` candidate shows the `BOOK_STATUS` pill as a reminder.
- **Flex vs fixed (4):** `fixedStart` candidates are anchors; two overlapping
  anchors (compared via `zonedEpoch`) are a hard conflict.
- **Who (2):** reuse `whoChips`; optionally flag one person double-booked at
  overlapping times.

Each check returns `{level, msg}` rendered as an inline chip. If an upstream
helper is not present yet, that check is skipped (feature-detect), keeping the
slices independently shippable.

## Phased delivery (4 PR-sized slices)

1. **Read-only candidate pool.** `normalizeCandidates`, the gated Plan tab,
   `renderPlan()` read-only: cards grouped by `priority` with who-chips, place
   links, booking pills. Ships the schema, docs, samples, CACHE bump.
2. **Interactive assignment plus draft.** Tap-to-assign, day picker, per-day
   preview cards, the `daykit:<id>:plan` draft with stale-id pruning. This is the
   slice that turns "show" into "build".
3. **Live conflict checks.** Layer in the plan 1 to 4 reuse as warning chips, each
   feature-detected.
4. **Export and polish.** "Copy schedule JSON", optional pointer-events drag,
   auto-ordering suggestions.

## Edge cases and verify

No candidates: tab hidden, app identical. Single-day: one day card, still
assignable. Missing place: no map link, drive-fit skipped. No duration: slot math
skipped, still assignable. Stale draft ids: pruned on load. localStorage
disabled/full: try/catch, degrades to non-persistent. DST: comparisons via
`zonedEpoch`/`dayTz`. `esc()` every title, note, and name.

Verify offline with `executablePath: "/opt/pw-browsers/chromium"`: assert the tab
appears only with candidates, assign a candidate and confirm it moves pool to day
card, reload and confirm the draft persisted, and (after slice 3) assert an
over-packed day shows the drive-fit warning. The Plan tab needs no network or
geolocation.
