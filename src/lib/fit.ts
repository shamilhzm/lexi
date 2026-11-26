// How wide a headword is, without asking a browser.
//
// ## Why
//
// A German headword is one object, and at display size the longest of them do not
// fit a phone: *der Bundespräsident* was drawn as "Bundespräsiden / t" on the
// session card, because `break-words` breaks at whichever letter runs out of room.
// Measured on a 390pt phone at the iOS default text size (2026-11-14,
// `scripts/probe/headword-fit.js`): 758 headwords broke mid-word in the feed, 410
// on the session card, 138 in the entry and 30 as a drill prompt.
//
// The fix is typographic and old: set the word smaller until it fits, and past a
// floor let it break where German breaks — at a syllable, with a hyphen
// (`.hw-fit` in index.css). CSS can do the division but cannot measure the word,
// so this file gives it the one number it needs: the widest unbreakable run, in em.
//
// ## Why a table and not `measureText`
//
// It is a pure function — usable in a test, identical on every device, and never
// wrong because a webfont had not arrived when it was asked. The cost is that it is
// an estimate; the table is the display face's own advance widths, so the estimate
// is within +3.0% / −5.8% of the browser's answer for every headword of six letters
// or more across 24–60px (the probe prints that too). `MARGIN` covers the +3%, so
// a word is never set larger than fits and at most ~9% smaller than it could be.
//
// **The table is measured at 40px, not at 100px.** The display face has an
// optical-size axis and `.headword` leaves it on `auto`, so its width per em depends
// on the size it is set at. Fraunces (the face until 2026-11-26) was 16–17% wider at
// headword sizes than at 100px, and a first table measured at 100px would have
// under-fitted every word (LESSONS, *A ruler held at the wrong size*). Bricolage
// Grotesque runs the other way: 3% wider at 24px than at 40, 6% narrower at 60.

/** Advance widths of Bricolage Grotesque 700 at 40px, in em (probe run 2026-11-26).
 *  Re-derive with `scripts/probe/headword-fit.js` if the display face ever changes. */
const ADVANCE: Record<string, number> = {
  '0': 0.643, '1': 0.33, '2': 0.585, '3': 0.592, '!': 0.279, "'": 0.174, '(': 0.312,
  ')': 0.309, '+': 0.515, ',': 0.19, '-': 0.338, '.': 0.23, '/': 0.355, '?': 0.413,
  A: 0.682, B: 0.657, C: 0.664, D: 0.674, E: 0.594, F: 0.566, G: 0.698, H: 0.694, I: 0.274,
  J: 0.356, K: 0.664, L: 0.492, M: 0.898, N: 0.746, O: 0.702, P: 0.625, Q: 0.703, R: 0.656,
  S: 0.63, T: 0.552, U: 0.696, V: 0.658, W: 0.962, Y: 0.623, Z: 0.563,
  a: 0.569, b: 0.616, c: 0.556, d: 0.616, e: 0.566, f: 0.388, g: 0.584, h: 0.606, i: 0.259,
  j: 0.265, k: 0.571, l: 0.258, m: 0.915, n: 0.606, o: 0.595, p: 0.615, q: 0.616, r: 0.419,
  s: 0.534, t: 0.385, u: 0.599, v: 0.557, w: 0.84, x: 0.557, y: 0.58, z: 0.508,
  'Ä': 0.682, 'Ö': 0.702, 'Ü': 0.696, 'ß': 0.665, 'ä': 0.569, 'è': 0.566, 'é': 0.566,
  'í': 0.259, 'ö': 0.595, 'ü': 0.599,
  '—': 0.79, '…': 0.748, '₂': 0.278, '€': 0.724,
};

/** A glyph the table has never met is assumed wide, so an unknown word is set
 *  slightly too small rather than broken. `X` was not in the corpus on the day
 *  this was measured; `fit.test.ts` says which characters are. */
const UNKNOWN = 0.8;

/** The face is widest per em at the small end of the range: at 24px the browser
 *  measures up to 3.04% more than this 40px table says. */
const MARGIN = 1.031;

/** `.headword { letter-spacing: -0.02em }` — every glyph gives a little back. */
const TRACKING = -0.02;

/** Every character the table knows — for the test that walks the corpus. */
export const MEASURED = new Set(Object.keys(ADVANCE));

/** Width of one unbroken run, in em of the display face. */
export function emWidth(run: string): number {
  let w = 0, n = 0;
  for (const ch of run) { w += ADVANCE[ch] ?? UNKNOWN; n++; }
  return w * MARGIN + n * TRACKING;
}

/** The widest run a line cannot break inside, in em.
 *
 *  A line may break at a space, and after a hyphen that is already in the word
 *  (*Nord-Süd-Gefälle*), so those are where the runs end — the hyphen staying
 *  with the part before it, as it does on the page. Never less than 1, so the
 *  division in CSS has something to divide by. */
export function widestRun(text: string): number {
  let widest = 1;
  for (const word of text.split(/\s+/)) {
    for (const part of word.split(/(?<=-)/)) widest = Math.max(widest, emWidth(part));
  }
  return Math.round(widest * 100) / 100;
}
