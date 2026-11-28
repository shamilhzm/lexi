# Lexi — what we are building, and what we refuse

**The anchor document.** Every other doc in this folder is downstream of this one. When
two docs disagree, this one decides; when this one is wrong, change it here first and
let the others follow.

---

## The goal, in one sentence

**A beautiful, bulletproof, effective, open-source, pedagogically sound app that makes
an English speaker know more German words — built so that a second language pair is an
implementation, not a rewrite.**

That sentence has one clause it did not have before 2026-09-05: **more German words.**
It is the clause that decides everything else.

---

## The 2026-09-05 refocus, and the ruling that did the cutting

Lexi had become five destinations and, behind them, a 140-point grammar syllabus with
its own exercise bank, twelve Goethe/telc certificate papers with a five-surface exam
room, a 3D brain observatory, a typing race, a worksheet printer, a Redemittel bank and
a reading room with its own i+1 sentence feed. Every one of those was well built, and
several were genuinely ahead of what the big consumer apps do.

They were also *seven different products sharing a scheduler*, and they competed with
each other for the twenty minutes a day anyone actually has. So:

> ### The vocabulary ruling
>
> **A drill earns its place if it tests a property of the word. It goes if it tests a
> rule of the language.**

That line is not a compromise, and it is not "grammar is unimportant". In German a noun
without its gender and its plural is a *half-learned word* — `der Tisch → die Tische` is
vocabulary. Kasus, word order, the Perfekt and the Konjunktiv II are the language's
rules, and teaching them well is a different product with a different shape.

| | Kept | Cut |
|---|---|---|
| **Drills** | gender · plural · recall (English→German, typed) | conj · cloze · word order · transform · Kasus · separable · reflexive · dictation |

> **Widened 2026-09-06, and the ruling is what widened it.** Most words offered a
> *single* exercise, because the three kept above are noun facts and a verb has none
> of them until it is known. Six more now sit behind the graduation cap — `reverse`,
> `cloze`, `usage`, `conjugate`, `degree`, `synonym` — and every one passes the same
> test: it asks about **this word**. Adjective declension and Kasus stay retired
> because they are identical for every word, so drilling them teaches German grammar
> rather than this vocabulary. Conjugation is the boundary case and lands *inside*:
> which verb is strong is a fact about the verb and nothing else.
>
> The split matters. `practiceModes` is that bank, reached only when a learner asks
> for it; `eligibleModes` — what the scheduler weaves into a session unasked — is
> still the original three, because `reverse` and `cloze` apply to every card and
> merging the two turned a forty-item day into mostly drills.
| **Rooms** | the feed · Themen · Üben · Fortschritt | the grammar syllabus · the exam room · the observatory · the typing race · the worksheet printer · the reading list |
| **Data** | `cards.json` · `detail.json` · `sectors.json` · `freq.json` · `provenance.json` · `audio.json` | `grammar.json` (2.3 MB) · `brain-mesh.bin` (934 KB) · the 110 `kind: 'grammar'` cards, filtered at load |

*Two cells of that table were reversed on 2026-11-26: the exam room is a room again
(Settled decisions, *The exam room returns, and Lexi is silent*), and `audio.json` stopped
shipping with every voice in the app.*

*Diktat — hear a sentence, type it — went the same day, on the same rule pointed one
notch finer: it was the only drill whose unit was a **sentence** rather than a word, and
the only one that failed silently when a device's speech synthesis was unavailable. Its
machinery is still in `drills.tsx` (`dictatable`, `TypeItem`), so bringing it back is one
item component and one line in three lists.*

**What it bought, measured this session** — `npm run build`, `npm test`, and
`git diff --stat HEAD -- src/` — the bundle went **863 KB → 714 KB** (261 → 212 KB
gzipped), the `three` dependency and its 487 KB chunk went, 440 KB of certificate papers
went, and **3.2 MB** of data files stopped shipping. `src/` went **41,960 → 21,062
lines** across 183 → 115 files. The suite went 1,052 → 600 tests, and every removed test
covered a removed feature.

### There is no home screen, and the front door is a feed

*Added the same day, from the reference apps — Monkey Taps' **Vocabulary** and the
Goethe-Institut's **Vokabeltrainer**.*

Lexi had a daily briefing called **Heute**: a greeting, the date, a streak, a placement
nudge, a level strip, a goal line, a backlog burn-down, a queued count, three
short-session budgets, a preview of the scheduler's reasoning, and a Start button. Every
one of those was true. Together they were a page whose entire job was **to get you to a
card**. A page whose job is to get you somewhere is a page you delete by going there.

But the thing it went to is not a card. **It is a feed** (`views/Feed.tsx`): one German
word per screen, scrolled, with the pronunciation, the meaning and an example all
present. The flip card is the right shape for a *test* and the wrong shape for a *front
door*, because it demands a verdict from somebody who has not yet decided to study. You
opened Lexi and it asked you a question.

A feed asks nothing. And meeting a hundred German words on a bus is worth something on
its own — it is the thing a person will actually do on the days they will not sit a
session.

**The feed does not grade, and that is the whole design.** Scrolling produces no evidence
about what somebody knows. A feed that quietly marked words *seen* would corrupt the
schedule with the strongest possible signal, inferred from the weakest possible event —
a thumb moving. Nothing in the feed writes an FSRS card.

What it *can* honestly record is what the learner deliberately did: they stopped on a
word and pressed something. **Bookmark is the instruction** — *teach me this one* — and
`buildBriefing` serves saved words at the front of the next session. That is the loop:

> **browse freely → save what catches you → Üben teaches you what you chose.**

Two lists, kept apart because they mean different things. *Saved* steers the scheduler.
*Favourite* is a keepsake and changes nothing about what you are taught — a list you
curate for pleasure stops being pleasant the moment it starts assigning you homework.

**The order is not random.** The reference app shuffles a word list. Lexi has a
scheduler, so the feed is ordered by it: due first, then unseen words from your thinnest
topics, then the rest of the level-filtered lexicon by frequency. Scrolling with your
eyes shut still meets the right words in roughly the right order — the one thing a feed
can inherit from a scheduler, and something no content budget can buy.

This also retired the *two rooms* rule — the session as a full-bleed room with no
navigation. That rule was right about density and wrong about navigation: **a room the
app can drop you into cannot be a room you have to know how to leave.**

### What this is not a licence for

- **Not "vocabulary apps are simple".** The four remaining drills are the *hard* half of
  knowing a word, and `recall` — the only one that asks the learner to produce German —
  is the one the app was weakest on. It got promoted, not removed.
- **Not "delete anything with a low tap count".** Every cut above is the same argument
  applied consistently, and the argument is about *what the app is for*, never about
  usage. Nothing here was measured by engagement, because there is no telemetry and
  there is not going to be.
- **Not irreversible.** The corpus still carries the grammar cards; they are filtered at
  load in one line in `data/index.ts`. Every learner's `gex:*` and `gram:*` FSRS
  schedules are left exactly where they are (`store.ts`) — inert, correct, and there if
  the syllabus ever comes back. Git history holds the code.

---

## The six commitments

### 1. Beautiful

Not "styled". The app draws on the German design tradition it teaches — Otl Aicher and
HfG Ulm, cartography, the printed lexicon — because form matching subject is the
difference between a tool that looks competent and one that feels like its subject.
The identity is **das Heft** — the German school exercise book: a paper ground, Königsblau
ink, a yellow highlighter for the one thing that matters on a screen, the three article
highlighters drawn under *der*, *die* and *das*, red pen for corrections, squared paper
for the exam room and a rubber stamp for a result *(2026-11-26; was the card box, which
was the Atlas)*. [DESIGN.md](DESIGN.md) is the system of record.

**Forbids:** a visual language that could belong to any dashboard. Motion that has a
library instead of a director. Restraint used as a synonym for absence.

