// Holds `corpus:conjugate-check` at zero: a verb the conjugator calls reliable
// must produce a Präteritum and a Partizip II its own attested table contains.
// 33 did not on 2026-11-21 (*lügte, wehtute, vorgeaussetzt, beschuf*).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { conjugateDisagreements, RULED, TWO_PASTS } from './conjugate-check.ts';
import type { Word } from '../../src/types.ts';

const words: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const attested: Record<string, string[]> = JSON.parse(readFileSync('public/data/inflections.json', 'utf8'));

describe('the conjugator agrees with the attested tables', () => {
  const { checked, wrong, twoPasts } = conjugateDisagreements(words, attested);
  it('checks enough verbs to mean something', () => {
    expect(checked).toBeGreaterThan(1500);
  });
  it('generates no reliable form the table lacks, outside the ruled list', () => {
    expect(wrong.filter((d) => !RULED[d.verb]).map((d) => `${d.verb}: ${d.generated.join(', ')}`)).toEqual([]);
  });
  it('keeps no ruling that no longer fires', () => {
    expect(Object.keys(RULED).filter((v) => !wrong.some((d) => d.verb === v))).toEqual([]);
  });
  // *schaffen* gave *schuf* on a card that means *manage*, and its table, which
  // holds both, attested it (2026-11-21).
  it('rules every verb whose table holds two pasts', () => {
    expect(twoPasts.filter((d) => !TWO_PASTS[d.verb]).map((d) => `${d.verb}: ${d.generated} / ${d.also}`)).toEqual([]);
  });
  it('keeps no two-pasts ruling that no longer fires', () => {
    expect(Object.keys(TWO_PASTS).filter((v) => !twoPasts.some((d) => d.verb === v))).toEqual([]);
  });
});
