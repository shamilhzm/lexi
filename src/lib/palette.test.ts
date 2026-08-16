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
