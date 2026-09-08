// The source has to stay searchable.
//
// `grep -n levels src/store.ts` printed nothing — in a 1,786-line module full of
// the word — and exited 0, which is grep saying "no matches" rather than "I
// declined". Three raw NUL bytes were in the file: deliberate in intent (a NUL is
// the field separator in a confusion-pair key, because a learner-facing German
// string could contain any printable one) but written as literal bytes instead of
// the escape `\0`. Both GNU and BSD grep classify a file containing a NUL as
// binary and skip it. Every search of the app's core store had been quietly
// answering "not found" for as long as those bytes were there.
//
// `\0` in a string literal is one NUL at runtime and two ordinary characters on
// disk: identical behaviour, and the file stays text. This is the guard.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css|js|json|md)$/.test(p)) out.push(p);
  }
  return out;
}

// `public/data` is generated corpus, not hand-written source, and it is large;
// nothing there is ever grepped by a person.
const files = [...walk('src'), ...walk('scripts'), ...walk('docs')];

describe('no source file is invisible to grep', () => {
  it('has files to check', () => {
    // A walk that silently returned nothing would pass every assertion below.
    expect(files.length).toBeGreaterThan(200);
  });

  it.each(files)('%s contains no raw NUL', (file) => {
    const buf = readFileSync(file);
    const at = buf.indexOf(0);
    expect(
      at,
      at < 0 ? '' : `NUL at byte ${at} — write \\0 instead, or grep skips this file`,
    ).toBe(-1);
  });
});
