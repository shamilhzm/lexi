// npm run og:image — draw public/og.jpg, the 1200×630 picture a shared link
// unfurls as.
//
// **What it shows, and why.** The link preview used to be the app icon — and the
// icon was the amber terminal mark retired on 2026-07-28, with alt text describing
// a third mark entirely (panel review, marketing F2). The sky is the one image Lexi
// has made that nobody else could: every word it teaches as a point, sown in order
// of frequency with the same phyllotaxis `WordSky` uses (`lib/sky.ts`), so the
// centre is the German in every sentence and the rim is the German met once a year.
// Here brightness says *how common*, not *how known* — there is no learner in a
// link preview — and the caption under it says so.
//
// **What it deliberately does not show:** a count. A number drawn into a PNG is a
// number nobody re-reads; the counts live in the meta tags, stamped at build
// (`publicCopyPlugin.ts`). The address is drawn, from `PUBLIC_ORIGIN`, so a
// domain move is one constant and one re-run.
//
// **The Heft** *(2026-11-26)*. Paper ground, the sky drawn in Königsblau ink, the
// hundred commonest words under the yellow highlighter, and the type the app sets
// (Bricolage Grotesque, IBM Plex Mono) rendered by headless Chrome (`raster.ts`).
// It was the card box's night sky in Iowan Old Style, a look the app had left.
// Colours are read from `src/index.css`'s light theme: no palette value is typed here.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fontFaces, rasterise } from './raster.ts';
import { sowingOrder, layout, ringAt } from '../../src/lib/sky.ts';
import { ranksOrThrow } from '../../src/lib/freq.ts';
import { PUBLIC_ORIGIN } from '../../src/lib/publicCopy.ts';
import type { Word } from '../../src/types.ts';

const root = process.cwd();
const W = 1200, H = 630;

// ---- the palette, from the stylesheet ----------------------------------------
const css = readFileSync(join(root, 'src', 'index.css'), 'utf8');
const lightBlock = /@theme\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
function tokenOf(name: string): string {
  const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(lightBlock);
  if (!m) throw new Error(`og-image: ${name} not found in @theme (src/index.css)`);
  return m[1];
}
const ink = {
  bg: tokenOf('--color-bg'), txt: tokenOf('--color-txt'), dim: tokenOf('--color-dim'),
  accent: tokenOf('--color-accent'), key: tokenOf('--color-key'), coral: tokenOf('--color-coral'),
};

// ---- the sky, from the shipped data ----------------------------------------------
const allCards = JSON.parse(readFileSync(join(root, 'public', 'data', 'cards.json'), 'utf8')) as Word[];
const cards = allCards.filter((w) => w.kind !== 'grammar');
const freq = ranksOrThrow(JSON.parse(readFileSync(join(root, 'public', 'data', 'freq.json'), 'utf8')), allCards);
const order = sowingOrder(cards, (id) => freq[id] ?? null);
const stars = layout(order);
const n = stars.length;

