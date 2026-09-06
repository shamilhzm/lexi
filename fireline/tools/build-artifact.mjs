/* Emit the Artifact-hosted variant of index.html.
 * Artifacts are wrapped in their own <!doctype>/<head>/<body> at publish time,
 * so the page body must not carry its own. One source of truth: this strips
 * the standalone wrapper rather than keeping a second copy of the game. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'index.html'), 'utf8');

const headStart = src.indexOf('<title>');
const headEnd   = src.indexOf('</head>');
const bodyOpen  = src.indexOf('>', src.indexOf('<body')) + 1;
const bodyEnd   = src.lastIndexOf('</body>');
if (headStart < 0 || headEnd < 0 || bodyOpen <= 0 || bodyEnd < 0) {
  console.error('could not locate <title> / </head> / <body> / </body>'); process.exit(1);
}
const body = (src.slice(headStart, headEnd).trimEnd() + '\n\n'
            + src.slice(bodyOpen, bodyEnd).trim()).trim();
for (const bad of ['<!doctype', '<html', '<head>', '</head>', '<body']) {
  if (body.toLowerCase().includes(bad)) { console.error('leaked wrapper tag:', bad); process.exit(1); }
}
mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', 'fireline.artifact.html');
writeFileSync(out, body + '\n');
console.log(`wrote ${out}  (${(body.length/1024).toFixed(1)} KB)`);
