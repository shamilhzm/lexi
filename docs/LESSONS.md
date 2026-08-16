# Lessons — mistakes caught, and the rules they produced

**Append-only. Write here the moment a mistake is caught, before fixing it.**

This file exists because the same four mistakes keep happening in this project, and each
time they cost half a day and briefly reordered a planning document. The reasoning was
being recorded in whichever file the mistake happened to land in — the top of
`audit.ts`, a withdrawn finding in BACKLOG, a corollary in DESIGN §7, a reverted entry in
CHANGELOG — so nobody could read them as a set, and the next one arrived unwarned.

**How to use it.** Read the checklist before starting work. When you catch a mistake —
yours, a script's, or a document's — add an entry: *what was believed · what was true ·
the rule*. The rule is the deliverable; the story is context. Entries are grouped by
class, not by date, because you scan this before working, not after.

---

## The checklist — before you…

**…state a number.** Get it from a script or a query, this session. Do not carry a
number forward from a doc. *(Four counts in the README were stale by up to 6×.)*

**…trust a check that fires on thousands of rows.** Assume the check is wrong first.
Hand-verify three hits before you believe the count. *(Twice this has been a bug in the
check.)*

**…sweep routes, files or surfaces.** Enumerate the list from the router, not from
memory. A sweep is only as wide as its route list. *(The touch-target sweep covered six
hash routes and reported the app clean; Decks, Profile, Exam, Print, Placement and Read
were never visited, and four carried real defects.)*

**…write a check, guard or index that enumerates its cases.** Count the cases in the
data first, then write the list. Three separate bugs this month were an *incomplete
enumeration*, not faulty logic. *(Plural notations: the corpus writes six, the code
knew one. Entrance guard: three animations, the list named two. Gender audit: learned
three notations one failure at a time.)*

**…finish a pass that drives something to zero.** Write the check that keeps it there, in
the same commit. Then prove the check fires — inject the defect and watch it fail — before
trusting the PASS. *(`corpus:validate` passed on a duplicate for as long as the invariant
lived only in a CHANGELOG sentence.)*

**…look a term up in a corpus with known duplicates.** Ask "does a row matching X
exist?", never "what does the map say X is?" — a first-wins/last-wins `Map` silently
picks one of the copies.

**…move, rename, relevel or merge a card.** It is a schedule migration. Ship `ID_MAP`
entries or you silently re-point a learner's FSRS state. **Four** files hold a card id —
`vocab.json`, `provenance.json`, `freq.json` and `idmap.ts` — and this line said three
until `freq.json` was found holding 47 dead ones.

**…claim a fact about the product in a doc.** Check it against `src/` at that moment.
Docs age against a codebase that moves weekly.

**…generate content in bulk.** A generator bug is four hundred bad items. Spot-check
before writing. **And check the count that must *not* move**: 67 definitions were added
and the flagged-definition total stayed at 1,213, which is what proves the new content
did not become the next batch's defect.

**…write English prose about German.** Quoting a bare German article inside an English
definition makes `corpus:validate` read the whole field as German — correctly, by its
own rule. Say "the masculine article", never `der`. *(Three of the first 67 definitions
tripped this.)* **But check the guard before obeying it**: the same rule failed the
build on *"To die in an accident"*, because `die` is an English verb as well as a German
article and the rule's two-signal test was satisfied twice over by that one word. The
first instinct — reword around it — would have left the bug for every future author.

**…animate anything that content depends on.** An entrance that doesn't run leaves the
thing invisible or mis-sized. See DESIGN §7.

**…trust a DOM measurement of the thing you changed.** Screenshot it. A hint measured
"unclipped" while the screenshot showed "Hold to stu…" — flexbox had shrunk the *button
beside it* instead, wrapping it to two lines. Measuring one element cannot see what it
did to its siblings.

**…write a check from the obvious rule.** Measure the obvious one first, then narrow
until the hits are real. "A sector that disagrees with the part of speech" fired on 65
cards and ~64 were correct; narrowed to *nouns in the four sectors reserved for other
parts of speech* it found exactly the two defects. The wide version would have been a
warning nobody could ever clear.

**…believe a sweep that returns zero.** Assert the instrument first. A clip sweep
reported *zero clips on all ten routes* because `innerWidth` was 0 in a backgrounded
pane — every rect collapsed and the minimum-size filter discarded every element before
it was tested. **A check whose subject list is empty passes silently**; make it abort
instead. Same shape as the frozen `document.timeline` below.

