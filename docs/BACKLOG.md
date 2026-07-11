# Lexi — Backlog

The one prioritized list of open work. Reconciled against the actual `src/` on
2026-07-11, so it overrides anything in the older strategy docs. Grouped
**Now / Next / Later**, plus **Housekeeping**, **Tech debt**, and **Parked
decisions**.

Effort key: **XS** <½ day · **S** ~1 day · **M** a few days · **L** 1–2 weeks.
Each item lists *Why · Do · Done-when · Touches*.

---

## Already shipped — do not redo

The archived docs describe these as "to do"; they're done. Flagged so nobody
re-implements them:

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

---

## Now (P0)

### 1. Blind Spots expands in place — no page jump  ·  S
**Why.** On Today, "Grammar Fundamentals" opens an inline accordion, but "Blind
spots" navigates to a separate `blindspots` page. It should expand in place like
Fundamentals, so the daily loop never leaves Today. *(This is the explicit ask.)*

**Do.**
- In `Today.tsx`, give the Blind-spots row the same treatment as the Grammar
  Fundamentals row: a `blindOpen` state, a chevron that rotates, and an
  `AnimatePresence` height/opacity reveal (copy the `drillsOpen` block, ~L128–158).
- Inside the reveal, render the ranked-miss list that `BlindSpots.tsx` already
  draws from `missStats(30)` — the labelled bars, each a button that drills that
  tag — plus the "Drill grammar" catch-all. Extract that list into a small shared
  component (e.g. `components/BlindSpotList.tsx`) and use it in both places, or
  inline it; don't duplicate the bar markup.
- Rewire the callback: Today currently gets `onBlindSpots` (a navigation). Replace
  it with `onBlindDrill(tag?: string)` wired to `App.drillFor` (which already maps
  a miss tag → the right Gym mode). Drop the `onBlindSpots` prop.
- Remove the now-dead redirect: the `blindspots` entry in `App.View`, the
  `{view === 'blindspots' && …}` branch, and the **Blind Spots** item in the
  `MORE` nav. Keep `BlindSpots.tsx` only if the shared list lives there; otherwise
  delete it. Remove the `TrendingDown` import in `App.tsx` if it's orphaned.

**Done-when.** Tapping Blind spots on Today expands/collapses in place (chevron
rotates, height animates, `prefers-reduced-motion` honoured); each row starts the
right drill without navigating; the `blindspots` route and its More-menu entry are
gone; `npx tsc --noEmit` and `npm run build` are clean.

**Touches.** `src/views/Today.tsx`, `src/App.tsx`, `src/views/BlindSpots.tsx`
(→ maybe `src/components/BlindSpotList.tsx`), `src/views/Home.tsx` (prop thread-through).

---

## Next (P1)

### 2. Make Blind Spots the session engine  ·  M
**Why.** Misses are logged (`logMiss`) and displayed, but never fed back into
study. PRODUCT-FOCUS's core call was to auto-inject lapsed items into the daily
session so you drill weaknesses where you already are. Depends on / pairs with #1.

**Do.** In `buildBriefing` (`store.ts`), reserve a capped share of the queue for
blind-spot drills derived from `missStats`, resolving each tag back to its Gym
mode/cards (the `MODE_TAG` map + `gymId`). Surface the count on the Today chip.

**Done-when.** A daily session includes a bounded number of blind-spot items;
Today shows how many; sessions stay length-capped; tsc/build clean.

**Touches.** `src/store.ts`, `src/session.ts`, `src/views/Today.tsx`.

### 3. Settle "Weakest Sectors" vs Blind Spots  ·  S  *(decision + small change)*
**Why.** `weakestSectors()` still tops up `buildBriefing` with fresh cards, while
PRODUCT-FOCUS said Blind Spots should own session injection. They're not actually
in conflict — weakest-sectors chooses *new* cards, blind-spots resurfaces *lapsed*
ones — so decide explicitly rather than half-cutting.
**Do.** Either keep `weakestSectors` as the new-card source and document the split,
or fold it in after #2. Don't leave it ambiguous.
**Done-when.** One documented strategy for how fresh vs lapsed cards enter the
briefing. **Touches.** `src/store.ts`.

### 4. Desired-retention control  ·  S
**Why.** Highest leverage-to-effort idea from COMPETITIVE-RESEARCH, and dead
on-brand for a power-user terminal. `srs.ts` uses `fsrs()` defaults; ts-fsrs takes
a `request_retention` param.
**Do.** Add a retention target (0.85 / 0.90 / 0.95) in Settings, persist it, pass
it into the engine, and show a one-line workload hint ("~N reviews/day").
**Done-when.** Changing the target measurably changes scheduling; setting persists;
hint renders. **Touches.** `src/srs.ts`, `src/store.ts`, `src/views/Settings.tsx`.

