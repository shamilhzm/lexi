# Lexi — Changelog

What has shipped, newest first. Split out of `BACKLOG.md` once the shipped history
grew past 750 lines and started burying the twenty lines of open work that file is
for. The backlog answers "what next"; this answers "why is it like this" — every
entry keeps the reasoning, because the reasoning is the part that stops a decision
being quietly undone later.

Nothing here is a to-do. If an entry describes something you are about to build,
it is already built.

---

### Shipped 2026-08-27 — the corpus stops warning about correct German

`corpus:validate` emitted **273 warnings** and **0 errors**, and had for long enough
that the number was furniture. CI never ran it, so nothing pushed back. Triaged the
whole pile; almost none of it was a defect in the corpus, and most of it was a defect
in something else.

- **The proper-noun exemption was wired to the wrong check.** A comment above the
  plural warning explains that 50 country cards — *Deutschland*, *Österreich* — carry a
  warning nobody can ever clear. That is evidence about **gender**, and gender went on
  warning about all 50 anyway. Applied to both. 51 → 1.
- **The lookups were asking the wrong question.** `fetch-plurals` and `fetch-ipa` built
  their de.wiktionary URL out of `term`, which carries the sense disambiguator, so
  `die Decke (Bett)` was fetched as `Decke (Bett)` — a 404, filed as *"no entry in the
  source"*. `fetch-ipa` was worse: it skips terms containing a space, and the
  parenthetical is a space, so those cards were never attempted. One badly-shaped key
  starved two fields and **both failures reported as missing data rather than as
  errors**. Now a shared `lookupLemma`, with tests.
- **A dash is an assertion, not a gap.** `plural: "–"` in a Flexionstabelle means *this
  noun has no plural*; it was being reported as malformed source data.
- **199 plural rulings.** The abstract-suffix guard had refused 111 correct plurals on
  the strength of two real counter-examples (see LESSONS). Ruled every one by hand on
  the actual question — does the plural mean more than one of what the gloss names —
  and the answer split near evenly, which is why no regex could have found it.
- **`nur Plural` could not be written.** `fix-authored` accepted `nur Singular` and `—`
  but not `nur Plural`, though the corpus carries it on 12 cards. A pluraletantum was
  the one shape the tool could not record.
- **Six compounds got a transcription without one being invented.** `Einbauschrank`,
  `Skijacke`, `reinkommen` and three more have no wiktionary entry, because
  dictionaries do not list every compound a language can form. `compose-ipa.ts` derives
  each from parts that *are* attested, under a stress rule read off Lexi's own data
  (`ˈkʁaŋkn̩ˌhaʊ̯s`, `ˈʁaʊ̯sˌkɔmən`), and refuses any split that does not spell its
  headword exactly. Facts still never generated.
- **Two warnings were correct silence.** `morgen`/`der Morgen` and five other pairs are
  two words, not one word twice — the near-duplicate check now keys on part of speech.
  `der/die Angestellte` has no single gender to record and says so in its own term.

**273 → 0**, errors 0 throughout. `corpus:validate --strict` passes for the first time,
so CI now runs it: the next warning to appear will be a real one and will stop the
build, instead of joining a pile nobody reads.

---

### Shipped 2026-08-26 — everything the drill is willing to print

A sweep of what the app *generates* as German, rather than what it stores. Three defects,
each one only reachable by fixing the one before it.

**A pattern card is not an infinitive.** 47 verb cards carry notation in the headword —
`gelten als + N`, `verzichten auf + A`, `ansprechen (Person)`. Forty-six came out
unreliable *by accident*, through a bad ending or a strong core, which is not the same as
being refused. `gelten als + N` did not: `reliable: true`, generating «du gelten als + st»,
which `conjDrillable` would have accepted and shown to a learner. Now refused on the shape
of the string.

**And so is a two-word verb.** The first version of that guard deliberately allowed spaces,
reasoning that «Rad fahren» and «spazieren gehen» are real verbs and refusing them would be
a different bug. Measuring settled it the other way: the generator appends endings to the
whole string, so «spazieren gehen» becomes «ich spazieren gehe» and «gespazieren geht» —
reliable, and not German. Refusing them is not a lost feature; it is the difference between
skipping a card and printing something that does not exist.

**`rad` was my own bad fix, and removing it was not the answer either.** Yesterday's prefix
batch included `rad` so that `radfahren` would conjugate. It did — as «ich fahre rad», lower
case, because the generator treats a prefix as a particle. *Rad* is a **noun**; `kennen` and
`wahr` fuse into one word, a noun object never does. Taking `rad` out restored the original
`geradfahrt`, which meant the fault was never in the prefix list at all: **the card carried
a pre-1996 spelling.**

Re-carding it to «Rad fahren» through `authoring:recard` then failed `corpus:validate` —
because **`voc:A1:Rad fahren` already existed**. The same verb had been in the corpus twice
under two spellings, invisible to a merge tool that matches on term equality. Correcting the
spelling is what made it visible; `corpus:dupes` merged it on the next run. The id map
collapses both hops, so a learner's schedule on the A2 card lands directly on the A1 keeper.

**Also filed, not fixed:** relative clauses are taught in inverted order — B1 puts a
relative pronoun after a preposition, B2 then teaches the pronoun table. Not duplication,
which is why `corpus:dupe-points` cannot see it; moving a point between levels is a schedule
migration and needs a pedagogic ruling first. It is in the BACKLOG now, which is where I
said it belonged last time and did not put it.

**Verified:** typecheck clean · lint 0 errors · **1,038 tests** · `corpus:validate` PASS ·
build clean · full corpus sweep: **1,135 drillable verbs, zero rendering impossible German.**

---

### Shipped 2026-08-26 — a B2 homework page, and the conjugator bug it uncovered

Two pages of a B2 course book on **Vergleichssätze**. Checking whether Lexi could teach
them turned up a gap in the bank, a gap in the corpus, and a bug that had nothing to do
with either.

## The bank taught comparison as a phrase, not a clause

`A2::Vergleiche: so … wie / als` covers «Köln ist so schön wie Bonn» — a *phrase*. The
course page is entirely the **clause** form, where what follows als/wie is a full
subordinate clause with its verb at the end: «…, als wir meinen», «…, wie wir gesprochene
Sprache aufnehmen». A learner holding only the phrase rule cannot build a single sentence
on that page.

New at B2: **`Vergleichssätze mit als und wie`** — the adjective the clause hangs on,
so/genauso + Grundform + wie, Komparativ + als, `anders als` and `etwas/nichts anderes
als`, verb-final, and the limit that a comparison with no verb after it is still a phrase
and needs no comma. Ten exercises, drawn from the page's own sentences.
`B1::Zweiteilige Konjunktion: je … desto/umso` was **upgraded** (keeping its title, and
therefore its FSRS progress) with the obligatory-comparative rule, the conditional
reading, and the two-sentences-into-one transformation the workbook drills.

## A script that would have resurrected a merged point

`corpus:grammar` is append-only, which protects existing points — and means a point that
was deliberately **retired** comes straight back. Its array still carried
`C2::Passiversatzformen`, merged into `B2::Passiv-Ersatzformen` on 2026-08-25 at the cost
of a schedule migration. A `--write` for any unrelated reason would have re-created the
duplicate that merge existed to remove, silently, because adding a point is what the
script is *for*. It now refuses any title whose ids appear in `ID_MAP` — derived from the
record the merge already wrote, not a second hand-kept list that could drift.

## The conjugator printed German that does not exist

`ge` + a separable prefix + stem is not a possible word — the ge- of a separable verb goes
*inside*. **Fourteen shipped verbs produced one**, and two of them, `kennenlernen` and
`radfahren`, came back `reliable: true`, which means `conjDrillable` accepted them and the
drill would have printed **«du kennenlernst»**. VISION forbids precisely that.

The cause is the third short enumeration the SEPARABLE list has had: the colloquial
directionals (`rein`, `raus`, `davon`, `hier`), the adjective/noun first elements (`klar`,
`kaputt`, `krank`), and the verb-first compounds (`kennen`, `wahr`, `rad`). Measured
before and after, the way the app runs: **14 → 0**. Pinned by a test that also asserts the
other half — `antworten` is not `an` + `tworten` and must keep its ge-.

**My first measurement was wrong and is now LESSONS class 2.** It reported sixteen. Two
were the probe: `conjugate` splits a prefix only when the remainder is a verb it *knows*,
and it knows nothing but `SEED_ROOTS` until `setKnownVerbs()` supplies the corpus at boot.
The app makes that call; my script did not.

## Seven words the page needs

Körpersprache, Gestik, Mimik, Emotion, wahrnehmen, Allgemeinwissen, nonverbal — all seven
verified against de.wiktionary by `authoring:new`, every gender, plural and IPA looked up
rather than written. It rejected all seven on the first run (one example each where the
floor is two; a gloss repeating its term; and `wahrnehmen`, whose example the matcher
could not resolve **because of the conjugator bug above**). Corpus 6,622 → 6,631.

**Verified:** typecheck clean · lint 0 errors · **1,035 tests** · `corpus:validate` PASS ·
lessons gate 95 · dupe-points 38/38 · build clean.

---

### Shipped 2026-08-26 — the two things I kept flagging instead of fixing

Both were rulings deferred rather than made.

## The FAB, settled by an option that was never on the list

BACKLOG #31 was twice re-confirmed and twice left alone, because all four candidate
fixes traded something already decided: hiding it per-surface removes the one-tap route
to the *scheduled* session, docking it into the bottom bar is the category error
`BottomNav` rejects in its own header, shrinking the map contradicts the complaint that
produced the map, auto-hide leaves the overlap at rest.

The fifth option is **put the action where this app already says actions go.**
`TopBar`'s own rule is *places on the left, the action on the right, the person at the
end* — and it was following that rule only above `md`. Start session is now in the bar at
every width, the floating button is deleted, and the 80px phone gutter that existed only
to clear it went too.

**The problem had also outgrown the ruling.** With three destinations the float covered a
tile *label* on one surface. With five it sat over **tappable controls** on three — a
Study button on Words, a path node in the journey, a heatmap tile on Progress. A 56px
target under a 56px circle is not cosmetic. Verified at 320, 375 and 1280: the header does
not wrap, and zero controls sit under the bottom bar.

## Duplicate grammar points: measured and ruled, deliberately not merged

Writing 133 lessons made the overlap obvious. **Merging would silently destroy a
learner's schedule** — `gex` ids are keyed on the point *title*, so retiring a point
orphans every FSRS record pointing at it, there is no title→title migration, and
`gexmap.ts` is marked "do not regenerate". LESSONS is unambiguous that this class is a
schedule migration.

So `corpus:dupe-points` measures and rules instead: **38 candidate pairs, 38 hand-verified
verdicts, 17 confirmed duplicates**, recorded in `dupe-points.tsv` the way
`dupe-rulings.tsv` and `form-rulings.tsv` already do for cards. A *new* duplicate fails
the check — proven by injecting one.

**The detector was wrong before it was right, twice.**

- Its first tokeniser dropped anything under four characters, which scored **Futur I
  against Futur II at 1.00** — the roman numeral was the only thing telling them apart.
  Two different tenses reported as identical. Hand-verifying three hits before trusting
  the count is exactly what LESSONS' checklist asks for and it caught this on the first.
- Comparing summaries as well as titles then surfaced twelve more, including the two
  worst: **A1 carries `Possessivartikel` twice** under two spellings of one title, and
  **present Konjunktiv II is taught at A2, B1 and B2**.

**And two of my own verdicts were wrong in kind.** I filed
`B1::Relativsätze mit Präpositionen` against `B2::Relativsätze` as a duplicate. It is not
— the content differs, the **order** is inverted, with advanced constructions taught a
level before the basic paradigm. That is a sequencing finding, and filing it in a
duplicate table would have made the check appear to cover a problem it cannot see. Both
were removed; every ruling in the table is now a pair the detector actually raises.

**Verified:** typecheck clean · lint 0 errors · 1,032 tests · `corpus:validate` PASS ·
lessons gate clean · dupe-points 38/38 ruled · build clean.

**Left open, deliberately:** the 17 duplicates need a pedagogic ruling on which level
keeps each, plus a title→title migration before anything is retired. Neither is a script.

---

### Shipped 2026-08-26 — every grammar point in the bank is a lesson

**133 of 133.** B2, C1 and C2 finish the set: 602 sections, **35 explicit limits**, and
every node in the journey now opens something written before it opens a drill.

**B2 largely revises B1** — a finding this backlog already carried. Rather than write the
same lesson twice, each B2 page takes what B2 adds: the *Zustandspassiv* against the
*Vorgangspassiv* and the four ways German avoids the passive altogether; adjective
declension consolidated into its three types with the one idea underneath them (*the
gender is marked once, and whoever can mark it does*); the three word classes that all
mean "because" and each put the verb somewhere else.

**Three claims of mine were genuinely too flat**, all caught by the absolutes lint:

- *"Konjunktiv II is always distinct"* — the fallback rule for Konjunktiv I. **False for
  weak verbs**, where K II is identical to the Präteritum, so «sie machten» is ambiguous
  in exactly the way the rule exists to prevent. The chain goes one further to *würde*.
- *"The information is identical; only the packaging differs"* — of nominalisation. Not
  identical: a nominal phrase **drops tense, mood and the agent**. «nach Beendigung der
  Verhandlungen» does not say who ended them, and that vagueness is often why the
  construction was chosen.
- *"the single most common passive error in German"* — an empirical superlative I have no
  way to support. The claim did not need it.

**And a presentation bug the lint could not see.** The lessons were authored with
`**strong**` and `*em*`; the renderer had no notion of either, so **62 fields across 49
points shipped literal asterisks on screen**. Found by looking at a C2 lesson.

`RuleSectionBlock` now renders those two marks — as React nodes, not
`dangerouslySetInnerHTML`, because a field that grows by 133 lessons is a standing
invitation. It is deliberately **not** a markdown parser: DESIGN's `RuleSection` is built
on *structure rather than markup*, which is why `pairs` and `examples` are typed fields,
and two inline marks is the whole of the concession. `corpus:lessons` now rejects
backticks, lists, links, headings, underscores, unclosed asterisks, and any mark at all in
`pairs` or `examples` — which caught two of mine that would have printed verbatim.

**Verified:** typecheck clean · lint 0 errors · 1,032 tests · `corpus:validate` PASS ·
lessons gate clean at 95 entries · build clean · zero literal asterisks in the rendered
DOM, confirmed in the running app.

---

### Shipped 2026-08-26 — B1 complete, and an old test caught the new author

**29 more lessons. A1, A2 and B1 are all done — 108 of 133 points, 24 explicit limits.**
B1 is the level the certificate gates university admission on, and it was the largest
gap in the bank.

**A guard written months ago caught my authoring.** `grammar.test.ts` has asserted that
every section renders since it was written, and it failed on a `pairs` entry with an
empty right-hand side — the arrow column would have pointed at nothing. The test did its
job. The problem was *when*: the bad data was already written into `grammar.json` by
then. The same check now runs inside `corpus:lessons`, so a lesson that would not render
is **refused before it is applied** rather than reported after. Duplicating an assertion
is worth it when it turns a bad write into a blocked one.

**Two claims that were genuinely too flat**, both caught by the absolutes lint:

- *"One form covers every unreal statement about the past"* — not with a modal, where
  you get **hätte plus two infinitives**: «Ich hätte kommen können», not «gekonnt».
- *"German puts the preposition in front of the pronoun, always"* — true for people, but
  German actually prefers a **wo(r)- compound** for things («das Thema, worüber wir
  gesprochen haben»), and spoken northern German splits «da» from its preposition («da
  habe ich nichts von gehört»). One is standard and worth using; the other is regional
  and stays out of writing.

**Other limits worth having:** spoken German very often keeps main-clause order after
*weil* — everywhere in speech, wrong in the exam. *wegen dem Wetter* is what most Germans
say and is still marked colloquial. The synthetic Konjunktiv II is literary, **except**
*wüsste*, where «würde wissen» is the odd one. And *um … zu* requires matching subjects
while *damit* merely permits them — the rule taught as symmetrical runs one way only.

