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
  stay **warnings** — see *Capitalised function words* under Next.
- **Card ids survive corpus corrections.** Renaming or merging a card id used to
  reset that card's FSRS schedule to *new*, silently. `casefix` emits
  `src/data/idmap.ts`; `hydrate()` folds stored schedules onto the new ids (the
  more-practised one wins where both exist). 3 tests, including guards that no
  mapped id is still in the corpus and no target is dangling.

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

---

## Now

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

### The Next 10 (from eleven simulated sessions — see [SIMULATED-SESSIONS-2.md](SIMULATED-SESSIONS-2.md))

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

**Decision required, not a build item:** commit out loud to "English-base
learners" or scope gloss-language layers (persona S10). Silence drifts.

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

_C1/C2 example + synonym pass shipped 2026-07-26 — every level now carries ≥2
examples per card. The remaining example work is **quality, not coverage**: see
"Example first impressions" below._

- **Friend-readiness leftovers** (S each — from the sharing analysis +
  [`SIMULATED-SESSION.md`](SIMULATED-SESSION.md)): surface the flagged-cards list
  in Profile; edit-distance-1 typo tolerance on typed answers (measure
  over-forgiveness first); decide the day-2 return mechanism deliberately (habit
  anchor vs. Web Push for installed PWAs vs. nothing); run the *real* friend
  session and update SIMULATED-SESSION.md with what the simulation missed.
- **Frustrated-path softeners** (S each — UX-PATHS F3/F4/F5). Miss-streak
  circuit-breaker ("Rough patch — these come back easier tomorrow" + natural break);
  offer HD voice in context at first pronunciation tap instead of hiding it in
  Settings; same-day session resume (persist queue ids + position). And S3: a
  one-time backup nudge after the first week.
- **Example first impressions — order, don't author** (S). *Why:* the flip face
  shows `ex[0]`, so the *first* example is the card. Between the quality repairs
  and the second-example pass this is now down to **76 cards** whose first example
  reads like a scrape: 50 without sentence-final punctuation ("geltende
  Vorschriften."), 45 opening mid-quotation, 32 over 140 characters. *Do:* **53 of
  the 76 need no authoring at all** — a later example on the same card is already
  clean, so promote it and the defect disappears for free. Add the lint to
  `corpus:examples` (it owns the defect classes already), do the reorder as a
  scripted pass, then author replacements for the ~23 residue. *Done-when:* no
  card's `ex[0]` trips the lint; a spot-check confirms the reorder didn't bury a
  better sentence. *Touches:* `scripts/corpus/examples.ts`, `public/data/vocab.json`.
- **Capitalised function words** (S, human-gated — the residue of the casefix
  pass). *Why:* `corpus:casefix` handled the mechanical set (adjectives, verbs,
  adverbs). **64 cards remain** where capitalisation needs a ruling, not a script:
  31 with no `pos` at all, 19 pronouns (*Es*, *Mein*, *Dein*), 6 prepositions,
  plus particles (*Ja*, *Nein*). Some are simply wrong; some may be *right* —
  polite *Ihr*, nominalised *das Ja* — and a blanket lowercase would introduce
  errors while removing them. *Do:* rule on them in one sitting from the
  `corpus:validate` warning list, extend `casefix`'s pos set with whatever the
  ruling makes mechanical, and lowercase the rest by hand through the same
  id-map path so schedules survive. *Done-when:* 0 capitalisation warnings; each
  card kept capitalised carries a one-line reason. *Touches:*
  `scripts/corpus/casefix.ts`, `public/data/vocab.json`, `src/data/idmap.ts`.
  *Touches:* `scripts/corpus/{examples,validate}.ts`, `public/data/vocab.json`.

_README refresh + store/session tests (incl. the `buildMixedSession` and streak
follow-on) shipped 2026-07-11._

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
- **AI tutor & the Reader/Mine flow.** ROADMAP's two flagship paid features; **cut
  from the core loop** in the July prune. `lib/ai.ts` and the OpenAI-compatible
  client still exist for **build-time corpus enrichment** (`scripts/corpus/enrich-llm.ts`),
  so re-adding a tutor or a known-word-coloured reader is feasible later — but it's
  roadmap-gated. The in-app Settings "AI provider" widget has now been **removed**;
  its `store.ts` config accessors (`aiConfig`/`setAiConfig`/`apiKey`/`setApiKey`)
  linger unused and can be deleted if a tutor is definitively off the table.
- **Billing / €5 supporter tier.** The whole freemium split in `ROADMAP.md` depends
  on it. No infra yet; the "Support" link (now → GitHub) and any Pro gating wait on this.

---

*Maintenance: when an item ships, move it to "Already shipped" with a one-liner, and
delete it from the archived docs' mental model — this file is the source of truth.*
