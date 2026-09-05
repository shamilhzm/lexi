// Words you looked up and Lexi didn't have.
//
// The other half of the search box's miss state, for the same reason
// `FlaggedCards` is the other half of the flag button: a one-tap contribution
// that goes somewhere you cannot see is shouting into a drawer.
//
// Ranked by how many times each was asked for, because that is the only ranking
// a maintainer needs and it is the one thing a local log knows that a
// frequency list does not — *this learner*, reading *their* German, reached for
// this word more than once.
//
// The copy never promises the word will be added. `authoring:new` is
// machine-gated: it looks gender, plural, part of speech and IPA up in
// de.wiktionary and refuses anything it cannot verify. So a noted word is a
// candidate, and saying otherwise would be exactly the kind of claim commitment
// 3 forbids.
import { BookmarkPlus, X, Send } from 'lucide-react';
import { wantedWords, unwantWord, exportWanted } from '../store.ts';
import { useStore } from '../useStore.ts';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import Kicker from './ui/Kicker.tsx';
import IconButton from './ui/IconButton.tsx';

export default function WantedWords() {
  useStore();
  const list = [...wantedWords()].sort((a, b) => b.n - a.n || b.at - a.at);
  if (!list.length) return null;

  return (
    <Card className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <BookmarkPlus size={16} className="text-accent" aria-hidden />
        <h2 className="text-base font-semibold">Words Lexi didn’t have</h2>
      </div>
      <p className="text-dim text-xs mb-3 max-w-[52ch]">
        {list.length === 1 ? 'One word' : `${list.length} words`} you looked up and the corpus
        doesn’t carry. Send the list on and it can be checked against a dictionary — the ones
        that verify become cards; the ones that don’t, don’t.
      </p>

      <Button variant="secondary" className="mb-3" onClick={() => {
        const blob = new Blob([exportWanted()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lexi-wanted-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }}>
        <Send size={14} /> Save the list
      </Button>

      <ul className="divide-y divide-line rounded-md border border-line overflow-hidden">
        {list.map((w) => (
          <li key={w.term} className="flex items-center gap-3 px-3 py-2 bg-panel2">
            <span lang="de" className="flex-1 min-w-0 text-sm truncate">{w.term}</span>
            {/* Only once it means something. "1×" on every row is wallpaper. */}
            {w.n > 1 && <Kicker className="flex-shrink-0">{w.n}×</Kicker>}
            <IconButton label={`Remove ${w.term} from the list`} onClick={() => unwantWord(w.term)}>
              <X size={15} />
            </IconButton>
          </li>
        ))}
      </ul>
    </Card>
  );
}
