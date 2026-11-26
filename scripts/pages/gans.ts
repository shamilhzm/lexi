// Gans — Lexi's goose, drawn as SVG from one set of shapes (design/mascot/README.md).
//
//   node scripts/pages/gans.ts --write      (redraw design/mascot/*.svg)
//
// **Why a goose.** German calls quotation marks *Gänsefüßchen*, "little goose feet":
// every line of dialogue in German is written between her footprints. And *goose* and
// *Gans* are one word: English lost the n before s, as it did in *tooth · Zahn* and
// *five · fünf*. The mascot is a cognate pair. Language in dialogue with itself.
//
// **How she is built.** The Heft's materials and nothing else *(2026-11-26)*: the
// study card's white for her body, the Heft's blue-black ink for her one outline, the
// *die* highlighter for her wing (she is *die Gans*, and every noun in Lexi wears its
// article's highlighter), and her own coral for beak and feet. Every shape is drawn twice, ink first
// and then fill, so the outline runs once around the whole silhouette the way a
// sticker's does. No gradient, no texture: she has to survive 24 px.
//
// Pure: returns markup, touches nothing. `about.ts` inlines her; `--write` saves the
// pose sheet the README shows.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The values of src/index.css's light theme, spelled out because this file is
// pure and runs at build time: --color-txt, --color-card, --color-mark-die and
// --color-coral. The card box's charcoal, teal and coral went on 2026-11-26.
export const INK = '#16181f';
export const CARD = '#ffffff';
/** The *die* highlighter: her wing wears her article. */
export const DIE_PINK = '#ffc8de';
export const CORAL = '#ff9466';
/** The Heft's paper, for anything drawn behind her. */
export const PAPER = '#f4f1e8';

export type Pose = 'stand' | 'talk' | 'alarm' | 'tilt';

export interface GansOpts {
  pose?: Pose;
  /** Face left instead of right. */
  flip?: boolean;
  /** Accessible name. Omit for a decorative goose (aria-hidden). */
  label?: string;
  /** Extra class on the root <svg>. */
  cls?: string;
  /** Draw the ground shadow. */
  shadow?: boolean;
  /** Carry both beaks, closed and open, so a script can make her talk by toggling
   *  `.talking` on the root (`about.css`). */
  talk?: boolean;
}

// The silhouette, in a 240 × 240 box, facing right. Tail at the left, chest at the
// right, the neck rising from the front of the back like every goose's does.
const BODY = 'M24 86 C40 98 60 104 90 104 C118 104 140 110 156 124 C172 140 174 164 160 178 C146 192 110 196 84 188 C58 180 42 160 38 138 C35 122 28 104 24 86 Z';
const NECK = 'M146 140 C142 116 134 94 137 76 C139 64 144 58 153 54';
const WING = 'M46 110 C74 114 116 114 136 128 C150 138 148 156 134 162 C114 172 86 168 72 156 C62 148 55 132 50 116 Z';
const FEATHERS = 'M80 150 C94 157 112 157 126 150 M70 136 C88 143 110 143 128 137';
const HEAD = { cx: 160, cy: 50, r: 22 };

