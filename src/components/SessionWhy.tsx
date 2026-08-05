// What Lexi picked for you, before you press start.
//
// The scheduler carries a `reason` on every item it queues and explains itself in
// one line per card — "because you just learned obwohl", "you've missed Kasus 4×
// this month". No competitor does that, and it is the strongest thing the product
// has to say about itself. It was also invisible unless you were three cards deep
// into a session, which is the wrong side of the decision to start one.
//
// `SessionRecap`'s `Composition` says the same thing afterwards, in counts. This
// says it beforehand, in the scheduler's own words — the same `whyLine` copy the
// session player uses, so there is still exactly one source of truth for it.
//
// ## Why this can be computed without building the session
//
// `linkedGrammar` and `remedyGrammar` were exported from `session.ts` with the
// comment "exported for Today's preview + tests" and only the tests ever used
// them. They are pure, capped, and return the same `SessionItem[]` carrying the
// same reasons that `buildMixedSession` will weave in. Calling them here is not a
// simulation of the session — it is the same function against the same state.
//
// ## Deliberately not `WhyThisCard`
//
// That component renders a `RuleToggle`, which mounts `usePoint` and pulls the
// ~300 KB grammar bank. One of those on a study card is fine; three on Home would
// put a fetch behind a surface whose whole job is to render the primary action
// immediately. This renders the line and stops.
import { useMemo } from 'react';
import { whyLine } from './WhyThisCard.tsx';
import { blindSpotDrills, linkedGrammar, remedyGrammar } from '../session.ts';
import { BY_ID } from '../data/index.ts';
import type { Word } from '../types.ts';
import type { SessionItem } from '../session.ts';

/** How many reasons to show. Three is enough to make the point; more turns the
 *  primary action's own card into a list. */
const MAX_LINES = 3;

/** The reasons the scheduler will give for today's queue, deduplicated and capped.
 *
 *  Split out of the component and exported for the same reason `whyLine` was: the
 *  suite has no React renderer, and the interesting behaviour here — what gets
 *  shown, what gets merged, and when it stays silent — is all decided before any
 *  JSX exists. */
export function whyLinesFor(ids: string[]): { key: string; line: NonNullable<ReturnType<typeof whyLine>> }[] {
  const words = ids.map((id) => BY_ID.get(id)).filter((w): w is Word => !!w);
  // Same order the session builder weaves them in, so the preview reads in the
  // order the learner will meet them.
  const items = [...linkedGrammar(words), ...remedyGrammar(), ...blindSpotDrills(words)];
  const out: { key: string; line: NonNullable<ReturnType<typeof whyLine>> }[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const line = whyLine(it.reason);
    if (!line) continue;
    if (seen.has(reasonKey(it.reason))) continue;
    seen.add(reasonKey(it.reason));
    out.push({ key: reasonKey(it.reason), line });
    if (out.length >= MAX_LINES) break;
  }
  return out;
}

/** What a line is *about*, as opposed to how it is worded.
 *
 *  Keyed off the reason rather than the rendered copy, because `remedy` and
 *  `blindspot` describe the same weakness in different words — a real profile
 *  produced "You've missed Gender (der/die/das) 6× this month" immediately above
 *  "A weak spot — Gender (der/die/das), missed 6×". Two sentences, one fact, and
 *  the feature exists to make the scheduler look like it is thinking. Collapsing
 *  on the tag keeps the first, which is the stronger phrasing.
 *
 *  Blind spots also repeat on their own: `blindSpotDrills` de-duplicates by
 *  mode+word, so one weak mode across four words yields four identical lines. */
function reasonKey(reason: SessionItem['reason']): string {
  switch (reason.kind) {
    case 'remedy':
    case 'blindspot':
      return `weakness:${reason.tag}`;
    case 'linked':
      return `linked:${reason.trigger.id}`;
    default:
      return reason.kind;
  }
}

export default function SessionWhy({ ids }: { ids: string[] }) {
  const lines = useMemo(() => whyLinesFor(ids), [ids]);

  // Silence is valid and common: most days are plain reviews, and a heading with
  // nothing under it would make the feature look broken rather than quiet.
  if (lines.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-line">
      <p className="text-2xs text-dim uppercase tracking-wider font-mono mb-1.5">Why these cards</p>
      <ul className="space-y-1">
        {lines.map(({ key, line }) => {
          const Icon = line.icon;
          return (
            <li key={key} className="flex items-start gap-1.5 text-xs text-dim leading-relaxed">
              <Icon size={12} className="flex-shrink-0 mt-0.5" aria-hidden />
              <span>
                {line.lead}
                {line.em && <b lang={line.emLang} className="text-txt font-semibold">{line.em}</b>}
                {line.tail}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
