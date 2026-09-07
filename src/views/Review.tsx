// The session player — the desk.
//
// FSRS flip cards (swipe right = knew it, swipe left = didn’t know) interleaved
// with the word-fact drills for the same words: the gender, the plural, the
// German you have to *produce*, the spelling you have to hear. One surface, one
// grade scale, one queue.
//
// The 2026-09-05 refocus took the grammar half out of here — the authored
// exercise renderer, the rule panels, the seven rule drills and the "exam
// conditions" mode that existed to strip the scaffolding off a certificate
// paper. What is left is a vocabulary player, which is what this app is.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useReducedMotion, animate } from 'motion/react';
import { Volume2, VolumeX, ArrowLeft, Check, X, RotateCcw, SkipForward, Flag, Share2, ClipboardList } from 'lucide-react';
import { shareProgress } from '../lib/sharecard.ts';
import { review, restoreCard, cardOf, levels, statusOf, streak, logMiss, logAttempt, checkMilestones, checkCompletions, flagCard, isFlagged, sound, setSound, hdVoice, hdOffered, placementLevel, totals, type MissDetail, lastGapDays, longestStreak, buildBriefing, visitCount} from '../store.ts';
import { haptic, tick, fmt} from '../lib/ui.ts';
import { buildMixedSession, loadSession, saveSession, SESSION_CEILING} from '../session.ts';
import { loadDetail, detailLoaded } from '../data/detail.ts';
// `Grade` is taken in this file — it is the FSRS rating type from srs.ts. The
// drill callback type is aliased rather than renamed at its definition, where
// `Grade` is the honest name.
import { GenderItem, PluralItem, RecallItem, MODE_TAG, type Grade as DrillGrade } from './drills.tsx';
import { useStore } from '../useStore.ts';
import { useMedia } from '../lib/useMedia.ts';
// `Card` here is the UI surface; the FSRS card type is aliased so the two
// can coexist in this file.
import { Rating, emptyCard, previewInterval, type Grade, type Card as SrsCard } from '../srs.ts';
import { speak, onSystemVoice } from '../lib/tts.ts';
import { sayExample, hasHumanAudio, stopAudio } from '../lib/audio.ts';
import { familyOf } from '../lib/family.ts';
import { valencyOf, valencyLabel } from '../lib/valency.ts';
import { WORDS } from '../data/index.ts';
import VoiceOffer from '../components/VoiceOffer.tsx';
import { Illustration } from '../lib/illustration.tsx';
import SessionRecap, { type RecapData } from '../components/SessionRecap.tsx';
import InstallNudge from '../components/InstallNudge.tsx';
import BackupNudge from '../components/BackupNudge.tsx';
import WhyThisCard from '../components/WhyThisCard.tsx';
import { SpeakButton, RevealBlock, ExampleList, TermList, FalseFriendNote, GenderTerm, CardSource } from '../components/Reveal.tsx';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Chip from '../components/ui/Chip.tsx';
import IconButton from '../components/ui/IconButton.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import { ALL_LEVELS } from '../types.ts';
import type { Target, Word, CEFR } from '../types.ts';

const DRILL_TAG: Record<string, string> = { gender: 'Gender', plural: 'Plural', recall: 'Recall' };
const SWIPE_PX = 90; // horizontal travel that commits a grade

/** The grade scale.
 *
 *  FSRS takes four ratings and Lexi only ever sent two — `Rating.Hard` and
 *  `Rating.Easy` appeared nowhere outside the tests. That throws away exactly the
 *  signal the scheduler exists to act on: the difference between recalling
 *  something after a struggle and recalling it instantly. Two ratings make every
 *  success identical, so intervals grow at one rate for a word you nearly lost and
 *  a word you will never forget.
 *
 *  `firstSight` is the label for a card the learner has never met, and its absence
 *  is meaningful: a first-sight card is an introduction, not a test, so there was
 *  no retrieval to rate on a difficulty scale and only those two grades are shown.
 *  The button count follows whether recall actually happened. */
const SCALE: { rating: Grade; label: string; firstSight?: string; hover: string }[] = [
  { rating: Rating.Again, label: 'Didn’t know', firstSight: 'Still learning', hover: 'hover:border-red hover:text-red' },
  { rating: Rating.Hard, label: 'Hard', hover: 'hover:border-accent hover:text-accent' },
  { rating: Rating.Good, label: 'Knew it', firstSight: 'Got it', hover: 'hover:border-green hover:text-green' },
  { rating: Rating.Easy, label: 'Easy', hover: 'hover:border-green hover:text-green' },
];

/** Does this learner get the monolingual layer? A German definition is the right
 *  thing to show from B2 up and the wrong thing below it, so the gate is the
 *  learner's own level rather than the card's — it is a fact about who is reading.
 *  Exported so the rule is testable on its own; the JSX only consumes it. */
export function showsGermanDefs(placed: CEFR | null): boolean {
  return !!placed && ALL_LEVELS.indexOf(placed) >= ALL_LEVELS.indexOf('B2');
}

