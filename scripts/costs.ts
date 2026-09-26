// What Lexi costs to serve, measured — so `docs/COSTS.md` never carries a number
// nobody can re-derive (LESSONS, class 1).
//
// Lexi has no server, so its bill is bytes: what a first visit downloads, how often
// a returning learner has to download some of it again, and whether the deploy still
// fits the free host. Everything below is read from `dist/`, `public/data/` and
// `git log`. The two places that are a *model* rather than a measurement — a daily
// learner's month, and what pre-rendered audio would have weighed — say so in the
// output and print their assumptions next to the result.
//
//   npm run build && node scripts/costs.ts
//   node scripts/costs.ts --live https://lexi-eosin.vercel.app
//        …adds what the host and the voice CDNs actually send on the wire.
//
// A maintainer's tool: nothing imports it and it has no place in the app.
import { readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { gzipSync, brotliCompressSync, constants as Z } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { request } from 'node:https';

// ---- published limits, with where they came from ------------------------------------
// Checked 2026-09-25 at https://vercel.com/docs/limits/fair-use-guidelines and
// https://vercel.com/docs/limits. Re-read them before trusting the ceiling below:
// they are the host's terms, not a property of this repo.
const HOBBY_TRANSFER = 100e9; // "Fast Data Transfer — first 100 GB" a month
const HOBBY_UPLOAD = 100e6; // CLI deploy: "100 MB" of source files
const HOBBY_FILES = 15_000; // CLI deploy: "15,000" source files

const DIST = 'dist';
const DATA = 'public/data';
const live = process.argv.includes('--live') ? process.argv[process.argv.indexOf('--live') + 1] : null;

const gz = (b: Buffer) => gzipSync(b, { level: 9 }).length;
const br = (b: Buffer) => brotliCompressSync(b, { params: { [Z.BROTLI_PARAM_QUALITY]: 11 } }).length;
const kb = (n: number) => `${(n / 1e3).toFixed(0)} KB`;
const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
const row = (...cells: (string | number)[]) => console.log('  ' + cells.map(String).join('  ·  '));

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('No dist/index.html — run `npm run build` first.');
  process.exit(1);
}

