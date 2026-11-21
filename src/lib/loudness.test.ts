import { describe, it, expect } from 'vitest';
import { loudnessGain, normaliseLoudness, TARGET_RMS, PEAK, MAX_GAIN } from './loudness.ts';

const RATE = 22050;
/** A tone of `amp` for `voiced` seconds between `pad` seconds of silence each side. */
function clip(amp: number, voiced = 0.5, pad = 0.3): Float32Array {
  const n = Math.round((voiced + 2 * pad) * RATE);
  const out = new Float32Array(n);
  const from = Math.round(pad * RATE), to = from + Math.round(voiced * RATE);
  for (let i = from; i < to; i++) out[i] = amp * Math.sin((2 * Math.PI * 220 * i) / RATE);
  return out;
}
const voicedRms = (s: Float32Array) => {
  let sum = 0, n = 0;
  for (const v of s) if (v !== 0) { sum += v * v; n++; }
  return Math.sqrt(sum / n);
};
const peakOf = (s: Float32Array) => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

describe('normaliseLoudness — one level for every clip', () => {
  it('brings a quiet and a loud clip to the same speech level', () => {
    const quiet = clip(0.05), loud = clip(0.2);
    normaliseLoudness(quiet, RATE);
    normaliseLoudness(loud, RATE);
    expect(voicedRms(quiet)).toBeCloseTo(TARGET_RMS, 2);
    expect(voicedRms(loud)).toBeCloseTo(TARGET_RMS, 2);
  });

  it('measures the speech, not the silence around it', () => {
    // Same voiced level, very different padding: the same gain, within the frames
    // that straddle the edges. Ungated, the two would differ by a factor of 2.4.
    const a = loudnessGain(clip(0.05, 0.5, 0.05), RATE), b = loudnessGain(clip(0.05, 0.5, 1.5), RATE);
    expect(Math.abs(a / b - 1)).toBeLessThan(0.02);
  });

  it('never clips and never raises a near-silent clip into noise', () => {
    const hot = clip(0.9);
    normaliseLoudness(hot, RATE);
    expect(peakOf(hot)).toBeLessThanOrEqual(PEAK + 1e-6);
    expect(loudnessGain(clip(0.008), RATE)).toBeLessThanOrEqual(MAX_GAIN);
    expect(loudnessGain(new Float32Array(1000), RATE)).toBe(1);
  });

  it('is idempotent, so a cached clip can be normalised on every read', () => {
    const c = clip(0.05);
    normaliseLoudness(c, RATE);
    expect(loudnessGain(c, RATE)).toBeCloseTo(1, 3);
  });
});
