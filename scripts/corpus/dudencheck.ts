// "Could this replace a Duden?" — measured rather than argued.
//
// A dictionary and a frequency-ranked learner's corpus fail differently. The
// dictionary's promise is *the word you looked up is in here*; Lexi's is *the
// words worth learning next are in here, in order*. This prints the fields that
// decide whether the first promise can be kept.
import './shim.ts';
import { PATHS } from './config.ts';
import { loadCorpus, primeApp } from './lib.ts';

const all = loadCorpus(PATHS.vocab);
const w = all.filter((x) => x.kind === 'word');
const matcher = await primeApp(all);
const pc = (n: number) => ((n / w.length) * 100).toFixed(1) + '%';

console.log(`cards                 ${w.length.toLocaleString()}  (of ${all.length.toLocaleString()} incl. filtered grammar)`);
console.log(`with an English gloss ${pc(w.filter((x) => x.en).length)}`);
console.log(`with a definition     ${pc(w.filter((x) => x.def).length)}`);
console.log(`with a German def     ${pc(w.filter((x) => x.defDe).length)}`);
console.log(`with IPA              ${pc(w.filter((x) => x.ipa).length)}`);
console.log(`with an example       ${pc(w.filter((x) => x.ex?.length).length)}`);
console.log(`with >1 example       ${pc(w.filter((x) => (x.ex?.length ?? 0) > 1).length)}`);
console.log(`with synonyms         ${pc(w.filter((x) => x.syn?.length).length)}`);
const nouns = w.filter((x) => x.pos === 'noun');
console.log(`nouns with a plural   ${((nouns.filter((x) => x.plural).length / nouns.length) * 100).toFixed(1)}%  of ${nouns.length.toLocaleString()} nouns`);
// Senses: the gloss is comma/semicolon separated, which is the only sense
// division the corpus carries.
const senses = w.map((x) => (x.en || '').split(/[;,]/).filter((s) => s.trim()).length);
const multi = senses.filter((n) => n > 1).length;
console.log(`cards with >1 sense   ${pc(multi)}  (mean ${(senses.reduce((a, b) => a + b, 0) / w.length).toFixed(2)} glosses/card)`);

// The dictionary test: take words a learner would plausibly look up and see
// whether the app can answer at all.
const probe = ['Hausaufgabe', 'Schadenfreude', 'Rechtsanwalt', 'Krankenversicherung',
  'beeindruckend', 'Vorstellungsgespräch', 'Bundeskanzler', 'zwar', 'ohnehin',
  'Reißverschluss', 'Wimper', 'Steckdose', 'Kühlschrank', 'Klobürste', 'Handschuh',
  'hause', 'jemanden', 'getötet', 'Spaß', 'Gott'];
console.log('\nlookup probe (would the search sheet answer?)');
for (const p of probe) {
  const hit = matcher.annotate(p)[0]?.word;
  console.log(`  ${hit ? '✓' : '·'} ${p}${hit ? `  → ${hit.term}` : ''}`);
}
