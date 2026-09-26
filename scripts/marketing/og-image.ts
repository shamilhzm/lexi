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
// Colours are read from `src/index.css`'s dark theme — no palette value is typed
// here. The night ground, because a link preview sits on somebody else's page and
// the dark sky is the version of this picture that reads at thumbnail size.
//
// Rasterised with macOS `sips` (CoreSVG): this runs on a maintainer's machine,
// like the corpus scripts, and the image is committed. Anywhere else it writes the
// SVG and says so.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { sowingOrder, layout, ringAt } from '../../src/lib/sky.ts';
import { PUBLIC_ORIGIN } from '../../src/lib/publicCopy.ts';
import type { Word } from '../../src/types.ts';

const root = process.cwd();
const W = 1200, H = 630;

// ---- the palette, from the stylesheet ----------------------------------------
const css = readFileSync(join(root, 'src', 'index.css'), 'utf8');
const darkBlock = /html\.dark\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
function tokenOf(name: string): string {
  const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(darkBlock);
  if (!m) throw new Error(`og-image: ${name} not found in html.dark (src/index.css)`);
  return m[1];
}
const ink = {
  bg: tokenOf('--color-bg'), panel: tokenOf('--color-panel'), line: tokenOf('--color-line'),
  txt: tokenOf('--color-txt'), dim: tokenOf('--color-dim'), accent: tokenOf('--color-accent'),
};

// ---- the sky, from the shipped data ----------------------------------------------
const cards = (JSON.parse(readFileSync(join(root, 'public', 'data', 'cards.json'), 'utf8')) as Word[])
  .filter((w) => w.kind !== 'grammar');
const freq = JSON.parse(readFileSync(join(root, 'public', 'data', 'freq.json'), 'utf8')) as Record<string, number>;
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
  // Steep near the core, so the commonest words read as a light and the rim as dust.
  const alpha = 0.1 + 0.9 * Math.pow(1 - b / (BANDS - 1), 2.4);
  return `<path d="${d.join('')}" fill="${ink.accent}" fill-opacity="${alpha.toFixed(2)}"/>`;
}).join('\n');

// The coverage rings WordSky draws — the 100, 500, 1,000 and 3,000 commonest.
const rings = [100, 500, 1000, 3000]
  .map((k) => `<circle cx="${cx}" cy="${cy}" r="${f(ringAt(k, n) * R)}" fill="none" stroke="${ink.dim}" stroke-opacity="0.45" stroke-width="1.2" stroke-dasharray="2 5"/>`)
  .join('\n');

// ---- the words ------------------------------------------------------------------------
const host = new URL(process.env.LEXI_PUBLIC_ORIGIN || PUBLIC_ORIGIN).host;
const serif = `Iowan Old Style, Georgia, serif`;
const sans = `Helvetica Neue, Helvetica, Arial, sans-serif`;
const mono = `Menlo, monospace`;
const X = 72;
// The mark, from public/icon.svg's geometry (a 150-unit square), on the panel ink.
const s = 44 / 150;
const mark = `<g transform="translate(${X} 64)">
  <rect width="44" height="44" rx="10" fill="${ink.panel}"/>
  <rect x="${52 * s}" y="${40 * s}" width="${20 * s}" height="${72 * s}" rx="1" fill="${ink.accent}"/>
  <rect x="${52 * s}" y="${92 * s}" width="${60 * s}" height="${20 * s}" rx="1" fill="${ink.accent}"/>
  <rect x="${88 * s}" y="${40 * s}" width="${20 * s}" height="${22 * s}" rx="1" fill="${ink.accent}"/>
</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="glow" cx="${cx}" cy="${cy}" r="${R + 150}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${ink.accent}" stop-opacity="0.16"/>
    <stop offset="1" stop-color="${ink.accent}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="window" cx="${cx}" cy="${cy}" r="${R + 12}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${ink.panel}" stop-opacity="0.9"/>
    <stop offset="0.7" stop-color="${ink.panel}" stop-opacity="0.55"/>
    <stop offset="1" stop-color="${ink.panel}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="${ink.bg}"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<circle cx="${cx}" cy="${cy}" r="${R + 12}" fill="url(#window)"/>
${rings}
<path d="${halos.join('')}" fill="${ink.accent}" fill-opacity="0.18"/>
${starPaths}
<path d="${cores.join('')}" fill="${ink.txt}" fill-opacity="0.9"/>
<text x="${cx}" y="${cy + R + 36}" text-anchor="middle" font-family="${sans}" font-size="17" fill="${ink.dim}">Every word Lexi teaches — the commonest at the centre</text>
${mark}
<text x="${X + 58}" y="97" font-family="${sans}" font-size="30" font-weight="700" fill="${ink.txt}">Lexi</text>
<text x="${X}" y="232" font-family="${serif}" font-size="60" font-weight="600" fill="${ink.txt}">Scroll German.</text>
<text x="${X}" y="304" font-family="${serif}" font-size="60" font-weight="600" fill="${ink.txt}">Save a word.</text>
<text x="${X}" y="376" font-family="${serif}" font-size="60" font-weight="600" fill="${ink.accent}">Lexi makes it stick.</text>
<text x="${X}" y="446" font-family="${sans}" font-size="24" fill="${ink.dim}">German vocabulary for English speakers,</text>
<text x="${X}" y="480" font-family="${sans}" font-size="24" fill="${ink.dim}">A1 to C2. Free, open source, no account.</text>
<text x="${X}" y="566" font-family="${mono}" font-size="22" fill="${ink.accent}">${host}</text>
</svg>
`;

const dir = mkdtempSync(join(tmpdir(), 'lexi-og-'));
const svgPath = join(dir, 'og.svg');
writeFileSync(svgPath, svg);
// JPEG, not PNG: ten thousand anti-aliased dots made a 760 KB PNG, and link
// previews are commonly dropped above ~300 KB (WhatsApp is the strict one). At
// quality 82 the same picture is well under that, and the dots survive it.
const out = join(root, 'public', 'og.jpg');
try {
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', svgPath, '--out', out], { stdio: 'ignore' });
  console.log(`og-image: ${n.toLocaleString('en-US')} words → ${out}`);
} catch {
  console.error(`og-image: sips (macOS) is not available. The SVG is at ${svgPath} — rasterise it at ${W}×${H} to public/og.jpg.`);
  process.exit(1);
}
