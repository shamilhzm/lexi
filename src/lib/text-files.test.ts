// Every tracked source and doc file must actually be a text file.
//
// A single NUL byte makes `grep` and `ripgrep` classify a whole file as binary and
// return **no matches, exit 1** — indistinguishable from a clean sweep. It is the
// worst shape a failure can take in this repo, because the audits here are built on
// repo-wide greps: a tool that refuses to read a file reports the same thing as a
// file with nothing in it.
//
// This is not hypothetical. On an older tree three files carried one — pasted as a
// raw byte where an escape was meant, as a Map-key separator in `store.ts`,
// `brain/atlas.ts` and `corpus/examples.ts` — and for as long as they did, every
// `grep -rn … src` silently skipped the state store. All three are clean now, which
// is exactly when a check is worth adding: nothing else stops it coming back, and
// the mistake is one keystroke. `git grep` sees through it, and nobody types
// `git grep`.
//
// The separator itself was right — these are learner-facing German strings and any
// printable delimiter could occur in the data. Written as an escape it produces the
// identical character and stays greppable, so there is no trade to make here.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Extensions that must be text. Deliberately not `.json`: the corpus is megabytes
 *  and is written only by `scripts/corpus/*`, which cannot emit a control byte. */
const TEXT = /\.(ts|tsx|md|tsv|css|html|yml|yaml)$/;

/** Tab, newline, carriage return. Everything else below 0x20 is a bug. */
const ALLOWED = new Set([0x09, 0x0a, 0x0d]);

function trackedTextFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 32 << 20 })
    .split('\0')
    .filter((f) => f && TEXT.test(f));
}

/** The bytes that would make a tool call this file binary, with where they are. */
export function controlBytes(buf: Buffer): { offset: number; byte: number }[] {
  const out: { offset: number; byte: number }[] = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 0x20 && !ALLOWED.has(b)) out.push({ offset: i, byte: b });
  }
  return out;
}

describe('tracked text files', () => {
  it('lists something, so a passing run is not an empty one', () => {
    // A sweep that enumerates nothing passes loudly and proves nothing — the exact
    // failure mode this file exists to catch, one level up.
    expect(trackedTextFiles().length).toBeGreaterThan(200);
  });

  it('contain no control bytes, so grep and rg can read them', () => {
    const offenders = trackedTextFiles()
      .map((f) => ({ f, hits: controlBytes(readFileSync(f)) }))
      .filter((r) => r.hits.length > 0)
      .map((r) => `${r.f}: ${r.hits.length} × ${r.hits.slice(0, 3).map((h) => `0x${h.byte.toString(16)}@${h.offset}`).join(', ')}`);
    expect(offenders).toEqual([]);
  });

  it('fires on a file that does carry one', () => {
    // Prove the check works before trusting the PASS above — LESSONS.md's rule for
    // any pass that drives something to zero. Injected here, never into a tracked file.
    expect(controlBytes(Buffer.from(`a${String.fromCharCode(0)}b`))).toEqual([{ offset: 1, byte: 0 }]);
    expect(controlBytes(Buffer.from('a\tb\nc\r\n'))).toEqual([]);
  });
});
