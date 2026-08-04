# Lexi — Backlog

The one prioritised list of **open** work, reconciled against the actual `src/`, so
it overrides anything in the older strategy docs. Shipped work and the reasoning
behind it live in [CHANGELOG.md](CHANGELOG.md).

Effort key: **XS** <½ day · **S** ~1 day · **M** a few days · **L** 1–2 weeks.
Each item lists *Why · Do · Done-when · Touches*.

Where a number appears (1,021 duplicate cards, 1,493 flagged definitions) it came
from a script in `scripts/corpus/`, not an estimate. Re-run the script before
trusting it — the last four times a count was guessed here it was wrong by a third.

> **Consolidated 2026-08-04.** Four parallel branches were merged into one history
> (see the CHANGELOG entry). This file was rebuilt from both surviving backlogs —
> the Atlas/personas list on `main` and the open-work list on the stranded branch —
> with everything closed moved to the CHANGELOG and the duplicates folded together.
> Three pairs of items turned out to be the same item written twice: corpus growth,
> the mobile pass, and the reader. They are now one each.

---

## Now

Ordered. The reasoning for the order is in each *Why*; the short version is that
**#1 unblocks eight items that are written but unproven**, and it costs a day.

### 1. The real-device pass · S · 📱 — *do this first*

**Why.** Not because it is the most valuable item, but because it is the cheapest
way to stop lying in this file. Eight items across the Fifty are **written,
plausible, and unverified on hardware**, and they cannot be called done from a
browser: the 44px touch targets (gated on `any-pointer: coarse`, which no desktop
viewport reports), the "Tap the card" hint, safe-area insets in standalone PWA
mode, Dynamic Type at the largest accessibility sizes, iOS storage eviction after
7 days of ITP, `haptic()` and the WebAudio blips (iOS needs a gesture to unlock
audio), the keyboard covering typed drills, and the HD voice's ~25 MB download on
a mobile connection. Every one of them is currently a claim.

The audit that produced the Fifty said this out loud and it is still true: the
iOS Simulator was unavailable (host had Command Line Tools only, no `simctl`), so
every "mobile" finding to date is a 375×812 *browser* viewport that reports
`(hover: hover) and (pointer: fine)`.

**Do.** Unblock the toolchain first —
`sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` — then run a full
session on a real iPhone *and* a real Android, in the browser and installed, at
default and largest text sizes, in both themes, offline after a cold start.
Specifically check: safe areas (notch, Dynamic Island, home indicator) on the
session surface and bottom nav; the `UmlautBar` sitting above the keyboard rather
than behind it; that a 90px horizontal swipe (`SWIPE_PX`) never fires during a
vertical scroll of a long C1 reveal; one-handed reach on the grade buttons;
landscape; and the 320px floor, where the Library's rule `pairs` render in a
three-column grid that already wraps at 375px.

**Done-when.** A full session — flip, every drill type, recap — is comfortable
one-handed on a 375px phone with the keyboard up, installed and offline; no
horizontal scroll at 320px; and each of the eight claims above is either confirmed
or has a bug filed under it.
**Touches.** `src/index.css`, `views/Review.tsx`, `components/BottomNav.tsx`,
`components/UmlautBar.tsx`, `views/GrammarDrill.tsx`.

### 2. The comprehension meter — the flagship · L (decided 2026-07-27)

**Why.** From the competitive pass ([COMPETITIVE-RESEARCH.md](COMPETITIVE-RESEARCH.md)):
Lexi builds an honest per-lemma knowledge model and spends it entirely on describing
itself. The 95–98% **lexical coverage threshold** (Hu & Nation; Kremmel et al. 2023) is
the most robust finding in reading-based SLA, and every competitor approximates it
badly — Lenguia scores text by generic CEFR band, LingQ by an admittedly inflated
word-form counter its own staff calls *"the mechanical rabbit at a dog race"*, graded
readers by a population average. FSRS state **is** a forgetting-aware per-lemma model,
which makes Lexi the only product in the category able to compute the number honestly.
It is also the first feature that makes the corpus bottleneck stop mattering: unknown
words arrive from the learner's own text instead of the hand-gated word list.

**Scope ruling (2026-07-27).** *Additive.* Known and the market **stay the headline**;
the meter is a new first-class surface, not a replacement identity. The full reframe was
argued and declined — see the ruling block in COMPETITIVE-RESEARCH §5.

