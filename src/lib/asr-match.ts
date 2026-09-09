// Did the recogniser hear the word? — the whole of the matching, and no audio.
//
// A speech recogniser hands back a string. "Did they say *Eichhörnchen*" is not
// string equality against that string, and the gap between the two is where this
// game lives or dies. Four strategies, in descending confidence, and the one that
// fired is reported rather than hidden — because the game shows the learner what
// happened rather than a score, and "counted on phonetics" is a different fact
// from "exact".
//
// ## The rule this file exists to protect
//
// **A miss means the word was not caught. It never means the learner mispronounced
// it.** Every threshold here leans toward catching, and where it is wrong it is
// wrong generously. The reason is not kindness: the users are non-native speakers,
// the recogniser is the less reliable party in the exchange, and an app that tells
// somebody with an accent that they said their own word wrong is worse than an app
// that occasionally counts a near miss.
//
// ## Why phonetics, and why Kölner specifically
//
// Levenshtein on letters treats *Schtrasse* and *Strasse* as two edits apart and
// *Straße* and *Strafe* as one — exactly backwards for the thing being measured. The
// Kölner Phonetik is the German-language equivalent of Soundex, codes the sounds
// German actually distinguishes, and is the standard instrument for this. It is
// implemented here in its textbook form; a variant tuned to flatter the game would
// measure the tuning rather than the speech.
//
// It is also **loose**, and that is stated rather than fixed: `Haus` and `aus` code
// identically, because `h` is silent in the algorithm. A phonetic-only hit on a
// short word is a weak hit. `verdict` reports *which* strategy fired so a caller can
// treat them differently; the game currently does not, and that is a decision waiting
// on the probe rather than an oversight.
//
// Nothing here touches the microphone, so all of it is testable — which is the
// point of the split. See `docs/SPEAKING.md`.

/** Lowercase, umlauts folded to their base letter, everything else dropped.
 *
 *  Folding rather than preserving: a recogniser writes *Strasse* or *Straße* by its
 *  own orthographic conventions and neither is a fact about what was said. */
export function normalise(s: string): string {
  return (s || '').toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z]/g, '');
}

/** What a learner is actually asked to say, from a Lexi headword.
 *
 *  `der Tisch` → *Tisch*, `sich erinnern an + A` → *erinnern*. **The article is
 *  dropped deliberately.** Knowing a German noun means knowing its gender, and this
 *  app is emphatic about that everywhere else — but gender has its own drill, and
 *  asking for *der Tisch* here doubles the surface the recogniser can fail on for a
 *  fact this game is not testing. One word, one sound, one verdict. */
export function spokenForm(term: string): string {
  return term
    .replace(/^(der|die|das)\s+/i, '')
    .replace(/^sich\s+/i, '')
    .replace(/\s+\w+\s+\+\s+[ADG]$/i, '')
    .split(/[(,]/)[0]
    .trim();
}

/** Kölner Phonetik, textbook form. Returns '' for anything with no codable sound. */
export function koelner(word: string): string {
  const s = normalise(word);
  const codes: string[] = [];
  const has = (set: string, ch: string | undefined) => !!ch && set.includes(ch);
  for (let i = 0; i < s.length; i++) {
    const c = s[i], prev = s[i - 1], next = s[i + 1];
    let code: string | null = null;
    if ('aeijouy'.includes(c)) code = '0';
    else if (c === 'h') code = null;
    else if (c === 'b') code = '1';
    else if (c === 'p') code = next === 'h' ? '3' : '1';
    else if (c === 'd' || c === 't') code = has('csz', next) ? '8' : '2';
    else if ('fvw'.includes(c)) code = '3';
    else if ('gkq'.includes(c)) code = '4';
    else if (c === 'c') {
      if (i === 0) code = has('ahkloqrux', next) ? '4' : '8';
      else code = !has('sz', prev) && has('ahkoqux', next) ? '4' : '8';
    } else if (c === 'x') code = has('ckq', prev) ? '8' : '48';
    else if (c === 'l') code = '5';
    else if (c === 'm' || c === 'n') code = '6';
    else if (c === 'r') code = '7';
    else if (c === 's' || c === 'z') code = '8';
    if (code) codes.push(code);
  }
  let joined = '', prevCh = '';
  for (const ch of codes.join('')) { if (ch !== prevCh) joined += ch; prevCh = ch; }
  if (!joined) return '';
  // The leading code keeps its zero; interior vowels are dropped.
  return joined[0] + joined.slice(1).replace(/0/g, '');
}

/** Edit distance, iterative and allocation-light — this runs per interim result,
 *  which on a fast recogniser is several times a second. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  return max ? 1 - levenshtein(a, b) / max : 1;
}

/** How the word was caught, if it was. Ordered by how much it is worth believing. */
export type Caught = 'exact' | 'alternative' | 'phonetic' | 'fuzzy' | null;

export interface Verdict {
  caught: Caught;
  /** The transcript token that came closest — what to print over the target. */
  heard: string;
  /** 0..1 against that token. Reported so a caller can be stricter than this file. */
  similarity: number;
}

/** Inherited from the probe and **not tuned**, which is deliberate: tuning it
 *  against anything but real transcripts is fitting to a guess. `docs/SPEAKING.md`
 *  gate 1–3. */
export const FUZZY_FLOOR = 0.80;

/** Below this many letters, a phonetic match is not evidence. `Haus` and `aus` share
 *  a Kölner code, and so do most short words; on a long word the same collision is
 *  vanishingly unlikely and the code is doing real work. */
const PHONETIC_MIN_LEN = 5;

/**
 * Did the recogniser hear `target`?
 *
 * `transcript` is the best guess, `alternatives` the rest of the n-best list when
 * the engine gives one (iOS may give exactly one — gate 3).
 *
 * Both the whole transcript and each word in it are candidates. A recogniser that
 * splits a compound into two words — *Eich Hörnchen* — has not misheard it, and one
 * that runs two words together is the same case backwards.
 */
export function verdict(target: string, transcript: string, alternatives: string[] = []): Verdict {
  const t = normalise(spokenForm(target));
  const raw = (transcript || '').trim();
  if (!t) return { caught: null, heard: raw, similarity: 0 };

  const tokens = raw.split(/\s+/).filter(Boolean);
  const candidates = [raw, ...tokens].filter(Boolean);

  let best = { sim: 0, token: '', norm: '' };
  for (const c of candidates) {
    const n = normalise(c);
    if (!n) continue;
    const sim = similarity(t, n);
    if (sim > best.sim) best = { sim, token: c, norm: n };
  }

  const heard = best.token || raw;
  const sim = Number(best.sim.toFixed(3));

  if (best.norm === t) return { caught: 'exact', heard, similarity: sim };

  // The n-best list before the fuzzy floor: the engine offering the exact word as
  // its second guess is stronger evidence than its first guess being 0.81 similar.
  for (const alt of alternatives) {
    const altTokens = [alt, ...alt.split(/\s+/)];
    if (altTokens.some((x) => normalise(x) === t)) {
      return { caught: 'alternative', heard: heard || alt, similarity: sim };
    }
  }

  if (t.length >= PHONETIC_MIN_LEN && best.norm && koelner(t) === koelner(best.norm)) {
    return { caught: 'phonetic', heard, similarity: sim };
  }
  if (best.sim >= FUZZY_FLOOR) return { caught: 'fuzzy', heard, similarity: sim };
  return { caught: null, heard, similarity: sim };
}
