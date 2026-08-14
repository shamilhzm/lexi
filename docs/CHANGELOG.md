# Lexi — Changelog

What has shipped, newest first. Split out of `BACKLOG.md` once the shipped history
grew past 750 lines and started burying the twenty lines of open work that file is
for. The backlog answers "what next"; this answers "why is it like this" — every
entry keeps the reasoning, because the reasoning is the part that stops a decision
being quietly undone later.

Nothing here is a to-do. If an entry describes something you are about to build,
it is already built.

---

### Shipped 2026-08-15 — the matcher was indexing `"¨-e"` as a word

Work on Now #2's blocking finding — *"the comprehension meter would under-report by ~8
points"* — began by re-measuring it, and most of it was already gone. The function-word
bucket (3.9%) was fixed on 2026-08-11. Measured with the meter's own denominator (the
paper walk **without** `PAPER_NAMES`, because a learner pasting their own text gets no
curated name list), the six papers resolved **92.61%**, not 83.6%, and the inflection
bucket was **0.29%**, not 2.5%.

**The cause of that 0.29% was not a missing derivation rule.** `buildMatcher` indexed
`stripArticle(w.plural)` verbatim. That is right for the 2,766 cards writing `die Namen`
and garbage for the other **390**: a card reading `¨-e` contributed the literal index key
`"¨-e"`, one reading `nur Singular` contributed `"nur singular"`, and `Vorschläge` — the
form a reader actually meets — was never indexed at all. `Höfe`, `Läden`, `Einwände`,
`Patienten`, `Herren` and `Einstellungen` all failed to resolve against cards the corpus
already teaches, which is the worst direction for a coverage meter to be wrong in: it
under-reports words the learner has studied.

`pluralForm()` now expands all six notations — append (`-en`), splice on the overlap
(`-wände` → *Einwände*), umlaut (`¨-e` → *Vorschläge*, `¨-` → *Mäntel*), unchanged (`-`),
the full form, and the three assertions that correctly yield no plural at all. **215
cards gained a real plural form** (`Handys`, `Jacken`, `Geräte`, `Speisekarten`,
`Kreuzungen`) and 175 junk keys left the index. One test per notation, because the
repeated failure here is an incomplete enumeration.

It also surfaced a second bug in the same helper: `umlautStem` matched `[aou]` only, so a
noun whose sole back vowel is its capitalised initial came back unchanged — *Angst* gave
the plural *Angste*, and *Arzt* never reached *Ärztin*. German capitalises every noun, so
that was never an edge case.

⛔ **One of the finding's proposed fixes is recorded as wrong rather than done.**
"Tighten `isLikelyEntity` with a capitalised-and-unresolvable rule" cannot work: German
capitalises *every* noun, so the rule reclassifies unresolved common nouns as proper
nouns. Tried as a measurement, it swept up `Vorschläge`, `Prüferin`, `Moderatorin`,
`Einstellungen` and `Lesesaal` — 328 distinct tokens, most of them real vocabulary — and
would have raised the reported figure by ~2.9 points while making it less honest. That is
the LingQ failure mode this feature exists to beat. A bundled list of given names and
place names stays the honest option.

What remains is **7.10% of content tokens the corpus does not contain at any
inflection** — corpus growth (item 6), not a meter defect. Phase 1 is unblocked.

750 tests green (+17).

---

### Shipped 2026-08-15 — `cardin` loses its scale, and the guard that missed it gains a name

The touch-target sweep below recorded `@keyframes cardin` as still carrying
`scale(.985)` ten days after `deskin` was reduced to a pure translate. It wraps the
flip card — the most interactive subtree in the app, holding the 44px pronunciation
button and the graded speaker controls — so it is exactly what the DESIGN §7 corollary
forbids: *an entrance may translate; it must not scale a subtree that contains sized
touch targets.*

**The rule was written. The guard was written. Its list read `['routein', 'deskin']`.**
A guard that enumerates its subjects is only as strong as the enumeration, and the one
entrance over the primary surface was never added to it.

Fixed, and **verified under the real failure condition instead of by reading the CSS**:
with the document timeline stopped — `cardin` at `playState: "running"`, `currentTime:
0`, which *is* the stall the rule exists for — the `from` frame now computes to
`matrix(1, 0, 0, 1, 0, 0)`, and every sized control renders at exactly its CSS width.
The pronunciation button measures **44.00×44.00** where it measured 43.34, and all five
chrome IconButtons with it. Mutation-checked: restoring the scale fails the guard with
*"cardin scales a subtree containing sized controls"*.

Costs nothing to remove — 1.5% is below the perceptual threshold, the same fact that
moved `.tile-in` off 1.5% to 6%.

---

### Shipped 2026-08-15 — the touch-target sweep closes, and the worst finding was my own instrument

Every interactive control on all six routes, re-measured at 375×812 with a coarse
pointer live, plus the session surface card by card. **Zero controls left under 44px
without a hit area.** Two needed fixing, both with the `.tap-hit` halo that already
existed — the drawn ink is untouched, only the target grows:

| control | ink | hit area |
|---|---|---|
| *Where this came from* | 131×13 | 131×**44** |
| first-sight *Got it* | 35×15 | **44×44** |

Verified by **hit-testing**, not measuring: `elementFromPoint` at each halo edge
returns the button, and at desktop the halo is `content: none` so the density the rule
was written to protect is untouched.

Three rows of the backlog's 2026-08-05 list were **stale**. The speaker buttons already
had working halos. *Start session* is `hidden sm:flex` and does not render at 375px at
all. The time-budget chips, *Paste a list* and the KPI chip no longer exist.

**One is left undone on purpose.** *Hear the example* — the example sentence itself as a
play button — is 176×24 and stays that way. The 24×24 speaker icon beside it fires the
identical action and already meets 44×44, so the sentence is a second route to a
function that already has a compliant one. A halo there would claim a 176×44 band of the
flip card and take taps away from the flip gesture, buying nothing.

**The finding that nearly shipped was wrong.** The sweep measured every 44px control at
**43.34px** — the exact `.desk-in` signature — and `@keyframes cardin` really does still
carry `scale(.985)` where `deskin` was long ago reduced to a pure translate. Motive,
signature and a documented precedent all lined up. It was an artifact:
`document.timeline` advanced **0ms across 600ms** of real time in the automated browser,
so every animation sat frozen on its `from` frame. What settled it was creating a fresh
probe element and watching its clock stay at 0 as well — the app cannot be responsible
for an element it never rendered. Neutralising animations put every control back at 44.

The hazard in `cardin` is still real and still contradicts the DESIGN §7 rule; it is
recorded as a rule violation to fix by reading the CSS, not as a measured defect.

`.tap-hit` also appeared broken for a while — hit tests on the speaker halos returned
`DIV.flip-face` at every edge. That was the card's **back face**, `rotateY(180deg)` with
`backface-visibility: hidden`, correctly unhittable while facing away. Both are in
LESSONS.

733 tests green. The one `npm run lint` error (`src/views/Placement.tsx:74`) predates
this work — confirmed by re-running with the changes stashed.

---

### Shipped 2026-08-14 — eight wrong genders at A1–B1, and a check that was wrong four times first

The B2+ audit left 2,742 A1–B1 nouns unchecked — the levels where a wrong gender does
the most damage, because it is the first article a learner ever attaches to the word.

**The first run flagged 10% of A1.** At B2+ the rate was 0.5%, so a twenty-fold jump on
the best-curated words in the corpus meant the check was broken, not the cards — the
LESSONS rule that says assume exactly that. It was broken four separate ways:

| what it did not know | flagged | truth |
|---|---|---|
| `nur Singular` / `nur Plural` / `—` | 29 of the first 31 | the card refusing to teach `die Märze`, `die Milche`, `die Baumwollen` |
| the umlaut notation `¨-e`, `¨-` | 5 | `der Rock` → `Röcke`, `der Mantel` → `Mäntel` — correct |
| a plural-taught card's article | 2 | `die Lebensmittel`, `die Geschwister` carry the **plural** article; the dictionary documents a singular the card never teaches |
| more than one attested plural | 3 | `Picknicke` **and** `Picknicks`; `Balkons` **and** `Balkone`; the check read only the first |

The corpus writes plurals **six** ways — 2,766 full (`die Namen`), 208 suffix (`-en`),
148 assertions that there is no plural, 14 a lone `-` for an unchanged plural, plus the
umlaut forms. The file's own header had confidently said "two ways". The multi-plural
allowance is the one that stings: the gender half of the same check had handled
`der/das Teil` correctly since day one, and nobody gave the plural half the same rule.

**Corrected, the rate came to 0.4% and eight genders were genuinely wrong.** Four of
them were caught by the card contradicting *itself*:

| card | is | the card's own example |
|---|---|---|
| `die Mietwagen` | **der** | „**Der** Mietwagen kostet fünfzig Euro pro Tag.“ |
| `die Stau` | **der** | „Wegen **des Staus** kam ich zu spät zur Arbeit.“ |
| `die Schlepplift` | **der** | „**Der** Schlepplift zieht die Anfänger den Hang hinauf.“ |
| `die Coach` | **der** | „**Der** Coach gab ihm ein paar gute Ratschläge.“ |

And four from the dictionary: `das Polyester` → **der** (built from *der* Ester);
`der Skilehrerin` → **die** (the `-in` suffix is feminine without exception);
`die Gelenk` → **das** (not a form of anything — the singular is *das Gelenk*, the
plural *die Gelenke*, which the card already had right); `das Diesel` → **der**.

`der Diesel` carries a second defect left for a content pass: the gloss reads "Coke
mixed with beer" while both examples are about train fuel. The page has one Genus across
all four senses, so the gender correction holds either way.

**Two of the eight collided, in the two different shapes a collision has.** `die Gelenk`
corrected onto a card at the *same* level, so the ids clashed and `genderfix` merged it
directly. `die Stau` corrected onto `voc:A2:der Stau` at *another* level, so the ids did
not clash at all and the rename looked free — precisely how the Visum duplicate got in
the day before. Both must now be declared with `merge: true`; an undeclared collision of
either shape aborts. The cross-level one is handed to `corpus:dupes`, and
**`corpus:validate` errored on it in between**, which is the guard from that pass doing
its job on the very next pass.

`genderfix`'s table is now a cumulative ledger rather than a one-shot script: it follows
`ID_MAP` to recognise its own applied rows, so re-running reports "8 applied, 5 already
in the corpus" instead of aborting on finished work.

**Left alone, and why** — the audit reports evidence, not verdicts. `der/das Burnout`
(Duden allows both), `Coaches`/`Coachs`, `Graffiti`/`Graffitis`, `Bachelor`/`Bachelors`,
`Fachkräftemängel` (nobody writes it), and the plural-taught pair items `die Socken`,
`die Stiefel`, `die Gartenmöbel`, where `die` is the plural article. `die Gartenmöbel`
does carry a real gap: its plural field is empty where `die Möbel` says `nur Plural`.

**All 3,587 nouns at every level are now machine-checked: 3,356 decided, 8 flagged, a
0.1% gender disagreement rate, and every one of the 8 verified defensible by hand.**
6,580 → 6,578 cards · id map 1,374 → 1,382 · 733 tests green.

---

### Shipped 2026-08-14 — the shipped corpus gets its genders checked, and the fix breaks something

`scripts/authoring/verify.ts` refuses to write a *new* card whose gender de.wiktionary
disagrees with. It had never been pointed at the cards already there — and **559 of the
848 B2+ nouns carry no provenance row**, i.e. were hand-curated, so nothing had ever
machine-checked them. Two wrong genders had been found by hand the day before, which is
not a rate you can extrapolate from.

`corpus:gender-audit` (report-only, disk-cached under a gitignored directory, resumable
because de.wiktionary rate-limits) checked all 848: **782 decided, 11 flagged, a 0.5%
gender disagreement rate.** The corpus is in better shape than the two hand-finds
suggested. Re-run after this pass, on the 847 nouns that remain: **781 decided, 5
flagged, 0.1%** — the five below fixed, and the sixth row gone with the merge.

**Six of the eleven were defensible and were not touched** — *der/das Burnout* (Duden
allows both), *Schlagwörter* beside *Schlagworte* (two real plurals for two senses),
*Rettungswägen* (southern), a plural of *Fachkräftemangel* almost nobody writes. A
dictionary disagreement is evidence, not a verdict, which is why the audit reports and
`corpus:genderfix` — a separate, expect-guarded table of five — repairs.

The check also has one false-positive class excluded by name: **nominalised adjectives
take all three genders**, so *der Einzelne* and *die Einzelne* are both correct and a
page declaring adjectival declension is reported `ambiguous`, never as a mismatch. The
first version of the plural check flagged 8 of the first 12 cards — every one correct,
because the corpus writes plurals two ways (2,763 full `die Namen`, 210 suffix `-en`).

**The interesting part is what the fix then did.** Card ids embed the term *with its
article*, so `die Visum` → `das Visum` is a schedule migration — and the corrected term
was one the corpus **already had at B1**. A gender fix created a duplicate: the exact
defect Now #3 spent 874 merges removing. `genderfix.ts` had a guard for precisely this
and it did not fire, because it checks ids and the two cards had different ids at
different levels.

Worse, **`corpus:validate` returned PASS on it.** Its dupe check is keyed on
`(level, term)`; cross-level duplication — the whole of Now #3 — was invisible to it. The
"0 terms on more than one card" that pass ended on lived only in a CHANGELOG sentence.

So three things shipped alongside the five corrections:

- **`corpus:validate` now errors on a term that appears at two levels.** Verified by
  injecting the duplicate and watching it FAIL before the PASS was trusted. (The article
  is part of the term, so `der See` / `die See` remain two terms.)
- **`merge-dupes.ts` writes `src/data/idmap.ts` instead of printing it.** It used to end
  with *"paste the entries above into src/data/idmap.ts"* — a file whose own header says
  do not edit by hand. A forgotten paste does not fail loudly; it resets every affected
  learner's schedule to new. It now carries earlier entries forward the way
  `genderfix.ts` does: `voc:B2:die Visum` was re-pointed past the id it had been given an
  hour earlier, straight to the B1 keeper, so one hop is still always enough.
- **`dupe-rulings.tsv` is cumulative.** It truncated to the current pass, which would have
  replaced 358 rulings with one — and a merged duplicate cannot be re-derived, so the row
  is gone for good. Same rule as ID_MAP: only ever added.

Net: 6,581 → 6,580 cards, id map 1,370 → 1,374, and the keeper absorbed the retired
card's two examples rather than losing them.

---

### Shipped 2026-08-13 — B2 closes the syllabus: zero thin points at any level

The last eighteen points, and the end of a finding that changed shape three times.

| | points | exercises | median | min | thin |
|---|---|---|---|---|---|
| A1 | 24 | 1,654 | 27 | 14 | 0 |
| A2 | 28 | 1,748 | 17 | 14 | 0 |
| B1 | 40 | 1,725 | 15 | 12 | 0 |
| B2 | 21 | 454 → **625** | 6 → **16** | 5 → **12** | 18 → **0** |
| C1 | 12 | 204 | 18 | 16 | 0 |
| C2 | 11 | 174 | 16 | 15 | 0 |

**Bank 5,207 → 6,130 across fourteen authored batches. No grammar point at any level
now holds fewer than twelve exercises.**

**B2 was authored deliberately above its lower-level twins.** The 2026-08-06 audit found
that *11 of 16 B2 points re-tread a topic already taught at A2 or B1* — n-Deklination,
Genitiv, Relativsätze, Finalsätze, Infinitiv mit zu, Temporale Nebensätze. Rather than
repeat the B1 items written earlier today, these test the hard edges: the **genitive** of
an n-Deklination noun (*des Experten*, never *des Expertes*); the **pluperfect passive**
inside a nachdem-clause (*nachdem es gebaut worden war*); relative pronouns whose case
comes from inside the clause while their gender comes from outside it; *damit* versus
*um … zu* when the subordinate clause is passive and therefore has its own subject.

Also at B2, the three points a B1 learner has never met and a B2 exam relies on:
**Zustandspassiv** (*ist geschlossen* versus *wird geschlossen* — a distinction English
collapses into one form), **the position of nicht** (sentence negation drifts to the end
and stops in front of whatever closes the verb bracket; partial negation stands directly
before what it denies), and the **adversative connectors** *dennoch / allerdings /
hingegen*, which are the register lift a B2 essay is actually marked on.

**How the finding moved.** It began as *"C1/C2 is 3% of the exercise bank"* — true, and
pointed at the wrong end of the syllabus. Closing C1/C2 exposed that the *means* were
concealing a bimodal distribution: `corpus:genex` had generated 50+ items for 29
derivable points, so A2's mean of 56.5 sat on a median of 8, and **76 of 113 points at
A1–B2 held fewer than twelve exercises against zero at C1/C2**. The level the critique
called a rumour was the only healthy one. Recorded in [LESSONS](LESSONS.md).

`corpus:validate` PASS, 733 green, `GRAMMAR_COUNTS` re-pinned to 6,130, spot-checked in
the app.

---

### Shipped 2026-08-13 — A2 and B1 clear; only B2 still has thin points

Continuing the pass the median exposed. A1 closed earlier today; A2 and B1 now follow.

| | points | total | median | min | thin |
|---|---|---|---|---|---|
| A1 | 24 | 1,654 | 27 | **14** | 0 |
| A2 | 28 | 1,748 | 8 → **17** | 5 → **14** | 17 → **0** |
| B1 | 40 | 1,725 | 6 → **15** | 5 → **12** | 29 → **0** |
| B2 | 21 | 454 | **6** | **5** | **18** |
| C1 | 12 | 204 | 18 | 16 | 0 |
| C2 | 11 | 174 | 16 | 15 | 0 |

Bank **5,545 → 5,959** across eight batches. **B2 is now the only level with a thin
point anywhere in it** — and the 2026-08-06 grammar audit already called it *"where the
money is and the thinnest real layer"*, so the finding has converged from two directions.

**What was actually authored.** These are the errors that get corrected in a classroom,
not a syllabus checklist: *größer wie* instead of *als*; *wenn* for an indirect yes/no
question instead of *ob*; *in der* contracted to a form that does not exist; *ihn*
versus *ihm*; *hat gekonnt* where the sentence needs *hat kommen können*; *da(r)-* used
for a person; *wegen dem Regen* — flagged as widespread in speech and still wrong in an
exam. Several items name the mistake rather than only the rule, because at B1 the
learner has usually met the rule and is still making the error.

**One batch was rejected whole and re-run.** Two Komposita items were `choose` with no
gap marker — questions, not gap-fills — and `corpus:gex` refused the entire batch rather
than writing the other 50. That is the right behaviour: a partial write would have left
the bank in a state no dry run had described.

`corpus:validate` PASS, 733 green, `GRAMMAR_COUNTS` re-pinned to 5,959.

---

### Shipped 2026-08-13 — A1 has no thin points, and the mean was lying

Closing C1/C2 surfaced a bigger finding, and it inverts the one the critique made.

**The averages were describing nothing.** I had been quoting "A1 averages 64 exercises
per point" all session. True, and useless: `corpus:genex` generated 50+ items for 29
derivable points, which pulled every mean up and hid the shape.

| | mean | median | points under 12 |
|---|---|---|---|
| A1 | 64.1 | 27 | 12 of 24 |
| A2 | 56.5 | **8** | 17 of 28 |
| B1 | 36.9 | **6** | 29 of 40 |
| B2 | 21.6 | **6** | 18 of 21 |
| C1 | 17.0 | 18 | **0** |
| C2 | 15.8 | 16 | **0** |

**76 of 113 points at A1–B2 held fewer than twelve exercises**, against none at C1 or
C2. *"Your C1 is a rumour"* was true when the Lektor said it and is now the opposite of
the problem: the thin layer is the bottom of the syllabus, where every learner starts
and where [CRITIQUE §5](CRITIQUE.md) already says the churn is. Recorded in
[LESSONS](LESSONS.md) — *a mean is only a summary when the data has one mode.*

**A1 is now clear.** All twelve thin points authored across two batches: *Negation:
nicht vs. kein*, *dieser-Wörter*, *Ordinalzahlen & Datum*, *sein & haben*,
*Personalpronomen* (Nominativ and Akkusativ), *Wortstellung & Fragen*, *Artikelwörter &
kein*, *Präteritum: sein & haben*, *Zeitangaben mit Präpositionen*, *Richtungsangaben &
Indefinitpronomen*, and *Partikeln: denn, ja, doch, mal*.

