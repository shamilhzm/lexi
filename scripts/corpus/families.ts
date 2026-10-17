// npm run corpus:families — the word families Lexi teaches only part of.
//
// "Is every word in its family?" has no list to check against: the Wiktionary dump
// this repo ships from records no derivation links (no `derived` on *Verdacht*), and
// de.wiktionary's *Wortbildungen* sections are one network request per word. So the
// families are **generated** and then **attested**, which is the order this repo
// already trusts for compound IPA (`compose-ipa.ts`):
//
//   1. For every card, apply German's productive derivations — the ones a learner
//      who knows the base can actually decode:
//        verb  → -ung, -er (agent), -bar, un…bar, un…lich
//        noun  → -lich, -ig, -isch, -los, -voll, -haft (with and without umlaut,
//                and with a final -e/-en dropped: Schatten → schattig)
//        adj   → -heit, -keit, -igkeit, -e (Wärme), un-, -erweise
//        noun  → -schaft
//   2. Keep a candidate only if it is a **headword in the dictionary layer**
//      (`public/data/lex`, de.wiktionary via kaikki) with the part of speech the
//      derivation predicts. Generation proposes; the dictionary decides it exists.
//   3. Drop what the corpus already teaches, and rank the rest by how often German
//      uses it — summed over its forms, in the Leipzig news million and the
//      OpenSubtitles top 50k.
//
// Nothing here is a card. It writes a ranked TSV with the dictionary's article and
// gloss as a hint; the card is still authored and admitted by `authoring:new`.
//
//   node scripts/corpus/families.ts [--min=<count>]   → data/out/family-gaps.tsv
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { loadCorpus, lookupLemma } from './lib.ts';
import { government } from '../../src/lib/matcher.ts';
import type { Word } from '../../src/types.ts';

const MIN = Number(process.argv.find((a) => a.startsWith('--min='))?.slice(6) ?? 20);
const RAW = join('scripts', 'corpus', 'data', 'raw');
const OUT = join('scripts', 'corpus', 'data', 'out');

// ── the dictionary layer ─────────────────────────────────────────────────────
interface Lex { w: string; p: string; g?: string[]; x?: string; i?: string; f?: string[] }
const lex = new Map<string, Lex[]>();
const LEX_DIR = join('public', 'data', 'lex');
for (const f of readdirSync(LEX_DIR).filter((n) => /^\d+\.json$/.test(n))) {
  const { e } = JSON.parse(readFileSync(join(LEX_DIR, f), 'utf8')) as { e: Lex[] };
  for (const x of e) lex.set(x.w, [...(lex.get(x.w) ?? []), x]);
}

// ── frequency: Leipzig news (rank \t word \t count) + OpenSubtitles (word count) ──
const freq = new Map<string, number>();
const bump = (w: string, n: number) => freq.set(w, (freq.get(w) ?? 0) + n);
for (const line of readFileSync(join(RAW, 'leipzig-words.txt'), 'utf8').split('\n')) {
  const [, w, c] = line.split('\t'); if (w && c) bump(w, Number(c));
}
for (const line of readFileSync(join(RAW, 'opensubtitles-de.txt'), 'utf8').split('\n')) {
  const [w, c] = line.split(' '); if (w && c) bump(w, Number(c));
}
/** Uses of a lemma: the headword and every form the dictionary lists — in the
 *  case its class is written in. A noun counts capitalised spellings only and an
 *  adjective lowercase ones, or *Lieber* the "noun" inherits every *lieber* the
 *  comparative ever had (174,022 uses on the first run). */
const uses = (e: Lex) => {
  const forms = new Set([e.w, ...(e.f ?? [])]);
  let n = 0;
  for (const f of forms) {
    const want = e.p === 'noun' ? f[0].toUpperCase() + f.slice(1) : f.toLowerCase();
    n += freq.get(want) ?? 0;
  }
  return n;
};
/** Every surface form of every adjective, and every name — the two things a
 *  derived noun must not merely be a spelling of. */
const adjForms = new Set<string>();
const names = new Set<string>();
for (const [w, es] of lex) for (const e of es) {
  if (e.p === 'adjective') for (const f of [e.w, ...(e.f ?? [])]) adjForms.add(f.toLowerCase());
  if (e.p === 'name') names.add(w);
}

// ── the corpus ───────────────────────────────────────────────────────────────
const corpus = loadCorpus(PATHS.vocab).filter((w) => w.kind === 'word');
const bare = (w: Word) => (government(w.term)?.lemma ?? lookupLemma(w.term)).replace(/^der\/die\s+/i, '');
const taught = new Set(corpus.map((w) => bare(w).toLowerCase()));

