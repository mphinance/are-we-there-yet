// Captures Are We There Yet? screenshots into docs/ with Playwright.
// Self-contained: it serves the repo over a local port, drives each tab, and saves PNGs.
//
//   node screenshots.js
//
// The Map tab needs a network connection (Leaflet + OpenStreetMap tiles). The other
// shots render fully offline. Uses the repo's bundled Playwright chromium; set PWEXEC
// to override the browser path.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const TYPES = {
  '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.css':'text/css', '.svg':'image/svg+xml', '.ico':'image/x-icon'
};

function serve() {
  return new Promise(function (resolve) {
    const server = http.createServer(function (req, res) {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/' || p === '') p = '/index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, function () { resolve(server); });
  });
}

// One tidy phone screen per shot (cropped to the viewport, not the full scroll).
const VIEW = { width: 390, height: 780 };
const SHOTS = [
  { name: 'schedule', tab: 'schedule' },
  { name: 'kids',     tab: 'kids' },
  { name: 'map',      tab: 'map', wait: 1800 },
  { name: 'info',     tab: 'info' },
  { name: 'goals',    tab: 'info', heading: 'Trip goals' }  // scroll to the goal lists card
];

(async () => {
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  const server = await serve();
  const origin = 'http://localhost:' + server.address().port;
  const base = origin + '/zion/index.html';   // the app shots drive the Zion trip
  const browser = await chromium.launch({ executablePath: process.env.PWEXEC || undefined });

  // Hub landing page shot
  {
    const hctx = await browser.newContext({ viewport: { width: VIEW.width, height: 620 }, deviceScaleFactor: 1 });
    const hp = await hctx.newPage();
    await hp.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
    await hp.waitForTimeout(600);
    await hp.screenshot({ path: path.join(ROOT, 'docs', 'screenshot-hub.png') });
    console.log('wrote docs/screenshot-hub.png');
    await hctx.close();
  }

  async function shoot(ctx, s) {
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    await page.click('nav.tabs button[data-tab="' + s.tab + '"]');
    await page.waitForTimeout(s.wait || 500);
    if (s.heading) {
      // Scroll the card with this heading just below the sticky header + tabs.
      await page.evaluate(function (txt) {
        var h = Array.prototype.slice.call(document.querySelectorAll('.card h2'))
          .find(function (x) { return x.textContent.trim().indexOf(txt) !== -1; });
        if (!h) return;
        var stick = 0;
        document.querySelectorAll('header.app, nav.tabs').forEach(function (e) { stick += e.offsetHeight; });
        var y = h.closest('.card').getBoundingClientRect().top + window.scrollY - stick - 8;
        window.scrollTo(0, Math.max(0, y));
      }, s.heading);
      await page.waitForTimeout(200);
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.screenshot({ path: path.join(ROOT, 'docs', 'screenshot-' + s.name + '.png') }); // viewport crop
    console.log('wrote docs/screenshot-' + s.name + '.png');
    await page.close();
  }

  // Light theme, one phone screen each
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  for (const s of SHOTS) await shoot(ctx, s);
  await ctx.close();

  // Dark theme (schedule)
  const dctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, colorScheme: 'dark' });
  const dp = await dctx.newPage();
  await dp.addInitScript(() => { try { localStorage.setItem('daykit:theme', 'dark'); } catch (e) {} });
  await dp.goto(base, { waitUntil: 'domcontentloaded' });
  await dp.waitForTimeout(1000);
  await dp.screenshot({ path: path.join(ROOT, 'docs', 'screenshot-dark.png') }); // viewport crop
  console.log('wrote docs/screenshot-dark.png');
  await dctx.close();

  await browser.close();
  server.close();
  console.log('screenshots done');
})().catch(e => { console.error('SCREENSHOT ERROR:', e.message); process.exit(1); });
