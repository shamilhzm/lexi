// A pack is untrusted input from someone else's device that goes straight into the
// lexicon the app renders and schedules. These pin that a malformed row is dropped
// at the boundary rather than three cards into a session, and that a pack round-
// trips without carrying anything it shouldn't.
import { describe, it, expect } from 'vitest';
import { buildPack, parsePack, packFilename, PACK_FORMAT } from './classpack.ts';
import type { Word } from '../types.ts';

const card = (id: string, extra: Partial<Word> = {}): Word => ({
  id, term: id, en: 'x', pos: 'noun', level: 'A1',
  gender: 'der', plural: null, ipa: null, def: null,
  syn: [], ant: [], ex: [{ de: 'Ein Satz.', en: 'A sentence.', lvl: 'A1' }],
  field: 'Test', kind: 'word', ...extra,
});

describe('class packs', () => {
  it('round-trips through JSON', () => {
    const pack = buildPack('Lektion 5', [card('a'), card('b')], 'Shamil');
    const { pack: back, dropped } = parsePack(JSON.stringify(pack));
    expect(dropped).toBe(0);
    expect(back!.name).toBe('Lektion 5');
    expect(back!.from).toBe('Shamil');
    expect(back!.cards.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('carries no progress — a pack is a deck, not a record of study', () => {
    const json = JSON.stringify(buildPack('Deck', [card('a')]));
    for (const leaked of ['due', 'stability', 'difficulty', 'reps', 'lapses', 'last_review']) {
      expect(json, `pack leaked ${leaked}`).not.toContain(`"${leaked}"`);
    }
  });

  it('omits the author when none was set, rather than writing an empty one', () => {
    expect(buildPack('Deck', [card('a')]).from).toBeUndefined();
    expect(buildPack('Deck', [card('a')], '   ').from).toBeUndefined();
  });

  it('drops malformed cards and says how many', () => {
    const pack = buildPack('Deck', [card('ok')]);
    // Hand-assembled, the way a corrupted or hand-edited file would arrive.
    const wire = { ...pack, cards: [
      pack.cards[0],
      { id: 'no-term', level: 'A1', kind: 'word', field: 'x', en: '', syn: [], ant: [], ex: [] },
      { ...pack.cards[0], id: 'bad-level', level: 'Z9' },
      { ...pack.cards[0], id: 'bad-gender', gender: 'die Katze' },
      { ...pack.cards[0], id: 'bad-ex', ex: [{ de: 5, en: 'x' }] },
      null,
      'not an object',
    ] };
    const { pack: got, dropped } = parsePack(JSON.stringify(wire));
    expect(dropped).toBe(6);
    expect(got!.cards.map((c) => c.id)).toEqual(['ok']);
  });

  it('refuses files that are not packs', () => {
    expect(parsePack('not json').error).toMatch(/valid JSON/);
    expect(parsePack('{"hello":1}').error).toMatch(/isn’t a Lexi word pack/);
    expect(parsePack(JSON.stringify({ format: PACK_FORMAT, version: 1 })).error).toMatch(/no cards/);
  });

  it('refuses a pack from a newer Lexi rather than importing half of it', () => {
    const p = buildPack('Deck', [card('a')]);
    const res = parsePack(JSON.stringify({ ...p, version: 99 }));
    expect(res.pack).toBeNull();
    expect(res.error).toMatch(/newer version/);
  });

  it('refuses a pack whose every card is unreadable', () => {
    const p = buildPack('Deck', [card('a')]);
    const res = parsePack(JSON.stringify({ ...p, cards: [{ id: 'x' }, { id: 'y' }] }));
    expect(res.pack).toBeNull();
    expect(res.dropped).toBe(2);
  });

  it('makes a filename a recipient can recognise', () => {
    expect(packFilename('Lektion 5 — Wortschatz')).toBe('lexi-pack-lektion-5-wortschatz.json');
    expect(packFilename('!!!')).toBe('lexi-pack-deck.json');
  });
});
