// Cards that are *forms of each other* — the detector, and the ruling on every
// pair it finds.
//
// BACKLOG, the 2026-08-05 quality pass: `corpus:dupes` groups by identical term,
// so it cannot see two cards where one's headword is the other's **inflection**.
// Those survived the 874-group merge and they make the index ambiguous — two cards
// claim the same surface form and `buildMatcher`'s first-wins index picks one, so
// a card's own example can resolve to the other card.
//
// ## Why this file is a ruling table and not a rule
//
// The shape has no mechanical answer. `die Schuhe` is `der Schuh`'s plural filed
// as its own card, which teaches one word twice; `der Westen` is *not* the plural
// of `die Weste`, and `das Reisen` is a nominalised infinitive, not the plural of
// `die Reise`. A first pass reported 46 hits by counting verb infinitives —
// *fragen* is not the plural of *die Frage* — which is why the detector below is
// noun-to-noun only and every survivor carries a written ruling.
//
// The two shapes ruled here:
//
//   **singular/plural** — a plural filed as its own noun. 17 found, 11 merged,
//   6 kept (a plural that has become its own word, or a proper name).
//
//   **gender variant** — one lemma whose article varies by region or register,
//   filed twice. 3 found, 2 merged, 1 kept (`der`/`die Bekannte`, where the two
//   cards are a man and a woman and the glosses say so).
//
// Pure by design: `merge-forms.ts` applies it and `validate.ts` gates on it, so
// nothing here may read a file or touch the corpus at import time.
import { pluralForm } from '../../src/lib/matcher.ts';
import type { Word } from '../../src/types.ts';

const strip = (term: string) => term.replace(/^(der|die|das)\s+/i, '').trim();

export interface FormCollision {
  /** The card whose headword is a form of another card's. */
  form: Word;
  /** The card it is a form of. */
  lemma: Word;
  /** What the detector observed, which is not the same as what the pair *is*.
   *  `plural`: one headword is the other's plural surface form. `article`: the two
   *  headwords are one string with two articles — where an invariant plural lands
   *  (`der`/`die Stiefel`) *and* where a gender variant does (`der`/`das Joghurt`).
   *  Telling those apart is a judgement, so it is the ruling's job, not this
   *  function's. */
  shape: 'plural' | 'article';
}

/** Order-insensitive key for a collision, so a ruling matches however the pair was
 *  discovered. The `article` branch finds each pair from both ends. */
export const pairKey = (a: string, b: string) => [a, b].sort().join('  ×  ');

/**
 * Every pair of **noun** cards where one's headword is the other's plural, or the
 * two differ only by their article.
 *
 * Noun-to-noun only, and that restriction is the finding. German derives nouns
 * from verbs constantly, so *die Frage*'s plural *Fragen* is also the infinitive
 * *fragen*, *die Dusche*'s is *duschen*, *die Regel*'s is *regeln* — 29 such pairs
 * in the corpus today, none of them a duplicate card. Including them is what made
 * the first count of this defect nearly three times too high.
 */
export function findFormCollisions(cards: Word[]): FormCollision[] {
  const nouns = cards.filter((w) => w.kind === 'word' && w.pos === 'noun');
  const byForm = new Map<string, Word[]>();
  for (const w of nouns) {
    const k = strip(w.term).toLowerCase();
    (byForm.get(k) ?? byForm.set(k, []).get(k)!).push(w);
  }

  const out: FormCollision[] = [];
  const seen = new Set<string>();
  const add = (form: Word, lemma: Word, shape: FormCollision['shape']) => {
    const k = pairKey(form.id, lemma.id);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ form, lemma, shape });
  };

  for (const w of nouns) {
    const singular = strip(w.term).toLowerCase();

    // A card whose *term* is this card's plural form. `die Schuhe` against
    // `der Schuh (pl. die Schuhe)`.
    const pl = pluralForm(w.term, w.plural);
    if (pl && pl.toLowerCase() !== singular) {
      for (const other of byForm.get(pl.toLowerCase()) ?? []) if (other.id !== w.id) add(other, w, 'plural');
    }

    // Two nouns differing only by article. This is where an **invariant** plural
    // lands — `der Stiefel` and `die Stiefel` are the same string, so the branch
    // above skips them — and it is also where a gender variant lands, `der`/`das
    // Joghurt`. Both are one word on two cards; which one is a separate question
    // the rulings answer.
    for (const other of byForm.get(singular) ?? []) {
      if (other.id === w.id) continue;
      add(other, w, 'article');
    }
  }
  return out;
}

// ---- the rulings -----------------------------------------------------------

