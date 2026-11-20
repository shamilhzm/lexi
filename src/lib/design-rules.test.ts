// Two rules from docs/DESIGN.md that were being kept by memory, and so were not
// being kept. Source guards: each one first proves it can see the defect it is
// looking for, so a green run means the rule holds rather than that the pattern
// stopped matching anything (LESSONS, *finish a pass that drives something to zero*).
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
const code = (file: string) => readFileSync(file, 'utf8').split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l));

/** A class string that is both mono and tracked caps — a kicker wearing the data face. */
const MONO_KICKER = /font-mono[^"'`]*\buppercase\b|\buppercase\b[^"'`]*font-mono/;

/** `line-clamp` on an element that is also `flex`/`grid`: the clamp is itself a
 *  `display` and replaces the other one. A variant prefix (`short:`, `sm:`) on
 *  either side does not make them compatible. */
const CLAMPED_ROW = /(?<![\w-])(?:inline-)?(?:flex|grid)(?![\w-])[^"'`]*line-clamp-\d|line-clamp-\d[^"'`]*(?<![\w-])(?:inline-)?(?:flex|grid)(?![\w-])/;

describe('mono means data (DESIGN §4)', () => {
  it('the check can see the defect it is looking for', () => {
    // The session card's front, as it shipped until 2026-11-14.
    expect('text-2xs text-dim font-mono uppercase tracking-widest max-w-full truncate').toMatch(MONO_KICKER);
    expect('text-2xs font-semibold uppercase tracking-widest text-dim').not.toMatch(MONO_KICKER);
    expect('font-mono text-2xs text-dim tabular-nums').not.toMatch(MONO_KICKER);
  });

  it.each(tsx)('%s sets no label in tracked mono caps', (file) => {
    for (const line of code(file)) expect(line).not.toMatch(MONO_KICKER);
  });
});

describe('a clamp goes on the text, not on the row', () => {
  it('the check can see the defect it is looking for', () => {
    // WhyThisCard's line, as it shipped from 2026-10-14 to 2026-11-14.
    expect('flex items-start gap-1.5 text-2xs text-dim text-center leading-relaxed short:line-clamp-1').toMatch(CLAMPED_ROW);
    expect('min-w-0 short:line-clamp-1').not.toMatch(CLAMPED_ROW);
    expect('line-clamp-2 break-words flex-shrink-0').not.toMatch(CLAMPED_ROW);
  });

  it.each(tsx)('%s clamps no flex or grid element', (file) => {
    for (const line of code(file)) expect(line).not.toMatch(CLAMPED_ROW);
  });
});

/** Ink faded with an alpha modifier (`text-dim/80`) or an opacity utility
 *  (`opacity-70`). `palette.test.ts` holds every token pair to 4.5:1 (DESIGN §2),
 *  and a fade renders below the pair it was tested as, where no token test can
 *  see it. On 2026-11-20 seven sites read 2.90–4.15:1 (the pace sublabel, the
 *  offline pack's size, a story's photo credit, the word map's counts). A variant
 *  prefix (`disabled:`, `hover:`) is a state, not a resting ink, and is not
 *  matched; neither are `opacity-0` and `opacity-100`, which hide and show. */
const FADED_INK = /(?<![\w:-])(?:text-[a-z0-9-]+\/\d{1,2}(?!\d)|opacity-[1-9]\d?(?!\d))/;

/** Fades a learner is not asked to read. Each must still match a line, so the list
 *  cannot outlive the code it excuses. */
const FADE_ALLOWED: [file: string, fragment: string, why: string][] = [
  ['src/components/film/FilmPlayer.tsx', "canNext ? '' : 'opacity-40'", 'a disabled control; WCAG exempts inactive components'],
  ['src/components/Reveal.tsx', 'text-dim/50', 'the aria-disabled speaker shown when no German voice is installed'],
  ['src/components/SagEs.tsx', 'gap-4 opacity-45" aria-hidden', 'the words still to come, shown in full when they arrive (speaking is off under Focus)'],
];

describe('ink is never faded below the pair it was tested as (DESIGN §2)', () => {
  it('the check can see the defect it is looking for', () => {
    // The pace sublabel and the map tile's count, as they shipped until 2026-11-20.
    expect('font-mono text-2xs opacity-70').toMatch(FADED_INK);
    expect('mt-3 text-2xs text-dim/80 truncate').toMatch(FADED_INK);
    expect('disabled:opacity-40 hover:opacity-90').not.toMatch(FADED_INK);
    expect('transition-opacity opacity-0 sm:opacity-100').not.toMatch(FADED_INK);
    expect('bg-accent/10 border-line').not.toMatch(FADED_INK);
  });

  it.each(tsx)('%s fades no ink', (file) => {
    const allowed = FADE_ALLOWED.filter(([f]) => f === file).map(([, frag]) => frag);
    for (const line of code(file)) {
      if (allowed.some((frag) => line.includes(frag))) continue;
      expect(line).not.toMatch(FADED_INK);
    }
  });

  it('every allowed fade still exists', () => {
    const stale = FADE_ALLOWED.filter(([f, frag]) => !readFileSync(f, 'utf8').includes(frag));
    expect(stale).toEqual([]);
  });
});
