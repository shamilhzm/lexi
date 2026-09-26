// The Vite half of `src/lib/publicCopy.ts`: read the shipped data, stamp the
// counts and the public origin into `index.html` — on every build and in dev, so
// what a search result or a link preview says is what the corpus holds today.
//
// Reads the same files the app fetches (`public/data/cards.json`, and the
// dictionary manifest's `n`), not the canonical `vocab.json`, because the promise
// is about what ships.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { countTaught, stampPublicCopy, PUBLIC_ORIGIN } from '../../src/lib/publicCopy.ts';

export function publicCopy(root = process.cwd()) {
  const read = (p: string) => JSON.parse(readFileSync(join(root, 'public', 'data', p), 'utf8'));
  return {
    name: 'lexi-public-copy',
    transformIndexHtml(html: string) {
      const counts = {
        words: countTaught(read('cards.json') as { kind?: string }[]),
        dictionary: Number(read('lex/index.json').n),
      };
      return stampPublicCopy(html, counts, process.env.LEXI_PUBLIC_ORIGIN || PUBLIC_ORIGIN);
    },
  };
}
