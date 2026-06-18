/* assets/park.js -- In-park Cedar Point map for Operation Callahan
   Renders into <section id="park">. Defines window.onParkTabShown().
   All vars namespaced with p* to avoid colliding with index.html globals
   (map, meMarker, accCircle, watchId, update, etc.).
*/
(function () {
  'use strict';

  // ---- State ----
  var pmap = null;
  var pmapReady = false;
  var pme = null;          // "you" circleMarker
  var paccCircle = null;   // accuracy circle
  var pwatch = null;       // geolocation watchId
  var ppins = [];          // all pin LatLngs for fitBounds

  // ---- Pin data ----
  // Colors: green = CAN RIDE (48"), muted = ONE INCH SHORT (52"), cyan = LANDMARKS
  // Coordinates are real, pulled from OpenStreetMap's Cedar Point ride geometry.
  var PARK_PINS = [
    // CAN RIDE (green, 48")
    { ll: [41.48542, -82.68607], n: 'Magnum XL-200',         req: '48"', note: 'Legendary hyper coaster, far end by the beach',     color: '#1f9d55', cat: 'ride' },
    { ll: [41.48166, -82.68812], n: 'Millennium Force',      req: '48"', note: '300 ft, one of the all time greats',                color: '#1f9d55', cat: 'ride' },
    { ll: [41.48110, -82.68364], n: 'Valravn',               req: '48"', note: 'B and M dive coaster',                              color: '#1f9d55', cat: 'ride' },
    { ll: [41.48115, -82.68525], n: "Siren's Curse",         req: '48"', note: 'New tilt coaster',                                  color: '#1f9d55', cat: 'ride' },
    { ll: [41.48638, -82.68959], n: 'Gemini',                req: '48"', note: 'Racing coaster, a great first big one',             color: '#1f9d55', cat: 'ride' },
    { ll: [41.47986, -82.68261], n: 'Blue Streak',           req: '48"', note: 'Classic woodie near the front',                     color: '#1f9d55', cat: 'ride' },
    { ll: [41.48213, -82.68518], n: 'Iron Dragon',           req: '48"', note: 'Suspended, gentle',                                 color: '#1f9d55', cat: 'ride' },
    { ll: [41.48365, -82.68532], n: 'Corkscrew',             req: '48"', note: 'His first inversions',                              color: '#1f9d55', cat: 'ride' },
    { ll: [41.48479, -82.69039], n: 'Cedar Creek Mine Ride', req: '48"', note: 'Gentle family coaster',                             color: '#1f9d55', cat: 'ride' },
    { ll: [41.48534, -82.68913], n: 'Woodstock Express',     req: '48"', note: 'Camp Snoopy starter coaster',                       color: '#1f9d55', cat: 'ride' },
    { ll: [41.48412, -82.69104], n: 'Snake River Falls',     req: '48"', note: 'Water ride, you will get soaked',                   color: '#1f9d55', cat: 'ride' },
    // TOO TALL FOR HIM THIS YEAR (muted, 52")
    { ll: [41.48283, -82.68534], n: 'Top Thrill 2',          req: '52"', note: '420 ft, 120 mph. Next year, bud',                   color: '#8a93a6', cat: 'short' },
    { ll: [41.48450, -82.69291], n: 'Maverick',              req: '52"', note: 'Launch and a beyond-vertical drop',                 color: '#8a93a6', cat: 'short' },
    { ll: [41.48611, -82.69336], n: 'Steel Vengeance',       req: '52"', note: 'Frontiertown monster',                              color: '#8a93a6', cat: 'short' },
    { ll: [41.47944, -82.67901], n: 'GateKeeper',            req: '52"', note: 'Wing coaster over the front gate',                  color: '#8a93a6', cat: 'short' },
    { ll: [41.48085, -82.68014], n: 'MaXair',                req: '52"', note: 'Giant swing',                                       color: '#8a93a6', cat: 'short' },
    // LANDMARKS (cyan)
    { ll: [41.47835, -82.67945], n: 'Main Entrance',         req: null,  note: 'Front gate and lockers (credit card only)',         color: '#0057b8', cat: 'place' },
    { ll: [41.47900, -82.67990], n: 'Guest Services',        req: null,  note: 'Free birthday button for Kilian here',              color: '#0057b8', cat: 'place' },
    { ll: [41.48185, -82.68130], n: 'Planet Snoopy (kids)',  req: null,  note: 'Kids zone, shade, midday reset',                    color: '#0057b8', cat: 'place' },
    { ll: [41.48159, -82.67988], n: 'Giant Wheel',           req: null,  note: 'Dusk photo over Lake Erie to close out being 8',    color: '#0057b8', cat: 'place' },
    { ll: [41.47980, -82.68070], n: 'First Aid',             req: null,  note: 'Near the front midway, just in case',               color: '#0057b8', cat: 'place' }
  ];

  // ---- Haversine in FEET ----
  function haversineFt(lat1, lng1, lat2, lng2) {
    var R = 20902231; // Earth radius in feet
    var t = Math.PI / 180;
    var dLat = (lat2 - lat1) * t;
    var dLng = (lng2 - lng1) * t;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
          + Math.cos(lat1 * t) * Math.cos(lat2 * t)
          * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function nearestPin(lat, lng) {
    var best = null, bestDist = Infinity;
    for (var i = 0; i < PARK_PINS.length; i++) {
      var p = PARK_PINS[i];
      var d = haversineFt(lat, lng, p.ll[0], p.ll[1]);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return { pin: best, distFt: bestDist };
  }

  // ---- Build popup HTML ----
  function popupHtml(p) {
    var html = '<b>' + p.n + '</b>';
    if (p.req) {
      var tagColor = p.cat === 'ride' ? '#1f9d55' : '#5b6b85';
      var tagBg    = p.cat === 'ride' ? 'rgba(31,157,85,.16)' : 'rgba(138,147,166,.18)';
      html += ' <span style="display:inline-block;font-size:10px;padding:2px 6px;border-radius:5px;'
            + 'background:' + tagBg + ';color:' + tagColor + '">' + p.req + '</span>';
    }
    html += '<br><span style="font-size:12px;color:#5b6b85">' + p.note + '</span>';
    return html;
  }

  // ---- Init the Leaflet map ----
  function initParkMap() {
    if (pmapReady) return;
    pmap = L.map('parkmap', { zoomControl: true }).setView([41.4825, -82.685], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(pmap);

    ppins = [];
    for (var i = 0; i < PARK_PINS.length; i++) {
      var p = PARK_PINS[i];
      var cm = L.circleMarker(p.ll, {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: p.color,
        fillOpacity: 0.95
      }).addTo(pmap).bindPopup(popupHtml(p));
      ppins.push(p.ll);
    }
    pmapReady = true;
  }

  // ---- Show whole park ----
  function fitPark() {
    if (pmap && ppins.length) {
      pmap.fitBounds(L.latLngBounds(ppins).pad(0.12));
    }
  }

  // ---- Update stat row ----
  function pSetStat(nearName, distFt, accFt) {
    var nearEl  = document.getElementById('p-near-name');
    var distEl  = document.getElementById('p-near-dist');
    var accEl   = document.getElementById('p-gps-acc');
    if (nearEl)  nearEl.textContent  = nearName || '--';
    if (distEl)  distEl.textContent  = distFt != null ? Math.round(distFt) + ' ft' : '--';
    if (accEl)   accEl.textContent   = accFt  != null ? Math.round(accFt)  + ' ft' : '--';
  }

  // ---- Status line ----
  function pSetStatus(html) {
    var el = document.getElementById('p-status');
    if (el) el.innerHTML = html;
  }

  // ---- Toggle GPS tracking ----
  function pToggleTrack() {
    var btn = document.getElementById('p-track-btn');
    if (!btn) return;

    if (pwatch !== null) {
      navigator.geolocation.clearWatch(pwatch);
      pwatch = null;
      btn.textContent = 'Find me in the park';
      pSetStatus('Tracking off');
      return;
    }

    if (!navigator.geolocation) {
      pSetStatus('Geolocation not supported on this device');
      return;
    }

    pSetStatus('Getting a fix...');
    btn.textContent = 'Stop tracking';

    pwatch = navigator.geolocation.watchPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        var acc = pos.coords.accuracy; // meters
        var accFt = acc * 3.28084;

        if (!pme) {
          pme = L.circleMarker([lat, lng], {
            radius: 10,
            color: '#ffffff',
            weight: 3,
            fillColor: '#d81e3f',
            fillOpacity: 1
          }).addTo(pmap).bindPopup('You are here');
          paccCircle = L.circle([lat, lng], {
            radius: acc,
            color: '#d81e3f',
            weight: 1,
            fillOpacity: 0.08
          }).addTo(pmap);
        } else {
          pme.setLatLng([lat, lng]);
          paccCircle.setLatLng([lat, lng]).setRadius(acc);
        }

        pmap.setView([lat, lng], Math.max(pmap.getZoom(), 17));

        var result = nearestPin(lat, lng);
        pSetStat(result.pin ? result.pin.n : '--', result.distFt, accFt);
        pSetStatus('<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#1f9d55;margin-right:6px"></span>Live GPS');
      },
      function (err) {
        pSetStatus('Location blocked: ' + err.message + '. Needs HTTPS and permission.');
        btn.textContent = 'Find me in the park';
        pwatch = null;
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }

  // ---- Build legend rows ----
  function buildLegend() {
    var canRide  = PARK_PINS.filter(function (p) { return p.cat === 'ride'; });
    var tooShort = PARK_PINS.filter(function (p) { return p.cat === 'short'; });
    var places   = PARK_PINS.filter(function (p) { return p.cat === 'place'; });

    function pinRow(p) {
      var tagHtml = p.req
        ? ' <span class="tag" style="background:' + (p.cat === 'ride' ? 'rgba(31,157,85,.16);color:#1f9d55' : 'rgba(138,147,166,.18);color:#5b6b85') + '">' + p.req + '</span>'
        : '';
      return '<div class="row">'
           + '<span><span class="dot" style="background:' + p.color + '"></span>' + p.n + tagHtml + '</span>'
           + '<span class="mut" style="font-size:12px">' + p.note + '</span>'
           + '</div>';
    }

    var html = '';
    html += '<h3 class="green" style="margin:0 0 6px">Kilian CAN ride (48")</h3>';
    canRide.forEach(function (p) { html += pinRow(p); });
    html += '<h3 class="pink" style="margin:14px 0 6px">One inch short (52")</h3>';
    tooShort.forEach(function (p) { html += pinRow(p); });
    html += '<h3 class="cyan" style="margin:14px 0 6px">Landmarks and Services</h3>';
    places.forEach(function (p) { html += pinRow(p); });
    html += '<p class="mut" style="font-size:11px;margin:10px 0 0">Ride pins are guides, your red dot is exact.</p>';
    return html;
  }

  // ---- Inject styles for #parkmap ----
  function injectParkStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '#parkmap{height:62vh;min-height:380px;width:100%;border-radius:14px;',
      'border:1px solid #d3dce9;z-index:1;}'
    ].join('');
    document.head.appendChild(style);
  }

  // ---- Render UI into #park (once) ----
  var puiBuilt = false;
  function buildParkUI() {
    if (puiBuilt) return;
    puiBuilt = true;

    var section = document.getElementById('park');
    if (!section) return;

    injectParkStyles();

    section.innerHTML = [
      '<p class="mut" style="margin:0 0 14px;font-size:14px">',
        'Live in-park map for Kilian\'s birthday day. Tap <b>Find me in the park</b> to drop your blue dot.',
        ' Green pins are rides he clears at 51 inches. Gray pins need 52. Blue pins are stops worth knowing.',
      '</p>',

      '<div class="mapbar">',
        '<button class="btn" id="p-track-btn">Find me in the park</button>',
        '<button class="btn alt" id="p-fit-btn">Show whole park</button>',
        '<span id="p-status" class="mut">Tracking off</span>',
      '</div>',

      '<div id="parkmap"></div>',

      '<div class="stat" style="margin-top:12px">',
        '<div class="s"><div class="v" id="p-near-name" style="font-size:16px">--</div><div class="k">nearest spot</div></div>',
        '<div class="s"><div class="v" id="p-near-dist">--</div><div class="k">feet away</div></div>',
        '<div class="s"><div class="v" id="p-gps-acc">--</div><div class="k">GPS accuracy</div></div>',
      '</div>',

      '<div class="card" style="margin-top:18px">',
        buildLegend(),
      '</div>'
    ].join('');

    document.getElementById('p-track-btn').addEventListener('click', pToggleTrack);
    document.getElementById('p-fit-btn').addEventListener('click', fitPark);
  }

  // ---- Public hook called by index.html tab switcher ----
  window.onParkTabShown = function () {
    buildParkUI();
    initParkMap();
    pmap.invalidateSize();
  };

}());
