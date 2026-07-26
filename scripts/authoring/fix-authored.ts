// Apply a hand-authored *correction* batch to public/data/vocab.json.
//
// A sibling of apply-authored.ts rather than a flag on it, and deliberately so:
// apply-authored is fill-only — it never overwrites a non-empty field — which is
// exactly right for backfilling and useless for repair. Keeping them separate means
// the safe tool stays safe and this one carries its own guard.
//
// The guard is optimistic concurrency. Every row states the value it expects to
// find; a mismatch is refused, not silently applied. So a batch can be re-run, two
// batches can overlap, and a stale batch authored against last week's corpus cannot
// clobber a fix that landed since.
//
// Batches come from `npm run corpus:examples -- --write`. No network, no model.
//
//   node scripts/authoring/fix-authored.ts <batch.json> --dry
//   node scripts/authoring/fix-authored.ts <batch.json>
import { readFileSync } from 'node:fs';
import { PATHS } from '../corpus/config.ts';
import { readJSON, writeJSON } from '../corpus/lib.ts';
import { cleanExample } from '../../src/lib/examples.ts';
import type { Word } from '../../src/types.ts';

interface Row {
  id: string;
  at: number;
  siblings?: number;
  expect: { de: string; en: string };
  /** The replacement. Empty `de` with `delete` unset means "not authored yet". */
  de?: string;
  en?: string;
  delete?: boolean;
}

const [batchPath, ...rest] = process.argv.slice(2);
const dry = rest.includes('--dry');
if (!batchPath) {
  console.error('Usage: node scripts/authoring/fix-authored.ts <batch.json> [--dry]');
  process.exit(1);
}

const batch = JSON.parse(readFileSync(batchPath, 'utf8')) as { rows: Row[] } | Row[];
const rows = Array.isArray(batch) ? batch : batch.rows;
const vocab = readJSON<Word[]>(PATHS.vocab);
const byId = new Map(vocab.map((c) => [c.id, c]));

const norm = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
let applied = 0, deleted = 0, pending = 0;
const refused: string[] = [];
const refuse = (row: Row, why: string) => refused.push(`${row.id}#${row.at}: ${why}`);

// Deletions are applied last and in descending index order, so removing ex[1]
// can't shift the meaning of a later row that targets ex[2] of the same card.
const deletions: Row[] = [];

for (const row of rows) {
  const card = byId.get(row.id);
  if (!card) { refuse(row, 'no such card id'); continue; }
  const ex = card.ex?.[row.at];
  if (!ex) { refuse(row, `no example at index ${row.at}`); continue; }

  // The guard.
  if (norm(ex.de) !== norm(row.expect?.de ?? '') || norm(ex.en) !== norm(row.expect?.en ?? '')) {
    refuse(row, 'expect no longer matches the corpus (already fixed, or a stale batch)');
    continue;
  }

  if (row.delete) {
    if ((card.ex?.length ?? 0) < 2) { refuse(row, 'refusing to delete a card’s only example'); continue; }
    deletions.push(row);
    continue;
  }

  if (!norm(row.de ?? '')) { pending++; continue; } // not authored yet — silent

  const next = { de: norm(row.de!), en: norm(row.en ?? ''), lvl: ex.lvl };
  // Hold the replacement to the same standard the runtime guard enforces, so an
  // authored fix can't reintroduce the class of defect it was written to remove.
  const checked = cleanExample(next);
  if (!checked || checked.de !== next.de || checked.en !== next.en) {
    refuse(row, 'replacement would itself be sanitized (newline, citation text, or duplicated translation)');
    continue;
  }
  card.ex[row.at] = next;
  applied++;
}

for (const row of deletions.sort((a, b) => b.at - a.at)) {
  byId.get(row.id)!.ex.splice(row.at, 1);
  deleted++;
}

console.log(`\n${batchPath}`);
console.log(`  ${applied} replaced · ${deleted} deleted · ${pending} not authored yet · ${refused.length} refused`);
if (refused.length) {
  console.log('\n  Refused:');
  for (const r of refused) console.log(`    ${r}`);
}

if (!applied && !deleted) {
  console.log('\nNothing to write.\n');
  process.exit(refused.length ? 1 : 0);
}

if (dry) {
  console.log('\nDry run — re-run without --dry to write.\n');
} else {
  writeJSON(PATHS.vocab, vocab);
  console.log(`\n✓ wrote ${PATHS.vocab}`);
  console.log('  Next: npm run corpus:validate -- --strict && npm test\n');
}
