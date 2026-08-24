// Apply a hand-authored *correction* batch to public/data/vocab.json.
//
// A sibling of apply-authored.ts rather than a flag on it, and deliberately so:
// apply-authored is fill-only — it never overwrites a non-empty field — which is
// exactly right for backfilling and useless for repair. Keeping them separate means
// the safe tool stays safe and this one carries its own guard.
//
// The guard is optimistic concurrency. Every row states the value it expects to
// find; a mismatch is refused, not silently applied. So a batch can be re-run, two
// batches can overlap, and a stale batch authored against last week's corpus cannot
// clobber a fix that landed since.
//
// Batches come from `npm run corpus:examples -- --write`. No network, no model.
//
//   node scripts/authoring/fix-authored.ts <batch.json> --dry
//   node scripts/authoring/fix-authored.ts <batch.json>
import { readFileSync } from 'node:fs';
import { PATHS } from '../corpus/config.ts';
import { readJSON, writeJSON, primeApp, headwordEvidence } from '../corpus/lib.ts';
import { cleanExample } from '../../src/lib/examples.ts';
import type { Word } from '../../src/types.ts';

/** An example row: replace or delete `ex[at]`. */
interface ExRow {
  id: string;
  at: number;
  siblings?: number;
  expect: { de: string; en: string };
  /** The replacement. Empty `de` with `delete` unset means "not authored yet". */
  de?: string;
  en?: string;
  delete?: boolean;
}
/** A definition row: replace the card's `def`. Same guard, different field —
 *  batches come from `corpus:definitions`. */
interface DefRow {
  id: string;
  expect: { def: string };
  def?: string;
}
/** A plural row: fill or correct a noun's `plural`. Same guard again.
 *
 *  Plurals are a *fact*, not a judgement, so unlike the other two row types this
 *  one carries a `src` naming where the value came from — de.wiktionary, in
 *  practice, read through the same page the authoring gate reads. A plural that
 *  nobody can point at is how *die Worte* and *die Wörter* get confused, and they
 *  do not mean the same thing. */
interface PlRow {
  id: string;
  expect: { plural: string | null };
  plural?: string;
  src: string;
}
/** A sense row: the English gloss, and the synonyms that belong to it.
 *
 *  The two travel together because they answer the same question — *which word is
 *  this card about?* — and `der Diesel` shipped answering it three ways at once: a
 *  gloss reading "Coke mixed with beer", synonyms belonging to that drink and to
 *  dirt (*Schweinebier*, *Schmutz*, *Moorwasser*), a definition about fuel and
 *  engines, and two examples about trains. Correcting `en` alone would have left
 *  two thirds of the mash-up in place.
 *
 *  Synonyms are facts, so this carries `src` the way a plural does. A gloss is a
 *  judgement and needs no source, but a row that rewrites both does. */
interface SenseRow {
  id: string;
  expect: { en: string; syn?: string[] };
  en?: string;
  syn?: string[];
  src?: string;
}

type Row = ExRow | DefRow | PlRow | SenseRow;
const isDefRow = (r: Row): r is DefRow => 'expect' in r && r.expect != null && 'def' in r.expect;
const isPlRow = (r: Row): r is PlRow => 'expect' in r && r.expect != null && 'plural' in r.expect;
// An ExRow's `expect` also carries an `en`, so the discriminator is the absence of
// `de` — the field only an example has.
const isSenseRow = (r: Row): r is SenseRow =>
  'expect' in r && r.expect != null && 'en' in r.expect && !('de' in r.expect);

const [batchPath, ...rest] = process.argv.slice(2);
const dry = rest.includes('--dry');
if (!batchPath) {
  console.error('Usage: node scripts/authoring/fix-authored.ts <batch.json> [--dry]');
  process.exit(1);
}

const batch = JSON.parse(readFileSync(batchPath, 'utf8')) as { rows: Row[] } | Row[];
const rows = Array.isArray(batch) ? batch : batch.rows;
const vocab = readJSON<Word[]>(PATHS.vocab);
const byId = new Map(vocab.map((c) => [c.id, c]));

const norm = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();

