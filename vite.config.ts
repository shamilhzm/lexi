import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

/** `public/` is copied verbatim, so the canonical corpus would ride along as 5.4 MB
 *  of dead weight that nothing fetches — `initData` boots on `cards.json` and the
 *  rest arrives from `detail.json` (see scripts/corpus/split.ts). It stays in the
 *  repo because every `scripts/corpus/*` tool and eight test files read it; it just
 *  has no business in a deploy.
 *
 *  Done here rather than in `.vercelignore`, which is applied to CLI uploads and not
 *  to Vercel's git-integration clones — the path this project actually deploys by. */
const dropCanonicalCorpus = {
  name: 'lexi-drop-canonical-corpus',
  closeBundle() {
    rmSync(join('dist', 'data', 'vocab.json'), { force: true });
  },
};

export default defineConfig({
  // GitHub Pages serves from https://<user>.github.io/lexi/ (subpath), but Vercel
  // serves from the domain root. Vercel sets VERCEL=1 at build time, so serve from
  // '/' there and '/lexi/' everywhere else. Everything (index.html asset URLs, the
  // service worker registration via BASE_URL) derives from this.
  base: process.env.VERCEL ? '/' : '/lexi/',
  plugins: [react(), tailwindcss(), dropCanonicalCorpus],
});
