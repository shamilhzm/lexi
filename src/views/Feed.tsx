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
import { Info, Heart, Bookmark, GraduationCap, Volume2, Play, ChevronDown } from 'lucide-react';
import { BY_ID, WORDS } from '../data/index.ts';
import {
  levels, statusOf, cardOf, buildBriefing, onboarded,
  isSaved, toggleSaved, isFavourite, toggleFavourite,
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
  const out: Word[] = [];
  for (const id of briefing.ids) {
    const w = BY_ID.get(id);
    if (w && !seen.has(id)) { seen.add(id); out.push(w); }
  }
  const rest = WORDS
    .filter((w) => levels().has(w.level) && !seen.has(w.id))
    .sort(byFrequency);
  return out.concat(rest);
}

export default function Feed({ onStartFirstRun }: { onStartFirstRun: () => void }) {
  const v = useStore();
  const lvKey = [...levels()].sort().join('');
  // Rebuilt when the level filter changes, and never on a save: re-ordering the
  // list under a scrolling thumb is the one thing a feed must not do.
  const order = useMemo(() => feedOrder(), [lvKey]);
  const [count, setCount] = useState(PAGE);
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

  const slots = order.slice(0, count);
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
      className="h-full overflow-y-auto snap-y snap-mandatory overscroll-contain no-scrollbar">
      {cold && <Welcome onStart={onStartFirstRun} />}
      {slots.map((w) => (
        <Slot key={w.id} word={w} version={v}
          onInfo={() => setDetail(w)} onDrill={() => setDrill(w)} />
      ))}
      <div ref={sentinel} aria-hidden className="h-px" />
      {count >= order.length && (
        <section className="snap-start h-full flex-shrink-0 grid place-items-center px-8 text-center
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
      {detail && <WordDetail word={detail} onClose={() => setDetail(null)} />}
      {drill && <WordDrill word={drill} onClose={() => setDrill(null)} />}
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
    <section className="snap-start snap-always h-full flex-shrink-0 w-full flex flex-col items-center justify-center px-6
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
function Slot({ word, version, onInfo, onDrill }: {
  word: Word; version: number; onInfo: () => void; onDrill: () => void;
}) {
  // Read through `version` so a save anywhere re-renders the marks.
  const saved = useMemo(() => isSaved(word.id), [word.id, version]);
  const fave = useMemo(() => isFavourite(word.id), [word.id, version]);
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
      className="snap-start snap-always h-full flex-shrink-0 w-full flex flex-col items-center justify-center px-6
        pt-[var(--bar-t)] pb-[var(--bar-b)]"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 100dvh' } as React.CSSProperties}>
      <div className="w-full max-w-[560px] flex flex-col items-center text-center">
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

        {/* Four, and the fourth is the only one that is a *verb*.
            ⓘ opens what Lexi knows, ♡ and 🔖 are marks you leave on the word,
            and the cap is the one control here that does something to you rather
            than to the card — every drill this word qualifies for, now, without
            leaving the feed. It carries the tab bar's own Üben icon on purpose:
            same mark, same idea, one scoped to a word and one to a day.
            `gap-7` rather than `gap-9`: four 44px targets plus three 36px gaps
            overflow a 320px phone, and a control you cannot reach is worse than
            a tighter row. */}
        <div className="mt-8 flex items-center gap-7">
          <Action label={`What else Lexi knows about ${word.term}`} onClick={onInfo}>
            <Info size={24} strokeWidth={1.6} />
          </Action>
          <Action label={fave ? `Remove ${word.term} from favourites` : `Add ${word.term} to favourites`}
            pressed={fave} onClick={() => { toggleFavourite(word.id); haptic('grade'); }}>
            <Heart size={24} strokeWidth={1.6} className={fave ? 'fill-current' : ''} />
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
      </div>
    </section>
  );
}

function Action({ children, label, pressed, onClick }: {
  children: React.ReactNode; label: string; pressed?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={pressed}
      className={`tap-44 grid place-items-center w-11 h-11 rounded-full transition
        active:scale-90 ${pressed ? 'text-accent' : 'text-txt hover:text-accent'}`}>
      {children}
    </button>
  );
}

