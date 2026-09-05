// The one search over the lexicon.
//
// It lived inside `views/Words.tsx` and was reachable only by opening that tab —
// which is fine for "show me the food words" and wrong for the question people
// actually reach for a phone to answer: **what does this word mean?** That
// question is asked in the middle of a book, a chat, a lecture, and the app it
// is asked of is whichever one is fewest taps away. Now it is a magnifier in the
// top bar on every surface, and this module is what both doors call, so the
// ranking cannot drift into two versions of itself.
import { WORDS } from '../data/index.ts';
import type { Word } from '../types.ts';

/** How many hits to render. The list is a look-up aid, not a results page: past
 *  a couple of dozen rows nobody is reading, they are refining the query. */
export const MAX_HITS = 40;

/** The shortest query worth ranking. Below this every second word in the corpus
 *  matches and the list is noise. */
export const MIN_QUERY = 2;

/** Fold the German for search: umlauts and ß are the two things a learner on an
 *  English keyboard cannot type, and a search that demands them is a search that
 *  fails on *Übung*, *schön* and *heiß* — which is most of the words anyone looks
 *  up in a hurry. Same folding the matcher uses, kept local because this is a
 *  presentation concern and does not want a dependency on the study path. */
export function fold(s: string): string {
  return s.toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/** `term` carries the article for nouns ("das Haus"), which is right on a card
 *  and wrong for matching: without stripping it, *nothing a learner types for a
 *  noun is ever an exact or a prefix hit*. Measured — searching "haus" put
 *  `das Haus` fourth, behind *Autohaus*, *Gasthaus* and *Gehäuse*, because the
 *  only rung it could reach was "contains". Both forms are matched, so typing
 *  the article still works. */
const ARTICLE = /^(?:der|die|das)\s+/i;

/** A gloss is often several senses — "restaurant, inn, guesthouse". Ranked as a
 *  whole string, only the first sense can ever be a prefix hit. */
function senses(en: string): string[] {
  return en.split(/[,;]/).map((p) => fold(p)).filter(Boolean);
}

/** Rank: exact, then prefix, then anywhere — German side before English, because
 *  someone typing "Haus" wants *das Haus* and not the four English glosses that
 *  happen to contain the letters. Ties break on the shorter headword, so the
 *  base word beats its compounds. */
export function search(q: string): Word[] {
  const f = fold(q.trim());
  if (f.length < MIN_QUERY) return [];
  const out: { w: Word; score: number }[] = [];
  for (const w of WORDS) {
    const full = fold(w.term);
    const bare = fold(w.term.replace(ARTICLE, ''));
    const en = senses(w.en ?? '');
    let score = -1;
    if (full === f || bare === f) score = 0;
    else if (bare.startsWith(f) || full.startsWith(f)) score = 1;
    else if (en.some((e) => e === f)) score = 2;
    else if (en.some((e) => e.startsWith(f))) score = 3;
    else if (bare.includes(f)) score = 4;
    else if (en.some((e) => e.includes(f))) score = 5;
    if (score >= 0) out.push({ w, score });
  }
  out.sort((a, b) => a.score - b.score
    || a.w.term.length - b.w.term.length
    || a.w.term.localeCompare(b.w.term, 'de'));
  return out.slice(0, MAX_HITS).map((h) => h.w);
}
