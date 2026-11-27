// Engines: the seam for open models on the learner's own machine. See types.ts for
// the contracts, policy.ts for what may be admitted, registry.ts for what has been
// looked at, probe.ts for what this device could run, and docs/LOCAL-AI.md for the
// decisions still open.
//
// **No engine is installed.** `installed()` is empty, and the drills, the feed and
// the exam room do not import this module. Lexi stays silent until the owner admits
// a voice (VISION, *A closed voice*).
import { admissible } from './policy.ts';
import { ENGINES } from './registry.ts';
import { missing, type Capabilities } from './probe.ts';
import type { Engine, EngineKind, EngineSpec } from './types.ts';

export type { Engine, EngineKind, EngineSpec, Voice, Ears, Tutor } from './types.ts';
export { admissible } from './policy.ts';
export { probe, missing, type Capabilities } from './probe.ts';
export { ENGINES, enginesFor } from './registry.ts';

/** The engines that are switched on. Empty until a decision in docs/LOCAL-AI.md
 *  adds one, through the policy. */
export function installed(): Engine[] { return []; }

/** For each kind, what this device could run among the engines worth building:
 *  admissible, not refused, and with every need met. */
export function readiness(kind: EngineKind, c: Capabilities): { could: EngineSpec[]; blocked: { spec: EngineSpec; needs: string[] }[] } {
  const worth = ENGINES.filter((e) => e.kind === kind && e.status !== 'refused' && admissible(e).ok && e.where !== 'build-time');
  const could: EngineSpec[] = [];
  const blocked: { spec: EngineSpec; needs: string[] }[] = [];
  for (const e of worth) {
    const m = missing(e, c);
    if (m.length) blocked.push({ spec: e, needs: m }); else could.push(e);
  }
  return { could, blocked };
}
