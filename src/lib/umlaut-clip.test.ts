// The tab bar said **Uben**.
//
// `Üben` is one of four labels in the bottom bar, and the diaeresis was gone — on a
// real iPhone, at the default text size, on the app's own navigation. The mechanism:
// the label is `truncate` (which is `overflow: hidden`) with `leading-none`, so the
// line box is exactly 1em while the font's own line box is about 1.2em. The 0.1em of
// ascent that gets trimmed off the top is precisely where a diaeresis sits on a
// *capital* letter, and at 11px that is a little over one pixel of ink.
//
// `Wörter`, two tabs to the left, was untouched — a lowercase ö carries its dots at
// cap height, which is inside the box. That is why this looked like nothing for so
// long: the bar had an umlaut that worked sitting next to one that didn't.
//
// **It was found once before, fixed, and withdrawn — on two bad tests.** The check
// was `scrollHeight === clientHeight`, which compares *layout boxes* and knows
// nothing about ink that overflows them, so it reported 15 === 15 and cleared a
// defect it could not see. And it was run against the deployed build rather than the
// branch carrying the fix, so the symptom was always going to be unchanged. Both are
// in `docs/LESSONS.md`.
//
// The rule this leaves behind is not about umlauts. `overflow: hidden` plus
// `line-height: 1` clips ink in any script with tall diacritics, and this is a German
// app: the combination is banned outright rather than audited case by case.
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

/** A clipping box and a 1em line box on the same element. */
const CLIPS_INK = (cls: string) =>
  /\bleading-none\b/.test(cls) && /\btruncate\b|\boverflow-hidden\b|\bline-clamp-\d/.test(cls);

describe('a clipping box never gets a 1em line box', () => {
  it('the check can see the defect it is looking for', () => {
    // The exact className that shipped, so a green run means the rule is enforced.
    expect(CLIPS_INK('text-2xs leading-none tracking-tight truncate max-w-full')).toBe(true);
    expect(CLIPS_INK('text-2xs leading-[1.35] tracking-tight truncate max-w-full')).toBe(false);
    // `leading-none` on its own is fine — ink that overflows a line box still draws.
    expect(CLIPS_INK('display text-4xl leading-none mb-2')).toBe(false);
  });

  it.each(tsx)('%s never pairs the two', (file) => {
    for (const m of readFileSync(file, 'utf8').matchAll(/className=[{`"]([^"`]*)/g)) {
      expect(CLIPS_INK(m[1]), `clipped ink: ${m[1].replace(/\s+/g, ' ').trim()}`).toBe(false);
    }
  });
});
