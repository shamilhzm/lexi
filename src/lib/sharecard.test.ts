// The share card's words. The picture is canvas and is checked by eye; what it
// *claims* is pure and pinned here, because a brag card is the one place the app
// speaks to strangers on the learner's behalf.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cardLines, shareUrl, shareText, darkTokens, type CardFacts } from './sharecard.ts';
import { PUBLIC_ORIGIN } from './publicCopy.ts';

const f = (o: Partial<CardFacts> = {}): CardFacts =>
  ({ known: 1234, learned: 1500, recalled: 310, streak: 12, name: '', ...o });

describe('cardLines', () => {
  it('leads with the known count, not a blend of known and produced', () => {
    const l = cardLines(f());
    expect(l.number).toBe('1,234');
    expect(l.label).toBe('German words I know');
    expect(l.sub).toContain('310 I can also write from memory');
  });

  it('says a person when a name is set, and nothing about them when not', () => {
    expect(cardLines(f({ name: '  Sam ' })).label).toBe('German words Sam knows');
    expect(cardLines(f()).label).not.toMatch(/undefined|null/);
  });

  it('never prints a CEFR level — the card cannot carry the caveat', () => {
    const all = Object.values(cardLines(f())).join(' ');
    expect(all).not.toMatch(/\b(A1|A2|B1|B2|C1|C2)\b|level/i);
  });

  it('does not print a one-day streak, or a production count of zero', () => {
    const l = cardLines(f({ streak: 1, recalled: 0 }));
    expect(l.sub).toBe('');
  });

  it('with nothing known yet, counts what was started rather than bragging a zero', () => {
    const l = cardLines(f({ known: 0, learned: 12 }));
    expect(l.number).toBe('12');
    expect(l.label).toBe('German words I’ve started');
  });
});

describe('the way back', () => {
  it('leads to the public origin with a fixed tag that identifies no one', () => {
    expect(shareUrl()).toBe(`${PUBLIC_ORIGIN}/?ref=share`);
    expect(shareUrl('https://example.test/')).toBe('https://example.test/?ref=share');
  });

  it('the text that travels with the image says what it is and that it is free', () => {
    expect(shareText(f())).toMatch(/^1,234 German words I know/);
    expect(shareText(f())).toMatch(/free, no account/);
  });
});

describe('darkTokens', () => {
  const style = (o: Record<string, string>) => {
    const keys = Object.keys(o);
    return { length: keys.length, item: (i: number) => keys[i], getPropertyValue: (p: string) => ` ${o[p]}` };
  };

  it('reads html.dark custom properties, walking into grouped rules', () => {
    const sheets = [{
      cssRules: [
        { selectorText: ':root', style: style({ '--color-bg': '#eeeae3' }) },
        { cssRules: [{ selectorText: 'html.dark', style: style({ '--color-bg': '#101619', color: 'red' }) }] },
      ],
    }];
    const t = darkTokens(sheets);
    expect(t.get('--color-bg')).toBe('#101619');
    expect(t.has('color')).toBe(false);
  });

  it('survives a sheet whose rules cannot be read', () => {
    const hostile = { get cssRules(): never { throw new Error('cross-origin'); } };
    expect(darkTokens([hostile]).size).toBe(0);
  });

  it('finds the night inks the card paints with in the real stylesheet', () => {
    // A guard on the source rather than the browser: if the dark block is ever
    // renamed, the card would silently fall back to the day palette.
    const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8');
    const block = /html\.dark\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    for (const name of ['--color-bg', '--color-panel', '--color-line', '--color-txt', '--color-dim', '--color-accent', '--color-green']) {
      expect(block, name).toMatch(new RegExp(`${name}:\\s*#`));
    }
  });
});
