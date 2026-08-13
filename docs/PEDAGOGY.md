# Lexi — the pedagogic critique

*2026-08-13. Twelve people who teach or learn German, asked one question: **does this
thing teach?** Six learners, six teachers, spread across A1–C2 and across the contexts
German is actually learned in — an Integrationskurs, a VHS evening class, a UK
classroom, a university Lektorat, a 1:1 tutorial, and five kitchen tables.*

---

## Why this is not a fourth persona round

[PERSONAS.md](PERSONAS.md) ends with *"this file is the only persona doc — don't start
a fourth."* That rule was written to stop a fourth **round of the same review**, and it
should hold. This is a different **lens**, and the repo already organises its critiques
that way:

| Doc | Lens | Asks |
|---|---|---|
| [PERSONAS.md](PERSONAS.md) | design | Does it look and move like a thing worth using? |
| [CRITIQUE.md](CRITIQUE.md) | investor | Is this a business? |
| **this file** | **pedagogy** | **Does a person who uses it end up speaking German?** |

Where a finding here overlaps one of those, it is marked and not re-counted. The design
round's `[pedagogy]`-tagged items are treated as **already found** — this file's job is
the ~90% of the pedagogic surface those twelve personas were not looking at.

---

## Method

### What was measured, before anyone had an opinion

Every number below came from the shipped corpus and `src/` on 2026-08-13, not from
memory. They are the evidence the personas argue over.

**Corpus shape** — 6,581 cards: 6,472 vocabulary, 109 grammar.

| | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|
| word cards | 1,186 | 1,409 | **2,300** | 925 | 565 | 196 |
| grammar points | 24 | 28 | 40 | 21 | 12 | 11 |
| grammar exercises | 1,538 | 1,582 | 1,477 | 454 | **86** | **70** |

**Parts of speech** — noun **3,643 (56%)** · verb 1,199 (19%) · adjective 963 (15%) ·
adverb 354 · **phrase 152 (2.3%)** · preposition 60 · conjunction 34 · pronoun 27 ·
number 17 · interjection 16 · **particle 7**.

**Card completeness** — 408 cards with no English definition · 277 with no IPA ·
**480 nouns with no plural recorded** · 4,251 of 6,472 cards carry exactly two
examples · 2,674 carry a synonym, 607 an antonym · 0 carry a collocation or a verb
valency (no such field exists).

**The taxonomy** — 282 sectors. The five largest are **Core verbs (531) ·
Miscellaneous (501) · Adjectives (473) · Core Vocabulary (441) · Adverbs (255)** —
**2,201 cards, 34% of the corpus, in five bins that carry no semantic information.**
At the other end, *Job Application*, *At the University*, *Sightseeing*, *Overnight
Stay* and *Beschwerden* hold **one card each**.

**The machinery** — 10 drill modes · 12 `WORD_POINT` links (the vocabulary→grammar
edge fires on exactly twelve words) · 36 false friends · `NEW_PER_DAY` 24,
`DAILY_DUE_CAP` 60 · placement is **5 self-reported items per level, 60% to climb** ·
6 exam papers, one per level · **no `MediaRecorder`, no `getUserMedia`, no
`SpeechRecognition` anywhere in `src/`**.

**The construct** — `statusOf()` returns `'known'` when the FSRS card reaches
`State.Review`. That card is keyed on `word.id`, which is the **flip**. The flip's
front is the German headword and its back is the English gloss, on every card, always.

### The anti-confirmation problem, again

Twelve personas is a rhetorical device, and a pedagogic brief is even easier to rig
than a design one — every SLA finding has a counter-finding, and a reviewer who wants
"add more features" can always cite someone. The countermeasures from round 3, applied:

1. **Priors declared.** Four of the twelve think Lexi is already better than what they
   use, and say so before the findings.
2. **Two personas are assigned the defence** — T5 (the assessment specialist) defends
   the app's *refusals*, and T2 defends its minimalism against her own profession's
   appetite for dashboards. Their job is the strongest case for changing nothing.
3. **Every persona names one thing they would lose.**
4. **Findings cite a measurement or are labelled judgment.** No finding rests on "the
   research says" alone; where research is invoked, the counter-evidence is named.
5. **The wishlist is ranked by `personas × severity`, then cut.** Twenty-two items
   were proposed and eight were struck — the struck list is at the bottom, with reasons,
   because a wishlist that refuses nothing is a wish, not a list.

### The honesty clause, inherited and sharpened

> A simulation can only find what the simulator can imagine.

For pedagogy this bites harder than it did for design. Pixels can be measured;
**learning cannot be simulated at all.** Nothing in this file is evidence that anyone
learns more or less German. It is twelve informed readings of a mechanism against what
is known about how the language is acquired and how it is taught — which is worth
something, and is not worth what a term of real use would be worth.
[CRITIQUE.md §1](CRITIQUE.md) is right that this is the binding constraint.

Tags: `[construct] [input] [output] [corpus] [diagnosis] [syllabus] [teacher] [l1] [affect] [assessment]`
Severity: **P0** breaks a core promise · **P1** costs a real learner something ·
**P2** friction · **P3** polish.

---

## The six learners

### L1 · Rania — A1, Integrationskurs, L1 Arabic, six months in Leipzig
*prior: has three apps, deleted two*

