// The palette's own invariants, read out of `index.css`.
//
// Three ink ramps encode three unrelated things and are shown together on one
// card — the flip face carries a CEFR badge ("A1") and a noun's article ("der")
// at the same time. If two ramps share a value, the colour stops meaning anything:
// a blue chip could be "A1" or it could be "der".
//
// `index.css` already claimed this invariant in a comment — "CEFR ink … No value
// equals a status color" — and the claim was true of the *status* colours and
// never checked against the *gender* ramp. That is the whole reason this file
// exists rather than another comment: BACKLOG carried "der and a1 are the
// identical hex in both themes" as a single known collision, and running the
// numbers found it was three in light and two in dark.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8');

/** Values declared before the `html.dark` *rule* are the light theme; those inside
 *  it, dark. Matched as a rule opening, not as the bare string: `html.dark` is
 *  named in a comment 170 lines above the block it describes, and splitting there
 *  put every light token in the dark half — where they parsed as `undefined`. */
function palette(theme: 'light' | 'dark'): Record<string, string> {
  const darkAt = css.search(/^html\.dark\s*\{/m);
  const scope = theme === 'light' ? css.slice(0, darkAt) : css.slice(darkAt);
  const out: Record<string, string> = {};
  for (const m of scope.matchAll(/--color-([a-z0-9]+):\s*(#[0-9a-fA-F]{3,8})/g)) {
    out[m[1]] = m[2].toLowerCase();   // later wins: dark re-declares, light declares once
  }
  return out;
}

const GENDER = ['der', 'die', 'das'];
const CEFR = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

const hex = (h: string) => {
  const s = h.replace('#', '');
  const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as [number, number, number];
};

/** WCAG relative luminance → contrast ratio. Used for the readability half. */
const lum = (h: string) => {
  const [r, g, b] = hex(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Perceptual distance, good enough to answer "would anyone see these as one
 *  colour?" without pulling in a colour library. Weighted RGB (Compuphase):
 *  under ~40 reads as the same ink at chip size. */
function distance(a: string, b: string): number {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  const rm = (r1 + r2) / 2, dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

const MIN_DISTANCE = 40;

describe.each(['light', 'dark'] as const)('palette — %s', (theme) => {
  const p = palette(theme);

  it('declares every gender and CEFR ink', () => {
    for (const k of [...GENDER, ...CEFR]) expect(p[k], `--color-${k}`).toMatch(/^#[0-9a-f]{6}$/);
  });

  // A gender ink that is also a CEFR ink: a "der" and an "A1" on one card, the
  // same blue, the colour carrying two unrelated meanings.
  //
  // **Ruled tolerable, not ruled correct.** Neither ink is ever the only signal —
  // `genderColor`'s contract in lib/ui.ts is "the article itself is always spelled
  // out beside it", and a CEFR badge renders "A1" as text — so this is polish
  // rather than ambiguity, and moving a hue is a real decision: the gender ramp
  // follows the blue/pink/green convention DaF materials use, and the CEFR ramp
  // has its own documented order. Enumerated here so a **new** collision fails
  // while the known five stay visible, and so the count in BACKLOG is the measured
  // one — it carried this as a single pair (der/a1) and it is five.
  const KNOWN = new Set(['der/a1', 'die/c2', 'das/b1']);

  it('adds no new collision between a gender ink and a CEFR ink', () => {
    const surprises: string[] = [];
    for (const g of GENDER) {
      for (const c of CEFR) {
        const d = distance(p[g], p[c]);
        if (d < MIN_DISTANCE && !KNOWN.has(`${g}/${c}`)) {
          surprises.push(`${g} ${p[g]} ≈ ${c} ${p[c]} (distance ${d.toFixed(1)})`);
        }
      }
    }
    expect(surprises).toEqual([]);
  });

  it('has exactly the collisions BACKLOG records — light 3, dark 2', () => {
    const found = GENDER.flatMap((g) => CEFR.filter((c) => distance(p[g], p[c]) < MIN_DISTANCE).map((c) => `${g}/${c}`));
    // `die`/`c2` is a light-theme collision only: dark lifts them to #f472b6 and
    // #fb7185, which are 45 apart. That asymmetry is why counting by eye in one
    // theme got the number wrong.
    expect(found.sort()).toEqual(theme === 'light' ? ['das/b1', 'der/a1', 'die/c2'] : ['das/b1', 'der/a1']);
  });

  it('keeps the CEFR ramp internally distinguishable', () => {
    const collisions: string[] = [];
    for (let i = 0; i < CEFR.length; i++) {
      for (let j = i + 1; j < CEFR.length; j++) {
        const d = distance(p[CEFR[i]], p[CEFR[j]]);
        if (d < MIN_DISTANCE) collisions.push(`${CEFR[i]} ≈ ${CEFR[j]} (${d.toFixed(1)})`);
      }
    }
    expect(collisions).toEqual([]);
  });

  it('keeps the three genders distinguishable from each other', () => {
    const collisions: string[] = [];
    for (let i = 0; i < GENDER.length; i++) {
      for (let j = i + 1; j < GENDER.length; j++) {
        const d = distance(p[GENDER[i]], p[GENDER[j]]);
        if (d < MIN_DISTANCE) collisions.push(`${GENDER[i]} ≈ ${GENDER[j]} (${d.toFixed(1)})`);
      }
    }
    expect(collisions).toEqual([]);
  });

  it('keeps every ink readable on the surface it is drawn on', () => {
    // 3:1, the WCAG AA floor for large text and UI components. These inks are
    // used at chip and badge size, bold.
    const ground = p.card ?? p.panel ?? p.bg;
    const failures: string[] = [];
    for (const k of [...GENDER, ...CEFR]) {
      const c = contrast(p[k], ground);
      if (c < 3) failures.push(`${k} ${p[k]} on ${ground} = ${c.toFixed(2)}:1`);
    }
    expect(failures).toEqual([]);
  });
});

/** The core text pairs, both themes.
 *
 *  DESIGN §2 has stated "every text pair must clear 4.5:1" since it was written,
 *  and enforced it with *a snippet you paste into the browser console*. That is
 *  not a check — nothing runs it, and it cannot fail a build. It went unguarded
 *  through at least one full palette (the terminal → Atlas inversion) and was
 *  still unguarded when the light ground was warmed to paper on 2026-08-26,
 *  which is the change that finally paid for this test.
 *
 *  `panel2` is included deliberately. It is the sunken fill under nested rows,
 *  it is the darkest light-theme ground, and `dim` on `panel2` was the pair
 *  closest to failing before the warm palette (4.74) — i.e. exactly the pair a
 *  console check performed on the two obvious grounds would have missed. */
describe('the core text pairs clear AA', () => {
  // Every ink that carries prose or a number, against every ground it is drawn
  // on. Enumerated rather than inferred: a ground the app never uses would
  // weaken the check, and an ink nobody reads would produce a false failure.
  const INKS = ['txt', 'dim', 'accent'];
  const GROUNDS = ['bg', 'panel', 'panel2', 'card'];

  for (const theme of ['light', 'dark'] as const) {
    it(`${theme}: every ink on every ground`, () => {
      const p = palette(theme);
      const failures: string[] = [];
      for (const ink of INKS) {
        for (const ground of GROUNDS) {
          // `card` is only re-declared in dark; in light it is inherited from the
          // same block, so both themes resolve all four.
          if (!p[ink] || !p[ground]) { failures.push(`${theme}: missing ${ink} or ${ground}`); continue; }
          const c = contrast(p[ink], p[ground]);
          if (c < 4.5) failures.push(`${theme}: ${ink} ${p[ink]} on ${ground} ${p[ground]} = ${c.toFixed(2)}:1`);
        }
      }
      expect(failures).toEqual([]);
    });
  }

  /** §2: "Both themes use the same three-step ramp, so 'raised' means the same
   *  thing in each. Only luminance inverts." A ramp that stops being monotonic
   *  is a card that no longer reads as raised — the defect the pure-white
   *  panel/card pair caused once already, at 1.00 contrast. */
  it('keeps the elevation ramp monotonic in both directions', () => {
    const light = palette('light');
    const dark = palette('dark');
    // Light rises bg → panel → card; dark rises the same way in *token* terms,
    // which means luminance also rises (a dark card is lighter than a dark page).
    for (const [name, p] of [['light', light], ['dark', dark]] as const) {
      const bg = lum(p.bg), panel = lum(p.panel), card = lum(p.card);
      expect(panel, `${name}: panel must sit above bg`).toBeGreaterThan(bg);
      expect(card, `${name}: card must sit above panel`).toBeGreaterThan(panel);
    }
  });
});

/** The claim the warm ground shipped on, made re-derivable.
 *
 *  DESIGN §2 and the CHANGELOG both state that moving the light neutrals from
 *  cool grey-blue to paper *improved* contrast — "dim on bg 5.18 → 5.85", "dim on
 *  panel2 4.74 → 5.38". Those figures came out of a throwaway script that was
 *  never committed, which is precisely the failure LESSONS' newest checklist rule
 *  names: **commit the instrument that produced the finding, in the same pass. A
 *  number nobody can re-derive is a number that expires.**
 *
 *  So the superseded palette is pinned here as data. This is not nostalgia — it
 *  is the only thing that keeps two published numbers honest, and it turns "we
 *  made it warmer" into "we made it warmer and it got more legible, and here is
 *  the assertion that says so". If a future palette regresses past the cool one
 *  on these pairs, this fails and the docs stop being true out loud rather than
 *  quietly. */
describe('the warm ground beats the palette it replaced', () => {
  // The light theme as it stood before 2026-08-26. Frozen on purpose.
  const COOL = { bg: '#e7ecee', panel: '#f7f9fa', panel2: '#dbe3e6', card: '#ffffff',
                 txt: '#16232a', dim: '#52646d', accent: '#1d6a8c' };

  it('is no worse on any core pair, and better where it mattered', () => {
    const now = palette('light');
    const regressions: string[] = [];
    for (const ink of ['txt', 'dim', 'accent']) {
      for (const ground of ['bg', 'panel', 'panel2', 'card']) {
        const before = contrast(COOL[ink as keyof typeof COOL], COOL[ground as keyof typeof COOL]);
        const after = contrast(now[ink], now[ground]);
        // Tolerance is 0.1, not zero, and the number is argued rather than
        // picked. Two pairs move down by a rounding error — `txt` on the warmer
        // grounds (13.48 → 13.35, at three times the requirement) and `accent`
        // on `bg` (5.05 → 5.01). Neither is perceptible, neither approaches the
        // floor, and a zero-tolerance assertion here would forbid every future
        // ground adjustment in the app on the strength of a hundredth of a
        // point. What the test is actually for is a *meaningful* loss on a pair
        // that was already tight — which is what 4.74 → 4.49 was, and it caught
        // that one on its first run.
        if (before < 7 && after < before - 0.1) {
          regressions.push(`${ink} on ${ground}: ${before.toFixed(2)} → ${after.toFixed(2)}`);
        }
      }
    }
    expect(regressions).toEqual([]);
  });

  it('re-derives the two figures the docs publish', () => {
    const now = palette('light');
    // DESIGN §2's table. If either side of an arrow moves, the doc is wrong.
    expect(contrast(COOL.dim, COOL.bg)).toBeCloseTo(5.18, 1);
    expect(contrast(now.dim, now.bg)).toBeCloseTo(5.85, 1);
    expect(contrast(COOL.dim, COOL.panel2)).toBeCloseTo(4.74, 1);
    expect(contrast(now.dim, now.panel2)).toBeCloseTo(5.38, 1);
    // And the pair that the guard caught at 4.49 before panel2 was corrected:
    // the shipped value must match what the cool palette scored, not beat it.
    expect(contrast(now.accent, now.panel2)).toBeCloseTo(4.62, 1);
  });
});

// ── The glass chrome ────────────────────────────────────────────────────────
// `.glass` composites `--color-panel` at a fixed alpha over whatever is behind
// it. On the bars that is almost always the page — and the *page* is the ground
// the type is then read against, not the panel the token names. So the alpha is
// a contrast decision wearing a taste decision's clothes, and it needs the same
// guard every other pair here gets.
//
// Worst case is a bar with nothing but the page behind it, which is what the top
// bar looks like on every surface except a mid-scroll feed. Anything behind that
// is *lighter* than the page (a card, a white feed pill) only helps in light and
// only hurts in dark, which is why both directions are checked.
describe('text stays legible through the glass', () => {
  /** `color-mix(in srgb, panel A%, transparent)` painted over `behind`. */
  const composite = (panel: string, behind: string, alpha: number): string => {
    const [pr, pg, pb] = hex(panel);
    const [br, bg, bb] = hex(behind);
    const mix = (p: number, b: number) => Math.round(p * alpha + b * (1 - alpha));
    return '#' + [mix(pr, br), mix(pg, bg), mix(pb, bb)]
      .map((v) => v.toString(16).padStart(2, '0')).join('');
  };

  /** The alphas the stylesheet declares, read out of it rather than retyped — a
   *  guard that hardcodes the value it is guarding tests nothing.
   *
   *  **Two states since 2026-09-06.** `--glass-full` is a bar with content behind
   *  it; `--glass-rest` is the same bar at the top of the scroll, where it recedes
   *  (see DESIGN §8·1·1). The *at-rest* alpha is the lower one and therefore the
   *  harder case, so it is the one that actually needs this guard — which is
   *  exactly why it is here, and why the rename that introduced it broke the
   *  regex loudly instead of quietly widening the tolerance. */
  const read = (name: string) =>
    [...css.matchAll(new RegExp(`--${name}:\\s*color-mix\\(in srgb, var\\(--color-panel\\) (\\d+)%`, 'g'))]
      .map((m) => Number(m[1]) / 100);

  const STATES = [
    { state: 'engaged', alphas: read('glass-full') },
    { state: 'at rest', alphas: read('glass-rest') },
  ] as const;

  it('reads every alpha out of the stylesheet', () => {
    for (const { state, alphas } of STATES) {
      expect(alphas, `${state}: light, then dark`).toHaveLength(2);
      // Below half, the bar is a tint rather than a material and no contrast
      // budget survives it. A value under this is a design error, not a
      // borderline one.
      for (const a of alphas) expect(a, `${state} alpha`).toBeGreaterThan(0.5);
    }
  });

  for (const { state, alphas } of STATES) {
    for (const [i, theme] of (['light', 'dark'] as const).entries()) {
      it(`keeps dim and txt above AA on ${theme} glass, ${state}`, () => {
        const p = palette(theme);
        const ground = composite(p.panel, p.bg, alphas[i]);
        // 4.5 is AA for body text. `dim` is the one that has ever been close —
        // it is the value the warm-paper change nearly broke on `panel2`.
        expect(contrast(p.dim, ground), `dim on ${theme} glass ${state} (${ground})`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.txt, ground), `txt on ${theme} glass ${state}`).toBeGreaterThanOrEqual(4.5);
        // The accent is the goal pill's bar and the active tab's label.
        expect(contrast(p.accent, ground), `accent on ${theme} glass ${state}`).toBeGreaterThanOrEqual(4.5);
      });

      it(`keeps them above AA on ${theme} glass over a card, ${state}`, () => {
        // A feed pill sits over the page; a sheet's close button can sit over the
        // white study surface; the tab capsule at rest can sit over Fortschritt's
        // heatmap card. Both grounds, one rule.
        const p = palette(theme);
        const ground = composite(p.panel, p.card, alphas[i]);
        expect(contrast(p.dim, ground), `dim on ${theme} glass over card, ${state}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.accent, ground), `accent on ${theme} glass over card, ${state}`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  // ── What the four tests above cannot see ──────────────────────────────────
  //
  // **They cannot fail on the alpha.** `panel`, `bg` and `card` are 1.14 and 1.05
  // luminance apart, so compositing panel over either barely moves the ground:
  // sweep the alpha from 100% to *zero* and `dim` travels from 6.67 to 5.85. A
  // bar with no fill at all passes. Every assertion above has been green since it
  // was written for a reason that has nothing to do with the value it claims to
  // guard — and DESIGN §8·1 says this guard is what makes the alpha "a contrast
  // decision", which it was not.
  //
  // The ground that *does* vary is the one glass exists for: the thing sliding
  // underneath. A 44px headword in `--color-txt`, a `--heat-4` tile on
  // Fortschritt, the accent-filled *Study all* button. Composited at the engaged
  // 78%, those grounds put `dim` and `accent` **under AA**:
  //
  //            light                       dark
  //   ink      dim 4.27  accent 3.66       dim 3.28  accent 3.57
  //   heat-4   dim 4.88  accent 4.18       dim 4.10  accent 4.46
  //
  // Which channel fails is not constant — over a heat-4 tile in light it is the
  // accent alone (4.18) while `dim` clears at 4.88, and over ink it is both. So
  // the pin takes the *worse of the pair*, not a nominated one: an assertion
  // about `dim` specifically passes on the light heat tile and would have made
  // this look half-fixed.
  //
  // This is **not** caused by the at-rest state added on 2026-09-06 — at rest the
  // bar is at the top of the scroll, which is precisely when the ground *is* the
  // page. It is the engaged alpha, and it has shipped since the material did.
  //
  // Pinned rather than asserted, deliberately. Asserting AA here would demand
  // ~95% fill, which is not glass; asserting a lower threshold would be loosening
  // a tolerance to fit a number, which is the move this file exists to prevent.
  // So it records the worst case and fails if it gets *worse*, and the fix — bar
  // labels that do not depend on their backdrop — is filed in BACKLOG.
  describe('the transient worst case, pinned', () => {
    const SATURATED = {
      light: { ink: '#1e2226', heat4: '#1d6a8c' },
      dark: { ink: '#e6edef', heat4: '#63b3d4' },
    } as const;

    for (const theme of ['light', 'dark'] as const) {
      it(`${theme}: records how far under AA a bar label falls over moving content`, () => {
        const p = palette(theme);
        const engaged = read('glass-full')[theme === 'light' ? 0 : 1];
        for (const [what, behind] of Object.entries(SATURATED[theme])) {
          const ground = composite(p.panel, behind, engaged);
          const worst = Math.min(contrast(p.dim, ground), contrast(p.accent, ground));
          // Known-bad, and bounded. If a change pushes any of these below 3.0 the
          // label has stopped being readable at all rather than merely failing a
          // ratio, and that is a different and much worse defect.
          expect(worst, `worst bar label over ${what} (${theme})`).toBeGreaterThan(3.0);
          expect(worst, `worst bar label over ${what} (${theme}) — if this now clears AA, delete this test and move the ground up`)
            .toBeLessThan(4.5);
        }
      });
    }
  });
});

// ── The 16px rule ───────────────────────────────────────────────────────────
//
// iOS Safari zooms the page whenever a focused input's text is under 16px. It was
// measured on an iPhone 17 Pro with an in-page probe, not inferred: focusing the
// text scanner's textarea took `visualViewport.scale` to **1.14** and panned the
// viewport to `@25,167`, which dragged the top bar under the status bar and put the
// scanner's own result off the side of the screen.
//
// The app cannot opt out by choosing a bigger token — `--text-base` is 0.9375rem =
// **15px** and is the largest body size in the ramp — so the rule has to override the
// ramp on touch devices, and it has to keep doing so.
describe('form controls clear the iOS auto-zoom threshold', () => {
  it('the ramp really does top out under 16px, which is why the rule exists', () => {
    const base = css.match(/--text-base:\s*([\d.]+)rem/);
    expect(base, '--text-base is declared').toBeTruthy();
    expect(Number(base![1]) * 16).toBeLessThan(16);
  });

  it('forces at least 16px on inputs where the pointer is coarse', () => {
    const coarse = css.slice(css.indexOf('@media (any-pointer: coarse)'));
    expect(coarse).toMatch(/input,\s*textarea,\s*select\s*\{[^}]*font-size:\s*max\(16px/);
  });

  it('does not reach for maximum-scale, which would be a WCAG 1.4.4 failure', () => {
    // Comments stripped first. `index.html` *explains* at length why maximum-scale
    // is absent, so a naive search matches the explanation as readily as the
    // defect — the same trap `review-structure.test.ts` documents, and this test
    // fell into it on its first run.
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '');
    expect(html).not.toMatch(/maximum-scale/);
    expect(html).not.toMatch(/user-scalable\s*=\s*no/);
  });
});
