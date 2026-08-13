// Redemittel: the 214 phrases the app already ships and never scheduled.
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
    // 129 across 27 groups, counted from the REDEMITTEL exports themselves on
    // 2026-08-13 — an earlier regex over the whole file said 214 because it also
    // matched the model answers. A drop here means a paper stopped exporting its
    // Redemittel, which would otherwise be silent.
    expect(all.length).toBeGreaterThanOrEqual(120);
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
    expect(new Set(all.map((c) => c.level)).size).toBeGreaterThanOrEqual(5);
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
