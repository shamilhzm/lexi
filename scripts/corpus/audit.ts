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
//   - **Partizip II disagrees with the form the corpus attests.** *(2026-08-25.)*
//     69 hits, and every one I read was a sentence with no Perfekt in it at all.
//     The auxiliary test fired on any `ist`/`war` anywhere in the sentence — «Ich
//     kann kaum glauben, dass das Jahr schon fast vorbei **ist**» — and the stem
//     test was a loose substring. It looked reasonable, which is why it is here.
//     A sound version needs to identify the participle *token*, not guess from
//     the presence of an auxiliary.
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
import { conjugate } from '../../src/lib/conjugate.ts';
import type { Word, SectorMeta } from '../../src/types.ts';

const words: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const sectors: SectorMeta[] = JSON.parse(readFileSync('public/data/sectors.json', 'utf8'));
const grammar: Record<string, { title: string; exercises?: { prompt?: string }[] }[]> =
  JSON.parse(readFileSync('public/data/grammar.json', 'utf8'));

const argv = process.argv.slice(2);
const arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const onlyLevel = arg('--level');
const LIMIT = Number(arg('--limit') ?? 8);

type Sev = 'error' | 'warn';
interface Finding { sev: Sev; check: string; id: string; detail: string }
const found: Finding[] = [];
const addRaw = (sev: Sev, check: string, id: string, detail: string) =>
  found.push({ sev, check, id, detail });
const add = (sev: Sev, check: string, w: Word, detail: string) => addRaw(sev, check, w.id, detail);

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

/** Parts of speech German writes lowercase, so a capital on them is informative. */
const CASED_POS = new Set(['verb', 'adjective', 'adverb']);

/** Is the word-segment at `i` the first word of its sentence or clause? German
 *  capitalises there regardless of part of speech, so a capital in that position
 *  says nothing at all. */
