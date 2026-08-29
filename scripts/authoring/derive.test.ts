// The rules the authoring gate is allowed to use instead of a dictionary.
//
// Two things are being protected here and only one of them is "does it work".
// The other is **what it refuses to say** — a derivation that over-reaches puts a
// wrong gender on a card, which is the single failure `verify.ts` exists to
// prevent, and it does so with the confidence of a rule rather than the hedging of
// a guess.
import { describe, it, expect } from 'vitest';
import { buildIndex, compose, deriveNoun, fugenIpa, splitCompound } from './derive.ts';
import type { Word } from '../../src/types.ts';

const w = (term: string, pos: string, gender: string | null = null, plural: string | null = null): Word => ({
  id: `voc:B1:${term}`, term, en: 'x', pos, level: 'B1', gender, plural, ipa: null,
  def: null, syn: [], ant: [], ex: [], field: 'x', kind: 'word',
} as Word);

const CORPUS: Word[] = [
  w('die Atmosphäre', 'noun', 'die', 'die Atmosphären'),
  w('die Arbeit', 'noun', 'die', 'die Arbeiten'),
  w('der Schrank', 'noun', 'der', 'die Schränke'),
  w('der Einbau', 'noun', 'der', 'nur Singular'),
  w('das Haus', 'noun', 'das', 'die Häuser'),
  w('die Wurst', 'noun', 'die', 'die Würste'),
  w('braten', 'verb'),
  w('das Bewusstsein', 'noun', 'das', 'nur Singular'),
  w('die Tradition', 'noun', 'die', 'die Traditionen'),
  w('die Leute', 'noun', 'die', 'nur Plural'),
  w('das Fach', 'noun', 'das', 'die Fächer'),
  // The traps: heads that a suffix-matcher would find inside ordinary words.
  w('das Gen', 'noun', 'das', 'die Gene'),
  w('der Tanz', 'noun', 'der', 'die Tänze'),
  w('das Wort', 'noun', 'das', 'die Wörter'),
  w('das Eis', 'noun', 'das', 'nur Singular'),
];
const ix = buildIndex(CORPUS);

describe('the compound rule', () => {
  it('takes the gender of the last noun', () => {
    expect(deriveNoun('Arbeitsatmosphäre', ix)!.gender).toBe('die');
    expect(deriveNoun('Einbauschrank', ix)!.gender).toBe('der');
    expect(deriveNoun('Fachleute', ix)!.gender).toBe('die');
  });

  it('takes the modifier from a verb stem, not only from a noun', () => {
    // braten + die Wurst → die Bratwurst, which is the book's own example.
    expect(deriveNoun('Bratwurst', ix)!.gender).toBe('die');
  });

  it('carries the head’s plural forward, umlaut and all', () => {
    expect(deriveNoun('Einbauschrank', ix)!.plural).toBe('die Einbauschränke');
    expect(deriveNoun('Arbeitsatmosphäre', ix)!.plural).toBe('die Arbeitsatmosphären');
  });

  it('carries the head’s *absence* of a plural forward too', () => {
    // A head that is nur Singular makes the compound nur Singular. That is the
    // right answer rather than a guess, and it is how `das Traditionsbewusstsein`
    // avoids acquiring a plural nobody would ever say.
    expect(deriveNoun('Traditionsbewusstsein', ix)!.plural).toBe('nur Singular');
  });

  it('handles the linking element without letting it eat the modifier', () => {
    const s = splitCompound('Arbeitsatmosphäre', ix)!;
    expect(s.modifier).toBe('arbeit');
    expect(s.fugen).toBe('s');
  });
});

describe('what it refuses, which is the point', () => {
  it('will not split a word whose modifier is not itself a word', () => {
    // Head-only matching decomposes `Morgen` into `Gen`, `Distanz` into `Tanz` and
    // `Antwort` into `Wort`, and reports a confident 95% rule built on words that
    // are not compounds at all. Requiring both halves is the whole measurement.
    for (const notACompound of ['Morgen', 'Distanz', 'Antwort', 'Preis']) {
      expect(splitCompound(notACompound, ix)).toBeNull();
    }
  });

  it('says nothing at all about a word no rule covers', () => {
    expect(deriveNoun('Blafasel', ix)).toBeNull();
  });

  it('refuses when the compound and the suffix disagree', () => {
    // Two rules contradicting each other is a reason to ask a human, not to hold
    // a vote between them.
    const trap = buildIndex([...CORPUS, w('der Tum', 'noun', 'der', 'die Tume'), w('das Reich', 'noun', 'das', 'die Reiche')]);
    expect(deriveNoun('Reichtum', trap)).toBeNull();
  });
});

describe('the suffix rule', () => {
  it('gives the gender of -ung, -heit, -keit, -schaft, -ität', () => {
    for (const t of ['Falsifizierung', 'Datensicherheit', 'Zwangsläufigkeit', 'Bürgerschaft', 'Modalität']) {
      expect(deriveNoun(t, ix)!.gender).toBe('die');
    }
    expect(deriveNoun('Kapitalismus', ix)!.gender).toBe('der');
    expect(deriveNoun('Häuschen', ix)!.gender).toBe('das');
  });

  it('never supplies a plural', () => {
    // The suffix fixes the gender and says nothing about whether the noun has a
    // plural a learner should meet — that is a question about meaning. Guessing it
    // is how `die Anzahlen` and `die Gebäcke` reached the corpus.
    for (const t of ['Falsifizierung', 'Datensicherheit', 'Kapitalismus']) {
      expect(deriveNoun(t, ix)!.plural).toBeNull();
    }
  });

  it('marks a derived fact as derived', () => {
    expect(deriveNoun('Falsifizierung', ix)!.why).toMatch(/suffix rule/);
    expect(deriveNoun('Arbeitsatmosphäre', ix)!.why).toMatch(/compound/);
  });
});

describe('the linking element is part of the word, so it is part of the sound', () => {
  it('gives the Fugen its own transcription', () => {
    expect(fugenIpa('s')).toBe('s');
    expect(fugenIpa('en')).toBe('ən');
    expect(fugenIpa('')).toBe('');
  });

  it('puts it back into a composed compound', () => {
    // Arbeit /ˈaʁbaɪ̯t/ + s + Atmosphäre /atmoˈsfɛːʁə/. Without the linking element
    // this composed to ˈaʁbaɪ̯tatmoˌsfɛːʁə — a word that is written and said with an
    // s, transcribed without one. Every existing composition happened to have no
    // Fugen, so nothing had exercised it.
    const got = ['ˈaʁbaɪ̯t', 'atmoˈsfɛːʁə'];
    const d = deriveNoun('Arbeitsatmosphäre', ix)!;
    got[0] += fugenIpa(d.fugen);
    expect(compose(got)).toBe('ˈaʁbaɪ̯tsatmoˌsfɛːʁə');
  });
});
