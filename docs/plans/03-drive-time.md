# Plan 3: Drive time and "can these share a day"

Solves the too-far-apart and too-close-together pain points. Compute a rough
straight-line distance between consecutive stops, apply a road-factor fudge and
an assumed speed for a good-enough drive-time estimate with no network, no
routing API. Show a "~40 min drive" chip between stops and flag when a day's stops
do not physically fit the hours between them.

## Reuse what exists

`haversine(la1,ln1,la2,ln2)` (returns meters, R=6371000) already exists at
~index.html:1117, with `fmtDist(m)` at ~:1123, used by the geolocation
nearest-place logic. No new distance math. Add only one pure leg estimator next
to `fmtDist` so the geo math stays together.

## Estimate model

```jsonc
"travel": { "roadFactor": 1.3, "mph": 45, "walkMph": 3, "walkUnderMi": 0.3 }
```

All optional, resolved day-first then event-level (mirrors the `location` /
`timezone` per-day override pattern). Defaults: `roadFactor 1.3` (roads run about
1.2 to 1.4x the straight line), `mph 45` (blends town and highway for regional
door-to-door), `walkMph 3`, and a `0.3 mi` walk/drive threshold so day-camp
stations tens of meters apart read "~2 min walk" while vacation legs read "~24 min
drive". This is a glanceable "~" estimate to catch "these cannot share a day", not
a turn-by-turn ETA, and it must run with no signal, so a coordinate-only model
beats a routing API that would not load.

```js
function legEstimate(a, b, day){
  if(!a||!b||a.lat==null||a.lng==null||b.lat==null||b.lng==null) return null;
  var crow=haversine(a.lat,a.lng,b.lat,b.lng);
  if(crow<25) return { mode:"same", min:0, road:0 };
  var c=travelCfg(day), road=crow*c.roadFactor;
  var walk=road<c.walkUnder, mps=(walk?c.walkMph:c.mph)*1609.34/3600;
  return { mode:walk?"walk":"drive", min:Math.round(road/mps/60), road:road };
}
```

## Render hooks (all in `renderSchedule()`, ~:716)

Switch the loop to `forEach(function(item,i){...})`. After `ol.appendChild(li)`,
look ahead to `day.schedule[i+1]`, resolve both places via `placeById`, and when
`legEstimate` returns a non-"same" leg, append a connector `<li class="leg">`
with a chip like "~24 min drive - 28 km". Compute the free gap as `nxt.start`
minus `item.end` via `zonedEpoch`/`dayTz` (timezone-correct, same functions the
status coloring uses); when travel exceeds the gap, add a `.tight` "does not fit
(only 15 min)" state. Accumulate tight legs into a `warnings` array and render a
"Timing check" card above `dayNotes` when non-empty.

Worked fixture: `samples/vacation.json` day 3, "Pack and check out" ends 10:00 at
`inn`, "Cave Point cliffs" starts 10:15 at `cavepoint` (~24 min drive vs a 15 min
gap). Fires both the inline tight chip and a day-banner line.

## CSS (near `.sesspill`, ~:183)

`ol.sched li.leg` single-column row indented under the time column,
`.legchip` muted pill, `.legchip.walk` water-blue, `.legchip.bad` white-on-accent,
`.legwarn` accent warning text, `.daywarn h2` accent heading. Mirrors the
`.bkby` pill idiom.

## Edge cases

Missing coordinates or a null place (day-camp transition item, "Drive home" with
no place): `legEstimate` returns null, no chip. Same place (~0 distance,
Archery Teach to Archery Shoot): `mode:"same"`, suppressed. No gap or overlap:
`.tight` with "(overlaps)". Legs are within one day only, so no cross-day leg and
none after the last stop. Absent `travel`: defaults fill in.

## Verify offline

The math needs no network (only tiles and weather do). Serve, then in Playwright
`page.route('**', r => r.request().url().includes('localhost') ? r.continue() :
r.abort())` to prove offline, and assert `#schedList .legchip` text and
`.daywarn li` lines. Expect walk chips on the day-camp file, drive chips on the
vacation file, and a `.legchip.bad` plus a `.daywarn` line on the inn to Cave
Point 15-minute gap. A pure-math check can `page.evaluate` `legEstimate` on two
literal coordinate objects.
