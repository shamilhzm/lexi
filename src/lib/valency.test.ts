// Verb government, and the case it must refuse to guess.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseValency, valencyLabel } from './valency.ts';

describe('parseValency', () => {
  it('reads an authored headword, case and all', () => {
    expect(parseValency('verzichten auf + A')).toEqual({ verb: 'verzichten', prep: 'auf', kase: 'Akkusativ' });
    expect(parseValency('bestehen aus + D')).toEqual({ verb: 'bestehen', prep: 'aus', kase: 'Dativ' });
  });

  it('keeps the reflexive pronoun with the verb, where the corpus puts it', () => {
    expect(parseValency('sich konzentrieren auf + A'))
      .toEqual({ verb: 'sich konzentrieren', prep: 'auf', kase: 'Akkusativ' });
  });

  it('fills the case by rule when the preposition can only take one', () => {
    // These 12 cards carry a preposition and no marker. `zu` is always dative
    // and `für` always accusative, so the case is a fact, not an inference.
    expect(parseValency('beitragen zu')?.kase).toBe('Dativ');
    expect(parseValency('eintreten für')?.kase).toBe('Akkusativ');
    expect(parseValency('sich identifizieren mit')?.kase).toBe('Dativ');
  });

  it('refuses to guess the case of a two-way preposition', () => {
    // Which case `auf` takes after this verb *is* the government — the fact
    // being sought. Printing a guess would teach it as if it were known.
    expect(parseValency('zurückführen auf')).toEqual({ verb: 'zurückführen', prep: 'auf', kase: null });
    expect(parseValency('sich wenden an')?.kase).toBeNull();
  });

  it('lets an authored marker override the two-way refusal', () => {
    expect(parseValency('sich verlieben in + A')?.kase).toBe('Akkusativ');
  });

  it('returns nothing for an ordinary verb', () => {
    expect(parseValency('laufen')).toBeNull();
    expect(parseValency('sich freuen')).toBeNull();
  });

  it('does not read a preposition card as a verb with government', () => {
    expect(parseValency('auf')).toBeNull();
    expect(parseValency('zu')).toBeNull();
  });

  it('ignores a trailing word that is not a preposition', () => {
    expect(parseValency('Bezug nehmen')).toBeNull();
    expect(parseValency('Rad fahren')).toBeNull();
  });
});

describe('valencyLabel', () => {
  it('prints the case when it is known', () => {
    expect(valencyLabel({ verb: 'warten', prep: 'auf', kase: 'Akkusativ' })).toBe('warten auf + Akkusativ');
  });

  it('prints no case rather than a guessed one', () => {
    expect(valencyLabel({ verb: 'zurückführen', prep: 'auf', kase: null })).toBe('zurückführen auf');
  });
});

describe('against the shipped corpus', () => {
  const corpus: { term: string; pos: string; kind: string }[] =
    JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
  const verbs = corpus.filter((w) => w.kind === 'word' && w.pos === 'verb');

  it('recovers the government the corpus already authored', () => {
    const parsed = verbs.map((v) => parseValency(v.term)).filter(Boolean);
    // 33 authored with an explicit case + 12 carrying a bare preposition, as
    // measured 2026-08-13. A drop here means the corpus changed shape.
    expect(parsed.length).toBeGreaterThanOrEqual(40);
  });

  it('never invents a case for a two-way preposition', () => {
    const TWO_WAY = new Set(['an', 'auf', 'in', 'über', 'unter', 'vor', 'neben', 'hinter', 'zwischen']);
    for (const v of verbs) {
      const p = parseValency(v.term);
      if (!p || !TWO_WAY.has(p.prep)) continue;
      // The only way a two-way preposition may carry a case is an authored marker.
      if (p.kase) expect(v.term, v.term).toMatch(/\+\s*[AD]\s*$/i);
    }
  });

  it('does not fire on the overwhelming majority of verbs, which have no government', () => {
    const hit = verbs.filter((v) => parseValency(v.term)).length;
    expect(hit).toBeLessThan(verbs.length * 0.1);
  });
});
