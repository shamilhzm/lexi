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
import { buildIndex, compose, deriveNoun, fugenIpa, type Derivation } from './derive.ts';
import { wikidataGender } from '../corpus/wikidata.ts';
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
export async function verify(c: Candidate, existing: Set<string>, corpus: Word[] = []): Promise<Verdict> {
  const reasons: string[] = [];
  const notes: string[] = [];
  const head = stripArticle(c.term);
  const lemma = lemmaOf(c.term);

  if (existing.has(c.term.toLowerCase())) {
    return { term: c.term, ok: false, reasons: ['already in the corpus'], notes };
  }

  let wt: string | null;
  try { wt = await wikitext(lemma); }
  catch (e) {
    // Unreachable is not the same as unattested, and must not silently reject.
    return { term: c.term, ok: false, reasons: [(e as Error).message], notes };
  }

  // A missing page is not a missing word. No dictionary lists every compound a
  // language can form, and `die Arbeitsatmosphäre` was refused here for being
  // ordinary German. Where the page is absent — or present and silent on gender,
  // which is how `die Fachleute` was refused — German's own rules are consulted
  // instead. See `derive.ts` for what those rules will and will not say.
  const derived = c.pos === 'noun' ? deriveNoun(head, buildIndex(corpus)) : null;

  if (!wt && !derived) {
    return { term: c.term, ok: false, reasons: [`no de.wiktionary entry for "${lemma}"`], notes };
  }
  if (!wt) notes.push(`no de.wiktionary page — facts derived, not attested`);
  if (wt && lemma !== head) notes.push(`facts checked against lemma "${lemma}"`);
  const facts = wt ? parseFacts(wt) : { genders: new Set<'der' | 'die' | 'das'>(), plurals: [], ipa: null, pos: new Set<string>() };

  // --- part of speech ---
  const attested = new Set([...facts.pos].map((p) => POS_MAP[p]).filter(Boolean));
  if (attested.size && !attested.has(c.pos)) {
    reasons.push(`pos "${c.pos}" not attested (dictionary has ${[...attested].join(', ') || 'none mapped'})`);
  }

  // --- a third opinion, from a source that is neither a dictionary nor a rule ---
  //
  // Wikidata lexemes are CC0 and cover 97% of the corpus's nouns; cross-checked in
  // bulk on 2026-08-29 they agreed with Lexi on gender 3,503 times out of 3,506.
  // Consulted for **every** noun, not only the ones wiktionary misses, because the
  // moment a card is authored is the cheapest moment a wrong gender can be caught —
  // and a corpus with one authority cannot be wrong out loud.
  //
  // Unreachable is not unattested: a network failure leaves this `null` and changes
  // nothing, exactly as it does for wiktionary above.
  let wdGenders: string[] | null = null;
  if (c.pos === 'noun') {
    try { wdGenders = await wikidataGender(head); }
    catch { notes.push('wikidata unreachable — not consulted'); }
  }

  // --- gender: the field the human gate existed for ---
  let gender = c.gender ?? null;
  if (c.pos === 'noun') {
    if (!facts.genders.size && derived) {
      // The rule fills the fact, and never overrides one: this branch is only
      // reached when the dictionary attests no gender at all.
      if (gender && gender !== derived.gender) {
        reasons.push(`gender ${gender} contradicted by the ${derived.why}, which gives ${derived.gender}`);
      } else {
        gender = derived.gender;
        notes.push(`gender ${gender} DERIVED — ${derived.why}`);
      }
    }
    else if (!facts.genders.size && wdGenders?.length === 1) {
      if (gender && gender !== wdGenders[0]) {
        reasons.push(`gender ${gender} contradicted — wikidata attests ${wdGenders[0]}`);
      } else {
        gender = wdGenders[0] as 'der' | 'die' | 'das';
        notes.push(`gender ${gender} from wikidata (no wiktionary page, no rule applies)`);
      }
    }
    else if (!facts.genders.size && wdGenders && wdGenders.length > 1) {
      reasons.push(`wikidata attests ${wdGenders.join('/')} — state the gender explicitly`);
    }
    else if (!facts.genders.size) reasons.push('dictionary states no gender');
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
    } else notes.push(`gender ${gender} confirmed (page also attests ${[...facts.genders].join('/')})`);
    if (gender && !new RegExp(`^${gender}\\s`, 'i').test(c.term)) {
      reasons.push(`term "${c.term}" does not carry its article "${gender}"`);
    }
    // The cross-check, run last so it sees the gender whatever settled it. A
    // disagreement between two independent sources is a reason to stop, not to hold
    // a vote — the same rule this file already applies to the candidate and the
    // dictionary. The one shape that trips it honestly is a plural-only card, where
    // Lexi's «die» is the plural article and wikidata is describing the singular.
    if (gender && wdGenders?.length && !wdGenders.includes(gender)) {
      reasons.push(`gender ${gender} contradicted by wikidata, which attests ${wdGenders.join('/')}`
        + ' — if this card is plural-only, say so in the plural field rather than the gender');
    } else if (gender && wdGenders?.includes(gender)) {
      notes.push('gender confirmed by wikidata');
    }
  } else if (gender) {
    reasons.push('non-noun carries a gender');
  }

  // --- plural ---
  let plural = c.plural ?? null;
  if (c.pos === 'noun' && !facts.plurals.length && !plural && derived?.plural) {
    plural = derived.plural;
    notes.push(`plural "${plural}" DERIVED from the head — ${derived.why}`);
  }
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
  // A compound with no page of its own still has attested parts. `compose` puts one
  // primary stress on the first constituent, which is what a German compound has —
  // the naive concatenation produces two. The parts must each be attested; one miss
  // leaves the card without a transcription rather than with a guessed one.
  if (!ipa && derived?.parts) {
    const got: string[] = [];
    for (const part of derived.parts) {
      let pwt: string | null = null;
      try { pwt = await wikitext(part); } catch { break; }
      const pi = pwt ? parseFacts(pwt).ipa : null;
      if (!pi) break;
      got.push(pi);
    }
    if (got.length === derived.parts.length) {
      // The linking element is in neither constituent's entry and is in the word.
      got[0] += fugenIpa(derived.fugen);
      ipa = compose(got);
      notes.push(`IPA COMPOSED from ${derived.parts.map((p, i) => `${p} /${got[i]}/`).join(' + ')}`);
    }
  }

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

  return { term: c.term, ok: reasons.length === 0, card: reasons.length ? undefined : draft, reasons, notes };
}

/** Verify a batch, sequentially and with a pause between uncached lookups so a
 *  hundred-card batch does not read as a scraper to Wikimedia. */
export async function verifyAll(cands: Candidate[], existing: Set<string>,
                                corpus: Word[] = []): Promise<Verdict[]> {
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
    const v = await verify(c, existing, corpus);
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
