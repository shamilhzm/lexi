// npm run og:gans — draw public/og-gans.jpg, the 1200×630 picture a link to the
// about page unfurls as (`scripts/pages/about.ts` names it in og:image).
//
// Gans, talking, beside the page's one sentence and its German reply. The light
// ground, because the goose is the card's white and only reads against paper.
// No count is drawn: a number in a JPEG is a number nobody re-reads (og-image.ts).
//
// **The Heft** *(2026-11-26)*. The about page's own hero, set the way the page sets
// it: Bricolage Grotesque, the reply in Königsblau between coral Gänsefüßchen, the
// bubble with its hard lip. Rendered by headless Chrome (`raster.ts`) so the type is
// the app's. It was Iowan Old Style on the card box's cream, with a teal rule.
import { join } from 'node:path';
import { gans, footprints, INK, CARD, CORAL, PAPER } from '../pages/gans.ts';
import { fontFaces, rasterise } from './raster.ts';
import { PUBLIC_ORIGIN } from '../../src/lib/publicCopy.ts';

const root = process.cwd();
const W = 1200, H = 630;
// src/index.css, light theme: --color-dim and --color-accent.
const DIM = '#4d4f58', ACCENT = '#2b3ea6';
const host = new URL(process.env.LEXI_PUBLIC_ORIGIN || PUBLIC_ORIGIN).host;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
${fontFaces(root)}
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${PAPER}; color: ${INK}; }
body { position: relative; font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }
.kicker { position: absolute; left: 72px; top: 64px; margin: 0; font: 500 17px/1 "IBM Plex Mono";
  letter-spacing: .17em; text-transform: uppercase; color: ${DIM}; }
h1 { position: absolute; left: 72px; top: 112px; width: 640px; margin: 0;
  font: 620 64px/1.02 "Bricolage Grotesque"; letter-spacing: -.025em; font-variation-settings: "opsz" 96; text-wrap: balance; }
.feet { display: inline-block; height: auto; width: .56em; }
.nw { white-space: nowrap; }
.q-open { vertical-align: -.12em; margin-right: .1em; }
.q-close { vertical-align: .52em; margin-left: .08em; }
.reply { position: absolute; left: 72px; top: 352px; width: 640px; margin: 0;
  font: 400 33px/1.25 "Bricolage Grotesque"; color: ${ACCENT}; text-wrap: balance; }
.reply::before { content: "„"; color: ${CORAL}; }
.reply::after { content: "“"; color: ${CORAL}; }
.small { position: absolute; left: 72px; top: 458px; margin: 0; font-size: 23px; line-height: 1.5; color: ${DIM}; }
.host { position: absolute; left: 72px; top: 560px; font: 500 21px/1 "IBM Plex Mono"; color: ${ACCENT}; }
.goose { position: absolute; left: 720px; top: 150px; width: 430px; }
.goose svg { display: block; width: 100%; height: auto; overflow: visible; }
.bubble { position: absolute; left: 860px; top: 70px; margin: 0; background: ${CARD};
  border: 4px solid ${INK}; border-radius: 22px; padding: 10px 22px 14px;
  font: 600 40px/1.15 "Bricolage Grotesque"; box-shadow: 0 5px 0 ${INK}; white-space: nowrap; }
.bubble::after { content: ""; position: absolute; left: 24px; bottom: -15px; width: 22px; height: 22px;
  background: ${CARD}; border-right: 4px solid ${INK}; border-bottom: 4px solid ${INK};
  transform: rotate(45deg) skew(8deg, 8deg); border-bottom-right-radius: 5px; }
</style></head><body>
<p class="kicker">Lexi · German for English speakers</p>
<h1>${footprints({ cls: 'q-open' })}Language is always in dialogue <span class="nw">with itself.${footprints({ closing: true, cls: 'q-close' })}</span></h1>
<p class="reply" lang="de">Sprache ist immer im Gespräch mit sich selbst.</p>
<p class="small">German vocabulary, A1 to C2.<br>Free, open source, no account.</p>
<div class="host">${host}/about</div>
<p class="bubble" lang="de">„Hallo!“</p>
<div class="goose">${gans({ pose: 'talk' })}</div>
</body></html>`;

const out = join(root, 'public', 'og-gans.jpg');
try {
  rasterise(html, out, W, H, 86);
  console.log(`og-gans: → ${out}`);
} catch (e) {
  console.error(`og-gans: ${(e as Error).message}`);
  process.exit(1);
}
