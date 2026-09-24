// The machine gate: a card that cannot be verified is not written.
//
// Corpus growth used to be human-gated — "needs a network- and LLM-enabled
// maintainer machine plus human spot-checks of gender/plural/level, not an
// autonomous bulk commit". That rule was protecting something real. A generated
// card is a plausible-looking sentence with a **gender** attached, and a wrong
// gender is worse than a missing card: it is taught, drilled, and remembered.
//
// Removing the gate therefore means replacing it, not deleting it. The insight
// that makes that possible is that authoring a vocabulary card is two different
// jobs wearing one name:
//
//   **Facts** — gender, plural, part of speech, IPA. These are not opinions and
//   must never be generated. They are looked up in de.wiktionary and copied. A
//   disagreement between the candidate and the dictionary is a hard reject.
//
//   **Prose** — the English gloss and the example sentence. These are written,
//   and then *checked mechanically*: the example must contain a real inflection
//   of the headword, which the app's own matcher can prove, and the gloss must
//   pass sanity rules. This is the check that would have caught the ~71 shipped
//   cards whose example does not contain the word at all.
//
// What is left un-machine-checkable is whether a sentence is *good* German. That
// is a real residue and it is not pretended away: the sentences here are short,
// declarative and modelled on the level's own register, and `--report` prints
// every one for reading. But nothing ships on the strength of my say-so about a
// gender, which is what the human gate actually existed to catch.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildMatcher } from '../../src/lib/matcher.ts';
import { headwordEvidence } from '../corpus/lib.ts';
import type { CEFR, Word } from '../../src/types.ts';

const CACHE = join('scripts', 'corpus', 'data', 'wiktionary');

export interface Candidate {
  term: string;
  en: string;
  pos: string;
  level: CEFR;
  field: string;
  def?: string | null;
  ex: { de: string; en: string }[];
  /** Optional — the verifier fills these from the dictionary, and rejects a
   *  disagreement rather than trusting either side silently. */
  gender?: 'der' | 'die' | 'das' | null;
  plural?: string | null;
  ipa?: string | null;
  syn?: string[];
  ant?: string[];
  /** The English gloss is genuinely the same word — *Euro*, *Ticket*, *Taxi*,
   *  *Hotel*. Must be stated, because the failure mode it otherwise hides is a
   *  gloss field left as a copy of the term, which is indistinguishable without
   *  someone saying which one this is. */
  sameAsGerman?: boolean;
}

export interface Verdict {
  term: string;
  ok: boolean;
  card?: Word;
  /** Hard failures. Non-empty means nothing is written. */
  reasons: string[];
  /** Facts the dictionary supplied or confirmed, for the report. */
  notes: string[];
  /** Facts supplied by `verify-rulings.tsv` because the dictionary was silent.
   *  Kept apart from `notes` so `--report` can never let a ruled fact read as a
   *  machine-verified one — the distinction is the entire safeguard. */
  ruled?: string[];
}

// ---- rulings ---------------------------------------------------------------

/** A fact the dictionary does not have, recorded by hand with a citation.
 *
 *  Deliberately narrow: a ruling fills a **silence** — no page, or a page that
 *  states no gender — and can never overturn something the dictionary actually
 *  says. See the header of `verify-rulings.tsv` for why that boundary is where
 *  it is, and for what counts as evidence. */
export interface Ruling {
  term: string;
  field: 'gender' | 'plural' | 'pos' | 'ipa';
  value: string;
  evidence: string;
  date: string;
}

const RULINGS_TSV = join('scripts', 'authoring', 'verify-rulings.tsv');
const RULING_FIELDS = new Set(['gender', 'plural', 'pos', 'ipa']);

/** Parse the rulings file. A malformed row is a hard error, not a skip: a ruling
 *  silently dropped is a card silently rejected, which is the failure this whole
 *  file exists to stop being invisible. */
