// The placement test gets five probes per level. A word whose German form hands
// over its English meaning burns one of them and inflates the result, so the
// pool filters them out — this pins which words that means.
import { describe, it, expect } from 'vitest';
import { isTransparent } from './Placement.tsx';

describe('isTransparent', () => {
  it('catches loanwords whose gloss is the word itself', () => {
    expect(isTransparent('das Meeting', 'meeting')).toBe(true);
    expect(isTransparent('das Restaurant', 'restaurant')).toBe(true);
    expect(isTransparent('der Name', 'name')).toBe(true);
    expect(isTransparent('modern', 'modern')).toBe(true);
  });

  it('catches them when the give-away is one gloss among several', () => {
    expect(isTransparent('die Bank', 'bank; bench')).toBe(true);
    expect(isTransparent('die Operation', 'operation, surgery')).toBe(true);
  });

  it('keeps genuine probes, including near-cognates', () => {
    expect(isTransparent('das Haus', 'house')).toBe(false);
    expect(isTransparent('der Beruf', 'profession, job')).toBe(false);
    expect(isTransparent('die Zeitung', 'newspaper')).toBe(false);
    expect(isTransparent('der Motor', 'engine, motor')).toBe(true); // gloss lists it verbatim
  });

  it('ignores the article and surrounding whitespace', () => {
    expect(isTransparent('der Park', '  Park  ')).toBe(true);
  });
});
