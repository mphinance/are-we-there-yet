/* make-artifact.js: build a shareable "follow along" page for a trip.
 *
 *   node make-artifact.js <trip> [outfile]
 *
 * Reads <trip>/event.json and <trip>/journal.json and writes one self-contained
 * HTML file: the route, and every dispatch posted so far. Photos are inlined as
 * data URIs because the Artifact CSP blocks requests to any external host, so a
 * plain <img src="https://..."> would silently fail to load.
 *
 * This is a derived view, never a source of truth. Post with the trip-post
 * skill, then re-run this and re-publish to the same URL. The installable PWA at
 * <trip>/ remains the real thing: it works offline, this page does not.
 */
const fs = require('fs');
const path = require('path');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmt12 = hm => {
  if (!hm) return '';
  const [h, m] = hm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`;
};
const longDate = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US',
    { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

const trip = process.argv[2];
const outfile = process.argv[3] || `${trip}-follow.html`;
if (!trip || !fs.existsSync(trip)) {
  console.error('usage: node make-artifact.js <trip> [outfile]');
  process.exit(1);
}

const ev = JSON.parse(fs.readFileSync(path.join(trip, 'event.json')));
let posts = [];
try {
  const j = JSON.parse(fs.readFileSync(path.join(trip, 'journal.json')));
  posts = (j.posts || []).filter(p => p && p.date);
} catch (e) { /* no journal yet, or mid-edit: the page just shows the route */ }

const placeById = {};
(ev.places || []).forEach(p => { placeById[p.id] = p; });

const byDate = {};
posts.forEach(p => { (byDate[p.date] = byDate[p.date] || []).push(p); });
Object.values(byDate).forEach(list =>
  list.sort((a, b) => String(a.time || '').localeCompare(String(b.time || ''))));

// Inline a photo as a data URI. Skipped with a warning if the file is missing,
// so one bad path never costs you the whole page.
function inline(src) {
  const f = path.join(trip, src);
  if (!fs.existsSync(f)) { console.warn(`  ! missing photo, skipped: ${src}`); return null; }
  const ext = path.extname(f).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(f).toString('base64')}`;
}

const days = ev.days || [];
const posted = days.filter(d => (byDate[d.date] || []).length).length;

const dayHtml = days.map((day, i) => {
  const mine = byDate[day.date] || [];
  const lit = mine.length > 0;
  const stops = (day.schedule || []).map(it => {
    const p = it.place && placeById[it.place];
    return `<li><span class="t">${esc(fmt12(it.start))}</span><span class="s">${esc(it.title)}${
      p ? `<em>${esc(p.name)}</em>` : ''}</span></li>`;
  }).join('');

  const dispatches = mine.map(p => {
    const body = (Array.isArray(p.body) ? p.body : p.body ? [p.body] : [])
      .map(t => `<p>${esc(t)}</p>`).join('');
    const shots = (p.photos || []).map(ph => {
      const src = typeof ph === 'string' ? ph : ph.src;
      const cap = typeof ph === 'string' ? '' : (ph.caption || '');
      const uri = inline(src);
      if (!uri) return '';
      return `<figure><img src="${uri}" alt="${esc(cap || p.title || 'Trip photo')}">${
        cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`;
    }).join('');
    return `<article class="post">
      <header>${p.title ? `<h3>${esc(p.title)}</h3>` : ''}${
        p.time ? `<span class="stamp">${esc(fmt12(p.time))}</span>` : ''}</header>
      ${body}${shots ? `<div class="shots${(p.photos || []).length === 1 ? ' solo' : ''}">${shots}</div>` : ''}
    </article>`;
  }).join('');

  return `<section class="day${lit ? ' lit' : ''}">
    <div class="marker"><span class="n">${i + 1}</span></div>
    <div class="daybody">
      <p class="when">${esc(longDate(day.date))}</p>
      <h2>${esc(day.title || longDate(day.date))}</h2>
      ${(day.notes || []).map(n => `<p class="note">${esc(n)}</p>`).join('')}
      ${lit ? dispatches : ''}
      <details class="plan"${lit ? '' : ' open'}>
        <summary>${lit ? 'The plan for this day' : 'Planned'}</summary>
        <ul class="stops">${stops}</ul>
      </details>
    </div>
  </section>`;
}).join('');

