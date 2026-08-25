// Separable reflexives — the 14 cards that had no drill at all.
//
// `conjDrillable` excludes every reflexive from the conjugation drill, correctly:
// `conjugate` strips `sich`, so the drill would print «fühle» as the answer for
// *sich fühlen*. `ReflexiveItem` is where they belong — but `isReflexive` also
// required `!separable`, so every separable reflexive fell through both gates.
// `sich vorstellen` is **A1** and had no drill on any track.
//
// The exclusion was standing in for "the builder cannot write the split frame":
// `conjugate('sich vorstellen').praesens[0]` is "stelle vor", and appending the
// pronoun gives «stelle vor mich», which is not German. The pronoun goes *inside*
// the bracket.
import { describe, it, expect } from 'vitest';
import { reflexivePraesens, isReflexive, buildReflexive, conjDrillable } from '../views/Fundamentals.tsx';
import { setKnownVerbs, conjugate } from './conjugate.ts';
import { readFileSync } from 'node:fs';

// The engine is not pure until its root lexicon is seeded — LESSONS, class 2.
setKnownVerbs(['stellen', 'ruhen', 'fühlen', 'finden', 'passen', 'regen', 'lösen', 'setzen']);

describe('reflexivePraesens', () => {
  it('brackets a separable verb around the pronoun', () => {
    expect(reflexivePraesens('stelle vor', 'mich')).toBe('stelle mich vor');
    expect(reflexivePraesens('ruhe aus', 'mich')).toBe('ruhe mich aus');
    expect(reflexivePraesens('finde zurecht', 'sich')).toBe('finde sich zurecht');
  });

  it('appends for a plain reflexive, as before', () => {
    expect(reflexivePraesens('fühle', 'mich')).toBe('fühle mich');
    expect(reflexivePraesens('freue', 'dich')).toBe('freue dich');
  });
});

describe('the two gates no longer both refuse the same card', () => {
  it('lets a separable reflexive into the reflexive drill', () => {
    expect(isReflexive('sich vorstellen')).toBe(true);
    expect(isReflexive('sich ausruhen')).toBe(true);
  });

  it('still keeps every reflexive out of the conjugation drill', () => {
    // Where the bare finite form would be printed as the answer.
    expect(conjDrillable('sich vorstellen')).toBe(false);
    expect(conjDrillable('sich fühlen')).toBe(false);
  });

  it('still admits a plain reflexive', () => {
    expect(isReflexive('sich fühlen')).toBe(true);
  });
});

describe('buildReflexive writes real German for a separable', () => {
  it('puts the pronoun inside the bracket in the Präsens', () => {
    const b = buildReflexive('sich vorstellen', 'praesens', 0);
    expect(b.accept).toContain('ich stelle mich vor');
    expect(b.accept.some((a) => a.includes('vor mich'))).toBe(false);
  });

  it('leaves the Perfekt alone — the conjugator already places the pronoun', () => {
    const b = buildReflexive('sich vorstellen', 'perfekt', 0);
    expect(b.accept).toContain('ich habe mich vorgestellt');
  });

  it('names both moving pieces in the reveal, which is the whole lesson', () => {
    const b = buildReflexive('sich ausruhen', 'praesens', 0);
    expect(b.reveal.note).toContain('aus');
    expect(b.reveal.note).toContain('mich');
    // Every person in the paradigm is bracketed, not just the one asked.
    for (const [, form] of b.reveal.paradigm.rows) expect(form).toMatch(/\w+ (mich|dich|sich|uns|euch) aus$/);
  });
});

// The corpus-wide guard: this is the invariant the item was about, so it is
// asserted over the shipped cards rather than over four hand-picked verbs.
describe('no reflexive card falls through both gates', () => {
  it('every drillable reflexive verb in the corpus has a drill', () => {
    const corpus = JSON.parse(readFileSync('public/data/vocab.json', 'utf8')) as
      { id: string; term: string; pos?: string; kind: string }[];
    setKnownVerbs(corpus.filter((w) => w.pos === 'verb').map((w) => w.term));
    const orphans: string[] = [];
    for (const w of corpus) {
      if (w.kind !== 'word' || w.pos !== 'verb' || !/^sich\s/i.test(w.term)) continue;
      // A phrase is out of scope for both drills by design — notation, a
      // placeholder object, a stranded preposition.
      if (/\s/.test(w.term.replace(/^sich\s+/i, ''))) continue;
      let refl = false;
      try { refl = isReflexive(w.term); } catch { refl = false; }
      if (!refl && !conjDrillable(w.term)) orphans.push(w.id);
    }
    expect(orphans).toEqual([]);
  });

  it('writes real German for every separable reflexive it now admits', () => {
    const corpus = JSON.parse(readFileSync('public/data/vocab.json', 'utf8')) as
      { id: string; term: string; pos?: string; kind: string }[];
    setKnownVerbs(corpus.filter((w) => w.pos === 'verb').map((w) => w.term));
    for (const w of corpus) {
      if (w.kind !== 'word' || w.pos !== 'verb' || !/^sich\s/i.test(w.term)) continue;
      if (/\s/.test(w.term.replace(/^sich\s+/i, ''))) continue;
      let ok = false;
      try { ok = isReflexive(w.term); } catch { continue; }
      if (!ok) continue;
      const sep = conjugate(w.term).separable;
      for (const shape of ['praesens', 'perfekt'] as const) {
        const b = buildReflexive(w.term, shape, 0);
        const answer = b.accept[0];
        // A *plain* reflexive legitimately ends with the pronoun — «fühle mich».
        // A separable one never can: the particle is always last.
        if (sep) expect(answer.trim().endsWith(sep), `${w.id} ${shape}: ${answer}`).toBe(shape === 'praesens');
        // Whichever shape, the pronoun has to be in there somewhere.
        expect(/\b(mich|dich|sich|uns|euch)\b/.test(answer), `${w.id} ${shape}: ${answer}`).toBe(true);
      }
    }
  });
});
