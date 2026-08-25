// Repair a grammar exercise **in place**.
//
// A sibling of `corpus:gex` for the same reason `fix-authored.ts` is a sibling of
// `apply-authored.ts`: gex is **append-only**, which is exactly right for adding
// questions and useless for correcting one that is wrong.
//
// Append-only exists because `lib/grammar.ts` mints exercise ids as
// `gex:<level>:<pointIndex>:<exerciseIndex>` — positions, not names — and every
// learner's FSRS schedule is keyed on them. So this tool may rewrite an item's
// contents and may **never** move, insert or remove one: it refuses any batch that
// would change a point's exercise count, and it writes each row back at the index
// it read it from. The id survives; only what the id points at gets better.
//
// The guard is optimistic concurrency, as everywhere else in authoring: each row
// states the prompt it expects to find, and a mismatch is refused rather than
// applied. A stale batch cannot clobber a fix that landed since.
//
//   node scripts/authoring/fix-exercises.ts <batch.json> [--dry]
import { readFileSync } from 'node:fs';
import { PATHS } from '../corpus/config.ts';
import { readJSON, writeJSON } from '../corpus/lib.ts';
import type { GExercise, GrammarByLevel } from '../../src/lib/grammar.ts';
import type { CEFR } from '../../src/types.ts';

interface Row {
  level: CEFR;
  title: string;
  /** Index within the point. Never changes — see the header. */
  at: number;
  expect: { prompt: string };
  prompt?: string;
  options?: string[];
  answer?: number;
  accept?: string[];
  explain?: string;
  /** Why the item was wrong. Required: a repair without a reason is a rewrite. */
  why: string;
}

const [batchPath, ...rest] = process.argv.slice(2);
const dry = rest.includes('--dry');
if (!batchPath) {
  console.error('usage: node scripts/authoring/fix-exercises.ts <batch.json> [--dry]');
  process.exit(1);
}

const rows = JSON.parse(readFileSync(batchPath, 'utf8')) as Row[];
const grammar = readJSON<GrammarByLevel>(PATHS.grammar);
const before = Object.fromEntries(
  Object.entries(grammar).map(([lv, pts]) => [lv, pts.map((p) => p.exercises?.length ?? 0)]));

const norm = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
let applied = 0;
const refused: string[] = [];

for (const row of rows) {
  const where = `${row.level} · ${row.title} #${row.at}`;
  const point = (grammar[row.level] ?? []).find((p) => p.title === row.title);
  if (!point) { refused.push(`${where}: no such point`); continue; }
  const ex: GExercise | undefined = point.exercises?.[row.at];
  if (!ex) { refused.push(`${where}: no exercise at that index`); continue; }
  if (norm(ex.prompt) !== norm(row.expect.prompt)) {
    refused.push(`${where}: expect no longer matches (already fixed, or a stale batch)`);
    continue;
  }
  if (!row.why?.trim()) { refused.push(`${where}: no reason given`); continue; }

  const next: GExercise = { ...ex };
  if (row.prompt) next.prompt = norm(row.prompt);
  if (row.options) next.options = row.options;
  if (row.answer != null) next.answer = row.answer;
  if (row.accept) next.accept = row.accept;
  if (row.explain) next.explain = norm(row.explain);

  // The answer must still point at an option that exists.
  if (next.options && (next.answer == null || next.answer < 0 || next.answer >= next.options.length)) {
    refused.push(`${where}: answer index ${next.answer} is outside ${next.options.length} options`);
    continue;
  }
  // A repaired item may not silently become a different kind of question.
  if (next.kind !== ex.kind) { refused.push(`${where}: may not change kind`); continue; }
  // Duplicate options make an item unanswerable, and a generated pool can produce
  // them once the answer is rewritten by hand.
  if (next.options && new Set(next.options).size !== next.options.length) {
    refused.push(`${where}: options contain a duplicate`);
    continue;
  }
  point.exercises[row.at] = next;
  applied++;
}

// The structural invariant, checked rather than trusted.
for (const [lv, pts] of Object.entries(grammar)) {
  pts.forEach((p, i) => {
    if ((p.exercises?.length ?? 0) !== before[lv][i]) {
      console.error(`✗ ${lv} · ${p.title}: exercise count moved ${before[lv][i]} → ${p.exercises.length}`);
      process.exit(1);
    }
  });
}

console.log(`\n${batchPath}`);
console.log(`  ${applied} repaired · ${refused.length} refused · every point's exercise count unchanged`);
for (const r of refused) console.log(`    ${r}`);
if (!applied) { console.log('\nNothing to write.\n'); process.exit(refused.length ? 1 : 0); }
if (dry) console.log('\nDry run — re-run without --dry to write.\n');
else {
  writeJSON(PATHS.grammar, grammar);
  console.log(`\n✓ wrote ${PATHS.grammar}\n  Next: npm run corpus:validate && npm test\n`);
}