export default function Review({ target, onDone, onPick, onProfile, onPlacement, firstRun = false }:
  { target: Target;
    /** Leave the guided chain — the recap's "Got it". */
    onDone: () => void;
    /** Into the lexicon: another deck, or a word to look up. */
    onPick: () => void;
    /** Backup, reminders, settings — offered from the recap's nudges. */
    onProfile: () => void;
    /** Offered from the first-run recap — see DoneState. */
    onPlacement?: () => void; firstRun?: boolean }) {
  useStore(); // re-render when the CEFR filter changes
  const lvKey = [...levels()].sort().join('');
  // A scoped session — a deck, a sector, the words behind a text — was opened
  // from somewhere and has a way back. The day's queue is the app's root and has
  // none.
  const scoped = target.kind !== 'custom' || target.name !== 'Today’s session';
  const germanDefs = showsGermanDefs(placementLevel());
  // An interrupted session is resumed rather than rebuilt: the builder is
  // randomised, so a rebuild is a *different* queue and the learner's place in it
  // is gone. See session.ts.
  // A session cannot be built until the examples have landed. `eligibleModes` reads
  // `word.ex` to decide whether a card can carry a cloze, a sentence-builder or a
  // dictation, and it runs *inside* the synchronous session builder — so a queue
  // assembled before `data/detail.ts` attaches would quietly contain no drills of
  // those three kinds, with nothing to show for it.
  //
  // The first run is exempt, and deliberately: `buildMixedSession(target, true)` is
  // teach-only (session.ts strips every drill), so `eligibleModes` never runs and
  // detail cannot change what the queue contains. That exemption is what lets a cold
  // learner reach a card in seconds instead of waiting on 837 KB.
  const [detailReady, setDetailReady] = useState(() => firstRun || detailLoaded());
  useEffect(() => {
    if (detailReady) return;
    let live = true;
    loadDetail().then(() => { if (live) setDetailReady(true); });
    return () => { live = false; };
  }, [detailReady]);

  const restored = useMemo(() => (firstRun ? null : loadSession(target)), [target, lvKey, firstRun]);
  const queue = useMemo(
    () => (detailReady ? (restored?.items ?? buildMixedSession(target, firstRun)) : []),
    [restored, target, lvKey, firstRun, detailReady]);
  const minedCount = useMemo(() => new Set(queue.filter((it) => it.word.id.startsWith('usr:')).map((it) => it.word.id)).size, [queue]);
  // Counted from the queue's own provenance, so the recap can describe what the
  // scheduler did rather than only how the learner scored.
  const composition = useMemo(() => queue.reduce(
    (acc, it) => {
      if (it.reason.kind === 'blindspot') acc.blindspot++;
      else if ((it.reason.kind === 'due' || it.reason.kind === 'orphan') && it.reason.overdueDays >= 7) acc.overdue++;
      return acc;
    },
    { blindspot: 0, overdue: 0 },
  ), [queue]);
  // Above every early return — this is a hook. `hover: none` means the primary
  // input is touch, which is the honest test for "is there a Space key"; the
  // viewport width is not (a tablet is wide and still has no keyboard).
  const keyboard = useMedia('(hover: hover) and (pointer: fine)');
  // Resume where the session was left off (outstanding-work's saveSession/loadSession).
  const [i, setI] = useState(restored?.position ?? 0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [newLearned, setNewLearned] = useState(0); // cards that left the New state
  // **Retrievals, counted apart from everything else.** `done` mixed three
  // unlike events — a flip you were asked to remember, a flip you were meeting for the
  // first time, and a drill answer — and the recap divided one by the other and called
  // it recall. A first-sight card is an introduction, not a test: `SCALE` already says
  // so and already drops to two buttons for it. These two are the only pair a recall
  // percentage may be computed from.
  const [retrieved, setRetrieved] = useState(0);
  const [retrievedOk, setRetrievedOk] = useState(0);
  // Drills, counted apart from flips. The recap reported one `done` figure for
  // both, so the interleaved drills — the harder half of a session, and the half
  // a learner has to be talked into — were invisible in the only place the app
  // says what the session was. Right/total rather than a bare count, because
  // "9 drills" says nothing about whether they went well.
  const [drills, setDrills] = useState(0);
  const [drillsOk, setDrillsOk] = useState(0);
  // Per-session action log so prev/undo can reverse a grade (restore FSRS state)
  // or a skip, and rewind counters + position exactly.
  const history = useRef<{ i: number; kind: 'grade' | 'skip'; srsId?: string; prevCard?: SrsCard; dAgain?: number; dNew?: number; dDrill?: number; dDrillOk?: number; dRetr?: number; dRetrOk?: number }[]>([]);
  // Which way the outgoing card flies: +1 knew it, -1 didn’t, 0 neutral (skip/
  // prev). Set by every grade path, so swipes, buttons and arrow keys all share
  // one physical vocabulary: right = knew, left = missed.
  const exitDir = useRef(0);

  // Feel layer: the comeback of the day (a word you’d missed ≥2 times before
  // and got right today), and the miss-streak circuit breaker (F3): after 4
  // straight misses, offer a graceful out — once per session, never nagging.
  const [comeback, setComeback] = useState<{ term: string; lapses: number } | null>(null);
  const missRun = useRef(0);
  // Misses tagged in *this* session, so the recap can name the one concept that
  // tripped the learner up most today rather than their 30-day average.
  const sessionMisses = useRef(new Map<string, number>());
  // The words this session actually put in front of the learner, in order. A
  // language-school student's day does not end when the app closes — see PocketList.
  const metWords = useRef<Word[]>([]);
  const noteMet = (w: Word) => {
    if (w.kind === 'word' && !metWords.current.some((x) => x.id === w.id)) metWords.current.push(w);
  };
  const noteMiss = (tag: string, term?: string, detail?: MissDetail) => {
    logMiss(tag, term, detail);
    sessionMisses.current.set(tag, (sessionMisses.current.get(tag) ?? 0) + 1);
  };
  const [breather, setBreather] = useState(false);
  // F4: the engine tells us when it fell back to the built-in voice, so the offer
  // lands on the tap that motivated it rather than in a settings screen nobody
  // opens. Once per learner, ever — hdOffered() outlives the session.
  const [offerVoice, setOfferVoice] = useState(false);
  useEffect(() => {
    if (hdVoice() || hdOffered()) return;
    onSystemVoice(() => setOfferVoice(true));
    return () => onSystemVoice(null);
  }, []);
  const breatherShown = useRef(false);
  // Every answer gets an acknowledgment. Before this, a correct answer produced
  // a colour change and a haptic tick and nothing else — persona P8, at B2 with
  // fading motivation, called it "like a spreadsheet", and round 2 answered that
  // in the *recap*, which is not where the feeling happens.
  //
  // What it says is the interval, not "well done". The scheduler already knows
  // when the card comes back and previews it on the grade buttons; showing the
  // committed value is the same trick as those previews — machinery, not praise —
  // and it is the one acknowledgment that survives being seen sixty times a
  // session without curdling. Drills have no per-card interval, so they get the
  // mark alone.
  const [ack, setAck] = useState<{ n: number; ok: boolean; interval?: string; comeback?: number } | null>(null);
  const ackSeq = useRef(0);
  const noteResult = (ok: boolean, srsIdBefore?: SrsCard, term?: string, interval?: string) => {
    const lapses = srsIdBefore?.lapses ?? 0;
    // A comeback — a word you had missed at least twice and have now got — was
    // computed here and shown only in the recap, minutes later and out of context
    // (#46). It is the one moment in a session that says *you are getting better
    // at this specific word*, and it was firing where nobody was looking. It rides
    // the acknowledgment that already exists for every grade, so it costs no new
    // chrome and inherits the rule that mark is built on: state the machinery, do
    // not praise.
    const isComeback = ok && !!term && lapses >= 2;
    setAck({ n: ++ackSeq.current, ok, interval, comeback: isComeback ? lapses : undefined });
    if (ok) {
      missRun.current = 0;
      tick('good');
      if (term && lapses >= 2) setComeback((c) => (!c || lapses > c.lapses ? { term, lapses } : c));
      return;
    }
    tick('wrong');
    if (++missRun.current >= 4 && !breatherShown.current) {
      breatherShown.current = true;
      setBreather(true);
    }
  };
  // Clear on a timer rather than on an animation end — same rule as the
  // entrances: nothing the learner needs may hang off a frame callback.
  useEffect(() => {
    if (!ack) return;
    // A comeback is a sentence rather than two words, so it gets longer on screen.
    const t = setTimeout(() => setAck((a) => (a && a.n === ack.n ? null : a)), ack.comeback ? 2600 : 1600);
    return () => clearTimeout(t);
  }, [ack?.n]);

  // A clip playing over the next card is worse than no audio, so every advance
  // and every exit silences whatever is in flight.
  useEffect(() => stopAudio, []);

  // restart the session when scope (target) or level filter changes
  useEffect(() => {
    setI(restored?.position ?? 0);
    setDone(0); setNewLearned(0); setRetrieved(0); setRetrievedOk(0); setDrills(0); setDrillsOk(0); setFlipped(false); history.current = [];
    setComeback(null); missRun.current = 0; setBreather(false); breatherShown.current = false;
    sessionMisses.current.clear();
    metWords.current = [];
  }, [target, lvKey, restored]);

  // Remember the place. Writes only while a session is genuinely in progress —
  // saveSession clears the slot at 0 and at the end, so finishing leaves nothing
  // behind to resume into.
  useEffect(() => { saveSession(target, queue, i); }, [target, queue, i]);

  const item = queue[i];
  const flip = useCallback(() => setFlipped((f) => !f), []);

  // Interval preview: show when each grade brings the card back. This is how
  // the scheduler earns trust — machinery, not magic (Anki’s oldest lesson).
  const preview = useMemo(() => {
    if (!item || item.type !== 'flip') return null;
    const c = cardOf(item.srsId) ?? emptyCard();
    // One entry per rating, so every button can state its own consequence rather
    // than only the two extremes being honest about theirs.
    return new Map(SCALE.map((s) => [s.rating, previewInterval(c, s.rating)]));
  }, [item?.srsId]);

  // Record the pre-review FSRS state + the exact counter deltas this grade
  // applied, so prev/undo can reverse it precisely.
  const pushGrade = (dAgain: number, dNew: number, dDrill = 0, dDrillOk = 0, dRetr = 0, dRetrOk = 0) => {
    if (!item) return;
    const snap = cardOf(item.srsId);
    history.current.push({ i, kind: 'grade', srsId: item.srsId, prevCard: snap ? { ...snap } : undefined, dAgain, dNew, dDrill, dDrillOk, dRetr, dRetrOk });
  };

  // Grade a flip card directly — no reveal required. Flipping stays optional
  // (Space) for when you want to check the translation first.
  const grade = useCallback((g: Grade) => {
    if (!item || item.type !== 'flip') return;
    const wasNew = statusOf(item.srsId) === 'new';
    const dAgain = g === Rating.Again ? 1 : 0;
    const dNew = g !== Rating.Again && wasNew ? 1 : 0;
    // Only a card the learner had met before was a retrieval; a first-sight card
    // was shown to them and asking how it "landed" is not a memory test.
    const dRetr = wasNew ? 0 : 1;
    const dRetrOk = !wasNew && g !== Rating.Again ? 1 : 0;
    pushGrade(dAgain, dNew, 0, 0, dRetr, dRetrOk);
    exitDir.current = g === Rating.Again ? -1 : 1;
    // `preview` is computed for this card *before* the grade commits, so it is
    // exactly the interval the learner was shown on the button they pressed.
    // Keyed by rating, so this is honest across all four grades — the two-rating
    // version this replaced could only ever report Again or Good.
    noteResult(g !== Rating.Again, cardOf(item.srsId), item.word.term, preview?.get(g));
    noteMet(item.word);
    review(item.srsId, g);
    haptic(g === Rating.Again ? 'wrong' : 'grade');
    setDone((d) => d + 1);
    setNewLearned((n) => n + dNew);
    setRetrieved((r) => r + dRetr);
    setRetrievedOk((r) => r + dRetrOk);
    setFlipped(false);
    setI((n) => n + 1);
  }, [item, i]);

  const gradeDrill = useCallback<DrillGrade>((ok, detail) => {
    if (!item || item.type === 'flip') return;
    const dAgain = ok ? 0 : 1;
    pushGrade(dAgain, 0, 1, ok ? 1 : 0);
    exitDir.current = ok ? 1 : -1;
    noteResult(ok);
    noteMet(item.word);
    review(item.srsId, ok ? Rating.Good : Rating.Again);
    haptic(ok ? 'grade' : 'wrong');
    // Attempts, not only misses: BACKLOG #10's denominator. Logged for a correct
    // answer too, which is the whole point — a mode you drill often and mostly
    // pass should stop outranking one you avoid and always fail.
    logAttempt(MODE_TAG[item.type]);
    if (!ok) noteMiss(MODE_TAG[item.type], item.word.term, detail);
    setDone((d) => d + 1);
    setDrills((d) => d + 1);
    setDrillsOk((d) => d + (ok ? 1 : 0));
    setFlipped(false);
    setI((n) => n + 1);
  }, [item, i]);

  // Skip: advance without grading — the card stays due for a later session.
  // A skipped exercise is a "zu steil" (too steep) signal: you couldn’t attempt
  // it, which is blind-spot information — so it feeds the miss log that ranks
  // weak modes and triggers remediation, while FSRS stays untouched (a skip is
  // never a lapse). Plain word flips log nothing: skipping a word isn’t
  // structural.
  const skip = useCallback(() => {
    if (!item) return;
    exitDir.current = 0;
    history.current.push({ i, kind: 'skip' });
    if (item.type !== 'flip') noteMiss(MODE_TAG[item.type], item.word.term);
    else if (item.word.kind === 'grammar') noteMiss(item.word.term);
    setFlipped(false);
    setI((n) => n + 1);
  }, [item, i]);

  // Prev: undo the last action. On a grade, restore the FSRS state and rewind
  // counters; on a skip, just step back. Position returns to that card.
  const prev = useCallback(() => {
    const e = history.current.pop();
    if (!e) return;
    exitDir.current = 0;
    if (e.kind === 'grade' && e.srsId) {
      restoreCard(e.srsId, e.prevCard, (e.dAgain ?? 0) > 0);
      setDone((d) => Math.max(0, d - 1));
      setNewLearned((n) => Math.max(0, n - (e.dNew ?? 0)));
      setDrills((d) => Math.max(0, d - (e.dDrill ?? 0)));
      setDrillsOk((d) => Math.max(0, d - (e.dDrillOk ?? 0)));
      setRetrieved((r) => Math.max(0, r - (e.dRetr ?? 0)));
      setRetrievedOk((r) => Math.max(0, r - (e.dRetrOk ?? 0)));
    }
    setFlipped(false);
    setI(e.i);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // Never hijack keys while the learner is typing an answer — Space must
      // insert a space in "habe gemacht", not flip the card.
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      // Nor while a control has focus: Space is that control’s own activation
      // key, and this listener used to fire *as well*, so pressing Space on
      // "Didn’t know" both graded the card and flipped the next one.
      if (t && (t.tagName === 'BUTTON' || t.closest?.('button, a, select'))) {
        if (e.code === 'Space' || e.key === 'Enter') return;
      }
      if (e.code === 'Space') { e.preventDefault(); flip(); }
      // ←/→ stay as the two-way shortcut the swipe mirrors; 1–4 reach the full
      // scale, which is otherwise mouse-only. A new card has no 2 or 4 to press.
      if (e.key === 'ArrowLeft') grade(Rating.Again);
      if (e.key === 'ArrowRight') grade(Rating.Good);
      if (e.key >= '1' && e.key <= '4') {
        const s = SCALE[Number(e.key) - 1];
        const firstSight = !!item && statusOf(item.srsId) === 'new';
        if (s && (!firstSight || s.firstSight)) grade(s.rating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip, grade, item]);

  // Before the empty-state check, or a session opened seconds after boot reads as
  // "nothing to study" rather than "one moment".
  if (!detailReady) {
    return (
      <div className="mx-auto w-full max-w-[640px] flex-1 flex flex-col justify-center items-center gap-3">
        <p className="text-dim text-sm">Getting your cards ready…</p>
      </div>
    );
  }
  if (queue.length === 0) return <EmptyState target={target} scoped={scoped} onPick={onPick} />;
  if (!item) return <DoneState done={done} newLearned={newLearned} retrieved={retrieved} retrievedOk={retrievedOk} drills={drills} drillsOk={drillsOk} minedCount={minedCount} comeback={comeback} firstRun={firstRun} met={metWords.current} onPlacement={onPlacement}
    weakest={[...sessionMisses.current.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]}
    composition={composition}
    onDone={onDone} onPick={onPick} onProfile={onProfile} />;

  const card = item.word;
  const drill = item.type !== 'flip';
  // No memo: familyOf keeps its own reverse index, so this is a Map lookup.
  const family = familyOf(card, WORDS);
  // Cheap: a regex over one short string, and only for verbs.
  const valency = valencyOf(card);
  const isNew = statusOf(item.srsId) === 'new';

  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 min-h-0 flex flex-col justify-center">
      <ReturnNotice />
      <CoachMarks />
      {offerVoice && <div className="mb-2.5"><VoiceOffer onClose={() => setOfferVoice(false)} /></div>}
      {/* Circuit breaker (F3): four straight misses isn’t failure, it’s a hard
          patch. Offer a graceful stop at a natural break — once, then quiet. */}
      {breather && (
        <div role="status"
          className="pb-3 mb-3 border-b border-line flex items-center gap-3 flex-wrap">
          <p className="text-xs flex-1 min-w-[200px]">
            Rough patch — that’s the system finding your edge. These come back easier tomorrow.
          </p>
          <div className="flex gap-2">
            <Button variant="quiet" size="sm"
              onClick={() => { setBreather(false); setI(queue.length); tick('done'); }}>Stop here</Button>
            <Button size="sm" onClick={() => setBreather(false)}>Keep going</Button>
          </div>
        </div>
      )}
      {/* **Chrome, not a card.** The session's title, position and controls were
          in a bordered box sitting above the card you actually study, which is a
          box drawn around the frame of a box. It also cost about eighty vertical
          points, and on an iPhone 17 Pro those eighty were the difference between
          the grade buttons being on screen and being under the tab bar. One
          hairline does the separating. */}
      <div className="-mx-3 sm:-mx-5 border-b border-line">
        <div className="flex items-center gap-2.5 px-3 sm:px-5 py-2 flex-wrap">
          {/* A scoped session was opened from somewhere and has a way back. The
              day's queue is the app's root and has none — a back arrow on the
              screen the app opens into is an arrow pointing at nothing. */}
          {scoped && <IconButton label="Back to Wortschatz" pull onClick={onPick}><ArrowLeft size={16} /></IconButton>}
          <h1 className="text-base font-semibold truncate flex-1 min-w-[7rem]">{target.name}</h1>
          {/* Position out of a total, not a raw countdown. "92 left" on a first
              session reads as a backlog with no floor; "7 / 92" is the same fact
              as somewhere you are inside something finite, and it moves forward
              rather than only shrinking. */}
          <Chip aria-label={`Card ${Math.min(i + 1, queue.length)} of ${queue.length} in this session`}>
            {Math.min(i + 1, queue.length)} / {queue.length}
          </Chip>
          {/* Prev (undo) + skip — the only in-session controls; the level filter lives in Settings, keys in onboarding. */}
          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
            {/* Flag: "something’s wrong with this card" — the feedback loop for a
                solo-maintained corpus. Local, deduped, exports with the backup. */}
            <IconButton
              onClick={() => item && flagCard(item.word.id, item.word.term)}
              label={item && isFlagged(item.word.id) ? 'Card flagged — it exports with your backup' : 'Flag a problem with this card'}
              aria-pressed={!!(item && isFlagged(item.word.id))}
              active={!!(item && isFlagged(item.word.id))}>
              <Flag size={15} fill={item && isFlagged(item.word.id) ? 'currentColor' : 'none'} />
            </IconButton>
            {/* Sound is on by default now, so muting has to be reachable from
                inside the session — not three taps away in Settings. */}
            <IconButton onClick={() => setSound(!sound())}
              label={sound() ? 'Mute sound' : 'Unmute sound'}
              aria-pressed={!sound()} active={!sound()}>
              {sound() ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </IconButton>
            <IconButton label="Previous card" onClick={prev} disabled={i === 0}><RotateCcw size={16} /></IconButton>
            <IconButton label="Skip this card" onClick={skip}><SkipForward size={16} /></IconButton>
          </div>
        </div>
        {/* Slim session progress — tracks position through the queue. */}
        <div className="h-0.5 bg-panel2" role="progressbar" aria-label="Session progress"
          aria-valuenow={i} aria-valuemin={0} aria-valuemax={queue.length}
          aria-valuetext={`${i} of ${queue.length} done`}>
          <div className="relative h-full bg-accent transition-[width] duration-300" style={{ width: `${queue.length ? (i / queue.length) * 100 : 0}%` }}>
            {/* The cursor rides the tip of the bar — it writes your session. */}
            {i > 0 && <span aria-hidden key={ack?.n ?? 0} className={ack?.ok ? 'tip tip-hit' : 'tip'} />}
          </div>
        </div>

        {/* The acknowledgment. Lives in the chrome, not on the card, because the
            card unmounts the instant it is graded — anything rendered there gets
            about zero frames to be seen. `key` on the sequence number so a run of
            correct answers re-triggers rather than sitting still.
            aria-hidden: the grade is already announced by the live region on the
            card area, and a screen reader does not need it twice. */}
        <div aria-hidden className="h-5 flex items-center justify-center">
          {ack && (
            <span key={ack.n}
              className={`ack-in inline-flex items-center gap-1.5 text-2xs font-mono ${ack.ok ? 'text-green' : 'text-dim'}`}>
              {ack.ok ? <Check size={11} /> : <X size={11} />}
              {ack.interval ? `back in ${ack.interval}` : ack.ok ? 'right' : 'not yet'}
              {ack.comeback != null && (
                <span className="text-green">· missed {ack.comeback}× before</span>
              )}
            </span>
          )}
        </div>

        {/* The card swaps in place, so nothing here is ever re-announced without
            a live region — Placement and the drills each got one, and the
            primary loop was the surface that didn’t.

            The `min-h-[400px]` that used to be here is gone: the card below sizes
            itself against the space the bars leave (see SwipeCard), so a floor
            here could only fight it. */}
        <div className="flex flex-col items-center justify-center py-4 sm:py-6 px-3 sm:px-6"
          role="region" aria-live="polite" aria-label="Current card">
          {/* The card swap is React state, not an animation lifecycle.
              It used to be `AnimatePresence mode="wait"`, which keeps the
              outgoing card mounted until its exit *completes* and only then
              mounts the next one. That makes the correctness of the primary
              study loop depend on a rAF-driven animation finishing: with rAF
              stalled, grading advanced the counter 272→268 while the headword
              never changed. Measured, with `rafTicksIn600ms: 0`.
              In a real browser rAF only pauses on a hidden tab and resumes on
              return, so this was not silently eating cards in normal use — but
              "the deck advances only if an animation finishes" is the same
              defect class as the entrance rule in DESIGN.md §7, and rapid
              keyboard grading queues against the 220ms exit for no good reason.
              Now: the current item always renders, and direction is carried by
              the *entrance* — the next card arrives from the side opposite the
              judgement, the way a deck advances when you flick one off. CSS,
              transform-only, no fill-mode, so it cannot gate anything. */}
          <div key={item.srsId} className="card-in w-full flex flex-col items-center"
            style={{ '--dir': exitDir.current } as React.CSSProperties}>
          {/* What kind of exercise this is, and why it is here — one caption
              block above the item, in that order.

              The mode label used to be an absolutely-positioned pill notching the
              card's top-right corner, which is a nicer object and was wrong for a
              reason positioning could not fix: it anchored to the exercise
              *container*, and only three of the four items render a card as their
              first child. The Diktat renders a speaker button and two lines of
              instruction first, so the pill floated in the middle of them.
              In flow, it cannot collide with anything, and it reads in the order
              the learner needs it — *what am I being asked*, then *why*. */}
          {drill && (
            <Kicker tone="accent" className="block mb-1.5">{DRILL_TAG[item.type] ?? 'Drill'}</Kicker>
          )}
          <WhyThisCard reason={item.reason} />

          {drill ? (
            <div className="w-full max-w-[580px]">
              {item.type === 'gender' ? <GenderItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : item.type === 'plural' ? <PluralItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : <RecallItem key={item.srsId} word={card} onGrade={gradeDrill} />}
            </div>
          ) : (<>
          <SwipeCard key={item.srsId} onFlip={flip} onGrade={grade} behind={Math.min(2, queue.length - i - 1)}>
            <div className={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
              {/* FRONT — the prompt: word + German context, no translation to spoil
                  the test. Except on first sight: a card the learner has never met
                  is an introduction, not a test. Hiding the meaning there just asks
                  them to fail at recalling something nobody taught them, so a new
                  card shows its gloss and the grade becomes "did that land?".
                  Retrieval starts at the next review, which FSRS schedules minutes
                  later. */}
              {/* The terminal is the room; the card is the thing in your hand —
                  but it's the same *palette* as the room, distinguished by
                  material: grain, the larger radius, a deeper lift, and the
                  serif headword. The earlier warm-cream version changed the
                  brand hue by 153° on entry, which is why it read as foreign. */}
              {/* `justify-[safe_center]`, not `justify-center`.
                  This face is `overflow-y-auto`, and centred flex content that
                  overflows is clipped at **both** ends — the exact defect the
                  back face's comment below records and fixes, left un-fixed here
                  because the card used to be tall enough to hide it. It stopped
                  being tall enough the moment the card started sizing itself
                  against a phone's bars: a first-sight card (kicker, headword,
                  IPA, gloss, speaker, example, translation) lost its top line and
                  its last line at once.
                  `.justify-safe-center` (index.css) centres when it fits and
                  falls back to flex-start when it does not. It is a real class
                  and not a Tailwind arbitrary value on purpose:
                  `justify-[safe_center]` does not compile — it emits an invalid
                  declaration, the browser drops it, and the face silently falls
                  back to `normal`. Which happened, and looked like a fix. */}
              <div className="flip-face relative border border-line rounded-lg bg-card flex flex-col items-center justify-safe-center gap-3 p-6 sm:p-8 text-center overflow-y-auto">
                <StatusPip id={item.srsId} />
                <span className="text-2xs text-dim font-mono uppercase tracking-widest">
                  {isNew && <span className="text-accent">New · </span>}
                  {card.pos || 'word'} · {card.level}{card.field ? ` · ${card.field}` : ''}
                </span>
                <Illustration word={card} size={68} className="text-accent select-none" />
                {/* lang="de" on every German string: without it a screen reader
                    pronounces the entire lexicon of a German app in an English
                    voice, which is the one thing this surface must not do. */}
                <GenderTerm term={card.term} gender={card.gender}
                  className="headword font-bold leading-tight break-words max-w-full px-2 text-4xl sm:text-5xl" />
                {card.ipa && <span className="font-mono text-base text-dim">/{card.ipa}/</span>}
                {isNew && (
                  <span className="text-green font-semibold text-xl sm:text-2xl leading-tight max-w-[92%]">{card.en}</span>
                )}
                {(
                  <button onClick={(e) => { e.stopPropagation(); speak(card.term); }}
                    className="grid place-items-center w-11 h-11 rounded-full bg-panel border border-line text-accent hover:bg-panel2 active:scale-95" title="Pronunciation">
                    <Volume2 size={18} />
                  </button>
                )}
                {/* The example is audible, and prefers a real human reading of it
                    over synthesis where Tatoeba has one (see lib/audio.ts). The
                    headword button above stays synthesis — it's a pronunciation
                    model, and Piper is the more consistent teacher for a single
                    word. Sentences are where a human voice actually earns its
                    place: rhythm, linking and stress are the things TTS flattens.

                    This replaced a `SpeakButton` sitting beside the text, so the
                    whole sentence is now the target rather than a 24px speaker —
                    which is the better touch affordance. `aria-label` carries the
                    naming that `SpeakButton` used to provide: without it the
                    accessible name is the German sentence alone, which never says
                    the control plays anything. */}
                {card.ex[0] && (
                  <button lang="de"
                    onClick={(e) => { e.stopPropagation(); sayExample(card.id, card.ex[0].de); }}
                    aria-label={`Hear the example “${card.ex[0].de}”`}
                    title={hasHumanAudio(card.id) ? 'Play — read by a Tatoeba contributor' : 'Play this sentence'}
                    className="text-dim italic text-base leading-relaxed max-w-[90%] hover:text-txt transition-colors cursor-pointer">
                    {card.ex[0].de}
                    {hasHumanAudio(card.id) && (
                      <Volume2 size={13} aria-hidden className="inline-block ml-1.5 -mt-0.5 text-accent" />
                    )}
                  </button>
                )}
                {isNew && card.ex[0]?.en && <span className="text-dim text-sm leading-relaxed max-w-[90%]">{card.ex[0].en}</span>}
              </div>
              {/* BACK — the reveal.
                  Four things were wrong with the previous face, and all four came
                  from the same idea: that the back is a different *thing*.

                  1. It set `background: var(--color-green-d)` inline and so never
                     applied `.bg-card` — no grain, no top-light gradient, only the
                     `.flip-face` shadow. Turning the card over changed what it was
                     made of, which is DESIGN.md §3 broken by the app's own hero
                     object, and the `.paper` mistake in a different costume.
                  2. Green is documented as the *status* colour ("gains / mastered").
                     Painting the whole answer face in it delivers a verdict before
                     any grading has happened — on a card you may be about to fail —
                     and it collides with the drills' own green "correct" surface.
                     Green now survives as an edge rule, the kicker and the ink.
                  3. Three alignments in one 400px face: the face was `items-center
                     text-center`, the examples block `text-left`, and the synonyms
                     centred again. Nothing shared an edge.
                  4. `justify-center` with `overflow-y-auto` scrolls from the middle,
                     so a C1 card (definition + two bilingual examples + synonyms +
                     antonyms) silently clipped at the top.

                  The front is centred because it presents one object; the back is
                  flush-left because it is an entry you read. That asymmetry is
                  deliberate, and it replaces an accidental one. */}
              <div className="flip-face flip-back bg-card border border-line border-l-4 rounded-lg
                              flex flex-col items-stretch text-left p-5 sm:p-7 overflow-y-auto"
                   style={{ borderLeftColor: 'var(--color-green)' }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <Kicker tone="reward">Answer</Kicker>
                  {(
                    <>
                      {/* The German stays in view at the reveal: seeing the pair
                          together is the encoding, and the front's term vanished
                          the instant you learned what it meant. */}
                      <span aria-hidden className="text-dim text-2xs">·</span>
                      {/* Gender ink survives the flip now. It used to live only on
                          the front, so the article's colour — the most useful mark
                          on a German card — vanished the moment you turned it. */}
                      <GenderTerm term={card.term} gender={card.gender}
                        className="font-mono text-2xs text-dim truncate" />
                    </>
                  )}
                  <span className="ml-auto flex items-center flex-shrink-0">
                    <SpeakButton text={card.term} label={`Hear “${card.term}” in German`} />
                  </span>
                </div>
                <span className="headword font-bold text-green leading-tight break-words text-3xl sm:text-4xl">{card.en}</span>
                <Kicker className="block mt-1.5">
                  {card.pos} · {card.level}{card.field ? ` · ${card.field}` : ''}
                </Kicker>
                {card.def && (
                  <RevealBlock label="Definition">
                    <p className="text-txt text-sm leading-relaxed whitespace-pre-line">{card.def}</p>
                  </RevealBlock>
                )}
                {/* The monolingual layer (persona B2 #38). Everything else on this
                    card is de→en; at B2 the useful question stops being "what is
                    this in English" and becomes "how would a German explain it".
                    Gated on the *learner's* level rather than the card's, because
                    it is a fact about who is reading. */}
                {card.defDe && germanDefs && (
                  <RevealBlock label="Auf Deutsch">
                    <p lang="de" className="text-txt text-sm leading-relaxed">{card.defDe}</p>
                  </RevealBlock>
                )}
                <FalseFriendNote term={card.term} />
                {/* Government, where the card carries it. A learner who knows
                    *warten* and not *warten auf + Akkusativ* cannot build the
                    sentence, and the corpus has been holding this inside the
                    headword string where nothing could read it. Never shows a
                    case it had to guess — see lib/valency.ts. */}
                {valency && (
                  <p lang="de" className="text-sm text-accent font-mono mb-2">{valencyLabel(valency)}</p>
                )}
                {card.ex.length > 0 && (
                  <RevealBlock label="In use"><ExampleList items={card.ex} /></RevealBlock>
                )}
                {(card.syn.length > 0 || card.ant.length > 0) && (
                  <RevealBlock className="space-y-1.5">
                    <TermList label="Syn" terms={card.syn} />
                    <TermList label="Opp" terms={card.ant} tone="red" />
                  </RevealBlock>
                )}
                {/* The word family (persona C1 #45). nehmen / annehmen / benehmen
                    / unternehmen is one system told as separate cards; at this
                    level the prefix is the lesson. Derived, verbs only — see
                    lib/family.ts for why nouns are excluded. */}
                {family.length > 0 && (
                  <RevealBlock className="space-y-1.5">
                    <TermList label="Family" terms={family} />
                  </RevealBlock>
                )}
                <CardSource id={card.id} />
              </div>
            </div>
          </SwipeCard>

          {/* Grade from either face — flipping is optional. First-sight cards
              can’t be "known", so new cards ask "keep it or got it" instead of
              framing an inevitable miss as failure. */}
          <div className="min-h-[64px] mt-6 flex flex-col items-center justify-center gap-2 w-full">
            {/* Two grades on a first-sight card, four once there was something to
                recall. Four columns don't fit a phone, so they wrap 2×2 — which
                also puts the two familiar verdicts on the first row. */}
            <div className={`grid gap-2 sm:gap-2.5 w-full max-w-[580px] ${
              isNew ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {SCALE.filter((s) => !isNew || s.firstSight).map((s) => {
                const label = (isNew && s.firstSight) ? s.firstSight : s.label;
                const when = preview?.get(s.rating);
                return (
                  // Explicit label: without it the accessible name runs the
                  // interval preview straight onto the verdict ("Knew it 2 mo").
                  <button key={s.rating} onClick={() => grade(s.rating)}
                    aria-label={`${label}${when ? ` — back in ${when}` : ''}`}
                    className={`flex flex-col items-center border border-line bg-panel rounded-md px-3 py-2
                      justify-center font-semibold transition-colors active:scale-95 ${s.hover}`}>
                    <span className="flex items-center gap-1.5 text-sm sm:text-base">
                      {s.rating === Rating.Again && <X size={15} className="flex-shrink-0" />}
                      {s.rating === Rating.Good && <Check size={15} className="flex-shrink-0" />}
                      {label}
                    </span>
                    {when && <span className="text-2xs text-dim font-mono font-normal mt-0.5">{when}</span>}
                  </button>
                );
              })}
            </div>
            {/* The hint has to match the device. This read "Space to flip" on
                phones, which have no Space key — the app's primary surface was
                naming an affordance that did not exist there. `hover: none`
                identifies a touch primary input more reliably than width does:
                a tablet is wide and still has no keyboard. */}
            <span className={`text-dim text-xs h-4 leading-4 transition-opacity ${flipped ? 'opacity-0' : ''}`}>
              {isNew
                ? 'First time seeing this — take it in, then say how it landed'
                : keyboard
                  ? 'Space to flip · 1–4 to grade'
                  : 'Tap the card to flip and check the translation'}
            </span>
          </div>
          </>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Draggable flip-card. Tap flips; swipe right = knew it (Good), swipe left =
 *  didn’t know (Again). Commits on travel OR a confident flick (velocity with
 *  real distance behind it); below threshold the card is handed back with the
 *  release velocity, so the return reads as the gesture settling — not a reset.
 *
 *  `behind` draws the rest of the queue as a physical stack. "35 left" is a
 *  number standing in for something that should be *seen*: the pile thins as you
 *  work, and the last card has nothing behind it, so finishing is visible before
 *  it is announced. */
function SwipeCard({ children, onFlip, onGrade, behind = 0 }:
  { children: React.ReactNode; onFlip: () => void; onGrade: (g: Grade) => void; behind?: number }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const yes = useTransform(x, [20, SWIPE_PX], [0, 1]);
  const no = useTransform(x, [-20, -SWIPE_PX], [0, 1]);
  const reduce = useReducedMotion();
  const dragged = useRef(false);
  return (
    // **The height knows about the bars.** *2026-09-05, measured on an iPhone.*
    // This was `clamp(340px, 52vh, 460px)`, and `vh` is the whole viewport — it
    // does not know that ~52px of it is an app bar and ~74px is a floating tab
    // bar. On a 956pt screen the page came to 1,008px and the **grade buttons
    // sat under the tab bar**: the primary action of the primary loop, below the
    // fold, on a page that does not look scrollable.
    //
    // 470px is the rest of the player measured rather than estimated — header,
    // why-line, grade row, hint line and gaps, everything in this column that is
    // not the card. Desktop is unaffected (it still clamps to 460).
    //
    // The 330px floor is the height a *first-sight* card needs — the one that
    // shows the most: kicker, headword, IPA, gloss, speaker, example and its
    // translation. Below that the face scrolls internally, which is survivable
    // (see the `safe` alignment note on the face) but not what anybody wants. On
    // a screen too short for 330 + the chrome, the page scrolls the difference,
    // which is the right trade: a card that looks broken is worse than a page
    // that moves.
    // **The height is what is left, not a number.** *2026-09-05.*
    //
    // This was `clamp(330px, 100dvh - bars - 470px, 460px)`, where 470 was the
    // rest of the column measured on one screen at one moment. It is right until
    // anything else appears above the card — and the welcome-back and caught-up
    // notices do exactly that, which put *the card itself* under the tab bar on
    // an iPhone 17 Pro. Any future notice would do it again.
    //
    // `flex-1` inside the column that already lays this out means the card takes
    // the space genuinely remaining, whatever is stacked above it.
    //
    // **The floor is 260, not 300, and the 40 points are not cosmetic.** Measured
    // at 402×874: the browser pane reports zero overflow because it has no status
    // bar and no Safari toolbar, while the same viewport on a real iPhone loses
    // ~59pt to the status bar and ~50 more to Safari's bottom toolbar — which put
    // the second row of grade buttons under the tab bar. Installed as a PWA the
    // toolbar is gone and only the status bar costs anything, but even then the
    // column came out about sixty points long.
    //
    // Below this a first-sight face has more content than room and scrolls
    // internally, which is survivable; grade buttons off screen are not, because
    // they are the primary action of the primary loop.
    <div className="relative w-full max-w-[580px] flex-1 min-h-[260px] max-h-[460px]">
      {/* Static, aria-hidden, and behind the drag surface: this is scenery, not
          content. Rendered outermost-first so the nearest sits on top. */}
      {Array.from({ length: behind }, (_, k) => behind - 1 - k).map((depth) => (
        <div key={depth} aria-hidden
          className="absolute inset-x-0 top-0 h-full rounded-lg border border-line bg-card"
          style={{
            transform: `translateY(${(depth + 1) * 7}px) scale(${1 - (depth + 1) * 0.025})`,
            opacity: 1 - (depth + 1) * 0.28,
          }} />
      ))}
    <motion.div
      // The card is a control, not a div with a click handler: it was never
      // focusable, so its only keyboard path was a global window listener.
      role="button"
      tabIndex={0}
      aria-label="Flashcard — activate to flip, or use the grade buttons below"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFlip(); }
      }}
      // Fluid height: this was a fixed 360/420px with overflow-y-auto faces, so
      // a C1 card (definition + two bilingual examples + synonyms + antonyms) at
      // the "Larger" text scale silently scrolled inside a drag surface.
      // Absolute so it sits exactly on top of the stack behind it.
      className="absolute inset-0 cursor-pointer touch-pan-y rounded-lg"
      style={{ x, rotate: reduce ? 0 : rotate }}
      drag="x"
      dragElastic={0.6}
      onDragStart={() => { dragged.current = true; }}
      onDragEnd={(_, info) => {
        const { offset, velocity } = info;
        const flick = Math.abs(velocity.x) > 480 && Math.abs(offset.x) > 36;
        if (offset.x > SWIPE_PX || (flick && velocity.x > 0)) onGrade(Rating.Good);
        else if (offset.x < -SWIPE_PX || (flick && velocity.x < 0)) onGrade(Rating.Again);
        else animate(x, 0, { type: 'spring', stiffness: 420, damping: 30, velocity: velocity.x });
        setTimeout(() => { dragged.current = false; }, 0);
      }}
      onClick={() => { if (!dragged.current) onFlip(); }}
    >
      <div className="flip w-full h-full">{children}</div>
      <motion.span style={{ opacity: yes }}
        className="absolute top-3 right-3 flex items-center gap-1.5 text-green font-bold text-xs border border-green rounded-full px-3 py-1 bg-[var(--color-green-d)] pointer-events-none">
        <Check size={14} /> Knew it
      </motion.span>
      <motion.span style={{ opacity: no }}
        className="absolute top-3 left-3 flex items-center gap-1.5 text-red-txt font-bold text-xs border border-red rounded-full px-3 py-1 bg-[var(--color-red-d)] pointer-events-none">
        <X size={14} /> Didn’t know
      </motion.span>
    </motion.div>
    </div>
  );
}

/** Somebody who has been away, told so once, without being scolded.
 *
 *  **The most under-served state in the app, found by driving the personas.** A
 *  learner returning after a month met 189 due cards, a session of 70 items, a
 *  "1-day streak" where their 30-day one used to be, and *no acknowledgement of
 *  any kind*. Every one of those is technically correct and together they read
 *  as: you lost your progress and here is a mountain.
 *
 *  Copy that used to cover this lived on `Today.tsx`, which the vocabulary
 *  refocus deleted — so this is not new ground, it is ground that was dropped.
 *
 *  Three facts, no reproach. What is actually waiting; that the day is bounded
 *  (`SESSION_CEILING` now guarantees it, which is what makes the promise
 *  keepable); and that the streak is a counter, not a verdict on the work — the
 *  longest one is still theirs. `lastGapDays()` has been in the store the whole
 *  time with no caller.
 *
 *  Seven days is the threshold because a week is the first gap a learner
 *  *notices* — a weekend away should say nothing at all. */
function ReturnNotice() {
  const gap = useMemo(() => lastGapDays(), []);
  const best = useMemo(() => longestStreak(), []);
  const b = useMemo(() => buildBriefing(), []);
  const away = gap !== null && gap >= 7;

  // **Caught up is a state the app could reach and could never say.** The
  // `clear` persona — everything reviewed, nothing due — was served a session of
  // 29 fresh cards indistinguishable from a day of owed reviews, because
  // `buildBriefing` fills the day whether or not anything is due. `EmptyState`
  // below only appears once the *fresh* words run out too, which for a learner
  // inside a 6,700-word corpus is never.
  //
  // The fresh words are the right thing to offer; presenting them as a debt is
  // not. One line fixes the whole difference.
  const caughtUp = !away && b.due === 0 && b.fresh > 0;
  if (!away && !caughtUp) return null;

  return (
    // A tinted band, not a card. The one card on this screen is the one you
    // study — everything else is page.
    <div role="status" className="mb-3 pb-3 border-b border-line">
      {away ? (
        <>
          <p className="text-sm font-semibold">Welcome back — it’s been {gap} days.</p>
          <p className="text-xs text-dim mt-1 leading-relaxed">
            {/* Short on purpose. Every line here comes off the height of the card
                below it, and the card is the reason anybody opened this screen. */}
            {b.dueTotal > SESSION_CEILING
              ? <>{fmt(b.dueTotal)} waiting · today serves {SESSION_CEILING}, the rest keep.</>
              : <>Everything waiting fits in one session.</>}
            {best > 1 && <> Longest streak: {best} days.</>}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">You’re caught up — nothing is due.</p>
          <p className="text-xs text-dim mt-1 leading-relaxed">
            {b.fresh} new {b.fresh === 1 ? 'word' : 'words'} below, offered rather than owed.
          </p>
        </>
      )}
    </div>
  );
}

/** One-time first-session tips (Karl, S6): flip / grade / skip, then gone.
 *
 *  **Also gated on this actually being an early session.** The dismissal flag
 *  lives in localStorage, so anything that clears it — a restore, a new device,
 *  a browser wiping site data — brings the tips back to a learner of two years.
 *  Caught on the phone: the returning learner got the welcome-back notice *and*
 *  the coach marks *and* the session header stacked above the card, which pushed
 *  the card itself under the tab bar. Somebody with a visit history has had
 *  their first session. */
function CoachMarks() {
  const [show, setShow] = useState(() => {
    if (visitCount() > 1) return false;
    try { return localStorage.getItem('lexi.coach.session.v1') !== '1'; } catch { return false; }
  });
  if (!show) return null;
  const dismiss = () => {
    try { localStorage.setItem('lexi.coach.session.v1', '1'); } catch { /* */ }
    setShow(false);
  };
  return (
    // Vertically tight on purpose. Three tips wrap to three lines on a phone, and
    // every pixel this block spends comes off the bottom of the session: measured
    // 2026-08-16 on a first run at 375×667 — the iPhone SE floor — the grade
    // buttons ended 7px past the fold and the session scrolled (723 against 667).
    // At 375×812 and 402×874 they were already comfortably above it, so BACKLOG
    // #32's "coach marks eat 200px of 812" is a 2.5× overstatement of a block that
    // measures 79px; what was real is only real on the short viewport.
    //
    // Padding and gaps, not type size: the tips are the first words a learner
    // reads and "Tap the card to flip it" is the one genuinely undiscoverable
    // thing in the app. Shrinking the text to win eight pixels trades the finding
    // this block exists to deliver.
    <div className="pb-2 mb-2 border-b border-line flex items-center gap-x-3 gap-y-0.5 flex-wrap text-xs text-dim">
      <span><b className="text-txt font-semibold">Tap</b> the card to flip it</span>
      <span aria-hidden>·</span>
      {/* "Swipe the card", not "swipe" — the app now has two swipe grammars and
          they are one screen apart. Here right means *knew it*; on the feed,
          right opens the entry and left opens the drill. Both are natural on
          their own surface, and neither is a global rule, so this stops
          claiming one. */}
      <span><b className="text-txt font-semibold">Swipe the card</b> right if you knew it, left if you didn’t</span>
      <span aria-hidden>·</span>
      {/* The keyboard path existed but was never stated anywhere in the UI — and
          what it stated only ever worked on the flip card. The drills now take
          1–4 and Enter too, so one line covers every card type. */}
      <span className="hidden sm:inline">
        <kbd className="text-txt font-semibold">Space</kbd> flips,{' '}
        <kbd className="text-txt font-semibold">1</kbd>–<kbd className="text-txt font-semibold">4</kbd> grade or answer,{' '}
        <kbd className="text-txt font-semibold">Enter</kbd> continues
      </span>
      <span aria-hidden className="hidden sm:inline">·</span>
      <span><b className="text-txt font-semibold">Skip</b> is always free</span>
      <button onClick={dismiss} className="tap-hit ml-auto text-accent font-semibold hover:brightness-110">Got it</button>
    </div>
  );
}


/** The words you met today, in a shape you can take away.
 *
 *  "My class sets homework; Lexi sets a streak." A session ends and leaves nothing
 *  behind — the learning is real but it lives inside an app you have closed, and a
 *  language-school student's day is full of moments (a bus, a queue, a lecture
 *  running long) that are too small to open it again.
 *
 *  So the recap hands over a plain list: German, English, one per line, sized to
 *  screenshot. Deliberately not a feature with state — no "homework" to complete,
 *  nothing to sync, nothing to feel guilty about. Just the day's words, in a form
 *  that survives leaving. */
function PocketList({ words }: { words: Word[] }) {
  const [open, setOpen] = useState(false);
  if (words.length === 0) return null;
  return (
    <div className="mt-4">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-dim hover:text-accent underline underline-offset-2">
          <ClipboardList size={13} /> Today’s words, to take with you
        </button>
      ) : (
        <Card tone="sunken" nested pad="none" className="p-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Kicker tone="accent">{words.length} words today</Kicker>
            <button onClick={() => setOpen(false)} className="ml-auto text-2xs text-dim hover:text-accent">Hide</button>
          </div>
          {/* One line per word, no controls inside: this is meant to be a picture. */}
          <ul className="space-y-1">
            {words.map((w) => (
              <li key={w.id} className="flex gap-2 text-sm leading-relaxed">
                <GenderTerm term={w.term} gender={w.gender} className="text-txt font-medium min-w-[9rem]" />
                <span className="text-dim flex-1">{w.en}</span>
              </li>
            ))}
          </ul>
          <p className="text-2xs text-dim mt-3">Screenshot this — it’s just a list, nothing to finish.</p>
        </Card>
      )}
    </div>
  );
}

/** Unobtrusive mastery dot on the card front: dim = new, amber = learning, green = known. */
function StatusPip({ id }: { id: string }) {
  const st = statusOf(id);
  const color = st === 'known' ? 'var(--color-green)' : st === 'learning' ? 'var(--color-accent)' : 'var(--color-dim)';
  const label = st === 'known' ? 'Known' : st === 'learning' ? 'Learning' : 'New';
  return <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full" style={{ background: color }} title={label} aria-label={`Status: ${label}`} />;
}

function DoneState({ done, newLearned, retrieved, retrievedOk, drills, drillsOk, minedCount, comeback, firstRun, weakest, composition, met, onDone, onPick, onProfile, onPlacement }:
  { done: number; newLearned: number; retrieved: number; retrievedOk: number; drills: number; drillsOk: number; minedCount: number; comeback: { term: string; lapses: number } | null; firstRun: boolean; weakest?: string;
    composition?: RecapData['composition']; met: Word[]; onDone: () => void; onPick: () => void; onProfile: () => void;
    /** Offered from the first recap, once there is something to calibrate. */
    onPlacement?: () => void }) {
  // **Recall is only defined where a retrieval happened.**
  //
  // This was `(done - again) / done`, and `done` counts every graded item — the
  // first-sight introductions and the drill answers along with the actual
  // retrievals. A first session of twenty brand-new cards, every one shown
  // answer-side-up and never asked for, therefore reported **RECALL 100%**: the
  // one number the recap leads with was the one number the session had not
  // measured. VISION §3 forbids a number that flatters, and this was the app's
  // last one.
  //
  // `undefined` rather than 0 — `SessionRecap` already contracts for that and
  // drops the tile, which is the honest rendering of "there is nothing to
  // report" and is not the same claim as "you recalled none of it".
  const recall = retrieved > 0 ? Math.round((retrievedOk / retrieved) * 100) : undefined;
  // Fire milestones + the closing cue once, from the final state. Crossing a
  // milestone earns the triad; an ordinary finish gets the plain two-note rise,
  // so the bigger sound stays rare enough to still mean something.
  const [milestone] = useState(() => {
    const m = checkMilestones();
    tick(m ? 'milestone' : 'done');
    return m;
  });
  // Finishing a sector is the one thing in this app you can actually complete.
  // Checked once, from the final state, like the milestone above it.
  const [finished] = useState(() => checkCompletions());
  return (
    <div className="grid place-items-center min-h-[440px]">
      {/* `reviewed` is retrievals, not "items you got through": with the recall tile
          gone, a Reviewed tile counting the same twenty cards as New learned was the
          second half of the same lie. An all-new session now reports what it did —
          twenty introduced, nothing recalled — and says the rest in prose below. */}
      <SessionRecap data={{ reviewed: retrieved || undefined, recall, newLearned, minedCount, milestone, weakest, composition, streak: streak() }}>
        {finished.length > 0 && (
          <p className="text-sm mb-5">
            You finished <span lang="de" className="text-green font-bold">{finished.map((f) => f.name).join(', ')}</span> — every card in it is yours.
          </p>
        )}
        {/* Drills, said separately. Folded into `done` they were invisible, and
            they are the half of a session a learner has to be talked into. */}
        {drills > 0 && (
          <p className="text-sm mb-5">
            {drills} of those were <span className="font-semibold">drills</span>, not flips —
            you got <span className={`font-mono font-bold ${drillsOk === drills ? 'text-green' : 'text-accent'}`}>{drillsOk}/{drills}</span>{' '}
            right. That is the half that makes you produce the German rather than recognise it.
          </p>
        )}
        {comeback && (
          <p className="text-xs text-dim mb-5">
            Comeback of the day: <span className="text-green font-semibold">{comeback.term}</span> — missed {comeback.lapses} times before, yours today.
          </p>
        )}
        <PocketList words={met} />
        {firstRun && newLearned > 0 && (
          <p className="text-base mb-5">These {newLearned} words come back tomorrow — that’s the whole system.</p>
        )}
        {/* Placement, offered here rather than before the session. It used to be
            the first thing a cold learner met — two minutes of being tested by an
            app they had not yet seen work. Asking now costs the same two minutes
            and buys them something they can already picture, and it leads with
            what they just earned rather than with a test. Only shown while there
            is no placement; the same card is offered on every later recap until
            they take it, since there is no briefing page left to nudge from. */}
        {onPlacement && !placementLevel() && (
          <div className="mb-5 text-left border-y border-line py-4">
            <p className="text-sm mb-2.5">
              Those {newLearned > 0 ? newLearned : done} are yours. Two minutes more and Lexi
              skips the words you already know.
            </p>
            <Button size="sm" onClick={onPlacement}>Find my level</Button>
          </div>
        )}
        {/* Local-first means device-bound. These used to live on the daily
            briefing; the recap is the better home for them anyway — it is the one
            moment in the app where the learner has just been reminded that they
            have something worth keeping. */}
        {!firstRun && (
          <div className="text-left mb-4">
            <InstallNudge onBackup={onProfile} />
            <BackupNudge onBackup={onProfile} />
          </div>
        )}
        <div className="flex gap-2.5 justify-center flex-wrap">
          {firstRun
            ? <Button onClick={onDone}>Got it</Button>
            : <Button variant="secondary" onClick={onPick}>Browse the lexicon</Button>}
        </div>
        {/* The pride moment — the market as a designed image, not a cropped
            screenshot. Word-of-mouth is a local-first app’s only channel. */}
        {!firstRun && (
          <button onClick={() => shareProgress()}
            className="mt-3 mx-auto flex items-center gap-1.5 text-xs text-dim hover:text-accent underline underline-offset-2">
            <Share2 size={13} /> Share your progress
          </button>
        )}
      </SessionRecap>
    </div>
  );
}
/** Nothing to study.
 *
 *  This is a real destination now, not a dead end: it is what the app opens into
 *  on the second visit of a day that is already finished. So it is written as an
 *  achievement rather than an absence — "the system holds until tomorrow" is the
 *  true thing to say to somebody who has served every review and spent the whole
 *  new-card budget. */
function EmptyState({ target, scoped, onPick }: { target: Target; scoped: boolean; onPick: () => void }) {
  const t = totals();
  return (
    <div className="grid place-items-center min-h-[440px]">
      <div className="text-center px-8 sm:px-10 py-12 max-w-md">
        <span className="grid place-items-center w-12 h-12 rounded-full mx-auto mb-4" style={{ background: 'var(--color-green-d)' }}>
          <Check size={22} className="text-green" />
        </span>
        <h2 className="text-xl font-bold mb-1.5">
          {scoped ? `Nothing due in ${target.name}` : 'All clear'}
        </h2>
        <p className="text-dim mb-1.5">
          {scoped
            ? 'Every card in this deck is either scheduled ahead or outside the levels you’re studying.'
            : 'Every review served, the new-card budget spent. The system holds until tomorrow.'}
        </p>
        <Kicker className="block mb-6">
          {t.known > 0 ? `${t.known} words recognised · streak safe` : 'streak safe'}
        </Kicker>
        <Button variant="secondary" onClick={onPick}>Browse the lexicon</Button>
      </div>
    </div>
  );
}