// ── derivation ───────────────────────────────────────────────────────────────
const UML: Record<string, string> = { a: 'ä', o: 'ö', u: 'ü', au: 'äu' };
/** The base with its last a/o/u/au umlauted — *Sucht → Sücht*, *Not → Nöt*. */
const umlaut = (s: string) => s.replace(/(au|a|o|u)([^aeiouäöü]*)$/i, (_, v: string, tail: string) =>
  (v[0] === v[0].toUpperCase() ? UML[v.toLowerCase()][0].toUpperCase() + UML[v.toLowerCase()].slice(1) : UML[v.toLowerCase()]) + tail);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const low = (s: string) => s[0].toLowerCase() + s.slice(1);

type Want = { word: string; pos: 'noun' | 'adjective' | 'adverb'; how: string };
function derive(w: Word): Want[] {
  const L = bare(w);
  const out: Want[] = [];
  if (w.pos === 'verb' && /[^ ]en$|[^ ]n$/.test(L) && !L.includes(' ')) {
    const stem = L.endsWith('eln') || L.endsWith('ern') ? L.slice(0, -1) : L.replace(/e?n$/, '');
    out.push({ word: cap(stem) + 'ung', pos: 'noun', how: '-ung' });
    out.push({ word: cap(stem) + 'er', pos: 'noun', how: '-er (agent)' });
    for (const suf of ['bar', 'lich']) {
      out.push({ word: stem + suf, pos: 'adjective', how: `-${suf}` });
      out.push({ word: 'un' + stem + suf, pos: 'adjective', how: `un…${suf}` });
    }
  }
  if (w.pos === 'noun' && !L.includes(' ')) {
    const bases = new Set([L, L.replace(/e$/, ''), L.replace(/en$/, ''), L.replace(/er$/, '')].filter((b) => b.length > 2));
    for (const b of [...bases]) bases.add(umlaut(b));
    for (const b of bases) for (const suf of ['lich', 'ig', 'isch', 'los', 'voll', 'haft']) {
      out.push({ word: low(b) + suf, pos: 'adjective', how: `-${suf}` });
    }
    out.push({ word: cap(L.replace(/e$/, '')) + 'schaft', pos: 'noun', how: '-schaft' });
  }
  if (w.pos === 'adjective' && !L.includes(' ')) {
    for (const suf of ['heit', 'keit', 'igkeit']) out.push({ word: cap(L) + suf, pos: 'noun', how: `-${suf}` });
    if (!L.startsWith('un')) out.push({ word: 'un' + L, pos: 'adjective', how: 'un-' });
    // *warm → die Wärme*, *lang → die Länge*: the quality noun in -e, umlauted.
    for (const b of new Set([L, umlaut(L)])) out.push({ word: cap(b) + 'e', pos: 'noun', how: '-e (quality)' });
    // *glücklich → glücklicherweise*: the sentence adverb.
    out.push({ word: L + 'erweise', pos: 'adverb', how: '-erweise' });
  }
  return out;
}

// ── run ──────────────────────────────────────────────────────────────────────
const found = new Map<string, { e: Lex; how: string; from: Set<string>; n: number }>();
for (const w of corpus) {
  for (const d of derive(w)) {
    if (taught.has(d.word.toLowerCase())) continue;
    const e = (lex.get(d.word) ?? []).find((x) => x.p === d.pos);
    if (!e) continue;
    // An "agent noun" that is really a declined adjective (*Reicher*, *Irrer*,
    // *Verdächtiger*: the dictionary says "male or of unspecified gender") or a
    // spelling of one (*Lieber*), or a surname (*Weber*), is not a family member.
    if (d.how.startsWith('-er') && (adjForms.has(d.word.toLowerCase()) || names.has(d.word)
      || /male or of unspecified gender/.test((e.g ?? []).join(' ')))) continue;
    const n = uses(e);
    if (n < MIN) continue;
    const prev = found.get(d.word);
    if (prev) prev.from.add(w.term);
    else found.set(d.word, { e, how: d.how, from: new Set([w.term]), n });
  }
}
const rows = [...found.values()].sort((a, b) => b.n - a.n);
mkdirSync(OUT, { recursive: true });
const tsv = ['word\tpos\tarticle\tuses\tderivation\tfrom\tgloss',
  ...rows.map((r) => [r.e.w, r.e.p, r.e.x ?? '', r.n, r.how, [...r.from].join(' | '), (r.e.g ?? [])[0] ?? ''].join('\t'))].join('\n');
writeFileSync(join(OUT, 'family-gaps.tsv'), tsv + '\n');
const byHow = new Map<string, number>();
for (const r of rows) byHow.set(r.how, (byHow.get(r.how) ?? 0) + 1);
console.log(`cards ${corpus.length} · family members attested and not taught (≥${MIN} uses): ${rows.length}`);
console.log('by derivation:', [...byHow].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
for (const [lo, hi] of [[10000, Infinity], [1000, 10000], [200, 1000], [MIN, 200]] as const) {
  console.log(`  ${String(lo).padStart(5)}+ uses: ${rows.filter((r) => r.n >= lo && r.n < hi).length}`);
}
console.log(`→ ${join(OUT, 'family-gaps.tsv')}`);