export function parseRulings(tsv: string): Ruling[] {
  const out: Ruling[] = [];
  for (const [i, line] of tsv.split('\n').entries()) {
    if (!line.trim() || line.startsWith('#')) continue;
    const cols = line.split('\t');
    if (cols[0] === 'term' && cols[1] === 'field') continue; // header
    if (cols.length < 5) throw new Error(`verify-rulings.tsv line ${i + 1}: expected 5 tab-separated columns, got ${cols.length}`);
    const [term, field, value, evidence, date] = cols.map((c) => c.trim());
    if (!RULING_FIELDS.has(field)) throw new Error(`verify-rulings.tsv line ${i + 1}: unknown field "${field}"`);
    if (!value) throw new Error(`verify-rulings.tsv line ${i + 1}: empty value`);
    if (field === 'gender' && !['der', 'die', 'das'].includes(value)) {
      throw new Error(`verify-rulings.tsv line ${i + 1}: gender must be der/die/das, got "${value}"`);
    }
    if (field === 'plural' && !/^die\s/.test(value)) {
      throw new Error(`verify-rulings.tsv line ${i + 1}: plural must carry its article, e.g. "die Häuser"`);
    }
    if (!evidence) throw new Error(`verify-rulings.tsv line ${i + 1}: a ruling needs a citation, not a blank`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`verify-rulings.tsv line ${i + 1}: date must be YYYY-MM-DD`);
    out.push({ term, field: field as Ruling['field'], value, evidence, date });
  }
  return out;
}

export function loadRulings(path = RULINGS_TSV): Ruling[] {
  if (!existsSync(path)) return [];
  return parseRulings(readFileSync(path, 'utf8'));
}

/** The rulings that apply to one term, by field. */
export function rulingsFor(all: Ruling[], term: string): Map<Ruling['field'], Ruling> {
  const m = new Map<Ruling['field'], Ruling>();
  for (const r of all) if (r.term.toLowerCase() === term.toLowerCase()) m.set(r.field, r);
  return m;
}

const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();

/** The page the dictionary actually has, which is not always the term.
 *
 *  The corpus deliberately writes more than a lemma into a headword. Government
 *  notation — `warten auf + A`, `sich verlieben in + A`, `gehören zu + D` — is
 *  there because the preposition *and its case* are the thing being taught, and a
 *  learner who has met `warten` alone has not met the pattern. Reflexive `sich` is
 *  in the term for the same reason.
 *
 *  de.wiktionary has no page under either string. Looking the term up verbatim
 *  therefore rejected two whole card classes on the first character of a
 *  preposition: 38 `verb + prep + case` cards and 90 `sich` cards are already
 *  shipped, and this gate could not have admitted a single one of them. That is
 *  not the dictionary disagreeing — it is the lookup asking the wrong question,
 *  which is the failure this file is least entitled to make.
 *
 *  Facts are still checked against the lemma's own page; only the *lookup key* is
 *  normalised. The term keeps its notation, and the gloss and example checks below
 *  keep comparing against the term, not this. */
const lemmaOf = (t: string) => stripArticle(t)
  .replace(/\s+\S+\s*\+\s*[ADGN]$/i, '')
  .replace(/^sich\s+/i, '')
  .trim();

const GENUS: Record<string, 'der' | 'die' | 'das'> = { m: 'der', f: 'die', n: 'das' };

// ---- the authority ---------------------------------------------------------

/** de.wiktionary wikitext for a page, cached on disk. The cache lives under the
 *  gitignored `scripts/corpus/data/`, the same place every other fetched source
 *  goes — this repo redistributes derived facts, never dumps. */
