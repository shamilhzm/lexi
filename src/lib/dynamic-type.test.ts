// Chrome is physical; content is type.
//
// iOS Dynamic Type sets the root font-size — `font: -apple-system-body` and the
// in-app scale both write the same property — and Tailwind's whole spacing scale is
// `rem`, so *everything* scaled: gaps, padding, and the boxes drawn around
// fixed-size vector glyphs. Measured at 402×714 with the root swept 16 → 53px, the
// top bar went 56 → 137px, the four controls in the session header measured 470px
// of a 393px row and wrapped to three lines, and the profile avatar's right edge sat
// at 431px of a 402px viewport.
//
// The rule that fixes it is one line: **a touch target is a physical size and the
// ink inside it is a fixed-size vector, so neither is text and neither scales.**
// Pinning those in px took the header flat to 56px across the whole range. What is
// left is *content*, and content scales — including the study card's own height
// bounds, which are `rem` for exactly the reason the icon boxes are not.
//
// These are source guards. The behavioural version needs a phone, and it was run:
// every number above came off an instrumented page at 402×714, and the card-clipping
// case came off an iPhone 17 Pro simulator at `accessibility-extra-large`.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}
const tsx = walk('src');
const css = readFileSync('src/index.css', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const nav = readFileSync('src/components/BottomNav.tsx', 'utf8');

/** `w-11 h-11` and friends: Tailwind's spacing scale, which is rem. */
const REM_SQUARE = /place-items-center[^"'`]*\bw-(\d+)\s+h-\1\b/;

describe('icon boxes are pinned in px', () => {
  it('the check can see the defect it is looking for', () => {
    // The exact string that shipped for a year, so a green run means the rule is
    // enforced rather than that the pattern stopped matching anything.
    expect('grid place-items-center w-11 h-11 rounded-md').toMatch(REM_SQUARE);
    expect('grid place-items-center w-[44px] h-[44px] rounded-md').not.toMatch(REM_SQUARE);
  });

  it.each(tsx)('%s sizes its icon boxes in px', (file) => {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
      expect(line).not.toMatch(REM_SQUARE);
    }
  });
});

describe('the bars stop growing', () => {
  // 56px is what the header measures at a 16px root and at a 53px one — verified by
  // sweep, not assumed. A rem value here would follow a curve the header no longer
  // has, and would over-pad every surface by 68px at an accessibility size.
  it('--bar-t is a pixel constant plus the hardware inset', () => {
    expect(css).toMatch(/--bar-t:\s*calc\(56px \+ env\(safe-area-inset-top\)\)/);
    expect(css).not.toMatch(/--bar-t:\s*calc\(3\.5rem/);
  });

  // The gap between the hardware inset and the bar's contents is a physical
  // distance, like the inset it backstops. As `0.625rem` it was 25px at a 40px root.
  it('the safe-area floor is px', () => {
    expect(css).toMatch(/\.safe-top\s*{\s*padding-top:\s*max\(10px,\s*env\(safe-area-inset-top\)\)/);
  });

  // `--bar-b` and BottomNav's own bottom padding are the same subtraction written
  // twice — the comment in App.tsx says so — so a rem in one and a px in the other
  // is content scrolling to a stop in the wrong place. Both floors are 8px.
  it('--bar-b and the capsule inset agree, in px', () => {
    expect(app).toMatch(/--bar-t' as string\]: 'calc\(56px \+ env\(safe-area-inset-top\)\)'/);
    expect(app).toMatch(/--bar-b' as string\]: 'calc\(58px \+ max\(8px, env\(safe-area-inset-bottom\) - 14px\) \+ 8px\)'/);
    expect(nav).toMatch(/pb-\[max\(8px,calc\(env\(safe-area-inset-bottom\)_-_14px\)\)\]/);
  });
});

describe('chrome caps are unconditional', () => {
  // The threshold-gated version of these had already failed just below its own
  // threshold: at a 28px root — `lg`, not `ax` — the profile button's right edge was
  // at 448px of a 402px viewport. `min()` is the same rule at every size, so there is
  // no size at which it is off by one step.
  const capped = ['.goal-pill', '.top-bar', '.profile-btn', '.streak-chip', '.feed-coach > div'];
  it.each(capped)('%s is capped without a data-type threshold', (sel) => {
    const at = css.indexOf(`\n${sel} {`);
    expect(at, `no unconditional rule for ${sel}`).toBeGreaterThan(-1);
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toMatch(/min\(|:\s*\d+px/);
  });

  // `data-type` survives only for the two things `min()` cannot express: dropping
  // the tab labels, and turning the feed from a carousel into a scrolling list.
  it('keeps data-type only for the structural changes', () => {
    const gated = css.match(/^html\[data-type='ax'\][^{]*/gm) ?? [];
    expect(gated.length).toBeGreaterThan(0);
    for (const sel of gated) {
      expect(sel).toMatch(/nav\[aria-label='Main'\]|\.feed-scroller|\.feed-slot/);
    }
  });
});