**…call something blocked on state you don't have.** Check whether the state is just
storage first. Today's goal line was recorded as unverifiable without "a seeded
multi-day store"; it is three localStorage keys and one IndexedDB write. *(And when you
seed, seed every tier: visits are mirrored to IDB and rehydrated over localStorage at
boot, so the localStorage-only seed looked applied and vanished on reload.)*

**…attribute an overflow to layout.** `scrollWidth > clientWidth` also fires on
deliberate negative margins (`-mx-2` for optical alignment) and on decorative
overflowing pseudo-elements. If the overflow is *the same number of pixels at every
viewport width*, it is a constant in the CSS, not a layout failure.

---

## Class 1 — guessing a number instead of measuring it

**The rule: no number goes in a document that did not come from a script or a query run
that session. If you cannot measure it, say "roughly" and say why.**

| Believed | True | Where |
|---|---|---|
| The corpus is 7,394 cards; A1 965 · A2 1,802 · B1 2,728 | 6,581 cards; A1 1,161 · A2 1,391 · B1 2,278 — every figure in the README's headline block was stale after the dedupe pass | README, 2026-08-13 |
| 835 grammar exercises | 5,207 — `corpus:genex` had multiplied the bank 6× and no doc noticed | README, 2026-08-13 |
| 369 tests | 650 | README, 2026-08-13 |
| 291 sectors | 277 | README, 2026-08-13 |
| Today's grammar row: "444 exercises" | 571 | UX-PATHS H1, July 2026 |
| Various backlog counts | "The last four times a count was guessed here it was wrong by a third" | BACKLOG's own header |
| Session coach marks "eat 200px of 812"; the grade buttons start below the fold | The block is **79px**, and the buttons sat 56px clear at 375×812 and 71px clear at 402×874. Below the fold only on the iPhone SE (375×667), by **7px** | BACKLOG #32, 2026-08-16 |
| Mobile Progress "spends ~200px on chrome before any map" | The header alone was 200px and the first tile did not appear until **465px of 812** — the estimate was of the wrong quantity, and low | BACKLOG #30, 2026-08-16 |

**Why this class is worse than it looks.** Stale numbers do not fail loudly; they
quietly corrode trust in every *other* number on the screen, including the honest ones
that are the product's whole competitive claim.

**The corollary, learned 2026-08-16: a guessed number is wrong in *both* directions,
so it cannot be used to rank.** Two P1s were carried side by side as "~200px" each. On
measurement one was 79px and marginal, the other was 200px of header on top of a
465px-deep first tile and the worst thing about the surface. Same written size, an
order of magnitude apart in value. **Measure before you rank, not just before you
report** — and re-measure a finding before fixing it, because fixing the wrong one
costs a day and closes the ticket.

---

## Class 2 — the check was the bug

**The rule: a new check that fires on thousands of rows is a bug in the check until
three hits are hand-verified. Write the counter-example into the check's own header when
it turns out to be wrong.**

- **The A1 coverage probe** reported "an A1 learner reaches 41% of core A1 vocabulary;
  Wohnen 1 of 13" — alarming enough to reorder BACKLOG. It built a `Map` by iterating
  the corpus, so for any term on more than one card it kept whichever copy came *last*.
  874 terms sat on more than one card. Measured properly — *does an A1 card exist for
  this word* — the real figure was **85%**. Every alarming row was a duplicate, not a
  gate. *(2026-08-11)*
- **Every 44px control measured 43.34px — and the browser was frozen.** *(2026-08-15.)*
  A touch-target sweep found the exact `.desk-in` signature (44 × .985) across the
  session, and `@keyframes cardin` genuinely does still scale where `deskin` was long
  ago reduced to a pure translate — a *motive*, which is the most dangerous thing to
  have when you are about to report a bug. It was an artifact: `document.timeline`
  advanced **0ms over 600ms** of real time in the automated browser, so every CSS
  animation sat on its `from` frame. The test that settled it was creating a **fresh
  probe element** and watching its clock stay at 0 too — the app cannot be blamed for
  an element it never rendered. **Before reporting a measurement taken during or after
  an animation, prove the timeline is running.** Same family as the contrast audit
  below, one layer deeper: there the measurement was mid-transition, here the
  transition never started.
