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
    // The entrance class is `card-in` or, after a swipe, `card-rise` — both CSS.
    expect(src).toMatch(/useRef<'card-in' \| 'card-rise'>\('card-in'\)/);
    expect(src).toMatch(/key=\{item\.srsId\}\s+className=\{`\$\{entrance\.current\}/);
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

// ── The grade buttons stay on screen ────────────────────────────────────────
//
// A source guard, because the behavioural version needs a real phone: the pane
// reports 402×**874** where an iPhone 17 Pro in Safari gives 402×**714**, and every
// previous measurement of this block was made against the wrong number.
//
// Measured at 714 on a cold first session: the column came to 795px, the grade
// buttons landed at y629, and the floating tab bar starts at y646 — so the primary
// action of the primary loop was behind the chrome, on the first screen a new learner
// ever reaches, and the coach block explaining those buttons is what pushed them
// under. Two things had to be true to fix it:
//
//   1. the card stage is `flex-1 min-h-0`, so the card gives up the height the coach
//      takes (`SwipeCard` has been `flex-1 min-h-[16.25rem] max-h-[28.75rem]` all along, and
//      could never act on it because no ancestor bounded the height);
//   2. the caught-up notice does not render on a first run — it costs 55 points to
//      tell somebody who has never studied that they are up to date.
describe('Review — the primary action survives the coach', () => {
  it('bounds the card stage so it can absorb the coach block', () => {
    expect(src).toMatch(/flex-1 min-h-0 flex flex-col items-center justify-center/);
  });

  it('keeps the card free to shrink', () => {
    expect(src).toMatch(/flex-1 min-h-\[min\(16\.25rem,32svh\)\] max-h-\[28\.75rem\]/);
  });

  // **A rem floor alone is a floor the screen does not have** *(2026-10-14)*. On an
  // iPhone 13 mini at Extra-Extra Large text, 16.25rem came to ~340pt, the column
  // overflowed, and the grade keys sat under the tab bar — a friend's first session.
  // The floor must be capped by the viewport, or text size can push the primary
  // action off screen.
  it('caps the card floor by the viewport, not only by text size', () => {
    expect(src).not.toMatch(/flex-1 min-h-\[16\.25rem\]/);
    expect(src).toMatch(/min-h-\[min\([^)]*svh\)\]/);
  });

  // The same two numbers, in the unit that makes them survive Dynamic Type. They
  // were px, and at an accessibility text size the card's *contents* grew while its
  // ceiling did not — so the face scrolled and the headword fell below its own fold.
  // 16.25rem/28.75rem are 260/460 at a 16px root, so this is a no-op at rest.
  it('lets the card grow with the type inside it', () => {
    expect(src).not.toMatch(/min-h-\[260px\]|max-h-\[460px\]/);
  });

  it('does not tell a first-run learner they are caught up', () => {
    expect(src).toMatch(/if \(firstRun\) return null;/);
    expect(src).toMatch(/<ReturnNotice firstRun=\{firstRun\} \/>/);
  });
});

// ── Motion entrances on content are transform-only (DESIGN §7) ───────────────
//
// The CSS keyframes above are guarded; `motion` props were not, and two
// content-bearing entrances animated from `opacity: 0` (2026-09-25 panel): the
// recap's streak number and stat tiles, and the typed-answer correction — the
// one line a wrong answer exists to show. A stalled animation sits on its first
// frame, so those could render nothing. The recap's check badge is decoration
// and keeps its fade; everything else in these files may only translate or scale.
// `Placement.tsx` still has five and is not in this list yet — it is the next
// file to bring in, not an exemption.
describe('motion entrances in the study loop never start invisible', () => {
  for (const file of ['./drills.tsx', '../components/SessionRecap.tsx']) {
    it(`${file} has no content entrance from opacity 0`, () => {
      const text = readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');
      const lines = text.split('\n');
      const offenders = lines
        .map((l, n) => ({ l, n }))
        .filter(({ l }) => /initial=\{\{[^}]*opacity:\s*0\b/.test(l))
        // The recap's check badge: an icon on a tinted disc, no text.
        .filter(({ n }) => !lines.slice(n, n + 3).join('\n').includes('<Check className="text-green" />'));
      expect(offenders.map(({ l, n }) => `${file}:${n + 1} ${l.trim()}`)).toEqual([]);
    });
  }
});

// ── Tap turns, swipe grades (2026-10-11, owner's ruling) ─────────────────────
//
// Reverses the 2026-09-25 panel's "a swipe turns the card". Right is Knew it,
// left is Didn't know; a tap is the only gesture that turns the card. The card
// is still not `role="button"`, which hid its headword from VoiceOver.
describe('Review — a tap turns the card, a swipe grades it', () => {
  const swipe = src.slice(src.indexOf('function SwipeCard'), src.indexOf('function ReturnNotice'));

  it('the drag handler grades and does not flip; the click flips', () => {
    expect(swipe).toMatch(/onDragEnd=/);
    expect(swipe).toMatch(/onSwipe\(right\)/);
    expect(swipe.slice(swipe.indexOf('onDragEnd='), swipe.indexOf('onClick='))).not.toMatch(/onFlip/);
    expect(swipe).toMatch(/onClick=\{\(\) => \{ if \(!dragged\.current && !thrown\) onFlip\(\); \}\}/);
    // The grade is a timer cleared on unmount, never the animation's completion.
    expect(swipe).toMatch(/commit\.current = window\.setTimeout\(\(\) => onSwipe\(right\)/);
    expect(swipe).toMatch(/clearTimeout\(commit\.current\)/);
    expect(src).toMatch(/onSwipe=\{\(knew\) => grade\(knew \? Rating\.Good : Rating\.Again, 'swipe'\)\}/);
  });

  it('offers two verdicts only — no Hard, no Easy', () => {
    const scale = src.slice(src.indexOf('const SCALE'), src.indexOf('];', src.indexOf('const SCALE')));
    expect(scale).not.toMatch(/Rating\.(Hard|Easy)/);
    expect(scale.match(/rating: Rating\./g)).toHaveLength(2);
  });

  it('the card is a group named by its headword, not a button', () => {
    expect(swipe).toMatch(/role="group"/);
    expect(swipe).toMatch(/aria-labelledby=\{labelledBy\}/);
    expect(swipe).not.toMatch(/role="button"/);
  });

  it('grades render only once the answer is in view (or on a first-sight card)', () => {
    expect(src).toMatch(/const showGrades = isNew \|\| flipped;/);
    expect(src).toMatch(/Show answer/);
  });
});

// ── Large text: keys that hold their words (2026-10-16) ─────────────────────
//
// At an accessibility text size a third of a phone-width card was 67px for a 41px
// "der", and `rounded-full` turned the tall key into a circle the word ran past.
describe('der · die · das at large text sizes', () => {
  const drills = readFileSync(fileURLToPath(new URL('./drills.tsx', import.meta.url)), 'utf8');
  const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');

  it('lays the three keys out with the stacking grid, not a fixed three columns', () => {
    expect(drills).toMatch(/className="gender-keys/);
    expect(drills).not.toMatch(/grid grid-cols-3 gap-2\.5">\s*\{GENDER\.map/);
  });

  it('stacks them from the lg text band up', () => {
    expect(css).toMatch(/html\[data-type='lg'\] \.gender-keys,\s*html\[data-type='ax'\] \.gender-keys \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  });

  it('gives growable keys a px radius, never rounded-full', () => {
    expect(css).toMatch(/--radius-key:\s*28px/);
    expect(drills).not.toMatch(/key rounded-full/);
  });

  it('caps the study word in px so it stays on the card', () => {
    expect(css).toMatch(/\.hw-front\s*\{ font-size: min\(var\(--text-4xl\), 46px\); \}/);
    expect(src).toMatch(/headword hw-front/);
  });
});
