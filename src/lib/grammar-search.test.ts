// Concept search (#38) — finding a grammar point without knowing its level.
//
// Before this, reaching *Konjunktiv II* meant knowing which of six levels it was
// filed under, expanding that level and scrolling, in a bank of 140 points on the
// one surface whose whole job is look-up.
//
// Tested against the shipped bank rather than a fixture, because the thing worth
// pinning is that a learner's actual words find the actual points.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { searchPoints, type GrammarByLevel } from './grammar.ts';
import type { CEFR } from '../types.ts';

const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const bank = JSON.parse(readFileSync('public/data/grammar.json', 'utf8')) as GrammarByLevel;

const titles = (q: string) => (searchPoints(bank, q, LEVELS) ?? []).map((h) => `${h.level} ${h.point.title}`);

describe('searchPoints', () => {
  it('finds a concept by its German name, across every level', () => {
    const hits = titles('konjunktiv');
    expect(hits.length).toBeGreaterThan(3);
    expect(hits.some((t) => t.includes('Konjunktiv II'))).toBe(true);
    expect(hits.some((t) => t.includes('Konjunktiv I'))).toBe(true);
  });

  it('finds it by the English word a learner is more likely to type', () => {
    // The point of searching the rule text and not just the title.
    expect(titles('passive').length).toBeGreaterThan(0);
    expect(titles('word order').length).toBeGreaterThan(0);
  });

  it('ranks a title match above a rule mention', () => {
    // Several points *mention* the passive; the ones called Passiv come first.
    const hits = titles('passiv');
    expect(hits[0]).toMatch(/Passiv/);
  });

  it('holds off until there is something to search for', () => {
    expect(searchPoints(bank, '', LEVELS)).toBeNull();
    expect(searchPoints(bank, ' ', LEVELS)).toBeNull();
    expect(searchPoints(bank, 'k', LEVELS)).toBeNull();
  });

  it('returns an empty list rather than everything when nothing matches', () => {
    expect(searchPoints(bank, 'zzzznotathing', LEVELS)).toEqual([]);
  });

  it('is case- and space-insensitive at the edges', () => {
    expect(titles('  KONJUNKTIV  ')).toEqual(titles('konjunktiv'));
  });

  it('gives back a usable route for every hit', () => {
    for (const h of searchPoints(bank, 'passiv', LEVELS) ?? []) {
      expect(bank[h.level][h.pi].title).toBe(h.point.title);
    }
  });
});