Level minimum **5 → 14**, median 27, bank **5,429 → 5,545**. The four items `corpus:gex`
skipped as already present are the sign the existing content was hit rather than
duplicated.

These are the mechanics an A1 learner is actually stuck on — *kein* versus *nicht*
is the single most confused thing at the level and had **five** exercises behind it.
Each item carries an explanation that states the rule rather than the answer: *"if the
positive sentence has ein or no article, negate with kein. Everything else takes
nicht."*

**Still open: A2 (17 thin points), B1 (29), B2 (18).** B1 is the largest and the level
learners sit at longest.

`corpus:validate` PASS, 733 green, spot-checked in the app.

---

### Shipped 2026-08-13 — C1/C2 exercise depth, closed

The last nine thin points, and the finding now points the other way.

| | points | exercises | avg | thinnest |
|---|---|---|---|---|
| C1 | 12 | 86 → **204** | 7.2 → **17.0** | 6 → **16** |
| C2 | 11 | 70 → **174** | 6.4 → **15.8** | 5 → **15** |

Bank **5,207 → 5,429** across four batches. This pass closed *Passiv-Ersatzformen*,
*Subjektive Modalverben* and *Funktionsverbgefüge* at C1, and *Modalpartikeln*,
*Nominalstil*, *Gehobene Konnektoren*, *Idiomatik & feste Wendungen*,
*Irrelevanzkonzessivsätze* and *Idiomatik: wörtlich vs. übertragen* at C2.

**About half the C2 items are questions about the system rather than gap-fills** —
*"Was tun Modalpartikeln?"*, *"Welcher Konnektor ist am förmlichsten?"*, *"Woran
erkennt man, dass eine Wendung übertragen gemeint ist?"* — because at C2 the errors
that remain are rarely grammatical. They are choices that are correct and wrong at
once, and a gap-fill cannot ask about a choice.

**The finding has inverted.** C1 and C2 now have the **highest minimum of any level**:
A1, A2, B1 and B2 each still contain a point with only **5** exercises. *"Your C1 is a
rumour"* was true when the Lektor said it; the thin layer is now the bottom of the
syllabus, and it is filed in the backlog as such.

**Three things the tooling caught**, which is the argument for having it: a point title
whose closing quote was a straight `"` and not `“`, so the batch addressed a point that
did not exist; one exercise already present; and two items I had written with an
empty-string correct answer, which would have rendered a gap-fill whose answer was
nothing. All three surfaced in the dry run.

`GRAMMAR_COUNTS` re-pinned to 5,429. `corpus:validate` PASS, 733 green, spot-checked in
the app — *Modalpartikeln* now reads *Practise · 16 exercises* and its items render with
their explanations.

---

### Shipped 2026-08-13 — Miscellaneous is empty, and then gone

The 501 cards left over from the sector pass, hand-classified and applied.

**Why it mattered more than a tidy.** *Miscellaneous* held **7.7% of the corpus** under
a name that means *nobody looked*. It was the second-largest tile on the treemap; it fed
`weakestSectors()`, so it was deciding which fresh vocabulary a learner met next; and it
was the one deck a teacher could not use for anything.

`scripts/corpus/misc-sectors.tsv` is the authored half — one line per lemma, 501 of
them, every target a sector that already exists. `corpus:misc-sector` is the mechanical
half. **501 moved, 0 unmapped, into 87 sectors.** The sector is now empty, so
`rebuildSectors` drops it, and the *Miscellaneous theme group* goes with it: **16 groups
→ 15**. Every card on the map now sits under a tile that names something.

**Where they actually went, stated honestly.** 359 landed in genuinely semantic
sectors — *Legal Terms* 3→16, *Objects & Materials* 5→18, *Useful Phrases* 37→55,
*Emotions* 47→66, *Time* 30→55. The other 142 went to part-of-speech bins or to
`Abstract` (10→65), because *Chance*, *Detail*, *System* and *Zufall* have no topic and
pretending otherwise would be a worse lie than the one being fixed. **`Abstract` is a
true label where `Miscellaneous` was an absent one**, and that is the whole difference.

**A separate script from `corpus:resector`, deliberately.** That one only moves
pipeline-added cards so a bulk re-run cannot disturb hand-curated ones — right in
general and exactly wrong here, because **293 of these 501 were hand-curated** and being
curated is not what gave them a sector; they were curated *into the bin*. So this script
ignores provenance and buys the safety back differently: **it will only ever move a card
whose field is `Miscellaneous`**, whatever the TSV says. It also refuses to run if any
target sector does not exist, so a typo cannot mint a one-card sector and put a stray
tile on the map.

274 sectors, 274 fields, zero duplicates, zero orphans, zero empty rows.
`corpus:validate` PASS, 733 green, treemap verified.

---

### Shipped 2026-08-13 — the taxonomy tells the truth about itself

`corpus:sector-merge`, and a finding that was half right aimed at the wrong half.

**What the critique claimed:** *"2,201 cards, 34% of the corpus, in five bins that carry
no semantic information."* Measured card by card, three of those five — *Adjectives*,
*Adverbs*, *Core verbs* — are coherent part-of-speech decks, and *Core Vocabulary* is
largely function words, which genuinely have no topic. Only *Miscellaneous* (501) was
the defect described.

**What was actually broken** turned up only when the data was queried directly, and none
of it was visible from a list of the biggest buckets:

- **Seven sectors existed twice.** *Body & health* (33) beside *Body and health* (27);
  *Colors* beside *Colours*; *Hobbies & Leisure*, *Work & Profession*, *At the Bank*,
  *Festivals & Customs*, *Employment Contract*. A sector is a **treemap tile** and a
  **deck**, so a split name draws one topic as two smaller things — and it skews
  `weakestSectors()`, which picks tomorrow's fresh vocabulary. **127 cards merged.**
- **118 cards had no sector row at all.** `sectors.json` described 277 sectors for 283
  distinct fields; six names — *Work & Study*, *Society & Politics*, *Everyday Life*,
  *Science & Technology*, *Travel & Transport*, *Media & Arts* — existed on cards and
  nowhere else, and would have fallen to the default group unnoticed. Adopted with
  their real groups.
- **The Miscellaneous *group* held 36 sectors / 714 cards**, of which 35 sectors were
  correctly named and simply misfiled — *Elections* is politics, *Laundry* is daily
  life, *Visual Arts* is art. Regrouped. The tile is now **1 sector / 501 cards**.
- ***Beschwerden***, the one German sector name in an English taxonomy — the VHS
  teacher's smallest and most correct complaint — merged into *Ailments*.

**Sectors and fields are now in sync at 275**, with zero duplicate names, zero orphaned
fields and zero empty rows.

**Why this could be mechanical.** A card's id does not contain its field
(`voc:A1:der Name`), so re-sectoring is **not** a schedule migration — unlike a relevel,
which changes the id and needs `ID_MAP` entries. The real hazard is a merge that crosses
a theme group, silently moving cards to a different tile, and the script refuses to do
that. It is also idempotent: a `from` that no longer exists is a merge already applied,
not an error.

**`src/lib/brain/atlas.ts` was the evidence this was already being felt.** It normalises
sector names before mapping them to a cortical region, and its own comments name these
exact pairs as the reason. Those comments now say the duplication *was* there and that
the normalisation stays as a guard against its return.

**Still open:** the 501 genuinely unclassified cards. That is per-card judgement, not a
rename, and 208 of them are pipeline-added so `corpus:resector` can carry them once the
lemma→sector entries are authored.

`corpus:validate` PASS, 733 green, treemap verified.

---

### Shipped 2026-08-13 — C1 and C2 stop being a rumour

*"Your C1 is a rumour"* was the university Lektor's line in [PEDAGOGY](PEDAGOGY.md), and
the numbers backed him: 86 exercises across twelve C1 points and 70 across eleven C2
points, against **1,538 at A1**. The point *selection* was right — Funktionsverbgefüge,
Nominalisierung ↔ Verbalstil, Passiv-Ersatzformen, Gerundivum, Stilebenen — which made
the thinness worse, because someone knew what belonged there and then there was nothing
behind it.

|  | points | exercises | avg per point | thinnest |
|---|---|---|---|---|
| C1 | 12 | 86 → **182** | 7.2 → **15.2** | 10 |
| C2 | 11 | 70 → **119** | 6.4 → **10.8** | 5 |

Bank **5,207 → 5,352** across three batches. Nine points deepened this pass:
Konjunktiv II Vergangenheit, Futur II, Relativsätze mit wo(r)- & wessen,
Genitivpräpositionen, Konnektoren (indem/sodass/folglich) and TeKaMoLo at C1; Verben mit
Genitivobjekt, Passiversatzformen, Irreale Vergleiche (als ob), Gerundivum and
Stilebenen at C2.

**Authored, not generated,** and the reason is specific to these levels: a generated item
can state that an answer is right, and at C1/C2 the whole content of the point is *why*.
Half the C2 items are `mc` questions about the system rather than gap-fills —
*"Warum steht nach „als ob“ meist Konjunktiv II?"*, *"Welche Form ist KEINE
Passiversatzform?"*, *"Warum ist die Stilebene bei C2 wichtiger als die Grammatik?"* —
because at C2 the remaining errors are almost never grammatical. They are choices that
are correct and wrong at once.

**The tooling earned its keep three times.** `corpus:gex` rejected three items in the
first batch for being `choose` with no gap marker (they were questions, now `mc`); it
skipped one C2 item as already present; and appending is enforced rather than trusted,
because `gex:` ids are positional and every learner's FSRS schedule hangs on them.

Spot-checked in the running app, which is not optional for bulk content even when it is
hand-written: the Gerundivum point now reads *Practise · 16 exercises*, and
*"die nicht zu ___ Tatsache"* renders with its three options and its explanation.

`GRAMMAR_COUNTS` re-pinned to 5,352. `corpus:validate` PASS, 733 green.

**Still open:** A1 averages 64 exercises per point. Six C1 and six C2 points remain
between 5 and 10, so this narrows the gap rather than closing it.

---

### Shipped 2026-08-13 — Redemittel: 129 phrases nothing had ever scheduled

The critique's item 6 said Redemittel were "the largest content gap in the product".
That was wrong about the cause, and the truth is a better finding.

**They already ship.** 129 phrases across 27 groups, authored to a high standard —
*Widersprechen, ohne unhöflich zu werden*, *Nachgeben, ohne einzuknicken*, *Zahlen
deuten, nicht vorlesen* — inside the exam speaking labs. Better functional material than
most textbooks print.

**And nothing scheduled them.** `redemittel` appeared in the exam data, `Speaking.tsx`
and `Exam.tsx`, and nowhere else: no `review()`, no FSRS card, no id. A learner met them
three levels inside `#/exam`, read them once, and the app whose entire job is making
things stick did not make these stick.

So this ships no new phrases. It gives the existing ones an identity the rest of the app
can act on: they are projected into the lexicon as `pos: 'phrase'` cards and registered
at runtime through `registerWords` — the same door mined words and class packs use — so
FSRS, the session builder, decks, search and the worksheet all pick them up with no
second system invented, and `public/data/*.json` is untouched.

**The sector is the communicative function.** *Sich vorstellen*, *Abwägen*,
*Widersprechen* — which is a considerably better deck than *Miscellaneous*, where a
third of the corpus currently lives, and is exactly the unit the taxonomy finding says
is missing.

Three decisions:
- **Ids are content-keyed** (`red:<level>:<german>`), not positional. The `gex:` ids are
  positional and that is a live hazard in the backlog; reordering a paper's groups must
  not silently re-point a learner's schedule.
- **`pos: 'phrase'`**, which keeps them out of the gender, plural, conjugation, Kasus,
  separable and reflexive pools — every one of which would produce nonsense from a
  multi-word chunk.
- **No example.** The first version set the example to the phrase itself, and the card
  printed the same German twice. It also mattered beyond cosmetics: `eligibleModes`
  reads `ex` to decide cloze, sentence-builder and dictation eligibility, and all three
  would have gapped the chunk against itself. Caught by running a session.

**A counting mistake worth recording.** This entry first said *214* phrases. That came
from a regex over the whole speaking module, which also matches the model answers; the
REDEMITTEL exports hold 129. A test asserting `>= 200` is what caught it. See
[LESSONS](LESSONS.md) class 1 — *count inside the thing you are counting.*

12 tests. 733 green.

---

### Shipped 2026-08-13 — C1 gets exercises, and two findings are withdrawn

**The blocker was not real.** I reported Tier 2's content items as blocked on a
"network-gated authoring pipeline". Both halves were wrong, and the user said so.
`scripts/authoring/card-authoring.md` is titled *"Claude task prompt"* and opens with
*"Run it with Claude (no third-party LLM APIs)"* — the pipeline is **designed** for the
model to author the prose, and the gate exists to verify *facts* (gender, plural, POS,
IPA), which is a different thing. And the network had never been tested: one `fetch` to
de.wiktionary from this environment returns 9,340 bytes. See [LESSONS](LESSONS.md)
class 7 — *before reporting something as blocked, execute the smallest thing that would
prove it.*

**C1 exercise depth, started.** Three points taken from 6 exercises to 18 —
**Konjunktiv I (indirekte Rede)**, **Nominalisierung ↔ Verbalstil** and
**Partizipialattribute**. Bank **5,207 → 5,243**. Authored, not generated: these are the
levels where a generated item cannot explain *why*, and where the critique's own reading
was that the point selection is right and the volume is not.

Appended through `corpus:gex`, which is the tool that exists because exercise ids are
positional (`gex:<level>:<pointIndex>:<exerciseIndex>`) and every learner's FSRS
schedule is keyed on them — inserting anywhere but the end silently re-points later
schedules. Its validator earned its place immediately: it rejected three items for being
`choose` (gap-fill) with no gap marker, which they were — they are questions, and are
now `mc`.

**The modal-particle finding is substantially withdrawn.** PEDAGOGY said the B2 point
*Modalpartikeln II* existed but "the words it is about are not in the lexicon". Measured
against the grammar bank rather than the part-of-speech counts: the system is taught by
**five** points across A1/A2/B1/B2/C2, and the words are all present as their *lexical*
senses (`mal` = "times", `schon` = "already"). The gap is not absence — it is that the
modal function lives in the bank rather than on the cards, and **adding particle cards
would recreate exactly the duplicate-term defect Now #3 just spent a pass merging.**
What is left is exercise depth on those five points, which is the item above.

C1 still averages 10 exercises per point against A1's 64, so this is a start and not a
close. 721 green; `GRAMMAR_COUNTS` re-pinned to 5,243.

---

### Shipped 2026-08-13 — verb government, and the mining that does not work

First of Tier 2, and the interesting half is what was *not* built.

**The plan was wrong.** BACKLOG and [PEDAGOGY](PEDAGOGY.md) both said verb valency was
"derivable for a large share from the corpus's own examples via the matcher". Probed
before writing anything: the naive mine fires on **238 verbs (20%)** and roughly **one
in twelve is real**. German sentences are full of prepositional phrases with no relation
to the verb — *gehen nach* ("nach Hause"), *trinken bei* ("bei der Hitze"), *heißen auf*
("auf Deutsch"), *verstehen bei* ("bei dem Lärm"). Exactly one of the first twelve
samples, *denken an*, was genuine government. A mined field would have put wrong grammar
on hundreds of cards and any drill built on it would teach *"trinken bei"*. Recorded in
[LESSONS](LESSONS.md) class 2; nothing here is mined.

**What shipped is the part that is fact rather than inference.** 33 cards already say
`verzichten auf + A` inside their own headword, and 12 more carry a preposition with no
case marker — verified data sitting in a string nothing could read. `lib/valency.ts`
parses it, and the card now shows *warten auf + Akkusativ* under the headword.

The case is completed by rule **only where the preposition allows it**: `aus/bei/mit/
nach/von/zu/seit` are always dative and `für/um/durch/gegen/ohne` always accusative, so
`beitragen zu` becomes `+ Dativ` without a guess. The **two-way** prepositions — an,
auf, in, über, unter, vor — are refused and print with no case at all, because which
case `auf` takes after a given verb *is* the fact being sought. A learner reads a case
off a card and believes it; a missing one costs less than a wrong one.

Growing past 45 cards is authoring, not derivation, and it needs the network-gated
pipeline. 13 tests, including two run against the shipped corpus that assert no two-way
preposition ever acquires a case it was not authored with.

---

### Shipped 2026-08-13 — paper, and a placement test that can be lied to

The last two of the pedagogic critique's Tier 1. **All five are now shipped.**

#### Drucken — the worksheet surface

Four of six teachers asked for the same thing first, and it was the cheapest
unbuilt item in the product: something they can print. `#/print`, reached from the
Library beside Exam practice.

**It is also the resolution to the contradiction [CRITIQUE §2](CRITIQUE.md) says
someone has to pick.** *"Your students' data never leaves their device"* and *"here is
your students' data"* are genuinely incompatible; a worksheet is neither. The teacher
gets a real artefact, the learner's schedule stays put, and no refusal in
[VISION](VISION.md) is spent — no dashboard, no login, no collection. There is no
send button and there is not going to be one.

Five sheets: vocabulary in either direction, gap-fill built from the cards' own
example sentences, a grammar point, and the learner's own error log. Each with an
answer key that breaks to its own page — *a worksheet with the answers at the bottom
is not a worksheet*, which is the single most important line in the print stylesheet.

Three decisions:
- **`order` and `error` exercises are dropped from grammar sheets.** They are
  interactions — drag these tiles, tap the wrong word — and transcribed onto paper
  they become questions nobody can answer with a pen. Four good items beat nine with
  three that make no sense.
- **A gap-fill is only built where the blank is safe.** `blankExample` returns null
  rather than guessing: it will not blank *Haus* inside *Hausaufgabe*, and it refuses
  the ~71 cards whose example does not contain their own headword. The sheet comes out
  shorter than the deck instead of padded with sentences that give the answer away.
- **The noun's article stays standing.** "Das __________ ist groß" asks for the noun;
  blanking both would make it a gender question wearing a vocabulary question's
  clothes, and the key would have to accept two words for a one-word gap.

**Two bugs found by actually applying the print rules rather than trusting them.** The
first `@media print` block matched `header[class*="fixed"]` — and the top bar is not
fixed, so the entire navigation would have printed. Widening it to bare `header` fixed
that and immediately broke the other end: the *sheet's own* header is a `<header>`, so
the worksheet came out with no title, no name line and no date. Both were only visible
by hiding what the stylesheet hides and reading what was left.

#### Placement: words that do not exist

See the entry below for the reasoning. Summary: 22 hand-authored foils, Meara's
`(h−f)/(1−f)` correction, probes per level 5 → 7, and **nothing seeded into FSRS when
the false-alarm rate clears a third**. Measured on the running app — a learner claiming
every word now lands at A1 with 0 seeded where they previously reached C2 with 42.

708 green.

---

### Shipped 2026-08-13 — two honest numbers, and a log that names the error

Two more of the pedagogic critique's Tier 1, both unblocked by Recall shipping.

**The headline says what it measures.** It read *"2,320 known"* for a year and was
never true: the number counts flip cards in FSRS Review, and a flip shows the German
and asks what it means, so it has only ever measured **recognition**. "Known" claimed
the productive half too, for free. It now reads **"2,320 recognised"**, and once a
learner has consolidated anything in the recall track, **"· 340 recalled"** appears
beside it.

The two are counted separately and stay separate — `countsFor` gained `recalled`
rather than folding it into `known`. Averaging them into one reassuring figure is the
trick `readiness.ts` already refuses for preparation and performance; this is that rule
applied to the app's own currency. Expect `recalled ≤ known` in practice, but it is
counted independently rather than assumed, because the Fundamentals drill deliberately
bypasses the "flip must be in Review" gate and a learner can produce a word the flip
has not consolidated. **An invariant that is merely usually true should not be encoded
as arithmetic.**

A zero is not shown. A learner who has never done a recall drill sees no "· 0
recalled" — a zero beside the headline reads as a deficiency rather than as a track
they have not started, and the number arrives on its own the first time they finish
one.

The rename went to every surface that makes the same claim — Today's headline and goal
line, Decks, the heatmap legend, the level strip, the path card — because an app that
says "recognised" on one screen and "known" on the next is inconsistent with *itself*,
which is the defect the i18n separator finding was really about. The **per-card**
status pip keeps new/learning/known: that describes one card's scheduling state, not a
claim about the learner.

**The miss log now records the error, not just the failure.** `logMiss(tag, term)`
became `logMiss(tag, term, {asked, chose})`. A tag says *which system* is weak; a term
says *which word*; neither says *which error* — and that is the one a teacher can act
on. Every multiple-choice drill has known both at the moment it graded and discarded
them the instant it called `onGrade(false)`.

