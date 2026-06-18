// Serves the repo locally and screenshots the themed pages into docs/.
// Verifies the Cedar Point re-theme renders and refreshes README shots.
//   node verify-shoot.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const PORT = 8099;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const file = path.join(ROOT, p);
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const base = `http://localhost:${PORT}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'docs/screenshot-now.png' });
  console.log('shot: now');

  await page.click('button[data-t="map"]');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'docs/screenshot-live-map.png' });
  console.log('shot: live-map');

  await page.click('button[data-t="park"]');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'docs/screenshot-park-map.png' });
  console.log('shot: park-map');

  await browser.close();
  server.close();
  console.log('done');
})().catch(e => { console.error('SHOOT ERROR:', e.message); process.exit(1); });
