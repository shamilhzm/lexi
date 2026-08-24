// Correct genders and plurals the dictionary audit caught.
//
// `corpus:gender-audit` reports; this repairs. The split is deliberate, and the
// ratio is the argument for it: across 3,590 nouns at every level the audit flagged
// 25 rows and **12 of them were defensible**. *der/das Burnout* (Duden allows both),
// *Schlagwörter* beside *Schlagworte* (two plurals for two senses), *Rettungswägen*
// (southern), *Balkone* beside *Balkons* and *Picknicks* beside *Picknicke* (both
// standard), and the plural-taught pair items *die Socken*, *die Stiefel*,
// *die Gartenmöbel*, where `die` is the plural article and the dictionary is
// documenting a singular the card never teaches.
//
// Only the thirteen below were verified by hand as unambiguously wrong. Four of
// them were caught by the card contradicting **itself** — `die Mietwagen` whose own
// examples read „Der Mietwagen kostet …“, and the same for `die Stau`,
// `die Schlepplift` and `die Coach`.
//
// ## A gender fix is a schedule migration
//
// Card ids embed the term **with its article** — `voc:B2:die Vorstand`. Correcting
// the gender therefore changes the id, and a learner's FSRS state is keyed on it.
// So this writes `src/data/idmap.ts` the way `casefix.ts` does, carrying earlier
// entries forward and re-pointing any that aimed at an id this pass has moved.
// Without that the correction would silently reset those cards to new.
//
// Plural-only fixes are free: `plural` is not part of the id.
//
// ## Expect-guarded
//
// Every row states what it expects to find. If the corpus has moved on — someone
// already fixed it, or the card was re-levelled — the run aborts rather than
// overwriting a value nobody predicted. Same contract as
// `scripts/authoring/fix-authored.ts`.
//
//   npm run corpus:genderfix            # dry run
//   npm run corpus:genderfix -- --write
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { loadCorpus, loadSectors, readJSON, writeJSON, writeText, fileExists, type Word } from './lib.ts';
import { rebuildSectors } from './sectors.ts';

interface Fix {
  id: string;
  /** What the card must currently say, or the run aborts. */
  expect: { gender?: 'der' | 'die' | 'das'; plural?: string | null; term?: string };
  /** `term` corrects the **noun form**, where `gender` corrects the article. Both
   *  move the id, so both take the one migration path below. Added 2026-08-24 for
   *  the adjectival nouns: `Vorsitzender` is the *strong* form — the one that
   *  stands after *ein* — and after *der* only the weak `Vorsitzende` is correct.
   *  No gender change can express that, because the article was never wrong. */
  set: { gender?: 'der' | 'die' | 'das'; plural?: string; term?: string };
  /** Declare when the corrected term is already a card. The Visum collision
   *  (2026-08-14) proved a gender fix can silently create a duplicate, so an
   *  undeclared collision still aborts — this is how you say you meant it. The
   *  wrong card is retired into the existing one and its examples are absorbed. */
  merge?: true;
  why: string;
}

/** Verified by hand against de.wiktionary and Duden. Cumulative: rows from earlier
 *  passes stay, and the guard below recognises the ones already applied. */