Blind spots now read: **"reaches for *den* when it should be *Dativ* 4×"** under
"Cases & endings (Kasus) 4×". That is the line PEDAGOGY's assessment specialist and
Kenji both asked for, and it is the missing input for the exam surface's per-concept
readout that the backlog wants and correctly says it cannot build yet.

Three decisions worth keeping:
- **The Kasus drill logs the *case*, not the article.** Its options are surface forms —
  den, dem, der — and logging "wanted dem, chose den" is true and nearly useless,
  because the same pair means different things on a masculine noun and on a plural.
  `askedLabel` lets an item name the real question. Mapping the *chosen* form back to a
  case is deliberately not attempted: `den` is accusative masculine **and** dative
  plural, so the inference would be wrong often enough to poison the table.
- **Typed drills contribute nothing here, on purpose.** A free-text answer is not a
  choice between named alternatives, and recording "wanted die Fakultät, chose
  fakultat" would fill the confusion table with spellings instead of errors.
- **Half a confusion is refused.** An `asked` with no `chose` is not a row; it is still
  counted as a miss, but never as a confusion, so nothing is invented to fill the gap.
  Misses logged before this existed stay readable at the resolution they were recorded
  at — `confusions` is additive, not a replacement for `terms`.

A confusion is surfaced only when the same pair repeats. A single one is a slip, and
calling it a pattern would be the app overclaiming — which is the thing it is for.

12 new tests. 672 green.

---

### Shipped 2026-08-13 — Recall: the app finally asks you to produce a word

**The pedagogic critique's P0, closed.** Every track in this app showed German and
asked what it meant, so `known` measured *recognition* — on every card, always. A
learner could hold 2,000 known words and be unable to produce one. `recall` is the
other direction: the English gloss is the prompt, the German is the answer, typed,
**with the article for nouns**, because the article is most of what knowing a German
noun means.

**It cost nothing architecturally, which is the point.** Drills already schedule under
`gym:<mode>:<wordId>` with their own FSRS card — a split that exists precisely so
recognising a word and producing it can be scheduled apart. That split had never been
used for the thing it was built for.

**The gate is the feature.** Reversing a gloss is not symmetrical with reading one:
"die Sprache → language" is always fair, "language → ?" only when exactly one German
card answers it. `recallSafe` excludes three ways it can be unfair, and the third is
the one that matters — **529 cards share a gloss with another card.** `table` is *der
Tisch* **and** *die Tabelle*; `to eat` is *essen* and *fressen*. Prompting "table" and
marking *die Tabelle* wrong would be the one thing this codebase never does: render a
verdict that is itself wrong German. Also excluded: 2,043 list-glosses ("station,
depot, terminus" — the learner cannot know which is wanted) and 323 transparent ones
("hotel" tests confidence, not German).

What survives is **3,675 cards — A1 712 · A2 802 · B1 1,295 · B2 442 · C1 308 · C2
116**, of which 2,237 are nouns. Rule 1 is deliberately blunt: many list-glosses have a
dominant first sense and could be admitted by taking it. Left undone, because picking
the dominant sense is a judgement a script cannot make and the cost of being wrong is
marking correct German incorrect.

**Recall is gated on the learner, not only on the card.** A word becomes eligible in a
mixed session only once its *flip* card reaches Review. Producing a word requires a
form–meaning link that recognising it builds; asking earlier is not a desirable
difficulty but a retrieval attempt on an unencoded item, returning a failure and an
FSRS lapse for a word the learner never had. **Recognition is what unlocks production**
— which is also the honest relationship between the two numbers Today should eventually
show. Picking Recall from Fundamentals deliberately bypasses this and draws the full
pool, on the same reasoning a scoped grammar drill ignores the CEFR filter: asking for
a thing is the licence for it.

**A wrong article is a nameable error, not a "no".** Typing `Statistik` for *die
Statistik* is a **gender** miss wearing a vocabulary miss's clothes. It is still graded
wrong — in German the article is not an accessory — but the note says which:
*"The word is right — German needs the article: die Statistik."* Wrong article gets
*"Right word, wrong gender."* A genuinely wrong word gets neither, so nothing is
excused. This is `spellingDiff`'s principle (an error forgiven silently is how it
becomes permanent) applied to the second case the widget could not see on its own;
`TypeItem` gained a `noteFor` hook that never displaces the umlaut/typo lessons and
never changes the grade.

**Two smaller things found on the way.**
- `TypeItem` rendered every prompt inside `lang="de"`. A recall prompt is English, and
  a screen reader handed English in a German voice is the exact defect `lang="de"`
  exists to prevent, pointed the other way. Prompt language is now a prop.
- The gloss-collision index is keyed on `WORDS.length` rather than built once, because
  the lexicon grows at runtime — importing a class pack calls `registerWords`, and a
  cache built at boot would keep admitting a gloss a new card had just made ambiguous.
  A stale entry's failure mode here is marking correct German wrong. *(Finding this
  turned up the same bug in the reader's surface index, which was filed separately and
  fixed the same day — see the entry below. That fix is the better of the two patterns:
  it stamps the array **identity** as well as its length, so it also survives `initData`
  replacing `WORDS` wholesale. Worth folding this index onto it next time either is
  touched.)*

15 new tests pin every exclusion, so a future pass that loosens the gate to grow the
pool has to delete one deliberately. 665 green.

---

### Shipped 2026-08-13 — the docs pass: an anchor, a licence, and eight files deleted

The docs had grown to 26 markdown files and 7,443 lines, and had started disagreeing
with each other about facts rather than about judgement. This pass reorganised them
around one anchor and deleted what had finished its job.

**A licence contradiction, resolved.** `README.md` said *"the application code itself is
proprietary"*; `ATTRIBUTIONS.md` said *"Lexi's code is MIT-licensed"*; `package.json`
said `"license": "MIT"`; and **no LICENSE file existed**. Four sources, three answers,
on the single most load-bearing fact about an open-source project. MIT wins — it is what
two of the three said, and it is what the project is for. `LICENSE` now exists and names
the corpus's separate CC BY-SA obligations, and `CONTRIBUTING.md` gives the project a
door.

**[VISION.md](VISION.md) is new and is the anchor.** Six commitments — beautiful,
bulletproof, effective, open-source, pedagogically sound, English→German and expandable
— each stating what it *forbids*, because that is the part that does work. It absorbs
the settled decisions that were scattered across four files, consolidates the refusals
into one arguable table, and carries the multilingual arc rescued from ROADMAP.

**It also names a contradiction rather than resolving it.** [BACKEND.md](BACKEND.md)
opens with *"the call was made: build toward accounts and a backend"*; `CLAUDE.md` says
*"Local-first, no backend."* Both are authoritative and they disagree. VISION records it
as the top open decision and rules that **local-first is the shipping behaviour until it
is settled**; BACKEND.md is marked proposal, not policy.

**Deleted, recoverable from git history:**

- **`ROADMAP.md`** — the ten Pro features assumed an AI tutor (cut on the record) and a
  mining flow (re-scoped into the meter). Its one surviving asset, the per-language
  module interface, is now VISION's multilingual section; the tokenizer note moved to
  the backlog.
- **`UX-PATHS.md`** — ten of its twelve findings had shipped. The two open notes moved
  to the backlog; the finding table is preserved below because six source comments cite
  its ids.
- **`archive/`** (6 files, 940 lines) — DESIGN-REVIEW-2026-07, PRODUCT-FOCUS,
  IMPLEMENTATION-PLAN, LEXICON-EXPANSION-TASK and the three Orbita-era briefs. Every one
  carried a banner saying it was superseded and not current. Same precedent as the July
  tidy: git history is what history is for.

**The README was wrong in almost every number** — 7,394 cards (actual 6,581), 835
exercises (actual 5,207), 291 sectors (actual 277), 369 tests (actual 650) — and still
described a left sidebar that `TopBar` replaced on 08-12, three destinations when there
are four, and four drill types when there are ten. It never mentioned the exam surface
at all. Rewritten against measured values.

#### The UX path findings (July 2026), preserved

Traced against the code, not against how we hoped it behaved. `store.ts`,
`VoiceOffer.tsx`, `tts.ts`, `BackupNudge.tsx` and `useHdVoice.ts` cite these ids.

| # | Finding | Status |
|---|---|---|
| H1 | Today's grammar row showed a stale exercise count. Stale numbers corrode trust in every other number. | ✅ fixed |
| H2 | The recap reports flips + recall but doesn't celebrate drill work distinctly. | → backlog |
| S1 | Today's "All clear" state was a dead end — the one moment a motivated learner asks for more, answered with a shrug. | ✅ fixed |
| S2 | Abandoning the guided first run mid-placement returns to the hero without acknowledging the retry. | → backlog |
| S3 | A cleared cache with no backup is unrecoverable, and nothing ever *suggested* exporting. | ✅ `BackupNudge.tsx` |
| F1 | **Space couldn't be typed in typed exercises** — the global flip handler ate it, so "habe gemacht" was untypeable. The app looked broken and blamed your fingers. | ✅ fixed |
| F2 | **The post-gap mountain** — `buildBriefing` included every due review, uncapped. "312 cards queued" is the most common reason people quit SRS apps. | ✅ `DAILY_DUE_CAP` 60, oldest-first, honestly framed |
| F3 | Wrong-answer tone was uniform; the 5th consecutive miss behaved like the 1st. | ✅ circuit breaker |
| F4 | The HD voice hid behind a Settings toggle; frustrated ears met robo-TTS and never learned better existed. | ✅ offered in context at the failing tap |
| F5 | No session resume — and the "grades persist so it's fine" reasoning was half right: the builder makes five randomised decisions, so a rebuild is a *different* queue. | ✅ the queue is stored and rehydrated |

---

### Shipped 2026-08-12 — the typing race, and a passage nobody could type

`#/games` is the fourth destination, and **Tipprennen** is the first thing in it:
three sentences drawn from the learner's own cards, two rivals running at a fixed
pace, and a track drawn in characters.

**The number is not a measurement, and the screen says so.** Typing speed is
tested in none of the six papers — Schreiben is handwritten — so the WPM figure
carries its disclaimer on the finish screen itself rather than in a help page
nobody opens. It is also kept out of `strands`, so it can never reach the
readiness read: this is the same rule the exam results screen already follows when
it refuses to pass a self-assessment off as a machine's judgement.

What *is* real is what you have to type to move it. The reducer is strict about
the two things German actually punishes and a multiple-choice drill cannot reach:

- **capitalisation.** `haus` never becomes `Haus`, and the cursor does not move
  past the capital, so the habit forms on the one screen where it is unavoidable.
- **umlauts and ß.** Refusing `ae` outright makes the first race miserable on a US
  keyboard; accepting it silently makes the feature pointless, since avoiding
  umlauts is the exact habit it exists to break. So a digraph is accepted, counted,
  and named at the finish — *7× you typed an umlaut as ae/oe/ue; in the exam each
  of those is a spelling error* — and it is worth the one character it stands for,
  so substituting cannot inflate the speed it is meant to expose.

The reducer also refuses to advance on a wrong key, which is why the passage is
rendered character by character with the caret drawn in rather than as an input
box: a race must not be finishable with a scrambled sentence.

**Two bugs found by playing it, both invisible to the type system:**

- **The first passage could not be typed.** It contained *langweilig – lass*, with
  an en dash, and no keyboard has that key. 48 corpus sentences carry German
  quotation marks, 23 an en dash, and a handful a no-break space that looks
  exactly like a space. Those are normalised to their ASCII equivalents; `é`, `₂`,
  `ō` and `Å` have no equivalent and those sentences are simply not raced. Pinned
  by a test that walks every character of 60 seeds at all six levels.
- **The game did nothing on a phone.** A `window` keydown listener is perfect on a
  laptop and unplayable on a phone: with nothing focusable on screen the on-screen
  keyboard never opens, so the race starts, the rivals drive off, and the learner
  cannot type. Input now arrives through a real, visually hidden `<input>`, which
  covers desktop and touch through one code path — with `autoCapitalize="none"`
  and `autoCorrect="off"`, because iOS would otherwise autocapitalise German and
  the race would mark the learner wrong for what the phone did.

A third was found the same way: a scripted run recorded **305 WPM**, and the next
race opened with rivals at 244 and 351 — permanently, because the record only ever
rises and there is no way to clear it. The pacer *basis* is now clamped to 120: a
personal best stays whatever it honestly was, and it can no longer wreck the race
it feeds.

33 tests on the logic, including the digraph allowance, case sensitivity, the
refusal to advance, the pacer ceiling, and a race built and typed to completion
from the shipped corpus at every level.

### Shipped 2026-08-12 — the sidebar becomes a bar, and the drawer stops existing

A 240px rail (64px collapsed) carried three destinations, Start session and the
profile. Three destinations do not need a column: on a 1280px laptop the rail was
19% of the width, and the content it pushed is already `max-w-[1280px] mx-auto`,
so on a wide display the rail cost nothing and on a laptop it cost a fifth of the
screen. `TopBar.tsx` spends 55px of the axis there is more of.

- **The mobile drawer went entirely.** The sidebar doubled as one, which meant a
  focus trap, an Escape handler, `role="dialog"` applied conditionally, and an
  `inert` dance to keep seven controls out of the tab order while the panel stayed
  mounted so it could still slide. None of that has to be correct any more,
  because none of it exists. Destinations were already in `BottomNav` under the
  thumb; the profile is now on the bar at every width, which is all the drawer was
  still for. Tabbable controls before `#main` on a phone: **7 → 3**.
- **`lexi.sidebar.collapsed.v1` is dead**, along with `mobileOpen`, `collapsed`,
  the collapse chevron and the hamburger.
- **Start session stays out of `NAV`** and sits to the right of the destinations.
  It is an action, not a place — the same distinction the bottom bar learned when
  it stopped being a fifth item raised out of the row.

Chosen over an icon-only rail and a bottom bar at all widths, on the grounds that
Games is arriving as a fourth destination: four labels fit a bar comfortably,
where a rail would still be a column and an icon rail would make four unlabelled
glyphs carry the whole information architecture.

### Shipped 2026-08-12 — 5,207 grammar exercises, and six ways a generator gets German wrong

The bank was 887 exercises across 136 points — about six a point, which is one
sitting before a point is spent. Ten times that is not an authoring job at any
quality bar worth having, so `corpus:genex` does for exercises what
`authoring/verify.ts` did for vocabulary: derive candidates from facts the corpus
already carries, and refuse what cannot be proved.

**887 → 5,207 (4,320 generated) across 35 derivable points.** The other 101 points
are untouched. *Konzessivsätze: obwohl* is not a fact, and neither is *Partizip
Präsens als Adjektiv*; the summary prints how many points it could not help rather
than filling them with something shaped like an exercise.

**The first run was wrong in six places, and the check is the story.** A generator
bug is not one bad exercise, it is four hundred:

- possessives came out **meinm / deinm** — `/^eine?/` ate the -e- of *einem*, and
  the -e of *eine*, so feminine nominative was `mein` too
- the du-imperative of *vergessen* was **vergis**: a sibilant stem takes only -t
  in du, so the ending to remove is one letter and not two
- it generated **fähr!** — e→i keeps the change (*gib!*), a→ä reverts (*fahr!*)
- modals had imperatives at all, which they do not
- *Verben mit Vokalwechsel* filled with **mieten, bedeuten, regnen**: the test
  compared whole forms, so the epenthetic -e- read as a vowel change. It now asks
  whether the er-form still starts with its own stem
- the passive was generated for intransitives — **du wirst weggezogen**, *sie wird
  geleuchtet*. `aux === 'haben'` was the nearest available proxy for transitivity
  and is not good enough, so that generator draws from a read list instead

**Two generators produced grammatically flawless nonsense.** Pairing corpus words
at random gave *das verheiratete Glas*, *ein lila Detail*, *unter die Rede*. A
learner cannot tell a drill frame from a claim about German, so adjective
declension and the Wechselpräpositionen draw their nouns and adjectives from
curated lists — the endings are still derived, only the pairing is read. `teuer`,
`dunkel` and `hoch` are deliberately absent: they elide or change stem, and
appending an ending to them produces a wrong form.

**`gen: true` earns its keep immediately.** A scoped drill ("practise this point")
would otherwise have become ~96% machine drill, since 150 generated items now sit
beside six authored ones. Authored exercises are spent first, because a generated
item can only state that an answer is right where an authored one was written to
say why.

The cap is 150 a point and the supply is far larger — B1 *Genitiv* had 2,069
candidates and took 150. That is deliberate: exercises are scheduled individually,
so a large point costs nothing until something walks it end to end, and the scoped
drill is that something. Raising the cap is a one-line change if the bank ever
needs to be bigger; it was **declined** on 2026-08-12 rather than left unnoticed.

Seven tests pin the generated bank, including a list of the exact forms the first
run got wrong. One of them found a duplicate that was already there: A1 *Perfekt*
asks "Sie ___ nach Hause gegangen." twice, authored, with two different option
sets. It cannot be spliced out — exercise ids are `gex:<level>:<title>:<index>`
and every learner's schedule is keyed on the index — so it is a ratchet at 1 until
somebody edits it in place.

### Shipped 2026-08-12 — Goethe C2, and the exam room stops assuming it is telc

The last two papers, and with them A1–C2 complete: **Goethe C1** (40 items plus
the five-point register task) and **Goethe C2 · GDS** (40 items, modular).

- **C1 is the odd one out and that is the point.** B1, B2 and C2 are modular or
  half-gated; C1 is one exam, 100 points, 60 to pass, with no floor on any single
  part. A candidate arriving from B2 expects four gates and finds none, so the
  briefing leads with it.
- **C1's Schreiben Aufgabe 2 is objectively scored** — rewrite a note as a formal
  letter, ten gaps, five points — and could not live in the self-assessed writing
  slot without being wiped by it. It scores in `language` and `subtestLabels`
  renames the row, because "Sprachbausteine" is telc's word and C1 has none.
- **Two C1 adaptations, stated in the rubric.** Lesen Aufgabe 1 and Hören Aufgabe 1
  are open production in the real paper. Lexi cannot mark free text honestly — the
  same ruling that governs the letter and the oral — so both become closed tasks
  over the same stimulus. What is lost is spelling and recall; what is tested is
  unchanged.
- **C2 is where the reading stops asking what a text says.** Every wrong option in
  Lesen Teil 1 is something the author does say, in a voice that is not their own,
  and the Hören items turn on a single qualifier — *überwiegend*, *erstmals*,
  *zunächst*. That is authored into the distractors, not asserted in a rubric.

**The exam room had been printing telc's arithmetic over everybody's paper**, and
adding schemes that genuinely disagree is what exposed it. Fixed at the source —
the halves, the total, the line on every bar, the sentence under the grade, the
oral's format and the history chips now all come from the paper:

- A blank Goethe sheet came back **bestanden**. A1 and C1 have no floor on either
  half, so `passed` was `written >= 0 && oral >= 0`, printed beside a grade of
  *nicht bestanden*. `pass.total` is now part of the rule and not optional.
- The two halves showed a green **bestanden** against 0 / 75 for the same reason.
  A half with no floor of its own now reports *zählt zur Gesamtpunktzahl* and
  draws no threshold line — a marker at zero reads as a threshold of zero.
- The letter and the oral were **clamped** to the paper's maximum rather than
  scaled: a B/B/B letter was full marks on a 25-point scheme, and a perfect A1
  oral scored 75 into a slot worth 25.
- Part points were rounded before being summed, so four parts of 6.25 became 6.3
  apiece and a perfect A2 sheet totalled **100.4 out of 100**.
- The pre-exam summary guessed the oral's format from `level === 'A1'` and told a
  C2 candidate they would be sitting with a partner. C2's oral is with the
  examiner; `oralFormat` now travels with the paper.

**Three conjugation and matcher bugs, all found by something refusing rather than
by inspection** — the authoring gate rejecting cards, and the coverage ratchet
failing CI:

- `canConjugate` gates *drilling*, and the matcher was using it to gate *reading*.
  A strong verb outside the irregular table contributed **no indexed forms at
  all**, so `hängt`, `klingt` and `schafft` resolved to nothing while `hängen`,
  `klingen` and `schaffen` sat in the lexicon. `recognitionPraesens` indexes the
  present for any verb; the Präteritum and Partizip stay out, because those are
  the forms a guess gets wrong.
