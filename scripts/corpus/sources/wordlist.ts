// German Categorized Wordlist parser (CC BY 4.0, ynsrc/german-categorized-wordlist).
// A set of plain-text files, one bare entry per line, categorized by part of
// speech; nouns are split into der/die/das files (gender is encoded by the file,
// not an inline article) with a separate list of plural forms.
//
// Used as an INDEPENDENT cross-source, never authoritative on its own (the
// upstream README warns entries may be miscategorized or wrong):
//   • gender/plural validation against the corpus  (crosscheck.ts)
//   • a gender fallback for nouns Wiktextract can't gender  (build.ts)
//   • curated closed-class vocab for hand-authored grammar tracks
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type Gender = 'der' | 'die' | 'das';

export interface Wordlist {
  gender: Map<string, Gender>;   // lowercased noun → its single attested gender
  genderAmbig: Set<string>;      // nouns attested in >1 gender file (der/die See) — skip
  plural: Set<string>;           // lowercased nominative plural surface forms
  pos: Map<string, string>;      // lowercased word → Word.pos (first file wins)
}

// Noun files → the gender they encode.
const NOUN_GENDER_FILES: [string, Gender][] = [
  ['noun-der.txt', 'der'], ['noun-die.txt', 'die'], ['noun-das.txt', 'das'],
];
// POS files → Word.pos. Only classes the app teaches; proper nouns/numbers/affixes
// are intentionally left out (they aren't learnable vocab cards).
const POS_FILES: Record<string, string> = {
  'verb.txt': 'verb', 'adjective.txt': 'adjective', 'adverb.txt': 'adverb',
  'preposition.txt': 'preposition', 'conjunction.txt': 'conjunction',
  'particle.txt': 'particle', 'interjection.txt': 'interjection',
};

// Strip a defensive leading article and lowercase to the corpus's lemmaKey shape.
const norm = (s: string) => s.replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();

function readLines(path: string): string[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Read whatever wordlist files are present under `dir`. Missing files are
 *  skipped, so the pipeline degrades to a no-op when the source isn't fetched. */
export function loadWordlist(dir: string): Wordlist {
  // Collect every gender a noun is filed under, then split single vs ambiguous.
  const genders = new Map<string, Set<Gender>>();
  for (const [file, g] of NOUN_GENDER_FILES) {
    for (const w of readLines(join(dir, file))) {
      const k = norm(w); if (!k) continue;
      (genders.get(k) ?? genders.set(k, new Set()).get(k)!).add(g);
    }
  }
  const gender = new Map<string, Gender>();
  const genderAmbig = new Set<string>();
  for (const [k, set] of genders) {
    if (set.size === 1) gender.set(k, [...set][0]);
    else genderAmbig.add(k);
  }

  const plural = new Set<string>();
  for (const w of readLines(join(dir, 'noun-plural.txt'))) { const k = norm(w); if (k) plural.add(k); }

  const pos = new Map<string, string>();
  for (const [file, p] of Object.entries(POS_FILES)) {
    for (const w of readLines(join(dir, file))) { const k = norm(w); if (k && !pos.has(k)) pos.set(k, p); }
  }

  return { gender, genderAmbig, plural, pos };
}

/** Raw entries from a single wordlist file (for pulling closed-class vocab such
 *  as contractions/connectors into hand-authored grammar tracks). [] if absent. */
export function readWordlistFile(dir: string, file: string): string[] {
  return readLines(join(dir, file));
}

// Proper-noun files → an exclusion set. News frequency surfaces surnames, given
// names and place names as common-noun headwords (Müller "miller", Wagner
// "cartwright", Jürgen, Klaus); Wiktextract lists them, so build.ts drops any
// candidate whose lemma is attested here. Empty (no-op) when the files aren't fetched.
const PROPER_NOUN_FILES = ['noun-proper.txt', 'noun-proper-first-name.txt', 'noun-proper-surname.txt'];

/** Lowercased set of attested proper nouns from the categorized wordlist. */
export function loadProperNouns(dir: string): Set<string> {
  const s = new Set<string>();
  for (const file of PROPER_NOUN_FILES) for (const w of readWordlistFile(dir, file)) { const k = norm(w); if (k) s.add(k); }
  return s;
}
