// npm run corpus:textcov -- <file.txt> [more.txt] [--lemmas=<list.txt>]
//
// "Is every word in *this* text in Lexi?" — for a page the owner hands over: a
// course-book scan transcribed, an article, a PDF's text layer.
//
// `tokencov` answers the same question for a frequency list and `corpus:coverage`
// for a word list. Neither takes running text, and running text is what a learner
// actually brings: the question is never "is *aussortieren* a card" but "will this
// sentence light up". So every token goes through the app's own matcher — the same
// one the reader and the text scanner use — and lands in exactly one bucket:
//
//   card        resolves to a card (inflections and split separable verbs included)
//   compound    only decomposable — the head is a card, the compound is not taught
//   function    handled, not taught (articles, pronouns, …)
//   entity      a proper noun, excluded on purpose
//   dark        nothing — a word Lexi cannot show
//
// `--lemmas` checks a list of headwords directly, one per line (`sich` and a
// trailing government are allowed). Use it for word lists and verb tables, where
// the lemma is the point and there is no sentence to resolve it in.
//
// The input text is NOT committed with this tool: it is usually someone else's
// copyright. Keep it in a scratch directory and pass the path.
import './shim.ts';
import { readFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { loadCorpus, primeApp, lookupLemma } from './lib.ts';
import { government } from '../../src/lib/matcher.ts';
import type { Word } from '../../src/types.ts';

const args = process.argv.slice(2);
const lemmaArg = args.find((a) => a.startsWith('--lemmas='))?.slice('--lemmas='.length);
const files = args.filter((a) => !a.startsWith('--'));
if (!files.length && !lemmaArg) {
  console.error('usage: corpus:textcov -- <file.txt> [...] [--lemmas=<list.txt>]');
  process.exit(1);
}

// The app filters `kind: 'grammar'` at load (src/data/index.ts); measure what it ships.
const corpus = loadCorpus(PATHS.vocab).filter((w) => w.kind !== 'grammar');
const matcher = primeApp(corpus);

/** The bare lemma a card teaches: no article, sense note, `sich` or government. */
const bare = (w: Word) => (government(w.term)?.lemma ?? lookupLemma(w.term)).toLowerCase();
const byLemma = new Map<string, Word[]>();
for (const w of corpus) {
  const k = bare(w);
  byLemma.set(k, [...(byLemma.get(k) ?? []), w]);
}

if (lemmaArg) {
  const lemmas = readFileSync(lemmaArg, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  // Normalised exactly as a card is, so `der Hauptsatz` and `Hauptsatz` both ask
  // the same question.
  // An input with an article asks for a *noun* card: `das Fernsehen` is not
  // answered by the verb `fernsehen`, though the bare lemmas are identical.
  const missing = lemmas.filter((l) => {
    const hits = byLemma.get((government(l)?.lemma ?? lookupLemma(l)).toLowerCase()) ?? [];
    return /^(der|die|das)\s/i.test(l) ? !hits.some((w) => w.pos === 'noun') : hits.length === 0;
  });
  console.log(`lemmas checked  ${lemmas.length}`);
  console.log(`cards           ${lemmas.length - missing.length}`);
  console.log(`missing         ${missing.length}${missing.length ? '\n  ' + missing.join('\n  ') : ''}`);
}

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const buckets = { card: 0, compound: 0, function: 0, entity: 0, dark: 0 };
  const dark = new Map<string, number>();
  const compound = new Map<string, string>();
  const entities = new Set<string>();
  const cards = new Set<string>();
  for (const seg of matcher.annotate(text)) {
    if (!seg.isWord || !/\p{L}/u.test(seg.text)) continue;
    if (seg.word && seg.viaCompound) { buckets.compound++; compound.set(seg.text, seg.word.term); continue; }
    if (seg.word) { buckets.card++; cards.add(seg.word.term); continue; }
    if (matcher.isNeutralWord(seg.text)) { buckets.function++; continue; }
    if (matcher.isLikelyEntity(seg.text)) { buckets.entity++; entities.add(seg.text); continue; }
    buckets.dark++;
    dark.set(seg.text, (dark.get(seg.text) ?? 0) + 1);
  }
  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  const pc = (n: number) => `${((n / total) * 100).toFixed(1)}%`.padStart(6);
  console.log(`\n── ${f.split('/').pop()} — ${total} word tokens, ${cards.size} distinct cards`);
  for (const [k, n] of Object.entries(buckets)) console.log(`  ${k.padEnd(9)} ${String(n).padStart(5)} ${pc(n)}`);
  if (dark.size) {
    console.log(`\n  dark (${dark.size}):`);
    for (const [w, n] of [...dark].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))) {
      console.log(`    ${w}${n > 1 ? ` ×${n}` : ''}`);
    }
  }
  // Listed because "proper noun" is the matcher's guess, and a capitalised common
  // noun it has never seen is exactly what that guess gets wrong.
  if (entities.size) console.log(`\n  entity (${entities.size}): ${[...entities].sort().join(', ')}`);
  if (compound.size) {
    console.log(`\n  compound only (${compound.size}):`);
    for (const [w, head] of [...compound].sort((a, b) => a[0].localeCompare(b[0], 'de'))) {
      console.log(`    ${w} → ${head}`);
    }
  }
}
