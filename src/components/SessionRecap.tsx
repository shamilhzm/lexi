// One recap for every session path (flip player + gym drills). The single
// structured prop is RecapData: every field optional except `streak`, so a
// flip-only or drill-only session omits what it didn't produce and only the
// present tiles render. Phases 3 (copy) and 5 (streak/milestone/mining) extend
// this by populating already-declared fields — never by changing the shape.
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check, Flame, Trophy } from 'lucide-react';
import CountUp from './CountUp.tsx';

export interface RecapData {
  reviewed?: number;       // flip cards graded
  recall?: number;         // % Good+ over reviewed; undefined if reviewed === 0
  newLearned?: number;     // cards that entered `learning` this session
  drills?: number;         // grammar/gym items answered
  drillsCorrect?: number;  // correct drills; % shown against `drills`
  streak: number;          // always present
  minedCount?: number;     // Phase 5.5
  milestone?: string;      // Phase 5.3
}

interface Tile { label: string; num: number; suffix?: string; tone: string }

export default function SessionRecap({ data, title = 'Session complete', children }:
  { data: RecapData; title?: string; children?: ReactNode }) {
  const tiles: Tile[] = [];
  if (data.reviewed !== undefined) tiles.push({ label: 'Reviewed', num: data.reviewed, tone: 'text-txt' });
  if (data.recall !== undefined) tiles.push({ label: 'Recall', num: data.recall, suffix: '%', tone: data.recall >= 80 ? 'text-green' : 'text-amber' });
  if (data.newLearned !== undefined) tiles.push({ label: 'New learned', num: data.newLearned, tone: 'text-amber' });
  if (data.drills !== undefined) tiles.push({ label: 'Drilled', num: data.drills, tone: 'text-txt' });
  if (data.drills !== undefined && data.drillsCorrect !== undefined)
    tiles.push({ label: 'Correct', num: data.drills ? Math.round((data.drillsCorrect / data.drills) * 100) : 0, suffix: '%', tone: 'text-green' });
  const cols = Math.min(tiles.length, 4) || 1;

  return (
    <div className="text-center bg-panel border border-line rounded-md px-8 sm:px-10 py-12 max-w-md w-full">
      <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        className="grid place-items-center w-14 h-14 rounded-full mx-auto mb-4" style={{ background: 'var(--color-green-d)' }}><Check className="text-green" /></motion.div>
      <h2 className="text-2xl font-bold mb-1 cursor-blink">{title}</h2>
      <p className="text-dim mb-5 flex items-center justify-center gap-1.5">
        streak secured
        <motion.span initial={{ scale: 0.5, rotate: -14 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 13 }} className="inline-flex">
          <Flame size={14} className="text-amber" />
        </motion.span>
        <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 480, damping: 16, delay: 0.05 }}
          className="font-mono font-bold text-amber tabular-nums">{data.streak}</motion.span>
      </p>
      {data.milestone && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex items-center justify-center gap-1.5 mb-5 text-amber">
          <Trophy size={15} /> <span className="font-semibold text-xs">New milestone · {data.milestone}</span>
        </motion.div>
      )}
      {tiles.length > 0 && (
        <div className="grid divide-x divide-[var(--color-line)] border border-line rounded-md mb-6"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {tiles.map((s, k) => (
            <motion.div key={s.label} className="px-2 py-3"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 480, damping: 30, delay: 0.1 + k * 0.06 }}>
              <div className="text-2xs text-dim font-mono uppercase tracking-widest">{s.label}</div>
              {/* Count-up: feedback density, honors reduced motion via CountUp. */}
              <div className={`font-mono font-bold text-xl mt-0.5 tabular-nums ${s.tone}`}><CountUp value={s.num} from={0} suffix={s.suffix ?? ''} /></div>
            </motion.div>
          ))}
        </div>
      )}
      {data.minedCount !== undefined && data.minedCount > 0 && (
        <p className="text-xs text-dim mb-5">{data.minedCount} of today’s words came from your own texts.</p>
      )}
      {children}
    </div>
  );
}
