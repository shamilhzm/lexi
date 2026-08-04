// Corpus hygiene at the boundary.
//
// The lexicon is assembled from open sources (Wiktextract, Tatoeba) and a handful
// of rows carry that provenance into the UI. The one that surfaced in a session:
//
//   voc:A1:täglich  de: "Unser täglich Brot gib uns heute\nGive us today our daily bread"
//                   en: "Give us today our daily bread"
//
// — the German field holds a German half, a newline, and its own English. HTML
// collapses the newline to a space, so the card printed a run-on bilingual line
// and then printed the English again underneath it.
//
// An audit of all 16,201 shipped examples found it is not a one-off:
//    12  splice German and English into one field with a newline
//    26  carry Wiktionary citation apparatus — "(please add an English translation
//        of this quotation)" as the *translation*, and "1812, the Brothers Grimm,
//        Kinder- und Haus-Märchen, Berlin, die Realschulbuchhandlung, page VIII"
//        as the *German sentence*
//    45  have no English at all
//   126  run over 160 characters, up to a 795-character Luther passage on „die
//        Frau“ — a word in the first hundred anybody learns
//
// The corpus is being repaired in reviewable batches (`npm run corpus:examples`),
// but that JSON is already on real devices, so this runs at load instead: a
// defective row degrades to one clean sentence rather than rendering garbage.
// Every function here is pure and exported so the real offenders can be pinned as
// fixtures — see examples.test.ts.
import type { Example } from '../types.ts';

/** Citation apparatus that belongs in a dictionary's footnotes, not on a
 *  flashcard. Tightened against the shipped corpus until it produced zero false
 *  positives on 16,201 examples — every hit is genuine bibliography or an
 *  untranslated-quotation placeholder. In particular the year-lead pattern only
 *  fires on a *leading* "1812," / "c. 1500;", never on a date inside a sentence. */
const CRUFT = new RegExp([
  'please add an English translation',   // Wiktionary's untranslated-quote placeholder
  '^\\s*(c\\.\\s*)?\\d{3,4}\\s*[,;]',    // "1812, the Brothers Grimm, …"
  '\\bretrieved\\s+\\d',                 // "…, retrieved 1 July 2022"
  '\\bpage\\s+[IVXLCDM\\d]+\\b',         // "…, page VIII"
  '\\bISBN\\b',
  '\\[sic\\]',
].join('|'), 'i');

/** An example longer than this is unusable on a phone whatever its provenance.
 *  Deliberately generous — the median example is 38 characters and the 90th
 *  percentile is 60, so this only catches quoted literature, not ordinary B2/C1
 *  sentences. The 160–220 band is a judgement call and is left to the authoring
 *  batches rather than decided here. */
export const MAX_EXAMPLE_CHARS = 220;

const clean = (s: string) => s
  .replace(/^\s*\[(?:…|\.\.\.)\]\s*/, '')  // a leading elision marker, "[...] und manche…"
  .replace(/\s+/g, ' ')
  .trim();

/** The first usable line of a possibly-multi-line field.
 *
 *  Multi-line values here are spliced quotations (several verses, or a citation
 *  line followed by the text). One clean sentence beats a stitched one, so this
 *  picks rather than joins: drop the citation lines, drop any line that is just
 *  the other field's text, take the first thing left. */
function firstUsableLine(raw: string, other: string): string {
  const otherKey = clean(other).toLowerCase();
  for (const line of raw.split('\n')) {
    const c = clean(line);
    if (!c || CRUFT.test(c)) continue;
    if (otherKey && c.toLowerCase() === otherKey) continue;
    return c;
  }
  return '';
}

/** Sanitize one example. Returns null when nothing usable survives — the card
 *  then renders with one fewer example, which every surface already handles. */
export function cleanExample(e: Example): Example | null {
  if (!e || typeof e.de !== 'string') return null;
  const en0 = typeof e.en === 'string' ? e.en : '';
  let de = firstUsableLine(e.de, en0);
  let en = firstUsableLine(en0, e.de);

  // „…gib uns heute Give us today our daily bread“: the German field ends with
  // its own translation even after the newline split, because the split may have
  // yielded a single line containing both.
  if (en && de.toLowerCase().endsWith(en.toLowerCase()) && de.length > en.length) {
    de = clean(de.slice(0, de.length - en.length));
  }
  // A German field that *is* the English tells us the row is inverted, not fixable.
  if (!de || (en && de.toLowerCase() === en.toLowerCase())) return null;
  if (CRUFT.test(de)) return null;
  if (en && CRUFT.test(en)) en = '';

  return { de, en, lvl: e.lvl };
}

/** Sanitize a card's example list.
 *
 *  Over-long examples are dropped only when a usable shorter one remains: a card
 *  with a single 300-character example still shows it, because a card with no
 *  example at all teaches less than a card with an awkward one. */
export function cleanExamples(list: Example[] | undefined): Example[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  const kept = list.map(cleanExample).filter((e): e is Example => e !== null);
  const short = kept.filter((e) => e.de.length <= MAX_EXAMPLE_CHARS);
  if (short.length) return short;
  // Everything is over the ceiling — keep the least bad one rather than none.
  return kept.length ? [kept.reduce((a, b) => (b.de.length < a.de.length ? b : a))] : [];
}
