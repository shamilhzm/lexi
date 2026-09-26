// The Content-Security-Policy in vercel.json, held to the code it has to allow.
//
// Why there is one at all *(panel review, 2026-09-25)*: the tutor's key lives in
// localStorage (`lib/ai.ts`) and the HD voice is a runtime import from jsDelivr
// (`lib/tts.ts`). Production sent no CSP, so any injected script — or any
// compromise of a CDN package — could read the key and post it anywhere. The
// policy pins scripts to this origin, the one inline block in index.html (by
// hash) and the two CDNs the voice needs, and pins `connect-src` to the hosts the
// app actually talks to.
//
// Why it is tested: a CSP fails *silently in production* — the theme script stops
// running, a story source stops loading, the voice hangs — and none of that shows
// in a dev server, which sends no such header. So the two ways it drifts are
// checked here, against the files themselves:
//
//   1. an edit to the inline `<script>` in index.html changes its hash;
//   2. a new network destination in the code is not on the list.
//
// Verified in a browser under the real header on 2026-09-26: the app boots with no
// violation, the Piper voice downloads and speaks (jsDelivr + cdnjs + huggingface →
// *.hf.co), the news and Wiktionary fetches pass, and a fetch to an unlisted host
// and an import from an unlisted CDN are both refused.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy')!.value;
const directive = (name: string) =>
  (csp.split(';').map((d) => d.trim().split(/\s+/)).find(([n]) => n === name) ?? []).slice(1);

/** Does a CSP source list allow this origin? Handles `https:` and `*.host`. */
function allows(list: string[], origin: string) {
  const host = new URL(origin).host;
  return list.some((s) => s === origin || s === 'https:'
    || (s.startsWith('https://*.') && host.endsWith(s.slice('https://*'.length))));
}

/** Inline scripts the browser executes — not JSON-LD or other data blocks. */
function inlineScripts(html: string) {
  const out: string[] = [];
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] ?? '';
    if (/\bsrc=/.test(attrs)) continue;
    const type = /\btype=["']?([^"'\s>]+)/.exec(attrs)?.[1];
    if (type && !/^(module|text\/javascript|application\/javascript)$/.test(type)) continue;
    out.push(m[2]);
  }
  return out;
}

/** Every https origin written into a file. */
const originsIn = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/https:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)].map((m) => m[0]);

describe('the Content-Security-Policy', () => {
  it('pins every inline script in index.html by its hash', () => {
    const scripts = inlineScripts(readFileSync('index.html', 'utf8'));
    expect(scripts.length).toBeGreaterThan(0);
    for (const s of scripts) {
      const hash = `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;
      // If this fails you edited the inline <script>: put this hash in vercel.json.
      expect(directive('script-src'), `script-src is missing ${hash}`).toContain(hash);
    }
  });

  it('never allows inline or eval’d script wholesale', () => {
    expect(directive('script-src')).not.toContain("'unsafe-inline'");
    expect(directive('script-src')).not.toContain("'unsafe-eval'");
    expect(directive('object-src')).toEqual(["'none'"]);
  });

  it('lets the app reach every host its code fetches from', () => {
    // The files that hold the app's network destinations. Link-only hosts (DeepL,
    // GitHub, the classic build) are navigations, which connect-src does not govern.
    const files = ['src/lib/news/sources.ts', 'src/lib/wiktionary.ts', 'src/lib/audio.ts', 'src/lib/ai.ts'];
    const connect = directive('connect-src');
    for (const origin of new Set(files.flatMap(originsIn))) {
      expect(allows(connect, origin), `connect-src does not allow ${origin}`).toBe(true);
    }
    // Implicit ones: the Anthropic SDK's default base URL, the DW articles an RSS
    // item links to, and where the Piper voice model redirects.
    for (const origin of ['https://api.anthropic.com', 'https://learngerman.dw.com',
      'https://huggingface.co', 'https://us.aws.cdn.hf.co']) {
      expect(allows(connect, origin), `connect-src does not allow ${origin}`).toBe(true);
    }
  });

  it('lets the HD voice load its code', () => {
    const script = directive('script-src');
    for (const origin of originsIn('src/lib/tts.ts')) {
      expect(allows(script, origin), `script-src does not allow ${origin}`).toBe(true);
    }
    expect(script).toContain("'wasm-unsafe-eval'");
  });

  it('caches hashed assets for a year, and nothing else', () => {
    const assets = vercel.headers.find((h) => h.source === '/assets/(.*)')!;
    expect(assets.headers.find((h) => h.key === 'Cache-Control')!.value).toContain('immutable');
    // The worker and the shell must stay revalidated, or a fix never reaches a phone.
    expect(vercel.headers.every((h) => h.source === '/assets/(.*)' || !h.headers.some((x) => x.key === 'Cache-Control'))).toBe(true);
  });
});
