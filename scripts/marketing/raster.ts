// Rasterise a share image with headless Chrome, so it is set in the app's own type.
//
// **Why not `sips` any more** *(2026-11-26)*. CoreSVG draws text in whatever fonts
// the Mac has installed, so the share cards were set in Iowan Old Style and Helvetica
// while the app is Bricolage Grotesque and IBM Plex Mono. The Heft's type is the
// Heft. Chrome renders an HTML page with the same woff2 files the app ships (from
// node_modules/@fontsource), inlined as data URLs so nothing is fetched, and `sips`
// only converts its PNG to JPEG.
//
// Maintainer's machine only, like the corpus scripts: the JPEG is committed. Set
// CHROME_PATH if Chrome is somewhere else. No network, a throwaway profile.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

/** The two faces the app sets, as @font-face rules with the files inlined. */
export function fontFaces(root: string): string {
  const b64 = (rel: string) => readFileSync(join(root, 'node_modules', rel)).toString('base64');
  const brico = b64('@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2');
  const mono = (w: number) => b64(`@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${w}-normal.woff2`);
  return `@font-face { font-family: "Bricolage Grotesque"; font-weight: 200 800; src: url(data:font/woff2;base64,${brico}) format("woff2"); }
@font-face { font-family: "IBM Plex Mono"; font-weight: 400; src: url(data:font/woff2;base64,${mono(400)}) format("woff2"); }
@font-face { font-family: "IBM Plex Mono"; font-weight: 500; src: url(data:font/woff2;base64,${mono(500)}) format("woff2"); }`;
}

/** Render `html` at w×h and write a JPEG to `out`. Throws with a usable message
 *  when Chrome or sips is missing; the page is left on disk for a manual render. */
export function rasterise(html: string, out: string, w: number, h: number, quality = 82): void {
  const dir = mkdtempSync(join(tmpdir(), 'lexi-raster-'));
  const page = join(dir, 'page.html');
  writeFileSync(page, html);
  const chrome = CANDIDATES.find((p): p is string => !!p && existsSync(p));
  if (!chrome) throw new Error(`no Chrome found (set CHROME_PATH). The page is at ${page}: render it at ${w}×${h}.`);
  const png = join(dir, 'shot.png');
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--disable-extensions', '--disable-background-networking',
    `--user-data-dir=${join(dir, 'profile')}`,
    '--force-device-scale-factor=1', `--window-size=${w},${h}`,
    // Long enough for the inlined fonts to decode before the shot is taken.
    '--virtual-time-budget=3000',
    `--screenshot=${png}`, pathToFileURL(page).href,
  ], { stdio: 'ignore' });
  if (!existsSync(png)) throw new Error(`Chrome wrote no screenshot. The page is at ${page}.`);
  // JPEG, not PNG: link previews are commonly dropped above ~300 KB.
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), png, '--out', out], { stdio: 'ignore' });
}
