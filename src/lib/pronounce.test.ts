import { describe, it, expect } from 'vitest';
import { CLEAR, MAX_OFFSET, pickWords, registration, scoreAttempt, similarity, verdict } from './pronounce.ts';
import type { Word } from '../types.ts';

describe('similarity', () => {
  it('is 1 for the same word, ignoring case and punctuation', () => {
    expect(similarity('der Tisch', 'Der Tisch.')).toBe(1);
  });
  it('accepts a noun said without its article', () => {
    expect(similarity('der Tisch', 'Tisch')).toBe(1);
  });
  it('keeps umlauts meaningful — schon is not schön', () => {
    expect(similarity('schön', 'schon')).toBeLessThan(1);
    expect(verdict(similarity('schön', 'schon'))).toBe('close');
  });
  it('is 0 for nothing heard', () => {
    expect(similarity('Haus', '')).toBe(0);
  });
});

describe('scoreAttempt', () => {
  it('takes the best alternative, not the first', () => {
    const r = scoreAttempt('die Brücke', [
      { transcript: 'die Brüche', confidence: 0.9 },
      { transcript: 'die Brücke', confidence: 0.2 },
    ]);
    expect(r).toEqual({ score: 1, best: 'die Brücke' });
  });
  it('scores an empty result as 0', () => {
    expect(scoreAttempt('Haus', []).score).toBe(0);
  });
});

describe('registration', () => {
  it('is in register at or above CLEAR', () => {
    expect(registration(CLEAR)).toBe(0);
    expect(registration(1)).toBe(0);
  });
  it('drifts in proportion to the miss, up to MAX_OFFSET', () => {
    expect(registration(0)).toBe(MAX_OFFSET);
    expect(registration(0.5)).toBe(MAX_OFFSET / 2);
    expect(registration(0.7)).toBeLessThan(registration(0.4));
  });
});

describe('pickWords', () => {
  const w = (id: string, term: string, level: Word['level'] = 'A1', kind: Word['kind'] = 'word') =>
    ({ id, term, level, kind }) as Word;
  const corpus = [
    w('1', 'der Tisch'), w('2', 'laufen'), w('3', 'sich freuen'), w('4', 'Perfekt', 'A1', 'grammar'),
    w('5', 'die Brücke', 'A2'), w('6', 'schön'),
  ];
  it('keeps single words at the level, drops phrases and grammar', () => {
    const got = pickWords(corpus, 'A1', 7, 10).map((x) => x.term).sort();
    expect(got).toEqual(['der Tisch', 'laufen', 'schön']);
  });
  it('is deterministic for a seed', () => {
    expect(pickWords(corpus, 'A1', 3, 2)).toEqual(pickWords(corpus, 'A1', 3, 2));
  });
});