const FIXES: Fix[] = [
  {
    id: 'voc:B2:die Visum',
    expect: { gender: 'die' },
    set: { gender: 'das' },
    why: 'das Visum — a Latin neuter; „die Visum“ is not attested anywhere.',
  },
  {
    id: 'voc:B2:die Vorstand',
    expect: { gender: 'die' },
    set: { gender: 'der' },
    why: 'der Vorstand (board, management).',
  },
  {
    id: 'voc:C1:die Babyboomer',
    expect: { gender: 'die', plural: '(Pl.)' },
    set: { gender: 'der', plural: 'die Babyboomer' },
    why: 'der Babyboomer in the singular; the plural field held the literal string „(Pl.)“, which is not a plural.',
  },
  {
    id: 'voc:C1:das Szenario',
    expect: { plural: '-s' },
    set: { plural: 'die Szenarien' },
    why: 'Latin -ium type: das Szenario → die Szenarien. „Szenarios“ is colloquial.',
  },
  {
    id: 'voc:C1:das Zukunftsszenario',
    expect: { plural: '-s' },
    set: { plural: 'die Zukunftsszenarien' },
    why: 'Same declension as its head noun.',
  },

  // ---- the A1–B1 audit, 2026-08-14 -----------------------------------------
  // 2,742 nouns, none of which had ever been machine-checked. The first run
  // flagged 10% of A1 — four separate bugs in the check, not four hundred bad
  // cards: three unknown plural notations („nur Singular“, „nur Plural“, „—“),
  // the umlaut notation („¨-e“ against „Röcke“), a gender comparison against the
  // singular of a plural-taught card, and a comparison against only the *first*
  // of several attested plurals. Fixed, the rate came to 0.4% and these eight
  // survived triage.
  {
    id: 'voc:A1:das Polyester',
    expect: { gender: 'das' },
    set: { gender: 'der' },
    why: 'der Polyester — de.wiktionary lists one Genus (m) and derives the word from '
      + '„poly-“ + *der* Ester. „das Polyester“ is common in speech, unlike der/das Burnout '
      + 'it is not a variant any dictionary records.',
  },
  {
    id: 'voc:B1:die Mietwagen',
    expect: { gender: 'die' },
    set: { gender: 'der' },
    why: 'der Mietwagen. The card contradicted itself: both of its own examples read '
      + '„Der Mietwagen kostet …“ and „Den Mietwagen geben wir …“.',
  },
  {
    id: 'voc:B1:die Gelenk',
    expect: { gender: 'die', plural: 'die Gelenke' },
    set: { gender: 'das' },
    merge: true,
    why: 'das Gelenk. „die Gelenk“ is not a form of anything — the singular is das Gelenk '
      + 'and the plural die Gelenke, which this card already had right. `voc:B1:das Gelenk` '
      + 'exists at the same level with the same gloss, definition, IPA and plural, so this '
      + 'is a merge: the two examples are absorbed and the card is retired.',
  },
  {
    id: 'voc:B1:die Stau',
    expect: { gender: 'die' },
    set: { gender: 'der' },
    merge: true,
    why: 'der Stau. Its own examples read „Wegen des Staus …“ and „ein kilometerlanger Stau“ — '
      + 'both masculine. `voc:A2:der Stau` already exists one level down with the same gloss '
      + 'and six examples, so this is a cross-level duplicate for corpus:dupes to fold in.',
  },
  {
    id: 'voc:B1:der Skilehrerin',
    expect: { gender: 'der' },
    set: { gender: 'die' },
    why: 'die Skilehrerin. The -in suffix is feminine without exception, the plural on the card '
      + 'was already „die Skilehrerinnen“, and both examples read „Die Skilehrerin …“.',
  },
  {
    id: 'voc:B1:die Schlepplift',
    expect: { gender: 'die' },
    set: { gender: 'der' },
    why: 'der Schlepplift. Again contradicted by its own examples: „Der Schlepplift zieht …“ '
      + 'and „Am Schlepplift …“ (dative masculine).',
  },
  {
    id: 'voc:B1:die Coach',
    expect: { gender: 'die' },
    set: { gender: 'der' },
    why: 'der Coach — de.wiktionary and Duden list one Genus (m); the feminine is the separate '
      + 'lemma „die Coachin“. The card‘s own second example reads „Der Coach gab ihm …“. '
      + 'Its plural „die Coaches“ is left alone: the dictionary prefers „Coachs“ but both are '
      + 'in wide use, the same call made for Balkone/Balkons.',
  },
  {
    id: 'voc:A2:das Diesel',
    expect: { gender: 'das' },
    set: { gender: 'der' },
    why: 'der Diesel. The page carries a single Genus (m) across all four senses — the engine, '
      + 'the vehicle, the fuel, and the regional Cola-Bier drink — so the correction holds '
      + 'whichever sense the card means. Which it means is a separate defect: the gloss says '
      + '„Coke mixed with beer“ while both examples are about fuel. Fixed separately by '
      + 'scripts/corpus/batches/diesel-sense.json; the gender is wrong either way.',
  },
  {
    id: 'voc:A1:die Gartenmöbel',
    expect: { plural: null },
    set: { plural: 'nur Plural' },
    why: 'Not a wrong gender — `die` is the plural article and the card teaches the plural, '
      + 'the same as `die Möbel`, `die Lebensmittel`, `die Geschwister`. But its plural field '
      + 'was empty where `die Möbel` says „nur Plural“, so the intent was implicit and the '
      + 'audit had no way to tell it apart from a mistake. Saying it out loud is the fix.',
  },
  // ---- adjectival nouns, 2026-08-24 -----------------------------------------
  // These decline like adjectives, so the form depends on what precedes them:
  // strong `ein Vorsitzender`, weak `der Vorsitzende`. The corpus already has a
  // settled convention for the class — nine cards read `der/die X` with plural
  // `die Xen` — and these two were outside it.
  {
    id: 'voc:B1:der Vorsitzender',
    expect: { term: 'der Vorsitzender', plural: 'die Vorsitzende' },
    set: { term: 'der/die Vorsitzende', plural: 'die Vorsitzenden' },
    why: 'Both halves were inverted. „Vorsitzender“ is the strong form, which is what stands '
      + 'after *ein*; after *der* only the weak „der Vorsitzende“ is correct, so the headword '
      + 'as it stood was not German. The plural then had the singular form („die Vorsitzende“ '
      + 'is the *feminine singular*) where it needed „die Vorsitzenden“. Brought into the '
      + 'der/die convention the other nine members of the class already use.',
  },
  // ---- and the duplicates the class was hiding ------------------------------
  // Four words carded twice, once as `der X` and once as the canonical `der/die X`.
  // `corpus:dupes` groups by *identical* term, so these were structurally invisible
  // to it — the same blind spot the singular/plural pairs had. Normalising the term
  // here makes them identical, and the two that land at another level are then
  // handed on to `corpus:dupes`, which keeps the lower one and unions the content.
  // Every one declares `merge: true`, because a rename onto a term that already
  // exists is a merge and the tool is right to abort otherwise.
  {
    id: 'voc:A1:der Verwandte',
    expect: { term: 'der Verwandte' },
    set: { term: 'der/die Verwandte' },
    merge: true,
    why: 'Same word, same level, two cards — merges into voc:A1:der/die Verwandte.',
  },
  {
    id: 'voc:B1:der Abgeordnete',
    expect: { term: 'der Abgeordnete' },
    set: { term: 'der/die Abgeordnete' },
    merge: true,
    why: 'Same word, same level, two cards — merges into voc:B1:der/die Abgeordnete.',
  },
  {
    id: 'voc:B1:der Bekannte',
    expect: { term: 'der Bekannte' },
    set: { term: 'der/die Bekannte' },
    merge: true,
    why: 'Bekannte was carded three times: the canonical der/die at A1, plus a male and a '
      + 'female card at B1. The gendered pair is not a distinction worth three FSRS '
      + 'schedules — the form is identical and only the article differs, which is exactly '
      + 'what the der/die convention exists to say. Lands at B1 and is then folded into A1 '
      + 'by corpus:dupes.',
  },
  {
    id: 'voc:B2:der Vorgesetzte',
    expect: { term: 'der Vorgesetzte' },
    set: { term: 'der/die Vorgesetzte' },
    merge: true,
    why: 'Duplicate of voc:B1:der/die Vorgesetzte, which also carries the plural this one '
      + 'lacks. Lands at B2 and is folded down to B1 by corpus:dupes.',
  },
  {
    // Deliberately a second pass. `byId` is built once, before the apply loop, so two
    // rows renaming onto the *same* target in one run would both write that id and
    // leave two cards holding it. The ledger is re-run safe, so the female card lands
    // after `der Bekannte` has already become voc:B1:der/die Bekannte — which makes
    // this an ordinary same-level merge instead of a collision.
    id: 'voc:B1:die Bekannte',
    expect: { term: 'die Bekannte' },
    set: { term: 'der/die Bekannte' },
    merge: true,
    why: 'The third Bekannte card. Same form, same plural, same gloss but for the gendered '
      + 'parenthesis — der/die is precisely the notation for a word whose only variation '
      + 'is the article.',
  },
  {
    id: 'voc:C1:der Einzelne',
    expect: { plural: null },
    set: { plural: 'die Einzelnen' },
    why: 'Weak plural after the definite article, like every adjectival noun. Left as „der“ '
      + 'rather than „der/die“: unlike Bekannte or Reisende this one is overwhelmingly used '
      + 'generically („der Einzelne und die Gesellschaft“), so the rename is a judgement the '
      + 'plural fix does not need to wait on.',
  },
];

