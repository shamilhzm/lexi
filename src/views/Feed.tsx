// Wörter — the feed. One German word per screen, scrolled.
//
// ## What this replaced, and why
//
// The app's front door was a flip card: German on the front, meaning hidden
// behind a tap, four grade buttons underneath. That is the right shape for a
// *test* and the wrong shape for a *front door*, because it demands a verdict
// from someone who has not yet decided to study. You opened Lexi and it asked
// you a question.
//
// A feed asks nothing. The word, how to say it, what it means — all present, all
// at once — and the only thing to do is keep scrolling. Meeting a hundred German
// words on a bus is worth something on its own, and it is the thing a person
// will actually do on the days they will not sit a session.
//
// ## The feed does not grade, and that is the whole design
//
// Scrolling produces no evidence about what somebody knows. A feed that quietly
// marked words *seen* would corrupt the schedule with the strongest possible
// signal — "the learner has met this" — inferred from the weakest possible
// event, a thumb moving. So nothing here writes an FSRS card.
//
// What it *can* honestly record is what the learner deliberately did: they
// stopped on a word and pressed something. **Bookmark is the instruction** —
// *teach me this one* — and `buildBriefing` serves saved words at the front of
// the next session. That is the loop: browse freely, save what catches you, and
// Üben teaches you what you chose.
//
// ## The order is not random
//
// The reference app this is modelled on shuffles a word list. Lexi has a
// scheduler, so the feed is ordered by it: what is due first, then unseen words
// from the topics you are thinnest in, then the rest of the level-filtered
// lexicon. Scrolling with your eyes shut still meets the right words in roughly
// the right order — which is the one thing a feed can inherit from a scheduler
// and no amount of content budget can buy.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadDetailFor } from '../data/detail.ts';
import { AnimatePresence, motion, useMotionValue, useTransform, useReducedMotion, animate } from 'motion/react';
import { Info, Bookmark, GraduationCap, Volume2, Play, ChevronDown, X } from 'lucide-react';
import { BY_ID, WORDS } from '../data/index.ts';
import {
  levels, statusOf, cardOf, buildBriefing, onboarded,
  isSaved, toggleSaved, noteExposure, DWELL_MS,
} from '../store.ts';
import { useStore } from '../useStore.ts';
import { byFrequency } from '../lib/freq.ts';
import { speak } from '../lib/tts.ts';
import { haptic, tick, fmt } from '../lib/ui.ts';
import { GenderTerm } from '../components/Reveal.tsx';
import Button from '../components/ui/Button.tsx';
import WordDetail from '../components/WordDetail.tsx';
import WordDrill from '../components/WordDrill.tsx';
import type { Word } from '../types.ts';

/** How many slots exist at once. The feed is unbounded in feel and bounded in
 *  DOM: a hundred 100dvh sections is a hundred layout boxes for one visible
 *  word, and on a phone that is the difference between a feed that glides and
 *  one that stutters on the third flick. Extended as you approach the end, so it
 *  never runs out under you. */
const PAGE = 24;

/** How many words ahead of the learner to fetch examples for. Four is one flick
 *  at the speed the snap scroller allows, so the shard is in hand before the word
 *  is on screen — and small enough that reading the top of the feed never pulls a
 *  level the learner has not reached. */
const LOOKAHEAD = 4;

/** Order the whole in-scope lexicon the way the scheduler would.
 *
 *  Deliberately the *whole* lexicon rather than the day's queue: a queue ends,
 *  and a feed that ends after twenty words is a queue wearing a feed's clothes.
 *  The first slots are the day's briefing — due reviews and the fresh words it
 *  picked — and behind them is everything else, level-filtered, commonest first
 *  within each band. */
