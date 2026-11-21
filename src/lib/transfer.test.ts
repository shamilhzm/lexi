// The transfer line ships only what Wiktionary states, keyed to cards that exist
// (VISION, *The transfer line*). These hold the file to that, and the line to its copy.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { transferFor, type TransferData } from './transfer.ts';
import { FALSE_FRIENDS } from './falseFriends.ts';
import { bare } from './slug.ts';

const data = JSON.parse(readFileSync('public/data/transfer.json', 'utf8')) as TransferData;
const cards = (JSON.parse(readFileSync('public/data/cards.json', 'utf8')) as { term: string; kind: string; en: string }[])
  .filter((c) => c.kind === 'word');
const byTerm = new Map(cards.map((c) => [c.term, c]));
const rows = Object.entries(data.words);

describe('transfer.json', () => {
  it('names only cards the corpus teaches (a rename needs corpus:transfer --write)', () => {
    expect(rows.filter(([t]) => !byTerm.has(t)).map(([t]) => t)).toEqual([]);
  });
  it('leaves a curated false friend to its own note', () => {
    expect(rows.filter(([t]) => FALSE_FRIENDS[bare(t).toLowerCase()]).map(([t]) => t)).toEqual([]);
  });
  it('gives every related word its English word, and every rule a definition', () => {
    for (const [t, [k, en, rule]] of rows) {
      expect(['b', 'c', 'h'], t).toContain(k);
      if (k !== 'b') expect(en, t).toMatch(/^[a-z]+$/);
      if (rule) expect(data.rules[rule], `${t}: ${rule}`).toBeDefined();
    }
  });
  it('shows a cognate the gloss already holds as c, and one it hides as h', () => {
    for (const [t, [k, en]] of rows) {
      if (k === 'b' || !en) continue;
      const g = byTerm.get(t)!.en.toLowerCase();
      if (k === 'h') expect(g.split(/[^a-z]+/), t).not.toContain(en);
    }
  });
  it('names a correspondence only over enough pairs, with examples that are shipped pairs', () => {
    for (const [id, r] of Object.entries(data.rules)) {
      expect(r.n, id).toBeGreaterThanOrEqual(12);
      expect(r.ex.length, id).toBeGreaterThanOrEqual(3);
      for (const [d, e] of r.ex) {
        const row = rows.find(([t]) => bare(t) === d);
        expect(row?.[1][1], `${id}: ${d} · ${e}`).toBe(e);
      }
    }
  });
  it('holds the hand-checked pairs', () => {
    expect(data.words['das Wasser']).toEqual(['c', 'water', 'ss-t']);
    expect(data.words['klein']?.slice(0, 2)).toEqual(['h', 'clean']);
    expect(data.words['das Team']?.[0]).toBe('b');
    // Refused, each for a reason recorded in LESSONS or the script.
    expect(data.words['der Enkel'], 'the ankle homograph').toBeUndefined();
    expect(data.words['arbeiten'], 'a link through Proto-Indo-European').toBeUndefined();
    expect(data.words['saugen'], 'a semantic loan, not a borrowing').toBeUndefined();
    expect(data.words['der Held'], 'Wiktionary names the wrong heir').toBeUndefined();
  });
});

describe('transferFor', () => {
  it('reads a row into a line, its rule examples never the card itself', () => {
    const t = transferFor(data, 'das Wasser', 'Wasser')!;
    expect(t).toMatchObject({ kind: 'c', en: 'water', rule: { de: 'ss, ß', en: 't' } });
    expect(t.rule!.ex.map(([d]) => d)).not.toContain('Wasser');
    expect(t.rule!.ex).toHaveLength(3);
  });
  it('is null for a word with no line, or no data', () => {
    expect(transferFor(data, 'die Wohnung', 'Wohnung')).toBeNull();
    expect(transferFor(null, 'das Wasser', 'Wasser')).toBeNull();
  });
  it('drops the English word a borrowing would only repeat', () => {
    expect(transferFor(data, 'das Team', 'Team')).toEqual({ kind: 'b', en: undefined, rule: undefined });
  });
});
