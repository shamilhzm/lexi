import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

/** Which commit this bundle was built from, and when.
 *
 *  There was no way to tell whether the app on a phone was the build you just
 *  deployed — the service worker serves an offline-first shell, so "did my fix
 *  land?" was answered by reloading and hoping. Baked in at build time and read
 *  back by Settings.
 *
 *  Vercel exposes the commit in the environment; a local build asks git; neither
 *  is fatal, because a stamp that fails the build is worse than a stamp that says
 *  "dev". */
const buildSha = (() => {
  const fromCi = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromCi) return fromCi.slice(0, 7);
  try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return 'dev'; }
})();
const buildTime = new Date().toISOString();

/** The same stamp as a file the *running* app can fetch, so it can compare what it
 *  is against what the server is serving. Emitted rather than committed: a file in
 *  `public/` would be a value someone has to remember to update. */
const versionStamp = {
  name: 'lexi-version-stamp',
  generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ sha: buildSha, builtAt: buildTime }) + '\n',
    });
  },
};

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
  plugins: [react(), tailwindcss(), dropCanonicalCorpus, versionStamp],
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
});
