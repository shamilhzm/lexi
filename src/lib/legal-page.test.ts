// The legal page must name every place the app sends a request.
//
// `public/legal.html` is a promise ("these happen only when you use the
// feature… the company named"), and a promise about data flows goes stale the
// day someone adds a fetch. So this reads every `https://host` literal in the
// shipped source and fails if the page does not mention its registrable domain.
// A host that is only ever a *link* the learner taps is listed below with why;
// adding one there is a decision, made in review, not a way to quiet the test.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = readFileSync('public/legal.html', 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/** Hosts that appear in `src/` but receive nothing unless the learner follows a link. */
const LINK_ONLY: Record<string, string> = {
  'github.com': 'the repository and the Support link',
  'deepl.com': 'a "translate on DeepL" link the learner taps',
  'vercel.app': 'the link to the previous build',
  'lexi.app': 'a fallback URL written into a calendar file, never fetched',
  'w3.org': 'the SVG namespace',
  'sil.org': 'the font licence text',
};

/** Requests made by code Lexi loads rather than code it contains. */
const INDIRECT = [
  'api.anthropic.com', // the Anthropic SDK's endpoint (lib/ai.ts)
  'cdnjs.cloudflare.com', 'huggingface.co', // the HD voice's engine and model (lib/tts.ts)
  'Vercel', // the host itself
];

const domain = (host: string) => host.split('.').slice(-2).join('.');

describe('legal.html', () => {
  const hosts = new Set<string>();
  for (const f of walk('src')) {
    for (const m of readFileSync(f, 'utf8').matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) hosts.add(m[1].toLowerCase());
  }

  it('finds the hosts it is meant to police', () => {
    // A broken walker would pass everything below vacuously.
    expect([...hosts].map(domain)).toEqual(expect.arrayContaining(['tagesschau.de', 'tatoeba.org', 'wiktionary.org', 'openrouter.ai']));
  });

  it('names every network destination in the source', () => {
    const missing = [...hosts].map(domain).filter((d) => !(d in LINK_ONLY) && !PAGE.includes(d));
    expect([...new Set(missing)]).toEqual([]);
  });

  it('names the destinations that are not literals in the source', () => {
    expect(INDIRECT.filter((h) => !PAGE.includes(h))).toEqual([]);
  });

  it('has the anchors the app links to', () => {
    for (const id of ['tutor', 'impressum', 'privacy', 'credits']) expect(PAGE).toContain(`id="${id}"`);
  });
});

describe('legal.json', () => {
  const j = JSON.parse(readFileSync('public/legal.json', 'utf8')) as { impressum: Record<string, unknown> };
  it('carries every field the Impressum renderer requires, as text', () => {
    const js = readFileSync('public/legal.js', 'utf8');
    for (const k of ['name', 'street', 'postcode', 'city', 'email']) {
      expect(typeof j.impressum[k]).toBe('string');
      expect(js).toContain(`'${k}'`);
    }
  });
});
