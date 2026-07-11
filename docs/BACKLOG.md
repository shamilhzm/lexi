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

---

## Now

### 1. Fix the corpus pipeline (broken since the prune)  ·  S–M  ⛔ blocks corpus growth
**Why.** `corpus:selftest` / `corpus:build` crash: `scripts/corpus/lib.ts`
(`primeApp`), `scripts/ai-selftest.ts`, and `scripts/or-smoke.ts` all import
`src/lib/mining.ts`, which was **deleted in the July prune**. The reader/mining module
the pipeline reused for match-testing and enrichment is gone, so no batch can run.
**Do.** Either restore a minimal build-time `mining.ts` with only the pieces the
pipeline uses (`enrich`, `cardsFromEnrichment`, `isLikelyEntity`, and whatever
`primeApp` needs), or refactor those steps to drop the dependency.
**Done-when.** `npm run corpus:selftest` passes and a dry `corpus:build` runs.
**Touches.** `src/lib/mining.ts` (restore/replace), `scripts/corpus/lib.ts`,
`scripts/ai-selftest.ts`, `scripts/or-smoke.ts`.

### 2. Grow the corpus toward ~10k + rebalance A1/A2  ·  M (ongoing) — blocked by #1
**Why.** Distribution is B1-heavy with thin A1/A2 — backwards for early reading; core
high-frequency lemmas are still missing. **Needs a network- and LLM-enabled maintainer
machine plus human spot-checks of gender/plural/level per the pipeline's own rules —
not an autonomous bulk commit.**
**Do.** Once #1 is fixed: `corpus:coverage` → build A1/A2 batches →
`corpus:validate --strict` → review diff → commit, in reviewable batches.
**Done-when.** ≥95% of the top ~2,000 lemmas per level; A1/A2 filled; validate green;
load size still acceptable. **Touches.** `scripts/corpus/*`, `public/data/*.json`.

---

## Next

### 3. Automated tests for the pure logic  ·  M
**Why.** `package.json` has only `typecheck`. The riskiest logic is deterministic
and highly testable — `conjugate.ts` (verified forms), `srs.ts`, `treemap.ts`, and
the miss/briefing/blind-spot math in `store.ts` + `session.ts` (now more logic-heavy).
**Do.** Add Vitest; unit-test conjugation against the known table, treemap invariants
(no overlap/gaps), briefing assembly, and blind-spot mode selection. Add `npm test`.
**Done-when.** `npm test` runs green in CI-style; conjugation/blind-spot regressions
caught. **Touches.** `package.json`, new `src/**/*.test.ts`.

---

## Parked decisions (revisit deliberately, don't drift into)

- **Paper card faces.** The `.paper` scope is fully built but intentionally **off**
  (`PAPER_VIEWS` is empty; App.tsx notes the warm look clashed with the terminal).
  DESIGN-REVIEW still recommends paper-for-the-card-in-hand. A *decision*, not a bug.
- **AI tutor & the Reader/Mine flow.** ROADMAP's two flagship paid features; **cut
  from the core loop** in the July prune. `lib/ai.ts` and the OpenAI-compatible
  client still exist (corpus enrichment + the Settings AI provider), so re-adding a
  tutor or a known-word-coloured reader is feasible later — but it's roadmap-gated.
  *Note:* the Settings "AI provider" section now only serves that vestigial path; fold
  it in or hide it if the tutor/reader stay cut.
- **Billing / €5 supporter tier.** The whole freemium split in `ROADMAP.md` depends
  on it. No infra yet; the "Support" link (now → GitHub) and any Pro gating wait on this.

---

*Maintenance: when an item ships, move it to "Already shipped" with a one-liner, and
delete it from the archived docs' mental model — this file is the source of truth.*
