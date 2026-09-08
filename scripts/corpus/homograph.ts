// The example belongs to somebody else.
//
// `schicken` is glossed *to send*, and its first example is «Wie geschickt!» —
// *How clever!*. That sentence is not about sending anything. `geschickt` is a
// different lexeme that happens to be spelled like a participle of this one, and
// the example was written for it.
//
// ## The rule, and why it is two conditions and not one
//
// **An example whose German resolves to the headword of a *different* card, and
// whose English shares nothing with this card's gloss, was written for that other
// card.** Both halves are load-bearing:
//
//   - German alone is worthless. Almost every good example contains other cards'
//     headwords — «Der Bräutigam wartete nervös auf die Braut» contains two, and
//     is exactly the sentence `die Braut` should have. A German-only rule fires on
//     most of the corpus.
//   - English alone is the check `corpus:sense` already makes, and `gloss-vote`'s
//     header explains why it is noisy: a good example *paraphrases*. «Er zahlte
//     bar» shares nothing with "bare" and is a perfectly good example — of the
//     other `bar`.
//
// Together they are narrow. The German says which card the sentence is *about*;
// the English says this card is not it.
//
// ## What it deliberately does not do
//
// It does not fire on a compound head. The matcher can decompose *Brautkleid* to
// `die Braut`, and `Segment.viaCompound` marks that — but decomposition is a claim
// about spelling, not about meaning (see the note on `viaCompound`: Schadenfreude
// is not a kind of joy). An example containing a compound is evidence of nothing.
//
// It does not fire when the *own* headword also appears. «Bei uns ist es Brauch,
// die Braut über die Schwelle zu tragen» is `der Brauch`'s example and mentions
// `die Braut`; the sentence is doing its job, and the second headword is scenery.
//
// ## The false positive that decides the shape of `namesOwn`
//
// The first version asked the matcher whether the sentence resolved to this card,
// and got 94 hits at roughly one in ten. The reason is worth writing down: in
// «Wir fahren mit dem Zug nach München» the matcher resolves *fahren* to
// **mitfahren**, and in «Wie geht es dir mit der neuen Arbeit?» it resolves *geht*
// to **umgehen mit + D** — a later particle pulls a simplex verb into a separable
// compound. That is defensible matcher behaviour and it is not this script's to
// argue with, but it made `namesOwn` false on dozens of sentences that plainly
// name their own headword.
//
// So `namesOwn` is answered twice: by the matcher, and by a *surface* prefix on
// the bare stem. The second is crude on purpose. This is a guard against a false
// positive, so the generous direction is the safe one — a missed hit costs a
// reader nothing, and ten wrong ones cost them the queue. It also happens to keep
// the case the whole check exists for: `schicken` stems to `schick`, and
// `geschickt` does not *start* with it.
//
// Run: npm run corpus:homograph
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildMatcher, government } from '../../src/lib/matcher.ts';
import type { Word } from '../../src/types.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const cards: Word[] = JSON.parse(readFileSync(join(ROOT, 'public/data/vocab.json'), 'utf8'));

/** Shared with `gloss-vote`'s reasoning, and kept separate on purpose: that check
 *  compares two *descriptions* of a referent, this one compares a description to a
 *  *sentence translation*, and a sentence is allowed to be much further away. */
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'is', 'it', 'in', 'on', 'that', 'this',
  'and', 'or', 'be', 'as', 'at', 'for', 'with', 'you', 'i', 'someone', 'something', 'esp',
  'especially', 'usually', 'person', 'make', 'do', 'used', 'by', 'from', 'into', 'out', 'up',
  'not', 'one', 'who', 'which', 'also', 'such', 'have', 'has', 'its', 'their', 'his', 'her',
  'can', 'may', 'other', 'more', 'than', 'when', 'while', 'about', 'over', 'under', 'after',
  'before', 'so', 'no', 'any', 'all', 'way', 'form', 'sense', 'they', 'we', 'he', 'she', 'him',
  'them', 'my', 'your', 'are', 'was', 'were', 'been', 'get', 'got', 'go', 'goes', 'there',
  'here', 'very', 'much', 'many', 'some', 'how', 'what', 'now', 'then', 'again', 'still']);

const words = (s?: string) => [...new Set((s ?? '').toLowerCase().match(/[a-zäöüß]+/g) ?? [])]
  .filter((x) => x.length > 2 && !STOP.has(x));

const stem = (x: string) => x.replace(/(ing|ed|es|s)$/, '');

/** Any shared content word, prefix-tolerant — "send"/"sending", "clever"/"cleverly".
 *
 *  **Prefix tolerance stops below five characters, and `bar` is why.** It exists
 *  for morphological variants, and on a short stem it stops being one: `bar` is
 *  glossed *bare*, its second example is «Wo ist die Bar?» / *Where is the bar?* —
 *  a sentence about the other `Bar` entirely — and "bar" prefixes "bare", so the
 *  English test declared agreement and the hit was suppressed. Two short words
 *  that merely start alike are a coincidence, not a shared meaning. */
const MIN_PREFIX = 5;
function shares(a?: string, b?: string): boolean {
  const A = words(a).map(stem);
  const B = words(b).map(stem);
  if (!A.length || !B.length) return false;
  return A.some((x) => B.some((y) => y === x
    || (x.length >= MIN_PREFIX && y.startsWith(x))
    || (y.length >= MIN_PREFIX && x.startsWith(y))));
}

const matcher = buildMatcher(cards);

