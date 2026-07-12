#!/usr/bin/env bash
# Scaffold a new trip folder from the canonical app (zion/).
#
#   ./new-trip.sh <slug> ["Trip Title"]
#
# Then: edit <slug>/event.json, set the name/theme in <slug>/manifest.json, and
# add a line for the trip to config.json. Family and home come from config.json,
# so you do not repeat them per trip. sw.js is copied as-is (it derives its own
# cache name from the folder), so you never edit it.
set -e

slug="$1"
title="${2:-New Trip}"
if [ -z "$slug" ]; then echo "usage: ./new-trip.sh <slug> [\"Trip Title\"]"; exit 1; fi
if [ -e "$slug" ]; then echo "error: $slug already exists"; exit 1; fi
if [ ! -d zion ]; then echo "error: run this from the repo root (zion/ not found)"; exit 1; fi

mkdir -p "$slug"
cp zion/index.html "$slug/index.html"
cp zion/sw.js      "$slug/sw.js"
cp -r zion/assets  "$slug/assets"

cat > "$slug/manifest.json" <<JSON
{
  "name": "$title",
  "short_name": "$title",
  "description": "$title",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#2f80c4",
  "icons": [
    { "src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "assets/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
JSON

cat > "$slug/event.json" <<JSON
{
  "id": "$slug",
  "title": "$title",
  "timezone": "America/Chicago",
  "location": { "name": "Somewhere", "lat": 0, "lng": 0, "zoom": 12 },
  "date": "2026-01-01",
  "places": [],
  "schedule": [
    { "start": "09:00", "end": "10:00", "title": "First thing" }
  ]
}
JSON

echo "Created $slug/."
echo "Next:"
echo "  1. Edit $slug/event.json (the schedule, places, bookings). Family and home come from config.json."
echo "  2. Set the name and theme_color in $slug/manifest.json."
echo "  3. Add this to the \"trips\" array in config.json:"
echo "     { \"slug\": \"$slug\", \"title\": \"$title\", \"subtitle\": \"...\", \"dates\": \"...\", \"emoji\": \"📍\", \"primary\": \"#2f80c4\" }"
