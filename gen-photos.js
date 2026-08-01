/* gen-photos.js: shrink trip photos for the journal.
 *
 *   node gen-photos.js <trip> <image>...        # writes <trip>/photos/<slug>.jpg
 *   node gen-photos.js obsidian ~/shots/*.jpg
 *
 * Phone photos are 3 to 5 MB each. Committing those to a public repo makes the
 * page unusable on ship wifi and bloats the git history forever. This downscales
 * to PHOTO_MAX px on the long edge and re-encodes as JPEG, which lands most
 * shots between 150 and 400 KB. It also strips EXIF (so no GPS coordinates or
 * camera serial rides along into a public repo) because the canvas re-encode
 * keeps only pixels.
 *
 * Uses Playwright + Chromium's canvas, the same dependency gen-icons.js and
 * screenshots.js already rely on, so this adds no new npm package. Point at the
 * bundled browser with PWEXEC=/opt/pw-browsers/chromium if Playwright cannot
 * find one.
 *
 * Chromium cannot decode HEIC. iPhones shooting "High Efficiency" produce .heic,
 * so either set Camera > Formats > Most Compatible, or let the phone convert on
 * share (AirDrop, Files export, and most uploads already hand over JPEG).
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PHOTO_MAX = 1600;    // long edge, px. Plenty for a phone screen at 2x.
const QUALITY = 0.82;      // JPEG quality. Visually clean, roughly a tenth the size.

function slug(s) {
  return String(s).toLowerCase().replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo';
}

(async () => {
  const [trip, ...images] = process.argv.slice(2);
  if (!trip || !images.length) {
    console.error('usage: node gen-photos.js <trip> <image>...');
    process.exit(1);
  }
  if (!fs.existsSync(trip)) {
    console.error(`No such trip folder: ${trip}/`);
    process.exit(1);
  }
  const bad = images.filter(f => /\.heic$/i.test(f));
  if (bad.length) {
    console.error(`Chromium cannot decode HEIC. Convert these to JPEG first:\n  ${bad.join('\n  ')}`);
    process.exit(1);
  }
  const missing = images.filter(f => !fs.existsSync(f));
  if (missing.length) {
    console.error(`Not found:\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }

  const outDir = path.join(trip, 'photos');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ executablePath: process.env.PWEXEC || undefined });
  const page = await browser.newPage();
  const written = [];

  for (const file of images) {
    const b64 = fs.readFileSync(file).toString('base64');
    const ext = (path.extname(file).slice(1) || 'jpeg').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const out = await page.evaluate(async ({ dataUrl, max, q }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      return { data: c.toDataURL('image/jpeg', q).split(',')[1], w, h };
    }, { dataUrl: `data:${mime};base64,${b64}`, max: PHOTO_MAX, q: QUALITY });

    // Never clobber a photo already posted: bump a suffix instead.
    let name = `${slug(path.basename(file))}.jpg`, n = 2;
    while (fs.existsSync(path.join(outDir, name))) name = `${slug(path.basename(file))}-${n++}.jpg`;

    const buf = Buffer.from(out.data, 'base64');
    fs.writeFileSync(path.join(outDir, name), buf);
    const before = fs.statSync(file).size, after = buf.length;
    console.log(`${name}  ${out.w}x${out.h}  ${(before / 1024 / 1024).toFixed(1)}MB -> ${Math.round(after / 1024)}KB`);
    written.push(`photos/${name}`);
  }

  await browser.close();
  console.log('\nsrc values for journal.json:');
  written.forEach(p => console.log(`  "${p}"`));
})();
