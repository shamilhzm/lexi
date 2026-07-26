// Syntax gate for the Orbita apps.
//
// Each app is a single-file HTML page with all logic in one inline <script>.
// This extracts that block and runs `node --check` on it, so a syntax error can
// never reach a commit. Zero dependencies.
//
//   npm run check

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const FILES = ['../app/orbita.html', '../app/orbita-cards.html'];

let failed = false;
for (const rel of FILES) {
  const htmlPath = new URL(rel, import.meta.url);
  let html;
  try { html = readFileSync(htmlPath, 'utf8'); }
  catch { console.error(`check: cannot read ${rel}`); failed = true; continue; }

  const openTag = html.indexOf('<script>');
  if (openTag === -1) { console.error(`check: no <script> block in ${rel}`); failed = true; continue; }
  const bodyStart = html.indexOf('>', openTag) + 1;
  const bodyEnd = html.lastIndexOf('</script>');
  if (bodyEnd <= bodyStart) { console.error(`check: no closing </script> in ${rel}`); failed = true; continue; }
  const js = html.slice(bodyStart, bodyEnd);

  const tmp = join(mkdtempSync(join(tmpdir(), 'orbita-check-')), 'extracted.js');
  writeFileSync(tmp, js, 'utf8');
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    console.log(`check: OK — ${rel} (${js.split('\n').length} lines)`);
  } catch (err) {
    console.error(`check: FAILED — ${rel}:\n` + (err.stderr?.toString() || err.message));
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
