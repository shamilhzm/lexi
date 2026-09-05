// Attested inflections for every card — Phase 2 of docs/DICTIONARY.md.
//
// ## What this replaces, and why it is not a replacement
//
// `matcher.ts` de-inflects with hand-written rules: `conjugate()` for verbs, a
// plural former for nouns, suffix stripping for adjectives, and a set of tables
// (`EXTRA_VERB_FORMS`, `SUPPLETIVE`, `EXTRA_CLOSED_FORMS`) for what the rules
// cannot reach. Those rules are good and they are also, necessarily, a guess:
// German inflection is regular enough to generate and irregular enough that
// generating it is wrong a few percent of the time, and every wrong guess is
// either a miss in the reading meter or a claim on the wrong lemma.
//
// The same Wiktionary download the lookup layer is built from carries **attested**
// tables — *Gott* has 31 forms, *Wimper* 12 — for the words it covers. So the
// rules stay as the fallback for everything Wiktionary lacks, and where it has
// an answer, the answer is used instead of derived.
//
// ## The output is per *card*, not per headword
//
// The matcher indexes forms against corpus `Word`s. A form that resolves to a
// German word Lexi does not teach is of no use to it — that is the lookup layer's
// job — so this emits only the inflections of the 6,520 cards, which is a file
// small enough to load at boot beside `cards.json` rather than a 18 MB shard set.
import './shim.ts';
import { PATHS } from './config.ts';
import { loadCorpus } from './lib.ts';
import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import type { Word } from '../../src/types.ts';

const SRC = join(PATHS.raw, 'kaikki-de.jsonl');
const OUT = join(process.cwd(), 'public', 'data', 'inflections.json');

const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();

/** Corpus part of speech → the Wiktionary tag(s) that mean the same thing.
 *  A card is only matched against an entry of its own class: *Weite* the noun
 *  and *weite* the inflected adjective are different words with different
 *  tables, and merging them is how a matcher starts claiming the wrong lemma. */
const POS_MATCH: Record<string, string[]> = {
  noun: ['noun', 'name'],
  verb: ['verb'],
  adjective: ['adj'],
  adverb: ['adv'],
};

// **Open class only, and the closed class is excluded on purpose.**
//
// Wiktionary's tables for function words are not inflection tables, they are
// paradigm tables. `er`'s lists *du, es, euch, dein* — the whole personal
// pronoun system, not forms of *er*. `in`'s lists *darin*; `bei`'s lists
// *dabei, wobei, hierbei* — pronominal adverbs, which are separate lemmas with
// separate meanings.
//
// Taking them produced 566 forms that are another card's headword, which is the
// exact failure this file exists to reduce: a wrong lemma is invisible where a
// miss is not. And there is nothing to gain — `matcher.ts` already carries
// hand-written `EXTRA_CLOSED_FORMS` and `SUPPLETIVE` tables for precisely these
// words, curated rather than scraped, and they are right.
//
// So the rule: generate what is regular, attest what is irregular, and hand-write
// the closed class. Three sources, each doing the thing it is good at.

/** Form tags that mean "this is not the word, it is a related word". A
 *  diminutive is its own lemma with its own meaning — *Häuschen* is not a form
 *  of *Haus* the way *Häuser* is — and indexing it would let a token claim a
 *  card it is not an inflection of. */
const DROP_TAGS = new Set([
  'diminutive', 'augmentative', 'archaic', 'obsolete', 'dialectal', 'rare',
  'table-tags', 'inflection-template', 'class', 'error-unknown-tag',
  // Wiktionary records these as "forms" of a German verb and they are neither
  // German nor forms.
  'romanization', 'transliteration',
  // **The auxiliary row is not a form of the verb.** `können`'s table lists
  // *haben* under `["auxiliary"]`, and indexing it would make every "haben" in
  // a text resolve to *können* — a wrong lemma, which this file exists to
  // reduce, not create.
  'auxiliary',
]);

/** What makes a noun row a declension rather than a derivation. */
const CASE_TAGS = new Set(['nominative', 'genitive', 'dative', 'accusative', 'plural', 'singular']);

const corpus = loadCorpus(PATHS.vocab).filter((w) => w.kind === 'word');
/** headword (lowercased, article-stripped) → the cards claiming it. */
const byHead = new Map<string, Word[]>();
for (const w of corpus) {
  const k = stripArticle(w.term).toLowerCase();
  const list = byHead.get(k) ?? [];
  list.push(w);
  byHead.set(k, list);
}

