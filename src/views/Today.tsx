// Heute — the daily briefing ("markets open"). One tap assembles today's
// session from what's due (FSRS) plus fresh cards from your weakest sectors,
// to a streak-safe minimum. Shows streak, level progress, grammar drills, and
// blind spots. The market (children) mounts below it on the merged home.
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Flame, GraduationCap, Cog, ChevronDown, TrendingDown, BookOpen } from 'lucide-react';
import { buildBriefing, totals, streak, placementLevel, gymDue, missTotal, onboarded } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt } from '../lib/ui.ts';
import LevelProgress from '../components/LevelProgress.tsx';
import BlindSpotList from '../components/BlindSpotList.tsx';
import { blindSpotDrills } from '../session.ts';
import { BY_ID } from '../data/index.ts';
import { MODES, type Mode } from './Fundamentals.tsx';
import type { Target, Word } from '../types.ts';

export default function Today({ onStart, onPlacement, onGuidedStart, onDrill, onBlindDrill, children }:
  { onStart: (t: Target) => void; onPlacement: () => void; onGuidedStart: () => void;
    onDrill: (m: Mode | 'grammar') => void; onBlindDrill: (tag?: string) => void; children?: React.ReactNode }) {
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
  // Nothing else (no market, no drills) competes for attention.
  if (firstRun) {
    return (
      <div className="max-w-[920px] mx-auto">
        {greeting}
        <button onClick={onGuidedStart}
          className="w-full text-left bg-panel border rounded-[16px] px-5 py-6 sm:py-8 hover:brightness-105 transition-colors"
          style={{ borderColor: 'rgba(56,205,232,0.4)' }}>
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
          style={{ borderColor: 'rgba(56,205,232,0.4)' }}>
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber flex-shrink-0"><GraduationCap size={18} /></span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold">New here? Take the 2-minute placement test</span>
            <span className="block text-[13px] text-dim">Find your level and skip the words you already know.</span>
          </span>
          <Play size={14} className="text-amber flex-shrink-0" />
        </button>
      )}

      <LevelProgress />

      {/* The session card — one clear call to action. The Known/Due/Coverage
          stats live in the KPI strip below the heatmap, so they're not repeated
          here; the number + a one-line breakdown carry the whole signal. */}
      <div className="bg-panel border border-line rounded-[16px] px-4 sm:px-6 py-5 sm:py-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="live-dot" />
          <span className="text-[11px] text-amber uppercase tracking-[2px] font-semibold">Today's session</span>
        </div>

        {total === 0 ? (
          <div>
            <h2 className="text-[20px] font-bold mb-1">All clear</h2>
            <p className="text-dim text-[15px]">Nothing due and the new-card budget is used up. Come back tomorrow, or open a deck to push ahead.</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-end gap-3">
                <span className="font-mono font-bold text-[44px] sm:text-[56px] leading-none tabular-nums">{total}</span>
                <span className="text-dim text-[15px] mb-1.5">cards queued</span>
              </div>
              <p className="text-dim text-[13px] mt-2.5">
                {briefing.due} due · {briefing.fresh} new
                {briefing.weakSectors.length > 0 && ` · from ${briefing.weakSectors.slice(0, 2).join(', ')}${briefing.weakSectors.length > 2 ? '…' : ''}`}
              </p>
              {blindDrills > 0 && (
                <p className="text-red text-[13px] mt-1">+ {blindDrills} drill{blindDrills === 1 ? '' : 's'} targeting your blind spots</p>
              )}
            </div>
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={() => onStart({ kind: 'custom', name: "Today's session", ids: briefing.ids })}
              className="flex items-center justify-center gap-2 w-full sm:w-auto sm:flex-shrink-0 bg-amber text-bg font-bold rounded-[10px] px-6 py-3 text-[15px] hover:brightness-105">
              <Play size={16} /> Start session
            </motion.button>
          </div>
        )}
      </div>

      {/* Blind spots — your recurring misses. Expands in place (like Grammar
          Fundamentals below) to the ranked list, so you target weaknesses without
          leaving Today. */}
      {blind > 0 && (
        <div className="mb-4">
          <button onClick={() => setBlindOpen((o) => !o)} aria-expanded={blindOpen}
            className="w-full flex items-center gap-3 bg-panel border border-line rounded-[16px] px-4 py-3 text-left hover:border-red transition-colors">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-red flex-shrink-0"><TrendingDown size={18} /></span>
            <span className="flex-1 text-[15px] font-semibold">Blind spots</span>
            <span className="text-[11px] font-mono text-red border border-line rounded-full px-2 py-0.5 tabular-nums">{fmt(blind)}</span>
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
          <span className="flex-1 text-[15px] font-semibold">Grammar Fundamentals</span>
          {drillsDue > 0 && <span className="text-[11px] font-mono text-amber border border-line rounded-full px-2 py-0.5 tabular-nums">{fmt(drillsDue)} due</span>}
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
                    <span className="text-[14px] font-semibold">{label}</span>
                  </button>
                ))}
                <button onClick={() => onDrill('grammar')}
                  className="col-span-2 flex items-center gap-2.5 bg-panel border border-line rounded-[12px] px-3 py-3 text-left hover:border-amber transition-colors">
                  <span className="grid place-items-center w-8 h-8 rounded-lg bg-panel2 text-amber flex-shrink-0"><BookOpen size={16} /></span>
                  <span className="text-[14px] font-semibold">Grammar exercises</span>
                  <span className="text-[11px] text-dim ml-auto hidden sm:inline">A1–C2 · 444 exercises</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The market (Word Exchange) mounts here on the merged home. */}
      {children}
    </div>
  );
}

