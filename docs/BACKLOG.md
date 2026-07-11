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

---

## Now

### 1. Grow the corpus toward ~10k + rebalance A1/A2  ·  M (ongoing)
**Why.** Distribution is B1-heavy with thin A1/A2 — backwards for early reading;
core high-frequency lemmas are still missing. The pipeline exists; this is running
it in reviewable batches.
**Do.** `corpus:coverage` → build A1/A2 batches → `corpus:validate --strict` →
review diff → commit. Close the top-frequency gaps first.
**Done-when.** Coverage report shows ≥95% of the top ~2,000 lemmas per level; A1/A2
filled out; validate green; load size still acceptable. **Touches.**
`scripts/corpus/*`, `public/data/*.json`.

### 2. Coarsen the market's top level to ~8–10 categories  ·  S–M
**Why.** The drill-down treemap shipped, but level 1 still renders all 16 theme
groups — denser than the "~8–10 large tiles" the mobile design calls for. This is a
data/taxonomy change, not UI.
**Do.** Add a coarse super-group layer above the 16 groups (map each group → one of
~8 categories) in `sectors.json` or a grouping map, and render super-groups at level
1 (groups become the middle drill level). Keep FSRS ids and sector names unchanged.
**Done-when.** Level 1 shows ~8–10 tiles, readable at 380px; the drill path stays
coherent. **Touches.** `public/data/sectors.json` (or a grouping map),
`src/views/Markt.tsx`, `src/views/Home.tsx`.

---

## Next

### 3. Finish the "Grammar Fundamentals" rename internally  ·  S
**Why.** UI says "Grammar Fundamentals" but the view id, file, and props are still
`gym`/`Gym.tsx`. Cosmetic, but the internal/external mismatch trips up new readers.
**Do.** Rename the `gym` view id → `fundamentals` (and optionally the file), keeping
`MODE_TAG`/`gymId` FSRS ids **unchanged** so existing schedules survive.
**Done-when.** No user-facing "Gym"; FSRS card ids untouched; tsc/build clean.
**Touches.** `src/App.tsx`, `src/views/Gym.tsx`, callers.

---

## Later

### 4. Automated tests for the pure logic  ·  M
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
