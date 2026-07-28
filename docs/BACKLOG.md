# Lexi — Backlog

The one prioritized list of open work. Reconciled against the actual `src/`, so it
overrides anything in the older strategy docs. Grouped **Now / Next / Later**, plus
**Tech debt** and **Parked decisions**.

Effort key: **XS** <½ day · **S** ~1 day · **M** a few days · **L** 1–2 weeks.
Each item lists *Why · Do · Done-when · Touches*.

---

## Already shipped — do not redo

The archived docs describe some of these as "to do"; they're done. Flagged so
nobody re-implements them:

- **Known is the headline number** everywhere (Today, KPIs, decks, market), with
  per-card status pips (new / learning / known).
- **Unified `SessionRecap`** across the flip player and drills; **level
  milestones** fire once; **haptics** on grade commit.
- **First-run guided session** (placement → 10-card session → recap).
- **IA collapse**: Today + market merged into one `Home` scroll; nav is now
  **Today · Study · More**. Galaxy, Tutor, Reader/Lesen, Lexi Duel, and the exam
  countdown are **cut**.
- **Light/dark theme** + the new cyan logo/boot splash.
- **Corpus pipeline** (`scripts/corpus/`) — reproducible, licensed ingestion.
- **HD German voice** (Piper Thorsten, in-browser) and the **placement test**.

