// What Lexi does not teach yet, ranked — the input list for `authoring:new`.
//
// Every surface form in the frequency lists (Leipzig news/web, OpenSubtitles
// speech) and in any extra word lists given on the command line is resolved to a
// lemma through the shipped dictionary layer (`public/data/lex`, Wiktionary), and
// the lemma is checked against the corpus **with the app's own matcher** — the
// same question the reader asks, so a word counts as covered exactly when the app
// would light it up. What is left is ranked by how often German actually uses it.
//
// Nothing here is a card. It prints lemmas, their part of speech and article as
// the dictionary states them, a gloss hint, and the evidence for each; the card
// is still written by hand and admitted only by `authoring:new`'s gate.
//
//   node scripts/authoring/gap-candidates.ts                       → data/out/gap-candidates.tsv
//   node scripts/authoring/gap-candidates.ts --list name=path.txt  (repeatable; one word per line)
//
// Closed classes are left out on purpose (VISION §2): "learn *und*" is not a card.
// So are names, affixes, abbreviations and entries the dictionary itself marks
// as a variant, dated or regional — a trainer should teach the form a learner
// will meet.
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildMatcher, isFunctionWord } from '../../src/lib/matcher.ts';
import type { Word } from '../../src/types.ts';
import { FREQ_BANDS } from '../corpus/config.ts';

const RAW = join('scripts', 'corpus', 'data', 'raw');
const OUT = join('scripts', 'corpus', 'data', 'out');

const args = process.argv.slice(2);
const lists: { name: string; path: string }[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--list') {
    const [name, path] = args[++i].split('=');
    lists.push({ name, path });
  }
}

// ---- the corpus, and the question "would the reader light this up?" --------------
const corpus = (JSON.parse(readFileSync('public/data/vocab.json', 'utf8')) as Word[]);
const attested = existsSync('public/data/inflections.json')
  ? JSON.parse(readFileSync('public/data/inflections.json', 'utf8')) as Record<string, string[]>
  : null;
const matcher = buildMatcher(corpus, attested);
const heads = new Set(corpus.map((w) => w.term.replace(/^(der\/die|der|die|das)\s+/i, '').replace(/^sich\s+/, '')
  .replace(/\s+\S+\s*\+\s*[ADGN]$/i, '').toLowerCase()));

function covered(lemma: string): boolean {
  const l = lemma.toLowerCase();
  if (heads.has(l)) return true;
  // An adjectival noun is carded in its weak form, `der/die Vorsitzende`; the
  // dictionary heads it in the strong one, *Vorsitzender*. Same word.
  if (/^[A-ZÄÖÜ]/.test(lemma) && l.endsWith('er') && heads.has(l.slice(0, -1))) return true;
  // A noun carded under its plural (`die Ersparnisse`, `die Leute`) covers the
  // singular too. Caught when `die Ersparnis` was authored beside `die Ersparnisse`
  // and corpus:validate refused it as a form collision.
  if (/^[A-ZÄÖÜ]/.test(lemma) && ['e', 'n', 'en', 'se', 's', 'nen', 'er'].some((x) => heads.has(l + x))) return true;
  const seg = matcher.annotate(lemma).find((s) => s.isWord);
  return !!seg?.word && !seg.viaCompound;
}

// ---- the dictionary layer: lemmas and form pointers ------------------------------
interface Entry { w: string; p: string; g: string[]; x?: string; f?: string[] }
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss').replace(/[^\p{L}\d]/gu, '');
const lemmas = new Map<string, Entry[]>();    // exact headword → entries
const pointers = new Map<string, Set<string>>(); // folded form → lemma headwords
const LEX = join('public', 'data', 'lex');
for (const f of readdirSync(LEX)) {
  if (!/^\d+\.json$/.test(f)) continue;
  const shard = JSON.parse(readFileSync(join(LEX, f), 'utf8')) as { e: Entry[]; f?: Record<string, string> };
  for (const e of shard.e) {
    const a = lemmas.get(e.w); if (a) a.push(e); else lemmas.set(e.w, [e]);
    const k = fold(e.w);
    const s = pointers.get(k); if (s) s.add(e.w); else pointers.set(k, new Set([e.w]));
  }
  for (const [form, lemma] of Object.entries(shard.f ?? {})) {
    const s = pointers.get(form); if (s) s.add(lemma); else pointers.set(form, new Set([lemma]));
  }
}

const OPEN = new Set(['noun', 'verb', 'adjective', 'adverb', 'phrase', 'prep_phrase', 'preposition', 'conjunction', 'interjection', 'number']);
const NOT_A_CARD = /\b(abbreviation|initialism|acronym|surname|given name|placename|place name|misspelling|alternative (form|spelling)|obsolete|archaic|dated|nonstandard|dialectal|colloquial spelling|eye dialect|pre-1996|pre-reform|superseded|clipping of)\b/i;

/** Lemmas a surface token may belong to, as the dictionary states them. */
function lemmasOf(token: string): string[] {
  const out = new Set<string>();
  if (lemmas.has(token)) out.add(token);
  const cap = token[0].toUpperCase() + token.slice(1);
  if (lemmas.has(cap)) out.add(cap);
  for (const l of pointers.get(fold(token)) ?? []) out.add(l);
  return [...out];
}