// ---- 1. the boot: what a first visit downloads before and just after first paint ----
// Read from the build and from the code that fetches, never from a list typed here:
// a list typed here is the thing that goes stale (LESSONS, *incomplete enumeration*).
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const pageRefs = [...new Set([...html.matchAll(/(?:src|href)="[^"]*?(assets\/[^"]+)"/g)].map((m) => m[1]))];
// Fonts are named by the stylesheet, not the page, and the first paint sets type.
const fontRefs = pageRefs.filter((a) => a.endsWith('.css')).flatMap((css) =>
  [...readFileSync(join(DIST, css), 'utf8').matchAll(/url\(["']?[^)"']*?([\w.-]+\.woff2)/g)].map((m) => `assets/${m[1]}`));
const assetRefs = [...pageRefs, ...new Set(fontRefs)];
const fetchedBy = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/fetch\(base \+ 'data\/([\w./-]+\.json)'\)/g)].map((m) => m[1]);
const bootData = fetchedBy('src/data/index.ts');
const afterPaint = fetchedBy('src/lib/inflections.ts');

type Sized = { path: string; raw: number; gz: number; br: number };
const size = (path: string): Sized => {
  const b = readFileSync(path);
  return { path, raw: b.length, gz: gz(b), br: br(b) };
};
const boot = [
  ...assetRefs.map((a) => size(join(DIST, a))),
  ...bootData.map((d) => size(join(DIST, 'data', d))),
];
const post = afterPaint.map((d) => size(join(DIST, 'data', d)));
const sum = (xs: Sized[], k: 'raw' | 'gz' | 'br') => xs.reduce((a, x) => a + x[k], 0);

console.log('\n1 · First visit (gzip -9 / brotli q11 — a proxy for the wire; --live measures it)');
for (const s of [...boot, ...post]) row(s.path.replace(/^dist\//, ''), kb(s.raw) + ' raw', kb(s.gz) + ' gz', kb(s.br) + ' br');
row('before first paint', kb(sum(boot, 'gz')) + ' gz', kb(sum(boot, 'br')) + ' br');
row('+ after first paint', kb(sum(post, 'gz')) + ' gz');

// ---- 2. what loads on demand -------------------------------------------------------
const dir = (d: string) => readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => join(d, f));
const detail = dir(join(DIST, 'data', 'detail')).map(size);
const lex = dir(join(DIST, 'data', 'lex')).map((p) => { const b = readFileSync(p); return { path: p, raw: b.length, gz: gz(b), br: 0 }; });
console.log('\n2 · On demand');
for (const s of detail) row(basename(s.path), kb(s.gz) + ' gz');
row(`lexicon shards (${lex.length})`, mb(sum(lex, 'raw')) + ' raw', mb(sum(lex, 'gz')) + ' gz, if every one were opened');

// ---- 3. churn: how often a returning learner re-downloads -------------------------
// A learner downloads a changed file at most once a day, so the unit is *days with a
// change*, not commits. Commit-days are an upper bound on deploy-days.
const days = (...paths: string[]) => new Set(
  execFileSync('git', ['log', '--since=30 days ago', '--format=%ad', '--date=short', '--', ...paths], { encoding: 'utf8' })
    .split('\n').filter(Boolean),
).size;
const cardsDays = days('public/data/cards.json');
const bundleDays = days('src', 'index.html');
const cards = boot.find((s) => s.path.endsWith('cards.json'));
// Fonts are content-hashed and never change with the code, so a new build re-sends
// only the script and the stylesheet.
const bundle = boot.filter((s) => s.path.includes('assets/') && !s.path.endsWith('.woff2'));
console.log('\n3 · Churn, last 30 days (days with a commit touching…)');
row('cards.json', cardsDays, `× ${kb(cards?.gz ?? 0)} gz`);
row('src/ or index.html (new bundle hashes)', bundleDays, `× ${kb(sum(bundle, 'gz'))} gz`);

// ---- 4. MODEL: a daily learner's month, and the free tier's ceiling -----------------
const month = sum(boot, 'gz') + sum(post, 'gz') + cardsDays * (cards?.gz ?? 0) + bundleDays * sum(bundle, 'gz');
console.log('\n4 · MODEL — one learner who opens Lexi every day for a month');
row('assumes: a first visit, then every changed day reaches them', 'no detail/lex shards, no voices');
row('per learner per month', mb(month));
row('learners the 100 GB Hobby transfer covers', Math.floor(HOBBY_TRANSFER / month).toLocaleString('en'));

// ---- 5. the deploy: does `vercel --prod` still fit the Hobby upload limits? --------
// Vercel's CLI reads `.vercelignore`, not `.gitignore` (see the file's own header).
const ignore = readFileSync('.vercelignore', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  .map((p) => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'));
let upBytes = 0, upFiles = 0;
const walk = (d: string) => {
  for (const name of readdirSync(d)) {
    if (ignore.some((re) => re.test(name))) continue;
    const p = join(d, name);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) walk(p); else { upBytes += st.size; upFiles++; }
  }
};
walk('.');
console.log('\n5 · The deploy upload (what `vercel --prod` sends)');
row(mb(upBytes) + ` of ${mb(HOBBY_UPLOAD)}`, `${upFiles.toLocaleString('en')} of ${HOBBY_FILES.toLocaleString('en')} files`);

// ---- 6. MODEL: what pre-rendered audio would have weighed --------------------------
// Walk mode renders its audio on the phone (lib/walkAudio.ts), so none of this ships.
// Kept because it is the reason it does not: the numbers are what "just pre-render
// every card" would add to the deploy and to every learner's download.
const CHARS_PER_SEC = 14; // assumption: German read at a teaching pace
const PAD = 0.3; // assumption: lead-in and tail silence per clip, seconds
const vocab = JSON.parse(readFileSync(join(DATA, 'vocab.json'), 'utf8')) as { term: string; kind?: string; ex?: { de?: string }[] }[];
let clips = 0, secs = 0;
for (const w of vocab) {
  if (w.kind === 'grammar') continue;
  clips++; secs += w.term.length / CHARS_PER_SEC + PAD;
  for (const e of w.ex ?? []) { clips++; secs += (e.de ?? '').length / CHARS_PER_SEC + PAD; }
}
console.log('\n6 · MODEL — every word and example pre-rendered (what walk mode does NOT ship)');
row(`assumes ${CHARS_PER_SEC} chars/s + ${PAD}s padding per clip`, `${clips.toLocaleString('en')} clips`, `${(secs / 3600).toFixed(1)} h`);
for (const [codec, kbps, overhead] of [['Opus 16k', 16, 600], ['Opus 24k', 24, 600], ['MP3 48k', 48, 400], ['MP3 64k', 64, 400]] as const) {
  row(codec, mb(secs * kbps * 125 + clips * overhead));
}

// ---- 7. --live: the wire, from the host and from the voice CDNs --------------------
/** Bytes on the wire for one GET, compressed as the server chose, redirects followed.
 *  `fetch` decompresses and hides this, so it is counted off the raw socket. */
function wire(url: string, hops = 5): Promise<number> {
  return new Promise((resolve, reject) => {
    request(url, { headers: { 'accept-encoding': 'br, gzip' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops > 0) {
        res.resume();
        resolve(wire(new URL(res.headers.location, url).toString(), hops - 1));
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`${res.statusCode} ${url}`)); return; }
      let n = 0;
      res.on('data', (c: Buffer) => { n += c.length; });
      res.on('end', () => resolve(n));
    }).on('error', reject).end();
  });
}

if (live) {
  const base = live.replace(/\/$/, '');
  console.log(`\n7 · --live: ${base}`);
  // The live build's own asset names, not the local ones: production is whatever was
  // last deployed, and its hashes are not this tree's.
  const liveHtml = await (await fetch(`${base}/`)).text();
  const livePage = [...new Set([...liveHtml.matchAll(/(?:src|href)="[^"]*?(assets\/[^"]+)"/g)].map((m) => m[1]))];
  const liveFonts: string[] = [];
  for (const css of livePage.filter((a) => a.endsWith('.css'))) {
    const text = await (await fetch(`${base}/${css}`)).text();
    for (const m of text.matchAll(/url\(["']?[^)"']*?([\w.-]+\.woff2)/g)) liveFonts.push(`assets/${m[1]}`);
  }
  const liveAssets = [...livePage, ...new Set(liveFonts)];
  let total = 0;
  for (const rel of [...liveAssets, ...bootData.map((d) => `data/${d}`)]) {
    const n = await wire(`${base}/${rel}`);
    total += n;
    row(rel, kb(n));
  }
  row('before first paint, on the wire', kb(total));

  // The HD voice. Every URL is read out of the code that loads it, so a version bump
  // in lib/tts.ts moves this measurement with it.
  const tts = readFileSync('src/lib/tts.ts', 'utf8');
  const cdn = tts.match(/const CDN = '([^']+)'/)?.[1];
  const voices = [...tts.matchAll(/export const (?:HD|EN)_VOICE_ID = '([^']+)'/g)].map((m) => m[1]);
  if (!cdn) throw new Error('lib/tts.ts: no CDN constant — update this script');
  const entry = await (await fetch(cdn)).text();
  const hf = entry.match(/https:\/\/huggingface\.co\/[^"'`]+\/resolve\/main/)?.[0];
  const phon = entry.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/@diffusionstudio\/piper-wasm@[^/]+\/build\/piper_phonemize/)?.[0];
  const ort = entry.match(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/onnxruntime-web\/[^/]+\//)?.[0];
  const chunks = [...entry.matchAll(/import\("(\/npm\/[^"]+)"\)/g)].map((m) => 'https://cdn.jsdelivr.net' + m[1]);
  if (!hf || !phon || !ort) throw new Error('vits-web no longer names its hosts the way this script expects — update it');
  // Lexi is not cross-origin isolated, so onnxruntime picks the non-threaded SIMD build.
  const runtime = [cdn, ...chunks, `${phon}.wasm`, `${phon}.data`, `${ort}ort-wasm-simd.wasm`];
  let rt = 0;
  for (const u of runtime) { const n = await wire(u); rt += n; row(u.replace(/^https:\/\//, ''), kb(n)); }
  row('voice runtime, once', mb(rt));
  for (const id of voices) {
    const [loc, name, quality] = id.split('-');
    const path = `${hf}/${loc.slice(0, 2)}/${loc}/${name}/${quality}/${id}`;
    const n = (await wire(`${path}.onnx`)) + (await wire(`${path}.onnx.json`));
    row(`${id} voice`, mb(n), `with the runtime: ${mb(n + rt)}`);
  }
}
console.log('');