- **`.tap-hit` "did not work" — I was probing the hidden face of the flip card.**
  *(2026-08-15, same sweep.)* Hit-testing the speaker halos returned `DIV.flip-face`
  at every edge, which reads as a shipped accessibility fix that does nothing. The
  card's back face is `rotateY(180deg)` with `backface-visibility: hidden`, so its
  buttons are correctly unhittable while it faces away. **When hit-testing a 3D-flipped
  surface, assert which face is live first** — the check must know about the geometry
  it is measuring through.
- **Contrast audit** reported six dark-theme failures including one at 1.0:1. Every one
  was an artifact of toggling `.dark` at runtime and measuring mid-transition, or of
  measuring the off-screen sidebar. Re-measured after settling: **zero**. *(2026-08-05)*
- **Two of `corpus:audit`'s own checks** were tried and removed for firing on thousands
  of correct rows. The removals are documented at the top of `scripts/corpus/audit.ts`
  so they are not re-added.
- **An automated gender check firing on nominalised adjectives.** *(2026-08-13.)* A
  wiktionary gender probe over B2+ nouns reported 2 disagreements in 90. Hand-verified:
  **one was real** (*die Babyboomer*, wiktionary says *der*) and **one was the check
  being wrong** — *der Einzelne* is a nominalised adjective and takes all three genders
  (*der/die Einzelne*), which wiktionary documents under the feminine headword. Any
  gender audit must exclude adjectival nouns — *der Bekannte*, *die Angestellte*, *der
  Deutsche* — the same way `caseSafe` already excludes n-Deklination masculines. Two
  hits, one false, exactly as this class predicts.
- **One source, never re-examined.** *(2026-08-15.)* Every fact-check in this pipeline
  asked de.wiktionary because the first one did, and no later pass asked whether that
  was the best source *or whether it was being used fully*. Both were wrong: wiktionary
  has `Flexion:` pages carrying the complete verb paradigm, while the pipeline read only
  the summary box — so 102 verbs shipped with rule-derived person forms that the same
  site states outright. Checking against the fuller page found **two invented rules and
  one real split error** in 101 verbs. **A source is a decision, and an inherited
  decision is still one you own — ask what else it offers, and what else exists.**

- **The matcher indexed `"¨-e"` as a word.** *(2026-08-15.)* `buildMatcher` added
  `stripArticle(w.plural)` to its index verbatim, which is correct for the 2,766 cards
  writing `die Namen` and garbage for the other 390: a card reading `¨-e` contributed
  the literal key `"¨-e"`, one reading `nur Singular` contributed `"nur singular"`, and
  the form a reader actually meets — `Vorschläge` — was never indexed at all. It went
  unnoticed because the junk keys are unreachable rather than wrong: nothing ever
  *resolves* to them, so the failure is silent under-reporting. **A field written in
  more than one notation cannot be used raw, and the way to find out how many
  notations exist is to count them, not to read the type.** Same root cause as the
  gender audit two days earlier, in a different file.

- **The same gender check, wrong four more ways at A1.** *(2026-08-14.)* Pointed at the
  2,742 A1–B1 nouns it flagged **10% of A1** — against 0.5% at B2+. A twenty-fold jump
  on the *best*-curated words in the corpus is not a finding, and all four causes were
  the check: three plural notations it had never seen (`nur Singular`, `nur Plural`,
  `—`), the umlaut notation (`¨-e` against „Röcke“), a gender comparison against the
  singular of a plural-taught card (`die Lebensmittel` carries the *plural* article),
  and a comparison against only the **first** of several attested plurals (`Picknicke`
  *and* `Picknicks`). Corrected: 0.4%, and eight genders genuinely wrong. Two further
  rules fall out of it:
  - **Count the notations before comparing against them.** The file's header said the
    corpus wrote plurals "two ways". It writes them **six**. Every one of the four bugs
    was a variant nobody had enumerated — and one enumeration query would have found
    all of them.
  - **When a check has two halves, the allowance one half needs, the other usually
    needs too.** The gender half had handled `der/das Teil` — a word with two right
    answers — since the day it was written. The plural half compared against a single
    value for just as long, and `der Balkon` has two plurals for exactly the same
    reason.
