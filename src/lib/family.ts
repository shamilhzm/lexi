// Word families (persona C1 #45): nehmen / annehmen / benehmen / unternehmen /
// entnehmen is one story, and the app told it as fifteen unrelated cards. At C1
// the prefix *is* the lesson — the base carries the meaning and the prefix bends
// it — so showing the family turns fifteen memorisations into one system.
//
// Derived, not authored, and deliberately only for verbs. German morphology
// defeats naive stemming: "antworten" is not "an" + "tworten", and a guessed
// family would attach the wrong story to the wrong word — worse than none. The
// guard is the one the conjugation engine already uses for exactly this reason: a
// prefix only counts if the remainder is itself a verb the lexicon knows.
//
// Nouns and adjectives are excluded on purpose. "Nahme"/"angenehm" belong to the
// nehmen family too, but recovering them needs derivational morphology the app has
// no reliable model for, and a family that is 60% right teaches 40% wrong.
import type { Word } from '../types.ts';

/** Prefixes that can front a verb, longest first so "zurück" wins over "zu". */
const PREFIXES = [
  'gegenüber', 'zusammen', 'zurück', 'hinter', 'wieder', 'gegen', 'durch',
  'unter', 'wider', 'voll', 'miss', 'nach', 'über', 'aus', 'auf', 'ein', 'ent',
  'emp', 'ver', 'zer', 'bei', 'her', 'hin', 'los', 'mit', 'ab', 'an', 'be',
  'er', 'ge', 'um', 'vor', 'weg', 'zu',
].sort((a, b) => b.length - a.length);

/** The bare infinitive: no reflexive pronoun, lower-cased. */
export const infinitive = (term: string) => term.replace(/^sich\s+/i, '').trim().toLowerCase();

/**
 * Group the lexicon's verbs into families keyed by their base infinitive.
 *
 * A verb joins a family only when stripping a known prefix leaves a verb that is
 * itself in the lexicon — the `isKnownRoot` rule, applied here over the corpus
 * rather than the engine's table.
 */
export function buildFamilies(words: Word[]): Map<string, string[]> {
  const verbs = words.filter((w) => w.kind === 'word' && w.pos === 'verb');
  const known = new Set(verbs.map((w) => infinitive(w.term)));

  const baseOf = (term: string): string => {
    const inf = infinitive(term);
    for (const p of PREFIXES) {
      // The +2 keeps a prefix from swallowing a word that is barely longer than it.
      if (inf.length > p.length + 2 && inf.startsWith(p) && known.has(inf.slice(p.length))) {
        return inf.slice(p.length);
      }
    }
    return inf;
  };

  const fam = new Map<string, string[]>();
  for (const w of verbs) {
    const base = baseOf(w.term);
    const members = fam.get(base) ?? [];
    // The corpus carries some lemmas at two levels; a family is a set of words,
    // not of cards, so the same infinitive is listed once.
    if (!members.some((m) => infinitive(m) === infinitive(w.term))) members.push(w.term);
    fam.set(base, members);
  }
  return fam;
}

// A reverse index — infinitive → its siblings, already ordered. Built once and
// looked up in constant time, so the reveal can call this on every render without
// a memo hook. (The first version used useMemo in the component and landed after
// an early return, which is a rules-of-hooks violation; the fix belongs here.)
let cache: Map<string, string[]> | null = null;

/** Test seam — families are derived from the live lexicon, which tests replace. */
export function resetFamilies() { cache = null; }

function index(words: Word[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [base, members] of buildFamilies(words)) {
    if (members.length < 2) continue;
    for (const m of members) {
      const others = members.filter((x) => infinitive(x) !== infinitive(m));
      others.sort((a, b) => {
        if (infinitive(a) === base) return -1;
        if (infinitive(b) === base) return 1;
        return a.localeCompare(b, 'de');
      });
      out.set(infinitive(m), others);
    }
  }
  return out;
}

/**
 * The other members of this word's family, base first then alphabetically.
 * Empty when the word has no relatives, which is the common case.
 */
export function familyOf(word: Word, words: Word[], limit = 6): string[] {
  if (word.pos !== 'verb') return [];
  if (!cache) cache = index(words);
  return (cache.get(infinitive(word.term)) ?? []).slice(0, limit);
}
