// Shared UI helpers: the market heat scale + speech synthesis + small utils.

/** Coverage 0..1 → slate→green, the market heat scale. Neutral (not red) at the
 *  low end so an unlearned lexicon reads as "not yet", not as failure. */
export function heat(p: number): string {
  const stops = [[70, 80, 97], [63, 143, 116], [22, 199, 132]]; // slate → teal → green
  const seg = p < 0.5 ? 0 : 1;
  const t = p < 0.5 ? p / 0.5 : (p - 0.5) / 0.5;
  const a = stops[seg], b = stops[seg + 1];
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Readable ink on a heat tile: dark ink only on the bright green high end.
 *  These are literals on purpose — the tile paints its own `heat()` background,
 *  so the ink has to answer to that fill, not to the page theme. */
export function tileInk(p: number): string {
  return p > 0.6 ? '#04120c' : '#eaf1f8';
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

export const fmt = (n: number) => n.toLocaleString('de-DE');

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
