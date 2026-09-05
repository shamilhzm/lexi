// The words you bookmarked, in one place — the half of the mechanic that was
// missing.
//
// ## Why the bookmark did not feel worth anything
//
// It was doing real work and none of it was observable. Saving a word wrote to
// `lexi.saved.v1`, `buildBriefing` served saved words ahead of the ones it would
// otherwise have picked, and that was the entire loop: the icon filled, a line
// said "next session will teach this", a counter in the bar went up, and then
// the word disappeared into an invisible reordering of a session you had not
// opened yet. `savedWords()` had exactly one caller in the whole app and it was
// inside the store.
//
// A mechanic whose only feedback is a promise about the future is a mechanic
// nobody can evaluate, which is the honest reason it felt like decoration.
//
// So: the list exists, it is one tap from the counter that was already
// advertising it, and it ends in the thing the bookmark was always implicitly
// promising — a session made of exactly these words. That is the justification.
// Bookmarking is *building a reading list you can then sit down with*, and it is
// worth keeping precisely because the drill next to it is not a substitute: the
// cap is "teach me this now", which is the wrong answer on a bus.
import { useMemo } from 'react';
import { X, Play, Bookmark } from 'lucide-react';
import { savedWords, toggleSaved, statusOf, DAILY_SAVE_GOAL, savedToday } from '../store.ts';
import { useStore } from '../useStore.ts';
import { BY_ID } from '../data/index.ts';
import { genderColor, fmt } from '../lib/ui.ts';
import Layer from './Layer.tsx';
import Button from './ui/Button.tsx';
import Chip from './ui/Chip.tsx';
import Kicker from './ui/Kicker.tsx';
import type { Target } from '../types.ts';

export default function SavedWords({ onClose, onStudy }: {
  onClose: () => void;
  onStudy: (t: Target) => void;
}) {
  const v = useStore();
  const words = useMemo(
    () => savedWords().map((id) => BY_ID.get(id)).filter((w): w is NonNullable<typeof w> => !!w),
    [v]);
  const today = savedToday();

  return (
    <Layer side="right" label="Words you saved" back="the feed" onClose={onClose}>
      <div className="pb-16">
        <Kicker className="block mb-0.5">Saved</Kicker>
        <h1 className="display text-3xl mb-1">
          {words.length === 0 ? 'Nothing saved yet' : `${fmt(words.length)} word${words.length === 1 ? '' : 's'}`}
        </h1>

        {words.length === 0 ? (
          <p className="text-dim text-sm leading-relaxed max-w-[38ch] mt-3">
            The bookmark on a word in the feed puts it here. It is the thing to press when a word
            catches you and you have not got time to practise it — Üben teaches saved words before
            anything it would have chosen on its own.
          </p>
        ) : (
          <>
            <p className="text-dim text-xs mb-4">
              Üben serves these before the words it would have picked on its own.
              {today > 0 && <> {today} of them saved today{today >= DAILY_SAVE_GOAL ? ' — past your goal.' : `, ${DAILY_SAVE_GOAL - today} to your goal.`}</>}
            </p>

            <Button onClick={() => { onStudy({ kind: 'custom', name: 'Saved words', ids: words.map((w) => w.id) }); onClose(); }}>
              <Play size={14} /> Practise these {words.length}
            </Button>

            <ul className="-mx-5 mt-5 divide-y divide-line border-y border-line">
              {words.map((w) => (
                <li key={w.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex-1 min-w-0">
                    <span lang="de" className="headword text-base font-semibold break-words"
                      style={{ color: genderColor(w.gender) }}>{w.term}</span>
                    <span className="block text-xs text-dim truncate">{w.en}</span>
                  </span>
                  {statusOf(w.id) !== 'new' && (
                    <Chip tone={statusOf(w.id) === 'known' ? 'good' : undefined}>
                      {statusOf(w.id) === 'known' ? 'known' : 'learning'}
                    </Chip>
                  )}
                  {/* Unsaving is the honest opposite of saving and belongs next to
                      the word, not behind a menu. */}
                  <button onClick={() => toggleSaved(w.id)} aria-label={`Remove ${w.term} from saved`}
                    className="tap-44 grid place-items-center w-9 h-9 rounded-full text-dim hover:text-txt flex-shrink-0">
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-dim text-2xs mt-3 flex items-center gap-1.5">
              <Bookmark size={12} /> Saved words stay on this device and ride your backup.
            </p>
          </>
        )}
      </div>
    </Layer>
  );
}
