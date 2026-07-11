// Fetch + cache the raw sources into data/raw/ (git-ignored). Idempotent: an
// already-cached file is left alone, so re-runs are cheap. Archives are
// decompressed with the system `tar`/`bzip2` (present on macOS and Linux) so the
// pipeline needs no npm dependencies. If a host is unreachable, the file is
// skipped with a manual-download hint rather than aborting the whole fetch.
//
//   npm run corpus:fetch
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, renameSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PATHS, SOURCES } from './config.ts';

const MB = (bytes: number) => (bytes / 1e6).toFixed(1) + ' MB';

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as any), createWriteStream(dest));
}

/** Extract the single member matching `pattern` from a tar archive into `dest`. */
function untarMember(archive: string, pattern: RegExp, dest: string): void {
  const tmp = mkdtempSync(join(tmpdir(), 'lexi-'));
  try {
    execFileSync('tar', ['-xf', archive, '-C', tmp]);
    const found = walk(tmp).find((f) => pattern.test(f));
    if (!found) throw new Error(`no member matching ${pattern} in ${archive}`);
    renameSync(found, dest);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

/** bzip2-decompress a .bz2 file to `dest`. */
function bunzip(src: string, dest: string): void {
  execFileSync('bash', ['-c', `bzip2 -dc ${JSON.stringify(src)} > ${JSON.stringify(dest)}`]);
}

interface Job { name: string; url: string; out: string; kind: 'raw' | 'tar' | 'bz2'; member?: RegExp; dir?: string; }

const JOBS: Job[] = [
  { name: 'frequency', url: SOURCES.frequency.url, out: SOURCES.frequency.file, kind: 'tar', member: /-words\.txt$/ },
  { name: 'frequency-spoken', url: SOURCES.frequencySpoken.url, out: SOURCES.frequencySpoken.file, kind: 'raw' },
  { name: 'wiktextract', url: SOURCES.wiktextract.url, out: SOURCES.wiktextract.file, kind: 'raw' },
  { name: 'tatoeba-de', url: SOURCES.tatoebaDe.url, out: SOURCES.tatoebaDe.file, kind: 'bz2' },
  { name: 'tatoeba-en', url: SOURCES.tatoebaEn.url, out: SOURCES.tatoebaEn.file, kind: 'bz2' },
  { name: 'tatoeba-links', url: SOURCES.tatoebaLinks.url, out: SOURCES.tatoebaLinks.file, kind: 'tar', member: /links\.csv$/ },
  // Categorized wordlist: one small raw file per POS/gender, cached side-by-side.
  ...SOURCES.wordlist.files.map((f): Job => ({
    name: `wordlist/${f}`, url: `${SOURCES.wordlist.baseUrl}/${f}`, out: f, kind: 'raw', dir: PATHS.wordlistDir,
  })),
];

async function main() {
  mkdirSync(PATHS.raw, { recursive: true });
  mkdirSync(PATHS.wordlistDir, { recursive: true });
  for (const j of JOBS) {
    const dir = j.dir ?? PATHS.raw;
    const dest = join(dir, j.out);
    if (existsSync(dest)) { console.log(`  ✓ ${j.name} cached (${MB(statSync(dest).size)})`); continue; }
    const tmp = join(dir, `.${j.out}.download`);
    try {
      console.log(`  ↓ ${j.name} ${j.url}`);
      await download(j.url, tmp);
      if (j.kind === 'raw') renameSync(tmp, dest);
      else if (j.kind === 'tar') { untarMember(tmp, j.member!, dest); rmSync(tmp, { force: true }); }
      else if (j.kind === 'bz2') { bunzip(tmp, dest); rmSync(tmp, { force: true }); }
      console.log(`  ✓ ${j.name} → ${j.out} (${MB(statSync(dest).size)})`);
    } catch (e) {
      rmSync(tmp, { force: true });
      console.warn(`  ✗ ${j.name} failed: ${(e as Error).message}`);
      console.warn(`     download manually to ${dest} (see ATTRIBUTIONS.md)`);
    }
  }
  console.log(`\nCEFR reference (optional): drop a lemma<TAB>level TSV at ${join(PATHS.raw, SOURCES.cefrReference.file)} to enable ground-truth leveling.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
