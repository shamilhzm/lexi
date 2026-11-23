// npm run og:gans — draw public/og-gans.jpg, the 1200×630 picture a link to the
// about page unfurls as (`scripts/pages/about.ts` names it in og:image).
//
// Gans, talking, beside the page's one sentence and its German reply. The light
// ground, because the goose is the card's white and only reads against the cream.
// No count is drawn: a number in a JPEG is a number nobody re-reads (og-image.ts).
//
// Rasterised with macOS `sips`, on a maintainer's machine; the image is committed.
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { gans, footprints, INK, TEAL } from '../pages/gans.ts';
import { PUBLIC_ORIGIN } from '../../src/lib/publicCopy.ts';

const root = process.cwd();
const W = 1200, H = 630;
const CREAM = '#faf6e6', DIM = '#5c5850', ACCENT = '#2c6b6b';
const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const host = new URL(process.env.LEXI_PUBLIC_ORIGIN || PUBLIC_ORIGIN).host;
const serif = `Iowan Old Style, Georgia, serif`;
const sans = `Helvetica Neue, Helvetica, Arial, sans-serif`;
const mono = `Menlo, monospace`;
const X = 72;
const k = 2.15; // goose scale: her 240-unit box becomes ~516 px

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${CREAM}"/>
<g transform="translate(${X - 6} 170) scale(1.05)">${inner(footprints())}</g>
<text x="${X + 62}" y="196" font-family="${serif}" font-size="56" font-weight="600" fill="${INK}">Language is always</text>
<text x="${X + 62}" y="262" font-family="${serif}" font-size="56" font-weight="600" fill="${INK}">in dialogue with</text>
<text x="${X + 62}" y="328" font-family="${serif}" font-size="56" font-weight="600" fill="${INK}">itself.</text>
<g transform="translate(${X + 232} 284) scale(1.05)">${inner(footprints({ closing: true }))}</g>
<text x="${X + 62}" y="396" font-family="${serif}" font-size="28" font-style="italic" fill="${ACCENT}">Sprache ist immer im Gespräch mit sich selbst.</text>
<text x="${X}" y="500" font-family="${sans}" font-size="24" fill="${DIM}">Lexi · German vocabulary for English speakers.</text>
<text x="${X}" y="534" font-family="${sans}" font-size="24" fill="${DIM}">Free, open source, no account.</text>
<text x="${X}" y="580" font-family="${mono}" font-size="22" fill="${ACCENT}">${host}/about</text>
<g transform="translate(955 92)">
  <rect x="-92" y="-44" width="184" height="72" rx="22" fill="#ffffff" stroke="${INK}" stroke-width="4"/>
  <path d="M-6 26 L-26 58 L18 26 Z" fill="#ffffff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <rect x="-24" y="22" width="44" height="8" fill="#ffffff"/>
  <text x="0" y="6" text-anchor="middle" font-family="${serif}" font-size="34" font-weight="600" fill="${INK}">„Hallo!“</text>
</g>
<g transform="translate(690 ${100 + 8 * k}) scale(${k})">${inner(gans({ pose: 'talk' }))}</g>
<rect x="0" y="${H - 10}" width="${W}" height="10" fill="${TEAL}"/>
</svg>
`;

const dir = mkdtempSync(join(tmpdir(), 'lexi-og-gans-'));
const svgPath = join(dir, 'og-gans.svg');
writeFileSync(svgPath, svg);
const out = join(root, 'public', 'og-gans.jpg');
try {
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '86', svgPath, '--out', out], { stdio: 'ignore' });
  console.log(`og-gans: → ${out}`);
} catch {
  console.error(`og-gans: sips (macOS) is not available. The SVG is at ${svgPath} — rasterise it at ${W}×${H} to public/og-gans.jpg.`);
  process.exit(1);
}
