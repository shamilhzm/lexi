// Merge the cards that are *inflections* of each other.
//
// `corpus:dupes` groups by identical term, so it never saw these: `die Schuhe`
// and `der Schuh` are two strings, and two cards, teaching one word. The 874-group
// merge of 2026-08-11 left every pair of this shape untouched, and they are why a
// card's own example can resolve to a different card — `buildMatcher` indexes
// surface forms first-wins, so whichever of the two comes first claims *Schuhe*.
//
// The ruling for every pair lives in `form-rulings.ts`, next to the detector that
// finds them, so `corpus:validate` can gate on the same list this pass applies.
// Nothing is inferred here: an unruled collision aborts the run.
//
// ## A merge is a schedule migration, and this one can also be a relevel
//
// Same three foreign keys as merge-dupes: vocab.json, provenance.json and
// `src/data/idmap.ts`, with cards.json/detail.json following via `corpus:split`.
// One extra move this pass has to make: the keeper takes the **lower** of the two
// levels, because merging upward would take a word off a learner who has it today
// — the reason `relevel-a1.ts` promotes and never demotes. Levels are in ids, so
// that is a second id change and a second ID_MAP entry.
//
// ## Expect-guarded
//
// Every row states the level it expects to end at, and the run aborts if the
// corpus disagrees. Same contract as `genderfix.ts` and
// `scripts/authoring/fix-authored.ts`. The table is a **ledger**: rows stay after
// they are applied, and a re-run recognises its own finished work through ID_MAP
// rather than aborting on it.
//
//   npm run corpus:forms            # scan + report, writes nothing
//   npm run corpus:forms -- --write
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { loadCorpus, loadSectors, readJSON, writeJSON, writeText, fileExists, LEVELS } from './lib.ts';
import { rebuildSectors } from './sectors.ts';
import { absorb, carryIdMap, danglingTargets, writeIdMap } from './merge-lib.ts';
import { findFormCollisions, pairKey, FORM_RULINGS, type FormRuling } from './form-rulings.ts';
import type { Word, CEFR } from '../../src/types.ts';

const WRITE = process.argv.includes('--write');
const RULINGS_TSV = join(PATHS.corpusDir, 'form-rulings.tsv');
const rank = (l: string) => LEVELS.indexOf(l as CEFR);