export interface FormRuling {
  /** `merge`: `form` is retired into `lemma`. `keep`: two cards, on purpose. */
  rule: 'merge' | 'keep';
  /** Card id whose headword is the inflection. */
  form: string;
  /** Card id it is a form of — the keeper on a merge. */
  lemma: string;
  /** merge only. The level the keeper ends at: always the lower of the two, so a
   *  merge never takes a word away from the learner who had it. Declared rather
   *  than inferred, because when it differs from the keeper's own level it is an
   *  id change and therefore a schedule migration. */
  level?: string;
  /** merge only. The keeper's gloss after the merge, when the merge should change
   *  it. Written out rather than unioned from the two cards: `merge-dupes.ts` can
   *  union because its groups are one headword twice, but here the retired card is
   *  the *plural* of the keeper, so its gloss is the same sense in another number
   *  and a union yields "shoe; shoes". Only `die Daten` earns a change. */
  gloss?: string;
  /** merge only. Move the retired card's `def` onto the keeper, replacing whatever
   *  it had. Off by default, in both directions: a definition is written about a
   *  headword, so the plural's does not always describe the lemma. */
  takeDef?: true;
  /** merge only. Leave the retired card's synonyms behind — they describe a word
   *  the keeper is not. */
  dropSyn?: true;
  why: string;
}

/**
 * Ruled by hand, 2026-08-15, by reading each pair of cards — gloss, definition and
 * every example. Cumulative: a ruling stays after it is applied, because a merged
 * card is gone and the pair can never be re-derived from the corpus.
 */
