// The flagged-cards list. Flagging shipped as a one-tap action in the session
// chrome, and then the flags went nowhere the learner could see — which makes the
// gesture feel like shouting into a drawer. This is the other half: what you
// reported, and what happens to it.
//
// It says plainly that the report travels in the backup file rather than over a
// network, because a solo-maintained corpus has no server to receive it and
// implying otherwise would be a lie the learner only discovers by waiting.
import { Flag, X } from 'lucide-react';
import { flags, unflagCard } from '../store.ts';
import { useStore } from '../useStore.ts';
import Card from './ui/Card.tsx';
import Kicker from './ui/Kicker.tsx';
import IconButton from './ui/IconButton.tsx';

export default function FlaggedCards() {
  useStore();
  const list = flags();
  if (!list.length) return null;

  return (
    <Card className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <Flag size={16} className="text-accent" aria-hidden />
        <h2 className="text-base font-semibold">Cards you flagged</h2>
      </div>
      <p className="text-dim text-xs mb-3 max-w-[52ch]">
        {list.length === 1 ? 'One card' : `${list.length} cards`} you marked as looking
        wrong. They ride along in your backup file — send that to the maintainer and
        they land in the corpus review queue.
      </p>
      <ul className="flex flex-col gap-1">
        {list.slice().reverse().map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 py-1">
            <span className="text-sm truncate" lang="de">{f.term}</span>
            <div className="flex items-center gap-2 shrink-0">
              <Kicker>{new Date(f.at).toLocaleDateString()}</Kicker>
              <IconButton label={`Remove the flag on ${f.term}`} onClick={() => unflagCard(f.id)}>
                <X size={14} />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
