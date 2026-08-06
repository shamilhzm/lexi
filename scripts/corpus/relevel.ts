// Move a grammar point to the level that actually tests it.
//
// Four topics Goethe A1 / Start Deutsch 1 examines — Modalverben, trennbare
// Verben, Imperativ and Perfekt — were filed at A2. The content is good and
// pitched at A1 depth (haben/sein + participle; the six modals; aufstehen; Mach!),
// but the CEFR filter scopes what a learner is *shown*, so an A1-scoped learner
// never met any of them. Netzwerk and Menschen both introduce all four in A1.
//
// The move is strictly additive in exposure: the filter is cumulative (A1..
// placement), so an A2 learner still sees everything they saw before. Only the A1
// learner gains.
//
// ## Why this is safe now and was not last week
//
// Exercise cards were keyed positionally (`gex:<level>:<pointIndex>:<xi>`), so
// moving a point between levels shifted every later index in *both* levels and
// silently re-attached learners' schedules to different exercises. Ids are keyed
// on the title now, so a level move changes exactly one segment of the id and the
// mapping is deterministic — which is what makes the migration below three lines
// of `ID_MAP` per point rather than a reconstruction.
//
// Emits the ID_MAP entries to paste into `src/data/idmap.ts`; it does not write
// them, because that file is a permanent record of every id the app has ever
// retired and belongs under review.
//
// Run: npm run corpus:relevel            (report + emit the id map)
//      npm run corpus:relevel -- --write (apply to grammar.json + vocab.json)
import { PATHS } from './config.ts';
import { loadCorpus, readJSON, writeJSON } from './lib.ts';
import type { Word, CEFR } from '../../src/types.ts';
import type { GrammarByLevel } from '../../src/lib/grammar.ts';

const WRITE = process.argv.includes('--write');

/** title → the level it moves to. Each entry is a pedagogical decision. */
const MOVES: { title: string; from: CEFR; to: CEFR; why: string }[] = [
  { title: 'Modalverben', from: 'A2', to: 'A1', why: 'Goethe A1 tests können/möchten/müssen; the point teaches position-2 + infinitive-at-end, which is A1 word order' },
  { title: 'Trennbare Verben', from: 'A2', to: 'A1', why: 'aufstehen, einkaufen, ankommen are A1 vocabulary — the split is met before it is named' },
  { title: 'Imperativ', from: 'A2', to: 'A1', why: 'Start Deutsch 1 examines Mach! / Machen Sie!' },
  { title: 'Perfekt', from: 'A2', to: 'A1', why: 'the spoken past is A1 in Netzwerk and Menschen, and Goethe A1 tests it; the point stays at haben/sein + participle' },
];

// `grammar-sections.ts` hardcodes this path too; PATHS has no entry for it.
const GRAMMAR = 'public/data/grammar.json';
const grammar = readJSON<GrammarByLevel>(GRAMMAR);
const vocab = loadCorpus(PATHS.vocab);

const idMap: string[] = [];
let moved = 0;

for (const m of MOVES) {
  const i = (grammar[m.from] ?? []).findIndex((p) => p.title === m.title);
  if (i < 0) { console.log(`  skip  ${m.from} · ${m.title} — not there (already moved?)`); continue; }
  const [point] = grammar[m.from].splice(i, 1);
  // Appended, not inserted: the title keying makes insertion safe now, but the end
  // of the level is still where new material belongs, and it keeps the diff small.
  grammar[m.to].push(point);

  // The point's own card, as the vocabulary→grammar loop grades it.
  const card = vocab.find((w) => w.id === `gram:${m.from}:${m.title}`);
  if (card) { card.id = `gram:${m.to}:${m.title}`; card.level = m.to; }

  idMap.push(`  'gram:${m.from}:${m.title}': 'gram:${m.to}:${m.title}',`);
  for (let xi = 0; xi < point.exercises.length; xi++) {
    idMap.push(`  'gex:${m.from}:${m.title}:${xi}': 'gex:${m.to}:${m.title}:${xi}',`);
  }
  moved++;
  console.log(`  move  ${m.from} → ${m.to}  ${m.title}  (${point.exercises.length} exercises)\n        ${m.why}`);
}

console.log(`\n  ${moved} point(s) moved.`);
if (idMap.length) {
  console.log(`\n  Add to src/data/idmap.ts so existing schedules follow:\n`);
  console.log(idMap.join('\n'));
}

if (WRITE && moved) {
  writeJSON(GRAMMAR, grammar);
  writeJSON(PATHS.vocab, vocab);
  console.log('\n  Wrote grammar.json + vocab.json.');
  console.log('  Then: update the gram: references in views/Fundamentals.tsx, and re-run corpus:split.\n');
} else if (!WRITE) {
  console.log('\n  Dry run. Pass --write to apply.\n');
}
