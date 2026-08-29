// Redemittel: the phrases the app ships, and the two ways the inventory was wrong.
import { describe, it, expect } from 'vitest';
import {
  flattenRedemittel, dedupe, toWords, byGroup, redemittelId, loadRedemittel,
} from './redemittel.ts';
import type { Redemittel } from './exam.ts';

const groups: Redemittel[] = [
  { group: 'Widersprechen', phrases: [
    { de: 'Das sehe ich anders.', en: 'I see that differently.' },
    { de: 'Da bin ich nicht ganz Ihrer Meinung.', en: "I don't quite share your view." },
  ] },
  { group: 'Abwägen', phrases: [
    { de: 'Das kommt darauf an.', en: 'That depends.' },
    { de: '', en: 'missing German' },
    { de: 'Einerseits …, andererseits …', en: '' },
  ] },
];

describe('flattenRedemittel', () => {
  it('turns groups into cards that carry their function', () => {
    const cards = flattenRedemittel(groups, 'B2');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toEqual({
      id: 'red:B2:Das sehe ich anders.',
      group: 'Widersprechen',
      de: 'Das sehe ich anders.',
      en: 'I see that differently.',
      level: 'B2',
    });
  });

  it('drops a phrase with no German or no gloss rather than shipping half a card', () => {
    const cards = flattenRedemittel(groups, 'B2');
    expect(cards.map((c) => c.de)).not.toContain('');
    expect(cards.map((c) => c.de)).not.toContain('Einerseits …, andererseits …');
  });

  it('survives a group with no phrases array at all', () => {
    expect(flattenRedemittel([{ group: 'Leer' } as Redemittel], 'A1')).toEqual([]);
  });
});

describe('ids are content-keyed', () => {
  it('does not depend on position, so reordering a paper cannot re-point a schedule', () => {
    // The gex: ids are positional and that is a live hazard in the backlog. A
    // phrase's own text is stable in a way its index is not.
    const first = flattenRedemittel(groups, 'B2')[0].id;
    const reordered = flattenRedemittel([groups[1], groups[0]], 'B2');
    expect(reordered.find((c) => c.de === 'Das sehe ich anders.')!.id).toBe(first);
  });

  it('separates the same phrase taught at two levels', () => {
    expect(redemittelId('A2', 'Das kommt darauf an.'))
      .not.toBe(redemittelId('B2', 'Das kommt darauf an.'));
  });
});

describe('dedupe', () => {
  it('keeps the first sighting, so the lower level wins', () => {
    const a = flattenRedemittel(groups, 'B2');
    expect(dedupe([...a, ...a])).toHaveLength(a.length);
  });
});

describe('toWords', () => {
  const words = toWords(flattenRedemittel(groups, 'B2'));

  it('makes the communicative function the sector', () => {
    // "Widersprechen" is a better deck than Miscellaneous, which is where a
    // third of the corpus currently lives.
    expect(words[0].field).toBe('Widersprechen');
  });

  it('tags them as phrases, which keeps them out of every word-level drill pool', () => {
    // gender, plural, conjugation, Kasus, separable and reflexive would all
    // produce nonsense from a multi-word chunk.
    for (const w of words) {
      expect(w.pos).toBe('phrase');
      expect(w.gender).toBeNull();
      expect(w.plural).toBeNull();
    }
  });

  it('carries no example, so the card cannot print itself twice', () => {
    // And so cloze / sentence-builder / dictation cannot fire on it: all three
    // gate on `ex`, and all three would gap the chunk against itself.
    for (const w of words) expect(w.ex).toEqual([]);
  });
});

describe('byGroup', () => {
  it('regroups by function and level', () => {
    const g = byGroup(flattenRedemittel(groups, 'B2'));
    expect(g.map((x) => x.group)).toEqual(['Widersprechen', 'Abwägen']);
    expect(g[0].items).toHaveLength(2);
  });
});

describe('against the shipped papers', () => {
  it('loads every level and finds the phrases that were never scheduled', async () => {
    const all = await loadRedemittel();
    // 167 across 32 groups, counted from the exports themselves on 2026-08-29 —
    // 129/27 from the six papers, plus 38 in the five Alltag groups. (An earlier
    // regex over the whole file said 214 because it also matched the model
    // answers.) A drop here means a source stopped exporting its Redemittel,
    // which would otherwise be silent.
    expect(all.length).toBeGreaterThanOrEqual(160);
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
    expect(new Set(all.map((c) => c.level)).size).toBeGreaterThanOrEqual(5);
  });

  it('carries the transactional groups, not only exam discourse', async () => {
    // The defect this guards is not a crash — it is the inventory quietly going
    // back to being uniformly exam-shaped, which is invisible from a total.
    const groups = new Set(byGroup(await loadRedemittel()).map((g) => g.group));
    for (const g of [
      'Sich beschweren und reklamieren',
      'Höflich ablehnen',
      'Ein Problem beschreiben und sich beraten lassen',
      'Verbesserungsvorschläge machen',
      'Über Pannen und Missgeschicke sprechen',
    ]) expect(groups).toContain(g);
  });

  it('keeps a service-desk complaint in Sie', async () => {
    // A learner taught to reklamieren in du has been taught something actively
    // harmful, so the register is a correctness property, not a style one.
    const complaint = (await loadRedemittel()).filter((c) => c.group === 'Sich beschweren und reklamieren');
    expect(complaint.length).toBeGreaterThan(0);
    for (const c of complaint) expect(c.de).not.toMatch(/\b(du|dich|dir|dein|deine|kannst|könntest)\b/i);
  });

  it('produces cards the lexicon would accept', async () => {
    for (const w of toWords(await loadRedemittel())) {
      expect(w.id.startsWith('red:')).toBe(true);
      expect(w.term.trim()).not.toBe('');
      expect(w.en.trim()).not.toBe('');
      expect(w.field.trim()).not.toBe('');
    }
  });
});