- **Participles were never indexed in their attributive forms.** `geehrt` was
  known and `geehrte` was not, which made *Sehr geehrte Damen und Herren* an
  unknown word in all five papers and the single most frequent gap in the corpus.
  Guarded against participles that are adjective cards in their own right
  (*geeignet*, *bekannt*) — without the guard the reader probe drops on adjectives,
  which is how the guard turned out to be needed.
- **Twenty-eight verbs generated impossible participles and were marked reliable.**
  `über`, `unter`, `um`, `durch`, `wieder` were kept out of the separable list so
  nothing would guess — but the *regular* generator then ran on the full
  infinitive and produced `geübersetzt`, `geunterstützt`, `gewiederholt`,
  `geüberzeugt`. No reading of German produces those. Where the remainder is not
  itself a verb (*überraschen*, *unterstützen*, *übernachten*) the inseparable
  reading is the only one available and now applies; where it is a verb
  (übersetzen/setzen, umstellen/stellen) the verb is unreliable rather than wrong.
- The **verifier judged examples against a lexicon of one**, so `einteilen` never
  split to *teilen … ein* and a correct example was rejected. It now builds over
  the shipped corpus plus the draft.

`fix-authored` gained a plural row — same optimistic-concurrency guard as the
other two, plus a mandatory `src`, because *die Worte* and *die Wörter* are not
the same word.

**Coverage is measured per paper, not pooled.** A single figure is dragged around
by whichever paper is newest and largest — B2 alone took it from 96.0% to 93.9%,
which reads as the corpus getting worse when nothing about the other papers
changed. The floors also legitimately differ by level: Goethe publishes a closed
Wortliste up to B1, and above B1 vocabulary is open by design, so holding a C2
paper to A1's floor would mean authoring compounds nobody should study as cards.
Measured: B1 96.3% · A1 98.6% · A2 96.1% · B2 92.3% · C1 90.0% · C2 90.4%, with
118 cards authored through the machine gate along the way (6,463 → 6,581).

### Shipped 2026-08-11 — Goethe A2, and a ratchet that was measuring the wrong thing

The third paper. **Goethe-Zertifikat A2**: 40 scored items — four reading parts
(newspaper text, a store directory, an email, six people against six adverts with
one `x`) and four listening parts, two heard once and two heard twice — plus the
SMS-and-email writing and the paired oral.

- **A2's pass rule is neither A1's nor B1's**, which is the third confirmation that
  the `Scheme` belongs to the paper: four parts of 25 and 60/100 overall, but with
  **two floors** — 45 of 75 across the written parts and 15 of 25 on the oral. A1
  has no oral floor; telc B1 wants 60% of each half. A2 sits between them.
- **Two more model generalisations**, both from the paper rather than from
  speculation. `MatchPart` gained optional audio and a `once` flag, because A2's
  Hören Teil 2 is the same match-to-options task as telc B1's Leseverstehen Teil 1
  but heard, unrepeated, and with each option spendable once. And `TfPart` gained
  `labels`, because Goethe A2 prints **Ja/Nein** where telc prints richtig/falsch —
  a small infidelity, and the kind that makes a practice paper feel like a
  different exam.
- **One adaptation, stated rather than hidden.** Hören Teil 2 matches what you hear
  to *pictures*. Lexi has none, so the nine options are phrases. The task — hold
  five slots open through a single unrepeated conversation, spend each option once
  — is unchanged, and the rubric says so.
- The store directory started as a per-question `stimulus` and is now a `passage`.
  One text serving five questions is a shared stimulus; attaching it to question 6
  would have repeated it five times and said something untrue about the task.

**The speaking-vocabulary ratchet was measuring the wrong thing, and adding a paper
proved it.** It capped the *total* unresolved words across all papers at 70; A2
pushed it to 74 and failed a bar its own material had not breached. A total falls
to the newest paper. It is now **per paper**, each with its own measured ceiling,
so a new paper is held to its own standard and cannot be dragged over the line by
its predecessors — nor drag them. Six more cards authored against the A2 list
first: `weiterempfehlen`, `bezahlbar`, `das Prinzip`, `der Hort`, `die Absprache`,
`das Parfüm`. 6,457 → 6,463.

### Shipped 2026-08-11 — every word in our own papers, and a conjugator bug 37 verbs wide

"Make sure every word across the practice exams is in the corpus" is only
enforceable if the set of exams is bounded. The published ones are not — and above
B1 no board publishes a word list, because vocabulary there is open by design. The
papers **we author** are bounded, and they are what a learner actually sits here.
So `npm run corpus:papervocab` walks every German string in every Lexi paper and
reports what the corpus cannot teach, and `paper-vocab.test.ts` holds the line in
CI. **92.9% → 96.0% covered.**

Most of the gap was not missing vocabulary. Four matcher defects were:

- **Compounds.** German builds nouns by concatenation and the set is infinite —
  *Deutschkurs*, *Gruppenticket*, *Besprechungsraum*. A compound now resolves to
  its **head**, but only when every element is itself known: *Bohrmaschine* is not
  readable from *Maschine*, so it stays a gap. Listing compounds as cards would be
  the wrong answer anyway — a learner who knows *Deutsch* and *Kurs* already has
  *Deutschkurs*, and teaching it separately spends a review on nothing.
- **Separable verbs written as one word.** Every Nebensatz does this — *"…, wer
  mitkommt"*, *"…, wenn der Zug ankommt"* — and the index only ever held the split
  form, so most subordinate clauses in any real text resolved to nothing.
- **Suppletive comparison.** `besser` and `besten` cannot be reached from `gut` by
  stripping an ending. Six adjectives, listed.
- **The tokeniser could not read `Café`.** A character class of the umlauts split
  it into `Caf` and a stray `é`. `\p{L}` is the actual rule.

**And a real bug in the conjugator, found because the authoring gate refused a
card.** `stimmen` was rejected for an example containing *"Das stimmt"* — the
verifier proves an example contains its headword, and it could not find one. The
cause: `needsE` inserts the epenthetic *-e-* after a stem-final m/n preceded by a
consonant (*atmen → du atmest*), and did not exclude a **geminate**. So `stimmen`
conjugated to *stimmest / stimmet* — which are the Konjunktiv I forms — and every
regular `-mm-`/`-nn-` verb lost its entire present tense. **37 cards.** The common
ones hid it by being in the irregular table: *kommen*, *nennen* and *schwimmen*
were all correct, which is why the reader probe never caught it.

32 more cards authored through the verified path for the words that were genuinely
missing — `das Blatt`, `genug`, `der Gutschein`, `das Café`, `das Projekt`,
`der Zustand`, `die Lust`. 6,425 → 6,457.

### Shipped 2026-08-11 — 52 more grammar exercises, and a tool that only appends

**835 → 887 exercises** across 13 points, weighted to where the bank was thinnest:
five B2 points that are genuinely new rather than B1 re-treads (Zustandspassiv,
the position of *nicht*, adversative connectors, da-compounds, adjectives with a
fixed preposition), two C1, one C2, and the four most-tested points at A1/A2/B1.

- **`npm run corpus:gex` — a tool that does one job.** `grammar-supplement.ts`
  could already deepen a point through its `upgrade` flag, but that flag also
  overwrites the point's `summary`, `rule` and `sections`, so adding four
  questions meant restating the whole teaching text and any slip in the
  restatement silently rewrote what the learner reads. This appends exercises and
  touches nothing else.
- **Append-only is a correctness requirement here, not a style.**
  `lib/grammar.ts` mints exercise ids as `gex:<level>:<pointIndex>:<exerciseIndex>`
  — positions, not names — and every learner's FSRS schedule is keyed on them.
  Inserting anywhere but the end re-points every later schedule at a different
  question, silently. The tool only ever concatenates.
- **The batch is validated before it lands**: four-option kinds only, no duplicate
  options, an answer index inside the options, an explanation on every item, and —
  the commonest authoring slip — a `choose` prompt is rejected if it has no gap
  marker, because that reads as a complete sentence with an inexplicable set of
  choices underneath it.

Every one of these is a `choose` or `mc` item, which means they also flow straight
into the generated quiz engine: the grammar quiz now draws on 887 items rather
than 835, at every level.

### Shipped 2026-08-11 — Goethe A1, and the engine stopped being telc-shaped

A second paper, and the one that proved the exam engine was less general than it
claimed. **Goethe-Zertifikat A1 · Start Deutsch 1**: 30 objectively scored items
across Hören and Lesen, the short written message, and the three-part group oral —
authored from the published Modellsatz's structure, with none of its text.

**What the second paper broke, and how it was fixed rather than special-cased:**

- **`McPart` and `TfPart` had their stimulus baked in.** telc B1 is
  multiple-choice over an *article* and true/false over *audio*; Start Deutsch 1 is
  multiple-choice over a *dialogue* and true/false over a *sign*. Same two item
  shapes, four different stimuli. Both parts now carry an optional `audio` block, an
  optional read stimulus, and — for A1's Lesen Teil 2, which shows a pair of adverts
  per question — an optional per-question stimulus. The playback transport moved out
  into a shared `AudioBar`, since it belongs to neither item shape.
- **The mark scheme was a module constant.** Goethe A1 scales four skills of 25 to
  100, passes at 60, and — unlike telc B1 — sets **no separate floor on the oral**,
  so a strong written half genuinely can carry a weak spoken one. That rule now
  travels with the paper as a `Scheme`; `TELC_B1` stays the default so every
  existing call site reads unchanged.
- **`Model.band` was `'A2' | 'B1' | 'B2'`.** An A1 paper ladders A1/A2/B1. Widened
  to `CEFR`, and the speaking view now opens on the *middle* rung rather than on a
  hard-coded 'B1' that rendered an empty card.
- **Two hard-coded telc facts were being asserted on a Goethe paper**: the item
  counter said "0/60" on a 30-item paper, and the schedule promised "paarweise, 20
  Minuten Vorbereitung" for an exam that is a group with no preparation time. Both
  now come from the paper.

The structural test suite runs over **both** papers with `describe.each`: consecutive
item numbering, every key naming an option that exists, every item explained, every
part carrying something to read or hear, a perfect sheet scoring exactly the
objective maximum, and three graded models on every speaking prompt. 545 tests.

### Shipped 2026-08-11 — the authoring gate is now a machine, and 52 A1 cards went through it

Corpus growth was human-gated: *"needs a network- and LLM-enabled maintainer
machine plus human spot-checks of gender/plural/level — not an autonomous bulk
commit."* That rule was protecting something real. A generated card is a
plausible-looking sentence with a **gender** attached, and a wrong gender is worse
than a missing card, because it is taught, drilled and remembered.

So it is replaced rather than removed. The insight is that authoring a card is two
jobs wearing one name:

- **Facts** — gender, plural, part of speech, IPA — are *never generated*. They are
  read from de.wiktionary and copied, and a disagreement with the candidate is a
  hard reject.
- **Prose** — the gloss and the example — is written, then checked mechanically.
  The example must contain a real inflection of the headword, proved with the app's
  own matcher. A substring test would pass *"Meine Tochter möchte gern reiten
  lernen"* for `das Pferd`, which is how ~71 such cards shipped in the first place.

`scripts/authoring/verify.ts` + `npm run authoring:new`. Third member of the family
after fill-only `apply-authored.ts` and expect-guarded `fix-authored.ts`.

**52 A1 cards shipped through it** — `der Euro`, `das Ticket`, `der Familienname`,
`der Geburtsort`, `der Kilometer`, `das Prozent`, `der Kugelschreiber` and the rest
of the Goethe A1 syllabus that the corpus lacked. 6,373 → 6,425 cards.

**The gate caught three real defects, two of them mine:**

1. **A transient fetch failure was cached as "no entry"**, rejecting 40 perfectly
   good candidates for words that plainly exist (`Fahrer`, `Westen`, `Text`). The
   API saying *missingtitle* is a durable fact and is cached; a network error is
   not and now retries. A cache that remembers failures is worse than no cache.
2. **Reading only the first `Genus=` on a page** rejected `das Schild`, `das Alter`
   and `der Teil` as contradicting the dictionary. German has real gender pairs —
   `der Schild` is a shield, `das Schild` is a sign — so the parser now collects
   *every* attested gender, and refuses to guess when a page attests more than one.
   That refusal is the good part: the batch had to state those genders explicitly,
   which turns the dictionary from a source into a witness.
3. **Umlauts in an English translation** were read as German prose, rejecting
   *"Good afternoon, Mr Müller!"*. Capitalised words are names.

What remains un-machine-checkable is whether a sentence is *good* German, and that
is not pretended away — `--report` prints every verified card for reading. But
nothing now ships on anyone's say-so about a gender, which is what the human gate
actually existed to catch.

### Shipped 2026-08-11 — Tests: a quiz engine at every level, and a path to a pass

The exam surface shipped as one authored telc B1 paper, which shaped the whole
room around a 150-minute commitment at a single level. Two things were wrong with
that: a learner with twenty minutes could not use it at all, and A1, A2, B2, C1 and
C2 got an empty shelf and an apology.

- **`lib/quiz.ts` — five generated test kinds**, built from the corpus and the
  grammar bank rather than authored: German→English, English→German, der/die/das,
  a cloze made by blanking a headword in its own example sentence, and the
  multiple-choice half of the grammar bank. **Every level is testable today.** An
  authored paper is now the deep end rather than the only end.
- **Deterministic from a seed.** "Dieselben Fragen" replays the *same* twelve
  questions, which is what makes a second run a measurement rather than a
  different, possibly easier, quiz. It is also what lets the tests assert real
  behaviour instead of "it returned five things".
- **The quiz is a loop, the paper is a sheet**, and the difference is deliberate.
  A paper shows every item and marks nothing until you hand in, because that is
  the skill being rehearsed. A quiz answers immediately and moves on. Blurring them
  would give you a paper that spoils itself and a quiz that makes you wait.
- **`lib/readiness.ts` — the path.** Six strands (Wortschatz, Grammatik,
  Leseverstehen, Hörverstehen, Schreiben, Sprechen), a ranked list of what to do
  next, and an optional exam date. Each action carries its reason and is a link:
  a weak oral goes to the scripts, a weak Sprachbausteine to the context quiz, a
  repeated blind spot to that grammar concept.
- **Preparation and performance are two numbers and are never averaged.**
  Preparation is what FSRS knows about the level's material; performance is what a
  sitting measured. Blending them would let a learner with 90% preparation and no
  measured listening believe they were ready. **An unmeasured strand renders as a
  dash, not a zero** — "nobody has checked" and "you are bad at this" are different
  facts, and only one of them is true before you sit anything.
- The room now defaults to the learner's own level rather than to B1, remembers
  the target, and reports quiz scores against the same 60% both telc and Goethe
  pass at rather than inventing a friendlier line.

**One bug worth recording:** the readiness memo keyed only on its props, so it kept
its first-paint answer — and first paint happens before IndexedDB has hydrated,
which rendered a fully-studied learner at 0%. The store version has to be a
dependency, not just a subscription. That is the pattern the other views already
follow; this one had to relearn it.

### Shipped 2026-08-11 — 599 duplicate cards retired, and the matcher got better for free

**7,394 → 6,795 cards.** 516 groups where the same word existed two or three times
over, agreeing on gender, part of speech and gloss — `die Mutter` at A1 in *Family*
and again at B1 in *Family relationships*, each with its own FSRS schedule, so the
learner met and re-learned it.

- **Only the byte-identical class was merged**, which is BACKLOG Now #3's own
  instruction: *triage by group, never in bulk*. Of the 874 duplicate terms, 516
  agreed on everything, and the remaining **358 are written to `dupe-review.tsv`
  unmerged**, one line per group with every copy's level, sector and gloss. A gloss
  heuristic would have destroyed real homographs: `der Zug` is *train* **and** *move
  (in a game)*, `der Kurs` is *course* **and** *share price*, `der Satz` is
  *sentence* **and** *set of reps*. Most of the rest are en-GB against en-US —
  "theatre"/"theater", "colourful"/"colorful" — which is a different job again.
- **A merge never loses content.** The keeper absorbs whatever the retired copies
  had and it lacked: definition, German definition, IPA, plural, synonyms, and
  examples unioned to a cap of six.
