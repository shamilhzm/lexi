// What a word has to do with English: borrowed from it, or related to a word in it.
//
// VISION, *The transfer line* (2026-11-21). `public/data/transfer.json` is written by
// `npm run corpus:transfer -- --write`, which ships only what English Wiktionary's
// etymologies state, and only when a reader can see the link. It never ships what
// the script infers. A sound correspondence (German z, English t) is named only when
// it holds over enough shipped pairs to be counted, and its examples are shipped
// pairs too.
//
// Loaded lazily, like provenance: 24 KB nobody pays for until a word's detail or
// reveal is open. Keyed by the card's term rather than its id, because an id carries
// its level and a relevel would orphan every key.
//
// The line sits on the reveal, never on the front. On the front it would answer the
// drill: "related to English *house*" is the gloss.

/** b: borrowed from English · c: related, and the gloss shows the English word ·
 *  h: related to an English word the gloss does not show (*klein · clean*). */
export type TransferKind = 'b' | 'c' | 'h';

export interface TransferRule {
  /** The German spelling, as a reader would name it: "z", "ss, ß". */
  de: string;
  en: string;
  /** Shipped pairs it holds for. */
  n: number;
  /** [German headword, English word], best example first. */
  ex: [string, string][];
  /** What to mark in each word, as RegExp sources: [German (case-insensitive), English]. */
  mark: [string, string];
}

export interface TransferData {
  v: 1;
  rules: Record<string, TransferRule>;
  /** term → [kind, english word or 0, rule id] */
  words: Record<string, [TransferKind] | [TransferKind, string | 0] | [TransferKind, string | 0, string]>;
}

export interface Transfer {
  kind: TransferKind;
  /** The English word, when the data names one. */
  en?: string;
  rule?: { de: string; en: string; ex: [string, string][] };
}

let cache: TransferData | null = null;
let inflight: Promise<TransferData | null> | null = null;

/** Load once. Resolves to null when the file is missing or malformed: the line is a
 *  detail, never a requirement. */
export function loadTransfer(): Promise<TransferData | null> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  const base = import.meta.env.BASE_URL || '/';
  inflight = fetch(base + 'data/transfer.json')
    .then((r) => (r.ok ? (r.json() as Promise<TransferData>) : null))
    .then((d) => (cache = d && d.v === 1 && d.words ? d : null))
    .catch(() => null);
  return inflight;
}

/** The line for one card, or null. `bare` is the headword without its article, so
 *  the card's own pair is never offered as an example of its rule. */
export function transferFor(data: TransferData | null, term: string, bare: string, examples = 3): Transfer | null {
  const row = data?.words[term];
  if (!row) return null;
  const [kind, en, ruleId] = row;
  const r = ruleId ? data!.rules[ruleId] : undefined;
  const ex = r?.ex.filter(([d]) => d !== bare).slice(0, examples) ?? [];
  return {
    kind,
    en: en || undefined,
    rule: r && ex.length ? { de: r.de, en: r.en, ex } : undefined,
  };
}
