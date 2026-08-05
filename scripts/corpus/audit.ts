// The whole-corpus quality sweep — every card, every field.
//
// The existing audits each look at one thing well: `validate` at schema and
// duplicates, `definitions` at the `def` field, `examples` at example rows. This is
// the pass that looks at a card as a *card*: does its article agree with its gender,
// does its example actually contain the word it is teaching, does its plural look
// like a plural of its own headword.
//
// Every check answers "would a learner meeting this card be misled?" — not "is the
// JSON well-formed", which validate already covers.
//
// ## Checks that were tried and removed, so nobody adds them back
//
// The first version of this file reported 21 errors and 12,052 warnings, and almost
// every one was wrong. They are listed here because each looked reasonable:
//
//   - **IPA without slashes.** 7,004 hits. The corpus stores bare IPA by design and
//     the card face adds the delimiters; storing "/…/" would double them.
//   - **IPA containing x or q.** 257 hits. `x` is the voiceless velar fricative —
//     *Buch* is `buːx`. It is not a stray Latin letter.
//   - **Plural identical to the singular.** 482 hits. That is ordinary German: every
//     neuter/masculine -er, -en and -chen noun does it. *das Zimmer → die Zimmer*.
//   - **Noun headword starting lowercase.** All 21 "errors" were `der/die Verwandte`
//     and friends — dual-gender nominalised adjectives whose article is `der/die`,
//     which the article regex did not know about.
//
// The lesson worth keeping: a check that fires on thousands of cards is far more
// likely to encode a wrong assumption about German than to have found thousands of
// defects. Verify the top hit by hand before believing any new check here.
//
// Read-only. Emits no batches and writes nothing.
//
// Run: npm run corpus:audit [--level A1] [--limit 12]
import { readFileSync } from 'node:fs';
import { buildMatcher } from '../../src/lib/matcher.ts';
import type { Word, SectorMeta } from '../../src/types.ts';

const words: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const sectors: SectorMeta[] = JSON.parse(readFileSync('public/data/sectors.json', 'utf8'));

const argv = process.argv.slice(2);
const arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const onlyLevel = arg('--level');
const LIMIT = Number(arg('--limit') ?? 8);

type Sev = 'error' | 'warn';
interface Finding { sev: Sev; check: string; id: string; detail: string }
const found: Finding[] = [];
const add = (sev: Sev, check: string, w: Word, detail: string) =>
  found.push({ sev, check, id: w.id, detail });

const scope = onlyLevel ? words.filter((w) => w.level === onlyLevel) : words;
const vocab = scope.filter((w) => w.kind === 'word');
const sectorNames = new Set(sectors.map((s) => s.name));

// Handles the dual-gender form (`der/die Angestellte`) as well as the plain one.
const ARTICLE = /^(der|die|das)(\/(der|die|das))*\s+/i;
const stripArticle = (t: string) => t.replace(ARTICLE, '');
const fold = (s: string) => s.toLowerCase()
  .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
/** Values in the plural field that are not a spelled-out plural: editorial markers,
 *  and the dictionary suffix convention (`die Speisekarte, -n`). Both are correct
 *  data; neither can be compared against the headword as a string. */
const PLURAL_NOT_SPELLED = /^(nur (plural|singular)|—|kein plural|selten|¨?-{1,2}[a-zäöüß]*|"?-e[nr]?"?)$/i;

const matcher = buildMatcher(words);

