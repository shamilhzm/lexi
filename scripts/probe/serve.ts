// Serve the ASR probe on localhost, and only on localhost.
//
// `getUserMedia` and the Web Speech API need a **secure context**, and the natural
// way to test something on a phone — type the Mac's LAN address — is not one. The
// API is not blocked with an error there, it is simply *absent*, so the page looks
// broken rather than refused. `localhost` is a secure origin by definition, and the
// iOS Simulator shares the host's network stack, so this is the one arrangement
// where a real iOS Safari can reach the probe with the microphone available.
//
// A maintainer's tool. It serves one directory, it binds to the loopback interface
// so nothing on the network can reach it, and nothing in the app imports it.
//
// Run: npm run probe:asr      then open http://localhost:4320/ in the Simulator
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = import.meta.dirname;
const PORT = Number(process.env.PORT ?? 4320);
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  const rel = normalize(path === '/' ? 'asr.html' : path).replace(/^(\.\.[/\\])+/, '');
  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not here');
    return;
  }
  const body = readFileSync(file);
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'content-length': String(body.length),
    'cache-control': 'no-store',
  });
  res.end(body);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ASR probe on http://localhost:${PORT}/`);
  console.log('  Open it in the iOS Simulator (Safari) or desktop Chrome — localhost only,');
  console.log('  because the speech API is absent on a plain LAN address.\n');
});
