// The meter's whole claim is that the number is honest, so these tests are mostly
// about the denominator rather than the arithmetic.
//
// BACKLOG Now #2 Phase 1 done-when: "a pasted text reports a coverage figure that
// matches a hand count". The first block does exactly that — a sentence small
// enough to count on paper, with the expected numerator and denominator written out
// token by token.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  coverageOf, unlocksToReach, excludedReason, resetCoverageIndex,
  ASSISTED, INDEPENDENT, type WordState,
} from './coverage.ts';
import { registerWords } from '../data/index.ts';
import { primeFreq } from './freq.ts';
import type { Word } from '../types.ts';

const w = (o: Partial<Word> & { id: string; term: string }): Word =>
  ({ en: 'x', pos: 'noun', level: 'A1', kind: 'word', field: 'Test', ex: [], syn: [], ant: [], ...o }) as Word;

const CARDS: Word[] = [
  w({ id: 'v:hund', term: 'der Hund', gender: 'der', plural: 'die Hunde' }),
  w({ id: 'v:katze', term: 'die Katze', gender: 'die', plural: 'die Katzen' }),
  w({ id: 'v:vorschlag', term: 'der Vorschlag', gender: 'der', plural: '¨-e' }),
  w({ id: 'v:garten', term: 'der Garten', gender: 'der', plural: '¨-' }),
  w({ id: 'v:schlafen', term: 'schlafen', pos: 'verb' }),
  w({ id: 'v:gross', term: 'groß', pos: 'adjective' }),
];

beforeEach(() => {
  registerWords(CARDS);
  resetCoverageIndex();
  primeFreq({ 'v:hund': 120, 'v:katze': 400, 'v:vorschlag': 2600 });
});

/** Every word `known` except the ones named. */
const allKnownBut = (map: Record<string, WordState>) =>
  (word: Word): WordState => map[word.id] ?? 'known';

describe('the denominator — counted by hand', () => {
  // "Der große Hund und die Katze schlafen im Garten in Berlin."
  //
  //   Der      function word   excluded
  //   große    -> groß         counted
  //   Hund     -> der Hund     counted
  //   und      function word   excluded
  //   die      function word   excluded
  //   Katze    -> die Katze    counted
  //   schlafen -> schlafen     counted
  //   im       function word   excluded
  //   Garten   -> der Garten   counted
  //   in       function word   excluded
  //   Berlin   not in corpus   counted  <- absent, and it counts against you
  //
  // 6 counted, 5 resolvable, 1 absent.
  const TEXT = 'Der große Hund und die Katze schlafen im Garten in Berlin.';

  it('counts content tokens and excludes function words', () => {
    const c = coverageOf(TEXT, { stateOf: allKnownBut({}) });
    expect(c.counted).toBe(6);
    expect(c.excluded.neutral).toBeGreaterThanOrEqual(5);
  });

  it('a word the corpus has never heard of still counts against you', () => {
    const c = coverageOf(TEXT, { stateOf: allKnownBut({}) });
    expect(c.absent).toBe(1);                    // Berlin
    expect(c.known).toBe(5);
    expect(c.ratio).toBeCloseTo(5 / 6, 5);
    // The ceiling says so out loud: even studying everything Lexi has, this text
    // tops out at 5/6 because Berlin is not a card.
    expect(c.ceiling).toBeCloseTo(5 / 6, 5);
  });

  it('separates learning from known, and learning does not count as read', () => {
    const c = coverageOf(TEXT, { stateOf: allKnownBut({ 'v:katze': 'learning', 'v:hund': 'new' }) });
    expect(c.known).toBe(3);
    expect(c.learning).toBe(1);
    expect(c.fresh).toBe(1);
    expect(c.known + c.learning + c.fresh + c.absent).toBe(c.counted);
  });

  it('resolves an inflected plural through the shared index', () => {
    const c = coverageOf('Die Vorschläge sind gut.', { stateOf: allKnownBut({}) });
    const t = c.tokens.find((x) => x.text === 'Vorschläge');
    expect(t?.word?.term).toBe('der Vorschlag');
    expect(t?.counted).toBe(true);
  });
});

