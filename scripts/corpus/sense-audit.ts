// Triage for the `alle` class: cards whose gloss and whose examples describe
// different words.
//
// This is a RANKING, not a detector. A card can score zero overlap and be
// perfectly fine, because a good translation paraphrases — `auflösen` "to
// dissolve" glossed against «Before moving to Canada she had to give up her flat»
// shares no word at all. So the score only decides *what to read first*, and every
// number reported downstream is hand-verified. The previous attempt at this
// reported 665 and was wrong about all twelve hits I checked; the bug was a
// stemmer whose regex was mangled by shell escaping and silently stripped nothing.
// Hence the self-test below, which runs before any card is scored.
import './shim.ts';
import { PATHS } from './config.ts';
import { loadCorpus } from './lib.ts';

const STOP = new Set(('a an the to of and or in on at for with by is are was were be been being it its that this those these '
  + 'you your i my we our they their he she his her him them as from not no so very too more most some any all one two do does '
  + 'did done have has had can could will would shall should may might must about into over under out up down off then than '
  + 'there here what which who whom whose when where why how something someone somebody oneself yourself itself each other')
  .split(' '));

/** Reduce an English word to a crude stem. Suffix-stripping only — enough to make
 *  *doing* meet *do* and *shoes* meet *shoe*, which is all the ranking needs. */
export function stem(w: string): string {
  let s = w.toLowerCase();
  if (s.length <= 3) return s;
  if (s.endsWith('ies') && s.length > 4) return s.slice(0, -3) + 'y';
  if (s.endsWith('ing') && s.length > 4) { const t = s.slice(0, -3); return t.length > 2 && t[t.length - 1] === t[t.length - 2] ? t.slice(0, -1) : t; }
  if (s.endsWith('ed') && s.length > 4) { const t = s.slice(0, -2); return t.length > 2 && t[t.length - 1] === t[t.length - 2] ? t.slice(0, -1) : t; }
  // Plural/3sg -s. Only strip the whole `-es` after a sibilant, where the `e` is
  // epenthetic (boxes → box); elsewhere just the `s`, so *shoes* → *shoe* rather
  // than *sho*. The trailing-`e` rule below then folds *shoe* and *shoes* onto the
  // same stem anyway, which is all the ranking needs — a stem need not be a word.
  if (/(?:ss|x|z|ch|sh)es$/.test(s)) s = s.slice(0, -2);
  else if (s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  if (s.endsWith('ly') && s.length > 4) s = s.slice(0, -2);
  if (s.endsWith('e') && s.length > 2) s = s.slice(0, -1);
  return s;
}

const words = (s: string) => (s || '').toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/)
  .filter((w) => w.length > 2 && !STOP.has(w));

// ---- self-test: the ranking is worthless if this is wrong ------------------
const CASES: [string, string][] = [
  ['doing', 'do'], ['does', 'do'], ['shoes', 'shoe'], ['flying', 'fly'], ['tried', 'tri'],
  ['sitting', 'sit'], ['carries', 'carry'], ['quickly', 'quick'], ['dissolve', 'dissolv'],
];
const bad = CASES.filter(([a, b]) => stem(a) !== stem(b) && stem(a) !== b);
if (bad.length) {
  console.error('✗ stemmer self-test failed — refusing to rank anything:');
  for (const [a, b] of bad) console.error(`    ${a} → ${stem(a)}, expected to meet ${b} → ${stem(b)}`);
  process.exit(1);
}
console.log(`stemmer self-test: ${CASES.length} pairs meet ✓\n`);

const corpus = loadCorpus(PATHS.vocab).filter((w) => w.kind === 'word');
type Row = { id: string; term: string; level: string; pos: string; en: string; overlap: number; ex: string[] };
const rows: Row[] = [];
for (const w of corpus) {
  const ex = (w.ex ?? []).filter((e) => e?.en?.trim());
  if (!ex.length) continue;
  const g = new Set(words(w.en ?? '').map(stem));
  if (!g.size) continue;
  const pool = new Set(ex.flatMap((e) => words(e.en)).map(stem));
  let hit = 0;
  for (const t of g) if (pool.has(t)) hit++;
  rows.push({
    id: w.id, term: w.term, level: w.level, pos: w.pos ?? '?', en: w.en ?? '',
    overlap: hit / g.size,
    ex: ex.map((e) => `«${e.de}» — ${e.en}`),
  });
}
// Within a score band, shuffle rather than sort by term — otherwise "the lowest 40"
// is just forty words beginning with A, which reads like a spread and is not one.
let seed = 20260824;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
rows.sort((a, b) => a.overlap - b.overlap);

const zero = rows.filter((r) => r.overlap === 0);
console.log(`cards scored              : ${rows.length}`);
console.log(`zero gloss/translation overlap: ${zero.length} (${(zero.length / rows.length * 100).toFixed(1)}%)`);
console.log('  ↑ NOT a defect count — a reading order. Most will be fine.\n');

const n = Number(process.argv.find((a) => a.startsWith('--top='))?.split('=')[1] ?? 40);
const seedArg = process.argv.find((a) => a.startsWith('--sample='));
if (seedArg) {
  // A separate, unbiased draw for estimating prevalence — the ranking above
  // cannot do that, because it is deliberately biased toward the odd ones.
  const k = Number(seedArg.split('=')[1]);
  let s = 12345;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pool = [...rows];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  console.log(`--- RANDOM SAMPLE of ${k}, for a prevalence estimate ---`);
  pool.slice(0, k).forEach((r, i) => {
    console.log(`\n${i + 1}. [${r.level} ${r.pos}] ${r.term} — "${r.en}"   overlap ${r.overlap.toFixed(2)}`);
    r.ex.slice(0, 2).forEach((e) => console.log(`     ${e}`));
  });
} else {
  console.log(`--- LOWEST-OVERLAP ${n}, to read first ---`);
  zero.slice(0, n).forEach((r, i) => {
    console.log(`\n${i + 1}. [${r.level} ${r.pos}] ${r.term} — "${r.en}"`);
    r.ex.slice(0, 2).forEach((e) => console.log(`     ${e}`));
  });
}
