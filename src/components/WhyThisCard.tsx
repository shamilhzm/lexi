// "Why am I seeing this?"
//
// The session builder makes five distinct pedagogical decisions per session and
// used to splice every one in silently. Learning „obwohl“ pulls its
// Konzessivsätze exercise into the queue a few cards later; four gender misses
// pull in Artikel & Genus. That is ahead of what the big consumer apps do, and
// the learner had no way to know any of it happened.
//
// One line, only when there is something non-obvious to say. A new card already
// says "New ·" on its face and a review that came due on time needs no
// explanation — silence is the right answer for both, and a caption on every
// single card would become wallpaper within a session.
//
// Where the reason is a *weakness*, the line doubles as the way into the rule,
// reusing the RuleToggle affordance the drills already use.
//
// `whyLine` is pure and structured rather than returning JSX, so the copy is
// unit-testable and there is exactly one source of truth for it.
import { Sparkle, Link2, TrendingDown, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RuleToggle } from './RulePanel.tsx';
import { modeRulePoint } from '../views/Fundamentals.tsx';
import type { SessionReason } from '../session.ts';

/** A review is only worth remarking on once it has genuinely been waiting. */
export const STALE_DAYS = 7;

export interface WhyLine {
  icon: LucideIcon;
  lead: string;
  /** The emphasised span — a German term or a weakness label. */
  em?: string;
  tail?: string;
  /** German terms need marking so a screen reader doesn't read them as English. */
  emLang?: 'de';
  /** When present, the line offers the rule behind the weakness it names. */
  rulePoint?: string | null;
}

/** The one place this copy lives. Returns null when silence is correct. */
export function whyLine(reason: SessionReason): WhyLine | null {
  switch (reason.kind) {
    case 'fresh':
      return null; // the card front already says "New ·"

    case 'due':
      return reason.overdueDays >= STALE_DAYS
        ? { icon: Clock, lead: `Waiting ${reason.overdueDays} days — this one’s overdue` }
        : null;

    case 'drill':
      // The interleave is the whole pedagogy, and it looks like randomness
      // unless you say it out loud.
      return {
        icon: Sparkle,
        lead: 'You flipped ', em: reason.parent.term, emLang: 'de',
        tail: ' a few cards ago — now produce it',
      };

    case 'linked':
      return {
        icon: Link2,
        lead: 'Because you just learned ', em: `„${reason.trigger.term}“`, emLang: 'de',
      };

    case 'remedy':
      return {
        icon: TrendingDown,
        lead: 'You’ve missed ', em: reason.tag, tail: ` ${reason.misses}× this month`,
        rulePoint: modeRulePoint(reason.mode),
      };

    case 'blindspot':
      return {
        icon: TrendingDown,
        lead: 'A weak spot — ', em: reason.tag, tail: `, missed ${reason.misses}×`,
        rulePoint: modeRulePoint(reason.mode),
      };

    case 'orphan':
      return reason.overdueDays >= STALE_DAYS
        ? { icon: Clock, lead: `This drill has been waiting ${reason.overdueDays} days` }
        : null;
  }
}

export default function WhyThisCard({ reason }: { reason?: SessionReason }) {
  const line = reason ? whyLine(reason) : null;
  if (!line) return null;
  const Icon = line.icon;

  return (
    <div className="w-full max-w-[580px] mb-2.5 flex flex-col items-center gap-1">
      <p className="flex items-start gap-1.5 text-2xs text-dim text-center leading-relaxed">
        <Icon size={12} className="text-amber flex-shrink-0 mt-[0.15rem]" aria-hidden />
        <span>
          {line.lead}
          {line.em && <b lang={line.emLang} className="text-txt font-semibold">{line.em}</b>}
          {line.tail}
        </span>
      </p>
      {/* The line names a weakness; make the name the way to go read about it. */}
      {line.rulePoint && <RuleToggle pointRef={line.rulePoint} label="Read the rule" />}
    </div>
  );
}
