// Ranked recurring mistakes with one-tap drilling. Every wrong answer in a drill
// is logged under a structural tag (grammar point, drill type); this ranks them so
// you fix what actually trips you up. Rendered inline in Today’s Blind Spots
// accordion (expands in place — no page jump).
import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { missStats, missTotal } from '../store.ts';
import { useStore } from '../useStore.ts';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';

export default function BlindSpotList({ onDrill, days = 30 }:
  { onDrill: (tag?: string) => void; days?: number }) {
  const v = useStore();
  const stats = useMemo(() => missStats(days), [days, v]);
  const total = missTotal(days);
  const max = stats[0]?.count ?? 1;

  if (stats.length === 0) {
    return (
      <Card pad="none" className="px-6 py-8 text-center">
        <div className="grid place-items-center w-11 h-11 rounded-full mx-auto mb-3" style={{ background: 'var(--color-green-d)' }}>
          <Target className="text-green" size={18} />
        </div>
        <h3 className="text-base font-bold mb-1">No blind spots yet</h3>
        <p className="text-dim text-xs">Do some drills — every miss is tracked here so you can target your weak points.</p>
      </Card>
    );
  }

  return (
    <Card pad="none" className="p-4">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-mono font-bold text-xl tabular-nums">{total}</span>
        <span className="text-dim text-xs">misses across {stats.length} area{stats.length === 1 ? '' : 's'} · last {days} days</span>
      </div>
      <div className="space-y-2.5">
        {stats.map((s) => (
          <button key={s.tag} onClick={() => onDrill(s.tag)}
            className="block w-full text-left rounded-md px-1.5 py-1 -mx-1.5 hover:bg-panel2 transition-colors" title="Drill this weakness">
            <div className="flex justify-between text-xs mb-1">
              <span className="truncate pr-2">{s.tag}</span>
              <span className="font-mono text-dim flex-shrink-0">{s.count}×</span>
            </div>
            <div className="h-2 rounded-full bg-panel2 overflow-hidden">
              <div className="h-full bg-red" style={{ width: `${Math.max(8, (s.count / max) * 100)}%` }} />
            </div>
          </button>
        ))}
      </div>
      {/* Target, not Sparkles: this button drills the exact weaknesses listed
          above it, and the icon should say so. */}
      <Button size="sm" className="mt-4" onClick={() => onDrill()}>
        <Target size={14} /> Drill grammar
      </Button>
    </Card>
  );
}
