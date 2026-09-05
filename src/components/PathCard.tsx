// "Your path" — where you are, and what to pick up next.
//
// The A1→C2 strip is the one control on Today that changes *which words you
// get*: it sets the level filter, and the filter is what the session builder
// draws from. So it sits above the session card rather than in a settings page,
// and it carries what each level means rather than only a percentage.
//
// Underneath it, at most two suggestions — a thin topic and a weak word-fact.
// There used to be three, and the first was "the next unstarted grammar point in
// your level", which is a sentence this app no longer has any business writing
// (docs/VISION.md, the 2026-09-05 refocus).
//
// Nothing here gates anything. It is a recommendation, always skippable, and the
// Start-session button below it remains the primary action.
import { ChevronRight, Layers, TrendingDown } from 'lucide-react';
import { levels, weakestSectors, missStats } from '../store.ts';
import { useStore } from '../useStore.ts';
import LevelProgress from './LevelProgress.tsx';
import Card from './ui/Card.tsx';
import Kicker from './ui/Kicker.tsx';
import { ALL_LEVELS, type Target } from '../types.ts';
import { MODE_TAG, type Mode } from '../views/drills.tsx';

interface NextItem {
  icon: typeof Layers;
  label: string;
  detail: string;
  onGo: () => void;
}

/** A blind-spot tag back to the drill that produces it. Misses are logged under
 *  the human label, which is what the list displays; this is the reverse map, so
 *  "you keep missing plurals" can be acted on rather than only read. */
export function modeForTag(tag: string): Mode | null {
  const hit = (Object.entries(MODE_TAG) as [Mode, string][]).find(([, t]) => t === tag);
  return hit ? hit[0] : null;
}

export default function PathCard({ onStudy, onDrill }: {
  onStudy: (t: Target) => void;
  onDrill: (m: Mode) => void;
}) {
  useStore();

  // The levels the filter is scoped to, as a range — "A1–B1", or just "A1" when
  // it is one. Same source the strip below highlights from, so the label and the
  // lit tiles cannot drift apart.
  const inFocus = ALL_LEVELS.filter((l) => levels().has(l));
  const span = inFocus.length
    ? (inFocus.length === 1 ? inFocus[0] : `${inFocus[0]}–${inFocus[inFocus.length - 1]}`)
    : '—';

  // Two suggestions, each a different kind of work, so "next" never reads as the
  // same task twice.
  const next: NextItem[] = [];

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
  const missMode = miss ? modeForTag(miss.tag) : null;
  if (miss && missMode && miss.count >= 2) {
    next.push({
      icon: TrendingDown,
      label: miss.tag,
      detail: `Missed ${miss.count} time${miss.count === 1 ? '' : 's'} in the last 30 days`,
      onGo: () => onDrill(missMode),
    });
  }

  return (
    <Card pad="sm" className="mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-2.5 px-1">
        <Kicker tone="accent">Your path</Kicker>
        {/* Names the *scope*, which is what the strip beneath it shows. The
            placed level is already in the top bar; what nothing explained was
            why three tiles are lit. */}
        <span lang="de" className="text-2xs text-dim font-mono tabular-nums">Studying {span}</span>
      </div>

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
    </Card>
  );
}
