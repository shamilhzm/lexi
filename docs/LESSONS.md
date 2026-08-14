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

**…look a term up in a corpus with known duplicates.** Ask "does a row matching X
exist?", never "what does the map say X is?" — a first-wins/last-wins `Map` silently
picks one of the copies.

**…move, rename, relevel or merge a card.** It is a schedule migration. Ship `ID_MAP`
entries or you silently re-point a learner's FSRS state.

**…claim a fact about the product in a doc.** Check it against `src/` at that moment.
Docs age against a codebase that moves weekly.

**…generate content in bulk.** A generator bug is four hundred bad items. Spot-check
before writing.

**…animate anything that content depends on.** An entrance that doesn't run leaves the
thing invisible or mis-sized. See DESIGN §7.

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

**Why this class is worse than it looks.** Stale numbers do not fail loudly; they
quietly corrode trust in every *other* number on the screen, including the honest ones
that are the product's whole competitive claim.

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
- **Contrast audit** reported six dark-theme failures including one at 1.0:1. Every one
  was an artifact of toggling `.dark` at runtime and measuring mid-transition, or of
  measuring the off-screen sidebar. Re-measured after settling: **zero**. *(2026-08-05)*
- **Two of `corpus:audit`'s own checks** were tried and removed for firing on thousands
  of correct rows. The removals are documented at the top of `scripts/corpus/audit.ts`
  so they are not re-added.
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
