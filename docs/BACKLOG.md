# Lexi — Backlog

The one prioritized list of open work. Reconciled against the actual `src/`, so it
overrides anything in the older strategy docs. Grouped **Now / Next / Later**, plus
**Housekeeping**, **Tech debt**, and **Parked decisions**.

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

### Shipped 2026-07-11 (this pass) — P0 + P1

- **Blind Spots expands in place** (P0). The Today "Blind spots" row is now an
  inline accordion mirroring Grammar Fundamentals — ranked misses + one-tap
  drilling — with no page jump. Extracted `components/BlindSpotList.tsx`; removed
  the `blindspots` route, its More-menu entry, and `views/BlindSpots.tsx`.
- **Blind Spots feed the session** (P1). `session.ts` weaves a capped set (≤4) of
  drills in the Gym modes you miss most into every session; Today's session card
  previews the count ("+ N drills targeting your blind spots").
- **Weakest-sectors vs blind-spots split, settled** (P1). Documented decision in
  `store.ts`: `weakestSectors()` chooses fresh *vocabulary* for the briefing;
  blind spots choose which *drills* ride along. They don't overlap, so both stay.
- **Desired-retention control** (P1). Settings → *Review intensity* (85 / 90 / 95%);
  persisted and applied to the FSRS engine via `srs.setRetention`.
- **Durable storage + backup** (P1). Progress (cards / misses / visits) moved to
  **IndexedDB** (`lib/idb.ts`) with a one-time localStorage migration and a
  localStorage fallback; **Export / Import backup** in Settings so a cleared cache
  or a new device isn't fatal. Store pub/sub API unchanged; `main.tsx` awaits
  `hydrate()` before first paint.

---

## Now

### 1. Word Exchange, mobile-native (drill-down treemap)  ·  L
**Why.** The single squarified treemap is unreadable at ~390px (labels overflow,
tiles collapse). The market is Lexi's identity; it deserves to be the best thing on
a phone, not a shrunk desktop view. Biggest remaining eng item.
**Do.** Top level = ~8–10 large category tiles sized by mass; **tap to zoom** into a
category's sectors as a second treemap; keep the red→green heat gradient; make the
**%** the primary glyph with the name secondary; optional `Markt / Liste` toggle for
the smallest screens.
**Done-when.** At 380px the market is legible and navigable by drill-down; heat
preserved; back behaviour coherent. **Touches.** `src/views/Markt.tsx`,
`src/lib/treemap.ts`, `src/views/Home.tsx` (back stack).

---

## Next

### 2. Grow the corpus toward ~10k + rebalance A1/A2  ·  M (ongoing)
**Why.** Distribution is B1-heavy with thin A1/A2 — backwards for early reading;
core high-frequency lemmas are still missing. The pipeline exists; this is running
it in reviewable batches.
**Do.** `corpus:coverage` → build A1/A2 batches → `corpus:validate --strict` →
review diff → commit. Close the top-frequency gaps first.
**Done-when.** Coverage report shows ≥95% of the top ~2,000 lemmas per level; A1/A2
filled out; validate green; load size still acceptable. **Touches.**
`scripts/corpus/*`, `public/data/*.json`.

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
**Why.** `package.json` has only `typecheck`; the project CLAUDE.md's "run tests"
is blank. The riskiest logic is deterministic and highly testable — `conjugate.ts`
(has verified forms), `srs.ts`, `treemap.ts`, and the miss/briefing/blind-spot math
in `store.ts` + `session.ts` (now more logic-heavy after this pass).
**Do.** Add Vitest; unit-test conjugation against the known table, treemap
invariants (no overlap/gaps), briefing assembly, and blind-spot mode selection.
Add `npm test`; fill the CLAUDE.md commands.
**Done-when.** `npm test` runs green in CI-style; conjugation/blind-spot regressions
caught. **Touches.** `package.json`, new `src/**/*.test.ts`, project `CLAUDE.md`.

---

## Housekeeping (cheap, do alongside anything)

- **Fill the project `CLAUDE.md` §0 Project Context** — stack, run/lint/test
  commands, key entry points (`src/store.ts`, `src/session.ts`, `src/App.tsx`,
  `public/data/`). It's an empty template right now. **XS.**
- **Fix the root `README.md` "Surfaces" list** — it still describes a **Mine**
  (sentence-mining) surface and auto-enrichment that no longer ship in
  `src/views/`. Remove or mark as future so the front door matches reality. **XS.**
- **Header "Support" link** points at `href="#"` (`App.tsx`, with a TODO). Point it
  at a real page when one exists; until then it's a visible dead link. **XS.**

---

## Parked decisions (revisit deliberately, don't drift into)

- **Paper card faces.** The `.paper` scope is fully built but intentionally **off**
  (`PAPER_VIEWS` is empty; App.tsx notes the warm look clashed with the terminal).
  DESIGN-REVIEW still recommends paper-for-the-card-in-hand. This is a *decision*,
  not a bug — reopen only if you want to revisit the aesthetic.
- **AI tutor & the Reader/Mine flow.** ROADMAP's two flagship paid features; **cut
  from the core loop** in the July prune. `lib/ai.ts` and the OpenAI-compatible
  client still exist (used by corpus enrichment + Settings), so re-adding a tutor
  or a known-word-coloured reader is feasible later — but it's roadmap-gated, not
  committed. Keep out of the core until deliberately chosen.
- **Billing / €5 supporter tier.** The whole freemium split in `ROADMAP.md` depends
  on it. No infra yet; the "Support" link and any Pro gating wait on this.

---

*Maintenance: when an item ships, move it to "Already shipped" with a one-liner, and
delete it from the archived docs' mental model — this file is the source of truth.*