export async function wikitext(page: string): Promise<string | null> {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${encodeURIComponent(page)}.txt`);
  if (existsSync(file)) {
    const s = readFileSync(file, 'utf8');
    return s === MISSING ? null : s;
  }

  // Two failures look identical to a caller and must not be treated alike. The
  // API saying *this page does not exist* is a durable fact and is cached. A
  // network error, a rate limit or a malformed response is transient, and caching
  // it turns a hiccup into a permanent "no de.wiktionary entry for Fahrer" —
  // which is exactly what happened on the first run of this file, rejecting 40
  // perfectly good candidates for words that plainly exist.
  const url = 'https://de.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json'
    + `&formatversion=2&page=${encodeURIComponent(page)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'lexi-corpus/1.0 (+https://github.com/shamilhzm/lexi)' },
      });
      if (res.status === 429 || res.status >= 500) { await sleep(600 * (attempt + 1)); continue; }
      const json = await res.json() as { parse?: { wikitext?: string }; error?: { code?: string } };
      if (json.parse?.wikitext) {
        writeFileSync(file, json.parse.wikitext);
        return json.parse.wikitext;
      }
      // `missingtitle` is the API telling us the page really is not there.
      if (json.error?.code === 'missingtitle') { writeFileSync(file, MISSING); return null; }
      await sleep(400 * (attempt + 1));
    } catch { await sleep(600 * (attempt + 1)); }
  }
  // Out of attempts, and we still do not know. Say so; do not cache.
  throw new Error(`could not reach de.wiktionary for "${page}"`);
}

const MISSING = '\0MISSING';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Facts {
  /** *All* genders the page attests, not the first one found.
   *
   *  German has real gender pairs — `das Schild` (a sign) beside `der Schild`
   *  (a shield), `das Alter` (age) beside `der Alter` (colloquial old man),
   *  `der Teil` (a portion) beside `das Teil` (a component). Reading only the
   *  first `Genus=` on the page rejected all three of those as contradicting the
   *  dictionary when they do nothing of the kind. A candidate is contradicted
   *  only when its gender is attested nowhere. */
  genders: Set<'der' | 'die' | 'das'>;
  plurals: string[];
  ipa: string | null;
  /** Which German parts of speech the page attests. */
  pos: Set<string>;
}

/** Pull the facts out of the German section's structured templates. Deliberately
 *  narrow: only the fields that are unambiguous in the markup are read, because a
 *  half-parsed dictionary is worse than no dictionary. */
export function parseFacts(wt: string): Facts {
  // Only the German section. Other languages use the same templates and would
  // otherwise donate an English noun's gender to a German card.
  const de = wt.split(/^==\s*[^=]+\s*\(\{\{Sprache\|/m)
    .find((s) => s.startsWith('Deutsch}}')) ?? wt;

  const genders = new Set<'der' | 'die' | 'das'>();
  for (const m of de.matchAll(/\|\s*Genus(?:\s*\d*)?\s*=\s*([mfn])\b/g)) genders.add(GENUS[m[1]]);

  const plurals: string[] = [];
  for (const m of de.matchAll(/\|\s*Nominativ Plural(?:\s*\d+)?\s*=\s*([^\n|}]+)/g)) {
    const pl = m[1].trim();
    if (pl && pl !== '—' && pl !== '-' && !plurals.includes(pl)) plurals.push(pl);
  }

  const ipa = de.match(/\{\{Lautschrift\|([^}|]+)\}\}/);

  const pos = new Set<string>();
  for (const m of de.matchAll(/\{\{Wortart\|([^|}]+)\|Deutsch\}\}/g)) pos.add(m[1].trim());

  return { genders, plurals, ipa: ipa?.[1]?.trim() || null, pos };
}

/** de.wiktionary's part-of-speech names → the corpus vocabulary. */
const POS_MAP: Record<string, string> = {
  Substantiv: 'noun', Verb: 'verb', Adjektiv: 'adjective', Adverb: 'adverb',
  Pronomen: 'pronoun', Präposition: 'preposition', Konjunktion: 'conjunction',
  // de.wiktionary's category is *Numerale*; the corpus has always written `number`
  // (17 cards, `null` through `zwölf`). The map said 'numeral', which matches no
  // card and no `ALLOWED_POS` entry, so the gate could not author a single
  // numeral — caught trying to add `tausend`, which the corpus is missing.
  Numerale: 'number', Zahlwort: 'number', Interjektion: 'interjection', Partikel: 'particle',
  Subjunktion: 'conjunction', Artikel: 'article',
};