- **Mining verb government from example sentences.** *(2026-08-13, caught before
  anything was written.)* The backlog and the pedagogic critique both proposed deriving
  `warten auf + A` from the corpus's 16,000 examples — "derivable for a large share via
  the matcher". Probed first: it fires on **238 verbs (20%)** and roughly **one in
  twelve is real**. German sentences are full of prepositional phrases that have nothing
  to do with the verb — *gehen nach* ("nach Hause"), *trinken bei* ("bei der Hitze"),
  *heißen auf* ("auf Deutsch"), *verstehen bei* ("bei dem Lärm"). A mined field would
  have attached wrong grammar to hundreds of cards and a drill on it would teach
  *"trinken bei"*. **The estimate in the backlog was wrong, and the only thing that
  showed it was measuring 12 samples by hand before writing the script.**

---

## Class 3 — a lookup over data with duplicates

**The rule: ask "does a row matching X exist?", never "what does the index say X is?"
until you have proved the index is unique.**

This is Class 2's most common single cause and earns its own entry because it recurred.
Duplicates were also shadowing each other in the *matcher's* first-wins index, so a
token resolved to whichever copy came first — often the one with no plural recorded.
Merging 874 duplicate groups improved matcher accuracy **with `matcher.ts` untouched**:
verb 0.75 → 0.97, plural 0.84 → 0.995, adjective 0.84 → 0.935. The measurement bug and
the product bug had the same root.

---

## Class 4 — an id is a promise, and moving one breaks it silently

**The rule: any change to a card's identity — rename, relevel, merge, reorder — is a
schedule migration. Ship `ID_MAP` entries in the same commit. If ids are positional,
that is a latent version of this bug.**

- **Word ids embed the level** (`voc:B1:der Tisch`), so the Goethe A1 relevel of 162
  words shipped 162 `ID_MAP` entries — *plus nine existing entries re-pointed*, because
  they aimed at ids the pass had moved (`voc:A2:Oben` → `voc:A2:oben` → `voc:A1:oben`).
  Three files hold a card id and all three must migrate together.
- **Grammar exercise ids are positional** — `gex:<level>:<pointIndex>:<exerciseIndex>`,
  where the index is the point's array position. Inserting a point anywhere but the end,
  reordering two, or moving one between levels **silently re-points every subsequent
  learner schedule**. No error, no way to notice. It has never bitten only because the
  writer exclusively appends — load-bearing behaviour that reads like an implementation
  detail. **Still open** (BACKLOG).