- **The keeper is chosen by level, but not always by sector.** Keeping the lowest
  copy is right — it is the one an early learner can reach — but its sector comes
  along for the ride, and `putzen` would have kept A1/*Miscellaneous* over
  A2/*Home*. 53 keepers were rescued out of a catch-all sector; the other 438
  sector disagreements are flagged in `dupe-rulings.tsv` for `corpus:resector`
  rather than guessed at (`die Handschuhe` is A2/*Skiing and snowboarding* and
  B1/*Clothing*, and picking between two real sectors is a judgement call).
- **Six sectors emptied entirely** and were dropped — they existed only as copies
  of cards filed elsewhere.
- 599 `ID_MAP` entries plus 3 re-pointed; `sectors.json` counts and level lists
  refreshed; `provenance.json` re-pointed and de-duplicated.

**The unplanned win: the matcher got materially better.** `corpus:validate`'s reader
probe, unchanged, went **verb 0.75 → 0.83, plural 0.84 → 0.94, adjective 0.84 →
0.87**. Duplicates were shadowing each other in the matcher's first-wins index, so a
token resolved to whichever copy happened to come first — and that copy might be the
one with no plural recorded, or the one whose examples were thinner. Removing them
did not change a line of `matcher.ts`. It is also, precisely, the mechanism that made
the A1 probe lie two entries below.

---

### Shipped 2026-08-11 — the meter was counting "etwas" against the learner

Measured over the new B1 paper: **7.8% of content tokens** were failing to resolve
for reasons with nothing to do with vocabulary. Coverage of the paper against the
whole corpus: **83.6% → 87.6%**. This matters because it lands on Now #2, whose
entire competitive claim is that its number is honest.

- **`FUNCTION_WORDS` gained the closed class it was missing** — indefinite pronouns
  (*etwas, alles, nichts, jemand*), quantifiers (*jeder, andere, einige, mehr,
  viele*), demonstratives, and the inflected possessives. `ihre` was in the set from
  the start and `ihren`/`ihrem`/`ihrer` were not, so one word counted as known in one
  case and unknown in three.
- **Spelled-out cardinals join ordinals as neutral.** German writes them as one
  word, so the set is infinite and no corpus can list it; knowing *achtzig* is
  arithmetic, not vocabulary.
- **Three inflections that were silently dropped now resolve**: the feminine
  `-in`/`-innen` (exam texts use paired forms constantly — "acht Schülerinnen und
  fünf Schüler"), the genitive singular (*des Kurses, des Vaters, des Hauses*), and
  the adverbial `-s` on time nouns (*montags, samstags, nachmittags*).

**Two of my own mistakes are pinned as tests**, because both are the wrong-answer
class this file already warns about for verb homographs — worse than a miss, since a
miss is visible and a wrong lemma is not:

1. The genitive rule first claimed `festes` — the adjective in *"ein festes
   Programm"* — for the noun `das Fest`. Reordering it after adjective de-inflection
   was not enough, because the corpus has no `fest` adjective card for that rule to
   find. It is now gated on capitalisation, which is the signal German actually
   gives; the adverbial `-s` gets its own lowercase door, scoped to time nouns.
2. The `-in` derivation ran inside the base-form loop, where first-wins let it steal
   `die Freundin` and `die Ärztin` **from themselves** — 111 of those forms are real
   cards — and take `Freundinnen` off that card's own plural. `corpus:validate`
   caught it as a plural regression, 168/200 → 165/200. It derives last now, after
   every real form is indexed.

---

### Shipped 2026-08-11 — the Goethe A1 relevel, and a finding withdrawn

**162 words the Start Deutsch 1 syllabus examines now have an A1 card.** A1 word
cards 964 → 1,126; on an 82-word probe of the A1 exam's core lexicon, 85% → 91%.

- **The authority is Goethe's.** `scripts/corpus/data/goethe-a1-wordlist.txt` is the
  published Goethe-Zertifikat A1 / Start Deutsch 1 Wortliste — 657 lemmas, extracted
  from the official PDF **by column position** (headwords sit in their own column at
  x=375.8, examples at x=386.1), which is why it is a faithful list of *entries*
  rather than a scrape of every word on the page. Three heuristic parses were tried
  and thrown away first; the count landing on 657 against Goethe's stated "circa 650"
  is what says the fourth is right. Lemmas only — the example sentences are Goethe's
  copyrighted expression and are deliberately not reproduced.
- **A part-of-speech guard, found by reviewing the 34 largest jumps by hand.**
  Article-stripped matching let Goethe's noun `der Dank` find Lexi's *preposition*
  `dank`, `das Lokal` find the adjective `lokal`, the verb `reisen` find the
  nominalisation `das Reisen`, and the interjection `Achtung!` find the abstract noun
  `die Achtung` ("respect"). Four genuinely B1+ words would have been promoted on the
  authority of a homograph. Goethe prints the article for nouns and omits it
  otherwise, so the list itself carries the signal to catch all four.
- **A relevel is a schedule migration, and three files hold a card id.** Word ids
  embed the level (`voc:B1:der Tisch`), so this ships 162 new `ID_MAP` entries plus
  **nine existing ones re-pointed** — they aimed at ids this pass moved
  (`voc:A2:Oben` → `voc:A2:oben` → `voc:A1:oben`), and a broken chain silently resets
  a learner's schedule rather than erroring. `vocab.json`, `provenance.json` (37 rows)
  and the id map are all migrated by the script; `cards.json`/`detail.json` follow via
  `corpus:split`. `store-idmap.test.ts` and `provenance.test.ts` both caught this
  before it shipped, which is the entire argument for having them.
- **Nothing was demoted.** Lexi holding a word at A1 that Goethe omits is not an
  error, and pushing it up would take it from the learner who needs it most.

#### The finding that produced this was wrong, and the correction matters more

The pass was commissioned off a measurement that said *"an A1-placed learner reaches
34 of 82 core A1 words — 41%; one of thirteen in Wohnen"*. **That was an artefact.**
The probe looked each word up in a `Map` built by iterating the corpus, so for any
term on more than one card it kept whichever copy came last and reported *that*
card's level. 874 terms sit on more than one card: `der Tisch` is at A1 in *Home* and
at B1 in *Furniture*, `der Zug` at A1 in *Town & travel* and B1 in *Games*. Every
alarming row was a duplicate, not a gate. Measured properly — does an A1 card exist —
the real figure was 85%.

The relevel is still right and still shipped: all 162 promotions are words with **no**
A1 card at all. But it is a 6-point improvement, not the 50-point one that was
claimed, and what the probe actually rediscovered is the duplicate problem already
ranked as Now #3. Recorded at length in BACKLOG.md under "a withdrawn finding, kept
because the mistake is the lesson" — the top of that file already says *treat any
check that fires on thousands of rows as a bug in the check*, and this is what it
looks like to ignore your own rule.

**Also fixed:** `BlockClock` persisted the exam clock from inside a `setState`
updater, so the store emitted mid-render and React warned that `Exam` was being
updated while `BlockClock` rendered. The tick now lives in the interval callback; a
state updater has to be pure.

---

### Shipped 2026-08-11 — telc Deutsch B1: a real paper, and three answers to every question

Backlog item #43 has said the same thing for months: *"Goethe B1 is the most-taken
certificate in the category. The app knows his level, pace and weak modes and never
says 'your weakest area **for B1** is Kasus.'"* Exam conditions shipped; the
alignment did not. This is the alignment, and the paper it aligns to.

- **`#/exam` — a full telc Deutsch B1 sitting.** 60 objectively scored items across
  the five real Teile, a letter, and the paired oral. Two modes: *Übungsmodus*
  checks a Teil at a time and explains every key; *Prüfungsmodus* gives no feedback
  until you hand in, and the 90-minute block locks when it expires.
- **The format is telc's, taken from telc's own published Übungstest** — item
  ranges (1–20 · 21–40 · 41–60), options per gap, points per item (5 · 5 · 2,5 ·
  1,5 · 1,5 · 5 · 2,5 · 5), what is heard once and what is heard twice, the four
  criteria of the oral with their A/B/C/D point tables, and the 60%-of-each-half
  pass rule. **Every text is written for Lexi.** No telc passage, advert, cloze or
  item is reproduced — a licence question, and also the pedagogically better answer,
  since a learner who has memorised Übungstest 1 has learned Übungstest 1.
- **Three model answers to every speaking prompt, at A2, B1 and B2.** The feature
  the whole thing was built around. A single model answer hides the two facts that
  decide the mark: that a short, correct, complete answer *passes* (criterion 2 is
  Aufgabenbewältigung, not eloquence), and that the distance from pass to good mark
  is a small learnable set of moves — a reason, a connector, a question back — not a
  bigger vocabulary. So the ladder is visible and you can step down it under
  pressure instead of off it. 8 Kontaktaufnahme prompts, 3 Teil-2 topics with both
  partners' info sheets, 3 Teil-3 planning tasks with full graded dialogues, and a
  33-phrase Redemittel bank. **Reachable without starting a paper** — someone with
  the exam next week wants this at a bus stop, not behind a 90-minute reading test.
- **The two productive parts are self-assessed, and the screen says so.** Free
  composition cannot be graded honestly without a model, and a drill that marks
  correct German wrong is worse than no drill (the ruling already recorded under
  *Extended production*). So the app hands over the examiners' own grid with telc's
  published descriptors and refuses to pretend the number is a machine's judgement.
  Until both are marked, every total is labelled a **floor, not a score**.
- **The result screen leads with two numbers, never one.** telc's rule is 60% of
  *each* half independently, so a 240 with a weak oral is a fail and a screen
  headlining "240/300" would be lying by emphasis. The two hard rules on the letter
  are enforced rather than described: a D on criterion I or III zeroes it, and the
  discretionary points are unavailable to a letter already at full marks or graded
  C anywhere.
- **Listening is spoken by the device, and the limitation is stated on the card.**
  No recording can ship — licensed material, and 20 minutes of German would outweigh
  the app. Deliberately the *platform* voice rather than the HD Piper one:
  `speechSynthesis` has a real queue, so a fifteen-turn interview plays as one
  continuous track, its rate is adjustable for the slow replay, and it cannot put a
  ~25 MB download in the middle of a timed part. telc's playback count is enforced —
  Teil 1 plays **once** — because a practice run that lets you replay it has
  removed the hardest thing about the part. A watchdog polls the engine, because
  `end` is dropped by backgrounded Chrome and by iOS Safari, and a stuck "Stop"
  button during a timed listening part is the worst failure this surface has.
- **The paper is a dynamic import** — the second in the codebase after `three`.
  ~90 KB of German prose that nothing on the boot path reads, and six levels of it
  would be most of the bundle.
- **28 tests, and they pin the paper as well as the arithmetic.** Item numbering is
  1–60 with no gaps or repeats; each subtest sums to telc's maximum; every key
  names an option that exists; no advert or Sprachbausteine word is used twice;
  every cloze marker has an item and vice versa; every item has an explanation;
  every speaking prompt has exactly three bands. An authoring slip now fails CI
  instead of quietly changing what a learner's score means.
- **A tiny `Rich`** renders `**bold**` / `*italic*` in exam copy only. An
  explanation that points at a word — *bei* takes the dative, so the key is
  **mir** — is a worse explanation if it cannot mark which word it means. Two
  characters of markdown, no dependency, no `dangerouslySetInnerHTML`.

Verified in the browser at 1280 and 375, both themes: no horizontal overflow, the
verdict strips measure 5.8–13.5:1 contrast, the play limit holds, and the sheet
survives a reload mid-sitting (written through on every keystroke; the clock
persists every five seconds).

A1/A2/B2/C1/C2 render honestly as "no paper yet". They share this scoring engine
and these renderers, so adding one is authoring, not building.

---

### Shipped 2026-08-06 — das Gehirn: the lexicon as a brain

The app measured a great deal and let you *feel* almost none of it. Progress is a
treemap, a bar chart and a list — instruments that answer "how am I doing?"
precisely and answer "what have I built?" not at all. §7 of DESIGN.md named the
gap in the app's own words and marked it *not yet built*: **a number or area that
changed because the learner did something animates from its old value.**

- **A 3D brain made of your vocabulary**, at `#/brain` and as the hero on Today.
  One point of light per card, placed in the cortical region the literature
  associates with its meaning. Not a mesh with dots painted on: the brain *is* the
  point cloud, hull included.
- **Words are born in the hippocampus and migrate to the cortex.** This is the
  part that is not decoration. Complementary Learning Systems theory says a new
  memory is hippocampus-dependent and becomes neocortical through spaced
  reactivation; FSRS `stability` is a monotone estimate of exactly that, so
  `consolidation.ts` maps it (log-scaled) onto the journey from the centre
  outward. The visualisation renders the scheduler's own belief rather than
  inventing one. The result reads as coloured streams leaving a white core.
- **The atlas is rules, not a table** (`lib/brain/atlas.ts`). 291 authored sectors
  → 16 regions via ordered patterns over the *normalised* name, then the fine
  corpus group, then the angular gyrus. Total by construction; a new corpus sector
  cannot come out homeless. Guarded by `atlas.test.ts`: every sector resolves, no
  region goes unclaimed, the residual stays under 5% once the corpus's own
  `Miscellaneous` is excluded, no region holds more than a quarter of the lexicon.
- **Three defects the guard was written for, all found by printing the numbers
  rather than reading the code.** (1) The rules were first written
  `\b(?:stem|…)\b`, and the trailing boundary silently broke every plural and
  inflection in the file — "Animals" never reached the fusiform, "Communication"
  never reached Wernicke's, "Working Life" landed in the residual. (2) `ag` is both
  a real rule outcome and the fallback sentinel, so testing `out === RESIDUAL` to
  decide whether to fall back sent every legitimately abstract sector to its group
  instead. (3) `\bmigrat` cannot match inside "emigration". All three are pinned.
- **`three` is the first dynamic import in the codebase.** Reached only through
  `await import()` in `BrainScene.tsx`, so it lands in its own chunk (118KB gzip)
  and Today's first paint never waits on it. A 2D canvas renderer paints the same
  point set immediately and hands over when the chunk arrives — which also means
  the no-WebGL path is not a fallback anyone had to design, it is what shipped
  first.
- **The observatory is unconditionally dark**, in both themes. A documented
  exception to §2's hue discipline on the same grounds §8 uses to strip chrome off
  the session desk: a different room for a different activity. A bioluminescent
  field needs black to be luminous. Tokens live in `:root`, *not* `@theme` — see
  the `--heat-*` note directly above them for what happens otherwise.
- **`store.onCardEvent`** — a second, narrower channel beside the version counter.
  `subscribe()` says *something* changed, which is right for aggregates and
  useless to a consumer that must animate one card. Fired from `review()` and from
  `restoreCard()`, because a rewound review did not happen and its light has to go
  back out, for the same reason `unbumpReviewLog` exists.
- **Coming back from a session, the brain replays what changed.** The desk is a
  full-bleed early return, so nothing is mounted to see the flares while you
  study; a module-level log records them and the next brain to mount ignites them
  in sequence. §7's "Data change", finally built.
- **Reduced motion means less motion, not a lesser picture.** No idle spin, no
  breath, and the loop stops once nothing is changing — but the 3D scene still
  renders. Reading the preference as "show me less" would have been a different
  and worse thing.
- **Two rAF traps, both the defect class §7 already documents.** Substrate
  generation was deferred behind `requestAnimationFrame`, which never fires in a
  backgrounded tab, so a brain opened in one stayed black forever; it is a
  `setTimeout` now, and the first frame paints synchronously before any loop is
  scheduled. Verified with `rafTicksIn600ms: 0`, the same probe §7 was written
  from.
- **Two canvases, stacked in one grid cell.** A canvas hands out one kind of
  context for life, so the 2D renderer taking `getContext('2d')` for the first
  frame permanently poisoned the element and every later `WebGLRenderer` on it
  threw — the scene silently stayed 2D. Separate elements remove the race rather
  than trying to time it. (Stacking them with `position` would not do: an inline
  `position: relative` on the wrapper beats the `absolute inset-0` the room passes
  through `className`, which is how the room first rendered as a blank 300×150
  strip.)
- **`#/brain` is a View but not a nav destination**, like session/placement/
  profile. §8a's three destinations survive.
- **The canvas is `aria-hidden` and does not pretend otherwise.** The accessible
  surface — and the useful one — is the region rail: every number as text, with
  each association's confidence tier and citations, and a "Study this region"
  button that builds a custom target from the region's cards.
- **A detail pass, after the first version read as gauze.** Three causes, all
  separable. (1) No shading: every tissue point was lit identically, so no gyrus
  caught the light. Each point now carries a surface normal, taken by finite
  differences across the folded surface, and a signed relief value; the shader
  does a key light plus curvature darkening, which is how every neuroimaging tool
  renders a cortical surface and for the same reason. (2) No occlusion: additive
  blending has no notion of in-front-of, so the far hemisphere shone through the
  near one. (3) Isotropic noise gives round bumps; real gyri are elongated
  ridges, so the fold is now sampled through a stretched coordinate, and twelve
  *named* sulci are drawn rather than left to fbm — the eye identifies the named
  pattern, not the roughness.
- **The bright outline was a sampling artefact, not a rim light.** Sampling a
  surface uniformly by direction piles unbounded point density onto the
  silhouette, where the surface runs edge-on; additive blending turned that into
  a hard outline around every part, so the lobes read as separate bodies however
  the lighting was balanced. Scaling brightness by the cosine of the viewing
  angle is the exact compensation — it is the projected area a patch covers — and
  it disposes of back-facing points for free. Two evenings of "the rim is too
  strong" were the wrong diagnosis.
- **Density up to 130k points, generated in slices.** Each point now costs three
  surface evaluations rather than one (two are the finite differences behind its
  normal), so a single synchronous pass would block for most of a second. Slices
  of 15k are handed over as they finish and simply concatenated — the fold and
  the sulci are keyed to the seed while only the sampling stream varies, so two
  batches are two draws from the same brain. Sulcus lookup got per-sulcus
  bounding spheres, which took a slice from 261ms to 93ms.

- **A preview scrubber, behind `g` in the room.** A slider that renders the brain
  at any size of lexicon — "what does 5,000 words look like" without anybody
  having to learn 5,000 words, which is the only way to see the far end of the
  design. It substitutes the consolidation function (`simulatedConsolidation`,
  a pure function of the card id) and never reads or writes the store, so no
  amount of scrubbing can touch real progress. Ranks are stable in the id, so
  raising the fraction only ever *adds* words rather than reshuffling the sky.
  Hidden by default, and unmistakably labelled whenever it is on: a control that
  shows numbers which are not yours has to say so.
- **Sharpened, on four counts.** Antialiasing was off from when the scene was
  points only, where it bought nothing; with a mesh in it every gyral edge was
  stair-stepped, and at arm's length a staircase reads as blur rather than as
  aliasing. The point sprite was a wide halo carrying most of the energy — 7,394
  overlapping wide halos is not a constellation, it is fog — so the core is now
  the bright part and the halo a hint. The shell gained a specular term, which
  is what puts a hard edge on a gyral crown where diffuse alone gives a soft
  gradient. And `powerPreference` went to `high-performance`.

- **Words tile the cortex instead of clustering at sixteen points.** Each word
  was seated in a small gaussian around its region's MNI coordinate, so a full
  lexicon packed into sixteen dots and left the rest of the brain dark. Each
  surface region now takes the patch of cortex closer to its coordinate than to
  any other — a Voronoi partition of the shell — so a maxed-out lexicon covers
  the whole surface and the coordinates still decide which colour goes where.
  This is also the more accurate picture: Huth et al. found semantic categories
  *tiling* the cortex continuously, not clustering at peaks. Deep nuclei — the
  hippocampus, amygdala, insula, caudate — keep the gaussian, because they are
  small structures buried in the volume.
- **Cavity shading, so the grooves read as grooves.** Lighting from normals
  alone gives a sulcus and a gyral crown nearly the same value, because the
  bottom of a groove still faces roughly outward. Per-vertex concavity is now
  derived at load — the mean neighbour offset resolved along the normal, which
  is a discrete mean curvature and falls out of the walk that already computes
  normals — and the shell darkens by it. No format change, no larger download.
- **Click the brain to select a region.** A raycast against the shell, resolved
  by the same Voronoi rule that placed the words, so clicking a patch of cortex
  selects the region whose words are under the cursor. Press-and-drag still
  rotates; only a press that travels under 6px counts as a click.
- **A gesture now survives a re-render.** `onPickRegion` arrives as an inline
  arrow, so its identity changes every render; with it in the effect's
  dependency array the pointer listeners tore down and re-registered *mid
  gesture*, and the fresh closure began with no active pointer — so `pointerup`
  returned early and a click never selected anything. The callback lives in a
  ref now. `setPointerCapture` is also wrapped: it throws for a pointer the
  browser does not recognise, and an exception there aborted the whole gesture.

- **The pathways, finally drawn.** One arc per region per hemisphere, bowed
  outward from the hippocampus to the cortical seat, carrying a travelling pulse
  so the route reads as a *direction of travel*. Anatomically motivated rather
  than decorative: the hippocampal–neocortical projection is the pathway
  Complementary Learning Systems theory is about, and it is the direction a
  memory actually moves. They dim with the rest when a region is selected.
- **The far hemisphere stopped muddying the near one.** The lexicon draws with
  depth testing off so words inside the volume glow through the shell — which
  also let the *back* half's territories shine through the front, and two sets
  of colours superimposed is not a map, it is noise. The depth falloff is now
  steep enough that the far side reads as depth rather than as competition.
- **Tone-mapped instead of clipped.** Additive blending has no ceiling, so a
  dense patch of territory summed past 1.0 in every channel and went white —
  losing the colour that says which region it is. Reinhard keeps a bright region
  bright *and* coloured.
- **"A massive hole in the top" was not a hole.** The mesh is watertight — zero
  boundary edges, all 155,616 edges used by exactly two triangles. It was the
  interhemispheric fissure, a genuine canyon that 2% of the surface sits inside,
  rendered black by the new cavity shading. And because the shell is *additive*,
  black contributes nothing and the void shows straight through: a dark patch is
  not a shadow here, it is a hole. Every fragment now emits a floor, and the
  cavity darkening stops well short of black.

- **The shell is alpha-blended now, not additive — the fix the holes actually
  needed.** Under `ONE, ONE` a fragment that shades to black contributes
  nothing, so the darkest cortex became a window onto the void; the fissure read
  as a tear and every patch was a floor on how dark the surface was allowed to
  get. That is the wrong trade for an organ whose character *is* deep shadowed
  grooves. Alpha blending inverts it: dark is dark, because the fragment still
  replaces its share of what is behind it, and the silhouette is solid by
  construction. Translucency moved to the alpha channel — low face-on so the
  words read through, rising to opaque at grazing angles, which is how glass
  behaves and what makes a rim a rim. Three ordered passes: depth only, then the
  interior (words and tracts), then the shell over the top. Alpha blending is
  order-dependent, so the order is stated in `renderOrder` rather than left to
  the sort. Cavity darkening went back up now that it cannot punch through.

- **The selected region names itself on the brain.** A label anchored to the
  region's centre with a leader line, positioned from the render loop by writing
  a transform rather than through React state — it moves every frame the brain
  turns, and re-rendering the tree at 60fps to move one div is what the canvas
  exists to avoid. It dims rather than vanishing when the region rotates round
  the back, so it never blinks out mid-drag.
- **The recap says where the night's work landed.** One line under the tiles
  naming the regions this session touched, with their colours — then Today
  ignites those same neurons when you land back on it. Two views of one fact, in
  the order they happen. `peekChangedRegions` reads the change log *without*
  draining it, which is what lets both happen. Deliberately a sentence and not a
  fourth tile: the recap already has a row of numbers, and three names say more
  than another count would. This is the brain earning a place in the daily loop
  instead of being a room you visit.

- **`docs/BRAIN.md`** states precisely what the map claims and what it does not,
  including the joins worth arguing about (Work → TPJ is the loosest). The surface
  itself carries a standing, non-dismissible line: *a map of the published
  literature, not a map of your head — nobody has scanned you.*

---

### Shipped 2026-08-04 — the consolidation: four histories become one

- **Three stranded branches landed on `main`.** The July 27 work (20 commits — the
  definition programme, duplicate measurement, word families, structured rules, the
  four-grade scale, session resume, Lesen) had never been merged: `main` forked away
  from it on July 28 and the Atlas pass, the listening branch and the day-boundary fix
  were all written on top of the fork. The tell was that **both sides deleted the same
  archived Orbita and print-and-play trees, independently** — duplicated work is what a
  silent fork buys you. Merged in date order, each with typecheck + suite green.
- **What the merge caught that neither branch could see alone.** The time-budget chips
  ("3 min · 5 min · 10 min") from one branch had exactly the defect `Target.cap` from
  another branch existed to fix — slicing the id list bounds the flips, and the builder
  then weaves drills, blind spots, linked points and a remedy on top, so a chip
  promising three minutes served rather more. New `itemsForMinutes()` gives the chips
  the cap. Neither branch was wrong; they had simply never met.
- **A test broken correctly.** `store-idmap` asserts a corrected card id carries its
  schedule across and drops the old key; persistence became debounced on another
  branch, so the write no longer lands inside `hydrate()`. The behaviour is right and
  self-healing (`migrateIds` re-runs every hydrate, no-ops once the ids are gone), so
  the test outwaits the debounce rather than the API growing a `flushCards` export.
- **Conflicts resolved on the merits, not by recency.** The gender-ink retune was
  measured against a *dark* card that the Atlas inversion has since made `html.dark`'s
  job — superseded, but its durable finding survives as a comment: `--color-der` and
  `--color-a1` are the same hex in both themes, one colour carrying two meanings.
  `AnimatePresence` stayed out of the study loop. The audible example kept the human
  Tatoeba voice and regained the `aria-label` that the replaced `SpeakButton` had been
  providing.
- **BACKLOG split adopted, and reconciled.** This file's open/shipped split was the
  better shape and survived the merge; `BACKLOG.md` is now open work only, with the
  Atlas findings and the Fifty folded into it and every closed item moved here.

### Shipped 2026-08-01 — the day belongs to the learner's clock

- **`todayKey()` was the UTC calendar date.** An evening session west of Greenwich
  already belonged to tomorrow: 16:00 Tue then 18:00 Wed in Los Angeles produced keys
  08-04 and 08-06 — a one-day hole that **reset the streak after two genuinely
  consecutive days**. East of Greenwich it failed the other way and inflated it. The key
  now comes from local calendar components, with a `dayStart()` helper for
  `dueForecast`, the one place a day key meets a real timestamp.
- **The suite could not see it**, because every fake-timer test pinned 12:00Z — the one
  hour where UTC and local agree in every plausible timezone. Tests now also run at
  16:00/18:00 and 00:30/23:30 local; green under LA, New York, Berlin, Kolkata,
  Kiritimati, Midway and UTC, where before it passed under UTC alone.
- **Four things the instruments were hiding.** Vitest walked `.claude/worktrees/` and
  ran four stale branch checkouts alongside this one, reporting their failures as ours.
  The orphan-drill branch was unreachable on the only path sessions take. Undo rewound
  the card and the counters but left its review in the log, so it still fed
  `reviewedToday()`, Stats and recall. Every grade re-serialised the whole card map to
  IndexedDB — now debounced 400ms, flushed on `visibilitychange`/`pagehide`, cancelled
  on import so a restore cannot be clobbered.

### Shipped 2026-07-31 — listening, and the map that moves

- **Listening, phase 1 — the plumbing, not the skill (the Fifty #39).**
  > ⚠️ **Corrected 2026-08-05.** This entry originally claimed listening "makes the
  > number the whole app is organised around true". It does not, and the number that
  > says so is **10 of 7,389 cards — 0.14%** carrying a human recording. A learner
  > will almost certainly never meet one. What shipped is the licensing, fetching and
  > caching layer that makes real coverage *possible*; the coverage itself is unfunded
  > work, tracked as "Listening, phase 2" in the backlog. The original wording is the
  > kind of overclaim [CRITIQUE.md](CRITIQUE.md) exists to catch.

  Known has always meant "recognised in print";
  a learner with 2,300 Known words can still catch none of them spoken. `corpus:audio`
  joins the Tatoeba sentence ids already in `provenance.json` against the
  `sentences_with_audio` export and emits `public/data/audio.json` — **ids only, no
  audio bytes committed**. `lib/audio.ts` fetches a clip on first play and caches it in
  OPFS, mirroring `tts.ts`. **The licence is the interesting part:** Tatoeba's audio
  licence is *per recording*, and an empty field means the audio may not be reused — so
  the filter is an **allow-list, not a deny-list** (CC0 / CC BY / CC BY-SA / public
  domain kept; empty, unrecognised, NC and ND dropped). Too strict costs a card its
  human voice and falls back to synthesis; too loose redistributes someone's voice
  against their terms. Keyed by *card* id, not sentence id — `Word` has no provenance
  field and the app never loads the 596KB `provenance.json`.
- **The map moves because you studied (#2, #3).** Territories that changed since you
  last looked travel from the colour you last saw (`lexi.mapseen.v1`), and the Known
  headline counts up from the same baseline so the number and the map agree about what
  changed. Only tiles crossing a class boundary move. **The first version was wrong and
  a test caught it:** it animated `from { background-color: var(--was) }` on the
  transform-only-entrance reasoning, which does *not* transfer — here the colour **is**
  the data, so a stalled animation painted a 44% territory in the 23% band. It is now a
  transition: React writes the old colour, a timer writes the true one, and the
  animation only decides whether the change is gradual.
- **Two bugs found on the way.** `CountUp` had its own inline `toLocaleString('de-DE')`,
  so the Known headline still rendered "2.320" beside a `fmt()`-formatted "6,618" — the
  earlier P0 #4 fix missed it and it shipped. And classification ran on raw floats, so
  three territories all *displaying* 42% were split across two colours; it now
  classifies on the rounded percentage, so label and fill agree by construction.
- **Grammar credited for what a session taught (#7).** Two id namespaces that never met:
  `pointStats` counted only `gex:<level>:<point>:<exercise>` cards from Library drills,
  while the vocabulary→grammar loop grades the point's own `gram:<level>:<title>` card.
  The loop taught the concept and the Library denied it had happened — 0/40 started
  after forty days, on the app's most distinctive feature. `pointStats` now counts
  either; a concept met only in a session reads `· seen` rather than `—` or `0/7`
  (which would look like seven failures). Mastery stays a measure of the exercises:
  meeting is not drilling.
- **Touch targets, gated honestly (#4).** Sidebar rows, the primary *Start session* and
  the profile row get `.tap-44`; the mobile menu button goes 36→44 (pulled, so the
  header doesn't grow); the desktop collapse chevron keeps its 24px look and gains a
  44px hit area via `::before`. Gated on `any-pointer: coarse` — 44px is a *touch*
  guideline, and applying it to the desktop rail would add 10px to every row on a
  surface twelve personas already called too sparse. **Not verified that the query
  fires:** no browser viewport reports a coarse pointer, so this waits on real hardware
  alongside the "Tap the card" hint.
- **`corpus:fetch` takes one source** instead of all of them. And the dead GitHub Pages
  deploy — which always 404'd, because Pages was never switched on and production is
  Vercel — was replaced with `ci.yml` (typecheck, test, build).
- **One false positive retired (#6).** Every control on Profile *is* correctly labelled;
  the audit's check tested `aria-label || innerText || title`, and an `<input>` has no
  `innerText`, so a properly associated `<label for>` read as unnamed. Verified via
  `el.labels`. The third false positive from that audit.

### Shipped 2026-07-28 — the Atlas, the twelve personas, and the first P0s

- **The terminal retired for the Atlas.** Lexi looked like a market terminal for a year;
  it had never been *chosen* — it was the nearest available reference for "organise a
  vast information space well" from a precedent vocabulary of Salesforce dashboards and
  phone apps. Three traditions replace it, one per problem: **Aicher / HfG Ulm** for the
  system, **cartography** for the instrument, **the printed lexicon** for the desk.
  **Light is primary.** Rationale in [DESIGN.md §1](DESIGN.md).
- **The heatmap became a heat map.** It classified over a linear 0–100% ramp while real
  coverage spans ~26–45%, so ten genuinely different territories all rendered the same
  green. Five classes over the *observed* range (`makeHeatScale`), ink paired per class,
  and a legend stating the real domain.
- **PERSONAS.md** — 12 personas, 2 per CEFR level, desktop and mobile, the first round
  run against the *running app* rather than the code. Consolidates the two older persona
  docs. Produced the Fifty: 50 backlog items from a live DOM audit.
- **The P0s, and the rule that was wrong.** Route and desk entrances could strand a view
  at `opacity: 0` — DESIGN.md claimed no-fill-mode made an entrance safe, and it does
  not: **a stalled animation sits on its `from` frame**. All six entrances are now
  transform-only. The card swap was gated on `AnimatePresence` completing an exit
  (`review-structure.test.ts` now guards both). Plus `de-DE` separators in an English UI,
  and "Space to flip" shown on touch devices.
- **Every answer gets an acknowledgment (#2)**, and it says the interval the card just
  moved to rather than "well done" — the same machinery-not-magic trick as the
  grade-button previews, and the only form that survives being seen sixty times a
  session.

### Shipped 2026-07-27 — the repository tidy

- **The root is the project again.** `to_be_deleted_or_archived/` — 69 tracked
  files, 2.6 MB of superseded Orbita and Atlas application code plus a 1 MB
  replication dump — is gone. Three planning documents still referenced by open work
  moved to `docs/archive/`; git history holds the rest, which is what history is for.
  A folder named for an intention nobody acted on for months is not an archive.
- **`print-and-play/` moved to `docs/archive/print-and-play/`.** Lexi Duel was cut
  from the core loop; the PDFs and their generators are complete and worth keeping,
  but a cut side-product does not belong at the repository root.
- **BACKLOG split into BACKLOG + CHANGELOG.** The backlog had grown to 955 lines, of
  which 757 were shipped history — twenty lines of open work buried under everything
  that had already happened. `BACKLOG.md` is now open work only (197 lines);
  this file holds the history, newest first, with the reasoning intact, because the
  reasoning is what stops a decision being quietly undone. Sections were also
  re-sorted: they had drifted into three different orderings.
- **Authoring batches: audit trail kept, regenerable output dropped.** 60 empty
  batch files and the generated `inputs/` tree were removed and gitignored — both
  are one command away (`corpus:definitions --write`, `make-input.ts`). What stays
  is the 18 *authored* batches, which are the record of what changed in the corpus
  and why.
- **Docs brought level with the app.** The README still described a four-destination
  IA that became three, and claimed progress lived in `localStorage` when it moved
  to IndexedDB months ago. Added a repository-layout section and the corpus rule
  (never hand-edit `public/data/*.json`) to both the README and `CLAUDE.md`.

### Shipped 2026-07-27 — A2 definitions, and the queue drains

- **40 more authored definitions**, closing the A2 half of the German-definition
  migration. `die Haltestelle` — which had been sitting in the English field in
  German all along — now reads "The place where a bus or tram stops to let
  passengers on and off."
- Cards with no English definition: **368 → 286**. C1 and C2 are effectively
  finished at **0.2%** and **0.5%** flagged; A1 is at 15.6%, from 34% this morning.


### Shipped 2026-07-27 — a regression I caused, and the fourth copy of the rule

- **The migration moved eleven English annotations into the German field.**
  `der Kellner` → "female: die Kellnerin", `abfahren` → "separable: der Zug fährt
  … ab", `gehören` → "takes the dative: das gehört mir". Each quotes German, so the
  rule called it a German definition — but the German is the *illustration*, not
  the explanation, and those eleven cards were left with no definition at all.
  Found while reading the A2 queue rather than by any gate. `isGermanDefinition`
  now refuses a field that opens with an English annotation label, and the eleven
  are restored.
- **And the test was a fourth copy.** Pointing the validator at the shared rule
  left `grammar.test.ts` still carrying its own inline version, which disagreed
  within the hour and failed. It imports `isGermanDefinition` now. Four places had
  independently reimplemented "is this German": audit, migration, validator, test.


### Shipped 2026-07-27 — one rule for German-in-the-English-field, and the gate that uses it

- **Third copy, weakest copy.** Adding a validator gate for German definitions
  meant writing the test a third time (audit, migration, validator) — and the third
  one omitted `des` and `mit`, so regressing `der Apfel` back to German **sailed
  past a gate reporting PASS**. Exactly the failure the rule-length gate had that
  morning, and the same shape as the `ARCHAIC_SPELLING` drift before it. Three
  copies became one `isGermanDefinition` in `lib.ts`, used by `corpus:definitions`,
  `corpus:germandef` and `corpus:validate`.
- **The stronger rule found 36 more.** The migration had been *incomplete* because
  the rule was too weak — `die Haltestelle` → "Stelle, Ort, an dem Verkehrsmittel
  halten" was sitting in the English field the whole time. Migrated; the class is
  0 and the gate is now a hard **error**, verified by regressing a card and
  watching it fail.
- 336 cards now carry a German definition awaiting an English one, up from 300.


### Shipped 2026-07-27 — the definition classifier, corrected a fourth time

- **The measure was over-counting by 328, and the false positives were my own
  work.** The classifier flagged `kommen` → "To move towards the speaker, or to
  arrive somewhere." and `fünf` → "The number 5, one more than four." — definitions
  authored the same day *to fix its earlier findings*. Both split on commas into
  short segments, so the enumeration rule read them as translation lists. A
  definition written as a sentence (initial capital, terminal stop) is now exempt,
  because a scraped enumeration is never punctuated like prose. **1,871 → 1,543.**
- **A second A1 batch: 40 more of the most-seen words.** `der Bahnhof` went from
  "railway depot, railroad station, railway station, train station" to "The
  building and platforms where trains stop." One more sense bug caught in passing:
  `billig` was defined as "appropriate, meet, fair" — the archaic sense; the word
  now means cheap. A1 is down to **16% flagged** from 34% at the start of the day.


### Shipped 2026-07-27 — word families, derived rather than guessed (C1 #45)

- **`nehmen / annehmen / benehmen / unternehmen / entnehmen` is one system, told as
  fifteen unrelated cards.** At C1 the prefix *is* the lesson: the base carries the
  meaning and the prefix bends it. The reveal now shows the family.
- **Derived from the lexicon, and only for verbs.** The guard is the one the
  conjugation engine already uses: a prefix counts only if what remains is itself a
  verb the lexicon knows — which is why *antworten* is not *an* + *tworten*. That
  yields **146 families over 772 verb cards**, every base a real verb. Nouns and
  adjectives are excluded deliberately: *Nahme* and *angenehm* belong to the nehmen
  family too, but recovering them needs derivational morphology the app has no
  reliable model for, and a family that is 60% right teaches 40% wrong.
  *My first count said 219 — it double-counted lemmas the corpus carries at two
  levels. A family is a set of words, not of cards.*
- **Two implementation notes worth keeping.** The lookup is a prebuilt reverse
  index rather than a `useMemo` in the component: the memo version landed *after an
  early return*, which is the same rules-of-hooks violation fixed in `RulePanel`
  earlier the same day — the fix belonged in the library, not the view. And 10
  tests cover what the derivation must *refuse*, since a wrong family attaches the
  wrong story to a word and is worse than none.
- *Not visually confirmed:* the rendered `Family` line. Stepping a randomised
  session to a verb that has relatives cost more than the confirmation was worth;
  it reuses the `TermList` that renders `Syn`/`Opp` immediately above it.


### Shipped 2026-07-27 — #34 was already true, and is now pinned

- **Recognition and production were never one schedule.** The persona asked for
  them to be tracked apart; the app already did it, and more finely than asked —
  the flip card is keyed on the word id, and *every drill mode* gets its own
  `gym:<mode>:<wordId>` track, so conjugating a verb and rebuilding its sentence
  are separate schedules too. This was a property to verify, not a feature to
  build. Three tests pin it, because untested it is one refactor away from
  collapsing back into a single card — which would re-teach a word you can already
  recognise just because you fumbled producing it.


### Shipped 2026-07-27 — a German definition, for the readers who can use one (B2 #38)

- **367 German definitions were in the English field.** Real ones, from German
  Wiktionary — *der Apfel*: "rundliche Frucht des Apfelbaums mit Schale,
  Fruchtfleisch und Kerngehäuse". Exactly what a B2+ learner wants, and exactly
  what an A1 learner cannot read: **318 of the 367 sat at A1–B1**, on an app whose
  premise is an English base. The text was never the problem; the field was.
- **`defDe` is now its own field** (`corpus:germandef` migrates, never deletes),
  and the reveal shows it under **Auf Deutsch** — gated on the *learner's* placement
  level rather than the card's, because it is a fact about who is reading. That
  closes persona B2 #38, which asked for a German definition of a German word,
  using content the corpus already had and was showing to the wrong people.
- **The vacated cards became a visible queue, not a silence.** `corpus:definitions`
  now reports cards carrying no English definition (301, of which 300 have a German
  one waiting), so the migration shows up as work rather than disappearing from the
  numbers. **All 67 A1 cards were authored back the same day**, so the most-seen
  vocabulary never sat blank.
- **Two corpus bugs surfaced while reading them.** *die Geschwister* — siblings —
  was defined as "Gesamtheit der Schwestern", the sisters only. And *mir*, the
  dative of *ich*, carried the definition of **an oriental carpet**: a different
  word, wrongly attached. The first is corrected, the second removed, because a
  wrong definition is worse than none.
- *Verified:* the migration and the gate are pinned by tests (no German left in
  `def`, no card holding the same text twice, and the B2 threshold asserted at
  every level). *Not verified visually:* the `Auf Deutsch` block itself — the
  session queue is randomised and I could not deterministically surface one of the
  66 A1 cards that carry a `defDe` before the browser tooling became the expensive
  part. The block is six lines of JSX reusing `RevealBlock` exactly as the
  `Definition` block two lines above it does.


### Shipped 2026-07-27 — the definition audit, and the first batch (C1 #44)

- **`corpus:definitions` — a measure, because the old number was a guess.** My
  rough check said "~750 cards"; a real classifier says **2,234**, and splits them
  into kinds that need different fixes: **enumeration** (1,431 — "railway depot,
  railroad station, railway station, train station"), **bare** (415 — a single
  synonym standing in for a definition), **repeat** (138 — "to eat; to eat; to
  dine"), **german** (367 — a German definition on an English-facing card, which
  is a feature at C1 and a bug at A1), **echo** (0). C1/C2 are the *cleanest*
  levels (10–14%) because they were authored; A1–B2 run ~33%.
  The classifier took three calibration passes against real data, and each one
  removed false positives rather than finding more: `das Haus` → "A building
  **where** people live" was flagged until `where` joined the explanatory-word
  list; `sein` → "irregular copula: ich bin, du bist …" is a paradigm, not four
  ways of saying the word, so a colon now exempts a def the way a parenthetical
  already did; and an English definition that *quotes* German — "(Feminine die See
  means the sea.)" — was being called a German definition, so parentheticals are
  stripped before that test. That last one was flagging the exact disambiguation
  the audit exists to encourage.
- **First batch applied: 40 A1/A2 definitions**, the most-seen vocabulary in the
  corpus. `das Salz` went from "salt, table salt, sal; salt" to "Sodium chloride,
  used to season and preserve food." Two were outright **sense bugs**: `der See`
  (a lake) was defined as "sea, ocean" — that is *die* See — and now says so
  explicitly; `das Fleisch` (meat) is defined as "flesh". Applied through the
  expect-guarded path, 0 refused.
- **`fix-authored.ts` repairs definitions too**, with the same optimistic-concurrency
  guard and one added standard: a replacement that merely repeats the `en` gloss is
  refused, so a fix cannot reintroduce the defect it was written to remove.
- *Remaining:* 2,194 cards across 58 emitted batches in
  `scripts/authoring/batches/def/`. This is a content programme, not a task.


### Shipped 2026-07-27 — structured rules reach the surface built for reading them

- **Part E was only half-delivered, and the missing half was the important one.**
  `RuleCard` (the in-drill panel) rendered `sections`; the **Library syllabus** —
  the surface a learner opens to *read* a rule — had its own renderer that only
  knew `point.rule`. So every point carrying authored sections fell back to its
  paragraph exactly where the structure was meant to help. Two renderers, one of
  which had never heard of the feature. `RuleSectionBlock` is now exported from
  `RulePanel.tsx` and used by both; `rule` stays the fallback for genuine prose.
  Found by paying off a verification debt — I had shipped the C1/C2 sections
  having checked them structurally but never *looked* at them.
- **A phantom bug, recorded because the near-miss is the lesson.** While verifying,
  a light-theme contrast measurement on the Library point titles read **1.57**
  against a 4.5 floor, stable across re-measures, and I came close to filing it.
  It was an artifact of my own half-applied change: `PointRow` was throwing
  `ReferenceError: RuleSectionBlock is not defined` into the ErrorBoundary, and I
  was measuring the recovered tree. On a clean render the same element measures
  **15.68**. The console error was visible the whole time and I read the DOM before
  reading the log.


### Shipped 2026-07-27 — the advanced learners (personas B2 · C1 · C2)

Fifteen of the thirty B2/C1/C2 findings were already closed. This pass takes the
structural ones; what remains is listed under Next.

- **#36 — the Kasus drill taught the easy declension only.** German declines an
  adjective three ways depending on what precedes it, and the drill knew one: the
  weak table, which is nearly all `-en`. A learner could score well on it and still
  write *ein gute Mann*. Added **mixed** (after ein/kein/mein — where the article
  is ambiguous and the adjective carries the marking) and **strong** (no article at
  all). Strong is gated to a curated **mass-noun list**, because a bare countable
  singular is ungrammatical — *kaltes Wasser* is German, *alter Tisch* is not —
  the same over-exclusion `caseSafe` already prefers. The card now names which
  declension it is asking for, since "adjective ending" is three systems. 5 tests,
  including 200 rolls asserting a countable noun never declines strong and 450
  asserting the correct ending is always among the options.
- **#31 · #43 · #41 — the syllabus stopped above B2.** 12 C1 points and 8 C2, and
  the two the advanced personas named were one-line titles: *Verben mit
  Präpositionen* had 6 exercises for a system with hundreds of members, and
  *Funktionsverbgefüge* was "a title" where what C1 needs is **which noun takes
  which light verb**. Both are now **upgraded in place**, not duplicated —
  `grammar-supplement.ts` gained an `upgrade` mode, because authoring a second
  point beside a thin one is worse than the thin point: the learner meets the same
  system twice under two names. Keeping the title keeps the `gram:` card id and any
  FSRS progress riding on it. *Verben mit Präpositionen* 169 → 347 chars + 5
  exercises; *Funktionsverbgefüge* 168 → 401 + 6; *Nominalstil* 140 → 390 + 5.
- **#53 — a correction can now travel without the learner's history.** Flags rode
  the full backup, which closes the loop for a solo maintainer and not for a class:
  reporting one bad card meant handing your teacher your entire progress log.
  Profile → **Save the report** writes a flags-only file (`{app:'lexi-flags'}`) and
  `corpus:flags` reads both shapes. Verified end to end — a report file resolves
  through the maintainer script against live corpus data.
- **#32 · #47 — three new C2 points.** *Stilebenen* (register: erwerben · kaufen ·
  sich zulegen — the remaining vocabulary problem at C2 is not meaning but height,
  and a mismatch is the clearest non-native marker); *Idiomatik: wörtlich vs.
  übertragen* (the literal reading beside what it means, and that the phrase is
  frozen word for word); *Passiversatzformen* (`sein + zu`, `sich lassen`, `-bar` —
  formal German's three ways to avoid a modal passive). C2 8 → 11 points.
  Grammar bank **131 points · 805 exercises**; every new rule ships with authored
  `sections`, so the E4 gate passes by construction rather than by retro-fit.


### Shipped 2026-07-27 — the corpus is clean, and the gates that keep it clean

- **Every example-defect class is at zero.** The last two batches of the Part D
  cleanup: **52 over-long rows** (the corpus's longest example was a **795-char
  Luther passage on `die Frau`**, a first-hundred word) and 2 elided passages.
  10 were deleted where the card still kept two clean examples; **42 got an
  authored replacement**, because deleting them would have pushed the card back
  under the two-example standard. Applied through the expect-guarded
  `fix-authored.ts` — **0 refused**, so every row replaced was the row the batch
  was authored against. Longest example in the corpus is now **160 chars**.
  `newline · cruft · missing-en · too-long · archaic · elided` all read 0.
- **E4 — the rule-length gate** (completes Part E). The 20 rules over 280 chars
  all have authored `sections`; nothing stopped the next batch regressing to the
  547-character paragraph this started as. `corpus:validate` now fails on a rule
  over 280 chars without sections. *Written twice:* the first version wrapped the
  grammar load in a `try/catch`, which swallowed a missing import and reported
  **PASS while checking nothing**. Caught by deliberately stripping `sections`
  from a real point to watch the gate fire — it didn't. A check that cannot fail
  is worse than no check, because it is trusted; the catch is gone.
- **One rule for pre-1996 orthography, not two.** `validate.ts` and
  `corpus:examples` each carried their own copy and they had drifted: validate's
  had no trailing word boundary, so `thun` matched inside **Thunfisch** and
  reported tuna as 19th-century German. Now `ARCHAIC_SPELLING` in
  `scripts/corpus/lib.ts`, imported by both. Fixing the boundary then broke
  `häßliches` — a stem plus an inflectional ending is the same word, a compound is
  not — so the rule allows an optional ending in front of the boundary. Three
  tests pin both sides, including the ß the reform *kept* (`Fuß`, `groß`, `weiß`).


### Shipped 2026-07-27 — the persona leftovers and the last capitalisations

- **Capitalised function words — ruled, not inferred** (closes the casefix
  residue). The 64 cards `casefix` deliberately would not touch are now decided
  one at a time in [`scripts/corpus/case-rulings.tsv`](../scripts/corpus/case-rulings.tsv),
  each with its reason, applied by `corpus:casefix`. What the ruling found:
  **12 were not capitalisation bugs at all** but ordinary nouns whose `pos`,
  article and gender were missing (*Abenteuer*, *Floh*, *Moor*) — the capital was
  right and the card was simply incomplete, so they gained `der/die/das` and a
  plural; **13 more duplicated an article-carrying card** already in the corpus
  (*Epoche*, *Kindheit*, *Kontakt*) and were dropped; the pronouns, particles and
  prepositions were lowercased. **One is capitalised on purpose** — *Verzeihung!*
  is the noun used as an exclamation — and `corpus:validate` now reads the rulings
  so a `keep` stops warning. A warning nobody can ever clear is one everybody
  learns to scroll past. Corpus **7,402 → 7,386**; 0 capitalisation flags left.
- **The id map is cumulative.** `casefix` regenerated `idmap.ts` from scratch,
  which would have silently stripped the previous pass's 96 migrations the moment
  it ran again — the exact failure the map exists to prevent. It now carries
  earlier entries forward and re-points any that this pass moved again, so one hop
  is always enough at runtime, and throws if any entry would dangle. 159 entries.
- **F4 — the HD voice is offered where it's wanted.** It lived behind a Settings
  toggle, so the learners most in need of it were the least likely to find it: you
  go to Settings to change something you already know exists. `speak()` now reports
  when it fell back to the built-in voice, and the session offers the neural voice
  at that tap — once ever, whichever way it's answered. The download-and-prove-it
  flow moved to a shared `useHdVoice` hook so Settings and the offer can't drift.
- **The flagged-cards list** (friend-readiness leftover). Flagging shipped as a
  one-tap action and the flags then went nowhere the learner could see, which makes
  the gesture feel like shouting into a drawer. Profile now lists them, with
  unflagging, and says plainly that they travel in the backup file rather than over
  a network — there is no server to receive them, and implying otherwise is a lie
  the learner discovers by waiting.
- **S3 — the backup nudge.** Export was always passive. Today now asks once, after
  **7 distinct visit days and 100 known words** — late on purpose: asking on day one
  is asking someone to insure something they don't own yet. Taking a backup or
  dismissing both end it.
- **Typo tolerance, measured first — and the measurement changed the design.** The
  backlog said "edit-distance-1 on typed answers (measure over-forgiveness first)".
  Measured: **25% of typed targets have another real German word one edit away**,
  concentrated in exactly the beginner vocabulary being drilled — *Mutter/Butter*,
  *Haus/Hals*, *Brot/Boot*, *Uhr/Ohr*, *Zeit/weit*, *Kind/Kino*. The naive rule
  would accept *Butter* for *Mutter*: not kindness, but teaching the wrong word and
  calling it right. Shipped **guarded** instead — one edit *and* what was typed is
  not itself a word the app knows, so a real word stays a real (wrong) answer while
  "muter" reads as the slip it is. Graded as a near-miss that **names** it ("Right —
  just a typo"), separately from the umlaut fold, because an error forgiven silently
  is how it sets. 5 tests, mostly of what it must refuse.


### Shipped 2026-07-26 — the example pass

- **C1/C2 example + synonym pass** (was Next). Authored a second usage example for
  all **680** cards that shipped with one (C1 466 · C2 214) plus **426** synonym
  sets where they genuinely exist — never forced, since a loose pair mistaught in a
  learning tool is worse than a blank. **Every card at every level now carries ≥2
  examples** (mean 2.70 A1 → 2.00 C2). Fill-only application, verified: 0 existing
  examples overwritten, 0 ids changed, 0 other fields touched.
  Two maintainer helpers close the loop the authoring pipeline was missing:
  `authoring:input` (`make-input.ts` — selects the cards missing a field and
  splits them into reviewable batches) and a `.tsv` patch format in
  `apply-authored.ts` (`term ⇥ de ⇥ en ⇥ syn|syn`), which reads better in review
  than nested JSON. Batches kept as `scripts/authoring/batches/c{1,2}-ex-*.tsv`.
- **`corpus:examples`** (the *Example coverage backfill* item, closed from both
  ends). Two branches wrote this script independently and the merge kept the
  better one: the **quality** audit from the app-improvements branch (defect
  classes measured against the app's own sanitizer, `--write` emitting
  expect-guarded fix batches) now also carries the **coverage** report. Coverage is
  at zero under-two on every level; quality is down to 52 too-long and 2 elided.
  `corpus:validate` **fails** at zero examples and **warns** under two, so the
  standard can't quietly slip again. *Not built:* the build-time source merging
  that item also proposed (Tatoeba cap raise → Wiktextract usage examples →
  conjugation-derived sentences); it aimed at the same outcome, which authoring
  reached directly. Reach for it only if a future batch is too large to author.
- **Capitalisation defect: found on one branch, fixed on the other.** A legacy
  import batch had entered **91 adjectives/verbs/adverbs with capitalised
  headwords** ("Rot", "Wütend", "Packen") under its own sector names ("Colors" vs
  "Colours") — and **62 of them duplicated a correct lowercase card**, so the
  learner was shown *Rot* and *rot* as two cards to schedule separately. German
  writes these lowercase and the card face is where the spelling is read, so this
  taught the error. The reading index surfaced it (it resolved "Haben Sie …?" to
  `voc:A2:Haben` and offered it as a new word) and the app-improvements branch
  **flagged rather than deleted** it, correctly: "removing a card changes its FSRS
  id … that is a migration and a decision for the maintainer". This branch built
  that migration, so `corpus:casefix` could finish the job — delete the
  duplicates, lowercase the 29 unique ones, and keep the **earlier** CEFR claim
  where a pair disagreed (5 cards, e.g. *nah* back to A1). Corpus **7,464 →
  7,402**; sector counts rebuilt in place; `corpus:validate` **PASS** (was 1 hard
  error). Multi-word headwords are exempt — "Rad fahren" opens with a noun.
  Validate's severity now splits on whether the fix is mechanical: adj/verb/adverb
  is a hard **error** (casefix clears it), while pronouns/particles/determiners
  stay **warnings**, and the 64 of those were then ruled on by hand — see the
  2026-07-27 entry below.
- **Card ids survive corpus corrections.** Renaming or merging a card id used to
  reset that card's FSRS schedule to *new*, silently. `casefix` emits
  `src/data/idmap.ts`; `hydrate()` folds stored schedules onto the new ids (the
  more-practised one wins where both exist). 3 tests, including guards that no
  mapped id is still in the corpus and no target is dangling.


### Shipped 2026-07-26 — the lead example (post-merge)

- **No card leads with a scrape.** The flip face shows `ex[0]`, so the *first*
  example **is** the card — a question the quality audit doesn't ask, because a
  perfectly valid row can still be the wrong one to open with. 76 cards led with a
  fragment ("einen Antrag stellen"), a quoted passage, or a news paragraph.
  **45 needed no authoring at all**: a clean sibling was already on the card, so
  `corpus:frontfix` promotes it (preferring one at or below the card's level) and
  the scraped row simply stops being first. The remaining 23 got an authored lead,
  *prepended* rather than substituted — the scraped row is poor as a face but is
  still German the card can carry, and removing it would push the card back under
  the two-example standard. Now 0 across the corpus, pinned by a test.
  *The rule took two corrections to get right*, both caught before writing: an
  opening quote mark is **not** a defect — „Kohle“ ist Umgangssprache für Geld. is
  the *best* example that card could have, and a naive rule would have demoted it
  on exactly the words that need it. What reads as a scrape is a row that **is** a
  quotation, so the test is where the quote *closes*, not that it opens.
  `leadProblems` lives in `scripts/corpus/lib.ts` so the audit and the fixer can
  never disagree about what counts.


### Shipped 2026-07-26 — the persona pass (merged from `lexi-app-improvements`)

Sixteen commits working the A1/A2/B1 persona findings. None of it was recorded
here at the time; written up on merge.

- **Lesen — input, not only retrieval.** The app was entirely retrieval; nothing
  ever handed the learner a sentence to simply *read*. No new content: the corpus
  already ships 16,201 examples and `statusOf` knows which words have been met —
  what was missing was the join. Targets **i+1** deliberately (every word familiar
  but one: zero is a victory lap, four is a word list in disguise). Needs the
  opposite lookup from the rest of the app, so it builds a surface index from
  forms derivable with certainty — headwords, stored plurals, full verb paradigms;
  adjective declension deliberately absent, since a guessed form would attach the
  wrong card. 14,592 forms, 17 ms to build.
- **Teach the concept the first time it is tested, not the fifth.** Lexi tested
  and never taught: a beginner could be asked `der Vater → die ___` before
  anything said what a plural is. The teaching text was always in `grammar.json`
  behind a link nobody taps — because a learner who doesn't know the word has no
  reason to think it will help. Now the first time a drill mode appears for
  someone who has never *graded* one, the rule opens itself and the card says
  plainly that this one doesn't count. One introduction per mode per session.
- **Production drills completed.** Separable verbs (224 verbs — the system English
  has no equivalent of, drilling the part that confuses: the prefix *moves*) and
  reflexives (92 verbs — drilling omission, since English has no pronoun there to
  leave out). The corpus-wide test found a real engine bug: `regularPartizip`
  returned the *root's* participle for `-ieren` verbs and dropped the separable
  prefix, so *ausprobieren* yielded "probiert" — wrong German the conjugation
  drill had been teaching. It only surfaced when the test ran over every eligible
  verb in the shipped corpus, not the hand-picked ones.
- **Diktat — the first writing anywhere in Lexi.** Hear a sentence, type it: the
  form of written production whose target is known to the character, so it can be
  graded honestly. 6,748 sentences qualify, gated on what someone can spell from
  hearing once. Umlaut-tolerant like every typed answer.
- **Exam conditions (B1).** Lexi can't author a Goethe or telc paper, and inventing
  one would be worse than none — but it *can* remove the scaffolding, which is what
  an exam actually takes away: no hint ladder, no rule a tap away, no "why?" after
  a miss. Scored against the 60% both boards use, quoted as theirs. Not offered in
  week one or under 40 known words; a sitting is not resumable.
- **Session resume, properly.** Same-day resume was recorded as "emergent" — true
  of the cards, false of the session: the builder makes five randomised decisions,
  so a rebuild is a *different* queue. The queue is now stored and rehydrated
  (identities only, Words looked up again, refused across scopes/days or when any
  word no longer resolves).
- **Honesty fixes.** Interval previews state the precision they have ("~3 weeks"
  after one review, exact once the card has earned it) rather than claiming false
  precision; CEFR descriptors replace a coverage number as the answer to "am I B1
  yet", with a test pinning the copy so it never drifts into claiming competence
  from a word count; Settings admits the HD voice needs the network.
- **Per-learner control.** Three paces (gentle/steady/intense) over the daily caps,
  which were good defaults and also a ceiling; a weekly tense focus weighted 0.6 —
  a lean, not a filter, or the tenses you weren't thinking about quietly rot; the
  person index draws from the three singular persons until a card is consolidated,
  so it stops opening with "ihr werdet müssen".
- **The learner's own material.** Paste a class list (matched through the reader's
  surface index, unmatched words *named* rather than quietly dropped); export a
  word list as TSV for the tools Lexi is not; class packs — export a deck, import
  it elsewhere, carrying whole cards rather than ids, no progress, every field
  validated at the boundary because it is untrusted input from someone else's
  device.
- **Week one is quiet.** The guided chain used to end by dropping the learner onto
  eight sections that mean nothing without history. For the first week (by distinct
  visits, not streak) Today shows the session and their own list, nothing else.
- **False friends** (35 entries naming the trap on the reveal, with the German for
  the word they had in mind — a warning without a replacement leaves a hole);
  **gender ink everywhere** via one `GenderTerm` (the article always spelled out,
  so nothing rides on hue alone); **grammar terms glossed** in plain English for the
  sixteen a beginner meets cold; **near-miss grading names the substitution**
  ("oe → ö"), because an error forgiven silently is how it becomes permanent;
  **blind spots by word** rather than only by system ("verb conjugation 15×" is
  true and unactionable; the fix is to drill *nehmen*); **card sources** — the
  609 KB `provenance.json` that had shipped since the pipeline was built and the
  app had never loaded, now lazily fetched behind a disclosure, honest that it
  covers only 1,986 of 7,402 cards.
- **Example-quality audit + runtime guard.** `voc:A1:täglich` shipped with German
  and English spliced by a newline. `src/lib/examples.ts` sanitises at load (the
  net), `corpus:examples` measures the classes that actually exist against that
  same sanitizer (so the two can't drift), and `fix-authored.ts` applies
  expect-guarded repair batches. 31 corrupt rows repaired, 45 translations and 78
  replacements authored.


### Shipped 2026-07-25 / 26 — the design + IA pass

- **Typeface, surface hierarchy, working phone layout.** IBM Plex Mono + Fraunces
  self-hosted (the terminal identity only existed on macOS; Fraunces was fetched
  every load and never painted). Extracted `Button/Card/Chip/IconButton/Kicker`
  over ~41 retyped class strings. Fixed four real bugs: every view root overflowed
  a phone viewport (`mx-auto` on a flex item sizes to max-content), the word map
  drew 30 nodes on one ring, deck coverage bars had an invisible track, the
  maskable icon had no safe zone. Added hash routing (the Android back gesture
  used to close the installed PWA) and closed the a11y gaps — pinch-zoom,
  `lang="de"`, a real dialog drawer with focus trap and `inert`, a focusable flip
  card, 44pt targets, labels, skip link, `jsx-a11y` to hold the line.
- **Paper card tried and reverted** — see Parked decisions; the card is now
  distinguished by *material* inside one palette, and the rule it produced
  (*a nested scope may change ground and ink, never the brand hue*) is in
  [DESIGN.md](DESIGN.md). Light gained the three-step elevation ramp dark already
  had, reserving pure white for the study surface.
- **Two rooms, three destinations.** The session is its own room (early return in
  `App.tsx`, no sidebar/ticker/bottom bar) — one aesthetic cannot serve both
  scanning a heatmap and studying a single word. Nine surfaces collapse to
  **Today · Progress · Library**; Explore's hand-rolled `useState` back-stack
  became real routing, so a filtered deck list is linkable. Added ratcheted
  sector completion — the app finally contains something you can finish.
- **Provenance on every session item.** `SessionItem` carries a *required*
  discriminated `reason`, enforced at all seven construction sites: nothing
  enters a session without declaring why. Rendered as "because you just learned
  *obwohl*" / "you've missed Kasus 4× this month", with the line that names a
  weakness doubling as the way into the rule. Silence stays the answer for fresh
  cards and on-time reviews.


### Shipped 2026-07-18

- **DaF A2 batch** (Next-10 #10 / Now #1, same pass). Read the 10 A2 scans
  (L9–L18, IMG_4808–4826), extracted 1,281 lemmas (904 already covered), curated
  the 376 uncovered into the reference TSVs, built **179 more cards** (A1 8 ·
  A2 109 · B1 59 · B2 3) via the same reference-gated pipeline. Corpus now
  **7,123 words / 7,224 cards** (A2 1,587 → 1,771); validate PASS, 65/65,
  coverage 80.2% → 80.7%. Review artefact preserved as
  `data/out/new-cards-a2-batch.json`. *Still open:* L19–L30 (B1 scans), ~197 A2
  book lemmas below the frequency scan or example-less (30 skipped no-example —
  the examples-backfill item would recover them), C1/C2 register.
- **DaF A1 batch — first cut of the content depth arc** (Next-10 #10 / Now #1).
  Read the 8 A1 Lektionswortschatz scans (L1–L8, IMG_4792–4806), extracted 961
  lemmas, filtered against the live corpus (771 already covered) and curated the
  190 uncovered ones into `cefr-reference.tsv` (levels: book placement,
  honesty-bumped where DaF runs ahead of CEFR) + `sector-reference.tsv` (nouns
  mapped to existing sectors; verbs/adj fall to POS defaults). Standard
  `corpus:build` (reference-gated, scanN 250k) then authored **93 new cards**
  (A1 16 · A2 53 · B1 21 · B2 3) from Wiktextract/Tatoeba facts — zero
  hand-edited JSON, all with gender + ≥1 translated example. Corpus 6,851 →
  6,944 words; validate PASS; 65/65 tests; count strings bumped (README,
  `data/index.ts`). New maintainer helpers `scripts/corpus/daf-filter.ts`
  (lemma-list → covered/TODO split) and `daf-build.ts` (build against
  pre-filtered raw sources) for the coming A2/B1 passes. *Not done:* L9–L18 (A2)
  + L19–L30 (B1) scans; ~87 book lemmas below the frequency scan or without
  kaikki entries (incl. Familienname, Fahrkartenautomat — need the
  examples-backfill or LLM route); hand-authored C1/C2 register.
- **The vocabulary→grammar loop** (P0, user-approved direction). Vocabulary is
  the trigger, grammar the remediation. Two new edges in `session.ts`:
  `linkedGrammar()` — learning a function word pulls its grammar point into the
  session (learn *obwohl* → the Konzessivsätze exercise lands a few items later;
  12-entry `WORD_POINT` map, deliberately ignores the CEFR filter since the word
  in your queue licenses its structure) — and `remedyGrammar()` — ≥3 misses in a
  drill mode within 30 days pulls in the point that teaches the underlying system
  (gender misses → *Artikel & Genus*), candidates ordered easiest-first per
  Processability. Both capped (2 linked / 1 remedy per session), both self-limiting
  (once the point is reviewed, FSRS schedules it out). 4 new tests incl. a guard
  that every mapped `gram:` id exists in the shipped `vocab.json`. **Found gap:**
  no plural-formation grammar point exists — `MODE_REMEDY.plural` is empty (see
  grammar pass, Now #2).
- **Skip is now a signal** (from the archived COHESION-PLAN's "zu steil"). Skipping
  a drill or grammar exercise logs the mode's miss tag — you couldn't attempt it,
  which is blind-spot information — so skips feed weak-mode ranking and
  remediation. FSRS untouched (a skip is never a lapse); plain word-flip skips log
  nothing. `views/Review.tsx`.
- **Archive triage.** `to_be_deleted_or_archived/reference/` (DaF scans, karteto +
  design screenshots, study-method pages, ~260 MB) rescued to top-level
  `reference/` and gitignored — it's the source material for the A1/A2 corpus
  rebalance (Now #1). Orbita briefs + COHESION-PLAN moved to `docs/archive/`.
  Vitest now excludes `to_be_deleted_or_archived/**` (the parked atlas-app carried
  stale test files). Added `@types/node` (dev) for the map-validation test.
  What's left in the folder is deletable at will.
- **Sentence builder + transformation — the production drills** (was Next #1).
  The app was almost entirely recognition; these are the output half (Swain:
  production is where grammar restructures). Two new word-drill modes, built by
  *reusing* the authored-exercise widgets (`OrderItem`/`TypeItem` exported from
  `GrammarDrill.tsx` and fed fabricated exercise objects — zero new widget code):
  **order** rebuilds the card's own example sentence from tap-tiles (4–10 tokens,
  terminal punctuation stripped; real sentences carry real V2/verb-final order),
  and **transform** types a Präsens form into Präteritum / Perfekt / Futur I /
  Konjunktiv II (accepts the answer with or without any pronoun variant;
  umlaut-tolerant via the existing `norm`). Grounded gate: `canTransform`
  excludes separable and reflexive verbs, whose bare finite form would render a
  wrong sentence fragment. Wired through `eligibleModes`/`MODE_TAG`, so mixed
  sessions, blind spots, skips, and remediation picked them up for free —
  `MODE_REMEDY` now maps order-misses → *Wortstellung & Fragen* → *TeKaMoLo &
  Satzklammer* and transform-misses → the tense points. Fundamentals shows six
  drill tiles. 4 new tests (tokenization, transform gating, accept variants,
  eligibility); suite 52/52, build clean.
- **Near-miss grading + progressive hints** (was Next). Typed answers that match
  only through the umlaut/ß fold ("schoen" for *schön*) now read **"Right — just
  the spelling: …"** instead of a bare Correct; and `TypeItem` grew a
  three-step hint ladder (shape → first letter → first half) — a graceful path
  between blind guess and giving up. Hints never change the grade. Applies to
  every typed exercise incl. the new transform drill. `views/GrammarDrill.tsx`.
- **Pluralbildung grammar point** (was Next; found by the remediation loop).
  Authored A1 point *Pluralbildung (die Nomen im Plural)* — the five patterns
  (-e/-(e)n/-er/-s/no ending, umlaut, article always *die*) with 7 exercises —
  via `corpus:grammar --write`; `corpus:validate` PASS. `MODE_REMEDY.plural` now
  points at it, so plural misses no longer dead-end. Grammar: **101 cards, 99
  exercise points, 571 exercises**; count strings bumped (README 6,952 cards /
  A1 919, Fundamentals landing, `lib/grammar.ts`, `data/index.ts`). ⚠️ *Content
  pass rule: German + answer indices human-spot-checked in review — see the
  commit for the 7 exercises.*
- **Kasus drill — declined articles + adjective endings** (user-requested). New
  word-drill mode `case`: unambiguous case-forcing frames (für/ohne/gegen/durch →
  Akkusativ, mit/von/bei → Dativ, wegen/trotz/während → Genitiv, "Hier ist" →
  Nominativ), two flavors — pick the declined article ("mit ___ Tisch" → dem) or
  the weak adjective ending ("mit dem ___ Tisch (alt)" → alten; the weak table
  after definite articles is fully deterministic). Grounded by construction:
  genitive only for feminines (masc/neut nouns inflect +-(e)s), n-Deklination
  masculines excluded wholesale (`caseSafe`, over-exclusion is the safe
  direction). Wired through `eligibleModes`; `MODE_REMEDY.case` → Akkusativ →
  Dativ-Präpositionen → Adjektivdeklination (schwach) → Genitiv. Seven drill
  tiles now. 4 new tests (gate + pinned-rnd generator checks); 57/57.
- **UX path analysis + three fixes** (user-requested "final pass"). New
  `docs/UX-PATHS.md` (retired 2026-08-13; its table is preserved in this file's
  2026-08-13 entry): happy / sad / frustrated walkthroughs traced
  against the code, findings tables, priorities. Fixed in the pass: **F1** —
  Review's global Space handler made spaces untypeable in typed exercises
  (`habe gemacht`); key handling now ignores inputs. **S1** — Today's "All clear"
  dead end got an "Open decks" button (new `onDecks` prop). **H1** — stale "444
  exercises" → 571. Remaining findings graduated to Now/Next above.
- **Next-10 items 7 + 8** (closes the list — only the perpetual #10 content arc
  remains). (7) **Type scales with the reader**: codemod converted all 228
  hard-coded `text-[Npx]` classes to rem across 24 files, so the ramp keys off
  the root; `-apple-system-body` on `<html>` adopts iOS Dynamic Type (family
  re-asserted on body); Settings gained a **Text size** control
  (Compact/Standard/Large/Larger — Standard defers to the OS, an explicit
  choice overrides via `applyTextScale`, applied pre-paint, rides the backup).
  Plus one-time **coach marks** on the first session (tap to flip · swipe or
  buttons · skip is free). (8) **The feel layer**: opt-in sound (WebAudio blips,
  no assets — soft tick on correct, two-note chime at session end; Settings
  toggle, off by default); recap tiles now **count up** from zero (CountUp grew
  a `from` prop; honors reduced motion); **"Comeback of the day"** on the recap
  (a word missed ≥2 times before, graded right today); and the **F3 circuit
  breaker** — after 4 straight misses, one gentle banner ("Rough patch — that's
  the system finding your edge") offering *Stop here* at a natural break or
  *Keep going*, shown once per session. 65/65, build clean.
- **Next-10 items 5 + 6.** (5) **Share card**: `lib/sharecard.ts` renders a
  1200×630 PNG on canvas — the learner's market laid out by the tested
  `squarify`, tiles' cyan alpha tracking each territory's Known %, headline
  Known number, level, streak, wordmark; `navigator.share` (files) on mobile,
  PNG download elsewhere. Offered as a quiet "Share your progress" link on the
  session recap — the pride moment. (6) **Stats**: new sidebar destination with
  four SVG panels — reviews/day and recall (new per-day review log
  `lexi.reviewlog.v1`, bumped in `review()`, capped 60 days, rides the backup),
  the 7-day **due forecast** (`dueForecast`, overdue folds into today), and the
  **Known growth** curve (snapshots + live today). Empty panels say "starts
  counting from today" instead of pretending history exists. 2 new tests; 65/65.
- **Next-10 items 4 + 9.** (4) **The goal line**: `goal()`/`setGoal()` (level +
  date, `lexi.goal.v1`, rides the backup) with an editor card in Profile; daily
  snapshots now also record the **Known total**, and `goalProgress()` projects
  from the oldest ≤14-day snapshot ("B1 by 4. Okt — 61% known · at your pace:
  ~87% by then", green target icon when ≥90%; honest about negative pace; shows
  "pace appears after a day or two" until history exists). One-line render on
  Today above the session card. (9) **`corpus:flags`**: maintainer script
  ingesting backup files (`settings['lexi.flags.v1']`), deduping across
  learners, and printing each flagged card against its live corpus data
  (gender/plural/IPA/example) plus a not-in-corpus list — closes the loop
  flag-a-card opened; smoke-tested against a real backup fixture. 63/63.
- **Next-10 items 1–3** (from SIMULATED-SESSIONS-2). (1) **Interval previews** on
  the flip grade buttons ("Got it · 3 days") via the existing-but-unwired
  `previewInterval` (its sub-hour bucket fixed: "8 min", not "<1 min") — the
  scheduler is now machinery, not magic. (2) **Quick 5**: a second, quiet button
  on the session card serving the first five of today's queue — the session that
  fits a commute. *Finding:* same-day **resume is emergent** — grades persist at
  grade time and both due and fresh cards leave their pools once graded, so
  reopening Today's session naturally rebuilds the remainder; only cosmetic
  position is lost. UX-PATHS F5 downgraded accordingly. (3) **Comeback mode**:
  `longestStreak()` + `lastGapDays()`; after a ≥7-day gap with a ≥7-day record,
  Today greets "Willkommen zurück — N days away, nothing lost. Your best streak
  (M days) still stands"; plus a **backlog burn-down bar** ("190 of 312 backlog
  cleared", peak ratchets via `noteBacklog`, resets at zero). 4 new tests; 62/62.
- **Friend-readiness pass** (sharing analysis + simulated sessions). (1) **Storage
  durability:** `navigator.storage.persist()` at boot + an **install nudge** on
  Today (iOS Add-to-Home-Screen instructions / Chromium install prompt, backup
  escape hatch, dismissible) — Safari's 7-day ITP eviction of IndexedDB was
  silent total data loss for a casual friend. (2) **Flag-a-card:** one-tap flag in
  the session chrome (`lexi.flags.v1`, deduped, capped, rides the backup export) —
  the error-report loop a solo-maintained corpus needs. (3) **Simulated user
  sessions** (`SIMULATED-SESSION.md`, since folded into [PERSONAS.md](PERSONAS.md) —
  stand-in until a
  real friend is picked) drove five fixes: zero-seed placement copy ("Starting
  fresh at A1" instead of "Seeded 0 words"), **"Still learning / Got it"** labels
  on first-sight cards (new cards can't be "known"), ✓/✗ icons on all MC
  right/wrong states (colour never carries alone), bare-noun dative article items
  restricted to *mit* (von/bei contract in natural German), and *während* dropped
  from genitive frames (temporal nouns only — "während der Lampe" was nonsense).
  59/59 tests.
- **Due-cap shipped (UX-PATHS F2, was P0).** `buildBriefing` now serves the
  oldest-first `DAILY_DUE_CAP` (60) due reviews and reports the full backlog as
  `dueTotal`; Today frames it honestly when they differ ("312 reviews waiting in
  total — today serves the oldest 60. The rest keep."). FSRS tolerates the delay
  by design. New fake-timer test (70 overdue → 60 served / 70 reported); 58/58.


### Shipped 2026-07-12

- **High-frequency function words → exercises, not flashcards.** The coverage gap's
  top "missing" lemmas are dominated by function words that make poor translation
  cards (a bare "nur = only" teaches nothing about placement/nuance). Added **5
  curated grammar points / 25 exercises** via `grammar-supplement.ts` — Gradpartikeln
  (sehr/ganz/ziemlich/gar), Fokuspartikeln (nur/auch/sogar/selbst), Konjunktionen
  (sondern vs. aber, sowie), Textadverbien (bereits/nun/zunächst/schließlich),
  Modalpartikeln II (eigentlich/eben/halt/wohl). Chosen to *complement* not duplicate
  the existing connector/correlative points; pronouns, entities and filler
  interjections excluded. Grammar cards 84 → 89; `corpus:validate` green.
- **Fixed a broken C2 exercise.** The `Modalpartikeln` "error" drill had an
  out-of-range answer index (8 for an 8-token sentence), so it could never be graded
  correct; repointed to `sofort` (7), matching its own explanation. A schema sweep
  over all 509 exercises now passes clean.
- **Corrected stale headline counts.** The lexicon grew but three surfaces still
  read the old numbers. Root `README.md`: **5,213 → 6,468 cards** (real per-level
  A1 916 · A2 1,564 · B1 2,411 · B2 872 · C1 483 · C2 222) and **76 → 89 grammar
  points**. Also fixed the user-visible **Fundamentals landing** and the
  `lib/grammar.ts` header (`74 points · 444 exercises` → **87 · 509**) and the
  `data/index.ts` count comment. Note: "89 grammar points" counts `vocab.json`
  grammar *cards*; "87 points" counts `grammar.json` *exercise* points — two cards
  (`Der Verbstamm`, `Hilfsverben & Partizip II ohne ge-`) are flip-only with no
  exercise, hence the gap. Both numbers are correct for their meaning.
- **Onboarding interest selection (P1).** New guided step after placement: pick
  from the **16 fine corpus topics** (chips w/ live counts); `weakestSectors()`
  now floats sectors in chosen groups to the front of the daily fresh-vocabulary
  pick (stable sort → coverage order preserved within each band; no-op when none
  chosen, so the queue never starves). Persisted at `lexi.interests.v1` (added to
  backup keys) and **editable in Profile**. Fine group preserved pre-coarsening as
  `SECTOR_FINEGROUP` in `data/index.ts`. New `views/Interests.tsx` +
  `components/TopicPicker.tsx`; wired into `App.tsx` (`hero → placement → topics →
  first session → recap`). One new store/session test (38/38 green).


### Shipped 2026-07-11

- **Blind Spots expands in place** (P0). The Today "Blind spots" row is an inline
  accordion mirroring Grammar Fundamentals — ranked misses + one-tap drilling — no
  page jump. `components/BlindSpotList.tsx`; removed the `blindspots` route/view.
- **Blind Spots feed the session** (P1). `session.ts` weaves ≤4 drills in the Gym
  modes you miss most into every session; Today previews the count.
- **Weakest-sectors vs blind-spots split** (P1). Documented in `store.ts`:
  weakest-sectors picks fresh *vocabulary*; blind spots pick which *drills* ride along.
- **Desired-retention control** (P1). Settings → *Review intensity* (85 / 90 / 95%),
  applied to the FSRS engine.
- **Durable storage + backup** (P1). Progress (cards / misses / visits) moved to
  **IndexedDB** (`lib/idb.ts`) with localStorage migration + fallback; **Export /
  Import backup** in Settings. `main.tsx` awaits `hydrate()` before first paint.
- **Mobile drill-down treemap.** `Markt` is now a 2-level treemap: groups → tap →
  that group's sectors, with in-place back, the **%** as the primary glyph, and a
  **Markt / Liste** toggle for a plain ranked list on small screens. Right-click
  studies; "All decks →" keeps the full list reachable. *Not done: coarsening the
  16 groups to ~8–10 top-level categories (below), and on-device responsive polish.*
- **Housekeeping.** Filled the project `CLAUDE.md` context block; removed the stale
  **Mine** surface from the README; pointed the header **Support** link at the
  GitHub repo (was `href="#"`).
- **Market coarsened to 10 categories.** The 16 fine corpus groups roll up to 10
  balanced top-level categories at load (`GROUP_SUPER` in `src/data/index.ts`), so
  the treemap's first level reads on a phone. App-side only; the corpus JSON and the
  284 study sectors are untouched.
- **Gym → Fundamentals rename.** View id `gym`→`fundamentals`, `Gym.tsx`→
  `Fundamentals.tsx` (git-renamed), component + App state renamed. The persisted FSRS
  card namespace stays **`gym:`** (documented in `Fundamentals.tsx`) so existing
  drill schedules survive; `gymId`/`dueGymIds`/`gymDue` keep their names as they
  operate on that namespace.
- **Corpus pipeline unblocked.** Dropped its dependency on the deleted
  `src/lib/mining.ts`: ported the match half into a self-contained build-time
  `scripts/corpus/matcher.ts` (takes the corpus explicitly; imports only
  `conjugate`/`types`) and repointed `primeApp`. Deleted two obsolete diagnostics
  (`or-smoke.ts`, `ai-selftest.ts`) that also imported the removed `tutor.ts`.
  `corpus:selftest` passes 39/39 and `corpus:validate` passes on the real corpus.
- **Test harness.** Added Vitest (`npm test`) with 24 unit tests over the pure,
  high-risk logic: `conjugate.ts` (irregular/regular/separable/reflexive + the
  reliability gate), `treemap.ts` (proportional areas, full coverage, no overlap,
  bounds), and `scripts/corpus/matcher.ts` (inflection matching + heuristics).
- **Navigation redesign (user-requested).** Replaced the top header with a modern
  collapsible left **Sidebar** (desktop rail; mobile hamburger drawer). IA collapsed
  to one home screen (Today); **Study launches from "Start session"**; the market is
  its own **Explore** destination (split out of Home); **Fundamentals** is a
  destination; **Settings moved into a Profile** with an editable name + level +
  streak (built implicitly at onboarding). Logo enlarged; the "German Vocab
  Terminal" subtitle removed.
- **README refreshed for the sidebar IA** (was Next #3). Rewrote the intro + the
  "Surfaces" section around Home · Explore · Fundamentals · Profile, with Study via
  "Start session"; dropped the cut exam countdown and the old top-tab framing.
  `README.md`.
- **Settings AI-provider widget removed** (resolves the parked fold-in). The
  vestigial in-app provider form is gone from `Settings.tsx` along with its local
  orphans; `lib/ai.ts` stays for the build-time corpus enrichment. *Left in place,
  flagged:* the now-unused `aiConfig`/`setAiConfig`/`apiKey`/`setApiKey` in
  `store.ts` (remove when re-adding a tutor is truly off the table).
- **Store/session tests** (was Next #4). Added a Node-env Vitest harness — a
  localStorage shim (`src/test-setup.ts`) + per-test mocked IndexedDB and a fresh
  module graph — covering `buildBriefing`, `weakestSectors`, and `blindSpotDrills`
  (exercising the private `weakModes` ranking). `vitest.config.ts`,
  `src/store-session.test.ts`. Then extended to `buildMixedSession` (flip/drill
  interleaving, flip-order preservation, `MAX_FRESH_DRILLS` cap) and the streak/visit
  math (fake-timer consecutive-day + gap cases). Suite now 37/37.

### Earlier — the foundations

Undated, and predating this log. Listed because the archived strategy docs still
describe several of them as open work; they are not.

- **Known is the headline number** everywhere (Today, KPIs, decks, market), with
  per-card status pips (new / learning / known).
- **Unified `SessionRecap`** across the flip player and drills; **level
  milestones** fire once; **haptics** on grade commit.
- **First-run guided session** (placement → 10-card session → recap).
- **IA collapse**: Today + market merged into one `Home` scroll. Galaxy, Tutor,
  Lexi Duel and the exam countdown were **cut** here. *Two of those decisions were
  later reversed on evidence:* Lesen came back (the app was all retrieval and no
  input), and the nav settled at **Today · Progress · Library** rather than the
  Today · Study · More this line originally described.
- **Light/dark theme** + the new cyan logo/boot splash.
- **Corpus pipeline** (`scripts/corpus/`) — reproducible, licensed ingestion.
- **HD German voice** (Piper Thorsten, in-browser) and the **placement test**.
