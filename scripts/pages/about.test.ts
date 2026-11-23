// The about page's contract (scripts/pages/about.ts). Every German word on it is a
// card, an example or a dictionary entry that ships today; it carries no inline
// script (the CSP forbids one); and every word link lands on a word page.
import { describe, it, expect } from 'vitest';
import { loadFacts, renderAbout } from './about.ts';
import { loadCards, groupPages } from './build.ts';

const facts = loadFacts();
const html = renderAbout(facts, { origin: 'https://example.test' });
const pages = groupPages(loadCards());

describe('the about page', () => {
  it('says nothing the data does not (loadFacts throws on the first lie)', () => {
    expect(facts.words).toBeGreaterThan(0);
    expect(facts.dictionary).toBeGreaterThan(facts.words);
  });
  it('carries no inline script: its one script is a file', () => {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts.length).toBe(1);
    for (const [, attrs, body] of scripts) {
      expect(attrs).toMatch(/\bsrc="about\.js"/);
      expect(body.trim()).toBe('');
    }
    expect(html).not.toMatch(/\son[a-z]+="/);
  });
  it('links every word to a page that exists', () => {
    const slugs = [...html.matchAll(/href="wort\/([^"]+)"/g)].map((m) => decodeURIComponent(m[1]));
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.filter((s) => !pages.has(s))).toEqual([]);
  });
  it('marks a real span in every sound-shift pair it shows', () => {
    for (const [key, rule] of Object.entries(facts.transfer.rules)) {
      if (!html.includes(`data-rule="${key}"`)) continue;
      const [de, en] = rule.mark;
      for (const [d, e] of rule.ex) {
        expect(new RegExp(de, 'i').test(d), `${key}: ${de} in ${d}`).toBe(true);
        expect(new RegExp(en).test(e), `${key}: ${en} in ${e}`).toBe(true);
      }
    }
  });
  it('is one page: relative links only, so it serves under any base', () => {
    expect([...html.matchAll(/(?:href|src)="\/(?!\/)/g)]).toEqual([]);
  });
});
