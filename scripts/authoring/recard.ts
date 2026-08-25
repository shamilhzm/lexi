// Change what a card *is* — its level, part of speech, headword, gender or sector.
//
// The fourth member of the authoring family, and the one the other three kept
// needing:
//
//   apply-authored.ts  fill-only; never overwrites a non-empty field
//   fix-authored.ts    expect-guarded repair of a field's *value*
//   new-cards.ts       new rows, gated by the verifier
//   recard.ts          the card's identity
//
// Six filed backlog items were blocked on this and on nothing else — `silber` and
// `gold` carded as adjectives where German's adjectives are *silbern* and
// *golden*; `normal` carded as an adverb, so it gets no adjective de-inflection
// and «ein normaler Tag» resolves to nothing; `quelloffene Software`, a phrase
// carded as a noun; and three cards at levels nobody could defend. Every one of
// them is a one-line change that nothing could make, because `corpus:relevel`
// moves *grammar points* and `fix-authored` refuses to touch `term`, `level` or
// `pos` by design.
//
// ## Why this is not a field edit
//
// A card id is `voc:<level>:<term>`, so changing either **is a schedule
// migration**: every learner's FSRS state is keyed on the id, and four files hold
// one — `vocab.json`, `provenance.json`, `freq.json` and `src/data/idmap.ts`
// (LESSONS says three; `freq.json` was found holding 47 dead ones). So this tool
// carries the id map, moves provenance with its level, refuses to strand a
// pointer, and tells you to re-run `corpus:freq` afterwards.
//
//   node scripts/authoring/recard.ts <batch.json> [--write]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, ALLOWED_POS } from '../corpus/config.ts';
import { loadCorpus, loadSectors, readJSON, writeJSON, fileExists, LEVELS } from '../corpus/lib.ts';
import { carryIdMap, danglingTargets, writeIdMap } from '../corpus/merge-lib.ts';
import { rebuildSectors } from '../corpus/sectors.ts';
import type { Word, CEFR } from '../../src/types.ts';

interface Recard {
  id: string;
  /** Optimistic concurrency, as everywhere else in authoring. */
  expect: { term: string; level: string; pos?: string };
  term?: string;
  level?: CEFR;
  pos?: string;
  gender?: 'der' | 'die' | 'das' | null;
  field?: string;
  /** Required. Re-carding without a stated reason is indistinguishable from a slip. */
  why: string;
}

const [batchPath, ...rest] = process.argv.slice(2);
const WRITE = rest.includes('--write');
if (!batchPath) {
  console.error('usage: node scripts/authoring/recard.ts <batch.json> [--write]');
  process.exit(1);
}

const rows = JSON.parse(readFileSync(batchPath, 'utf8')) as Recard[];
const vocab = loadCorpus(PATHS.vocab);
const byId = new Map(vocab.map((w) => [w.id, w]));
const liveIds = new Set(vocab.map((w) => w.id));
const { ID_MAP } = await import(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'));
const idMap = ID_MAP as Record<string, string>;

const norm = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
const moves = new Map<string, string>();
const refused: string[] = [];
const applied: string[] = [];

for (const r of rows) {
  const card = byId.get(r.id);
  if (!card) { refused.push(`${r.id}: no such card`); continue; }
  if (!r.why?.trim()) { refused.push(`${r.id}: no reason given`); continue; }
  if (norm(card.term) !== norm(r.expect.term) || card.level !== r.expect.level
      || (r.expect.pos != null && card.pos !== r.expect.pos)) {
    refused.push(`${r.id}: expect no longer matches the corpus (already changed, or a stale batch)`);
    continue;
  }
  if (r.pos && !ALLOWED_POS.has(r.pos)) { refused.push(`${r.id}: pos "${r.pos}" is not an allowed part of speech`); continue; }
  if (r.level && !LEVELS.includes(r.level)) { refused.push(`${r.id}: bad level ${r.level}`); continue; }

  const term = r.term ? norm(r.term) : card.term;
  const level = r.level ?? card.level;
  const nextId = `voc:${level}:${term}`;
  if (nextId !== card.id) {
    if (liveIds.has(nextId)) {
      refused.push(`${r.id}: would become ${nextId}, which already exists — that is a merge, not a re-card`);
      continue;
    }
    // A noun is written with its article, and the article is part of the term.
    // Changing a headword without noticing that is how `die Tausend` and `tausend`
    // end up claiming each other's surface form.
    moves.set(card.id, nextId);
    liveIds.delete(card.id);
    liveIds.add(nextId);
    card.id = nextId;
  }
  card.term = term;
  card.level = level;
  if (r.pos) card.pos = r.pos;
  if (r.gender !== undefined) card.gender = r.gender;
  if (r.field) card.field = r.field;
  // A non-noun cannot carry a gender or a plural, and leaving them behind is how a
  // re-posed card keeps failing the noun rules it is no longer subject to.
  if (card.pos !== 'noun') { card.gender = null; card.plural = null; }
  applied.push(`${r.id}${moves.has(r.id) ? `  →  ${card.id}` : ''}  ·  ${r.why.replace(/\s+/g, ' ')}`);
}

const { map, repointed } = carryIdMap(idMap, moves);
const dangling = danglingTargets(map, liveIds);
if (dangling.length) {
  console.error(`\n✗ id map would point at cards that do not exist: ${dangling.slice(0, 5).map(([f, t]) => `${f}→${t}`).join(', ')}`);
  process.exit(1);
}

// provenance.json holds the id *and* the level, so a relevel needs both moved or
// the sourcing row disagrees with the card it sources.
const prov = fileExists(PATHS.provenance) ? readJSON<{ id: string; level?: string }[]>(PATHS.provenance) : [];
const finalLevel = new Map(vocab.map((w) => [w.id, w.level]));
let provMoved = 0;
for (const row of prov) {
  const to = moves.get(row.id);
  if (to) { row.id = to; provMoved++; }
  if (row.level && finalLevel.has(row.id)) row.level = finalLevel.get(row.id)!;
}

console.log(`\n${batchPath}`);
console.log(`  ${applied.length} re-carded · ${moves.size} id change(s) · ${provMoved} provenance row(s) · ${refused.length} refused`);
for (const a of applied) console.log(`    ${a}`);
for (const r of refused) console.log(`    ✗ ${r}`);
if (!applied.length) { console.log('\nNothing to write.\n'); process.exit(refused.length ? 1 : 0); }

if (!WRITE) { console.log('\nDry run — re-run with --write to apply.\n'); process.exit(0); }
writeJSON(PATHS.vocab, vocab);
writeJSON(PATHS.sectors, rebuildSectors(vocab, loadSectors(PATHS.sectors)));
if (prov.length) writeJSON(PATHS.provenance, prov);
if (moves.size) writeIdMap(map);
console.log(`\n✓ wrote public/data/{vocab,sectors${prov.length ? ',provenance' : ''}}.json${moves.size ? ' and src/data/idmap.ts' : ''}`);
console.log(`  id map ${Object.keys(idMap).length} → ${Object.keys(map).length} (${moves.size} new, ${repointed} re-pointed)`);
console.log('  Next: npm run corpus:split && npm run corpus:freq && npm run corpus:validate && npm test\n');