export function feedOrder(): Word[] {
  const briefing = buildBriefing();
  const seen = new Set<string>();
  const fresh: Word[] = [];
  const due: Word[] = [];
  // **Fresh words lead; due reviews follow.** *2026-09-05, from persona testing.*
  //
  // The briefing hands back due-first, which is exactly right for Üben and
  // exactly wrong here. Driven as a three-week A1 learner the feed opened on
  // *die Hose, das Hemd, krank* — three cards in a row marked **known**; the
  // learner returning after a month got *besuchen, traurig*, also both known.
  // A browse surface whose first impression is "you already know this" has
  // wasted the one screen that decides whether anyone scrolls.
  //
  // **Due words go last, not second.** Sorting within the briefing was the first
  // attempt and it fixed nothing for the case that needed it most: a learner
  // with a real backlog gets a briefing that is *entirely* due — `want` falls to
  // zero once the due slice already exceeds `MIN_DAILY` — so there were no fresh
  // words in it to promote, and the returning learner still opened on
  // *die Feuerwehr*, marked **known**. Caught on the phone, not in a test.
  //
  // So the order is: the fresh words the scheduler picked, then everything else
  // unseen in scope by frequency, then the due ones. Review belongs to Üben;
  // this surface is for meeting words. The scheduler still chooses *which* fresh
  // words lead, which is the feed's one real advantage over a shuffled list.
  for (const id of briefing.ids) {
    const w = BY_ID.get(id);
    if (!w || seen.has(id)) continue;
    seen.add(id);
    (statusOf(id) === 'new' ? fresh : due).push(w);
  }
  const rest = WORDS
    .filter((w) => levels().has(w.level) && !seen.has(w.id))
    .sort(byFrequency);
  // **The opening word varies, and the ranking survives.**
  //
  // It opened on *so* every single time, which makes a surface whose whole
  // promise is "meet German you have not met" feel like a page. Shuffling the
  // briefing's fresh picks was the first attempt and it fixed nothing for most
  // learners: once the due slice reaches `MIN_DAILY` the briefing's `want` falls
  // to zero, `fresh` comes back **empty**, and the feed opens on `rest[0]` — the
  // single most frequent unseen word in scope, which is the same word forever.
  //
  // So both groups are shuffled, and `rest` is shuffled *within bands*. Twenty
  // words of near-identical corpus frequency are peers; which of them you meet
  // first carries no information, so scrambling inside a band costs nothing.
  // Across bands the ranking is untouched, which is where the recommendation
  // actually lives — you still meet common German before rare German.
  //
  // At build time, not per render: the list is rebuilt when the level filter
  // changes and never on a save, so it cannot reshuffle under a thumb.
  shuffle(fresh);
  for (let i = 0; i < rest.length; i += FREQ_BAND) shuffle(rest, i, Math.min(i + FREQ_BAND, rest.length));
  return [...fresh, ...rest, ...due];
}

/** How many words count as equally common. Small enough that the ranking still
 *  decides what you meet this week, large enough that the first screen is not
 *  the same word twice. */
const FREQ_BAND = 20;

/** Fisher–Yates over a slice, in place. `sort(() => Math.random() - 0.5)` is not
 *  a shuffle — it is a biased mess that happens to move things. */