function sentenceInitial(segs: { text: string; isWord: boolean }[], i: number): boolean {
  for (let k = i - 1; k >= 0; k--) {
    if (segs[k].isWord) return false;
    if (/[.!?:;„“"»«()\-–—\n]/.test(segs[k].text)) return true;
  }
  return true;
}

/** Normalised-edit-distance similarity, 0..1, over folded German. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}
/** Letters only, folded — so a full stop against an exclamation mark is not a
 *  difference, and neither is ß against ss. */
const exKey = (de: string) => fold(de).replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' ').trim();
const enKey = (en: string) => (en ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, '').replace(/\s+/g, ' ').trim();

// `buildMatcher` primes the conjugator from this corpus (setKnownVerbs), so every
// `conjugate()` call below sees the engine the app sees. LESSONS class 2: a pure
// function with a seeded table is not pure until the table is seeded.
const matcher = buildMatcher(words);

/** Every adjective card's headword, for the participle check. */
const adjectiveTerms = new Set(
  words.filter((w) => w.kind === 'word' && w.pos === 'adjective').map((w) => stripArticle(w.term).toLowerCase()));

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
  // `interjection` joins the exemption list: German interjections are routinely
  // nouns pressed into service (*Verzeihung!*, *Entschuldigung!*) and keep the
  // noun's capital. Flagging them was reading a rule off the part-of-speech tag
  // when the capital comes from the word's origin.
  if (bare && w.pos && !['noun', 'grammar', 'phrase', 'interjection'].includes(w.pos) && !multiword
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
  // Compared *without* the umlaut fold, unlike the plural check. `der Makler`
  // lists "Mäkler", which the fold collapsed into the headword and reported as
  // self-reference — but Mäkler is a real orthographic variant, and pointing at
  // it is exactly what a synonym field is for.
  const same = (a: string, b: string) => stripArticle(a).toLowerCase() === stripArticle(b).toLowerCase();
  for (const s of w.syn) {
    if (same(s, bare)) add('warn', 'synonym-is-self', w, `${w.term} lists itself`);
  }
  for (const a of w.ant) {
    if (same(a, bare)) add('error', 'antonym-is-self', w, `${w.term} is its own antonym`);
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

    // ---- a verb or adjective proved only by a capitalised token -------------
    //
    // The mirror of the noun rule in `lib.ts`, and **deliberately a warning**. A
    // German noun is always capitalised, so a lowercase match *disproves* a noun —
    // that rule is a hard error in `corpus:validate` and found 49 defects. The
    // reverse proves nothing: a capitalised token on a verb or adjective card is
    // usually a nominalisation of the very word being taught («beim Tanzen», «bei
    // Rot», «im Wesentlichen»), which teaches it fine.
    //
    // It is here because roughly *half* of it is genuine drift, which is more than
    // the first characterisation of this band claimed. Hand-read 86 of 86 on
    // 2026-08-25: `bieten` "to offer" illustrated «Ich bin kein **Bot**», `matt`
    // "dull" with «auf der **Matte**», `zeugen` with «Ich bin **Zeuge**». 18 cards
    // fixed, 86 → 58. Nothing mechanical separates the remaining drift from the
    // nominalisations, which is why this is a reading list and not a gate.
    if (ex.de && CASED_POS.has(w.pos ?? '') && !multiword) {
      const segs = matcher.annotate(ex.de);
      const mine = segs.map((seg, si) => ({ seg, si })).filter(({ seg }) => seg.isWord && seg.word?.id === w.id);
      if (mine.length && mine.every(({ seg, si }) => {
        const c = seg.text[0];
        const capitalised = c === c.toUpperCase() && c !== c.toLowerCase();
        return capitalised && !sentenceInitial(segs, si);
      })) {
        add('warn', 'case-band-nonnoun', w, `${w.term} (${w.pos}) ← "${mine[0].seg.text}" in "${ex.de.slice(0, 46)}"`);
      }
    }
  });

  // ---- two examples that are nearly the same sentence -----------------------
  //
  // A card must carry two examples, and a card can satisfy that with one sentence
  // written twice. The **exact** twins are a hard error in `corpus:validate`
  // (18 found, 0 now); these are the near ones, and they are a judgement, so they
  // warn.
  //
  // Split into two disjoint bands because they read differently. Hand-read on
  // 2026-08-25: the ≥0.90 band is mostly waste — 15 cards differed only by a
  // du/ihr imperative ending, «Bleib dabei!» / «Bleibt dabei!» — and 19 were
  // fixed, taking it 86 → 70. **The 0.80–0.90 band is unread**, and is labelled
  // so rather than described: this band was characterised from its first screen
  // twice and the characterisation was wrong both times.
  const exes = (w.ex ?? []).filter((e) => e?.de?.trim());
  if (exes.length >= 2) {
    let best = 0, pair = '';
    for (let i = 0; i < exes.length; i++) {
      for (let j = i + 1; j < exes.length; j++) {
        const sim = similarity(exKey(exes[i].de), exKey(exes[j].de));
        if (sim > best) { best = sim; pair = `"${exes[i].de.slice(0, 34)}" / "${exes[j].de.slice(0, 34)}"`; }
      }
    }
    if (best >= 0.90) add('warn', 'example-near-twin', w, `${best.toFixed(2)} ${pair}`);
    else if (best >= 0.80) add('warn', 'example-near-twin-weak', w, `${best.toFixed(2)} ${pair}`);

    // ---- two examples, one translation ------------------------------------
    // Sharper than similarity and not a subset of it: «Mein Kopf tut weh» and
    // «Mir tut der Kopf weh» share no similarity score worth flagging and *are*
    // the same English. Some of those are deliberate and good — that pair teaches
    // the dative construction, and `der Berliner` carries «Ich bin Berliner» /
    // «Ich bin ein Berliner» on purpose. So: a reading list, never a check.
    const seenEn = new Map<string, number>();
    exes.forEach((e, i) => {
      const k = enKey(e.en);
      if (!k) return;
      if (seenEn.has(k)) add('warn', 'example-same-translation', w, `#${seenEn.get(k)! + 1} and #${i + 1} share "${e.en.slice(0, 46)}"`);
      else seenEn.set(k, i);
    });
  }

  // ---- a verb whose Partizip II is also an adjective card -------------------
  //
  // An invariant guard, not a defect list. All 48 were read on 2026-08-25 and the
  // ruling was **keep every one**: the adjectives have lexicalised and mean
  // something the verb does not — `gewohnt` is *accustomed* and `wohnen` is *to
  // live*, `geschickt` is *adept* and `schicken` is *to send*. Merging any of them
  // deletes a word.
  //
  // It is counted so that *growth* is visible: a new pair is a new card that needs
  // the same reading. The cost of the shape is handled elsewhere — `headwordEvidence`
  // accepts a verb's own Partizip II where an auxiliary is present, so the verb
  // card can still be illustrated.
  // `sich` is not a second word for this purpose: `sich verletzen`'s participle is
  // *verletzt*, which is an adjective card, and that is the same shape. Testing
  // `multiword` before stripping it excluded seven reflexive verbs — 48 → 41 — and
  // the drop is what surfaced the bug.
  const lemma = bare.replace(/^sich\s+/i, '');
  if (w.pos === 'verb' && !/\s/.test(lemma)) {
    try {
      const c = conjugate(lemma);
      if (c.reliable && !c.partizip.includes(' ') && adjectiveTerms.has(c.partizip.toLowerCase())) {
        add('warn', 'participle-adjective-pair', w, `${w.term} → ${c.partizip} (also an adjective card)`);
      }
    } catch { /* an unreliable verb has no participle worth comparing */ }
  }
}

// ---- a grammar point that is mostly one generated template ------------------
//
// Not a card check, so it runs outside the loop and reports against the point id.
//
// `corpus:genex` derives exercises from the corpus, which is right for facts — a
// gender is a fact — and produces a conjugation table when pointed at a tense. The
// shape `er ___ festlegen. (Konjunktiv II)` is correct and teaches nothing a
// learner did not get from the first one. Measured 2026-08-25: **968 items across
// 10 points**, and four of those points held 6 authored items against 150
// generated. `GrammarDrill` spends authored first and caps a sitting at 25, so it
// is a supply problem rather than an ordering one — 19 of every 25 items in a
// sitting on Konjunktiv II were table-filling.
//
// Six points gained 32 authored items that day, so this number is expected to have
// moved. That is the point of counting it here rather than writing it down.
const GENERATED_TENSE = /^(ich|du|er|sie|es|wir|ihr|sie \(Pl\.\))\s+___\s+\S+\.\s*\([^)]+\)\s*$/i;
for (const [level, points] of Object.entries(grammar)) {
  if (onlyLevel && level !== onlyLevel) continue;
  for (const point of points) {
    const ex = point.exercises ?? [];
    if (ex.length < 8) continue;
    const gen = ex.filter((e) => GENERATED_TENSE.test((e.prompt ?? '').trim())).length;
    if (gen / ex.length > 0.5) {
      addRaw('warn', 'generated-tense-share', `gram:${level}:${point.title}`,
        `${gen} of ${ex.length} are the "person ___ verb. (tag)" template — ${ex.length - gen} authored`);
    }
  }
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
