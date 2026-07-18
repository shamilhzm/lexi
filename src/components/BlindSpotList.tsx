// Ranked recurring mistakes with one-tap drilling. Every wrong answer in a drill
// is logged under a structural tag (grammar point, drill type); this ranks them so
// you fix what actually trips you up. Rendered inline in Today's Blind Spots
// accordion (expands in place — no page jump).
import { useMemo } from 'react';
import { Target, Sparkles } from 'lucide-react';
import { missStats, missTotal } from '../store.ts';
import { useStore } from '../useStore.ts';

export default function BlindSpotList({ onDrill, days = 30 }:
  { onDrill: (tag?: string) => void; days?: number }) {
  const v = useStore();
  const stats = useMemo(() => missStats(days), [days, v]);
  const total = missTotal(days);
  const max = stats[0]?.count ?? 1;

  if (stats.length === 0) {
    return (
      <div className="bg-panel border border-line rounded-[12px] px-6 py-8 text-center">
        <div className="grid place-items-center w-11 h-11 rounded-full mx-auto mb-3" style={{ background: 'var(--color-green-d)' }}>
          <Target className="text-green" size={18} />
        </div>
        <h3 className="text-[0.9375rem] font-bold mb-1">No blind spots yet</h3>
        <p className="text-dim text-[0.8125rem]">Do some drills — every miss is tracked here so you can target your weak points.</p>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-line rounded-[12px] p-4">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-mono font-bold text-[1.25rem] tabular-nums">{total}</span>
        <span className="text-dim text-[0.8125rem]">misses across {stats.length} area{stats.length === 1 ? '' : 's'} · last {days} days</span>
      </div>
      <div className="space-y-2.5">
        {stats.map((s) => (
          <button key={s.tag} onClick={() => onDrill(s.tag)}
            className="block w-full text-left rounded-md px-1.5 py-1 -mx-1.5 hover:bg-panel2 transition-colors" title="Drill this weakness">
            <div className="flex justify-between text-[0.8125rem] mb-1">
              <span className="truncate pr-2">{s.tag}</span>
              <span className="font-mono text-dim flex-shrink-0">{s.count}×</span>
            </div>
            <div className="h-2 rounded-full bg-panel2 overflow-hidden">
              <div className="h-full bg-red" style={{ width: `${Math.max(8, (s.count / max) * 100)}%` }} />
            </div>
          </button>
        ))}
      </div>
      <button onClick={() => onDrill()}
        className="mt-4 flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-4 py-2 text-[0.8125rem] hover:brightness-105">
        <Sparkles size={14} /> Drill grammar
      </button>
    </div>
  );
}
