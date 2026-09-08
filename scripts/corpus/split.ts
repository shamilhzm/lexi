// Project the corpus into what the app boots on and what it can wait for.
//
// `vocab.json` is 5.25 MB and `src/main.tsx` awaits all of it before the first
// paint — including the two heaviest fields, which nothing on the boot path reads.
// Measured over the shipped file: **`ex` is 56.9% of field bytes, `def` 12.0%,
// `defDe` 1.2% — 70.1% together.** Splitting them out takes the blocking fetch from
// 1,060 KB gzipped to ~289 KB.
//
// ## Why by field and not by level
//
// The backlog (#49) proposes splitting the corpus by CEFR level. That cuts 7.4x for
// an A1 learner and nothing for anyone else, and it breaks a surprising amount:
// `checkCompletions()` would declare a B1 sector finished when only its A1 cards are
// loaded (completions are ratcheted and persisted — unrecoverable), `levelStats()`
// is whole-corpus by design, and `recordSnapshot`/`groupDeltas`/`knownHistory` scan
// every card to write a 60-day ring buffer, so a partial corpus produces fake
// negative deltas forever.
//
// Splitting by *field* avoids all of it: every card is still resident, so every
// count, every completion and every snapshot sees the same 7,389 cards it does
// today. Only the two fields nothing counts arrive late.
//
// ## What this writes, and what stays canonical
//
// `vocab.json` remains the source of truth — every `scripts/corpus/*` tool and eight
// test files read it by literal path. This emits two *projections* beside it:
//
//   cards.json        the same array, same order, minus ex/def/defDe  -> fetched at boot
//   detail/<L>.json   { id: { def, defDe, ex } }, id-sorted, one per   -> fetched per level,
//                     CEFR level                                          on demand
//
// ## Why detail *is* split by level, when cards is not
//
// The objection above — completions ratcheting on a partial corpus, `levelStats`
// counting a corpus that is not all there — is an objection about **cards**. Not one
// of those paths reads `ex`, `def` or `defDe`; that is the whole reason these three
// fields could be deferred in the first place. Detail is already *optional* by
// contract (`data/detail.ts`: a failed fetch leaves cards without examples, which
// every consumer guards for), and something optional can also be partial.
//
// Measured on the shipped files by this script: the single `detail.json` was
// **857 KB gz**, and by level it is A1 172 / A2 183 / B1 275 / B2 111 / C1 76 /
// C2 25 — 842 KB in total. Splitting costs 15 KB of compression, because six
// smaller windows each start cold. It saves an A1 learner 685 of them.
// The app fetches the level it is about to show, and nothing else.
//
// Being a projection rather than a rename is what lets this land with no app change
// at all, and `src/data/split.test.ts` asserts the two stay in step so an authoring
// pass cannot silently leave them stale.
//
// ## cleanExamples moves here
//
// `src/data/index.ts` scans all 7,389 cards' examples on every launch on every
// device to strip citation cruft. Doing it here upgrades the guarantee from "cleaned
// at load" to "the shipped bytes are already clean, and a test says so" — and takes
// the scan off the boot path.
//
// Run: npm run corpus:split
import { gzipSync } from 'node:zlib';
import { readFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { loadCorpus, writeJSON } from './lib.ts';
import { cleanExamples } from '../../src/lib/examples.ts';
import type { Example } from '../../src/types.ts';

const CARDS = PATHS.vocab.replace(/vocab\.json$/, 'cards.json');
const DETAIL_DIR = PATHS.vocab.replace(/vocab\.json$/, 'detail');
/** The shard a card's detail lives in. One per CEFR level, and `level` is on the
 *  boot file, so the app can name the shard it needs without fetching anything. */
const shardOf = (w: { level?: string }) => w.level || 'A1';

interface Detail { def?: string; defDe?: string; ex?: Example[] }

const corpus = loadCorpus(PATHS.vocab);

// Same array, same order — `cards.json` must stay a positional twin of `vocab.json`
// so the projection test can compare them field by field.
const cards = corpus.map((w) => {
  const { ex: _ex, def: _def, defDe: _defDe, ...rest } = w;
  return rest;
});

// Id-sorted, for the same reason `freq.ts` sorts: without it a reorder upstream
// rewrites every line and makes a one-word change unreviewable.
const detail: Record<string, Detail> = {};
const byId = new Map(corpus.map((w) => [w.id, w]));
let cleaned = 0;
for (const id of [...byId.keys()].sort()) {
  const w = byId.get(id)!;
  const ex = cleanExamples(w.ex ?? []);
  if (ex.length !== (w.ex?.length ?? 0)
      || ex.some((e, i) => e.de !== w.ex[i].de || e.en !== w.ex[i].en)) cleaned++;
  const row: Detail = {};
  // Absent fields are omitted rather than written as null — 7,389 `"defDe": null`
  // is bytes for nothing, and the loader materialises the defaults anyway.
  if (w.def) row.def = w.def;
  if (w.defDe) row.defDe = w.defDe;
  if (ex.length) row.ex = ex;
  detail[id] = row;
}

writeJSON(CARDS, cards);

// One file per level, id-sorted within it — `detail` was built in id order above,
// so partitioning preserves that and a one-word change stays a one-line diff.
const shards = new Map<string, Record<string, Detail>>();
for (const [id, row] of Object.entries(detail)) {
  const level = shardOf(byId.get(id)!);
  (shards.get(level) ?? shards.set(level, {}).get(level)!)[id] = row;
}
mkdirSync(DETAIL_DIR, { recursive: true });
// Anything the corpus no longer has a level for must not linger as a stale shard
// the app would happily fetch and attach.
for (const f of readdirSync(DETAIL_DIR)) {
  if (f.endsWith('.json') && !shards.has(f.replace(/\.json$/, ''))) rmSync(join(DETAIL_DIR, f));
}
for (const [level, rows] of [...shards].sort(([a], [b]) => a.localeCompare(b))) {
  writeJSON(join(DETAIL_DIR, `${level}.json`), rows);
}

const kb = (p: string) => readFileSync(p).length / 1024;
const gz = (p: string) => gzipSync(readFileSync(p)).length / 1024;
const row = (label: string, p: string) =>
  console.log(`  ${label.padEnd(14)} ${kb(p).toFixed(0).padStart(6)} KB   ${gz(p).toFixed(0).padStart(5)} KB gz`);

console.log(`\nSplit ${corpus.length} cards\n`);
console.log('                      raw        gzip');
row('vocab.json', PATHS.vocab);
row('cards.json', CARDS);
let detailGz = 0;
for (const [level] of [...shards].sort(([a], [b]) => a.localeCompare(b))) {
  const p = join(DETAIL_DIR, `${level}.json`);
  detailGz += gz(p);
  row(`detail/${level}.json`, p);
}
console.log(`  ${'detail total'.padEnd(14)} ${' '.repeat(6)}      ${detailGz.toFixed(0).padStart(5)} KB gz`);
console.log(`\n  boot fetch: ${gz(PATHS.vocab).toFixed(0)} KB gz -> ${gz(CARDS).toFixed(0)} KB gz`
  + ` (${((1 - gz(CARDS) / gz(PATHS.vocab)) * 100).toFixed(0)}% smaller)`);
{
  const a1 = gz(join(DETAIL_DIR, 'A1.json'));
  console.log(`  detail:     ${detailGz.toFixed(0)} KB gz across ${shards.size} levels`
    + ` — an A1 learner fetches ${a1.toFixed(0)} KB of it`);
}
if (cleaned) console.log(`  cleanExamples altered ${cleaned} card(s) on the way through`);
console.log('');
