// Which inflected forms does the matcher fail to resolve, and what wins instead?
//
// `corpus:validate` already reports a **reader probe**: sample 200 nouns, build the
// plural, and check `annotate()` returns that card. It prints a rate — "plural
// 196/200" — and a rate is the right shape for a regression gate and the wrong
// shape for a diagnosis. Four failures out of two hundred could be four odd words
// or one systematic hole, and the line cannot tell you which.
//
// This runs the same check over the **whole** corpus rather than a sample, and
// prints what the matcher returned instead of the card. That second column is the
// finding: a form that resolves to *nothing* is a conjugator gap, and a form that
// resolves to *another card* is a homograph the matcher is silently preferring.
//
// Found this way on 2026-08-29, while authoring the Schritte plus Neu 6 batch:
//
//   die Lüge   → "Lügen"     resolves to the verb `lügen`
//   die Frage  → "Fragen"    resolves to the verb `fragen`   ← a shipped A1 card
//   das Gebiet → "Gebieten"  resolves to the verb `gebieten`
//
// The authoring gate refuses an example when the matcher cannot prove the headword
// is in it, so the effect on a card author is a **false reject on correct German**,
// which LESSONS names as the worst kind of gate failure: it invites you to write a
// worse sentence. The effect on a learner is quieter and larger — the reader and
// the comprehension meter under-report every noun whose plural spells a verb.
//
// Run: `npm run corpus:matcher-gaps`  ·  `--dative` also tries the dative plural,
// which is where `die Häuser` → `Häusern` lives.
import { PATHS } from './config.ts';
import { loadCorpus, primeApp } from './lib.ts';
import type { Word } from '../../src/types.ts';

const DATIVE = process.argv.includes('--dative');
const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();

/** The dative plural adds -n unless the plural already ends in -n or -s. */
const dativePlural = (pl: string) => (/[ns]$/.test(pl) ? pl : `${pl}n`);

async function main() {
  const corpus = loadCorpus(PATHS.vocab) as Word[];
  const matcher = await primeApp(corpus);
  const words = corpus.filter((w) => w.kind === 'word');

  type Miss = { term: string; form: string; got: string; kind: string };
  const misses: Miss[] = [];
  let tested = 0;

  const check = (w: Word, form: string, kind: string) => {
    if (!form) return;
    tested++;
    const seg = matcher.annotate(form)[0];
    if (seg?.word?.id === w.id) return;
    misses.push({ term: w.term, form, kind, got: seg?.word ? seg.word.term : '—' });
  };

  for (const w of words) {
    if (w.pos === 'noun' && w.plural && w.plural.startsWith('die ')) {
      const pl = stripArticle(w.plural);
      check(w, pl, 'plural');
      if (DATIVE) check(w, dativePlural(pl), 'dative plural');
    }
    if (w.pos === 'adjective') check(w, `${stripArticle(w.term).toLowerCase()}e`, 'adjective -e');
  }

  const stolen = misses.filter((m) => m.got !== '—');
  const nothing = misses.filter((m) => m.got === '—');
  const pct = (n: number) => ((100 * n) / tested).toFixed(2);

  console.log(`forms tested ${tested} · unresolved ${misses.length} (${pct(misses.length)}%)`);
  console.log(`  resolved to another card  ${stolen.length}  ← homograph the matcher prefers`);
  console.log(`  resolved to nothing       ${nothing.length}  ← the conjugator has no path`);

  const byKind = new Map<string, number>();
  for (const m of misses) byKind.set(m.kind, (byKind.get(m.kind) ?? 0) + 1);
  console.log(`  by shape: ${[...byKind].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ')}`);

  console.log('\n--- taken by another card (worst class: the learner is told the wrong word) ---');
  for (const m of stolen.slice(0, 40)) console.log(`  ${m.form.padEnd(24)} ${m.term.padEnd(26)} → ${m.got}   [${m.kind}]`);
  if (stolen.length > 40) console.log(`  … and ${stolen.length - 40} more`);

  console.log('\n--- resolved to nothing ---');
  for (const m of nothing.slice(0, 25)) console.log(`  ${m.form.padEnd(24)} ${m.term}   [${m.kind}]`);
  if (nothing.length > 25) console.log(`  … and ${nothing.length - 25} more`);

  // A diagnosis, not a gate. `corpus:validate` owns the threshold.
}

main();