**Two duplicates in the bank, differentiated rather than repeated.** B1 carries
*Temporale Konjunktion: als* alongside A2's *Nebensätze: wenn & als*, and *Passiv Perfekt
& Präteritum* alongside its own *Passiv: Perfekt & Modalverben*. Rather than write the
same lesson twice, the B1 pages take what B1 actually adds — the three-way als/wenn/**wann**
split, and the Präteritum passive. The overlap is a corpus question, not a lesson one, and
is left for a relevel pass.

**Verified:** typecheck clean · lint 0 errors · 1,032 tests · `corpus:validate` PASS ·
lessons gate clean at 70 entries · build clean.

**Remaining: B2 12, C1 8, C2 5.**

---

### Shipped 2026-08-26 — A1 and A2 are taught, not just drilled

**53 lessons, both beginner levels complete.** 79 of 133 points now carry structure,
up from 46. Every A1 and A2 node opens something worth reading before it opens a drill.

**The gate was wrong once, and that was the important one.** It reported twelve wrong
Präteritum forms for war/hatte. The forms were correct — `checkParadigm` only ever
compared against `praesens`, so registering a past-tense table produced twelve confident
errors against good German. A gate that cries wolf gets its output skimmed, and the next
real failure rides through with it, so this was worse than a missed check. Paradigms now
declare their tense.

**And it caught a lesson contradicting itself.** The *Verben mit Vokalwechsel* intro said
the vowel changes in "only two places" while section four of the same page explains that
e→i verbs carry the change into the imperative. Nobody reading top to bottom would have
believed both.

**Two systematic false-positive classes, fixed in the lint rather than waived.** With 109
lessons still to write, an exemption per false positive is how a check ends up with more
waivers than teeth.

- **Quoted material is cited, not claimed.** `Where English says "all my friends", German
  often says «jeder»` is not an absolute about German. «…» and "…" spans are stripped
  before the test.
- **Fixed English idioms are not quantifiers.** "no article at all", "above all", "first
  of all". An explicit seven-phrase list, kept short so the hole stays legible.

Both are mutation-checked to confirm they did not blunt anything: a real quantifier still
fails, including one placed directly beside an idiom.

**Real limits that shipped**, which are the part worth having:
- *«größer wie»* is genuinely common in southern Germany and Austria in speech — and
  still marked wrong in every exam. Dialect you will hear, not a variant you may use.
- The -er comparative is regular in **form**, not universal in **use**: *tot*, *schwanger*
  and *einzig* have no comparative because there is nothing to grade.
- *un-* is not the general reverser. The opposite of *schön* is *hässlich*; *unschön*
  exists and means something else. Recognise un-, do not manufacture it.
- Konjunktiv II runs backwards from how it looks: the short form (*hätte*, *wäre*,
  *könnte*) for six verbs, *würde* for everything else, where the synthetic forms sound
  literary.

**Verified:** typecheck clean · lint 0 errors · 1,032 tests · `corpus:validate` PASS ·
lessons gate clean at 41 authored entries · build clean · walked in the running app.

**Remaining: B1 29, B2 12, C1 8, C2 5.**

---

### Shipped 2026-08-26 — ten fixes, and the gate catching its own author twice more

A pass over what was actually outstanding rather than what was next.

**The heatmap could be broken permanently by one bad row.** `loadSnaps()` validated
`Array.isArray` and nothing else, so a snapshot missing `groups` reached `groupDeltas`,
where `Object.keys(undefined)` throws — the exception leaves `<Markt>` and the **whole
Progress surface renders its error boundary instead of the map**, for good, with no way
to clear it from the UI. Lexi is local-first and holds the only copy. Reachable from a
quota-truncated write, a schema older than the field, or a hand-edited backup —
`lexi.snap.v1` is in `SETTING_KEYS`, so it travels in exports. Rows are now validated
the way `lastSeen()` twenty lines below has validated its own since it was written.
`store-snaps.test.ts` pins it: 9 tests, and reverting the guard fails 4.

**The lessons gate caught its author twice more, and the second was the worse one.** It
flagged three absolutes; I judged one a false positive and wrote an `EXEMPT` entry keyed
on the **point**. The point had five sections, and two of the others were real: *"a stem
ending in -d/-t cannot be said without an -e"* (spoken German says «Wart mal!» all day)
and *"e→i verbs never take the -e"* («siehe oben» is standard written German). Both are
precisely what the check exists to find; both were then silenced by a line written to
quiet a different one. Exemptions are now per **section**, the two claims carry their
limits, and the whole thing is LESSONS class 9: *an exemption must be as narrow as the
thing it excuses.*

**Two grammar scripts write `point.sections`** — `grammar-sections.ts` and `lessons.ts` —
and nothing stopped both claiming a point, where whichever ran second would win silently
while the loser's authoring sat in its file looking applied. Guarded, and the guard is
mutation-checked.

**`Mahle!`** — the imperative of *mahlen*, to grind — was illustrating the optional -e in
the A1 Imperativ rule. Almost certainly a slip for *malen*. Fixed through an
expect-guarded map in `lessons.ts`, so a rule someone has since rewritten is reported
rather than overwritten; the drift guard is proven to fire.

**Nine stale corpus counts across six files.** The code claimed 7,389 / 7,394 cards and
284 sectors; the corpus ships **6,622** and **274**. Every replacement was measured this
session, including the byte figures in `data/index.ts` (cards.json is 286 KB gzipped, not
308). Three `7,394`s survive on purpose — they are dated records of what a slider showed
during a past bug, not live claims.

**Also:** `nextStep` walked all 133 points twice per store change (~10,000 map lookups
after every graded card) — hoisted, so the resume card and the marked node can no longer
disagree. The chapter jump bar was an `<a href="#kapitel-A1">` into a hash **this router
owns**, so cmd-click or "open in new tab" bypassed `preventDefault` and landed on Today;
it scrolls rather than navigates, so it is a button now. A `useEffect(() => setOpen(home))`
cascading render replaced with React's own adjust-during-render pattern. And `BACKEND.md`
still listed `classlist` among the keys a future sync would carry, three commits after the
feature was deleted.

**Verified:** typecheck clean · lint 0 errors (71 → 69 warnings) · **1,032 tests in 59
files** · `corpus:validate` PASS · lessons gate clean · build clean · Imperativ walked in
the running app with both recovered limits rendering.

---

### Shipped 2026-08-26 — a node is a lesson now, and the gate that lets it be

The journey made the real gap impossible to miss: **every node promised a concept and
delivered a paragraph.** Measured — the bank's median rule is **193 characters**, 95 of
133 points have no structure at all, and *Imperativ* shipped **83 characters of
explanation against 134 exercises**. The drilling was never the thin part.

**A node now opens a lesson, and the lesson opens the drill.** Read, then practise, in
that order, with the Üben button at the bottom where finishing the reading puts you. The
rule text is untouched and still the fallback, so a point with no authored lesson renders
exactly as its `?` toggle always did — nothing lost anything on the day this shipped.

**`RuleSection.limit` is a new first-class field**, and it exists because of the one thing
this project has already been burned by. LESSONS class 6: *Mittelfeld* shipped the flat
rule "an Akkusativ noun goes after the Angaben" — true only of an **indefinite** one — so
a learner holding it marks correct German wrong and trusts the verdict. The rule that
came out of that is the rule this field enforces:

> Before shipping a teaching rule, write the sentence it would reject. If that sentence is
> good German, the rule is a default and must say so.

It renders as a set-apart **But:** block, because a caveat that reads like body text is a
caveat nobody reads.

**`npm run corpus:lessons` is the gate.** Two checks, and it is honest about which is
which:

- **Factual, and a hard reject.** A six-person paradigm is a claim about a verb, and the
  app owns an engine that can settle it. Every conjugation table is checked against
  `conjugate()`; a disagreement fails the build. Same standard `authoring:new` holds
  cards to.
- **A lint, not a proof.** A body containing *always / never / only / every / must /
  cannot* with no `limit` fails. A machine cannot tell whether a grammar claim is true.
  It can tell when a claim is *phrased* the way the one that shipped wrong was phrased.

Both halves mutation-checked: a wrong `ihr seid → seit`, a plausible-but-wrong `du
spielest`, and an unlimited absolute each fail on injection.

**The gate caught me twice, on its first two runs.** I wrote "«Ich habe Hunger» is the
**only** natural way to say you are hungry" — which is flat, and wrong: «Ich bin hungrig»
is good German. That is precisely the class-6 failure, committed by the author who had
just finished reading class 6. It now ships with a limit saying *prefer haben; do not
mark sein wrong*. The second was a stray "English cannot do this", rephrased rather than
exempted, because exemptions weaken a lint and rephrasing costs nothing.

**Eight lessons authored, deliberately — not 133.** A1's four foundational points plus
the four with the worst explanation-to-drilling ratio (Imperativ, Modalverben, Trennbare
Verben, Perfekt). Class 6's standing instruction is *spot-check a sample before writing*,
and a generator bug is four hundred bad items rather than one. The machine and the format
are proven; scaling is now an authoring decision with a gate under it rather than a
gamble.

**Worth knowing about the limits that shipped**, because they are the substance:
*Verbs of movement take sein* holds only with no direct object — «Ich bin gefahren» but
«Ich habe das Auto gefahren». Stem-changing imperatives split two ways: e→i keeps the
change (*Gib!*), a→ä loses the umlaut (*Fahr!*, never *Fähr!*). And a modal often has no
infinitive at all — «Ich muss nach Hause» — which the old one-line rule implied was
impossible.

**Verified:** typecheck clean · lint 0 errors · 1,023 tests · `corpus:validate` PASS ·
build clean · lesson → drill walked in the running app in both themes.

---

### Shipped 2026-08-26 — the syllabus is a path, and the class list is gone

**Practice's centre was six collapsed accordions**, one per CEFR level — a filing
cabinet that answers "where is Konjunktiv II" and nothing else. It opened as six closed
grey rows, one of which you were expected to know was yours.

It is now a **journey**: chapter = CEFR level, node = one grammar concept, in the order
the bank authors them. That mapping was not invented for the redesign — a level *is* the
unit a learner moves through, the concepts inside it *are* ordered, and neither fact had
ever been rendered. Each chapter carries its number, the level, the Council of Europe's
own can-do line from `candos.ts`, and an `n/N finished` count; each node carries its
state (finished · in progress · not started · **the one to resume**) and its title.

A `ContinueCard` at the top names the next step — *KAPITEL 2 · A2 · SCHRITT 1 ·
Akkusativ · [Üben]* — which is the single most useful control on the surface, because it
removes the choice on the day you do not want to make one.

**Three rules came out of building it**, all in DESIGN §8a:

- **Geometry gets one source of truth.** Nodes and connectors are computed from the same
  `nodeX/nodeY` pair, in pixels, in a ribbon that is 300px at every viewport. A
  percentage layout with an SVG overlay needs `preserveAspectRatio="none"`, which
  distorts stroke width and lets the connector disagree with the nodes at *some* widths.
- **Connectors are stubs, not a ribbon.** The first version drew one curve through every
  node centre — the obvious thing, and wrong, because Lexi's nodes carry captions and the
  curve ran through the words. Found by looking at the screen ("sein & haben" had a 3px
  line through it), not by reasoning about it. Each stub now clears the caption.
- **A node may not be unlabelled.** The reference's nodes are bare tiles and can be,
  because *its* chapters are the content. Lexi's nodes are concepts, and stripping their
  labels would undo the thing this surface exists for — its own header comment: "a
  learner arriving at A1 could be asked to choose between den/dem/der/des without the app
  ever having said what Nominativ is." Every chapter also keeps a *read the rules* list
  under its path, so reading a rule still never requires starting a drill.

**Nothing is locked**, unchanged: every node at every level is tappable, and the marked
one is a suggestion. The path is deliberately long — six chapters, ~140 nodes — because
that is the honest shape of a language's grammar. It is made navigable by a chapter jump
bar, which scrolls and deliberately does *not* also report which chapter you are scrolled
into: the scrollbar already answers that, and a second answer would lag it.

**A bug the journey surfaced, fixed.** Practice holds its drill in local state (a scoped
exercise set is not a linkable thing), so tapping *Practice* while inside a drill did
**nothing at all** — there was no way back to the syllabus except the browser's Back.
`go()` now bumps a nonce in the route container's key, so tapping the tab you are already
on returns that destination to its root. That is how a tab bar is expected to behave and
it was never true here.

**"My class list" is removed** at the user's request — the paste-your-homework box, its
`lexi.classlist.v1` key, the store API, and the pinned parser tests that came with it.
It had moved from Today to Words in the IA pass; now it is gone. **Worth knowing if it
ever comes back:** `parseList` handled six ways a worksheet gets pasted (commas,
numbering, dashes, tab-separated glosses) and those cases were pinned in `a1.test.ts`
from a real learner's report. They went with the feature; git history has them.

**Verified:** typecheck clean · lint 0 errors · 1,023 tests in 58 files · build clean ·
both themes at 375×812 and 1280×860; node → drill, the jump bar, and all four node
states walked in the running app.

---

### Shipped 2026-08-26 — paper, a running head, and an emblem per topic

The aesthetic half of the same pass, and it exists because **DESIGN.md was used to
refuse a good idea and the refusal was wrong.** Shown the reference screenshots, the
first answer was that §1 "forbids borrowing a look from another domain twice." §1
forbids *pastiche*. It has never forbidden learning how someone else solved a problem
well, and a rule quoted as a general prohibition when it was written to prevent one
specific failure is a habit, not a rule. The doc now says so in its opening, with the
three-part test an outside idea has to pass.

Everything below passes it — each one serves an identity Lexi already claims and
survives measurement.

**The ground is paper.** The light neutrals were a cool grey-blue commented "biased
toward the accent" — a screen colour, and the reason the instrument read as a
dashboard, which is the exact thing §1 spent a section retiring. Two of the three
traditions this palette descends from are ink on paper.

Not the cream the `.paper` case study rejected: that failure was a *nested scope*
carrying its own accent, swinging the brand hue 153° on entering a card. This is the
global ground, the accent is byte-identical (`#1d6a8c`, hue 198°), and no scope
overrides anything. It shipped because it **measured better**:

| pair | cool (was) | paper (is) |
|---|---|---|
| `dim` on `bg` | 5.18 | **5.85** |
| `dim` on `panel2` | 4.74 | **5.38** |

`dim` on `panel2` was the closest pair in the app to failing AA and is now the
comfortable one.

**One value in that palette exists only because a test caught it.** The first `panel2`
put *accent on panel2* at **4.49** — under AA by a hundredth, on the fill every nested
row uses. Invisible by eye; the throwaway script that designed the palette had not
tested that pair. The new guard failed on its first run and named it.

**The 4.5:1 rule is now enforced rather than asserted.** DESIGN has stated it since it
was written and checked it *by pasting JavaScript into a browser console* — so nothing
ran it, it could not fail a build, and it survived a whole palette inversion
unverified. `palette.test.ts` now covers `txt`/`dim`/`accent` against
`bg`/`panel`/`panel2`/`card` in both themes, and pins the elevation ramp as monotonic
so a card can never again sit at 1.00 against its panel. Both halves mutation-checked;
the console snippet is deleted.

**Page titles are set, not scaled.** Every `h1` was system sans at 20px — the register
of an admin panel — while §1 claimed *the printed lexicon* as a founding tradition and
a lexicon sets its running heads in its headword serif. New `.display` class: Fraunces
at `text-3xl`/`4xl`, `font-optical-sizing: auto`. The rule and its boundary: **serif is
the app speaking, sans is the app labelling** — `h1` and the German get Fraunces, `h2`
and below stay sans. It does not dilute "Fraunces means German", because §9 already
requires surfaces to carry German names: *Wortschatz*, *Üben*, *Lesen*, *Heute*,
*Drucken*, *Dein Wortschatz*.

**Every theme group has an emblem.** `GROUP_EMBLEM` was keyed on the **15 fine corpus
groups**, but `data/index.ts` coarsens those into the **9 the app displays** — so every
lookup by a displayed name fell through to `star`. Nine identical stars is not an
illustration system. The nine coarse names are mapped, and the browse index draws each
group's mark on an accent-tinted tile.

`SHOW_ILLUSTRATIONS` stays **false**. That flag governs the word card, the market and
the word map — three surfaces where an emblem decorates something that already has a
subject. A browse index is the one place it is not decoration: nine cards of identical
grey text is a list you read, nine cards with a mark each is a grid you *scan*, and
scanning is the whole job of that surface. So Words opts in on its own, through the
export the module provides for exactly this, rather than flipping a global whose other
three surfaces nobody has looked at.

**What was deliberately not taken.** The reference's isometric two-tone halftone
illustration, its cream-and-mint palette, its full-round pill buttons (which would
break §5's radius hierarchy, where 16px means *a surface you read* and 10px means *a
control you press*). Those are the costume. "Recognise a topic by a coloured mark
before reading its label" is the principle, and the principle is what shipped.

**Verified:** typecheck clean · lint 0 errors · **1,029 tests in 58 files** ·
`corpus:validate` PASS · build clean · both
themes walked at 375×812 and 1280×860; the session desk is byte-identical, which is
the point — the desk was already right.

---

### Shipped 2026-08-26 — five destinations, and a search box

The IA had four tabs and roughly twenty-four places. This closes the gap, and the
prompt for it was an outside one: a folder of screenshots of a vocabulary app whose
navigation a stranger can predict on first open. Nothing of its *aesthetic* was taken —
the Atlas stands, and DESIGN §1 forbids borrowing a look from another domain twice. What
was taken is the discipline underneath it: **five tabs, one noun each, and nothing behind
a disclosure triangle.**

**The measurement that justified it.** Not "the app feels cluttered" — a count of what a
learner had to guess:

| What | Where it was | Taps |
|---|---|---|
| The comprehension meter — the flagship, BACKLOG Now #2 | a card inside a **collapsed accordion** on Today | 3 |
| Lesen, the reading list | the same accordion | 2 |
| The lexicon — 6,622 cards, 274 decks | `#/progress/decks/<group>` | 2, via the page that measures you |
| **Looking a word up** | **did not exist** | — |
| Grammar | an accordion on Today *and* the Library tab | 2 / 1 |
| One typing game | its own tab, alone | 1 |

Today carried **twelve stacked cards**, two of them accordions hiding a whole feature
each. It now carries five blocks and fits in ~1.5 viewports where it took four.

**The set.** Today (what do I do now) · Words (what words are there) · Practice (drill me)
· Read (give me real German) · Progress (how am I doing). *Library* and *Games* merged
into Practice — a Konjunktiv II exercise and a typing race are the same answer to the same
question, and a tab holding one card is not a destination. The full argument, and the
three rules that came out of it, are in DESIGN §8a, which said *three* for a year and had
been quietly running at four since Games arrived.

**Words is new, and the reason it exists is a gap nobody had written down.** Lexi has
shipped 6,622 cards since day one and **had no way to look one up** — `Grammar.tsx`
searched 140 grammar points; the vocabulary had nothing. The search takes German or
English, folds umlauts and ß (a learner on an English keyboard cannot type *Übung*), and
ranks exact → prefix → contains with the German side first. Around it: the nine theme
groups with your coverage on each, then Decks and the Wortkarte, which moved here from
under Progress.

**Why the corpus left Progress.** `#/progress/decks/<group>` asserted that browsing is a
kind of self-assessment. It is not — a learner opening *Essen* wants to see what it
teaches. It also left Progress answering two questions under one name. Progress keeps the
heatmap, trends, blind spots and finished sectors, and gains the observatory, which had
been sitting **above the greeting on Today** — the first thing a learner saw, before being
told what to do.

**Read is a destination because the flagship was behind a triangle.** Both halves are now
visible on one surface under two headings: four sentences you can almost read, then the
meter. Four, not six — at ~225px each, six put the second heading 1,350px down, findable
only by someone who already knew it was there.

**Every retired hash is aliased, not 404'd.** `#/library` and `#/games` resolve to
Practice; `#/progress/decks/<group>` to `#/words/g/<group>`; `#/progress/map/<sector>` to
`#/words/map/<sector>`. A cold load canonicalises the URL — which the existing boot sync
already did for free — and an in-session hash edit is left alone. Bookmarks, PWA shortcuts
and shared deck links all still land.

**Two bugs found by looking, not by reading** — both now LESSONS class 9:

- The search ranked `das Haus` **fourth** for "haus", behind *Autohaus*, *Gasthaus* and
  *Gehäuse*. `term` carries the article, so `=== f` and `.startsWith(f)` were unreachable
  for every noun in the corpus and all of them fell through to "contains", then sorted
  alphabetically. The comparator was right; its input was the wrong shape. Now matches
  the article-stripped form too, and breaks ties on headword length so a base word beats
  its compounds.
- `type="search"` makes WebKit draw its own clear button, so both search fields showed
  **two ✕** — and the smaller, unlabelled, sub-44px one was the easier tap. Suppressed in
  `index.css` rather than dropping to `type="text"`, which would trade the iOS keyboard
  and the semantics to fix a paint. The grammar search had carried it since it was
  written.

**Furniture.** Five labels do not fit beside the mark, *Start session* and the avatar at
640px, so the top bar's destinations moved `sm:`→`md:` and the bottom bar took the range
back. Verified rendered at 375×812: five tabs at 75px each, no truncation on *Progress* or
*Practice*.

**Not changed, on purpose.** The Atlas identity, the two-rooms split, the token
architecture, the motion scale. The desk is still an early return with no chrome. The
bottom bar still has no embedded FAB — with five destinations that category error would
be worse, not better. And Today keeps its `week1` suppression for everything statistical;
the three doors at its foot are exempt, because orientation is the opposite of a
statistic and the learner who most needs telling that the app has more in it than one
button is the one who arrived on Tuesday.

**Verified:** `npm run typecheck` clean · `npm run lint` 0 errors · `npm test` green ·
`npm run build` clean · all five destinations plus both legacy hashes walked in the
running app at 375×812 and 1280×860. (Counts are stated once, in the entry above, so
there is one number to keep true rather than two.)

---

### Shipped 2026-08-26 — the measurements were disposable

Prompted by a question about Musk's five-step algorithm, and the answer turned out to be
about step 5 rather than the four we already follow. *Automate last* holds for **fixes** —
every tool built here was built after doing the thing by hand, and `fetch-plurals` was
narrowed four times by hand-checks. It is exactly backwards for **measurement**.

**On 2026-08-25 I wrote 17 probes and committed none of them.** The findings went into
BACKLOG; the instruments went into a scratchpad and vanished. So the items carrying that
day's numbers — 58, 70, 294, 143, 48 — cited `sense-audit.ts`, which is the *ranking*
script and not the probe that produced any of them. Nobody could re-derive them, and that
is the mechanism by which an item rots: re-measuring means rewriting the probe, so it is
expensive, so it is skipped. **Four items that day turned out to be already done.**

BACKLOG's header has said *"re-run the script before trusting it"* since August. Stating
the rule was not enough — which is this project's own signature, and its own answer:
turn the rule into a check.

**Five probes are now named checks in `corpus:audit`**, which already was the
whole-corpus sweep and already kept a ledger of checks tried and removed:
`case-band-nonnoun` (55), `example-near-twin` (70), `example-near-twin-weak` (223),
`example-same-translation` (125), `participle-adjective-pair` (48), and
`generated-tense-share` (8 points). All are **warnings** — they are reading lists, not
defect lists, and one is an invariant guard where growth is the signal. Backlog items now
cite the check rather than a bare number.

**Re-running them against yesterday's figures is what the exercise was for, and it found
a bug in one of the checks.** Four counts matched or moved for a nameable reason —
`example-same-translation` fell 143 → 125 because the du/ihr twin fixes rewrote the
examples; `generated-tense-share` fell from 10 points to 8 because six gained authored
items. But `participle-adjective-pair` came out **41 against yesterday's 48**, and the
seven missing were all `sich`-prefixed: the check tested `multiword` *before* stripping
`sich`, so every reflexive verb was excluded. `sich verletzen`'s participle is *verletzt*,
which is an adjective card, and that is the same shape. Fixed; back to 48.

That is the whole argument for this change in one number. Written down, 48 was inert. Made
re-derivable, it disagreed with itself and the disagreement was a defect.

**A fifth entry joins the ledger of checks tried and removed**: the
participle-vs-corpus-attestation probe written and discarded on 2026-08-25. It flagged 69
disagreements and every one read was a sentence with no Perfekt in it — the auxiliary test
fired on any *ist* anywhere, and the stem test was a loose substring.

The **0.80–0.90 near-twin band is labelled UNREAD** rather than described. The two bands
above it were each characterised from their first screen and the characterisation was
wrong both times.

`corpus:audit` 0 errors · 1,005 warnings (476 before; the new checks are reading lists).
1,000 tests, 0 lint errors, `corpus:validate` PASS.

---

### Shipped 2026-08-25 — the three topics B2 was missing

The other half of the *B2 is mostly revision* 🔴. Having merged the six duplicates, what
was left was the real question: **B2 is thin in its own layer, and three topics it needs
were filed a level up.**

**`Passiv-Ersatzformen` was carded at C1 *and* C2**, under two different titles —
`Passiv-Ersatzformen` and `Passiversatzformen (sein + zu, sich lassen, -bar)` — which is
exactly why yesterday's identical-title sweep could not see it. Both teach *sich lassen*,
*sein + zu* and *-bar*. Merged into the C1 keeper, taking the C2 copy's text, which was
the better written of the two: it explains *why* formal German reaches for them rather
than just listing them. The keeper gained sections showing each substitution as a pair —
«kann gelöst werden» → «lässt sich lösen» — and the trap that *sein + zu* carries
obligation as readily as possibility.

**Then three moved to B2**: that point, `Partizipialattribute` and `Subjektive
Modalverben`. Each is on the record in `corpus:relevel`'s `MOVES` with its reason —
*sich lassen* is what B2 Schreiben is marked on; a learner who cannot parse a participle
before a noun cannot read a B2 text whatever their vocabulary; and *er soll reich sein*
is met as reading long before it is produced.

**Moving down is strictly additive**, which is the same argument the four A1 moves of
2026-08-06 rest on: the level filter is cumulative, so a C1 learner still meets
everything they met before. Only the B2 learner gains — and B2 is the certificate that
gates university admission.

**B2 20 → 23 points; C1 12 → 9.** The nine left are a defensible C1 layer: Konjunktiv I,
Funktionsverbgefüge, Nominalisierung, Konjunktiv II Vergangenheit, Genitivpräpositionen,
indem/sodass/folglich, wo(r)-/wessen, Futur II, TeKaMoLo.

`corpus:relevel` emits its id-map entries rather than writing them — deliberately, since
`idmap.ts` is a permanent record and belongs under review. They were carried in through
`carryIdMap`, which also **re-pointed the 16 entries from the merge an hour earlier**:
those pointed at `gram:C1:Passiv-Ersatzformen`, and that card had since moved to B2.
Hand-editing would have left them dangling.

**Two more same-topic pairs found and filed rather than merged** — C1
`Nominalisierung ↔ Verbalstil` against C2 `Nominalstil`, and the two C2 `Idiomatik`
points. Neither is the clear-cut "same rule restated" case the six were: the first pair
is production against comprehension, and a case can be made either way. That is a
decision, not a script.

133 points · 6,217 exercises · 1,000 tests · 0 lint errors · `corpus:validate` PASS.

---

### Shipped 2026-08-25 — n-Deklination was taught three times

BACKLOG's oldest 🔴 says *B2 is mostly revision of B1*, and it has sat there since
06 August because it reads as a judgement call. Measured, it is two claims wearing one
hat, and one of them is not a judgement at all: **six topics were carded under an
identical title at two or three levels, teaching the same rule in different words.**

`n-Deklination` existed at **A2, B1 and B2** — three points, three FSRS schedules, and
all three saying weak masculine nouns take -(e)n everywhere but the nominative, naming
the same nouns. `Präteritum` sat at A2 and B1 with **156 exercises each**. Also
`Genitiv` (B1/B2), `Komparativ & Superlativ` (A2/B1), `Zweiteilige Konnektoren` (B1/B2).

**All six merged.** `authoring:merge-points` is the fifth tool in the authoring family
and the first that touches the grammar bank: it retires a point into another level's,
absorbs the exercises the keeper does not already have by prompt, carries **both** id
families — the exercises' `gex:<level>:<title>:<xi>` and the concept card's
`gram:<level>:<title>` in `vocab.json` — and refuses to strand a pointer. The keeper is
always the lower level, because merging upward takes a point away from a learner who
has it.

**Every keeper's rule was rewritten to carry what the retired copy had and it lacked**,
which is the part a script cannot do: the B1 `Präteritum`'s register point (that the
tense is for written narration, and for *sein*/*haben*/modals in speech), the B2
`Zweiteilige Konnektoren`' *zwar…aber* and the warning that *weder…noch* is already
negative, the B1 `n-Deklination`'s *des Namens* and *den Herrn*. Three keepers crossed
the 280-character prose limit as a result and gained `sections` — the rule-length guard
catching its own consequence.

