// Validation / CI harness (Goal 6). Runs schema + duplicate checks, reports the
// level/sector distribution and IPA/example presence rates, re-runs the reader's
// matching probe (conjugation, plural, adjective de-inflection) against the
// corpus, measures vocab.json size + gzip, and prints a random card sample for a
// human spot-check. Exits non-zero on hard errors (or on warnings with --strict).
//
//   npm run corpus:validate                 # report + gate on structural errors
//   npm run corpus:validate -- --strict     # also gate on warnings (use for new batches)
//   npm run corpus:validate -- --sample=15 --seed=7
import './shim.ts';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { ALLOWED_POS } from './config.ts';
import { loadCorpus, loadSectors, primeApp, stripArticle, lemmaKey, LEVELS, type Word } from './lib.ts';
import { conjugate, canConjugate } from '../../src/lib/conjugate.ts';

const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
function sample<T>(a: T[], n: number, rng: () => number): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b.slice(0, n);
}

const isStr = (v: unknown) => typeof v === 'string';
const isArr = (v: unknown) => Array.isArray(v);

interface Issue { id: string; msg: string; }

function schemaCheck(cards: Word[]): { errors: Issue[]; warnings: Issue[] } {
  const errors: Issue[] = [], warnings: Issue[] = [];
  for (const w of cards) {
    const id = (w as any)?.id ?? '(no id)';
    if (!isStr(w.id) || !w.id) errors.push({ id, msg: 'missing id' });
    if (!isStr(w.term) || !w.term) errors.push({ id, msg: 'missing term' });
    if (!LEVELS.includes(w.level)) errors.push({ id, msg: `bad level ${w.level}` });
    if (w.kind !== 'word' && w.kind !== 'grammar') errors.push({ id, msg: `bad kind ${w.kind}` });
    if (!isStr(w.field) || !w.field) errors.push({ id, msg: 'missing field' });
    if (!isArr(w.syn) || !isArr(w.ant) || !isArr(w.ex)) errors.push({ id, msg: 'syn/ant/ex not arrays' });
    for (const e of w.ex ?? []) if (!isStr(e?.de) || !isStr(e?.en)) errors.push({ id, msg: 'malformed example' });
    if (w.gender != null && !['der', 'die', 'das'].includes(w.gender)) errors.push({ id, msg: `bad gender ${w.gender}` });
    if (w.kind === 'word' && w.pos === 'noun' && !w.gender) warnings.push({ id, msg: 'noun without gender' });
    if (w.kind === 'word' && w.pos === 'noun' && !w.plural) warnings.push({ id, msg: 'noun without plural' });
    if (w.kind === 'word' && !w.ipa) warnings.push({ id, msg: 'no ipa' });
    if (w.kind === 'word' && (!w.ex || !w.ex.length)) warnings.push({ id, msg: 'no example' });
    if (w.kind === 'word' && w.pos && !ALLOWED_POS.has(w.pos)) warnings.push({ id, msg: `pos "${w.pos}" outside new-card set` });
  }
  return { errors, warnings };
}

function dupeCheck(cards: Word[]): { errors: Issue[]; warnings: Issue[] } {
  const errors: Issue[] = [], warnings: Issue[] = [];
  const byId = new Map<string, number>();
  const byLevelTerm = new Map<string, string>();
  const byLevelLemma = new Map<string, string>();
  for (const w of cards) {
    byId.set(w.id, (byId.get(w.id) ?? 0) + 1);
    if (w.kind !== 'word') continue;
    const kt = `${w.level} ${w.term.toLowerCase()}`;
    if (byLevelTerm.has(kt)) errors.push({ id: w.id, msg: `duplicate (level, term) with ${byLevelTerm.get(kt)}` });
    else byLevelTerm.set(kt, w.id);
    const kl = `${w.level} ${lemmaKey(w.term)}`;
    if (byLevelLemma.has(kl)) warnings.push({ id: w.id, msg: `near-duplicate lemma with ${byLevelLemma.get(kl)}` });
    else byLevelLemma.set(kl, w.id);
  }
  for (const [id, n] of byId) if (n > 1) errors.push({ id, msg: `duplicate id ×${n}` });
  return { errors, warnings };
}

async function probe(full: Word[]) {
  const matcher = await primeApp(full);
  const rng = mulberry32(99);
  const words = full.filter((w) => w.kind === 'word');

  const run = (cards: Word[], form: (w: Word) => string | null) => {
    let n = 0, hit = 0;
    for (const w of cards) {
      const f = form(w);
      if (!f) continue;
      n++;
      const seg = matcher.annotate(f)[0];
      if (seg?.word?.id === w.id) hit++;
    }
    return { n, hit, rate: n ? +(hit / n).toFixed(3) : 1 };
  };

  const verbs = sample(words.filter((w) => w.pos === 'verb'), 200, rng);
  const verbRes = run(verbs, (w) => {
    const inf = stripArticle(w.term);
    if (!canConjugate(inf)) return null;
    // Participle (ge-…): distinctive, so fewer false collisions than the -t er-form
    // (which clashes with nouns like macht/die Macht). Misses are mostly strong-verb
    // participles that are also adjectives (gelassen = "calm") — expected, not a bug.
    try { return conjugate(inf).partizip; } catch { return null; }
  });
  // Only probe real plural forms ("die Spiele"), not the placeholder notes some
  // existing cards carry ("nur Singular"/"nur Plural").
  const nouns = sample(words.filter((w) => w.pos === 'noun' && w.plural && /^die\s/i.test(w.plural)), 200, rng);
  const nounRes = run(nouns, (w) => stripArticle(w.plural!));
  const adjs = sample(words.filter((w) => w.pos === 'adjective'), 200, rng);
  const adjRes = run(adjs, (w) => stripArticle(w.term).toLowerCase() + 'e');

  // Closed-class inflections should resolve to their lemma card (EXTRA_CLOSED_FORMS).
  const closedCases: [string, string][] = [['diese', 'Dieser'], ['diesem', 'Dieser'], ['worden', 'werden'], ['meiner', 'Mein']];
  const byTerm = new Map(words.map((w) => [w.term, w]));
  let cN = 0, cHit = 0;
  for (const [form, lemmaTerm] of closedCases) {
    if (!byTerm.has(lemmaTerm)) continue; // only check paradigms whose lemma card exists
    cN++;
    if (matcher.annotate(form)[0]?.word?.term === lemmaTerm) cHit++;
  }
  const closedRes = { n: cN, hit: cHit, rate: cN ? +(cHit / cN).toFixed(3) : 1 };

  return { verbRes, nounRes, adjRes, closedRes };
}

