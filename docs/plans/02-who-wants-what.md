# Plan 2: Who wants what

Solves the traveling-with-others pain point: different people want different
things. Schedule items, trip goals, bookings, and candidates carry a `who` list
drawn from an expanded `team.members[]`. The app renders initial chips and adds a
filter ("show just Dad's must-dos", "what does everyone agree on") so the group
sees where wants overlap and where they will split up.

## Schema

Expand the existing `team` object with an optional `members[]`, and let a `who`
attach in several places, each degrading array to string to absent.

```jsonc
"team": {
  "rank": "The Hankos", "emoji": "🚗",
  "members": [
    { "name": "Dad", "color": "#1d9bd1", "initials": "D", "emoji": "🧔" },
    { "name": "Mom", "color": "#e4562b" },   // initials derived
    { "name": "Ivy" },                        // color derived from name hash, offline
    "Theo"                                     // bare string -> { name: "Theo" }
  ]
}

// schedule item / booking / candidate
{ "title": "Super Splash", "who": ["Dad","Ivy"] }   // "Dad" or "Everyone" also accepted

// trip-goal list: list-level default plus per-item override
{ "tone": "must", "who": ["Dad","Mom"], "items": [
  "Ride the coaster",                                // inherits list-level who
  { "text": "Earn the patch", "who": ["Ivy"] }       // object override
] }
```

Every member field except `name` is optional. `bookings[].who` already exists as
free text; upgrade it to chips only when every token resolves to a known member,
else keep the plain text (preserves the current "If we get the time" sample).

## Helpers (near `LIST_TONES`, ~index.html:413)

`personHue(name)`/`personColor(name)` derive a stable offline HSL color from a
name hash. `deriveInitials(name)` handles "Mary Beth" to "MB". `normalizeMembers`
builds `MEMBERS` plus a `memberBy` name map in `boot()` beside `placeById`.
`normalizeWho(who)` resolves `["Dad"]`, `"Dad"`, `"Everyone"` (expands to all
members), or absent into chip descriptors, marking unknown names `unknown:true`.
`whoChips(who)` renders the chip row. `matchesWho(who)` implements the filter
with an `any` mode ("just Dad's", intersection non-empty) and an `all` mode
("everyone agrees", selected names are a subset of the item's who).

## Render hooks

- **Schedule chips** in `renderSchedule()` `.what` span; wrap each item in
  `matchesWho(item.who)` and show a "No wants match this filter" row when zero
  survive.
- **Filter control**: a `renderWhoFilter(scope)` populating a `#whoFilter`
  container above the schedule and trip-goals cards; render nothing when
  `MEMBERS.length < 2`. Filter state is an in-memory `whoFilter = {names:[],
  mode:"any"}`, shared across the Schedule and Info tabs. Optionally persist to
  `daykit:<id>:whofilter` for stickiness across reloads.
- **Goal chips** in `renderInfo()` lists loop: items are now string-or-object,
  resolve `text` and the effective `who`.
- **Booking chips**: replace the plain `who` text push with `whoChips` when it
  resolves, else keep `esc(bk.who)`.
- **Candidates card** (shared with plan 5): a new block built like the bookings
  card.

## CSS (after `.sesspill`, ~:183)

`.whorow` inline chip row, `.whochip` small rounded initial/emoji chip colored per
person, `.whochip.unknown` dashed outline, `.whofilter` toggle row with
`.whochip.active` highlighted and a `.wfbtn` clear control.

## Edge cases

No team or members: filter hidden, `who` degrades to hashed-color chips. Unknown
name: `unknown` chip, still filterable. "Everyone": expands to all, always
matches `all` mode; consider a single "ALL" chip when the set equals `MEMBERS`.
Zero filter matches: friendly empty state, never a blank tab. Item with no `who`
while filtering: correctly hidden (nobody claimed it).

## Verify offline

Schedule and Info render offline. Assert `#whoFilter .whochip` count equals
member count, schedule rows show `.whochip`, clicking a member chip filters to
matching rows, "everyone agrees" narrows to shared items, "clear" restores. Load
unmodified `samples/vacation.json` (no members) to confirm the filter is absent
and nothing throws.