for (const w of scope) {
  const bare = stripArticle(w.term);
  const multiword = /\s/.test(bare);

  // ---- structural integrity -------------------------------------------------
  if (!w.term.trim()) add('error', 'empty-term', w, '(blank)');
  if (!w.en.trim()) add('error', 'empty-gloss', w, w.term);
  if (!sectorNames.has(w.field)) add('error', 'unknown-sector', w, `field="${w.field}"`);
  if (/[<>]|&[a-z]+;|\\n|\s{3,}/.test(`${w.term}${w.en}${w.def ?? ''}`)) {
    add('error', 'markup-or-cruft', w, `${w.term} — ${JSON.stringify(w.en.slice(0, 48))}`);
  }
  if (!w.pos?.trim()) add('warn', 'empty-pos', w, w.term);

  if (w.kind !== 'word') continue;

  // ---- the article and the gender must agree --------------------------------
  // A mismatch teaches one thing on the flip face and drills the other: the gender
  // drill reads `gender`, the card face reads `term`.
  const artMatch = w.term.match(ARTICLE);
  const article = artMatch ? artMatch[1].toLowerCase() : null;
  const dualGender = !!artMatch && artMatch[0].includes('/');
  if (article && w.gender && !dualGender && article !== w.gender) {
    add('error', 'article-gender-mismatch', w, `term says "${article}", gender says "${w.gender}"`);
  }
  if (article && !w.gender && !dualGender) add('warn', 'article-without-gender', w, w.term);

  // ---- capitalisation -------------------------------------------------------
  // German capitalises nouns. Phrases and multi-word entries legitimately begin
  // with a capital for other reasons (*Wie bitte?*, *Herzlichen Glückwunsch!*).
  if (bare && w.pos === 'noun' && !multiword && bare[0] !== bare[0].toUpperCase()) {
    add('error', 'noun-lowercase', w, w.term);
  }
  if (bare && w.pos && !['noun', 'grammar', 'phrase'].includes(w.pos) && !multiword
      && bare[0] === bare[0].toUpperCase() && bare[0] !== bare[0].toLowerCase()) {
    add('warn', 'non-noun-capitalised', w, `${w.term} (${w.pos})`);
  }

  // ---- the plural should be a plural of *this* word -------------------------
  if (w.plural && !PLURAL_NOT_SPELLED.test(w.plural.trim())) {
    const p = fold(stripArticle(w.plural));
    const b = fold(bare);
    // Umlaut is folded on both sides, so Apfel→Äpfel and Arzt→Ärzte pass. A real
    // hit is a plural that shares almost nothing with its own headword.
    const stem = b.slice(0, Math.max(3, Math.floor(b.length * 0.6)));
    if (!(p.startsWith(stem) || p.includes(b) || b.includes(p.slice(0, 4)))) {
      add('warn', 'plural-unrelated', w, `${w.term} → ${w.plural}`);
    }
  }

  // ---- the gloss and the definition must not be the same thing --------------
  if (w.def && w.en && w.def.trim().toLowerCase() === w.en.trim().toLowerCase()) {
    add('warn', 'def-equals-gloss', w, `${w.term} — "${w.en}"`);
  }

  // ---- self-referencing synonyms -------------------------------------------
  for (const s of w.syn) {
    if (fold(stripArticle(s)) === fold(bare)) add('warn', 'synonym-is-self', w, `${w.term} lists itself`);
  }
  for (const a of w.ant) {
    if (fold(stripArticle(a)) === fold(bare)) add('error', 'antonym-is-self', w, `${w.term} is its own antonym`);
  }

  // ---- examples -------------------------------------------------------------
  w.ex.forEach((ex, i) => {
    if (!ex.de?.trim()) add('error', 'example-empty-de', w, `#${i + 1}`);
    if (!ex.en?.trim()) add('error', 'example-untranslated', w, `#${i + 1}: "${ex.de?.slice(0, 44)}"`);
    if (ex.de && ex.en && ex.de.trim() === ex.en.trim()) {
      add('error', 'example-de-equals-en', w, `#${i + 1}: "${ex.de.slice(0, 44)}"`);
    }
    // An example exists to show the word in use. Accept three kinds of evidence,
    // because German hides a lemma in more places than a token match sees:
    //   1. the app's own matcher resolves a token to this exact card;
    //   2. the headword appears as a substring — compounds (*Hotelzimmer* teaches
    //      *Zimmer*, *Kopfschmerzen* teaches *Kopf*) are legitimate context;
    //   3. for verbs, the stem appears (covers separable prefixes moving away).
    // What survives is an example with no visible relation to its headword.
    if (ex.de && w.pos !== 'grammar' && bare.length >= 3) {
      const sentence = fold(ex.de);
      const b = fold(bare);
      const stem = w.pos === 'verb' ? b.replace(/(en|ern|eln)$/, '') : b;
      const byMatcher = matcher.annotate(ex.de).some((seg) => seg.isWord && seg.word?.id === w.id);
      const bySubstring = sentence.includes(b) || (stem.length >= 4 && sentence.includes(stem));
      if (!byMatcher && !bySubstring) {
        add('warn', 'example-lacks-headword', w, `${w.term} ∉ "${ex.de.slice(0, 52)}"`);
      }
    }
    if (ex.de && ex.de.length > 200) add('warn', 'example-very-long', w, `#${i + 1} ${ex.de.length} chars`);
  });
}

// ---- report ----------------------------------------------------------------
const byCheck = new Map<string, Finding[]>();
for (const f of found) {
  if (!byCheck.has(f.check)) byCheck.set(f.check, []);
  byCheck.get(f.check)!.push(f);
}
const order = [...byCheck.entries()].sort((a, b) => {
  const sev = (e: [string, Finding[]]) => (e[1][0].sev === 'error' ? 0 : 1);
  return sev(a) - sev(b) || b[1].length - a[1].length;
});

const scopeLabel = onlyLevel ? `${onlyLevel} only` : 'all levels';
console.log(`\nCorpus audit — ${scope.length} cards (${vocab.length} vocabulary), ${scopeLabel}\n`);
let errors = 0;
let warns = 0;
for (const [check, list] of order) {
  if (list[0].sev === 'error') errors += list.length; else warns += list.length;
  console.log(`  ${list[0].sev === 'error' ? 'ERROR' : ' warn'}  ${check.padEnd(26)} ${String(list.length).padStart(5)}`);
  for (const f of list.slice(0, LIMIT)) console.log(`         ${f.id}  ${f.detail}`);
  if (list.length > LIMIT) console.log(`         … and ${list.length - LIMIT} more`);
}
console.log(`\n  ${errors} error(s) · ${warns} warning(s)\n`);
process.exit(errors > 0 ? 1 : 0);
