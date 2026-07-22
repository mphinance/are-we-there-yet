/* Per-trip service worker. IDENTICAL in every trip folder: it derives its cache
   name from its own folder, so you copy it in and never edit it. Scope is this
   trip's folder, so it caches this trip's shell plus the shared ../config.json.
   The activate cleanup is prefix-scoped, so sibling trips at other paths keep
   their own offline caches (caches.keys() is per-origin). */

var SLUG = (self.location.pathname.match(/\/([^\/]+)\/sw\.js$/) || [])[1] || 'trip';
var PREFIX = 'awty-' + SLUG + '-';
var CACHE = PREFIX + 'v4';
var TILES = 'daykit-tiles';   // shared across trips; map tiles saved via "Save offline"

var CORE = [
  './',
  './index.html',
  './event.json',
  './manifest.json',
  '../config.json',            // shared family + home, filled in when the event omits them
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
    await Promise.allSettled(CORE.map(function (u) { return c.add(u); }));
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

  // event.json and the shared config.json: network first (fresh copy wins online),
  // fall back to cache offline.
  if (url.origin === self.location.origin && /(event|config)\.json$/.test(url.pathname)) {
    e.respondWith((async function () {
      try {
        var res = await fetch(req);
        var c = await caches.open(CACHE);
        c.put(req, res.clone());
        return res;
      } catch (err) {
        return (await caches.match(req)) || Response.error();
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
