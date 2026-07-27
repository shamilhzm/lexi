// Word families are derived, so the tests that matter are the ones about what the
// derivation must refuse. A wrong family attaches the wrong story to a word, which
// is worse than showing nothing — "antworten" is not "an" + "tworten".
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildFamilies, familyOf, infinitive, resetFamilies } from './family.ts';
import type { Word } from '../types.ts';

const verb = (term: string): Word => ({
  id: `voc:A1:${term}`, term, en: '', pos: 'verb', level: 'A1',
  gender: null, plural: null, ipa: null, def: null,
  syn: [], ant: [], ex: [], field: 'Test', kind: 'word',
});

beforeEach(resetFamilies);

describe('buildFamilies', () => {
  it('groups prefixed verbs under the base they are built from', () => {
    const fam = buildFamilies(['nehmen', 'annehmen', 'benehmen', 'unternehmen'].map(verb));
    expect(fam.get('nehmen')).toEqual(['nehmen', 'annehmen', 'benehmen', 'unternehmen']);
  });

  it('refuses a split whose remainder is not itself a verb', () => {
    // "antworten" starts with "an", but "tworten" is not a word. Without the
    // known-root guard this is the classic false family.
    const fam = buildFamilies([verb('antworten'), verb('worten')]);
    expect(fam.get('antworten')).toEqual(['antworten']);
    expect(fam.has('tworten')).toBe(false);
  });

  it('prefers the longest prefix, so zurück wins over zu', () => {
    const fam = buildFamilies(['geben', 'zurückgeben'].map(verb));
    expect(fam.get('geben')).toContain('zurückgeben');
  });

  it('lists an infinitive once even when the corpus carries it at two levels', () => {
    const a = verb('bestellen');
    const b = { ...verb('bestellen'), id: 'voc:B1:bestellen', level: 'B1' as const };
    const fam = buildFamilies([verb('stellen'), a, b]);
    expect(fam.get('stellen')).toEqual(['stellen', 'bestellen']);
  });

  it('ignores the reflexive pronoun when matching', () => {
    const fam = buildFamilies([verb('halten'), verb('sich verhalten')]);
    expect(fam.get('halten')).toEqual(['halten', 'sich verhalten']);
    expect(infinitive('sich verhalten')).toBe('verhalten');
  });
});

describe('familyOf', () => {
  const words = ['nehmen', 'annehmen', 'benehmen', 'mitnehmen'].map(verb);

  it('returns the siblings, base first, and never the word itself', () => {
    const out = familyOf(verb('annehmen'), words);
    expect(out[0]).toBe('nehmen');
    expect(out).not.toContain('annehmen');
    expect(out).toContain('benehmen');
  });

  it('is empty for a verb with no relatives', () => {
    expect(familyOf(verb('lächeln'), [verb('lächeln')])).toEqual([]);
  });

  it('is empty for anything that is not a verb', () => {
    const noun = { ...verb('nehmen'), pos: 'noun' };
    expect(familyOf(noun, words)).toEqual([]);
  });
});

describe('against the shipped corpus', () => {
  const vocab: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));

  it('finds real families without inventing them', () => {
    const fam = buildFamilies(vocab);
    const real = [...fam.values()].filter((m) => m.length > 1);
    expect(real.length).toBeGreaterThan(140);
    // The base of every multi-member family must itself be a verb in the lexicon.
    const verbs = new Set(vocab.filter((w) => w.pos === 'verb').map((w) => infinitive(w.term)));
    for (const [base, members] of fam) {
      if (members.length > 1) expect(verbs.has(base), base).toBe(true);
    }
  });

  it('heads antworten\'s own family rather than filing it under a nonexistent root', () => {
    // The classic false split is "an" + "tworten". antworten *does* have real
    // relatives — beantworten, verantworten — so the test is that it is the base,
    // not that it is alone.
    const fam = buildFamilies(vocab);
    expect(fam.has('tworten')).toBe(false);
    const owner = [...fam.entries()].find(([, m]) => m.some((x) => infinitive(x) === 'antworten'));
    expect(owner?.[0]).toBe('antworten');
    for (const m of owner![1]) expect(infinitive(m).endsWith('antworten'), m).toBe(true);
  });
});
