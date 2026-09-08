// The measurements the six open decisions rest on.
//
// `docs/VISION.md` carries six questions that need a ruling before anyone writes
// code against them, and every one of them was raised as an assertion about the
// app: *the first session is twenty verbs*, *random distractors make the question
// free*, *the dwell inference is invisible*. Three of those turned out to be
// wrong, and one of the three was wrong in a more interesting direction than the
// claim.
//
// So this file is not a feature's tests. It pins the **premises** — if one of
// these fails, a pending decision's ground has moved and the write-up in VISION
// is out of date before anyone has ruled on it. That is the point: a question is
// only worth asking while its premise is true.
//
// Nothing here asserts that the current behaviour is *right*. Each block says
// what is, and `docs/VISION.md` argues about what ought to be.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { registerWords } from './data/index.ts';
import { primeFreq, freqRankOf } from './lib/freq.ts';
import { resetSurfaceIndex } from './lib/surface.ts';
import { meaningOptions, askablePlural, eligibleModes } from './views/drills.tsx';
import { whyLine } from './components/WhyThisCard.tsx';
import { firstRunIds } from './store.ts';
import type { Word } from './types.ts';

const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
registerWords(corpus);
resetSurfaceIndex();
primeFreq(JSON.parse(readFileSync('public/data/freq.json', 'utf8')));

const words = corpus.filter((w) => w.kind === 'word');
const byId = new Map(corpus.map((w) => [w.id, w]));
const bare = (t: string) => t.replace(/^(der|die|das)\s+/, '').replace(/^sich\s+/, '');

/** Parts of speech a learner cannot be shown in isolation and expected to learn
 *  anything from: they have no gender, no plural, no citation form worth typing,
 *  and their gloss is a translation of a slot rather than of a thing. */
const FUNCTION_POS = new Set(['adverb', 'preposition', 'conjunction', 'pronoun',
  'article', 'interjection', 'particle', 'numeral', 'determiner']);

// ---- E1 · Should the first session be composed, not just ordered? -----------
describe('E1 — what a cold learner actually gets', () => {
  const first = firstRunIds(400).map((id) => byId.get(id)!);

  // The backlog says "twenty verbs". That was true before the frequency sort
  // landed and is not true now — the failure moved rather than closing.
  it('is not verbs', () => {
    expect(first.slice(0, 10).filter((w) => w.pos === 'verb')).toEqual([]);
  });

  // It is function words: so · nur · ab · sehr · alle · ganz · okay · also ·
  // einmal, and one noun. Ordering by frequency inside a band necessarily
  // surfaces these first, because the commonest words in any language are the
  // ones that hold sentences together.
  it('is function words, and that is what ordering by frequency buys', () => {
    const fn = first.slice(0, 10).filter((w) => FUNCTION_POS.has(w.pos));
    expect(fn.length).toBeGreaterThanOrEqual(6);
  });

  // The consequence the ruling turns on: two of the app's three scheduled drills
  // are properties of nouns, so a first session of function words can only ask
  // one kind of question.
  it('leaves the gender and plural drills with almost nothing to fire on', () => {
    const ten = first.slice(0, 10);
    expect(ten.filter((w) => w.gender).length).toBeLessThanOrEqual(2);
    expect(ten.filter((w) => askablePlural(w)).length).toBeLessThanOrEqual(2);
    // `eligibleModes` is the scheduler's own list, and for most of these it is empty.
    expect(ten.filter((w) => eligibleModes(w).length === 0).length).toBeGreaterThanOrEqual(8);
  });
});

// ---- E1b · the ordering signal runs out ------------------------------------
//
// This is the part that was not in the backlog at all, and it is the reason E1
// cannot be answered by tuning the sort.
describe('E1 — the frequency ranking does not cover the words it exists for', () => {
  const a1 = words.filter((w) => w.level === 'A1');

  it('ranks a small minority of A1', () => {
    const ranked = a1.filter((w) => freqRankOf(w.id) != null).length;
    expect(ranked).toBeLessThan(a1.length / 5);
  });

  // `byFrequency` sorts unranked cards *last*, so an unranked word is ordered by
  // nothing but its position in the build. Every one of these is unranked.
  it('ranks none of the commonest words in the language', () => {
    const CORE = ['sein', 'haben', 'werden', 'können', 'müssen', 'sagen', 'machen',
      'geben', 'gehen', 'kommen', 'sehen', 'wissen', 'ich', 'nicht', 'Jahr', 'Zeit',
      'Mensch', 'Tag', 'Frau', 'Mann', 'Kind', 'groß', 'gut', 'neu'];
    const ranked = CORE.filter((t) => words.some((w) => bare(w.term) === t && freqRankOf(w.id) != null));
    expect(ranked).toEqual([]);
  });

  // So the ordering is inverted exactly where it matters most: `grillen` — the
  // card the original persona complaint named — is introduced ahead of `sein`,
  // and both are ahead of it only by accident of corpus order.
  it('introduces grillen before sein', () => {
    const q = firstRunIds(400).map((id) => bare(byId.get(id)!.term));
    const grillen = q.indexOf('grillen');
    const sein = q.indexOf('sein');
    expect(grillen).toBeGreaterThanOrEqual(0);
    expect(sein).toBeGreaterThan(grillen);
  });
});

