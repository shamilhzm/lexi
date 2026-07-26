// provenance.json has shipped since the pipeline was written and the app never
// loaded a byte of it. These pin the two things the UI actually claims — that a
// frequency band is a defensible summary of a rank, and that a Tatoeba citation
// resolves to something a teacher can go and check — plus the coverage limit, so
// nobody later mistakes 27% for complete.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { freqBand, exampleCitation, levelBasis, type Provenance } from './provenance.ts';
import type { Word } from '../types.ts';

const prov: Provenance[] = JSON.parse(readFileSync('public/data/provenance.json', 'utf8'));
const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));

describe('freqBand', () => {
  it('bands a rank rather than quoting false precision', () => {
    expect(freqBand(48)!.label).toBe('Very common');
    expect(freqBand(1500)!.label).toBe('Common');
    expect(freqBand(4663)!.label).toBe('Moderate');
    expect(freqBand(12000)!.label).toBe('Uncommon');
    expect(freqBand(78266)!.label).toBe('Rare');
  });

  it('is monotonic — a rarer word never bands as more common', () => {
    const order = ['Very common', 'Common', 'Moderate', 'Uncommon', 'Rare'];
    let last = -1;
    for (const r of [1, 500, 501, 2000, 2001, 6000, 6001, 20000, 20001, 99999]) {
      const idx = order.indexOf(freqBand(r)!.label);
      expect(idx, `rank ${r}`).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });

  it('refuses a rank that isn’t one', () => {
    expect(freqBand(0)).toBeNull();
    expect(freqBand(-3)).toBeNull();
    expect(freqBand(NaN)).toBeNull();
  });

  it('bands every rank the shipped log actually contains', () => {
    for (const p of prov) expect(freqBand(p.freqRank), `${p.id} rank ${p.freqRank}`).not.toBeNull();
  });
});

describe('exampleCitation', () => {
  it('turns a Tatoeba id into a page a teacher can open', () => {
    const c = exampleCitation('tatoeba:12382447')!;
    expect(c.label).toBe('Tatoeba #12382447');
    expect(c.url).toBe('https://tatoeba.org/en/sentences/show/12382447');
  });

  it('never fabricates a link it cannot resolve', () => {
    expect(exampleCitation('wiktextract:kaikki-de.jsonl')!.url).toBeUndefined();
    expect(exampleCitation('tatoeba:not-an-id')!.url).toBeUndefined();
    expect(exampleCitation('')).toBeNull();
  });

  it('handles every source string in the shipped log', () => {
    for (const p of prov) expect(exampleCitation(p.exampleSource), p.id).not.toBeNull();
  });
});

describe('levelBasis', () => {
  it('explains every levelSource the log uses, in English', () => {
    for (const src of new Set(prov.map((p) => p.levelSource))) {
      const out = levelBasis(src);
      expect(out, src).toBeTruthy();
      // A raw pipeline token ("reference") is a maintainer's word, not a learner's.
      expect(out, `${src} was passed through untranslated`).not.toBe(src);
    }
  });
});

describe('coverage', () => {
  it('is partial, and the UI must stay silent where it is missing', () => {
    const ids = new Set(prov.map((p) => p.id));
    const covered = corpus.filter((w) => ids.has(w.id)).length;
    // Roughly a quarter today. Pinned loosely: this should only ever go up, and if
    // it reaches 100% the "no source recorded" branch becomes dead code.
    expect(covered).toBeGreaterThan(1000);
    expect(covered).toBeLessThan(corpus.length);
  });

  it('never references a card that no longer exists', () => {
    const live = new Set(corpus.map((w) => w.id));
    expect(prov.filter((p) => !live.has(p.id)).map((p) => p.id)).toEqual([]);
  });
});
