// The backup is the only copy of a learner's work that survives a cleared browser,
// so what it carries is a correctness question, not a feature list.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./lib/idb.ts', () => ({
  idbGet: async () => undefined,
  idbSet: async () => undefined,
}));

beforeEach(() => { localStorage.clear(); vi.resetModules(); });

describe('exportData', () => {
  it('carries the words a schedule points at — user words and saved texts', async () => {
    // Before 2026-09-24 neither key was exported: a restore brought back the FSRS
    // state of every mined and class-pack word while dropping the words.
    localStorage.setItem('lexi.userwords.v1', JSON.stringify([{ id: 'usr:read:Zugang', term: 'der Zugang' }]));
    localStorage.setItem('lexi.texts.v1', JSON.stringify([{ id: 't1', title: 'x', body: 'y', at: 1 }]));
    const store = await import('./store.ts');
    const b = JSON.parse(store.exportData());
    expect(JSON.parse(b.settings['lexi.userwords.v1'])[0].id).toBe('usr:read:Zugang');
    expect(b.settings['lexi.texts.v1']).toBeDefined();
  });

  it('carries the reader’s state', async () => {
    for (const k of ['lexi.news.topics.v1', 'lexi.reading.v1', 'lexi.savedfrom.v1', 'lexi.journal.v1', 'lexi.ai.v1']) {
      localStorage.setItem(k, '[]');
    }
    const store = await import('./store.ts');
    const b = JSON.parse(store.exportData());
    for (const k of ['lexi.news.topics.v1', 'lexi.reading.v1', 'lexi.savedfrom.v1', 'lexi.journal.v1', 'lexi.ai.v1']) {
      expect(b.settings[k]).toBe('[]');
    }
  });

  it('never carries the AI key', async () => {
    localStorage.setItem('lexi.ai.key.v1', 'sk-secret-do-not-export');
    const store = await import('./store.ts');
    expect(store.exportData()).not.toContain('sk-secret-do-not-export');
  });
});