const cx = 905, cy = 300, R = 265;
const dot = Math.max(0.75, (R / Math.sqrt(n)) * 0.5);
const f = (x: number) => x.toFixed(1);
const circle = (x: number, y: number, r: number) =>
  `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;

// Brightness by position — 32 bands from the core outward, one path each, so the
// file is a few dozen fills rather than ten thousand elements.
const BANDS = 32;
const bands: string[][] = Array.from({ length: BANDS }, () => []);
const halos: string[] = [], cores: string[] = [];
stars.forEach((s, i) => {
  const x = cx + s.x * R, y = cy + s.y * R;
  bands[Math.min(BANDS - 1, Math.floor(s.r * BANDS))].push(circle(x, y, dot));
  if (i < 100) { halos.push(circle(x, y, dot * 3)); cores.push(circle(x, y, dot * 0.45)); }
});
const starPaths = bands.map((d, b) => {
  // Steep near the core, so the commonest words read as ink and the rim as dust.
  // Ink on paper needs a higher floor than light on night did (2026-11-26).
  const alpha = 0.22 + 0.78 * Math.pow(1 - b / (BANDS - 1), 1.7);
  return `<path d="${d.join('')}" fill="${ink.accent}" fill-opacity="${alpha.toFixed(2)}"/>`;
}).join('\n');

// The coverage rings WordSky draws — the 100, 500, 1,000 and 3,000 commonest.
const rings = [100, 500, 1000, 3000]
  .map((k) => `<circle cx="${cx}" cy="${cy}" r="${f(ringAt(k, n) * R)}" fill="none" stroke="${ink.dim}" stroke-opacity="0.5" stroke-width="1.2" stroke-dasharray="2 5"/>`)
  .join('\n');

// ---- the words ------------------------------------------------------------------------
const host = new URL(process.env.LEXI_PUBLIC_ORIGIN || PUBLIC_ORIGIN).host;
// The mark, from public/icon.svg's geometry (a 150-unit square).
const mark = `<svg width="48" height="48" viewBox="0 0 150 150" aria-hidden="true">
  <rect width="150" height="150" rx="36" fill="${ink.txt}"/>
  <rect x="46" y="34" width="24" height="80" rx="4" fill="${ink.key}"/>
  <rect x="46" y="90" width="64" height="24" rx="4" fill="${ink.key}"/>
  <rect x="86" y="34" width="24" height="24" rx="12" fill="${ink.coral}"/>
</svg>`;

const sky = `<svg class="sky" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
${rings}
<path d="${halos.join('')}" fill="${ink.key}" fill-opacity="0.95"/>
${starPaths}
<path d="${cores.join('')}" fill="${ink.txt}"/>
</svg>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
${fontFaces(root)}
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${ink.bg}; color: ${ink.txt}; }
body { position: relative; font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }
.sky { position: absolute; inset: 0; }
.brand { position: absolute; left: 72px; top: 60px; display: flex; align-items: center; gap: 14px;
  font: 800 34px/1 "Bricolage Grotesque"; letter-spacing: -0.01em; }
h1 { position: absolute; left: 72px; top: 168px; margin: 0; font: 700 68px/1.04 "Bricolage Grotesque";
  letter-spacing: -0.025em; font-variation-settings: "opsz" 96; }
mark { color: inherit; background-image: linear-gradient(100deg, transparent 0.06em, ${ink.key} 0.16em,
  ${ink.key} calc(100% - 0.14em), transparent calc(100% - 0.04em)); background-repeat: no-repeat;
  background-size: 100% 70%; background-position: 0 78%; background-color: transparent; padding: 0 0.08em; margin: 0 -0.08em; }
.sub { position: absolute; left: 72px; top: 438px; margin: 0; font-size: 24px; line-height: 1.45; color: ${ink.dim}; }
.host { position: absolute; left: 72px; top: 548px; font: 500 22px/1 "IBM Plex Mono"; color: ${ink.accent}; }
.caption { position: absolute; left: ${cx - 300}px; width: 600px; top: ${cy + R + 22}px; text-align: center;
  font-size: 17px; color: ${ink.dim}; }
</style></head><body>
${sky}
<div class="brand">${mark}Lexi</div>
<h1>Scroll German.<br>Save a word.<br>Lexi makes it <mark>stick.</mark></h1>
<p class="sub">German vocabulary for English speakers,<br>A1 to C2. Free, open source, no account.</p>
<div class="host">${host}</div>
<div class="caption">Every word Lexi teaches, the commonest at the centre</div>
</body></html>`;

const out = join(root, 'public', 'og.jpg');
try {
  rasterise(html, out, W, H, 84);
  console.log(`og-image: ${n.toLocaleString('en-US')} words → ${out}`);
} catch (e) {
  console.error(`og-image: ${(e as Error).message}`);
  process.exit(1);
}
