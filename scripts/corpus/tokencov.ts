// Token-weighted coverage: not "how many words in the list do we know" but
// "how much of a page of German would light up".
//
// The band table in `coverage.ts` counts *types* — each surface form once — which
// flatters nothing and answers a different question. A reader does not meet the
// top-20,000 forms equally often; they meet `die` on every line. Weighting each
// form by its corpus count is the only version of the number that predicts what
// reading actually feels like.
import './shim.ts';
import { PATHS, SOURCES } from './config.ts';
import { loadCorpus, primeApp, fileExists } from './lib.ts';
import { loadFrequencies } from './sources/frequency.ts';
import { join } from 'node:path';

const matcher = await primeApp(loadCorpus(PATHS.vocab));
// Every list `corpus:fetch` pulled, not just the news one — the whole point of
// a token-weighted number is that it should describe the German a person meets,
// and subtitles carry the spoken half that news does not.
const paths = [SOURCES.frequency, SOURCES.frequencySpoken]
  .filter(Boolean)
  .map((s: { file: string }) => join(PATHS.raw, s.file))
  .filter(fileExists);
if (!paths.length) { console.error('no frequency lists — run npm run corpus:fetch'); process.exit(1); }
console.log('lists:', paths.map((p) => p.split('/').pop()).join(', '));
const freq = loadFrequencies(paths, Infinity);

let total = 0, matched = 0, neutral = 0, entity = 0, missTok = 0;
const misses: { w: string; n: number }[] = [];
for (const e of freq) {
  total += e.freq;
  if (matcher.annotate(e.word)[0]?.word) { matched += e.freq; continue; }
  if (matcher.isNeutralWord(e.word)) { neutral += e.freq; continue; }
  if (matcher.isLikelyEntity(e.word)) { entity += e.freq; continue; }
  missTok += e.freq;
  misses.push({ w: e.word, n: e.freq });
}
const pc = (n: number) => ((n / total) * 100).toFixed(1) + '%';
console.log(`forms scored      ${freq.length.toLocaleString()}`);
console.log(`tokens            ${total.toLocaleString()}`);
console.log(`matched to a card ${pc(matched)}`);
console.log(`function words    ${pc(neutral)}   (handled, not taught)`);
console.log(`proper nouns      ${pc(entity)}   (excluded on purpose)`);
console.log(`LIT UP TOTAL      ${pc(matched + neutral + entity)}`);
console.log(`dark              ${pc(missTok)}`);
misses.sort((a, b) => b.n - a.n);
console.log('\ntop 25 dark forms:', misses.slice(0, 25).map((m) => m.w).join(', '));
// How far down the list you have to go before half the remaining dark mass is
// covered — i.e. is the tail worth chasing?
let acc = 0; let i = 0;
for (; i < misses.length && acc < missTok / 2; i++) acc += misses[i].n;
console.log(`\nhalf the dark mass sits in the first ${i.toLocaleString()} of ${misses.length.toLocaleString()} missing forms`);
