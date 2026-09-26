import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Store copy is public text with hard limits, and every number in it is a claim.
// The README's counts drifted up to 6× before anyone noticed (LESSONS, "state a
// number"), and the meta description still said 6,500 words when the app said
// 10,023. This makes an over-long field or an overstated number fail `npm test`.

const root = join(import.meta.dirname, '..');
const L = JSON.parse(readFileSync(join(root, 'store', 'listing.json'), 'utf8'));

/** Apple's and Google's published per-field limits, in characters. */
const LIMITS: Record<string, number> = {
  name: 30, subtitle: 30, keywords: 100, promotionalText: 170, description: 4000,
  title: 30, shortDescription: 80, fullDescription: 4000,
};

function texts(): { where: string; field: string; value: string }[] {
  const out: { where: string; field: string; value: string }[] = [];
  for (const store of ['appStore', 'googlePlay'] as const) {
    for (const [locale, fields] of Object.entries(L[store] as Record<string, Record<string, unknown>>)) {
      for (const [field, value] of Object.entries(fields)) {
        if (typeof value === 'string') out.push({ where: `${store}.${locale}`, field, value });
      }
    }
  }
  return out;
}

describe('store listing — limits', () => {
  it('every field fits its store limit', () => {
    for (const t of texts()) {
      const max = LIMITS[t.field];
      if (max) expect([...t.value].length, `${t.where}.${t.field}`).toBeLessThanOrEqual(max);
    }
  });

  it('App Store keywords are comma-separated with no spaces and no word from the name or subtitle', () => {
    // Apple already indexes the name and subtitle; repeating a word in the keyword
    // field spends characters for nothing.
    const us = L.appStore['en-US'];
    const taken = new Set(`${us.name} ${us.subtitle}`.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
    for (const locale of Object.keys(L.appStore)) {
      const kw: string = L.appStore[locale].keywords;
      expect(kw, locale).not.toMatch(/\s/);
      for (const k of kw.split(',')) expect(taken.has(k.toLowerCase()), `${locale}: "${k}"`).toBe(false);
    }
  });

  it('names no competitor and no exam brand (App Store 2.3.7; VISION §10)', () => {
    const banned = /duolingo|babbel|busuu|anki|memrise|drops|goethe|telc|testdaf|ösd/i;
    for (const t of texts()) expect(t.value, `${t.where}.${t.field}`).not.toMatch(banned);
  });

  it('says nothing about stories or the tutor, which store copies do not carry', () => {
    // lib/platform.ts turns both off in a store copy until the publishers agree.
    for (const t of texts()) expect(t.value, `${t.where}.${t.field}`).not.toMatch(/\bnews\b|\bstor(y|ies)\b|\bAI\b|tutor/i);
  });

  it('claims "offline" only where every byte ships in the app (the bundled iOS build)', () => {
    // The Play copy is a Trusted Web Activity: dictionary shards arrive on first use.
    for (const t of texts().filter((x) => x.where.startsWith('googlePlay'))) {
      expect(t.value, `${t.where}.${t.field}`).not.toMatch(/offline/i);
    }
  });
});

describe('store listing — every number is measured', () => {
  const cards = JSON.parse(readFileSync(join(root, 'public', 'data', 'cards.json'), 'utf8')) as { kind?: string }[];
  // What the app teaches: `src/data/index.ts` drops the `kind: 'grammar'` rows at load.
  const words = cards.filter((c) => c.kind !== 'grammar').length;
  const lex = join(root, 'public', 'data', 'lex');
  const entries = readdirSync(lex).filter((f) => /^\d+\.json$/.test(f))
    .reduce((n, f) => n + (JSON.parse(readFileSync(join(lex, f), 'utf8')) as { e: unknown[] }).e.length, 0);

  it('the claimed floors hold for the corpus in this tree', () => {
    expect(words).toBeGreaterThanOrEqual(L.claims.words);
    expect(entries).toBeGreaterThanOrEqual(L.claims.dictionaryEntries);
  });

  it('no number appears in the copy that is not one of the claims', () => {
    const allowed = new Set(Object.values(L.claims as Record<string, number>).map((n) => n.toLocaleString('en-US')));
    for (const t of texts()) {
      for (const n of t.value.match(/\d{1,3}(?:,\d{3})+/g) ?? []) expect(allowed.has(n), `${t.where}.${t.field}: ${n}`).toBe(true);
    }
  });
});
