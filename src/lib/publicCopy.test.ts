import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { countTaught, roundedDown, stampPublicCopy, PUBLIC_ORIGIN } from './publicCopy.ts';

const root = process.cwd();
const html = readFileSync(join(root, 'index.html'), 'utf8');
const head = html.slice(0, html.indexOf('</head>'));
const cards = JSON.parse(readFileSync(join(root, 'public', 'data', 'cards.json'), 'utf8')) as { kind?: string }[];
const dictionary = Number(JSON.parse(readFileSync(join(root, 'public', 'data', 'lex', 'index.json'), 'utf8')).n);

describe('roundedDown', () => {
  it('rounds down to the thousand and says so with a plus', () => {
    expect(roundedDown(10_078)).toBe('10,000+');
    expect(roundedDown(93_046)).toBe('93,000+');
  });
  it('never claims more than there is — an exact thousand gets no plus', () => {
    expect(roundedDown(10_000)).toBe('10,000');
  });
  it('is exact below a thousand', () => {
    expect(roundedDown(999)).toBe('999');
    expect(roundedDown(0)).toBe('0');
  });
  it('refuses something that is not a count', () => {
    expect(() => roundedDown(Number.NaN)).toThrow();
    expect(() => roundedDown(-1)).toThrow();
  });
});

describe('countTaught', () => {
  it('drops the grammar cards the app filters at load', () => {
    expect(countTaught([{ kind: 'word' }, { kind: 'grammar' }, {}])).toBe(2);
  });
});

describe('stampPublicCopy', () => {
  it('fills every token', () => {
    const out = stampPublicCopy('<a href="%LEXI_ORIGIN%/">%LEXI_WORDS% · %LEXI_DICTIONARY%</a>',
      { words: 10_078, dictionary: 93_046 }, 'https://example.test/');
    expect(out).toBe('<a href="https://example.test/">10,000+ · 93,000+</a>');
  });
  it('fails loudly on a token it does not know, rather than shipping it', () => {
    expect(() => stampPublicCopy('%LEXI_WORSD%', { words: 1, dictionary: 1 })).toThrow(/LEXI_WORSD/);
  });
});

// The guard the old meta description needed. A number typed into index.html went
// a third stale without a sound; these fail the day someone types one back.
describe('index.html — the public copy', () => {
  const stamped = stampPublicCopy(head, { words: countTaught(cards), dictionary }, PUBLIC_ORIGIN);
  const metas = [...head.matchAll(/<meta\s[^>]*content="([^"]*)"/g)].map((m) => m[1]);

  it('types no word count by hand — counts arrive as tokens', () => {
    // Any four-digit-or-longer figure in a meta tag other than an image size.
    const typed = metas.filter((c) => /\d{1,3},\d{3}|\b\d{4,}\b/.test(c) && !/^\d+$/.test(c));
    expect(typed).toEqual([]);
  });

  it('stamps against the shipped data, and the claim is true of it', () => {
    expect(stamped).not.toMatch(/%LEXI_/);
    const claimed = Number(/content="([\d,]+)\+? German words/.exec(stamped)?.[1].replace(/,/g, ''));
    expect(claimed).toBeGreaterThan(0);
    expect(claimed).toBeLessThanOrEqual(countTaught(cards));
  });

  it('gives link previews an absolute image and the large card', () => {
    expect(stamped).toMatch(/property="og:image" content="https:\/\/[^"]+\/og\.png"/);
    expect(stamped).toMatch(/name="twitter:card" content="summary_large_image"/);
  });

  it('never makes the promise that is not true of the whole app', () => {
    // Stories, the tutor and dictionary lookups reach the network; progress does not.
    // Comments stripped: the head explains the old claim, and must be allowed to.
    const shipped = head.replace(/<!--[\s\S]*?-->/g, '');
    expect(shipped).not.toMatch(/(never|nothing) leaves (your|this) device/i);
  });
});
