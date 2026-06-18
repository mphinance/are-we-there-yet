// Renders the Operation Callahan PWA icons (navy + red coaster, gold star) to PNG.
// Uses the Playwright chromium that already ships with this repo's deps.
//   node gen-icons.js
const { chromium } = require('playwright');

// Inner artwork, drawn in a 512x512 coordinate space.
const ART = `
  <rect x="0" y="408" width="512" height="104" fill="#0a1c33"/>
  <line x1="48" y1="408" x2="464" y2="408" stroke="#f2b21a" stroke-width="6" stroke-linecap="round"/>
  <g stroke="#1c3a63" stroke-width="11">
    <line x1="148" y1="252" x2="148" y2="408"/>
    <line x1="256" y1="150" x2="256" y2="408"/>
    <line x1="364" y1="252" x2="364" y2="408"/>
  </g>
  <path d="M40 388 C 130 388 150 142 256 142 C 362 142 382 388 472 388"
        fill="none" stroke="#e4002b" stroke-width="24" stroke-linecap="round"/>
  <path d="M40 370 C 130 370 150 124 256 124 C 362 124 382 370 472 370"
        fill="none" stroke="#f2b21a" stroke-width="8" stroke-linecap="round" opacity="0.92"/>
  <g transform="translate(231 99)">
    <rect x="0" y="0" width="50" height="27" rx="8" fill="#ffffff"/>
    <circle cx="14" cy="31" r="6" fill="#0c2340"/>
    <circle cx="36" cy="31" r="6" fill="#0c2340"/>
  </g>
  <path d="M408 92 l11 23 25 3 -18 18 5 25 -23-13 -23 13 5-25 -18-18 25-3 z" fill="#f2b21a"/>
`;

function svg(size, maskable) {
  const inner = maskable
    ? `<g transform="translate(56 56) scale(0.78)">${ART}</g>`
    : ART;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#0c2340"/>
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
