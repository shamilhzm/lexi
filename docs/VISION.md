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
The identity is **the Atlas**. [DESIGN.md](DESIGN.md) is the system of record.

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
| **Teaching grammar** | *New, 2026-09-05.* See the ruling above. Word facts stay; language rules go. This is the refusal that most needs re-arguing before it is reversed, because the code for it was good. |
| **AI conversation tutor** | Commoditizing category, needs a backend and keys, breaks the privacy-by-architecture story, six better-funded competitors already there. `lib/ai.ts` survives for **build-time corpus enrichment only**. |
| **Competing on content volume** | Duolingo shipped 20,500 units in a quarter. You lose. Do not enter. |
| **Leagues, streak-shaming, social pressure** | Four of six teachers and three of six learners in [PEDAGOGY.md](PEDAGOGY.md) named the absence as the reason they would recommend it. |
| **Machine-marked writing and speaking** | A drill that marks correct German wrong is worse than no drill. |
| **Speech-recognition pronunciation scoring** | Consumer ASR marks accented-but-correct German wrong, punishing exactly the learner who most needs encouragement. Minimal-pair *listening* is the honest version. |
| **A teacher dashboard** | Needs accounts, which every teacher persona named as the thing they would lose. |
| **Saying "you can now …" from a word count** | It would be the most dishonest sentence in the app. |
| **A home screen** | *New, 2026-09-05.* A briefing whose job is to reach a word is a word you have not shown yet. The app opens on the feed. |
| **Grading the feed** | *New, 2026-09-05.* Scrolling is not evidence. A feed that marked words *seen* would feed the scheduler its strongest signal from the app's weakest event. Bookmark is deliberate; a thumb is not. |

---

## Settled decisions

Recorded so they are not re-litigated by drift. Date is when the call was made.

- **English-base** *(2026-07-27)* — stated in the README and the first-run hero.
- **The Atlas identity** *(2026-07-28)* — the terminal is retired.
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
picks a card. `firstRunIds` states a property the *session* must have — **it must be able
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

### 3. Bundled reading content

The text scanner takes whatever the learner pastes, which sidesteps this entirely. If
Lexi ever ships *its own* German text, DW's *Langsam gesprochene Nachrichten* is the
obvious fit and is not automatically redistributable. Decide before, not after.

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
