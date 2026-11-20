// The recorded behaviour of the matcher and the conjugator, replayed.
//
// ## Why this exists
//
// The authoring gate, the reader, the text scanner, coverage and the ownership
// audit all stand on `buildMatcher` and `conjugate`, and their unit tests pin a few
// dozen hand-picked cases. A refactor can pass every one of those and still move
// thousands of tokens to a different card. This records what both do today over
// every example sentence, every headword and every verb in the corpus, so a change
// to either shows up as a list of the sentences it changed.
//
// The idea is rust-anything's record and replay (2026-11-20): record the original
// on real inputs, then hold every later version to the recording.
//
// ## Why the inputs are frozen
//
// The matcher's output depends on the corpus as much as on the code: a new card
// takes forms that used to resolve elsewhere. Replaying against the live
// `vocab.json` would fail on every corpus batch, and a check that fails on every
// batch gets re-recorded without being read. So the recording carries its own
// corpus snapshot (`inputs.json.gz`) and only a *code* change can move it. What a
// batch does to the existing examples is `corpus:ownership`'s question.
//
// ## Why the outputs are plain text
//
// `annotate.txt` and `conjugate.txt` have one line per input, so a re-record is a
// git diff of exactly the lines that moved. That diff is the review. Text also
// delta-compresses in git, where a re-recorded gzip would be a new blob every time.
//
// Kept free of node imports so the recorder and the test run the same code.
import { buildMatcher, government } from '../matcher.ts';
import { conjugate, canConjugate, recognitionPraesens } from '../conjugate.ts';
import type { Word } from '../../types.ts';

/** The card fields `buildMatcher` reads today. If it starts reading another,
 *  add the field here and re-record with `--refresh`, or the replay is blind to it. */
export type CardRow = [id: string, term: string, pos: Word['pos'], gender: Word['gender'], plural: Word['plural']];

export interface Inputs {
  /** The commit whose corpus this is. */
  inputsFrom: string;
  corpus: CardRow[];
  /** `public/data/inflections.json` at that commit. */
  attested: Record<string, string[]>;
  /** Every example sentence in the corpus at that commit. */
  sentences: string[];
}

export interface Outputs {
  /** One line per sentence, then one per headword. Word tokens are tab-separated:
   *  `token=term` when it resolved to a card, `token~term` when it resolved through
   *  a compound's head, and the bare `token` when it resolved to nothing. Terms
   *  are unique in the corpus, and unlike ids they survive a relevel. */
  annotate: string[];
  /** One JSON line per verb row: `[lemma, canConjugate, recognitionPraesens, conjugation]`. */
  conjugate: string[];
}

export function toWords(rows: CardRow[]): Word[] {
  return rows.map(([id, term, pos, gender, plural]) => ({
    id, term, pos, gender, plural,
    en: '', level: 'A1', ipa: null, def: null, syn: [], ant: [], ex: [], field: '', kind: 'word',
  } as Word));
}

export function replay(inputs: Inputs): Outputs {
  const words = toWords(inputs.corpus);
  const m = buildMatcher(words, inputs.attested);
  const line = (text: string) => m.annotate(text)
    .filter((s) => s.isWord)
    .map((s) => (s.word ? `${s.text}${s.viaCompound ? '~' : '='}${s.word.term}` : s.text))
    .join('\t');
  const annotate = [...inputs.sentences.map(line), ...words.map((w) => line(w.term))];

  // After `buildMatcher`, which primes the conjugator with the corpus's verbs,
  // exactly as the app does.
  const conj = words.filter((w) => w.pos === 'verb').map((w) => {
    const lemma = government(w.term)?.lemma ?? w.term;
    const can = canConjugate(lemma);
    let full: unknown = null;
    try { full = can ? conjugate(lemma) : null; } catch (e) { full = { error: String(e) }; }
    return JSON.stringify([lemma, can, recognitionPraesens(lemma), full]);
  });
  return { annotate, conjugate: conj };
}

export interface Change { kind: 'annotate' | 'conjugate'; line: number; input: string; was: string; now: string }

/** Every line where `now` differs from `was`, with the input that produced it. */
export function compare(inputs: Inputs, was: Outputs, now: Outputs): Change[] {
  const out: Change[] = [];
  const n = Math.max(was.annotate.length, now.annotate.length);
  for (let i = 0; i < n; i++) {
    if (was.annotate[i] === now.annotate[i]) continue;
    const input = i < inputs.sentences.length
      ? inputs.sentences[i]
      : `headword ${inputs.corpus[i - inputs.sentences.length]?.[1] ?? '?'}`;
    out.push({ kind: 'annotate', line: i + 1, input, was: was.annotate[i] ?? '(none)', now: now.annotate[i] ?? '(none)' });
  }
  const k = Math.max(was.conjugate.length, now.conjugate.length);
  for (let i = 0; i < k; i++) {
    if (was.conjugate[i] === now.conjugate[i]) continue;
    const either = was.conjugate[i] ?? now.conjugate[i];
    out.push({ kind: 'conjugate', line: i + 1, input: (JSON.parse(either) as string[])[0], was: was.conjugate[i] ?? '(none)', now: now.conjugate[i] ?? '(none)' });
  }
  return out;
}

export function explain(c: Change): string {
  const tok = (s: string) => s.replace(/\t/g, ' · ');
  return c.kind === 'annotate'
    ? `annotate.txt:${c.line} «${c.input}»\n    was ${tok(c.was)}\n    now ${tok(c.now)}`
    : `conjugate.txt:${c.line} ${c.input}\n    was ${c.was}\n    now ${c.now}`;
}

/** The outputs as the files store them, and back. */
export const toText = (lines: string[]) => lines.join('\n') + '\n';
export const fromText = (text: string) => text.replace(/\n$/, '').split('\n');
