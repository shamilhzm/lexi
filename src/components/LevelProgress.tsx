// A slim A1→C2 progression strip: per-level coverage, current focus highlighted,
// click a level to focus the filter on A1..that level, with an advance nudge once
// the highest focused level passes ~80%.
import { ChevronRight } from 'lucide-react';
import { levelStats, levels, setLevels } from '../store.ts';
import { useStore } from '../useStore.ts';
import { heat } from '../lib/ui.ts';
import { ALL_LEVELS } from '../types.ts';

const ADVANCE = 0.8;

export default function LevelProgress() {
  useStore();
  const stats = levelStats();
  const focus = levels();
  // the highest level currently in focus = your working edge
  const edgeIdx = Math.max(...ALL_LEVELS.map((l, i) => (focus.has(l) ? i : -1)));
  const edge = ALL_LEVELS[edgeIdx] ?? null;
  const edgeStat = stats[edgeIdx];
  const knownRatio = (s: { known: number; count: number }) => (s.count ? s.known / s.count : 0);
  const edgeKr = edgeStat ? knownRatio(edgeStat) : 0;
  const canAdvance = edge && edgeIdx < ALL_LEVELS.length - 1 && edgeStat && edgeKr >= ADVANCE;

  const focusUpTo = (i: number) => setLevels(new Set(ALL_LEVELS.slice(0, i + 1)));

  return (
    <div className="bg-panel border border-line rounded-[12px] p-3 sm:p-4 mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[13px] font-semibold text-dim">Your path · A1 → C2</h2>
        {canAdvance && (
          <button onClick={() => focusUpTo(edgeIdx + 1)}
            className="flex items-center gap-1 text-[11px] text-amber hover:underline">
            {edge} is {Math.round(edgeKr * 100)}% known — add {ALL_LEVELS[edgeIdx + 1]} <ChevronRight size={12} />
          </button>
        )}
      </div>
      <div className="flex gap-1.5">
        {stats.map((s, i) => {
          const active = focus.has(s.level);
          const kr = knownRatio(s);
          const pct = Math.round(kr * 100);
          return (
            <button key={s.level} onClick={() => focusUpTo(i)} title={`${s.known}/${s.count} known · ${s.learned} seen`}
              className={`flex-1 rounded-lg px-1 py-2 border transition-colors ${active ? 'border-amber bg-panel2' : 'border-line hover:border-dim'}`}>
              <div className={`text-[12px] font-bold text-center ${active ? 'text-amber' : 'text-dim'}`}>{s.level}</div>
              <div className="h-1.5 rounded-full bg-bg mt-1.5 overflow-hidden">
                <div className="h-full" style={{ width: `${Math.max(pct, 2)}%`, background: heat(kr) }} />
              </div>
              <div className="text-[10px] text-dim text-center mt-1 font-mono">{pct}%</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
