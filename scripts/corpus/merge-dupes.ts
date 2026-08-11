// Merge the cards that are the same word twice.
//
// BACKLOG Now #3: **874 terms sit on more than one card; 1,021 cards are
// redundant — 14% of the corpus.** Each copy carries its own FSRS schedule, so a
// learner meets and re-learns `die Mutter` at A1 in *Family* and again at B1 in
// *Family relationships*. It is also what made the 2026-08-11 A1 probe lie: a
// lookup keyed on the term returned whichever copy came last.
//
// ## Only the byte-identical class is merged here
//
// The backlog's instruction is "triage by group, never in bulk", and it is right.
// Grouped by term (with gender and part of speech agreeing), the 874 split into:
//
//   516  identical gloss     — `die Mutter` A1 "mother" / B1 "mother". Merged.
//   285  overlapping gloss   — "profession, job" / "profession". Reviewed, not merged.
//    62  disjoint gloss      — mostly en-GB vs en-US ("theatre"/"theater"), but
//                              `der Zug` really is *train* and *move (in a game)*,
//                              `der Kurs` *course* and *share price*, `der Satz`
//                              *sentence* and *set of reps*. Reviewed, not merged.
//    11  gender or pos differ — `regelmäßig` adjective/adverb. Reviewed, not merged.
//
// Only the first is unambiguous, and only it is applied. The other 358 are written
// to `dupe-review.tsv` with every copy's level, sector and gloss on one line, which
// is the form a human ruling actually needs. Merging them on a gloss heuristic
// would destroy real homographs, and a heuristic that is right 95% of the time
// still means ~18 words silently lose a sense.
//
// ## Merging is a schedule migration
//
// Same three foreign keys as `relevel-a1.ts`: vocab.json, provenance.json and
// `src/data/idmap.ts`, with cards.json/detail.json following via `corpus:split`.
// The keeper also *absorbs* what the retired copies had and it lacked — a
// definition, an IPA, a plural, extra examples — so a merge never loses content.
//
// Run: npm run corpus:dupes              (report + both TSVs + the id map)
//      npm run corpus:dupes -- --write   (apply)
import { readFileSync, writeFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { loadCorpus, writeJSON } from './lib.ts';
import type { Word, CEFR, Example, SectorMeta } from '../../src/types.ts';

const WRITE = process.argv.includes('--write');
const MERGED = 'scripts/corpus/dupe-rulings.tsv';
const REVIEW = 'scripts/corpus/dupe-review.tsv';
const MAX_EXAMPLES = 6;

const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const rank = (l: CEFR) => LEVELS.indexOf(l);
const gloss = (s: string) => (s || '').trim().toLowerCase();

const corpus = loadCorpus(PATHS.vocab);
const groups = new Map<string, Word[]>();
for (const w of corpus) {
  if (w.kind !== 'word') continue;
  const k = w.term.toLowerCase();
  (groups.get(k) ?? groups.set(k, []).get(k)!).push(w);
}

interface Merge { keep: Word; drop: Word[] }
const merges: Merge[] = [];
const review: { term: string; why: string; cards: Word[] }[] = [];

for (const [, ws] of groups) {
  if (ws.length < 2) continue;
  if (new Set(ws.map((w) => w.gender)).size > 1) { review.push({ term: ws[0].term, why: 'gender differs', cards: ws }); continue; }
  if (new Set(ws.map((w) => w.pos)).size > 1) { review.push({ term: ws[0].term, why: 'part of speech differs', cards: ws }); continue; }
  if (new Set(ws.map((w) => gloss(w.en))).size > 1) {
    review.push({ term: ws[0].term, why: 'glosses differ — may be a homograph', cards: ws });
    continue;
  }
  const sorted = [...ws].sort((a, b) => rank(a.level) - rank(b.level));
  merges.push({ keep: sorted[0], drop: sorted.slice(1) });
}

/**
 * Sectors that mean "we had nowhere better to put this". The keeper is chosen by
 * *level*, which is right — the lowest copy is the one an early learner can reach
 * — but its sector comes along for the ride, and that is sometimes a downgrade:
 * `putzen` keeps A1/**Miscellaneous** over A2/**Home**, `das Publikum`
 * A1/Miscellaneous over B1/Free time. Where the keeper landed in a catch-all and
 * a retired copy had a real sector, take the real one.
 *
 * Deliberately not more clever than that. `die Handschuhe` is A2/*Skiing and
 * snowboarding* and B1/*Clothing*, and both are "real" sectors — deciding that
 * one is better is a judgement call, so every disagreement is flagged in the
 * rulings file for `corpus:resector` instead of being guessed at here.
 */
const CATCH_ALL = new Set(['Miscellaneous', 'Core Vocabulary', 'Everyday life basics', 'General']);

// ---- absorb ----------------------------------------------------------------
/** Fill anything the keeper lacks from the copies being retired, so a merge is
 *  never a content loss. Examples are unioned and capped; the keeper's own come
 *  first because they were authored against its level. */
function absorb(keep: Word, drop: Word[]): string[] {
  const gained: string[] = [];
  for (const d of drop) {
    for (const f of ['def', 'defDe', 'ipa', 'plural'] as const) {
      if (!keep[f] && d[f]) { (keep as Record<string, unknown>)[f] = d[f]; gained.push(f); }
    }
    for (const f of ['syn', 'ant'] as const) {
      const before = keep[f].length;
      keep[f] = [...new Set([...keep[f], ...(d[f] ?? [])])];
      if (keep[f].length > before) gained.push(f);
    }
    const seen = new Set(keep.ex.map((e) => e.de));
    const extra = (d.ex ?? []).filter((e: Example) => !seen.has(e.de));
    if (extra.length && keep.ex.length < MAX_EXAMPLES) {
      keep.ex = [...keep.ex, ...extra].slice(0, MAX_EXAMPLES);
      gained.push('ex');
    }
  }
  return [...new Set(gained)];
}

// ---- report ----------------------------------------------------------------
const dropCount = merges.reduce((n, m) => n + m.drop.length, 0);
console.log(`duplicate terms      ${[...groups.values()].filter((g) => g.length > 1).length}`);
console.log(`  merged (identical) ${merges.length} groups, retiring ${dropCount} cards`);
console.log(`  left for review    ${review.length} groups`);
const byWhy = new Map<string, number>();
for (const r of review) byWhy.set(r.why, (byWhy.get(r.why) ?? 0) + 1);
for (const [why, n] of byWhy) console.log(`      ${String(n).padStart(3)}  ${why}`);

const cell = (w: Word) => `${w.level}/${w.field}: ${w.en}`;
writeFileSync(REVIEW, [
  '# Duplicate groups this pass deliberately did NOT merge — each needs a human ruling.',
  '# Merging on a gloss heuristic would destroy real homographs: der Zug is train AND',
  '# move-in-a-game, der Kurs is course AND share price, der Satz is sentence AND set.',
  '# term\twhy\tcopies',
  ...review
    .sort((a, b) => a.why.localeCompare(b.why) || a.term.localeCompare(b.term))
    .map((r) => `${r.term}\t${r.why}\t${r.cards.map(cell).join(' || ')}`),
].join('\n') + '\n');
console.log(`\nreview → ${REVIEW}`);

if (!WRITE) {
  console.log(`\n(dry run — pass --write to apply)`);
  process.exit(0);
}

// ---- apply -----------------------------------------------------------------
const retire = new Map<string, string>();   // dropped id -> keeper id
const rulings: string[] = [];
let resectored = 0;
let flagged = 0;
for (const m of merges) {
  const gained = absorb(m.keep, m.drop);
  // Rescue the keeper from a catch-all sector; flag any other disagreement.
  const fields = new Set([m.keep.field, ...m.drop.map((d) => d.field)]);
  let note = '';
  if (fields.size > 1) {
    if (CATCH_ALL.has(m.keep.field)) {
      const better = m.drop.find((d) => !CATCH_ALL.has(d.field));
      if (better) { note = `re-sectored from ${m.keep.field}`; m.keep.field = better.field; resectored++; }
    }
    if (!note) { note = 'sector differs — resector?'; flagged++; }
  }
  for (const d of m.drop) retire.set(d.id, m.keep.id);
  rulings.push(`${m.keep.term}\t${m.keep.level}/${m.keep.field}\t${m.drop.map((d) => `${d.level}/${d.field}`).join(', ')}\t${gained.join('+') || '—'}\t${note}`);
}
console.log(`  re-sectored out of a catch-all: ${resectored}`);
console.log(`  sector disagreements flagged:   ${flagged}`);

const kept = corpus.filter((w) => !retire.has(w.id));
writeJSON(PATHS.vocab, kept);
console.log(`\n✓ ${corpus.length} → ${kept.length} cards`);

// provenance: re-point rather than drop, so the keeper inherits its sourcing.
const prov = JSON.parse(readFileSync(PATHS.provenance, 'utf8')) as { id: string }[];
const liveIds = new Set(kept.map((w) => w.id));
let pn = 0;
const provOut = prov.filter((r) => {
  const to = retire.get(r.id);
  if (to) { r.id = to; pn++; }
  return liveIds.has(r.id);
});
// A keeper can now hold two provenance rows (its own and an absorbed one); keep
// the first, which is the keeper's own.
const seenProv = new Set<string>();
writeJSON(PATHS.provenance, provOut.filter((r) => !seenProv.has(r.id) && seenProv.add(r.id)));
console.log(`✓ re-pointed ${pn} provenance ids`);

// sectors.json carries a count and a level list per sector; both move.
const sectors = JSON.parse(readFileSync(PATHS.sectors, 'utf8')) as SectorMeta[];
const bySector = new Map<string, Word[]>();
for (const w of kept) (bySector.get(w.field) ?? bySector.set(w.field, []).get(w.field)!).push(w);
const emptied: string[] = [];
for (const s of sectors) {
  const ws = bySector.get(s.name) ?? [];
  if (!ws.length) emptied.push(s.name);
  s.count = ws.length;
  s.levels = LEVELS.filter((l) => ws.some((w) => w.level === l));
}
writeJSON(PATHS.sectors, sectors.filter((s) => s.count > 0));
console.log(`✓ refreshed sectors.json${emptied.length ? ` (${emptied.length} emptied: ${emptied.join(', ')})` : ''}`);

writeFileSync(MERGED, [
  '# Generated by scripts/corpus/merge-dupes.ts — every group merged, and what the keeper gained.',
  '# Only groups whose copies agreed on gender, part of speech and gloss are here.',
  '# kept\tkept level/sector\tretired\tabsorbed\tnote',
  ...rulings.sort(),
].join('\n') + '\n');
console.log(`✓ rulings → ${MERGED}`);

console.log(`\n--- ID_MAP entries for src/data/idmap.ts (${retire.size}) ---`);
for (const [from, to] of retire) console.log(`  "${from}": "${to}",`);

const idmapSrc = readFileSync('src/data/idmap.ts', 'utf8');
const stale = [...idmapSrc.matchAll(/"([^"]+)":\s*"([^"]+)"/g)]
  .filter((m) => retire.has(m[2]))
  .map((m) => `  "${m[1]}": "${retire.get(m[2])!}",   (was ${m[2]})`);
if (stale.length) {
  console.log(`\n--- ${stale.length} existing ID_MAP entries must be re-pointed ---`);
  for (const s of stale) console.log(s);
}
console.log('\n  Next: paste the entries above into src/data/idmap.ts, then');
console.log('        npm run corpus:split && npm run corpus:validate && npm test');
