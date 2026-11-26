// Shared UI helpers: the coverage scale + speech synthesis + small utils.

// ── The coverage scale ──────────────────────────────────────────────────────
// Five classes drawn from CSS tokens (--heat-0…4 and --heat-ink-0…4), so the
// ramp follows the theme and the ink for each class is decided once, in the
// stylesheet, rather than guessed from a luminance threshold at paint time.
const CLASSES = 5;
export const heatFill = (k: number) => `var(--heat-${Math.max(0, Math.min(CLASSES - 1, k))})`;
export const heatInk = (k: number) => `var(--heat-ink-${Math.max(0, Math.min(CLASSES - 1, k))})`;

/** A coverage scale classified over the values actually present. */
export interface HeatScale {
  /** Class index 0…4 for a coverage value. */
  classOf(p: number): number;
  fill(p: number): string;
  ink(p: number): string;
  /** Upper bounds of classes 0…3 (ascending); [] when the data can't be split. */
  breaks: number[];
  /** The range the classes actually span. */
  domain: [number, number];
}

/** Build a scale over the observed values (quantile: equal count per class).
 *
 *  This is the fix for the flattest thing in the product. Coverage was mapped
 *  *linearly across 0–100%* while real values span roughly 26–45%, so ten
 *  genuinely different territories all landed inside a 19-point slice of a
 *  100-point ramp and the heat map rendered as one flat colour — the metaphor's
 *  entire purpose (see where you are thin, at a glance) defeated by its own
 *  scale. Cartography settled this a century ago: classify over the observed
 *  range, and show the reader the classes.
 *
 *  Quantile rather than Jenks natural breaks: with ten territories the two agree
 *  closely, and quantile is explainable in one sentence on the legend ("five
 *  classes, equal count") which matters more here than the marginal fit.
 *
 *  Degenerate inputs fall back to a proportional spread so a one-sector group,
 *  or a corpus where every value is identical, still renders something sane. */
export function makeHeatScale(values: number[]): HeatScale {
  // Classify on the *displayed* percentage, not the raw fraction. Two
  // territories at 0.4204 and 0.4198 both render "42%", and classifying the
  // floats put them either side of a break — the map showed two identical
  // numbers in two different colours, which is precisely the confusion a heat
  // map exists to prevent. Rounding first makes colour and label agree by
  // construction: equal labels are now guaranteed equal fills.
  const pp = (p: number) => Math.round(p * 100);
  const v = values.filter(Number.isFinite).map(pp).sort((a, b) => a - b);
  const lo = v.length ? v[0] / 100 : 0;
  const hi = v.length ? v[v.length - 1] / 100 : 1;
  // Too few distinct values to classify — spread across the full 0..1 instead.
  const distinct = new Set(v).size;
  const breaks = distinct >= CLASSES
    ? Array.from({ length: CLASSES - 1 }, (_, i) => v[Math.floor(((i + 1) * v.length) / CLASSES)] / 100)
    : [];
  const classOf = (p: number) => breaks.length
    ? breaks.reduce((c, b) => (pp(p) >= pp(b) ? c + 1 : c), 0)
    : Math.max(0, Math.min(CLASSES - 1, Math.floor(p * CLASSES)));
  return {
    classOf,
    fill: (p) => heatFill(classOf(p)),
    ink: (p) => heatInk(classOf(p)),
    breaks,
    domain: breaks.length ? [lo, hi] : [0, 1],
  };
}

/** Absolute 0–100% scale, for the small progress bars that sit next to a single
 *  number and have no peer group to be classified against (a level bar, a deck
 *  row). Kept separate from `makeHeatScale` on purpose: a bar answers "how far
 *  along is this one thing", a map answers "which of these is thinnest". */
export function heat(p: number): string {
  return heatFill(Math.max(0, Math.min(CLASSES - 1, Math.floor(p * CLASSES))));
}

/** Heat as *text* colour, on a normal page surface.
 *
 *  `heat()` is built to sit on its own tile; used as type on a panel its green
 *  end (#16c784) only reaches ~2.2:1 on a white card, so it failed AA the moment
 *  a learner switched to light mode. Tokens instead: they already carry an
 *  AA-legible value per theme. Same call the ticker was already making. */
export function heatText(p: number): string {
  return p >= 0.5 ? 'var(--color-green)' : 'var(--color-dim)';
}

/** Group digits for an English-language UI.
 *
 *  This was `toLocaleString('de-DE')`, which renders 2320 as "2.320". Lexi's
 *  surface language is English (see the English-base commitment in README), so
 *  an English reader parsed the app's headline number as *two point three two*.
 *  German number formatting is correct for German prose and wrong for an English
 *  label sitting next to it — and the label always won.
 *  Pinned to en-US rather than the device locale so the corpus counts quoted in
 *  the docs and the UI can't disagree on a German phone. */
export const fmt = (n: number) => n.toLocaleString('en-US');

/** The avatar's letter. `charAt(0)` split an emoji's surrogate pair into `�` and
 *  took the bare `O` off a Mac-pasted (NFD) `Ö`, so it reads the first grapheme
 *  of the NFC string instead. */
export function initialOf(name: string, fallback = 'L'): string {
  const t = name.normalize('NFC').trim();
  if (!t) return fallback;
  const first = typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)[Symbol.iterator]().next().value?.segment
    : Array.from(t)[0];
  return (first ?? fallback).toLocaleUpperCase();
}

/** Grammatical gender as ink.
 *
 *  Colour-coding der/die/das is the single most useful thing on a German card —
 *  and it only existed on the flip *front*, as a local map in Review.tsx. Turning
 *  the card over lost it, and so did every other surface. One helper, so any
 *  surface showing an article can use the same three colours. Never the only
 *  signal: the article itself is always spelled out beside it. */
export function genderColor(gender: string | null | undefined): string | undefined {
  if (gender === 'der') return 'var(--color-der)';
  if (gender === 'die') return 'var(--color-die)';
  if (gender === 'das') return 'var(--color-das)';
  return undefined;
}

/** The highlighter for an article *(2026-11-26)*: the fill a `.swash` draws behind
 *  *der*, *die* or *das* on a display headword. A fill, never ink — the article on it
 *  is `--color-mark-ink` — and, like the ink above, never the only signal. */
export function markColor(gender: string | null | undefined): string | undefined {
  if (gender === 'der') return 'var(--color-mark-der)';
  if (gender === 'die') return 'var(--color-mark-die)';
  if (gender === 'das') return 'var(--color-mark-das)';
  return undefined;
}

/** The CEFR band inks, spelled out in full. Tailwind v4 emits a theme variable
 *  only when it sees its name in source, so a `var(--color-${level})` built at
 *  runtime pointed at variables that did not exist and the B1 cover printed black
 *  (2026-11-26). Every level is named here so all six always ship. */
export const LEVEL_INK: Record<string, string> = {
  A1: 'var(--color-a1)', A2: 'var(--color-a2)', B1: 'var(--color-b1)',
  B2: 'var(--color-b2)', C1: 'var(--color-c1)', C2: 'var(--color-c2)',
};

/** A tiny vibration on grade commit. No-op on iOS Safari (navigator.vibrate is
 *  unsupported there); a real win on Android/Chrome and installed PWAs.
 *  `kind` shapes the pattern: a miss should feel different from a hit without
 *  ever feeling like a punishment, so it's a double tap, not a longer buzz. */
export const haptic = (kind: 'grade' | 'wrong' = 'grade') => {
  navigator.vibrate?.(kind === 'wrong' ? [8, 40, 8] : 10);
};
