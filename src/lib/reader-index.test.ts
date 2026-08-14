// Lesen's surface index and the matcher's index must agree about what a word is.
//
// They are two separate indexes over one lexicon: `reader.ts` builds `surfaceIndex`
// for the reading surface, `matcher.ts` builds its own for the corpus scripts and
// the comprehension meter. BACKLOG Now #2 warns that Phase 1 must be built *on*
// Lesen "or the app ends up with two reading surfaces that disagree" — and on
// 2026-08-15 they did, for a day: the plural-notation fix landed in `matcher.ts`
// first, so `Vorschläge` resolved for the meter and not for the reader.
//
// The shared cause was each index reading `w.plural` raw. Both now expand through
// `pluralForm`, and this file exists so the next divergence fails a test instead of
// quietly giving a learner two different answers about the same word.
import { describe, it, expect } from 'vitest';
import { buildMatcher, pluralForm } from './matcher.ts';
import { lookupSurface, resetSurfaceIndex } from './reader.ts';
import { resetAppMatcher } from './appMatcher.ts';
import { registerWords } from '../data/index.ts';
import type { Word } from '../types.ts';

const w = (o: Partial<Word> & { id: string; term: string }): Word =>
  ({ en: 'x', pos: 'noun', level: 'A1', kind: 'word', field: 'Test', ex: [], syn: [], ant: [], ...o }) as Word;

// One card per plural notation the corpus actually uses.
const CARDS: Word[] = [
  w({ id: 'v:vorschlag', term: 'der Vorschlag', gender: 'der', plural: '¨-e' }),
  w({ id: 'v:mantel', term: 'der Mantel', gender: 'der', plural: '¨-' }),
  w({ id: 'v:patient', term: 'der Patient', gender: 'der', plural: '-en' }),
  w({ id: 'v:handy', term: 'das Handy', gender: 'das', plural: '-s' }),
  w({ id: 'v:einwand', term: 'der Einwand', gender: 'der', plural: '-wände' }),
  w({ id: 'v:pullover', term: 'der Pullover', gender: 'der', plural: '-' }),
  w({ id: 'v:wort', term: 'das Wort', gender: 'das', plural: 'die Wörter' }),
  w({ id: 'v:gemuese', term: 'das Gemüse', gender: 'das', plural: 'nur Singular' }),
  w({ id: 'v:moebel', term: 'die Möbel', gender: 'die', plural: 'nur Plural' }),
  w({ id: 'v:regen', term: 'der Regen', gender: 'der', plural: '—' }),
];

describe('the reader index and the matcher index agree', () => {
  registerWords(CARDS);
  resetSurfaceIndex();
  resetAppMatcher();
  const m = buildMatcher(CARDS);
  const viaMatcher = (tok: string) => m.annotate(tok).find((s) => s.isWord)?.word?.term ?? null;
  const viaReader = (tok: string) => lookupSurface(tok)?.term ?? null;

  for (const card of CARDS) {
    const pl = pluralForm(card.term, card.plural);
    if (!pl) continue;
    it(`both resolve ${pl} to ${card.term}`, () => {
      expect(viaMatcher(pl)).toBe(card.term);
      expect(viaReader(pl)).toBe(card.term);
    });
  }

  // The failure this file was written for: the notation itself must never become a
  // lookup key. "¨-e" and "nur Singular" are descriptions of a plural, not words.
  it('neither index treats a notation as a word', () => {
    for (const junk of ['¨-e', '¨-', '-en', '-s', '-wände', 'nur', 'Singular', 'nur Singular', '—']) {
      expect(viaReader(junk), `reader resolved "${junk}"`).toBeNull();
      expect(viaMatcher(junk), `matcher resolved "${junk}"`).toBeNull();
    }
  });

  it('a card asserting no plural contributes no plural form', () => {
    expect(pluralForm('das Gemüse', 'nur Singular')).toBeNull();
    expect(pluralForm('der Regen', '—')).toBeNull();
  });
});

// `reader.ts` used to answer only from its own maps, which index terms, plurals and
// verb conjugations — and nothing else. Measured over one example per card, 32,713
// tokens: the matcher resolved **2,076 (6.3%)** that the reader did not, so Lesen
// was telling learners that `große`, `Hunden` and `Lehrerin` were words they did
// not know. `lookupSurface` now falls through to the shared matcher.
//
// It is a fallback and not a replacement on purpose. The two disagree on 520 of the
// 22,861 both resolve, and on the capitalised ones the *reader* is right: German
// capitalises nouns, so `Essen` is the meal and `Morgen` is the morning, which a
// case-insensitive index cannot see. Answering from the maps first means nothing
// that resolves today can start resolving differently.
describe('the reader falls through to the matcher', () => {
  const RICH: Word[] = [
    w({ id: 'v:gross', term: 'groß', pos: 'adjective' }),
    w({ id: 'v:hund', term: 'der Hund', gender: 'der', plural: 'die Hunde' }),
    w({ id: 'v:lehrer', term: 'der Lehrer', gender: 'der', plural: 'die Lehrer' }),
    w({ id: 'v:essen-n', term: 'das Essen', gender: 'das' }),
    w({ id: 'v:essen-v', term: 'essen', pos: 'verb' }),
  ];
  const prime = () => { registerWords(RICH); resetSurfaceIndex(); resetAppMatcher(); };

  it('now resolves the inflections its own maps never carried', () => {
    prime();
    expect(lookupSurface('große')?.term).toBe('groß');       // adjective declension
    expect(lookupSurface('Hunden')?.term).toBe('der Hund');  // dative plural
    expect(lookupSurface('Lehrerin')?.term).toBe('der Lehrer'); // -in feminine
  });

  it('still lets its own case-sensitive map win — Essen is the meal', () => {
    prime();
    expect(lookupSurface('Essen')?.term).toBe('das Essen');
    expect(lookupSurface('essen')?.term).toBe('essen');
  });

  it('returns null for a word nothing knows', () => {
    prime();
    expect(lookupSurface('Quatschwortxyz')).toBeNull();
  });
});
