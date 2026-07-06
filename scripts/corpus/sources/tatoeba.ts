// Tatoeba example-sentence parser (CC BY 2.0 FR; some CC0). Joins the German and
// English sentence exports via the links file to produce translated de↔en pairs,
// then attaches the best (shortest, cleanest) examples to each candidate lemma.
// Matching reuses the app's conjugation engine so verb forms in sentences resolve
// to their infinitive — the same fidelity the reader has.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { conjugate, canConjugate } from '../../../src/lib/conjugate.ts';

export interface Candidate { key: string; lemma: string; pos: string; plural?: string | null; }
export interface TatEx { de: string; en: string; id: string; }

const TOKEN_RE = /[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*/g;
const strip = (s: string) => s.replace(/^(der|die|das)\s+/i, '').trim();
const ADJ_ENDINGS = ['e', 'en', 'er', 'es', 'em'];

/** Map every surface form a candidate can appear as → its key. Lemma wins ties. */
function surfaceIndex(cands: Candidate[]): Map<string, string> {
  const m = new Map<string, string>();
  const add = (form: string, key: string) => { const f = form.toLowerCase(); if (f && !m.has(f)) m.set(f, key); };
  for (const c of cands) {
    const lemma = strip(c.lemma);
    add(lemma, c.key);
    if (c.plural) add(strip(c.plural), c.key);
    if (c.pos === 'adjective') for (const e of ADJ_ENDINGS) add(lemma + e, c.key);
    if (c.pos === 'verb' && canConjugate(lemma)) {
      try {
        const g = conjugate(lemma);
        for (const f of [...g.praesens, ...g.praeteritum, g.partizip]) add(f, c.key);
      } catch { /* skip unconjugable */ }
    }
  }
  return m;
}

function readTsvText(path: string, onRow: (id: string, text: string) => void): Promise<void> {
  return (async () => {
    const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line) continue;
      const c = line.split('\t');
      // sentences export: id <TAB> lang <TAB> text  (2-col fallback: id <TAB> text)
      const id = c[0];
      const text = (c.length >= 3 ? c[2] : c[1]) ?? '';
      if (id && text) onRow(id, text.trim());
    }
  })();
}

/**
 * Attach up to `perLemma` translated examples to each candidate. Two-pass and
 * memory-bounded: first keep only German sentences that hit a candidate, then
 * fetch only the English translations those sentences link to.
 */
export async function attachTatoebaExamples(
  paths: { de: string; en: string; links: string },
  cands: Candidate[],
  perLemma = 2,
): Promise<Map<string, TatEx[]>> {
  const surf = surfaceIndex(cands);

  // Pass 1: German sentences that contain ≥1 candidate surface form.
  const deHit = new Map<string, { text: string; keys: string[] }>();
  await readTsvText(paths.de, (id, text) => {
    const keys = new Set<string>();
    for (const m of text.matchAll(TOKEN_RE)) { const k = surf.get(m[0].toLowerCase()); if (k) keys.add(k); }
    if (keys.size) deHit.set(id, { text, keys: [...keys] });
  });

  // Pass 2: which English sentence each hit-German sentence is linked to.
  const deToEn = new Map<string, string>();     // deId -> enId (first link wins)
  const neededEn = new Set<string>();
  {
    const rl = createInterface({ input: createReadStream(paths.links, 'utf8'), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line) continue;
      const [a, b] = line.split('\t');
      if (!a || !b) continue;
      if (deHit.has(a) && !deToEn.has(a)) { deToEn.set(a, b); neededEn.add(b); }
      else if (deHit.has(b) && !deToEn.has(b)) { deToEn.set(b, a); neededEn.add(a); }
    }
  }

  // Pass 3: pull only the English translations we actually need.
  const enText = new Map<string, string>();
  await readTsvText(paths.en, (id, text) => { if (neededEn.has(id)) enText.set(id, text); });

  // Assemble: gather candidate examples per key, then pick the shortest/cleanest.
  const byKey = new Map<string, TatEx[]>();
  for (const [deId, { text, keys }] of deHit) {
    const enId = deToEn.get(deId);
    const en = enId ? enText.get(enId) : undefined;
    if (!en) continue;
    for (const key of keys) {
      const a = byKey.get(key) ?? [];
      a.push({ de: text, en, id: deId });
      byKey.set(key, a);
    }
  }
  for (const [key, exs] of byKey) {
    exs.sort((x, y) => x.de.length - y.de.length || x.id.localeCompare(y.id));
    byKey.set(key, exs.slice(0, perLemma));
  }
  return byKey;
}
