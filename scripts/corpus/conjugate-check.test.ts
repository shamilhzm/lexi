// Holds `corpus:conjugate-check` at zero: a verb the conjugator calls reliable
// must produce a Präteritum and a Partizip II its own attested table contains.
// 33 did not on 2026-11-21 (*lügte, wehtute, vorgeaussetzt, beschuf*).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { conjugateDisagreements, RULED } from './conjugate-check.ts';
import type { Word } from '../../src/types.ts';

const words: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const attested: Record<string, string[]> = JSON.parse(readFileSync('public/data/inflections.json', 'utf8'));

describe('the conjugator agrees with the attested tables', () => {
  const { checked, wrong } = conjugateDisagreements(words, attested);
  it('checks enough verbs to mean something', () => {
    expect(checked).toBeGreaterThan(1500);
  });
  it('generates no reliable form the table lacks, outside the ruled list', () => {
    expect(wrong.filter((d) => !RULED[d.verb]).map((d) => `${d.verb}: ${d.generated.join(', ')}`)).toEqual([]);
  });
  it('keeps no ruling that no longer fires', () => {
    expect(Object.keys(RULED).filter((v) => !wrong.some((d) => d.verb === v))).toEqual([]);
  });
});
