// Build the shipped pictogram files from reviewed batches.
//
//   node scripts/corpus/picto-build.ts
//
// Input: `scripts/corpus/picto/<batch>.jsonl` — one line per card, either
// `{"verdict":"svg","inner":…}` or `{"verdict":"skip","code":…}` (the grammar,
// DESIGN §13 draft, panel review 2026-09-25) — and `<batch>.qa.json`, the blind
// recognition record for that batch.
//
// Output: `public/data/picto/<level>.json`, `{ id: inner }`, lazy-loaded per level
// by `components/Picto.tsx`. A pictogram ships only if **all three** hold:
//
//   1. `validatePicto` passes — the same allowlist the app re-runs before render;
//   2. the card id still exists in the corpus;
//   3. blind recognition passed: a model that never saw the word named it (a guess
//      shares a stem with the gloss or a synonym), or a reviewer accepted it with a
//      written reason in the batch's `accept` map.
//
// Anything else is reported and left out. A missing pictogram costs nothing; a
// wrong one teaches a wrong meaning — which is also why the pictograms carry no
// colour: the page decides that, and it never paints one on a test surface.
//
// Licence: the pictograms are original line drawings authored for Lexi and are
// dedicated CC0 1.0 (see ATTRIBUTIONS.md).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { validatePicto } from '../../src/lib/picto.ts';

const DIR = join('scripts', 'corpus', 'picto');
const OUT = join('public', 'data', 'picto');

interface Row { id: string; verdict: 'svg' | 'skip'; inner?: string; code?: string }
interface QaFile { accept?: Record<string, string>; results: { id: string; guesses: string[] }[] }
interface Card { id: string; en: string; syn?: string[]; level: string }

const STOP = new Set(['to', 'a', 'an', 'the', 'of', 'and', 'or', 'with', 'on', 'in', 'from', 'side', 'seen']);
const words = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z]+/).filter((w) => w && !STOP.has(w));
const stem = (w: string) => w.replace(/(ing|es|s|ed)$/, '');

/** Did a blind guess name the card? Shared stem with the gloss or a synonym. */
export function recognised(card: Pick<Card, 'en' | 'syn'>, guesses: string[]): boolean {
  const target = new Set([...words(card.en), ...(card.syn ?? []).flatMap(words)].map(stem));
  return guesses.flatMap(words).map(stem).some((g) => target.has(g));
}

const cards = new Map((JSON.parse(readFileSync(PATHS.vocab, 'utf8')) as Card[]).map((c) => [c.id, c]));
const byLevel = new Map<string, Record<string, string>>();
const report = { shipped: 0, skipped: 0, invalid: [] as string[], unrecognised: [] as string[], gone: [] as string[] };

for (const f of readdirSync(DIR).filter((n) => n.endsWith('.jsonl')).sort()) {
  const qaPath = join(DIR, f.replace(/\.jsonl$/, '.qa.json'));
  const qa: QaFile = existsSync(qaPath) ? JSON.parse(readFileSync(qaPath, 'utf8')) : { results: [] };
  const guesses = new Map(qa.results.map((r) => [r.id, r.guesses]));
  for (const line of readFileSync(join(DIR, f), 'utf8').split('\n').filter(Boolean)) {
    const row = JSON.parse(line) as Row;
    if (row.verdict !== 'svg' || !row.inner) { report.skipped++; continue; }
    const card = cards.get(row.id);
    if (!card) { report.gone.push(row.id); continue; }
    const errs = validatePicto(row.inner);
    if (errs.length) { report.invalid.push(`${row.id}: ${errs[0]}`); continue; }
    const ok = qa.accept?.[row.id] || recognised(card, guesses.get(row.id) ?? []);
    if (!ok) { report.unrecognised.push(`${row.id} (${(guesses.get(row.id) ?? []).join(', ') || 'no QA'})`); continue; }
    const lvl = byLevel.get(card.level) ?? {};
    lvl[row.id] = row.inner;
    byLevel.set(card.level, lvl);
    report.shipped++;
  }
}

mkdirSync(OUT, { recursive: true });
// The index lets the app fetch only the levels that exist — a 404 per missing
// level would be noise in every learner's console.
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ levels: [...byLevel.keys()].sort(), count: report.shipped }) + '\n');
for (const [level, map] of byLevel) {
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(OUT, `${level}.json`), JSON.stringify(sorted) + '\n');
}
console.log(`pictograms: ${report.shipped} shipped · ${report.skipped} skipped by verdict`);
for (const [k, v] of Object.entries({ invalid: report.invalid, unrecognised: report.unrecognised, gone: report.gone })) {
  if (v.length) console.log(`  ${k} (${v.length}): ${v.join(' · ')}`);
}
for (const [level, map] of [...byLevel].sort()) console.log(`  ${level}: ${Object.keys(map).length}`);