function shuffle<T>(a: T[], from = 0, to = a.length): void {
  for (let i = to - 1; i > from; i--) {
    const j = from + Math.floor(Math.random() * (i - from + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

export default function Feed({ onStartFirstRun }: { onStartFirstRun: () => void }) {
  const v = useStore();
  const lvKey = [...levels()].sort().join('');
  // Rebuilt when the level filter changes, and never on a save: re-ordering the
  // list under a scrolling thumb is the one thing a feed must not do.
  const order = useMemo(() => feedOrder(), [lvKey]);
  const [count, setCount] = useState(PAGE);
  /** The furthest slot the dwell observer has seen. Declared up here because the
   *  observer effect below writes it; the effect that reads it is further down,
   *  beside the slots it applies to. */
  const [reached, setReached] = useState(0);
  const [detail, setDetail] = useState<Word | null>(null);
  // Two sheets, two pieces of state, and never both at once — reading about a
  // word and being asked about it are opposite activities, and the second one is
  // ruined by the first being open behind it.
  const [drill, setDrill] = useState<Word | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Grow the list before the learner reaches the end of it. An IntersectionObserver
  // on a sentinel rather than a scroll handler: a scroll listener on a snap
  // container fires on every frame of every flick.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setCount((n) => Math.min(order.length, n + PAGE));
      }
    }, { root: scroller.current, rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [order.length]);

  // Back to the top when the scope changes, or the learner is left mid-feed in a
  // list that no longer contains what they were looking at.
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); setCount(PAGE); }, [lvKey]);

  // ---- the dwell gate ------------------------------------------------------
  //
  // **One observer for the whole feed, not one per slot.** Twenty-four
  // IntersectionObservers on a snap scroller is twenty-four callbacks per flick,
  // and the feed's entire performance story is that it stays cheap while a thumb
  // is moving.
  //
  // A word counts as *met* once it has held most of the viewport for `DWELL_MS`.
  // Leaving before then cancels the timer, so flicking through forty words
  // records none of them — which is the point. Without the gate the number would
  // measure thumb speed, and a number that measures the wrong thing is worse
  // than no number.
  //
  // This writes an exposure and nothing else. It does not, and must not, touch
  // `review()`: see the exposure block in `store.ts` for why the separation is
  // the whole design.
  const io = useRef<IntersectionObserver | null>(null);
  const pending = useRef(new Set<HTMLElement>());
  useEffect(() => {
    const timers = new Map<Element, number>();
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.word;
        if (!id) continue;
        if (e.isIntersecting) {
          // How far down the feed the learner has actually got, which is what
          // decides how much detail to fetch. See the `loadDetailFor` effect.
          const at = Number((e.target as HTMLElement).dataset.slot);
          if (Number.isFinite(at)) setReached((n) => Math.max(n, at));
          if (timers.has(e.target)) continue;
          timers.set(e.target, window.setTimeout(() => {
            timers.delete(e.target);
            noteExposure(id);
          }, DWELL_MS));
        } else {
          const t = timers.get(e.target);
          if (t !== undefined) { clearTimeout(t); timers.delete(e.target); }
        }
      }
      // `threshold: 0.6` rather than 1: a slot is exactly one viewport tall, so
      // demanding full intersection means a single pixel of over-scroll — or a
      // browser's own rounding — silently records nothing at all.
    }, { root: scroller.current, threshold: 0.6 });
    io.current = obs;
    // Slots that mounted before this effect ran. The observer cannot exist until
    // the scroller does, and the first page of slots is already on screen by
    // then, so they queue themselves and are picked up here.
    for (const el of pending.current) obs.observe(el);
    pending.current.clear();
    return () => {
      obs.disconnect();
      for (const t of timers.values()) clearTimeout(t);
      io.current = null;
    };
  }, []);

  const watch = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    if (io.current) io.current.observe(el);
    else pending.current.add(el);
  }, []);

  const slots = order.slice(0, count);
  // **The examples for where the learner has got to, plus a few.**
  //
  // Detail ships one file per CEFR level. The naive version of this asked for the
  // whole rendered page, and the whole rendered page is 24 slots — which, ordered
  // by frequency with no placement, spans A1, A2 *and* B1. Measured cold: three
  // shards, 636 KB, before the learner had scrolled past the first word.
  //
  // So it follows the thumb instead. `reached` is the furthest slot the exposure
  // observer has seen, and `LOOKAHEAD` is the margin that keeps an example from
  // popping in after the word it belongs to. A learner who reads five words pays
  // for the levels those five words are in and nothing else.
  useEffect(() => { void loadDetailFor(slots.slice(0, reached + LOOKAHEAD)); }, [slots, reached]);
  // Nobody has been here before. The welcome is the feed's *first slot* rather
  // than a page in front of it: a stranger arriving from a shared link needs the
  // two facts below, and they need them without a door between them and the app.
  // Scroll past it and it is gone.
  const [cold] = useState(() => !onboarded());

  return (
    // Fills the shell rather than covering it. The feed paints no chrome of its
    // own: the app's one bar is above and its one nav is below, and a second row
    // of controls floating over the word would be the density this surface exists
    // to refuse. The day's goal pill lives in `TopBar`, where it can be the only
    // thing in the bar that changes.
    // `h-full`, not `flex-1`: the shell hands the feed a plain block of the right
    // height, not a flex line, so `flex-1` would silently do nothing and every
    // slot would size to its content — which is snap-scrolling with no snap
    // points, i.e. two half-words on screen at once.
    <div ref={scroller}
      className="feed-scroller h-full overflow-y-auto snap-y snap-mandatory overscroll-contain no-scrollbar">
      {cold && <Welcome onStart={onStartFirstRun} />}
      <SwipeHint />
      {slots.map((w, i) => (
        <Slot key={w.id} word={w} at={i} version={v} watch={watch}
          onInfo={() => setDetail(w)} onDrill={() => setDrill(w)} />
      ))}
      <div ref={sentinel} aria-hidden className="h-px" />
      {count >= order.length && (
        <section className="feed-slot snap-start h-full flex-shrink-0 grid place-items-center px-8 text-center
          pt-[var(--bar-t)] pb-[var(--bar-b)]">
          <div>
            <p className="text-lg font-semibold mb-1">That’s every word at these levels.</p>
            <p className="text-dim text-sm max-w-[36ch] mx-auto">
              {order.length.toLocaleString()} of them. Widen the level filter on Fortschritt for
              more — or go and study the ones you saved.
            </p>
          </div>
        </section>
      )}
      {/* Without `AnimatePresence` React removes the node the moment the state
          clears and there is nothing left for the exit spring to animate — which
          is exactly why the panels used to vanish rather than slide away. */}
      <AnimatePresence>
        {detail && <WordDetail key="detail" word={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {drill && <WordDrill key="drill" word={drill} onClose={() => setDrill(null)} />}
      </AnimatePresence>
    </div>
  );
}

/** The feed's two gestures, said once in words.
 *
 *  They were announced to screen readers and to nobody else — an `sr-only` line
 *  per slot, which is correct for assistive tech and invisible to the sighted
 *  learner who has no reason to try dragging a word sideways. A gesture nobody
 *  discovers is a gesture that does not exist.
 *
 *  Floating over the feed rather than occupying a slot, because the feed's whole
 *  premise is one word per screen and this must not become the first thing
 *  anybody meets. Dismissed on the first real swipe or the first tap of the ×,
 *  whichever comes first, and never shown again. */
function SwipeHint() {
  const [show, setShow] = useState(() => {
    try { return localStorage.getItem('lexi.coach.feed.v1') !== '1'; } catch { return false; }
  });
  const dismiss = useCallback(() => {
    try { localStorage.setItem('lexi.coach.feed.v1', '1'); } catch { /* private mode */ }
    setShow(false);
  }, []);
  // Any horizontal drag anywhere in the feed means they have found it.
  useEffect(() => {
    if (!show) return;
    const onDown = (e: PointerEvent) => {
      const x0 = e.clientX;
      const up = (u: PointerEvent) => {
        window.removeEventListener('pointerup', up);
        if (Math.abs(u.clientX - x0) > 60) dismiss();
      };
      window.addEventListener('pointerup', up);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [show, dismiss]);
  if (!show) return null;
  return (
    <div className="feed-coach absolute inset-x-0 z-30 flex justify-center px-4 pointer-events-none"
      style={{ bottom: 'calc(var(--bar-b) + 0.5rem)' }}>
      <div className="glass rounded-full pointer-events-auto flex items-center gap-2 pl-3.5 pr-1.5 py-1.5
        text-2xs text-dim max-w-full">
        <span className="truncate">
          Swipe <b className="text-txt">right</b> for the full entry, <b className="text-txt">left</b> to practise
        </span>
        <button onClick={dismiss} aria-label="Got it"
          className="grid place-items-center w-[28px] h-[28px] rounded-full flex-shrink-0 hover:text-txt">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

/** The first thing anyone ever sees — and it is a slot in the feed, not a page in
 *  front of it.
 *
 *  Two facts a stranger actually asks before they type anything into an app:
 *  what is it, and where does my data go. Then two ways on, because there are
 *  genuinely two: scroll, which costs nothing and commits to nothing, or take the
 *  ten-card session, which is the fastest way to see why the app schedules. */
function Welcome({ onStart }: { onStart: () => void }) {
  return (
    // `.feed-slot` and safe centring, exactly like a word slot. Without the class this
    // kept `height: 100%` at an accessibility size while its own copy grew well past
    // it, so it overflowed its box and painted straight over the first word — which
    // read as a snap-scrolling bug and was a section that had simply been missed.
    <section className="feed-slot snap-start snap-always h-full flex-shrink-0 w-full flex flex-col items-center justify-safe-center px-6
      pt-[var(--bar-t)] pb-[var(--bar-b)]">
      <div className="w-full max-w-[460px] text-center">
        <h1 lang="de" className="display text-4xl sm:text-5xl leading-none mb-2">Guten Tag</h1>
        <p className="text-dim text-sm mb-6">German vocabulary, A1 to C2 — for English speakers.</p>

        <p className="text-base leading-relaxed mb-1">
          {fmt(WORDS.length)} words with pronunciation, meaning and an example. Scroll through them.
        </p>
        <p className="text-dim text-sm leading-relaxed mb-7 max-w-[38ch] mx-auto">
          Bookmark the ones you want, and Üben will teach them back to you just before you’d have
          forgotten — that’s the whole system.
        </p>

        <Button onClick={onStart}><Play size={14} /> Learn ten words now</Button>
        <p className="text-dim text-2xs mt-6 flex items-center justify-center gap-1.5">
          <ChevronDown size={13} aria-hidden /> or just scroll
        </p>
        <p className="text-dim text-2xs mt-6 leading-relaxed max-w-[40ch] mx-auto">
          No account, no sign-in. Your progress is stored on this device only and never leaves it.
          Every gloss and example is in English.
        </p>
      </div>
    </section>
  );
}

/** One word, one screenful.
 *
 *  `content-visibility: auto` on the section is what makes a long list cheap: the
 *  browser skips layout and paint for slots that are nowhere near the viewport,
 *  and `contain-intrinsic-size` keeps the scrollbar honest while it does. */
function Slot({ word, at, version, onInfo, onDrill, watch }: {
  word: Word; version: number; onInfo: () => void; onDrill: () => void;
  /** This slot's position in the feed, published to the DOM so the one observer
   *  can report how far down the learner has got without a closure per slot. */
  at: number;
  /** Hands this slot's section to the feed's single dwell observer. */
  watch: (el: HTMLElement | null) => void;
}) {
  // Read through `version` so a save anywhere re-renders the marks.
  const saved = useMemo(() => isSaved(word.id), [word.id, version]);
  const status = useMemo(() => statusOf(word.id), [word.id, version]);

  const onSave = useCallback(() => {
    const now = toggleSaved(word.id);
    haptic(now ? 'grade' : 'wrong');
    tick(now ? 'good' : 'wrong');
  }, [word.id]);

  return (
    // The slot is the **whole** viewport — the word passes under the glass bars
    // rather than stopping at them, which is the entire reason the material is
    // there. What is *padded* is the flex box inside it, so the word settles in
    // the optical centre of the space the bars leave rather than the geometric
    // centre of the screen (which on a 16 Pro Max sits 12px low, under the tab
    // bar's top edge).
    //
    // A percentage is not a valid `contain-intrinsic-size` — it wants a length —
    // and the browser was quietly dropping it; `auto 100dvh` is the honest
    // placeholder for a slot one viewport tall.
    <section
      ref={watch}
      data-word={word.id}
      data-slot={at}
      // `justify-safe-center` and `overflow-y-auto`, not plain `justify-center`.
      // Centring a column that is taller than its box clips it at **both** ends, so
      // the overflow goes half above the scroll origin where nothing can reach it —
      // the same defect the flip card's front face had, and the reason
      // `.justify-safe-center` exists. At an accessibility text size the slot's
      // content outgrows the viewport (measured: the headword's top goes 213px → 38px
      // → −18px as the root sweeps 16 → 34 → 40), so the word itself slid up behind
      // the header and then off the screen. Safe centring falls back to flex-start
      // the moment it stops fitting, and the slot scrolls from there.
      className="feed-slot snap-start snap-always h-full flex-shrink-0 w-full flex flex-col items-center
        justify-safe-center px-6 pt-[var(--bar-t)] pb-[var(--bar-b)]"
      // `content-visibility` lives in CSS (`.feed-slot`), not here. As an inline style
      // it outranked every stylesheet rule, so the accessibility-size override that
      // has to turn it off could not — and a slot whose real height no longer matches
      // its one-viewport intrinsic hint gets laid out on top of its neighbour. Two
      // words rendered superimposed, which looked like a snap-scrolling bug and was a
      // specificity one.
      >
      <Swipeable onRight={onInfo} onLeft={onDrill} term={word.term}>
        {/* Where this word stands, said quietly and only when it says something.
            A learner scrolling their own lexicon should be able to see the ones
            they have already got without a badge on every single card. */}
        <span className="h-5 mb-2 flex items-center">
          {status !== 'new' && (
            <span className={`text-2xs font-mono uppercase tracking-widest ${
              status === 'known' ? 'text-green' : 'text-accent'}`}>
              {status === 'known' ? 'known' : 'learning'}
            </span>
          )}
        </span>

        {/* The headword. `lang="de"` and gender ink on the article — the single
            most useful mark on a German card, and the reason this is not just a
            big word in a serif. */}
        <GenderTerm term={word.term} gender={word.gender}
          className="headword font-bold leading-[1.05] break-words text-[2.75rem] sm:text-6xl" />

        {/* Pronunciation, as a pill you can press. The whole pill is the target,
            not a 24px speaker beside it. */}
        <button onClick={() => speak(word.term)}
          aria-label={`Hear ${word.term} in German`}
          className="tap-44 mt-4 inline-flex items-center gap-2 rounded-full glass
            px-4 py-2 hover:brightness-[.98] active:scale-95 transition">
          {word.ipa && <span className="font-mono text-sm text-dim">{word.ipa}</span>}
          <Volume2 size={16} className="text-accent flex-shrink-0" />
        </button>

        {/* The meaning, present rather than hidden. This is the line the flip
            card kept behind a tap; on a feed there is nothing to test, so there
            is nothing to hide. */}
        <p className="mt-5 text-lg sm:text-xl leading-snug max-w-[30ch]">
          <span className="text-dim">({word.pos})</span> {word.en}
        </p>

        {/* One example, the way a dictionary sets it. The feed earns its scroll
            on this line: a word with a sentence under it is a word you have met,
            and one without is a word you have looked at. */}
        {word.ex[0]?.de && (
          <p lang="de" className="mt-3 text-sm text-dim italic leading-relaxed max-w-[36ch]">
            {word.ex[0].de}
          </p>
        )}

        {/* Three. The heart is gone — *2026-09-05.*
            It was a second list beside the bookmark with no second job: saving a
            word tells the scheduler to teach it, and favouriting it told nobody
            anything. Two adjacent controls that both mean "I like this one", one
            of which changes what the app does and one of which does not, is a
            coin flip the learner has to get right. The stored list survives
            untouched (`lexi.faves.v1`) so nothing anyone marked is lost, and the
            slot it vacated is where a share button goes.

            Of the three left, only the cap is a *verb*. ⓘ opens what Lexi knows,
            🔖 is a mark you leave on the word, and the cap does something to you
            rather than to the card — every drill this word qualifies for, now,
            without leaving the feed. It carries the tab bar's own Üben icon on
            purpose: same mark, same idea, one scoped to a word and one to a day.

            **These stay even though the same three actions are now swipes.** A
            gesture has no name, no focus ring and no screen-reader path; it is an
            accelerant for people who already know what is there, and it cannot be
            the only way to reach anything. */}
        <div className="feed-actions mt-8 flex items-center gap-8">
          <Action label={`What else Lexi knows about ${word.term}`} onClick={onInfo}>
            <Info size={24} strokeWidth={1.6} />
          </Action>
          <Action label={saved ? `Stop learning ${word.term}` : `Learn ${word.term} — put it in my next session`}
            pressed={saved} onClick={onSave}>
            <Bookmark size={24} strokeWidth={1.6} className={saved ? 'fill-current' : ''} />
          </Action>
          <Action label={`Practise ${word.term} now — every drill for this word`} onClick={onDrill}>
            <GraduationCap size={24} strokeWidth={1.6} />
          </Action>
        </div>

        {/* Said in words, not only by a filled icon. A bookmark that changes what
            the app teaches you should say so the first time you press it, and a
            colour change alone does not. */}
        <span className="h-5 mt-3 text-2xs text-dim" role="status" aria-live="polite">
          {saved && (cardOf(word.id) ? 'In your sessions' : 'Next session will teach this')}
        </span>
      </Swipeable>
    </section>
  );
}

/** The word, draggable sideways.
 *
 *  ## Why a gesture at all, when the buttons are right there
 *
 *  The feed is a thumb surface. Its whole premise is that meeting German costs
 *  nothing while you are on a bus, and reaching for a 44px target with the hand
 *  that is also holding the phone costs more than it looks. Right for what this
 *  word *is*, left for practising it, up for the next one: the two things you do
 *  most become the same motion as the scrolling you are already doing.
 *
 *  **The buttons stay.** A swipe has no name, no focus ring, no screen-reader
 *  path and no discoverability, so it can accelerate a control and must never
 *  replace one. Everything here is reachable both ways.
 *
 *  ## Living inside a snap scroller
 *
 *  `touch-action: pan-y` is the whole trick: it tells the browser that vertical
 *  belongs to the scroller and horizontal belongs to this element, so the feed
 *  still flicks between words while a sideways drag is being tracked. Paired with
 *  `dragDirectionLock`, a diagonal thumb commits to one axis instead of doing a
 *  little of both.
 *
 *  There are no `dragConstraints`. The card is *not* leaving the screen — it
 *  rubber-bands and springs back, because unlike a session card there is nothing
 *  here to discard: both directions open a sheet over the word you are still on.
 *  Snapping back is the honest animation for that. */
function Swipeable({ children, onLeft, onRight, term }: {
  children: React.ReactNode; onLeft: () => void; onRight: () => void; term: string;
}) {
  const x = useMotionValue(0);
  const reduce = useReducedMotion();
  const info = useTransform(x, [18, SWIPE_PX], [0, 1]);
  const drill = useTransform(x, [-18, -SWIPE_PX], [0, 1]);

  return (
    <motion.div
      // **The whole slot is the handle.** It used to be this column — capped at
      // 560px and only as tall as the word, its gloss and the icon row — so a
      // drag that began in the empty space above the headword or below the
      // buttons hit the section behind and did nothing. On a phone that is most
      // of the screen, and it made a gesture that works feel broken.
      // `h-full` + centring keeps the content exactly where it was.
      // `justify-safe-center`, matching the slot. This is `h-full` of the slot's
      // padded box and centres its own children, so at an accessibility text size it
      // was the layer actually doing the clipping: the slot scrolled, and the word
      // still sat at −6px because *this* box had centred a column taller than itself
      // and spilled it equally out of both ends. Safe centring hands the overflow
      // downward, where the slot's scroller can reach it.
      className="relative w-full h-full flex flex-col items-center justify-safe-center text-center touch-pan-y"
      style={{ x }}
      drag="x"
      dragDirectionLock
      dragElastic={0.5}
      onDragEnd={(_, { offset, velocity }) => {
        // A flick is short and fast; a drag is long and slow. Accepting either
        // means the gesture works for the person who nudges deliberately and the
        // person who flicks without looking, which on a feed is most people.
        const flick = Math.abs(velocity.x) > 460 && Math.abs(offset.x) > 32;
        const go = offset.x > SWIPE_PX || (flick && velocity.x > 0) ? onRight
          : offset.x < -SWIPE_PX || (flick && velocity.x < 0) ? onLeft
          : null;
        // Reduced motion kills the spring, not the gesture. Someone who has
        // asked for less movement still wants the swipe to work; what they do
        // not want is the card oscillating back into place.
        animate(x, 0, reduce ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 34, velocity: velocity.x });
        if (go) { haptic('grade'); go(); }
      }}>
      <div className="w-full max-w-[560px] flex flex-col items-center">{children}</div>
      {/* What the direction will do, named while you are still deciding. Both
          sit at the top edge, on the side the thumb is travelling *towards*, so
          the label arrives in front of the movement rather than behind it. */}
      <motion.span aria-hidden style={{ opacity: info }}
        className="absolute -top-2 right-0 flex items-center gap-1.5 text-accent font-semibold text-2xs
          rounded-full border border-accent px-2.5 py-1 pointer-events-none glass">
        <Info size={12} /> Info
      </motion.span>
      <motion.span aria-hidden style={{ opacity: drill }}
        className="absolute -top-2 left-0 flex items-center gap-1.5 text-accent font-semibold text-2xs
          rounded-full border border-accent px-2.5 py-1 pointer-events-none glass">
        <GraduationCap size={12} /> Üben
      </motion.span>
      {/* The gesture is invisible to anyone who cannot see the drag, so it is
          announced once per card rather than not at all. */}
      <span className="sr-only">
        Swipe right for what Lexi knows about {term}, left to practise it. The
        buttons below do the same.
      </span>
    </motion.div>
  );
}

/** Horizontal travel that commits. Matches the session card's `SWIPE_PX`
 *  deliberately: one number for "a swipe happened", across two surfaces that a
 *  learner does not experience as different apps. */
const SWIPE_PX = 90;

function Action({ children, label, pressed, onClick }: {
  children: React.ReactNode; label: string; pressed?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={pressed}
      className={`tap-44 grid place-items-center w-[44px] h-[44px] rounded-full transition
        active:scale-90 ${pressed ? 'text-accent' : 'text-txt hover:text-accent'}`}>
      {children}
    </button>
  );
}

