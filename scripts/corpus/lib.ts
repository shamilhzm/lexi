// Shared helpers for the corpus pipeline: corpus IO, dedupe keys, deterministic
// ordering, provenance tracking, and priming the real app matcher so coverage
// and validation measure exactly what the reader would light up.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildMatcher, type Matcher } from '../../src/lib/matcher.ts';
import type { Word, SectorMeta, CEFR } from '../../src/types.ts';

export const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_ORDER: Record<string, number> = Object.fromEntries(LEVELS.map((l, i) => [l, i]));

// ---- IO -------------------------------------------------------------------
export function readJSON<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}
/** Write pretty JSON with a trailing newline (stable, diff-friendly). */
export function writeJSON(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}
/** Write plain text, creating parent dirs. */
export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
export const fileExists = existsSync;

export function loadCorpus(path: string): Word[] {
  return readJSON<Word[]>(path);
}
export function loadSectors(path: string): SectorMeta[] {
  return readJSON<SectorMeta[]>(path);
}

// ---- terms, keys, ids -----------------------------------------------------
export const stripArticle = (term: string): string => term.replace(/^(der|die|das)\s+/i, '').trim();

/** Case-insensitive, article-stripped headword — the identity used for dedupe. */
export const lemmaKey = (term: string): string => stripArticle(term).toLowerCase();

/** The corpus id scheme (`voc:LEVEL:term`). Mirrors existing built-in cards and
 *  never collides with user words (`usr:`) or grammar (`gram:`). */
export const cardId = (level: string, term: string): string => `voc:${level}:${term}`;

/** Deterministic, locale-independent order: by CEFR level, then headword, then
 *  full term. Keeps regenerated vocab.json diffs reviewable. */
export function sortCards(words: Word[]): Word[] {
  return [...words].sort((a, b) => {
    const lv = (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99);
    if (lv) return lv;
    const ka = lemmaKey(a.term), kb = lemmaKey(b.term);
    if (ka < kb) return -1; if (ka > kb) return 1;
    return a.term < b.term ? -1 : a.term > b.term ? 1 : 0;
  });
}

/** The article-bearing headword for a card — the app's real identity. Nouns carry
 *  der/die/das, so verb/noun homographs ("essen" vs "das Essen") and gender
 *  homonyms ("der See" vs "die See") stay distinct. */
export const termFor = (lemma: string, pos: string, gender: string | null): string =>
  pos === 'noun' && gender ? `${gender} ${lemma}` : lemma;

/** Set of case-insensitive full terms already present — cross-level dedupe so we
 *  never re-add an existing card (but still allow legitimate homographs). */
export function existingTerms(corpus: Word[]): Set<string> {
  return new Set(corpus.map((w) => w.term.toLowerCase()));
}

// ---- provenance -----------------------------------------------------------
export interface Provenance {
  id: string;
  lemma: string;
  level: string;
  levelSource: 'reference' | 'frequency' | 'llm';
  freqRank: number | null;
  glossSource: string;              // e.g. "wiktextract:kaikki-de"
  factsSource: string;              // gender/plural/ipa origin
  exampleSource: string | null;     // "tatoeba:<id>" | "wiktextract" | null
  fieldSource: 'llm' | 'heuristic' | 'default';
}

/** Accumulates per-card provenance, merged with any prior run and keyed by id so
 *  the file stays deterministic and re-runs are additive. */