const write = process.argv.includes('--write');
const vocab = loadCorpus(PATHS.vocab) as Word[];
const byId = new Map(vocab.map((w) => [w.id, w]));
/** Term → id, for the collision a rename can cause **across** levels, which `byId`
 *  cannot see. See the apply loop. */
const byTerm = new Map(vocab.filter((w) => w.kind === 'word').map((w) => [w.term.toLowerCase(), w.id]));
const { ID_MAP } = await import(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'));

// ---- guards ---------------------------------------------------------------
// The table is a **ledger**, not a one-shot script: rows from earlier passes stay
// in it, so re-running must recognise its own finished work instead of aborting on
// it. A row counts as applied when its card is gone and the id the fix would have
// produced is present — or, for a plural-only fix, when the value is already set.
// Anything else is a corpus that has moved somewhere nobody predicted, and that
// still aborts. (Same direction as ID_MAP and dupe-rulings.tsv: cumulative.)
// Not "is the id this fix would produce present?" — that was wrong the moment
// `voc:B2:das Visum` was itself merged into `voc:B1:das Visum` an hour later. The
// id map is the record of where an id went, so ask it.
const landed = (id: string) => {
  const to = (ID_MAP as Record<string, string>)[id];
  return to ? byId.has(to) : false;
};

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
  // A plural-only fix is finished when the value is already there. It is only
  // "plural-only" if nothing else moves the id — a term fix does, so it must not
  // short-circuit here or the rename would be skipped once the plural landed.
  if (f.set.plural !== undefined && !f.set.gender && !f.set.term && card.plural === f.set.plural) { alreadyApplied++; continue; }
  for (const [k, v] of Object.entries(f.expect) as [keyof Fix['expect'], unknown][]) {
    if (card[k] !== v) problems.push(`${f.id}: expected ${k}=${JSON.stringify(v)}, found ${JSON.stringify(card[k])}`);
  }
  pending.push(f);
}
if (problems.length) {
  console.error('✗ the corpus is not in the state these fixes expect:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nNothing written. Re-verify against the dictionary before editing this table.');
  process.exit(1);
}

