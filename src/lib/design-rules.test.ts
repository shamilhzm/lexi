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
