// Find cards whose transcription is of a different word.
//
// Found 2026-11-19 by eye, not by a check: `die Selbstfürsorge` shipped since the
// first corpus commit with /ˈp͡fleːɡəˌʔaphɛŋɪçkaɪ̯t/ — *Pflegeabhängigkeit* — and an
// example sentence lifted from that word's Wiktionary page. Nothing caught it,
// because every IPA check in the corpus asks "is this a well-formed transcription",
// never "is it a transcription of *this* word".
//
// The question here is the second one, asked as crudely as will still answer it:
// reduce the headword's spelling and the IPA to the same coarse consonant skeleton
// (p/b → P, t/d → T, sch/ch/ʃ/ç/s/z → S — one class, so *Chef* and *ich* both
// fit; vowels dropped, doubles
// collapsed) and measure how far apart they are. A real transcription of the
// right word lands within a letter or two however odd the spelling — loans,
// silent h, final devoicing, -ig as /ɪç/. A transcription of a different word
// does not land anywhere near.
//
// It ranks, it does not rule. Every hit is a candidate to be read against
// de.wiktionary, and the fix goes through fix-authored.ts with an expect guard.
//
//   node scripts/corpus/ipa-mismatch.ts [--min 0.5] [--edits 3]
import { PATHS } from './config.ts';
import { loadCorpus, lookupLemma } from './lib.ts';
import type { Word } from '../../src/types.ts';

const arg = (n: string): string | undefined => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const MIN = Number(arg('--min') ?? '0.5');
const MIN_EDITS = Number(arg('--edits') ?? '3');

const VOWEL = /[aeiouyäöü]/;

/** Spelling → consonant classes. Order matters: longest graphemes first. */
export function orthSkeleton(word: string): string {
  const s = word.toLowerCase().replace(/[^a-zäöüß]/g, '');
  let out = '';
  for (let i = 0; i < s.length; ) {
    const rest = s.slice(i);
    const prev = s[i - 1] ?? '';
    const m = (g: string) => rest.startsWith(g);
    if (m('tsch')) { out += 'TS'; i += 4; continue; }
    if (m('sch')) { out += 'S'; i += 3; continue; }
    if (m('chs')) { out += 'KS'; i += 3; continue; }
    if (m('ch')) { out += 'S'; i += 2; continue; }
    if (m('ck')) { out += 'K'; i += 2; continue; }
    if (m('ph')) { out += 'F'; i += 2; continue; }
    if (m('th')) { out += 'T'; i += 2; continue; }
    if (m('dt')) { out += 'T'; i += 2; continue; }
    if (m('tz')) { out += 'TS'; i += 2; continue; }
    if (m('pf')) { out += 'PF'; i += 2; continue; }
    if (m('qu')) { out += 'KF'; i += 2; continue; }
    // ng is /ŋ/ in *lang* and /nɡ/ across a seam in *ungleich*; both sides write NK.
    if (m('ng')) { out += 'NK'; i += 2; continue; }
    // -ig at a word end or before a consonant is /ɪç/: wichtig, Ewigkeit.
    if (m('ig') && (i + 2 === s.length || !VOWEL.test(s[i + 2]))) { out += 'S'; i += 2; continue; }
    const c = s[i];
    i++;
    if (VOWEL.test(c)) continue;
    // A Dehnungs-h (gehen, Wohnung) is silent; a word-initial or post-consonant
    // h (Haus, Abhängigkeit, Stakeholder) is not.
    if (c === 'h') { if (!prev || !VOWEL.test(prev)) out += 'H'; continue; }
    out += ({
      b: 'P', p: 'P', d: 'T', t: 'T', g: 'K', k: 'K', c: 'K',
      f: 'F', v: 'F', w: 'F', s: 'S', ß: 'S', z: 'TS', x: 'KS',
      m: 'M', n: 'N', l: 'L', r: 'R', j: 'J',
    } as Record<string, string>)[c] ?? '';
  }
  return out.replace(/(.)\1+/g, '$1');
}

/** IPA → the same consonant classes. */
export function ipaSkeleton(ipa: string): string {
  let out = '';
  // Not NFD: it splits ç into c + a cedilla, and every ich-Laut vanishes.
  const s = ipa.replace(/d͡?ʒ/g, 'j');
  for (const c of s) {
    out += ({
      p: 'P', b: 'P', t: 'T', d: 'T', k: 'K', ɡ: 'K', g: 'K',
      f: 'F', v: 'F', w: 'F', ʋ: 'F',
      s: 'S', z: 'S', ʃ: 'S', ʒ: 'S',
      ç: 'S', x: 'S', χ: 'S',
      m: 'M', n: 'N', ŋ: 'NK', ɲ: 'N', l: 'L', ɫ: 'L',
      ʁ: 'R', r: 'R', ɐ: 'R', ɾ: 'R', ɹ: 'R', ʀ: 'R',
      h: 'H', j: 'J', θ: 'T', ð: 'T',
    } as Record<string, string>)[c] ?? '';
  }
  return out.replace(/(.)\1+/g, '$1');
}

export function lev(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}
export const distance = (a: string, b: string) =>
  Math.max(a.length, b.length) ? lev(a, b) / Math.max(a.length, b.length) : 0;

const corpus = (loadCorpus(PATHS.vocab) as Word[]).filter((w) => (w.ipa ?? '').trim());
const lemmaOf = (w: Word) => lookupLemma(w.term).replace(/\s+/g, '');
const skel = new Map(corpus.map((w) => [w.id, orthSkeleton(lemmaOf(w))]));

interface Hit { w: Word; own: number; edits: number; ipaSk: string; orthSk: string; other?: { term: string; d: number } }
const hits: Hit[] = [];
for (const w of corpus) {
  const ipaSk = ipaSkeleton(w.ipa!);
  const orthSk = skel.get(w.id)!;
  const own = distance(ipaSk, orthSk);
  const edits = lev(ipaSk, orthSk);
  // A short word is one odd letter from 0.5 (*Detail* /deˈtaɪ̯/ is TL vs T), so a
  // hit also needs three edits: a wrong word is wrong in more than one place.
  if (own < MIN || edits < MIN_EDITS) continue;
  // Does some *other* headword fit this transcription better? That is the
  // defect's signature; an own-distance outlier with no better neighbour is
  // more often an odd spelling (a loan, an abbreviation) than a wrong IPA.
  let best: Hit['other'];
  for (const o of corpus) {
    if (o.id === w.id || lemmaOf(o) === lemmaOf(w)) continue;
    const d = distance(ipaSk, skel.get(o.id)!);
    if (!best || d < best.d) best = { term: o.term, d };
  }
  hits.push({ w, own, edits, ipaSk, orthSk, other: best && best.d < own ? best : undefined });
}

hits.sort((a, b) => b.own - a.own || b.edits - a.edits);
console.log(`${corpus.length} cards with an IPA · ${hits.length} at skeleton distance ≥ ${MIN} and ≥ ${MIN_EDITS} edits\n`);
for (const h of hits) {
  console.log(
    `${h.own.toFixed(2)} ${String(h.edits).padStart(2)}  ${h.w.id.padEnd(40)} /${h.w.ipa}/  ${h.orthSk} vs ${h.ipaSk}` +
    (h.other ? `  ← fits ${h.other.term} (${h.other.d.toFixed(2)})` : ''),
  );
}
