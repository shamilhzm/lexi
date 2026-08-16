// The HD voice's CDN, pinned — because the wrong build fails as a *hang*.
//
// `@diffusionstudio/vits-web` served from esm.sh runs through a Node-polyfill
// shim whose `fs` is a stub, and `predict()` reaches it:
//
//     Error: [unenv] fs.readFile is not implemented yet!
//
// The throw never rejects the promise the app awaits, so synthesis hung forever
// instead of failing. The HD voice had never worked on any device, and it read as
// a slow download, then as an iOS audio-permission problem, for as long as it did.
//
// Measured side by side in a browser, same version and voice: esm.sh still
// "predicting" after 65 seconds; jsDelivr's `+esm` returned a 63,532-byte WAV in
// 2.56 seconds. This test exists so nobody swaps it back for tidiness.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(fileURLToPath(new URL('./tts.ts', import.meta.url)), 'utf8');
const cdnLine = src.split('\n').find((l) => l.trimStart().startsWith('const CDN')) ?? '';

describe('the HD voice CDN', () => {
  it('is not esm.sh, whose build hangs in predict()', () => {
    expect(cdnLine).not.toMatch(/esm\.sh/);
  });

  it('is a browser ESM build, pinned to a version', () => {
    expect(cdnLine).toMatch(/cdn\.jsdelivr\.net/);
    expect(cdnLine).toMatch(/\+esm/);
    expect(cdnLine, 'pin the version — an unpinned CDN can change build shape under you')
      .toMatch(/@\d+\.\d+\.\d+/);
  });
});