**140 → 134 points, 6,245 → 6,217 exercises** (28 generated prompts were identical
across the two `Präteritum` points and deduped). No title now appears at two levels.

**And a ⚠️ item is struck as stale.** *Grammar points can only ever be appended* warned
that `gexId` was positional, so inserting or moving a point would silently re-point
schedules. The correct fix — the first of the two it proposed — has since been done:
ids are keyed on the **title**, with `migrateGexIds()` carrying the one-time migration.
That is what made these six merges possible at all.

The judgement half of the 🔴 stays open, restated honestly: B2 still spirals a lower
level in about half its 20 points, and a spiral is how syllabi work — A1 *Perfekt* → B1
*Passiv Perfekt* is correct pedagogy, not duplication. What B2 genuinely lacks is a
short list the bank has filed higher: **Passiversatzformen** (at C1 *and* C2, and a
Sicher! B2 topic), **Partizipialattribute**, **subjektive Modalverben**.

1,000 tests, 0 lint errors, `corpus:validate` and `corpus:audit` both 0 errors.

---

### Shipped 2026-08-25 — two cards were teaching a misspelling

A fifth form-collision shape, and the smallest: **one word carded under two
spellings.** The 1996 reform kept ß only after a long vowel or a diphthong, so
*Schweiß* and *regelmäßig* are right and *Schweiss* and *regelmässig* are not — and
the corpus carried both of both, as separate cards with separate schedules.

Nothing could see them. `corpus:dupes` groups by identical term; `ARCHAIC_SPELLING`
scans example *text* and never looks at a headword; the four existing collision shapes
are about morphology, not orthography. The new shape folds ß to ss and requires the
same part of speech — without that it folds the whole verb/nominalised-infinitive
family together, since *essen* and *das Essen* differ by case alone once the article is
stripped. **Two pairs, both merged**, and `der Schweiß` takes B1 because the misspelled
card was the lower one and a merge never takes a word off the learner who had it.

