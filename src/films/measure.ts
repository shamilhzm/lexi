// What a film's pattern beat measures, and the test re-measures. Kept apart from
// the player so the claim and its check are the same code.
import { WORDS } from '../data/index.ts';
import type { Gender } from './types.ts';

export interface EndingCount {
  ending: string;
  total: number;
  der: number; die: number; das: number;
  /** The article most of them take. */
  majority: Gender;
  /** Nouns with this ending that take another article — shown, never hidden. */
  exceptions: string[];
}

const bare = (t: string) => t.replace(/^(der|die|das)\s+/i, '');

/** A German card and the English word its own gloss gives for it. */
export interface SuffixPair { term: string; en: string }

/** Spelling folded so a German and an English stem compare: umlauts, ph/f, and the
 *  k and z German writes where English writes c (*Kultur*, *Spezialität*). */
const fold = (s: string) => s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')
  .replace(/ph/g, 'f').replace(/[kz]/g, 'c').replace(/ss/g, 's');

/** The English word in `gloss` that carries the same ending on the same stem as
 *  `headword`, or null. The stems must agree to all but their last letter, so
 *  *Demokratie · democracy* passes and *Instanz · instance* does not reach -ance. */
export function suffixMatch(headword: string, gloss: string, de: string, en: string): string | null {
  const h = headword.toLowerCase();
  if (/\s/.test(h) || !h.endsWith(de) || h.length <= de.length + 2) return null;
  const g = fold(h.slice(0, -de.length));
  for (const w of gloss.toLowerCase().split(/[^a-z]+/)) {
    if (en ? !(w.endsWith(en) && w.length > en.length + 2) : w.length < 4) continue;
    const e = fold(en ? w.slice(0, -en.length) : w);
    let p = 0;
    while (p < g.length && p < e.length && g[p] === e[p]) p++;
    // A short English ending (-y, -al) matches by accident on a short stem
    // (*Appell · appeal*); a long length gap is a different ending (*Chemie ·
    // chemistry*). Where English drops the ending (-ieren), it adds its own (-ate).
    const need = en && en.length <= 2 ? 4 : 3;
    if (p >= need && p >= Math.min(g.length, e.length) - 1 && (!en || Math.abs(g.length - e.length) <= 2)) return w;
  }
  return null;
}

/** Every card Lexi teaches whose headword ends in `de` and whose gloss holds the
 *  English word on the same stem ending in `en`. The film shows a few; the count is
 *  all of them. */
export function suffixPairs(de: string, en: string): SuffixPair[] {
  const out: SuffixPair[] = [];
  for (const w of WORDS) {
    // An ending English drops is a verb ending; das Musizieren is not one.
    if (!en && w.pos !== 'verb') continue;
    const m = suffixMatch(bare(w.term), w.en, de, en);
    if (m) out.push({ term: w.term, en: m });
  }
  return out;
}

/** Count, over every noun Lexi teaches, how the nouns ending in `ending` are
 *  gendered. Plural-only nouns carry no gender and are left out. */
export function countEnding(ending: string): EndingCount {
  const e = ending.toLowerCase();
  const hit = WORDS.filter((w) => w.pos === 'noun' && (w.gender === 'der' || w.gender === 'die' || w.gender === 'das')
    && bare(w.term).toLowerCase().endsWith(e));
  const n = { der: 0, die: 0, das: 0 };
  for (const w of hit) n[w.gender as Gender]++;
  const majority = (['der', 'die', 'das'] as Gender[]).reduce((a, b) => (n[b] > n[a] ? b : a));
  return {
    ending, total: hit.length, ...n, majority,
    exceptions: hit.filter((w) => w.gender !== majority).map((w) => w.term),
  };
}
