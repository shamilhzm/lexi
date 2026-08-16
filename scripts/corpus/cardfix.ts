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
  expect: Partial<Pick<Word, 'term' | 'en' | 'pos' | 'gender' | 'plural' | 'field'>> & { defDe?: string | null };
  /** The corrected values. `gender: null` and `plural: null` are meaningful and
   *  are applied — a noun-turned-adverb must lose both, not merely stop showing
   *  them, or the drills will still offer it as a gender item. */
  set: Partial<Pick<Word, 'term' | 'en' | 'pos' | 'field' | 'def' | 'ipa'>> & { gender?: Gender; plural?: string | null; defDe?: string | null };
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

  // ---- defDe that describes a different word --------------------------------
  // `defDe` is the monolingual layer B2+ learners are *shown*, so a German
  // definition of the wrong word is live content, not tidiness. All 302 cards
  // carrying one were read by hand — the class has no cheap proxy, and two
  // attempts at one were wrong in both directions — and these are what came back:
  // English sitting in the German field, definitions of a homograph, and
  // definitions of a different sense from the one the card teaches.
  //
  // **Cleared, not rewritten.** A card with no `defDe` simply does not show the
  // German layer, which is already true of 6,200 others. Authoring replacement
  // German for advanced learners is a different job with a different bar, and
  // showing nothing beats showing a definition of another word.
  {
    id: 'voc:A2:fallen',
    expect: { defDe: 'to fall; to drop; to die; to fall in battle; to die in battle; to be killed in action' },
    set: { defDe: null },
    why: 'an English gloss list, not a German definition.',
  },
  {
    id: 'voc:B1:betreten',
    expect: { defDe: 'to enter, to go or come into; to step onto, especially die Bühne - the stage, meant figuratively' },
    set: { defDe: null },
    why: 'an English gloss list, not a German definition.',
  },
  {
    id: 'voc:B2:einschlafen',
    expect: { defDe: 'to fall asleep; to pass away, die (peacefully)' },
    set: { defDe: null },
    why: 'an English gloss list, not a German definition.',
  },
  {
    id: 'voc:B1:die Währung',
    expect: { defDe: 'currency, bank notes and cents, die Münzen und Banknoten' },
    set: { defDe: null },
    why: 'English spliced with German — "currency, bank notes and cents, die Münzen und Banknoten".',
  },
  {
    id: 'voc:A2:mintgrün',
    expect: { defDe: 'Kleidungsstück, das um den Körper geschlungen wird' },
    set: { defDe: null },
    why: 'defines a garment wrapped round the body; the card is a colour.',
  },
  {
    id: 'voc:B1:die Alp',
    expect: { defDe: 'gespenstisches Wesen, das Menschen besonders in der Nacht plagt' },
    set: { defDe: null },
    why: 'defines the nightmare demon; the card is an alpine pasture.',
  },
  {
    id: 'voc:B1:packen',
    expect: { defDe: 'aufeinander liegende gleichartige Dinge, die auch zusammengebunden sein können' },
    set: { defDe: null },
    why: 'defines the noun *Packen*, a bundle; the card is the verb "to pack".',
  },
  {
    id: 'voc:B1:profitieren von + D',
    expect: { defDe: 'fachlicher Bereich, dem bestimmte Themen zugeordnet werden' },
    set: { defDe: null },
    why: 'defines *Fach*, a subject area; the card is "to profit from".',
  },
  {
    id: 'voc:B1:sorgen für + A',
    expect: { defDe: 'sich ernsthaft Gedanken machen zu etwas/jemandem, etwas befürchten, was jemanden betrifft' },
    set: { defDe: null },
    why: 'defines *sich sorgen*, to worry; the card is "to provide for".',
  },
  {
    id: 'voc:B1:umgehen mit + D',
    expect: { defDe: 'reinigende Arbeiten in der Küche verrichten, die mit der Verwendung von Wasser zu tun haben' },
    set: { defDe: null },
    why: 'defines washing up in the kitchen; the card is "to deal with".',
  },
  {
    id: 'voc:B1:sinnvoll',
    expect: { defDe: 'geistig rege, mit einem großen Verstand' },
    set: { defDe: null },
    why: 'defines mental alertness; the card is "sensible, meaningful".',
  },
  {
    id: 'voc:B2:die Selbstfürsorge',
    expect: { defDe: 'der Zustand einer Person, in dem die Fähigkeit zur Selbstpflege/Selbstfürsorge herabgesetzt ist' },
    set: { defDe: null },
    why: 'defines *Pflegeabhängigkeit*, the loss of self-care; the card is self-care.',
  },
  {
    id: 'voc:A2:die PIN eingeben',
    expect: { defDe: 'die Handlung des Eingebens; Hinzuführen von Information' },
    set: { defDe: null },
    why: 'defines *Eingabe* as a noun; the card is the act of entering a PIN.',
  },
  {
    id: 'voc:B1:schützen',
    expect: { defDe: 'jemanden/etwas vor … schützen' },
    set: { defDe: null },
    why: 'not a definition — a collocation frame with an ellipsis, "jemanden/etwas vor … schützen".',
  },
  {
    id: 'voc:B1:der Abgeordnete',
    expect: { defDe: 'gewähltes, weibliches Mitglied einer parlamentarischen Versammlung' },
    set: { defDe: null },
    why: 'defines a *weibliches* Mitglied; this card is the masculine form.',
  },
  {
    id: 'voc:A2:eine Rolle spielen',
    expect: { defDe: 'in einem Theaterstück / Film Schauspieler sein' },
    set: { defDe: null },
    why: 'the literal theatre sense; the card teaches the figurative "to matter".',
  },
  {
    id: 'voc:B1:die Resilienz',
    expect: { defDe: 'Fähigkeit elastischen Materials, nach starker Verformung in den Ausgangszustand zurückzukehren' },
    set: { defDe: null },
    why: 'the materials-science sense; the card is psychological resilience.',
  },
  {
    id: 'voc:B1:die Trennung',
    expect: { defDe: 'materiell: Vorgang oder Ergebnis der Absonderung von Substanzen voneinander' },
    set: { defDe: null },
    why: 'the chemistry sense, separating substances; the card is a breakup.',
  },
  {
    id: 'voc:B1:die Vorstellung',
    expect: { defDe: 'die gedankliche, vergeistigte, innere Abbildung (Projektion) der (äußeren) Realität, Wirklichkeit, im inneren (Gedächtnis, Gefühl, Bewusstsein), die real erlebte Projektion der (äußeren) Realität/ Wirklichkeit; Abbild des Bewusstseins' },
    set: { defDe: null },
    why: 'the mental-image sense; the card is a performance.',
  },
  {
    id: 'voc:B2:die Beförderung',
    expect: { defDe: 'das Befördern oder das Transportieren von Gütern oder Personen' },
    set: { defDe: null },
    why: 'the transport sense; the card is promotion at work.',
  },
  {
    id: 'voc:C1:konstruktiv',
    expect: { defDe: 'auf die Konstruktion bezogen' },
    set: { defDe: null },
    why: 'the engineering sense, "auf die Konstruktion bezogen"; the card is constructive criticism.',
  },
  {
    id: 'voc:A2:komisch',
    expect: { defDe: 'nach Art einer Komödie' },
    set: { defDe: null },
    why: 'defines "in the manner of a comedy"; the card is funny/odd.',
  },
  {
    id: 'voc:C1:die Replikation',
    expect: { defDe: 'zelluläre Synthese; Erzeugen einer Kopie durch Verdoppelung genetischen Materials (DNA/RNA), zum Beispiel eines Chromosoms oder Virus' },
    set: { defDe: null },
    why: 'the genetics sense; the card is replication of a study.',
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
  for (const k of ['term', 'en', 'pos', 'field', 'def', 'ipa', 'gender', 'plural', 'defDe'] as const) {
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