// ---- the checks ------------------------------------------------------------

/** Does this example actually contain the word it is teaching?
 *
 *  Uses the app's own matcher, so "contains" means what it means everywhere else
 *  in Lexi: a real inflection resolves to this card. A substring test would pass
 *  *"Meine Tochter möchte gern reiten lernen"* for `das Pferd` — which is exactly
 *  how ~71 such cards shipped. */
export function exampleTeachesWord(card: Word, de: string, corpus: Word[] = []): boolean {
  // Built over the **shipped corpus plus the draft**, not over the draft alone.
  //
  // A lexicon of one gives the conjugator less knowledge than the app has, and it
  // shows up on separable verbs: `einteilen` only splits to *teilen … ein* when
  // `teilen` is a verb it has heard of, and with a single card it never is. The
  // effect was a false reject — "example does not contain einteilen" for a
  // sentence that reads *Wir teilen den Kurs in vier Abschnitte ein* — which is
  // the worst kind of gate failure, because it rejects the correct example and
  // invites the author to write a worse one.
  //
  // The identity check stays on `card.id`, so a sentence that merely contains
  // some *other* corpus word still fails: the draft has to be what lights up.
  //
  // "Contains" also means *correctly cased*. A German noun is always capitalised,
  // so a lowercase token that happens to spell it is the homograph and not the
  // word: this gate passed «Er braut Bier» for `die Braut` and «Wer schritt ein?»
  // for `der Schritt`, and both shipped. `headwordEvidence` is the shared rule,
  // used by `corpus:validate` and by `fix-authored` for the same reason.
  const m = buildMatcher([...corpus, card]);
  return headwordEvidence(m, card, de).ok;
}

const GLOSS_MAX = 80;

