import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// A source-level guard, in the same spirit as `review-structure.test.ts` and for
// the same defect class: nothing the learner needs may depend on an animation
// running, and DESIGN.md §7 has now been wrong about *how* twice.
//
// The drill-down uses a framer `layout` animation, which is the one kind §7's
// "transform-only entrance" rule cannot protect — the transform *is* the
// mechanism, so there is no resting frame to fall back to. Measured in a hidden
// tab: rAF throttles, the projection freezes on its `from` transform
// (`matrix(0.254, 0, 0, 0.936, -399.5, 0)`), `getAnimations()` is empty, and the
// element sits there indefinitely with its layout box already correct.
//
// Two things keep that survivable, and both are easy to delete by accident:
//   1. the shared element is a **backdrop**, never a control — so a frozen
//      projection misplaces decoration, not a 44px touch target
//   2. a **timer backstop** clears the transform past the duration, because
//      timers keep running when rAF does not (the trick `CountUp` already uses)
const raw = readFileSync(fileURLToPath(new URL('./Markt.tsx', import.meta.url)), 'utf8');
const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Markt — the drill-down transition cannot strand a control', () => {
  it('puts the shared element on something inert, not on the tile button', () => {
    // Every `layoutId` in the file must sit on an element that is both
    // `aria-hidden` and `pointer-events-none`. If a future edit moves one onto
    // the <button> itself, a stalled projection would put a real target — with a
    // real tap area — somewhere the learner cannot see it.
    const withLayoutId = [...src.matchAll(/<motion\.\w+[^>]*layoutId=[^>]*>/g)].map((m) => m[0]);
    expect(withLayoutId.length).toBeGreaterThan(0);
    for (const tag of withLayoutId) {
      expect(tag, tag).toMatch(/aria-hidden/);
      expect(tag, tag).toMatch(/pointer-events-none/);
    }
    // …and the tile button itself never carries one.
    expect(src).not.toMatch(/<button[^>]*layoutId/);
  });

  it('keeps the timer backstop that unfreezes a stalled projection', () => {
    expect(src).toMatch(/setTimeout/);
    expect(src).toMatch(/style\.transform\s*=\s*'none'/);
  });

  it('skips the whole transition under reduced motion', () => {
    expect(src).toMatch(/useReducedMotion/);
    // Both halves of the shared element are gated on it, so reduced motion gets
    // a hard swap rather than a slower animation.
    expect(src).toMatch(/!reduce\s*&&\s*zoom\s*&&/);
    expect(src).toMatch(/!reduce\s*&&\s*!zoom\s*&&/);
  });

  it('uses the one documented easing and stays inside the transition tier', () => {
    // §7: one easing, cubic-bezier(.32,.72,0,1); transitions are 200–320ms.
    const transitions = [...src.matchAll(/duration:\s*([\d.]+),\s*ease:\s*\[([^\]]+)\]/g)];
    expect(transitions.length).toBeGreaterThan(0);
    for (const [, dur, ease] of transitions) {
      expect(Number(dur) * 1000, `duration ${dur}s`).toBeGreaterThanOrEqual(200);
      expect(Number(dur) * 1000, `duration ${dur}s`).toBeLessThanOrEqual(320);
      expect(ease.replace(/\s/g, ''), 'easing').toBe('0.32,0.72,0,1');
    }
  });
});