async function main() {
  const full = loadCorpus(PATHS.vocab);
  const sectors = loadSectors(PATHS.sectors);
  const words = full.filter((w) => w.kind === 'word');

  const schema = schemaCheck(full);
  const dupe = dupeCheck(full);
  const allErrors = [...schema.errors, ...dupe.errors];
  const warnings = [...schema.warnings, ...dupe.warnings];

  // Distributions.
  const byLevel: Record<string, number> = {};
  for (const w of words) byLevel[w.level] = (byLevel[w.level] ?? 0) + 1;
  const byGroup: Record<string, number> = {};
  const groupOf = new Map(sectors.map((s) => [s.name, s.group]));
  for (const w of words) { const g = groupOf.get(w.field) ?? '(unknown)'; byGroup[g] = (byGroup[g] ?? 0) + 1; }

  // Presence rates.
  const nouns = words.filter((w) => w.pos === 'noun');
  const rate = (n: number, d: number) => (d ? (100 * n / d).toFixed(1) : '—') + '%';
  const ipaRate = rate(words.filter((w) => w.ipa).length, words.length);
  const exRate = rate(words.filter((w) => w.ex?.length).length, words.length);
  const plRate = rate(nouns.filter((w) => w.plural).length, nouns.length);

  // Reader-matching probe.
  const { verbRes, nounRes, adjRes, closedRes } = await probe(full);
  // Regression FLOORS, not quality targets. The reader resolves an inflected form
  // to whatever lemma owns it, so legitimate homographs (plural "Morgen" → adverb
  // "morgen") count as probe misses even though matching is correct. Baselines on
  // the seeded sample sit near verb 0.79 · plural 0.84 · adj 0.80; a real
  // regression (broken conjugation/plural indexing) would fall far below these.
  const T = { verb: 0.62, noun: 0.72, adj: 0.70 };
  const probeFail =
    (verbRes.n && verbRes.rate < T.verb) || (nounRes.n && nounRes.rate < T.noun) ||
    (adjRes.n && adjRes.rate < T.adj) || (closedRes.n > 0 && closedRes.hit < closedRes.n);

  // Size / perf.
  const raw = readFileSync(PATHS.vocab);
  const gz = gzipSync(raw);

  // Report.
  console.log(`\n=== Lexi corpus validation ===`);
  console.log(`Cards: ${full.length} (words ${words.length}, grammar ${full.length - words.length})`);
  console.log(`Level: ${LEVELS.map((l) => `${l} ${byLevel[l] ?? 0}`).join(' · ')}`);
  console.log(`Groups: ${Object.entries(byGroup).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(' · ')}`);
  console.log(`Presence — IPA ${ipaRate} · example ${exRate} · noun plural ${plRate}`);
  console.log(`Errors: ${allErrors.length} · Warnings: ${warnings.length}`);
  if (allErrors.length) for (const e of allErrors.slice(0, 20)) console.log(`  ERROR ${e.id}: ${e.msg}`);
  const warnCounts: Record<string, number> = {};
  for (const w of warnings) warnCounts[w.msg] = (warnCounts[w.msg] ?? 0) + 1;
  for (const [m, n] of Object.entries(warnCounts).sort((a, b) => b[1] - a[1])) console.log(`  warn ${m}: ${n}`);
  console.log(`Reader probe — verb ${verbRes.hit}/${verbRes.n} (${verbRes.rate}) · plural ${nounRes.hit}/${nounRes.n} (${nounRes.rate}) · adj ${adjRes.hit}/${adjRes.n} (${adjRes.rate}) · closed-class ${closedRes.hit}/${closedRes.n}`);
  console.log(`vocab.json ${(raw.length / 1e6).toFixed(2)} MB → gzip ${(gz.length / 1e6).toFixed(2)} MB`);

  // Random spot-check sample.
  const n = parseInt(argOpt('sample') ?? '10', 10);
  const seed = parseInt(argOpt('seed') ?? '42', 10);
  console.log(`\n--- random ${n}-card spot-check (seed ${seed}) — verify gender/plural/level ---`);
  for (const w of sample(words, n, mulberry32(seed))) {
    console.log(`  [${w.level}] ${w.term}${w.plural ? ` (pl. ${w.plural})` : ''} — ${w.en}${w.ipa ? ` /${w.ipa}/` : ''}  «${w.ex?.[0]?.de ?? '—'}»`);
  }

  const strict = process.argv.includes('--strict');
  const fail = allErrors.length > 0 || probeFail || (strict && warnings.length > 0);
  console.log(`\n${fail ? 'FAIL' : 'PASS'}${probeFail ? ' (reader probe below threshold)' : ''}`);
  process.exit(fail ? 1 : 0);
}

function argOpt(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.split('=')[1] : undefined;
}

main().catch((e) => { console.error(e); process.exit(1); });