**Measured by:** one type ramp, zero hardcoded palette values, one documented motion
scale — all currently enforced and testable.

### 2. Bulletproof

A local-first app holds the only copy of something a learner spent a year building.
Losing it is not a bug, it is a betrayal. So correctness is a first-class feature: a
corpus that is never hand-edited, id migrations that carry FSRS schedules through every
rename, entrance animations that can never gate content, and a typo-tolerance that
refuses to forgive a *real German word*.

**Forbids:** a schedule that can be silently re-pointed, or deleted because a feature
moved. A number on screen that nothing verifies. Any change to `public/data/*.json` that
did not go through a script.

**Measured by:** `npm test`, `npm run typecheck`, `npm run corpus:validate` — all green
before anything merges. Every retired card id has an `ID_MAP` entry. **The boot cannot
hang**: the lexicon fetch and the progress hydrate are both budgeted, so a storage layer
that never answers yields the app or an error, never a splash forever.

**And it is driven, not only tested.** `src/lib/devseed.ts` (development only, absent
from the production bundle) constructs ten learner states — cold visitor to C1 — so the
surfaces that only exist after a thousand grades can be *looked at* on a real phone. Six
defects came out of the first hour of doing that, none of them findable from a desktop
browser. See LESSONS.

### 3. Effective

The app exists to make people know German, not to make people open the app. Every
retention mechanism is judged against that: the streak is allowed because it is honest,
push notifications are still undecided, and leagues are refused outright.

**Forbids:** engagement machinery that works by manufacturing anxiety. Any number that
flatters. Any claim of competence the evidence does not support — this is why
`candos.ts` shows what a level *is* and never says "you can".

**Measured by:** the honest ones. *Recognised* is ratcheted and cannot be manufactured
by narrowing a filter, and it is now shown beside *recalled*, because a word you can
only recognise is half a word and the app should say so.

### 4. Open-source

**The code is MIT** ([LICENSE](../LICENSE)). The corpus is built from open data with
every source, licence and obligation recorded in [ATTRIBUTIONS.md](../ATTRIBUTIONS.md).
A school can inspect it, a learner can fork it, and nobody can be rug-pulled.

**Forbids:** a dependency that cannot be shipped under MIT. Bundling someone else's
content without checking its terms — the Tatoeba audio allow-list is the standard.

### 5. Pedagogically sound

The app teaches the way the evidence says people learn, and says out loud where it
doesn't. Spaced retrieval, interleaved formats, a first sight that teaches before it
tests, and a scheduler that shows its reasoning on every card.

**Forbids:** a drill that marks correct German wrong. Generated content that was not
verified — facts are looked up, never written. Fake scoring of anything a machine cannot
mark. **A caption that misdescribes the exercise underneath it** (the drill why-line is
per-mode for exactly this reason).

**Measured by:** [PEDAGOGY.md](PEDAGOGY.md), the standing critique. Its old headline —
*"the app measures the receptive half of what it has already built the machinery to
measure"* — is the thing this refocus acted on: production is now a quarter of the
drills instead of one of eleven.

### 6. English → German, expandable to other pairs

**Gloss language is English, and this is a scope, not an oversight** — the corpus is
English-glossed to the last card, so a learner whose English is itself a second language
pays a translation tax on every item, and they should learn that in the first ten
seconds rather than in week three. The German definition layer (`defDe`, shown from B2)
is the deliberate exception, gated on the *learner's* level rather than the card's.

---

## The multilingual arc

"Eventually French and Spanish" is today **a hope, not an architecture.** The
German-specific logic is real and load-bearing: the function-word list, umlaut folding,
the conjugation engine, adjective de-inflection, plural derivation, and the proper-noun
heuristic — which only works *because* German capitalises every noun, and which would
need inverting for French or Spanish.

**The refocus made this materially easier and it was not the reason for it.** The
language-specific surface is now smaller: `lib/matcher.ts`, `lib/conjugate.ts`,
`lib/surface.ts`, the four drills in `views/drills.tsx`, and the corpus pipeline. The
whole authored-grammar wing — 140 points of German syntax with no analogue in another
pair — is gone.

**The rule: do not do this speculatively.** Build the per-language interface when a
second pair is actually being built, because an interface designed against one
implementation is a guess. What *is* worth doing now is refusing to add new German
assumptions outside those files.

---

## What Lexi refuses

Each has been argued and declined on the record — reopening one means writing down what
changed.

| Refusal | Why |
|---|---|
| **Drilling grammar** | *Narrowed 2026-11-19 — it was "Teaching grammar".* The drills still test properties of words and nothing else; the vocabulary ruling above governs every exercise and the scheduler. What changed is that grammar may now be **explained** — in the course's films, which never grade. See Settled decisions, *The course returns, as films*. A rule drill (Kasus, word order, tense transforms) is still refused, for the reason the ruling gives. |
| **AI conversation tutor** | Commoditizing category, needs a backend and keys, breaks the privacy-by-architecture story, six better-funded competitors already there. **Reopened 2026-09-09 against the GPT-6 Astra release and unchanged** — frontier inference got 2.5× *more* expensive, so the wrapper tutors move further from the frontier, not closer. Corrected while checking: this row said `lib/ai.ts` survives for build-time enrichment. **It does not exist. Lexi ships no LLM code**; the generator is a Claude session and the repo commits only the prompt, the batch and `verify.ts`. See BACKLOG's parked entry. **Narrowed 2026-09-24, at the owner's direction:** a *chatbot* is still refused; an optional, bring-your-own-key tutor that explains a sentence the learner is reading and corrects what they wrote back is built — see Settled decisions for what changed. |
| **Competing on content volume** | Duolingo shipped 20,500 units in a quarter. You lose. Do not enter. |
| **Leagues, streak-shaming, social pressure** | Four of six teachers and three of six learners in [PEDAGOGY.md](PEDAGOGY.md) named the absence as the reason they would recommend it. |
| **Machine-marked writing and speaking** | A drill that marks correct German wrong is worse than no drill. *Still refused as marking (2026-09-24):* the optional tutor's feedback on a write-back carries no score, no grade, and never touches FSRS or any number. |
| **Speech-recognition pronunciation scoring** | Consumer ASR marks accented-but-correct German wrong, punishing exactly the learner who most needs encouragement. Minimal-pair *listening* is the honest version. |
| **A teacher dashboard** | Needs accounts, which every teacher persona named as the thing they would lose. |
| **Saying "you can now …" from a word count** | It would be the most dishonest sentence in the app. |
| **A home screen** | *New, 2026-09-05.* A briefing whose job is to reach a word is a word you have not shown yet. The app opens on the feed. |
| **A closed voice** | *New, 2026-11-26, at the owner's direction.* Lexi speaks with an open model or not at all. Every voice it had — the device's speech synthesis, a hosted neural voice, pre-rendered clips — came from a model nobody can inspect, reproduce or ship under the corpus's terms, and recognition the same. Until an open-source German voice exists that can be pinned and shipped, Lexi is **silent**: no pronunciation audio, no Hören, no listening parts in the exam room. IPA stays; it is text. |
| **Grading the feed** | *New, 2026-09-05.* Scrolling is not evidence. A feed that marked words *seen* would feed the scheduler its strongest signal from the app's weakest event. Bookmark is deliberate; a thumb is not. |

---

## Settled decisions

Recorded so they are not re-litigated by drift. Date is when the call was made.

- **English-base** *(2026-07-27)* — stated in the README and the first-run hero.
- **The Atlas identity** *(2026-07-28)* — the terminal is retired.
- **The card box** *(2026-10-11)* — the Atlas's blue and map grid are retired for the
  owner's two references (Karteto, a vocabulary app); its method stays. DESIGN §1.
