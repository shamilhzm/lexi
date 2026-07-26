// Example-coverage audit — the sibling of coverage.ts for the field a learner
// actually reads. A card with one example is a word in one frame; two is the
// minimum from which a learner can generalise, so that is what this measures.
//
//   node scripts/corpus/examples.ts            # per-level table
//   node scripts/corpus/examples.ts --list     # also list the thin cards
//
// Cards under two examples are the authoring queue: feed them to
// make-input.ts, author against scripts/authoring/card-authoring.md, apply with
// apply-authored.ts. `corpus:validate` fails at zero and warns under two.
import { PATHS } from './config.ts';
import { readJSON } from './lib.ts';
import type { Word } from '../../src/types.ts';

const list = process.argv.includes('--list');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const words = readJSON<Word[]>(PATHS.vocab).filter((w) => w.kind === 'word');

const pad = (s: string | number, n: number) => String(s).padStart(n);
let totalThin = 0, totalNone = 0;

console.log('level   cards    ex=0    ex=1   ex>=2   mean   thin%');
for (const level of LEVELS) {
  const at = words.filter((w) => w.level === level);
  if (!at.length) continue;
  const none = at.filter((w) => !w.ex?.length).length;
  const one = at.filter((w) => w.ex?.length === 1).length;
  const mean = at.reduce((n, w) => n + (w.ex?.length ?? 0), 0) / at.length;
  totalThin += none + one; totalNone += none;
  console.log(
    `${level.padEnd(6)}${pad(at.length, 6)}${pad(none, 8)}${pad(one, 8)}${pad(at.length - none - one, 8)}` +
    `${pad(mean.toFixed(2), 7)}${pad((((none + one) / at.length) * 100).toFixed(1) + '%', 8)}`,
  );
}
console.log(`\n${words.length} word cards · ${totalThin} under two examples · ${totalNone} with none`);

if (list) {
  const thin = words.filter((w) => (w.ex?.length ?? 0) < 2);
  for (const w of thin) console.log(`  [${w.level}] ${w.id}  (${w.ex?.length ?? 0})  ${w.en}`);
}

// Zero-example cards are the hard failure the pipeline gates on; being merely
// thin is reported, not fatal.
if (totalNone > 0) { console.log('\nFAIL — cards with no example at all.'); process.exit(1); }