Twenty hours a week in a BAMF course with *Schritte plus Neu*. Uses Lexi on the tram.

1. `[syllabus]` **P1** — Her course moves by *Lektion*; Lexi moves by sector and CEFR
   band. There is no join, so the app is a second, parallel German course rather than
   support for the one she is failing. (Backlog #44 knows this as "textbook-chapter
   decks" and files it behind the comprehension meter.)
2. `[l1]` **P0** — Arabic has two genders and a definite article that does not decline
   for case. German's three-way gender plus four cases is *the* structural cliff for
   an Arabic L1, and Lexi's gender support is a colour on the headword and a
   three-option drill. The 36 false friends in `falseFriends.ts` are all
   English→German; **there is no L1 layer for anyone else**, and the app's own README
   commits to English-base, which is a statement about the *gloss language*, not a
   reason the difficulty model has to be English-shaped.
3. `[corpus]` **P1** — She needs `das Formular`, `die Anmeldung`, `der Termin beim
   Amt`. The A1 relevel (2026-08-11) landed exactly these, and they sit in sectors
   called *Administration* (46 cards) and *Miscellaneous* (501). The topic she is
   revising on Tuesday exists; nothing lets her ask for it by name.
4. `[input]` **P1** — 10 of 7,389 cards have a human voice. Everything she hears is
   synthesis, and the thing she cannot do is understand the woman at the Bürgeramt.
   Synthesis teaches citation form; the exam and the counter both use connected speech.
5. `[output]` **P2** — She can be asked to spell a sentence she hears (Diktat) and to
   pick a gender. She is never once asked to *say* anything, and never asked to
   produce a German word from an English prompt.
6. `[affect]` — The circuit breaker after four misses is the kindest thing any of her
   apps does, and no other app she has used would rather lose the session than grind
   her. Credit where it is due.
7. `[teacher]` **P1** — Her Kursleiter cannot see any of this, cannot assign any of
   it, and cannot print any of it. See T1.
8. *What she'd lose:* "It never tells me I'm doing well when I'm not. The owl lies."

---

### L2 · Kenji — A2, 41, engineer in Munich, L1 Japanese
*prior: **defends** SRS; has 6 years of Anki behind him*

The persona this whole file is really about.

1. `[construct]` **P0** — **He can "know" 2,000 words and not order a coffee, and Lexi
   will call him A2+ the whole way.** Every `known` card is a German form that produced
   an English meaning. `statusOf` reads the flip card; the flip's front is always the
   German. **There is no English→German recall track anywhere in the app** — not in
   the flip, not in cloze (which is German-in-German multiple choice), not in the
   Fundamentals modes except `transform` (a verb form, given the verb) and `dictation`
   (a spelling, given the sound). His condition is the exact gap between recognition
   and production, and the headline number is blind to it.
2. `[construct]` **P0-adjacent** — The fix is unusually cheap and the architecture is
   already built for it. Drills live at `gym:<mode>:<wordId>` with their own FSRS
   schedule, precisely so recognising and producing a word can be scheduled apart —
   the CHANGELOG says so. A `recall` mode (EN prompt → type the German, with the
   article for nouns) is a new entry in `Mode`, a pool predicate, and one item
   component. **The hardest part — a separate schedule for productive knowledge —
   already exists and is unused for the thing it was built for.**
3. `[l1]` **P1** — Japanese has no articles at all. He does not have a *wrong* gender
   intuition; he has none, and the gender drill's three buttons let him score 33% by
   luck and 60% by noun-ending heuristics he has never been told. The
   `-ung/-heit/-keit/-schaft/-ion → die` rules are worth more to him than 400
   repetitions, and `gram:A1:Artikel & Genus` states the system without stating the
   endings.
4. `[diagnosis]` **P1** — He misses `Kasus` a lot. `logMiss(MODE_TAG[mode], term)`
   records the string `"Cases & endings (Kasus)"` and the word. **The drill knew which
   case it asked and which option he picked, and threw both away.** So the app can tell
   him *that* Kasus is weak and can never tell him he confuses Akkusativ and Dativ
   after Wechselpräpositionen — which is the actual, teachable, single fact about his
   German.
5. `[output]` **P1** — Nothing in the app is longer than a sentence, in either
   direction. Lesen serves sentences; Diktat takes sentences; the sentence builder
   builds one sentence. A2→B1 is where a learner stops producing sentences and starts
   producing *turns*.
6. `[input]` **P2** — `i+1` in `reader.ts` is the right target and a genuinely good
   idea. It is applied to isolated example sentences, so it delivers 16,000
   unconnected i+1 sentences and no text. Krashen's argument was about *narrative*;
   an i+1 sentence with no discourse around it is a well-chosen flashcard.
7. `[corpus]` **P2** — 56% nouns. Nouns are the cheapest thing to put on a card and
   the least productive per item; what unlocks his speech is verb valency —
   `warten auf` + Akk, `sich freuen über` + Akk, `teilnehmen an` + Dat — and **no card
   carries a valency field**. There is a B2 point called *Verben mit Präpositionen*
   and 1,199 verb cards that do not know their own preposition.
8. `[construct]` **P2** — Retention is settable to 85/90/95%, which is more control
   than Duolingo will ever give him and less than Anki. He would want per-deck
   retention: 95% for the 300 words he needs at work, 85% for the rest.
9. *What he'd lose:* "The interval previews. I have never seen another app tell me the
   truth about when a card comes back before I answer it."

---

### L3 · Aisha — B1, 19, second-year university German, essays marked weekly
*prior: neutral; uses whatever the department tells her to*

1. `[output]` **P0** — She is assessed on a 250-word text with a rubric. Lexi's entire
   writing surface is Diktat (transcription, target known to the character) and the
   exam's letter, which she marks herself against telc's criteria. **The app can help
   her with none of the thing she is actually graded on**, and CRITIQUE's four-skills
   table already says so; from her chair it means Lexi is a warm-up, not a tool.
2. `[assessment]` — The self-assessment grid is better than she expected and better
   than her seminar gives her. Handing the learner the examiners' own descriptors
   instead of a fake score is the right call and she'd defend it. **Credit.**
3. `[syllabus]` **P1** — Her course is organised by *Themen* (Migration, Digitalisierung,
   Nachhaltigkeit) and by *Redemittel* — the phrase banks every German course ends a
   chapter with. **The corpus holds 152 phrase cards, 2.3% of the vocabulary**, and 3
   of them are at B2. Her essays live or die on *einerseits … andererseits*, *im
   Gegensatz dazu*, *das lässt sich damit begründen, dass …*, and Lexi teaches single
   lemmas.
4. `[corpus]` **P1** — Her level holds 2,300 word cards — **36% of the whole corpus at
   one level** — while C1 has 565. The distribution is shaped like the source lists,
   not like a learner's path.
5. `[diagnosis]` **P2** — She wants to hand her tutor "here is what I keep getting
   wrong." `missStats(30)` holds exactly that and renders it as a blind-spot list
   inside the app. There is no export, no print, no page.
6. `[input]` **P2** — No paragraph exists in the app to read. Discourse-level cloze is
   in the backlog and correctly marked blocked on having paragraphs at all.
7. *What she'd lose:* "The grammar bank. 5,000 exercises with an explanation on every
   wrong answer is more than my textbook has."

---

### L4 · Paulo — B2, 29, Brazilian nurse working toward Anerkennung
*prior: wary; has paid for three courses*

The commercially largest DaF cohort in Germany, and nobody has modelled them here.

1. `[syllabus]` **P1** — He needs *Fachsprache Pflege* and the B2/C1 Medizin exam:
   Anamnese, Übergabe, patient-facing register. Lexi has 6,472 general words and a
   `Health` sector of **50 cards**. He is not the target user and the app never says
   so — the level filter implies that B2 is B2.
2. `[corpus]` **P1** — What he needs most is register-paired: *"Haben Sie Schmerzen?"*
   to a patient, *"Der Patient klagt über …"* in a handover. `syn` holds 2,674 entries
   and **none carry register**. The backlog names this at C1 (#45); it bites at B2 for
   anyone working in German.
3. `[output]` **P0** — His exam is 60% spoken. The Speaking lab's three-strength model
   answers are genuinely the best idea in the exam surface — *"on the day you step down
   the ladder rather than off it"* is exactly right — and **he cannot record himself,
   cannot hear himself, and gets no feedback of any kind.** There is no
   `MediaRecorder` in the codebase. Even a local, never-uploaded recording played back
   beside the model would do most of the work; DSGVO is not the obstacle, because
   nothing has to leave the device.
4. `[input]` **P1** — Same 10 human recordings. At B2, listening is the subtest people
   fail, and it fails on speed and connected speech, which is exactly what synthesis
   normalises away.
5. `[construct]` **P2** — `readiness.ts` refusing to blend preparation and performance
   into one number is the most honest thing in the app, and it is the reason he trusts
   the rest. **Credit, and it should be louder.**
6. `[assessment]` **P2** — One paper per level. He will sit the B2 paper once and has
   then spent it. The backlog knows; for him it is the difference between a study plan
   and a demo.
7. *What he'd lose:* "The readiness screen. It's the only app that has ever told me I'm
   not ready."

---

### L5 · Ingrid — C1, 52, Norwegian, fifteen years in Germany
*prior: **defends** minimalism; hates gamification*

The plateau learner. Fluent, fossilised, and not improving.

1. `[diagnosis]` **P0** — Her problem is not gaps, it is **entrenched wrong forms**:
   the wrong gender on eleven common nouns, `bekommen`/`werden` still wobbling, a
   preposition she has used wrongly for a decade. Lexi has no concept of a fossilised
   error. FSRS schedules by *forgetting*, and a fossilised error is the opposite — a
   thing recalled fluently and wrongly, forever. Nothing in the app looks for a card
   with high stability and repeated lapses and says *"you don't have a memory problem
   here, you have a belief."*
2. `[l1]` **P1** — Norwegian gives her 60% of the vocabulary for free and charges her
   for it in false friends and word order. `falseFriends.ts` is a good instrument
   pointed at exactly one language, and its 36 entries are the English set.
3. `[corpus]` **P1** — What separates her C1 from a C2 is **Modalpartikeln** — *doch,
   mal, eben, halt, wohl, schon, denn* — the thing that makes German sound German.
   The corpus holds **7 particle cards**, of which one (`doch`) is a modal particle,
   and one (`jedermann`) is a pronoun mislabelled. There is a B2 point called
   *Modalpartikeln II*; the words it is about are not in the lexicon.
4. `[corpus]` **P1** — At C1 vocabulary work *is* collocation work. No card has a
   collocation field. 565 C1 cards and **86 C1 grammar exercises — 1.7% of a
   5,207-item bank** for the level where the exercises would have to be hardest.
5. `[construct]` **P2** — Her Known number goes up while her German does not, because
   Known measures recognition and she recognises everything.
6. `[affect]` — She would delete the app the day it congratulated her. It hasn't.
7. *What she'd lose:* "That it is not trying to be my friend."

---

### L6 · Sofia — A2, 67, retired, learning to talk to her son's family
*prior: wary of all software; her granddaughter installed it*

The learner with no exam, no deadline and no interest in a number.

1. `[affect]` **P1** — Every framing device in the app is instrumental: a level, a
   goal date, a projection, a percentage, a readiness score. She has no goal date. The
   goal line — the app's best sentence for Deniz — is for her a demand she did not
   make. There is no shape of use here that is simply *"a few words most days,
   forever."* The backlog has "a maintenance mode for the arrived" (#42) for C2; the
   same shape serves the learner who never intends to arrive.
2. `[input]` **P1** — What she wants is to follow a conversation at Sunday lunch. That
   is listening, at speed, with interruptions. She gets 10 human recordings and a
   speaker button.
3. `[corpus]` **P2** — Her German is entirely about one topic: family, food, health,
   the weekend. The topics exist — *Relationships* 46, *Food & drink* 97, *Health* 50 —
   and she cannot pick them without going through a treemap that shows her 282 sectors
   including *Politics* and *Skiing and snowboarding*.
4. `[construct]` **P2** — 24 new cards a day is a default set for someone who will do
   this for years. She wants six. `PACE` exists and is a three-way toggle in Settings,
   two levels deep, named *Relaxed/Steady/Intense* — a pace, not a promise about her day.
5. `[affect]` **P2** — The circuit breaker offers her an exit after four misses. What
   she needs at that moment is an easy win. Backlog #18, and she is the reason it is
   a P1 rather than a nicety.
6. *What she'd lose:* "It doesn't shout. And the words are real words, not a cartoon
   bear buying a hat."

---

## The six teachers

### T1 · Herr Özdemir — Integrationskurs, A1–B1, 22 in the room
*prior: neutral; institutionally forbidden from most apps*

The largest German-teaching context in Germany, and the one with the hardest
constraints: mixed literacy, mixed L1, no devices guaranteed, no student accounts
permitted.

1. `[teacher]` **P0** — **He cannot print anything.** A worksheet with an answer key
   is the single highest-value artefact any teacher can be handed; it needs no
   backend, no accounts, no sync, and no DSGVO exposure. Lexi holds 5,207 grammar
   exercises with authored explanations and 6,472 cards and can emit **none of it onto
   paper**. This is the cheapest unbuilt thing in the entire product.
2. `[teacher]` **P0** — It also **resolves the contradiction [CRITIQUE §2](CRITIQUE.md)
   says someone has to pick.** "Your students' data never leaves their device" and
   "here is your students' data" are indeed incompatible. *Print* is not: the teacher
   gets a real artefact, the learner's data stays put, and nothing is claimed that
   isn't true.
3. `[teacher]` **P1** — `classpack.ts` lets a learner hand another learner a deck as a
   JSON file. It is a good, honest piece of work and it is the wrong direction: the
   flow he needs is **teacher → 22 learners**, and the file has to travel by
   WhatsApp because that is what his class uses.
4. `[syllabus]` **P1** — Binnendifferenzierung is his whole job: the same topic at
   three levels in one room. Lexi's level filter is global and per-device.
5. `[l1]` **P1** — Nine L1s in the room. The English-base commitment is defensible;
   for half his class the gloss is a second foreign language, and IPA — present on
   96% of cards and never explained — is worth more to them than the English is.
6. `[corpus]` — The A1 relevel against the published Goethe Wortliste is exactly the
   right kind of work and he would want to know it happened. It is invisible in the app.
7. *What he'd lose:* "That I don't have to ask anyone's permission to recommend it.
   No account means no form to file."

---

### T2 · Ms. Clarke — UK secondary, Year 9 → GCSE, teaches to a prescribed wordlist
***assigned the defence** of minimalism*

1. `[teacher]` — **The defence:** "Do not build me a dashboard. I have six of them and
   I look at none. What I need is for the thing to work on a school iPad, offline, with
   no logins, and to not be a safeguarding incident. Lexi is the only tool I have seen
   that is *architecturally* incapable of leaking my Year 9s. That is the feature."
2. `[teacher]` **P1** — **The qualification:** she still needs to assign the wordlist
   her exam board prescribes, and to know it was done. The honest local-first version
   is not a dashboard — it is a **pack she distributes and a receipt the learner
   hands back**: a signed, minimal, learner-initiated summary ("38 of 40, 12 min,
   these 6 wrong"), exported by the student, not collected by the app.
3. `[syllabus]` **P1** — Her vocabulary is *prescribed*, publicly published, and
   examined. Lexi cannot ingest a list. `classpack` imports whole cards from another
   Lexi; there is no "paste 200 German words and build me a deck" path, even though
   the matcher, the corpus and the card model would do most of it.
4. `[corpus]` **P2** — Half her list is not in the corpus at her level, and when it
   is, the definition is one of the 1,493 flagged as a translation list rather than
   a definition (`corpus:definitions`, ⟳ Now #5).
5. `[teacher]` **P2** — Thirty teenagers need a *game* they will play against each
   other. Tipprennen races two fixed-pace bots. (Noted: the worktree this review was
   run in is named for exactly this question.)
6. `[assessment]` **P2** — She wants a five-minute printable diagnostic in week one.
   The placement test is the instrument and it lives on a device, one learner at a time.
7. *What she'd lose:* "No accounts. If you add a login I cannot use it at all."

---

### T3 · Frau Lindner — VHS evening class, A1–A2, uses *Menschen*
*prior: **defends** the app; recommends it already*

1. `[syllabus]` **P0** — "My learners ask me every term: which app matches the book?
   The answer is none of them, and this one is closest and still no." Chapter decks
   (backlog #44) are the single thing that would move her from recommending it to
   *assigning* it.
2. `[corpus]` **P1** — Her chapters are *functions*: introducing yourself, ordering,
   apologising, making an appointment. Lexi's units are semantic fields and CEFR
   bands. **The functional sectors exist and hold one card each** — *Job Application*
   1, *At the University* 1, *Sightseeing* 1, *Overnight Stay* 1. The taxonomy has the
   right names and none of the content.
3. `[corpus]` **P1** — **34% of the corpus sits in five bins that are not topics at
   all** — *Core verbs* 531, *Miscellaneous* 501, *Adjectives* 473, *Core Vocabulary*
   441, *Adverbs* 255. The treemap is the app's signature screen and a third of it is
   labelled with parts of speech and a shrug. `weakestSectors()` also *feeds fresh
   vocabulary off this taxonomy*, so the noise is not merely cosmetic — it decides
   what a learner meets tomorrow.
4. `[teacher]` **P1** — She would set homework tonight if she could. See T1.1.
5. `[input]` **P2** — Her book comes with audio for every dialogue. Lexi has ten.
6. `[teacher]` **P3** — *Beschwerden* is a German sector name in an otherwise-English
   taxonomy. She noticed; her learners would too.
7. *What she'd lose:* "It's free and it works on the bus with no signal. Half my class
   has a data limit."

---

### T4 · Dr. Novak — university Lektor, B2–C1 Wissenschaftssprache
*prior: hostile to apps generally*

1. `[corpus]` **P0** — "Your C1 is a rumour." **86 C1 exercises and 70 C2 exercises,
   3% of a 5,207-item bank, against 1,538 at A1.** The grammar points chosen for C1 —
   Funktionsverbgefüge, Nominalisierung ↔ Verbalstil, Passiv-Ersatzformen — are exactly
   right, which makes the thinness worse: someone knew what belonged there and then
   there was nothing behind it.
2. `[corpus]` **P1** — Academic German is a *collocation* problem and a *nominal style*
   problem. No collocation field; 56% of the corpus is bare nouns with a gloss.
3. `[output]` **P1** — His students must summarise, cite, hedge and mediate.
   **Mediation** is a full mode of the CEFR Companion Volume (2020) and no product in
   the category touches it — an actual open position, not a catch-up item.
4. `[construct]` **P2** — "Known" at C1 means recognising a word in isolation, which
   is the level at which that measurement stops meaning anything.
5. `[assessment]` — The refusal to machine-mark writing and speaking is correct and he
   would say so in public. **Credit.**
6. *What he'd lose:* "The IPA, the honesty about what it hasn't measured, and the fact
   that it never once tried to sell me a streak."

---

### T5 · Dr. Weiss — testing & assessment specialist, ex-examiner
***assigned the defence** of the refusals · the sharpest voice here*

1. `[assessment]` — **The defence, made first and made properly:** "This product
   refuses, in code, four things the whole category does. It will not machine-mark
   writing. It will not machine-mark speaking. It will not say *'you can now describe
   your daily routine'* on the strength of a word count — read the comment at the top
   of `candos.ts`, it is better reasoning than most published rubrics. And it will not
   average preparation with performance into one reassuring number. **Those four
   refusals are worth more than any feature on this wishlist.** Build nothing that
   costs you one of them."
2. `[assessment]` **P0** — **The placement test is not valid, and it is the one
   instrument whose output is written into everything else.** Five self-reported
   items per level, 60% to climb, and the claimed words are seeded into FSRS as
   `Rating.Good`. This is a Yes/No vocabulary test, an instrument with a
   well-documented failure mode — **overclaiming** — and a standard correction:
   **pseudoword foils** (Meara & Buxton 1987; Mochida & Harrington 2006). A learner
   who ticks *Erkennung*, *fahrlässig* and *das Blumet* gets a level they can't hold
   and a schedule seeded with words they cannot recall. **The correction is cheap:**
   German pseudowords are trivially generable, and a false-alarm rate against them
   gives a real correction factor rather than a guess.
3. `[assessment]` **P0** — **Five items per level is below the resolution of the
   decision it makes.** On five binary items with a 60% cut, three-versus-two decides
   the level, and one lucky cognate is 20 percentage points. The measurement error is
   larger than the band it is measuring. The `isTransparent` filter is a genuinely
   good instinct pointed at the right problem — it just cannot rescue a five-item test.
4. `[construct]` **P0** — **"Known" is a receptive construct doing the work of a
   general one.** She would not object to a receptive measure; she objects to it being
   unlabelled. "2,320 known" should read "2,320 recognised", and the day a productive
   track exists it should read as two numbers. The app's own house style — the honest
   due line, the two-number readiness — already sets this standard everywhere else.
5. `[diagnosis]` **P1** — Misses are logged as `(mode-tag, term)`. Every drill knows
   more than that at the moment it grades: the case it asked, the option chosen, the
   distractor's type. **Logging the chosen wrong answer turns a weakness list into a
   diagnosis** — and it is the missing input for the exam surface's per-concept
   readout, which the backlog already wants and correctly says it cannot build.
6. `[assessment]` **P1** — Grammar exercise ids are positional (`gex:<level>:<i>:<j>`).
   The backlog has this as a data-integrity hazard, which it is. It is also a
   *measurement* hazard: reorder a level and every learner's mastery record silently
   re-points. She would not accept that in an instrument that reports readiness.
7. `[assessment]` **P2** — Six papers, one per level, each spendable once. A test you
   can sit twice is a different instrument from a test you can sit once.
8. *What she'd lose:* "The four refusals. Everything else is negotiable."

---

### T6 · Elena — private online tutor, 1:1, all levels, 40 students
*prior: neutral; pays for tools that save her prep*

1. `[teacher]` **P0** — Her business is the 167 hours between lessons. She needs the
   student to arrive having done something and needs to see what. The honest
   local-first shape is a **learner-exported session report** — she never touches their
   device, they send her a file or a printout. Nothing like it exists.
2. `[teacher]` **P1** — Her first ten minutes with a new student is a diagnostic she
   runs by hand. A printable, level-spanning diagnostic with an answer key would save
   her 40 × 10 minutes a year, and every ingredient is already in `grammar.json`.
3. `[syllabus]` **P1** — She teaches by task ("book a flat viewing"), assembles her
   own Redemittel sheets, and would pay for the app's version. 152 phrase cards.
4. `[teacher]` **P2** — She wants to build a deck from a lesson and send it. `classpack`
   exports — but only what the learner already has, not an arbitrary set she chooses.
5. `[affect]` **P2** — Half her students are Sofia. The app's framing assumes all of
   them are Deniz.
6. *What she'd lose:* "That I can recommend it without becoming someone's data
   controller."

---

## Consolidated findings — 73 raw, 18 distinct

Ranked by `personas × severity`. **Marked ⟳ where BACKLOG or CRITIQUE already carries
the item** — those are re-ranked here from the pedagogic side, not discovered.

| # | Finding | Sev | Personas | Tag |
|---|---|---|---|---|
| 1 | ✅ **No productive (EN→DE) recall track anywhere.** `known` is recognition, on every card, always — and per-mode FSRS was built to carry exactly this and doesn't. **Shipped 2026-08-13** as the `recall` mode: 3,675 gated cards, article required for nouns, gated on the flip card reaching Review so recognition unlocks production. See the CHANGELOG. | **P0** | L2, L5, T4, T5 | construct |
| 2 | ✅ **The placement test is a 5-item Yes/No test with no foils**, and it seeds FSRS with what the learner claims. **Shipped 2026-08-13.** | **P0** | T5, L1, L2 | assessment |
| 3 | ✅ **Nothing can be printed.** No worksheet, no answer key, no diagnostic — and print is the local-first answer to the B2B contradiction. **Shipped 2026-08-13.** | **P0** | T1, T2, T3, T6 | teacher |
| 4 | ✅ **Misses are logged as a mode tag, not as an error.** The distractor chosen is known at grade time and discarded. **Shipped 2026-08-13.** | **P0** | T5, L2, L3 | diagnosis |
| 5 | ⟳ **Speaking has no recording**, though local-only playback needs no backend and breaks no promise. | **P0** | L4, L1, T6 | output |
| 6 | ⟳ **Listening is 10 human recordings.** Synthesis teaches citation form; every exam tests connected speech. | **P0** | L1, L4, L6, T3 | input |
| 7 | **The corpus is 2.3% multi-word and 7 particles.** Redemittel and Modalpartikeln are what German courses teach and what fluency sounds like. | **P1** | L3, L5, T3, T6 | corpus |
| 8 | **34% of cards sit in five non-semantic bins**, and `weakestSectors()` feeds tomorrow's vocabulary off that taxonomy. | **P1** | T3, L6, L1 | corpus |
| 9 | ⟳ **No textbook/chapter alignment**, and the functional sectors that would carry it hold one card each. | **P1** | T3, L1, T6 | syllabus |
| 10 | ⟳ **C1/C2 is 3% of the exercise bank** (156 of 5,207) against 1,538 at A1. | **P1** | T4, L5 | corpus |
| 11 | **No collocation and no verb valency field.** 1,199 verbs that don't know their own preposition. | **P1** | L2, L5, T4 | corpus |
| 12 | **No fossilisation model.** FSRS finds forgetting; a plateau learner's problem is fluent, stable, wrong. | **P1** | L5 | diagnosis |
| 13 | **Nothing longer than a sentence exists**, as input or output, anywhere. | **P1** | L2, L3, T4 | output |
| 14 | **The L1 layer is 36 English false friends and nothing else** — no difficulty model for any other L1, and no noun-ending gender heuristics for learners with no article system. | **P1** | L1, L2, L5, T1 | l1 |
| 15 | **No learner-initiated export of what happened** — the only privacy-safe way a teacher ever sees anything. | **P1** | T6, T2, L3 | teacher |
| 16 | **No non-instrumental shape of use.** Every frame is a level, a date or a projection. | **P1** | L6, T6 | affect |
| 17 | ⟳ **The circuit breaker offers an exit, not an easier item.** | **P1** | L6, L1 | affect |
| 18 | ⟳ **One paper per level, spendable once**; positional `gex:` ids make mastery records fragile. | **P2** | T5, L4 | assessment |

---

## The wishlist

What these twelve would ask for, ranked by `value ÷ cost` with the architecture's
constraints treated as fixed — **no accounts, no backend, no telemetry, nothing that
requires a learner's data to leave their device.** Every item below is compatible with
that. Where the backlog already has it, that is marked and the pedagogic case is the
new part.

### Tier 1 — cheap, and each one changes what the product *is*

1. ✅ **A `recall` drill mode: English prompt → type the German** (with the article for
   nouns). **Shipped 2026-08-13.** The estimate held — one `Mode` entry, one pool
   predicate, one item component — and the work that was not estimated was the *gate*:
   529 cards share a gloss with another card (`table` is both *der Tisch* and *die
   Tabelle*), so the pool had to exclude them or the drill would mark correct German
   wrong. 3,675 cards survive. Eligibility in a mixed session additionally requires the
   word's flip card to have reached Review, so recognition unlocks production.
   **Item 5 below is now unblocked and is the natural follow-up.**
2. ✅ **Log the wrong answer, not just the miss.** **Shipped 2026-08-13.** Blind spots
   now read *"reaches for **den** when it should be **Dativ** 4×"*. The Kasus drill
   logs the **case** rather than the article, because the same surface pair means
   different things on a masculine noun and a plural; mapping the chosen form back to
   a case is refused for the same reason. Typed drills contribute nothing, on purpose.
   **The exam's per-concept readout is now unblocked.**
3. ✅ **Print.** **Shipped 2026-08-13** as `#/print`, reached from the Library beside
   Exam practice. Five sheets — vocabulary either direction, gap-fill from the cards'
   own sentences, a grammar point, and the learner's own error log — each with an
   answer key that breaks to its own page. `order` and `error` exercises are dropped
   from grammar sheets on purpose: they are interactions, and transcribed they become
   questions nobody can answer with a pen.
4. ✅ **Pseudoword foils in placement, and more items.** **Shipped 2026-08-13.** 22
   hand-authored foils (not generated — a generator eventually emits a real word, and
   telling a learner *Kringel* is invented is the same defect as marking correct German
   wrong), two per level, probes raised 5 → 7. The climb uses Meara's correction
   `(h−f)/(1−f)`, and **nothing is seeded into FSRS when the false-alarm rate clears a
   third** — the schedule corruption was the real damage, not the level. Measured: a
   learner claiming everything now lands at A1 with 0 seeded, where they previously got
   C2 and ~42 seeded words.
5. ✅ **Rename the headline. "2,320 recognised."** **Shipped 2026-08-13**, and it turned
   out to be two things rather than a string: the label, and the *second* number beside
   it once recall has data. The two are counted separately and never averaged. Applied
   to every surface making the same claim, because saying "recognised" on one screen
   and "known" on the next is the inconsistency, not the fix. The per-card status pip
   keeps new/learning/known — that is a card's scheduling state, not a claim about
   the learner.

### Tier 2 — the content work, ordered by who is hurt most

6. **Redemittel as a first-class card kind.** The functional chunks every chapter of
   every DaF book ends with, at A2–B2 where they do the most work. The corpus has 152
   phrase cards; this is the largest content gap in the product and it is what makes
   people sound German rather than merely correct.
7. **Modal particles, properly.** *doch, mal, eben, halt, wohl, schon, denn, ja* — with
   the B2 point that already exists pointed at cards that exist. Currently 7 particle
   cards, one of them a mislabelled pronoun.
8. ⚠️ **Verb valency on the card.** `warten auf` + Akk. **Partly shipped 2026-08-13,
   and the estimate was wrong.** "Derivable from the corpus's own examples via the
   matcher" does not hold: probed before building, mining fires on 238 verbs (20%) and
   about **one in twelve is genuine** — *trinken bei der Hitze* is not government. See
   [LESSONS.md](LESSONS.md) class 2.
   What shipped instead is the honest part: the **45 cards that already carry their
   government in the headword** are now parsed into a structured field and shown on the
   card, and the case is filled by rule for one-way prepositions (`zu` → Dativ, `für` →
   Akkusativ) and **refused for two-way ones**, because which case `auf` takes after a
   verb *is* the missing fact. Growing past 45 is authoring, not mining.
9. **Fix the taxonomy.** Re-sector the 2,201 cards in *Miscellaneous / Core Vocabulary
   / Adjectives / Adverbs / Core verbs*, and fill the functional sectors that currently
   hold one card. The treemap is the app's best screen and a third of it says nothing;
   `weakestSectors()` is choosing tomorrow's words from it.
10. **C1/C2 exercise depth.** 156 items for two levels. ⟳ Known; the pedagogic point is
    that the *point selection* is already right, so this is volume against a good plan.
11. **Collocation and register on B2+ cards.** ⟳ Backlog #45, moved earlier: it bites
    at B2 for anyone working in German, not only at C1.

### Tier 3 — the shapes the app doesn't have

12. **A fossilisation pass.** Find cards with high FSRS stability *and* repeated
    lapses — recalled confidently and wrongly — and treat them differently from
    forgotten ones: interrupt, contrast, re-teach. Nobody in the category does this
    and Lexi already holds the data.
13. **A learner-exported lesson report.** One page: what was studied, what was missed,
    what to bring to a lesson. The learner sends it; the app never does. This is the
    only teacher-visibility mechanism that costs the architecture nothing.
14. **Ingest a wordlist.** "Paste 200 German words → a deck." ⟳ Adjacent to the
    comprehension meter (Now #2) and cheaper; it serves T2's prescribed list and T6's
    lesson decks today.
15. **Minimal-pair listening.** ü/u, ö/o, ich/ach, final devoicing — discrimination
    tasks built from IPA + TTS. The honest local-first pronunciation feature: it
    trains the ear, which is where fossilised pronunciation actually starts, and needs
    no microphone and no model.
16. **A maintenance shape, for the arrived *and* the unhurried.** ⟳ Backlog #42, widened:
    low-volume, no projection, no deadline, no level. Serves L6 and L5, not just C2.
17. **Record-and-compare in the Speaking lab.** Local `MediaRecorder`, never uploaded,
    played back beside the model answer. No scoring, no ASR — hearing yourself next to
    the model is most of the value and keeps every refusal intact.
18. **Textbook chapter decks.** ⟳ Backlog #44. Two teachers make it their first ask;
    it is what converts "I recommend it" into "I assign it."

### Struck from the wishlist, with reasons

Because a list that refuses nothing is a wish.

- **A teacher dashboard.** T2 argued against it while wanting the outcome, and she is
  right: it needs accounts, which costs the one thing every teacher here named as what
  they'd lose. Items 3, 13 and 14 get most of the value at none of the price.
- **AI conversation practice.** ⟳ Cut on the record already; nothing here reopens it.
- **Automatic writing correction.** T5 and T4 both defend the refusal. A drill that
  marks correct German wrong is worse than no drill.
- **Speech recognition / pronunciation scoring.** Same argument. Consumer ASR marks
  accented-but-correct German wrong, which teaches the wrong lesson to exactly the
  learner who most needs encouragement. Item 15 is the version that works.
- **L1 packs for nine languages.** Real (L1, T1), and it multiplies every content item
  by nine against an already-gated authoring pipeline. Gender heuristics and IPA serve
  the same learners at a fraction of the cost.
- **Gamified streaks / leaderboards / social.** Four of six teachers and three of six
  learners named the absence as the reason they'd recommend it.
- **Mediation tasks (CEFR CV 2020).** T4's point is correct and it is a genuinely open
  position in the market — and it needs paragraph-length text and human marking, both
  of which are further out than everything above.
- **Per-deck retention.** L2 alone, and FSRS's global target is already more control
  than the category offers.

---

## The verdict

**Labelled as judgment, not finding.**

The design round found an aesthetic that *promised* density and shipped sparseness. The
pedagogic reading is the mirror image, and it is a better problem to have:

**Lexi is a genuinely excellent instrument for one half of one skill, and it is honest
about almost everything except which half.**

The half it does — receptive vocabulary and explicit grammar, spaced, interleaved,
diagnosed, and explained — it does better than anything in the category. The scheduler
shows its work. The drills gate on real grammatical safety. The exam surface refuses to
fake a score. The `candos.ts` comment is better reasoning about CEFR than most
published rubrics. **Four separate refusals are encoded in the source**, and every
teacher here named one of them as what they would lose.

What it does not do is **production**. Not speaking, which is known and costly; but also
**not the cheap kind** — the English prompt that makes you produce a German word, which
is one drill mode away and for which the scheduling architecture already exists,
already namespaced, already tested, and currently used for nine modes that are all
either recognition or transformation of something the app has already shown you.

That is the finding, and it is not "add more features." It is that **the product's
headline number measures the easier half of what it has already built the machinery to
measure**, and that a learner can walk the whole path — placement, session, drill,
exam, readiness — and never once be asked to say a German word that wasn't already on
the screen.

### Recorded dissent, verbatim

T2: *"Do not build me a dashboard. I have six of them and I look at none."*

T5: *"Those four refusals are worth more than any feature on this wishlist."*

L5: *"My Known number goes up while my German does not. That isn't the app lying — it
is me reading a receptive measure as a general one, because it isn't labelled."*

### The unanimity check

Not unanimous, and deliberately. Two personas defended the current shape outright; L1,
L6 and T3 would trade a great deal of the instrument for one thing it doesn't have
(audio, and a chapter that matches their book). The clustering is the useful signal:
**every learner above A2 asked for production, and every teacher asked for paper.**
Neither costs an account.

---

*Maintenance: when an item ships, mark it here and move the detail to
[BACKLOG.md](BACKLOG.md)'s shipped log. Rebuttals belong in this file, dated — the point
of writing the pedagogic case down is that it can be argued with rather than
re-derived. This is the pedagogy lens; [PERSONAS.md](PERSONAS.md) remains the only
**design** persona doc and its "don't start a fourth" rule is unaffected.*
