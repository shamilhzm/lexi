// The ruled table is held to the corpus: a row may only say which of the things a
// card's own examples already show is the verb's government. It may not assert a
// preposition no example of that card uses.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GOVERNMENT, governed } from './government.ts';
import { DRILL_PREPS, headPrep, valencyOf, valencyLabel } from '../lib/valency.ts';
import type { Word } from '../types.ts';

const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const verbs = new Map(corpus.filter((w) => w.kind === 'word' && w.pos === 'verb').map((w) => [w.term, w]));

/** Preposition + article in one word, and the pronominal adverb that stands for
 *  preposition + thing — both are the preposition, and neither spells it. */
const CONTRACTED: Record<string, string[]> = {
  an: ['am', 'ans'], auf: ['aufs'], bei: ['beim'], für: ['fürs'], in: ['im', 'ins'],
  über: ['übers', 'überm'], um: ['ums'], unter: ['unterm', 'unters'], von: ['vom'],
  vor: ['vorm', 'vors'], zu: ['zum', 'zur'],
};
function attests(de: string, prep: string): boolean {
  const r = /^[aeiouäöü]/.test(prep) ? 'r' : '';
  const forms = [prep, ...(CONTRACTED[prep] ?? []), `da${r}${prep}`, `wo${r}${prep}`];
  const tokens = de.toLowerCase().split(/[^\p{L}]+/u);
  return forms.some((f) => tokens.includes(f));
}

describe('the government table — ruled, and held to the corpus', () => {
  it('names only verb cards that exist, by their exact headword', () => {
    const missing = Object.keys(GOVERNMENT).filter((t) => !verbs.has(t));
    expect(missing).toEqual([]);
  });

  it("every preposition is used in that card's own examples", () => {
    const unproven: string[] = [];
    for (const term of Object.keys(GOVERNMENT)) {
      const card = verbs.get(term);
      if (!card) continue;
      for (const { prep } of governed(term)) {
        if (!card.ex.some((e) => attests(e.de, prep))) unproven.push(`${term} ${prep}`);
      }
    }
    expect(unproven).toEqual([]);
  });

  it('uses only prepositions the drill can offer, each with a case', () => {
    for (const [term, rows] of Object.entries(GOVERNMENT)) {
      expect(rows.length, term).toBeGreaterThan(0);
      for (const g of rows) {
        const [prep, kase] = g.split('+');
        expect(DRILL_PREPS.has(prep), g).toBe(true);
        expect(['A', 'D'], g).toContain(kase);
      }
    }
  });

  it('does not restate what a headword already says', () => {
    // A card that carries its preposition in its term needs no row, and a row
    // beside it would be a second place for the same fact to go stale.
    expect(Object.keys(GOVERNMENT).filter((t) => headPrep(t))).toEqual([]);
  });

  it('reaches the entry sheet: a plain card now knows what it takes', () => {
    const v = valencyOf(verbs.get('antworten')!);
    expect(v && valencyLabel(v, false)).toBe('antworten auf');
    expect(v && valencyLabel(v)).toBe('antworten auf + Akkusativ');
    expect(valencyOf(verbs.get('gehen')!)).toBeNull();
  });
});

describe('headPrep — the three ways a headword names its preposition', () => {
  it('reads the marker, the bare form and the bracket', () => {
    expect(headPrep('warten auf + A')).toEqual({ head: 'warten', prep: 'auf' });
    expect(headPrep('sich interessieren für + A')).toEqual({ head: 'sich interessieren', prep: 'für' });
    expect(headPrep('Rücksicht nehmen auf + A')).toEqual({ head: 'Rücksicht nehmen', prep: 'auf' });
    expect(headPrep('beitragen zu')).toEqual({ head: 'beitragen', prep: 'zu' });
    expect(headPrep('angewiesen sein auf')).toEqual({ head: 'angewiesen sein', prep: 'auf' });
    expect(headPrep('leiden (unter)')).toEqual({ head: 'leiden', prep: 'unter' });
    expect(headPrep('kümmern (sich um)')).toEqual({ head: 'sich kümmern', prep: 'um' });
  });

  it('refuses what only looks like one', () => {
    for (const t of ['wegen + G', 'dank + G', 'gelten als + N', 'es gibt + A', 'in der Nähe von',
      'nach wie vor', 'gerade aus', 'ansprechen (Person)', 'bestehen (Prüfung)', 'warten', 'der Tisch']) {
      expect(headPrep(t), t).toBeNull();
    }
  });
});
