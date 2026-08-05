import { describe, it, expect } from 'vitest';
import { buildMatcher } from './matcher.ts';
import type { Word } from '../types.ts';

const w = (over: Partial<Word>): Word => ({
  id: 'x', term: '', en: '', pos: 'noun', level: 'A1', gender: null, plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'Test', kind: 'word', ...over,
});

const corpus: Word[] = [
  w({ id: 'v:tisch', term: 'der Tisch', pos: 'noun', gender: 'der', plural: 'die Tische' }),
  w({ id: 'v:gehen', term: 'gehen', pos: 'verb' }),
  w({ id: 'v:schnell', term: 'schnell', pos: 'adjective' }),
];
const m = buildMatcher(corpus);
const matched = (surface: string) => m.annotate(surface)[0]?.word?.term ?? null;

describe('buildMatcher — annotate', () => {
  it('matches an article-stripped headword', () => {
    expect(matched('Tisch')).toBe('der Tisch');
  });
  it('matches a plural to its lemma', () => {
    expect(matched('Tische')).toBe('der Tisch');
  });
  it('matches a dative-plural -n to the noun', () => {
    expect(matched('Tischen')).toBe('der Tisch');
  });
  it('matches a conjugated verb form to the infinitive', () => {
    expect(matched('ging')).toBe('gehen');   // Präteritum of gehen
    expect(matched('gegangen')).toBe('gehen'); // Partizip II
  });
  it('matches an inflected adjective by de-inflection', () => {
    expect(matched('schnelle')).toBe('schnell');
  });
  it('returns null for an unknown surface form', () => {
    expect(matched('xyzzy')).toBe(null);
  });
});

// The three defect classes the 2026-08-05 quality pass found, each of which made
// the matcher disagree with the corpus's own example sentences — and, since the
// comprehension meter is built on this, would have made its headline number wrong.
describe('buildMatcher — verbs in real sentences', () => {
  const c: Word[] = [
    w({ id: 'v:anrufen', term: 'anrufen', pos: 'verb' }),
    w({ id: 'v:rufen', term: 'rufen', pos: 'verb' }),
    w({ id: 'v:ruf', term: 'der Ruf', pos: 'noun', gender: 'der', plural: 'die Rufe' }),
    w({ id: 'v:geben', term: 'geben', pos: 'verb' }),
    w({ id: 'v:wissen', term: 'wissen', pos: 'verb' }),
    w({ id: 'v:weiss', term: 'weiß', pos: 'adjective' }),
    w({ id: 'v:sichern', term: 'sichern', pos: 'verb' }),
    w({ id: 'v:sicher', term: 'sicher', pos: 'adjective' }),
  ];
  const mm = buildMatcher(c);
  /** The card a given token resolves to, in the context of a whole sentence. */
  const inSentence = (sentence: string, token: string) =>
    mm.annotate(sentence).find((s) => s.isWord && s.text.toLowerCase() === token.toLowerCase())?.word?.term ?? null;

  it('reassembles a separable verb when the particle lands later in the clause', () => {
    // `conjugate` emits "rufe an" — a two-token string single-token lookup could
    // never reach, so every separable verb used to miss outright.
    expect(inSentence('Ich rufe dich später an.', 'rufe')).toBe('anrufen');
  });

  it('does not claim the separable verb when the particle is absent', () => {
    // Without "an" this is the simplex verb, and must stay so.
    expect(inSentence('Ich rufe laut.', 'rufe')).toBe('rufen');
  });

  it('does not reach across a sentence boundary for the particle', () => {
    expect(inSentence('Ich rufe laut. Fang an!', 'rufe')).toBe('rufen');
  });

  it('resolves the zu-infinitive of a separable verb', () => {
    expect(inSentence('Ich habe versucht, dich anzurufen.', 'anzurufen')).toBe('anrufen');
  });

  it('resolves an imperative', () => {
    // Imperatives are not in the conjugator's output at all.
    expect(inSentence('Gib mir das Buch.', 'Gib')).toBe('geben');
  });

  it('prefers the verb over a noun plural for a lowercase token', () => {
    // `die Rufe` is indexed before any verb form, so first-wins gave the noun.
    // German capitalises nouns, which is the tie-breaker.
    expect(inSentence('Ich rufe dich an.', 'rufe')).toBe('anrufen');
    expect(inSentence('Die Rufe waren laut.', 'Rufe')).toBe('der Ruf');
  });

  it('reads a verb-second homograph as the verb, and only there', () => {
    // *weiß* is both the colour and `wissen`'s 1st/3rd singular.
    expect(inSentence('Ich weiß es nicht.', 'weiß')).toBe('wissen');
    expect(inSentence('Die weiße Wand.', 'weiße')).toBe('weiß');
  });

  it('does not treat a predicate adjective as a verb just because a pronoun precedes it', () => {
    // The regression that made the position check necessary: in "Hier ist es
    // sicher" the pronoun is third and the adjective fourth, so this is not the
    // verb-second pattern and `sicher` must stay the adjective, not `sichern`.
    expect(inSentence('Hier ist es sicher.', 'sicher')).toBe('sicher');
  });
});

describe('buildMatcher — heuristics', () => {
  it('isNeutralWord flags function words, not content words', () => {
    expect(m.isNeutralWord('und')).toBe(true);
    expect(m.isNeutralWord('der')).toBe(true);
    expect(m.isNeutralWord('Tisch')).toBe(false);
  });
  it('isLikelyEntity flags 2+ capitals (acronyms/compounds), not common nouns', () => {
    expect(m.isLikelyEntity('EU')).toBe(true);
    expect(m.isLikelyEntity('Sachsen-Anhalt')).toBe(true);
    expect(m.isLikelyEntity('Tisch')).toBe(false);
  });
});
