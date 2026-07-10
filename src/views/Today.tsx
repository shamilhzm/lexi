// Heute — the daily briefing ("markets open"). One tap assembles today's
// session from what's due (FSRS) plus fresh cards from your weakest sectors,
// to a streak-safe minimum. Shows streak and level progress.
import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Play, Flame, GraduationCap, Cog } from 'lucide-react';
import { buildBriefing, totals, streak, placementLevel, gymDue, onboarded } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt } from '../lib/ui.ts';
import LevelProgress from '../components/LevelProgress.tsx';
import type { Target } from '../types.ts';

export default function Today({ onStart, onPlacement, onGuidedStart, onGym }:
  { onStart: (t: Target) => void; onPlacement: () => void; onGuidedStart: () => void; onGym: () => void }) {
  const v = useStore();
  const briefing = useMemo(() => buildBriefing(), [v]);
  const drillsDue = useMemo(() => gymDue(), [v]);
  const t = totals();
  const placed = placementLevel();
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const total = briefing.ids.length;
  const firstRun = !onboarded() && !placed && t.learned === 0;

  const greeting = (
    <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
      <div>
        <h1 className="text-[22px] sm:text-[26px] font-bold leading-none">Guten Tag</h1>
        <p className="text-dim text-[13px] mt-1.5 capitalize">{today}</p>
      </div>
      <div className="flex items-center gap-1.5 text-amber font-mono font-bold text-[15px]">
        <Flame size={16} /> {streak()} <span className="text-dim font-sans font-normal text-[13px]">day streak</span>
      </div>
    </div>
  );

  // First-run: one guided hero that chains placement → first session → recap.
  if (firstRun) {
    return (
      <div className="max-w-[920px] mx-auto">
        {greeting}
        <button onClick={onGuidedStart}
          className="w-full text-left bg-panel border rounded-[16px] px-5 py-6 sm:py-8 hover:brightness-105 transition-colors"
          style={{ borderColor: 'rgba(255,176,0,0.4)' }}>
          <div className="flex items-center gap-1.5 text-amber text-[11px] uppercase tracking-[2px] font-semibold mb-2"><GraduationCap size={14} /> Start here · 2 minutes</div>
          <h2 className="text-[20px] sm:text-[22px] font-bold mb-1.5">Find your level, then learn your first words</h2>
          <p className="text-dim text-[15px] mb-4 max-w-[52ch]">A 2-minute placement, then a short session. Every word you learn comes back tomorrow — that’s the whole system.</p>
          <span className="inline-flex items-center gap-1.5 bg-amber text-bg font-bold rounded-[10px] px-4 py-2.5 text-[13px]"><Play size={13} /> Start</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[920px] mx-auto">
      {greeting}

      {/* Placement nudge for learners who haven't calibrated yet */}
      {!placed && (
        <button onClick={onPlacement}
          className="w-full flex items-center gap-3 bg-panel border border-amber/40 rounded-[16px] px-4 py-3 mb-4 text-left hover:border-amber transition-colors"
          style={{ borderColor: 'rgba(255,176,0,0.4)' }}>
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber flex-shrink-0"><GraduationCap size={18} /></span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold">New here? Take the 2-minute placement test</span>
            <span className="block text-[13px] text-dim">Find your level and skip the words you already know.</span>
          </span>
          <Play size={14} className="text-amber flex-shrink-0" />
        </button>
      )}

      <LevelProgress />

      {/* The session card */}
      <div className="bg-panel border border-line rounded-[16px] overflow-hidden mb-4">
        <div className="px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot" />
            <span className="text-[11px] text-amber uppercase tracking-[2px] font-semibold">Today's session</span>
          </div>

          {total === 0 ? (
            <div className="py-4">
              <h2 className="text-[20px] font-bold mb-1">All clear</h2>
              <p className="text-dim text-[15px]">Nothing due and the new-card budget is used up. Come back tomorrow, or open a deck to push ahead.</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-3 mb-4">
                <span className="font-mono font-bold text-[44px] sm:text-[56px] leading-none tabular-nums">{total}</span>
                <span className="text-dim text-[15px] mb-1.5">cards queued</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Pill label={`${briefing.due} due review${briefing.due === 1 ? '' : 's'}`} tone="green" />
                <Pill label={`${briefing.fresh} new`} tone="amber" />
                {briefing.weakSectors.length > 0 && <Pill label={`from ${briefing.weakSectors.slice(0, 3).join(', ')}${briefing.weakSectors.length > 3 ? '…' : ''}`} tone="dim" />}
              </div>
              {briefing.fresh > 0 && (
                <p className="text-dim text-[13px] mb-5">
                  <span className="text-txt font-semibold">{briefing.fresh}</span> {briefing.fresh === 1 ? 'word' : 'words'} in today’s session {briefing.fresh === 1 ? 'is' : 'are'} new.
                </p>
              )}
              <motion.button whileTap={{ scale: 0.98 }}
                onClick={() => onStart({ kind: 'custom', name: "Today's session", ids: briefing.ids })}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-amber text-bg font-bold rounded-[10px] px-6 py-3 text-[15px] hover:brightness-105">
                <Play size={16} /> Start session
              </motion.button>
            </>
          )}
        </div>
        <div className="grid grid-cols-3 border-t border-line divide-x divide-[var(--color-line)]">
          <Mini label="Known" value={fmt(t.known)} tone="text-green" />
          <Mini label="Due today" value={fmt(t.due)} tone="text-amber" />
          <Mini label="Coverage" value={`${Math.round(t.coverage * 100)}%`} tone="text-dim" />
        </div>
      </div>

      {/* Gym drills are on their own SRS track — surface them here so the daily loop covers both */}
      {drillsDue > 0 && (
        <button onClick={onGym}
          className="w-full flex items-center gap-3 bg-panel border border-line rounded-[16px] px-4 py-3 mb-4 text-left hover:border-amber transition-colors">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber flex-shrink-0"><Cog size={18} /></span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold">{briefingDrillLabel(drillsDue)}</span>
            <span className="block text-[13px] text-dim">Gender, plurals, conjugation & grammar — due on their own schedule.</span>
          </span>
          <Play size={14} className="text-amber flex-shrink-0" />
        </button>
      )}

    </div>
  );
}

function briefingDrillLabel(n: number) {
  return `${n} Gym drill${n === 1 ? '' : 's'} due today`;
}

function Pill({ label, tone }: { label: string; tone: 'green' | 'amber' | 'dim' }) {
  const c = tone === 'green' ? 'text-green border-[var(--color-green-d)]' : tone === 'amber' ? 'text-amber border-line' : 'text-dim border-line';
  return <span className={`text-[11px] border rounded-full px-2.5 py-1 ${c}`}>{label}</span>;
}
function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-[11px] text-dim uppercase tracking-[1px]">{label}</div>
      <div className={`font-mono font-bold text-[20px] mt-0.5 tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}