**Then the merge produced two more defects, and two gates caught them.** The retired
cards' examples come across with them — and those examples carried the misspelling too.
The twin check written this morning fired first («Der Schweiss lief ihm über die Stirn»
now duplicated the keeper's «Der Schweiß lief…»), and a new check written for the second
one caught it on its first run: **an example may not spell the card's own headword with
ss where the headword has ß.** Decidable, narrow, and it found `regelmäßig`'s
«Regelmässiges Training» immediately.

That is the part worth keeping: a merge moves text, and the text can be wrong. The
mechanism had been treating absorbed examples as if they were already vetted.

Also fixed en route: a stale `keep` ruling on `erinnern × sich erinnern`, whose second
card was retired later the same day by the governed shape. Marked `superseded` rather
than deleted, so the record shows the question was asked before the answer changed.

1,000 tests, 0 lint errors, `corpus:validate` PASS. Corpus 6,629 → 6,627.

---

### Shipped 2026-08-25 — eleven adjectives that could not be read

With `authoring:recard` built, the obvious next question was whether `normal` was alone.
It was not.

German's adverbs are, overwhelmingly, adjectives used uninflected — so carding one as an
adverb is not wrong about the **word**. It is wrong about what the app can do with it:
only adjective cards reach `adjIndex` and the de-inflection path, so on an adverb card
«ein plötzlicher Regen», «die gegenseitige Hilfe» and «unabhängige Medien» resolved to
**nothing at all**. A learner reading real German got no credit for a word they know, and
an example written that way was refused by the authoring gate.

**Eleven re-posed**: `natürlich`, `eigentlich`, `gegenseitig`, `plötzlich`, `zunehmend`,
`künftig`, `unabhängig`, `furchtbar`, `einzig`, `gewöhnlich`, `systematisch`. Six of them
were glossed with only the adverbial reading — "suddenly", "actually" — and now name both,
adjective first, because that is the form that inflects.

**Two deliberately left as adverbs.** `ziemlich` and `letztendlich` *can* be adjectives,
and their cards teach the intensifier, which is the reading a learner needs. Re-posing
everything that could be an adjective would be the pattern-instead-of-lexicon mistake.

The check needed narrowing twice before it was believed. "An adverb card whose inflected
form appears anywhere in the corpus" fires 31 times and most are a different word
entirely — `nicht` → *die Nichte*, `mal` → *malen*, `eben` → *die Ebene*, `schon` →
*schonen*. Excluding forms that are themselves cards, and requiring an adjective-shaped
ending, leaves 13, of which 11 survive reading.

Measured: the reader probe's adjective rate 0.94 → **0.95**, which is the eleven new
adjectives entering its population and de-inflecting correctly. Six tests over the
shipped corpus pin the sentences that used to resolve to nothing.

1,000 tests, 0 lint errors, `corpus:validate` PASS.

---

### Shipped 2026-08-25 — the tool six items were waiting on, and the A1 numeral it freed

Six filed items were blocked on the same missing thing, and it was not a hard thing:
nothing could change a vocabulary card's **level, part of speech or headword**.
`corpus:relevel` moves grammar points; `fix-authored` refuses `term`, `level` and `pos`
by design, because changing them is not a field edit — a card id is
`voc:<level>:<term>`, so changing either is a schedule migration.

`authoring:recard` does it properly: expect-guarded like the rest of the family,
carries `ID_MAP`, moves the provenance row **and its level** (provenance stores both,
so a relevel that moves only the id leaves the sourcing disagreeing with the card),
strips a gender and plural off anything that stops being a noun, and refuses a change
that would land on a live id — that is a merge, not a re-card, and it has its own tool.

**Seven cards re-carded**, five of them id changes:

| card | change | why |
|---|---|---|
| `silber` → **`silbern`** | headword | German's adjective is *silbern*; every example on the card used the noun because bare *silber* is barely an adjective |
| `gold` → **`golden`** | headword | same |
| `normal` | adverb → **adjective** | only adjective cards get de-inflection, so «ein normaler Tag» resolved to nothing and the gate refused it |
| `quelloffene Software` | noun → **phrase** | adjective plus noun, no article, failing every noun rule |
| `die Früh` | A1 → **B1** | a southern regionalism competing at A1 with the adverb *früh* every beginner needs |
| `der Leisten` | A2 → **C1** | a shoemaker's last at A2, and its gloss was the single word "last" |
| `die Tausend` | A1 → **B1** | it held the A1 slot for *thousand* |

**And the A1 numeral `tausend` now exists** — which is what the last of those was really
about. `hundert` has been an A1 `number` card for as long as the corpus has; *thousand*
was reachable only as a noun. Two things had to move first: `POS_MAP` mapped
de.wiktionary's *Numerale* to `'numeral'`, which matches no card and no `ALLOWED_POS`
entry, so the gate could not write a numeral at all (fixed earlier today); and the noun
owned the lowercased index key, so every example written for the numeral was refused as
"does not contain tausend".

That second one is fixed by **the mirror of the noun-capitalisation rule**, and it
follows from the same fact. A German noun is always capitalised, so a lowercase match
*disproves* a noun — that is the rule that found 49 defects this morning. The same fact
says something in the other direction: where the matcher hands a lowercase token to a
noun and the card being checked is not a noun, **the noun cannot be what that token
is**. The matcher itself is deliberately untouched; for *reading*, first-wins on a
shared surface form is a separate question with its own trade-offs. But a gate that
cannot tell a numeral from a noun was blocking work it had no business blocking.

993 tests, 0 lint errors, `corpus:validate` PASS, reader probe plural now 200/200.

---

### Shipped 2026-08-25 — 266 pronunciations, and the field where a lookup can be trusted

The same machinery as the plural pass, pointed at IPA — and this is the field it was
made for. A plural carries a judgement the lookup cannot make (*does this noun have a
plural a learner should meet?*); a transcription does not. The only question is whether
the page is about the right word, and the plural pass had already earned the three
guards that answer it: the page must attest the card's part of speech, a page covering
two genders is not trusted for a gendered card, and a headword carrying government
notation is not a page title.

**274 → 8.** IPA presence 95.8% → **99.9%**. The eight left have no de.wiktionary entry
at all — `Einbauschrank`, `Skijacke`, `Snowboardfahren`, five more, every one a compound.

Every batch was read before it was applied, and the transcriptions are right where they
are hardest: `die Regie` /ʁeˈʒiː/ keeps its French, `skeptisch` is /ˈskɛptɪʃ/ and not
/ʃk/ because it is a Greek loan, `halb` is /halp/ with final devoicing, `mailen` is
/ˈmɛɪ̯lən/ and `das Apartment` /aˈpaʁtmənt/.

`fix-authored` gained an `IpaRow` — the fifth row type — with the same expect-guard and
`src` requirement as the rest, plus two checks the field needs: a transcription may not
carry its own `/…/` delimiters (the card renders those, and a stored one comes out
doubled), and a value with no IPA-only character is refused, because that is what a
plain-letter fallback looks like.

**Total warnings across the corpus: 805 → 272**, over this pass and the plural one.

989 tests, 0 lint errors, `corpus:validate` PASS.

---

### Shipped 2026-08-25 — 267 plurals, none of them guessed

`corpus:validate` warned *noun without plural* on **471** cards. The shortcut is
obvious and wrong: 160 of them end in a suffix whose plural is morphologically
decidable — `-ung`, `-heit`, `-keit`, `-ion` all take `-en` without exception — so a
rule could fill them in one pass. It would be wrong on most of them. German *permits*
«die Höflichkeiten» and «die Transparenzen»; they are not what a learner should be
taught, and both mean something else than the singular on the card. **Morphology is
decidable; whether a noun has a plural in use is lexical**, and lexical questions get
looked up.

`authoring/fetch-plurals.ts` reads de.wiktionary through the same cached fetcher the
authoring gate uses and proposes one of three things per card: an attested Nominativ
Plural, "nur Singular" where the entry is a Singularetantum, or nothing. **471 → 204**,
and every batch was read before it was applied.

**The instrument got narrower four times, each time because a hand-check caught it.**

- *`die Teilhabe` → «die –».* The parser strips an em-dash and not an en-dash, so a
  punctuation mark was proposed as a plural form.
- *`das Erbe` → «die Erben».* That is the plural of **der** Erbe, the heir. German
  wiktionary puts both genders on one page and the neuter card got the masculine's
  plural. Now: where the attested genders do not include the card's own, the lookup is
  reported rather than believed.
- *`die Transparenz` → «die Transparenzen»* (overhead transparencies), *`die
  Höflichkeit` → «die Höflichkeiten»* (pleasantries). Attested, same spelling, different
  word. Nouns in the abstract suffixes are now reported for a ruling, never proposed.
- *`die Schweiz` → «die Schweizen».* A country has no plural. **This one was applied
  before it was caught**, because I ran two batches without reading them — the only
  time all day I skipped that step, and it was the batch that had the defect in it.
  Fixed, and `Countries` is now settled by sector before the lookup runs at all.

Also **51 proper nouns were removed from the warning entirely**: Deutschland, Österreich,
Kenia carried *noun without plural* permanently, and a warning nobody can ever clear is
one everybody learns to scroll past. The corpus writes every ordinary noun with its
article, so "no article in the term" is the test.

`fix-authored`'s plural guard was widened to accept "nur Singular" and "—". It insisted
on a `die …` form, which meant the nouns that genuinely *have* no plural had no way to
say so — 420 cards could not be resolved in either direction.

Total warnings 805 → 538. 989 tests, 0 lint errors, `corpus:validate` PASS.

---

### Shipped 2026-08-25 — the fourth collision shape, and the matcher bug it was hiding

Closing the governed-verb shape filed the same day, and fixing what finding it exposed.

**27 pairs ruled: 11 merges, 16 keeps.** The corpus writes a verb's fixed preposition into
the headword on purpose — `warten auf + A` — because the preposition is the fact a learner
has to memorise and cannot derive. The side effect is that every duplicate check is blind
to it: `beitragen` and `beitragen zu + D` shipped the **same example sentence**, and `sich
erinnern` and `sich erinnern an + A` were one card twice at one level. As with the
reflexive shape, the majority are two real senses — `bestehen` (pass an exam) against
`bestehen aus` (consist of), `gehören` (belong to somebody) against `gehören zu` (be one
of). Two merges run the other way, where the *pattern* card was the stray: `auswandern aus
+ D` pins a preposition the verb does not require, and `füllen in + A` is not a government
at all.

**The matcher defect underneath it.** A reflexive governed pattern was matching on its
preposition alone, so `sich erinnern an + A` claimed «Das Lied erinnert mich an meine
Kindheit» — a transitive sentence with no reflexive in it. Two costs, and the second is
what made it visible: it credits a learner with a pattern card the sentence does not
contain, which is the inflation `patIndex` exists to prevent; and it made the plain
`erinnern` card **unillustratable**, because the authoring gate refused every example
written for it on the grounds that the matcher attributed the token elsewhere.

The decidable test is **person agreement**, not "is there a pronoun": *mich* is reflexive
after *ich erinnere* and an ordinary accusative object after *das Lied erinnert*.
`patIndex` now records which persons each indexed form can be, and a reflexive pattern
requires the matching pronoun.

**The Partizip II had to be separated out**, and that is the part worth remembering: for
every weak verb it is spelled exactly like the 3rd singular — *erinnert*, *gefragt*,
*bedankt* — so folding it into the person set as "unknown" threw the agreement away for
precisely the commonest form, and the first version of the fix changed nothing. It is
tracked on its own now and admits any reflexive pronoun only where an auxiliary makes the
participle reading live.

Reader probe **bit-identical** across the change (verb 0.958 · plural 0.990 · adj 0.945),
which is what should happen when nothing it samples is a governed reflexive. Five tests
pin the behaviour, including that a bare «Ich warte» still does not credit `warten auf + A`.

**Six plain-card examples fixed**, every one the governed pattern sitting on the bare
verb's card: `denken` illustrated «Ich denke an dich», `warten` with «Ich warte auf den
Bus», `bitten` with the um-pattern, and `verfügen` — glossed "to decree" — with the
über-pattern. `erinnern`'s could only be written *after* the matcher fix, which is the
end-to-end proof that the fix was the right one.

**The recap now names drill work separately.** Flips and drills were one `done` figure, so
the interleaved drills — the harder half of a session, and the half a learner has to be
talked into — were invisible in the only place the app says what the session was. It
reports right-of-total rather than a bare count, and the delta rides on the undo history
entry so *Previous card* cannot drift the display from the truth.

**A stale item struck.** *Grade from the front face without flipping* (#13) is already
built and the code says so — `grade()` is commented "no reveal required", the key handler
has no `flipped` guard, and a swipe grades from the front face. The fourth item this week
found already done.

**A gate bug found in passing:** `POS_MAP` mapped de.wiktionary's *Numerale* to
`'numeral'`, which matches no card and no `ALLOWED_POS` entry — so `authoring:new` could
not write a single numeral. Caught trying to add `tausend`, which the corpus is still
missing because the noun `die Tausend` claims the surface form. Now filed with a measured
cost rather than as "a card hard to defend".

Corpus 6,639 → 6,628 cards. 970 tests, 0 lint errors, `corpus:validate` and `corpus:audit`
both 0 errors.

---

### Shipped 2026-08-25 — the reflexive shape, and half a codemod that would have broken 273 classes

Ten backlog items driven through. Seven fixed, two declined on the record, and **two
turned out to be already done** — which is the standing rule paying out again: the four
adjectival nouns carded twice are down to zero, and the 370 cards with an empty `pos`
are also zero. Neither entry had been struck. Re-measure before building.

**The reflexive form-collision shape, ruled and merged.** BACKLOG has carried three open
shapes since August; this closes one. `findFormCollisions` now sees a verb carded both
plain and with `sich`, and every one of the **23 pairs** it finds carries a written
ruling: **7 merges, 16 keeps.**

The ratio is the finding. This shape *looks* like the singular/plural one and behaves
nothing like it, because German uses the pronoun to change what the verb **means**, not
merely who it acts on. `vorstellen` introduces somebody and `sich vorstellen` introduces
yourself; `unterhalten` maintains and `sich unterhalten` chats; `verabschieden` passes a
law. Merging those would have deleted real vocabulary. The seven that merged are one verb
filed twice, and the plain card gives itself away every time — `beschweren` glossed "to
complain" (the plain verb weighs things down) illustrated with «Er hat **sich** beim
Manager … beschwert». One merge runs the other way: **`sich besichtigen` is not a verb**,
and its only example was «Das Museum lässt **sich** … besichtigen» — `lassen + sich +
Infinitiv`, the passive substitute, with the pronoun belonging to *lassen*. A card minted
from a construction rather than a lemma.

`merge-forms` refused to run at first, and was right to: an August `keep` on `der
Bekannte` × `die Bekannte` pointed at two cards the adjectival-noun dedupe had since
folded into one. Rulings now carry a `superseded` field, so the record of a question
asked twice and answered differently survives instead of the row being quietly deleted.

**Ten content defects came out of reading those 23 pairs.** `erinnern` was glossed "to
remember", which is the *reflexive's* meaning — plain erinnern reminds somebody of
something. `aufregen` was glossed "to excite" against two examples about people getting
angry. And four plain cards had nothing but reflexive examples.

**The amber codemod, both halves.** `--color-amber` held Atlas blue and was down as an
XS rename. It is not: the token lives in `@theme`, so Tailwind auto-generates
`text-amber`, `border-amber` and `bg-amber` from it, and there were **273 usages across
50 files**. Renaming the token alone compiles, passes the typecheck, and silently points
every one of them at a variable that no longer exists. 18 token occurrences plus 273
utility classes, leaving BrainRoom's four genuine `amber-300` alone — and verified by
grepping the *built* CSS for `.text-accent{color:var(--color-accent)}`, not by trusting
the build to go green.

**Concept search (#38).** Re-confirmed absent, then built. A search box on Library
filters all 140 points across every level into a flat, level-badged list. It searches the
rule text as well as the title, because a learner mostly does not know the German name of
what they are looking for — "polite" reaches Konjunktiv II, "reported speech" reaches
Konjunktiv I — with title matches ranked first so the point that *is* the word is not
buried under the points that merely mention it. The predicate was **moved out of the
component into `lib/grammar.ts` so it could be tested**: the preview pane in this
environment reports `innerWidth: 0`, which makes every rect a lie (LESSONS: a check whose
subject list is empty passes silently), so the verification is seven tests against the
shipped bank rather than a screenshot I could not trust. One of them proves each hit's
index still routes to the point it names, which is the failure that would matter.

**Mobile keyboard hints (#16) — three quarters already done.** Race, Read and the exam
letter carried the attributes; the drill answer input, which the item names, did not.

**Two items declined, with reasons.** *Tokenizer: split fused paste artifacts* says to
gate the rule behind a per-language interface rather than hardcode German — and there is
no per-language interface in `src/`, so the only way to build it today is the thing the
item forbids. It unblocks when the second language pair lands. *The FAB overlaps the
treemap* says in its own text that it needs a ruling on which trade to spend, not a
script; a speculative fix to the app's primary action is what this file has been burned
by before.

**And a fourth collision shape, found and filed rather than half-attempted.** The
reflexive pass could not explain why `erinnern` refused every example written for it. It
is because **27 verb lemmas sit on more than one card once government notation is
stripped**, and `erinnern` sits on three. The governed card claims every surface form of
the verb, so the plain card cannot be illustrated at all — `voc:B1:erinnern` still
carries a reflexive example under a corrected gloss, because the authoring gate refuses
every replacement on the grounds that the matcher attributes the token elsewhere. That is
filed with the measurement.

Corpus 6,646 → 6,639 cards. 965 tests, 0 lint errors, `corpus:validate` and
`corpus:audit` both 0 errors.

---

### Shipped 2026-08-25 — a B2 homework page, and the drill that taught «ihr würdet sein»

A real Sicher! B2 page (Lektion 1, Modul 4) was handed over with one question: **could
a learner get to this from Lexi alone?** Three reading texts about migration and
identity, then a paired TELC task — plan a multicultural school festival with your
partner, propose, agree, counter-propose. Answering that honestly meant measuring
three things rather than one.

**Vocabulary — 80 headwords from the page, checked against the corpus with the app's
own matcher.** 61 had a card, 6 resolved through a compound or a relative
(*Autohersteller* → *Hersteller*), 13 had nothing. Eight are now authored through
`authoring:new` — `der Ausländer`, `multikulturell`, `zerrissen`, `der Schulabschluss`,
`die Informatik`, `der Kommilitone`, `wiedergeben`, `inmitten` — taking the page to
**69 of 80 direct**. The five still missing are one text's description of somebody's
hair and clothing; *flechten*, *der Zopf*, *farbenfroh* and *der Keks* are not what
stands between a learner and this page.

**Grammar — everything the page needs exists.** Konjunktiv II at three levels,
Plusquamperfekt with *nachdem*, Passiv Präteritum, Relativsätze, *Adjektive als Nomen*
for «die Fremden». That is the good news, and it is not the finding.

**The finding: the B2 Konjunktiv II point has 156 exercises and six of them teach.**
The other 150 are `er ___ festlegen.` → *er würde festlegen*, a conjugation table with
a vocabulary list poured through it. The same shape covers **968 items across 10
points** — B1 Konjunktiv II, B1 Plusquamperfekt, B1 Futur I and B2 Konjunktiv II are
each **6 authored of 156**; A2 Konjunktiv II and A1 Perfekt are 10 of 160. `GrammarDrill`
already spends authored items first and caps a sitting at 25, so they are not crowded
out of *order* — they are crowded out of *supply*: 19 of every 25 items in a sitting on
Konjunktiv II are table-filling, for a form whose difficulty at B2 was never the form.

**And seven of those generated items teach German that is wrong.** Four ask for a
würde-form of a verb that has its own Konjunktiv II — «ihr ___ sein.» marks *würdet
sein* correct where German is **wärt** — with the point's own rule, on the same screen,
saying so. Three pair a weather verb with a personal subject: «ich würde regnen», «ich
werde hageln». This is the rule-panel contradiction of 2026-08-24 one layer down: there
the panel disagreed with the question, here the question disagrees with the panel.

All seven are **repaired in place, never deleted** — exercise ids are positions
(`gex:<level>:<point>:<index>`) and every learner's FSRS schedule is keyed on them, so
removing one silently re-points every later schedule. That needed a tool the authoring
family did not have: `fix-exercises.ts`, expect-guarded like `fix-authored`, which
refuses any batch that would change a point's exercise count and checks that invariant
after writing rather than trusting it. The repairs turn each defect into the lesson it
should always have been: «ihr ___ jetzt bestimmt lieber zu Hause. (sein)» → **wärt**.

**A gate so the generator cannot make them again**, in `corpus:validate`. It was too
wide on its first run and is narrower now: *tauen*, *blitzen*, *donnern* and *dämmern*
all take ordinary personal subjects — «der Schnee taut», «ihre Augen blitzten» — so the
obvious "weather verbs" list flagged three correct items. Only precipitation is
genuinely subjectless. See LESSONS, class 2.

**Twenty exercises that drill the move rather than the form.** Nothing at any level
drilled Konjunktiv II *as a proposal*, which is the only thing the page's speaking task
uses it for. Six at A2, six at B1, eight at B2, covering making a suggestion, accepting
one, and countering without contradicting — including the item that closes the
negotiation: «Gut, dann ___ wir uns ja einig» takes the indicative, because knowing when
to *stop* using the Konjunktiv is part of the form.

Adding them needed `corpus:gex` widened. It refused `type`, `order` and `error` outright
— a limitation of its checker, not a ruling, since the bank has always held all five
kinds and the authored items in a typical point are exactly the ones four options cannot
express. Refusing them meant every appended exercise had to be multiple choice, which is
a large part of how the tense points came to read like tables. Each kind is now checked
on its own terms.

**Two things the authoring gate refused, and it was right both times.** `verheiraten`'s
second example was «Er ist seit zehn Jahren mit ihr verheiratet» — the adjective, not
the verb, the same class as `die Braut`/«braut». And the card itself is **dropped, not
fixed**: `verheiratet` already exists at A1, so adding the verb would grow the
verb/participle-adjective collision that BACKLOG still lists as unruled. `wiedergeben`'s
«Sie gab das Gespräch fast wörtlich wieder» was rejected because the matcher cannot
resolve a separated separable verb — the third hand-verified instance of a gap already
filed, and now costing a real card a real example.

Bank 6,193 → 6,213 exercises; corpus 6,638 → 6,646 cards. 958 tests, 0 lint errors,
`corpus:validate` and `corpus:audit` both 0 errors.

> The reader probe moved — verb 0.942 → 0.933, adj 0.960 → 0.945, plural 0.985 → 0.990 —
> and that is the per-class seeding working, not a regression: eight new cards grew the
> verb, adjective *and* noun populations, so all three re-rolled their own samples. Every
> class stays far above its floor.

---

### Shipped 2026-08-24 — eighteen cards carried the same sentence twice

Second session on the sense band, and it did not find what it went looking for.
`corpus:sense` ranks cards by how little their gloss overlaps their examples'
translations; reading the top 60 as a set — rather than one at a time, which is the
whole lesson from the noun-case pass — the *glosses* were mostly fine. What kept
recurring was the pair underneath them:

| card | ex[0] | ex[1] |
|---|---|---|
| `gerne` | «Gerne.» | «Gerne!» |
| `aha` | «Aha!» | «Aha.» |
| `schreien` | «Schreien Sie.» | «Schreien Sie!» |
| `die Welt` | «Hallo Welt!» | «Hallo, Welt!» |
| `zufolge` | «Ihr zufolge kommt er nicht.» | «Ihr zufolge, kommt er nicht.» |
| `solange` | «Bleib, solange du willst!» | «Bleib, solange du willst.» |

**18 cards, and the rule they break is the two-example rule.** `corpus:validate` has
always warned under two examples; these satisfied it with one sentence and a different
final punctuation mark. The card looks stocked, the second review teaches nothing, and
on twelve of the eighteen the "two" examples were a single word («Egal!» / «Egal.»).

**20 examples rewritten, 4 deleted.** The deletions are the cards that had spare good
examples: `der Erfolg` carried six with a duplicate among them, and `die Ware`'s first
two were «Wo waren Sie?» / «Wo waren sie?» — where *waren* is the preterite of *sein*
and the card's own word appears in neither, so both went and three real ones remain.

**Four glosses came off the same reading**, all the shape the last pass named — a
dictionary's note sitting where the English belongs, or a gloss that contradicts the
card's own definition. `drüber` was glossed **"contraction of darüber"**; `Verzeihung`
**"Used to get someone's attention. excuse me, pardon me"**, a usage note fused onto
the front with a full stop mid-field, over a definition that read only "forgiveness";
`solange` **"meanwhile"** while both examples are the conjunction *as long as* and the
definition said so; `knapp` **"scarce"** while both examples are *that was close*.

**Two examples were set in 16th-century type** and are gone: `die Mitternacht` — an
**A1** card — carried «Alſo auff der andern ſeiten / gegen mitter⸗nacht ſollen auch
zwenzig bret ſtehen», and `augenscheinlich` a Gottfried Keller quotation in the same
printing. `ARCHAIC_SPELLING` could never have caught either, because it matches
*spellings* (daß, muß) and these are *characters*.

**Both new rules gate now**, in `corpus:validate`, and both were proved by injection
before being trusted — a twin and a long-s pushed into the corpus, watched to fail,
reverted. Eleven tests pin them.

**What is deliberately not gated, and the number that would have been wrong.** Widen
"the same sentence twice" by a hair and it stops being decidable: **86 cards** have an
example pair above 0.90 character similarity and **143** have two examples with
byte-identical English. Reading that band, a real share are *deliberate and good* —
`der Kopf` teaches «Mein Kopf tut weh» beside «Mir tut der Kopf weh», which is the
dative construction and the entire reason to have two; `der Berliner` has «Ich bin
Berliner» / «Ich bin ein Berliner»; `das Museum` has «am Montag» beside «montags». A
check over that band would delete the best pairs in the corpus. It is filed as a
reading list instead. Same shape as the 88 from this morning: one half of an idea is
decidable and the other half is judgement. See LESSONS, class 2.

958 tests, 0 lint errors, `corpus:validate` 20 errors → **0**, `corpus:audit` 0 errors,
reader probe unchanged (verb 0.942 · plural 0.985 · adj 0.960).

---

### Shipped 2026-08-24 — «Er braut Bier» was teaching the word *bride*

The `alle` pass ended by filing five cards it could not fix by correcting the gloss,
because on those it is the **examples** that are wrong. Reading them for a pattern
turned up something better than five fixes: three of them fail the same *decidable*
test, and German supplies it for free.

**A German noun is always capitalised.** So if the only token in a sentence that
resolves to a noun card is lowercase, that token is the homograph and the headword is
genuinely absent — no judgement required. `matcher.ts` indexes lowercased surface
forms, which is right for reading (a learner meeting «BRAUT» in a headline still knows
the word) and wrong as *evidence*, and the authoring gate had been asking the matcher
the evidence question all along.

**49 examples on 32 cards, and on 17 of them every example was like that** — the card
taught nothing correct at all:

| card | shipped example | what the sentence actually contains |
|---|---|---|
| `die Braut` — bride | «Er braut Bier.» ×2 | *brauen*, to brew |
| `der Schritt` — step | «Wer schritt ein?» ×2 | the preterite of *einschreiten* |
| `die Naht` — seam | «Das Ende naht!» | *nahen*, to draw near |
| `der Bedarf` — need | «Es bedarf der Übung.» ×2 | *bedürfen*, 3sg |
| `das Rennen` — race | «Pferde rennen.» | *rennen*, to run |
| `der Rahmen` — frame | «Können Sie das Bild rahmen?» | *rahmen*, to frame |
| `die Tiefe` — depth | «Er hat eine tiefe Stimme.» ×2 | the adjective *tief* |
| `der Samt` — velvet | «…eine Orange samt Schale» | the preposition *samt* |
| `das Los` — lottery ticket | «Muss los!» | the particle *los* |
| `der Tod` — death | «Sie war fast tod.» | the adjective — and misspelled, it is *tot* |

Every one hand-read; all 49 were defects. **57 examples on 34 cards are rewritten**,
which is the 49 plus four the reading found beside them that the rule cannot see —
`die Weise` led with «Weise Worte!» (the adjective, capitalised only because it is
sentence-initial), `der Schnitt` with «Er schnitt Grimassen», `die Klage` with «Klagen
nützt nichts» (singular *nützt*, so it is the nominalised infinitive, not the plural
noun), `die Angel` with «Er ging angeln» — and the two remaining cards from the filed
five: `wild`, illustrated only as the noun *der Wilde*, and `aber`, an A1 card glossed
*but* whose two examples were both the modal particle and whose **definition described
the particle too**, so gloss and definition disagreed on which word the card was for.

**The rule is now a gate in three places, which is the point of the entry.** The
defect existed because `exampleTeachesWord` — the check that "refuses to write a card
it cannot verify" — asked only whether *some* token resolved. `headwordEvidence` in
`scripts/corpus/lib.ts` is the shared rule now: `corpus:validate` errors on it,
`fix-authored` refuses a replacement that has it, and `authoring:new` cannot write one.
Proved by injection before it was trusted — fed «Tom braut jeden Samstag Bier» for
`die Braut` and a sentence with no *Schritt* in it, and watched both come back refused
with different reasons. Five tests pin it.

**The mirror check is deliberately not enforced, and that is the lesson.** Written wide,
the same idea also flagged verbs and adjectives proved by a capitalised token, and
reported **137**. The extra 88 are mostly ordinary German — «beim Tanzen», «bei Rot»,
«im Wesentlichen» are nominalisations of the very word being taught — and "fixing" them
would have made cards worse. Lowercase *disproves* a noun; capitalisation proves
nothing about a verb, because nominalisation is available to everything. The 88 stay
open under the reading order in `corpus:sense`, where at least one (`wild` → «Seid ihr
Wilde?») was a genuine defect and nothing mechanical separates it from the rest. See
LESSONS, class 2.

Two glosses were repaired on the way past, both broken fields rather than judgements:
`das Vorhaben` was glossed **"gerund of vorhaben"** — a dictionary's grammatical note
sitting where the English goes, and the string recall mode grades against — and
`die Angel` **"tackle, fishing rod, line, and rod)"**, its own definition truncated
mid-parenthesis into four senses, two of which are parts of the object.

One new sentence was rewritten a second time before it landed: «Machen Sie bitte einen
Schritt nach vorn» opens with an imperative, which the word-order builder leaves
capitalised — the acknowledged 23.7% residue of the tile-casing fix — so it became
«Bitte machen Sie…» and stopped announcing position 1. Checked mechanically against
`citationTiles`, not by eye.

952 tests, 0 lint errors, typecheck and build green, `corpus:validate` 49 errors → **0**.
The reader probe came out bit-identical (verb 0.942 · plural 0.985 · adj 0.960), which
is what should happen when 57 sentences change and no indexed form does.

---

### Shipped 2026-08-21 — the conjugation drill printed «gelten als + t» as the answer

Third drill audited, third defect, and this one had already been fixed once — somewhere
else. `matcher.ts` learned on 2026-08-20 that *a term is not always a lemma*: the corpus
writes government notation into the headword on purpose. The conjugation drill never got
the memo.

**Three cards printed invented German as the correct answer**, all hand-verified:

| card | *ich* form | Partizip II |
|---|---|---|
| `gelten als + N` | «gelten als + e» | **«gelten als + t»** |
| `sich etwas vorstellen` | «etwas vorstelle» | **«geetwas vorstellt»** |
| `sich wenden an` | «wenden ae» | **«gewenden at»** |

**And 57 reflexives were rendered without their pronoun.** `conjugate` strips `sich`
before inflecting, so `sich fühlen` at *ich* returned the bare «fühle» — real German, but
not what a learner has to produce. This project had already ruled on exactly that:
`canTransform` excludes reflexives because *"the finite form alone drops the pronoun's
`mich`… grounded means never showing a sentence fragment that is actually wrong."* The
ruling was applied to the transform drill and not to this one, while `ReflexiveItem` sat
there doing it properly.

`conjDrillable()` is now the single gate behind the pool and eligibility, on one
decidable rule — *after stripping `sich`, a term still carrying a space is a phrase, not
a lemma* — plus the project's own reflexive ruling. **A hole it opens is filed, not
hidden:** nine to eleven *separable* reflexives (`sich vorstellen`, `sich ausruhen`) now
have neither drill, because `isReflexive` additionally requires `!separable`. That trade
was taken deliberately — a card losing coverage is a smaller harm than a card teaching
wrong German — and BACKLOG carries the fix, along with two conjugator bugs found beneath
it (`wohlfühlen` and `vorbereiten` both return `separable: null`).

**What the audit found clean is worth recording too.** Simulating all **34,348**
conjugation items over 1,108 verbs: **zero** with fewer than four options, **zero** where
a distractor is also correct, and **zero** where the answer is the only option of its
word-count — which verifies the claim in `ConjItem`'s own comment that a phrasal answer
(Perfekt, Futur I, Konjunktiv II) is not given away by being the only multi-word choice.
Gender is clean by construction: three fixed buttons, no pool to leak.

Both audit numbers arrived wrong first. The thin-option count read 1,588 until the
simulation included the *pad* the real item runs; the corruption count read 2 until a
heuristic was replaced by the decidable rule above. Recorded in [AUDIT.md](AUDIT.md),
which is the ledger for this pass.

926 tests, 0 lint errors, typecheck and build green.

---

### Shipped 2026-08-24 — the `alle` class, sized honestly and seven of it fixed

`alle` — glossed *finished*, illustrated twice with the pronoun *everybody* — was found
by playing the app and fixed on the 21st, and the class it belonged to was left open with
"size unknown". An earlier attempt to size it reported 665 and was wrong about all twelve
hits checked, because a shell-escaped stemmer regex silently stripped nothing. So this
pass starts with a **stemmer self-test that refuses to rank anything if it fails** — and
it did fail, twice, before a single card was scored.

**The instrument is a reading order, not a detector.** `npm run corpus:sense` scores each
card on how much its English gloss overlaps its examples' translations, and ranks the
lowest first. A card can score zero and be perfectly fine, because a good translation
paraphrases — *auflösen* "to dissolve" against «Before moving to Canada she had to give
up her flat» shares no word at all. So the score only decides what to read, and every
number below was read.

**What that yields, and the number the class actually needed:**

| | population | hand-read | defects | yield |
|---|---|---|---|---|
| zero-overlap band | 698 (10.8%) | 33 | **12** | ~36% |
| unbiased random draw | all 6,452 | 18 | **0** | ~0% |

So the class is real and much larger than the one card previously confirmed — and it is
**concentrated rather than diffuse**. The band is worth working; the corpus at large is
not obviously rotten. With 0 of 18 the prevalence is bounded loosely, not counted, and it
is left that way.

**Seven fixed, by correcting the gloss.** In each the examples are good German and the
gloss simply did not describe them: `ausfallen` was glossed **"to sortie, to sally"**
while both examples are «Der Server war ausgefallen»; `das Mittel` "agent, appliance"
against «Er hat unendliche Mittel» — funds; `abbauen` "to dismantle" against «Stress
abbauen»; `abhauen` "to cut off" against «Ich muss abhauen»; `abhängen` "to depend"
against «mit uns abhängen»; `vertreiben` "to force to leave" against «sich die Zeit
vertreiben». And `ambulant` was glossed **"ambulant"** — its own English cognate, and a
false friend: German *ambulant* is medical *outpatient*, English *ambulant* means able to
walk. Glossing a false friend with itself teaches the trap instead of the word.

**Five filed rather than fixed**, because there the *examples* are wrong, not the gloss —
`die Braut` illustrated with «Er **braut** Bier» (the verb *brauen*), `wild` with «Seid
ihr **Wilde**?» (the noun), `das Durcheinander` with «Tom ist **durcheinander**» (the
adverb), and `aber` — A1, glossed "but" — whose two examples are both the modal particle
and never the conjunction. The first three are `alle` exactly: the letters are present so
the authoring gate's matcher is satisfied, but the word in the sentence is another
lexeme. Also filed: `voc:B1:aneignen` duplicates `voc:B2:sich aneignen`.

947 tests, 0 lint errors, `corpus:validate` PASS.

---

### Shipped 2026-08-24 — the rule panel contradicted the question it was attached to

Both from playing a real session, and reported with screenshots.

**«Hier ist der ___ König» opened a page about verb endings.** The item asks for an
*adjective ending*; the panel underneath it opened `Personalpronomen (Nominativ)`, whose
text reads *"The subject pronoun decides the verb ending."* Right case, wrong system —
and worse than merely unhelpful, because it answers a question the learner was not asked
and quietly implies the two are the same thing.

The cause is that `CASE_POINT` keys on the **case**, and the Kasus drill builds two very
different items under one case: *which article?* and *which adjective ending?* Only the
first is really about the case. `buildCaseItem` already knew which declension it had
chosen — weak, mixed or strong — it simply did not return it, so the item had nothing to
link on. It does now, and an adjective item opens the page that teaches that declension:
`Adjektivdeklination: nach bestimmtem Artikel (schwach)` and its two siblings. The label
names it too, so the panel header says *Adjektivdeklination · after the definite article*
rather than just *Nominativ*.

This is the same defect `CASE_POINT` was introduced to fix one level up — its own comment
says it exists "because a Futur I card opened the Perfekt rule". Same mistake, one grain
finer. Both maps are now checked against the shipped lexicon by a test, because a rule
link that resolves nowhere fails silently: the panel just does not open.

**«durch den ___ Mittag» is not German.** `durch` needs a noun you can pass *through*,
and the drill pairs a preposition with any noun in the corpus, so it produced that and —
with the adjective flavour — «durch den neuen Mittag». Removed from the Akkusativ
prepositions for exactly the reason `während` was never in the list, which the code
already says out loud: *"it only takes temporal nouns («während der Lampe» is nonsense)"*.
`für`, `ohne` and `gegen` read plausibly with almost any noun, and `gegen` even keeps its
temporal sense («gegen den Mittag»).

947 tests, 0 lint errors.

---

### Shipped 2026-08-24 — the builder was spelling its own answer, and the Vorfeld is now taught

Two rulings from the maintainer, and both changed the shape of the work.

**"Don't narrow the drill."** The sentence-builder accepts one word order where German
permits several, and the two fixes on the table were to restrict the pool or to pin
position 1 in every prompt. Both make the check honest by *hiding* the flexibility — and
that flexibility is one of the characteristic things about the language. So the drill
keeps its whole pool, and the freedom became content instead.

**New A2 point: `Das Vorfeld: was vor dem Verb steht`** (10 exercises). The bank
mentioned this three times and never showed it: A1 closes with "the verb placement is
fixed — the rest can move", B1 gives it one section and one example, C1 ends with
"emphasis can front one element". **The word *Vorfeld* did not appear in the bank at
all.** The point puts one sentence on the page four ways — *Ich fahre morgen mit dem Zug
nach Köln* / *Morgen fahre ich…* / *Mit dem Zug fahre ich…* / *Nach Köln fahre ich…* —
says what each one puts in focus, and drills the constraint that makes «Morgen ich fahre
nach Köln» wrong: one element before the verb, not two, which is the commonest word-order
error an English speaker makes. `GRAMMAR_COUNTS` 139 → 140 points, 6,183 → 6,193.

**And the builder was giving the answer away — a bigger defect than the one that started
this.** German capitalises the first word of a sentence *and* every noun, so a tile's
capital carried two different things: *I am a noun*, which the learner needs, and *I was
first*, which is the whole answer. «Ich · treffe · meine · Freunde · am · Wochenende»
could be solved without reading any German. Tiles now render in **citation case** and
grading ignores case, since case was never something the builder let the learner choose.

**4,565 of 6,020 drills (75.8%) are corrected.** The first pass covered function words —
ich, mein, heute, der, was — and playing the drill afterwards found the next group:
«Habt ihr Hilfe angeboten?» still showed *Habt* capitalised among lowercase tiles.
Auxiliaries and modals are a closed class, so they could be added. **The remaining 23.7%
are left leaking on purpose**, and each is an *open* class — imperatives (Mach, Öffne),
full finite verbs (Kommst), adjectives (Nächste). Enumerating those is the
pattern-instead-of-lexicon mistake LESSONS records, and the obvious lexicon does not help:
`lookupSurface` is case-sensitive by design — its own comment is *"`Essen` stays the noun
and `Morgen` stays the morning"* — so asking it about a capitalised first token resolves
*Können* to the noun *das Können*, and acting on that would lowercase a real noun. `sie`
and `ihr` are excluded deliberately: the formal *Sie* is capitalised everywhere and no
token distinguishes it.

**A fronting chunker was prototyped and rejected**, which is the honest reason the
general builder still accepts one order. Over eight sampled sentences only three of its
suggested frontings were valid: it offered them for W-questions («Was sind Sie von Beruf»
→ «Von Beruf sind Sie was»), across a coordinating *und*, and for adverbs nested inside a
prepositional phrase («seit **heute** Morgen»). Every sample batch surfaced another
invalid class — the signature of an approach that cannot be patched into soundness — and
accepting a wrong order teaches bad German, which is worse than rejecting a good one.

**"Duplicates aren't acceptable."** Four adjectival nouns were carded twice, *Bekannte*
three times. `corpus:dupes` groups by identical term and `der/die Bekannte` ≠ `der
Bekannte` as strings, so they were structurally invisible to it — the same blind spot the
singular/plural pairs had. The `set.term` added earlier today makes them expressible:
normalise the headword, and the two that land at another level are handed on to
`corpus:dupes`, which keeps the lower one and unions the content. Done in two passes,
because `byId` is built once and two rows renaming onto the same target in one run would
both write that id. **6,642 → 6,637**, content absorbed rather than lost — *Verwandte*
3→6 examples, *Bekannte* 5→6, *Vorgesetzte* 3→5, *Abgeordnete* 3→5 — and `ID_MAP`
1,398 → 1,404 so no schedule is stranded.

944 tests, 0 lint errors, `corpus:validate` PASS.

---

### Shipped 2026-08-24 — fix the engine, not the sentence

Two cards from the negation homework — `überreichen` and `aushändigen` — were held back
because the authoring gate refused their examples. The easy way out was to rewrite the
examples into the bare-infinitive frame, which is the one frame the matcher always
handles. **That is the content bias BACKLOG already warns about**: it pushes every
separable verb's examples toward the one shape where the prefix never moves, which is
the shape a learner least needs to see. So the engine was fixed instead, and both cards
went in with the sentences the homework actually used.

- **`überreichen`** was unsplittable because `über` sits in neither prefix list — German
  uses it both ways, and the file resolves that ambiguity by data rather than by rule.
  It gets a table row like `übersetzen`, `überlegen` and `überzeugen` before it:
  inseparable, so **überreicht** with no `ge-`.
- **`aushändigen`** splits on `händigen`, a bound root — modern German has only
  *aushändigen* and *einhändigen*, never the bare verb — so it was missing from
  `SEED_ROOTS` and the whole compound came out as **geaushändigt**. Added; `einhändigen`
  is fixed by the same row.

Both now conjugate correctly and both cards passed the gate **with their original
examples**: «Der Präsident überreichte dem Sieger die Medaille» and «Das Geld darf nur
dem Kontoinhaber ausgehändigt werden». **6,640 → 6,642.**

**And the gate's own guarantee is now measured: 60 of the corpus's 1,212 verbs are
declined by the engine** — almost all of them pattern cards whose headword deliberately
carries government notation (`verzichten auf + A`, `gehören zu + D`) or a disambiguator
(`ansprechen (Person)`). Every one produces nonsense if inflected, and every one is
`reliable: false`, so the drill never sees them. That is the property which meant the two
verbs above were never *wrong* on screen, only missing — and it is now pinned by a test
using real shipped cards rather than an invented word.

931 tests, 0 lint errors, `corpus:validate` PASS · verb probe 0.937 → 0.942.

---

### Shipped 2026-08-24 — a headword that was not German, and four words carded twice

`voc:B1:der Vorsitzender` had **both halves inverted**. Adjectival nouns decline like
adjectives, so the form depends on what precedes them: strong *ein Vorsitzender*, weak
*der Vorsitzende*. The headword as it stood — *der* plus the strong form — is not German
in any context. Its plural then held the **feminine singular** (*die Vorsitzende*) where
it needed *die Vorsitzenden*. Fixed, along with `der Einzelne`'s missing plural.

**The class already had a settled convention, which is what made the two stand out:**
nine cards read `der/die X` with plural `die Xen` — Bekannte, Verwandte, Angestellte,
Reisende, Abgeordnete, Vorgesetzte, Beschäftigte, Geflüchtete, Wahlberechtigte. So the
fix was to join it, not to invent something. `der Beamte` deliberately stays outside:
its feminine is *die Beamtin*, a separate word, so the der/die form would be wrong there.

**`genderfix.ts` gained `set.term`.** It could already move an id when a corrected
*article* changed the term; it could not when the corrected *noun form* did, and the two
need exactly the same machinery — collision guard, cumulative `ID_MAP`, absorbing a
retired card's examples. The rename block moved out of the gender-only branch and now
runs from either cause. `ID_MAP` 1,397 → 1,398, so no learner's schedule is reset.

**And the class turned out to hold four duplicates**, which is the larger finding and is
filed rather than fixed: *Bekannte* is carded **three times** (`A1:der/die Bekannte`
plus a male and a female card at B1), and *Verwandte*, *Abgeordnete* and *Vorgesetzte*
twice each — two of those **at the same level**. One word, several ids, several FSRS
schedules. That is a merge, and `corpus:dupes` owns merges; `genderfix` aborts on an
undeclared collision precisely so one cannot be smuggled in as a rename.

929 tests, 0 lint errors, `corpus:validate` PASS — warnings 809 → 808, and the plural
probe 0.98 → 0.99 off its own population changing.

---

### Shipped 2026-08-24 — all eleven drill modes swept, and I had measured the wrong engine

**`gegenüber` and `wohl` were missing from `SEPARABLE`.** `splitPrefix` never fired, the
weak generator inflected the whole compound as a simplex, and — the part that mattered —
it still returned `reliable: true`, so instead of being gated out the wrong form was
offered to a learner. `gegenüberstellen` (C1, shipped) produced **gegenüberstellt** for
*gegenübergestellt*. Both prefixes added, `fühlen` added to `SEED_ROOTS` because Lexi
does not card it, and four tests pin it — including one asserting that `aushändigen` and
`überreichen` stay **unreliable**, since that is the only reason their nonsense forms
never reached anyone.

**The claim that sent me here was mostly wrong, and the correction is the more useful
finding.** Yesterday's entry says `auflösen` prints «geauflöst» in the drill. It does
not. Every measurement behind that ran the conjugator from a bare `node` script, and
`splitPrefix` only splits a verb whose **root** is known — a lexicon seeded from the
corpus at boot. Primed the way the app primes it, `auflösen` returns **aufgelöst**.
One of the five reported instances was real. The same mistake made the reliability gate
look broken when it was working correctly, so two perfectly good cards were held out of
an authoring batch for no reason. Struck through in place above; LESSONS Class 2 carries
the rule — *a pure function with a seeded table is not pure until the table is seeded.*

**One sound instrument did come out of it:** checking the conjugator's Partizip II against
the forms **the corpus itself attests** in its example sentences — real German as the
reference rather than a regex over spelling. **262 verbs agree, 0 disagree.** It only
sees verbs whose examples contain a Perfekt, but it is a real floor under the engine.

**And the drill sweep is complete — all eleven modes.** Two are clean by construction
(`gender`: three fixed buttons; `case`: four distinct articles from a fixed table per
gender). Three were broken and are fixed (`cloze`, `plural`, `conj`). The five type-in
modes grade soundly: `canon` → `norm` (folds ä→ae, ß→ss, so *schoen* matches *schön*) →
edit-distance-1, with a *near-miss* state that says "right word, spelling drifted"
instead of marking it wrong. That leaves one real defect:

**🟠 `order` accepts exactly one word order, and German permits more.** The check is
`built.join(' ') === target.join(' ')` — the original sentence and nothing else. But the
finite verb goes second and *any* constituent may hold first position, so «Ich fahre
morgen nach Berlin» and «Morgen fahre ich nach Berlin» are both correct and the drill
marks the second wrong. **That is this project's worst error class.** A narrow probe
flagged 64 of 6,023; six of ten hand-checks were genuine and four were the probe mangling
the sentence — so 64 is not the number, and the true class is *larger*, since that probe
tests one pattern out of many. Filed rather than patched: enumerating valid orders needs
a parser, and the tractable fixes (restrict the pool, or pin position 1 in the prompt) are
a design decision.

929 tests, 0 lint errors, `corpus:validate` PASS.

---

### Shipped 2026-08-21 — a homework page on negation, and the half of it Lexi never taught

Three photographed pages — a B2 coursebook module („Missverständliches“) and Dreyer §14
*Negation mit nicht (Stellungsregeln)* with its eighteen practice sentences. Checked
against the corpus before anything was written, which is the point of checking:
**forty of the sixty-six candidate headwords were already there.**

**`Die Stellung von „nicht“` taught six placement rules; Dreyer lists ten.** The four
missing ones are a single idea the point never states — **nicht stands before anything
the verb still needs to its right**: the prepositional object («Er interessiert sich
nicht für Politik»), the place the verb requires («Sie wohnt nicht in Münster»), the bare
noun that completes it («Er wird nicht Arzt»), and the noun of a Funktionsverbgefüge
(«die Maschine nicht in Betrieb nehmen»). Also added: the Satznegation frame it hangs on
(nicht goes after the case objects and most Angaben, as late as the rules allow), the
Modal-Angabe as an always-partial negation, and Dreyer's closing note that word order
alone cannot separate Satz- from Teilnegation.

**One of those four was already being tested.** The exercise «Sie wohnt ___ in München.»
has shipped since the point was written, and no rule section covered it — the existing
*"before a directional phrase"* is **wohin**, and Münster is **wo**. That is the mirror
of the Akkusativ defect fixed the day before: there a learner was taught something
untrue, here they were tested on something untaught.

**And the exercises had drifted from the title.** Of the nineteen, **fourteen were
`choose` between nicht / kein / nichts** — which is *which negator*, the job of A1's
`Negation: nicht vs. kein`, not *where it goes*. Position is a word-order fact, so the
ten added are mostly `order` (build the sentence) and `error` (find the misplaced
nicht). Merging is by prompt, so the originals survive.

**New B2 point: `Verneinung durch Wortbildung: un-, miss-, in-`** (14 exercises), because
the coursebook page's exercise 5a is entirely negation *inside* the word and A2's
`Wortbildung: Adjektive` stops at `un-` and `-los`. What it adds is the part that costs
marks: **miss- is not a negator.** `missverständlich` is not the opposite of
`verständlich` — that is `unverständlich` — it means *liable to be misunderstood*, a
different claim. Plus the one genuinely predictable rule in the system: `in-` attaches
only to loanwords and assimilates to what follows (intolerant · illegal · immobil ·
irreparabel), and `-frei` vs `-los` (schuldenfrei vs schuldlos). `GRAMMAR_COUNTS`
138 → 139 points, 6,159 → 6,183 exercises.

**Twelve cards written, 6,628 → 6,640**, all through the machine gate. Three candidates
were held back rather than forced: `überreichen` and `aushändigen` because the
conjugator builds an impossible participle for them (see below), and `der Vorsitzende`
because a malformed card for it already exists. Two more needed `sameAsGerman` declared
— *intolerant* and *Erosion* genuinely are the English word, and the gate is right to
refuse a gloss that silently repeats its headword.

**The gate's refusals turned up a live defect in shipped content.** `conjugate` fails to
identify the prefix on some verbs and glues `ge-` onto the front of the whole word:
~~**`auflösen` → «geauflöst»** and~~ **`gegenüberstellen` → «gegenüberstellt»** are both in
the corpus, both conj-eligible, and both currently printed as the correct Partizip II in
the conjugation drill. Five instances hand-verified against five hand-verified controls
(`abschreiben`, `ankommen`, `vorbereiten`, `gehen`, `geben` all correct), and filed
**without a count** — a check keyed on prefix *spelling* flagged 29 and was wrong about
nearly all of them, because `ge` is not a prefix in *gehen* and `teil` is not one in
*teilen*. LESSONS carries the rule: morphology is not string prefixes.

> ⚠️ **Corrected 2026-08-24: `auflösen` was never broken, and the paragraph above
> overstates the blast radius.** Every measurement behind it ran the conjugator
> **unprimed**. `splitPrefix` only splits a verb whose *root* is known, and the root
> lexicon is seeded from the corpus at boot — so a bare `node` script sees a different
> engine from the one the app runs. Primed, `auflösen` returns **aufgelöst**, because
> `lösen` is a card. `aushändigen` and `überreichen` are wrong in both states but come
> back `reliable: false`, and `canConjugate` is exactly `conjugate(v).reliable`, so the
> drill never offered them — the gate was doing its job and the two cards did not need
> to be held back. **One card was genuinely affected: `gegenüberstellen` (C1).** Fixed
> below; the strike-through is left in place rather than deleted, per LESSONS Class 7.

926 tests, 0 lint errors, `corpus:validate` PASS.

---

### Shipped 2026-08-21 — the plural drill asked 191 questions that had no answer

The full pass begins ([AUDIT.md](AUDIT.md) is its ledger). The cloze leak fixed earlier
today was a *shape* defect — the answer looked different from its distractors — so the
first thing the corpus track asked was whether any other drill has the same shape. One
does, and worse.

**`plural` was gated on `w.plural` being truthy, and that field holds five shapes.**
Audited over all 3,200 noun cards carrying a plural: **399 were broken**, every one of
them hand-verified.

| shape | n | what the learner was asked |
|---|---|---|
| `"nur Singular"` / `"nur Plural"` | 114 | *choose the plural* of `das Obst` — the answer states there isn't one |
| `"—"` | 75 | *choose the plural* — the answer is a dash |
| `"-en"`, `"-s"`, `"-n"` | 201 | taught `"-s"`, never `die Handys` |
| `"die –"` | 2 | malformed |
| bare stem `"Themen"` | 7 | missing its article |

And because a non-full plural falls back to drawing distractors from **other nouns'**
plurals — overwhelmingly full `die …` forms — the answer was in every case the only
option of its shape. `das Obst` offered **"nur Singular"** against *die Namen · die
Berufe · die Länder*. Guessable without reading a word of German, and **191 of the 399
were asking a question with no answer at all**.

Fixed at the gate rather than in the item. `askablePlural()` admits only a full `die …`
form, and is now the single predicate behind the pool, the eligibility check and the
item — so the fallback branch that produced the mismatched shapes is gone, and "no
plural" stays true on the card face where it belongs without becoming a question.

**Then the 208 that really do have a plural were expanded, so they return through the
front door.** 177 mechanically (`die Verabredung` + `-en` → `die Verabredungen`) and
**31 by hand**, because they cannot be done by rule: the umlaut falls on a compound's
*final* stem vowel (`der Abschluss` + `¨-e` → **die Abschlüsse**, not *Äbschluss*), the
tail-replacement shorthands each name a different ending (`-träge`, `-wörter`, `-güter`),
`das Dilemma` takes a Greek plural, and an attributive adjective must decline —
`die erneuerbare Energie` → **die erneuerbaren Energien**, which the mechanical pass got
wrong and hand-checking caught. The expect-guard refused 17 rows where the level in the
id was guessed, which is exactly its job. Askable plurals **2,801 → 3,009**;
`corpus:validate` PASS, 0 errors.

**And the instrument that measures all this was itself broken.** The reader probe
reported the adjective rate falling 0.955 → 0.945 on a change that touched no adjective.
`sample()` is a full Fisher–Yates shuffle drawing `population − 1` values, and all three
probe classes shared **one** seeded stream — so growing the noun population by 208 spent
208 extra draws and silently re-rolled which 200 adjectives were tested. Each class now
carries its own seed. Verified by running the new probe against both corpora: verb and
adjective come out bit-identical, and only plural moves — 0.98 → 0.97, which is real,
because 208 cards that the probe's `/^die\s/` filter had always excluded are now inside
it. **Every probe delta recorded here before today shares that flaw**; LESSONS Class 2
carries the rule.

922 tests, 0 lint errors, typecheck and build green.

---

### Shipped 2026-08-21 — a drill that could be solved without German, and three findings withdrawn

The real-device pass (BACKLOG Now #1) run on a booted iPhone 17 Pro / iOS 26.5 against
the deployed build. Two defects came out of *playing* it that no amount of reading had
found — and three of the pass's own findings had to be withdrawn, which is most of what
this entry is for.

**The cloze answer was the only capitalised option — 261 cards.** Card 7 of a real
session asked «\_\_\_\_\_ Mut.» and offered *dann · hier · auch · **Nur***. `ClozeItem`
takes its answer from the surface **as it appears in the sentence**, so a
sentence-initial blank yields `Nur`, while the distractors are drawn as citation forms,
which for everything but nouns are lowercase. The item was solvable by a learner who
reads no German at all — and the function's own comment says the distractors exist "so
the options read as genuine candidates rather than the one word that fits". A capital
letter defeated it. Measured over the shipped corpus using this file's own
`drillExample` and `wholeWordRe` copied verbatim: **261 of 5,684 cloze-eligible cards
(4.6%)**, and worst where it matters most — **70 at A1**, including the entire
question-word paradigm (*wer, was, wo, wann, wie, warum*) and *morgen · gestern · hier*.
`matchInitialCase()` raises the distractors to the register the sentence imposed, rather
than lowering the answer, because the answer has to be the string that actually goes in
the blank: *"nur Mut"* is not a sentence. Nouns are untouched — their citation form is
already capitalised, so nothing moves. Four tests pin it.

**`alle` taught one word and illustrated another — in the first ten cards a new user
sees.** The A1 card glosses *finished*, defines it *"finished; gone"*, and carries
synonyms *aus · auf · leer* — all correct for colloquial «Die Milch ist alle». Both of
its examples were «Alle lügen.» / «Alle reden.» — the **indefinite pronoun**, a
different lexeme. Neither example contained the word the card teaches. The authoring
gate passed it because `alle` *is* literally present, and presence is not sameness of
sense; this is the homograph gap filed in BACKLOG showing up as a content defect rather
than a matcher one. Fixed by replacing the two examples, not the facts, because the
pronoun reading is **already taught** — `gram:A1:Richtungsangaben & Indefinitpronomen`
states it outright ("Indefinite: man, etwas/nichts, alle"), so the word card should
carry the sense the grammar layer does not. Through `fix-authored.ts`, expect-guarded,
0 refused; exactly one entry moved in `detail.json`; `corpus:validate` PASS, reader
probe unchanged.

**The one lint error is gone**, so a config written to fail the build on a11y can mean
something again. 0 errors, 916 tests.

**Three findings withdrawn, and they are the reason this pass was worth running.** The
card does **not** swallow vertical scroll: its `touch-action` is `pan-y` and Motion never
calls `preventDefault` on a vertical gesture — proved with a controlled instrument, after
a matched-control simulator run had convinced me otherwise. The FAB does **not** trap
content: `pb-20` already guarantees it, and at full scroll nothing interactive remains
beneath it on any route. And a probe claiming 665 gloss/example mismatches was a broken
stemmer — twelve hand-checks, twelve false positives. Recorded in LESSONS Class 7 with
the two rules they produced: *synthetic input cannot distinguish a blocked gesture from
an unproducible one — instrument the mechanism*, and *for anything that floats, measure
the invariant the code claims, not the snapshot you took*.

Still open and now stated rather than assumed: the UmlautBar behind the keyboard was
never reached (a cloze is multiple-choice, not typed), and standalone-PWA safe areas,
landscape and Dynamic Type remain untested.

---

### Shipped 2026-08-20 — pronoun order lands at B1, and the B2 Akkusativ rule was too flat

Working the *Neue Heimat* Modul 1 exercises by hand — the page the B2 point below was
built from — turned up one gap and one defect.

**The gap: B1 had nothing on word order.** Between A1's `Wortstellung & Fragen`
(verb-second) and the B2 Mittelfeld point there was nothing, so a learner with the level
filter at B1 got no word-order drills at all — at exactly the level the courses teach
them. New point `Wortstellung: Pronomen im Mittelfeld` (B1, 12 exercises, 5 rule
sections), and it is not a thinner copy of B2: it teaches the move a **pronoun** makes,
which no point in the bank stated. A2's `Dativ: Pronomen & Stellung` gives the two-object
rule with the subject always a pronoun, so the learner never meets the case that breaks
it — a pronoun runs to the front of the Mittelfeld **past a noun subject too**:
*«Gestern hat mir mein Freund geholfen»*. Nouns keep Dativ first, pronouns flip to
Akkusativ first, and a pronoun beats a noun whatever the cases.

**The defect: the B2 rule said an Akkusativ noun stands behind the Angaben, flat.** Only
an indefinite one does. A definite Akkusativ is known information and may cross the
Angabe — *«Ich habe die Rechnung gestern in die Filiale geschickt»* — which is one of the
two model answers Dreyer §22 prints for its own worked example. The flat version does not
just omit a case: it marks a correct sentence wrong. Rule 482 → 624 chars, a
`known information moves left` section, and three exercises including the one that would
have failed. Recorded in LESSONS Class 6, with a new checklist line: *before shipping a
teaching rule, write the sentence it would reject.*

`GRAMMAR_COUNTS` 137 → 138 points, 6,144 → 6,159 exercises. `corpus:validate` PASS.

---

### Shipped 2026-08-20 — pattern cards can be read, and the Mittelfeld is taught at B2

The second *Neue Heimat* page is grammar, not vocabulary — Modul 1's Mittelfeld word
order. Checked the same way, and the vocabulary was almost entirely covered already
(19 of 31; most of the rest is metalanguage that lives in the grammar layer as
`pos: grammar` cards, not as nouns). Two things came out of it.

**The matcher can now read a pattern card — 0 of 44 → 39 of 44 (88.6%).** A governed term
is not a lemma, and `matcher.ts` had been conjugating the string *"verzichten auf + A"*.
`government()` now splits it into lemma + required preposition and matches only when the
preposition is genuinely in the clause, so *«Sie wartet auf ihr Visum»* is the pattern and
*«Sie wartet»* stays the plain A1 `warten`. Three causes, and only the first was obvious:
the lookup key; then contractions, because *«hängt **vom** Anlass ab»* carries `von` and
no token spells it; then the search window, because a separable particle only ever lands
*after* its verb while a governed preposition precedes it in every Perfekt clause. The
pattern check also had to outrank the separable check, or plain `abhängen` won *hängt* on
the particle alone. Reader probe verb rate 0.936 → 0.941, everything else flat, PASS.

The five that remain are multiword lemmas (`Rücksicht nehmen auf + A`,
`Heimweh haben nach + D`, …) and are declined by design: which word carries the
inflection is not decidable from the string, and a wrong match is worse than a miss.

A five-card "regression" in the control class turned out to be the fix working — the
plain `verzichten` card's own example is a `verzichten auf` sentence, so the more
specific card now claims it. Recorded in LESSONS Class 2, because the probe could not
tell a wrong answer from a better one.

With that in place `denken an + A` and `warten auf + A` passed the gate and were
written: **6,623 → 6,625**.

**Mittelfeld order is now taught at B2, where the courses teach it.** `TeKaMoLo &
Satzklammer` stays at C1 — its id carries FSRS progress and the bracket is the harder
half — and the new B2 point `Mittelfeld: Ergänzungen & Angaben` (14 exercises, 6 rule
sections) covers what C1 genuinely does not: the **Ergänzungen**. C1 states the *pronoun*
rule ("es ihm"); the noun rule runs the other way — Dativ in front of the Angaben,
Akkusativ behind them, prepositional object last — and a learner holding only the pronoun
rule orders every noun pair wrong while believing they know the system. Introduce at B2,
consolidate at C1: a spiral, not a duplicate. `GRAMMAR_COUNTS` 136 → 137 points,
6,130 → 6,144 exercises, which the grammar test caught before it could drift.

---

### Shipped 2026-08-20 — the authoring gate could not admit two whole card classes

Reading the *Neue Heimat* Modul 1 grammar page (Mittelfeld word order) turned up two
cards worth adding — `denken an + A`, `warten auf + A` — and the gate rejected both with
*"no de.wiktionary entry for denken an + A"*. It was looking the **term** up as a
dictionary page.

A term is not always a lemma. The corpus writes government notation into the headword on
purpose, because the preposition and its case are the thing being taught, and reflexive
`sich` for the same reason. de.wiktionary has a page for neither string. So the gate
could not have admitted **any** of the 38 `verb + prep + case` cards or the 90 `sich`
cards already shipped — not the dictionary disagreeing, but the lookup asking the wrong
question, which is the failure that file is least entitled to make.

`verify.ts` now derives a `lemmaOf()` for the **lookup key only** — strip the article,
the `prep + Case` tail, the reflexive pronoun — and notes in the report when facts were
checked against a lemma that differs from the term. The term keeps its notation; the
gloss and example checks still compare against the term.

That exposed the larger defect underneath, now measured and filed 🔴 in BACKLOG:
`matcher.ts` derives verb forms from the same un-normalised term, so it conjugates the
string *"verzichten auf + A"*. **0 of 44 pattern cards resolve in their own example**,
against a 95.6% control. Deliberately not fixed in this pass — the one-line fix
(index the bare lemma) would let *«Ich warte»* count as knowing `warten auf + A`, and
would contest the existing A1 `warten` card. The two new cards stay parked until that
is decided.

---

### Shipped 2026-08-20 — a B2 textbook page, checked against the corpus before writing a word

A *Neue Heimat* chapter opener (emigration: the leaving checklist, then a blog about a
move to Australia) was read for vocabulary Lexi should teach. **Fifty-one candidate
headwords were checked against `vocab.json` first, and thirty-seven were already there** —
which is the point of checking: the cheap failure mode here is authoring a second
`die Beziehung`.

Four more of the fourteen "gaps" were a bug in my own probe, which stripped reflexive
`sich` from the candidate but not from the corpus key, so `sich verlieben`,
`sich kümmern`, `sich einleben` and `sich verabschieden` all read as missing while
sitting in the file. Recorded in LESSONS Class 2.

**Ten cards written, `6,613 → 6,623`**, all ten through `authoring:new`'s machine gate —
gender, plural and IPA taken from de.wiktionary rather than generated, and every example
proved to contain a real inflection of its headword: *auflösen · knüpfen · wagen ·
abenteuerlich · der Abschied · die Arbeitserlaubnis · der Horizont · die Sehnsucht ·
sehnsüchtig · gewohnt*. Two candidates were declined rather than written —
*netterweise* and *der Grafiker* — as page-specific rather than teachable.

`auflösen` was rejected twice before it landed, and the reason is worth keeping: the
matcher cannot see the headword in *aufgelöst* or in *löst … auf*, only in the bare
infinitive. That is the known separable-verb gap, but the gate turns it into a content
bias — it pushes every separable verb's examples toward the one frame where the prefix
never moves. Written up under the matcher item in BACKLOG.

Batch kept at `scripts/authoring/batches/b2-neue-heimat.json`. `corpus:validate` PASS.

---

### Shipped 2026-08-16 — three composition findings, measured instead of built

Atlas pass 2's remaining headline items were next on the list. All three were
re-measured at 1280px first, and **none of them is what it says.** Nothing was built.

**#19, "six identical rectangles each 40–60% empty".** Of the nine cards on Today,
**six use 95–98% of their width**. Three are sparse and each has a reason: the Brain
hero (70%, a canvas where the space *is* the artwork), the goal line (71%, a small card
by design — redesigned earlier today so the commitment leads), and *My class list*
(51%). A two-column pass would have redesigned six cards that already fill their column.

**#22, "the desk is letterboxed at ~800px".** The column is **640px**, and the desk
carries **no chrome at all** — no top bar, no bottom nav, no ticker, verified in the
running app. DESIGN §8's table contrasts *chrome* against *no chrome*: "the terminal:
mono, cool, hairlines, nav, ticker" versus "full-bleed, no chrome at all". It never
promised the card spans the viewport, and a viewport-wide flashcard would contradict
the same section's "one object".

**#21, "the card should become a lexicon entry".** Already shipped, front and back, and
never struck. The front carries POS · level · sector · headword with gender ink · IPA ·
citation; the back is flush-left with headword, POS · level · field, definition, the
German layer, examples and synonyms — its own source comment calls it "an entry you
read". The dead space measures **169px, not ~250**, and is symmetric at 85/85 because
the front is centred on purpose. The only thing genuinely missing is IPA on the *back*,
which is XS and not what the item describes.

**That is three for three, and five for five across this month.** The value here is the
day that was not spent redesigning surfaces that measure fine — so the finding is
recorded as a rule rather than a mood: *re-measure a finding immediately before building
it, not when it is written.* An audit decays; the codebase moves weekly and the finding
does not. See LESSONS class 1.

912 tests green.

### Shipped 2026-08-16 — the German definitions that were about a different word

`defDe` is the monolingual layer B2+ learners are **shown**, so a German definition of
the wrong word is live content. Yesterday's definition pass turned up a handful by eye;
this sizes the class and clears it. **23 cards, 302 → 279 carrying a German definition.**

**It was sized by reading all 302, because no proxy works.** Two were tried and both
failed in both directions: a German-marker test found exactly one card, and that one was
a *false positive* — „an einen Zugang montierte Schließvorrichtung“ is perfectly good
German — while `fallen`'s genuinely English "to fall; to drop; to die; …" slipped past on
the word *in*. The population is 302. That is small enough to read, so it was read.

What came back, in three shapes:

- **English in the German field** (4) — `fallen`, `betreten`, `einschlafen` carrying
  gloss lists; `die Währung` carrying "currency, bank notes and cents, die Münzen und
  Banknoten".
- **A definition of a different word** (11) — `mintgrün` defined as a garment wrapped
  round the body; `die Alp` as the nightmare demon; `packen` as the noun *Packen*, a
  bundle; `profitieren von` as *Fach*; `sorgen für` as *sich sorgen*, to worry;
  `umgehen mit` as washing up; `die Selbstfürsorge` as *Pflegeabhängigkeit*, which is
  its opposite; `schützen` given not a definition at all but a collocation frame,
  „jemanden/etwas vor … schützen“.
- **A real sense, but not the card's** (8) — `die Resilienz` in materials science,
  `die Trennung` in chemistry, `die Vorstellung` as a mental image, `die Beförderung` as
  transport, `konstruktiv` as structural engineering.

**Cleared, not rewritten.** A card with no `defDe` shows no German layer, which is
already true of 6,200 others — and showing nothing beats showing a definition of another
word. Authoring replacement German for advanced learners is a different job with a
different bar, and this pass had no business assuming it.

`corpus:validate` now errors on English prose in `defDe`, using a **stopword ratio**
rather than a marker, because the ratio survives both ways the marker test failed. It is
a floor and not a sweep: `die Währung`'s half-and-half text does not trip it, and a test
pins that miss rather than letting the check imply a clean sweep.

`corpus:cardfix` grew `defDe` handling to do it — the same pass built this morning for
`der Somit`, now doing the second job it was shaped for.

877 tests green · `corpus:validate` PASS.

### Shipped 2026-08-16 — the card the definitions could not fix

`npm run corpus:cardfix`, and with it the last card in the definition queue. **Cards
with no English definition: 0.**

The pipeline could already repair every field that does not change what a card *is* —
`fix-authored.ts` for glosses, definitions, examples and plurals, `genderfix.ts` for a
wrong article, `casefix.ts` for a wrong capital. None of them could say *this card is
not a noun at all*, and `voc:A2:der Somit` needed exactly that: glossed "somite", the
embryology term, carrying `gender: der` and `plural: die Somite`, while its sector read
**Adverbs** and both examples were the ordinary adverb *somit* — already translated
"therefore" and "thus". A frequency-list adverb that collected a homograph's noun facts
at build time.

It is now `voc:A2:somit`, an adverb with no gender and no plural, glossed "thus,
therefore". The headword changed, so the id changed, so `ID_MAP` carries the schedule —
and the pass refuses a rename that lands on a term the corpus already holds, which is
the collision that let the Visum duplicate in twice. Both guards were proved by
injection before the write.

**The check that would have caught it, and the one that wouldn't.** The tell was that
every field was individually plausible and only the *sector* disagreed with the part of
speech. The obvious general rule — "a POS sector that disagrees with `pos`" — was
measured first and discarded: **65 hits, of which about 64 are correct.** `die Zahl` is
a noun in *Numbers*; `doch` is a particle in *Adverbs*; forty-four phrases sit in
*Useful Phrases* precisely where they belong. Narrowed to **nouns in the four sectors
reserved for other parts of speech**, it finds the two real ones and nothing else —
`der Somit`, and `das Gegenteil`, a noun filed under *Core verbs* and now in *Abstract*
beside `die Ursache` and `die Folge`. Shipped as an error at zero.

**A ledger bug the guard caught on its own second row.** `cardfix` recognised finished
work only through `ID_MAP`, which exists only when the id moves — so the first row that
changed nothing but a `field` made every later run abort on its own completed fix. A
row now also counts as applied when every value it sets is already the value on the
card. The table is a ledger, not a one-shot script, and it was one row away from not
being.

873 tests green · `corpus:validate` PASS.

### Shipped 2026-08-16 — the definition queue is empty

B2, C1 and C2 authored — **180 more, 454 in all today. Cards with no English
definition: 455 → 1.**

6,503 of 6,504 word cards now carry a definition, and the number reading as *real*
definitions rose **4,836 → 5,290**. Across all 454, the flagged total never moved:
**1,213 at the start of the first batch and 1,213 at the end of the last.** Not one
new definition landed back in `enumeration`, `bare` or `repeat` — which is the whole
test of whether this programme is adding value or just adding text.

**The one remaining card is the point.** `voc:A2:der Somit` is glossed "somite", the
embryology term, with noun facts attached — while its sector is *Adverbs* and both its
examples are the adverb *somit*, "therefore". It has been left undefined through four
batches on purpose: writing a definition for it would have made a broken card look
finished. Closing this to a true zero means correcting that card — a re-term to `somit`
with `pos: adverb`, which changes its id and is therefore a schedule migration — not
authoring a 455th definition.

That is the honest end state for the sub-item, and it is worth saying plainly: the
queue is empty because every card that *could* be given a definition has one, and the
single exception is a defect that the definition pass itself surfaced.

873 tests green · `corpus:validate` PASS.

### Shipped 2026-08-16 — every card below B2 has a definition

274 definitions authored across A1, A2 and B1. **Missing English definitions 455 → 181**
(A1 0 · A2 1 · B1 0 · B2 103 · C1 74 · C2 3).

**A1–B1 is the line worth reaching first**, and not for tidiness: `defDe` is shown from
B2 up, so a card with no `def` rendered no definition block *specifically* for the
learners with no fallback. That population is now covered.

**The flagged total did not move once in 274 definitions** — 1,213 before the first
batch and 1,213 after the last. Not one of them landed back in `enumeration`, `bare` or
`repeat`. That is the number this programme lives or dies by; volume without it is just
a different defect.

**The guard failed on an English definition, and the fix is the interesting part.**
*"To die in an accident or a disaster."* was reported as German and failed the build.
`isGermanDefinition` requires two signals — a German marker, plus an article or an
umlaut — and **`die` satisfied both, by itself**: it is an ordinary English verb as well
as a German article. The instinct is to reword around it; that would have left the trap
armed for every future author, in a field where *"to die"* is a perfectly ordinary
English gloss. So `die` now counts as an article only where it behaves like one,
immediately before a capitalised noun — German capitalises every noun and English does
not do this mid-sentence.

Narrowed deliberately and no further. The regression this guard exists to prevent is
real: 367 cards once shipped a German definition inside `def`. Seven tests now pin both
sides — the English verb passes, and six genuine `defDe` values from the corpus are
still caught. The rule had been written three times and never had a test.

**A finding that outlives the batch: `defDe` often describes a different sense than the
card's own gloss.** The German definitions were imported by headword and took whichever
sense came first — `packen` (to pack) carries the definition of *Packen*, a bundle;
`umgehen mit` (to handle) one about washing up; `sorgen für` (to provide for) carries
*sich sorgen*, to worry; `die Alp` carries the nightmare-demon sense where the card
means an alpine pasture. Two hold English outright. That field is *shown* to B2+
learners, so it is a live content defect rather than a tidiness one. Recorded in
BACKLOG as a class, explicitly unsized — it was spotted while authoring, and a lower
bound is not a count.

873 tests green · `corpus:validate` PASS.

### Shipped 2026-08-16 — A1 has a definition on every card

The definition programme, starting where it matters most. A card with no `def` renders
no definition block at all below B2, and the recorded figure for that was wrong in the
bad direction: **not 286 but 455**, measured today — the corpus grew and the number did
not follow it. A1 held 67 of them.

**All 67 are authored and applied. A1 is at zero, and the total is 455 → 388.**

The number that matters more is the one that *didn't* move: the flagged-definition
total was 1,213 before and 1,213 after. Adding sixty-seven definitions added no
enumerations, no bare synonyms, no repeats — the new content did not become the next
batch's defect, which is the only way this programme is worth running.

**The largest bucket had no authoring path, which is why it was the largest.**
`corpus:definitions` reported the missing cards "as a queue" and emitted batches only
for the flagged classes — so the worst group was the one nobody could work on. It now
emits `missing-<LEVEL>-NN.json`, lowest level first, and each row carries `defDe` and
the card's first example as **sense evidence**: a German definition tells an author
which homograph the card is about, which is exactly what a bare gloss cannot.

**Three of my own definitions were rejected by the corpus's own gate, all the same
way.** An English definition that quotes a *bare German article* reads as German to
`isGermanDefinition` — so "in the plural, die Daten, …" on `das Datum`, and "the
grammatical gender of der words" on `männlich` and `weiblich`, are hard errors. They
are, by the check's own rule, and the rule is a good one: that field having drifted into
German once is why it exists. Rewritten as "the masculine article", "the feminine
article", and the plural sense stated without quoting it. The gate caught all three
before they reached anyone.

`das Datum` is the nicest of the set to have written, because yesterday's merge earned
it: the card now glosses "date; data", and the definition can finally say that the sense
moves with the number.

866 tests green · `corpus:validate` PASS.

### Shipped 2026-08-16 — blind spots stop punishing you for practising

BACKLOG #10. The list that tells a learner what to work on ranked by **raw miss
count**, which measures exposure at least as much as weakness: drill a mode forty
times and miss eight, and it outranks a mode you attempted ten times and failed seven.
**Practising something made it look worse and avoiding it made it look fine** — exactly
backwards for the one list whose job is to point you at the next thing.

"Divide by attempts" turned out to need a number the app never recorded. `logMiss`
fires only on failures, and the review ledger stores `{id, grade, at}` with no tag —
so there was no denominator anywhere to divide by. `logAttempt(tag)` now fires at every
graded site (flip drills, grammar exercises, Fundamentals, grammar cards), persisted
beside the miss log in IndexedDB, and `missStats` reports `attempts` and `rate` and
ranks on rate. Verified against seeded evidence: 70%-of-10 leads 20%-of-40, where raw
count had them the other way round.

**The whole risk is in the fallback, so that is where the tests are.** A rate computed
from two attempts is noise, and every learner who exists today has a miss log with no
denominator at all. Both fall back to count ordering — `MIN_ATTEMPTS = 6`, and
`rate: null` means *not measured*, never 0% — so nobody's list reorders until real
evidence accumulates. Seven tests pin it, including the legacy case and the
window (stale attempts outside the 30 days must not dilute a current rate).

The UI had to follow the sort or contradict it. Rows read "70% of 10" where measured
and "25×" where not. The bar was the interesting part: drawn naively, both kinds share
one red scale, and a legacy tag with the largest raw count rendered **full-width at the
bottom** of a list ordered by rate. Unmeasured rows are neutral now — a different
colour for a different number, no legend required. Caught by looking at the rendered
rows rather than at the ranking they came from.

866 tests green.

### Shipped 2026-08-16 — the goal line stops being a caption

BACKLOG #23, which the previous entry had recorded as blocked on "a seeded multi-day
store". **That was wrong, and the correction is the more useful half of this entry.**
Every input to that surface is a storage key: `lexi.visits.v1` (≥8 distinct days clears
Today's `week1` shape), `lexi.goal.v1`, and `lexi.snap.v1` with an older row so
`projectedPct` can be computed at all. The one real trap is that the store mirrors
visits into IndexedDB and rehydrates over localStorage at boot — so a localStorage-only
seed appears to work and is silently undone by the reload that was supposed to apply it.
Seed both tiers and the surface is fully reachable.

With it reachable, the finding measured out: the goal line was **one `text-xs`
paragraph, 13px, `--color-dim`, in a 56px card** — the only sentence on Today that says
what the learner is *for* (a date they chose, and whether they will make it), set at
caption size between two cards that both shout.

It is two lines now. The commitment — "A2 by 25. Sept." — takes its own line at 15px/600
in full-strength ink; the pace stays beneath it at 13px dim, keeping the green
on-track treatment it already had. Card 56 → 68px, no clipping at 375 or 1280.

Still a small card, deliberately. Promoting it into a hero would put it in competition
with "cards queued", which is the number the surface exists to get you to act on. The
defect was hierarchy, not size.

859 tests green.

### Shipped 2026-08-16 — the clip sweep: one real cut, one artifact, two broken instruments

BACKLOG #5 carried three measured clips. Swept all ten hash routes at 1280 and 375 —
enumerated from `route.ts`, because the last sweep that worked from memory missed four
routes that carried real defects.

**Real, and fixed: deck names cut mid-word.** An earlier pass replaced `truncate` with
`line-clamp-2` and closed the multi-word case. It could not close the case where the
name is a **single word wider than the column** — there is nowhere to wrap, so the
clamp's `overflow: hidden` cuts the word with no ellipsis to admit it. At 1280px
*Communication* rendered as "Communicat", 113px of word in a 92px box; *Administration*
and *Relationships* the same. `break-words` lets the word break across the two lines it
already has. Horizontal cuts on Decks **3 → 0**.

**Artifact: "Today overflows its own column by 8px."** The offender is one control —
the *recognised · streak* chip — carrying `px-2 py-1 -mx-2`, which is the ordinary
optical-alignment trick: pad for a 44px hit area, negate the margin so the text still
lines up with the column edge. Nothing is clipped, and the document does not scroll
horizontally at either width. The tell was in the original numbers all along: 999>991
and 350>342 are **both exactly 8px**, and a layout bug scales with viewport width while
a negative margin does not.

Worth recording that the *first* explanation was wrong: `.live-dot::after` is a pulse
ring at `inset: -3px` scaling to 1.9×, an obviously overflowing pseudo-element sitting
right there in the same row. Disabling it changed the measurement by zero pixels. The
real cause was found only because the plausible one was tested instead of assumed.

**Unreproduced:** the third claim, a Today `text-2xs` line clipping 406→237. The only
candidate is the backlog burn-down line, which renders only when `dueTotal > due` — a
state this sweep could not produce. Recorded as unverified, not struck.

**Both instruments were broken before either finding was.** The first sweep arm —
"element spills past its parent" — reported **350 hits on Decks alone**, with parent
widths of 0; it was comparing elements against boxes that are not their layout
container. Deleted rather than tuned. The corrected sweep then returned a confident
*zero clips on every route* while `innerWidth` was **0**: the Browser pane was
backgrounded, every rect collapsed to nothing, and the minimum-size filter discarded
every element before it could be tested. A check whose subject list is empty passes
silently, so the sweep now aborts unless the viewport is real. Both went into LESSONS.

859 tests green.

### Shipped 2026-08-16 — the hint nobody could see, and a palette check that found five of one

Continuing through Now #4's ranked survivors. Two fixed, two struck as stale, one
measured and handed back with the decision it actually needs.

**#26 · the interaction hint was documented where it could not be seen.** "Long-press
to study" lives in the legend row *below* the treemap — at ~877px on a 375×812 phone,
off the bottom of the viewport — and long-press is the **only** way to study a group
directly from the map on touch. The phone now carries its own line in the card header;
the legend keeps the full sentence from `sm:` up, with a comment saying why it must not
simply be re-shown there.

The first attempt is worth recording: it rode in the controls row's "spare" width, on
the arithmetic that 133 + 104 of 340 left 95px free. **The DOM read said unclipped and
the screenshot said otherwise** — flexbox had shrunk `Study all` into a two-line wrap
and truncated the hint to "Hold to stu…". Measuring the element I changed did not catch
a defect in the element beside it. It has its own 19px line now. First tile 390 → 401,
against 465 before yesterday's #30 work.

**#24 · struck, stale.** "+ 4 drills targeting your blind spots is red, which reads as
an error." It is `text-amber`, and `--color-amber` has been Atlas blue (`#1d6a8c` /
`#63b3d4`) since the Glacier retune. Nothing on that line is red.

**#23 · not attempted, deliberately.** The goal line renders only for a learner past
week 1 with a goal set, so verifying a change needs a seeded multi-day store. A
typographic promotion of what this file calls "the most motivating sentence in the app",
shipped unverified, is the wrong trade. Left open with that reason written down.

**The gender/CEFR ink collision: one recorded, five real.** The backlog carried
`--color-der` == `--color-a1` and asked for "a contrast pass, not a guess". Done, as
`src/lib/palette.test.ts` — it parses `index.css`, splits the themes and compares the
ramps. **Light has three collisions** (`der`=`a1`, `die`=`c2`, `das`=`b1`) and **dark
has two**; dark lifts `die` and `c2` 45 apart, which is exactly why counting by eye in
one theme got the number wrong.

Severity turned out lower than the entry reads, and that is measured too: neither ink
is ever the only signal — `genderColor`'s own contract is "the article itself is always
spelled out beside it" and a CEFR badge renders "A1" as text. So it is polish, and the
open question is a *ruling* on which ramp moves, not a measurement: gender follows the
blue/pink/green convention DaF materials use, CEFR has its own documented order. The
test enumerates the five so a **new** collision fails the build while these stay
visible, and pins contrast ≥3:1 for every ink plus mutual distinctness within each
ramp — all passing. Proved firing by making `a2` equal `der` and watching three
assertions fail.

Its first version put every light token in the dark half: it split on the string
`html.dark`, which appears in a comment 170 lines above the rule it describes. Same
family as every other check in LESSONS class 2 — the parse was wrong before the
finding could be.

859 tests green.

### Shipped 2026-08-16 — the chrome in front of the map, and two numbers that were wrong

BACKLOG Now #4's mobile P1s, re-measured before being touched — which is how two of
the three turned out to be mis-sized and one turned out not to have a fix worth
shipping.

**#30 · Progress spent 57% of the phone on chrome.** The heatmap card's header
measured **200px on its own** at 375px, and the first tile did not appear until
**465px of an 812px viewport**. Four control clusters — title, Markt/Liste, six CEFR
chips, *Study all* — were wrapping into four rows, and the six chips are a 284px row
that cannot be made narrower: they are 44×44 because the touch-target sweep put them
there, and shrinking them re-opens a closed defect.

So the filter collapses on a phone into one control that **says what the scope is** —
"All levels", "A1–B1", "A2, C1" — and expands to the chips on tap. That is strictly
more legible than six chips whose selection you read off their borders. The header
then breaks into two *deterministic* rows rather than however four clusters happen to
land. **Header 200 → 125px, first tile 465 → 390, 57% → 48%.** Nothing changes from
`sm:` up.

Not hidden behind an icon, deliberately: the Markt/Liste labels were hidden below
`sm` once and restored, because an unlabelled control is worst exactly where the
screen is smallest. The summary keeps a word on screen. Seven tests pin what it says,
including the case a range would misreport — A1 and C2 selected is "A1, C2", not
"A1–C2".

**#32 · the coach marks were 79px, not 200.** The backlog said they "eat 200px of
812" and that the primary action starts below the fold. Measured on a real first run:
the block is **79px**, and the grade buttons sat **56px clear of the fold at 375×812
and 71px clear at 402×874**. The claim is only true on the **iPhone SE (375×667)**,
where they ended **7px past it** and the session scrolled.

Fixed by tightening padding and row gaps — 79 → 67px — and specifically *not* by
shrinking the type. "Tap the card to flip it" is the one genuinely undiscoverable
thing in the app, and it is the finding a previous pass could not settle without real
iOS; winning eight pixels by making it harder to read would trade away the thing the
block exists for. Grade buttons now clear the SE fold by 7px. Still true at 667: the
subordinate first-sight line below them is off-screen and the session scrolls 42px.

**#31 · the FAB does overlap the treemap, and it is not fixed.** Re-confirmed: the
56px *Start today's session* button is anchored above the bottom nav and sits on the
map, truncating the tile label under it. Every available fix spends something the app
has already ruled on — hiding it on Progress removes the only one-tap route to the
*scheduled* session (`Study all` is a different action); docking it into the nav is
the category error `BottomNav.tsx` rejects in its own comment; shrinking the mobile
map to clear it makes the map ~300px, when the complaint about this surface was that
the map was too small and too far down; auto-hide on scroll leaves the overlap at
rest. **It needs a ruling on which to spend, not a script.** Left open with the
options written down, on the same principle as the unfixed swipe-gesture question in
Now #1: a speculative fix to the primary action is not worth the risk.

847 tests green.

### Shipped 2026-08-15 — the cards that were forms of each other

The mechanism the singular/plural ruling said did not exist yet. `corpus:dupes`
groups by *identical* term, so it never saw `die Schuhe` beside `der Schuh`: two
terms, two cards, one word, two FSRS schedules. `npm run corpus:forms` finds them
and merges the ones ruled to merge. **6,626 → 6,613 cards.**

**The ruling table is the deliverable, not the script.** `scripts/corpus/form-rulings.ts`
holds a detector and a hand-written ruling for every pair it finds, and both the
merge pass and `corpus:validate` read the same table — so the list can reach zero
and stay there. 20 collisions, 13 merged, 7 kept, each with its reason on the record.
The 11 plural merges are the ones ruled yesterday; two more came out of the same
detector and needed their own shape:

- **`der Joghurt` / `das Joghurt`** and **`der Burnout` / `das Burnout`** — one lemma
  whose article varies by region (Duden lists both under one entry), filed twice with
  an identical gloss and an identical definition. They survived the 874-group merge
  only because the article is part of the term string.
- **`der Bekannte` / `die Bekannte` is kept.** Not one word twice: the cards gloss
  themselves "acquaintance (male)" and "acquaintance (female)". The same pair as
  `der Lehrer` / `die Lehrerin`, which the backlog wants more of.

**The detector is noun-to-noun, and that restriction is the finding.** German derives
nouns from verbs constantly — *die Frage*'s plural *Fragen* is also the infinitive
*fragen*, *die Dusche*'s is *duschen* — so 29 of the 45 raw hits are correct German
and not duplicates at all. Including them is what made the first count of this defect
nearly three times too high.

**Two defects the dry run caught before anything was written.**

- **A gloss union is right for `merge-dupes` and wrong here.** That pass unions senses
  because its groups are one headword twice, so a second gloss is a second sense. Here
  the retired card is the keeper's *plural*, so its gloss is the same sense in another
  number — and the union produced **"shoe; shoes"**, "glove; gloves", "muscle; muscles",
  "noodle, pasta; noodles / pasta". Now a ruling writes the gloss out where the merge
  should change one, and exactly one earns it: `das Datum` → **"date; data"**, because
  German really does put the data sense in the plural.
- **A definition does not always travel with the merge.** `die Daten` is defined as
  "Facts and figures collected for study or reference", which is a definition of the
  plural and would read as the definition of *das Datum*. It stays behind. In the other
  direction, `die Kenntnisse` had the *better* definition — "The things a person knows
  about a subject." against the keeper's "knowledge; science (knowledge gained through
  study or practice)", which is the enumeration class Now #5 exists to remove — so
  retiring the card would have thrown it away. Both are per-row rulings now.

**A merge can be a relevel, and this one was.** `die Kenntnisse` sat at A2 and its
singular at B1, so merging into the singular would have taken the word off an A2
learner who has it today. The keeper takes the **lower** of the two levels, for the
reason `relevel-a1.ts` promotes and never demotes — which makes it a second id change
and a second `ID_MAP` entry (`voc:B1:die Kenntnis` → `voc:A2:die Kenntnis`), plus two
existing entries re-pointed to follow it.

**A fourth file holds card ids, and nothing said so.** Found while migrating: `freq.json`
keys frequency ranks by id and no pass re-ran `corpus:freq`, so **47 of its 1,986 keys
pointed at cards retired by earlier passes** — 47 cards silently unranked in the
frequency-within-band ordering of fresh cards, failing nothing and showing nothing.
`corpus:validate` now errors on a rank whose card is gone, and every migration script's
closing line names `corpus:freq`. See LESSONS class 4.

**The check that keeps it at zero, proved firing.** `corpus:validate` errors on a
collision that is unruled *and* on one ruled `merge` that is still present — an
invariant that lives only in a CHANGELOG sentence is not enforced, which is how the
Visum duplicate got in. All three branches were verified by injecting the defect and
watching the build fail. Measured on the same probe before and after: example rows
whose own card does not claim them, **435 → 411 of ~16,200**; distinct cards losing
their token to another card, **195 → 184**.

`scripts/corpus/merge-lib.ts` is new and holds what the two merge passes share —
sense union, absorption, the cumulative id map — because a second copy of "what does
a merge preserve?" is the archaic-spelling failure again. **840 tests green** (830 + the
ten that prove this detector sees each shape and refuses the verb false positives).

---

### Shipped 2026-08-15 — the routes my own sweep missed

The touch-target sweep earlier today swept six **hash** routes and called the app
clean. Decks, Profile, the word map, Brain, Exam, Print, Placement, Interests and
Read are not in that list — Decks and the map sit one level deeper under
`#/progress`, and the rest were simply never enumerated. **A sweep is only as wide as
its route list**, which is the same failure as a guard that enumerates its subjects.

Measured all nine. Six were already clean, and **three of the 2026-08-05 audit's
findings about Decks are stale**: it now has 1,106 controls with **zero** under 44px
(the audit said 311), **zero** clipped subtitles (it said 77), and it does render an
`<h1>` (it said none). Profile is clean too, against "44 of 61 under".

Four real defects, one of them introduced today:

- **Exam's CEFR chips were 43×44** — one pixel short, because they carried `tap-44`
  (height only) where they needed `tap-44-sq`. That utility exists for exactly this
  case and its comment names these chips.
- **Print's three selects and its number input** were 29–31px tall.
- **Placement's *skip*** was 25×15.
- **`#/read` had no `<h1>`** — my own view, shipped this morning. A `Kicker` is
  styling; screen-reader users navigate by heading and a styled span is not one.

**The checkbox needed a different fix, and the first attempt was inert.** `.tap-hit`
paints a 44px halo with `::before` — and **`::before` does not render on replaced
elements**, so on an `<input type="checkbox">` it does nothing at all. The target is
the wrapping `<label>`, which forwards its clicks to the input. Verified by tapping
30px from the tiny 13px box and watching it toggle: label 90×44, box unchanged.

830 tests green. The one `npm run lint` error remains the pre-existing
`src/views/Placement.tsx:74`.

---

### Shipped 2026-08-15 — the ambiguous senses, settled by reading the cards

Four verbs were left open because a paradigm is only correct relative to a *sense*,
and I had been treating "which sense does this card teach?" as a question needing an
external authority. It is not. **The card states it**, in its gloss and its own
examples, and those are in the repo.

| card | its own evidence | verdict |
|---|---|---|
| `umstellen` | *"die Möbel im Wohnzimmer **umgestellt**"* | **separable** — the entry was wrong |
| `hängen` | def leads *"to hang, to be suspended"*; *"Das Bild **hängt** an der Wand"* | **strong** — the entry was wrong |
| `überfahren` | *"Tom hat einen Hund **überfahren**"* | inseparable — the entry was already right |
| `überholen` | *"Er **überholte** den Lastwagen"* | inseparable — already right |

So two were genuinely wrong and two were fine: `Flexion:überfahren` and
`Flexion:überholen` show the *rarer* separable readings (fuhr über, holte über), and
deferring to them would have broken two correct entries. **A dictionary's primary
headword is not the same question as which verb a card teaches.**

`umstellen` now reads *stellte um / umgestellt* and `hängen` *hing / gehangen*, both
matching the sense the card actually teaches. All four pinned.

830 tests green, reader probe unchanged at verb 174/185.

**On method.** Four times today a check of mine turned out to be the bug, and the
over-correction was to treat my own judgement as unusable everywhere. The line that
actually holds: 1,400 verb forms is past what memory is a reliable instrument for and
belongs to a source; four sense judgements against evidence sitting in the repo do
not. Deferring those was not caution, it was just slower.

---

### Shipped 2026-08-15 — the source I recommended fails its own licence check

Last entry proposed DWDS as the obvious next authority for the ambiguous-prefix
verbs. Checked the terms before writing any code, and it is **out**:

> *"Jegliche Nutzung der Inhalte des DWDS, einschließlich jedoch nicht beschränkt auf
> automatisierte Abfragen und Auswertungen (Crawlen, Parsen, Text- und Data-Mining),
> sofern nicht über § 60d UrhG zulässig, ist nur mit ausdrücklicher Genehmigung
> gestattet."*

BBAW also reserves its § 44b UrhG rights. § 60d is the research-organisation
exception and Lexi is a public application, so automated querying would need express
written permission. **The API answering a request is not permission** — that is the
whole trap, and it is why the licence check goes before the integration rather than
after it.

Recorded in `ATTRIBUTIONS.md` under a new *Sources considered and rejected* section,
with what it would take to revisit (ask BBAW, record the answer). A licence check is
cheap the first time and invisible the second.

**Wikidata Lexemes** is the more promising direction — CC0 and built for automated
use — but its SPARQL endpoint returned 502 when probed, so whether German verb
paradigms are populated there is **unconfirmed** and it is filed as a candidate, not
a plan. UniMorph likewise, unprobed.

So the ambiguous-prefix senses (`umstellen`, `hängen`, `überfahren`, `überholen`)
stay open, and stay documented, rather than being resolved against a source Lexi is
not licensed to query.

---

### Shipped 2026-08-15 — a second source, and three real errors it caught

Pushed on why the pipeline only ever asks de.wiktionary, the honest answer was that
`verify.ts` and `gender-audit.ts` chose it and nothing since re-examined the choice.
Two things came out of actually looking.

**The first source was under-used.** Wiktionary carries `Flexion:` pages with the
**complete** paradigm — every person, both passives, both Konjunktive. The summary box
this pipeline had been reading gives only `Präsens ich/du/er`, `Präteritum ich`,
`Partizip II` and `Hilfsverb`, which is why the 102 verbs shipped an hour ago had their
du- and ihr-forms derived by rule. The full table states them.

Checked all 101 that have one: **95 agreed, 6 differed**, and the six split three ways.

- **Two were my rule being wrong.** `gleiten` → *glittest*, not *glittst*; same for
  `überschreiten`. The `-tt` exception I wrote was invented.
- **One was a real split error.** `umgeben` is inseparable — to surround. The generated
  entry read *gabst um*, a separable reading German does not use here.
- **Three are the ambiguous-prefix sense problem already on record**: `hängen`
  (strong "be hanging" vs weak "hang something"), `überfahren`, `überholen`. The
  `Flexion:` page follows a different sense from the card. Left standing and documented
  rather than flipped, because picking the wrong one is how *umstellen* got in.

**DWDS answers too** — `https://www.dwds.de/api/wb/snippet?q=…` returns JSON, and it is
the Berlin-Brandenburg Academy of Sciences dictionary, a stronger authority than
wiktionary for exactly the sense disambiguation those last three need. Not wired in
here; recorded as the obvious next source, with the licensing check that any new source
needs before its facts enter the corpus (`ATTRIBUTIONS.md` is the gate).

The `Flexion:` HTML is cached under the already-gitignored `scripts/corpus/data/`, so
re-running costs nothing.

827 tests green. Reader probe unchanged at verb 174/185.

---

### Shipped 2026-08-15 — the long tail closes: every verb card conjugates

The remaining 102. **Zero verb cards are now marked unreliable**, and 1,064 of 1,079
have a generated form the reader resolves — from 887 this morning.

**The stems are not written from memory.** `Präsens_ich/du/er`, `Präteritum_ich`,
`Partizip II` and `Hilfsverb` come from each verb's de.wiktionary entry, fetched and
cached; only the remaining persons are derived by rule. That follows the pipeline's
standing rule that facts are never generated, and it is the only reason a batch this
size is defensible — 102 verbs is roughly 1,400 forms, well past what reading by eye
can carry.

**A machine check replaces the eye, and states what it covers**: every one of the 102
entries reproduces the dictionary's own preterite, participle and auxiliary exactly —
0 disagreements. The first generated pass was wrong and the check caught it: weak
preterites already end in `-e`, so the plural ending is `-n`, and appending `-en` gave
**abonnierteen**.

**Two limits, stated rather than buried.** The derived persons are rule-based, so a
du- or ihr-preterite could be off where German is irregular there; the forms
recognition actually depends on — 3sg preterite and participle — are dictionary-exact,
and those are what the tests pin. And where a prefix is ambiguous these follow
wiktionary's *primary* entry, which is not always the sense the card teaches:
`umstellen` is here as the inseparable "surround" (umstellte/umstellt), not the
separable "rearrange". Worth a pass against the glosses.

Reader probe verb 154/165 → **174/185**; plural, adjective and closed-class unchanged.
814 tests green.

| stage | resolving |
|---|---|
| start of day | 887 / 1,079 |
| `SEED_ROOTS` | 904 |
| ambiguous-prefix rows | 920 |
| strong roots | 962 |
| the dictionary-sourced tail | **1,064** |

---

### Shipped 2026-08-15 — the strong roots, and the verb finding closes

Twenty-seven strong roots join the irregular table, and **a root cascades**: `greifen`
alone rescued *ergreifen*, *angreifen*, *begreifen* and *aufgreifen*. Forty-two verbs
became correctly conjugated from twenty-six rows.

`Er ergriff die Gelegenheit` — the sentence the authoring gate refused two commits ago,
which started this whole thread — now resolves.

**All 42 forms were read by eye, and one was wrong**: `gefrieren` inherited `haben`
from `frieren`, but it takes *sein* (**das Wasser ist gefroren**). That is precisely
the risk the table's own comment names — an auxiliary is the one field a prefixed form
can inherit wrongly — and it was caught by reading the output rather than by trusting
the comment. It has its own row now, and a test.

**The four verbs the seed got wrong are now right, through the table rather than the
seed.** `hervorheben` → *hob hervor / hervorgehoben*, `ausweichen` → *wich aus*,
`abwägen` → *wog ab*, `vorbereiten` → *vorbereitet* (separable, but no `ge-`: it
attaches to *bereitet*, whose unstressed `be-` already suppresses it). The test that
asserted they were refused now asserts they are correct — adding them to `SEED_ROOTS`
would still be the bug; giving them rows is the fix.

**962 of 1,079 single-word verb cards now have a generated form that resolves**, from
887 at the start of the day. Reader probe verb 146/156 → **154/164**; plural,
adjective and closed-class unchanged. 814 tests green.

| stage | resolving |
|---|---|
| start of day | 887 |
| `SEED_ROOTS` (separable bases) | 904 |
| ambiguous-prefix rows | 920 |
| strong roots | **962** |

---

### Shipped 2026-08-15 — the verbs behind an ambiguous prefix

`über`, `unter`, `um`, `durch` and `wieder` sit in neither `SEPARABLE` nor
`INSEPARABLE`, and correctly so: German uses them both ways — *umschreiben* has a
separable reading (rewrite) and an inseparable one (paraphrase). But that meant
`splitPrefix` never reached the tabled root, so `umsteigen` — built on `steigen`,
which has been in the table all along — came out as **umsteigte**.

The ambiguity is real and cannot be resolved by rule, so it is resolved by data:
seventeen verbs, full forms, one at a time. `umsteigen`, `umziehen`, `umgehen`,
`durchfallen`, `übernehmen`, `unternehmen`, `unterschreiben`, `unterscheiden`,
`überweisen`, `umschreiben`.

**The weak members needed to be there too, and a first draft said they didn't.** The
comment claimed they "already conjugate correctly once the prefix is treated as
inseparable". Reading the output: *übersetzen* → **geübersetzt**, *wiederholen* →
**gewiederholt**, *überlegen* → **geüberlegt**, *untersuchen* → **geuntersucht**. The
reliability gate kept all of those out of the index, so no learner was ever shown a
wrong form — but none was shown a right one either. Their participles take no `ge-`
because the prefix is unstressed, and *umtauschen* is the separable one that does:
**umgetauscht**. All seven added, all thirteen pinned by test.

**920 of 1,079 single-word verb cards now have a generated form that resolves**, up
from 904 before this change and 887 before the root seed. Reader probe verb 146/156 →
**148/158**; plural, adjective and closed-class unchanged. 785 tests green.

Still open: the plain strong verbs with no prefix at all — `reiten`, `messen`,
`genießen`, `schneiden`, `braten` — which want table rows of their own.

---

### Shipped 2026-08-15 — 85 separable verbs get their inflections back

Chasing the `ergriff` rejection from the last batch: `conjugate()` marks a verb
`reliable: false` when it cannot vouch for its forms, and the matcher then indexes
none of them. Correct. The problem was *why* so many were unvouched.

A prefixed verb is only split when its **root** is known, and `KNOWN` was seeded from
the lexicon alone — so `aufräumen`, `einordnen` and `zurückkehren` were unsplit and
unreliable purely because *räumen*, *ordnen* and *kehren* are not themselves cards.
The learner met a verb whose preterite and participle resolved nowhere.

`SEED_ROOTS` fixes that with data: German verb roots that exist whether or not Lexi
teaches them. Purely additive — a root can only *confirm* a split the code already
suspected, never invent one, because the prefix has to match too. **85 verbs went from
"no inflection resolves anywhere" to correctly conjugated**, among them `anmelden`,
`ausfüllen`, `aufhören`, `zuhören`, `einkaufen`, `vorstellen`, `feststellen`.

**Reading all 89 by eye caught four that were wrong**, which is the only reason this
list is trustworthy:

| verb | generated | correct |
|---|---|---|
| `hervorheben` | *hebte hervor / hervorgehebt* | hob hervor / hervorgehoben |
| `ausweichen` | *weichte aus / ausgeweicht* | wich aus / ausgewichen |
| `abwägen` | *wägte ab / abgewägt* | wog ab / abgewogen |
| `vorbereiten` | *vorgebereitet* | vorbereitet — no `-ge-` |

The first draft listed strong roots deliberately, reasoning that `isStrong` would gate
anything built on them. That is true for `abheben`, whose `ab` is a gate prefix, and
false for `hervorheben`, whose `hervor` is not. **The list now carries weak roots
only**, and the four failures are pinned by a test so the next person to add a strong
root finds out immediately.

`conjugate.test.ts` also lost an assertion that had encoded the old limitation as
intended behaviour — *"rejects a separable verb whose base is unknown (aufräumen)"*.
The gate is unchanged; `räumen` simply is known now. The test keeps the real contract
with a base that is genuinely not a German verb.

Reader probe unchanged at verb 146/156 · plural 200/200 · adj 187/200. 785 tests green.

---

### Shipped 2026-08-15 — corpus growth, batches three and four

Twenty-six more cards through the authoring gate: Prüfer, Anschlusszug, Display,
Deutung, Egoismus, Verschiebung, Prestige, Schichtdienst, Aufzählung, Anbau,
Großstadt, Zehntel, Zulauf, Brand, Bruch, Charakter, Code, Bohrmaschine, Erpressung,
Fachgebiet, Faden, Gleichgültigkeit, Beschaffung, Ernstfall, ergreifen, entziehen.

`der Prüfer` is worth more than its own card: the matcher derives `-in` feminines, so
it also resolves *Prüferin*, which was the second most frequent gap in the whole paper
set.

**Eight rejections across the two batches, every one of them right.** *die Abholung*
has no de.wiktionary entry and so was not written at all — unverifiable is not the same
as wrong, and neither is a reason to guess. *das Prestige* and *der Code* repeat their
German in the gloss and had to say so with `sameAsGerman`. *der Bruch* and *das
Zehntel* are attested with more than one gender, so the gate refused to pick for the
author. Two named sectors that do not exist and were caught by the check added earlier
today, which suggested the real ones.

And one rejection was a finding: **the gate refused *"Er ergriff die Gelegenheit"*
because the matcher cannot resolve `ergriff`**. Pulling that thread found that
`conjugate()` marks a verb unreliable when it cannot vouch for its forms — correctly —
and the matcher then indexes none of them, which throws away correct German along with
wrong. `antworten`, a regular A1 verb, resolves in neither preterite nor participle.
**192 of 1,079 single-word verb cards** have a generated form that does not resolve.

That last number is solid; the split between *wrong form* and *right form discarded* is
not, and it is recorded as unsized rather than guessed. A first attempt classified
`reitete` and `umziehte` as correct weak German next to `antwortete`, because a
stem+`te` shape test cannot tell a weak verb from a strong one — which is the same
limitation that makes `conjugate()` give up. Sizing it needs a strong-verb list, not a
cleverer regex. Filed in BACKLOG with the three hand-verified hits.

**6,600 → 6,626 cards · papers 94.2% → 94.5% covered · distinct gaps 667 → 638.**
783 tests green, `corpus:validate` PASS.

---

### Shipped 2026-08-15 — corpus growth, aimed by the meter

The meter's own measurement said **7.10% of exam-paper tokens are words the corpus does
not carry at any inflection**. That is the ceiling on every text a learner pastes, so it
is where growth pays — and `corpus:papervocab` already emits the exact list.

**Splitting the list before authoring it separated two very different jobs.** Of 700 gap
rows, **7** were an existing card with an empty `plural` field and **686** were words
with no card at any inflection. The first seven are not authoring work at all: `der
Herr`, `das Bild`, `der Laden`, `die Einstellung` and `der Bereich` all had `plural:
null`, so the matcher had no plural form to index and the reader was calling *Herren*,
*Bilder*, *Läden*, *Bereiche* and *Einstellungen* words the learner does not know.
Plurals read from the de.wiktionary pages `corpus:gender-audit` had already cached, and
applied through `fix-authored`'s expect-guarded `PlRow`.

**Then 22 new cards through the authoring gate, in two batches.** Lesesaal, Arbeitstag,
Lehrkraft, Anrufbeantworter, Zuschuss, Vorbehalt, Angabe, Bequemlichkeit, argumentieren,
Assistent, Buffet, Speisewagen, Nachtzug, Hallenbad, Zertifikat, Anregung, Anschaffung,
Ausfall, Verlegenheit, auswendig, frühestens, abschalten. Gender, plural and IPA came
from the dictionary rather than from the author, and every example was checked to
contain a real inflection of its headword by the app's own matcher.

**The gate caught one thing and missed another, and both are now fixed.** It rejected
*das Buffet* for a gloss that repeats the German term — correct: "buffet" genuinely is
the same word, and saying so with `sameAsGerman` is the difference between a stated fact
and an unfilled field. But it accepted three **sectors that do not exist** ("Restaurant &
Ordering", "Feelings & Emotions", "Time & Dates"), because a wrong filing is not a
linguistic error and none of the dictionary checks can see it. `corpus:validate` would
have caught it afterwards, but this gate's promise is that it *refuses to write a card it
cannot verify*, and a sector is part of the card. It now checks, and suggests the near
matches — verified by feeding it a fresh term with an invented sector and watching it
refuse.

**6,578 → 6,600 cards · papers 93.7% → 94.2% covered · distinct gaps 706 → 667.**
783 tests green, `corpus:validate` PASS.

---

### Shipped 2026-08-15 — the comprehension meter, Phase 2: texts that come back

Saved texts, each with a meter that moves while you study. BACKLOG's framing is that
this is **the app's first return mechanism that is not about the app**: everything else
brings a learner back to watch their own numbers move, and a saved text brings them
back because they want to read *it*.

**The body is stored, not a list of unknown-word ids**, and that is the whole design —
the figure is recomputed against today's FSRS state on every store change, so a
snapshot of what was unknown last week cannot masquerade as a live meter.

Proven end to end in the browser rather than argued: paste a paragraph, save it, take
the unlock session, grade two cards, come back. The shelf row went from
*"0 of 7 words · 7 to go"* to *"0 of 7 words · **1 learning** · 7 to go"* on its own.

That run also produced a real fix. The row first showed only `known` and `to go` — but
a single grade moves a card to **Learning**, not Review, so a learner who had just
studied three of these words would return to a shelf that looked untouched. `learning`
is now on the row. The meter was right and the copy was hiding it.

⚠️ **Learner-supplied text only.** BACKLOG is explicit that bundling someone else's
journalism is an unanswered licensing question — DW's *Langsam gesprochene Nachrichten*
is the obvious fit and is not automatically redistributable. Nothing here ships
content; it stores what the learner pasted, on their own device, capped at 24 texts and
40k characters each so it cannot eat the localStorage budget the rest of the store
shares.

783 tests green (+5).

---

### Shipped 2026-08-15 — Lesen stops calling `große` a word you don't know

The follow-up logged when the meter shipped: `reader.ts` kept its own surface index,
built from terms, plurals and verb conjugations and **nothing else**. Measured over one
example per card — 32,713 tokens — the matcher resolved **2,076 of them (6.3%) that the
reader did not**. Every one was a word Lesen was reporting to the learner as unknown:
adjective declension (`große`), dative plurals (`Hunden`), `-in` feminines (`Lehrerin`).

**It is a fallback, not a replacement, and the measurement is why.** The two indexes
disagree on **520** of the 22,861 both resolve — and on the capitalised ones the
*reader* is right. German capitalises nouns, so `Essen` is the meal and `Morgen` is the
morning; `lookupSurface` checks an exact-case map before a lowercase one, which is
disambiguation the matcher has no equivalent for. So the maps still answer first and
the matcher only catches what they miss. Nothing that resolves today can start
resolving differently.

(The first measurement fed the matcher bare tokens and reported 283 disagreements. That
disables exactly the context-sensitive half — homographs and separable verbs — that
makes it better than a map lookup. Re-measured on whole sentences: 520. The smaller
number was the more flattering one and it was wrong.)

`src/lib/appMatcher.ts` now holds the one lexicon-keyed matcher the app shares, so the
reading surface and the meter cannot build separate ones and drift. It sits outside
`matcher.ts` deliberately: that module is imported by the corpus scripts under node,
where `WORDS` does not exist.

778 tests green (+3).

---

### Shipped 2026-08-15 — the comprehension meter, Phase 1: the surface

`src/views/Read.tsx`, on `#/read`, reached from inside Lesen on Today — the same
section, on purpose, because "one reading place, not two" is the whole point of
building Phase 1 on Lesen rather than beside it.

Paste German, get the number with **the count beside it** — *"0 of 14 content words
known · 14 more words to reach the 95% mark"* — the ranked words that get you there,
and the passage read back with your own state on it.

**The read-back matches Lesen's visual language rather than inventing one.**
`ReadingList` already marks a word the learner has not met as `text-amber underline
decoration-dotted`, so the meter does too. Known words stay plain ink: the gaps are
what the eye should catch, and a passage where every readable word is coloured is a
passage nobody reads. The key is rendered from the same `TINT` map as the text, so it
cannot drift out of sync with what is on screen. (A first draft used `text-blue`,
which is not a token in this theme at all — `--color-amber` *is* the Atlas blue.)

**`unlockText` on a custom target** carries the learner's own text into
`buildMixedSession`, which gives the flips `{ kind: 'unlock' }` instead of `fresh`.
Verified end to end in the browser: pasting a paragraph and pressing *Study these 14*
opens a session whose first card reads **"Because you want to read „Der große Hund und
die Katze schlafen im…"**. Drills woven in beside those flips still explain themselves
as drills — only the flips carry the unlock reason, because only they are the words
standing between the learner and the text.

The live run is also the clearest demonstration of why the meter runs on the matcher
and not on Lesen's index: `beschlossen` resolved to **beschließen**, `große` to
**groß**, `hat` to **haben**, `war` to **sein**. On the reader's index all four would
have been reported as words the learner cannot read.

**Phase 1 is complete.** Phase 2 (saved texts with a live meter) and Phase 3 (narrow
output) remain, as does converging `reader.ts` onto the matcher.

775 tests green.

---

### Shipped 2026-08-15 — the comprehension meter, Phase 1: the number

`src/lib/coverage.ts`. Paste a text, get the share of it you can actually read,
against Hu & Nation's 95/98% bands — **with the count, not just a percentage** — plus
the ranked set of words that carry you over the line.

**The denominator is the whole feature**, so three decisions are written into the file
rather than left to a caller:

1. **Function words, ordinals and spelled-out cardinals are excluded.** Knowing *und*
   or *achtzig* is not vocabulary knowledge and counting it pushes every text toward
   the same score.
2. **Only *structural* proper nouns are excluded** (`isLikelyEntity`, two or more
   capitals). The capitalised-and-unresolvable rule stays rejected — it was measured,
   it swept up 328 distinct tokens most of which are real vocabulary, and it inflates.
3. **A word the corpus has never heard of still counts against you.** Excluding it
   would rebase the score on Lexi's own coverage and report *the corpus's* ignorance
   as the learner's fluency. `ceiling` states the cap out loud, so a text that cannot
   reach 95% on this lexicon says so instead of quietly offering an unlock set that
   would not get there.

**Which index — measured, not assumed.** The backlog says build Phase 1 *on* Lesen "or
the app ends up with two reading surfaces that disagree". The intent is one shared
definition of *known*, and building on `reader.ts` would not have delivered it: that
index is strictly thinner. Head to head, `große` → nothing, `Hunden` → nothing,
`Lehrerin` → nothing, where the matcher resolves all three. A meter on the reader's
index would report every inflected adjective and every feminine as unreadable. So it
runs on `buildMatcher` — which Phase 0 ported app-side for exactly this reason. The
remaining duplication is `reader.ts`'s own index, now tracked as follow-up: converging
it changes what Lesen picks as i+1, so it deserves its own measurement.

**`{ kind: 'unlock'; text }` joins `SessionReason`**, packed and unpacked with the
resumable session and given a `whyLine` case — *"Because you want to read „…“"*. It is
the one reason the learner chooses themselves, so it names their own text rather than a
Lexi concept, and it keeps the rule that nothing enters a session without saying why.

Phase 1 done-when, met: a hand-counted sentence is asserted token by token (6 counted,
5 resolvable, *Berlin* absent and counting against); the unlock set demonstrably raises
the figure on re-check; `whyLine` has a tested `unlock` case; proper nouns and function
words leave the denominator by the rules `isNeutralWord`/`isLikelyEntity` already
decide. **Still to build: the paste surface and the read-back view.**

One test caught itself being wrong, which is the point of writing them first: a fixture
sentence contained *gut*, not a card in that fixture, and one absent token in a
seven-token text caps coverage at 85.7% — so `unlocksToReach` correctly reported it
could not reach 95%. The code was right and the test was wrong.

775 tests green (+16).

---

### Shipped 2026-08-15 — Lesen had the same bug, for one day

The plural-notation fix landed in `matcher.ts` and **not** in `reader.ts`, which keeps
its own surface index for the reading surface. For a day `Vorschläge` resolved for the
comprehension meter and not for Lesen — precisely the *"two reading surfaces that
disagree"* hazard BACKLOG Now #2 warns about, created by fixing one of the two indexes.

`reader.ts` now expands through the same `pluralForm`, and `reader-index.test.ts` exists
so the next divergence fails a test rather than quietly telling a learner two different
things about one word: one case per notation asserted against **both** indexes, plus the
rule that a notation must never itself become a lookup key. Mutation-checked — restoring
the raw indexing fails 6 of the 9.

**Both 🔴 blockers on Phase 1 are now cleared, and both were largely stale.** The verb
finding re-measures at **6.4%**, not 21.6%, with all three cited defects fixed (`weiß` →
wissen, `rufe` → anrufen, `Gib` → geben) — and much of the remainder is not a matcher
defect but examples that genuinely lack their headword, separated multiwords, and terms
carrying notation (`verzichten auf + A`, `das Gericht (Essen)`) that the probe has to
strip. Phase 1 is unblocked.

759 tests green (+9).

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
