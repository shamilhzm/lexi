// Üben, on one word — what the graduation cap on a feed card opens.
//
// ## The gap this closes
//
// The feed's loop was *browse → bookmark → Üben teaches it later*, and "later"
// is the weak link. A learner who stops on a word because it interests them is
// at the single best moment they will ever have for it, and the app's answer was
// to write it on a list. Bookmarking is still the right default — it is the
// honest signal, and it costs one tap and no attention — but a learner who wants
// the word *now* should not have to leave the feed, start a session and wait for
// the scheduler to get round to it.
//
// So: every drill this word qualifies for, back to back, in a sheet over the
// feed. Same items, same FSRS cards, same miss log as a session — this is not a
// practice mode, it is the session, scoped to one word.
//
// ## This grades, and the feed still does not
//
// That is not a contradiction, it is the rule working. `Feed.tsx` refuses to
// write a card because scrolling is not evidence. Answering four questions about
// a word *is* evidence, and it arrives the way every gradeable event in this app
// arrives: a deliberate press with a right and a wrong answer behind it.
//
// ## What "every drill" means, exactly
//
//   meaning   always — grades the word's own card, the one the flip grades
//   gender    nouns
//   plural    nouns with a plural worth asking for
//   recall    only once the word is *known*, which is `eligibleModes`' rule
//
// The list is fixed when the sheet opens rather than recomputed per item. Get the
// meaning right on a new word and its status can move to Learning mid-run; a
// recomputed list would then grow a step underneath the learner, and a run that
// gets longer the better you do is a punishment.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import Layer from './Layer.tsx';
import { loadDetailFor } from '../data/detail.ts';
import { review, logAttempt, logMiss } from '../store.ts';
import { Rating } from '../srs.ts';
import { haptic } from '../lib/ui.ts';
import {
  practiceModes, gymId, stripArticle, prepOf, MODE_TAG,
  MeaningItem, ModeItem,
  type Mode, type Grade,
} from '../views/drills.tsx';
import { inflections } from '../lib/inflections.ts';
import { shownTerm } from '../lib/focus.ts';
import Button from './ui/Button.tsx';
import Kicker from './ui/Kicker.tsx';
import type { Word } from '../types.ts';

type Step = 'meaning' | Mode;

const STEP_LABEL: Record<Step, string> = {
  meaning: 'Meaning',
  reverse: 'Find it',
  cloze: 'In a sentence',
  usage: 'Its sentence',
  gender: 'Article',
  plural: 'Plural',
  conjugate: 'Forms',
  degree: 'Comparative',
  synonym: 'Same meaning',
  prep: 'Preposition',
  recall: 'Recall',
};

/** How many exercises one pass through a word runs.
 *
 *  It used to be "all of them", which for an adverb meant **one** — a single
 *  multiple-choice question, and a poor answer to "practise this word". A run
 *  should be long enough to leave a mark and short enough that dragging left is
 *  never a commitment you regret. */
const RUN = 4;

/** Every exercise a word qualifies for, ranked, cut to a run.
 *
 *  **Recognition first, always.** Meaning leads because a word you cannot pick
 *  out of four is not ready to be conjugated, and the rest follow in the order a
 *  teacher would ask them: find it from the English, see it in a sentence, then
 *  its grammatical properties, then produce it cold.
 *
 *  Within that order the middle is *shuffled per run*, so a word met three times
 *  is not the same three questions three times — the point of a bank is variety,
 *  and a fixed order wastes it. The ends are pinned: `meaning` opens, and
 *  `recall` closes because typing the word from its English is the hardest thing
 *  here and belongs after the run has warmed the learner up. */
export function stepsFor(word: Word, attested: string[] = []): Step[] {
  const all = practiceModes(word, attested);
  const first: Step[] = ['meaning'];
  const last = all.filter((m) => m === 'recall');
  const middle = all.filter((m) => m !== 'recall');
  // Fisher–Yates on a copy: `sort(() => Math.random() - 0.5)` is not a shuffle.
  for (let i = middle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [middle[i], middle[j]] = [middle[j], middle[i]];
  }
  // **Trim the middle, never the ends.** Slicing the assembled list was the
  // first version and it silently dropped `recall` from every well-qualified
  // word — the pinned last element is the first thing a tail slice removes. A
  // rule that says "recall closes the run" has to survive the run being cut.
  const room = Math.max(0, RUN - first.length - last.length);
  return [...first, ...middle.slice(0, room), ...last];
}

/** Steps whose answer **is** the headword. */
const ASKS_FOR_THE_WORD: ReadonlySet<Step> = new Set<Step>(['reverse', 'cloze', 'recall']);

/** What the header may print above the question in front of the learner — or
 *  `null` when anything it could print would be the answer.
 *
 *  The header is the one element on screen for the whole run, so whatever it
 *  shows sits above every question. That has now been wrong three times, each
 *  fixed by removing one field: the article (the run asks for it), the
 *  preposition (the run asks for it), and — unfixed until 2026-11-14 — the word
 *  itself, through the three steps that ask *which word*: "Which word is it? —
 *  without", under a header reading *ohne*. So it is derived from the step now
 *  rather than remembered case by case. */
export function headerTerm(word: Word, steps: readonly Step[], step: Step | undefined): string | null {
  if (step && ASKS_FOR_THE_WORD.has(step)) return null;
  // No article ever: the gender step asks for it, and `die Hose` up here is the
  // answer whether or not the *die* is pink.
  const bare = shownTerm(stripArticle(word.term));
  // …and no preposition in a run that asks which one the word takes.
  return steps.includes('prep') ? prepOf(word)?.head ?? bare : bare;
}

