/* Hub service worker. Scope is the site root, so it controls the landing page
   only; each trip folder registers its own more-specific service worker that
   wins for that path. The activate cleanup is prefix-scoped so it never deletes a
   trip's offline cache (caches.keys() is per-origin). */

var PREFIX = 'awty-hub-';
var CACHE = PREFIX + 'v2';

var CORE = [
  './',
  './index.html',
  './config.json',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    var c = await caches.open(CACHE);
    await c.addAll(CORE);
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

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // config.json: network first so a new trip shows up, cache as offline fallback.
  if (url.origin === self.location.origin && /config\.json$/.test(url.pathname)) {
    e.respondWith((async function () {
      try {
        var res = await fetch(req);
        var c = await caches.open(CACHE);
        c.put('./config.json', res.clone());
        return res;
      } catch (err) {
        return (await caches.match('./config.json')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async function () {
    var cached = await caches.match(req);
    if (cached) return cached;
    try {
      var res = await fetch(req);
      if (res && res.status === 200 && url.origin === self.location.origin) {
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
