// Which unresolved capitalised tokens in a text are proper names.
//
// Shared by the article reader and the feed so the two cannot disagree about a
// story's number. The dictionary decides where it can (a de.wiktionary page
// categorised as a surname, first name or place); where it has no page, a
// conservative rule in \`missingLooksLikeName\` decides, and errs toward counting.
import { classifyTokens, missingLooksLikeName } from '../wiktionary.ts';
import { appMatcher } from '../appMatcher.ts';
import { coverageOf, type WordState } from '../coverage.ts';
import type { Word } from '../../types.ts';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Does the corpus know this string as a word — either case, since a compound's
 *  head is a noun (capitalised) and its front may be anything. */
const known = (s: string) => {
  const m = appMatcher();
  return !!(m.annotate(cap(s))[0]?.word ?? m.annotate(s)[0]?.word);
};

export async function namesIn(paras: string[], stateOf: (w: Word) => WordState): Promise<Set<string>> {
  const initial = new Set<string>();
  const cands = new Set<string>();
  for (const p of paras) {
    let sentenceStart = true;
    for (const t of coverageOf(p, { stateOf }).tokens) {
      if (!t.isWord) { if (/[.!?:]["“”»«']?\s*$/.test(t.text.trim())) sentenceStart = true; continue; }
      if (t.state === 'absent' && /^\p{Lu}/u.test(t.text)) {
        cands.add(t.text);
        if (sentenceStart) initial.add(t.text);
      }
      sentenceStart = false;
    }
  }
  if (!cands.size) return new Set();
  const kinds = await classifyTokens([...cands]);
  const out = new Set<string>();
  for (const [tok, kind] of kinds) {
    if (kind === 'name') out.add(tok);
    else if (kind === 'missing' && !initial.has(tok) && missingLooksLikeName(tok, known)) out.add(tok);
  }
  return out;
}