export class ProvenanceLog {
  private map = new Map<string, Provenance>();
  constructor(path?: string) {
    if (path && fileExists(path)) {
      const prev = readJSON<Provenance[]>(path);
      for (const p of prev) this.map.set(p.id, p);
    }
  }
  record(p: Provenance): void { this.map.set(p.id, p); }
  toArray(): Provenance[] {
    return [...this.map.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
}

// ---- prime the corpus matcher --------------------------------------------
// Builds the pipeline's own matcher (./matcher.ts) over a given corpus, so
// coverage/build/validate measure exactly what would "light up". Replaces a
// former dependency on the app's since-removed src/lib/mining.ts; the matcher is
// self-contained and imports only still-present app modules (conjugate, types).
export function primeApp(corpus: Word[]): Matcher {
  return buildMatcher(corpus);
}

// ---- does the example actually contain the headword? ----------------------
//
// The matcher's index is keyed on lowercased surface forms, which is right for
// reading — a learner meeting «BRAUT» at the start of a headline still knows the
// word. It is wrong as *evidence*, and that is a different question: the authoring
// gate and the audits ask "does this sentence teach this card", and answered yes
// for «Er braut Bier» on `die Braut`, «Wer schritt ein?» on `der Schritt`, and
// «Das Ende naht!» on `die Naht`. The letters are there; the word is not.
//
// German settles it without judgement. **A noun is capitalised** — always, not
// usually — so a lowercase token cannot be the noun, whatever its spelling. That
// is an orthographic rule, not a heuristic, which is why this gate is a hard error.
//
// The mirror rule is deliberately NOT enforced. A capitalised token on a verb or
// adjective card is usually a *nominalisation of that very word* — «beim Tanzen»,
// «bei Rot», «im Wesentlichen» — which is ordinary German and teaches the word
// fine. It is occasionally a different lexeme (`wild` illustrated with «Seid ihr
// Wilde?»), and nothing mechanical separates the two. Measured: the noun half
// fires 49 times and every one is a defect; the non-noun half fires 88 and most
// are not. So only the decidable half gates, and the rest is left to the reading
// order in `corpus:sense`. See LESSONS, class 2.
export type Evidence =
  | { ok: true; token: string }
  | { ok: false; why: 'absent' }
  | { ok: false; why: 'miscased'; token: string };

/** Nouns that are correctly written lowercase, with the phrase that does it.
 *
 *  Empty, and measured empty: of the 49 lowercase-noun matches in the corpus on
 *  2026-08-24, none was correct German. The door exists because the class is real
 *  — German lexicalises a few nouns into lowercase predicates (*schuld sein*,
 *  *leid tun*, *recht haben*, *pleite sein*) — and the next author who meets one
 *  should add a row here rather than weaken the rule for everybody. */
export const LOWERCASE_NOUN_OK = new Set<string>([]);

/** Does `de` prove that it teaches `card` — and does the proof survive German
 *  capitalisation? Returns the token that carries the proof. */
export function headwordEvidence(matcher: Matcher, card: Word, de: string): Evidence {
  const mine = matcher.annotate(de).filter((s) => s.isWord && s.word?.id === card.id);
  if (!mine.length) return { ok: false, why: 'absent' };
  for (const s of mine) {
    if (card.pos !== 'noun') return { ok: true, token: s.text };
    const first = s.text[0];
    const capitalised = first === first.toUpperCase() && first !== first.toLowerCase();
    if (capitalised || LOWERCASE_NOUN_OK.has(s.text.toLowerCase())) return { ok: true, token: s.text };
  }
  return { ok: false, why: 'miscased', token: mine[0].text };
}

// ---- generated exercises that contradict their own rule --------------------
//
// `corpus:genex` builds conjugation items from `conjugate()`, which is a fact
// engine and does not know two things a teaching item has to know.
//
// **Some verbs have their own Konjunktiv II** — haben, sein and the modals — and
// the würde-form the generator reaches for is not merely clumsy but wrong. Four
// shipped: «ihr ___ sein» marked *würdet sein* correct where German is **wärt**,
// with the point's own rule sitting on the same screen saying so. That is the
// same defect class as the rule panel that contradicted its question (2026-08-24),
// one layer down: here the *question* contradicts the rule.
//
// **Some verbs have no personal subject at all.** Weather verbs take es and only
// es, so «ich würde regnen» and «ich werde hageln» are not sentences. Three of
// those shipped too.
//
// Seven in a bank of 4,320 generated items — small, and each one is a learner
// being taught a form that is wrong. Hand-verified, repaired in place (never
// deleted: exercise ids are positions and FSRS schedules are keyed on them).
// `werden` is deliberately absent: «ihr würdet Ärzte werden» is ordinary German,
// because there werden is the full verb and würde is the auxiliary.
export const OWN_KONJUNKTIV2 = new Set(
  ['haben', 'sein', 'wissen', 'dürfen', 'können', 'müssen', 'mögen', 'sollen', 'wollen']);
/** Verbs whose only possible subject is `es`.
 *
 *  **Narrowed after the check's first run, which is the standing rule here.** The
 *  obvious list is "weather verbs", and it is wrong: *tauen*, *blitzen*, *donnern*
 *  and *dämmern* all take ordinary personal subjects — «der Schnee taut», «ihre
 *  Augen blitzten», «der Zug donnerte über die Brücke», «der Morgen dämmert» — so
 *  including them fired on three items that were correct German. What is left is
 *  the set that genuinely has no personal subject: precipitation. */
export const IMPERSONAL_VERBS = new Set(
  ['regnen', 'schneien', 'hageln', 'nieseln', 'graupeln']);

/** A generated tense item, parsed: who the subject is and which verb is asked. */
export function parseTenseItem(prompt: string): { person: string; verb: string; tag: string } | null {
  const m = /^(ich|du|er|sie|es|wir|ihr|sie \(Pl\.\))\s+___\s+(\S+?)\.\s*\(([^)]+)\)\s*$/i.exec((prompt ?? '').trim());
  return m ? { person: m[1].toLowerCase(), verb: m[2], tag: m[3] } : null;
}

/** Why this generated item may not ship, or null if it is fine. */
export function tenseItemDefect(prompt: string): string | null {
  const p = parseTenseItem(prompt);
  if (!p) return null;
  if (IMPERSONAL_VERBS.has(p.verb)) {
    return `${p.verb} is impersonal — its subject can only be "es", never "${p.person}"`;
  }
  if (/konjunktiv\s*(ii|2)/i.test(p.tag) && OWN_KONJUNKTIV2.has(p.verb)) {
    return `${p.verb} has its own Konjunktiv II form — a würde-form is wrong here`;
  }
  return null;
}

// ---- two examples that are one example ------------------------------------
//
// A card must carry two examples (`corpus:validate` warns under two), and 18 cards
// satisfied that by carrying the *same sentence twice*, differing only in a full
// stop against an exclamation mark: «Gerne.» / «Gerne!», «Aha!» / «Aha.», «Schreien
// Sie.» / «Schreien Sie!». The standard was met and its purpose was not — the
// learner sees one sentence, and the second review of that card teaches nothing new.
//
// Decidable, so it is a hard error. The *near*-twins are not: 86 further cards have
// a pair above 0.90 character similarity, and 147 have two examples with identical
// English — but that band holds deliberate minimal pairs worth keeping (`der Kopf`
// «Mein Kopf tut weh» / «Mir tut der Kopf weh» teaches the dative construction;
// `der Berliner` «Ich bin Berliner» / «Ich bin ein Berliner» is the joke). Those are
// a reading list in BACKLOG, not a check. See LESSONS, class 2.
export const exampleKey = (de: string): string => (de ?? '')
  .toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
  .replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

// ---- typography no modern German text has ---------------------------------
// Long s and the double hyphen are 16th–19th century printing, and two scraped
// examples shipped with them — one on an **A1** card, «Alſo auff der andern ſeiten
// / gegen mitter⸗nacht…», which is not readable by anyone the card is for.
// `ARCHAIC_SPELLING` below is about *spelling* (daß, muß) and cannot see these,
// because they are characters rather than words.
export const PREMODERN_TYPOGRAPHY = /[ſ⸗]/u;

// ---- pre-1996 orthography -------------------------------------------------
// The reform kept ß only after a long vowel or diphthong, so Fuß / Gruß / groß /
// süß / Straße / weiß are all still correct and must not be flagged — only these
// stems changed.
//
// Three bugs have been written into this rule, which is why it lives in one place
// now. `/\b(muß|daß|…)\b/` under-counted by 13, because `\b` cannot match after ß.
// Dropping the *trailing* boundary made `thun` match inside "Thunfisch" and report
// tuna as 19th-century spelling. Restoring it then stopped "häßliches" matching,
// because a stem plus an inflectional ending is the same word and a compound is
// not. So the boundary stays, and an optional ending is allowed in front of it:
// "häßlich|es" matches, "thun|fisch" does not.
const ARCHAIC_STEMS = [
  'mußtest', 'mußten', 'mußtet', 'mußte', 'mußt', 'muß',
  'müßtest', 'müßten', 'müßtet', 'müßte', 'müßt',
  'wüßtest', 'wüßten', 'wüßte', 'wußten', 'wußte', 'gewußt',
  'daß', 'Kuß', 'Fluß', 'Schluß', 'Nuß', 'Riß', 'Haß', 'Biß',
  'häßlich', 'numeriert', 'Weiber', 'itzt', 'beyder', 'seyn', 'thun', 'gerechtfertiget',
];
export const ARCHAIC_SPELLING = new RegExp(
  '(?<![\\p{L}\\p{N}])(' + ARCHAIC_STEMS.join('|') + ')(e|en|em|er|es|te|ten)?(?![\\p{L}\\p{N}])', 'iu');

// ---- German text in the English definition field ---------------------------
// 367 cards shipped a German definition inside `def`; they live in `defDe` now
// (corpus:germandef) and are shown from B2 up. This is the test that keeps them
// there — and it lives here because it had already been written three times, and
// the third copy was the weakest: validate's list omitted "des" and "mit", so a
// card regressed back to German sailed past a gate that reported PASS.
//
// Parentheticals are stripped first: a good English definition often *quotes*
// German — "(Feminine die See means the sea.)" — and flagging that would punish
// the disambiguation the audit exists to encourage.
const GERMAN_MARKERS = /\b(der|die|das|des|dem|den|dass|eine|einen|einem|einer|nicht|werden|wird|sich|zu|von|mit|beim|jemand|etwas|beschaffen)\b/;
// An English annotation that *quotes* German is not a German definition:
// "female: die Kellnerin", "separable: der Zug fährt … ab", "takes the dative:
// das gehört mir". The first version of this rule moved eleven of these out of
// the English field and left those cards with no definition at all — the German
// they contain is the illustration, not the explanation.
const ENGLISH_LABEL = /^(female|male|separable|inseparable|takes|no plural|abbr\.?|informal|formal|colloquial|literally|lit\.?|also|often|usually|comparative|superlative)\b[^:]*:/i;

/** English prose sitting in the **German** definition field — the mirror of the
 *  rule below, and the shape three cards actually shipped: `fallen` carried
 *  "to fall; to drop; to die; …", an English gloss list, in `defDe`.
 *
 *  Counts stopwords rather than looking for a marker, because a marker test fails
 *  in both directions here and was measured doing so: keyed on German function
 *  words it found one card, and that one was a *false positive* — „an einen Zugang
 *  montierte Schließvorrichtung“ is good German — while `fallen`'s genuine English
 *  slipped past on the word *in*. A ratio survives both: real German definitions
 *  are dense with der/die/das/und/von, English ones with the/of/to/a.
 *
 *  Deliberately not exhaustive. `die Währung` shipped "currency, bank notes and
 *  cents, die Münzen und Banknoten" — half and half — and does not trip this. It
 *  catches the shape that recurs, and says so rather than claiming a clean sweep. */
const EN_STOP = /\b(the|of|a|an|to|and|in|for|is|are|was|were|be|with|that|this|it|as|on|at|by|or|from|not)\b/gi;
const DE_STOP = /\b(der|die|das|den|dem|des|ein|eine|einen|einem|einer|und|oder|als|mit|von|zu|im|auf|für|ist|sind|wird|werden|man|etwas|jemand|jemanden|nicht|sich|bei|aus|nach|über|unter|durch|ohne|dass|beim|zum|zur)\b/gi;
export function isEnglishInGermanField(defDe: string): boolean {
  const raw = (defDe ?? '').trim();
  if (!raw) return false;
  const en = (raw.match(EN_STOP) ?? []).length;
  const de = (raw.match(DE_STOP) ?? []).length;
  return en >= 2 && en > de;
}

export function isGermanDefinition(def: string, en: string): boolean {
  const raw = (def ?? '').trim();
  if (!raw || ENGLISH_LABEL.test(raw)) return false;
  // `die` is an ordinary English verb as well as a German article, and the
  // two-signal test below was satisfied *twice over by that single word*: the
  // English definition "To die in an accident or a disaster." was reported as
  // German and failed the build. It counts as an article only where it behaves
  // like one — immediately before a capitalised noun, as in „die Kellnerin“,
  // which English does not do mid-sentence.
  const outside = raw.replace(/\([^)]*\)/g, ' ').replace(/\bdie\b(?!\s+\p{Lu})/gu, ' ');
  if (!outside.trim()) return false;
  if (GERMAN_MARKERS.test(en ?? '')) return false;   // the gloss itself is German
  return GERMAN_MARKERS.test(outside) && /[äöüß]|\b(der|die|das|des|dem|den|dass)\b/.test(outside);
}

