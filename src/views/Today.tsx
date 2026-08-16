// Heute — the daily briefing ("markets open"). One tap assembles today’s
// session from what’s due (FSRS) plus fresh cards from your weakest sectors,
// to a streak-safe minimum. Shows streak, level progress, grammar drills, and
// blind spots. The market (children) mounts below it on the merged home.
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Flame, GraduationCap, Cog, ChevronDown, ChevronRight, Zap, Target as TargetIcon, Check, BookOpenText, Gauge } from 'lucide-react';
import { buildBriefing, totals, streak, placementLevel, gymDue, onboarded, longestStreak, lastGapDays, backlogPeak, noteBacklog, goalProgress, pointStats, reviewedToday, reminderTime, visitCount, lastSeen, markTodaySeen } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt } from '../lib/ui.ts';
import { loadGrammar, type GPoint } from '../lib/grammar.ts';
import PathCard from '../components/PathCard.tsx';
import CountUp from '../components/CountUp.tsx';
import InstallNudge from '../components/InstallNudge.tsx';
import BackupNudge from '../components/BackupNudge.tsx';
import Card from '../components/ui/Card.tsx';
import Button, { buttonClass } from '../components/ui/Button.tsx';
import Chip from '../components/ui/Chip.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import { blindSpotDrills, estimateMinutes, wordsForMinutes, itemsForMinutes } from '../session.ts';
import ReadingList from '../components/ReadingList.tsx';
import ClassListPicker from '../components/ClassListPicker.tsx';
import SessionWhy from '../components/SessionWhy.tsx';
import BrainHero from '../components/Brain/BrainHero.tsx';
import { BY_ID, WORDS } from '../data/index.ts';
import type { CEFR, Target, Word } from '../types.ts';

/** The short-session budgets offered beside the full one. A commute, a queue, a
 *  gap between classes — the three shapes a real day actually has. */
const SHORT_MINUTES = [3, 5, 10];