/** Verify one candidate against the dictionary and the matcher. */
export async function verify(c: Candidate, existing: Set<string>, corpus: Word[] = [],
                             rulings: Ruling[] = []): Promise<Verdict> {
  const reasons: string[] = [];
  const notes: string[] = [];
  // Facts taken from `verify-rulings.tsv`. Collected separately from `notes` and
  // surfaced separately by `--report`: the whole point of a ruling is that the
  // reader can see it *was* one.
  const ruled: string[] = [];
  const rules = rulingsFor(rulings, c.term);
  /** Apply a ruling only into a gap. Every call site checks the dictionary was
   *  silent first, which is what makes it structurally impossible for this file
   *  to overturn something de.wiktionary actually says. */
  const fill = (field: Ruling['field'], apply: (r: Ruling) => void): void => {
    const r = rules.get(field);
    if (!r) return;
    apply(r);
    ruled.push(`${field} "${r.value}" — ruled ${r.date}: ${r.evidence}`);
  };
  const head = stripArticle(c.term);
  const lemma = lemmaOf(c.term);

  if (existing.has(c.term.toLowerCase())) {
    return { term: c.term, ok: false, reasons: ['already in the corpus'], notes, ruled };
  }

  let wt: string | null;
  try { wt = await wikitext(lemma); }
  catch (e) {
    // Unreachable is not the same as unattested, and must not silently reject —
    // and a ruling must not rescue it either. Not knowing is not silence, and a
    // file that let a network blip become a permanent bypass would be the exact
    // hole the machine gate was built to close.
    return { term: c.term, ok: false, reasons: [(e as Error).message], notes, ruled };
  }
  if (!wt && !rules.size) {
    return {
      term: c.term, ok: false, notes, ruled,
      reasons: [`no de.wiktionary entry for "${lemma}" — if the word is real and the dictionary`
        + ` simply has no page, record the facts with their evidence in`
        + ` scripts/authoring/verify-rulings.tsv`],
    };
  }
  if (!wt) notes.push(`no de.wiktionary page for "${lemma}" — proceeding on rulings alone`);
  if (lemma !== head) notes.push(`facts checked against lemma "${lemma}"`);
  const facts: Facts = wt
    ? parseFacts(wt)
    : { genders: new Set(), plurals: [], ipa: null, pos: new Set() };

  // Rulings fill gaps, in that order, and only gaps. Each `if` is the proof that
  // the dictionary said nothing here.
  // Tracked, because the confirmation note below would otherwise say "the page
  // also attests das" about a page that does not exist — a ruled fact reading as
  // a machine-verified one, in the one place the distinction has to hold.
  let genderRuled = false;
  if (!facts.genders.size) fill('gender', (r) => { facts.genders.add(r.value as 'der' | 'die' | 'das'); genderRuled = true; });
  if (!facts.plurals.length) fill('plural', (r) => facts.plurals.push(stripArticle(r.value)));
  if (!facts.ipa) fill('ipa', (r) => { facts.ipa = r.value; });

  // --- part of speech ---
  const attested = new Set([...facts.pos].map((p) => POS_MAP[p]).filter(Boolean));
  // Merged after the map, not before: a ruling names a *corpus* part of speech,
  // not one of de.wiktionary's German category names.
  if (!attested.size) fill('pos', (r) => attested.add(r.value));
  if (attested.size && !attested.has(c.pos)) {
    reasons.push(`pos "${c.pos}" not attested (dictionary has ${[...attested].join(', ') || 'none mapped'})`);
  }

  // --- gender: the field the human gate existed for ---
  let gender = c.gender ?? null;
  if (c.pos === 'noun') {
    if (!facts.genders.size) reasons.push('dictionary states no gender');
    else if (gender && !facts.genders.has(gender)) {
      reasons.push(`gender ${gender} contradicted — dictionary attests ${[...facts.genders].join('/')}`);
    } else if (!gender) {
      if (facts.genders.size > 1) {
        // Ambiguous, and guessing is the one thing this file exists to prevent.
        reasons.push(`dictionary attests ${[...facts.genders].join('/')} — state the gender explicitly`);
      } else {
        gender = [...facts.genders][0];
        notes.push(`gender ${gender} from dictionary`);
      }
    } else if (genderRuled) notes.push(`gender ${gender} matches the ruling; the dictionary states none`);
    else notes.push(`gender ${gender} confirmed (page also attests ${[...facts.genders].join('/')})`);
    if (gender && !new RegExp(`^${gender}\\s`, 'i').test(c.term)) {
      reasons.push(`term "${c.term}" does not carry its article "${gender}"`);
    }
  } else if (gender) {
    reasons.push('non-noun carries a gender');
  }

  // --- plural ---
  let plural = c.plural ?? null;
  if (c.pos === 'noun' && facts.plurals.length) {
    const attestedPl = facts.plurals.map((p) => p.toLowerCase());
    if (plural && !attestedPl.includes(stripArticle(plural).toLowerCase())) {
      reasons.push(`plural "${plural}" contradicted — dictionary has ${facts.plurals.join(' / ')}`);
    } else if (!plural && facts.plurals.length === 1) {
      plural = `die ${facts.plurals[0]}`;
      notes.push(`plural "${plural}" from dictionary`);
    } else if (!plural) {
      notes.push(`several plurals attested (${facts.plurals.join(' / ')}) — left unset`);
    }
  }

  // --- ipa ---
  let ipa = c.ipa ?? null;
  if (!ipa && facts.ipa) { ipa = facts.ipa; notes.push('IPA from dictionary'); }

  // --- gloss sanity ---
  const gloss = (c.en || '').trim();
  if (!gloss) reasons.push('no English gloss');
  else if (gloss.length > GLOSS_MAX) reasons.push(`gloss over ${GLOSS_MAX} chars`);
  else if (gloss.toLowerCase() === head.toLowerCase() && !c.sameAsGerman) {
    reasons.push('gloss repeats the German term (set sameAsGerman if that is correct)');
  } else if (c.sameAsGerman && gloss.toLowerCase() !== head.toLowerCase()) {
    reasons.push('sameAsGerman is set but the gloss differs from the term');
  }
  else if (!/[a-z]/i.test(gloss)) reasons.push('gloss has no letters');
  if (/[äöüß]/i.test(gloss.replace(/\b[A-ZÄÖÜ][\wäöüß-]*/g, ''))) {
    reasons.push('gloss looks like German, not English');
  }

  // --- examples ---
  if (!c.ex?.length) reasons.push('no example sentences');
  if (c.ex.length < 2) reasons.push('needs at least two examples (corpus floor)');

  const draft: Word = {
    id: `voc:${c.level}:${c.term}`,
    term: c.term, en: gloss, pos: c.pos, level: c.level,
    gender, plural, ipa, def: c.def ?? null,
    syn: c.syn ?? [], ant: c.ant ?? [], ex: [], field: c.field, kind: 'word',
  };

  for (const [i, e] of (c.ex ?? []).entries()) {
    if (!e.de?.trim() || !e.en?.trim()) { reasons.push(`example ${i + 1} is incomplete`); continue; }
    if (!/[.!?]$/.test(e.de.trim())) reasons.push(`example ${i + 1} has no sentence-final punctuation`);
    if (!exampleTeachesWord(draft, e.de, corpus)) {
      reasons.push(`example ${i + 1} does not contain "${head}" — "${e.de}"`);
    }
    // Umlauts inside a capitalised word are a name — "Mr Müller", "Köln" — and a
    // perfectly ordinary thing to find in an English sentence.
    const enWithoutNames = e.en.replace(/\b[A-ZÄÖÜ][\wäöüß-]*/g, '');
    if (/[äöüß]/i.test(enWithoutNames)) reasons.push(`example ${i + 1}'s translation looks like German`);
  }

  draft.ex = (c.ex ?? []).map((e) => ({ de: e.de.trim(), en: e.en.trim(), lvl: c.level }));

  return { term: c.term, ok: reasons.length === 0, card: reasons.length ? undefined : draft, reasons, notes, ruled };
}