const vocab = loadCorpus(PATHS.vocab);
const byId = new Map(vocab.map((w) => [w.id, w]));
const { ID_MAP } = await import(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'));
const idMap = ID_MAP as Record<string, string>;

// ---- scan ------------------------------------------------------------------
const collisions = findFormCollisions(vocab);
const ruledBy = new Map<string, FormRuling>();
for (const r of FORM_RULINGS) ruledBy.set(pairKey(r.form, r.lemma), r);

console.log(`\n=== cards that are forms of each other ===`);
console.log(`noun cards ${vocab.filter((w) => w.kind === 'word' && w.pos === 'noun').length} · collisions ${collisions.length}`);

const unruled = collisions.filter((c) => !ruledBy.has(pairKey(c.form.id, c.lemma.id)));
if (unruled.length) {
  console.error(`\n✗ ${unruled.length} collision(s) with no ruling:`);
  for (const c of unruled) {
    console.error(`  [${c.shape}] ${c.form.id} "${c.form.en}"  ×  ${c.lemma.id} "${c.lemma.en}" (pl. ${c.lemma.plural})`);
  }
  console.error('\nRead both cards and add a row to FORM_RULINGS in form-rulings.ts. Nothing written.');
  process.exit(1);
}

// ---- guards ----------------------------------------------------------------
// A row counts as applied when its retired card is gone *and* the id map says
// where it went. Not "is the keeper present?" — a later pass can move the keeper
// too, and the id map is the record of where an id went, so ask it.
const landed = (id: string) => {
  const to = idMap[id];
  return to ? byId.has(to) : false;
};

const problems: string[] = [];
const pending: { ruling: FormRuling; form: Word; lemma: Word }[] = [];
let alreadyApplied = 0;
let ruledKeep = 0;
let supersededRows = 0;

for (const r of FORM_RULINGS) {
  const form = byId.get(r.form);
  const lemma = byId.get(r.lemma);
  if (r.rule === 'keep') {
    // A keep is only meaningful while both cards exist; if one is gone, something
    // else retired it and the ruling is stale rather than satisfied.
    if (!form || !lemma) {
      // …unless the row says so itself. See `superseded` in form-rulings.ts.
      if (r.superseded) { supersededRows++; continue; }
      problems.push(`${r.form} × ${r.lemma}: ruled keep, but ${!form ? r.form : r.lemma} no longer exists`);
    }
    else ruledKeep++;
    continue;
  }
  if (!form) {
    if (landed(r.form)) { alreadyApplied++; continue; }
    problems.push(`${r.form}: no such card, and the id map does not say where it went`);
    continue;
  }
  if (!lemma) { problems.push(`${r.lemma}: the keeper does not exist`); continue; }
  // The level is declared, not derived, because when it differs from the keeper's
  // own it is an id change. Deriving it would let a re-level elsewhere silently
  // move a card this table thinks it has pinned.
  const lower = rank(form.level) < rank(lemma.level) ? form.level : lemma.level;
  if (r.level !== lower) problems.push(`${r.form}: declares level ${r.level}, but the lower of ${form.level}/${lemma.level} is ${lower}`);
  pending.push({ ruling: r, form, lemma });
}

if (problems.length) {
  console.error('\n✗ the corpus is not in the state these rulings expect:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nNothing written. Re-read the cards before editing the table.');
  process.exit(1);
}

console.log(`rulings ${FORM_RULINGS.length} — ${pending.length} to apply, ${alreadyApplied} already in the corpus, ${ruledKeep} ruled keep`);

// ---- apply -----------------------------------------------------------------
const moves = new Map<string, string>();       // retired or renamed id -> final id
const rows: string[] = [];
let relevelled = 0;

for (const { ruling, form, lemma } of pending) {
  const gained = absorb(lemma, [form], { syn: !ruling.dropSyn });
  // Deliberately *not* `unionGloss`. merge-dupes can union because its groups are
  // one headword twice, so a second gloss is a second sense. Here the retired card
  // is the keeper's plural, so its gloss is the same sense in another number and
  // the union produces "shoe; shoes" — measured on the first dry run of this pass,
  // on four of the eleven plural rows. Where number really does change the sense,
  // the ruling writes the gloss out.
  const wasGloss = lemma.en;
  if (ruling.gloss && ruling.gloss !== lemma.en) { lemma.en = ruling.gloss; gained.push('en'); }
  if (ruling.takeDef && form.def && form.def !== lemma.def) { lemma.def = form.def; gained.push('def'); }

  const wasId = lemma.id;
  if (ruling.level && ruling.level !== lemma.level) {
    lemma.level = ruling.level as CEFR;
    lemma.id = `voc:${ruling.level}:${lemma.term}`;
    moves.set(wasId, lemma.id);
    relevelled++;
  }
  moves.set(form.id, lemma.id);

  const note = [
    wasId !== lemma.id ? `keeper relevelled ${wasId.split(':')[1]}→${ruling.level}` : '',
    form.field !== lemma.field ? `retired sector ${form.field}` : '',
  ].filter(Boolean).join('; ');
  rows.push([lemma.term, `${lemma.level}/${lemma.field}`, form.term, `${form.level}/${form.field}`,
    gained.join('+') || '—', note, ruling.why.replace(/\s+/g, ' ')].join('\t'));

  console.log(`\n  ${form.id}  →  ${lemma.id}`);
  console.log(`      absorbed: ${gained.join(', ') || 'nothing'}${lemma.en !== wasGloss ? `  ·  gloss "${wasGloss}" → "${lemma.en}"` : ''}`);
  console.log(`      ${ruling.why.replace(/\s+/g, ' ')}`);
}
for (const r of FORM_RULINGS) {
  if (r.rule !== 'keep') continue;
  const lemma = byId.get(r.lemma);
  const form = byId.get(r.form);
  if (!lemma || !form) {
    // A superseded keep — a later pass retired one of the two. The guard above has
    // already accepted it; the record says so rather than dereferencing a card
    // that is gone.
    rows.push([r.lemma, '—', r.form, '—', '—', 'SUPERSEDED — see form-rulings.ts',
      (r.superseded ?? r.why).replace(/\s+/g, ' ')].join('\t'));
    continue;
  }
  rows.push([lemma.term, `${lemma.level}`, form.term, `${form.level}`, '—',
    'KEPT — two cards on purpose', r.why.replace(/\s+/g, ' ')].join('\t'));
}

const retired = new Set(pending.map((p) => p.form.id));
const live = vocab.filter((w) => !retired.has(w.id));

// ---- prove it landed -------------------------------------------------------
// Re-run the detector over the result. What must remain is exactly the pairs ruled
// `keep` — anything else means a merge produced a new collision (a keeper whose
// absorbed plural now names a third card), which is the kind of thing a pass like
// this discovers only by looking.
const after = findFormCollisions(live);
const expected = new Set(FORM_RULINGS.filter((r) => r.rule === 'keep').map((r) => pairKey(r.form, r.lemma)));
const surprises = after.filter((c) => !expected.has(pairKey(c.form.id, c.lemma.id)));
if (surprises.length) {
  console.error(`\n✗ the merge left ${surprises.length} collision(s) nobody ruled:`);
  for (const c of surprises) console.error(`  [${c.shape}] ${c.form.id}  ×  ${c.lemma.id}`);
  process.exit(1);
}
console.log(`\n✓ ${vocab.length} → ${live.length} cards · ${after.length} collisions remain, all ruled keep`);
if (relevelled) console.log(`✓ ${relevelled} keeper(s) took the lower level`);

// ---- the migration ---------------------------------------------------------
const { map, repointed } = carryIdMap(idMap, moves);
const dangling = danglingTargets(map, new Set(live.map((w) => w.id)));
if (dangling.length) {
  console.error(`\n✗ id map would point at cards that do not exist: ${dangling.slice(0, 5).map(([f, t]) => `${f}→${t}`).join(', ')}`);
  process.exit(1);
}

// provenance.json is the third file holding a card id — and it holds the level
// too, so a relevelled keeper needs both moved or its sourcing row disagrees with
// the card.
const prov = fileExists(PATHS.provenance) ? readJSON<{ id: string; level?: string }[]>(PATHS.provenance) : [];
const finalLevel = new Map(live.map((w) => [w.id, w.level]));
let provMoved = 0;
const seenProv = new Set<string>();
const provOut = prov.filter((row) => {
  const to = moves.get(row.id);
  if (to) { row.id = to; provMoved++; }
  if (row.level && finalLevel.has(row.id)) row.level = finalLevel.get(row.id)!;
  // A keeper can now hold two rows (its own and the retired card's); keep the
  // first, which is the keeper's own.
  return finalLevel.has(row.id) && !seenProv.has(row.id) && seenProv.add(row.id);
});

console.log(`\n${pending.length} merge(s) · ${moves.size} id change(s) · ${provMoved} provenance row(s) · id map ${Object.keys(idMap).length} → ${Object.keys(map).length} (${moves.size} new, ${repointed} re-pointed)`);
for (const [from, to] of moves) console.log(`  ${from}  →  ${to}`);

if (!WRITE) { console.log('\nDry run — re-run with --write to apply.'); process.exit(0); }

writeJSON(PATHS.vocab, live);
writeJSON(PATHS.sectors, rebuildSectors(live, loadSectors(PATHS.sectors)));
if (prov.length) writeJSON(PATHS.provenance, provOut);
writeIdMap(map);
writeText(RULINGS_TSV, [
  '# Generated by scripts/corpus/merge-forms.ts — one row per pair of cards that are forms of',
  '# each other, merged or kept, with the reason. The authority is FORM_RULINGS in',
  '# form-rulings.ts; this file is the readable record of what it did.',
  '# kept\tkept level/sector\tretired\tretired level/sector\tabsorbed\tnote\twhy',
  ...rows.sort(),
].join('\n') + '\n');

console.log(`\nWrote public/data/{vocab,sectors,provenance}.json, src/data/idmap.ts and ${RULINGS_TSV}`);
console.log('  Next: npm run corpus:split && npm run corpus:freq && npm run corpus:validate && npm test');
