// Heute — the daily briefing ("markets open"). One tap assembles today's
// session from what's due (FSRS) plus fresh cards from your weakest sectors,
// to a streak-safe minimum. Shows streak, level progress, grammar drills, and
// blind spots. The market (children) mounts below it on the merged home.
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Flame, GraduationCap, Cog, ChevronDown, TrendingDown, BookOpen, Zap, Target as TargetIcon } from 'lucide-react';
import { buildBriefing, totals, streak, placementLevel, gymDue, missTotal, onboarded, longestStreak, lastGapDays, backlogPeak, noteBacklog, goalProgress } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt } from '../lib/ui.ts';
import LevelProgress from '../components/LevelProgress.tsx';
import BlindSpotList from '../components/BlindSpotList.tsx';
import InstallNudge from '../components/InstallNudge.tsx';
import { blindSpotDrills } from '../session.ts';
import { BY_ID } from '../data/index.ts';
import { MODES, type Mode } from './Fundamentals.tsx';
import type { Target, Word } from '../types.ts';

export default function Today({ onStart, onPlacement, onGuidedStart, onDrill, onBlindDrill, onDecks, onBackup }:
  { onStart: (t: Target) => void; onPlacement: () => void; onGuidedStart: () => void;
    onDrill: (m: Mode | 'grammar') => void; onBlindDrill: (tag?: string) => void; onDecks: () => void;
    onBackup: () => void }) {
  const v = useStore();
  const briefing = useMemo(() => buildBriefing(), [v]);
  const drillsDue = useMemo(() => gymDue(), [v]);
  const blind = useMemo(() => missTotal(30), [v]);
  const blindDrills = useMemo(() => {
    const ws = briefing.ids.map((id) => BY_ID.get(id)).filter((w): w is Word => !!w);
    return blindSpotDrills(ws).length;
  }, [briefing, v]);
  const [drillsOpen, setDrillsOpen] = useState(false);
  const [blindOpen, setBlindOpen] = useState(false);
  const t = totals();
  const placed = placementLevel();
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const total = briefing.ids.length;
  const firstRun = !onboarded() && !placed && t.learned === 0;

  // Backlog burn-down: remember the mountain's peak so clearing it reads as
  // finite progress. Recorded as an effect (it writes storage).
  useEffect(() => { noteBacklog(briefing.dueTotal); }, [briefing.dueTotal]);
  const peak = backlogPeak();

  // Comeback: a real gap with real history behind it. The streak zeroed — the
  // record didn't. Say so before anything else does.
  const gap = lastGapDays();
  const best = longestStreak();
  const comeback = gap !== null && gap >= 7 && best >= 7;

  const greeting = (
    <div className="mb-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[1.375rem] sm:text-[1.625rem] font-bold leading-none">{comeback ? 'Willkommen zurück' : 'Guten Tag'}</h1>
          <p className="text-dim text-[0.8125rem] mt-1.5 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-1.5 text-amber font-mono font-bold text-[0.9375rem]">
          <Flame size={16} /> {streak()} <span className="text-dim font-sans font-normal text-[0.8125rem]">day streak</span>
        </div>
      </div>
      {comeback && (
        <p className="text-amber text-[0.8125rem] mt-2">
          {gap} days away — nothing lost. Your best streak ({best} days) still stands; today starts the next one.
        </p>
      )}
    </div>
  );

  // First-run: one guided hero that chains placement → first session → recap.
  // Nothing else (no market, no drills) competes for attention.
  if (firstRun) {
    return (
      <div className="max-w-[920px] mx-auto">
        {greeting}
        <button onClick={onGuidedStart}
          className="w-full text-left bg-panel border rounded-[16px] px-5 py-6 sm:py-8 hover:brightness-105 transition-colors"
          style={{ borderColor: 'rgba(56,205,232,0.4)' }}>
          <div className="flex items-center gap-1.5 text-amber text-[0.6875rem] uppercase tracking-[2px] font-semibold mb-2"><GraduationCap size={14} /> Start here · 2 minutes</div>
          <h2 className="text-[1.25rem] sm:text-[1.375rem] font-bold mb-1.5">Find your level, then learn your first words</h2>
          <p className="text-dim text-[0.9375rem] mb-4 max-w-[52ch]">A 2-minute placement, then a short session. Every word you learn comes back tomorrow — that’s the whole system.</p>
          <span className="inline-flex items-center gap-1.5 bg-amber text-bg font-bold rounded-[10px] px-4 py-2.5 text-[0.8125rem]"><Play size={13} /> Start</span>
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
          style={{ borderColor: 'rgba(56,205,232,0.4)' }}>
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber flex-shrink-0"><GraduationCap size={18} /></span>
          <span className="flex-1">
            <span className="block text-[0.9375rem] font-semibold">New here? Take the 2-minute placement test</span>
            <span className="block text-[0.8125rem] text-dim">Find your level and skip the words you already know.</span>
          </span>
          <Play size={14} className="text-amber flex-shrink-0" />
        </button>
      )}

      <LevelProgress />

      {/* The goal line — one pace sentence for learners with a date. */}
      {(() => {
        const gp = goalProgress();
        if (!gp) return null;
        const when = new Date(gp.goal.date + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
        const onTrack = gp.projectedPct !== null && gp.projectedPct >= 90;
        return (
          <div className="flex items-center gap-2.5 bg-panel border border-line rounded-[16px] px-4 py-3 mb-4">
            <TargetIcon size={16} className={onTrack ? 'text-green flex-shrink-0' : 'text-amber flex-shrink-0'} />
            <p className="text-[0.8125rem] text-dim">
              <span className="text-txt font-semibold">{gp.goal.level} by {when}</span>
              {' · '}{gp.pct}% known
              {gp.projectedPct !== null && (
                <> · at your pace: <span className={onTrack ? 'text-green font-semibold' : 'text-txt font-semibold'}>~{gp.projectedPct}%</span> by then</>
              )}
              {gp.projectedPct === null && ' · pace appears after a day or two of study'}
            </p>
          </div>
        );
      })()}

      {/* The session card — one clear call to action. The Known/Due/Coverage
          stats live in the KPI strip below the heatmap, so they're not repeated
          here; the number + a one-line breakdown carry the whole signal. */}
      <div className="bg-panel border border-line rounded-[16px] px-4 sm:px-6 py-5 sm:py-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="live-dot" />
          <span className="text-[0.6875rem] text-amber uppercase tracking-[2px] font-semibold">Today's session</span>
        </div>

        {total === 0 ? (
          <div>
            <h2 className="text-[1.25rem] font-bold mb-1">All clear</h2>
            <p className="text-dim text-[0.9375rem] mb-4">Nothing due and the new-card budget is used up. Come back tomorrow, or open a deck to push ahead.</p>
            <button onClick={onDecks} className="bg-panel2 border border-line rounded-[10px] px-5 py-2.5 hover:border-amber font-semibold text-[0.875rem]">Open decks</button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-end gap-3">
                <span className="font-mono font-bold text-[2.75rem] sm:text-[3.5rem] leading-none tabular-nums">{total}</span>
                <span className="text-dim text-[0.9375rem] mb-1.5">cards queued</span>
              </div>
              <p className="text-dim text-[0.8125rem] mt-2.5">
                {briefing.due} due · {briefing.fresh} new
                {briefing.weakSectors.length > 0 && ` · from ${briefing.weakSectors.slice(0, 2).join(', ')}${briefing.weakSectors.length > 2 ? '…' : ''}`}
              </p>
              {briefing.dueTotal > briefing.due && (
                // Post-gap honesty: the backlog exists, but today is bounded —
                // and clearing it is progress through something finite.
                <div className="mt-1">
                  <p className="text-dim text-[0.8125rem]">
                    {fmt(briefing.dueTotal)} reviews waiting in total — today serves the oldest {briefing.due}. The rest keep.
                  </p>
                  {peak > briefing.dueTotal && (
                    <div className="mt-1.5 max-w-[280px]">
                      <div className="h-1 bg-panel2 rounded-full overflow-hidden">
                        <div className="h-full bg-green rounded-full transition-[width] duration-500"
                          style={{ width: `${Math.round(((peak - briefing.dueTotal) / peak) * 100)}%` }} />
                      </div>
                      <p className="text-[0.6875rem] text-dim mt-1 font-mono">{fmt(peak - briefing.dueTotal)} of {fmt(peak)} backlog cleared</p>
                    </div>
                  )}
                </div>
              )}
              {blindDrills > 0 && (
                <p className="text-red text-[0.8125rem] mt-1">+ {blindDrills} drill{blindDrills === 1 ? '' : 's'} targeting your blind spots</p>
              )}
            </div>
            <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto sm:flex-shrink-0">
              <motion.button whileTap={{ scale: 0.98 }}
                onClick={() => onStart({ kind: 'custom', name: "Today's session", ids: briefing.ids })}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-amber text-bg font-bold rounded-[10px] px-6 py-3 text-[0.9375rem] hover:brightness-105">
                <Play size={16} /> Start session
              </motion.button>
              {/* The session that fits four real minutes. Same queue, first five;
                  grades persist immediately, so the rest simply remains. */}
              {total > 5 && (
                <button onClick={() => onStart({ kind: 'custom', name: 'Quick 5', ids: briefing.ids.slice(0, 5) })}
                  className="flex items-center justify-center gap-1.5 w-full sm:w-auto text-[0.8125rem] text-dim border border-line rounded-[10px] px-4 py-2 hover:border-amber hover:text-amber transition-colors">
                  <Zap size={13} /> Quick 5
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Local-first means device-bound: nudge install (durable storage +
          offline) until installed or dismissed. */}
      <InstallNudge onBackup={onBackup} />

      {/* Blind spots — your recurring misses. Expands in place (like Grammar
          Fundamentals below) to the ranked list, so you target weaknesses without
          leaving Today. */}
      {blind > 0 && (
        <div className="mb-4">
          <button onClick={() => setBlindOpen((o) => !o)} aria-expanded={blindOpen}
            className="w-full flex items-center gap-3 bg-panel border border-line rounded-[16px] px-4 py-3 text-left hover:border-red transition-colors">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-red flex-shrink-0"><TrendingDown size={18} /></span>
            <span className="flex-1 text-[0.9375rem] font-semibold">Blind spots</span>
            <span className="text-[0.6875rem] font-mono text-red border border-line rounded-full px-2 py-0.5 tabular-nums">{fmt(blind)}</span>
            <ChevronDown size={16} className={`text-dim flex-shrink-0 transition-transform ${blindOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {blindOpen && (
              <motion.div key="blind" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
                <div className="pt-2.5"><BlindSpotList onDrill={onBlindDrill} /></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Grammar drills — their own SRS track. Expands in place to the modes so
          the daily loop covers grammar without a page jump. */}
      <div className="mb-4">
        <button onClick={() => setDrillsOpen((o) => !o)} aria-expanded={drillsOpen}
          className="w-full flex items-center gap-3 bg-panel border border-line rounded-[16px] px-4 py-3 text-left hover:border-amber transition-colors">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber flex-shrink-0"><Cog size={18} /></span>
          <span className="flex-1 text-[0.9375rem] font-semibold">Grammar Fundamentals</span>
          {drillsDue > 0 && <span className="text-[0.6875rem] font-mono text-amber border border-line rounded-full px-2 py-0.5 tabular-nums">{fmt(drillsDue)} due</span>}
          <ChevronDown size={16} className={`text-dim flex-shrink-0 transition-transform ${drillsOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {drillsOpen && (
            <motion.div key="drills" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
              <div className="grid grid-cols-2 gap-2.5 pt-2.5">
                {MODES.map(({ m, label, icon: Icon }) => (
                  <button key={m} onClick={() => onDrill(m)}
                    className="flex items-center gap-2.5 bg-panel border border-line rounded-[12px] px-3 py-3 text-left hover:border-amber transition-colors">
                    <span className="grid place-items-center w-8 h-8 rounded-lg bg-panel2 text-amber flex-shrink-0"><Icon size={16} /></span>
                    <span className="text-[0.875rem] font-semibold">{label}</span>
                  </button>
                ))}
                <button onClick={() => onDrill('grammar')}
                  className="col-span-2 flex items-center gap-2.5 bg-panel border border-line rounded-[12px] px-3 py-3 text-left hover:border-amber transition-colors">
                  <span className="grid place-items-center w-8 h-8 rounded-lg bg-panel2 text-amber flex-shrink-0"><BookOpen size={16} /></span>
                  <span className="text-[0.875rem] font-semibold">Grammar exercises</span>
                  <span className="text-[0.6875rem] text-dim ml-auto hidden sm:inline">A1–C2 · 571 exercises</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

