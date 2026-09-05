// Fortschritt — "how am I doing?", answered once.
//
// This replaced four sibling destinations that were four views of one dataset:
// the Karte heatmap, the Decks list, the Wortkarte map and the Stats page, plus
// a KPI strip on one of them and Blind Spots buried in an accordion.
//
// ## What arrived here on 2026-09-05
//
// The daily briefing was deleted (the app opens on a card now — see App.tsx), and
// four of its parts were not detours to a card at all. They were answers to *this*
// page's question and were only living there because that page came first:
//
//   the level strip     which words you are shown, and how far through each level
//   the goal line       the date you chose, and whether your pace reaches it
//   the placement nudge the two minutes that make every other number here honest
//   the backlog         how much of the mountain you have cleared
//
// Read top to bottom the page now goes: what you know → what you are studying →
// where you are thin → how you're trending → what you keep missing.
//
// What is left answers exactly one question, read top to bottom:
//   the number → where you are thin → how you're trending → what you keep missing
//
// The last of those is the only place in the app that says "you keep getting
// this wrong", so it is the only place that has earned the right to offer a run
// of one drill by name. Everything else here is read, not acted on.
import { useRef } from 'react';
import { useMemo } from 'react';
import { Check, ChevronRight, LayoutGrid, GraduationCap, Target as TargetIcon } from 'lucide-react';
import { totals, streak, goalProgress, completions, lastSeen, placementLevel, buildBriefing, backlogPeak } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt, heatText } from '../lib/ui.ts';
import PathCard from '../components/PathCard.tsx';
import Karte from './Karte.tsx';
import Stats from './Stats.tsx';
import BlindSpotList from '../components/BlindSpotList.tsx';
import CountUp from '../components/CountUp.tsx';
import Card from '../components/ui/Card.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import type { Target } from '../types.ts';
import type { Mode } from './drills.tsx';

export default function Progress({ onStudy, onDrill, onOpenGroup, onPlacement }: {
  onStudy: (t: Target) => void;
  /** Straight into a run of the drill the learner keeps missing. */
  onDrill: (m: Mode) => void;
  /** Into the lexicon, which lives on Words. The heatmap is a *map of* the
   *  corpus, so tapping a region has to land in the corpus. */
  onOpenGroup: (group: string) => void;
  /** The two-minute test. Nudged here because this is the page whose every
   *  number is more honest once it has been taken. */
  onPlacement: () => void;
}) {
  useStore();
  const placed = placementLevel();

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

      {/* The two minutes that calibrate everything above and below it. Shown
          until taken, and never again after. */}
      {!placed && (
        <Card as="button" accent pad="none" onClick={onPlacement}
          className="w-full flex items-center gap-3 px-4 py-3 mb-4 text-left hover:brightness-110 transition-[filter]">
          <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-accent flex-shrink-0"><GraduationCap size={18} /></span>
          <span className="flex-1">
            <span className="block text-base font-semibold">Two minutes to find your level</span>
            <span className="block text-xs text-dim">Lexi will skip the words you already know and start you where you actually are.</span>
          </span>
          <ChevronRight size={16} className="text-accent flex-shrink-0" />
        </Card>
      )}

      <Goal />

      {/* Which levels you are studying, and how far through each. This is the
          control that decides what the session serves you, so it is on the page
          that explains the session's results rather than buried in settings. */}
      <PathCard onStudy={onStudy} onDrill={onDrill} />

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
        <BlindSpotList onDrill={onDrill} />
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

/** The backlog, burnt down.
 *
 *  Only after a real gap, and only while it is still shrinking: a mountain of
 *  overdue reviews reads as failure, and the one thing that makes it bearable is
 *  seeing that it is *finite and moving*. Silent when the peak is the current
 *  total, which is the state where this would only be bad news repeated. */
function Backlog() {
  const due = useMemo(() => buildBriefing().dueTotal, []);
  const peak = backlogPeak();
  if (peak <= due || due === 0) return null;
  return (
    <div className="mt-3 max-w-[320px]">
      <div className="h-1 bg-panel2 rounded-full overflow-hidden">
        <div className="h-full bg-green rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(((peak - due) / peak) * 100)}%` }} />
      </div>
      <p className="text-2xs text-dim mt-1 font-mono">
        {fmt(peak - due)} of {fmt(peak)} backlog cleared · {fmt(due)} still waiting
      </p>
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

/** The date you chose, and whether your pace reaches it. Silent without a goal.
 *
 *  Two lines, not one 13px run of dim grey: this is the only sentence in the app
 *  that says what the learner is *for*. The claim rides its own line at the size
 *  of a heading; the pace stays a supporting line, because it is the commitment
 *  that motivates and the projection that qualifies it. */
function Goal() {
  const gp = goalProgress();
  if (!gp) return null;
  const when = new Date(gp.goal.date + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  const onTrack = gp.projectedPct !== null && gp.projectedPct >= 90;
  return (
    <Card pad="none" className="flex items-center gap-3 px-4 py-3.5 mb-4">
      <TargetIcon size={18} className={onTrack ? 'text-green flex-shrink-0' : 'text-accent flex-shrink-0'} />
      <div className="min-w-0">
        <p className="text-base font-semibold leading-tight">{gp.goal.level} by {when}</p>
        <p className="text-xs text-dim mt-1">
          {gp.pct}% recognised
          {gp.projectedPct !== null && (
            <> · at your pace <span className={onTrack ? 'text-green font-semibold' : 'text-txt font-semibold'}>~{gp.projectedPct}%</span> by then</>
          )}
          {gp.projectedPct === null && ' · pace appears after a day or two of study'}
        </p>
      </div>
    </Card>
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
        {t.recalled > 0 && <> · {fmt(t.recalled)} you can also produce</>}
      </p>
      <Backlog />
    </Card>
  );
}
