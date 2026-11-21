// Measures what a crawlable page per headword would be, before any is built.
//
//   npm run pages:measure [-- --out <dir>]
//
// The instrument behind docs/PAGES.md. It reads the shipped corpus, groups the
// teachable cards (`kind: 'word'`) by the slug a page would live at, and reports
// the collisions that decide the URL scheme: cards that share a spelling, spellings
// that differ only by case (das Essen / essen), and spellings an ASCII
// transliteration would merge (Masse / Maße). It then renders a throwaway
// prototype page per slug into a scratch folder — never into `public/` or `dist/`
// — so the file count, bytes and render time are measured rather than guessed.
// The prototype's markup is not the design; only its size is read.
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';

interface Card { id: string; term: string; en: string; pos: string; level: string; gender?: string; plural?: string; ipa?: string; kind: string }
interface Example { de: string; en: string; lvl?: string }
interface Detail { def?: string; ex?: Example[] }

const DATA = 'public/data';
const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? process.argv[outArg + 1] : join(tmpdir(), 'lexi-pages-measure');

const cards = (JSON.parse(readFileSync(join(DATA, 'cards.json'), 'utf8')) as Card[]).filter((c) => c.kind === 'word');
const detail: Record<string, Detail> = {};
for (const f of readdirSync(join(DATA, 'detail'))) Object.assign(detail, JSON.parse(readFileSync(join(DATA, 'detail', f), 'utf8')));

/** The headword a page is named after: the term without its article. */
export const bare = (term: string) => term.normalize('NFC').replace(/^(?:der|die|das)(?:\/(?:der|die|das))*\s+/, '').trim();

/** The page's path segment: case-folded, real spelling kept (ä ö ü ß survive). */
export const slug = (term: string) =>
  bare(term).toLocaleLowerCase('de').replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

const ascii = (s: string) => s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

const pages = new Map<string, Card[]>();
for (const c of cards) {
  const s = slug(c.term);
  pages.set(s, [...(pages.get(s) ?? []), c]);
}

const multi = [...pages.entries()].filter(([, cs]) => cs.length > 1);
const caseOnly = multi.filter(([, cs]) => new Set(cs.map((c) => bare(c.term))).size > 1);
const byAscii = new Map<string, string[]>();
for (const s of pages.keys()) byAscii.set(ascii(s), [...(byAscii.get(ascii(s)) ?? []), s]);
const asciiMerges = [...byAscii.values()].filter((ss) => ss.length > 1);
const widest = multi.sort((a, b) => b[1].length - a[1].length)[0];

const has = (p: (c: Card) => unknown) => cards.filter(p).length;
const pct = (n: number) => `${n} (${((100 * n) / cards.length).toFixed(1)}%)`;

console.log(`teachable cards          ${cards.length}`);
console.log(`pages (distinct slugs)   ${pages.size}`);
console.log(`pages holding >1 card    ${multi.length}; widest: /${widest[0]} → ${widest[1].map((c) => c.term).join(' · ')}`);
console.log(`pages merging case only  ${caseOnly.length}; e.g. ${caseOnly.slice(0, 3).map(([s, cs]) => `/${s} (${cs.map((c) => c.term).join(' / ')})`).join(', ')}`);
console.log(`ASCII would also merge   ${asciiMerges.length} slug sets; e.g. ${asciiMerges.slice(0, 3).map((ss) => ss.join(' = ')).join(', ')}`);
console.log(`slugs with ä ö ü ß       ${[...pages.keys()].filter((s) => /[^\x00-\x7f]/.test(s)).length}`);
console.log(`empty slugs (a bug)      ${[...pages.keys()].filter((s) => !s).length}`);
console.log(`coverage — ipa ${pct(has((c) => c.ipa))} · def ${pct(has((c) => detail[c.id]?.def))} · ≥1 example ${pct(has((c) => detail[c.id]?.ex?.length))} · plural (nouns) ${has((c) => c.pos === 'noun' && c.plural)}/${has((c) => c.pos === 'noun')}`);

const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const render = (s: string, cs: Card[]) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(bare(cs[0].term))} — meaning, gender and plural | Lexi</title><meta name="description" content="${esc(cs.map((c) => `${c.term}: ${c.en}`).join('; '))}"><link rel="canonical" href="https://example.invalid/wort/${encodeURIComponent(s)}"><link rel="stylesheet" href="/pages.css"></head><body><main>${cs.map((c) => {
  const d = detail[c.id] ?? {};
  return `<article><h1 lang="de">${esc(c.term)}</h1><p>${esc([c.pos, c.level, c.plural, c.ipa && `/${c.ipa}/`].filter(Boolean).join(' · '))}</p><p>${esc(c.en)}</p>${d.def ? `<p>${esc(d.def)}</p>` : ''}<ul>${(d.ex ?? []).map((e) => `<li><span lang="de">${esc(e.de)}</span> — ${esc(e.en)}</li>`).join('')}</ul><a href="/#/w/${encodeURIComponent(c.id)}">Learn this word in Lexi</a></article>`;
}).join('')}</main><footer>CC BY-SA 4.0 · Wiktionary, Tatoeba and others · <a href="/data/NOTICE.txt">sources</a></footer></body></html>`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'wort'), { recursive: true });
const t0 = performance.now();
let raw = 0, gz = 0;
for (const [s, cs] of pages) {
  const html = render(s, cs);
  writeFileSync(join(OUT, 'wort', `${s}.html`), html);
  raw += Buffer.byteLength(html);
  gz += gzipSync(html).length;
}
const ms = performance.now() - t0;
console.log(`prototype render         ${pages.size} files · ${(raw / 1e6).toFixed(1)} MB raw · ${(gz / 1e6).toFixed(1)} MB gzip · mean ${(gz / pages.size / 1e3).toFixed(2)} KB gzip/page · ${(ms / 1e3).toFixed(1)} s`);
console.log(`written to               ${OUT} (scratch; delete freely)`);
