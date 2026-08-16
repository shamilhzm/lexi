// Correct a card whose *identity* is wrong — the headword itself, its part of
// speech, its gender.
//
// The pipeline already repairs every field that does not change what a card *is*:
// `fix-authored.ts` for glosses, definitions, examples and plurals, `genderfix.ts`
// for a wrong article, `casefix.ts` for a wrong capital. None of them can say "this
// card is not a noun at all", and that turned out to be a real state.
//
// ## The card that forced it
//
// `voc:A2:der Somit` was glossed **"somite"** — the embryology term — with a
// gender and a plural attached, while its sector read *Adverbs* and both of its
// examples were the ordinary adverb *somit*, "therefore", correctly translated.
// A frequency-list adverb had collected a homograph's noun facts at build time.
// It surfaced during the definition programme, because it was the one card in
// 6,504 that could not be given an honest definition.
//
// Nothing could fix it: the gloss, the part of speech, the gender, the plural and
// the headword were all wrong together, and correcting the headword changes the id.
//
// ## Expect-guarded, and it is a schedule migration
//
// Every row states what it expects to find, field by field; a mismatch aborts the
// run rather than overwriting a value nobody predicted. Same contract as
// `genderfix.ts` and `fix-authored.ts`.
//
// A term change moves the id (`voc:LEVEL:term`), so this writes `src/data/idmap.ts`
// through the shared helpers in `merge-lib.ts`, re-points `provenance.json`, and
// refuses a rename that lands on a term the corpus already holds — the collision
// that let the Visum duplicate in twice.
//
//   npm run corpus:cardfix            # dry run
//   npm run corpus:cardfix -- --write
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { loadCorpus, loadSectors, readJSON, writeJSON, fileExists, type Word } from './lib.ts';
import { rebuildSectors } from './sectors.ts';
import { carryIdMap, danglingTargets, writeIdMap } from './merge-lib.ts';

type Gender = 'der' | 'die' | 'das' | null;

interface Fix {
  id: string;
  /** What the card must currently hold, field by field, or the run aborts. */
  expect: Partial<Pick<Word, 'term' | 'en' | 'pos' | 'gender' | 'plural' | 'field'>>;
  /** The corrected values. `gender: null` and `plural: null` are meaningful and
   *  are applied — a noun-turned-adverb must lose both, not merely stop showing
   *  them, or the drills will still offer it as a gender item. */
  set: Partial<Pick<Word, 'term' | 'en' | 'pos' | 'field' | 'def' | 'ipa'>> & { gender?: Gender; plural?: string | null };
  why: string;
}

/** Verified by hand against the card's own examples and sector. Cumulative: a row
 *  stays after it is applied, and the guard below recognises finished work. */
const FIXES: Fix[] = [
  {
    id: 'voc:A2:der Somit',
    expect: { term: 'der Somit', en: 'somite', pos: 'noun', gender: 'der', plural: 'die Somite', field: 'Adverbs' },
    set: {
      term: 'somit', en: 'thus, therefore', pos: 'adverb', gender: null, plural: null,
      def: 'Therefore — drawing the conclusion that follows from what was just said.',
    },
    why: 'somit is a conjunctional adverb. The card carried the noun *Somit*, an embryology '
      + 'term, on the strength of the spelling alone: gender der, plural die Somite, gloss '
      + '"somite". Its own sector said Adverbs and both examples are the adverb — '
      + '„Er war neu im Dorf und somit niemandem bekannt.“ and „Somit hat der Ausdruck zwei '
      + 'verschiedene Bedeutungen.“ — already translated "therefore" and "thus". The German '
      + 'noun is also not A2 vocabulary by any reading.',
  },
  {
    id: 'voc:A2:das Gegenteil',
    expect: { field: 'Core verbs', pos: 'noun' },
    set: { field: 'Abstract' },
    why: 'A noun filed under *Core verbs*. Found by the check this pass added — a noun in a '
      + 'sector reserved for another part of speech — which is the same signal that would have '
      + 'caught „der Somit“ years earlier. *Abstract* is where its neighbours already are: '
      + 'die Ursache, die Folge, der Zusammenhang, die Wirkung.',
  },
];

