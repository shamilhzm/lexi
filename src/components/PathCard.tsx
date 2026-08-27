// "Your path" — where you are, and the three things to do next.
//
// Home used to answer "what’s due today?" and nothing else. The A1→C2 strip
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
import { levelStats, levels, studyLevel, weakestSectors, missStats, pointStats } from '../store.ts';
import { useStore } from '../useStore.ts';
import { heatText } from '../lib/ui.ts';
import { loadGrammar, type GPoint } from '../lib/grammar.ts';
import LevelProgress from './LevelProgress.tsx';
import Card from './ui/Card.tsx';
import Kicker from './ui/Kicker.tsx';
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
  // Was `placed ?? highest-in-filter ?? 'A1'`, which resolved to C2 for anyone
  // unplaced. See store.studyLevel.
  const level: CEFR = studyLevel();

  const stat = levelStats().find((s) => s.level === level);
  const known = stat && stat.count ? stat.known / stat.count : 0;

  // The levels the filter is scoped to, as a range — "A1–B1", or just "A1" when
  // it is one. Same source the strip below highlights from, so the label and the
  // lit tiles cannot drift apart.
  const inFocus = ALL_LEVELS.filter((l) => levels().has(l));
  const span = inFocus.length ? (inFocus.length === 1 ? inFocus[0] : `${inFocus[0]}–${inFocus[inFocus.length - 1]}`) : level;

  // The bank is only needed for the grammar counts, so it loads after paint —
  // Home must not wait on a 266 KB fetch to render its primary action.
  const [points, setPoints] = useState<GPoint[] | null>(null);
  useEffect(() => { loadGrammar().then((g) => setPoints(g[level] ?? [])); }, [level]);
  const gstats = points?.map((p, pi) => ({ p, pi, s: pointStats(level, p.title, p.exercises.length) }));
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
      detail: `Your thinnest topic · ${Math.round(weak.coverage * 100)}% recognised of ${weak.count}`,
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
    <Card pad="sm" className="mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-2.5 px-1">
        <Kicker tone="accent">Your path</Kicker>
        {/* This read `A2 · 0% of words` — the learner's placed level — directly
            above a strip with A1, A2 *and* B1 lit and a paragraph beginning
            "B1 means being able to…". Three true facts (your level, your study
            scope, your working edge) rendered as one undifferentiated row, which
            reads as the card contradicting itself. The placed level is already in
            the top bar; what nothing explained was why three tiles are lit. So
            this now names the scope, which is what the strip beneath it shows. */}
        <span className="text-2xs text-dim font-mono tabular-nums">
          Studying {span}
          {gstats && ` · ${started}/${gstats.length} grammar`}
        </span>
      </div>

      {/* The A1→C2 strip keeps its job (jump the level filter) but sits inside
          the narrative now, rather than floating above it as its own panel. */}
      <LevelProgress onStudy={onStudy} />

      {next.length > 0 && (
        <>
          <Kicker className="block px-1 mt-1 mb-1.5">Next up</Kicker>
          <div className="space-y-1.5">
            {next.map((n) => (
              <Card as="button" key={n.label} tone="sunken" nested pad="none" onClick={n.onGo}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:border-accent transition-colors">
                <n.icon size={15} className="text-accent flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{n.label}</span>
                  <span className="block text-2xs text-dim truncate">{n.detail}</span>
                </span>
                <ChevronRight size={14} className="text-dim flex-shrink-0" />
              </Card>
            ))}
          </div>
        </>
      )}

      {/* A learner who has genuinely finished the level’s suggestions should be
          told so, not shown an empty region. */}
      {next.length === 0 && points && (
        <p className="text-2xs text-dim px-1 mt-1">
          Everything at {level} is under way — the level bar above moves as reviews land.
          <span className="ml-1 font-semibold" style={{ color: heatText(known) }}>{Math.round(known * 100)}% recognised</span>
        </p>
      )}
    </Card>
  );
}
