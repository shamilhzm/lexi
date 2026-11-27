// Which models Lexi may use. A licence is a fact about a model, so admission is a
// function of the spec and is tested, not argued again for each new release.
//
// The rules, and where each comes from:
//
//   1. **Open weights or nothing.** A voice or model whose weights forbid
//      commercial use, forbid derivatives, or carry use restrictions is refused.
//      VISION, *A closed voice*: Lexi went silent rather than speak through a model
//      it could not offer on the same terms as itself. Non-commercial weights fail
//      that test too: an MIT app cannot pass them on to a fork that sells lessons.
//   2. **Open code.** The runtime that executes in the learner's browser is under a
//      permissive licence, or it is the learner's own server, which Lexi neither
//      ships nor starts.
//   3. **No GPL in the bundle or its downloads.** Lexi's code is MIT. A GPL
//      phonemiser (espeak-ng) may run on a maintainer's machine to render clips, and
//      the clips may ship. The program itself may not travel with Lexi.
//   4. **Nothing in the cloud.** `Where` has no cloud value, so a hosted model cannot
//      be expressed as an engine at all. The settled tutor is a separate thing with
//      its own consent (`lib/ai.ts`).
//
// The device's own speech synthesis (`speechSynthesis`) and recognition are closed
// models too, and there is no spec for them to fail with: they are refused by not
// existing here. `engines.test.ts` keeps both APIs out of `src/`.
import type { EngineSpec } from './types.ts';

/** Permissive licences for code that runs in the learner's browser. */
export const OPEN_CODE: ReadonlySet<string> = new Set([
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'MPL-2.0', 'Zlib',
]);

/** Weights and voice data a learner can use, and a fork can redistribute, for any
 *  purpose. Attribution licences are fine; Lexi already carries an ATTRIBUTIONS file. */
export const OPEN_WEIGHTS: ReadonlySet<string> = new Set([
  'CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'MIT', 'Apache-2.0', 'BSD-3-Clause',
]);

/** Copyleft code: admissible only where it never ships (rule 3). */
const COPYLEFT = /^(A?GPL|LGPL)-/;

/** The learner's own server and the model they chose to run on it. Lexi does not
 *  distribute either, so their licences are the learner's business, not Lexi's. */
export const LEARNER_SUPPLIED = 'learner-supplied';

export type Verdict = { ok: true } | { ok: false; why: string };

export function admissible(s: EngineSpec): Verdict {
  const { code, weights } = s.licence;
  // Rule 2's exception first: a local server is the learner's software.
  if (s.where === 'local-server') {
    if (s.ships !== 'external') return { ok: false, why: 'a local server is the learner’s own; Lexi never ships one' };
    return { ok: true };
  }
  if (weights === LEARNER_SUPPLIED || code === LEARNER_SUPPLIED) {
    return { ok: false, why: 'only a learner’s own local server may run a model Lexi does not vet' };
  }
  if (!OPEN_WEIGHTS.has(weights)) {
    return { ok: false, why: `weights under ${weights} are not open for every use (VISION, A closed voice)` };
  }
  if (COPYLEFT.test(code)) {
    return s.ships === 'build-time' && s.where === 'build-time'
      ? { ok: true }
      : { ok: false, why: `${code} code may run at build time but may not ship inside Lexi’s MIT bundle` };
  }
  if (!OPEN_CODE.has(code)) return { ok: false, why: `code under ${code} is not a permissive licence` };
  return { ok: true };
}