// Built on first use and reused. Priming costs a second over 6.5k cards, and a
// definition- or plural-only batch should not pay it — but a matcher built over
// the *shipped* corpus is the only thing that can say whether a sentence teaches
// the card, so an example batch always does.
let _matcher: ReturnType<typeof primeApp> | null = null;
const matcher = () => (_matcher ??= primeApp(vocab));
let applied = 0, deleted = 0, pending = 0;
const refused: string[] = [];
const refuse = (row: Row, why: string) =>
  refused.push(`${row.id}${isDefRow(row) || isPlRow(row) || isSenseRow(row) ? '' : `#${(row as ExRow).at}`}: ${why}`);

// Deletions are applied last and in descending index order, so removing ex[1]
// can't shift the meaning of a later row that targets ex[2] of the same card.
const deletions: ExRow[] = [];

for (const row of rows) {
  const card = byId.get(row.id);
  if (!card) { refuse(row, 'no such card id'); continue; }

  if (isPlRow(row)) {
    if ((card.plural ?? null) !== (row.expect?.plural ?? null)) {
      refuse(row, 'expect no longer matches the corpus (already fixed, or a stale batch)');
      continue;
    }
    const next = norm(row.plural ?? '');
    if (!next) { pending++; continue; }
    if (card.pos !== 'noun') { refuse(row, 'not a noun'); continue; }
    if (!/^(die|der|das)\s/.test(next)) { refuse(row, 'plural must be written with its article'); continue; }
    if (!row.src?.trim()) { refuse(row, 'no source given for the plural'); continue; }
    card.plural = next;
    applied++;
    continue;
  }

  if (isSenseRow(row)) {
    if (norm(card.en ?? '') !== norm(row.expect?.en ?? '')) {
      refuse(row, 'expect no longer matches the corpus (already fixed, or a stale batch)');
      continue;
    }
    if (row.expect.syn && JSON.stringify(card.syn ?? []) !== JSON.stringify(row.expect.syn)) {
      refuse(row, 'expect.syn no longer matches the corpus');
      continue;
    }
    const nextEn = norm(row.en ?? '');
    if (!nextEn && !row.syn) { pending++; continue; }
    if (row.syn && !row.src?.trim()) { refuse(row, 'no source given for the synonyms'); continue; }
    // The gloss is what the learner is graded against in recall mode, so it may
    // not be the definition verbatim — that would make the prompt its own answer.
    if (nextEn && nextEn.toLowerCase() === norm(card.def ?? '').toLowerCase()) {
      refuse(row, 'gloss would just repeat the definition');
      continue;
    }
    if (nextEn) card.en = nextEn;
    if (row.syn) card.syn = row.syn;
    applied++;
    continue;
  }

  if (isDefRow(row)) {
    if (norm(card.def ?? '') !== norm(row.expect?.def ?? '')) {
      refuse(row, 'expect no longer matches the corpus (already fixed, or a stale batch)');
      continue;
    }
    const next = norm(row.def ?? '');
    if (!next) { pending++; continue; }              // not authored yet — silent
    // A replacement that is itself a list of translations would put the defect
    // straight back, so hold it to the standard the audit measures.
    if (next.toLowerCase() === norm(card.en).toLowerCase()) {
      refuse(row, 'replacement just repeats the en gloss');
      continue;
    }
    card.def = next;
    applied++;
    continue;
  }

  const ex = card.ex?.[row.at];
  if (!ex) { refuse(row, `no example at index ${row.at}`); continue; }

  // The guard.
  if (norm(ex.de) !== norm(row.expect?.de ?? '') || norm(ex.en) !== norm(row.expect?.en ?? '')) {
    refuse(row, 'expect no longer matches the corpus (already fixed, or a stale batch)');
    continue;
  }

  if (row.delete) {
    if ((card.ex?.length ?? 0) < 2) { refuse(row, 'refusing to delete a card’s only example'); continue; }
    deletions.push(row);
    continue;
  }

  if (!norm(row.de ?? '')) { pending++; continue; } // not authored yet — silent

  const next = { de: norm(row.de!), en: norm(row.en ?? ''), lvl: ex.lvl };
  // Hold the replacement to the same standard the runtime guard enforces, so an
  // authored fix can't reintroduce the class of defect it was written to remove.
  const checked = cleanExample(next);
  if (!checked || checked.de !== next.de || checked.en !== next.en) {
    refuse(row, 'replacement would itself be sanitized (newline, citation text, or duplicated translation)');
    continue;
  }
  // …and to the standard `authoring:new` holds a brand-new card to: the sentence
  // must actually contain the headword, proved by the app's own matcher, and the
  // token that proves it must obey German capitalisation. Without this, the tool
  // written to *repair* «Er braut Bier» on `die Braut` would happily accept
  // another sentence with the same defect — which is exactly how 49 of them
  // reached the corpus in the first place.
  const ev = headwordEvidence(matcher(), card, next.de);
  if (!ev.ok) {
    refuse(row, ev.why === 'absent'
      ? `replacement does not contain "${card.term}" — the matcher finds no form of it`
      : `replacement proves "${card.term}" only with the lowercase «${ev.token}», which is the homograph, not the noun`);
    continue;
  }
  card.ex[row.at] = next;
  applied++;
}

for (const row of deletions.sort((a, b) => b.at - a.at)) {
  byId.get(row.id)!.ex.splice(row.at, 1);
  deleted++;
}

console.log(`\n${batchPath}`);
console.log(`  ${applied} replaced · ${deleted} deleted · ${pending} not authored yet · ${refused.length} refused`);
if (refused.length) {
  console.log('\n  Refused:');
  for (const r of refused) console.log(`    ${r}`);
}

if (!applied && !deleted) {
  console.log('\nNothing to write.\n');
  process.exit(refused.length ? 1 : 0);
}

if (dry) {
  console.log('\nDry run — re-run without --dry to write.\n');
} else {
  writeJSON(PATHS.vocab, vocab);
  console.log(`\n✓ wrote ${PATHS.vocab}`);
  console.log('  Next: npm run corpus:validate -- --strict && npm test\n');
}
