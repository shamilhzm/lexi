// Lesen — sentences you can almost read.
//
// The one thing the app never did: hand the learner German to *understand* rather
// than German to answer. Every sentence here is drawn from the corpus the learner
// is already studying and chosen so that exactly one or two words in it are new —
// close enough that meaning is recoverable, far enough that reading it teaches
// something. See lib/reader.ts.
//
// The unknown words are the only interactive thing on the surface. Everything else
// is text, on purpose: this is the one screen in Lexi that asks nothing of you.
import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Plus, Check } from 'lucide-react';
import { loadDetail, detailLoaded } from '../data/detail.ts';
import { statusOf, levels } from '../store.ts';
import { useStore } from '../useStore.ts';
import { pickReadable, type Readable } from '../lib/reader.ts';
import { SpeakButton, GenderTerm } from './Reveal.tsx';
import Card from './ui/Card.tsx';
import Kicker from './ui/Kicker.tsx';
import type { Target, Word } from '../types.ts';

export default function ReadingList({ onStudy }: { onStudy: (t: Target) => void }) {
  const v = useStore();
  const lv = levels();

  // The index and the scan are the expensive part; recompute only when progress or
  // the level filter actually moves. Keyed on a string rather than the Set, which
  // is a fresh object every render — and hoisted out of the dep list, which only
  // accepts plain identifiers.
  const lvKey = [...lv].sort().join('');

  // Lesen reads `word.ex`, so it has nothing to offer until the detail sidecar
  // lands. Fetch on mount and key the memo on readiness — without the key the
  // first (empty) result would be cached and the accordion would stay empty for
  // the rest of the session. The existing "nothing to read just yet" state covers
  // the gap, and the accordion is click-to-open, so waiting is natural here.
  const [ready, setReady] = useState(detailLoaded);
  useEffect(() => {
    if (ready) return;
    let live = true;
    loadDetail().then(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [ready]);

  const sentences = useMemo(
    () => (!ready ? [] : pickReadable({
      // A word you are *currently* studying is exactly the one you want to meet in
      // a sentence, so "learning" counts as familiar; only never-seen words are new.
      familiar: (w: Word) => statusOf(w.id) !== 'new',
      inScope: (w: Word) => lv.has(w.level),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lvKey stands in for lv
    [v, lvKey, ready],
  );

  if (sentences.length === 0) {
    return (
      <Card tone="sunken" nested pad="none" className="px-5 py-6 text-center">
        <p className="text-dim text-xs max-w-[46ch] mx-auto">
          Nothing to read just yet — reading needs a sentence where you know all but a word or
          two. Study a few more cards and this fills up on its own.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-dim text-xs px-1">
        Sentences where you know every word but one. Tap the highlighted word for its meaning.
      </p>
      {sentences.map((s, k) => <Sentence key={`${s.source.id}-${k}`} s={s} onStudy={onStudy} />)}
    </div>
  );
}

function Sentence({ s, onStudy }: { s: Readable; onStudy: (t: Target) => void }) {
  const [shown, setShown] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <Card tone="sunken" nested pad="none" className="px-3.5 py-3">
      <p lang="de" className="text-base leading-relaxed">
        {s.tokens.map((t, i) =>
          t.unknown && t.word ? (
            // The only control in the sentence. A button, not a tooltip: this has
            // to work on a phone, where hover does not exist.
            <button key={i} onClick={() => setShown(shown === t.word!.id ? null : t.word!.id)}
              aria-expanded={shown === t.word.id}
              aria-label={`${t.text} — show meaning`}
              className="text-amber underline decoration-dotted underline-offset-4 hover:brightness-125">
              {t.text}
            </button>
          ) : <span key={i}>{t.text}</span>)}
        {' '}
        <SpeakButton text={s.de} label={`Hear “${s.de}”`} />
      </p>

      {/* The gloss for whichever word was tapped, plus a way to take it into the
          deck — a word met in context is the best possible moment to start it. */}
      {s.unknownWords.filter((w) => w.id === shown).map((w) => (
        <div key={w.id} className="mt-2 pt-2 border-t border-line flex items-baseline gap-2 flex-wrap">
          <GenderTerm term={w.term} gender={w.gender} className="text-sm font-semibold" />
          <span className="text-dim text-sm flex-1 min-w-[8rem]">{w.en}</span>
          <Kicker>{w.level}</Kicker>
          {statusOf(w.id) === 'new' && (
            <button onClick={() => onStudy({ kind: 'custom', name: w.term, ids: [w.id] })}
              className="inline-flex items-center gap-1 text-2xs text-amber hover:underline">
              <Plus size={12} /> Study this
            </button>
          )}
        </div>
      ))}

      {/* The translation is a check, not a crutch, so it stays behind a tap. */}
      {s.en && (
        <div className="mt-1.5">
          {revealed
            ? <p className="text-dim text-xs italic">{s.en}</p>
            : <button onClick={() => setRevealed(true)}
                className="text-2xs text-dim hover:text-amber inline-flex items-center gap-1">
                <Check size={11} /> Check my understanding
              </button>}
        </div>
      )}
    </Card>
  );
}

export { BookOpenText };