- **A collision has two shapes, and only one of them has an id.** The day after the
  Visum duplicate, `die Stau` corrected to `der Stau` — which existed at **another
  level**, so the ids did not clash and the id guard added for Visum saw nothing.
  A rename must be checked against the invariant in *term* space as well as id space.
  *(Caught by `corpus:validate`'s new cross-level rule, one pass after it was written.)*
- **A rename can collide.** Correcting `die Visum` → `das Visum` (2026-08-14) produced a
  term the corpus already had at B1, so a gender fix silently *created* a duplicate — the
  exact defect Now #3 had spent 874 merges removing. `genderfix.ts` had a guard for this
  and it did not fire: it checks `byId`, and the two cards had different ids because they
  sat at different levels. **A rename guard must check the invariant the rename can break,
  not just the one the id enforces.**
- **An ID_MAP that must be pasted by hand is not a migration.** `merge-dupes.ts` ended by
  *printing* its entries with "paste the entries above into `src/data/idmap.ts`" — a file
  whose own header says do not edit by hand. A forgotten paste does not fail loudly; it
  resets every affected learner's schedule to new. It now writes the file, with the same
  carry-forward `genderfix.ts` uses. **If a step is required for correctness, a script
  does it.**
- **The list of files holding an id was itself wrong — there are four, and this file
  said three.** `public/data/freq.json` keys frequency ranks by card id, and no migration
  pass re-ran `corpus:freq`. Measured 2026-08-15 while merging the inflection duplicates:
  **47 of its 1,986 keys pointed at cards that no longer existed**, stale since the A1
  relevel and the 874-group dupe merge. The cost is invisible by construction — those 47
  cards silently fell to "unranked" in the frequency-within-band ordering of fresh cards,
  which is a worse ordering and not an error. **An enumeration of "everything that holds
  an X" is itself a check that needs writing, not a sentence in a doc**; `corpus:validate`
  now errors on a rank whose card is gone, and every migration script's closing "Next:"
  line names `corpus:freq`. Same class as the plural notations and the entrance guard:
  the enumeration was incomplete, not the logic. (See also the checklist item above,
  which has been corrected from three files to four.)

---

## Class 5 — a document asserting something the code contradicts

**The rule: when two docs disagree about a fact, that is a bug with a severity, not a
style question. Fix it at the anchor ([VISION.md](VISION.md)) and let the others follow.**

- **The licence, four ways.** `README.md` said the code was *proprietary*;
  `ATTRIBUTIONS.md` said *MIT*; `package.json` said `"license": "MIT"`; and no LICENSE
  file existed. On the single most load-bearing fact about an open-source project.
  *(Caught 2026-08-13.)*
- **Accounts, two ways.** `BACKEND.md` says *"the call was made: build toward accounts
  and a backend."* `CLAUDE.md` says *"Local-first, no backend."* Both authoritative.
  **Still open** — recorded in VISION as the top open decision rather than resolved
  quietly, because it is the user's call and not a documentation problem.
- **The design system forbade a hazard it then shipped.** DESIGN §7 documented the
  entrance-animation rule and defended against it in CSS — and the rule was never
  applied to the Framer route transition every navigation goes through, which left
  1,769px of content at `opacity: 0`. *A rule stated in a doc but not enforced in the
  code is a comment, not a rule.*
- **"0 terms left on more than one card" — asserted by CHANGELOG, enforced by nothing.**
  `corpus:validate` returned **PASS** on a corpus containing a duplicate, because its
  dupe check is keyed on `(level, term)` and cross-level duplication — the entire defect
  Now #3 removed — was invisible to it. The end state of a large pass is exactly the kind
  of thing that needs a check written *at the same time*, or the next pass quietly undoes
  it. *(2026-08-14; the check now exists and was verified to fire before it was trusted.)*
- **The README described a UI that had been replaced.** A left sidebar (`TopBar` had
  replaced it), three destinations (four), four drill types (ten), and no mention of the
  exam surface at all. *(2026-08-13.)*

---

## Class 6 — generated content, unspot-checked

**The rule: a generator bug is four hundred bad items, not one. Spot-check a sample
before writing, and prefer authoring the judgement while generating only the mechanism.**

`corpus:genex` took the exercise bank 887 → 5,207 across 35 derivable points. **The
first run produced six wrong forms.** They were caught, but the lesson set the policy
for the Connections game still in the backlog: *author the categories, generate only the
members* — a script can guarantee the facts but not that a category is interesting.

The same principle is why `authoring:new` refuses to write a card it cannot verify:
facts are looked up in de.wiktionary and never generated, and every example must contain
a real inflection proved by the app's own matcher rather than a substring test.

---

## Class 7 — my own reasoning, in review work

**The rule: separate a finding (anchored to a measurement) from a verdict (labelled as
judgment). Withdraw over-strong claims in place, keeping the original, rather than
deleting them.**

- **An over-strong claim, withdrawn.** I wrote that mobile coach marks pushed the grade
  buttons below the fold and *"made grading impossible."* The outer wrapper does scroll
  (`scrollHeight` 722 vs `clientHeight` 640). What was true: the primary action starts
  below the fold on first run. The overstatement was withdrawn in place. *(2026-08-05)*
- **A speculative fix, declined.** A vertical swipe starting on the flip card scrolled
  nothing in the simulator, twice. Synthetic swipes and iOS's real touch-axis
  arbitration are not the same thing, so a speculative fix to the *grading gesture* was
  not worth the risk. Confirm on hardware first. *(2026-08-05)*
- **A regex over a file is not a count of an export.** *(2026-08-13.)* I reported
  "214 Redemittel across 27 groups" from `grep`-ing `de:` out of the speaking modules.
  The real figure is **129**: the same pattern also matches the *model answers*, which
  are the bulk of those files. Caught only because a test asserted `>= 200` and failed.
  *Count inside the thing you are counting* — scope the read to the export, not the file.
- **A mean over a bimodal distribution described nothing.** *(2026-08-13.)* I closed
  the C1/C2 exercise-depth item quoting "A1 averages 64 exercises per point" — true, and
  useless. `corpus:genex` had generated 50+ items for 29 derivable points, which pulled
  every mean up and hid the shape: **A2 mean 56.5 / median 8 · B1 mean 36.9 / median 6 ·
  B2 mean 21.6 / median 6.** In fact **76 of 113 points at A1–B2 hold 5–11 exercises**,
  and C1/C2 — the levels the critique called a rumour — are the only two with no thin
  point at all. The whole finding was inverted by a statistic that averaged a spike with
  a floor. *Report the median and the minimum for any distribution you have not plotted;
  a mean is only a summary when the data has one mode.*
- **A taxonomy finding that was half right and aimed at the wrong half.**
  *(2026-08-13.)* PEDAGOGY said "2,201 cards, 34% of the corpus, in five bins that
  carry no semantic information". Measured card by card, three of those five —
  *Adjectives*, *Adverbs*, *Core verbs* — are coherent part-of-speech decks, and
  *Core Vocabulary* is largely function words, which genuinely have no topic. Only
  *Miscellaneous* (501) was the defect claimed. Meanwhile the *real* taxonomy bugs were
  invisible to that framing and turned up only when the data was queried directly:
  seven sectors existing twice under case variants, 118 cards whose field had no
  `sectors.json` row at all, and a Miscellaneous **group** carrying 35 correctly-named
  but misfiled sectors. *A count of the biggest buckets is not an audit of the
  taxonomy — check the joins (name collisions, orphaned keys, group assignment), not
  just the sizes.*
- **Three findings in one critique died on contact with the grammar bank.** Verb valency
  ("derivable via the matcher" — it is not), modal particles ("the words are not in the
  lexicon" — they are, as lexical senses, and five points teach the system), and
  Redemittel ("Lexi has almost none" — 129 ship inside the exam speaking labs). The
  common cause: **PEDAGOGY.md measured the card corpus exhaustively and the grammar
  bank, the exam papers and the speaking labs not at all**, so anything taught outside a
  card read as absent. *Before calling something missing, grep the whole `src/` and
  `public/data/` for it, not the one file you already have open.*
- **Two counting slips in one review.** In PEDAGOGY.md I wrote "72 raw findings"
  (actual 73, when counted with a script rather than by eye) and compressed BACKLOG's
  "1,493 definitions flagged across three kinds" into "1,493 flagged enumerations"
  (enumeration is 1,064 of them). Both were caught before the doc was final. *Class 1
  applies to review documents too — count with a script.* *(2026-08-13)*
- **A doc rule read too literally, then too loosely.** PERSONAS.md says *"don't start a
  fourth persona doc."* I nearly skipped a pedagogy review to comply, then nearly
  created it without comment. Correct handling: it forbids a fourth *round of the design
  review*; a different lens is a peer, and the exception belongs written down in both
  files. *(2026-08-13)*
- **Calling work "blocked" without testing the block.** *(2026-08-13, corrected by the
  user.)* I reported that Tier 2's content items were "blocked on the network-gated
  authoring pipeline". Two things were wrong. **The pipeline is designed for a Claude to
  write the content** — `scripts/authoring/card-authoring.md` is titled *"Claude task
  prompt"* and says *"Run it with Claude (no third-party LLM APIs)"*; the gate verifies
  *facts* (gender, plural, POS, IPA), and the contract's own rule is "facts are never
  generated; only the gloss and the example sentence are written". And **the network was
  never tested** — one `fetch` to de.wiktionary from this environment returned 9,340
  bytes. Neither half of the claim survived thirty seconds of checking.
  **Rule: before reporting something as blocked, execute the smallest thing that would
  prove it.** A blocker asserted from a doc summary is a guess.

---

## Class 8 — solving the wrong half of a problem

**The rule: when a critique names a feeling or a gap, check where the person actually
had it before deciding where the fix goes.**

A persona reported that the app "felt like a spreadsheet." It was actioned as *the feel
layer* — sound, count-up, a named best moment — all inside the **recap**. A later round
found the feeling had never been addressed where she had it: **at the moment of
answering**, and in the instrument room. The work was good and landed in the wrong place,
which is more expensive than not doing it, because it closes the ticket.

Related: the B2B "teacher needs to see progress" problem was read as *needs a backend*
for months. Asked directly, six teachers wanted **paper** — and one argued against a
dashboard while wanting the outcome.

---

*Maintenance: append, don't rewrite. An entry stays after its bug is fixed — the rule is
the point, and a fixed bug is the evidence the rule is real. If a rule turns out to be
wrong, add a dated correction under it rather than deleting it.*
