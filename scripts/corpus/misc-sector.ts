// Empty the `Miscellaneous` sector.
//
// 501 cards — 7.7% of the corpus — sat in a sector whose name means *nobody
// looked*. It was the second-largest tile on the treemap, it fed
// `weakestSectors()` (so it decided which fresh vocabulary a learner met next),
// and it was the one deck in the app a teacher could not use for anything.
//
// `misc-sectors.tsv` is the authored half: one line per lemma, naming a sector
// that already exists. This is the mechanical half.
//
// ## Why this is a separate script from `corpus:resector`
//
// `resector.ts` deliberately only moves **pipeline-added** cards, so hand-curated
// ones are never disturbed by a bulk re-run. That guard is right in general and
// exactly wrong here: **293 of these 501 are hand-curated**, and being
// hand-curated is not what gave them a good sector — they were curated into the
// bin. So this script ignores provenance and buys the safety back a different
// way: **it will only ever move a card whose field is `Miscellaneous`.** It
// cannot touch anything else, whatever the TSV says.
//
// A card's id does not contain its field, so none of this is a schedule
// migration — see `sector-merge.ts` for the same reasoning.
//
//   npm run corpus:misc-sector            # dry run
//   npm run corpus:misc-sector -- --write # apply
import { readFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { loadCorpus, loadSectors, writeJSON, type Word } from './lib.ts';
import { rebuildSectors } from './sectors.ts';

const SOURCE = 'Miscellaneous';
const MAP_PATH = 'scripts/corpus/misc-sectors.tsv';

const write = process.argv.includes('--write');
const vocab = loadCorpus(PATHS.vocab) as Word[];
const sectors = loadSectors(PATHS.sectors);
const known = new Set(sectors.map((s) => s.name));

const map = new Map<string, string>();
for (const line of readFileSync(MAP_PATH, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const [lemma, field] = t.split('\t');
  if (lemma && field) map.set(lemma.trim(), field.trim());
}

// Every target must exist. A typo here would mint a one-card sector and put a
// stray tile on the map, which is the defect this whole pass is undoing.
const unknown = [...new Set([...map.values()].filter((f) => !known.has(f)))].sort();
if (unknown.length) {
  console.error(`✗ ${unknown.length} target sector(s) do not exist:`);
  for (const u of unknown) console.error(`  ${u}`);
  process.exit(1);
}
if (map.has(SOURCE)) { console.error(`✗ the map sends a card back to ${SOURCE}`); process.exit(1); }

const key = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();

const moved: Record<string, number> = {};
const unmapped: string[] = [];
let changed = 0;
for (const w of vocab) {
  if (w.kind !== 'word' || w.field !== SOURCE) continue;   // the safety rail
  const to = map.get(key(w.term));
  if (!to) { unmapped.push(w.term); continue; }
  moved[to] = (moved[to] ?? 0) + 1;
  w.field = to;
  changed++;
}

const nextSectors = rebuildSectors(vocab, sectors);
const stillMisc = nextSectors.find((s) => s.name === SOURCE)?.count ?? 0;

console.log(`Re-sectored ${changed} card(s) out of ${SOURCE} · ${unmapped.length} left unmapped`);
const rows = Object.entries(moved).sort((a, b) => b[1] - a[1]);
for (const [k, n] of rows) console.log(`  ${k}: ${n}`);
console.log(`\ninto ${rows.length} sector(s) · ${SOURCE} now holds ${stillMisc}`);
if (unmapped.length) {
  console.log(`\nunmapped (still ${SOURCE}):`);
  for (const u of unmapped.slice(0, 40)) console.log(`  ${u}`);
}

if (!write) { console.log('\nDry run — re-run with --write to apply.'); process.exit(0); }
writeJSON(PATHS.vocab, vocab);
writeJSON(PATHS.sectors, nextSectors);
console.log('\nWrote public/data/{vocab,sectors}.json');
console.log('  Next: npm run corpus:split && npm run corpus:validate && npm test');