const write = process.argv.includes('--write');
const vocab = loadCorpus(PATHS.vocab);
const byId = new Map(vocab.map((w) => [w.id, w]));
const byTerm = new Map(vocab.filter((w) => w.kind === 'word').map((w) => [w.term.toLowerCase(), w.id]));
const { ID_MAP } = await import(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'));
const idMap = ID_MAP as Record<string, string>;

// ---- guards ---------------------------------------------------------------
/** A row is finished when its card is gone and the id map says where it went. */
const landed = (id: string) => {
  const to = idMap[id];
  return to ? byId.has(to) : false;
};

/** …and for a row that does **not** move the id, when every value it sets is
 *  already the value on the card.
 *
 *  Without this the table is a one-shot script rather than a ledger: the first
 *  applied row that only changes a `field` makes every later run abort on its own
 *  finished work, because `expect` describes the state *before* the fix. Caught by
 *  the guard itself one row after the pass was written. */
const settled = (f: Fix, card: Word) =>
  !f.set.term
  && Object.entries(f.set).every(([k, want]) => card[k as keyof Word] === want);

const problems: string[] = [];
const pending: Fix[] = [];
let alreadyApplied = 0;

for (const f of FIXES) {
  const card = byId.get(f.id);
  if (!card) {
    if (landed(f.id)) { alreadyApplied++; continue; }
    problems.push(`${f.id}: no such card, and the id map does not say where it went`);
    continue;
  }
  if (settled(f, card)) { alreadyApplied++; continue; }
  for (const [k, want] of Object.entries(f.expect) as [keyof Word, unknown][]) {
    if (card[k] !== want) problems.push(`${f.id}: expected ${k}=${JSON.stringify(want)}, found ${JSON.stringify(card[k])}`);
  }
  // A rename that lands on an existing term is how a duplicate gets created — the
  // defect corpus:dupes and corpus:forms exist to remove. Refuse rather than merge:
  // merging is a different decision and has its own ruled pass.
  if (f.set.term && f.set.term !== card.term) {
    const clash = byTerm.get(f.set.term.toLowerCase());
    if (clash && clash !== f.id) problems.push(`${f.id}: renaming to „${f.set.term}“ collides with ${clash} — resolve with corpus:forms, not here`);
  }
  pending.push(f);
}

if (problems.length) {
  console.error('✗ the corpus is not in the state these fixes expect:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nNothing written. Re-read the card before editing the table.');
  process.exit(1);
}

// ---- apply ----------------------------------------------------------------
const moves = new Map<string, string>();
for (const f of pending) {
  const card = byId.get(f.id)!;
  const shape = (c: Word) => `${c.term} · ${c.pos} · ${c.gender ?? '—'} · pl ${c.plural ?? '—'} · ${c.field} · "${c.en}"`;
  const before = shape(card);
  // `in` rather than a truthiness test: `gender: null` and `plural: null` are the
  // point of this pass, and `if (f.set.gender)` would skip exactly the correction
  // a noun-turned-adverb needs.
  for (const k of ['term', 'en', 'pos', 'field', 'def', 'ipa', 'gender', 'plural'] as const) {
    if (k in f.set) (card as Record<string, unknown>)[k] = f.set[k];
  }
  if (f.set.term) {
    const id = `voc:${card.level}:${card.term}`;
    if (id !== f.id) { moves.set(f.id, id); card.id = id; }
  }
  console.log(`\n  ${f.id}`);
  console.log(`      was: ${before}`);
  console.log(`      now: ${shape(card)}`);
  console.log(`      ${f.why.replace(/\s+/g, ' ')}`);
}

// ---- the migration --------------------------------------------------------
const { map, repointed } = carryIdMap(idMap, moves);
const dangling = danglingTargets(map, new Set(vocab.map((w) => w.id)));
if (dangling.length) {
  console.error(`\n✗ id map would point at cards that do not exist: ${dangling.slice(0, 5).map(([f, t]) => `${f}→${t}`).join(', ')}`);
  process.exit(1);
}

const prov = fileExists(PATHS.provenance) ? readJSON<{ id: string }[]>(PATHS.provenance) : [];
let provMoved = 0;
for (const row of prov) {
  const to = moves.get(row.id);
  if (to) { row.id = to; provMoved++; }
}

console.log(`\n${pending.length} fix(es) · ${alreadyApplied} already applied · ${moves.size} id change(s) · ${provMoved} provenance row(s) · id map ${Object.keys(idMap).length} → ${Object.keys(map).length} (${repointed} re-pointed)`);
for (const [from, to] of moves) console.log(`  ${from}  →  ${to}`);

if (!write) { console.log('\nDry run — re-run with --write to apply.'); process.exit(0); }

writeJSON(PATHS.vocab, vocab);
writeJSON(PATHS.sectors, rebuildSectors(vocab, loadSectors(PATHS.sectors)));
if (prov.length) writeJSON(PATHS.provenance, prov);
if (moves.size) writeIdMap(map);
console.log('\nWrote public/data/{vocab,sectors,provenance}.json' + (moves.size ? ' and src/data/idmap.ts' : ''));
console.log('  Next: npm run corpus:split && npm run corpus:freq && npm run corpus:validate && npm test');
