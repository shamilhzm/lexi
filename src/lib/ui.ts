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

/** Readable ink on a heat tile: dark ink only on the bright green high end. */
export function tileInk(p: number): string {
  return p > 0.6 ? '#04120c' : '#eaf1f8';
}

export const CEFR_COLOR: Record<string, string> = {
  A1: 'var(--color-a1)', A2: 'var(--color-a2)', B1: 'var(--color-b1)',
};

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
 *  unsupported there); a real win on Android/Chrome and installed PWAs. */
export const haptic = () => { navigator.vibrate?.(10); };

// ---- sound ticks (the feel layer) -----------------------------------------
// Tiny synthesized blips — no assets, no library. Gated on the sound setting
// (off by default) and created lazily on first use (autoplay policies require
// a user gesture, and grading is one).
import { sound } from '../store.ts';
let audioCtx: AudioContext | null = null;
export function tick(kind: 'good' | 'done') {
  if (!sound() || typeof AudioContext === 'undefined') return;
  try {
    audioCtx ??= new AudioContext();
    const notes = kind === 'good' ? [880] : [660, 990]; // done = a little two-note rise
    notes.forEach((freq, i) => {
      const t0 = audioCtx!.currentTime + i * 0.09;
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(t0);
      osc.stop(t0 + 0.13);
    });
  } catch { /* audio unavailable — silence is fine */ }
}
