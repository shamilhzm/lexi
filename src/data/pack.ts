// The boot file, packed: every card's front as positional rows under one key list.
//
// ## Why *(2026-11-23)*
//
// `cards.json` is an array of objects, so each of its rows repeats the same twelve key
// names. gzip shrinks a repeat, but it does not remove it. Measured on the 11,648-card
// corpus that day: 477.3 KB gzipped as objects and 402.0 KB as rows. The 75 KB
// difference is pure syntax, and the learner pays for it before the first word paints.
// `cards.json` had also reached its 480 KB ceiling (scripts/budget.ts), which blocked
// the next batch of cards.
//
// Nothing is moved or derived. Every field stays in the boot file (the feed's first
// screen shows the IPA and the gloss, so moving either would make it pop in late), and every card id is carried
// verbatim. An id rebuilt from `level` + `term` would save another 40 KB. But it is the
// key every learner's FSRS schedule hangs on, and a derivation that ever disagreed with
// the stored id would re-point a schedule without a sound (CONTRIBUTING, *a card id is a
// promise*).
//
// `public/data/cards.json` stays the canonical projection that every script and test
// reads. The pack is emitted from it at build time and in dev (vite.config.ts), so the
// repo never holds a second copy that could drift.
//
// ## Two shapes, one reader
//
// `unpackCards` also accepts the array of objects. The service worker serves `/data/`
// stale-while-revalidate, so on the launch after this deploy a new shell can still find
// only the old file in its cache, and `initData` falls back to `cards.json` for exactly
// that case. The reverse direction (an old shell reading the pack) never happens, because
// the pack has its own URL and an old shell never asks for it.

export type CardRow = Record<string, unknown>;

/** Bump when the row layout changes, and teach `unpackCards` the old one first. */
export const PACK_VERSION = 1;

export interface CardPack {
  v: typeof PACK_VERSION;
  keys: string[];
  rows: unknown[][];
}

/** The rows, from a pack or from the array of objects older builds shipped. Null for
 *  anything else, including a pack whose rows do not match its key list. */
export function unpackCards(json: unknown): CardRow[] | null {
  if (Array.isArray(json)) return json as CardRow[];
  if (!json || typeof json !== 'object') return null;
  const { v, keys, rows } = json as Partial<CardPack>;
  if (v !== PACK_VERSION || !Array.isArray(keys) || !Array.isArray(rows)) return null;
  const out: CardRow[] = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!Array.isArray(r) || r.length !== keys.length) return null;
    const o: CardRow = {};
    for (let j = 0; j < keys.length; j++) o[keys[j]] = r[j];
    out[i] = o;
  }
  return out;
}

/** Pack the rows. **Throws** rather than return a pack that would not unpack to exactly
 *  these cards: a row missing a key (a positional row cannot say "absent"), or any
 *  value JSON would change. The build runs this, so a lossy pack fails the build
 *  instead of reaching a phone. */
export function packCards(cards: CardRow[]): CardPack {
  // The key list comes from the data, in first-seen order (LESSONS: count the cases in
  // the data before writing the list).
  const keys: string[] = [];
  for (const c of cards) for (const k of Object.keys(c)) if (!keys.includes(k)) keys.push(k);
  const rows = cards.map((c, i) => keys.map((k) => {
    if (!(k in c) || c[k] === undefined) {
      throw new Error(`packCards: card ${i} (${String(c.id)}) has no "${k}"; a positional row cannot say "absent"`);
    }
    return c[k];
  }));
  const pack: CardPack = { v: PACK_VERSION, keys, rows };
  const back = unpackCards(JSON.parse(JSON.stringify(pack)));
  if (!back || !sameRows(back, cards)) {
    throw new Error('packCards: the pack does not unpack to the cards it was made from');
  }
  return pack;
}

/** Field-by-field equality, independent of the key order inside each object. */
export function sameRows(a: CardRow[], b: CardRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ka = Object.keys(a[i]);
    if (ka.length !== Object.keys(b[i]).length) return false;
    for (const k of ka) {
      if (!(k in b[i]) || JSON.stringify(a[i][k]) !== JSON.stringify(b[i][k])) return false;
    }
  }
  return true;
}
