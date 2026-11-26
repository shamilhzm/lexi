// A static page per headword, written into a built `dist/` (docs/PAGES.md).
//
//   node scripts/pages/build.ts [dist]        (run by `npm run build`, after Vite)
//   node scripts/pages/build.ts --lock        (rewrite published.txt from the corpus)
//
// **What a page is.** Every card with one spelling, case folded (`/wort/band` holds
// *die Band* and *der Band*), drawn from `cards.json` and `detail/`. Static HTML with
// no script, so it cannot read or write a learner's store: it cannot grade and it
// cannot count an exposure. Its one action, *Learn this word in Lexi*, opens
// `#/w/<id>`, the word's entry over the feed, and arriving there saves nothing.
//
// **Not dictionary entries.** The 93,046 Wiktionary glosses get no page: a page
// would dress an unverified entry in a card's chrome (VISION, *Two layers*).
//
// **Not indexed until the domain is settled.** Canonical URLs need the final origin,
// and getting the free subdomain ranked and then moving would spend the ranking as a
// move strands progress. So every page says `noindex` and no sitemap is written
// until `LEXI_PUBLIC_ORIGIN` names the origin (the variable `publicCopy.ts` reads).
//
// **Nothing 404s once published.** `published.txt` lists every slug ever built;
// `pages.test.ts` fails when one disappears without an entry in `redirects.json`,
// and the build writes each redirect as a page that forwards and is never indexed.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bare, slug } from '../../src/lib/slug.ts';
import { transferFor, type Transfer, type TransferData } from '../../src/lib/transfer.ts';

