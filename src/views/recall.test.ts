// The recall drill's gate, pinned.
//
// This is the one drill that asks for production, and the one whose failure mode
// is the thing this codebase never does: telling a learner that correct German is
// wrong. `recallSafe` is the whole defence, so every exclusion it makes has a test
// here — a future pass that loosens the gate to grow the pool should have to
// delete one of these deliberately.
import { describe, it, expect } from 'vitest';
import { registerWords, WORDS } from '../data/index.ts';
import { recallSafe, recallHints, articleMiss, eligibleModes, MODE_TAG, recallAnswers, recallSynonyms, reflexiveMiss, isTypoFor, pluralsOf, askablePlural } from './drills.tsx';
import type { Word } from '../types.ts';

const w = (id: string, term: string, en: string, extra: Partial<Word> = {}): Word => ({
  id, term, en, pos: 'noun', level: 'A1', gender: 'der', plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'Test', kind: 'word', ...extra,
});

registerWords([
  // Clean: one German card, one unambiguous English gloss.
  w('voc:A1:die Sprache', 'die Sprache', 'language', { gender: 'die' }),
  w('voc:A1:laufen', 'laufen', 'to run', { pos: 'verb', gender: null }),
  // Ambiguous: two cards answer "table". Neither may be drilled.
  w('voc:A1:der Tisch', 'der Tisch', 'table'),
  w('voc:B1:die Tabelle', 'die Tabelle', 'table', { gender: 'die', level: 'B1' }),
  // A gloss that is a list — the learner cannot know which word is wanted.
  w('voc:A1:der Bahnhof', 'der Bahnhof', 'station, depot, terminus'),
  w('voc:A1:die Art', 'die Art', 'kind or sort', { gender: 'die' }),
  // Transparent — tests confidence, not German.
  w('voc:A1:das Hotel', 'das Hotel', 'hotel', { gender: 'das' }),
  // A grammar card is never a vocabulary prompt.
  { ...w('gram:A1:Artikel', 'Artikel & Genus', 'the rule'), kind: 'grammar' },
]);

const byTerm = (t: string) => WORDS.find((x) => x.term === t)!;

describe('recallSafe — what may be asked in the productive direction', () => {
  it('admits a card whose gloss points back at exactly one German word', () => {
    expect(recallSafe(byTerm('die Sprache'))).toBe(true);
    expect(recallSafe(byTerm('laufen'))).toBe(true);
  });

  it('refuses a gloss two cards answer — der Tisch and die Tabelle are both "table"', () => {
    // The failure this prevents: prompting "table", the learner types "die
    // Tabelle", and the app calls correct German wrong.
    expect(recallSafe(byTerm('der Tisch'))).toBe(false);
    expect(recallSafe(byTerm('die Tabelle'))).toBe(false);
  });

  it('refuses a gloss that is a list, however it is punctuated', () => {
    expect(recallSafe(byTerm('der Bahnhof'))).toBe(false);  // commas
    expect(recallSafe(byTerm('die Art'))).toBe(false);      // the word "or"
  });

  it('refuses a transparent gloss — "hotel" tests nothing', () => {
    expect(recallSafe(byTerm('das Hotel'))).toBe(false);
  });

  it('refuses grammar cards and anything with no gloss', () => {
    expect(recallSafe(byTerm('Artikel & Genus'))).toBe(false);
    expect(recallSafe({ ...byTerm('die Sprache'), en: '' })).toBe(false);
  });
});

describe('recall is gated on the learner, not only on the card', () => {
  it('is not offered for a word the learner has not yet consolidated', () => {
    // No FSRS card exists for these ids in this test store, so statusOf is 'new'.
    // Production before recognition is a retrieval attempt on an unencoded item.
    expect(eligibleModes(byTerm('die Sprache'))).not.toContain('recall');
  });
});

describe('recallHints — the ladder names the gender first', () => {
  it('leads with the gender for a noun, without giving away the article', () => {
    const [first] = recallHints(byTerm('die Sprache'));
    expect(first).toContain('feminine');
    expect(first).not.toContain('die');
    // "Sprache" — the bare noun, not "die Sprache".
    expect(first).toContain('7 letters');
  });

  it('falls back to the part of speech when there is no gender', () => {
    expect(recallHints(byTerm('laufen'))[0]).toContain('verb');
  });

  it('never leaks the article in the later rungs either', () => {
    const [, second, third] = recallHints(byTerm('die Sprache'));
    expect(second).toBe('starts with “S”');
    expect(third).toBe('“Spra…”');
  });
});

describe('articleMiss — naming a gender error instead of just saying no', () => {
  const sprache = () => byTerm('die Sprache');

  it('names the bare noun as an article omission, not a vocabulary failure', () => {
    expect(articleMiss('Sprache', sprache())).toContain('The word is right');
    expect(articleMiss('Sprache', sprache())).toContain('die Sprache');
  });

  it('names the wrong article as a gender error and shows the right one', () => {
    const note = articleMiss('der Sprache', sprache())!;
    expect(note).toContain('wrong gender');
    expect(note).toContain('die Sprache');
  });

  it('stays silent for a genuinely wrong word, so nothing is excused', () => {
    expect(articleMiss('die Katze', sprache())).toBeNull();
    expect(articleMiss('', sprache())).toBeNull();
  });

  it('stays silent for a word with no gender at all', () => {
    expect(articleMiss('laufen', byTerm('laufen'))).toBeNull();
  });

  it('is umlaut- and case-tolerant, like every other typed grade', () => {
    // The learner who types the noun without its article should get the same
    // lesson whether or not their keyboard has umlauts.
    const hotel = { ...byTerm('das Hotel'), term: 'die Fakultät', gender: 'die' as const };
    expect(articleMiss('fakultaet', hotel)).toContain('needs the article');
  });
});