- **Consumer before schools** *(2026-07-27)*, **superseded 2026-09-05** — the school
  pitch's whole mechanism was print, class packs and exam papers. All three are gone;
  `SCHOOL-PITCH.md` went with them. A school offer would now have to be re-derived from
  what the app actually is, and that is a different document.
- **Authoring is machine-gated, not human-gated** *(2026-08-11)* — `authoring:new`
  refuses to write a card it cannot verify against de.wiktionary, and every example must
  contain a real inflection proved by the app's own matcher.
- **Code is MIT** *(2026-08-13)*.
- **The vocabulary ruling, the feed, and the missing home screen** *(2026-09-05)* — above.
- **Track E's six** *(2026-09-09)* — below: ordered not composed, no explanation on a
  wrong answer, distractors unchanged, typed production only, dwell named to the
  learner, and *am I ready* answered by saying plainly that it is not.
- **Stories join the feed** *(2026-09-24, narrowing the refocus's cut of the reading
  room; settles open decision 3)*. **What changed:** the owner — the app's first and
  most committed learner — reached B1 and stopped opening it. A feed of single words,
  however well ordered, is German *as a subject*; everything the owner actually cares
  about (economy, tech, politics, immigration, motorsport, games, art, a career that
  stalled after the move) is German *as a medium*. And the corpus cannot carry a B1
  reader to the news by itself: of the content words in 25 Tagesschau articles, **23%
  resolved to no card at all** (measured on the pre-refocus corpus; `npm run
  corpus:news` re-derives the Leipzig half on this one). **What did not change:** a
  *room* still competes for the same twenty minutes, so there is no room — a story is
  a **slot in the feed**, every five words, on topics the learner picks, and the reader
  is a layer over the feed that closes back to the same slot. **The rules it keeps:**
  the feed still never grades (story slots carry no `data-word`); an entry is still
  never upgraded into a card (a word Lexi lacks is *noted*, with the sentence it was
  met in, and the authoring gate decides); a card saved from an article is an ordinary
  bookmark, and the session names the article as its reason. **Lexi ships no one's
  text:** every article is fetched by the learner's own browser from the publisher, for
  private reading, and cached only on their device — the relationship a feed reader
  has. Only publishers whose endpoints a browser may read (CORS open) are used;
  tagesschau's terms allow private, non-commercial use, forbid republishing and cap
  use at 60 requests an hour, which the client enforces at 45. **If Lexi ever charges
  money, this is re-read first.**
