import { describe, it, expect } from 'vitest';
import { parseTagesschauList, parseTagesschauDetail, parseFeed, parseSrfArticle, parseDwArticle, textOf, imageIn } from './parse.ts';
import { topicsFor } from './sources.ts';

// Every fixture here is written for the test in the publisher's *shape*. No
// publisher text is committed — Tagesschau's API terms forbid republishing, and a
// fixture in a public repository is a publication.

describe('tagesschau', () => {
  const list = {
    news: [
      { sophoraId: 'zinsen-100', title: 'Die Zinsen bleiben stabil', topline: 'Geldpolitik',
        firstSentence: 'Die Notenbank ändert heute nichts.', date: '2026-09-24T10:00:00+02:00',
        details: 'https://www.tagesschau.de/api2u/wirtschaft/zinsen-100.json',
        shareURL: 'https://www.tagesschau.de/wirtschaft/zinsen-100.html', type: 'story',
        tags: [{ tag: 'Zinsen' }, { tag: 'EZB' }],
        teaserImage: { alttext: 'Ein Gebäude', copyright: 'dpa', imageVariants: { '1x1-144': 'https://i/1x1-144.jpg', '16x9-960': 'https://i/16x9-960.jpg' } } },
      { sophoraId: 'video-1', title: 'Ein Video', type: 'video', details: 'https://x' },
    ],
  };
  it('keeps stories, drops videos, and carries the fields the reader needs', () => {
    const a = parseTagesschauList(list);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({
      id: 'tagesschau:zinsen-100', source: 'tagesschau', title: 'Die Zinsen bleiben stabil',
      topline: 'Geldpolitik', teaser: 'Die Notenbank ändert heute nichts.', tags: ['Zinsen', 'EZB'],
      url: 'https://www.tagesschau.de/wirtschaft/zinsen-100.html', fullText: true,
    });
    expect(a[0].published).toBe(Date.parse('2026-09-24T10:00:00+02:00'));
    expect(a[0].image).toEqual({ src: 'https://i/16x9-960.jpg', alt: 'Ein Gebäude', credit: 'dpa' });
  });
  it('reads running text and headings, and drops boxes and credit lines', () => {
    const paras = parseTagesschauDetail({ content: [
      { type: 'text', value: '<strong>Die Bank hat entschieden.</strong> Es gibt <a href="#">keine</a> Änderung.' },
      { type: 'box', value: 'Mehr zum Thema' },
      { type: 'headline', value: '<h2>Was das heißt</h2>' },
      { type: 'text', value: 'Kredite bleiben teuer.' },
      { type: 'text', value: 'tagesschau24 | Nachrichten | 24.09.2026 | 10:00 Uhr' },
    ] });
    expect(paras).toEqual([
      { kind: 'p', text: 'Die Bank hat entschieden. Es gibt keine Änderung.' },
      { kind: 'h', text: 'Was das heißt' },
      { kind: 'p', text: 'Kredite bleiben teuer.' },
    ]);
  });
  it('returns nothing, not a guess, for a shape it does not know', () => {
    expect(parseTagesschauList({ items: [] })).toEqual([]);
    expect(parseTagesschauDetail(null)).toEqual([]);
  });
});

describe('RSS and Atom', () => {
  const srf = `<rss><channel><title>SRF Sport</title>
    <item><title>Motorsport-News – Ein Team verlängert mit seinem Fahrer</title>
      <link>https://www.srf.ch/sport/motorsport/news-1</link>
      <description><![CDATA[<img src="x.jpg"/>Kurz &amp; knapp: die Nachrichten des Tages.]]></description>
      <pubDate>Wed, 23 Sep 2026 10:00:00 GMT</pubDate></item>
  </channel></rss>`;
  it('splits SRF’s "Topline – Headline" titles and decodes the teaser', () => {
    const [a] = parseFeed(srf, 'srf');
    expect(a.topline).toBe('Motorsport-News');
    expect(a.title).toBe('Ein Team verlängert mit seinem Fahrer');
    expect(a.teaser).toBe('Kurz & knapp: die Nachrichten des Tages.');
    expect(a.detail).toBe('https://www.srf.ch/sport/motorsport/news-1');
    expect(a.fullText).toBe(true);
  });
  it('reads the DW slow-news date as the topline and keeps the audio', () => {
    const dw = `<rss><channel><item><title>24.09.2026 – Langsam Gesprochene Nachrichten</title>
      <link>https://learngerman.dw.com/de/lgn/a-1</link><description>Heute in den Nachrichten.</description>
      <enclosure url="https://example.org/lgn.mp3" type="audio/mpeg" length="1"/></item></channel></rss>`;
    const [a] = parseFeed(dw, 'dw');
    expect(a).toMatchObject({ topline: '24.09.2026', title: 'Langsam gesprochene Nachrichten', audio: 'https://example.org/lgn.mp3' });
  });
  it('reads Atom entries as teaser-only', () => {
    const atom = `<feed><entry><title>Neue Chips für KI</title><link href="https://www.heise.de/news/1.html?wt=rss"/>
      <summary>Ein Hersteller stellt neue Prozessoren vor.</summary><published>2026-09-24T08:00:00Z</published></entry></feed>`;
    const [a] = parseFeed(atom, 'heise');
    expect(a).toMatchObject({ title: 'Neue Chips für KI', teaser: 'Ein Hersteller stellt neue Prozessoren vor.', fullText: false, detail: null });
  });
  it('gives the same article the same id whatever tracking parameter the feed appends', () => {
    const one = parseFeed('<feed><entry><title>T</title><link href="https://h.de/a.html?x=1"/></entry></feed>', 'heise')[0];
    const two = parseFeed('<feed><entry><title>T</title><link href="https://h.de/a.html?x=2"/></entry></feed>', 'heise')[0];
    expect(one.id).toBe(two.id);
  });
});