export default function Today({ onStart, onExam, onPlacement, onGuidedStart, onBlindDrill, onDecks, onBackup, onGrammar, onProgress, onBrain, onRead }:
  { onStart: (t: Target) => void; onExam: () => void; onPlacement: () => void; onGuidedStart: () => void;
    onBlindDrill: (tag?: string) => void; onDecks: () => void;
    onBackup: () => void; onGrammar: () => void; onProgress: () => void; onBrain: () => void;
    onRead: () => void }) {
  const v = useStore();
  const briefing = useMemo(() => buildBriefing(), [v]);
  const drillsDue = useMemo(() => gymDue(), [v]);
  const blindDrills = useMemo(() => {
    const ws = briefing.ids.map((id) => BY_ID.get(id)).filter((w): w is Word => !!w);
    return blindSpotDrills(ws).length;
  }, [briefing, v]);
  const [drillsOpen, setDrillsOpen] = useState(false);
  const [readOpen, setReadOpen] = useState(false);
  const t = totals();
  const placed = placementLevel();
  // Read once, on mount, *before* the effect below overwrites it — otherwise the
  // headline animates from the value it is already showing, which is nothing.
  const seenToday = useRef(lastSeen()?.today).current;
  // Record after the first paint, so the count-up has something to travel from
  // on this visit and nothing to replay on the next one.
  useEffect(() => { markTodaySeen(t.known); }, [t.known]);
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const total = briefing.ids.length;
  const firstRun = !onboarded() && !placed && t.learned === 0;
  // Week one. The guided chain ends at a recap and drops the learner onto a screen
  // with eight sections on it — a goal line, a backlog burn-down, blind spots, a
  // reading list, a grammar syllabus — none of which mean anything until there is
  // some history to read them against. For the first week the surface is the one
  // thing that matters: today's session. Everything else keeps working; it just
  // isn't shouted at someone who has been here three days.
  const week1 = !firstRun && visitCount() <= 7 && t.known < 40;

  // Backlog burn-down: remember the mountain’s peak so clearing it reads as
  // finite progress. Recorded as an effect (it writes storage).
  useEffect(() => { noteBacklog(briefing.dueTotal); }, [briefing.dueTotal]);
  const peak = backlogPeak();

  // Comeback: a real gap with real history behind it. The streak zeroed — the
  // record didn’t. Say so before anything else does.
  const gap = lastGapDays();
  const best = longestStreak();
  const comeback = gap !== null && gap >= 7 && best >= 7;

  const greeting = (
    <div className="mb-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-none">{comeback ? 'Willkommen zurück' : 'Guten Tag'}</h1>
          <p className="text-dim text-xs mt-1.5 capitalize">{today}</p>
        </div>
        {/* Known is the app's currency, so it belongs in the identity line even
            on the surface whose hero number is the size of today's task. It
            links to the place that explains it rather than restating it here. */}
        <button onClick={onProgress}
          className="tap-44 flex items-baseline gap-2 text-left rounded-md px-2 py-1 -mx-2 hover:bg-panel2 transition-colors">
          {/* The data-change rule (DESIGN.md §7), on the number it was written
              for. Known is the app's currency and it moves for exactly one
              reason — the learner studied — so returning to Today after a
              session should show it *arriving* rather than already sitting
              there. `from` is undefined on a first visit, which renders it flat:
              counting up from zero would be a small lie about what just
              happened. */}
          <span className="font-mono font-bold text-green text-xl tabular-nums">
            <CountUp value={t.known} from={seenToday} />
          </span>
          {/* "known" for a year, and it was never true.
              This number counts flip cards in FSRS Review, and a flip shows the
              German and asks what it means — so it has only ever measured
              *recognition*. Saying "known" claimed the other half too, for free.
              The word costs nothing to fix and the number is the app's whole
              claim about itself, so it says what it measures. */}
          <span className="text-dim text-xs">recognised</span>
          {/* The productive half, and only once there is one. A learner who has
              never done a recall drill is not shown "· 0 recalled" — a zero
              beside the headline reads as a deficiency rather than as a track
              they haven't started, and the number arrives on its own the first
              time they finish one. */}
          {t.recalled > 0 && (
            <span className="text-dim text-xs">
              · <span className="font-mono font-bold text-amber tabular-nums">{t.recalled}</span> recalled
            </span>
          )}
          <span className="flex items-center gap-1 text-amber font-mono font-bold text-base ml-1">
            <Flame size={15} /> {streak()}
          </span>
        </button>
      </div>
      {comeback && (
        <p className="text-amber text-xs mt-2">
          {gap} days away — nothing lost. Your best streak ({best} days) still stands; today starts the next one.
        </p>
      )}
    </div>
  );

  // First-run: one guided hero that chains a ten-card session → recap →
  // placement. Nothing else (no market, no drills) competes for attention.
  if (firstRun) {
    return (
      <div className="w-full max-w-[920px] mx-auto">
        {greeting}
        <Card as="button" accent onClick={onGuidedStart} pad="none"
          className="w-full text-left px-5 py-6 sm:py-8 hover:brightness-105 transition-[filter]">
          {/* The promise the app can now keep. This used to say "Start here ·
              2 minutes / Find your level, then learn your first words", because
              the placement test came first — two minutes of being tested by an
              app the learner had not yet seen work. The session is first now, so
              the hero says what actually happens next. */}
          <Kicker tone="accent" className="flex items-center gap-1.5 mb-2"><GraduationCap size={14} /> Start here · 1 minute</Kicker>
          <h2 className="text-xl sm:text-2xl font-bold mb-1.5 mt-2">Learn your first ten German words</h2>
          <p className="text-dim text-base mb-4 max-w-[52ch]">Ten cards, right now. Every word you learn comes back tomorrow — that’s the whole system. We’ll find your level afterwards.</p>
          <span className={buttonClass('primary', 'sm')}><Play size={13} /> Start</span>
          {/* Said out loud on purpose. The corpus is English-glossed to the last
              card, so a learner whose English is itself a second language pays a
              double-translation tax on every item. Better they know that in the
              first ten seconds than discover it in week three. */}
          <p className="text-dim text-2xs mt-4">German from English — every gloss, rule and example is in English.</p>
        </Card>
        {/* Someone arriving from a shared link has been told nothing about what
            this is. The hero says what to *do*; these two lines say what it *is*
            and where the data lives — the two questions a classmate actually asks
            before they type anything into a stranger's app. */}
        <p className="text-dim text-xs mt-3 max-w-[52ch] leading-relaxed">
          Lexi is a free, open-source German trainer — {fmt(WORDS.length)} cards from A1 to C2 with
          spaced repetition and grammar drills built in.
          <span className="block mt-1">
            No account, no sign-in. Your progress is stored on this device only and never leaves it.
          </span>
        </p>
      </div>
    );
  }

  return (
    // Wider on large desktops so the daily briefing doesn’t sit in a narrow
    // column with a field of empty terminal either side of it.
    <div className="w-full max-w-[920px] xl:max-w-[1040px] mx-auto">
      {/* Above the greeting on purpose. Today's other cards all answer "what do
          I do now?"; this one answers "what have I built?", and it is the only
          thing on the screen that rewards yesterday rather than demanding
          today. */}
      <BrainHero onOpen={onBrain} />

      {greeting}

      {/* Streak at risk. Only once there’s a streak worth protecting and the
          day is genuinely unstudied — a banner that fires when you’ve already
          done your reviews is just noise, and one that fires on day one is a
          threat before there’s anything to lose. */}
      {streak() > 0 && !reviewedToday() && total > 0 && (
        <Card accent pad="none" className="flex items-center gap-3 px-4 py-3 mb-4">
          <Flame size={18} className="text-amber flex-shrink-0" />
          <p className="text-xs text-dim flex-1">
            <span className="text-txt font-semibold">{streak()}-day streak, nothing reviewed yet today.</span>
            {reminderTime() ? ` Your study time is ${reminderTime()}.` : ' Quick 5 keeps it alive.'}
          </p>
        </Card>
      )}

      {/* Placement nudge for learners who haven’t calibrated yet.
          This is now the ordinary path rather than the exception: the first run
          leads with a session and offers the test from the recap, so anyone who
          declined it lands here. The copy follows — "New here?" was written for
          someone who had done nothing, and by the time they read this they have
          finished a session. */}
      {!placed && (
        <Card as="button" accent pad="none" onClick={onPlacement}
          className="w-full flex items-center gap-3 px-4 py-3 mb-4 text-left hover:brightness-110 transition-[filter]">
          <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-amber flex-shrink-0"><GraduationCap size={18} /></span>
          <span className="flex-1">
            <span className="block text-base font-semibold">
              {t.learned > 0 ? 'Two minutes to find your level' : 'New here? Take the 2-minute placement test'}
            </span>
            <span className="block text-xs text-dim">
              {t.learned > 0
                ? 'Lexi will skip the words you already know and start you where you actually are.'
                : 'Find your level and skip the words you already know.'}
            </span>
          </span>
          <Play size={14} className="text-amber flex-shrink-0" />
        </Card>
      )}

      {!week1 && <PathCard onGrammar={onGrammar} onStudy={onStart} onBlind={onBlindDrill} />}

      {/* The goal line — one pace sentence for learners with a date. */}
      {!week1 && (() => {
        const gp = goalProgress();
        if (!gp) return null;
        const when = new Date(gp.goal.date + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
        const onTrack = gp.projectedPct !== null && gp.projectedPct >= 90;
        return (
          // Two lines, not one 13px run of dim grey (BACKLOG #23). This is the
          // only sentence on Today that says what the learner is *for* — a date
          // they chose and whether they will make it — and it was set at the same
          // size and colour as a caption, between two cards that both shout.
          // Measured before: one `text-xs` paragraph, 13px, `--color-dim`, in a
          // 56px card. The claim rides its own line at the size of a heading; the
          // pace stays a supporting line, because it is the *commitment* that
          // motivates and the projection that qualifies it.
          //
          // Deliberately still a small card and still one card: promoting it into
          // a hero would put it in competition with "cards queued", which is the
          // thing you are meant to act on. Hierarchy, not volume.
          <Card pad="none" className="flex items-center gap-3 px-4 py-3.5 mb-4">
            <TargetIcon size={18} className={onTrack ? 'text-green flex-shrink-0' : 'text-amber flex-shrink-0'} />
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight">{gp.goal.level} by {when}</p>
              <p className="text-xs text-dim mt-1">
                {gp.pct}% recognised
                {gp.projectedPct !== null && (
                  <> · at your pace <span className={onTrack ? 'text-green font-semibold' : 'text-txt font-semibold'}>~{gp.projectedPct}%</span> by then</>
                )}
                {gp.projectedPct === null && ' · pace appears after a day or two of study'}
              </p>
            </div>
          </Card>
        );
      })()}

      {/* The session card — one clear call to action. The Known/Due/Coverage
          stats live in the KPI strip below the heatmap, so they’re not repeated
          here; the number + a one-line breakdown carry the whole signal. */}
      <Card pad="none" className="px-4 sm:px-6 py-5 sm:py-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="live-dot" />
          <Kicker tone="accent">Today’s session</Kicker>
        </div>

        {total === 0 ? (
          <div className="flex items-start gap-3.5">
            {/* Done-for-today is an achievement state, not an empty one. */}
            <span className="grid place-items-center w-11 h-11 rounded-full flex-shrink-0 mt-0.5" style={{ background: 'var(--color-green-d)' }}><Check size={20} className="text-green" /></span>
            <div>
              <h2 className="text-xl font-bold mb-1 cursor-blink">All clear</h2>
              <p className="text-dim text-base mb-1.5">Every review served, the new-card budget spent. The system holds until tomorrow.</p>
              <Kicker className="block mb-4">streak safe · next reviews tomorrow</Kicker>
              <Button variant="secondary" onClick={onDecks}>Open decks</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-end gap-3">
                <span className="font-mono font-bold text-5xl sm:text-6xl leading-none tabular-nums">{total}</span>
                <span className="text-dim text-base mb-1.5">cards queued</span>
              </div>
              <p className="text-dim text-xs mt-2.5">
                {briefing.due} due · {briefing.fresh} new
                {briefing.weakSectors.length > 0 && ` · from ${briefing.weakSectors.slice(0, 2).join(', ')}${briefing.weakSectors.length > 2 ? '…' : ''}`}
              </p>
              {briefing.dueTotal > briefing.due && (
                // Post-gap honesty: the backlog exists, but today is bounded —
                // and clearing it is progress through something finite.
                <div className="mt-1">
                  <p className="text-dim text-xs">
                    {fmt(briefing.dueTotal)} reviews waiting in total — today serves the oldest {briefing.due}. The rest keep.
                  </p>
                  {peak > briefing.dueTotal && (
                    <div className="mt-1.5 max-w-[280px]">
                      <div className="h-1 bg-panel2 rounded-full overflow-hidden">
                        <div className="h-full bg-green rounded-full transition-[width] duration-500"
                          style={{ width: `${Math.round(((peak - briefing.dueTotal) / peak) * 100)}%` }} />
                      </div>
                      <p className="text-2xs text-dim mt-1 font-mono">{fmt(peak - briefing.dueTotal)} of {fmt(peak)} backlog cleared</p>
                    </div>
                  )}
                </div>
              )}
              {blindDrills > 0 && (
                <p className="text-amber text-xs mt-1">+ {blindDrills} drill{blindDrills === 1 ? '' : 's'} targeting your blind spots</p>
              )}
              {/* The scheduler's reasoning, before the decision to start rather
                  than three cards into it. See components/SessionWhy.tsx. */}
              <SessionWhy ids={briefing.ids} />
            </div>
            <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto sm:flex-shrink-0">
              <Button size="lg" block className="sm:w-auto"
                onClick={() => onStart({ kind: 'custom', name: 'Today’s session', ids: briefing.ids })}>
                <Play size={16} /> Start session
                <span className="font-mono text-2xs font-normal opacity-80">≈{estimateMinutes(total)} min</span>
              </Button>
              {/* "Quick 5" was the right idea in the wrong unit — nobody has five
                  cards spare, they have four minutes. Same queue, trimmed to a time
                  budget; grades persist immediately, so the rest simply remains.
                  Only offers budgets that would actually shorten today's session.

                  `cap` is what makes the number on the chip true. Slicing the ids
                  bounds the flips and nothing else: the builder then weaves drills,
                  blind spots, linked points and a remedy on top, so the button that
                  promised three minutes used to serve rather more. */}
              {SHORT_MINUTES.some((m) => wordsForMinutes(m) < total) && (
                <div className="flex items-center gap-1.5 sm:justify-end flex-wrap">
                  <Kicker className="mr-0.5"><Zap size={11} className="inline -mt-0.5" /> Got less time?</Kicker>
                  {SHORT_MINUTES.filter((m) => wordsForMinutes(m) < total).map((m) => (
                    <button key={m}
                      onClick={() => onStart({
                        kind: 'custom', name: `${m}-minute session`,
                        ids: briefing.ids.slice(0, wordsForMinutes(m)),
                        cap: itemsForMinutes(m),
                      })}
                      className="tap-44 inline-flex items-center font-mono text-2xs text-dim border border-line rounded-sm px-2 py-1
                        hover:border-amber hover:text-amber transition-colors">
                      {m} min
                    </button>
                  ))}
                </div>
              )}
              {/* The same material with the scaffolding removed. Offered only once
                  there is something to be tested on — an exam on day two measures
                  nothing. Hidden in week one for the same reason. */}
              {!week1 && t.known >= 40 && (
                <button onClick={onExam}
                  className="font-mono text-2xs text-dim border border-line rounded-sm px-2 py-1
                    hover:border-amber hover:text-amber transition-colors self-start sm:self-end">
                  Exam conditions
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Local-first means device-bound: nudge install (durable storage +
          offline) until installed or dismissed. */}
      <InstallNudge onBackup={onBackup} />
      <BackupNudge onBackup={onBackup} />

      {/* Blind spots used to live here behind an accordion. They've moved to
          Progress: Today is for doing, and auditing your own weaknesses is a
          different mood from starting a session. The session still rehearses
          them either way — that's the "+ N drills" line above. */}

      {/* The learner's own course, if they have given us one. */}
      <div className="mb-4"><ClassListPicker onStudy={onStart} /></div>

      {/* Lesen — the input half. Everything else on this screen asks the learner
          a question; this is the one thing that just gives them German to read.
          The sentence scan runs only when this opens, so Home stays cheap. */}
      <div className="mb-4">
        <Card as="button" pad="none" onClick={() => setReadOpen((o) => !o)} aria-expanded={readOpen}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:border-amber transition-colors">
          <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-amber flex-shrink-0"><BookOpenText size={18} /></span>
          <span className="flex-1">
            <span className="block text-base font-semibold">Lesen</span>
            <span className="block text-xs text-dim">Sentences you can almost read</span>
          </span>
          <ChevronDown size={16} className={`text-dim flex-shrink-0 transition-transform ${readOpen ? 'rotate-180' : ''}`} />
        </Card>
        <AnimatePresence initial={false}>
          {readOpen && (
            <motion.div key="read" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
              <div className="pt-2.5 flex flex-col gap-2.5">
                <ReadingList onStudy={onStart} />
                {/* The other half of Lesen: sentences Lexi picked, and now a text
                    the learner brings. Same section on purpose — one reading
                    place, not two. */}
                <Card as="button" tone="sunken" pad="none" onClick={onRead}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:border-amber transition-colors">
                  <span className="grid place-items-center w-9 h-9 rounded-md bg-panel text-blue flex-shrink-0"><Gauge size={18} /></span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">Can I read this?</span>
                    <span className="block text-xs text-dim">Paste a text — see what you’d understand</span>
                  </span>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grammar — the concepts at your level, not a menu of exercise types.
          The bank is fetched only when this opens, so Home stays cheap. */}
      <div className="mb-4">
        <Card as="button" pad="none" onClick={() => setDrillsOpen((o) => !o)} aria-expanded={drillsOpen}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:border-amber transition-colors">
          <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-amber flex-shrink-0"><Cog size={18} /></span>
          <span className="flex-1 text-base font-semibold">Grammar</span>
          {drillsDue > 0 && <Chip>{fmt(drillsDue)} due</Chip>}
          <ChevronDown size={16} className={`text-dim flex-shrink-0 transition-transform ${drillsOpen ? 'rotate-180' : ''}`} />
        </Card>
        <AnimatePresence initial={false}>
          {drillsOpen && (
            <motion.div key="drills" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
              <div className="pt-2.5"><LevelGrammar level={placed ?? 'A1'} onOpen={onGrammar} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** The learner’s own level, as concepts with English summaries — the short
 *  version of the Grammar syllabus, so the daily loop can reach a rule without
 *  a page jump. Loads the bank lazily (only when the accordion opens). */
function LevelGrammar({ level, onOpen }: { level: CEFR; onOpen: () => void }) {
  useStore();
  const [bank, setBank] = useState<GPoint[] | null>(null);
  useEffect(() => { loadGrammar().then((g) => setBank(g[level] ?? [])); }, [level]);
  if (!bank) return <p className="text-2xs text-dim font-mono px-1 py-2">Loading…</p>;

  const rows = bank.map((p, pi) => ({ p, pi, s: pointStats(level, p.title, p.exercises.length) }));
  // Unstarted first, then whatever has reviews waiting: "what should I look at
  // next" rather than an alphabetical index.
  const next = [...rows].sort((a, b) =>
    Number(a.s.started) - Number(b.s.started) || b.s.due - a.s.due).slice(0, 4);
  const started = rows.filter((r) => r.s.started).length;

  return (
    <div className="space-y-1.5">
      {next.map(({ p, pi, s }) => (
        <Card key={p.title + pi} nested pad="none" className="flex items-center gap-3 px-3.5 py-2.5">
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold truncate">{p.title}</span>
            <span className="block text-xs text-dim truncate">{p.summary}</span>
          </span>
          <span className="text-2xs font-mono text-dim tabular-nums flex-shrink-0">
            {s.started ? `${s.known}/${s.count}` : 'new'}
          </span>
        </Card>
      ))}
      <Button variant="quiet" size="sm" block onClick={onOpen}>
        All {bank.length} {level} concepts · {started} started <ChevronRight size={13} />
      </Button>
    </div>
  );
}