> **Reconciled 2026-08-04.** A reading surface already shipped on the stranded
> branch — **Lesen** (`lib/reader.ts`, `components/ReadingList.tsx`, surfaced on
> Today): sentences you can almost read, drawn from the existing corpus. It is a
> genuine down-payment on this item and it does the **retrieval** half. What it does
> not do is the **measurement** half — report coverage against the 95/98 bands for a
> text the learner brings. Build Phase 1 *on* Lesen rather than beside it, or the app
> ends up with two reading surfaces that disagree.

**Phase 0 · prerequisites (S).** Land these first; each is independently defensible.
- Port `buildMatcher` back app-side from `scripts/corpus/matcher.ts`. It is already
  self-contained (imports only `conjugate`/`types`, takes the corpus explicitly) and
  covered by 8 tests. Keep one implementation — the pipeline should import the app's,
  not the reverse of what the July prune did.
- Extend `freqRank` to all cards in the build. It currently covers a fraction
  (`public/data/provenance.json`) and comes from Leipzig lists `build.ts` already loads.
- Order fresh cards by frequency *within* a CEFR band in `firstRunIds`/`weakestSectors`,
  not by band alone — so the most useful words in a band surface first.

**Phase 1 · the meter (M).** Paste (or save a URL's text) → annotate via the matcher →
report coverage against the 95/98 bands, honestly and with the count, not just a
percentage. Then: *"the N words that get you over the line"*, ranked by frequency ×
recurrence in this text, one tap into the session as a `{kind:'custom', ids}` target
carrying a **new `SessionReason`** — `{ kind: 'unlock'; text: string }` — with a
`whyLine` case, so the scheduler shows its work here too ("because you want to read
this"). Plus the read-back view: known/learning/new tinting from FSRS state, tap for
gloss + gender/plural, tap to add.
**Done-when.** A pasted text reports a coverage figure that matches a hand count; the
unlock set demonstrably raises it on re-check after those cards reach Review; `whyLine`
has a tested `unlock` case; proper nouns and function words are excluded from the
denominator the way `isNeutralWord`/`isLikelyEntity` already decide.

**Phase 2 · the library that returns (M).** Saved texts, each with a **live meter that
moves as you study** — the app's first return mechanism that isn't self-referential.
Listening is now genuinely cheap here: `lib/audio.ts` and the Piper HD voice both ship.
⚠️ **Licensing:** ship learner-pasted text and learner-saved URLs only. Do not bundle a
feed of someone else's journalism — DW's *Langsam gesprochene Nachrichten* is the
obvious fit and is **not** automatically redistributable. Check terms before any
bundled content. (The Tatoeba audio allow-list in `corpus:audio` is the precedent for
how carefully this needs doing.)

**Phase 3 · output, narrowly (M).** Not a chatbot. *"Write one sentence using these
three words"* with grounded, mostly-deterministic checking, reusing `norm`, the
`editDistance1` near-miss grading that now ships, and the hint ladder. Local-first
survives. On-device WebGPU (a ~1B model is fine for a <100-token correction, useless
for conversation) is an implementation option here, not a strategy — see the refusals
list in COMPETITIVE-RESEARCH §5.

**Touches.** New `src/lib/matcher.ts` (moved), `src/lib/reader.ts` (extend),
`src/lib/coverage.ts` (new), `session.ts` (`SessionReason`, `whyLine`), `store.ts`
(saved texts), `scripts/corpus/build.ts` (freqRank fill).

### 3. Cross-level duplicate cards · M, human-gated

**Why.** **874 terms sit on more than one card; 1,021 cards are redundant — 14% of
the corpus.** `die Miete` exists at A1, A2, B1 *and* B2; `die Haltestelle` three
times. Each copy carries its own FSRS schedule, so a learner meets and re-learns
the same word up to four times. This is exactly the defect the capitalisation pass
fixed for 62 cards while a thousand more sat untouched. It also inflates every other
content programme: 75 duplicate groups still have a copy awaiting a definition, so
that authoring would be done two and three times over.
**Do.** Triage by group, never in bulk. Some pairs are genuine homographs — `der See`
/ `die See` differ by article and so do not collide on term, but check for others
before assuming. Keep the lowest level, fold the rest through the existing `casefix`
id-map path so schedules survive the merge (`store-idmap.test.ts` guards that the
schedules actually travel). Record a reason per group the way `case-rulings.tsv` does.
**Done-when.** Every duplicate group is merged or carries a written reason;
`src/data/idmap.ts` covers every retired id; tests still green.
**Touches.** `scripts/corpus/`, `public/data/vocab.json`, `src/data/idmap.ts`.
> **Do this before item 5.** Otherwise a share of those definitions gets authored
> more than once.

### 4. The Atlas, pass 2 — composition and continuity · M

**Why.** The five P0s are closed (CHANGELOG, July 28 + 31). What remains is the
diagnosis the twelve personas actually returned: the aesthetic promises density,
precision and liveness, and the implementation still ships sparseness and
compression in places. These are the ranked survivors, and they are mostly *layout*,
which is why they group into one pass rather than fifteen tickets.

**Composition (the largest remaining visual finding).**
- **Break the single-column stack (#19 · M · P1).** Six identical rounded rectangles
  at one width on a 1280px screen, each with 40–60% empty space to its right.
- **The desk is letterboxed on desktop (#22 · S · P1).** DESIGN.md §8 promises
  full-bleed; an ~800px column in a 1280px viewport is not that.
- **The card becomes a lexicon entry (#21 · M).** Headword · IPA · POS · sense ·
  citation is already the content model; the layout doesn't use it. Also closes the
  ~250px of dead space inside the card on desktop.
- **Content clips at both widths (#5 · S · P1).** One of the four measured clips was
  fixed; three remain — deck names 252→188, Today overflowing its own column by 8px
  (999>991 desktop, 350>342 mobile), and a Today `text-2xs` line clipping 406→237.
- **Mobile Progress spends ~200px on chrome before any map (#30 · S · P1)**, the FAB
  overlaps the treemap (#31 · XS · P1), and coach marks eat 200px of 812 (#32 · XS · P1).
- **The ticker is clipped, and on mobile it is noise (#28 · S · P2).** Partial "7%"
  against the sidebar edge on desktop; 3.5 items and a mid-word cut at 375px.
- **Empty and first-run states (#29 · S).** First-run Today spends ~60% of a desktop
  viewport on nothing — the one screen where density would reassure.

**Continuity and affordance.**
- **Shared-element continuity, tile → sector (#9 · M · P1).** `layoutId` appears
  **once** in the codebase; the one navigation where the same object exists on both
  sides is a hard swap. DESIGN.md §7's continuity rule, applied.
- **Tile hover/press affordance (#25 · XS · P1).** A desktop region that doesn't
  acknowledge the pointer reads as an image.
- **The interaction hint sits below the fold (#26 · XS).** "Long-press to study" is
  documented where it cannot be seen, on both viewports.
- **The goal line is styled as a footnote (#23 · XS · P1)** — the most motivating
  sentence in the app, at 14px between two large cards. And **"+ 4 drills targeting
  your blind spots" is red (#24 · XS · P1)**, which reads as an error for the app
  doing you a favour.

**Also here, cheaply.**
- **Category hue per theme group (#20 · M).** Fill encodes magnitude; hue should
  encode identity, consistently across map, decks, cards and stats.
- **Retire the `--color-amber` misnomer (#27 · XS).** A token named amber holding
  Atlas blue, having previously held cyan. Rename with a codemod.
- **`--color-der` and `--color-a1` are the same hex** in both themes (#2d5be3 light /
  #7fa5ff dark) — one colour carrying two unrelated meanings. Found during the July 27
  gender-ink work and preserved through the merge; needs a contrast pass, not a guess.

**Done-when.** The desk is full-bleed; no measured clip remains; the treemap
drill-down transforms rather than cross-fades; one documented motion scale applied.
**Touches.** `App.tsx`, `index.css`, `views/{Progress,Markt,Review,Today}.tsx`,
`components/CountUp.tsx`, `lib/ui.ts`, `docs/DESIGN.md`.

### 5. The definition programme · L, human-gated

Two items that were tracked separately and are one queue.

**5a. Definitions that discriminate senses, not enumerate translations.**
**Why.** `def` is largely raw sense-listing rather than a definition.
`corpus:definitions` reports **1,493 cards** across three kinds: *enumeration* (1,064 —
"railway depot, railroad station, railway station, train station"), *bare* (363 — a
lone synonym), *repeat* (138 — "to eat; to eat; to dine"). A list of translations only
says what else the word could be called, which the `en` gloss already did.
**Do.** `corpus:definitions --write` emits batches; author worst-class-first and apply
through `fix-authored.ts`, which refuses a replacement that merely repeats the gloss.
A1 and A2 are the most-seen and are already down to 15.6% / 24.5% flagged.
**Watch for sense bugs, not just style** — this pass has already turned up `der See`
defined as "sea, ocean" (that is *die* See), `das Fleisch` as "flesh", `billig` as
"appropriate, meet, fair" (the archaic sense), and `mir` carrying the definition of an
oriental carpet.
**Done-when.** `repeat` and `bare` at zero; `enumeration` trending down and no longer
concentrated below B1.

**5b. Finish the English definitions the German migration displaced · S.**
**Why.** 391 cards carry a German definition in `defDe`; **286 have no English one at
all** (A2 66, B1 165, B2 36, and a handful above). Those cards render without a
definition block for anyone below B2.
**Do.** Author English definitions for the B1 set next — it is the largest.
**Done-when.** `corpus:definitions` reports 0 cards with no English definition.

**Touches.** `scripts/authoring/batches/def/`, `public/data/vocab.json`.

### 6. Grow the corpus toward ~10k + rebalance A1/A2 · M, ongoing

**Why.** Distribution is B1-heavy — backwards for early reading — and core
high-frequency lemmas are still missing. The pipeline is green (`corpus:selftest`,
`corpus:validate` PASS) but growth **needs a network- and LLM-enabled maintainer
machine plus human spot-checks of gender/plural/level — not an autonomous bulk
commit.**
**Do.** `corpus:coverage` → build A1/A2 batches → `corpus:validate --strict` → review
the diff → commit, in reviewable batches. Close the top-frequency gaps first.
**Source material:** `reference/DaF Wortschatz/` — 69 page-mapped scans of a complete
A1–B1 Lektionswortschatz (Lektion → Feld → Wortart); see its `MANIFEST.md`.
`IMG_4850` is the irregular-verbs appendix — feed it to the conjugation engine's
known-verb checks.
> **The extraction rules** used to live in `archive/COHESION-PLAN.md`, deleted in the
> July tidy. They are: entries are *selected and authored* in the book's style, never
> transcribed wholesale; level is the book's placement, honesty-bumped where DaF runs
> ahead of CEFR; nouns map to existing sectors, verbs and adjectives fall to POS
> defaults. Recorded here because the file they were in is gone.
> *Still open from the DaF passes:* L19–L30 (B1 scans), ~197 A2 book lemmas below the
> frequency scan or without examples, and C1/C2 register.
**Done-when.** ≥95% of the top ~2,000 lemmas per level; A1/A2 filled; validate green;
load size still acceptable.
**Touches.** `scripts/corpus/*`, `public/data/*.json`.

---

## Next

**The study loop.**
- **Show the queue shape · S** (#15). A progress rail distinguishing due from fresh
  from drill, so "246 left" becomes a thing with an end you can see.
- **Interleave the drill types visibly · S** (#11). A session can run 20+ flips before
  a drill. Surface the mix ("14 cards · 4 drills") *before* it happens, not only after.
- **Blind spots rank by raw count, not rate · S · P1** (#10). Drilling a mode makes it
  look worse; avoiding one makes it look fine. Divide by attempts.
- **The circuit breaker should offer a *softer* item, not just an exit · S** (#18).
  After four misses the kindest move is an easy win, not a door.
- **Undo should be reachable after the card leaves · XS** (#12). *Previous card* exists
  at 43×43 in the chrome; nobody finds it in the half-second they want it. (The undo
  *logic* bug — a rewound review still feeding `reviewedToday()` — is fixed.)
- **Grade from the front face without flipping · XS** (#13). A power user who knows the
  word shouldn't need the flip round-trip.
- **Typed answers need mobile keyboard hints · XS · 📱** (#16). No `autocapitalize`,
  `autocorrect`, `spellcheck` or `enterkeyhint` on the answer input. iOS will
  autocapitalise and autocorrect German, then mark the learner wrong for it. *Fold into
  item 1.*
- **Reduce the session chrome · S.** DESIGN.md promises the session is "full-bleed, no
  chrome at all"; it renders inside a card with a header, a chip, four icon buttons and
  a progress bar. Move flag / sound / undo / skip behind one overflow control. Pairs
  with the reach work in Now #1 and the letterboxing in Now #4.

**Legibility of the machine.**
- **Make the scheduler's reasoning visible from outside a session · S · P1** (#50).
  `WhyThisCard` is the app's genuine moat and its strongest word-of-mouth asset, and it
  is invisible unless you are three cards deep. The single cheapest thing on this list
  that changes how the product is *described*. Confirmed still session-only 2026-08-04.
- **Search across the 128 concepts · S · P1** (#38). No way to find *Konjunktiv* without
  expanding levels and scrolling. Confirmed still absent 2026-08-04.
- **Name the session's best moment on the card, not just the recap · XS** (#46).
  "Comeback of the day" exists and fires where nobody is looking.
- **Finishable things · S** (#47). A fully-known sector is finite and earned; DESIGN.md
  §8c calls this out and only the recap ever mentions it.
- **Weekly arc · S** (#48). A seven-day view — words added, retention, the goal line's
  slope. Daily is too granular, "since forever" too coarse.

**Content and pedagogy.**
- **370 word cards carry an empty `pos` · XS–S.** Invisible today, but it is the same
  latent gap that produced the capitalisation mess: a card with no part of speech
  cannot be classified by any rule, so it silently opts out of the drills, the family
  index and half the validators. *Do:* infer where the article makes it unambiguous, rule
  on the rest by hand as `case-rulings.tsv` does.
- **The remaining C2 stylistic points · S, hand-authored.** Register, ellipsis and
  Ausklammerung were deliberately deferred from the grammar pass as judgement-heavy and
  a poor fit for auto-drilling. *Stilebenen* shipped; the other two have not. (Every
  other gap in the mastery pass now has a point with ≥5 exercises.)
- **C1/C2 register depth · L, human-gated** (#37). Confirmed by the two most credible
  personas. The promise "grows with you A1–C2" thins exactly where it is hardest to keep.
- **Register and collocation on C1+ cards · M** (#45). Synonyms exist but aren't
  differentiated by register, which is most of what C1 vocabulary work *is*.
- **Exam alignment without an exam simulator · M** (#43). Goethe B1 is the most-taken
  certificate in the category. *Exam conditions* shipped; the alignment did not — the
  app knows his level, pace and weak modes and never says "your weakest area *for B1*
  is Kasus".
- **Heritage / uneven-profile learners · M** (#41). Placement assumes ignorance is
  uniform. Yusuf tests C1 on vocabulary and B1 on orthography and the app has one number
  for him. Skill-scoped drills rather than level-gated ones.
- **A maintenance mode for the arrived · S** (#42). At C2 the value inverts: low-volume,
  high-interval, rare vocabulary. FSRS is already excellent at this; the app never
  offers it as a shape.
- **Textbook-chapter decks · M** (#44). Netzwerk, Menschen, Schritte, Begegnungen.
  Becomes cheap once the comprehension meter lands — paste the chapter.
- **Discourse-level cloze · S–M.** Gaps are single words in single sentences; B2 needs a
  paragraph with the connectors removed. Blocked on having paragraphs — Lesen ships
  sentences — so it needs a short authored text set, or Now #2 Phase 2.
- **Reading-first mode above B2 · M.** Lesen exists; this is the surface around it —
  fewer numbers, longer texts, marginal glosses.
- **Listening, phase 2 · M.** Phase 1 shipped the audio layer and made the example
  audible. Phase 2 is the *mode*: a listen-first card where the prompt is the sound.

**Platform and reach.**
- **Performance budget · M · P2** (#49). `vocab.json` is ~5MB and the build warns above
  500kB (currently 630kB JS). Awwwards jurors test on real devices; so do learners on
  3G. Split the corpus by level and fetch on demand.
- **Storage durability re-check on iOS · S · 📱** (#36). `navigator.storage.persist()`
  ships; nobody has confirmed it survives 7 days of ITP on a real iPhone. The failure
  mode is total, silent data loss. *Fold into item 1.*
- **Web Push for installed PWAs · M** (#34). The deliberate day-2 return mechanism,
  still undecided. A local notification from the existing reminder watch is the
  serverless version.
- **Home-screen widget / Live Activity · M · 📱** (#35). "3 due" on the lock screen is
  the highest-leverage retention surface a local-first app can own without a backend.
- **Share and arrival readiness · S each.** The OG image still points at
  `/icon-512.png` with `twitter:card: summary`, so a shared link unfurls as a small
  square: render a real 1200×630 hero (reuse the canvas in `lib/sharecard.ts`) and
  switch to `summary_large_image`. Add a first-visit landing for link arrivals.
- **Illustration artwork — match the reference style · M.** The curated line-art layer
  that replaced emojis (`lib/illustration.tsx`, 54 concepts + a group-emblem fallback)
  is a solid first pass that does not match the intended look, and is **disabled**
  behind `SHOW_ILLUSTRATIONS = false`. ⚠️ The reference screenshots live in the
  gitignored `reference/` folder on the maintainer's machine — **pin the target style
  somewhere durable before starting, or this item cannot be picked up by anyone else.**

**Validation.**
- **Run the *real* friend session · S.** The flagged-cards list, typo tolerance and the
  day-2 habit anchor all shipped; what no simulation supplies is a person. *Do:* sit a
  real beginner down with it and record what the twelve personas got wrong. **That delta
  is the deliverable**, not the session notes. Every finding in this file above the
  "real-device" line came from a simulation or a DOM audit; none came from a learner.

---

## Later / needs a decision before it can be built

- **Extended production · L, part research** (#40, Swain). Diktat is the only writing,
  and it works *because* the target is known to the character. Free composition cannot
  be graded honestly without a model, and a drill that marks correct German wrong is
  worse than no drill. Decide the shape before building anything. Overlaps Now #2
  Phase 3, which is the narrow, deterministic version.
- **Billing / €5 supporter tier.** The whole freemium split in
  [ROADMAP.md](ROADMAP.md) depends on it. No infra; the Support link (→ GitHub) and any
  Pro gating wait on this.
- **B2B / Sprachschule.** Sequenced deliberately **after** consumer
  (COMPETITIVE-RESEARCH §5–6). Most of [SCHOOL-PITCH.md](SCHOOL-PITCH.md)'s gap list
  isn't built.

---

## Decisions required — not build items

- ~~**Commit out loud to "English-base learners"**~~ — **settled 2026-07-27.** Lexi is
  English-base, said out loud in the root README and the first-run hero. The German
  definition layer (`defDe`, shown from B2) is the deliberate exception, gated on the
  *learner's* level rather than the card's, and `showsGermanDefs` exists so the rule is
  testable on its own.
- ~~**The name and the aesthetic**~~ — **settled 2026-07-28.** The terminal was retired
  for the Atlas; the fintech reading goes with it. See [DESIGN.md §1](DESIGN.md).
- **Bundled reading content.** Open. Phase 2 of the meter wants a feed, and the obvious
  fit (DW's *Langsam gesprochene Nachrichten*) is not automatically redistributable.
  Decide whether Lexi ever ships someone else's text, or stays strictly
  learner-supplied. The Tatoeba audio allow-list is the precedent for doing it properly.

---

## Parked decisions — revisit deliberately, don't drift into

- ~~**Paper card faces.**~~ **Closed 2026-07-26: tried, and reverted.** Shipped
  2026-07-25 scoped to the flip faces and the two exercise surfaces; removed a day
  later, for two measurable reasons. `.paper` was authored as a *standalone whole-app
  theme*, so nesting it nested its accent — the brand hue swung 189° → 36° and every
  accented element inside a card inverted cyan→brown on entry. And it worked in one
  theme only: the cream card scored 18.4 contrast against the dark room and **1.07**
  against the light one, where it read as a stain rather than an object. The card is now
  distinguished by **material** inside one unchanging palette. The rule it produced — *a
  nested scope may change ground and ink, never the brand hue* — is in
  [DESIGN.md](DESIGN.md).
- **AI tutor.** Cut, and cut *on the record* rather than by omission: the
  conversation-app camp is commoditizing, needs a backend and keys, and breaks the
  DSGVO-by-architecture story that is Lexi's best B2B asset. `lib/ai.ts` and the
  OpenAI-compatible client stay for **build-time corpus enrichment**
  (`scripts/corpus/enrich-llm.ts`). The in-app "AI provider" widget is gone; its
  `store.ts` accessors (`aiConfig` / `setAiConfig` / `apiKey` / `setApiKey`) linger
  unused and can be deleted once a tutor is definitively off the table.
- **The Reader/Mine flow.** Un-parked 2026-07-27 and re-scoped as Now #2; see there.

---

*Maintenance: when an item ships, move it to [CHANGELOG.md](CHANGELOG.md) with the
reasoning intact — this file holds only what is still open.*
