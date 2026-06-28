// Shared UI helpers: the market heat scale + speech synthesis + small utils.

/** Coverage 0..1 → red→amber→green, the market heat scale. */
export function heat(p: number): string {
  const stops = [[234, 57, 67], [255, 176, 0], [22, 199, 132]];
  const seg = p < 0.5 ? 0 : 1;
  const t = p < 0.5 ? p / 0.5 : (p - 0.5) / 0.5;
  const a = stops[seg], b = stops[seg + 1];
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Readable ink on a heat tile (dark text only in the bright amber band). */
export function tileInk(p: number): string {
  return p > 0.42 && p < 0.72 ? '#1a1205' : '#06120c';
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
