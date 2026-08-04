// The flagged-cards list. Flagging shipped as a one-tap action in the session
// chrome, and then the flags went nowhere the learner could see — which makes the
// gesture feel like shouting into a drawer. This is the other half: what you
// reported, and what happens to it.
//
// It says plainly that the report travels as a file rather than over a network,
// because a solo-maintained corpus has no server to receive it and implying
// otherwise would be a lie the learner only discovers by waiting.
//
// The file carries the flags and nothing else. Flags used to ride the full backup,
// which closed the loop for a solo maintainer and not for a class (persona C2
// #53): reporting one bad card meant handing your teacher your entire progress
// history. `corpus:flags` reads both shapes.
import { Flag, X, Send } from 'lucide-react';
import { flags, unflagCard, exportFlags } from '../store.ts';
import { useStore } from '../useStore.ts';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
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
        wrong. Save them as a small file and send it on — it carries the reports and
        nothing else: no progress, no streak, no history.
      </p>
      <Button variant="secondary" className="mb-3" onClick={() => {
        const blob = new Blob([exportFlags()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `lexi-flags-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      }}><Send size={14} /> Save the report</Button>
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
