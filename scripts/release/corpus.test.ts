// The release is the corpus, whole and only: every teachable card once, in both
// formats, and a README whose numbers are the rows' own.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { rows, tsv, jsonl, counts, readme, sha256 } from './corpus.ts';
import type { TransferData } from '../../src/lib/transfer.ts';

const rs = rows();
const vocab = (JSON.parse(readFileSync('public/data/vocab.json', 'utf8')) as { kind: string }[]);
const transfer = JSON.parse(readFileSync('public/data/transfer.json', 'utf8')) as TransferData;

describe('the corpus release', () => {
  it('holds every teachable card once, and nothing else', () => {
    expect(rs.length).toBe(vocab.filter((c) => c.kind === 'word').length);
    expect(new Set(rs.map((r) => r.term)).size).toBe(rs.length);
  });
  it('writes JSON Lines that parse back to the rows', () => {
    const lines = jsonl(rs).trimEnd().split('\n');
    expect(lines).toHaveLength(rs.length);
    expect(JSON.parse(lines[0])).toEqual(rs[0]);
  });
  it('writes a TSV with one row per card and no stray tabs', () => {
    const lines = tsv(rs).trimEnd().split('\n');
    expect(lines).toHaveLength(rs.length + 1);
    const width = lines[0].split('\t').length;
    expect(lines.filter((l) => l.split('\t').length !== width)).toEqual([]);
  });
  it('carries the English relation transfer.json gives', () => {
    expect(rs.filter((r) => r.english).length).toBe(Object.keys(transfer.words).length);
    expect(rs.find((r) => r.term === 'das Wasser')?.english).toEqual({ kind: 'c', word: 'water', rule: 'ss-t' });
  });
  it('states counts the rows bear out', () => {
    const c = counts(rs);
    const md = readme('2026.11.21+abc1234', rs, transfer);
    expect(md).toContain(`**${c.cards.toLocaleString('en')}**`);
    for (const [l, n] of c.levels) expect(md).toContain(`| ${l} | ${n.toLocaleString('en')} |`);
    expect(md).toContain('commit abc1234');
    expect(md).not.toMatch(/\bTODO\b/);
  });
  it('hashes stably', () => {
    expect(sha256('lexi')).toBe(sha256('lexi'));
    expect(sha256('lexi')).toMatch(/^[0-9a-f]{64}$/);
  });
});