function teachable(lemma: string): Entry | null {
  const es = lemmas.get(lemma);
  if (!es) return null;
  if (/[.\d*]/.test(lemma) || lemma.length < 3) return null;
  if (/^[A-ZÄÖÜ]{2,}$/.test(lemma)) return null;                    // AKW, EU
  if (isFunctionWord(lemma)) return null;
  for (const e of es) {
    if (!OPEN.has(e.p)) continue;
    if (e.g.every((g) => NOT_A_CARD.test(g))) continue;
    if (e.p === 'noun' && !/^[A-ZÄÖÜ]/.test(lemma)) continue;
    if (e.p !== 'noun' && e.p !== 'phrase' && /^[A-ZÄÖÜ]/.test(lemma) && !lemma.includes(' ')) continue;
    return e;
  }
  return null;
}

// ---- evidence ------------------------------------------------------------------
interface Cand { lemma: string; e: Entry; leipzig: number; subs: number; lists: Set<string>; forms: Set<string>; best: number }
const cands = new Map<string, Cand>();
// The dictionary's form pointers are keyed on *folded* spellings (umlauts
// stripped), which is what lets a search for "Hauser" reach *Häuser* — and what
// would credit *schön* to *schonen* and *sagen* to *sägen* here. A token the
// corpus already resolves is a form of a word Lexi teaches, so it is evidence for
// that word and for nothing else. (Caught on the first run: the top of the list
// was *schonen, sägen, Fuhre, Spat* — every one a fold of a common covered word.)
const tokenCovered = new Map<string, boolean>();
function isCoveredToken(token: string): boolean {
  let v = tokenCovered.get(token);
  if (v === undefined) {
    const seg = matcher.annotate(token).find((x) => x.isWord);
    // A compound the matcher only *decomposes* is not a word Lexi teaches.
    v = (!!seg?.word && !seg.viaCompound) || isFunctionWord(token);
    tokenCovered.set(token, v);
  }
  return v;
}

function credit(token: string, src: 'leipzig' | 'subs' | string, count: number, rank: number) {
  if (!/^\p{L}[\p{L}-]*$/u.test(token)) return;
  if (isCoveredToken(token)) return;
  for (const l of lemmasOf(token)) {
    const e = teachable(l);
    if (!e) continue;
    let c = cands.get(l);
    if (!c) { c = { lemma: l, e, leipzig: 0, subs: 0, lists: new Set(), forms: new Set(), best: Infinity }; cands.set(l, c); }
    if (src === 'leipzig') c.leipzig += count;
    else if (src === 'subs') c.subs += count;
    else c.lists.add(src);
    c.forms.add(token);
    if (src === 'leipzig') c.best = Math.min(c.best, rank);
  }
}

// Leipzig: rank<TAB>form<TAB>count. Only the top of the list carries real signal;
// the long tail is typos and names, and every token costs a dictionary lookup.
const LEIPZIG_TOP = 120_000;
{
  const lines = readFileSync(join(RAW, 'leipzig-words.txt'), 'utf8').split('\n');
  for (const line of lines) {
    const [r, form, n] = line.split('\t');
    const rank = Number(r);
    if (!form || !Number.isFinite(rank) || rank > LEIPZIG_TOP) continue;
    credit(form, 'leipzig', Number(n) || 0, rank);
  }
}
{
  const lines = readFileSync(join(RAW, 'opensubtitles-de.txt'), 'utf8').split('\n');
  lines.forEach((line, i) => {
    const [form, n] = line.split(' ');
    if (form) credit(form, 'subs', Number(n) || 0, i + 1);
  });
}
for (const { name, path } of lists) {
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const t = raw.trim().replace(/^(der|die|das)\s+/i, '');
    if (t) credit(t, name, 0, Infinity);
  }
}

// ---- rank, filter, write ----------------------------------------------------------
// Two corpora on different scales: normalise each to per-million before summing,
// so speech is not drowned by a news corpus a hundred times its size.
const totL = [...cands.values()].reduce((s, c) => s + c.leipzig, 0) || 1;
const totS = [...cands.values()].reduce((s, c) => s + c.subs, 0) || 1;
const scored = [...cands.values()]
  .filter((c) => !covered(c.lemma))
  .map((c) => ({ ...c, score: (c.leipzig / totL + c.subs / totS) * 1e6 }))
  .sort((a, b) => (b.lists.size - a.lists.size) || (b.score - a.score));

mkdirSync(OUT, { recursive: true });
// A suggested level from the Leipzig rank of the lemma's commonest form, on the
// pipeline's own bands. A suggestion: register decides as much as frequency does.
const band = (rank: number) => Number.isFinite(rank) ? FREQ_BANDS.find((b) => rank <= b.maxRank)!.level : '';
const rows = ['lemma\tpos\tarticle\tscore\trank\tlevel\tlists\tforms\tgloss'];
for (const c of scored) {
  rows.push([c.lemma, c.e.p, c.e.x ?? '', c.score.toFixed(2), Number.isFinite(c.best) ? c.best : '', band(c.best), [...c.lists].join(','), [...c.forms].slice(0, 4).join(' '), c.e.g[0]?.slice(0, 90) ?? ''].join('\t'));
}
writeFileSync(join(OUT, 'gap-candidates.tsv'), rows.join('\n') + '\n');
const byPos: Record<string, number> = {};
for (const c of scored) byPos[c.e.p] = (byPos[c.e.p] ?? 0) + 1;
console.log(`corpus ${corpus.length} · candidates not covered ${scored.length}`);
console.log('by pos', byPos);
for (const { name } of lists) console.log(`from ${name}: ${scored.filter((c) => c.lists.has(name)).length}`);
console.log(`→ ${join(OUT, 'gap-candidates.tsv')}`);
