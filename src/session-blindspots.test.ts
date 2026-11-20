// Persona pass, 2026-11-20 ("Jonas"): blind-spot drills spent their cap on words the
// weave already drilled (none ever served for gender-only nouns), and 44% landed
// before the word's own card, testing before teaching.
import { it, expect, vi, afterEach } from 'vitest';
afterEach(() => { vi.useRealTimers(); });
vi.mock('./lib/focus.ts', async (orig) => ({
  ...(await orig<any>()), FOCUS: { grammar: true, speaking: true, writing: true, tuning: true }, visibleMode: () => true,
}));
vi.mock('./lib/idb.ts', () => ({
  idbGet: async () => undefined, idbSet: async () => undefined, idbUpdate: async () => undefined,
  idbSetMany: async () => undefined, idbReady: async () => true,
  open: async () => { throw new Error('no ledger'); }, LEDGER_STORE: 'reviews',
}));
function noun(id: string, plural: string | null) {
  return { id, term: id, en: id, pos: 'noun', level: 'A1', gender: 'die', plural, ipa: null, def: null,
    syn: [], ant: [], ex: [], field: 'F', kind: 'word' } as any;
}
async function setup(withPlural: boolean) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));
  vi.resetModules();
  const data = await import('./data/index.ts');
  const store = await import('./store.ts');
  const session = await import('./session.ts');
  const drills = await import('./views/drills.tsx');
  const srs = await import('./srs.ts');
  const ws = Array.from({ length: 30 }, (_, i) => noun(`n${i}`, withPlural ? `die n${i}en` : null));
  data.registerWords(ws);
  await store.hydrate();
  for (let k = 0; k < 6; k++) store.logMiss(drills.MODE_TAG.gender, 'x');
  return { store, session, drills, srs, ws };
}
it('serves blind-spot drills for nouns whose only drill is gender', async () => {
  const { session, ws } = await setup(false);
  let n = 0;
  for (let t = 0; t < 200; t++) n += session.buildMixedSession({ kind: 'custom', name: 'T', ids: ws.map((w) => w.id) } as any)
    .filter((x) => x.reason.kind === 'blindspot').length;
  expect(n).toBeGreaterThan(0);
});
it('never puts a blind-spot drill before its word’s own card', async () => {
  const { store, session, srs, ws } = await setup(true);
  // Jonas: 15 words learnt a while ago, their gender drills scheduled well ahead.
  for (const w of ws.slice(0, 15)) {
    store.review(w.id, srs.Rating.Good); store.review(`gym:gender:${w.id}`, srs.Rating.Good); store.review(`gym:plural:${w.id}`, srs.Rating.Good);
  }
  vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));   // flips due again, drills too?
  // make only the flips due: push drill cards' due far out by grading them again now
  for (const w of ws.slice(0, 15)) { store.review(`gym:gender:${w.id}`, srs.Rating.Good); store.review(`gym:plural:${w.id}`, srs.Rating.Good); }
  const ids = ws.map((w) => w.id);
  let total = 0, early = 0, ex = '';
  for (let t = 0; t < 300; t++) {
    const q = session.buildMixedSession({ kind: 'custom', name: 'T', ids } as any);
    q.forEach((it, k) => {
      if (it.reason.kind !== 'blindspot') return;
      total++;
      const f = q.findIndex((x) => x.type === 'flip' && x.word.id === it.word.id);
      if (f === -1 || f > k) { early++; ex ||= `item ${k + 1}/${q.length}: gender drill on ${it.word.id} (status ${store.statusOf(it.word.id)}), its flip is item ${f + 1}`; }
    });
  }
  expect(total).toBeGreaterThan(0);
  expect(early, ex).toBe(0);
});
