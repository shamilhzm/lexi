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
