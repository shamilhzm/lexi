// A static server for `dist/` that writes down what it actually sent.
//
// Cold-boot size is the kind of number that is easy to assert and hard to measure.
// The browser pane is the wrong instrument twice over: it runs *hidden*, so
// `IntersectionObserver` is suspended and anything that loads on scroll never
// loads at all, and it keeps an HTTP cache, so the second measurement of a "cold"
// boot quietly omits whatever the first one fetched. Both failures move the number
// in the flattering direction.
//
// So the measurement moves to the server, where it cannot be flattered. Every
// response is counted at the wire, gzip included, and the running total is printed
// per request. Drive the app from the iPhone simulator against this and the log is
// the cold boot, byte for byte.
//
//   npm run measure          # then open http://<lan-ip>:4319/lexi/ on the phone
//   npm run measure -- --reset-on /lexi/     # zero the total on each fresh launch
//
// Serves `dist/`, so `npm run build` first. It is a maintainer's tool: it has no
// place in the app, and nothing imports it.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { extname, join, normalize } from 'node:path';

const ROOT = 'dist';
const PORT = Number(process.env.PORT ?? 4319);
const BASE = '/lexi';
/** Zeroing the counter has to be a request, because the thing being measured is a
 *  device across the room and there is no other way to say "the run starts here".
 *  `--reset-on <path>` picks the trigger; `/reset` is always one, so a maintainer
 *  can `curl` it between launches without arguments. */
const resetOn = process.argv.includes('--reset-on')
  ? process.argv[process.argv.indexOf('--reset-on') + 1]
  : null;
const isReset = (p: string) => p === '/reset' || p === resetOn;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};
/** Already-compressed formats: gzipping them costs CPU and adds bytes. */
const OPAQUE = new Set(['.woff2', '.png', '.jpg', '.webp', '.avif']);

let total = 0;
let n = 0;
const kb = (b: number) => `${(b / 1024).toFixed(1)} kB`;

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  let p = decodeURIComponent(url.pathname);
  if (isReset(p)) { total = 0; n = 0; console.log('\n──────── reset ────────'); }
  if (p.startsWith(BASE)) p = p.slice(BASE.length);
  // Normalise before joining, so `..` cannot walk out of `dist`.
  const rel = normalize(p).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, rel);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(ROOT, 'index.html');

  const ext = extname(file);
  const body = readFileSync(file);
  const wantsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] as string ?? '')
    && !OPAQUE.has(ext);
  const sent = wantsGzip ? gzipSync(body) : body;

  total += sent.length;
  n += 1;
  console.log(
    `${String(n).padStart(3)}  ${kb(sent.length).padStart(10)}  ${kb(total).padStart(11)} total  ${p}`,
  );

  res.writeHead(200, {
    'content-type': TYPES[ext] ?? 'application/octet-stream',
    'content-length': String(sent.length),
    ...(wantsGzip ? { 'content-encoding': 'gzip' } : {}),
    // Nothing may be reused between runs: a cached response is a byte this tool
    // would not see, and the whole point is to see all of them.
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  if (req.method === 'HEAD') res.end(); else res.end(sent);
});

server.listen(PORT, () => {
  if (!existsSync(ROOT)) {
    console.error(`\n  ${ROOT}/ is not there — run \`npm run build\` first.\n`);
    process.exit(1);
  }
  console.log(`\n  measuring ${ROOT}/ on http://localhost:${PORT}${BASE}/`);
  console.log('  every response gzipped and counted; nothing is cacheable.\n');
});

process.on('SIGINT', () => {
  console.log(`\n\n  ${n} requests, ${kb(total)} on the wire.\n`);
  process.exit(0);
});
