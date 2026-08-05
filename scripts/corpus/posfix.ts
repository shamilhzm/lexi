// Give every card a part of speech.
//
// 370 cards ship with an empty `pos`, and the cost is not cosmetic. A card with no
// part of speech opts out of every rule that keys on one: it cannot be conjugated,
// so `setKnownVerbs` never sees it and the matcher cannot resolve its inflections;
// it cannot be offered a gender or plural drill; it is skipped by half the
// validators. The 2026-08-05 quality pass measured the downstream cost — **107 of
// them are matcher misses precisely because nothing can classify them** — which
// lands on the comprehension meter, whose whole claim is an honest number.
//
// ## Two rules, measured against the cards that already have a pos
//
// Neither is a guess. Both were validated against the 6,915 cards that carry a
// `pos` today, which is the only honest way to trust a heuristic on the 370 that
// do not:
//
//   article + single token        -> noun     4,056 hits, 99.5% agreement
//                                             (every disagreement is multiword,
//                                              which the single-token test excludes)
//   single token + gloss "to …"   -> verb     1,138 hits, 99.8% agreement
//                                             (both disagreements are directional
//                                              adverbs — wohin, hierher — excluded
//                                              by name below)
//
// Everything else is a decision, not a rule, and lives in `pos-rulings.tsv` in the
// manner of `case-rulings.tsv`: one line per card, with the reason, reviewable as a
// diff. A word like *viel* is genuinely arguable (adjective? adverb? Indefinit-
// pronomen?) and a script guessing at it would be inventing authority it does not
// have.
//
// Run: npm run corpus:posfix            (report only)
//      npm run corpus:posfix -- --write (apply)
import { readFileSync, existsSync } from 'node:fs';
import { PATHS } from './config.ts';
import { loadCorpus, writeJSON } from './lib.ts';
import type { Word } from '../../src/types.ts';

const RULINGS = PATHS.vocab.replace(/public\/data\/vocab\.json$/, 'scripts/corpus/pos-rulings.tsv');
const WRITE = process.argv.includes('--write');

const ARTICLE = /^(der|die|das)(\/(der|die|das))*\s+/i;
const bare = (t: string) => t.replace(ARTICLE, '');
const single = (w: Word) => !/\s/.test(bare(w.term));

/** Directional adverbs whose English gloss opens with "to". The only two words in
 *  the corpus that defeat the verb rule, so they are named rather than inferred. */
const NOT_VERBS = new Set(['wohin', 'hierher', 'dahin', 'woher']);

function inferred(w: Word): string | null {
  if (ARTICLE.test(w.term) && single(w)) return 'noun';
  if (single(w) && !NOT_VERBS.has(w.term.toLowerCase())
      && /^to\s/i.test(String(w.en ?? '').trim())) return 'verb';
  return null;
}

/** `term<TAB>pos<TAB>reason`, `#` comments. */
function loadRulings(): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(RULINGS)) return out;
  for (const line of readFileSync(RULINGS, 'utf8').split('\n')) {
    const row = line.trim();
    if (!row || row.startsWith('#')) continue;
    const [term, pos] = row.split('\t');
    if (term && pos) out.set(term.trim(), pos.trim());
  }
  return out;
}

const corpus = loadCorpus(PATHS.vocab);
const rulings = loadRulings();

let byRule = 0;
let byRuling = 0;
const unruled: Word[] = [];

for (const w of corpus) {
  if (w.kind !== 'word' || String(w.pos ?? '').trim()) continue;
  const ruled = rulings.get(w.term);
  const guess = inferred(w);
  // A ruling always wins: it is a human overriding the heuristic on purpose.
  const pos = ruled ?? guess;
  if (!pos) { unruled.push(w); continue; }
  if (ruled) byRuling++; else byRule++;
  if (WRITE) w.pos = pos;
}

console.log(`\npos backfill — ${corpus.filter((w) => w.kind === 'word' && !String(w.pos ?? '').trim()).length} cards without a part of speech\n`);
console.log(`  by rule    ${String(byRule).padStart(4)}   (article→noun, "to …"→verb)`);
console.log(`  by ruling  ${String(byRuling).padStart(4)}   (${RULINGS.split('/').pop()})`);
console.log(`  unruled    ${String(unruled.length).padStart(4)}`);

if (unruled.length) {
  console.log('\n  Add these to pos-rulings.tsv (term \\t pos \\t reason):');
  for (const w of unruled.slice(0, 40)) {
    console.log(`  ${w.term}\t\t# ${w.level} — ${String(w.en).slice(0, 44)}`);
  }
  if (unruled.length > 40) console.log(`  … and ${unruled.length - 40} more`);
}

if (WRITE) {
  writeJSON(PATHS.vocab, corpus);
  console.log(`\n  Wrote ${byRule + byRuling} part-of-speech tags into vocab.json.`);
  console.log('  Re-run `npm run corpus:split` — cards.json/detail.json are projections of it.\n');
} else {
  console.log('\n  Dry run. Pass --write to apply.\n');
}
