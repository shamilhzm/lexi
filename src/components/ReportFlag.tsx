// "Something wrong with this card?" — the flag, on every surface a word is read.
//
// ## Why it moved and what it does now *(2026-09-25, panel review)*
//
// The flag used to live in one place, the Üben header, and end in one place, a
// file in Profile with nowhere to send it. But the feed is the front door and its
// ⓘ sheet is where a learner reads a gloss most carefully — that is where a wrong
// plural gets noticed, and there was nothing to press.
//
// So this is one component for every word surface (the entry sheet here, and the
// Üben back face can mount the same thing), and a press does two honest things:
//
//   1. **Flags the card on this device**, exactly as the old button did — it joins
//      "Cards you flagged" in Profile and rides the backup, for the learner who
//      will never open GitHub.
//   2. **Offers the report**: one chip per kind of problem, each a plain link to a
//      prefilled GitHub issue (`lib/report.ts`). Following it is the learner's
//      choice and shows them the whole issue before it exists. Lexi sends nothing.
//
// A disclosure rather than a dialog: it opens in place under the entry, so reading
// the card and saying what is wrong with it happen on the same screen.
import { useState } from 'react';
import { Flag, ExternalLink } from 'lucide-react';
import { flagCard, isFlagged, unflagCard } from '../store.ts';
import { useStore } from '../useStore.ts';
import { cardIssueUrl, REPORT_FIELDS } from '../lib/report.ts';
import type { Word } from '../types.ts';

export default function ReportFlag({ word, className = '' }: { word: Pick<Word, 'id' | 'term'>; className?: string }) {
  useStore();
  const flagged = isFlagged(word.id);
  const [open, setOpen] = useState(false);
  const panel = `report-${word.id}`;

  return (
    <div className={`pt-3 mt-3 border-t border-line ${className}`}>
      <button
        onClick={() => { if (!open && !flagged) flagCard(word.id, word.term); setOpen((o) => !o); }}
        aria-expanded={open} aria-controls={panel}
        className={`tap-hit inline-flex items-center gap-1.5 text-2xs transition-colors ${
          flagged ? 'text-accent' : 'text-dim hover:text-accent'}`}>
        <Flag size={12} fill={flagged ? 'currentColor' : 'none'} aria-hidden />
        {flagged ? 'Flagged — report it?' : 'Something wrong with this card?'}
      </button>

      {open && (
        <div id={panel} className="mt-2.5">
          <p className="text-xs text-dim mb-2.5 max-w-[52ch] leading-relaxed">
            Flagged on this device. To tell the maintainer, pick what looks wrong — it opens a
            public GitHub issue with this card filled in, and you see it before anything is posted.
          </p>
          <ul className="flex flex-wrap gap-2" aria-label={`Report a problem with ${word.term}`}>
            {REPORT_FIELDS.map((f) => (
              <li key={f.key}>
                <a href={cardIssueUrl(word, f.key)} target="_blank" rel="noopener noreferrer"
                  className="tap-44 inline-flex items-center gap-1 rounded-full border border-line px-3
                    text-xs text-txt hover:border-accent hover:text-accent transition-colors">
                  {f.label}
                  <ExternalLink size={11} aria-hidden className="text-dim" />
                  <span className="sr-only"> — opens GitHub in a new tab</span>
                </a>
              </li>
            ))}
          </ul>
          <button onClick={() => { unflagCard(word.id); setOpen(false); }}
            className="tap-hit mt-2.5 text-2xs text-dim hover:text-accent underline underline-offset-2">
            Remove the flag
          </button>
        </div>
      )}
    </div>
  );
}
