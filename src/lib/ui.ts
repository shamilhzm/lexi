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
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  const lo = v.length ? v[0] : 0;
  const hi = v.length ? v[v.length - 1] : 1;
  // Too few distinct values to classify — spread across the full 0..1 instead.
  const distinct = new Set(v).size;
  const breaks = distinct >= CLASSES
    ? Array.from({ length: CLASSES - 1 }, (_, i) => v[Math.floor(((i + 1) * v.length) / CLASSES)])
    : [];
  const classOf = (p: number) => breaks.length
    ? breaks.reduce((c, b) => (p >= b ? c + 1 : c), 0)
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

let voicesReady = false;
export function primeVoices() {
  if (voicesReady || typeof speechSynthesis === 'undefined') return;
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => { voicesReady = true; };
}

/** Speak a German term with the platform's best de-DE voice. */
export function speakDe(text: string) {
  if (typeof speechSynthesis === 'undefined') return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 0.95;
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('de'));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* no-op */ }
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

/** A tiny vibration on grade commit. No-op on iOS Safari (navigator.vibrate is
 *  unsupported there); a real win on Android/Chrome and installed PWAs.
 *  `kind` shapes the pattern: a miss should feel different from a hit without
 *  ever feeling like a punishment, so it's a double tap, not a longer buzz. */
export const haptic = (kind: 'grade' | 'wrong' = 'grade') => {
  navigator.vibrate?.(kind === 'wrong' ? [8, 40, 8] : 10);
};

// ---- sound cues (the feel layer) ------------------------------------------
// Tiny synthesized blips — no assets, no library. Gated on the sound setting
// (on by default) and created lazily on first use (autoplay policies require
// a user gesture, and grading is one).
//
// The set is deliberately small and tonal. `wrong` falls rather than rises and
// sits quieter than `good`: it has to be distinguishable without being a buzzer,
// because a learner hears it dozens of times a session and it must never read as
// a scold. `milestone` is the only cue that gets a chord.
import { sound } from '../store.ts';

type Cue = 'good' | 'wrong' | 'done' | 'milestone';
/** [frequency Hz, start offset s, peak gain] per note. */
const CUES: Record<Cue, [number, number, number][]> = {
  good:      [[880, 0, 0.06]],
  wrong:     [[420, 0, 0.045], [330, 0.08, 0.045]],           // a small fall
  done:      [[660, 0, 0.06], [990, 0.09, 0.06]],             // a two-note rise
  milestone: [[660, 0, 0.05], [880, 0.08, 0.05], [1320, 0.16, 0.06]], // a rising triad
};

let audioCtx: AudioContext | null = null;
export function tick(kind: Cue) {
  if (!sound() || typeof AudioContext === 'undefined') return;
  try {
    audioCtx ??= new AudioContext();
    for (const [freq, offset, peak] of CUES[kind]) {
      const t0 = audioCtx.currentTime + offset;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(peak, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.13);
    }
  } catch { /* audio unavailable — silence is fine */ }
}
