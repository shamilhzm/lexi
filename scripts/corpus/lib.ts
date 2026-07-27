// Shared helpers for the corpus pipeline: corpus IO, dedupe keys, deterministic
// ordering, provenance tracking, and priming the real app matcher so coverage
// and validation measure exactly what the reader would light up.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildMatcher, type Matcher } from './matcher.ts';
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
export function isGermanDefinition(def: string, en: string): boolean {
  const outside = (def ?? '').replace(/\([^)]*\)/g, ' ');
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