### 5. Data durability — IndexedDB + export/import  ·  M
**Why.** All FSRS history lives in `localStorage`. For anyone but you, one cleared
cache = months gone = uninstall. The single biggest retention risk once real users
rely on it (PRODUCT-FOCUS "Later"; DESIGN-REVIEW device-continuity gap).
**Do.** Move card/miss/visit state to IndexedDB with a one-time migration from the
existing `localStorage` keys; add explicit **Export** / **Import** of a backup file
(JSON; encrypted stretch goal). Keep the pub/sub store API unchanged.
**Done-when.** State persists in IndexedDB; export→clear→import round-trips with no
loss; existing users migrate silently. **Touches.** `src/store.ts` (persistence
layer), `src/views/Settings.tsx`.

---

## Later (P2)

### 6. Word Exchange, mobile-native (drill-down treemap)  ·  L
**Why.** The single squarified treemap is unreadable at ~390px (labels overflow,
tiles collapse). The market is Lexi's identity; it deserves to be the best thing on
a phone, not a shrunk desktop view. Biggest eng item in the plan.
**Do.** Top level = ~8–10 large category tiles sized by mass; **tap to zoom** into a
category's sectors as a second treemap; keep the red→green heat gradient; make the
**%** the primary glyph with the name secondary; optional `Markt / Liste` toggle for
the smallest screens.
**Done-when.** At 380px the market is legible and navigable by drill-down; heat
preserved; back behaviour coherent. **Touches.** `src/views/Markt.tsx`,
`src/lib/treemap.ts`, `src/views/Home.tsx` (back stack).

### 7. Grow the corpus toward ~10k + rebalance A1/A2  ·  M (ongoing)
**Why.** Distribution is B1-heavy with thin A1/A2 — backwards for early reading;
core high-frequency lemmas are still missing. The pipeline exists; this is running
it in reviewable batches.
**Do.** `corpus:coverage` → build A1/A2 batches → `corpus:validate --strict` →
review diff → commit. Close the top-frequency gaps first.
**Done-when.** Coverage report shows ≥95% of the top ~2,000 lemmas per level; A1/A2
filled out; validate green; load size still acceptable. **Touches.**
`scripts/corpus/*`, `public/data/*.json`.

### 8. Finish the "Grammar Fundamentals" rename internally  ·  S
**Why.** UI says "Grammar Fundamentals" but the view id, file, and props are still
`gym`/`Gym.tsx`. Cosmetic, but the internal/external mismatch trips up new readers.
**Do.** Rename the `gym` view id → `fundamentals` (and optionally the file), keeping
`MODE_TAG`/`gymId` FSRS ids **unchanged** so existing schedules survive.
**Done-when.** No user-facing "Gym"; FSRS card ids untouched; tsc/build clean.
**Touches.** `src/App.tsx`, `src/views/Gym.tsx`, callers.

### 9. Automated tests for the pure logic  ·  M
**Why.** `package.json` has only `typecheck`; the project CLAUDE.md's "run tests"
is blank. The riskiest logic is deterministic and highly testable — `conjugate.ts`
(has verified forms), `srs.ts`, `treemap.ts`, the miss/briefing math in `store.ts`.
**Do.** Add Vitest; unit-test conjugation against the known table, treemap
invariants (no overlap/gaps), and briefing assembly. Add `npm test`; fill the
CLAUDE.md commands.
**Done-when.** `npm test` runs green in CI-style; conjugation regressions caught.
**Touches.** `package.json`, new `src/**/*.test.ts`, project `CLAUDE.md`.

---

## Housekeeping (cheap, do alongside anything)

- **Fill the project `CLAUDE.md` §0 Project Context** — stack, run/lint/test
  commands, key entry points (`src/store.ts`, `src/session.ts`, `src/App.tsx`,
  `public/data/`). It's an empty template right now. **XS.**
- **Fix the root `README.md` "Surfaces" list** — it still describes a **Mine**
  (sentence-mining) surface and auto-enrichment that no longer ship in
  `src/views/`. Remove or mark as future so the front door matches reality. **XS.**
- **Header "Support" link** points at `href="#"` (`App.tsx` L131, with a TODO).
  Point it at a real page when one exists; until then it's a visible dead link. **XS.**

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