const html = `<title>${esc(ev.title || trip)}: follow along</title>
<style>
  /* Obsidian: black volcanic glass, lava into water. The palette is the trip's
     own #5b3e8c, pushed toward basalt and meltwater rather than invented fresh. */
  :root{
    --glass:#0d0b12; --basalt:#1c1a24; --ash:#6f6a7d;
    --violet:#8b6bc4; --glacier:#7fb5c4; --sulphur:#d9a441;
    --ground:#f2f0f4; --panel:#ffffff; --ink:#17151d; --dim:#5f5a6b;
    --line:#e2dee8; --accent:var(--violet);
    --display:ui-serif,Georgia,"Iowan Old Style","Times New Roman",serif;
    --body:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
    --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace;
  }
  @media (prefers-color-scheme:dark){
    :root{ --ground:#0d0b12; --panel:#16141d; --ink:#ece9f2; --dim:#9a94a8;
           --line:#2a2734; --accent:#a98adf; }
  }
  :root[data-theme="light"]{ --ground:#f2f0f4; --panel:#fff; --ink:#17151d; --dim:#5f5a6b;
                             --line:#e2dee8; --accent:var(--violet); }
  :root[data-theme="dark"]{ --ground:#0d0b12; --panel:#16141d; --ink:#ece9f2; --dim:#9a94a8;
                            --line:#2a2734; --accent:#a98adf; }

  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--body);
       line-height:1.6;-webkit-font-smoothing:antialiased}
  .wrap{max-width:720px;margin:0 auto;padding:0 20px 80px}

  /* Hero: the ship's status, in the log's own voice. */
  .hero{padding:64px 0 40px;border-bottom:1px solid var(--line)}
  .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;
           color:var(--accent);margin:0 0 18px}
  .hero h1{font-family:var(--display);font-weight:600;font-size:clamp(38px,7vw,60px);
           line-height:1.02;margin:0;text-wrap:balance;letter-spacing:-.02em}
  .hero .sub{color:var(--dim);font-size:17px;margin:14px 0 0;max-width:52ch;text-wrap:balance}
  .facts{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
  .fact{font-family:var(--mono);font-size:12px;padding:6px 12px;border-radius:2px;
        border:1px solid var(--line);color:var(--dim);font-variant-numeric:tabular-nums}
  .fact b{color:var(--ink);font-weight:600}

  /* The route. A voyage is a real sequence, so the numbering carries meaning. */
  .day{display:grid;grid-template-columns:44px 1fr;gap:20px;padding:34px 0;
       border-bottom:1px solid var(--line)}
  .marker{position:relative;display:flex;justify-content:center}
  .marker::before{content:"";position:absolute;top:26px;bottom:-56px;width:1px;background:var(--line)}
  .day:last-child .marker::before{display:none}
  .n{position:relative;z-index:1;width:28px;height:28px;border-radius:50%;
     display:grid;place-items:center;font-family:var(--mono);font-size:12px;
     background:var(--ground);border:1px solid var(--line);color:var(--dim)}
  .day.lit .n{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}
  .when{font-family:var(--mono);font-size:11px;letter-spacing:.11em;text-transform:uppercase;
        color:var(--dim);margin:4px 0 6px}
  .daybody h2{font-family:var(--display);font-weight:600;font-size:26px;margin:0;
              letter-spacing:-.01em;text-wrap:balance}
  .day:not(.lit) .daybody h2,.day:not(.lit) .when{opacity:.62}
  .note{color:var(--dim);font-size:14px;margin:8px 0 0;font-style:italic}

  .post{margin-top:22px;padding-left:16px;border-left:2px solid var(--accent)}
  .post header{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
  .post h3{font-family:var(--display);font-size:19px;font-weight:600;margin:0}
  .stamp{font-family:var(--mono);font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums}
  .post p{margin:9px 0 0;font-size:15.5px}
  .shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-top:16px}
  .shots.solo{grid-template-columns:1fr}
  .shots figure{margin:0}
  .shots img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:3px;display:block;background:var(--line)}
  .shots.solo img{aspect-ratio:auto;max-height:520px;object-fit:contain;background:transparent}
  .shots figcaption{font-size:12px;color:var(--dim);margin-top:6px;line-height:1.45}

  .plan{margin-top:18px}
  .plan summary{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;
                color:var(--dim);cursor:pointer;list-style:none;padding:5px 0}
  .plan summary::-webkit-details-marker{display:none}
  .plan summary::before{content:"+ ";color:var(--accent)}
  .plan[open] summary::before{content:"\\2212 "}
  .plan summary:hover{color:var(--ink)}
  .plan summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
  .stops{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:7px}
  .stops li{display:grid;grid-template-columns:66px 1fr;gap:12px;font-size:14px;align-items:baseline}
  .stops .t{font-family:var(--mono);font-size:11.5px;color:var(--dim);font-variant-numeric:tabular-nums}
  .stops .s{color:var(--ink)}
  .stops em{display:block;font-style:normal;font-size:12.5px;color:var(--dim)}

  .waiting{padding:34px 0;text-align:center;color:var(--dim);font-size:14.5px}
  .waiting .big{font-family:var(--display);font-size:21px;color:var(--ink);display:block;margin-bottom:7px}
  footer{padding-top:34px;color:var(--dim);font-size:13px;text-align:center}
  footer a{color:var(--accent)}
  footer .close{font-family:var(--display);font-size:17px;color:var(--ink);
                font-style:italic;display:block;margin-bottom:16px;text-wrap:balance}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  @media (max-width:520px){ .day{grid-template-columns:32px 1fr;gap:14px} .n{width:24px;height:24px;font-size:11px} }
</style>

<div class="wrap">
  <header class="hero">
    <p class="eyebrow">${esc(ev.team && ev.team.rank || 'Follow along')}</p>
    <h1>${esc(ev.title || trip)}</h1>
    <p class="sub">${esc(ev.subtitle || '')}</p>
    <div class="facts">
      <span class="fact"><b>${days.length}</b> days</span>
      <span class="fact"><b>${posted}</b> posted</span>
      <span class="fact">${esc(ev.location && ev.location.name || '')}</span>
    </div>
  </header>

  ${posted === 0 ? `<div class="waiting"><span class="big">Nothing posted yet.</span>
    The route is below. Dispatches land here as they are written.</div>` : ''}

  ${dayHtml}

  <footer>
    ${ev.closingNote ? `<span class="close">${esc(ev.closingNote)}</span>` : ''}
    Built from the same trip file as the phone app.
  </footer>
</div>
`;

fs.writeFileSync(outfile, html);
const kb = Math.round(fs.statSync(outfile).size / 1024);
console.log(`wrote ${outfile}  ${days.length} days, ${posts.length} posts, ${kb} KB`);