export interface Example { de: string; en: string; lvl?: string }
export interface PageCard {
  id: string; term: string; en: string; pos: string; level: string; kind?: string;
  gender?: string; plural?: string; ipa?: string; syn?: string[]; ant?: string[];
  def?: string; ex?: Example[];
  /** Tatoeba's sentence id, when provenance credits an example to Tatoeba. */
  tatoeba?: string;
  /** Its English relation (`transfer.json`, VISION *The transfer line*). */
  transfer?: Transfer;
}
export interface Ctx {
  /** The app's base path, as Vite builds it: `/` on Vercel, `/lexi/` elsewhere. */
  base: string;
  /** The settled public origin. Absent means: not indexed, no canonical, no sitemap. */
  origin?: string;
  prev?: { slug: string; label: string };
  next?: { slug: string; label: string };
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** The teachable cards with their entry data, as the pages draw them. */
export function loadCards(dataDir = join(ROOT, 'public', 'data')): PageCard[] {
  const cards = (JSON.parse(readFileSync(join(dataDir, 'cards.json'), 'utf8')) as PageCard[]).filter((c) => c.kind === 'word');
  const detail: Record<string, { def?: string; ex?: Example[] }> = {};
  for (const f of readdirSync(join(dataDir, 'detail'))) Object.assign(detail, JSON.parse(readFileSync(join(dataDir, 'detail', f), 'utf8')));
  const prov = new Map<string, string>();
  for (const p of JSON.parse(readFileSync(join(dataDir, 'provenance.json'), 'utf8')) as { id: string; exampleSource?: string }[]) {
    if (p.exampleSource?.startsWith('tatoeba:')) prov.set(p.id, p.exampleSource.slice(8));
  }
  const tf = join(dataDir, 'transfer.json');
  const transfer = existsSync(tf) ? JSON.parse(readFileSync(tf, 'utf8')) as TransferData : null;
  return cards.map((c) => ({
    ...c, def: detail[c.id]?.def, ex: detail[c.id]?.ex ?? [], tatoeba: prov.get(c.id),
    transfer: transferFor(transfer, c.term, bare(c.term)) ?? undefined,
  }));
}

/** Pages by slug, in teaching order: level, then the corpus's own order. */
export function groupPages(cards: PageCard[]): Map<string, PageCard[]> {
  const sorted = [...cards].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
  const pages = new Map<string, PageCard[]>();
  for (const c of sorted) {
    const s = slug(c.term);
    pages.set(s, [...(pages.get(s) ?? []), c]);
  }
  return pages;
}

const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wordLink = (base: string, id: string) => `${base}#/w/${encodeURIComponent(id)}`;
export const pagePath = (base: string, s: string) => `${base}wort/${encodeURIComponent(s)}`;

const ARTICLE = /^(der|die|das)\s+/;
function headword(c: PageCard): string {
  const m = ARTICLE.exec(c.term);
  const tone = c.pos === 'noun' && c.gender ? ` g-${c.gender}` : '';
  if (!m) return `<h1 class="hw${tone}" lang="de" translate="no">${esc(c.term)}</h1>`;
  return `<h1 class="hw${tone}" lang="de" translate="no"><span class="art">${esc(m[1])}</span> ${esc(c.term.slice(m[0].length))}</h1>`;
}

function article(c: PageCard, ctx: Ctx): string {
  const facts = [
    c.plural && `<div><dt>Plural</dt><dd lang="de" translate="no">${esc(c.plural)}</dd></div>`,
    c.ipa && `<div><dt>Say it</dt><dd class="ipa">/${esc(c.ipa)}/</dd></div>`,
  ].filter(Boolean).join('');
  const related = (label: string, xs?: string[]) => xs?.length
    ? `<p class="rel"><span class="kicker">${label}</span> <span lang="de" translate="no">${xs.map(esc).join(' · ')}</span></p>` : '';
  const t = c.transfer;
  const english = t && (t.kind === 'b' || t.en) ? `<p class="rel"><span class="kicker">English</span> ${
    t.kind === 'b' ? `Borrowed from English${t.en ? ` <b>${esc(t.en)}</b>` : ''}.` : `Related to English <b>${esc(t.en)}</b>.`}${
    t.rule ? ` German <b lang="de" translate="no">${esc(t.rule.de)}</b> is often English <b>${esc(t.rule.en)}</b>: ${
      t.rule.ex.map(([d, e]) => `<span lang="de" translate="no">${esc(d)}</span> · ${esc(e)}`).join(', ')}.` : ''}</p>` : '';
  const ex = (c.ex ?? []).map((e) => `<li><span lang="de" translate="no">${esc(e.de)}</span><span class="en">${esc(e.en)}</span></li>`).join('');
  return `<article class="card">
<p class="kicker">${esc(c.level)} · ${esc(c.pos)}</p>
${headword(c)}
<p class="gloss">${esc(c.en)}</p>
${facts ? `<dl class="facts">${facts}</dl>` : ''}
${c.def ? `<p class="def">${esc(c.def)}</p>` : ''}
${english}
${ex ? `<h2 class="kicker">Examples</h2><ul class="ex">${ex}</ul>` : ''}
${related('Similar', c.syn)}${related('Opposite', c.ant)}
<p class="act"><a class="learn" href="${esc(wordLink(ctx.base, c.id))}">Learn <span lang="de" translate="no">${esc(c.term)}</span> in Lexi</a></p>
</article>`;
}

/** What the page is for, in the words a search box would use. */
function title(cards: PageCard[]): string {
  const head = bare(cards[0].term);
  const forms = cards.map((c) => c.term).filter((t) => t !== head);
  const what = cards.some((c) => c.pos === 'noun') ? 'meaning, gender and plural' : 'meaning and examples';
  return `${head}${forms.length ? ` (${forms.join(', ')})` : ''}: ${what} | Lexi`;
}

function description(cards: PageCard[]): string {
  const s = cards.map((c) => `${c.term}${c.plural ? ` (plural ${c.plural})` : ''}: ${c.en}`).join('; ');
  const tail = `. ${cards[0].level} German, with pronunciation and example sentences.`;
  return s.length + tail.length <= 158 ? s + tail : `${s.slice(0, 154)}…`;
}

export function renderPage(s: string, cards: PageCard[], ctx: Ctx): string {
  const robots = ctx.origin ? '' : '<meta name="robots" content="noindex">';
  const canonical = ctx.origin ? `<link rel="canonical" href="${esc(ctx.origin + pagePath(ctx.base, s))}">` : '';
  const tatoeba = cards.flatMap((c) => (c.tatoeba ? [c.tatoeba] : []));
  const nav = (ctx.prev || ctx.next) ? `<nav class="near" aria-label="Nearby words">${
    ctx.prev ? `<a rel="prev" href="${esc(pagePath(ctx.base, ctx.prev.slug))}" lang="de" translate="no">← ${esc(ctx.prev.label)}</a>` : '<span></span>'}${
    ctx.next ? `<a rel="next" href="${esc(pagePath(ctx.base, ctx.next.slug))}" lang="de" translate="no">${esc(ctx.next.label)} →</a>` : ''}</nav>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title(cards))}</title>
<meta name="description" content="${esc(description(cards))}">
${robots}${canonical}
<link rel="icon" href="${ctx.base}icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${ctx.base}wort/pages.css">
</head>
<body>
<header class="bar"><a class="mark" href="${ctx.base}">Lexi</a><span class="tag">German words, checked against the dictionary</span></header>
<main>
${cards.map((c) => article(c, ctx)).join('\n')}
<p class="note">Opens this word in Lexi, free and with no account. Nothing is saved until you press the bookmark, and your progress stays on your device.</p>
${nav}
</main>
<footer>
<p>Word data <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>: Wiktionary contributors, Tatoeba and others (<a href="${ctx.base}data/NOTICE.txt">sources</a>).${
  tatoeba.length ? ` Example sentences include ${tatoeba.map((id) => `<a href="https://tatoeba.org/en/sentences/show/${esc(id)}">Tatoeba #${esc(id)}</a>`).join(', ')} (CC BY 2.0 FR).` : ''}
Many glosses and examples were written with an AI model and machine-checked. Code: <a href="https://github.com/shamilhzm/lexi">MIT, on GitHub</a>.</p>
</footer>
</body>
</html>
`;
}

/** A retired slug: it forwards, so nothing that was published 404s. */
export function renderRedirect(to: string, ctx: Ctx): string {
  const href = esc(pagePath(ctx.base, to));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">` +
    `<meta http-equiv="refresh" content="0; url=${href}"><link rel="canonical" href="${ctx.origin ? esc(ctx.origin) : ''}${href}">` +
    `<title>Moved</title></head><body><p><a href="${href}">This word moved.</a></p></body></html>\n`;
}

export function renderSitemap(origin: string, base: string, slugs: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    slugs.map((s) => `<url><loc>${esc(origin + pagePath(base, s))}</loc></url>`).join('\n')}\n</urlset>\n`;
}

/** One stylesheet for every page: the card box's tokens, both themes, the display
 *  serif from the app's own hashed font file. */
export function renderCss(base: string, display?: string): string {
  const face = display ? `@font-face{font-family:"Bricolage Grotesque";src:url("${base}assets/${display}") format("woff2-variations");font-weight:200 800;font-display:swap}` : '';
  return `${face}
:root{--bg:#f4f1e8;--card:#fff;--line:#d9d3c2;--txt:#16181f;--dim:#4d4f58;--accent:#2b3ea6;--key:#ffe45e;--key-ink:#16181f;--der:#0b5fa8;--die:#b4235f;--das:#0b6b58;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#16181d;--card:#252830;--line:#353943;--txt:#efebe0;--dim:#b0ada5;--accent:#aebbff;--der:#7cc0ff;--die:#ff8fbf;--das:#62d6b4}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--txt);font:17px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent)}
.bar{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;max-width:44rem;margin:0 auto;padding:18px 16px 4px}
.mark{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-weight:800;font-size:22px;color:var(--txt);text-decoration:none}
.tag{color:var(--dim);font-size:13px}
main{max-width:44rem;margin:0 auto;padding:8px 16px 24px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;margin:16px 0;box-shadow:0 1px 2px rgb(0 0 0/.04),0 8px 24px -12px rgb(0 0 0/.12)}
.kicker{font:600 11px/1.4 ui-monospace,"SFMono-Regular",Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin:0}
.hw{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-optical-sizing:auto;font-weight:700;font-size:clamp(34px,8vw,48px);line-height:1.1;letter-spacing:-.01em;margin:8px 0 4px;overflow-wrap:anywhere}
.g-der{color:var(--der)}.g-die{color:var(--die)}.g-das{color:var(--das)}
.gloss{font-size:20px;margin:4px 0 12px}
.facts{display:flex;flex-wrap:wrap;gap:8px 28px;margin:0 0 12px}
.facts dt{font:600 11px/1.4 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.facts dd{margin:0}
.def{color:var(--dim);margin:0 0 12px}
h2.kicker{margin-top:18px}
.ex{list-style:none;padding:0;margin:8px 0 0}
.ex li{padding:10px 0;border-top:1px solid var(--line)}
.ex .en{display:block;color:var(--dim);font-size:15px}
.rel{margin:12px 0 0}
.act{margin:22px 0 0}
.learn{display:inline-block;background:var(--key);color:var(--key-ink);font-weight:700;text-decoration:none;border-radius:999px;padding:12px 22px;min-height:44px}
.learn:focus-visible,a:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.note{color:var(--dim);font-size:14px;margin:4px 4px 20px}
.near{display:flex;justify-content:space-between;gap:16px;border-top:1px solid var(--line);padding-top:14px}
.near a{text-decoration:none}
footer{max-width:44rem;margin:0 auto;padding:0 16px 40px;color:var(--dim);font-size:13px}
`;
}

/** Write every page, the stylesheet, robots.txt and (with an origin) the sitemap. */
export function buildPages(dist: string, cards: PageCard[], opts: { base: string; origin?: string; redirects?: Record<string, string> }) {
  const pages = groupPages(cards);
  const slugs = [...pages.keys()];
  const out = join(dist, 'wort');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const assets = existsSync(join(dist, 'assets')) ? readdirSync(join(dist, 'assets')) : [];
  writeFileSync(join(out, 'pages.css'), renderCss(opts.base, assets.find((f) => /^bricolage-grotesque-var-.*\.woff2$/.test(f))));
  const label = (s: string) => pages.get(s)![0].term;
  slugs.forEach((s, i) => {
    const ctx: Ctx = {
      base: opts.base, origin: opts.origin,
      prev: i > 0 ? { slug: slugs[i - 1], label: label(slugs[i - 1]) } : undefined,
      next: i < slugs.length - 1 ? { slug: slugs[i + 1], label: label(slugs[i + 1]) } : undefined,
    };
    writeFileSync(join(out, `${s}.html`), renderPage(s, pages.get(s)!, ctx));
  });
  for (const [from, to] of Object.entries(opts.redirects ?? {})) {
    if (!pages.has(from)) writeFileSync(join(out, `${from}.html`), renderRedirect(to, { base: opts.base, origin: opts.origin }));
  }
  writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n${opts.origin ? `Sitemap: ${opts.origin}${opts.base}sitemap.xml\n` : ''}`);
  if (opts.origin) writeFileSync(join(dist, 'sitemap.xml'), renderSitemap(opts.origin, opts.base, slugs));
  return { pages: slugs.length, redirects: Object.keys(opts.redirects ?? {}).length };
}

export const PUBLISHED = join(HERE, 'published.txt');
export const REDIRECTS = join(HERE, 'redirects.json');
export const readPublished = () => existsSync(PUBLISHED) ? readFileSync(PUBLISHED, 'utf8').split('\n').filter(Boolean) : [];
export const readRedirects = (): Record<string, string> => existsSync(REDIRECTS) ? JSON.parse(readFileSync(REDIRECTS, 'utf8')) : {};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const cards = loadCards();
  if (process.argv.includes('--lock')) {
    const all = new Set([...readPublished(), ...groupPages(cards).keys()]);
    writeFileSync(PUBLISHED, [...all].sort().join('\n') + '\n');
    console.log(`published.txt: ${all.size} slugs`);
  } else if (process.env.VITE_STORE_BUILD === '1') {
    console.log('pages: skipped (store build)');
  } else {
    const dist = process.argv[2] ?? join(ROOT, 'dist');
    // The same rule as vite.config.ts's `base`.
    const base = process.env.VERCEL ? '/' : '/lexi/';
    const origin = process.env.LEXI_PUBLIC_ORIGIN?.replace(/\/+$/, '') || undefined;
    const r = buildPages(dist, cards, { base, origin, redirects: readRedirects() });
    console.log(`pages: ${r.pages} written to ${join(dist, 'wort')}${r.redirects ? `, ${r.redirects} redirects` : ''}${origin ? `, indexed at ${origin}` : ', noindex (no LEXI_PUBLIC_ORIGIN)'}`);
  }
}
