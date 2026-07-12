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
  { name: 'info',     tab: 'info' }
];

(async () => {
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  const server = await serve();
  const base = 'http://localhost:' + server.address().port + '/index.html';
  const browser = await chromium.launch({ executablePath: process.env.PWEXEC || undefined });

  async function shoot(ctx, name, tab, wait) {
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    await page.click('nav.tabs button[data-tab="' + tab + '"]');
    await page.waitForTimeout(wait || 500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(ROOT, 'docs', 'screenshot-' + name + '.png') }); // viewport crop
    console.log('wrote docs/screenshot-' + name + '.png');
    await page.close();
  }

  // Light theme, one phone screen each
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  for (const s of SHOTS) await shoot(ctx, s.name, s.tab, s.wait);
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
