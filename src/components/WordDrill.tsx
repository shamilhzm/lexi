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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { review, logAttempt, logMiss } from '../store.ts';
import { Rating } from '../srs.ts';
import { haptic, tick } from '../lib/ui.ts';
import { eligibleModes, gymId, stripArticle, MODE_TAG, MeaningItem, GenderItem, PluralItem, RecallItem, type Mode, type Grade } from '../views/drills.tsx';
import Button from './ui/Button.tsx';
import Kicker from './ui/Kicker.tsx';
import type { Word } from '../types.ts';

type Step = 'meaning' | Mode;

const STEP_LABEL: Record<Step, string> = {
  meaning: 'Meaning',
  gender: 'Article',
  plural: 'Plural',
  recall: 'Recall',
};

/** Every drill a word qualifies for, in the order a teacher would ask them:
 *  recognise it, then its grammatical properties, then produce it. */
export function stepsFor(word: Word): Step[] {
  return ['meaning', ...eligibleModes(word)];
}

export default function WordDrill({ word, onClose }: { word: Word; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const steps = useMemo(() => stepsFor(word), [word.id]);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

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
    tick(ok ? 'good' : 'wrong');
    setRight((r) => r + (ok ? 1 : 0));
    setI((n) => n + 1);
  }, [i, steps, word]);

  const step = steps[i];

  return createPortal(
    // Opaque like `WordDetail`, and for the same reason: this is a layer you
    // *answer*, and four options read over a scrolling feed are four options you
    // read twice.
    <div className="fixed inset-0 z-[200] bg-bg overflow-y-auto sheet-in" role="dialog" aria-modal="true"
      aria-label={`Practise ${word.term}`}>
      <div ref={panel} tabIndex={-1} className="mx-auto w-full max-w-[620px] px-5 pt-4 pb-16 safe-top safe-bottom outline-none">

        <div className="flex items-center gap-3 mb-5">
          <button onClick={onClose} aria-label="Close"
            className="tap-44 grid place-items-center w-11 h-11 rounded-full glass flex-shrink-0
              text-txt active:scale-95 transition">
            <X size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <Kicker className="block">Üben</Kicker>
            {/* **No article, and no gender ink.** The header is the one element
                on screen for the whole run, and the run asks for the article in
                step two — so `die Hose` up here is the answer printed above the
                question, whether or not the *die* is pink. Caught by walking a
                noun through the sheet, not by reading this file. */}
            <span lang="de" className="block text-base font-semibold truncate">{stripArticle(word.term)}</span>
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
            {step === 'meaning' && <MeaningItem key="meaning" word={word} onGrade={grade} />}
            {step === 'gender' && <GenderItem key="gender" word={word} onGrade={grade} />}
            {step === 'plural' && <PluralItem key="plural" word={word} onGrade={grade} />}
            {step === 'recall' && <RecallItem key="recall" word={word} onGrade={grade} />}
          </>
        )}

        {!step && <Done word={word} right={right} of={steps.length} onClose={onClose} />}
      </div>
    </div>,
    document.body,
  );
}

/** The end of the run.
 *
 *  It reports the score and then says the thing the learner cannot see: those
 *  answers went into the schedule, so this word will come back on its own. That
 *  sentence is the entire difference between this and a quiz — and without it a
 *  learner has no reason to think one drill in the feed was worth more than
 *  reading the card. */
function Done({ word, right, of, onClose }: { word: Word; right: number; of: number; onClose: () => void }) {
  const perfect = right === of;
  return (
    <div className="text-center pt-8">
      <div className="grid place-items-center w-14 h-14 rounded-full mx-auto mb-4"
        style={{ background: perfect ? 'var(--color-green-d)' : 'var(--color-panel2)' }}>
        <Check size={24} className={perfect ? 'text-green' : 'text-accent'} />
      </div>
      <p className="text-xl font-bold mb-1">
        {right} of {of} right
      </p>
      <p className="text-dim text-sm max-w-[34ch] mx-auto leading-relaxed mb-7">
        <span lang="de" className="text-txt">{word.term}</span>{' '}
        {perfect
          ? 'is in your schedule now — Üben will bring it back just before you’d have forgotten it.'
          : 'is in your schedule now, and the parts you missed will come back soonest.'}
      </p>
      <Button onClick={onClose}>Back to the feed</Button>
    </div>
  );
}
