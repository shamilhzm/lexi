// One loudness for every clip Hören and Practise aloud play.
//
// Piper's German and English voices come out at different levels, and so does one
// voice from word to word. A programme alternating them made a listener ride the
// volume. On earbuds, on a run, the quiet ones were lost (PANEL-2026-10-04 #6, and
// the first learner's own request). So each clip is scaled to one speech level.
//
// Measured over 10 ms frames, ignoring the frames quieter than SILENCE: a clip is
// mostly silence at either end, and counting it would boost a short word more than
// a long sentence. The gain is capped twice. The peak may not pass PEAK, so nothing
// clips, and the gain may not pass MAX_GAIN, so a near-silent clip (a render
// fault) is not raised into audible noise. Idempotent: a clip already at the
// target gets a gain of 1, so cached clips can be normalised again on every read.

/** Target speech level, as RMS of the voiced frames: about -16 dBFS. */
export const TARGET_RMS = 0.158;
/** No sample may exceed this after scaling. */
export const PEAK = 0.98;
/** Never raise a clip more than this (about +18 dB). */
export const MAX_GAIN = 8;
/** A 10 ms frame quieter than this (about -45 dBFS) is silence, not speech. */
export const SILENCE = 0.0056;

/** The gain that brings `samples` to the target, within the two caps. */
export function loudnessGain(samples: Float32Array, rate: number): number {
  const frame = Math.max(1, Math.round(rate / 100));
  let power = 0, frames = 0, peak = 0;
  for (let i = 0; i < samples.length; i += frame) {
    let sum = 0;
    const end = Math.min(samples.length, i + frame);
    for (let j = i; j < end; j++) {
      const v = samples[j];
      sum += v * v;
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
    }
    const ms = sum / (end - i);
    if (Math.sqrt(ms) >= SILENCE) { power += ms; frames++; }
  }
  if (!frames || peak === 0) return 1;
  const rms = Math.sqrt(power / frames);
  return Math.min(TARGET_RMS / rms, PEAK / peak, MAX_GAIN);
}

/** Scale `samples` in place to the target level; returns the gain applied. */
export function normaliseLoudness(samples: Float32Array, rate: number): number {
  const g = loudnessGain(samples, rate);
  if (Math.abs(g - 1) > 1e-3) for (let i = 0; i < samples.length; i++) samples[i] *= g;
  return g;
}
