/* Per-trip service worker (Operation Callahan). Scope is this trip's folder, so it caches only
   this trip's shell and event.json. The cache name is trip-prefixed, and the
   activate cleanup only removes old versions of THIS prefix, so sibling trips at
   other paths keep their own offline caches (caches.keys() is per-origin). */

var PREFIX = 'awty-callahan-';
var CACHE = PREFIX + 'v1';
var TILES = 'daykit-tiles';   // shared across trips; map tiles saved via "Save offline"

var CORE = [
  './',
  './index.html',
  './event.json',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png'
];
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
    await Promise.all(keys.map(function (k) {
      return (k.indexOf(PREFIX) === 0 && k !== CACHE) ? caches.delete(k) : null;
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil((async function () {
    var list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) return list[i].focus(); }
    if (self.clients.openWindow) return self.clients.openWindow('./');
  })());
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

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
