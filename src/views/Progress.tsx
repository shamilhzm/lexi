// Progress — "how am I doing?", answered once.
//
// This replaces four sibling destinations that were four views of one dataset:
// the Markt heatmap, the Decks list, the Wortkarte map and the Stats page, plus
// a KPI strip on one of them and Blind Spots buried in an accordion on Today. A
// learner could not predict which door led where, and `Explore.tsx` had to
// reimplement a back-stack in useState because the IA had depth the router
// didn't model.
//
// One surface, read top to bottom as a single answer:
//   the number → where you are thin → how you're trending → what you keep missing
//
// Depth (deck list, word map) is now real routing, so Back works and a deck is
// a linkable thing.
import { ArrowLeft, Check } from 'lucide-react';
import { totals, streak, goalProgress, completions } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt, heatText } from '../lib/ui.ts';
import Markt from './Markt.tsx';
import Decks from './Decks.tsx';
import Wortkarte from './Wortkarte.tsx';
import Stats from './Stats.tsx';
import BlindSpotList from '../components/BlindSpotList.tsx';
import CountUp from '../components/CountUp.tsx';
import Card from '../components/ui/Card.tsx';
import IconButton from '../components/ui/IconButton.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import type { ProgressRoute } from '../route.ts';
import type { Target } from '../types.ts';

export default function Progress({ route, onNavigate, onStudy, onBlindDrill }: {
  route: ProgressRoute;
  onNavigate: (next: ProgressRoute) => void;
  onStudy: (t: Target) => void;
  onBlindDrill: (tag?: string) => void;
}) {
  useStore();

  // ---- depth: the deck list and the word map --------------------------------
  if (route.level === 'decks' || route.level === 'map') {
    const title = route.level === 'decks' ? (route.group ?? 'All decks') : (route.sector ?? 'Word map');
    return (
      <div className="w-full max-w-[1100px] mx-auto">
        <div className="flex items-center gap-1.5 mb-3">
          <IconButton label="Back to Progress" pull
            onClick={() => onNavigate(route.level === 'map' ? { level: 'decks', group: route.group } : { level: 'overview' })}>
            <ArrowLeft size={18} />
          </IconButton>
          <nav aria-label="Breadcrumb" className="flex items-baseline gap-1.5 min-w-0 ml-1.5">
            <Kicker className="flex-shrink-0">
              {route.level === 'map' ? 'Decks /' : 'Progress /'}
            </Kicker>
            <span className="text-base font-semibold truncate">{title}</span>
          </nav>
        </div>

        {route.level === 'decks' && (
          <Decks initialGroup={route.group ?? null} onStudy={onStudy}
            onMap={(sector) => onNavigate({ level: 'map', group: route.group, sector })} />
        )}
        {route.level === 'map' && (
          <Wortkarte initialSector={route.sector ?? null} onStudy={onStudy} />
        )}
      </div>
    );
  }

  // ---- the overview ---------------------------------------------------------
  return (
    <div className="w-full max-w-[1100px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-3">Progress</h1>

      {/* The KPI strip used to sit here (it rode on top of the Markt view).
          Composing the two surfaces made it obvious they were the same four
          numbers twice over — Known, coverage, seen, due, streak — separated
          only by having lived on different screens. The headline says it once. */}
      <Headline />

      {/* Where you are thin, spatially. Markt supplies its own heading. */}
      <section aria-label="Knowledge heatmap" className="mb-6">
        <Markt
          onStudy={onStudy}
          onStudyGroup={(g) => onStudy({ kind: 'group', name: g })}
          onStudyAll={() => onStudy({ kind: 'all', name: 'All sectors' })}
          onOpenGroup={(g) => onNavigate({ level: 'decks', group: g })}
        />
      </section>

      <Finished />

      {/* How you're trending. */}
      <div className="mb-6"><Stats /></div>

      {/* What you keep getting wrong. This was behind an accordion on Today,
          which is the wrong surface for it — Today is for doing, not auditing. */}
      <section aria-labelledby="blind-heading">
        <h2 id="blind-heading" className="text-lg font-bold mb-3">Blind spots</h2>
        <BlindSpotList onDrill={onBlindDrill} />
      </section>
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

  return (
    <Card pad="none" className="px-4 sm:px-6 py-5 sm:py-6 mb-4">
      <Kicker tone="accent" className="block mb-2">Words you know</Kicker>
      <div className="flex items-end gap-3 flex-wrap">
        <span className="font-mono font-bold text-5xl sm:text-6xl leading-none tabular-nums text-green">
          <CountUp value={t.known} />
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