// ---- the lead example -----------------------------------------------------
// The flip face shows ex[0], so the first example *is* the card. This is a
// narrower question than whether a row is corrupt (examples.ts owns that): a
// perfectly valid sentence can still be the wrong one to lead with. Lives here so
// the audit and the fixer (frontfix.ts) can never disagree about what counts.
export function leadProblems(e: { de?: string } | undefined): string[] {
  const de = (e?.de ?? '').trim();
  const out: string[] = [];
  // A card face should show a sentence, not a citation fragment lifted out of a
  // longer line ("geltende Vorschriften").
  if (!/[.!?…]$/.test(de)) out.push('no final punctuation');
  // Past this a phone truncates it, and it is more than one glance of reading.
  if (de.length > 140) out.push('over 140 chars');
  // An opening quote is not itself a defect, and saying it was would have demoted
  // the best example on exactly the words that need it: „Kohle“ ist Umgangssprache
  // für Geld. There the quotation is the subject, which is how you write a sentence
  // *about* a word. What reads as a scrape is a row that *is* a quotation — so the
  // test is where the quote closes, not that it opens.
  const close = de.search(/[“"«]/);
  if (/^[„"»]/.test(de) && (/[“"«]\s*[–—-]\s*[„"»]/.test(de) || close === -1 || close > 30 || close >= de.length - 2)) {
    out.push('is a quoted passage');
  }
  return out;
}

export type { Word, SectorMeta, CEFR };
