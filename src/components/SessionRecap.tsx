// One recap for every session path (flip player + gym drills). The single
// structured prop is RecapData: every field optional except `streak`, so a
// flip-only or drill-only session omits what it didn’t produce and only the
// present tiles render. Phases 3 (copy) and 5 (streak/milestone/mining) extend
// this by populating already-declared fields — never by changing the shape.
import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Bell, CalendarClock, Check, Flame, TrendingDown, Trophy } from 'lucide-react';
import { dueForecast, reminderTime, setReminderTime } from '../store.ts';
import { useStore } from '../useStore.ts';
import CountUp from './CountUp.tsx';
import Card from './ui/Card.tsx';
import Kicker from './ui/Kicker.tsx';

/** The evening slot most people can actually keep. Offered, never imposed —
 *  the profile picker owns the real choice. */
const DEFAULT_TIME = '19:00';

export interface RecapData {
  reviewed?: number;       // flip cards graded
  recall?: number;         // % Good+ over reviewed; undefined if reviewed === 0
  newLearned?: number;     // cards that entered `learning` this session
  drills?: number;         // grammar/gym items answered
  drillsCorrect?: number;  // correct drills; % shown against `drills`
  streak: number;          // always present
  minedCount?: number;     // Phase 5.5
  milestone?: string;      // Phase 5.3
  weakest?: string;        // the tag missed most in this session
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
    <Card pad="none" className="text-center px-8 sm:px-10 py-12 max-w-md w-full">
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
              <Kicker className="block">{s.label}</Kicker>
              {/* Count-up: feedback density, honors reduced motion via CountUp. */}
              <div className={`font-mono font-bold text-xl mt-0.5 tabular-nums ${s.tone}`}><CountUp value={s.num} from={0} suffix={s.suffix ?? ''} /></div>
            </motion.div>
          ))}
        </div>
      )}
      {data.minedCount !== undefined && data.minedCount > 0 && (
        <p className="text-xs text-dim mb-5">{data.minedCount} of today’s words came from your own texts.</p>
      )}
      <Tomorrow weakest={data.weakest} />
      {children}
    </Card>
  );
}

/** The recap used to end the loop cold — a score, and nothing about coming
 *  back. This is the cheapest retention surface in the app: say what tomorrow
 *  holds, name the one thing to watch, and offer the anchor while the learner
 *  is still feeling good about the session they just finished. */
function Tomorrow({ weakest }: { weakest?: string }) {
  useStore();
  const [asked, setAsked] = useState(false);
  const back = dueForecast(2)[1] ?? 0;
  const time = reminderTime();

  return (
    <div className="border-t border-line pt-4 mb-5 text-left space-y-2">
      <p className="text-xs text-dim flex items-start gap-2">
        <CalendarClock size={14} className="text-amber flex-shrink-0 mt-0.5" />
        <span>
          {back > 0
            ? <><span className="text-txt font-semibold">{back} card{back === 1 ? '' : 's'} come back tomorrow.</span> That’s the system working — showing up is the whole trick.</>
            : <>Nothing is due tomorrow. Come back anyway and Lexi will start something new.</>}
        </span>
      </p>

      {weakest && (
        <p className="text-xs text-dim flex items-start gap-2">
          <TrendingDown size={14} className="text-red flex-shrink-0 mt-0.5" />
          <span>Worth a look: <span className="text-txt font-semibold">{weakest}</span> tripped you up most this session.</span>
        </p>
      )}

      {/* Only offered to learners who haven’t set an anchor yet. */}
      {!time && !asked && (
        <button onClick={() => { setReminderTime(DEFAULT_TIME); setAsked(true); }}
          className="flex items-center gap-1.5 text-xs text-amber hover:underline">
          <Bell size={13} /> Remind me daily at {DEFAULT_TIME}
        </button>
      )}
      {!time && asked && (
        <p className="text-xs text-green flex items-center gap-1.5">
          <Check size={13} /> Set for {DEFAULT_TIME} — change it or add a calendar event in your profile.
        </p>
      )}
    </div>
  );
}