// ---- E2 · Should a wrong answer be explained? ------------------------------
//
// The proposal is that `anbieten` is transparently `an-` + `bieten`, and that the
// moment to say so is the moment the learner got it wrong. The population is real
// and large. It is also, in almost exactly half, a lie.
describe('E2 — how many verbs decompose, and onto what', () => {
  const SEPARABLE = ['an', 'auf', 'aus', 'ab', 'bei', 'ein', 'mit', 'nach', 'vor',
    'zurück', 'weg', 'los', 'her', 'hin', 'fest', 'frei', 'statt', 'teil', 'zusammen', 'zu'];
  const INSEPARABLE = ['be', 'ver', 'er', 'ent', 'emp', 'ge', 'miss', 'zer'];

  const lemmas = new Map<string, Word>();
  for (const w of words) if (w.pos === 'verb') lemmas.set(bare(w.term).split(/[\s(]/)[0].toLowerCase(), w);

  const split = (list: string[]) => [...lemmas].filter(([lem, w]) => list.some((p) =>
    lem.startsWith(p) && lem.length > p.length + 2
    && lemmas.has(lem.slice(p.length)) && lemmas.get(lem.slice(p.length))!.id !== w.id));

  it('finds a large population on both sides of the transparency line', () => {
    // Separable: `anrufen` = an- + `rufen`, `aufstehen` = auf- + `stehen`. The
    // decomposition is the meaning, and saying it is a genuine gift.
    expect(split(SEPARABLE).length).toBeGreaterThan(150);
    // Inseparable: `bekommen` "to get" is not be- + `kommen` "to come", `erzählen`
    // "to tell" is not er- + `zählen` "to count", `verstehen` is not ver- +
    // `stehen`. The same rule fires, and what it says is false.
    expect(split(INSEPARABLE).length).toBeGreaterThan(150);
  });
});

// ---- E3 · Should distractors be confusable? --------------------------------
//
// The claim is that random distractors make a four-option question free. The
// distractors are not random — same part of speech, same CEFR band, with two
// synonymy guards — and the test that matters is whether the correct answer can
// be picked out by its *shape*, by somebody who reads no German at all.
//
// It cannot. Every strategy below lands at or under chance, which means the
// objection as filed is answered and what is left of E3 is a pedagogy question:
// not *is the drill free*, but *would a near-miss distractor teach more than a
// far one*. That is a real argument with evidence both ways, and it is not a bug.
describe('E3 — the meaning drill is not answerable without German', () => {
  it('cannot be beaten by the shape of the options', () => {
    // Every third card: the rules break systemically or not at all, and this
    // sweep is the expensive one in the suite.
    const sample = words.filter((_, i) => i % 3 === 0);
    let n = 0, chance = 0, longest = 0, shortest = 0, mostWords = 0;
    for (const w of sample) {
      const mc = meaningOptions(w);
      if (mc.options.length < 2) continue;
      n++;
      chance += 1 / mc.options.length;
      // A strategy scores only when it is *decisive* — a unique extremum. Ties
      // give the guesser nothing, and counting them would flatter the attack.
      const decisive = (v: number[], pick: (x: number[]) => number) => {
        const target = pick(v);
        return v[mc.correct] === target && v.filter((x) => x === target).length === 1;
      };
      const len = mc.options.map((o) => o.length);
      if (decisive(len, (x) => Math.max(...x))) longest++;
      if (decisive(len, (x) => Math.min(...x))) shortest++;
      const wc = mc.options.map((o) => o.split(/[\s,]+/).filter(Boolean).length);
      if (decisive(wc, (x) => Math.max(...x))) mostWords++;
    }
    expect(n).toBeGreaterThan(1000);
    const base = chance / n;
    for (const hit of [longest, shortest, mostWords]) {
      expect(hit / n).toBeLessThanOrEqual(base + 0.01);
    }
  });
});

// ---- E5 · Is dwell a signal? -----------------------------------------------
//
// The separation between dwell and grading is principled and already tested
// (`store-exposure.test.ts`). What is not tested anywhere is whether the learner
// is ever told. They are not, and it fails in two independent places.
describe('E5 — the dwell inference is never shown to the learner', () => {
  // 1. The briefing distinguishes three reasons a fresh word entered today —
  //    saved, dwelt on, weak sector — and writes them into `Briefing.weakSectors`.
  //    Nothing in `src/` reads that field. (Asserted by grep, not by a test: a
  //    test cannot see the absence of a caller. See the VISION entry.)
  //
  // 2. Every fresh card, whatever the reason, reaches the queue as `{kind:'fresh'}`
  //    and `whyLine` is silent on it — so even the reason that *is* carried per
  //    item cannot be rendered.
  it('says nothing under a fresh card', () => {
    expect(whyLine({ kind: 'fresh' })).toBeNull();
  });

  // The contrast that makes it a defect rather than a choice: every other reason
  // the scheduler has speaks up.
  it('while every other reason the scheduler has does speak', () => {
    expect(whyLine({ kind: 'blindspot', mode: 'gender', tag: 'gender', misses: 4 })).not.toBeNull();
    expect(whyLine({ kind: 'unlock', text: 'Der Prozess' })).not.toBeNull();
    expect(whyLine({ kind: 'due', overdueDays: 30 })).not.toBeNull();
  });
});
