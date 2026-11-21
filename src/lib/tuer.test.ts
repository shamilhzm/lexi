import { describe, it, expect } from 'vitest';
import { parseGateHash, passUrl, gateUrl, pickGateItems, recordGate, readTally, todayAtDoor, TALLY_KEY, GATE_SIZE } from './tuer.ts';
import type { SessionItem, SessionReason } from '../session.ts';
import type { Word } from '../types.ts';

const word = (id: string): Word => ({ id, term: id, en: id, pos: 'noun', level: 'B1', gender: 'der', field: 'x', kind: 'word' } as unknown as Word);
const item = (id: string, reason: SessionReason, type: SessionItem['type'] = 'flip'): SessionItem =>
  ({ type, word: word(id), srsId: type === 'flip' ? id : `gym:${type}:${id}`, reason });

class Mem { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } }

describe('parseGateHash', () => {
  it('reads the setup guide and a door', () => {
    expect(parseGateHash('#/tuer')).toEqual({ app: null });
    expect(parseGateHash('#/tuer/')).toEqual({ app: null });
    expect(parseGateHash('#/tuer/reddit')?.app).toMatchObject({ name: 'Reddit', open: 'reddit://' });
    expect(parseGateHash('#/tuer/YouTube')?.app?.name).toBe('YouTube');
  });
  it('gives an unknown app a door with a readable name and no way back in', () => {
    expect(parseGateHash('#/tuer/hacker-news')?.app).toEqual({ slug: 'hacker-news', name: 'Hacker News' });
  });
  it('reads a slug that will not decode as typed instead of throwing at boot', () => {
    expect(() => parseGateHash('#/tuer/100%')).not.toThrow();
    expect(parseGateHash('#/tuer/100%')?.app?.slug).toBe('100%');
  });
  it('leaves every other hash alone', () => {
    for (const h of ['', '#/feed', '#/tuerx', '#/session', '#/tuer/a/b']) expect(parseGateHash(h)).toBeNull();
  });
});

describe('passUrl', () => {
  it('runs the pass shortcut with the app’s own URL as its input', () => {
    const app = parseGateHash('#/tuer/instagram')!.app!;
    expect(passUrl(app)).toBe('shortcuts://run-shortcut?name=Lexi%20Pass&input=text&text=instagram%3A%2F%2F');
  });
  it('still saves the pass for an app it cannot reopen', () => {
    expect(passUrl({ slug: 'z', name: 'Z' })).toBe('shortcuts://run-shortcut?name=Lexi%20Pass&input=text&text=');
  });
  it('builds the door URL for this deploy', () => {
    expect(gateUrl('https://lexi.example/', 'reddit')).toBe('https://lexi.example/#/tuer/reddit');
  });
});

describe('pickGateItems', () => {
  it('serves reviews before new words, three at most', () => {
    const q = [
      item('new1', { kind: 'fresh', via: 'saved' }),
      item('due1', { kind: 'due', overdueDays: 2 }),
      item('new2', { kind: 'fresh' }),
      item('due2', { kind: 'due', overdueDays: 0 }),
    ];
    expect(pickGateItems(q).map((i) => i.word.id)).toEqual(['due1', 'due2', 'new1']);
    expect(GATE_SIZE).toBe(3);
  });
  it('never serves a drill that points at a flip the door did not show, or a retry', () => {
    const parent = word('p');
    const q = [
      item('d', { kind: 'drill', mode: 'gender', parent }, 'gender'),
      item('r', { kind: 'retry', missed: true }),
      item('o', { kind: 'orphan', mode: 'plural', overdueDays: 3 }, 'plural'),
    ];
    expect(pickGateItems(q).map((i) => i.word.id)).toEqual(['o']);
  });
  it('shows one word once, even when its flip and a drill are both due', () => {
    const q = [item('w', { kind: 'due', overdueDays: 1 }), item('w', { kind: 'orphan', mode: 'plural', overdueDays: 1 }, 'plural')];
    expect(pickGateItems(q)).toHaveLength(1);
  });
  it('returns nothing from an empty queue', () => {
    expect(pickGateItems([])).toEqual([]);
  });
});

describe('the tally', () => {
  it('counts doors, skips, closes and words per day', () => {
    const kv = new Mem();
    const d = new Date(2026, 10, 20, 9);
    recordGate(kv, 'door', 3, d);
    recordGate(kv, 'skip', 0, d);
    recordGate(kv, 'close', 2, d);
    expect(todayAtDoor(kv, d)).toEqual({ doors: 1, skips: 1, closes: 1, words: 5 });
    expect(Object.keys(readTally(kv))).toEqual(['2026-11-20']);
  });
  it('survives a corrupt value instead of blocking the door', () => {
    const kv = new Mem();
    kv.setItem(TALLY_KEY, '{nope');
    expect(readTally(kv)).toEqual({});
    expect(recordGate(kv, 'door', 3).doors).toBe(1);
  });
});
