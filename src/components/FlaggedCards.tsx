// The flagged-cards list. Flagging shipped as a one-tap action in the session
// chrome, and then the flags went nowhere the learner could see — which makes the
// gesture feel like shouting into a drawer. This is the other half: what you
// reported, and what happens to it.
//
// It says plainly that the report travels as a file rather than over a network,
// because a solo-maintained corpus has no server to receive it and implying
// otherwise would be a lie the learner only discovers by waiting.
//
// **And now it has a destination** *(2026-09-25, panel review)*. "Send it on"
// named nobody, so every flag stopped here. Each row and the whole list now open a
// prefilled GitHub issue (`lib/report.ts`) — a link the learner follows, so Lexi
// still sends nothing. The file stays, for anyone who would rather hand it over.
//
// The file carries the flags and nothing else. Flags used to ride the full backup,
// which closed the loop for a solo maintainer and not for a class (persona C2
// #53): reporting one bad card meant handing your teacher your entire progress
// history. `corpus:flags` reads both shapes.
import { Flag, X, Send, ExternalLink } from 'lucide-react';
import { flags, unflagCard, exportFlags } from '../store.ts';
import { useStore } from '../useStore.ts';
import Card from './ui/Card.tsx';
import Button, { buttonClass } from './ui/Button.tsx';
import { cardIssueUrl, flagsIssueUrl } from '../lib/report.ts';
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
        wrong. Report them on GitHub — the issue opens filled in, and you see it before
        anything is posted — or save them as a small file that carries the reports and
        nothing else: no progress, no streak, no history.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <a href={flagsIssueUrl(list)} target="_blank" rel="noopener noreferrer"
          className={`${buttonClass('secondary')} no-underline`}>
          <ExternalLink size={14} aria-hidden /> Report on GitHub
        </a>
        <Button variant="secondary" onClick={() => {
          const blob = new Blob([exportFlags()], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `lexi-flags-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        }}><Send size={14} /> Save the report</Button>
      </div>
      <ul className="flex flex-col gap-1">
        {list.slice().reverse().map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 py-1">
            <span className="text-sm truncate" lang="de">{f.term}</span>
            <div className="flex items-center gap-2 shrink-0">
              <Kicker>{new Date(f.at).toLocaleDateString()}</Kicker>
              <a href={cardIssueUrl(f, 'other')} target="_blank" rel="noopener noreferrer"
                aria-label={`Report ${f.term} on GitHub`} title={`Report ${f.term} on GitHub`}
                className="grid place-items-center w-[44px] h-[44px] rounded-md text-dim hover:text-accent transition-colors">
                <ExternalLink size={14} aria-hidden />
              </a>
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
