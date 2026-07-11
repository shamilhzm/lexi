import { describe, it, expect } from 'vitest';
import { buildMatcher } from './matcher.ts';
import type { Word } from '../../src/types.ts';

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