function beak(pose: Pose): string {
  // Coral, with its own ink so it reads as a separate object against the head.
  if (pose === 'talk' || pose === 'alarm') {
    const open = pose === 'alarm' ? 12 : 8;
    return `<path d="M166 37 L206 41 Q213 44 206 48 L168 51 Z" fill="${CORAL}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="M168 55 L201 ${54 + open} Q207 ${57 + open} 200 ${60 + open} L166 ${61 + open * 0.3} Z" fill="${CORAL}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
  }
  return `<path d="M166 39 L205 47 Q213 51.5 205 56 L166 63 Z" fill="${CORAL}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M182 52 L200 51.5" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>`;
}

function eye(pose: Pose): string {
  const r = pose === 'alarm' ? 5.2 : 4.2;
  return `<g class="gans-eye"><circle cx="166" cy="44" r="${r}" fill="${INK}"/><circle cx="${167.6}" cy="${42.4}" r="${pose === 'alarm' ? 1.8 : 1.4}" fill="${CARD}"/></g>`;
}

/** Feet that leave quotation marks: each foot is a small webbed comma. */
function legs(): string {
  const leg = (x1: number, x2: number) =>
    `<path d="M${x1} 184 L${x2} 212" stroke="${CORAL}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M${x2 - 3} 211 L${x2 + 15} 206 Q${x2 + 21} 211.5 ${x2 + 16} 217 L${x2 - 3} 217 Q${x2 - 7} 214 ${x2 - 3} 211 Z" fill="${CORAL}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  return `<g class="gans-legs">${leg(104, 100)}${leg(128, 130)}</g>`;
}

/** One goose. Inline it; it carries no ids, so any number can share a page. */
export function gans(o: GansOpts = {}): string {
  const pose = o.pose ?? 'stand';
  const a11y = o.label ? `role="img" aria-label="${o.label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"';
  const tilt = pose === 'tilt' ? ` transform="rotate(-18 ${HEAD.cx} ${HEAD.cy})"` : '';
  const alarmLines = pose === 'alarm'
    ? `<g stroke="${INK}" stroke-width="4" stroke-linecap="round"><path d="M146 16 L141 4"/><path d="M165 12 L168 -1"/><path d="M183 21 L194 13"/></g>`
    : '';
  const flip = o.flip ? ` transform="translate(240 0) scale(-1 1)"` : '';
  return `<svg class="gans${o.cls ? ' ' + o.cls : ''}" viewBox="0 -8 240 236" xmlns="http://www.w3.org/2000/svg" ${a11y}>` +
    `<g${flip}>` +
    (o.shadow === false ? '' : `<ellipse cx="118" cy="218" rx="58" ry="6" fill="${INK}" opacity=".12"/>`) +
    legs() +
    `<g class="gans-body">` +
      // ink: the one outline around the whole bird
      `<path d="${BODY}" fill="${INK}" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>` +
      `<path d="${NECK}" fill="none" stroke="${INK}" stroke-width="35" stroke-linecap="round"/>` +
      `<g class="gans-head"${tilt}><circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r + 4.5}" fill="${INK}"/></g>` +
      // fill: the index card
      `<path d="${BODY}" fill="${CARD}"/>` +
      `<path d="${NECK}" fill="none" stroke="${CARD}" stroke-width="26" stroke-linecap="round"/>` +
      // the coral beak, under the head's fill so it grows out of it
      `<g class="gans-head"${tilt}>` +
        (o.talk
          ? `<g class="gans-beak beak-closed">${beak(pose)}</g><g class="gans-beak beak-open">${beak('talk')}</g>`
          : `<g class="gans-beak">${beak(pose)}</g>`) +
        `<circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" fill="${CARD}"/>` +
        eye(pose) +
        `<circle cx="156" cy="59" r="5" fill="${CORAL}" opacity=".35"/>` +
      `</g>` +
      // the wing, in the die highlighter
      `<path d="${WING}" fill="${DIE_PINK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="${FEATHERS}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".3"/>` +
    `</g>` +
    alarmLines +
    `</g></svg>`;
}

/** The mark she leaves: a German opening quote, „ — two coral commas on the baseline.
 *  `closing` draws “, the pair that ends a German quotation, high on the line. */
export function footprints(o: { closing?: boolean; cls?: string } = {}): string {
  const comma = (x: number) =>
    `<path d="M${x} 6 C${x + 9} 6 ${x + 13} 13 ${x + 12} 20 C${x + 11} 30 ${x + 4} 37 ${x - 4} 40 L${x - 6} 36 C${x} 32 ${x + 3} 27 ${x + 2} 24 C${x - 6} 24 ${x - 9} 18 ${x - 8} 13 C${x - 7} 9 ${x - 4} 6 ${x} 6 Z" fill="${CORAL}"/>`;
  const g = comma(14) + comma(38);
  const t = o.closing ? ' transform="rotate(180 28 23)"' : '';
  return `<svg class="feet${o.cls ? ' ' + o.cls : ''}" viewBox="0 0 56 46" aria-hidden="true" focusable="false"><g${t}>${g}</g></svg>`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href && process.argv.includes('--write')) {
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'design', 'mascot');
  mkdirSync(out, { recursive: true });
  const poses: Pose[] = ['stand', 'talk', 'alarm', 'tilt'];
  for (const p of poses) writeFileSync(join(out, `gans-${p}.svg`), gans({ pose: p, label: `Gans, ${p}` }).replace('<svg ', '<svg width="480" height="472" ') + '\n');
  const sheet = poses.map((p, i) =>
    `<g transform="translate(${i * 250} 0)">${gans({ pose: p }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>`).join('');
  writeFileSync(join(out, 'sheet.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="472" viewBox="0 -8 1000 236"><rect x="0" y="-8" width="1000" height="236" fill="${PAPER}"/>${sheet}</svg>\n`);
  writeFileSync(join(out, 'footprints.svg'), footprints().replace('<svg ', '<svg width="112" height="92" xmlns="http://www.w3.org/2000/svg" ') + '\n');
  console.log(`gans: wrote ${poses.length + 2} files to ${out}`);
}
