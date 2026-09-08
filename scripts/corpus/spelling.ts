// One English, not two.
//
// `die Farbe` is glossed **color** and defined **colour**. `die Verteidigung` is
// glossed **defense** and defined **defence**. `der Schmuck` is glossed
// **jewellery** and defined **jewelry**. Twenty-four cards contradict themselves
// between the line on the card and the line in the entry sheet, on the same word,
// for the same learner.
//
// Measured over the shipped corpus, counting cards that use either side of a
// known pair:
//
//                 US    UK
//   gloss         33    57
//   definition    80    94
//   examples      91   306
//
// So there is no convention, and the majority — and the app's own copy, which
// says *practise*, *recognise*, *organise* — is British. That is the target.
//
// ## What this rewrites, and what it refuses to
//
// **Authored fields only: the gloss and the example translations.** `def` is
// machine-sourced from Wiktionary and shown as what the dictionary says; editing
// it would quietly turn a quotation into a paraphrase, and provenance is the one
// thing `ATTRIBUTIONS.md` cannot be casual about. Definitions are counted here and
// reported, never touched.
//
// **Whole word forms, never stems, and the first version is why.** It matched a
// stem and kept the tail — `tire` → `tyre` plus whatever followed — and the dry
// run printed *"After a long day I am very **tyred**."* Twenty-four times. The same
// shape breaks `labor`→`labour` on **laboratory**, `liter`→`litre` on
// **literature**, `center`→`centre` on **centered**, `fulfill`→`fulfil` on
// **fulfilled**, and `dialog`→`dialogue` on **dialogue** itself, which becomes
// *dialogueue*. English orthography does not decompose, so the map below is exact
// forms, taken from the words that actually occur in the authored fields and
// checked one by one. It is longer and it is the only version that is true.
//
// **Some pairs are reported and never rewritten**, because in British English they
// are not spelling variants at all — they are different words, or the US form is
// also correct:
//
//   practice / practise   noun vs verb
//   licence  / license    noun vs verb
//   program  / programme  a computer program is a program in both
//   tire     / tyre       *tired*, *tireless* have nothing to do with wheels
//   humorous, fulfilled, honorary   already correct in British English
//
// Run: npm run corpus:spelling            report
//      npm run corpus:spelling -- --write  normalise gloss + examples to UK
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeJSON } from './lib.ts';
import type { Word } from '../../src/types.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PATH = join(ROOT, 'public/data/vocab.json');
const cards: Word[] = JSON.parse(readFileSync(PATH, 'utf8'));
const WRITE = process.argv.includes('--write');

/** US → UK, as **exact words**. Every entry is a form that occurs in the corpus's
 *  authored fields; nothing is here on speculation. */
const TO_UK: Record<string, string> = {
  color: 'colour', colors: 'colours', colored: 'coloured',
  favorite: 'favourite', favorites: 'favourites',
  center: 'centre', centers: 'centres',
  meter: 'metre', meters: 'metres',
  theater: 'theatre', theaters: 'theatres',
  defense: 'defence', offense: 'offence',
  labor: 'labour', labors: 'labours', laborers: 'labourers',
  harbor: 'harbour', harbors: 'harbours',
  honor: 'honour', honors: 'honours',
  humor: 'humour', rumor: 'rumour', flavoring: 'flavouring',
  behavior: 'behaviour', behaviors: 'behaviours',
  neighborhood: 'neighbourhood', neighboring: 'neighbouring',
  neighbors: 'neighbours', neighbor: 'neighbour',
  organize: 'organise', organized: 'organised', organizing: 'organising',
  organization: 'organisation', organizations: 'organisations',
  organizer: 'organiser', organizers: 'organisers',
  realize: 'realise', realized: 'realised', realizes: 'realises',
  recognize: 'recognise', recognizes: 'recognises', recognizable: 'recognisable',
  criticize: 'criticise', criticizes: 'criticises', criticized: 'criticised',
  analyze: 'analyse', analyzed: 'analysed', analyzes: 'analyses',
  apologize: 'apologise', apologized: 'apologised',
  catalog: 'catalogue', catalogs: 'catalogues',
  fulfill: 'fulfil', fulfillment: 'fulfilment',
  skillful: 'skilful', skillfully: 'skilfully',
  traveled: 'travelled', traveling: 'travelling', traveler: 'traveller',
  canceled: 'cancelled', gray: 'grey', jewelry: 'jewellery',
  aluminum: 'aluminium', pajamas: 'pyjamas', enrollment: 'enrolment',
};

/** The pairs the census counts. Derived from the map above so the two cannot
 *  drift, plus the ones that are reported but never rewritten. */
