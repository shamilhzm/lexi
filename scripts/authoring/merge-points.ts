// Retire a grammar point that another level already teaches.
//
// BACKLOG's 🔴 *B2 is mostly revision of B1* said 11 of 16 B2 points "re-tread" a
// lower level. Measured 2026-08-25, the indefensible core of that is smaller and
// much sharper: **five topics are carded under an identical title at two or three
// levels, teaching the same rule.** `n-Deklination` exists at A2, B1 *and* B2, and
// all three say weak masculine nouns take -(e)n everywhere but the nominative,
// with the same example nouns. Three points, three FSRS schedules, one rule.
//
// ## Why this is safe, which is not obvious
//
// Exercise ids are `gex:<level>:<title>:<xi>` — keyed on the **title**, since the
// 2026-08-06 migration away from positional ids. So retiring the *higher* point
// touches none of the keeper's ids: the keeper's level and title do not change,
// and absorbed exercises are **appended**, taking fresh indices at the end. Only
// the retired point's own ids need carrying, and they go into `ID_MAP` like any
// other retirement.
//
// Two id families move, not one. A point is both a row in `grammar.json` (whose
// exercises mint `gex:` ids) and a card in `vocab.json` with `kind: 'grammar'`
// and id `gram:<level>:<title>`. Miss the second and the Library keeps a concept
// card for a point that no longer exists.
//
//   node scripts/authoring/merge-points.ts <batch.json> [--write]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from '../corpus/config.ts';
import { loadCorpus, loadSectors, readJSON, writeJSON, fileExists } from '../corpus/lib.ts';
import { carryIdMap, danglingTargets, writeIdMap } from '../corpus/merge-lib.ts';
import { rebuildSectors } from '../corpus/sectors.ts';
import type { GExercise, GPoint, GrammarByLevel } from '../../src/lib/grammar.ts';
import type { CEFR, Word } from '../../src/types.ts';

interface Ruling {
  /** The point that goes. */
  from: { level: CEFR; title: string };
  /** The point that stays. */
  into: { level: CEFR; title: string };
  /** Replace the keeper's rule/summary, where the retired one said it better or
   *  covered something the keeper did not. Written out rather than concatenated:
   *  two rules glued together is not a rule. */
  rule?: string;
  summary?: string;
  why: string;
}

const [batchPath, ...rest] = process.argv.slice(2);
const WRITE = rest.includes('--write');
if (!batchPath) {
  console.error('usage: node scripts/authoring/merge-points.ts <batch.json> [--write]');
  process.exit(1);
}

const rulings = JSON.parse(readFileSync(batchPath, 'utf8')) as Ruling[];
const grammar = readJSON<GrammarByLevel>(PATHS.grammar);
const vocab = loadCorpus(PATHS.vocab);
const { ID_MAP } = await import(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'));
const idMap = ID_MAP as Record<string, string>;

const gexId = (level: string, title: string, xi: number) => `gex:${level}:${title}:${xi}`;
const gramId = (level: string, title: string) => `gram:${level}:${title}`;
const key = (e: GExercise) => (e.prompt ?? '').replace(/\s+/g, ' ').trim();

const moves = new Map<string, string>();
const retiredCards = new Set<string>();
const refused: string[] = [];
const report: string[] = [];

for (const r of rulings) {
  const fromList = grammar[r.from.level] ?? [];
  const intoList = grammar[r.into.level] ?? [];
  const fi = fromList.findIndex((p) => p.title === r.from.title);
  const ii = intoList.findIndex((p) => p.title === r.into.title);
  if (fi < 0) { refused.push(`${r.from.level} · ${r.from.title}: no such point (already merged?)`); continue; }
  if (ii < 0) { refused.push(`${r.into.level} · ${r.into.title}: no such keeper`); continue; }
  if (!r.why?.trim()) { refused.push(`${r.from.title}: no reason given`); continue; }
  const from = fromList[fi] as GPoint;
  const into = intoList[ii] as GPoint;

  // Absorb the exercises the keeper does not already have, by prompt.
  const have = new Set((into.exercises ?? []).map(key));
  let gained = 0;
  (from.exercises ?? []).forEach((e, xi) => {
    const oldId = gexId(r.from.level, from.title, xi);
    if (have.has(key(e))) return;                 // a duplicate prompt: the schedule is dropped
    have.add(key(e));
    into.exercises.push(e);
    moves.set(oldId, gexId(r.into.level, into.title, into.exercises.length - 1));
    gained++;
  });
  if (r.rule) into.rule = r.rule;
  if (r.summary) into.summary = r.summary;

  fromList.splice(fi, 1);
  // The concept card, which is the second id family.
  const oldCard = gramId(r.from.level, from.title);
  const newCard = gramId(r.into.level, into.title);
  if (vocab.some((w) => w.id === oldCard)) {
    retiredCards.add(oldCard);
    if (vocab.some((w) => w.id === newCard)) moves.set(oldCard, newCard);
  }
  report.push(`  ${r.from.level} · ${from.title}  →  ${r.into.level} · ${into.title}`
    + `\n      ${from.exercises?.length ?? 0} exercises, ${gained} new to the keeper (${into.exercises.length} total)`
    + `\n      ${r.why.replace(/\s+/g, ' ')}`);
}

const live = vocab.filter((w) => !retiredCards.has(w.id));
const liveIds = new Set(live.map((w) => w.id));
for (const [lv, pts] of Object.entries(grammar)) {
  for (const p of pts) for (let xi = 0; xi < (p.exercises?.length ?? 0); xi++) liveIds.add(gexId(lv, p.title, xi));
}
const { map, repointed } = carryIdMap(idMap, moves);
const dangling = danglingTargets(map, liveIds);
if (dangling.length) {
  console.error(`\n✗ id map would point at things that do not exist: ${dangling.slice(0, 5).map(([f, t]) => `${f}→${t}`).join(', ')}`);
  process.exit(1);
}

console.log(`\n${batchPath}`);
console.log(`  ${report.length} point(s) retired · ${moves.size} id change(s) · ${retiredCards.size} concept card(s) · ${refused.length} refused`);
for (const r of report) console.log(r);
for (const r of refused) console.log(`    ✗ ${r}`);
if (!report.length) { console.log('\nNothing to write.\n'); process.exit(refused.length ? 1 : 0); }
if (!WRITE) { console.log('\nDry run — re-run with --write to apply.\n'); process.exit(0); }

writeJSON(PATHS.grammar, grammar);
writeJSON(PATHS.vocab, live as Word[]);
writeJSON(PATHS.sectors, rebuildSectors(live as Word[], loadSectors(PATHS.sectors)));
if (fileExists(PATHS.provenance)) {
  const prov = readJSON<{ id: string }[]>(PATHS.provenance).filter((row) => !retiredCards.has(row.id));
  writeJSON(PATHS.provenance, prov);
}
writeIdMap(map);
console.log(`\n✓ wrote public/data/{grammar,vocab,sectors,provenance}.json and src/data/idmap.ts`);
console.log(`  id map ${Object.keys(idMap).length} → ${Object.keys(map).length} (${moves.size} new, ${repointed} re-pointed)`);
console.log('  Next: update GRAMMAR_COUNTS, then npm run corpus:split && npm run corpus:freq && npm run corpus:validate && npm test\n');
