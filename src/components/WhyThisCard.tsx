// "Why am I seeing this?"
//
// The session builder makes several decisions per queue and used to splice every
// one in silently. A word you flipped four cards ago coming back as "type it in
// German" is not randomness, and neither is a gender drill on the day you have
// missed four genders — but nothing said so.
//
// One line, only when there is something non-obvious to say. A new card already
// says "New ·" on its face and a review that came due on time needs no
// explanation — silence is the right answer for both, and a caption on every
// single card would become wallpaper within a session.
//
// `whyLine` is pure and structured rather than returning JSX, so the copy is
// unit-testable and there is exactly one source of truth for it.
import { Sparkle, TrendingDown, Clock, BookOpen, Bookmark, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SessionReason } from '../session.ts';
import type { Mode } from '../views/drills.tsx';

/** A review is only worth remarking on once it has genuinely been waiting. */
export const STALE_DAYS = 7;

/** What each drill actually asks of the learner, said in the caption above it. */
const DRILL_TAIL: Record<Mode, string> = {
  gender: 'now the article',
  plural: 'now the plural',
  recall: 'now produce it',
  reverse: 'now find it from the English',
  cloze: 'now in a sentence',
  usage: 'now find its sentence',
  conjugate: 'now its forms',
  degree: 'now its comparative',
  synonym: 'now what else says it',
};

export interface WhyLine {
  icon: LucideIcon;
  lead: string;
  /** The emphasised span — a German term or a weakness label. */
  em?: string;
  tail?: string;
  /** German terms need marking so a screen reader doesn't read them as English. */
  emLang?: 'de';
}

/** The one place this copy lives. Returns null when silence is correct. */
export function whyLine(reason: SessionReason): WhyLine | null {
  switch (reason.kind) {
    case 'fresh':
      // Which unseen card, and why this one. `New ·` on the card front answers
      // *that* it is new; it cannot answer why this word out of six thousand, and
      // for two of the three causes the answer is something the learner did.
      //
      // The dwell line is the one that matters most and is phrased the most
      // carefully. It reports an observation — *you stopped on this* — and never
      // an inference about knowing or wanting, because the observation is all the
      // app has. Saying it out loud is also the only thing that makes the guess
      // falsifiable by the one person who can falsify it.
      if (reason.via === 'saved') {
        return { icon: Bookmark, lead: 'You saved this one' };
      }
      if (reason.via === 'dwell') {
        return { icon: Eye, lead: 'You kept stopping on this in the feed' };
      }
      return null; // nothing to add: the card front already says "New ·"

    case 'due':
      return reason.overdueDays >= STALE_DAYS
        ? { icon: Clock, lead: `Waiting ${reason.overdueDays} days — this one’s overdue` }
        : null;

    case 'drill':
      // The interleave is the whole pedagogy, and it looks like randomness unless
      // you say it out loud.
      //
      // The tail is per-mode, because "now produce it" was written for the recall
      // drill and then said on all of them. On a Diktat it is simply false — you
      // are spelling a sentence you just heard, not producing a word from its
      // meaning — and on a gender item it describes something the item does not
      // ask for. A caption that misdescribes the exercise under it is worse than
      // no caption.
      return {
        icon: Sparkle,
        lead: 'You flipped ', em: reason.parent.term, emLang: 'de',
        tail: ` a few cards ago — ${DRILL_TAIL[reason.mode]}`,
      };

    case 'blindspot':
      return {
        icon: TrendingDown,
        lead: 'A weak spot — ', em: reason.tag, tail: `, missed ${reason.misses}×`,
      };

    case 'orphan':
      return reason.overdueDays >= STALE_DAYS
        ? { icon: Clock, lead: `This drill has been waiting ${reason.overdueDays} days` }
        : null;

    case 'unlock':
      // The scheduler shows its work here too. This is the one reason the learner
      // chose themselves, so it names their own text rather than a Lexi concept.
      return {
        icon: BookOpen,
        lead: 'Because you want to read ', em: `„${reason.text}“`,
      };
  }
}

export default function WhyThisCard({ reason }: { reason?: SessionReason }) {
  const line = reason ? whyLine(reason) : null;
  if (!line) return null;
  const Icon = line.icon;

  return (
    <div className="w-full max-w-[580px] mb-2.5 flex flex-col items-center gap-1">
      <p className="flex items-start gap-1.5 text-2xs text-dim text-center leading-relaxed">
        <Icon size={12} className="text-accent flex-shrink-0 mt-[0.15rem]" aria-hidden />
        <span>
          {line.lead}
          {line.em && <b lang={line.emLang} className="text-txt font-semibold">{line.em}</b>}
          {line.tail}
        </span>
      </p>
    </div>
  );
}