- **An optional tutor, bring-your-own-key** *(2026-09-24, reversing the 2026-09-09
  re-ruling above at the owner's direction)*. The 09-09 argument was about Lexi as a
  *tutor product* — frontier inference got dearer, so wrapper tutors fall further
  behind — and it still holds against building one. What is built is not that: two
  jobs about language the learner has already met — **explain** a sentence they are
  reading, **correct** what they wrote back about it — on the learner's own key, from
  their own browser (Anthropic's SDK in browser mode, or OpenRouter), off by default.
  "Needs a backend" no longer applies; "breaks the privacy story" is answered by the
  default (no key, no text leaves the device) and by the key never entering a backup.
  **What it may never do:** score, grade, write a card field, or touch FSRS. Its advice
  is shown once, labelled as AI and fallible, and kept in the learner's journal.
- **The tutor moves behind Lexi's server** *(2026-10-04, at the owner's direction,
  amending the bring-your-own-key decision above)*. The learner's provider key sat in
  localStorage, and the browser called the provider through the SDK's
  `dangerouslyAllowBrowser` switch; article text went into the prompt unmarked. Both
  went. `api/tutor.ts` — **Lexi's first server code** — holds the owner's key in its
  environment and writes the prompts itself. Article and learner text enter as tagged,
  defused *data* under a rule that they are never instructions, and a reply quoting
  anything not in the sentence has that part dropped. The browser holds only an access
  code that works for these two tasks and nothing else. **What it may never do** is
  unchanged: score, grade, write a card field, touch FSRS, or store what it was sent. It
  is not a relay — two task shapes, length limits, no free prompt — and the Anthropic
  Console's spend limit is the backstop. "No backend" now means: no accounts, no
  learner data held, and one stateless function.
- **Focus: one thing, done well** *(2026-10-02, at the owner's direction)*. "Simplify
  Lexi to focus on expanding vocabulary — hide all grammar-related config — and excel
  at one thing before expanding to others." Four flags in `src/lib/focus.ts`, all off:
  - `grammar` hides the drills that test a rule of the language rather than a fact of
    the word (verb forms, comparison), the session's drill toggles, and the case a
    verb's preposition governs (`warten auf` stays; `+ Akkusativ` goes).
    **Gender and plural stay** — in German they are part of knowing a noun.
  - `speaking` hides *Sag es*; `writing` hides story write-back (the tutor's
    *explain* stays, because it helps a reader with the words they are saving);
    `tuning` hides daily pace and review intensity.

  **Hidden means the defaults apply and nothing stored is touched**: every visible
  drill is on, pace is *steady*, retention is 90%, and the stored mutes, pace and
  target wait in localStorage for the day a flag is flipped back. No FSRS row is
  deleted — the hidden drills' `gym:*` schedules stay inert, like `gex:*` and
  `gram:*`. `src/focus.test.ts` pins the flags, so walking this back is a decision,
  not a drift. The refocus of 2026-09-05 narrowed what Lexi *teaches*; this narrows
  what a learner is *asked to configure and practise*.
- **Exam vocabulary is measured; exam prep stays refused** *(2026-11-10, the owner's
  choice between the two)*. Asked what a candidate needs to pass Goethe or telc, Lexi
  answers the half that is vocabulary. `npm run corpus:examcov` holds the corpus to
  Goethe's A1, A2 and B1 Wortlisten, and a card is filed at the level the exam names
  the word at. Above B1 neither body publishes a list, and Lexi says so rather than
  inventing one. **Unchanged:** no exam room, no papers, no *am I ready* (Track E #10).
  *Amended 2026-11-26:* the room and the papers are back, and *am I ready* is still not
  answered — see *The exam room returns, and Lexi is silent*.
  The lists are fetched, never shipped; whether a card may be *labelled* as on an exam
  list in the app is the same question as open decision 2b and is not decided.
- **The exams guide the progression; nobody's exam is the goal** *(2026-11-21, the
  owner)*. The CEFR levels and the certificate lists set what a level holds and the
  order a learner meets it in. They do not decide what is built next. Lexi is for
  anyone learning the language, whether or not they will ever sit a paper, and in
  whichever language pair comes next. So work is ranked by what serves learners at a
  level, never by one learner's exam date, the owner's included.
- **A tenth drill — the preposition a word takes** *(2026-11-13)*. *warten auf*,
  *sich kümmern um*, *stolz auf*. It passes the vocabulary ruling the way conjugation
  does — nothing about *warten* predicts *auf* — and it is the word property the
  certificate papers test hardest. **What it may never do:** print or ask the *case*
  (that is the half Focus hides), offer as a wrong answer a preposition the corpus
  attests for the same word, or take a fact from a sentence by itself. Where a card's
  headword does not name its preposition, the fact comes from `src/data/government.ts`
  — ruled by hand, and refused by a test unless that card's own examples already show
  it. `eligibleModes` is still the original three: this drill is asked for, or comes
  back on the schedule of a learner who has met it.
- **Hören — German in the background** *(2026-10-02, at the owner's direction;
  **retired 2026-11-26** with every voice in the app — see the refusal *A closed voice*)*.
  Walk mode was hard to find and the wrong shape for the ask: "the audio to just run
  in the background while I do other things … without having to have my headphones
  in or clicking anything." Hören is one tap in the top bar on every surface: each word
  German · English · German · a sentence, returning about 1, 4, 10 and 20 minutes later
  in German only, through the speaker, looping when it ends. **It never grades and
  records nothing** — not even a dwell, because playback is not interest and counting
  it would corrupt the one inference the scheduler names ("you kept stopping on
  this"). The player's bookmark saves a word, the feed's one honest signal. It plays
  saved words, then the day's due and fresh words, then the feed's order — due words
  included, on the feed's own precedent (meaning shown, nothing graded). Walk mode
  survives inside it as *Practise aloud*, unchanged: it asks, and a press grades. The
  audio is still rendered on the phone; clips are kept on the device so each day's
  wait shrinks. Hosting pre-rendered clips is the next step (BACKLOG).
- **The course returns, as films** *(2026-11-19, at the owner's direction: "you are free
  to override VISION … while remaining true to pedagogic first principles")*. A course of
  **52 units**, A1 → C2 — eight a level, twelve at C1 — under Themen until 2026-11-27
  and in Üben since (`#/kurs/<level>`, `data/course.ts`, [COURSE.md](COURSE.md); see *The
  course moves into Üben*, below). Each unit is a
  situation (*Beim Arzt*, *Besprechung und Protokoll*) and its words; **29** of them have
  a **film**: a learner-paced, animated explainer of one idea about German — the article,
  the plural, the verb in position 2, *weil* sending the verb to the end, *-ung* being
  *die*, the passive, *Funktionsverbgefüge*, modal particles.

  *Why reverse a refusal that was argued.* The 2026-09-05 ruling was right about
  **drills**: a drill that tests a rule tests the same thing on every card, and it
  crowded the words out. It was wrong to treat that as a reason never to **explain**.
  Lexi taught 11,220 cards and never once said why *die Verantwortung* is *die*, why the
  verb fled to the end after *weil*, or that *müssen nicht* is not "must not" — it left
  every learner to induce the patterns from thousands of flips, which is the slowest
  route there is. Explicit instruction of a high-yield pattern, followed by spaced
  practice of the items, beats either alone; noticing is the precondition of acquiring
  (Schmidt); a short, segmented, learner-paced explanation beats a continuous one
  (Mayer's segmenting principle); and asking for a guess before the answer turns
  watching into thinking. The films are that explanation, sized so they cannot crowd
  out the words: about two minutes, then *Learn the words*.

  *What it keeps, and the tests that hold it.* **A film never grades** — a guess is a
  prediction, and `films.test.ts` asserts the player imports nothing from the store but
  the seen-mark. **Every fact comes from the corpus**: a film names cards and the player
  looks up their article, plural, examples and gloss; an ending's gender is *counted*
  over the corpus as the beat plays, exceptions listed (*-ung*: 841 of 847 *die*); a
  pattern the corpus stops keeping fails the suite. Only the explanation and a few
  short grammar sentences are written by hand. **Nothing is locked**; the marked unit is
  a suggestion. **A unit's session is an ordinary Üben session** over cards the learner
  chose by pressing *Learn the words*.

  *What it narrows.* Track E #5 ("nothing picks a card") — the course picks a unit's
  cards, by sector and frequency, never twice across units; the **day's queue** still
  picks none, and the first session is unchanged. Trails (open decision 3c) is the
  other half of this and stays unbuilt: no stamps, ranks or mascot.

  *C1 is one line, not a choice* (the owner's ruling, same day). Language schools split
  C1 into *Beruf* and *Hochschule*; Lexi does not make the learner pick. The shared core
  comes first, then the meeting room and the seminar in turn, and **bridge units** teach
  one skill in both settings (arguing, describing a chart). A first version had a
  Beides/Beruf/Hochschule switch; it was removed before it shipped — a C1 exam and a C1
  life both mix the registers, and a switch invited learners to skip half of the
  German they will meet. The test holds the balance (four units each) and the
  alternation.
- **The web is the product, and a native shell only wraps it** *(2026-11-21; makes
  STORES.md's "web first" a ruling)*. **What it settles.** Lexi is a website before it
  is anything else: one origin, one build, one codebase, and a URL is how a learner
  arrives, installs and comes back. A store copy (a Play TWA, an iOS Capacitor app,
  STORES.md) is that same build in a wrapper, never a fork. A wrapper may add only what
  the web cannot do for a local-first app: storage that Safari does not evict, a
  notification that fires with no server, and the OS's own surfaces (widgets, the
  Türsteher's gate; lock-screen audio went with Hören on 2026-11-26). Each of those is a **door** into the same
  app. Anything a door grades goes through the same drills and the same FSRS store as
  the web, so a word answered on a widget is the word Üben schedules.

  *Why.* The promise is more German words, and the platform is not what holds it back.
  The next reframe waits on five learners who are not the owner, and a link is the
  quickest way to reach them. Every surface that exists only in a shell splits the
  testing (the simulator already cannot answer the locked-phone questions) and turns
  STORES.md's order around. Commitment 4 points the same way: open source is most real
  when anyone can open the thing with a link and read the corpus without installing
  anything.

  *What it costs, said plainly.* Until a shell exists, Hören may stop when the phone
  locks, no reminder fires with the app closed, and a learner who never adds Lexi to the
  home screen can lose their progress to Safari's storage eviction.

  *What it obliges, in order.* These are the three places where the web falls short of
  commitments 2 and 3: **(1) the name and domain**, because on the web the address is
  the account; **(2) storage durability proven on a real iPhone**, with the install step
  offered wherever it protects progress; **(3) a website that search can read.** Today
  every route is a `#/…` fragment, which a crawler ignores, so none of the 11,220
  verified cards can be found from a search box. A static page per headword fixes that
  ([PAGES.md](PAGES.md)).

  *Forbids:* logic that lives only in a shell. A store build whose data or drills differ
  from the web's in anything except what STORES.md switches off and records. A
  published URL that later 404s (the rule `route.ts` already keeps for retired hashes).

  *Leaves open:* push notifications (commitment 3, still undecided), accounts (open
  decision 1), and **when** a shell is built. STORES.md's conditions still decide that;
  this ruling decides only that the shell wraps.

- **The transfer line: a card says what its word has to do with English** *(2026-11-21,
  at the owner's direction to build LEARNING-WEB.md's proposals)*. **What it settles.**
  An English speaker arrives owning part of German, and Lexi taught *Wasser* as if
  *water* were a coincidence. Now a card's reveal can carry one line, **English**:
  *Borrowed from English*, or *Related to English water*, and a second line when the
  spelling follows a counted pattern: *German ss, ß is often English t: essen · eat,
  groß · great, heiß · hot*. It is a **property of the word**, so the 2026-09-05
  ruling admits it; it is shown, never drilled, so nothing grades on it.

  *How it is gated*, because the source is noisy (LEARNING-WEB §1, LESSONS
  *der Tag*): `npm run corpus:transfer -- --write` ships only what English
  Wiktionary's etymology **states**: a borrowing, or a named English cognate. It
  ships nothing the script infers (an ancestor spelled like the gloss, a lookalike).
  A cognate the gloss does not show ships only when the English word is everyday
  English (50+ uses in Tatoeba's English), when the prose neither denies nor hedges
  it, and when the two words look alike once the named patterns are allowed. A
  pattern is named only when it holds over 12 shipped pairs, and its examples are
  shipped pairs. Measured at the first write: **897 cards** carry a line (21.7% of
  A1, 2.5% of C1), and **10 patterns** are named.

  *Where it shows:* the reveal in Üben and the word's entry (and its word page).
  **Never on a front**, where *related to English house* is the answer.

  *Forbids:* an English link written by a model or by hand into the data file, since
  a wrong one is refused in the script (`REFUSE`, with its reason) and never added;
  a link on a card's front; a drill that tests it (a sound shift is a rule of the
  language); and a line beside a curated false friend, whose note already speaks
  about the English word.

  *Leaves open:* whether it **helps**. The research is mixed (explicit teaching of
  the shifts beat incidental exposure in one study; another found little extra gain),
  so the claim waits for learners. Also open are compounds whose parts carry the
  line (*Hausnummer*: 170 nouns have both parts visible), and the Latinate half that
  rises toward C2.

- **The exam room returns, and Lexi is silent** *(2026-11-26, at the owner's direction:
  "Create testing space for Lexi, with telc/goethe styled practice quizzes and exams for
  A1–C2. Remove all voice and audio modules until an open-source audio and voice model
  exists.")*. **What it settles.** A fifth door, **Prüfung** (`#/exam`, `views/Exam.tsx`, a
  lazy chunk): at every level, four short tests generated from the cards (meaning both
  ways, der/die/das, a word in its own example sentence) and one full paper in the
  published format — Goethe A1, A2, B2, C1 and C2, telc B1 — sat in *Übungsmodus*
  (check each Teil as you go) or *Prüfungsmodus* (timed per block, nothing marked until
  you hand in), with the letter and the oral self-assessed on the examiners' grids.
  The six papers are the ones retired on 2026-09-05, restored from git with their tests.

  *Why reverse a refusal that was argued.* The 2026-09-05 cut was right that a room
  competes for the same twenty minutes, and it was right about what a session is. It
  was wrong that a learner at a level has no business seeing what that level looks
  like on paper — the formats, the timing, the 60% line both boards pass at. That is
  information, and a vocabulary app that teaches to B1 can show it honestly. What made
  the old room dishonest was never the papers; it was the **readiness read**, a
  percentage that pretended to predict a result. It stays gone.

  *The rules it keeps.* **Nothing here writes an FSRS card**: a quiz reports, a paper
  scores, and a word missed in either reaches Üben only when the learner presses
  *üben* or *merken*. **No exam date ranks anything** (2026-11-21). **Lexi still does
  not answer *am I ready*** (Track E #10): a result is points on a paper written for
  Lexi, against that paper's own scheme. **No board's material is reproduced**: the
  structure, item counts, timing and mark schemes follow what telc and the
  Goethe-Institut publish, every text is written for Lexi, and the room says Lexi is
  affiliated with neither. Sittings and quiz bests ride the backup (`lexi.exam.v1`,
  `lexi.quiz.v1`), because a letter the learner wrote is theirs.

  *Lexi is silent.* Every voice left the app the same day (the refusal *A closed
  voice*): pronunciation audio, Hören, *Practise aloud*, *Sag es*, the listen bar,
  the ASR probe and the clip pipeline. So the papers are sat **without Hören**: the
  runner sets no listening part, the cover says what is left out, and the result is
  scored against what was sat, with every maximum and pass line scaled to it. Measured
  by script this session: telc B1 is sat as 40 of its 60 items, out of 225 of 300, in
  about 120 of 150 minutes; Goethe A1 as 15 of 30 items, out of 75 of 100. A listening
  part read as a transcript would be a reading test wearing Hören's name, so there is
  none. No FSRS row and no setting is deleted: `lexi.hdvoice.v1` and `lexi.sound.v1`
  still ride the backup, inert, for the day a voice returns.

  *Forbids:* a readiness percentage, an exam-date countdown, a paper text copied from
  a Modellsatz, a listening part without an open voice, and any path from a test to a
  schedule that is not a press. *Leaves open:* more than one paper a level, and which
  open German voice to wait for (BACKLOG).
- **The feed knows what time it is** *(2026-11-27, at the owner's direction: make Lexi
  unforgettable "from the moment the app opens to the second the user has to switch
  out"; the same day the owner ruled that VISION gives way to a change that can justify
  itself, and this is the justification)*. **What it settles.** A slot in the feed,
  **Jetzt** (`components/JetztSlot.tsx`, `data/jetzt.ts`), placed once per part of the
  day, after the word the learner resumes on. It shows the time as a German says it
  (*Es ist kurz nach halb acht*) and the formal reading a timetable uses. It shows the
  day as one compound that takes its last part's article (*der Freitagnachmittag*,
  and at night *die Donnerstagnacht*), and today's date with its spoken ordinal. While
  the clock says *halb*, a margin note names the trap in place of the date. It ends with
  six words for this hour and season, each a card (four on a screen under 700pt). The
  welcome greets by the clock (*Guten Morgen*, *Guten Tag*, *Guten Abend*, and after
  midnight *Noch wach?*), and its one chip is the greeting's own card.

  *Why.* Every slot in the feed taught German as a subject: a word, then the next.
  Nothing in it was about the learner's day, and the day is where a language gets
  used. Telling the time is the first thing a course teaches and the thing a learner
  hears most. *Halb acht* read as 8:30 is the commonest misreading of a German clock.
  A compound taking its last part's article is a rule the course spends a film on.
  Jetzt puts all three on the minute the learner is in, so the input is comprehensible
  because the learner already knows what it means: it is their own clock
  (commitments 3 and 5). It is also German they can use the moment they close the app.

  *The rules it keeps.* **It never grades and records nothing.** It has no
  `data-word`, so the dwell observer cannot see it and no exposure is counted. Its one
  action, *save these*, presses the bookmark once for each word: the instruction a
  learner gives a word slot, given once. **Nothing leaves the device.** The clock and
  the time zone are the device's own, the time zone is read for the hemisphere's
  season and nothing else, and nothing is fetched. **Every word is a card, and the
  German is tested.** `data/jetzt.test.ts` says every minute of the day, the number
  and ordinal words, the compounds and both hemispheres' seasons, and checks every term
  the slot can name against `cards.json`. The picks hold for the whole part of the day,
  so nothing moves under a reading eye when the minute turns.

  *Forbids:* a notification or nudge timed to the learner's day; storing when somebody
  opens the app, or reading it as anything about them; a word of the day fetched from
  anywhere; a Jetzt word that is not a card; and any write from the slot other than the
  bookmark. *Leaves open:* regional German (*Grüß Gott*, *Moin*, *Servus*, *viertel
  drei* for 2:15 in the south and east, *Jänner* in Austria), which needs a region
  setting the app does not have (BACKLOG).
- **The course moves into Üben** *(2026-11-27, at the owner's direction: "Verify that
  the Kurs lives in the right place instead of within Uben as part of their structured
  learning/practice")*. **What it settles.** The course is the second half of Üben, at
  `#/kurs/<level>` (`views/Kurs.tsx`, `components/UebenSwitch.tsx`). *Heute* is the
  session the scheduler builds, and *Kurs* is the path a learner walks on purpose. A
  switch, *Heute | Kurs*, moves between them. It replaces the history entry instead of
  pushing one, so changing halves is a tab, not a step. Üben's empty state and the
  session recap show the next unit, Fortschritt's level card opens the learner's level,
  and the tab bar lights Üben inside the course. Themen is for browsing again: decks,
  the word map and the scanner. `#/words/kurs/<level>`, the address from 2026-11-19,
  still lands.

  *Why.* Each door answers one question (DESIGN §8a). Themen's is *what words are
  there?*, and it asks nothing of the learner. A unit asks for work: a film, then *Learn
  the words*, which was always an Üben session. Under Themen, a unit started in one door
  and finished in another. A learner who finished the day's reviews and asked *what
  next?* was standing in Üben, one door away from the answer. The 2026-11-19 placement
  argued that a unit is a theme with a direction. The direction is what makes it study,
  and study is Üben's question. *Heute* stays first, because the scheduler's day is still
  the core of the loop, and a unit is chosen, never due.

  *The rules it keeps.* The films never grade, and only the unit's session writes FSRS,
  as before. No storage key moved and no learner row was touched. Old links land,
  because a link in somebody's notes is a promise. The switch is a control, not a swipe:
  a second horizontal axis inside Üben would break the gesture grammar.

  *Forbids:* a swipe between *Heute* and *Kurs*; a unit that falls due, nags or counts
  down; ranking units by an exam date; a sixth door for the course. *Leaves open:* when a
  new learner first meets the course. The switch is hidden during the first-run session
  and appears after it.
- **Wortbau: the feed builds a word** *(2026-11-27, at the owner's direction: make
  learning "unforgettable, dynamic, incredible, fascinating, addictive in the most
  positive way that learning can be")*. **What it settles.** A feed slot, **Wortbau**
  (`components/WortbauSlot.tsx`, `data/wortbau.ts`), at position 8 and every 12 after.
  It shows two cards and their senses as an equation with a blank (*die Hand* + *der
  Schuh*, *hand + shoe = ___*), with one button, *Put them together*. The halves join,
  the first part's article fades, the last part's article moves to the front, and the
  blank fills: *der Handschuh*, *glove*. One line says what the join did (a linking
  *en*, a plural, a dropped *e*, a verb's stem) and that the last part picks the article.
  Chips offer a related compound next, one that shares a part (*More with Zeug*).

  *Why.* German builds words out of words, and English hides the seams. Seeing
  *Handschuh* as *hand + shoe* gives an arbitrary string a reason, and memory keeps
  reasons. The guess comes first because an attempt before the answer, even a wrong one,
  makes the answer stick (Kornell, Hays & Bjork 2009). The films hold the learner on a
  guess for the same reason. The first learner's own chats asked for exactly this
  (BACKLOG, 2026-11-14, item 4). It stays inside the ruling: it shows a property of
  words, how they are made and which article they take, and it tests nothing. Track E #6
  refused composition for prefix verbs; this settles noun compounds whose parts are both
  cards.

  *Why it is hand-picked.* An automatic splitter was measured first: of 60 readings
  sampled from the 1,105 it produced, about one in six was wrong (*Angelpunkt* as
  fishing rod + dot, *Netzwerk* as net + plant). A wrong equation teaches a wrong word,
  in the form a learner is most likely to remember. So the 71 rows are chosen, and
  `data/wortbau.test.ts` holds each one to the shipped cards: the segments spell the
  word, each part is a form of its card, each sense is one of that card's own senses,
  and the head is a noun with the whole's gender. A row whose card is gone is dropped,
  not shown wrong.

  *The rules it keeps.* **It never grades and records nothing.** It has no `data-word`,
  so the dwell observer cannot see it. The guess is made in the learner's head; it is
  never typed or stored. Its one write is the bookmark, *Save for Üben*, and the test
  limits its store imports to four. Its order reads status for two things only: to skip
  a compound the learner knows, and to put first the ones whose halves they have met.
  The order changes once a day. Under reduced motion the parts join without travelling.

  *Forbids:* a typed or scored guess; a row from the splitter that no test holds; a
  sense that is not on the part's own card; prefix verbs (Track E #6 stands).
  *Leaves open:* everyday compounds whose parts are cards but whose whole is not yet one
  (*Kinderwagen*, *Mülleimer*, *Schneemann*). Each goes through the authoring gate
  first (BACKLOG).
- **Built for open models, with none switched on** *(2026-11-27, at the owner's
  direction: "make sure Lexi is built to grow into that open-source and local-run
  future")*. **What it settles.** A seam, `src/lib/engines/`, with three contracts: a
  voice (text → audio), ears (audio → transcript) and a tutor (text → text). None of
  them takes a card, a schedule or a grade. `admissible()` turns the licence rules into
  a function, and a registry lists every engine looked at, each with its verdict. A
  probe reads what the device could run (WebGPU, WebAssembly, free storage) without a
  prompt, a download or a request, and Settings shows the result
  (`components/OnThisDevice.tsx`). Nothing is installed. [LOCAL-AI.md](LOCAL-AI.md)
  has the detail.

  *Why.* Lexi went silent the day before, to wait for an open voice (refusal *A closed
  voice*). Open German voices, recognisers and small instruction models are arriving,
  and they run in a browser tab. When one is good enough, adding it should be an
  implementation, not a rewrite. The licence question should already be answered in
  code, not argued again in a hurry.

  *The rules it keeps.* Open weights or nothing: weights that forbid commercial use or
  derivatives, or restrict how they are used, are refused, because an MIT app cannot
  pass them on. The runtime has a permissive licence, and no GPL code goes in the bundle
  or its downloads; a GPL program may render clips on a maintainer's machine. Nothing
  runs in the cloud. An engine never writes FSRS: ears produce a transcript, and a drill
  grades it. No model downloads before the learner asks, and no microphone opens
  without a tap. A test keeps the device's own speech synthesis and recognition out.

  *Forbids:* switching an engine on without the owner's yes, since each is a Reserved
  matter; a download from a host that the CSP and the legal page do not name; a cloud
  engine; non-commercial or use-restricted weights. *Leaves open:* the three decisions
  in LOCAL-AI.md: clips rendered by Piper in the CC0 Thorsten voice, Whisper on the
  device, and a learner's own local model server as the tutor.

---

## Six questions, ruled *(2026-09-09)*

Round 4's Track E. Each arrived as a question with an assertion inside it, and each
premise was measured before it was argued — **three of the six were already false**.
The rulings and the properties they produce are pinned in `src/rulings.test.ts`, so a
decision that gets walked back by accident fails a test rather than quietly reverting.

The rule that decided four of the six is the one already on the record above: *a drill
earns its place if it tests a property of the word; it goes if it tests a rule of the
language.* Two are not about drills, and are decided by commitment 3 — say what is
true, and say what you do not know.

### 5. The first session is **ordered, not composed** — and the ordering had to be made to exist

**Ruled: no hand-composed opening. The ranking is repaired instead, and the session is
given one structural guarantee that names no card.**

The filed claim, *"it is twenty verbs"*, was stale — the frequency sort had landed. What
straight rank actually produced was `sie · auf · sein · aus · auch · stehen · so · sollen
· sagen · er`, and **no noun until position 22**: correct German, correctly ordered, and
two of the scheduler's three drills dead on the day the app most needs to show what it
is. Frequency rank and drillability are different properties.

A hand-picked first ten would bring back the syllabus deleted on 2026-09-05, so nothing
picks a card. *(Narrowed 2026-11-19: the course's units pick their cards — see Settled
decisions — but only for a session the learner opens from a unit. The day's queue and
this first session still pick none.)* `firstRunIds` states a property the *session* must have — **it must be able
to ask every question this app asks** — and fills it from the same frequency list:
`das Ende` (25), `die Arbeit` (69), `der Tag` (98) are chosen because they are 25th, 69th
and 98th. A third of the opening, and only the opening: from session two the
weakest-sector loop spreads fresh picks on its own. One tiebreak rides along, on the same
grounds — a gender the session does not have yet beats one it does, because straight rank
reserved three `das` nouns and a first gender drill whose answer is always *das* teaches
*das*.

**And the ordering signal was missing where it mattered most.** `freq.json` was projected
from `provenance.json`, which carries a rank only for cards *discovered through* a
frequency list — a rank for the cards that needed one least. It covered **87 of 1,170 A1
cards**, and not one of `sein`, `haben`, `werden`, `gehen`, `Zeit`, `Kind`, `nicht`,
`ich`, `gut`. Unranked sorts last, so `grillen` was introduced 70th and `sein` 118th:
the Round 4 persona complaint, surviving the fix written for it.

`npm run corpus:freq` now projects the **Kernwortschatz** reference that
`corpus:kernwortschatz` has measured against all along — **80.0% of the corpus and 86.3%
of A1**, `sein` at 4, `grillen` at 8,451. `gesamt` is the ordering rank; a blend of the
four registers would invent a fifth ranking nobody validated. The 171 cards the reference
does not know (`der Berliner`, `der Wiener`, `die Bundespolizei` — demonyms and newswire)
keep their old rank *behind* it rather than merged into it.

This is the first thing from that reference to **ship**, so [ATTRIBUTIONS.md](../ATTRIBUTIONS.md) §6
changes from *"what ships: nothing"*. The obligation is already met — CC BY-SA 4.0 into a
corpus that is already CC BY-SA 4.0 — and it is named out loud because open decision 2a
says a ranking is somebody's work even when it is closer to fact than to expression.

### 6. A wrong answer is **not** explained

**Ruled: no.** `anbieten` really is `an-` + `bieten`, and the population is real: **434 of
1,174 verb cards** decompose onto another card the corpus already carries. It splits
almost exactly in half, and the halves are not the same feature — **216 separable**
(`anrufen` = an- + `rufen`; `aufstehen` = auf- + `stehen`) against **167 inseparable**,
where the same rule says something false: `bekommen` "to get" is not be- + `kommen` "to
come", `erzählen` "to tell" is not er- + `zählen` "to count". A check on the orthography
cannot tell them apart, and the false half contains the most famous false friend in the
language.

Three reasons, any one of which is sufficient: it is a rule of the language, which the
vocabulary ruling excludes; generating the explanation would break commitment 5; and it
would be wrong often enough to be worse than silence. `syn` and `ant` already carry the
word relations the corpus can actually vouch for.

*What is not refused, and is not built:* linking the base card where the base card
exists, making no claim about composition. That is a cross-reference to a fact the corpus
holds. It is a design question for `WordDetail`, not a pedagogy question, and it is
filed, not decided.

### 7. Distractors stay as they are

**Ruled: no change.** The objection — *random distractors make a four-option question
free* — is false and now measured. They were never random: same part of speech, same CEFR
band, two synonymy guards. Swept over 2,282 cards, a reader who knows no German scores
**24.4% picking the longest option**, 16.1% picking the one with the most words and 20.7%
picking the shortest, against **25.0% chance**. Every shape strategy is at or below
chance.

Deliberately *near-miss* distractors remain declined, on the weaker evidence: the
discrimination they force is real and so is the confusion they teach, and the drill they
would be fixing is not broken.

### 8. Typed production is the production this app can grade

**Ruled: `recall` is enough, and the limit is stated rather than closed.** Typing a German
word from its English is production of orthography and is graded honestly — umlaut-folded,
typo-tolerant only where the near miss is not itself a German word. Speech is not scored,
because scoring speech is precisely the thing commitment 3 forbids faking, and a
pronunciation score a machine cannot stand behind is worse than no score.

**Amended the same day, and the amendment is narrow.** `Sag es` — a pronunciation game —
was built on 2026-09-09 and does not reopen this. It **reports what a recogniser heard**
and never claims that is what the learner said; it writes no FSRS card, exactly as the
feed writes none; and its copy says a word *was not caught*, never that it was
mispronounced. The users are non-native speakers and the recogniser is the less reliable
party in the exchange. See [SPEAKING.md](SPEAKING.md).

**And it carries the app's first exception to local-first.** Web Speech runs on Apple's
or Google's servers — there is no in-browser option — so this is the first feature in
Lexi that sends anything a learner produces off the device. It is therefore a place you
go rather than something you meet: entered deliberately, never woven into a session,
and **disclosed in the app's own words before the microphone opens** rather than left to
the system prompt to imply. iOS shows two prompts of its own after that; Lexi's line is
the one that comes first.

### 9. Dwell is a signal, and a signal the scheduler acts on is a signal it **names**

**Ruled: yes — keep the inference, and tell the learner.** The separation from grading was
never in question and stays: 1200 ms of dwell ranks which fresh word is introduced next
and never writes an FSRS card. What was wrong is that the app inferred interest, acted on
it, and said nothing — and it failed twice. `buildBriefing` distinguished *your saved
words*, *words you kept stopping on* and the weak sector, wrote them into
`Briefing.weakSectors`, and **nothing in `src/` read that field**; separately every fresh
card reached the queue as a bare `fresh`, and `whyLine` was silent on it while every other
reason in the union spoke.

`SessionReason` now carries *which* fresh, and the card says **"You saved this one"** or
**"You kept stopping on this in the feed"**. `session.ts` already argued this in its own
header — *the scheduling is the product; a scheduler that can show its work is the only
durable edge* — and it applies to the scheduler's own guesses first. The line reports an
observation and never an inference about knowing or wanting, which is all the app has,
and it is what makes the guess falsifiable by the one person who can falsify it.

### 10. Lexi does not answer *am I ready?*, and now says so

**Ruled: say it plainly, and point somewhere that can answer.** The exam room was deleted
on 2026-09-05 and nothing replaced the question it answered; Fortschritt reports words met
and words known, which is a different and honest claim. Rebuilding an answer would rebuild
exam prep.

Silence was the worse option, because the app shows a CEFR letter and a lit-up level path
— it has made the claim whether or not it means to. `PathCard` now ends with one line:
these letters count the words you have studied here, they are not an exam result, and
Goethe's and telc's free *Modellsätze* are what can tell you.

*Still ruled after 2026-11-26.* The exam room is back and it still does not answer the
question: a sitting reports points on a paper written for Lexi, scaled to what was sat,
beside the 60% line both boards pass at — and the room ends by sending the learner to the
real Modellsätze.

---

## Open decisions — the honest list

These are genuinely undecided. Nothing downstream should assume an answer.

### 1. Accounts and a backend

[BACKEND.md](BACKEND.md) is excellent design work and is explicitly unbuilt; it is kept
for that reason and marked as proposal, not policy. Every teacher and several learners
in [PEDAGOGY.md](PEDAGOGY.md) named the absence of accounts as the single thing they
would lose. **Until this is settled, local-first is the shipping behaviour and no doc
should promise otherwise.**

### 2. Learner-added words

Both reference apps have it — the Goethe-Institut's *Vokabeltrainer* ("add your own
words and integrate them into your learning") and *Vocabulary*. Lexi has the machinery
(`store.addUserWords`, the `usr:` id namespace, `registerWords`, and the recap already
counts mined words), and as of 2026-09-05 **no route into it**: the only caller was the
class-pack importer that went with the school features.

It is not a five-minute job, and that is the point: a hand-typed German noun arrives
without a gender, a plural or an IPA, and commitment 5 forbids generating those. The
honest shapes are (a) look the word up in the shipped corpus first, (b) run the same
de.wiktionary verification the authoring gate uses, at runtime, or (c) admit an
unverified card and mark it as such everywhere it appears. **Undecided.**

### 2a. How much German is there, and have we covered it?

**Measured 2026-09-05** against the *Routledge Frequency Dictionary of German*
(5,009 lemmas with corpus frequencies), by article-stripped headword:

| | |
|---|---|
| Running-text coverage, **all** parts of speech | **75.7%** |
| Running-text coverage, **open classes only** | **88.5%** |
| …of the open-class top 1,000 | **95.4%** |
| Closed-class text mass Lexi omits on purpose | **49.2%** |

That third-from-last row is the honest headline and the last row is why. Half of
all running German is function words — *der, und, in, sein, ein* — and
`corpus/build.ts` excludes closed classes by design, because "learn *und*" is not
a vocabulary card. Against the words a vocabulary trainer is *for*, Lexi carries
**88.5% of the text mass**, and 95% of the commonest thousand.

**"The size of German vocabulary" has no single answer**, and the reason is
structural rather than lexicographic: German compounds productively, so the set
of well-formed nouns is open. Published headword counts (Duden and similar) are
therefore editorial decisions about where to stop, not measurements. The figures
worth aiming at are the CEFR word lists, and Lexi already exceeds the published
B2 range.

**The actionable gap is ~1,483 open-class lemmas** in that top 5,009 — 451 verbs,
294 adjectives, 686 nouns. Reading the list, three kinds:

1. **Inflections the reference lists separately** and Lexi lemmatises — *mehr,
   besser, erste(r), letzte(r), beste(r), nächste(r), lieber*. Mostly not a gap.
2. **Proper nouns and abbreviations** — *Europa, USA, Bayern, EU, SPD* — which the
   pipeline excludes deliberately (`corpus:selftest` asserts it skips `EU`).
3. **Genuine misses**, and this is the target: *der Fall, der Wert, der Sinn, das
   Element, die Abbildung, fühlen, freuen, sorgen, interessieren, beteiligen,
   vergehen, befinden*.

The mechanism to close (3) exists and is machine-gated (`authoring:new`). What is
new is a *demand signal*: the search box now records words a learner looked up and
Lexi did not have, which is the only evidence a local-first app can collect about
its own gaps. See the CHANGELOG.

### 2b. A published frequency ranking

A copy of the *Routledge Frequency Dictionary of German* as an Anki deck (5,009 notes:
rank, headword with principal parts, IPA, up to three senses each with a POS, a gloss and
a bilingual example, and a raw frequency with dispersion) was handed over on 2026-09-05.
Measured against the shipped corpus by article-stripped headword: **Lexi holds 90% of its
top 1,000 and 69% of all 5,009**, and the 1,557 misses are overwhelmingly the
closed-class words — *der, ein, als, dies, kein, sondern, welch, ob* — that
`scripts/corpus/build.ts` **excludes on purpose**. So the "gap" is mostly a decision, not
a hole.

**The blocker is licensing, not usefulness.** Those glosses and examples are a
copyrighted dictionary's expression and cannot be merged into an MIT-code /
CC-BY-SA-corpus project (commitment 4). A *ranking* is closer to fact than expression,
but it is still that dictionary's work, and this is a call to make explicitly rather than
by quietly sorting a list. What is unambiguously clean is using it as a **build-time
audit** that never ships — "does Lexi's own frequency order agree with a published one?"
**Undecided; do not merge without deciding.**

### 3. ~~Bundled reading content~~ — settled 2026-09-24

Lexi ships no one's text; the learner's browser fetches it. See Settled decisions,
*Stories join the feed*. What remains open is the next question down:

### 3b. A relay for the sources a browser cannot read

Spiegel, Zeit, FAZ, Handelsblatt, t3n, golem, GameStar and the specialist motorsport
sites serve their feeds without CORS, so stories cannot come from them. A stateless,
allow-listed fetch relay on the Vercel deploy would reach them — it stores nothing and
sees no learner data, but it is a server, and "no backend" has so far meant *none*.
Motorsport and games are exactly the owner's interests and are thin without it (SRF's
motorsport news; games only by keyword). **Undecided.**

### 3c. Trails — Trailhead's shape for vocabulary *(proposal, 2026-10-02; partly superseded 2026-11-19)*

*The units-of-scenes half now exists as the course (Settled decisions, "The course
returns, as films"). Stamps and ranks remain undecided and unbuilt.*

*The mascot exists (2026-11-23).* The owner asked for one, and she is **Gans**, a goose
whose footprints are German quotation marks (*Gänsefüßchen*) and whose name is a cognate
pair with *goose* ([design/mascot/README.md](../design/mascot/README.md)). She replaces
TRAILS' Dackel. She lives on the public about page (`/about`) and its link preview.
**Inside the app she is still undecided.** Until it is decided, the panel's answer holds:
at milestones, and nowhere else. She keeps the Dackel's refusals: she never guilt-trips,
never mourns a streak, never grades, and never says more than a check proved.


The owner named Salesforce Trailhead as the benchmark for a tangible outcome: units
with objectives and times, quizzes and hands-on checks, badges, ranks, a mascot, and
optimism. [TRAILS.md](TRAILS.md) is the proposal — trails of *scenes* (Anmeldung,
Mietvertrag, Arzt) rather than semantic sectors, stamps backed by a check, ranks with
no leagues. It would narrow two settled things (Track E #5's "nothing picks a card",
and the "you can now" refusal) and is **not built**. Undecided.

### 4. Billing / the supporter tier

No infra exists; the Support link goes to GitHub. Any future tier needs re-deriving from
what the app actually is, which is now a much smaller thing than when this was last
written.

---

## How the docs serve this

| Kind | Files | Rule |
|---|---|---|
| **Anchor** | this file | What we are building. Changes rarely, deliberately. |
| **Live state** | [BACKLOG](BACKLOG.md) · [CHANGELOG](CHANGELOG.md) · [LESSONS](LESSONS.md) · [AUDIT](AUDIT.md) | Open work; shipped work with its reasoning; mistakes and the rules they produced. |
| **Systems** | [DESIGN](DESIGN.md) · [ATTRIBUTIONS](../ATTRIBUTIONS.md) · [BACKEND](BACKEND.md) | How one part works, or is proposed to. Living — argue with them. |
| **Standing critiques** | [PEDAGOGY](PEDAGOGY.md) · [PERSONAS](PERSONAS.md) · [CRITIQUE](CRITIQUE.md) · [COMPETITIVE-RESEARCH](COMPETITIVE-RESEARCH.md) | One lens each, written to be argued with in the file, dated. |

A document that is none of these has finished its job. `BRAIN.md` described the
observatory and `SCHOOL-PITCH.md` described an offer built on print and exam papers;
both were deleted on 2026-09-05 with the features they documented. Git history holds
them.

**The four critiques were written against the seven-product app** and parts of each now
describe things that do not exist. They are kept because their *lenses* are still the
right ones and their findings about the vocabulary core are still live; read them
knowing their date.

---

*Written 2026-08-13, consolidating the anchor material spread across ROADMAP.md
(retired), COMPETITIVE-RESEARCH §5–6, BACKLOG's "decisions required", and the README.
Rewritten 2026-09-05 around the vocabulary ruling. Argue with it here, dated, rather
than in a commit message.*

---

## Two layers, and they never wear the same chrome *(2026-09-05)*

Lexi **teaches** 6,700 cards and **answers** 93,046 dictionary headwords. The first
number is the product; the second is a service the product can afford to offer
because the data was already on disk.

They are different kinds of claim and the UI must keep them apart. A card is
machine-verified by `authoring:new` — gender, plural, part of speech and IPA looked
up and a disagreement a hard reject — and can be studied, drilled and scheduled. An
entry is an unverified Wiktionary gloss with one action: *note this word*, which
feeds the authoring queue.

**The moment an unverified gloss can be drilled, the thing that makes the corpus
worth trusting is gone.** Separate section, separate surface, different words on
screen. See `docs/DICTIONARY.md` for the measurement that decided the split: 11.7%
of dictionary nouns are compounds the matcher already decomposes, and 79.2% are
things a dictionary should hold and a trainer should never teach.

**Refused, on the record:** growing the corpus toward Duden's 148,000 headwords.
Nobody can review 148,000 cards — at 30 new a day that is 13.5 years — and the gate
that makes the corpus trustworthy does not survive being run that many times. The
corpus stops around 12,000; the lexicon answers the rest.

## The gesture grammar *(2026-09-06)*

Horizontal is **one axis with the word at the centre**:

    [ the entry ]        [ THE WORD ]        [ practice ]
                          the feed

You drag toward what you want, and the opposite drag always returns, because the
word never moved. Layers slide *inside* the shell, under the bars — the chrome
never disappears.

**Refused:** extending the strip to the tabs. Nesting a second horizontal axis
inside the word-level one is how a gesture grammar stops being learnable. Tabs stay
taps.

**Refused:** letting the feed grade. Unchanged and load-bearing. What the feed may
record is an *exposure* — a dwell, counted, never an FSRS write — used only to rank
which fresh word is introduced next.