// ---- apply ----------------------------------------------------------------
/** The article is part of the term and therefore part of the id. */
const retermed = (term: string, gender: string) => term.replace(/^(der|die|das)\s+/i, `${gender} `);
const renamed: { from: string; to: string }[] = [];

const retired = new Set<string>();
/** Renames that land on a term another level already holds. They are legal but
 *  leave the corpus with a duplicate, so the run ends by naming them and the
 *  `corpus:dupes` pass that resolves them. */
const crossLevel: string[] = [];

for (const f of pending) {
  const card = byId.get(f.id)!;
  if (f.set.plural !== undefined) card.plural = f.set.plural;
  if (f.set.gender) card.gender = f.set.gender;
  // Two things move a term: a corrected article (gender) and a corrected noun form
  // (term). Everything after this point — the collision guard, the ID_MAP
  // migration, absorbing a retired card's examples — is about the *term* moving and
  // does not care which caused it, so it is reached from either.
  const newTerm = f.set.term ?? (f.set.gender ? retermed(card.term, f.set.gender) : null);
  if (newTerm) {
    const term = newTerm;
    const id = f.id.replace(/:[^:]*$/, `:${term}`);
    if (id !== card.id) {
      const keeper = byId.get(id);
      // A collision has two shapes and only one of them has an id. `die Gelenk`
      // corrects to a term that exists **at the same level**, so the ids collide
      // and this script merges. `die Stau` corrects to a term that exists **at
      // another level** (`voc:A2:der Stau`), so the ids do not collide at all and
      // the rename looks free — which is exactly how the Visum duplicate got in.
      // Both must be declared; the cross-level one is handed to corpus:dupes,
      // which keeps the lower level and unions the content.
      const elsewhere = !keeper && byTerm.has(term.toLowerCase());
      if ((keeper || elsewhere) && !f.merge) {
        console.error(keeper
          ? `✗ ${id} already exists — this is a merge, not a rename. Declare merge: true on the row.`
          : `✗ „${term}“ already exists at another level (${byTerm.get(term.toLowerCase())}) — this rename creates a cross-level duplicate. Declare merge: true on the row.`);
        process.exit(1);
      }
      if (elsewhere) crossLevel.push(`${term} (with ${byTerm.get(term.toLowerCase())})`);
      if (keeper) {
        // Absorb what the retired card had and the keeper lacks, the way
        // merge-dupes.ts does, so a correction never costs the learner content.
        const seen = new Set((keeper.ex ?? []).map((e) => e.de));
        for (const e of card.ex ?? []) if (!seen.has(e.de)) (keeper.ex ??= []).push(e);
        retired.add(card.id);
      }
      renamed.push({ from: card.id, to: id });
      if (!keeper) { card.term = term; card.id = id; }
    }
  }
  console.log(`  ${f.id}`);
  console.log(`      ${f.why}`);
}

