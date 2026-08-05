// The detail loader's contract, which is mostly about what it must NOT do.
//
// It sits on the boot path's shoulder: if it throws, the app that just rendered
// breaks; if it double-fetches, the heaviest file in the product is downloaded
// twice; if it clobbers a learner's own cards, their words lose their examples.
// None of those are visible in the UI until they are very visible.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/** Fresh module graph per test — `data/index.ts` and `data/detail.ts` both hold
 *  module-level state, and `attached` must not leak between cases. */
async function fresh() {
  vi.resetModules();
  const data = await import('./index.ts');
  const detail = await import('./detail.ts');
  return { data, detail };
}

const word = (id: string, over: Record<string, unknown> = {}) => ({
  id, term: id, en: '', pos: 'noun', level: 'A1' as const, gender: null, plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'Test', kind: 'word' as const, ...over,
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('attachDetail', () => {
  let data: Awaited<ReturnType<typeof fresh>>['data'];
  let detail: Awaited<ReturnType<typeof fresh>>['detail'];

  beforeEach(async () => {
    ({ data, detail } = await fresh());
    data.registerWords([word('a'), word('b')]);
  });

  it('attaches examples and definitions onto the live card', () => {
    detail.attachDetail({ a: { def: 'a thing', ex: [{ de: 'Ein A.', en: 'An A.', lvl: 'A1' }] } });
    const a = data.BY_ID.get('a')!;
    expect(a.def).toBe('a thing');
    expect(a.ex).toHaveLength(1);
    expect(a.ex[0].de).toBe('Ein A.');
  });

  it('leaves cards the sidecar says nothing about alone', () => {
    // This is how learner-supplied `usr:` words keep their own inline examples:
    // there is simply no row for them, and no branch is needed to protect them.
    data.registerWords([word('usr:mine', { ex: [{ de: 'Meins.', en: 'Mine.', lvl: 'A1' }] })]);
    detail.attachDetail({ a: { def: 'a thing' } });
    expect(data.BY_ID.get('usr:mine')!.ex).toHaveLength(1);
  });

  it('ignores ids the corpus does not ship', () => {
    expect(() => detail.attachDetail({ 'voc:gone': { def: 'x' } })).not.toThrow();
    expect(detail.detailLoaded()).toBe(true);
  });

  it('reports not-loaded before it runs', async () => {
    const f = await fresh();
    expect(f.detail.detailLoaded()).toBe(false);
  });
});

describe('loadDetail', () => {
  it('fetches once however many callers ask', async () => {
    const { data, detail } = await fresh();
    data.registerWords([word('a')]);
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ a: { def: 'once' } }) }));
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([detail.loadDetail(), detail.loadDetail(), detail.loadDetail()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(data.BY_ID.get('a')!.def).toBe('once');
  });

  it('resolves rather than rejects when the file is missing', async () => {
    // The contract that keeps a boot failure out of a nice-to-have. A rejected
    // promise here would surface as an unhandled rejection on a page that has
    // already rendered fine.
    const { detail } = await fresh();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    await expect(detail.loadDetail()).resolves.toBeUndefined();
    expect(detail.detailLoaded()).toBe(true);
  });

  it('resolves rather than rejects when the network throws', async () => {
    const { detail } = await fresh();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(detail.loadDetail()).resolves.toBeUndefined();
    expect(detail.detailLoaded()).toBe(true);
  });

  it('does not re-fetch once attached', async () => {
    const { detail } = await fresh();
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    await detail.loadDetail();
    await detail.loadDetail();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