const PAIRS: [string, string][] = Object.entries(TO_UK);
const AMBIGUOUS: [string, string][] = [
  ['practice', 'practise'], ['license', 'licence'], ['program', 'programme'],
  ['tire', 'tyre'],
];

/** Swap whole words only. Case is preserved on the first letter, which is all a
 *  gloss or a sentence ever needs. */
function toUk(text: string): string {
  return text.replace(/[A-Za-z]+/g, (w) => {
    const uk = TO_UK[w.toLowerCase()];
    if (!uk) return w;
    return /^[A-Z]/.test(w) ? uk[0].toUpperCase() + uk.slice(1) : uk;
  });
}

/** Collapse senses the swap has just made identical.
 *
 *  Two glosses list both spellings as if they were two meanings — `die
 *  Organisation` is *"organisation, organization"* and `kritisieren` is *"to
 *  criticize, to criticise"*. Normalising without this turns each into the same
 *  word twice, which is a worse card than the one we started with. Order is kept:
 *  the first occurrence wins, so nothing is reordered under the learner. */
function dedupeSenses(gloss: string): string {
  const parts = gloss.split(',').map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2) return gloss;
  const seen = new Set<string>();
  const kept = parts.filter((x) => !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()));
  return kept.length === parts.length ? gloss : kept.join(', ');
}

const has = (t: string | undefined, w: string) => !!t && new RegExp(`\\b${w}\\b`, 'i').test(t);

// ---- the census ------------------------------------------------------------
const census = { gloss: { us: 0, uk: 0 }, def: { us: 0, uk: 0 }, example: { us: 0, uk: 0 } };
const count = (t: string | undefined, f: keyof typeof census) => {
  for (const [us, uk] of PAIRS) { if (has(t, us)) census[f].us++; if (has(t, uk)) census[f].uk++; }
};
for (const c of cards) {
  count(c.en, 'gloss');
  count(c.def ?? undefined, 'def');
  for (const e of c.ex ?? []) count(e.en, 'example');
}

// ---- cards that contradict themselves --------------------------------------
const clashes: string[] = [];
for (const c of cards) {
  const exEn = (c.ex ?? []).map((e) => e.en).join(' ');
  for (const [us, uk] of PAIRS) {
    const glossUs = has(c.en, us); const glossUk = has(c.en, uk);
    const elsewhereUk = has(c.def ?? undefined, uk) || has(exEn, uk);
    const elsewhereUs = has(c.def ?? undefined, us) || has(exEn, us);
    if ((glossUs && elsewhereUk) || (glossUk && elsewhereUs)) {
      clashes.push(`${c.term} [${c.level}] — gloss "${c.en}"`);
      break;
    }
  }
}

// ---- the rewrite -----------------------------------------------------------
const changes: string[] = [];
for (const c of cards) {
  const en = dedupeSenses(toUk(c.en));
  if (en !== c.en) { changes.push(`${c.term}: gloss "${c.en}" → "${en}"`); if (WRITE) c.en = en; }
  for (const e of c.ex ?? []) {
    const t = toUk(e.en);
    if (t !== e.en) { changes.push(`${c.term}: ex "${e.en}" → "${t}"`); if (WRITE) e.en = t; }
  }
}

const ambiguous = cards.filter((c) => AMBIGUOUS.some(([a, b]) =>
  has(c.en, a) || has(c.en, b))).map((c) => `${c.term} — "${c.en}"`);

console.log('\nEnglish spelling census (cards using either side of a known pair)\n');
console.log('                  US     UK');
for (const [f, v] of Object.entries(census)) {
  console.log(`  ${f.padEnd(12)} ${String(v.us).padStart(4)}  ${String(v.uk).padStart(5)}`);
}
console.log(`\nCards that contradict themselves: ${clashes.length}`);
for (const c of clashes) console.log(`  ${c}`);

console.log(`\nAuthored fields to normalise to UK: ${changes.length}`);
for (const c of changes.slice(0, 40)) console.log(`  ${c}`);
if (changes.length > 40) console.log(`  … and ${changes.length - 40} more`);

console.log(`\nLeft alone — noun/verb pairs, not spelling variants: ${ambiguous.length}`);
for (const a of ambiguous) console.log(`  ${a}`);

if (WRITE) {
  writeJSON(PATH, cards);
  console.log(`\n✓ wrote ${PATH}`);
  console.log('  Next: npm run corpus:split && npm run corpus:validate && npm test\n');
} else {
  console.log('\n(dry run — pass --write to apply; `def` is never touched)\n');
}