describe('the exclusions that would flatter the number', () => {
  it('excludes function words, ordinals and spelled-out cardinals', () => {
    expect(excludedReason('und')).toBe('neutral');
    expect(excludedReason('zweiten')).toBe('neutral');
    expect(excludedReason('fünfzehn')).toBe('neutral');
  });

  it('excludes structural proper nouns but not ordinary capitalised nouns', () => {
    expect(excludedReason('ARD')).toBe('entity');
    expect(excludedReason('Sachsen-Anhalt')).toBe('entity');
    // The rule that was measured and rejected: German capitalises every noun, so
    // "capitalised and unresolvable" would call these names and inflate the score.
    expect(excludedReason('Vorschläge')).toBeNull();
    expect(excludedReason('Lesesaal')).toBeNull();
    expect(excludedReason('Berlin')).toBeNull();
  });
});

describe('the bands', () => {
  const text = (n: number, known: number) => {
    // n content words, `known` of them known — built from repeated real cards.
    const words = Array.from({ length: n }, (_, i) => (i < known ? 'Hund' : 'Berlin'));
    return words.join(' ') + '.';
  };

  it('reports independent at 98% and assisted at 95%', () => {
    const at98 = coverageOf(text(100, 98), { stateOf: allKnownBut({}) });
    expect(at98.ratio).toBeCloseTo(INDEPENDENT, 5);
    expect(at98.band).toBe('independent');

    const at95 = coverageOf(text(100, 95), { stateOf: allKnownBut({}) });
    expect(at95.ratio).toBeCloseTo(ASSISTED, 5);
    expect(at95.band).toBe('assisted');

    expect(coverageOf(text(100, 80), { stateOf: allKnownBut({}) }).band).toBe('frustrational');
  });

  it('reports the count needed, not just a percentage', () => {
    const c = coverageOf(text(100, 90), { stateOf: allKnownBut({}) });
    expect(c.toAssisted).toBe(5);      // 90 -> 95
    expect(c.toIndependent).toBe(8);   // 90 -> 98
  });

  it('an empty or wordless text does not divide by zero', () => {
    const c = coverageOf('  —  ', { stateOf: allKnownBut({}) });
    expect(c.counted).toBe(0);
    expect(c.ratio).toBe(0);
    expect(c.toAssisted).toBe(0);
  });
});

describe('the words that get you over the line', () => {
  // Every content word here is a card, so 95% is actually reachable. An earlier
  // draft included *gut*, which is not in this fixture's corpus — one absent token
  // in a seven-token text caps coverage at 85.7% and `unlocksToReach` correctly
  // reported that it could not get there. The code was right and the test was
  // wrong, which is the failure mode this whole file exists to catch.
  const TEXT = 'Der Hund und der Hund und die Katze schlafen im Garten.';

  it('ranks by recurrence in this text first', () => {
    const c = coverageOf(TEXT, { stateOf: () => 'new' });
    expect(c.unlocks[0].word.term).toBe('der Hund');   // appears twice
    expect(c.unlocks[0].occurrences).toBe(2);
  });

  it('never offers a word that is already known', () => {
    const c = coverageOf(TEXT, { stateOf: allKnownBut({ 'v:katze': 'new' }) });
    expect(c.unlocks.map((u) => u.word.id)).toEqual(['v:katze']);
  });

  it('offers the fewest words that reach the target', () => {
    const c = coverageOf(TEXT, { stateOf: () => 'new' });
    const { picks, reaches } = unlocksToReach(c, ASSISTED);
    expect(reaches).toBe(true);
    const gained = picks.reduce((n, p) => n + p.occurrences, 0);
    expect(gained).toBeGreaterThanOrEqual(c.toAssisted);
    // and it is minimal: dropping the last pick must fall short
    const without = gained - picks[picks.length - 1].occurrences;
    expect(without).toBeLessThan(c.toAssisted);
  });

  it('says so when the target is out of reach rather than returning a set that misses', () => {
    // Half the text is words the corpus does not have, so 95% is unreachable.
    const c = coverageOf('Berlin Hamburg Bremen Hund.', { stateOf: () => 'new' });
    const { reaches } = unlocksToReach(c, ASSISTED);
    expect(reaches).toBe(false);
    expect(c.ceiling).toBeLessThan(ASSISTED);
  });

  it('studying the unlock set demonstrably raises the figure', () => {
    const before = coverageOf(TEXT, { stateOf: () => 'new' });
    const { picks } = unlocksToReach(before, ASSISTED);
    const learned = new Set(picks.map((p) => p.word.id));
    const after = coverageOf(TEXT, { stateOf: (word) => (learned.has(word.id) ? 'known' : 'new') });
    expect(after.ratio).toBeGreaterThan(before.ratio);
    expect(after.ratio).toBeGreaterThanOrEqual(ASSISTED);
  });
});
