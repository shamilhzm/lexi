// The word, in full — what the ⓘ on a feed card opens.
//
// The feed shows a word, its pronunciation and one line of meaning, and nothing
// else, because a feed that shows everything is a page you scroll rather than a
// word you meet. Everything the corpus knows lives one tap behind it, here.
//
// This is the old flip card's *back face*, extracted. It was the best surface in
// the app and it was reachable only by turning over a card you were being tested
// on; now it is reachable from any word, at any time, without being graded on it.
//
// A sheet rather than a route: you came from a specific word in a specific scroll
// position, and closing this has to put you back exactly there. A route would
// rebuild the feed.
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { valencyOf, valencyLabel } from '../lib/valency.ts';
import { familyOf } from '../lib/family.ts';
import { showsGermanDefs } from '../views/Review.tsx';
import { placementLevel } from '../store.ts';
import { WORDS } from '../data/index.ts';
import { GenderTerm, SpeakButton, RevealBlock, ExampleList, TermList, FalseFriendNote, CardSource } from './Reveal.tsx';
import Kicker from './ui/Kicker.tsx';
import type { Word } from '../types.ts';

export default function WordDetail({ word, onClose }: { word: Word; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes, and focus moves into the sheet so a keyboard user is not left
  // tabbing the feed behind it. `inert` on the rest of the app would be better
  // still; the portal + Escape + initial focus is what this needs to be correct,
  // and the close button is the first focusable thing in here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    // The feed underneath is a scroll container; letting the body scroll behind a
    // full-screen sheet is how you come back to a different word than you left.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const family = familyOf(word, WORDS);
  const valency = valencyOf(word);
  const germanDefs = showsGermanDefs(placementLevel());

  return createPortal(
    // Opaque, not glass — and deliberately. This is the layer you *read*, and
    // iOS 26's own rule is that the floating layer is translucent while the
    // content layer is not. A definition set over a scrolling feed is a
    // definition you read twice. What it takes from the material is the shape:
    // it rises, and it is dismissed by an object rather than a bar.
    <div className="fixed inset-0 z-[200] bg-bg overflow-y-auto sheet-in" role="dialog" aria-modal="true"
      aria-label={`${word.term} — full entry`}>
      <div ref={panel} tabIndex={-1} className="mx-auto w-full max-w-[620px] px-5 pt-4 pb-16 safe-top safe-bottom outline-none">
        <button onClick={onClose} aria-label="Close"
          className="tap-44 grid place-items-center w-11 h-11 rounded-full glass
            text-txt active:scale-95 transition mb-4">
          <X size={20} />
        </button>

        {/* The headword at display size, exactly as the feed showed it — same
            face, same gender ink — so the sheet reads as the same object opened
            rather than as a different page about it. */}
        <div className="text-center">
          <GenderTerm term={word.term} gender={word.gender}
            className="headword font-bold leading-tight break-words text-4xl sm:text-5xl" />
          <div className="mt-3 flex items-center justify-center">
            {word.ipa && (
              <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5">
                <span className="font-mono text-sm text-dim">/{word.ipa}/</span>
                <SpeakButton text={word.term} label={`Hear ${word.term} in German`} />
              </span>
            )}
            {!word.ipa && <SpeakButton text={word.term} label={`Hear ${word.term} in German`} />}
          </div>
          <p className="mt-3.5 text-lg leading-snug">
            <span className="text-dim">({word.pos})</span> {word.en}
          </p>
          <Kicker className="block mt-2">{word.level} · {word.field}</Kicker>
        </div>

        <div className="mt-6 text-left">
          {word.plural && (
            <RevealBlock label="Plural">
              <p lang="de" className="text-txt text-sm">{word.plural}</p>
            </RevealBlock>
          )}
          {word.def && (
            <RevealBlock label="Definition">
              <p className="text-txt text-sm leading-relaxed whitespace-pre-line">{word.def}</p>
            </RevealBlock>
          )}
          {/* The monolingual layer. Everything else here is de→en; at B2 the useful
              question stops being "what is this in English" and becomes "how would
              a German explain it". Gated on the *learner's* level, not the card's. */}
          {word.defDe && germanDefs && (
            <RevealBlock label="Auf Deutsch">
              <p lang="de" className="text-txt text-sm leading-relaxed">{word.defDe}</p>
            </RevealBlock>
          )}
          <FalseFriendNote term={word.term} />
          {/* Government, where the card carries it. A learner who knows *warten*
              and not *warten auf + Akkusativ* cannot build the sentence. Never
              shows a case it had to guess — see lib/valency.ts. */}
          {valency && (
            <RevealBlock label="Takes">
              <p lang="de" className="text-sm text-accent font-mono">{valencyLabel(valency)}</p>
            </RevealBlock>
          )}
          {word.ex.length > 0 && (
            <RevealBlock label="Examples"><ExampleList items={word.ex} max={4} /></RevealBlock>
          )}
          {(word.syn.length > 0 || word.ant.length > 0) && (
            <RevealBlock className="space-y-1.5">
              <TermList label="Syn" terms={word.syn} />
              <TermList label="Opp" terms={word.ant} tone="red" />
            </RevealBlock>
          )}
          {/* The word family. nehmen / annehmen / benehmen / unternehmen is one
              system told as separate cards; at this level the prefix is the lesson.
              Derived, verbs only — see lib/family.ts for why nouns are excluded. */}
          {family.length > 0 && (
            <RevealBlock className="space-y-1.5">
              <TermList label="Family" terms={family} />
            </RevealBlock>
          )}
          <CardSource id={word.id} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
