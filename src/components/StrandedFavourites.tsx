// The favourites list, after the heart that filled it was removed.
//
// Removing the ♡ from the feed was right — it was a second list beside the
// bookmark with no second job, and two adjacent controls meaning "I like this
// one" is a coin flip. Keeping the stored rows was also right: a local-first app
// holds the only copy of what somebody marked, and deleting them because a
// feature moved is the one thing `CLAUDE.md` explicitly forbids.
//
// What was missed is that *both* of those can be true and the learner still ends
// up with six words they marked, silently unreachable, with nothing anywhere
// saying so. Found by driving the `saver` persona: `lexi.faves.v1` held six
// entries and no surface in the app mentioned them.
//
// So this is a *migration*, not a museum. The list is shown once, with one
// action that moves it somewhere that does something — saved words are an
// instruction to the scheduler — and once it is empty this component disappears
// for good. Nobody has to keep a screen for a feature that no longer exists.
import { useState } from 'react';
import { Heart, ArrowRight } from 'lucide-react';
import { favourites, toggleFavourite, isSaved, toggleSaved } from '../store.ts';
import { useStore } from '../useStore.ts';
import { BY_ID } from '../data/index.ts';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';

export default function StrandedFavourites() {
  useStore();
  const [done, setDone] = useState(false);
  const ids = favourites();
  if (!ids.length) return null;

  const words = ids.map((id) => BY_ID.get(id)).filter(Boolean);

  const moveAll = () => {
    for (const id of ids) {
      if (!isSaved(id)) toggleSaved(id);
      toggleFavourite(id);          // clears the stranded list as it goes
    }
    setDone(true);
  };

  return (
    <Card className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <Heart size={16} className="text-accent" aria-hidden />
        <h2 className="text-base font-semibold">Words you hearted</h2>
      </div>
      <p className="text-dim text-xs mb-3 max-w-[52ch]">
        The heart is gone from the feed — it marked words without changing anything, which
        the bookmark already does better. {words.length === 1 ? 'One word is' : `${words.length} words are`}{' '}
        still here. Move {words.length === 1 ? 'it' : 'them'} to your saved words and Üben will
        teach {words.length === 1 ? 'it' : 'them'}.
      </p>
      <ul className="flex flex-wrap gap-1.5 mb-3">
        {words.map((w) => (
          <li key={w!.id} lang="de"
            className="text-xs rounded-full border border-line bg-panel2 px-2.5 py-1">{w!.term}</li>
        ))}
      </ul>
      {done ? null : (
        <Button variant="secondary" onClick={moveAll}>
          <ArrowRight size={14} /> Move to saved words
        </Button>
      )}
    </Card>
  );
}
