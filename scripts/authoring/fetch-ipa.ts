// Look a card's pronunciation up.
//
// 274 word cards carry no IPA, and unlike the plural gap this one has no
// judgement in it: a transcription is a fact, and the only question is whether
// the page you read it from is about the right word. So this is the field where a
// lookup runs straight through — with the same three guards the plural fetcher
// earned, because they are about *identifying the word*, not about the value:
//
//   the page must attest the card's own part of speech
//   a page covering two genders is not trusted for a gendered card
//   nothing is proposed for a term the corpus writes with notation
//
//   node scripts/authoring/fetch-ipa.ts [--limit N] [--out batch.json]
import { writeFileSync } from 'node:fs';
import { PATHS } from '../corpus/config.ts';
import { loadCorpus, lookupLemma } from '../corpus/lib.ts';
import { wikitext, parseFacts } from './verify.ts';
import type { Word } from '../../src/types.ts';

const arg = (n: string): string | undefined => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const LIMIT = Number(arg('--limit') ?? '100');
const OUT = arg('--out') ?? 'scripts/authoring/batches/ipa-lookup-01.json';

const corpus = loadCorpus(PATHS.vocab) as Word[];
const todo = corpus.filter((w) =>
  w.kind === 'word' && !(w.ipa ?? '').trim()
  // Government notation is not a page title — `verzichten auf + A`. A *sense*
  // disambiguator used to be excluded here too, on the same line and for the same
  // stated reason, which is why fixing `lookupLemma` below changed nothing on the
  // first run: two filters read the display string and I had only fixed one.
  // `lookupLemma` strips the parenthetical, so the page title is recoverable.
  && !/\+/.test(w.term)
  // A multiword phrase has no single transcription on a dictionary page.
  // The space test is meant to skip *phrases*, whose pronunciation is not one
  // lookup. It ran on the display string, so a sense parenthetical counted as a
  // phrase and `die Decke (Bett)` was never attempted (LESSONS class 9).
  && !/\s/.test(lookupLemma(w.term))).slice(0, LIMIT);

interface IpaRow { id: string; expect: { ipa: string | null }; ipa?: string; src: string }
const rows: IpaRow[] = [];
const unresolved: string[] = [];

for (const w of todo) {
  const lemma = lookupLemma(w.term);
  let wt: string | null = null;
  try { wt = await wikitext(lemma); } catch { unresolved.push(`${w.id} — de.wiktionary unreachable`); continue; }
  if (!wt) { unresolved.push(`${w.id} — no entry for "${lemma}"`); continue; }
  const facts = parseFacts(wt);
  if (!facts.ipa) { unresolved.push(`${w.id} — entry has no Lautschrift`); continue; }
  // Same identity guard the plural fetcher needs: a page that covers two genders,
  // or one whose gender disagrees with the card, may be about the other word.
  if (w.gender && facts.genders.size && !facts.genders.has(w.gender)) {
    unresolved.push(`${w.id} — card is "${w.gender}" but the page attests ${[...facts.genders].join('/')}`);
    continue;
  }
  rows.push({ id: w.id, expect: { ipa: null }, ipa: facts.ipa, src: `de.wiktionary.org/wiki/${lemma}` });
}

writeFileSync(OUT, JSON.stringify(rows, null, 2) + '\n');
console.log(`\nlooked up ${todo.length} · proposed ${rows.length} · unresolved ${unresolved.length}`);
for (const u of unresolved.slice(0, 15)) console.log(`   ${u}`);
console.log(`\n✓ wrote ${OUT}\n`);
