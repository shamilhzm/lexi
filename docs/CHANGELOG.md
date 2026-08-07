# Lexi — Changelog

What has shipped, newest first. Split out of `BACKLOG.md` once the shipped history
grew past 750 lines and started burying the twenty lines of open work that file is
for. The backlog answers "what next"; this answers "why is it like this" — every
entry keeps the reasoning, because the reasoning is the part that stops a decision
being quietly undone later.

Nothing here is a to-do. If an entry describes something you are about to build,
it is already built.

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
  [`docs/UX-PATHS.md`](UX-PATHS.md): happy / sad / frustrated walkthroughs traced
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
  sessions** ([`SIMULATED-SESSION.md`](SIMULATED-SESSION.md), stand-in until a
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
