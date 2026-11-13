import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { offlineUrls } from './offline.ts';

const PUBLIC = join(import.meta.dirname, '..', '..', 'public');

describe('offline pack — the list is the shipped data, not a memory of it', () => {
  const shards = (JSON.parse(readFileSync(join(PUBLIC, 'data/lex/index.json'), 'utf8')) as { bounds: unknown[] }).bounds.length;

  it('names only files that exist', () => {
    for (const url of offlineUrls('/', { dictionary: true, shards })) {
      expect(existsSync(join(PUBLIC, url)), url).toBe(true);
    }
  });

  it('covers every data file a learner can reach, except the boot set and the canonical corpus', () => {
    // An enumeration written from memory goes stale the day a file is added
    // (LESSONS: count the cases in the data first). So walk the directory.
    const walk = (dir: string): string[] => readdirSync(join(PUBLIC, dir), { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`/${dir}/${e.name}`]));
    const shipped = walk('data').filter((f) => f.endsWith('.json'));
    const BOOT = ['/data/cards.json', '/data/sectors.json', '/data/freq.json'];   // the worker's own BOOT_DATA
    const NEVER_SHIPPED = ['/data/vocab.json'];                                   // dropped from dist by vite.config.ts
    const listed = new Set(offlineUrls('/', { dictionary: true, shards }));
    const missing = shipped.filter((f) => !listed.has(f) && !BOOT.includes(f) && !NEVER_SHIPPED.includes(f));
    expect(missing).toEqual([]);
  });

  it('leaves the dictionary out unless asked', () => {
    const small = offlineUrls('/', { dictionary: false });
    expect(small.filter((u) => /\/lex\/\d+\.json$/.test(u))).toEqual([]);
    expect(small).toContain('/data/detail/C2.json');
    expect(offlineUrls('/', { dictionary: true, shards }).length).toBe(small.length + shards);
  });

  it('respects a sub-path deploy', () => {
    expect(offlineUrls('/lexi/', { dictionary: false })[0]).toBe('/lexi/data/detail/A1.json');
  });
});
