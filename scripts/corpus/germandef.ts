// Move German definitions out of the English field (persona B2 #38, and the
// `german` class of corpus:definitions).
//
// 367 cards ship a German definition in `def` — real ones, from German
// Wiktionary: "rundliche Frucht des Apfelbaums mit Schale, Fruchtfleisch und
// Kerngehäuse". That is exactly what a B2+ learner wants and exactly what an A1
// learner cannot read, and 318 of the 367 sit at A1–B1 on an app whose whole
// premise is an English base. The text is not the problem; the field is.
//
// So this moves it to `defDe` rather than deleting it. The card then has no
// English definition until one is authored — which is honest, measurable, and
// better than printing a paragraph the reader cannot parse. The vacated cards
// join the corpus:definitions queue automatically.
//
//   node scripts/corpus/germandef.ts [--write]
import { PATHS } from './config.ts';
import { readJSON, writeJSON, isGermanDefinition, type Word } from './lib.ts';

const write = process.argv.includes('--write');

const vocab = readJSON<Word[]>(PATHS.vocab);
const moved: Word[] = [];
const skipped: string[] = [];

for (const w of vocab) {
  if (w.kind !== 'word' || !w.def) continue;
  if (!isGermanDefinition(w.def, w.en ?? '')) continue;
  // Never overwrite an existing German definition with a different one.
  if (w.defDe) { skipped.push(`${w.id}: already has a defDe`); continue; }
  w.defDe = w.def;
  w.def = null;
  moved.push(w);
}

const byLevel: Record<string, number> = {};
for (const w of moved) byLevel[w.level] = (byLevel[w.level] ?? 0) + 1;

console.log(`Moved ${moved.length} German definition(s) from def → defDe`);
console.log('  by level: ' + Object.entries(byLevel).map(([l, n]) => `${l} ${n}`).join(' · '));
console.log(`  ${moved.filter((w) => ['A1', 'A2', 'B1'].includes(w.level)).length} of them were below B2, where the reader could not use them.`);
for (const s of skipped) console.log(`  skip ${s}`);
console.log('\n  Sample:');
for (const w of moved.slice(0, 5)) console.log(`    [${w.level}] ${w.term} → defDe: ${(w.defDe ?? '').slice(0, 72)}…`);
console.log(`\n  ${moved.length} card(s) now have no English def and join the corpus:definitions queue.`);

if (write) { writeJSON(PATHS.vocab, vocab); console.log(`\nWrote ${PATHS.vocab}`); }
else console.log('\nDry run — re-run with --write.');
