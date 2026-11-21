// The address of a word page: `/wort/<slug>` (docs/PAGES.md).
//
// One function for the page build (`scripts/pages/build.ts`), its measurement and the
// app, so a link the app makes and the page it points to can never disagree.
//
// - **Case-folded**, because `Essen.html` and `essen.html` are one file on the
//   case-insensitive disk a maintainer builds on, and one would silently overwrite
//   the other (65 pairs, measured 2026-11-21). Folding also makes the better page:
//   *essen* and *das Essen* side by side.
// - **The real spelling**, not ASCII: ä, ö, ü and ß stay. Transliteration would merge
//   nothing today, but it would make `/wort/maedchen` the address of a word whose
//   spelling is part of the lesson.
// - **The spelling, not the card id.** An id carries its level and changes on a
//   relevel; a spelling changes only when its card goes.

/** The headword a page is named after: the term without its article. */
export const bare = (term: string) =>
  term.normalize('NFC').replace(/^(?:der|die|das)(?:\/(?:der|die|das))*\s+/, '').trim();

/** The page's path segment. Never empty for a real term (`pages.test.ts`). */
export const slug = (term: string) =>
  bare(term).toLocaleLowerCase('de').replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
