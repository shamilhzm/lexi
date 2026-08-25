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
import { government, pluralForm } from '../../src/lib/matcher.ts';
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
  shape: 'plural' | 'article' | 'reflexive' | 'governed';
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

  // ---- shape 3: a verb carded both plain and reflexive ---------------------
  //
  // Added 2026-08-25, the third of the shapes BACKLOG left open. Unlike the two
  // above, neither headword is an *inflection* of the other — they differ by a
  // pronoun — so this branch does not go through `byForm`.
  //
  // **The detector deliberately has no opinion, because this shape is the one
  // where a mechanical answer would be most wrong.** Most of these pairs are two
  // genuinely different verbs — `vorstellen` introduces somebody and `sich
  // vorstellen` introduces yourself or imagines; `unterhalten` maintains and `sich
  // unterhalten` chats; `verabschieden` passes a law. Merging those would delete
  // real vocabulary. A minority are one verb filed twice, and the tell is that the
  // plain card's own gloss and examples are reflexive: `beschweren` glossed "to
  // complain" (the plain verb means to weigh down) illustrated with «Er hat **sich**
  // … beschwert». Every pair carries a written ruling below.
  const verbs = cards.filter((w) => w.kind === 'word' && w.pos === 'verb');
  const byTerm = new Map<string, Word>();
  for (const w of verbs) if (!byTerm.has(w.term.toLowerCase())) byTerm.set(w.term.toLowerCase(), w);
  for (const w of verbs) {
    const t = w.term.toLowerCase();
    if (!t.startsWith('sich ')) continue;
    const plain = byTerm.get(t.slice(5));
    if (plain) add(plain, w, 'reflexive');
  }

  // ---- shape 4: a verb and its governed twin -------------------------------
  //
  // Added 2026-08-25. The corpus writes a verb's fixed preposition into the
  // headword on purpose — `warten auf + A` — which is the right call, because the
  // preposition is the fact a learner has to memorise and it cannot be derived.
  // The side effect is that `corpus:dupes` and every shape above are blind to it:
  // `beitragen` and `beitragen zu + D` are two different strings carrying one
  // verb, and they shipped with the *same example sentence*.
  //
  // Found because it has a second cost the others do not. `buildMatcher` keeps
  // governed verbs in their own `patIndex`, out of the plain index — deliberately,
  // so a bare «Ich warte» cannot credit the learner with a pattern they have not
  // met — but the pattern card still claims the forms it does index. The plain
  // card is then unillustratable: every example written for `voc:B1:erinnern` was
  // refused by the authoring gate because the matcher attributed the token to
  // `sich erinnern an + A`.
  //
  // As with the reflexive shape, a majority are two real senses — `bestehen` (pass
  // an exam) against `bestehen aus` (consist of), `gehören` (belong to somebody)
  // against `gehören zu` (be one of).
  const lemmaOf = (w: Word) => (government(w.term)?.lemma ?? w.term).toLowerCase().trim();
  const byLemma = new Map<string, Word[]>();
  for (const w of verbs) {
    const k = lemmaOf(w);
    (byLemma.get(k) ?? byLemma.set(k, []).get(k)!).push(w);
  }
  for (const group of byLemma.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) add(group[i], group[j], 'governed');
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
  /** A `keep` that a *later* pass overrode, with the reason it no longer holds.
   *
   *  A keep is only meaningful while both cards exist, so `merge-forms` treats a
   *  dangling one as a stale table and refuses to run — which is right, and which
   *  fired for real on 2026-08-25: `der Bekannte` × `die Bekannte` were ruled two
   *  cards on purpose in August, and the adjectival-noun dedupe later folded both
   *  into the neutral `der/die Bekannte`. The ruling was not wrong when it was
   *  made and the merge was not wrong either; what would be wrong is deleting the
   *  row, because then nobody could see that the question had been asked twice and
   *  answered differently. So it stays, marked, and the checker reads the mark. */
  superseded?: string;
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
    superseded: 'Both cards were folded into voc:A1:der/die Bekannte by the adjectival-noun '
      + 'dedupe. The gendered pair was worth keeping against *one* neutral card that did not '
      + 'exist yet; once the der/die card was the canonical one, three cards for one word was '
      + 'not a distinction, it was three schedules.',
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

  // ---- shape 3: a verb carded both plain and reflexive ---------------------
  //
  // Ruled by hand 2026-08-25, by reading both cards' gloss, definition and every
  // example. **Seven merges, sixteen keeps** — and the ratio is the finding: this
  // shape looks like the plural one and behaves nothing like it. A plural filed as
  // its own noun is almost always a duplicate; a reflexive filed beside its plain
  // verb is usually two words, because German uses the pronoun to change what the
  // verb *means*, not merely who it acts on.
  //
  // The test that decides a merge: **does the plain verb exist, with that meaning,
  // without the pronoun?** Where the answer is no, the plain card's own gloss and
  // examples give it away — they are reflexive, because that is the only German
  // there was to write.
  {
    rule: 'merge', form: 'voc:B1:aneignen', lemma: 'voc:B2:sich aneignen', level: 'B1',
    why: 'Plain aneignen is not the word: the B1 card is glossed "to appropriate" and then '
      + 'illustrated «Mit Hilfe von Beispielsätzen kann man **sich** eine Sprache schneller '
      + 'aneignen» — acquiring, reflexively. One verb, two schedules, and the pronoun is not '
      + 'optional. Keeper takes B1, the lower level.',
  },
  {
    rule: 'merge', form: 'voc:B1:beschweren', lemma: 'voc:B1:sich beschweren', level: 'B1',
    why: 'Plain beschweren means to weigh something down. The B1 card is glossed "to complain" '
      + 'and illustrated «Er hat **sich** beim Manager über den Lärm beschwert» — so it is the '
      + 'reflexive verb, carded a second time without its pronoun. Same level, straight absorb.',
  },
  {
    rule: 'merge', form: 'voc:B1:bewerben', lemma: 'voc:A2:sich bewerben', level: 'A2',
    why: 'Plain bewerben means to advertise or promote something. The B1 card is glossed "to '
      + 'apply (for)" and its own example is «Sie bewirbt **sich** um die Stelle». Keeper takes '
      + 'A2 — merging upward would take a word off a learner who already has it.',
  },
  {
    rule: 'merge', form: 'voc:B1:erholen', lemma: 'voc:A2:sich erholen', level: 'A2',
    why: 'There is no plain erholen in modern German; the verb is reflexive. The B1 card proves '
      + 'it against itself — «Ich muss **mich** nach der Krankheit erholen».',
  },
  {
    rule: 'merge', form: 'voc:B1:benehmen', lemma: 'voc:B1:sich benehmen', level: 'B1',
    why: 'Plain benehmen survives only in an archaic sense of taking something away. The card '
      + 'glossed "to behave" is the reflexive verb, and its example is the reflexive imperative '
      + '«Benehmt **euch**».',
  },
  {
    rule: 'merge', form: 'voc:A2:ausruhen', lemma: 'voc:A2:sich ausruhen', level: 'A2',
    why: 'Two cards at the same level with the same gloss. Plain ausruhen is heard, but the '
      + 'reflexive is the form dictionaries lemmatise and the one a learner has to produce; '
      + 'the plain card adds a second schedule for the same word and its «Ich kann ausruhen» is '
      + 'the thinner sentence of the two.',
  },
  {
    // The one pair where the *reflexive* card is the stray.
    rule: 'merge', form: 'voc:B1:sich besichtigen', lemma: 'voc:A1:besichtigen', level: 'A1',
    why: 'sich besichtigen is not a verb. Its only example — «Das Museum lässt **sich** in einer '
      + 'Stunde besichtigen» — is lassen + sich + Infinitiv, the passive substitute (C2 point '
      + '„Passiversatzformen“), where the pronoun belongs to *lassen* and not to besichtigen. '
      + 'The card was minted from a construction rather than a lemma.',
  },
  // The sixteen kept. Each is two verbs, and the gloss pair says why.
  {
    rule: 'keep', form: 'voc:A2:vorstellen', lemma: 'voc:A1:sich vorstellen',
    why: 'vorstellen introduces somebody else; sich vorstellen introduces yourself, and also '
      + 'means to imagine. Three senses, and the pronoun is what selects between them.',
  },
  {
    rule: 'keep', form: 'voc:B1:erinnern', lemma: 'voc:A2:sich erinnern',
    why: 'erinnern reminds somebody of something; sich erinnern remembers. Different subjects, '
      + 'different objects. (The B1 card was glossed "to remember", which is the reflexive\'s '
      + 'meaning — fixed separately as a gloss defect, not as a merge.)',
  },
  {
    rule: 'keep', form: 'voc:B1:verletzen', lemma: 'voc:A2:sich verletzen',
    why: 'verletzen injures somebody else, and figuratively breaks a rule or a feeling; sich '
      + 'verletzen is injuring yourself.',
  },
  {
    rule: 'keep', form: 'voc:B1:streiten', lemma: 'voc:A2:sich streiten',
    why: 'Both are current and both are needed: man streitet **über** eine Frage, but man '
      + 'streitet **sich mit** jemandem. The two glosses currently say the same thing, which is '
      + 'a gloss defect on the pair and not a reason to delete one of them.',
  },
  {
    rule: 'keep', form: 'voc:B1:entscheiden', lemma: 'voc:A2:sich entscheiden',
    why: 'etwas entscheiden settles a question; sich entscheiden is making up your own mind. '
      + 'A learner needs both and confuses them constantly.',
  },
  {
    rule: 'keep', form: 'voc:A1:verstehen', lemma: 'voc:A2:sich verstehen',
    why: 'verstehen understands; sich verstehen gets along with somebody. Only the pronoun '
      + 'separates «Ich verstehe dich» from «Wir verstehen uns».',
  },
  {
    rule: 'keep', form: 'voc:B2:aufregen', lemma: 'voc:B1:sich aufregen',
    why: 'aufregen upsets somebody; sich aufregen is getting upset. Transitive against '
      + 'inchoative, the commonest German reflexive pattern.',
  },
  {
    rule: 'keep', form: 'voc:B2:auflösen', lemma: 'voc:B1:sich auflösen',
    why: 'etwas auflösen dissolves or winds something up; sich auflösen is the thing dissolving '
      + 'by itself. Same transitive/inchoative pair.',
  },
  {
    rule: 'keep', form: 'voc:B1:einsetzen', lemma: 'voc:B1:sich einsetzen',
    why: 'einsetzen deploys or inserts something; sich einsetzen für campaigns for a cause. '
      + 'The reflexive has a fixed preposition the plain verb does not take.',
  },
  {
    rule: 'keep', form: 'voc:B1:abstimmen', lemma: 'voc:B2:sich abstimmen',
    why: 'abstimmen votes; sich abstimmen coordinates with somebody. Unrelated in use.',
  },
  {
    rule: 'keep', form: 'voc:B1:anpassen', lemma: 'voc:B2:sich anpassen',
    why: 'etwas anpassen adjusts a thing; sich anpassen adapts yourself to a place or a rule. '
      + 'The second is the word the integration texts use.',
  },
  {
    rule: 'keep', form: 'voc:A1:treffen', lemma: 'voc:A2:sich treffen',
    why: 'jemanden treffen meets somebody, by arrangement or by chance; sich treffen is two '
      + 'people meeting up. Also treffen = to hit a target, which the reflexive never means.',
  },
  {
    rule: 'keep', form: 'voc:B1:unterhalten', lemma: 'voc:B1:sich unterhalten',
    why: 'unterhalten maintains or supports; sich unterhalten holds a conversation. Same level, '
      + 'and still two words.',
  },
  {
    rule: 'keep', form: 'voc:C1:verabschieden', lemma: 'voc:B1:sich verabschieden',
    why: 'ein Gesetz verabschieden passes a law — a C1 word from parliamentary German; sich '
      + 'verabschieden says goodbye. The four-level gap is the evidence.',
  },
  {
    rule: 'keep', form: 'voc:A2:vorbereiten', lemma: 'voc:B1:sich vorbereiten',
    why: 'etwas vorbereiten prepares a thing; sich vorbereiten auf prepares yourself for an '
      + 'exam. Both are ordinary and the plain card\'s example is genuinely transitive.',
  },
  {
    rule: 'keep', form: 'voc:A1:entspannen', lemma: 'voc:B1:sich entspannen',
    why: 'entspannen relaxes something — Muskeln, eine Lage — and is also used intransitively; '
      + 'sich entspannen is a person relaxing. Kept, though the two glosses could separate better.',
  },

  // ---- shape 4: a verb and its governed twin -------------------------------
  //
  // Ruled by hand 2026-08-25. **11 merges, 16 keeps.** The test is the same one
  // the reflexive shape needed: does the plain card teach anything the pattern
  // card does not? Where its own example is already the governed pattern —
  // `beitragen` and `beitragen zu + D` shipped the *identical* sentence — there is
  // one verb on two schedules and the pattern card is the one worth keeping,
  // because the preposition is the fact.
  {
    rule: 'merge', form: 'voc:A2:teilnehmen', lemma: 'voc:A2:teilnehmen an + D', level: 'A2',
    why: 'Both cards carry the identical example «Ich nehme am Kurs teil», which is the governed pattern. The preposition is the fact worth teaching and teilnehmen is not used without it.',
  },
  {
    rule: 'merge', form: 'voc:B1:verzichten', lemma: 'voc:B1:verzichten auf + A', level: 'B1',
    why: 'Same gloss on both, and both examples are «verzichten auf». The plain card teaches nothing the pattern card does not.',
  },
  {
    rule: 'merge', form: 'voc:B1:auswandern aus + D', lemma: 'voc:B1:auswandern', level: 'B1',
    why: 'Here the *pattern* card is the stray: auswandern is complete on its own and takes nach as readily as aus — the plain card\'s own example is «Viele Menschen wanderten nach Amerika aus». Pinning one preposition into the headword would teach a restriction the verb does not have.',
  },
  {
    rule: 'merge', form: 'voc:B2:beitragen', lemma: 'voc:B1:beitragen zu + D', level: 'B1',
    why: 'The same sentence appears on both cards: «Jeder kann zum Umweltschutz beitragen». One verb, two levels, two schedules. Keeper takes B1, the lower.',
  },
  {
    rule: 'merge', form: 'voc:A2:sich erinnern', lemma: 'voc:A2:sich erinnern an + A', level: 'A2',
    why: 'One card twice at one level, with near-identical examples — «Erinnerst du dich noch an unseren ersten Urlaub?» against «Erinnerst du dich an unseren ersten Urlaub?». The an is not optional, so the pattern card is the keeper.',
  },
  {
    rule: 'merge', form: 'voc:A2:nachdenken', lemma: 'voc:A2:nachdenken über + A', level: 'A2',
    why: 'Same verb, same level. «Ich muss nachdenken» is a real sentence, but it is the pattern card\'s verb without its complement rather than a second word, and the pattern card\'s gloss covers both readings.',
  },
  {
    rule: 'merge', form: 'voc:B2:gelangen', lemma: 'voc:B1:gelangen zu + D', level: 'B1',
    why: 'Two glosses saying the same thing about the same verb. Keeper takes B1, the lower level.',
  },
  {
    rule: 'merge', form: 'voc:B2:profitieren', lemma: 'voc:B1:profitieren von + D', level: 'B1',
    why: 'profitieren takes von and nothing else; the B2 card is the same verb with the preposition dropped from the headword.',
  },
  {
    rule: 'merge', form: 'voc:B1:konzentrieren', lemma: 'voc:B1:sich konzentrieren auf + A', level: 'B1',
    why: 'Plain konzentrieren is a chemist\'s word (eine Lösung konzentrieren). The card glossed "to concentrate, to focus" is the reflexive, and its example «Konzentriere dich!» proves it.',
  },
  {
    rule: 'merge', form: 'voc:A2:eignen', lemma: 'voc:B1:sich eignen für + A', level: 'A2',
    why: 'There is no plain eignen in modern German. The A2 card\'s own example is «Würde sich das eignen?». Keeper takes A2, the lower level.',
  },
  {
    rule: 'merge', form: 'voc:A1:füllen in + A', lemma: 'voc:A2:füllen', level: 'A1',
    why: 'The pattern card is the stray again: füllen in is not a fixed government, it is the verb plus an ordinary directional phrase. füllen is the lemma and keeps A1, the lower level.',
  },
  {
    rule: 'keep', form: 'voc:A1:denken', lemma: 'voc:B1:denken an + A',
    why: 'denken introduces a thought — «Ich denke, dass …» — while denken an is directed at a person or a thing. Both are needed. (The A1 card\'s example was the governed pattern and is fixed separately.)',
  },
  {
    rule: 'keep', form: 'voc:A1:warten', lemma: 'voc:B1:warten auf + A',
    why: 'warten alone is intransitive — «Warte kurz!» — and warten auf takes an accusative object. The pattern is the B1 fact; the bare verb is A1. (The A1 example was the pattern and is fixed separately.)',
  },
  {
    rule: 'keep', form: 'voc:A2:vorbereiten', lemma: 'voc:A2:sich vorbereiten auf + A',
    why: 'etwas vorbereiten prepares a thing; sich vorbereiten auf prepares yourself for an event. Transitive against reflexive-plus-preposition.',
  },
  {
    rule: 'keep', form: 'voc:A2:bestehen', lemma: 'voc:B1:bestehen aus + D',
    why: 'eine Prüfung bestehen passes an exam; bestehen aus is what a thing is made of. Unrelated senses that happen to share a lemma.',
  },
  {
    rule: 'keep', form: 'voc:A1:gehören', lemma: 'voc:B1:gehören zu + D',
    why: 'Das Buch gehört mir — ownership, bare dative. Der Wolf gehört zu den Raubtieren — membership, with zu. Different constructions and different meanings.',
  },
  {
    rule: 'keep', form: 'voc:B2:umgehen', lemma: 'voc:B1:umgehen mit + D',
    why: 'umgehen mit handles or deals with something; plain umgehen avoids or bypasses it — and the two even stress differently. Merging them would be the umfahren mistake this file already warns about.',
  },
  {
    rule: 'keep', form: 'voc:A2:orientieren', lemma: 'voc:B1:sich orientieren an + D',
    why: 'sich orientieren finds your bearings; sich orientieren an takes its lead from something — «Der Preis orientiert sich an der Qualität». The preposition changes the meaning, not just the frame.',
  },
  {
    rule: 'keep', form: 'voc:B1:einsetzen', lemma: 'voc:B1:sich einsetzen für + A',
    why: 'einsetzen deploys or inserts; sich einsetzen für campaigns for a cause.',
  },
  {
    rule: 'keep', form: 'voc:A2:rechnen', lemma: 'voc:B1:rechnen mit + D',
    why: 'rechnen calculates; rechnen mit expects. A learner who conflates them writes «Ich rechne mit 12» for arithmetic.',
  },
  {
    rule: 'keep', form: 'voc:A2:abhängen', lemma: 'voc:B1:abhängen von + D',
    why: 'abhängen von depends on; plain abhängen is the colloquial hang out, and also to unhook something. Three senses, and only one takes von.',
  },
  {
    rule: 'keep', form: 'voc:B1:beschäftigen', lemma: 'voc:B1:sich beschäftigen mit + D',
    why: 'jemanden beschäftigen employs or keeps somebody busy; sich beschäftigen mit occupies yourself with a subject.',
  },
  {
    rule: 'keep', form: 'voc:B1:ziehen', lemma: 'voc:B1:ziehen nach + D',
    why: 'ziehen pulls; ziehen nach moves house. The second is idiomatic and unguessable from the first.',
  },
  {
    rule: 'keep', form: 'voc:B1:gelten', lemma: 'voc:B1:gelten als + N',
    why: 'gelten is to be valid; gelten als is to be regarded as. The pattern card also carries a nominative complement, which is rare enough to be worth its own card.',
  },
  {
    rule: 'keep', form: 'voc:B1:erinnern', lemma: 'voc:A2:sich erinnern an + A',
    why: 'erinnern reminds somebody of something; sich erinnern an remembers. Different subjects and different objects — the pair that made this whole shape visible.',
  },
  {
    rule: 'keep', form: 'voc:A1:bitten', lemma: 'voc:A2:bitten um + A',
    why: 'bitten also takes a person plus a zu-infinitive — «Ich bitte dich, kurz zu warten» — which the um-pattern does not cover. (The A1 example was the um-pattern and is fixed separately.)',
  },
  {
    rule: 'keep', form: 'voc:B1:stammen', lemma: 'voc:A2:stammen aus + D',
    why: 'stammen aus is an origin in place or time; stammen von is descent from a person or a source, which is the B1 card\'s sense. Two prepositions, two meanings.',
  },
  {
    rule: 'keep', form: 'voc:B2:verfügen', lemma: 'voc:A2:verfügen über + A',
    why: 'verfügen über has something at your disposal; plain verfügen decrees. (The B2 card\'s example is the über-pattern and is fixed separately.)',
  },
];