export const FORM_RULINGS: FormRuling[] = [
  // ---- shape 1: a plural filed as its own noun -----------------------------
  // Eleven cards teaching a word its singular card already teaches. Each retires
  // into the singular; the keeper absorbs the examples, which are the part worth
  // keeping — `die Schuhe`'s «Zieh die nassen Schuhe an der Tür aus.» is a better
  // sentence than anything lost.
  {
    rule: 'merge', form: 'voc:B1:die Schuhe', lemma: 'voc:A1:der Schuh', level: 'A1',
    why: 'die Schuhe is the plural of der Schuh, which the A1 card already records.',
  },
  {
    rule: 'merge', form: 'voc:B1:die Nudeln', lemma: 'voc:A1:die Nudel', level: 'A1',
    dropSyn: true,
    why: 'die Nudeln is the plural of die Nudel; the B1 card also carried four synonyms '
      + 'for the *verb* nudeln (herunternudeln, durchnudeln, ableiern, ausnudeln), which is '
      + 'a separate word — they are dropped rather than unioned onto a noun.',
  },
  {
    rule: 'merge', form: 'voc:B1:die Socken', lemma: 'voc:A1:die Socke', level: 'A1',
    why: 'die Socken is the plural of die Socke. Both cards say so in their own plural field.',
  },
  {
    rule: 'merge', form: 'voc:A2:die Handschuhe', lemma: 'voc:A1:der Handschuh', level: 'A1',
    why: 'die Handschuhe is the plural of der Handschuh. The A2 copy sits in *Skiing and '
      + 'snowboarding*, which is the sector disagreement corpus:dupes flagged for this word '
      + 'in 2026-08-11; the A1 card is in *Clothing* and stays there.',
  },
  {
    rule: 'merge', form: 'voc:A2:die Muskeln', lemma: 'voc:A2:der Muskel', level: 'A2',
    why: 'die Muskeln is the plural of der Muskel. Same level, so the singular simply absorbs it.',
  },
  {
    rule: 'merge', form: 'voc:A2:die Sandalen', lemma: 'voc:A2:die Sandale', level: 'A2',
    why: 'die Sandalen is the plural of die Sandale.',
  },
  {
    rule: 'merge', form: 'voc:A2:die Stiefel', lemma: 'voc:A2:der Stiefel', level: 'A2',
    why: 'der Stiefel has an invariant plural — die Stiefel — so the two headwords are the '
      + 'same string and differ only by article. Not a gender variant: die is the plural '
      + 'article and the card glosses itself "boots".',
  },
  {
    rule: 'merge', form: 'voc:B2:die Emissionen', lemma: 'voc:B2:die Emission', level: 'B2',
    why: 'die Emissionen is the plural of die Emission (the keeper writes it "-en").',
  },
  {
    rule: 'merge', form: 'voc:A2:die Kenntnisse', lemma: 'voc:B1:die Kenntnis', level: 'A2',
    takeDef: true,
    why: 'die Kenntnisse is the plural of die Kenntnis. The only row here whose keeper sits '
      + '*above* the card being retired, so the keeper moves down to A2 — merging upward would '
      + 'take the word off an A2 learner who has it today, which is the reason relevel-a1.ts '
      + 'demotes nothing. The definition moves in the other direction: the retired card says '
      + '"The things a person knows about a subject." where the keeper says "knowledge; science '
      + '(knowledge gained through study or practice)", which is the enumeration class BACKLOG '
      + 'Now #5 exists to remove. Retiring the card would have thrown away the better one.',
  },
  {
    rule: 'merge', form: 'voc:B2:erneuerbare Energien', lemma: 'voc:B2:die erneuerbare Energie', level: 'B2',
    takeDef: true,
    why: 'The plural of the phrase, filed without an article and with pos=noun/gender=null. '
      + 'Its definition ("Energy from sources that do not run out, like sun and wind.") is a '
      + 'definition of the lemma, not of the plural, so it moves.',
  },
  {
    rule: 'merge', form: 'voc:B1:die Daten', lemma: 'voc:A1:das Datum', level: 'A1',
    gloss: 'date; data',
    why: 'die Daten is the plural of das Datum, and it is the one row here where the sense '
      + 'really does shift with number — so the gloss says both and the learner meets them on '
      + 'one card. The definition does **not** move: "Facts and figures collected for study or '
      + 'reference" defines the plural and would read as the definition of *das Datum*. The '
      + 'keeper is left with none, for the definition programme (BACKLOG Now #5).',
  },

  // ---- shape 2: one lemma, two articles ------------------------------------
  // Found by the same detector and ruled separately, because the question is a
  // different one: not "is this a plural?" but "is the article variation a
  // different word?". Twice it is not, once it is.
  {
    rule: 'merge', form: 'voc:A2:das Joghurt', lemma: 'voc:A1:der Joghurt', level: 'A1',
    why: 'One word. der Joghurt is the standard German form and das Joghurt the Austrian and '
      + 'Swiss one; Duden lists both under a single entry. The two cards carry the same gloss, '
      + 'the same definition and the same plural, so this is a duplicate that survived '
      + 'corpus:dupes only because the article is part of the term.',
  },
  {
    rule: 'merge', form: 'voc:B2:das Burnout', lemma: 'voc:B2:der Burnout', level: 'B2',
    why: 'One word, and gender-audit already ruled der/das both correct (Duden: "der, auch '
      + 'das"). That ruling was about the gender *field* of one card and did not notice there '
      + 'were two, at the same level, with an identical gloss and an identical definition.',
  },
  {
    rule: 'keep', form: 'voc:B1:die Bekannte', lemma: 'voc:B1:der Bekannte',
    why: 'Not one word twice: a nominalised adjective whose article names the referent. The '
      + 'cards gloss themselves "acquaintance (male)" and "acquaintance (female)" and their '
      + 'examples follow — the same pair as der Lehrer / die Lehrerin, which BACKLOG wants '
      + 'more of, not fewer.',
  },

  // ---- kept: a plural that has become its own word -------------------------
  {
    rule: 'keep', form: 'voc:A1:der Westen', lemma: 'voc:A1:die Weste',
    why: 'der Westen is the compass point; die Weste is a waistcoat. Unrelated words that '
      + 'collide only because Weste happens to pluralise to Westen.',
  },
  {
    rule: 'keep', form: 'voc:B1:das Reisen', lemma: 'voc:A2:die Reise',
    why: 'das Reisen is the nominalised infinitive — travelling, the activity — not the '
      + 'plural of die Reise (a trip). Neuter, as every nominalised infinitive is.',
  },
  {
    rule: 'keep', form: 'voc:B1:das Angeln', lemma: 'voc:B1:die Angel',
    why: 'das Angeln is angling, the nominalised infinitive of angeln; die Angeln would be '
      + 'fishing rods. Neuter, again.',
  },
  {
    rule: 'keep', form: 'voc:B1:die Schulden', lemma: 'voc:B1:die Schuld',
    why: 'die Schulden (debts) and die Schuld (guilt, fault) have parted company in meaning. '
      + 'German uses the plural for the money sense and the singular for the moral one; '
      + 'teaching them as one card would teach neither.',
  },
  {
    rule: 'keep', form: 'voc:B1:die Medien', lemma: 'voc:C1:das Medium',
    why: 'die Medien is the press and broadcasting — a B1 word in its own right — while das '
      + 'Medium at C1 is a medium in the technical or spiritualist sense. Same relationship as '
      + 'Schuld/Schulden, and the four-level gap is the evidence.',
  },
  {
    rule: 'keep', form: 'voc:A2:die Alpen', lemma: 'voc:B1:die Alp',
    why: 'die Alpen is a proper name. die Alp is an alpine pasture (and, separately, a '
      + 'nightmare); the mountain range is not its plural in any useful sense.',
  },
];
