// Progress — "how am I doing?", answered once.
//
// This replaced four sibling destinations that were four views of one dataset:
// the Karte heatmap, the Decks list, the Wortkarte map and the Stats page, plus
// a KPI strip on one of them and Blind Spots buried in an accordion on Today.
//
// ## The 2026-08-26 correction
//
// That merge went one surface too far. **Decks and the word map are not
// self-assessment** — they are the lexicon, and a learner opening *Essen* wants
// to see what it teaches, not to be told how much of it they have missed. Filing
// browse under Progress meant the only route to 6,622 cards ran through the page
// that measures you, and it left this surface answering two questions with one
// name. Both moved to `#/words`; every old `#/progress/decks/…` hash still
// resolves there (see route.ts).
//
// What is left answers exactly one question, read top to bottom:
//   the number → where you are thin → how you're trending → what you keep missing
//
// The observatory hangs off the bottom rather than off Today, for the same
// reason: it is a picture of what you have built, which is this surface\'s
// subject and not the daily briefing\'s.
import { useRef } from 'react';
import { Check, ChevronRight, LayoutGrid } from 'lucide-react';
import { totals, streak, goalProgress, completions, lastSeen } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt, heatText } from '../lib/ui.ts';
import Karte from './Karte.tsx';
import Stats from './Stats.tsx';
import BlindSpotList from '../components/BlindSpotList.tsx';
import CountUp from '../components/CountUp.tsx';
import BrainHero from '../components/Brain/BrainHero.tsx';
import Card from '../components/ui/Card.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import type { Target } from '../types.ts';

export default function Progress({ onStudy, onBlindDrill, onOpenGroup, onBrain }: {
  onStudy: (t: Target) => void;
  onBlindDrill: (tag?: string) => void;
  /** Into the lexicon, which now lives on Words. The heatmap is a *map of* the
   *  corpus, so tapping a region has to land in the corpus. */
  onOpenGroup: (group: string) => void;
  onBrain: () => void;
}) {
  useStore();

  // ---- the overview ---------------------------------------------------------
  return (
    <div className="w-full max-w-[1100px] mx-auto">
      {/* The only one of the five primary surfaces still titled in English —
          Wortschatz, Üben and Lesen were already German, so this read as an
          oversight rather than a choice. `Fortschritt` is a B1 word the learner
          meets on the way past this screen anyway. */}
      <Kicker className="block mb-0.5">Progress</Kicker>
      <h1 lang="de" className="display text-3xl sm:text-4xl mb-3">Fortschritt</h1>

      {/* The KPI strip used to sit here (it rode on top of the Karte view).
          Composing the two surfaces made it obvious they were the same four
          numbers twice over — Known, coverage, seen, due, streak — separated
          only by having lived on different screens. The headline says it once. */}
      <Headline />

      {/* Where you are thin, spatially. Karte supplies its own heading. */}
      <section aria-label="Knowledge heatmap" className="mb-6">
        <Karte
          onStudy={onStudy}
          onStudyGroup={(g) => onStudy({ kind: 'group', name: g })}
          onStudyAll={() => onStudy({ kind: 'all', name: 'All sectors' })}
          onOpenGroup={onOpenGroup}
        />
      </section>

      <Finished />

      {/* How you're trending. */}
      <div className="mb-6"><Stats /></div>

      {/* What you keep getting wrong. This was behind an accordion on Today,
          which is the wrong surface for it — Today is for doing, not auditing. */}
      <section aria-labelledby="blind-heading" className="mb-6">
        <h2 id="blind-heading" className="text-lg font-bold mb-3">Blind spots</h2>
        <BlindSpotList onDrill={onBlindDrill} />
      </section>

      {/* The observatory. It used to open the daily briefing, above the
          greeting — the first thing a learner saw before being told what to do.
          It is a picture of accumulated knowledge, which is this page\'s
          subject; Today\'s is the next twenty minutes. */}
      <section aria-label="Your brain" className="mb-6">
        <BrainHero onOpen={onBrain} />
      </section>

      {/* Every "you are thin here" on this page ends in the same question:
          thin in *what*? The answer is a deck, and decks are on Words. */}
      <Card as="button" pad="none" onClick={() => onOpenGroup('')}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:border-accent transition-colors">
        <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-accent flex-shrink-0"><LayoutGrid size={18} /></span>
        <span className="flex-1">
          <span className="block text-base font-semibold">Browse the lexicon</span>
          <span className="block text-2xs text-dim">Every deck and every word, with a search box — on Words.</span>
        </span>
        <ChevronRight size={16} className="text-dim flex-shrink-0" />
      </Card>
    </div>
  );
}

/** Things you have actually finished.
 *
 *  Nothing in a spaced-repetition app ever ends: coverage climbs asymptotically
 *  and "session complete" recurs daily until it means nothing. A fully-known
 *  sector is finite, earned, and — because the record is ratcheted — cannot be
 *  taken back by a later lapse. This is where they accumulate.
 *
 *  Silent until there is one. An empty trophy case is worse than no trophy case. */
function Finished() {
  const done = completions();
  if (done.length === 0) return null;

  return (
    <section aria-labelledby="finished-heading" className="mb-6">
      <h2 id="finished-heading" className="text-lg font-bold mb-1">Finished</h2>
      <p className="text-dim text-xs mb-3">
        {done.length} sector{done.length === 1 ? '' : 's'} where you know every card. Lapses don’t take these back.
      </p>
      <Card pad="none" className="p-4 flex flex-wrap gap-2">
        {done.map((c) => (
          <span key={c.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-green/40 bg-green-d
              px-3 py-1 text-xs font-semibold text-green">
            <Check size={13} aria-hidden /> {c.name}
          </span>
        ))}
      </Card>
    </section>
  );
}

/** The number the whole app is for.
 *
 *  DESIGN-REVIEW argued *Known* should be the app's currency and it never
 *  shipped — it sat in a KPI tile while "cards queued" took the display size.
 *  Cards queued is the right hero for Today (it's the size of the task in front
 *  of you); Known is the right hero here, because this is the surface that
 *  answers how far you've come. */
function Headline() {
  const t = totals();
  const gp = goalProgress();
  const pct = Math.round(t.coverage * 100);
  // Read once, on mount, before Karte's own effect records the new state —
  // both surfaces animate from the same baseline, so the number and the map
  // agree about what changed.
  const seen = useRef(lastSeen()).current;

  return (
    <Card pad="none" className="px-4 sm:px-6 py-5 sm:py-6 mb-4">
      <Kicker tone="accent" className="block mb-2">Words you know</Kicker>
      <div className="flex items-end gap-3 flex-wrap">
        {/* Counts up from the total the learner last saw on this surface, so
            returning after a session shows the number *arriving* rather than
            already sitting there. `from` is undefined on a first visit, which
            makes CountUp render the value flat — nothing to travel from, and a
            count-up from zero would be a small lie about what just happened. */}
        <span className="font-mono font-bold text-5xl sm:text-6xl leading-none tabular-nums text-green">
          <CountUp value={t.known} from={seen?.known} />
        </span>
        <span className="text-dim text-base mb-1.5">
          of {fmt(t.count)} in scope
          <span className="ml-1.5 font-semibold" style={{ color: heatText(t.coverage) }}>· {pct}%</span>
        </span>
      </div>
      <p className="text-dim text-xs mt-2.5">
        {fmt(t.learned)} seen · {fmt(t.due)} due now · {streak()}-day streak
        {gp && <> · goal {gp.goal.level} at {gp.pct}%</>}
      </p>
    </Card>
  );
}
