// Persona pass, 2026-11-20 ("Priya"): German typed the way phones type it, and
// notations the recall drill read as sense labels.
import { describe, it, expect } from 'vitest';
import { recallAnswers, stripArticle, askablePlural, askableGender } from './drills.tsx';
import type { Word } from '../types.ts';

const w = (term: string, extra: Partial<Word> = {}): Word => ({
  id: `t:${term}`, term, en: '', pos: 'noun', level: 'A1', gender: null, plural: null, ipa: null,
  def: null, syn: [], ant: [], ex: [], field: 'T', kind: 'word', ...extra,
});

describe('recall answers', () => {
  it('expands a bracket that names grammar instead of dropping it', () => {
    expect(recallAnswers(w('kümmern (sich um)'))).toEqual(['kümmern (sich um)', 'sich kümmern um', 'sich kümmern']);
    expect(recallAnswers(w('versöhnen (sich)'))).toContain('sich versöhnen');
    expect(recallAnswers(w('leiden (unter)'))).toContain('leiden unter');
    // …and no longer accepts a different verb for it.
    expect(recallAnswers(w('kümmern (sich um)'))).not.toContain('kümmern');
  });
  it('still drops a sense label, and takes the first form of a pair', () => {
    expect(recallAnswers(w('ansprechen (Person)'))).toContain('ansprechen');
    expect(recallAnswers(w('gern — lieber'))).toContain('gern');
  });
});

describe('two-gender and plural-only nouns', () => {
  it('strips der/die, so the prompt does not print the answer', () => {
    expect(stripArticle('der/die Verwandte')).toBe('Verwandte');
  });
  it('does not ask a two-gender noun for one article, nor a phrase that is not a noun', () => {
    expect(askableGender(w('der/die Verwandte', { gender: 'der' }))).toBe(false);
    expect(askableGender(w('Das ist schade.', { gender: 'das', pos: 'phrase' }))).toBe(false);
    expect(askableGender(w('die Karte sperren', { gender: 'die', pos: 'phrase' }))).toBe(true);
    expect(askableGender(w('der Tisch', { gender: 'der' }))).toBe(true);
  });
  it('does not ask for a plural spelled exactly as the headword', () => {
    expect(askablePlural(w('die USA', { gender: 'die', plural: 'die USA' }))).toBeNull();
    expect(askablePlural(w('das Zimmer', { gender: 'das', plural: 'die Zimmer' }))).toBe('die Zimmer');
  });
});