const live = retired.size ? vocab.filter((w) => !retired.has(w.id)) : vocab;

// ---- the migration --------------------------------------------------------
// Cumulative, exactly as casefix.ts builds it: a learner may hold a schedule
// under an id retired two passes ago, so earlier entries are carried forward and
// any pointing at an id this pass moved are followed to the new target.
const thisPass = new Map(renamed.map(({ from, to }) => [from, to] as const));
const map: Record<string, string> = {};
for (const [from, to] of Object.entries(ID_MAP as Record<string, string>)) map[from] = thisPass.get(to) ?? to;
for (const [from, to] of thisPass) map[from] = to;

// Only `voc:` targets can be checked here. The map is shared with other passes
// and also carries `gex:` grammar-exercise ids, which live in grammar.json and
// are not cards at all — validating them against the lexicon reports every one of
// them as dangling, which is how the first run of this script failed.
const ids = new Set(live.map((w) => w.id));
const dangling = Object.entries(map).filter(([, to]) => to.startsWith('voc:') && !ids.has(to));
if (dangling.length) {
  console.error(`✗ id map would point at cards that do not exist: ${dangling.slice(0, 5).map(([f, t]) => `${f}→${t}`).join(', ')}`);
  process.exit(1);
}

// provenance.json is the third file that holds a card id.
const provPath = PATHS.provenance;
let provMoved = 0;
const prov = fileExists(provPath) ? readJSON<{ id: string }[]>(provPath) : [];
for (const row of prov) {
  const to = thisPass.get(row.id);
  if (to) { row.id = to; provMoved++; }
}

console.log(`\n${pending.length} fix(es) applied, ${alreadyApplied} already in the corpus · ${renamed.length} id change(s) · ${retired.size} merged away · ${provMoved} provenance row(s) · id map ${Object.keys(ID_MAP).length} → ${Object.keys(map).length}`);
for (const r of renamed) console.log(`  rename ${r.from}  →  ${r.to}`);

if (crossLevel.length) {
  console.log(`\n⚠ ${crossLevel.length} rename(s) land on a term another level already holds:`);
  for (const c of crossLevel) console.log(`    ${c}`);
  console.log('  Run `npm run corpus:dupes -- --write` next — it keeps the lower level, unions the');
  console.log('  content and writes the id map. corpus:validate errors until you do.');
}

if (!write) { console.log('\nDry run — re-run with --write to apply.'); process.exit(0); }

writeJSON(PATHS.vocab, live);
writeJSON(PATHS.sectors, rebuildSectors(live, loadSectors(PATHS.sectors)));
if (prov.length) writeJSON(provPath, prov);
writeText(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'),
  `// Generated by scripts/corpus/casefix.ts and genderfix.ts — do not edit by hand.\n`
  + `// Old card id → the id that replaced it, so a stored FSRS schedule survives a\n`
  + `// corpus correction instead of quietly resetting to new. Cumulative across every\n`
  + `// pass: an entry is only ever added or re-pointed, never dropped.\n`
  + `export const ID_MAP: Record<string, string> = ${JSON.stringify(map, null, 2)};\n`);
console.log('\nWrote public/data/{vocab,sectors,provenance}.json and src/data/idmap.ts');
console.log('  Next: npm run corpus:split && npm run corpus:freq && npm run corpus:validate && npm test');
