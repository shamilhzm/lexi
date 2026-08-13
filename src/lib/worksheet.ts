// Paper.
//
// Six teachers were asked what they actually wanted from Lexi and four of them
// led with the same thing: something they can print. It is the highest-value
// artefact a teacher can be handed and it needs no backend, no accounts, no sync
// and no student data — which makes it the resolution to the contradiction
// CRITIQUE §2 says someone has to pick. *"Your students' data never leaves their
// device"* and *"here is your students' data"* are genuinely incompatible; a
// worksheet is neither. The teacher gets a real artefact and the learner's
// schedule stays where it is.
//
// It is also the only teacher-facing feature that survives every refusal in
// VISION: no dashboard, no login, no collection.
//
// This module is the pure half — it turns a set of cards, a grammar point or a
// learner's own miss log into numbered items with answers. Rendering and the A4
// CSS live in `views/Print.tsx`. Kept apart so the thing that decides *what is on
// the page* can be tested without a DOM.
import type { Word } from '../types.ts';
import type { GPoint } from './grammar.ts';
import type { MissStat } from '../store.ts';

/** One numbered question and its answer. `answer` is what goes in the key. */
export interface SheetItem {
  prompt: string;
  answer: string;
  /** Shown under the prompt as context — an example sentence, a rule reminder.
   *  Never contains the answer. */
  hint?: string;
}

export interface Sheet {
  title: string;
  /** What this sheet is drawn from, in the teacher's words. */
  subtitle: string;
  items: SheetItem[];
  /** Printed under the title. Honest about what a worksheet cannot do. */
  note?: string;
}

const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();

/** Blank the headword out of its own example sentence.
 *
 *  Returns null when the sentence does not contain a form this can safely blank.
 *  A gap-fill whose gap is not actually the target word teaches the wrong thing,
 *  and a sentence that still shows the answer is not a question — so the caller
 *  gets nothing rather than something wrong. Deliberately conservative: only the
 *  exact headword surface, since the app's inflection machinery lives in the
 *  matcher and this module is meant to stay pure. */
export function blankExample(sentence: string, term: string): string | null {
  const bare = stripArticle(term);
  if (!bare || bare.length < 3) return null;
  // German letters are not \w, so the boundary is built by hand — same reason
  // `wholeWordRe` exists in Fundamentals.
  const re = new RegExp(`(^|[^\\p{L}])(${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[^\\p{L}]|$)`, 'iu');
  if (!re.test(sentence)) return null;
  return sentence.replace(re, (_m, pre) => `${pre}__________`);
}

export type VocabDirection = 'de-en' | 'en-de';

/** A vocabulary worksheet.
 *
 *  `en-de` is the harder and more useful direction for homework — it is the one
 *  that makes a learner produce rather than recognise, which is the same argument
 *  the recall drill exists for. Nouns are asked with their article, and the
 *  instruction says so, because a noun without its gender is half-learned. */
export function buildVocabSheet(words: Word[], direction: VocabDirection, limit = 20): Sheet {
  const usable = words.filter((w) => w.kind === 'word' && w.term && w.en);
  const items: SheetItem[] = usable.slice(0, limit).map((w) => (
    direction === 'en-de'
      ? { prompt: w.en, answer: w.term, ...(w.gender ? { hint: 'with the article' } : {}) }
      : { prompt: w.term, answer: w.en }
  ));
  return {
    title: direction === 'en-de' ? 'Vocabulary — English to German' : 'Vocabulary — German to English',
    subtitle: `${items.length} word${items.length === 1 ? '' : 's'}`,
    note: direction === 'en-de'
      ? 'Write the German. For nouns, include der/die/das.'
      : 'Write the English.',
    items,
  };
}

/** A gap-fill sheet built from the cards' own example sentences.
 *
 *  Only cards whose example can be safely blanked are used, so the sheet is
 *  shorter than the deck rather than padded with sentences that give the answer
 *  away. That is the same trade the drill pools make. */
export function buildClozeSheet(words: Word[], limit = 15): Sheet {
  const items: SheetItem[] = [];
  for (const w of words) {
    if (items.length >= limit) break;
    if (w.kind !== 'word') continue;
    const ex = w.ex?.find((e) => e.de && blankExample(e.de, w.term));
    if (!ex) continue;
    const gapped = blankExample(ex.de, w.term);
    if (!gapped) continue;
    items.push({ prompt: gapped, answer: stripArticle(w.term), hint: ex.en || undefined });
  }
  return {
    title: 'Gap-fill',
    subtitle: `${items.length} sentence${items.length === 1 ? '' : 's'}`,
    note: 'Write the missing word. Ignore capitalisation at the start of a sentence.',
    items,
  };
}

/** A grammar worksheet from an authored point.
 *
 *  Only the exercise kinds that survive contact with paper: `choose` and `mc`
 *  become lettered options, `type` becomes a written answer. `order` (drag
 *  tiles) and `error` (tap the wrong word) are deliberately dropped — they are
 *  interactions, and transcribing them produces a question a learner cannot
 *  answer with a pen. A sheet with four good items beats one with nine and three
 *  that make no sense. */
export function buildGrammarSheet(point: GPoint, level: string, limit = 12): Sheet {
  const items: SheetItem[] = [];
  for (const ex of point.exercises ?? []) {
    if (items.length >= limit) break;
    if (ex.kind === 'choose' || ex.kind === 'mc') {
      const opts = ex.options ?? [];
      const idx = ex.answer ?? 0;
      if (!opts.length || !opts[idx]) continue;
      items.push({
        prompt: ex.prompt,
        answer: opts[idx],
        hint: opts.map((o, i) => `${String.fromCharCode(97 + i)}) ${o}`).join('   '),
      });
    } else if (ex.kind === 'type') {
      const a = ex.accept?.[0];
      if (!a) continue;
      items.push({ prompt: ex.prompt, answer: a });
    }
  }
  return {
    title: point.title,
    subtitle: `${level} grammar · ${items.length} item${items.length === 1 ? '' : 's'}`,
    note: point.summary,
    items,
  };
}

/** The learner's own errors, as something to bring to a lesson.
 *
 *  This is the sheet a 1:1 tutor and a university student both asked for, and it
 *  is the only one built from the learner's data — which is exactly why it is
 *  generated on their device and printed by them, never collected. The app has
 *  no way to send it and is not gaining one.
 *
 *  Confusions are included where they exist, because "reaches for den when it
 *  should be Dativ" is the line a teacher can teach to, and the tag alone is not. */
export function buildMissSheet(stats: MissStat[], limit = 20): Sheet {
  const items: SheetItem[] = [];
  for (const s of stats) {
    if (items.length >= limit) break;
    const conf = s.confusions[0];
    const worst = s.terms.slice(0, 3).map((t) => t.term).join(', ');
    items.push({
      prompt: s.tag,
      answer: conf
        ? `reaches for “${conf.chose}” when it should be “${conf.asked}” (${conf.count}×)`
        : `${s.count}× in the last 30 days`,
      ...(worst ? { hint: `on: ${worst}` } : {}),
    });
  }
  return {
    title: 'What I keep getting wrong',
    subtitle: `${items.length} area${items.length === 1 ? '' : 's'} · last 30 days`,
    note: 'Generated on this device. Nothing was sent anywhere — bring it to your lesson.',
    items,
  };
}
