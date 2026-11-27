// Jetzt — the learner's own moment, as a feed slot *(2026-11-27)*.
//
// The time as a German says it, the day as one compound word, the date as it is
// spoken, and the words people use at this hour. Read off the device's clock and
// time zone, which never leave the device; nothing here is fetched.
//
// **It teaches and never grades**, like a story: no `data-word`, so the dwell
// observer cannot see it and no exposure is recorded. Every word on it is a card,
// and a tap opens that card's entry, where the bookmark is. The one action of its
// own is *save these*, which is the bookmark pressed for each word — the same
// instruction, given once (VISION, *The feed knows what time it is*).
//
// The clock ticks; the words do not. The picks are made once, from the part of the
// day the slot was placed in, so nothing moves under a reading eye when the minute
// turns. `data/jetzt.ts` holds the German, and its test holds the German.
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookmarkPlus, Check } from 'lucide-react';
import { WORDS, LEVELS } from '../data/index.ts';
import {
  momentOf, uhrzeit, uhrzeitFormal, kompositum, datum, nowTerms, seededOrder,
  FOR_THE_HOUR, TAGESZEIT_TERM, type Moment,
} from '../data/jetzt.ts';
import { isSaved, toggleSaved, statusOf, levels } from '../store.ts';
import { useStore } from '../useStore.ts';
import { haptic, genderColor } from '../lib/ui.ts';
import { shownTerm } from '../lib/focus.ts';
import { flyToUeben } from '../lib/flight.ts';
import { InkedArticle } from './Reveal.tsx';
import Kicker from './ui/Kicker.tsx';
import Button from './ui/Button.tsx';
import type { Word } from '../types.ts';

let byTerm: Map<string, Word> | null = null;
let byTermSize = -1;
/** A card by its exact term. Rebuilt when the lexicon grows (a learner's own words). */
export function cardForTerm(term: string): Word | undefined {
  if (!byTerm || byTermSize !== WORDS.length) {
    byTerm = new Map();
    for (const w of WORDS) if (!byTerm.has(w.term)) byTerm.set(w.term, w);
    byTermSize = WORDS.length;
  }
  return byTerm.get(term);
}

/** The device's time zone, for the hemisphere and nothing else. */
function timeZone(): string | undefined {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
}

/** `n` words, two of them for the season (one when `n` is under six) and the rest
 *  for the hour: what the learner does not know yet first, then what is inside
 *  their level filter, in an order that holds for the whole part of the day. The
 *  part of the day itself is left out: the compound above already names it. */
export function pickForMoment(mo: Moment, n = 6): Word[] {
  const shown = new Set([TAGESZEIT_TERM[mo.tageszeit]]);
  const scope = levels();
  const seed = `${mo.month}-${mo.date}-${mo.tageszeit}`;
  const rank = (terms: string[], n: number) => {
    const ws = terms.filter((t) => !shown.has(t)).map(cardForTerm).filter((w): w is Word => !!w);
    const fresh = (w: Word) => Number(statusOf(w.id) !== 'known');
    const inScope = (w: Word) => Number(scope.size === 0 || scope.has(w.level));
    // Then the easier word: a wide filter is usually a beginner's, and *der Kaffee*
    // serves them before *das Nickerchen* does. A learner who knows the easy ones
    // has already sorted them to the back by knowing them.
    const lv = (w: Word) => LEVELS.indexOf(w.level);
    return seededOrder(ws, seed)
      .sort((a, b) => fresh(b) - fresh(a) || inScope(b) - inScope(a) || lv(a) - lv(b))
      .slice(0, n);
  };
  const { hour, season } = nowTerms(mo);
  const s = n >= 6 ? 2 : 1;
  return [...rank(hour, n - s), ...rank(season, s)];
}

/** A screen under 700pt tall: the `short:` variant's own query. Six chips wrap to
 *  three rows at 375pt, and an SE's Safari leaves ~550pt for the slot, so a short
 *  screen gets four words, two rows. Read once at mount, like the picks, so the
 *  number the button says is the number it saves. */
function shortScreen(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(max-height: 700px)').matches;
}

/** The minute, kept current: on the minute, and on return to the app. */
function useMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t = 0;
    const arm = () => { t = window.setTimeout(() => { setNow(new Date()); arm(); }, 60_000 - (Date.now() % 60_000) + 40); };
    arm();
    const back = () => { if (!document.hidden) setNow(new Date()); };
    document.addEventListener('visibilitychange', back);
    return () => { window.clearTimeout(t); document.removeEventListener('visibilitychange', back); };
  }, []);
  return now;
}

