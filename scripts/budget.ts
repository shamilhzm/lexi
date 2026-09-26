// Size budget for a built `dist/` — run by CI after `npm run build`.
//
//   node scripts/budget.ts
//
// ## Why *(panel review, 2026-09-25)*
//
// Nothing stopped the boot growing. The backlog still said "706 KB (210 KB
// gzipped)" when the entry chunk measured 817,631 bytes raw and 248,836 gzipped
// (2026-09-25), and `cards.json` — fetched whole before the first word paints —
// grew with every corpus batch. Vite's "chunks larger than 500 kB" warning has
// printed on every build for months, which is the same as not printing.
//
// These are **ceilings, not targets**. This script measured, on 2026-09-26 (KB =
// 1024 bytes, gzip -9): entry 245.0, CSS 12.4, `cards.json` 420.3, boot set 740.0.
// The limits leave room for the panel branches that were in flight. Raising one is
// allowed — in its own commit, with the reason, so the number moves on purpose.
//
// Also fails if the persona seeder reached the bundle: `lib/devseed.ts` is gated
// on `import.meta.env.DEV` and CLAUDE.md asks for this grep by hand.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const KB = 1024;
const BUDGET = {
  entryJs: 280 * KB,      // the script index.html names
  css: 16 * KB,
  lazyChunk: 64 * KB,     // any other script (the Anthropic SDK chunk is ~50)
  cards: 480 * KB,        // data/cards.json — grows with the corpus
  boot: 820 * KB,         // entry + css + cards + sectors + freq: everything before first paint
};

const gz = (file: string) => gzipSync(readFileSync(file), { level: 9 }).length;
const kb = (n: number) => `${(n / KB).toFixed(1)} KB`;

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('budget: no dist/index.html — run `npm run build` first');
  process.exit(2);
}

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const named = (re: RegExp) => [...html.matchAll(re)].map((m) => m[1].split('/assets/')[1]).filter(Boolean);
const entry = named(/<script[^>]+src="([^"]+\/assets\/[^"]+\.js)"/g);
const styles = named(/<link[^>]+href="([^"]+\/assets\/[^"]+\.css)"/g);
const assets = readdirSync(join(DIST, 'assets'));

const rows: { what: string; size: number; limit: number }[] = [];
let boot = 0;
for (const f of entry) { const s = gz(join(DIST, 'assets', f)); boot += s; rows.push({ what: `entry ${f}`, size: s, limit: BUDGET.entryJs }); }
for (const f of styles) { const s = gz(join(DIST, 'assets', f)); boot += s; rows.push({ what: `css ${f}`, size: s, limit: BUDGET.css }); }
for (const f of assets.filter((a) => a.endsWith('.js') && !entry.includes(a))) {
  rows.push({ what: `chunk ${f}`, size: gz(join(DIST, 'assets', f)), limit: BUDGET.lazyChunk });
}
const cards = gz(join(DIST, 'data', 'cards.json'));
rows.push({ what: 'data/cards.json', size: cards, limit: BUDGET.cards });
boot += cards + gz(join(DIST, 'data', 'sectors.json')) + gz(join(DIST, 'data', 'freq.json'));
rows.push({ what: 'boot set (before first paint)', size: boot, limit: BUDGET.boot });

let failed = entry.length === 0 || styles.length === 0;
if (failed) console.error('budget: could not find the entry script or stylesheet in dist/index.html');
for (const r of rows) {
  const over = r.size > r.limit;
  if (over) failed = true;
  console.log(`${over ? 'OVER' : 'ok  '}  ${r.what.padEnd(44)} ${kb(r.size).padStart(10)}  / ${kb(r.limit)}`);
}

const seeded = assets.filter((a) => a.endsWith('.js') && readFileSync(join(DIST, 'assets', a), 'utf8').includes('devseed'));
if (seeded.length) { failed = true; console.error(`budget: devseed is in the production bundle (${seeded.join(', ')})`); }

if (failed) { console.error('budget: FAIL'); process.exit(1); }
console.log('budget: PASS');