describe('teaser images', () => {
  it('upsizes the publishers’ small variants where the URL scheme allows', () => {
    expect(imageIn('&lt;img src="https://www.srf.ch/static/cms/images//320ws/1.webp" alt="Ein Auto"&gt;Text'))
      .toEqual({ src: 'https://www.srf.ch/static/cms/images//960ws/1.webp', alt: 'Ein Auto' });
    expect(imageIn('<img src="https://static.dw.com/image/79404929_302.jpg">')?.src)
      .toBe('https://static.dw.com/image/79404929_304.jpg');
    expect(imageIn('no image here')).toBeNull();
  });
});

describe('article pages', () => {
  it('reads an SRF body from inside the article section only', () => {
    const html = `<nav><p class="article-paragraph">Navigation, not the story</p></nav>
      <section class="articlepage__article-content" itemprop="articleBody">
        <h2 class="article-heading">Wieder am Start</h2>
        <p class="article-paragraph">Der Fahrer kehrt am Wochenende zurück.</p>
        <p class="article-paragraph">Das Rennen gibt's live bei SRF:</p>
        <p class="article-paragraph"></p>
        <h3 class="article-subheading">Resultate</h3>
      </section><section><p class="article-paragraph">Meistgelesen</p></section>`;
    expect(parseSrfArticle(html)).toEqual([
      { kind: 'h', text: 'Wieder am Start' },
      { kind: 'p', text: 'Der Fahrer kehrt am Wochenende zurück.' },
    ]);
  });
  it('reads the DW transcript out of the page’s embedded state', () => {
    const text = JSON.stringify('<h2>Erste Meldung</h2>\n\n<p>Die Regierung hat heute &#160;entschieden.</p><p>Zweiter Satz.</p>').slice(1, -1);
    const html = `<script>window.__APOLLO_STATE__={"Article:42":{"__typename":"Article","id":42,"text":"${text}","other":1}}</script>`;
    expect(parseDwArticle(html)).toEqual([
      { kind: 'h', text: 'Erste Meldung' },
      { kind: 'p', text: 'Die Regierung hat heute entschieden.' },
      { kind: 'p', text: 'Zweiter Satz.' },
    ]);
  });
  it('strips soft hyphens, which would otherwise split a word for the matcher', () => {
    expect(textOf('Wirt­schafts&shy;wachstum')).toBe('Wirtschaftswachstum');
  });
});

describe('topics', () => {
  it('takes a whole ressort as its topic', () => {
    expect(topicsFor('ts:wirtschaft', 'Der DAX fällt')).toContain('wirtschaft');
  });
  it('filters a broad feed by subject', () => {
    expect(topicsFor('srf:sport', 'Formel 1: Norris gewinnt in Baku')).toContain('motorsport');
    expect(topicsFor('srf:sport', 'Der FC Basel gewinnt')).not.toContain('motorsport');
    expect(topicsFor('ts:inland', 'Neue Regeln für die Einbürgerung')).toContain('migration');
    expect(topicsFor('heise:top', 'Nintendo kündigt neue Konsole an')).toEqual(expect.arrayContaining(['tech', 'games']));
  });
});

describe('the topic a story is about', () => {
  it('prefers the narrow interest over the broad ressort', async () => {
    const { primaryTopic } = await import('./sources.ts');
    expect(primaryTopic(['politik', 'migration'])).toBe('migration');
    expect(primaryTopic(['wirtschaft', 'karriere'])).toBe('karriere');
    expect(primaryTopic(['wirtschaft'])).toBe('wirtschaft');
  });
});

describe('topic keywords match words, not fragments', async () => {
  const { topicsFor } = await import('./sources.ts');
  // The four false careers hits from 409 live articles, 2026-09-24.
  it('does not find a career in Hintergründe, Gründe or Wettbewerb', () => {
    for (const t of ['Matthias Heim über die Hintergründe', 'Die Gründe für die Pleite', 'Streit um den Wettbewerb']) {
      expect(topicsFor('ts:wirtschaft', t)).not.toContain('karriere');
    }
  });
  it('still finds one in Gründer, Jobs and Kündigung', () => {
    for (const t of ['Ein Gründer aus Berlin', '230 Jobs fallen weg', 'Die Kündigung kam per Mail']) {
      expect(topicsFor('ts:wirtschaft', t)).toContain('karriere');
    }
  });
  it('matches KI as a word, including before a hyphen', () => {
    expect(topicsFor('ts:wissen', 'Die KI-Sicherheit wackelt')).toContain('tech');
    expect(topicsFor('ts:wissen', 'Ein Kiosk schließt')).not.toContain('tech');
  });
});
