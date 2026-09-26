// One recap for every session path (flip player + gym drills). The single
// structured prop is RecapData: every field optional except `streak`, so a
// flip-only or drill-only session omits what it didn’t produce and only the
// present tiles render. Phases 3 (copy) and 5 (streak/milestone/mining) extend
// this by populating already-declared fields — never by changing the shape.
import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Bell, CalendarClock, Check, Flame, TrendingDown, Trophy } from 'lucide-react';
import { dueForecast, reminderTime, setReminderTime, studiedToday } from '../store.ts';
// A cycle (session → drills → this file → session), and a harmless one: the
// constant is only read inside a render, long after every module has evaluated.
import { SESSION_CEILING } from '../session.ts';
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
  drills?: number;         // word-fact drill items answered
  drillsCorrect?: number;  // correct drills; % shown against `drills`
  streak: number;          // always present
  minedCount?: number;     // Phase 5.5
  milestone?: string;      // Phase 5.3
  weakest?: string;        // the tag missed most in this session
  /** What the scheduler actually did, counted from each item's `reason`.
   *  A recap that only reports a score describes the learner; this describes
   *  the machine working on their behalf, which is the thing they can't see. */
  composition?: { blindspot: number; overdue: number };
}

interface Tile { label: string; num: number; suffix?: string; tone: string }

export default function SessionRecap({ data, title = 'Session complete', children }:
  { data: RecapData; title?: string; children?: ReactNode }) {
  const tiles: Tile[] = [];
  if (data.reviewed !== undefined) tiles.push({ label: 'Reviewed', num: data.reviewed, tone: 'text-txt' });
  if (data.recall !== undefined) tiles.push({ label: 'Recall', num: data.recall, suffix: '%', tone: data.recall >= 80 ? 'text-green' : 'text-accent' });
  if (data.newLearned !== undefined) tiles.push({ label: 'New learned', num: data.newLearned, tone: 'text-accent' });
  if (data.drills !== undefined) tiles.push({ label: 'Drilled', num: data.drills, tone: 'text-txt' });
  if (data.drills !== undefined && data.drillsCorrect !== undefined)
    tiles.push({ label: 'Correct', num: data.drills ? Math.round((data.drillsCorrect / data.drills) * 100) : 0, suffix: '%', tone: 'text-green' });
  const cols = Math.min(tiles.length, 4) || 1;

  return (
    <Card pad="none" className="text-center px-8 sm:px-10 py-12 max-w-md w-full">
      <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        className="grid place-items-center w-[56px] h-[56px] rounded-full mx-auto mb-4" style={{ background: 'var(--color-green-d)' }}><Check className="text-green" /></motion.div>
      <h2 className="text-2xl font-bold mb-1 cursor-blink">{title}</h2>
      {/* **A fact, not a rescue.** *2026-09-25, from the panel review.* This read
          "streak secured" beside a flame that sprang into place — copy that only
          makes sense if the streak was in danger, which is the loss framing VISION
          refuses (streak-shaming) wearing a celebration. The streak now counts days
          with a grade or a save, and the line says that plainly and holds still. */}
      {/* Only when today really counted — a session skipped end to end graded
          nothing, and saying "studied today" over it would be the flattery the
          streak change exists to remove. */}
      {studiedToday() && <p className="text-dim mb-5 flex items-center justify-center gap-1.5">
        <Flame size={14} className="text-accent" aria-hidden />
        <span>
          Studied today · <span className="font-mono font-bold text-accent tabular-nums">{data.streak}</span>
          {data.streak === 1 ? ' day' : ' days'} running
        </span>
      </p>}
      {data.milestone && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex items-center justify-center gap-1.5 mb-5 text-accent">
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
      <Composition c={data.composition} />
      <Tomorrow weakest={data.weakest} />
      {children}
    </Card>
  );
}

/** What the scheduler did, in the learner's words.
 *
 *  Nothing is invented here: every clause is a count of items that carried that
 *  `reason` through the session. Silent when the session was plain reviews,
 *  which is most days — the line has to mean something when it appears. */
function Composition({ c }: { c?: RecapData['composition'] }) {
  if (!c) return null;
  const parts: string[] = [];
  if (c.blindspot) parts.push(`${c.blindspot} rehearsed a weak spot`);
  if (c.overdue) parts.push(`${c.overdue} had been waiting over a week`);
  if (parts.length === 0) return null;

  return (
    <p className="text-xs text-dim mb-5 leading-relaxed">
      <span className="text-txt font-semibold">What Lexi picked for you:</span>{' '}
      {parts.join(' · ')}.
    </p>
  );
}

/** The recap used to end the loop cold — a score, and nothing about coming
 *  back. This is the cheapest retention surface in the app: say what tomorrow
 *  holds, name the one thing to watch, and offer the anchor while the learner
 *  is still feeling good about the session they just finished. */
function Tomorrow({ weakest }: { weakest?: string }) {
  useStore();
  const [asked, setAsked] = useState(false);
  // **What is waiting when I come back**, which is not the same question as *what is
  // scheduled for tomorrow's date*.
  //
  // This read `dueForecast(2)[1]` — tomorrow's bucket alone. `dueForecast` buckets by
  // `floor((due − todayStart) / 86_400_000)`, so a card given a ten-minute interval is
  // due later *today* and lands in `[0]`. A first session of twenty cards graded *Got
  // it* therefore ended on **"Nothing is due tomorrow"** with twenty cards owed inside
  // the hour — on the one screen whose whole job is to bring the learner back.
  //
  // Anything still owed from today is still owed tomorrow, so the honest count is
  // today's bucket plus tomorrow's.
  //
  // **And it says what tomorrow will actually serve.** *2026-09-25.* `dueForecast` now
  // counts only cards a session can reach (no retired grammar rows, nothing outside
  // the level filter), and past `SESSION_CEILING` the line names the bounded day
  // first: a learner back from a month away was told "400 cards waiting tomorrow"
  // one screen after the return notice promised the day was bounded.
  const forecast = dueForecast(2);
  const back = (forecast[0] ?? 0) + (forecast[1] ?? 0);
  const time = reminderTime();

  return (
    <div className="border-t border-line pt-4 mb-5 text-left space-y-2">
      <p className="text-xs text-dim flex items-start gap-2">
        <CalendarClock size={14} className="text-accent flex-shrink-0 mt-0.5" />
        <span>
          {back > SESSION_CEILING
            ? <><span className="text-txt font-semibold">Tomorrow serves {SESSION_CEILING}.</span> {back} are waiting in all — the rest keep, and come in the days after.</>
            : back > 0
            ? <><span className="text-txt font-semibold">{back} card{back === 1 ? '' : 's'} waiting tomorrow.</span> That’s the system working — showing up is the whole trick.</>
            : <>Nothing is waiting tomorrow. Come back anyway and Lexi will start something new.</>}
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
          className="flex items-center gap-1.5 text-xs text-accent hover:underline">
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
