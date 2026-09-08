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
  });

  it('reports not-loaded before it runs', async () => {
    const f = await fresh();
    expect(f.detail.detailLoaded()).toBe(false);
    expect(f.detail.detailLoadedFor('A1')).toBe(false);
  });
});

// Detail ships one file per CEFR level (`scripts/corpus/split.ts`). What matters
// here is that the app fetches the level it is about to show and *not* the other
// five — the whole saving is in the shard that never leaves the server.
describe('loadDetailFor', () => {
  const ok = (rows: Record<string, unknown> = {}) =>
    vi.fn(async (url: string) => ({ ok: true, json: async () => rows, url }));

  it('fetches one level once, however many callers ask', async () => {
    const { data, detail } = await fresh();
    data.registerWords([word('a')]);
    const fetchMock = ok({ a: { def: 'once' } });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      detail.loadDetailLevel('A1'), detail.loadDetailLevel('A1'), detail.loadDetailLevel('A1'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(/data\/detail\/A1\.json$/);
    expect(data.BY_ID.get('a')!.def).toBe('once');
  });

  // The point of the split, as a test: twenty A1 words on the feed must not drag
  // down B2 and C1 with them.
  it('asks only for the levels the given cards are in', async () => {
    const { detail } = await fresh();
    const fetchMock = ok();
    vi.stubGlobal('fetch', fetchMock);

    await detail.loadDetailFor([{ level: 'A1' }, { level: 'A1' }, { level: 'B1' }]);

    const asked = fetchMock.mock.calls.map((c) => String(c[0]).replace(/.*detail\//, ''));
    expect(asked.sort()).toEqual(['A1.json', 'B1.json']);
  });

  it('costs nothing for a level already in hand', async () => {
    const { detail } = await fresh();
    const fetchMock = ok();
    vi.stubGlobal('fetch', fetchMock);
    await detail.loadDetailFor([{ level: 'A1' }]);
    await detail.loadDetailFor([{ level: 'A1' }, { level: 'A1' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing at all for cards with no level', async () => {
    const { detail } = await fresh();
    const fetchMock = ok();
    vi.stubGlobal('fetch', fetchMock);
    await expect(detail.loadDetailFor([{}, {}])).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves rather than rejects when the file is missing', async () => {
    // The contract that keeps a boot failure out of a nice-to-have. A rejected
    // promise here would surface as an unhandled rejection on a page that has
    // already rendered fine.
    const { detail } = await fresh();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    await expect(detail.loadDetailLevel('A1')).resolves.toBeUndefined();
    expect(detail.detailLoadedFor('A1')).toBe(true);
  });

  it('resolves rather than rejects when the network throws', async () => {
    const { detail } = await fresh();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(detail.loadDetailLevel('A1')).resolves.toBeUndefined();
    expect(detail.detailLoadedFor('A1')).toBe(true);
  });

  // A feed asks per page. If a failed shard stayed un-loaded, every scroll would
  // re-ask — a request storm laid on top of whatever is already wrong.
  it('does not retry a level that failed', async () => {
    const { detail } = await fresh();
    const fetchMock = vi.fn(async () => { throw new Error('offline'); });
    vi.stubGlobal('fetch', fetchMock);
    await detail.loadDetailLevel('A1');
    await detail.loadDetailFor([{ level: 'A1' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not re-fetch once attached', async () => {
    const { detail } = await fresh();
    const fetchMock = ok();
    vi.stubGlobal('fetch', fetchMock);
    await detail.loadDetailLevel('A1');
    await detail.loadDetailLevel('A1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Six at once is 842 KB of contention against whatever the learner is doing.
  it('walks every level one at a time', async () => {
    const { detail } = await fresh();
    let inFlight = 0;
    let peak = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      peak = Math.max(peak, ++inFlight);
      await Promise.resolve();
      inFlight--;
      return { ok: true, json: async () => ({}) };
    }));
    await detail.loadAllDetail();
    expect(peak).toBe(1);
    expect(detail.DETAIL_LEVELS.every((l) => detail.detailLoadedFor(l))).toBe(true);
  });
});