/** The bare stem of a headword: no article, no reflexive, no government, and — for
 *  a verb only — no infinitive ending. `sich erinnern an + A` → `erinner`,
 *  `schicken` → `schick`, `die Braut` → `braut`.
 *
 *  **`pos`, and not for tidiness.** The first version stripped `-en`/`-n` from
 *  everything, which took `der Zahn` to `zah` and `der Mann` to `man` — the first
 *  then fell under the length floor and stopped guarding anything, and the second
 *  would have matched every sentence containing *man*. A trailing `n` is an ending
 *  on a verb and part of the word everywhere else.
 *
 *  Short stems are dropped rather than guessed at: `tun` would stem to `tu`, which
 *  prefixes half the language, and `gehen` to `geh`, which is short but specific.
 *  Three is the floor — below it the guard does more harm than the check does good. */
function stemOf(w: Word): string | null {
  const lemma = (government(w.term)?.lemma ?? w.term)
    .replace(/^(der|die|das)\s+/i, '')
    .replace(/^sich\s+/i, '')
    .split(/[\s(]/)[0]
    .toLowerCase();
  const bare = w.pos === 'verb' ? lemma.replace(/e?n$/, '') : lemma;
  return bare.length >= 3 ? bare : null;
}
const STEMS = new Map(cards.map((c) => [c.id, stemOf(c)]));

/** Is this headword itself lowercase? Tested on the **lemma**, not the term: every
 *  noun card starts with `der`/`die`/`das`, so testing the term said *lowercase* for
 *  all 4,000 of them and rule two fired 718 times on perfectly good sentences. */
const isLower = (w: Word) => /^[a-zäöüß]/.test(
  (government(w.term)?.lemma ?? w.term).replace(/^(der|die|das)\s+/i, '').replace(/^sich\s+/i, ''));

interface Hit {
  card: Word;
  de: string;
  en: string;
  /** The other card the German sentence actually resolves to. */
  owner: Word;
}

const hits: Hit[] = [];
/** Rule two's queue, reported apart because the fix is different: rule one moves
 *  an example to another card, this one usually means the example was written for
 *  a noun the corpus does not carry, and the card simply needs a better sentence. */
const capitals: { card: Word; de: string; en: string }[] = [];

for (const card of cards) {
  if (card.kind === 'grammar') continue;
  for (const ex of card.ex ?? []) {
    if (!ex.de || !ex.en || !card.en) continue;

    const segs = matcher.annotate(ex.de);
    // Does the sentence name this card at all? If it does, it is this card's
    // sentence and any other headword in it is scenery. Asked two ways — see the
    // note on `namesOwn` above.
    const stem0 = STEMS.get(card.id);
    const wordSegs = segs.filter((s) => s.isWord);
    const namesOwn = segs.some((s) => s.word?.id === card.id && !s.viaCompound)
      || (!!stem0 && wordSegs.some((s) => s.text.toLowerCase().startsWith(stem0)));

    // **Rule two: the capitalised homograph.** A lowercase headword whose only
    // appearance in the sentence is capitalised, mid-sentence, in a translation
    // that shares nothing with the gloss. German capitalises nouns, so this is a
    // lexeme boundary and not a typo.
    //
    // It is a separate rule because rule one cannot reach it: that one needs the
    // sentence to resolve to *another card*, and `die Bar` is not a card. The
    // matcher folds case, so «Wo ist die Bar?» resolves straight back to the
    // adjective `bar` and the sentence looks like its own. The defect is real and
    // the corpus simply has no other row to blame it on.
    if (stem0 && isLower(card) && !shares(ex.en, card.en) && !shares(ex.en, card.def)) {
      const capped = wordSegs.some((s, i) => i > 0
        && /^[A-ZÄÖÜ]/.test(s.text) && s.text.toLowerCase().startsWith(stem0));
      const lower = wordSegs.some((s) => /^[a-zäöüß]/.test(s.text) && s.text.toLowerCase().startsWith(stem0));
      if (capped && !lower) { capitals.push({ card, de: ex.de, en: ex.en }); continue; }
    }

    if (namesOwn) continue;

    // A term the stemmer cannot get a grip on — an abbreviation like `d. h.`, a
    // multi-word phrase — cannot be guarded, so it is not judged either. Silence
    // beats a hit nobody can act on.
    if (!stem0) continue;

    // Whose sentence is it, then? Content words only: a sentence that merely
    // contains `sein` or `haben` is not *about* them.
    const others = segs
      .filter((s) => s.word && s.word.id !== card.id && !s.viaCompound
        && !matcher.isNeutralWord(s.text) && !matcher.isLikelyEntity(s.text))
      .map((s) => s.word!);
    if (!others.length) continue;

    // The English test. If the translation says anything this card's gloss says,
    // the sentence is doing its job however it is phrased.
    if (shares(ex.en, card.en) || shares(ex.en, card.def)) continue;

    // Of the candidate owners, prefer the one whose own gloss the *translation*
    // agrees with — that is the card the sentence is about.
    const owner = others.find((o) => shares(ex.en, o.en) || shares(ex.en, o.def));
    if (!owner) continue;

    hits.push({ card, de: ex.de, en: ex.en, owner });
  }
}

const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1)}%`;
const total = cards.reduce((a, c) => a + (c.ex?.length ?? 0), 0);

console.log(`\nExamples that read as another card's: ${hits.length} of ${total} (${pct(hits.length, total)})\n`);
for (const h of hits) {
  console.log(`  ${h.card.term} [${h.card.level}] — ${h.card.en}`);
  console.log(`      « ${h.de} »  ${h.en}`);
  console.log(`      reads as: ${h.owner.term} — ${h.owner.en}\n`);
}
if (!hits.length) console.log('  (none)\n');

console.log(`Lowercase headwords whose example only shows the capitalised homograph: ${capitals.length}\n`);
for (const h of capitals) {
  console.log(`  ${h.card.term} [${h.card.level}] — ${h.card.en}`);
  console.log(`      « ${h.de} »  ${h.en}\n`);
}
if (!capitals.length) console.log('  (none)\n');
