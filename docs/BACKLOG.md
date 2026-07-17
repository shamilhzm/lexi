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

- **Sentence builder + transformation widgets** (M). *Why:* the app is almost
  entirely recognition (flips + multiple choice); Swain's output hypothesis says
  production is where grammar restructures — and **word order (V2, verb-final)
  is the one core German skill the current widget set cannot drill at all.**
  *Do:* two new self-contained exercise widgets per the archived catalog
  (`docs/archive/orbita-product-brief.md` §Exercise types): **sentence builder**
  (drag/tap word tiles into order; tokens derived from the card's own example
  sentence, so no new content is needed; must handle V2 and subordinate-clause
  verb-final) and **transformation** (statement→question, present→Perfekt,
  active→passive — start with the conjugation engine's tenses). Wire both into
  `eligibleModes`/`MODE_TAG` so sessions, blind spots, and the miss log pick them
  up for free. *Done-when:* both render in Fundamentals and mixed sessions, graded
  into FSRS, with unit tests over tokenization/grading. *Touches:*
  `views/Fundamentals.tsx`, `session.ts`, tests.
- **Near-miss grading + progressive hints** (S). *Why:* "supportive" is texture,
  not a slogan — binary wrong punishes close attempts. *Do:* port the archived
  Orbita v7 details: typed answers graded diacritic-tolerantly (the `norm()`
  fold already exists — surface "right, just spelling" as a near-miss instead of
  wrong), and a progressive hint ladder on cloze/typed items (length → first
  letter → first half), where taking a hint caps the grade at Good rather than
  failing. *Touches:* `views/Fundamentals.tsx`, `views/GrammarDrill.tsx`.
- **Plural-formation grammar point** (S, content). *Why:* found by the loop —
  `MODE_REMEDY.plural` has no point to remediate to; plural misses currently dead-end.
  *Do:* author one point (die Pluralbildung: -e/-en/-er/-s/umlaut patterns) with
  ≥5 exercises via `grammar-supplement.ts`, then point `MODE_REMEDY.plural` at it.
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

## Parked decisions (revisit deliberately, don't drift into)

- **Paper card faces.** The `.paper` scope is fully built but intentionally **off**
  (`PAPER_VIEWS` is empty; App.tsx notes the warm look clashed with the terminal).
  DESIGN-REVIEW still recommends paper-for-the-card-in-hand. A *decision*, not a bug.
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
