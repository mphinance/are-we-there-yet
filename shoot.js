const { chromium } = require('playwright');

(async () => {
  const URL = 'https://mphinance.github.io/callahan/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2
  });
  const page = await ctx.newPage();

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2500); // let weather fetch + fonts settle

  // Now tab (default)
  await page.screenshot({ path: 'docs/screenshot-now.png' });
  console.log('shot: now');

  // Live Map
  await page.click('button[data-t="map"]');
  await page.waitForTimeout(3500); // map tiles
  await page.screenshot({ path: 'docs/screenshot-live-map.png' });
  console.log('shot: live-map');

  // Park Map
  await page.click('button[data-t="park"]');
  await page.waitForTimeout(3500); // map tiles
  await page.screenshot({ path: 'docs/screenshot-park-map.png' });
  console.log('shot: park-map');

  await browser.close();
  console.log('done');
})().catch(e => { console.error('SHOOT ERROR:', e.message); process.exit(1); });