export default function WordDrill({ word, onClose, backLabel = 'Back to the feed' }: {
  word: Word; onClose: () => void;
  /** Where closing lands — the sheet is opened from the feed and from search. */
  backLabel?: string;
}) {
  // The word's examples live in its level's detail shard. Planned before they
  // arrive, the run lost its sentence steps; so the plan waits for them, briefly
  // (a shard that fails, offline, settles too, and the run goes on without).
  const [ready, setReady] = useState(word.ex.length > 0);
  useEffect(() => {
    if (ready) return;
    let live = true;
    void loadDetailFor([word]).finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [word, ready]);
  // Read once, when the sheet opens — `stepsFor` shuffles, so recomputing would
  // reorder the run underneath the learner mid-answer.
  const steps = useMemo(() => (ready ? stepsFor(word, inflections()?.[word.id] ?? []) : []), [word.id, ready]);
  const forms = useMemo(() => inflections()?.[word.id] ?? [], [word.id]);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);

  const grade = useCallback<Grade>((ok, detail) => {
    const step = steps[i];
    if (!step) return;
    if (step === 'meaning') {
      // The flip's own card, and no miss logged — for the same reason the flip
      // logs none. A blind-spot row named "Meaning" would rank a whole session's
      // worth of ordinary forgetting against three specific, drillable faults.
      review(word.id, ok ? Rating.Good : Rating.Again);
    } else {
      review(gymId(step, word), ok ? Rating.Good : Rating.Again);
      logAttempt(MODE_TAG[step]);
      if (!ok) logMiss(MODE_TAG[step], word.term, detail);
    }
    haptic(ok ? 'grade' : 'wrong');
    setRight((r) => r + (ok ? 1 : 0));
    setI((n) => n + 1);
  }, [i, steps, word]);

  const step = steps[i];
  const shown = headerTerm(word, steps, step);

  // A step whose item could not be built (too few distractors for a cloze or a
  // sentence choice) renders nothing. It is passed over, ungraded, rather than
  // leaving the run on an empty card with no Next (2026-11-20).
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (step && step !== 'meaning' && box.current && box.current.childElementCount === 0) setI((n) => n + 1);
  }, [step, i]);

  // **Practice sits to the *right* of the word on the strip.** You reach it by
  // dragging left and you leave it by dragging right — the mirror of the entry,
  // and the reason both feel like the same gesture rather than two rules.
  return (
    <Layer side="right" label={`Practise ${word.term}`} onClose={onClose} arrowBack>
      <div className="pb-16">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onClose} aria-label="Close"
            className="sr-only">Close</button>
          <div className="min-w-0 flex-1">
            <Kicker className="block">Üben</Kicker>
            {/* See `headerTerm`. The line keeps its height when it has nothing it
                may say, so the card below does not move between steps. */}
            <span lang="de" aria-hidden={shown === null} className={`block text-base font-semibold truncate ${shown === null ? 'invisible' : ''}`}>
              {shown ?? '–'}
            </span>
          </div>
          {/* Where you are, as objects rather than "2 / 4" — with four steps at
              most, dots are read at a glance and a fraction is read. */}
          <ol className="flex items-center gap-1.5 flex-shrink-0" aria-label={`Step ${Math.min(i + 1, steps.length)} of ${steps.length}`}>
            {steps.map((s, n) => (
              <li key={s} aria-hidden title={STEP_LABEL[s]}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  n < i ? 'bg-accent' : n === i ? 'bg-txt' : 'bg-line'}`} />
            ))}
          </ol>
        </div>

        {step && (
          <>
            <Kicker className="block text-center mb-2">{STEP_LABEL[step]}</Kicker>
            {/* Keyed on the step so each item mounts fresh — an MC item that
                kept its `picked` state across a step change would render the
                next question already answered. */}
            <div ref={box}>
              {step === 'meaning'
                ? <MeaningItem key="meaning" word={word} onGrade={grade} />
                : <ModeItem key={step} mode={step} word={word} forms={forms} onGrade={grade} />}
            </div>
          </>
        )}

        {ready && !step && <Done word={word} right={right} of={steps.length} onClose={onClose} backLabel={backLabel} />}
      </div>
    </Layer>
  );
}

/** The end of the run.
 *
 *  It reports the score and then says the thing the learner cannot see: those
 *  answers went into the schedule, so this word will come back on its own. That
 *  sentence is the entire difference between this and a quiz — and without it a
 *  learner has no reason to think one drill in the feed was worth more than
 *  reading the card. */
function Done({ word, right, of, onClose, backLabel }: { word: Word; right: number; of: number; onClose: () => void; backLabel: string }) {
  const perfect = right === of;
  return (
    <div className="text-center pt-8">
      <div className="grid place-items-center w-[56px] h-[56px] rounded-full mx-auto mb-4"
        style={{ background: perfect ? 'var(--color-green-d)' : 'var(--color-panel2)' }}>
        <Check size={24} className={perfect ? 'text-green' : 'text-accent'} />
      </div>
      <p className="text-xl font-bold mb-1">
        {right} of {of} right
      </p>
      <p className="text-dim text-sm max-w-[34ch] mx-auto leading-relaxed mb-7 text-balance">
        <span lang="de" className="text-txt">{shownTerm(word.term)}</span>{' '}
        {perfect
          ? 'is in your schedule now. Üben brings it back just before you’d forget it.'
          : 'is in your schedule now, and the parts you missed will come back soonest.'}
      </p>
      <Button onClick={onClose}>{backLabel}</Button>
    </div>
  );
}
