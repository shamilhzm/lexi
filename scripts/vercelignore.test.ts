// The deploy builds on Vercel from what `.vercelignore` lets through, not from git.
// CI builds from git, so a build-time import that Vercel never receives passes CI
// and fails every deploy — which is what happened on 2026-09-27. This pins the one
// invariant that matters: every relative import in `vite.config.ts` is uploaded.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const rules = readFileSync('.vercelignore', 'utf8').split('\n')
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

/** gitignore-style, reduced to what this file uses: `dir`, `dir/*`, `!path`,
 *  `*.ext`, and exact paths. Last matching rule wins. */
function ignored(path: string): boolean {
  let out = false;
  for (const raw of rules) {
    const neg = raw.startsWith('!');
    const r = neg ? raw.slice(1) : raw;
    const re = new RegExp('^' + r.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '(/.*)?$');
    const base = path.split('/').pop()!;
    if (re.test(path) || (!r.includes('/') && re.test(base))) out = !neg;
  }
  return out;
}

describe('.vercelignore', () => {
  const imports = [...readFileSync('vite.config.ts', 'utf8').matchAll(/from '\.\/([^']+)'/g)].map((m) => m[1]);

  it('uploads every file vite.config.ts imports', () => {
    expect(imports.length).toBeGreaterThan(0);
    expect(imports.filter(ignored)).toEqual([]);
  });

  it('still keeps the corpus pipeline and raw data out of the upload', () => {
    expect(ignored('scripts/corpus/validate.ts')).toBe(true);
    expect(ignored('scripts/corpus/data/raw/leipzig.txt')).toBe(true);
    expect(ignored('scripts/marketing/og-image.ts')).toBe(true);
    expect(ignored('src/main.tsx')).toBe(false);
  });
});
