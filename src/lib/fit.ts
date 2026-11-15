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
// is within +2.0% / −3.5% of the browser's answer for every headword of six letters
// or more across 24–52px (the probe prints that too). `MARGIN` covers the +2%, so
// a word is never set larger than fits and at most ~5% smaller than it could be.
//
// **The table is measured at 40px, not at 100px.** Fraunces has an optical-size
// axis and `.headword` leaves it on `auto`, so the face is 16–17% wider per em at
// the sizes a headword is set than at the size a ruler is convenient to hold. The
// first version of this table was measured at 100px and would have under-fitted
// every word (LESSONS, *A ruler held at the wrong size*).

/** Advance widths of Fraunces 700 at 40px, in em. Re-derive with
 *  `scripts/probe/headword-fit.js` if the display face ever changes. */
const ADVANCE: Record<string, number> = {
  '0': 0.693, '1': 0.475, '2': 0.633, '3': 0.584, '!': 0.324, "'": 0.196, '(': 0.373, ')': 0.373,
  '+': 0.55, ',': 0.299, '-': 0.382, '.': 0.288, '/': 0.476, '?': 0.566,
  A: 0.745, B: 0.732, C: 0.703, D: 0.805, E: 0.667, F: 0.622, G: 0.764, H: 0.862, I: 0.424,
  J: 0.536, K: 0.814, L: 0.638, M: 0.938, N: 0.759, O: 0.792, P: 0.721, Q: 0.794, R: 0.777,
  S: 0.621, T: 0.711, U: 0.746, V: 0.721, W: 1.07, Y: 0.69, Z: 0.642,
  a: 0.565, b: 0.614, c: 0.525, d: 0.624, e: 0.533, f: 0.406, g: 0.585, h: 0.644, i: 0.323,
  j: 0.323, k: 0.624, l: 0.325, m: 0.959, n: 0.644, o: 0.595, p: 0.628, q: 0.615, r: 0.493,
  s: 0.495, t: 0.401, u: 0.635, v: 0.554, w: 0.84, x: 0.561, y: 0.572, z: 0.5,
  Ä: 0.745, Ö: 0.792, Ü: 0.746, ß: 0.72, ä: 0.565, è: 0.533, é: 0.533, í: 0.319, ö: 0.595, ü: 0.635,
  '—': 0.846, '…': 0.947, '₂': 0.278, '€': 0.713,
};

/** A glyph the table has never met is assumed wide, so an unknown word is set
 *  slightly too small rather than broken. `X` was not in the corpus on the day
 *  this was measured; `fit.test.ts` says which characters are. */
const UNKNOWN = 0.8;

/** The face is widest per em at the small end of the range: at 24px the browser
 *  measures up to 2.04% more than this 40px table says. */
const MARGIN = 1.021;

/** `.headword { letter-spacing: -0.01em }` — every glyph gives a little back. */
const TRACKING = -0.01;

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
