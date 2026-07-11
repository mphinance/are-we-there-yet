// Renders the Daykit PWA icons (summer sunburst on cream) to PNG.
// Uses the Playwright chromium that ships with this repo's deps.
//   node gen-icons.js
const { chromium } = require('playwright');

// Inner artwork, drawn in a 512x512 coordinate space: a sunburst over a blue splash.
const ART = `
  <defs>
    <radialGradient id="sun" cx="50%" cy="44%" r="60%">
      <stop offset="0%" stop-color="#ffd873"/>
      <stop offset="55%" stop-color="#f2b21a"/>
      <stop offset="100%" stop-color="#f28c1a"/>
    </radialGradient>
  </defs>
  <g transform="translate(256 236)" fill="#f2b21a">
    ${Array.from({length: 12}).map((_, i) => {
      const a = (i * 30) * Math.PI / 180;
      const x1 = Math.cos(a) * 150, y1 = Math.sin(a) * 150;
      const x2 = Math.cos(a) * 205, y2 = Math.sin(a) * 205;
      const w = 14;
      const px = Math.cos(a + Math.PI/2) * w, py = Math.sin(a + Math.PI/2) * w;
      return `<path d="M${x1+px} ${y1+py} L${x2} ${y2} L${x1-px} ${y1-py} Z"/>`;
    }).join('')}
  </g>
  <circle cx="256" cy="236" r="132" fill="url(#sun)" stroke="#e4562b" stroke-width="10"/>
  <path d="M18 392 q 46 -34 92 0 q 46 34 92 0 q 46 -34 92 0 q 46 34 92 0 q 46 -34 92 0
           l 0 130 l -552 0 z" fill="#1d9bd1"/>
  <path d="M18 392 q 46 -34 92 0 q 46 34 92 0 q 46 -34 92 0 q 46 34 92 0 q 46 -34 92 0"
        fill="none" stroke="#7fd3f0" stroke-width="9"/>
`;

function svg(size, maskable) {
  const inner = maskable
    ? `<g transform="translate(56 56) scale(0.78)">${ART}</g>`
    : ART;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#fff7ea"/>
    ${inner}
  </svg>`;
}

const ICONS = [
  { file: 'assets/icon-192.png', size: 192, svg: svg(192, false) },
  { file: 'assets/icon-512.png', size: 512, svg: svg(512, false) },
  { file: 'assets/icon-maskable-512.png', size: 512, svg: svg(512, true) }
];

(async () => {
  const browser = await chromium.launch();
  for (const ic of ICONS) {
    const page = await browser.newContext({ viewport: { width: ic.size, height: ic.size }, deviceScaleFactor: 1 })
      .then(c => c.newPage());
    await page.setContent('<style>*{margin:0;padding:0}</style>' + ic.svg);
    await page.screenshot({ path: ic.file });
    console.log('wrote', ic.file);
    await page.close();
  }
  await browser.close();
  console.log('icons done');
})().catch(e => { console.error('ICON ERROR:', e.message); process.exit(1); });
