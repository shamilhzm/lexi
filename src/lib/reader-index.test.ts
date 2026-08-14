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
