/* Daykit service worker.
   Lives at the repo root so its scope covers the whole app on GitHub Pages.
   Caches the app shell plus event.json so the whole day still loads with no signal.
   Live GPS and map tiles still need a network, they just degrade gracefully. */

var CACHE = 'daykit-v3';

// Same-origin shell (relative to scope). These must all fetch for install to succeed.
var CORE = [
  './',
  './index.html',
  './event.json',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png'
];

// Cross-origin libs. Best-effort: if one fails to cache, install still succeeds.
var EXTRA = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    var c = await caches.open(CACHE);
    await c.addAll(CORE);
    await Promise.allSettled(EXTRA.map(function (u) { return c.add(u); }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Map tiles and live weather: network first, fall back to cache. Never block on them.
  if (/tile\.openstreetmap\.org$/.test(url.host) || /api\.open-meteo\.com$/.test(url.host)) {
    e.respondWith(fetch(req).then(function (res) {
      if (/api\.open-meteo\.com$/.test(url.host) && res && res.status === 200) {
        var clone = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, clone); });
      }
      return res;
    }).catch(function () { return caches.match(req); }));
    return;
  }

  // event.json: network first so a fresh copy wins when online, cache as offline fallback.
  if (url.origin === self.location.origin && /event\.json$/.test(url.pathname)) {
    e.respondWith((async function () {
      try {
        var res = await fetch(req);
        var c = await caches.open(CACHE);
        c.put('./event.json', res.clone());
        return res;
      } catch (err) {
        return (await caches.match('./event.json')) || Response.error();
      }
    })());
    return;
  }

  // Everything else: cache first, then network, then cache the response for next time.
  e.respondWith((async function () {
    var cached = await caches.match(req);
    if (cached) return cached;
    try {
      var res = await fetch(req);
      if (res && res.status === 200 && (url.origin === self.location.origin || EXTRA.indexOf(req.url) !== -1)) {
        var c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      if (req.mode === 'navigate') return caches.match('./index.html');
      throw err;
    }
  })());
});
