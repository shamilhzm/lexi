// Wiktextract / kaikki parser (CC BY-SA 4.0 + GFDL). Streams the machine-readable
// English-Wiktionary German extract (one JSON object per line) and pulls the
// facts a card needs: pos, gender, plural, IPA, an English gloss, and any
// translated usage examples. Passing `wanted` filters to a candidate set so the
// full ~1M-line dump can be processed without holding it all in memory.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { POS_MAP } from '../config.ts';

export interface LexEntry {
  word: string;
  pos: string;                            // mapped to Word.pos
  gender: 'der' | 'die' | 'das' | null;
  plural: string | null;                  // bare nominative plural (no article)
  ipa: string | null;
  gloss: string | null;                   // English
  examples: { de: string; en: string }[]; // from senses[].examples (translated)
  form: boolean;                          // true = a non-lemma inflection ("diese"), not a headword
}

const FORM_GLOSS_RE = /\b(inflection|inflected\s+form|forms?|spelling|misspelling|abbreviation|plural|singular|genitive|dative|accusative|nominative|participle|comparative|superlative)\s+of\b/i;

/** True when EVERY sense is a form-of/inflection — i.e. the entry is an inflected
 *  form ("diese", "worden", "seiner"), not a lemma we should turn into a card. */
function detectForm(e: any): boolean {
  const senses: any[] = e.senses ?? [];
  if (!senses.length) return false;
  return senses.every((s) =>
    (Array.isArray(s.form_of) && s.form_of.length > 0) ||
    (s.tags ?? []).includes('form-of') ||
    (Array.isArray(s.glosses) && s.glosses.length > 0 && s.glosses.every((g: string) => FORM_GLOSS_RE.test(g))),
  );
}

const GENDER: Record<string, 'der' | 'die' | 'das'> = {
  m: 'der', masculine: 'der', f: 'die', feminine: 'die', n: 'das', neuter: 'das',
};

function detectGender(e: any): 'der' | 'die' | 'das' | null {
  for (const t of e.tags ?? []) if (GENDER[t]) return GENDER[t];
  for (const ht of e.head_templates ?? []) {
    const a = ht.args ?? {};
    for (const v of [a.g, a.g1, a['1']]) {
      const key = String(v ?? '').split('-')[0];
      if (GENDER[key]) return GENDER[key];
    }
  }
  for (const f of e.forms ?? []) for (const t of f.tags ?? []) if (GENDER[t] && f.form === e.word) return GENDER[t];
  return null;
}

function detectPlural(e: any): string | null {
  for (const f of e.forms ?? []) {
    const tags: string[] = f.tags ?? [];
    if (!tags.includes('plural')) continue;
    if (tags.includes('genitive') || tags.includes('dative') || tags.includes('singular')) continue;
    const form = String(f.form ?? '').trim();
    if (!form || form === '-' || /no|error|:/i.test(form)) continue;
    return form; // first nominative plural wins
  }
  return null;
}

function detectIpa(e: any): string | null {
  for (const s of e.sounds ?? []) {
    if (typeof s.ipa === 'string' && s.ipa.trim()) {
      return s.ipa.replace(/[/[\]]/g, '').trim() || null;
    }
  }
  return null;
}

function detectGloss(e: any): string | null {
  let fallback: string | null = null;
  for (const s of e.senses ?? []) {
    const g = (s.glosses ?? [])[0];
    if (typeof g !== 'string' || !g.trim()) continue;
    fallback ??= g.trim();
    const tags: string[] = s.tags ?? [];
    if (tags.includes('obsolete') || tags.includes('archaic')) continue;
    return g.trim();
  }
  return fallback;
}

function detectExamples(e: any, cap = 3): { de: string; en: string }[] {
  const out: { de: string; en: string }[] = [];
  for (const s of e.senses ?? []) {
    for (const ex of s.examples ?? []) {
      const de = String(ex.text ?? '').trim();
      const en = String(ex.english ?? ex.translation ?? '').trim();
      if (de && en) out.push({ de, en });
      if (out.length >= cap) return out;
    }
  }
  return out;
}

/** Indexed Wiktextract lookup keyed by lowercased headword. */
export class Wiktextract {
  private map = new Map<string, LexEntry[]>();
  get size(): number { return this.map.size; }

  add(entry: LexEntry): void {
    const k = entry.word.toLowerCase();
    const a = this.map.get(k);
    if (a) a.push(entry); else this.map.set(k, [entry]);
  }

  /** Best entry for a lemma, optionally preferring a part of speech. Prefers an
   *  entry that actually carries the facts a card needs (gender for nouns, gloss). */
  best(lemma: string, pos?: string): LexEntry | null {
    const a = this.map.get(lemma.toLowerCase());
    if (!a || !a.length) return null;
    const scored = [...a].sort((x, y) => score(y, pos) - score(x, pos));
    return scored[0];
  }
}

function score(e: LexEntry, pos?: string): number {
  let s = 0;
  if (!e.form) s += 8;               // strongly prefer a real lemma over an inflection
  if (pos && e.pos === pos) s += 10;
  if (e.gloss) s += 3;
  if (e.pos === 'noun' && e.gender) s += 3;
  if (e.plural) s += 1;
  if (e.ipa) s += 1;
  if (e.examples.length) s += 1;
  return s;
}

/**
 * Stream a kaikki JSONL dump into a Wiktextract index. `wanted` (lowercased bare
 * lemmas) restricts what's kept — pass the frequency-gap candidate set to bound
 * memory. Entries whose part of speech isn't a learnable class are skipped.
 */
export async function loadWiktextract(path: string, wanted?: Set<string>): Promise<Wiktextract> {
  const idx = new Wiktextract();
  const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    let e: any;
    try { e = JSON.parse(line); } catch { continue; }
    const word = String(e.word ?? '').trim();
    if (!word) continue;
    if (wanted && !wanted.has(word.toLowerCase())) continue;
    if (e.lang_code && e.lang_code !== 'de') continue;
    const pos = POS_MAP[e.pos];
    if (!pos) continue;
    const gender = pos === 'noun' ? detectGender(e) : null;
    idx.add({
      word,
      pos,
      gender,
      plural: pos === 'noun' ? detectPlural(e) : null,
      ipa: detectIpa(e),
      gloss: detectGloss(e),
      examples: detectExamples(e),
      form: detectForm(e),
    });
  }
  return idx;
}
