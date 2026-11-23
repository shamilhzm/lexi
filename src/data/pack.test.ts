// The packed boot file must be the shipped cards, exactly, in order. An id that
// changed by one byte would re-point a learner's schedule, and a reordered row would
// put every frequency rank on the wrong card (lib/freq.ts is by position).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { packCards, unpackCards, sameRows, PACK_VERSION, type CardRow } from './pack.ts';

const shipped = JSON.parse(readFileSync(join(process.cwd(), 'public/data/cards.json'), 'utf8')) as CardRow[];

describe('the packed boot file', () => {
  it('unpacks to the shipped cards.json, row for row and field for field', () => {
    const back = unpackCards(JSON.parse(JSON.stringify(packCards(shipped))));
    expect(back).not.toBeNull();
    expect(back!.length).toBe(shipped.length);
    expect(back!.map((c) => c.id)).toEqual(shipped.map((c) => c.id));
    expect(sameRows(back!, shipped)).toBe(true);
  });

  it('is smaller than the file it packs', () => {
    const gz = (s: string) => gzipSync(s, { level: 9 }).length;
    expect(gz(JSON.stringify(packCards(shipped)))).toBeLessThan(gz(JSON.stringify(shipped)));
  });

  it('still reads the array of objects an older build or a cache may hold', () => {
    const legacy = [{ id: 'voc:A1:der Name', term: 'der Name' }];
    expect(unpackCards(legacy)).toEqual(legacy);
  });

  it('refuses a pack that does not fit its own key list, or is not a pack at all', () => {
    expect(unpackCards({ v: PACK_VERSION, keys: ['id', 'term'], rows: [['voc:A1:x']] })).toBeNull();
    expect(unpackCards({ v: PACK_VERSION + 1, keys: ['id'], rows: [['x']] })).toBeNull();
    expect(unpackCards({ keys: ['id'], rows: [['x']] })).toBeNull();
    expect(unpackCards('[]')).toBeNull();
    expect(unpackCards(null)).toBeNull();
  });

  it('refuses to pack a row that is missing a field, instead of shipping it as null', () => {
    expect(() => packCards([{ id: 'a', gender: null }, { id: 'b' }])).toThrow(/has no "gender"/);
    expect(() => packCards([{ id: 'a', ipa: undefined }])).toThrow(/has no "ipa"/);
  });

  it('keeps an explicit null distinct from a missing field', () => {
    const rows = [{ id: 'a', gender: null, syn: [] }, { id: 'b', gender: 'der', syn: ['x'] }];
    expect(unpackCards(JSON.parse(JSON.stringify(packCards(rows))))).toEqual(rows);
  });
});