describe('mode registration', () => {
  it('is named, so a miss lands in the blind-spot table under something readable', () => {
    expect(MODE_TAG.recall).toBe('Recall (English → German)');
  });
});

// ---- recall accepts correct German (panel review, 2026-09-25) ----------------

registerWords([
  w('voc:B1:verzichten auf + A', 'verzichten auf + A', 'to do without', { pos: 'verb', gender: null }),
  w('voc:A2:der/die Bekannte', 'der/die Bekannte', 'acquaintance', { gender: null }),
  w('voc:B1:ansprechen (Person)', 'ansprechen (Person)', 'to address (a person)', { pos: 'verb', gender: null }),
  w('voc:A2:sich beeilen', 'sich beeilen', 'to hurry', { pos: 'verb', gender: null }),
  w('voc:A1:Wie bitte?', 'Wie bitte?', 'pardon?', { pos: 'phrase', gender: null }),
  w('voc:A1:schließen', 'schließen', 'to shut', { pos: 'verb', gender: null, syn: ['zumachen'] }),
  w('voc:A2:zumachen', 'zumachen', 'to close up', { pos: 'verb', gender: null }),
  w('voc:B1:der Fahrstuhl', 'der Fahrstuhl', 'elevator car'),
  w('voc:A1:der Aufzug', 'der Aufzug', 'lift', { syn: ['Fahrstuhl'] }),
  w('voc:B1:beginnen', 'beginnen', 'to commence', { pos: 'verb', gender: null, syn: ['anfangen'] }),
  w('voc:A1:anfangen', 'anfangen', 'to begin', { pos: 'verb', gender: null }),
  w('voc:A1:die Pizza', 'die Pizza', 'pizza', { gender: 'die', plural: 'die Pizzas / die Pizzen' }),
]);

describe('recallAnswers — the notation is not the German', () => {
  it('drops the government marker, and keeps the written form first for the miss screen', () => {
    expect(recallAnswers(byTerm('verzichten auf + A'))).toEqual(['verzichten auf + A', 'verzichten auf']);
  });

  it('drops a sense label in parentheses', () => {
    expect(recallAnswers(byTerm('ansprechen (Person)'))).toContain('ansprechen');
  });

  it('splits a two-gender noun into both, each with its article', () => {
    expect(recallAnswers(byTerm('der/die Bekannte'))).toEqual(
      expect.arrayContaining(['der Bekannte', 'die Bekannte']));
  });

  it('leaves a plain headword alone', () => {
    expect(recallAnswers(byTerm('die Sprache'))).toEqual(['die Sprache']);
  });

  it('counts hint letters on the German, not on "+ A"', () => {
    expect(recallHints(byTerm('verzichten auf + A'))[0]).toContain('14 letters');
  });
});

describe('recallSynonyms — another card that is also right', () => {
  it('finds a synonym named on this card, of the same part of speech', () => {
    expect(recallSynonyms(byTerm('schließen')).map((c) => c.term)).toEqual(['zumachen']);
  });

  it('finds it from the other side too — the syn field is not symmetric', () => {
    expect(recallSynonyms(byTerm('anfangen')).map((c) => c.term)).toEqual(['beginnen']);
  });

  it('brings the synonym noun with its own article', () => {
    expect(recallSynonyms(byTerm('der Aufzug')).map((c) => c.term)).toEqual(['der Fahrstuhl']);
  });

  it('finds nothing for a card with no relation', () => {
    expect(recallSynonyms(byTerm('die Sprache'))).toEqual([]);
  });
});

describe('reflexiveMiss — right verb, no sich', () => {
  it('names the missing reflexive', () => {
    expect(reflexiveMiss('beeilen', byTerm('sich beeilen'))).toContain('sich beeilen');
  });
  it('stays silent for a wrong verb and for a non-reflexive card', () => {
    expect(reflexiveMiss('laufen', byTerm('sich beeilen'))).toBeNull();
    expect(reflexiveMiss('laufen', byTerm('laufen'))).toBeNull();
  });
});

describe('isTypoFor — punctuation is not an edit', () => {
  it('forgives one slipped letter in a phrase whose answer ends in "?"', () => {
    expect(isTypoFor('wie bite', ['Wie bitte?'])).toBe(true);
  });
});

describe('several plurals — the drill asks one and never offers the other as wrong', () => {
  it('reads every stated form', () => {
    expect(pluralsOf(byTerm('die Pizza'))).toEqual(['die Pizzas', 'die Pizzen']);
  });
  it('asks for the first', () => {
    expect(askablePlural(byTerm('die Pizza'))).toBe('die Pizzas');
  });
  it('still reads a single plural and still refuses markers', () => {
    expect(pluralsOf({ ...byTerm('die Pizza'), plural: 'die Pizzen' })).toEqual(['die Pizzen']);
    expect(askablePlural({ ...byTerm('die Pizza'), plural: 'nur Singular' })).toBeNull();
  });
});
