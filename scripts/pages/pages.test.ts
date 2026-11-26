// The word pages' contract (docs/PAGES.md). Every fact on a page is a corpus field,
// no page carries script, every published slug still answers, and a page stays small.
import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import { loadCards, groupPages, renderPage, renderRedirect, renderSitemap, readPublished, readRedirects, type PageCard } from './build.ts';
import { slug } from '../../src/lib/slug.ts';

const cards = loadCards();
const pages = groupPages(cards);
const BASE = '/';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const page = (s: string, origin?: string) => renderPage(s, pages.get(s)!, { base: BASE, origin });

describe('the slug', () => {
  it('gives every teachable card exactly one page, and never an empty address', () => {
    const placed = [...pages.values()].flat();
    expect(placed.length).toBe(cards.length);
    expect(new Set(placed.map((c) => c.id)).size).toBe(cards.length);
    expect([...pages.keys()].filter((s) => !s)).toEqual([]);
  });
  it('folds case and keeps the spelling', () => {
    expect(slug('das Essen')).toBe(slug('essen'));
    expect(slug('das Mädchen')).toBe('mädchen');
    expect(slug('die Straße')).toBe('straße');
    expect(slug('aus einer Mücke einen Elefanten machen')).toBe('aus-einer-mücke-einen-elefanten-machen');
  });
  it('puts homographs on one page: die Band and der Band', () => {
    expect(pages.get('band')!.map((c) => c.term).sort()).toEqual(['der Band', 'die Band']);
  });
});

describe('nothing that was published 404s', () => {
  const redirects = readRedirects();
  it('every published slug is a page or a redirect', () => {
    const lost = readPublished().filter((s) => !pages.has(s) && !(s in redirects));
    expect(lost, 'add these to scripts/pages/redirects.json, pointing at the nearest page').toEqual([]);
  });
  it('every redirect points at a page that exists', () => {
    expect(Object.entries(redirects).filter(([, to]) => !pages.has(to))).toEqual([]);
  });
  it('a redirect forwards and is never indexed', () => {
    const html = renderRedirect('band', { base: BASE });
    expect(html).toContain('http-equiv="refresh"');
    expect(html).toContain('noindex');
    expect(html).toContain('/wort/band');
  });
});

describe('a page', () => {
  const band = page('band');
  it('has one headword per card, marked German, and links each to its entry in the app', () => {
    expect(band.match(/<h1 [^>]*lang="de"/g)).toHaveLength(2);
    for (const c of pages.get('band')!) expect(band).toContain(`href="/#/w/${encodeURIComponent(c.id)}"`);
  });
  it('carries no script, so it can neither grade nor count an exposure', () => {
    for (const s of ['band', 'essen', 'mädchen']) expect(page(s)).not.toMatch(/<script|\son[a-z]+=/i);
  });
  it('says its licence and that glosses were AI-written and machine-checked', () => {
    expect(band).toContain('CC BY-SA 4.0');
    expect(band).toContain('machine-checked');
  });
  it('is not indexed and has no canonical until the origin is settled', () => {
    expect(band).toContain('<meta name="robots" content="noindex">');
    expect(band).not.toContain('rel="canonical"');
    const live = page('band', 'https://example.org');
    expect(live).not.toContain('noindex');
    expect(live).toContain('<link rel="canonical" href="https://example.org/wort/band">');
    expect(renderSitemap('https://example.org', BASE, ['band', 'mädchen'])).toContain('<loc>https://example.org/wort/m%C3%A4dchen</loc>');
  });
});

describe('the English line', () => {
  it('says what transfer.json says, and nothing for a word it does not name', () => {
    expect(page('wasser')).toContain('Related to English <b>water</b>. German <b lang="de" translate="no">ss, ß</b> is often English <b>t</b>:');
    expect(page('team')).toContain('Borrowed from English.');
    expect(page('wohnung')).not.toContain('Related to English');
  });
});

// The films' rule applied to pages: a page renders corpus fields and writes none.
describe('every fact on a page is a corpus field', () => {
  const sample = [...pages.entries()].filter((_, i) => i % 97 === 0);
  const facts = (c: PageCard) => [c.term, c.en, c.plural, c.ipa, c.def, ...(c.ex ?? []).flatMap((e) => [e.de, e.en])].filter(Boolean) as string[];
  it(`shows each card's term, gloss, plural, IPA, definition and examples (${sample.length} pages)`, () => {
    const missing: string[] = [];
    for (const [s, cs] of sample) {
      const html = page(s);
      for (const c of cs) for (const f of facts(c)) if (!html.includes(esc(f))) missing.push(`${s}: ${f}`);
    }
    expect(missing).toEqual([]);
  });
});

describe('the size', () => {
  it('keeps every page under 2 KB gzipped', () => {
    const over = [...pages.keys()].map((s) => [s, gzipSync(page(s)).length] as const).filter(([, n]) => n > 2048);
    expect(over).toEqual([]);
  });
});
