// "Your path" — where you are, and the three things to do next.
//
// Home used to answer "what's due today?" and nothing else. The A1→C2 strip
// showed six percentages with no sense of a route through them, so a learner
// could study for a week without ever being told what they were working toward
// or what to pick up next. The engine already knew — weakestSectors ranks the
// vocabulary, missStats ranks the errors, pointStats ranks the grammar — but
// none of it surfaced as a suggestion.
//
// Nothing here is gating. It is a recommendation, always skippable, and the
// Start-session button below it remains the primary action.
import { useEffect, useState } from 'react';
import { BookOpen, ChevronRight, Layers, TrendingDown } from 'lucide-react';
import { levelStats, placementLevel, levels, weakestSectors, missStats, pointStats } from '../store.ts';
import { useStore } from '../useStore.ts';
import { heat } from '../lib/ui.ts';
import { loadGrammar, type GPoint } from '../lib/grammar.ts';
import LevelProgress from './LevelProgress.tsx';
import { ALL_LEVELS, type CEFR, type Target } from '../types.ts';

interface NextItem {
  icon: typeof BookOpen;
  label: string;
  detail: string;
  onGo: () => void;
}

export default function PathCard({ onGrammar, onStudy, onBlind }: {
  onGrammar: () => void;
  onStudy: (t: Target) => void;
  onBlind: (tag?: string) => void;
}) {
  useStore();
  const placed = placementLevel();
  const filter = levels();
  const level: CEFR = placed ?? [...ALL_LEVELS].reverse().find((l) => filter.has(l)) ?? 'A1';

  const stat = levelStats().find((s) => s.level === level);
  const known = stat && stat.count ? stat.known / stat.count : 0;

  // The bank is only needed for the grammar counts, so it loads after paint —
  // Home must not wait on a 266 KB fetch to render its primary action.
  const [points, setPoints] = useState<GPoint[] | null>(null);
  useEffect(() => { loadGrammar().then((g) => setPoints(g[level] ?? [])); }, [level]);
  const gstats = points?.map((p, pi) => ({ p, pi, s: pointStats(level, pi, p.exercises.length) }));
  const started = gstats?.filter((r) => r.s.started).length ?? 0;

  // Three suggestions, each a different kind of work, so "next" never reads as
  // the same task three times.
  const next: NextItem[] = [];

  const freshPoint = gstats?.find((r) => !r.s.started);
  if (freshPoint) {
    next.push({
      icon: BookOpen,
      label: freshPoint.p.title,
      detail: `New ${level} grammar · ${freshPoint.p.summary}`,
      onGo: onGrammar,
    });
  }

  const weak = weakestSectors(1)[0];
  if (weak) {
    next.push({
      icon: Layers,
      label: weak.name,
      detail: `Your thinnest topic · ${Math.round(weak.coverage * 100)}% known of ${weak.count}`,
      onGo: () => onStudy({ kind: 'sector', name: weak.name }),
    });
  }

  const miss = missStats(30)[0];
  if (miss && miss.count >= 2) {
    next.push({
      icon: TrendingDown,
      label: miss.tag,
      detail: `Missed ${miss.count} time${miss.count === 1 ? '' : 's'} in the last 30 days`,
      onGo: () => onBlind(miss.tag),
    });
  }

  return (
    <div className="bg-panel border border-line rounded-md p-3 sm:p-4 mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-2.5 px-1">
        <span className="text-2xs text-amber font-mono uppercase tracking-widest font-semibold">Your path</span>
        <span className="text-2xs text-dim font-mono tabular-nums">
          {level} · {Math.round(known * 100)}% of words
          {gstats && ` · ${started}/${gstats.length} grammar`}
        </span>
      </div>

      {/* The A1→C2 strip keeps its job (jump the level filter) but sits inside
          the narrative now, rather than floating above it as its own panel. */}
      <LevelProgress />

      {next.length > 0 && (
        <>
          <p className="text-2xs text-dim font-mono uppercase tracking-widest px-1 mt-1 mb-1.5">Next up</p>
          <div className="space-y-1.5">
            {next.map((n) => (
              <button key={n.label} onClick={n.onGo}
                className="w-full flex items-center gap-3 bg-panel2 border border-line rounded-md px-3 py-2.5 text-left hover:border-amber transition-colors">
                <n.icon size={15} className="text-amber flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{n.label}</span>
                  <span className="block text-2xs text-dim truncate">{n.detail}</span>
                </span>
                <ChevronRight size={14} className="text-dim flex-shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}

      {/* A learner who has genuinely finished the level's suggestions should be
          told so, not shown an empty region. */}
      {next.length === 0 && points && (
        <p className="text-2xs text-dim px-1 mt-1">
          Everything at {level} is under way — the level bar above moves as reviews land.
          <span className="ml-1" style={{ color: heat(known) }}>{Math.round(known * 100)}% known</span>
        </p>
      )}
    </div>
  );
}