/** Verify a batch, sequentially and with a pause between uncached lookups so a
 *  hundred-card batch does not read as a scraper to Wikimedia. */
export async function verifyAll(cands: Candidate[], existing: Set<string>,
                                corpus: Word[] = [], rulings = loadRulings()): Promise<Verdict[]> {
  // The sectors that actually exist. A card filed under a name nobody uses is not
  // a linguistic error, so none of the dictionary checks below can see it — and on
  // 2026-08-15 a batch invented three ("Restaurant & Ordering", "Feelings &
  // Emotions", "Time & Dates") and passed every one of them. `corpus:validate`
  // catches it afterwards, but this file's promise is that it *refuses to write a
  // card it cannot verify*, and a sector is part of the card.
  const sectors = new Set(corpus.map((w) => w.field).filter(Boolean));
  const out: Verdict[] = [];
  for (const c of cands) {
    const cached = existsSync(join(CACHE, `${encodeURIComponent(stripArticle(c.term))}.txt`));
    const v = await verify(c, existing, corpus, rulings);
    if (sectors.size && !sectors.has(c.field)) {
      const near = [...sectors].filter((s2) => s2.toLowerCase().includes(c.field.split(/[&,]/)[0].trim().toLowerCase()));
      v.ok = false;
      v.reasons.push(`no sector named "${c.field}"${near.length ? ` — did you mean ${near.slice(0, 3).map((n) => `"${n}"`).join(', ')}?` : ''}`);
    }
    out.push(v);
    if (!cached) await sleep(150);
  }
  return out;
}