export default function JetztSlot({ onOpen, onSaved, onAnnounce }: {
  /** Open a card's entry over the feed. */
  onOpen: (w: Word) => void;
  /** A save happened: the ready slot counts it. */
  onSaved: () => void;
  onAnnounce: (message: string) => void;
}) {
  const v = useStore();
  const tz = useMemo(timeZone, []);
  const now = useMinute();
  const mo = momentOf(now, tz);
  const [placed] = useState(() => momentOf(new Date(), tz));
  const [compact] = useState(shortScreen);
  const [words] = useState(() => pickForMoment(placed, compact ? 4 : 6));
  const chips = useRef<(HTMLButtonElement | null)[]>([]);

  const time = uhrzeit(mo.h, mo.m);
  const komp = kompositum(mo.day, mo.h);
  const dat = datum(mo);
  const hhmm = `${String(mo.h).padStart(2, '0')}:${String(mo.m).padStart(2, '0')}`;
  const unsaved = useMemo(() => words.filter((w) => !isSaved(w.id)), [words, v]);

  const saveAll = () => {
    if (!unsaved.length) return;
    unsaved.forEach((w, k) => {
      toggleSaved(w.id);
      const el = chips.current[words.indexOf(w)];
      if (el) flyToUeben(el, w.term.replace(/^(der|die|das)\s+/, ''), k * 70);
    });
    haptic('grade');
    onAnnounce(`${unsaved.length} ${unsaved.length === 1 ? 'word' : 'words'} for ${FOR_THE_HOUR[placed.tageszeit]} saved. Your next session teaches them.`);
    onSaved();
  };

  return (
    <section aria-labelledby="feed-jetzt"
      className="feed-slot snap-start snap-always h-full flex-shrink-0 w-full flex flex-col items-center justify-safe-center px-6
      pt-[var(--bar-t)] pb-[var(--bar-b)]">
      <div className="w-full max-w-[460px] text-center">
        {/* `block`: inline, a kicker sits in a 24px line box, 11px it never uses. */}
        <Kicker tone="accent" className="block"><span lang="de" translate="no">Jetzt</span> · now</Kicker>

        {/* The sentence a course teaches first, about the minute the learner is in. */}
        <h2 id="feed-jetzt" lang="de" translate="no" className="display text-[2rem] short:text-[1.5rem] leading-[1.08] mt-2 text-balance">{time.de}</h2>
        <p className="text-dim text-base mt-1.5">{time.en}</p>

        <p className="mt-2 font-mono text-2xs text-dim tabular-nums">
          {hhmm} · <span lang="de" translate="no">{uhrzeitFormal(mo.h, mo.m)}</span>
        </p>
        {/* The trap, said once and beside the text: *halb acht* read as 8:30 is the
            commonest misreading of a German clock. */}
        {time.halb && (
          <p className="heft-note mt-4 short:mt-2.5 mx-auto max-w-[34ch] short:max-w-none text-left text-sm leading-snug">
            <b lang="de" translate="no" className="font-semibold">{time.halb.de}</b> is {time.halb.clock}.
            German counts the half towards the next hour.
          </p>
        )}

        {/* The day as one word. The compound takes its last part's article — and at
            night that is *die*, which is the case that shows the rule. */}
        <div className="mt-5 pt-5 short:mt-3 short:pt-3 border-t border-line">
          {komp ? (
            <>
              <p lang="de" translate="no" className="display text-xl leading-tight">Es ist {komp.term.split(' ')[1]}.</p>
              <p className="text-sm text-dim mt-1 text-balance">
                {komp.en}: <span lang="de" translate="no"><InkedArticle term={komp.parts[0]} gender="der" /></span>
                {' + '}<span lang="de" translate="no"><InkedArticle term={komp.parts[1]} gender={komp.gender} /></span>
                {komp.turns
                  ? <>. The last word picks the article: <b lang="de" translate="no" className="font-semibold text-txt"><InkedArticle term={komp.term} gender={komp.gender} /></b>.</>
                  : <>.</>}
              </p>
            </>
          ) : (
            <>
              <p lang="de" translate="no" className="display text-xl leading-tight">Es ist mitten in der Nacht.</p>
              <p className="text-sm text-dim mt-1">It’s the middle of the night.</p>
            </>
          )}
          {/* One aside at a time: while the clock says *halb*, the note about it
              takes the date's room. The date is the same all day; the trap is only
              there for these fifteen minutes. (With both, a 375pt phone overran the
              slot at every *halb* minute, short screen or not.) */}
          {!time.halb && (
            <p className="mt-3 text-sm text-balance">
              <span lang="de" translate="no">{dat.de}</span>
              <span className="text-dim"> Say <i lang="de" translate="no">{dat.spoken}</i>.</span>
            </p>
          )}
        </div>

        {/* What people say at this hour. A tap opens the card; the button saves them
            all for Üben, which is six presses of the bookmark made at once. */}
        {words.length > 0 && (
          <div className="mt-5 pt-5 short:mt-3 short:pt-3 border-t border-line">
            <Kicker className="block">Words for {FOR_THE_HOUR[placed.tageszeit]}</Kicker>
            <p className="mt-3 flex flex-wrap justify-center gap-1.5">
              {words.map((w, k) => (
                <WordChip key={w.id} word={w} saved={isSaved(w.id)} onOpen={onOpen}
                  ref={(el) => { chips.current[k] = el; }} />
              ))}
            </p>
            {/* One height for both states, so the slot does not jump when the
                button becomes the line that says it worked. */}
            <div className="mt-4 short:mt-2 min-h-11 flex items-center justify-center">
              {unsaved.length > 0 ? (
                <Button variant="secondary" size="sm" onClick={saveAll}>
                  <BookmarkPlus size={15} /> Save {unsaved.length === words.length ? `all ${words.length}` : `the other ${unsaved.length}`} for Üben
                </Button>
              ) : (
                <p className="text-sm text-dim inline-flex items-center gap-1.5"><Check size={14} aria-hidden /> All saved. Üben teaches them next.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** A card as a chip: its term with the article in its ink, highlighted once saved.
 *  A button, because it opens the card's entry. */
function WordChip({ word, saved, onOpen, ref }: {
  word: Word; saved: boolean; onOpen: (w: Word) => void;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const m = /^(der|die|das)\s+(.+)$/.exec(word.term);
  const bare = shownTerm(m ? m[2] : word.term);
  return (
    <button ref={ref} type="button" onClick={() => onOpen(word)}
      aria-label={`${word.term}, ${word.en}${saved ? ', saved' : ''}. Open the entry`}
      className="tap-44 inline-flex items-center rounded-full border border-line bg-card px-3 py-1 text-[15px]
        active:bg-panel2 transition-colors">
      <span lang="de" translate="no">
        {m && <span style={{ color: genderColor(word.gender) }}>{m[1]} </span>}
        {saved ? <span className="swash">{bare}</span> : bare}
      </span>
    </button>
  );
}
