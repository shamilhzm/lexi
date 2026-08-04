// What a level actually means.
//
// Progress in Lexi is a count: 1,240 known. That is the app's own currency and it
// answers a question no learner asked. "Am I B1 yet" is not a number question — a
// B1 certificate is awarded for things you can *do*, and a learner who has never
// seen the descriptors has no way to map a percentage onto them.
//
// These are the CEFR can-do statements, in the Council of Europe's own framing
// ("I can …"), trimmed to the handful per level that a vocabulary trainer is
// actually relevant to. They are shown as *what the level is*, never as a claim
// about the learner: Lexi knows how much of a level's vocabulary you have met, and
// that is emphatically not the same as being able to hold the conversation. Saying
// "you can now describe your daily routine" on the strength of a word count would
// be the most dishonest sentence in the app.
import type { CEFR } from '../types.ts';

export const CAN_DO: Record<CEFR, string[]> = {
  A1: [
    'introduce yourself and ask someone their name, where they live and what they do',
    'order food and drink, and ask what something costs',
    'fill in a form with your name, address and nationality',
    'understand slow, clear speech about family, shopping and immediate surroundings',
  ],
  A2: [
    'describe your family, your job and your daily routine',
    'handle a shop, a doctor’s appointment or a train ticket',
    'talk about what you did at the weekend and what you plan to do',
    'write a short note or message about something that happened',
  ],
  B1: [
    'cope with most situations that come up while travelling',
    'describe experiences, dreams and ambitions, and give reasons for your opinions',
    'follow the main points of clear standard speech on familiar matters',
    'write a connected text about something that interests you',
  ],
  B2: [
    'take an active part in discussion, explaining and defending your views',
    'follow an argument in your own field, and most television news',
    'write clear, detailed text on a wide range of subjects',
    'talk to a native speaker fluently enough that neither of you is straining',
  ],
  C1: [
    'express yourself fluently without obviously searching for words',
    'use the language flexibly for social, academic and professional purposes',
    'understand long, demanding texts and pick up implicit meaning',
    'write about complex subjects with controlled, well-structured prose',
  ],
  C2: [
    'understand virtually everything you hear or read with ease',
    'summarise information from different sources into a coherent account',
    'express yourself precisely, differentiating finer shades of meaning',
    'follow idiom, register and implication as a native speaker would',
  ],
};

/** How the app is allowed to talk about a level's coverage.
 *
 *  Deliberately never says "you can". Vocabulary coverage is a real measurement of
 *  a real thing — and the thing it measures is words met, not competence, so the
 *  copy stops exactly where the evidence does. */
export function coverageNote(pct: number): string {
  if (pct >= 90) return 'You’ve met nearly all of this level’s vocabulary';
  if (pct >= 60) return 'You’ve met most of this level’s vocabulary';
  if (pct >= 25) return 'You’re working through this level’s vocabulary';
  if (pct > 0) return 'You’ve started on this level’s vocabulary';
  return 'You haven’t started this level’s vocabulary yet';
}
