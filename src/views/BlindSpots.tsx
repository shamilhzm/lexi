// Schwachstellen — recurring weaknesses. Every wrong answer in the Gym and the
// grammar drills is tagged; this dashboard ranks them so you drill what actually
// trips you up. (You can't fix mistakes you don't notice.)
import { useMemo } from 'react';
import { TrendingDown, Target, Sparkles } from 'lucide-react';
import { missStats, missTotal } from '../store.ts';
import { useStore } from '../useStore.ts';

export default function BlindSpots({ onDrill }: { onDrill: (tag?: string) => void }) {
  useStore();
  const stats = useMemo(() => missStats(30), []);
  const total = missTotal(30);
  const max = stats[0]?.count ?? 1;

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="flex items-center gap-2.5 mb-1">
        <TrendingDown size={20} className="text-red" />
        <h1 className="text-[20px] font-bold">Blind spots</h1>
      </div>
      <p className="text-dim text-[13px] mb-4">Your most frequent mistakes over the last 30 days — drill these first.</p>

      {stats.length === 0 ? (
        <div className="bg-panel border border-line rounded-[16px] px-6 py-10 text-center">
          <div className="grid place-items-center w-12 h-12 rounded-full mx-auto mb-3" style={{ background: 'var(--color-green-d)' }}><Target className="text-green" size={20} /></div>
          <h2 className="text-[15px] font-bold mb-1">No blind spots yet</h2>
          <p className="text-dim text-[13px]">Do some Gym drills — every miss is tracked here so you can target your weak points.</p>
        </div>
      ) : (
        <>
          <div className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-4">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="font-mono font-bold text-[28px] tabular-nums">{total}</span>
              <span className="text-dim text-[13px]">misses across {stats.length} area{stats.length === 1 ? '' : 's'}</span>
            </div>
            <div className="space-y-2.5">
              {stats.map((s) => (
                <button key={s.tag} onClick={() => onDrill(s.tag)}
                  className="block w-full text-left rounded-md px-1.5 py-1 -mx-1.5 hover:bg-panel2 transition-colors" title="Drill this weakness">
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="truncate pr-2">{s.tag}</span>
                    <span className="font-mono text-dim flex-shrink-0">{s.count}×</span>
                  </div>
                  <div className="h-2 rounded-full bg-panel2 overflow-hidden">
                    <div className="h-full bg-red" style={{ width: `${Math.max(8, (s.count / max) * 100)}%` }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => onDrill()} className="flex items-center gap-2 bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5 text-[15px] hover:brightness-105">
            <Sparkles size={15} /> Drill grammar
          </button>
        </>
      )}
    </div>
  );
}
