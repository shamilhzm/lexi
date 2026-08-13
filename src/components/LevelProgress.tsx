// A slim A1→C2 progression strip: per-level coverage, current focus highlighted,
// click a level to focus the filter on A1..that level, with an advance nudge once
// the highest focused level passes ~80%.
import { ChevronRight } from 'lucide-react';
import { levelStats, levels, setLevels } from '../store.ts';
import { CAN_DO, coverageNote } from '../lib/candos.ts';
import { useStore } from '../useStore.ts';
import { heat } from '../lib/ui.ts';
import { ALL_LEVELS, type Target } from '../types.ts';

const ADVANCE = 0.8;

export default function LevelProgress({ onStudy }: { onStudy?: (t: Target) => void } = {}) {
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
    // Not a card: this only ever renders inside PathCard, and a panel-on-panel
    // with the same tone and border read as a stray box around the chips.
    <div className="mb-3">
      {/* The A1→C2 chips below are self-describing, so no header label. The
          advance nudge stays — it teaches the affordance by acting on it. */}
      {canAdvance && (
        <div className="flex justify-end mb-2.5">
          <button onClick={() => focusUpTo(edgeIdx + 1)}
            className="flex items-center gap-1 text-2xs text-amber hover:underline">
            {edge} is {Math.round(edgeKr * 100)}% recognised — add {ALL_LEVELS[edgeIdx + 1]} <ChevronRight size={12} />
          </button>
        </div>
      )}
      <div className="flex gap-1.5">
        {stats.map((s, i) => {
          const active = focus.has(s.level);
          const kr = knownRatio(s);
          const pct = Math.round(kr * 100);
          return (
            <button key={s.level} onClick={() => focusUpTo(i)} title={`${s.known}/${s.count} known · ${s.learned} seen`}
              className={`flex-1 rounded-md px-1 py-2 border transition-colors ${active ? 'border-amber bg-panel2' : 'border-line hover:border-dim'}`}>
              <div className={`font-mono text-xs font-bold text-center ${active ? 'text-amber' : 'text-dim'}`}>{s.level}</div>
              <div className="h-1.5 rounded-full bg-bg mt-1.5 overflow-hidden">
                <div className="h-full transition-[width] duration-500" style={{ width: `${Math.max(pct, 2)}%`, background: heat(kr) }} />
              </div>
              <div className="text-2xs text-dim text-center mt-1 font-mono">{pct}%</div>
            </button>
          );
        })}
      </div>

      {/* What the level you're working on actually *is*.
          A count is the app's own currency and answers a question nobody asked —
          "am I B1 yet" is not a number question, because a B1 certificate is
          awarded for things you can do. These are the CEFR descriptors, stated as
          what the level means and never as a claim about the learner: vocabulary
          coverage measures words met, and the copy stops exactly where the
          evidence does. */}
      {edge && edgeStat && (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
            <span className="text-xs font-semibold">{edge} means being able to…</span>
            <span className="text-2xs text-dim font-mono ml-auto">
              {edgeStat.known} / {edgeStat.count} words
            </span>
          </div>
          <ul className="space-y-0.5 mb-2">
            {CAN_DO[edge].map((c) => (
              <li key={c} className="text-xs text-dim leading-relaxed flex gap-1.5">
                <span aria-hidden className="text-amber flex-shrink-0">·</span>{c}
              </li>
            ))}
          </ul>
          <p className="text-2xs text-dim">
            {coverageNote(Math.round(edgeKr * 100))}. Lexi measures words met — the rest is practice.
          </p>
          {/* A level as somewhere you can finish, not just a filter setting. */}
          {onStudy && edgeStat.count > edgeStat.known && (
            <button onClick={() => { focusUpTo(edgeIdx); onStudy({ kind: 'all', name: `All ${edge}` }); }}
              className="mt-2 inline-flex items-center gap-1 text-2xs text-amber hover:underline">
              Work through {edge} <ChevronRight size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