### Shipped 2026-07-11 (this pass)

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
- **Next-10 items 1–3** (from the round-2 personas). (1) **Interval previews** on
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
  sessions** ([`PERSONAS.md`](PERSONAS.md) round 1, stand-in until a
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

---

## Now

### 0. The comprehension meter — the flagship  ·  L (decided 2026-07-27)

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

**Phase 0 · prerequisites (S).** Land these first; each is independently defensible.
- Port `buildMatcher` back app-side from `scripts/corpus/matcher.ts`. It is already
  self-contained (imports only `conjugate`/`types`, takes the corpus explicitly) and
  covered by 8 tests. Keep one implementation — the pipeline should import the app's,
  not the reverse of what the July prune did.
- Extend `freqRank` to all 7,464 cards in the build. It currently covers 1,986
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
Listening is nearly free here (TTS incl. Piper HD already ships) and is the most
neglected skill in every SRS app. ⚠️ **Licensing:** ship learner-pasted text and
learner-saved URLs only. Do not bundle a feed of someone else's journalism — DW's
*Langsam gesprochene Nachrichten* is the obvious fit and is **not** automatically
redistributable. Check terms before any bundled content.

**Phase 3 · output, narrowly (M).** Not a chatbot. *"Write one sentence using these
three words"* with grounded, mostly-deterministic checking, reusing `norm`, near-miss
grading and the hint ladder. Local-first survives. On-device WebGPU (a ~1B model is fine
for a <100-token correction, useless for conversation) is an implementation option here,
not a strategy — see the refusals list in COMPETITIVE-RESEARCH §5.

**Touches.** New `src/lib/matcher.ts` (moved), new `src/views/Reader.tsx` +
`src/lib/coverage.ts`, `session.ts` (`SessionReason`, `whyLine`), `store.ts` (saved
texts), `scripts/corpus/build.ts` (freqRank fill).

### 0b. The Atlas — the design-review P0/P1s  ·  M (from PERSONAS round 3)

> **Direction settled 2026-07-28: the Atlas.** The review put the terminal on
> trial; the user then disclosed that it had never been *chosen* — it was the
> nearest reference for "organise a vast information space well" from a
> precedent vocabulary of Salesforce dashboards and phone apps. That makes
> "finish the terminal" the right answer to the wrong question. Three
> directions were rendered against the same real learner data and compared;
> the Atlas won. Rationale in [DESIGN.md §1](DESIGN.md).
>
> **Shipped in the first Atlas pass:**
> - **Light-primary Atlas palette.** `@theme` now holds the light values,
>   `html.dark` the alternate; `theme.ts`, the pre-paint script in `index.html`
>   and the boot splash all inverted. Accent is Aicher's light blue.
> - **The heatmap is a heat map** (finding #7). Five classes classified over the
>   *observed* range via `makeHeatScale`, ink paired per class in CSS, and a
>   legend that states the real domain instead of implying 0–100%. Verified in
>   both themes: ten groups → 5 distinct colours, 2 per class.
> - **P0 #1 route opacity** — fixed, and the *rule* was wrong too. See below.
> - **P0 #4** `de-DE` separators → `en-US` (`fmt`). **P0 #5** "Space to flip" now
>   switches on `(hover: hover) and (pointer: fine)`.
> - `.tile-in` 1.5% → 6%; the two hardcoded scrollbar hex literals tokenised.
> - 8 new tests over `makeHeatScale`/`fmt` (112 total).
>
> **The rule that was wrong.** DESIGN.md claimed no-fill-mode made an entrance
> safe. It does not: **a stalled animation sits on its `from` frame**, so
> `from { opacity: 0 }` renders nothing regardless. `.bar-grow` (`scaleY(0)`)
> and `.node-in` (`opacity: 0`) were cited *as the safe pattern* and had the
> same defect. All five entrances are now **transform-only** — worst case is
> content 8px low or at 94%, never invisible. Test with a paused probe.
>
> **Still open from this item:** P0 #2 (success is silent) and P0 #3 (the
> heatmap doesn't animate on data change), plus Batches B and C below. Both
> remaining P0s are motion-system work and were deliberately sequenced *after*
> DESIGN.md §7 defined the scale, continuity and data-change rules — which it
> now does.

**Why.** The 12-persona review ([PERSONAS.md](PERSONAS.md)) put the "market terminal"
identity on trial and returned a more useful answer than keep-or-replace: **the
identity is not the wrong metaphor, it is a half-built one.** The aesthetic promises
density, precision and liveness; the implementation ships sparseness, compression and
stillness. The hostile designer and the assigned defence reached that diagnosis
independently from opposite directions. Ordering note: this **precedes** the
comprehension meter's UI (Now #0 Phase 1) — the meter's surface should be built on the
fixed motion and composition rules, not retrofitted onto them.

**Sequenced by the consolidated table (25 distinct findings, ranked).**

**Batch A · the five P0s (S each, independent).**
1. **Route enter can strand a view at `opacity: 0`** — *observed*: 1,769px of Progress
   fully laid out and invisible, transform frozen mid-flight. `App.tsx:179` uses
   `initial={{ opacity: 0, y: 8 }}`; if the animation never runs (backgrounded tab,
   throttled rAF) the destination stays blank. **This is precisely the hazard
   `DESIGN.md` §7 documents** — the no-fill-mode rule was applied to `.bar-grow` and
   `.node-in` in CSS and never to the Framer route transition every navigation uses.
   *Fix:* resting state must be the correct one; animate from a non-destructive
   property or guarantee completion.
2. **Success is silent** — no motion or acknowledgment on a correct answer anywhere.
   Round 2's "feel layer" answered this *in the recap only*; the moment Sofia actually
   described (answering) was never touched.
3. **The heatmap never animates on data change** — a tile going 41%→47% after a session
   is a re-render. The most emotionally loaded event in the product.
4. **`de-DE` thousands separators in an English UI** — "2.320 known", "6.618", "1.705".
   An English reader parses 2.320 as *two point three two*. Headline number, every
   surface. Cheapest P0 here.
5. **"Space to flip" shown on touch devices** — wrong affordance, primary surface.

**Batch B · composition and precision (M).** Earn the two claims the palette makes:
single-column stack of six identical rounded rects on a 1280px desktop (#17); ~200px
of chrome before any map on mobile Progress (#12); the FAB overlapping treemap tiles
(#13); **heatmap colour range compressed** — data spans 26–45% against a 0–100% ramp,
so every tile renders the same green and the heat map isn't one (#7); dark-theme "60"
reading as disabled where light theme renders it black (#8); tile text truncation
(#21); the desk letterboxed to ~800px on desktop against DESIGN.md §8's full-bleed
promise (#10).

**Batch C · the motion system (M).** No shared-element continuity — `layoutId` appears
**once** in the codebase and every navigation cross-fades through blank (#6); `.tile-in`
animates 1.5%, below the perceptual threshold (#19); no hover/press affordance on
treemap tiles (#22). Write the system into `DESIGN.md` §7 first — see 0c.

**Done-when.** All five P0s closed; the heatmap reads as a heat map across the real
data range; one documented motion scale with continuity and data-change rules, applied
to the treemap drill-down and the Known headline.
**Touches.** `App.tsx`, `index.css`, `views/{Progress,Markt,Review,Today}.tsx`,
`components/CountUp.tsx`, `lib/ui.ts` (number formatting), `docs/DESIGN.md`.

### 0c. DESIGN.md §1 and §7 — finish, don't replace  ·  S

**Why.** §1 *asserts* the terminal identity without defending it; §7 is three restraint
bullets with no positive system, and "motion should explain, not decorate" has been
applied as "motion should be minimal" — a different rule that produced the stillness
round 3 found. **Do.** §1 gains the reasons the identity survived and the three things
personas said they'd lose (*the adulthood*, *the heatmap*, *the numeric/typographic
discipline*). §7 gains: a **motion scale** with numbers (micro 80–120ms · transition
200–320ms · narrative 400–700ms, one easing per tier); a **continuity rule** (two views
showing the same object transform it, they don't cross-fade); a **data-change rule** (a
number or area that changed because the learner did something animates from its old
value). The existing constraint — *no resting state may depend on an animation
running* — survives unchanged and gains the route-transition case as its second
worked example.

### 1. Grow the corpus toward ~10k + rebalance A1/A2  ·  M (ongoing)
**Why.** Distribution is B1-heavy with thin A1/A2 — backwards for early reading; core
high-frequency lemmas are still missing. The pipeline is fixed and green
(`corpus:selftest` 39/39, `corpus:validate` passes), but growth still **needs a
network- and LLM-enabled maintainer machine plus human spot-checks of
gender/plural/level per the pipeline's own rules — not an autonomous bulk commit.**
**Do.** `corpus:coverage` → build A1/A2 batches → `corpus:validate --strict` → review
diff → commit, in reviewable batches. Close the top-frequency gaps first.
**Source material:** `reference/DaF Wortschatz/` — 69 page-mapped scans of a complete
A1–B1 Lektionswortschatz (Lektion → Feld → Wortart; see its MANIFEST.md and
`docs/archive/COHESION-PLAN.md` Phase 3 for the extraction rules: entries are
*selected and authored* in the book's style, never wholesale transcription).
IMG_4850 is the irregular-verbs appendix — feed it to the conjugation engine's
known-verb checks.
**Done-when.** ≥95% of the top ~2,000 lemmas per level; A1/A2 filled; validate green;
load size still acceptable. **Touches.** `scripts/corpus/*`, `public/data/*.json`.

### 2. Grammar mastery pass — close the coverage gaps  ·  M (human-gated, ongoing)
**Why.** The 87-point / 509-exercise taxonomy is a real A1–C2 spine, but an audit
found genuine, mastery-required gaps and one under-weighted topic. Authoring
exercises is content work needing human spot-checks (see the just-fixed broken C2
drill) — draft in `grammar-supplement.ts`, review, then `--write`, like the corpus.
**Gap list (priority order):**
- **Case-governed prepositions** — dedicated accusative-only (durch/für/gegen/ohne/um)
  and dative-only (aus/bei/mit/nach/seit/von/zu) points. *Batch 1 drafted.*
- **Konzessivsätze (obwohl)** — the concessive subordinator (vs. adverb trotzdem /
  genitive preposition trotz); only adverbial trotzdem/deshalb exists today. *Batch 2
  drafted (B1).*
- **da-/wo-compounds** (darauf, worauf, damit, womit) — only partial at C1; needed
  for verbs-with-prepositions and relative clauses. *Batch 2 drafted (B1).*
- **Adjektivdeklination** — one B2 point for one of German's hardest systems.
  *Batch 3 drafted — split weak / mixed / strong, introduced early (A2, B1, B1).*
- **Ordinals & dates** (der erste, am dritten Mai). *Batch 4 drafted (A1).*
- **Article use / Nullartikel** — when German drops the article. *Batch 4 drafted (A2).*
- **C2 is thin (6 points).** *Batch 5 drafted — Irrelevanzkonzessiv (wer … auch immer)
  + genitive-object verbs (C2 ×2).* Remaining C2 gaps (register/Stil, ellipsis,
  Ausklammerung) are judgment-heavy and better hand-authored than auto-drilled.
**Do.** Append `NewPoint`s to `scripts/corpus/grammar-supplement.ts` in reviewable
batches → dry-run → human-verify German + answer indices → `--write` → bump the
three count strings. **Applied 2026-07-12 (batches 1–5):** 11 points / 55 exercises written via
`corpus:grammar --write` (schema sweep clean: 24 supplement points / 120 exercises).
Grammar now **100 cards, 98 exercise points, 564 exercises**; README / Fundamentals /
`lib/grammar.ts` / `data/index.ts` counts bumped (6,468→6,479 cards). Every listed gap
now has a point with ≥5 exercises — only the deliberately-deferred stylistic C2 work
(register, ellipsis, Ausklammerung) remains, flagged above as hand-authoring.
**Done-when.** Each gap above has a point with ≥5 exercises; schema sweep clean. ✅
**Touches.** `scripts/corpus/grammar-supplement.ts`,
`public/data/{grammar,vocab,sectors}.json`, count strings.

---

## Next

_The July 2026 direction (user-approved): the shippable core is **session-quality
work, not new surfaces** — production widgets, supportive grading, and the
vocabulary→grammar loop (first cut shipped 2026-07-18), on top of the corpus work
above. "Grounded, supportive German lexicon expander with embedded grammar
training."_

### The Next 10 (from eleven simulated sessions — see [PERSONAS.md](PERSONAS.md) rounds 1–2)

Priority order; each traces to a persona finding. The diagnosis: the app is
correct and kind, but not yet *legible* (can't see the machine think), *fitted*
(sessions don't match real minutes), or *narrative* (progress has no arc).

1. ~~Interval preview on grade buttons~~ ✅ 2026-07-18
2. ~~Quick 5 + same-day resume~~ ✅ 2026-07-18 (resume proved *emergent* — see shipped note)
3. ~~Comeback mode~~ ✅ 2026-07-18
4. ~~The goal line~~ ✅ 2026-07-18
5. ~~The share card~~ ✅ 2026-07-18
6. ~~Stats surface~~ ✅ 2026-07-18
7. ~~Type ramp on rem + text-size setting, coach marks~~ ✅ 2026-07-18
8. ~~The feel layer + F3 circuit breaker~~ ✅ 2026-07-18
9. ~~`corpus:flags` maintainer loop~~ ✅ 2026-07-18
10. **Content depth arc** (L, human-gated) — DaF-fed A1/A2 fill + hand-authored C1/C2 register; the promise everything else polishes.

~~**Decision required, not a build item:** commit out loud to "English-base
learners" or scope gloss-language layers (persona S10). Silence drifts.~~
✅ **Closed 2026-07-27 — English-base, said out loud.** Stated in the root
`README.md` intro and in the first-run hero (`views/Today.tsx`). A gloss-language
layer is not scoped and not promised. This is about *gloss* language only —
French/Spanish from an English base stays open.

- **Illustration artwork — match the reference style** (M). *Why:* the curated
  line-art layer that replaced emojis (`src/lib/illustration.tsx`, 54 concepts +
  group-emblem fallback) is a solid first pass but doesn't yet match the intended
  reference look (see `design/inspiration`); it's currently **disabled** behind
  `SHOW_ILLUSTRATIONS = false`. *Do:* redraw the concept set to the reference style
  (weight, corners, detail, duotone?), widen concept coverage, refine the weak ones
  (carrot, flower, dog), then flip the flag on. *Done-when:* the deck/market/word-map
  show art matching the reference and every A1–B2 card resolves to a fitting icon.
  *Touches:* `src/lib/illustration.tsx`, `views/Review.tsx`, `views/Markt.tsx`,
  `views/Wortkarte.tsx`.

- **C1/C2 example + synonym pass** (M, Claude-authored owned data). *Why:* A1–B2
  now carry two hand-authored examples each (and synonyms where genuine); C1/C2
  definitions are done but most cards still have <2 examples (C1 466/606, C2
  214/220 at last count). *Do:* author a clean second example (`lvl` matching the
  card level) for every C1/C2 card under two, plus synonyms only where they truly
  exist — never force loose pairs, which mislead in a learning tool. Batch as
  `scripts/authoring/batches/c1-ex-*.json` / `c2-ex-*.json`, apply fill-only via
  `apply-authored.ts`. *Done-when:* C1 and C2 both reach 0 cards under two
  examples; integrity check shows 0 existing-example overwrites and unchanged ids.
  *Touches:* `scripts/authoring/batches/`, `public/data/vocab.json`.

- **Friend-readiness leftovers** (S each — from the sharing analysis +
  [`PERSONAS.md`](PERSONAS.md) round 1): surface the flagged-cards list
  in Profile; edit-distance-1 typo tolerance on typed answers (measure
  over-forgiveness first); decide the day-2 return mechanism deliberately (habit
  anchor vs. Web Push for installed PWAs vs. nothing); run the *real* friend
  session and update PERSONAS.md with what the simulation missed.
- **Frustrated-path softeners** (S each — UX-PATHS F3/F4/F5). Miss-streak
  circuit-breaker ("Rough patch — these come back easier tomorrow" + natural break);
  offer HD voice in context at first pronunciation tap instead of hiding it in
  Settings; same-day session resume (persist queue ids + position). And S3: a
  one-time backup nudge after the first week.
- **Example coverage backfill** (M). *Why:* the consolidated study card folds
  examples onto the back, which exposed that ~46% of word cards ship a single
  example and 79 (all A1/A2) ship none — a thin connection between word and real
  use. *Do:* treat examples like leveling — measure, source, gate. Add a
  `corpus:examples` audit (sibling of `coverage.ts`) reporting `<2` and `=0` cards
  by level; in `build.ts` merge sources to a target of ≥2 per card (Tatoeba, cap
  raised to 3 → Wiktextract usage examples → for verbs a conjugation-derived
  sentence, deduped, bilingual preferred); add a `validate` warning at `<2` and a
  `--strict` failure at `0`; author the residue no open corpus covers via the
  build-time `--llm` layer (human-reviewed, never hand-edited JSON). *Done-when:*
  0 cards with 0 examples, `<2` count reported and trending down, validate clean.
  *Touches:* `scripts/corpus/{build,coverage,validate}.ts`, new
  `scripts/corpus/examples.ts`, `public/data/vocab.json`.

_README refresh + store/session tests (incl. the `buildMixedSession` and streak
follow-on) shipped 2026-07-11._

---

## The Fifty — from the twelve personas, walked against the running app

*2026-07-28. The twelve personas of [PERSONAS.md](PERSONAS.md) pointed at every
surface, in both themes and both viewports, against a seeded mid-B1 learner
(3,475 cards · 2,332 known · 42-day streak · 247 due). Findings are from a live
DOM audit — contrast ratios, hit-box measurement, clip detection, and a stepped
walk through the session loop — not from reading the source.*

**Method note, stated because it bounds what follows.** The iOS Simulator was
unavailable (host has Command Line Tools only, no `simctl`), so every mobile
finding is a 375×812 browser viewport. That viewport reports
`(hover: hover) and (pointer: fine)`, so **touch-only behaviour is unverified on
real hardware** — including the "Tap the card" fix, safe-area insets, the
Add-to-Home-Screen flow, and iOS Safari's storage eviction. Items marked 📱
need a real device before they can be called done.

**One thing the audit cleared:** colour contrast passes on every route, in both
themes, at every text size sampled. The token discipline is holding.

Effort: **XS** <½ day · **S** ~1 day · **M** a few days · **L** 1–2 weeks.

### A · Breakage and correctness

**1. ~~`AnimatePresence` gates the study loop on rAF~~ · ✅ 2026-07-28.**
*Found live, then corrected on the way to fixing it.* The card swap was an
`AnimatePresence mode="wait"`, which keeps the outgoing card mounted until its
exit animation *finishes* before mounting the next. Framer is rAF-driven, so with
rAF stalled the deck froze: grading advanced the counter 272→268 while the
headword stayed `der Ausblick`. Measured with `rafTicksIn600ms: 0`.

**The first framing was too strong and is withdrawn.** "You grade cards you never
saw" implied routine data loss. In a real browser rAF pauses only on a hidden tab
and resumes on return, completing the exit — so this was not quietly eating cards
in normal use. What was genuinely wrong is the principle: **the correctness of the
primary loop must not depend on an animation completing**, which is the same
defect class as the entrance rule in DESIGN.md §7, and rapid keyboard grading
queues against the 220ms exit for no reason.

*Fixed:* the current item always renders (`key={item.srsId}`), and direction moved
from the exit to the **entrance** — the next card arrives from the side opposite
the judgement, the way a deck advances under a card you flick away. CSS,
transform-only, no fill-mode (`.card-in`, `--dir`). *Verified* with rAF still
dead: six grades → six distinct headwords, drills interleaving correctly.
*Guarded:* `views/review-structure.test.ts` — 9 tests asserting no
`<AnimatePresence>` in the loop and that **every** entrance keyframe
(`routein`/`deskin`/`cardin`/`tilein`/`nodein`/`bargrow`) is transform-only and
never scales to zero. Mutation-checked: reintroducing `opacity: 0` fails it.
*Correction to the audit that found this:* the earlier "26 flips, zero drills"
reading was the frozen deck, not a missing drill — drills interleave fine.

*Adjacent, checked, **not** fixed:* six `<AnimatePresence>` remain in `src/`
(RulePanel ×2, Grammar ×3, Today ×1). All are `initial={false}` with **no**
`mode="wait"`, so a new child mounts immediately and none can strand a surface
the way the card loop did. They are height-animated disclosures, though, and the
Library's expanded *Dativ* panel showed its **Practise button clipped** during the
audit — consistent with a height animation frozen part-way. Same family, much
smaller blast radius. Worth a pass when C/#19 touches composition.

**2. ~~Success is silent~~ · ✅ 2026-07-28** (P8, P10, P12, P3). Every answer now
gets an acknowledgment in the session chrome — and it says **the interval the card
just moved to** ("back in 15 days"), not "well done". Same machinery-not-magic trick
as the grade-button previews, and the only acknowledgment that survives being seen
sixty times a session without curdling. The bar's cursor takes one short green pulse
on a hit (micro tier, 220ms). *Verified:* the interval shown always matches the
button pressed, across both grade paths. It lives in the chrome rather than on the
card because the card unmounts the instant it is graded.

**3. ~~The heatmap doesn't animate on data change~~ · ✅ 2026-07-28** (P8, P3).
Territories that crossed a class boundary since you last looked now travel from the
colour you last saw (`lexi.mapseen.v1`), and the Known headline counts up from the
same baseline, so the number and the map agree about what changed. Only tiles that
actually changed band animate — colouring the rest would be theatre.

*The first implementation was wrong, and the test caught it.* It used
`@keyframes { from { background-color: var(--was) } }`, on the same reasoning as the
transform-only entrances. That reasoning does not transfer: **on this element the
colour is the data**, and a stalled animation sits on its `from` frame — a 44%
territory painted itself in the 23% band. Now a CSS *transition*: React writes the
old colour, a **timer** writes the true one, and the transition only decides whether
the change is gradual. Correctness rides on a timer, never on a frame callback.

*Two bugs found on the way:* `CountUp` had its own inline `toLocaleString('de-DE')`,
so the Known headline still rendered **"2.320"** beside a `fmt()`-formatted "6,618" —
the `fmt` fix had missed it and it shipped to production. It could also strand a
*wrong number* if rAF paused, so it now has a timer backstop. Separately,
classification ran on raw floats, so three territories all displaying **42%** were
split across two colours; it now classifies on the rounded percentage, making label
and fill agree by construction. Two new tests pin both.

**4. ~~Touch targets miss the documented 44×44 minimum~~ · ✅ 2026-07-28 (code) ·
📱 unverified.** Sidebar nav rows, the primary *Start session* and the profile row
now carry `.tap-44`; the mobile menu button went 36→44 (pulled, so the header bar
doesn't grow); the desktop collapse chevron keeps its 24px look and gains a 44px
hit area via a `::before` expander.

**Gated on `any-pointer: coarse`, deliberately.** 44px is a *touch* guideline —
WCAG 2.5.5 exists because fingers are imprecise, not mice — and applying it to the
desktop rail would add 10px to every row on a surface twelve personas already called
too sparse. `any-pointer` rather than `pointer` so a Surface, a touch laptop or an
iPad with a keyboard (all of which report `pointer: fine` for their *primary* input)
still get the larger targets.

*Verified:* the rule compiles into the bundle, and forcing the declaration in the
live DOM brings all five sidebar targets to ≥44 with no nav overflow and no sideways
scroll. *Not verified:* that the media query actually fires — no browser viewport
reports a coarse pointer, so this joins the "Tap the card" hint behind item 8.
*Still open:* ticker items (78×20) belong to #28, which is rethinking that strip for
mobile anyway — a moving marquee is a poor tap target at any size.

**5. ~~Content clips at both widths~~ · ✅ 2026-07-28 — and mostly a false alarm.**
Two of the four claims were **my audit's error, not the app's**. The overflow
heuristic (`scrollWidth > clientWidth`) flags this codebase's deliberate `pull`
idiom — the `-m-2` that lets a 44px target sit in a tight row without inflating it
— as a defect. Measured at 320, 375 and 1280: the overhang is 8px, `offscreen: 0`,
and neither `body` nor `html` scrolls sideways at any width.

- ~~Today overflows its column by 8px~~ — the streak button's `-m-2`. Contained.
- ~~Decks rows 208→200~~ — same idiom on the card's icon cluster. The "230 clips"
  figure was one benign row per deck card.
- **Treemap subline 132→80 — real, and fixed.** It was cutting a count mid-word
  ("22 secto…"). A number sliced in half is worse than a number omitted, so the
  sector tally now appears only above 190px; below that the tile shows the ratio
  alone. *Verified:* no subline clips at 375px.
- **Deck names 252→188** — genuine truncation, but by design and with an ellipsis.
  They now carry a `title`, so the full name is recoverable rather than lost.

*Lesson for the next audit:* `scrollWidth > clientWidth` alone is not evidence of a
bug. Overflow that stays on screen and scrolls nothing is a layout idiom; the test
has to be "does anything become unreachable".

**6. The display-name input has no accessible name · XS · P1** (a11y). Profile ships
an `INPUT` with no label association — the two `sr-only` labels measure 83→1, so
they exist but aren't bound. Screen-reader users get an unlabelled text field.

**7. Grammar progress reads 0/20 · 0/32 · 0/40 after 42 days · S · P1** (P4, P6).
A learner with 2,332 known words shows *zero* grammar started, on Today and in the
Library. The vocabulary→grammar loop fires inside sessions but never credits the
concept it taught. *Do:* count a point as started when its card leaves New.

**8. Verify the touch affordances on real hardware · S · 📱.** The "Tap the card"
fix is correct in logic and **unproven** — no browser viewport reports
`hover: none`. Blocked on Xcode: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.

### B · The study loop

**9. Shared-element continuity, tile → sector · M · P1** (P2, P9, P7). `layoutId`
appears once in the codebase. The one navigation where the same object exists on
both sides is a hard swap. DESIGN.md §7's continuity rule, applied.

**10. Blind spots rank by raw count, not rate · S · P1** (P6). Drilling a mode makes
it look worse; avoiding one makes it look fine. Divide by attempts.

**11. Interleave the drill types visibly · S** (P6). A session can run 20+ flips
before a drill. Surface the mix ("14 cards · 4 drills") so the interleaving the
scheduler is proud of is legible before it happens, not only after.

**12. Undo should be reachable after the card leaves · XS** (P6). *Previous card*
exists at 43×43 in the chrome; nobody finds it in the half-second they want it.

**13. Grade from the front face without flipping · XS** (P6). A power user who knows
the word shouldn't need the flip round-trip.

**14. Session length is fixed at the queue · S** (P3, P5). Quick 5 exists; a "how
long have you got?" control (2 / 5 / 15 min) fits the minutes people actually have
better than a card count they can't convert to time.

**15. Show the queue shape · S** (P5, P6). A progress rail that distinguishes due
from fresh from drill, so "246 left" becomes a thing with an end you can see.

**16. Typed answers need mobile keyboard hints · XS · 📱.** No `autocapitalize`,
`autocorrect`, `spellcheck` or `enterkeyhint` on the answer input. iOS will
autocapitalise and autocorrect German, then mark the learner wrong for it.

**17. Near-miss tolerance beyond the umlaut fold · S** (round 1, Jonas). Edit-distance-1
for typed answers, gated so *gemacht*/*gedacht* stays a miss. Measure over-forgiveness first.

**18. The circuit breaker should offer a *softer* item, not just an exit · S** (P8).
After four misses the kindest move is an easy win, not a door.

### C · Legibility and composition — the Atlas, pass 2

**19. Break the single-column stack · M · P1** (P2, P7). Six identical rounded
rectangles at one width on a 1280px screen, each with 40–60% empty space to its
right. This is the largest remaining visual finding.

**20. Category hue per theme group · M** (the Atlas's second channel). Fill already
encodes magnitude; hue should encode identity, consistently across map, decks,
cards and stats. Ten groups, Aicher-derived, legible on both grounds.

**21. The card becomes a lexicon entry · M** (the Atlas's desk). Headword · IPA ·
POS · sense · citation is already the content model; the layout doesn't use it.
Also closes the ~250px of dead space inside the card on desktop.

**22. The desk is letterboxed on desktop · S · P1** (P6). DESIGN.md §8 promises
full-bleed; an ~800px column in a 1280px viewport is not that.

**23. The goal line is styled as a footnote · XS · P1** (P5). The most motivating
sentence in the app, set at 14px between two large cards.

**24. "+ 4 drills targeting your blind spots" is red · XS · P1** (P5). Reads as an
error. It's the app doing you a favour.

**25. Tile hover/press affordance · XS · P1** (P4, P10). A desktop region that
doesn't acknowledge the pointer reads as an image.

**26. The interaction hint sits below the fold · XS** (P10). "Long-press to study"
is documented where it cannot be seen, on both viewports.

**27. Retire the `--color-amber` misnomer · XS.** A token named amber holding Atlas
blue, having previously held cyan. Rename with a codemod.

**28. The ticker is clipped and, on mobile, noise · S · P2** (P7, P3). Partial "7%"
against the sidebar edge on desktop; 3.5 items and a mid-word cut at 375px.

**29. Empty and first-run states in the Atlas · S.** First-run Today spends ~60% of
a desktop viewport on nothing (P1). The one screen where density would reassure.

### D · Mobile and platform 📱

**30. Mobile Progress spends ~200px on chrome before any map · S · P1** (P3).
Three stacked rows of controls above the content they filter.

**31. The FAB overlaps the treemap · XS · P1** (P3). Two interactive things, same pixels.

**32. Coach marks eat 200px of 812 · XS · P1** (P8).

**33. Real-device pass on safe areas and Dynamic Type · S · 📱.** `safe-top`/`safe-bottom`
and the rem ramp are written but never observed on hardware.

**34. Web Push for installed PWAs · M** (round 1, S3). The deliberate day-2 return
mechanism, still undecided. Local notification from the existing reminder watch is
the serverless version.

**35. Home-screen widget / Live Activity · M · 📱.** "3 due" on the lock screen is
the highest-leverage retention surface a local-first app can own without a backend.

**36. Storage durability re-check on iOS · S · 📱.** `navigator.storage.persist()`
ships; nobody has confirmed it survives 7 days of ITP on a real iPhone. The failure
mode is total, silent data loss.

### E · Content and pedagogy

**37. C1/C2 register depth · L (human-gated)** (P9, P11). Confirmed again by the two
most credible personas. C2 is 6 exercise points. The promise "grows with you A1–C2"
thins exactly where it is hardest to keep.

**38. Search across the 128 concepts · S · P1** (P4, P9). No way to find *Konjunktiv*
without expanding levels and scrolling.

**39. Listening is absent · M** (P3, P10). TTS and Piper HD already ship. A
listen-first card mode is nearly free and it is the most neglected skill in every
SRS app.

**40. Output beyond mechanical transformation · M** (Swain; P11). "Write one sentence
using these three words", grounded and mostly deterministic. Not a chatbot.

**41. Heritage / uneven-profile learners · M** (P10). Placement assumes ignorance is
uniform. Yusuf tests C1 on vocabulary and B1 on orthography and the app has one
number for him. Skill-scoped drills rather than level-gated ones.

**42. A maintenance mode for the arrived · S** (P12). At C2 the value inverts:
low-volume, high-interval, rare vocabulary. FSRS is already excellent at exactly
this; the app never offers it as a shape.

**43. Exam alignment without an exam simulator · M** (P5). Goethe B1 is the
most-taken certificate in the category. The app knows his level, pace and weak
modes and never says "your weakest area *for B1* is Kasus".

**44. Textbook-chapter decks · M** (P4). Netzwerk, Menschen, Schritte, Begegnungen.
Becomes cheap once the comprehension meter lands — paste the chapter.

**45. Register and collocation on C1+ cards · M** (P9). Synonyms exist but aren't
differentiated by register, which is most of what C1 vocabulary work *is*.

### F · Meaning and return

**46. Name the session's best moment on the card, not just the recap · XS** (P8).
"Comeback of the day" exists and fires where nobody is looking.

**47. Finishable things · S.** A fully-known sector is finite and earned; DESIGN.md
§8c calls this out and only the recap ever mentions it.

**48. Weekly arc · S** (P5, P9). A seven-day view — words added, retention, the goal
line's slope — is the narrative unit people actually feel. Daily is too granular,
"since forever" too coarse.

### G · Reach and trust

**49. Performance budget · M · P2** (P7, P12). `vocab.json` is 5.2MB and the build
warns above 500kB. Awwwards jurors test on real devices; so do learners on 3G. Split
the corpus by level and fetch on demand.

**50. Make the scheduler's reasoning visible from outside a session · S · P1**
(P6, P11). `WhyThisCard` is the app's genuine moat and its strongest word-of-mouth
asset, and it is invisible unless you are three cards deep. This is the single
cheapest thing on this list that changes how the product is *described*.

---

## Parked decisions (revisit deliberately, don't drift into)

- ~~**Paper card faces.**~~ **Closed 2026-07-26: tried, and reverted.** Shipped on
  2026-07-25 scoped to the flip faces and the two exercise surfaces; removed a day
  later. It was the wrong idea for two measurable reasons. `.paper` was authored as
  a *standalone whole-app theme*, so nesting it also nested its accent — the brand
  hue swung 189° → 36° (near-complementary) and every accented element inside a
  card inverted cyan→brown on entry. And it only worked in one theme: the cream
  card scored 18.4 contrast against the dark room and **1.07** against the light
  one, where it read as a stain rather than an object.
  The card is now distinguished by **material** inside one unchanging palette —
  fractal grain, `rounded-lg`, a deeper lift, and the Fraunces headword (which is
  no longer coupled to the colour scope). The rule this produced — *a nested scope
  may change ground and ink, never the brand hue* — is written down in
  [DESIGN.md](DESIGN.md).
- **The Reader/Mine flow. ~~Parked~~ — un-parked 2026-07-27, and re-scoped.** It comes
  back as **Now #0, the comprehension meter**, which is a different feature from what
  was cut: not "paste text and mine words" but *"here is what percentage of this text
  you know, and the N words that get you over 98%."* The cut version was a capture
  tool; this one is a measurement instrument pointed at the model Lexi already has.
- **AI tutor.** Still cut, and now cut *on the record* rather than by omission: the
  conversation-app camp is commoditizing, needs a backend and keys, and breaks the
  DSGVO-by-architecture story that is Lexi's best B2B asset. `lib/ai.ts` and the
  OpenAI-compatible client stay for **build-time corpus enrichment**
  (`scripts/corpus/enrich-llm.ts`). The in-app Settings "AI provider" widget was
  **removed**; its `store.ts` accessors (`aiConfig`/`setAiConfig`/`apiKey`/`setApiKey`)
  linger unused — **now safe to delete**, since the only sanctioned on-device
  intelligence is the Phase-3 WebGPU option, which needs no provider config.
- **The Sprachschule / B2B route.** Live, not parked, and explicitly **sequenced behind
  Phases 1–2** (decided 2026-07-27). Re-read [SCHOOL-PITCH.md](SCHOOL-PITCH.md)'s gap
  table *after* the meter ships — the meter closes two of its rows nearly for free
  (curriculum alignment becomes "paste the chapter"; pre/post evidence gains a better
  unit than a word count).
- **Billing / €5 supporter tier.** The whole freemium split in `ROADMAP.md` depends
  on it. No infra yet; the "Support" link (now → GitHub) and any Pro gating wait on this.

---

*Maintenance: when an item ships, move it to "Already shipped" with a one-liner, and
delete it from the archived docs' mental model — this file is the source of truth.*
