// Heute — the daily briefing ("markets open"). One tap assembles today's
// session from what's due (FSRS) plus fresh cards from your weakest sectors,
// to a streak-safe minimum. Shows streak and an optional exam countdown that
// back-plans a daily target.
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Play, Flame, CalendarClock, TrendingDown, Check, X, GraduationCap, Cog } from 'lucide-react';
import { buildBriefing, weakestSectors, totals, streak, examDate, setExamDate, daysToExam, placementLevel, gymDue } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt, heat } from '../lib/ui.ts';
import LevelProgress from '../components/LevelProgress.tsx';
import type { Target } from '../types.ts';

export default function Today({ onStart, onStudySector, onPlacement, onGym }:
  { onStart: (t: Target) => void; onStudySector: (name: string) => void; onPlacement: () => void; onGym: () => void }) {
  const v = useStore();
  const briefing = useMemo(() => buildBriefing(), [v]);
  const weak = useMemo(() => weakestSectors(5), [v]);
  const drillsDue = useMemo(() => gymDue(), [v]);
  const t = totals();
  const placed = placementLevel();
  const dleft = daysToExam();
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const total = briefing.ids.length;
  // exam back-plan: spread remaining unlearned in-scope cards over the days left.
  const remaining = t.count - t.learned;
  const dailyTarget = dleft && dleft > 0 ? Math.ceil(remaining / dleft) : null;

  return (
    <div className="max-w-[920px] mx-auto">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold leading-none">Guten Tag 👋</h1>
          <p className="text-dim text-[13px] mt-1.5 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-1.5 text-amber font-mono font-bold text-[15px]">
          <Flame size={16} /> {streak()} <span className="text-dim font-sans font-normal text-[12px]">day streak</span>
        </div>
      </div>

      {/* Placement nudge for learners who haven't calibrated yet */}
      {!placed && (
        <button onClick={onPlacement}
          className="w-full flex items-center gap-3 bg-panel border border-amber/40 rounded-[12px] px-4 py-3 mb-4 text-left hover:border-amber transition-colors"
          style={{ borderColor: 'rgba(255,176,0,0.4)' }}>
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber flex-shrink-0"><GraduationCap size={18} /></span>
          <span className="flex-1">
            <span className="block text-[14px] font-semibold">New here? Take the 2-minute placement test</span>
            <span className="block text-[12px] text-dim">Find your level and skip the words you already know.</span>
          </span>
          <Play size={14} className="text-amber flex-shrink-0" />
        </button>
      )}

      <LevelProgress />

      {/* The session card */}
      <div className="bg-panel border border-line rounded-[12px] overflow-hidden mb-4">
        <div className="px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot" />
            <span className="text-[11px] text-amber uppercase tracking-[2px] font-semibold">Markets open · today's session</span>
          </div>

          {total === 0 ? (
            <div className="py-4">
              <h2 className="text-[20px] font-bold mb-1">All clear 🎉</h2>
              <p className="text-dim text-[14px]">Nothing due and the new-card budget is used up. Come back tomorrow, or open a deck to push ahead.</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-3 mb-4">
                <span className="font-mono font-bold text-[44px] sm:text-[56px] leading-none tabular-nums">{total}</span>
                <span className="text-dim text-[14px] mb-1.5">cards queued</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                <Pill label={`${briefing.due} due review${briefing.due === 1 ? '' : 's'}`} tone="green" />
                <Pill label={`${briefing.fresh} new`} tone="amber" />
                {briefing.weakSectors.length > 0 && <Pill label={`from ${briefing.weakSectors.slice(0, 3).join(', ')}${briefing.weakSectors.length > 3 ? '…' : ''}`} tone="dim" />}
              </div>
              <motion.button whileTap={{ scale: 0.98 }}
                onClick={() => onStart({ kind: 'custom', name: "Today's session", ids: briefing.ids })}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-amber text-bg font-bold rounded-[10px] px-6 py-3 text-[15px] hover:brightness-105">
                <Play size={16} /> Start session
              </motion.button>
            </>
          )}
        </div>
        <div className="grid grid-cols-3 border-t border-line divide-x divide-[var(--color-line)]">
          <Mini label="Due today" value={fmt(t.due)} tone="text-green" />
          <Mini label="Learned" value={fmt(t.learned)} tone="text-amber" />
          <Mini label="Coverage" value={`${Math.round(t.coverage * 100)}%`} tone="text-green" />
        </div>
      </div>

      {/* Gym drills are on their own SRS track — surface them here so the daily loop covers both */}
      {drillsDue > 0 && (
        <button onClick={onGym}
          className="w-full flex items-center gap-3 bg-panel border border-line rounded-[12px] px-4 py-3 mb-4 text-left hover:border-amber transition-colors">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber flex-shrink-0"><Cog size={18} /></span>
          <span className="flex-1">
            <span className="block text-[14px] font-semibold">{briefingDrillLabel(drillsDue)}</span>
            <span className="block text-[12px] text-dim">Gender, plurals, conjugation & grammar — due on their own schedule.</span>
          </span>
          <Play size={14} className="text-amber flex-shrink-0" />
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ExamCard dleft={dleft} dailyTarget={dailyTarget} current={examDate()} />

        {/* Weakest sectors */}
        <div className="bg-panel border border-line rounded-[12px]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
            <TrendingDown size={15} className="text-red" />
            <h2 className="text-[14px] font-semibold">Weakest sectors</h2>
          </div>
          <div className="p-2">
            {weak.length === 0 && <p className="text-dim text-[13px] p-3">No weak spots — great coverage.</p>}
            {weak.map((s) => (
              <button key={s.name} onClick={() => onStudySector(s.name)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-panel2 text-left transition-colors">
                <span className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: heat(s.coverage) }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] truncate">{s.name}</span>
                  <span className="block text-[11px] text-dim font-mono">{Math.round(s.coverage * 100)}% · {s.due} due · {s.newCount} new</span>
                </span>
                <Play size={13} className="text-dim flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamCard({ dleft, dailyTarget, current }:
  { dleft: number | null; dailyTarget: number | null; current: string | null }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(current ?? '');
  return (
    <div className="bg-panel border border-line rounded-[12px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <CalendarClock size={15} className="text-amber" />
        <h2 className="text-[14px] font-semibold">Exam countdown</h2>
        {current && !editing && (
          <button onClick={() => { setVal(current); setEditing(true); }} className="ml-auto text-[11px] text-dim hover:text-amber">edit</button>
        )}
      </div>
      <div className="p-4">
        {!current && !editing && (
          <button onClick={() => setEditing(true)} className="text-[13px] text-dim hover:text-amber">
            + Set your Goethe / telc / TestDaF date to back-plan your workload
          </button>
        )}
        {current && !editing && dleft !== null && (
          <div>
            {dleft >= 0 ? (
              <>
                <div className="flex items-end gap-2">
                  <span className="font-mono font-bold text-[40px] leading-none text-amber tabular-nums">{dleft}</span>
                  <span className="text-dim text-[13px] mb-1">days to go</span>
                </div>
                <p className="text-[12.5px] text-dim mt-2">
                  Target date {new Date(current + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  {dailyTarget !== null && <> To finish the lexicon in time: <span className="text-txt font-semibold">~{dailyTarget} new/day</span> plus your due reviews.</>}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-dim">That date has passed. <button onClick={() => setEditing(true)} className="text-amber">Set a new one</button>.</p>
            )}
          </div>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <input type="date" value={val} onChange={(e) => setVal(e.target.value)}
              className="bg-panel2 border border-line rounded-md px-2.5 py-1.5 text-[13px] text-txt outline-none focus:border-amber" />
            <button onClick={() => { setExamDate(val || null); setEditing(false); }}
              className="grid place-items-center w-8 h-8 rounded-md bg-amber text-bg" title="Save"><Check size={15} /></button>
            {current && <button onClick={() => { setExamDate(null); setEditing(false); }}
              className="grid place-items-center w-8 h-8 rounded-md bg-panel2 border border-line text-red" title="Clear"><X size={15} /></button>}
          </div>
        )}
      </div>
    </div>
  );
}

function briefingDrillLabel(n: number) {
  return `${n} Gym drill${n === 1 ? '' : 's'} due today`;
}

function Pill({ label, tone }: { label: string; tone: 'green' | 'amber' | 'dim' }) {
  const c = tone === 'green' ? 'text-green border-[var(--color-green-d)]' : tone === 'amber' ? 'text-amber border-line' : 'text-dim border-line';
  return <span className={`text-[11.5px] border rounded-full px-2.5 py-1 ${c}`}>{label}</span>;
}
function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-[10px] text-dim uppercase tracking-[1px]">{label}</div>
      <div className={`font-mono font-bold text-[18px] mt-0.5 tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}
