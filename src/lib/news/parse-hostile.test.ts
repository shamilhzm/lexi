// Persona pass, 2026-11-20 ("Aylin", on a train): feeds as they arrive in the wild.
import { describe, it, expect } from 'vitest';
import { parseFeed, decodeEntities, parseTagesschauDetail } from './parse.ts';

const rss = (items: string) => `<rss><channel>${items}</channel></rss>`;

describe('a feed with one bad character', () => {
  it('drops an out-of-range entity instead of losing the whole list', () => {
    expect(decodeEntities('A&#1114112;B')).toBe('AB');
    const xml = rss(`<item><title>Gut</title><link>https://www.srf.ch/a</link></item>
      <item><title>Kaputt &#99999999;</title><link>https://www.srf.ch/b</link></item>`);
    expect(parseFeed(xml, 'srf').map((a) => a.title)).toEqual(['Gut', 'Kaputt']);
    expect(() => parseTagesschauDetail({ content: [{ type: 'text', value: '<p>Erster Absatz.</p>' }, { type: 'text', value: 'x &#x110000; y' }] })).not.toThrow();
  });
});

describe('items without a <link>', () => {
  it('link to the guid’s text, not to its isPermaLink attribute', () => {
    const xml = rss(`<item><title>Eins</title><guid isPermaLink="true">https://www.srf.ch/news/1</guid></item>
      <item><title>Zwei</title><guid isPermaLink="true">https://www.srf.ch/news/2</guid></item>`);
    const out = parseFeed(xml, 'srf');
    expect(out[0].url).toBe('https://www.srf.ch/news/1');
    expect(out[0].id).not.toBe(out[1].id);
  });
});

describe('what the reader shows', () => {
  it('decodes a double-encoded title, as it does a teaser', () => {
    const xml = rss(`<item><title>Bundes&amp;shy;regierung &amp;#8211; Streit</title><link>https://www.tagesschau.de/x</link>
      <description>Bundes&amp;shy;regierung &amp;#8211; Streit</description></item>`);
    const [a] = parseFeed(xml, 'tagesschau');
    expect(a.title).not.toContain('&');
    expect(a.teaser).toBe('Bundesregierung – Streit');
  });
  it('keeps scripts and styles out, and a block boundary between words', () => {
    const xml = rss(`<item><title>T</title><link>https://www.srf.ch/y</link>
      <description><![CDATA[<p>Hallo Welt.</p><p>Zweiter</p><script>window.track("x")</script><style>.a{color:red}</style>]]></description></item>`);
    const [a] = parseFeed(xml, 'srf');
    expect(a.teaser).toBe('Hallo Welt. Zweiter');
  });
});