const out = new Map<string, Set<string>>();
let entries = 0, matchedCards = 0, formsKept = 0;

const rl = createInterface({ input: createReadStream(SRC) });
for await (const line of rl) {
  let j: {
    word?: string; pos?: string;
    senses?: { form_of?: { word?: string }[] }[];
    forms?: { form?: string; tags?: string[] }[];
  };
  try { j = JSON.parse(line); } catch { continue; }
  if (!j.word || !j.pos || !j.forms?.length) continue;
  // An inflected-form entry has no table of its own worth reading.
  if (j.senses?.every((s) => s.form_of?.[0]?.word)) continue;
  entries++;

  const cards = byHead.get(j.word.toLowerCase());
  if (!cards) continue;
  for (const card of cards) {
    if (!(POS_MATCH[card.pos] ?? []).includes(j.pos)) continue;
    const set = out.get(card.id) ?? new Set<string>();
    if (!out.has(card.id)) matchedCards++;
    for (const f of j.forms) {
      let form = f.form?.trim();
      if (!form || form === '-' || form.length < 2 || form.length > 32) continue;
      if (/[^A-Za-zÄÖÜäöüß\s-]/.test(form)) continue;      // no templates, no punctuation
      const tags = f.tags ?? [];
      if (tags.some((t) => DROP_TAGS.has(t))) continue;

      // **Adjectives: degree stems only.** Their tables are ~58 rows of which
      // ~56 are the positive declension — *guter, gute, gutes, gutem, guten* —
      // and that is the one part of German inflection that is completely
      // regular and that `matcher.ts` already strips by suffix. Shipping it
      // would be 55,072 forms to teach the matcher what it knows, and it was
      // 44% of this file. What the table does add is the irregular part:
      // *gut → besser, am besten*, which no suffix rule reaches.
      if (card.pos === 'adjective' && !tags.every((t) => t === 'comparative' || t === 'superlative')) continue;

      // **Nouns: a form must be a case or a number, not a gender.** Wiktionary
      // files the feminine *derivation* in the same table as the declension —
      // *Arzt* lists *Ärztin* under `["feminine"]`, *Neffe* lists *Nichte* — and
      // those are separate lemmas with separate cards, not forms of the
      // masculine. Requiring a case or plural tag keeps every real declension
      // (*Hauses*, *Häuser*, *Häusern*, dative *Hause*) and drops the derivations.
      //
      // It does *not* drop the homographs, and should not: *Besuchen* really is
      // the dative plural of *der Besuch* and really does collide with the verb
      // *besuchen*. The matcher's index is first-wins with lemmas added first, so
      // the verb keeps the token and the noun form is simply never reached.
      if (card.pos === 'noun' && !tags.some((t) => CASE_TAGS.has(t))) continue;
      // Superlatives are listed as *am besten*; index the word, not the phrase.
      form = form.replace(/^am\s+/i, '');

      const lc = form.toLowerCase();
      if (lc === stripArticle(card.term).toLowerCase()) continue;   // the lemma is not a form
      if (lc.includes(' ')) continue;   // multi-word rows are phrases, not forms
      set.add(lc);
    }
    out.set(card.id, set);
  }
}

const rows: Record<string, string[]> = {};
for (const [id, set] of out) {
  if (!set.size) continue;
  rows[id] = [...set].sort();
  formsKept += set.size;
}
writeFileSync(OUT, JSON.stringify(rows));

const kb = (n: number) => (n / 1024).toFixed(0) + ' KB';
console.log(`wiktionary entries with a table   ${entries.toLocaleString()}`);
console.log(`cards matched                     ${matchedCards.toLocaleString()} of ${corpus.length.toLocaleString()}  (${(matchedCards / corpus.length * 100).toFixed(1)}%)`);
console.log(`cards with at least one form      ${Object.keys(rows).length.toLocaleString()}`);
console.log(`attested forms                    ${formsKept.toLocaleString()}   (mean ${(formsKept / Object.keys(rows).length).toFixed(1)} per card)`);
console.log(`file                              ${kb(JSON.stringify(rows).length)}`);
console.log(`→ ${OUT}`);
