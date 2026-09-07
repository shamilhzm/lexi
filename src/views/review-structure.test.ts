import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// A source-level guard, not a behavioural test. The suite is pure-logic (no
// React renderer), and the defect this protects against is architectural rather
// than computational: the primary study loop must not gate the appearance of the
// next card on an animation completing.
//
// History: the card swap was an `AnimatePresence mode="wait"`, which keeps the
// outgoing card mounted until its exit animation *finishes* before mounting the
// next one. Framer is rAF-driven, so with rAF stalled the deck froze — grading
// advanced the counter 272→268 while the headword never changed. Verified in a
// browser with `rafTicksIn600ms: 0`, then verified fixed the same way (six
// grades → six distinct headwords with rAF still dead).
//
// Same defect class as the entrance rule in docs/DESIGN.md §7: nothing the
// learner needs to see may depend on an animation running.
const raw = readFileSync(fileURLToPath(new URL('./Review.tsx', import.meta.url)), 'utf8');
// Comments are stripped first: the file *explains* this history at length, and a
// naive search for the name matches the explanation as readily as the defect.
const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Review — the card swap is state, not animation', () => {
  it('does not gate the card on AnimatePresence', () => {
    expect(src).not.toMatch(/<AnimatePresence/);      // the JSX
    expect(src).not.toMatch(/\bAnimatePresence\b.*from 'motion\/react'/); // the import
  });

  it('keys the card container on the current item and enters via CSS', () => {
    // `key={item.srsId}` is what makes React remount (and so re-trigger the CSS
    // entrance) on every advance; `.card-in` is transform-only with no
    // fill-mode, so a stalled animation leaves the card fully visible.
    expect(src).toMatch(/className="card-in[^"]*"/);
    expect(src).toMatch(/key=\{item\.srsId\}\s+className="card-in/);
  });
});

describe('entrance keyframes never animate opacity', () => {
  // The stronger form of the DESIGN.md §7 rule. A stalled animation sits on its
  // `from` frame, so `from { opacity: 0 }` renders nothing whether or not a
  // fill-mode is set — which is how a whole route came to be laid out at
  // opacity 0. Transform-only entrances cannot hide content.
  const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');
  const NAMES = ['routein', 'deskin', 'cardin', 'tilein', 'nodein', 'bargrow'];

  for (const name of NAMES) {
    it(`@keyframes ${name} is transform-only`, () => {
      const m = css.match(new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)\\n?\\}`));
      expect(m, `@keyframes ${name} not found`).toBeTruthy();
      expect(m![1]).not.toMatch(/opacity/);
    });
  }

  it('scales in an entrance never reach zero', () => {
    // scaleY(0) is invisible for the same reason opacity: 0 is.
    for (const name of NAMES) {
      const m = css.match(new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)\\n?\\}`));
      for (const [, n] of (m?.[1] ?? '').matchAll(/scale[XY]?\(([\d.]+)/g)) {
        expect(Number(n), `${name} scales to ${n}`).toBeGreaterThan(0);
      }
    }
  });

  // Transform-only keeps a stalled entrance *visible*. It does not make the
  // resting state correct, and a scale applies to the whole subtree — so an
  // entrance wrapping sized controls silently shrinks every one of them for as
  // long as it sits on its `from` frame.
  //
  // Measured 2026-08-05: `deskin` scaled from .985 and stalled at currentTime 0,
  // so the session's five chrome IconButtons rendered 43.34px against a CSS
  // width of 44px — under the 44px minimum DESIGN.md §6 claims to enforce, with
  // nothing in the CSS to show for it.
  //
  // Scoped to the entrances that wrap interactive subtrees. `tilein` and
  // `nodein` scale the target *itself* rather than a container of targets, and
  // both are large; they are perceptible animations doing real work, so they
  // stay. `bargrow` animates a chart bar, which is not a control.
  // `cardin` was missing from this list until 2026-08-15 — the rule was written,
  // the guard was written, and the one entrance wrapping the *primary* surface was
  // left out of it, so it kept `scale(.985)` for ten days after `deskin` lost it.
  // A guard that enumerates its subjects is only as good as the enumeration; this
  // list must gain a name whenever an entrance is added over interactive content.
  it('an entrance that wraps touch targets does not scale them', () => {
    for (const name of ['routein', 'deskin', 'cardin']) {
      const m = css.match(new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)\\n?\\}`));
      expect(m, `@keyframes ${name} not found`).toBeTruthy();
      expect(m![1], `${name} scales a subtree containing sized controls`).not.toMatch(/scale/);
    }
  });
});

// ── Recall is only defined where a retrieval happened ────────────────────────
//
// A source guard for the same reason as the one above: the suite is pure-logic
// and this defect is a *composition* mistake, not a computation.
//
// `recall` was `(done - again) / done`, and `done` counts every graded item — the
// first-sight introductions and the drill answers along with the retrievals. A
// first session of twenty brand-new cards, each shown answer-side-up and never
// asked for, therefore reported **RECALL 100%**: the number the recap leads with
// was the one number the session had not measured. VISION §3 forbids a number that
// flatters; `SCALE` in the same file already knows the difference, which is why a
// first-sight card gets two grade buttons instead of four.
describe('Review — recall is computed from retrievals only', () => {
  it('does not divide by the count of everything graded', () => {
    expect(src).not.toMatch(/recall\s*=[^;]*\bdone\b/);
    expect(src).not.toMatch(/\bagain\b\s*\)\s*\/\s*done/);
  });

  it('computes it from the retrieval counters', () => {
    expect(src).toMatch(/const\s+recall\s*=\s*retrieved\s*>\s*0/);
    expect(src).toMatch(/retrievedOk\s*\/\s*retrieved/);
  });

  it('passes undefined rather than 0 when nothing was retrieved', () => {
    // `SessionRecap` drops the tile on `undefined`, which is "there is nothing to
    // report" — a different claim from "you recalled none of it".
    expect(src).toMatch(/:\s*undefined\s*;/);
    expect(src).toMatch(/recall,/);           // passed straight through, not re-gated
  });

  it('only counts a card as retrieved when the learner had met it before', () => {
    expect(src).toMatch(/dRetr\s*=\s*wasNew\s*\?\s*0\s*:\s*1/);
  });
});
