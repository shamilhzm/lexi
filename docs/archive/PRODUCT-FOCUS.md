> **⚠️ ARCHIVED (July 2026) — decisions shipped.** The prune calls here (cut Tutor, Reader/Lesen, Galaxy, Duel, Exam countdown, Weakest-Sectors widget; new cyan logo; “Grammar Fundamentals” naming) have landed. Still-open items (Blind Spots as the session engine, mobile drill-down treemap, IndexedDB migration) live in [`../BACKLOG.md`](../BACKLOG.md). Kept for provenance — not current.

# Lexi — Focus & Prune Plan

_Reconciling the July 2026 feedback into a shippable direction. Written after a pass over `src/`._

## The one-sentence thesis

Lexi is a **German vocab & grammar terminal** with one home screen — **The Word Exchange** — that works as well on a phone as on a laptop. Everything that isn't vocab growth, grammar drilling, or that market view gets cut. The goal of this pass is *less surface, more focus*, so someone who isn't you can pick it up and get it.

Three decisions from this round set the direction:

1. **The Word Exchange becomes mobile-native** — one identity everywhere, not a desktop-only showpiece with a degraded phone fallback.
2. **Cut the "cool but unused":** AI Tutor and Lesen are removed, not demoted.
3. **Galaxy is cut** — it overlaps the Word Exchange and only ever worked on desktop.

---

## Decision table

| Component | File(s) | Verdict | Why |
|---|---|---|---|
| The Word Exchange (market/treemap) | `views/Markt.tsx`, `lib/treemap.ts` | **ELEVATE** | The identity. Now the flagship on every screen size. Biggest lift. |
| Study session | `views/Review.tsx` | **FIX** | Right core, too crowded. Make the card the hero. |
| Grammar drills | `views/Gym.tsx`, `views/GrammarDrill.tsx`, `lib/conjugate.ts`, `lib/grammar.ts` | **KEEP + rename** | Your real differentiation. "Gym" clashes with the terminal theme. |
| Blind Spots | `views/BlindSpots.tsx` | **ELEVATE** | Promote from a hidden 58-line view into the engine that feeds sessions. |
| Placement | `views/Placement.tsx` | **KEEP** | Onboarding & bulk-known marking. Essential for non-you users. |
| Today | `views/Today.tsx` | **FIX** | Strip the dead widgets (below), keep the launchpad. |
| AI Tutor | `views/Tutor.tsx`, `lib/tutor.ts` | **CUT** | Unused vs. the core loop. |
| Lesen / Reader | `views/Reader.tsx`, `lib/mining.ts`* | **CUT** | Unused. *Keep the sentence-mining lib if it feeds cards — see note.* |
| Galaxy | `views/Galaxy.tsx` | **CUT** | Redundant with the Word Exchange; desktop-only. |
| Lexi Duel | `public/lexi-duel.html`, 2 nav links in `App.tsx` (L124, L192) | **CUT** | A dud you've never used. |
| Exam countdown | `ExamCard` in `views/Today.tsx`, `examDate`/`daysToExam`/`EXAM_KEY` in `store.ts` | **CUT** | Irrelevant with no exam booked. |
| Weakest sectors | `views/Today.tsx` L140+, `weakestSectors` in `store.ts` | **CUT → replaced by Blind Spots** | A coarse proxy for the thing Blind Spots does properly. |

\* `lib/mining.ts` note: if the reader was the only consumer of sentence-mining, it comes out with Reader. If mined sentences already enrich cards, keep the lib and drop only the `Reader` view. Confirm before deleting `mining.ts`.

---

## Your 9 concerns → decisions (nothing dropped)

1. **Impressive on iPhone, keep the web app** → Word Exchange goes mobile-native; web/desktop keeps the full terminal. Same codebase, responsive. (See §Mobile.)
2. **Study feels crowded / not focused on the card** → Session redesign: card as hero, everything else demoted. (See §Study.)
3. **Tutor & Lesen underused** → Cut both.
4. **Lexi Duel is a dud** → Cut. Delete the standalone page and the two nav links.
5. **Galaxy weak + broken on mobile** → Cut.
6. **The "L" logo is lazy** → New mark, terminal/ticker-native. (See §Identity.)
7. **Exam counter useless** → Cut the widget and its store keys.
8. **Weakest Sectors < Blind Spots** → Cut Weakest Sectors; Blind Spots inherits and improves the job.
9. **Blind Spots too hidden / not integrated** → Promote it into the session engine + a Today entry point. (See §BlindSpots.)

---

## §Study — make the card the hero

The current session screen stacks: live ticker → "Today's session / N left" → A1–C2 drill row → the card → grade buttons → a Reviewed/Remaining panel. Five things competing with the one thing that matters.

Fixes, in order of impact:

- **Pause/hide the ticker during an active session.** It's motion in your peripheral vision while you're trying to recall a word. Bring it back on Today/Markt where "the market is alive" is the point.
- **Move the A1–C2 level filter to session *setup*,** not persistently above every card. You pick scope once when you start; it shouldn't cost vertical space on every review.
- **Collapse the Reviewed/Remaining panel into one slim progress bar** ("12 / 40") at the very top or bottom edge. It's a status glance, not a section.
- **Center the card vertically with real whitespace**, larger type, and anchor **Didn't know / Knew it at the bottom thumb-arc** so it's one-handed on a phone.
- **One idea per screen:** front → flip → example/answer → grade. No secondary panels visible until the card is graded.

Net effect: on a phone, an active review is *just the card and two buttons*. That single change probably resolves most of the "crowded" feeling.

---

## §Mobile — the Word Exchange, made native

A dense 18+ sector treemap is unreadable at 390px (your screenshots confirm it — labels overflow, tiles collapse). Making the market genuinely mobile-native means a **drill-down treemap**, not a shrunk one:

- **Top level:** ~8–10 large category tiles, sized by mass (Language Building Blocks, Core Vocab, Society & Politics…). Big enough to tap and read.
- **Tap to zoom** into a category → its sectors as a second treemap. Standard responsive-treemap interaction; keeps information density without cramming.
- **Keep the heat gradient** (red → green = unknown → known). It's the signature; don't lose it.
- **Primary glyph = the %,** name secondary and truncated gracefully. Percent is what the eye wants.
- **Optional `Markt / Liste` toggle** for a plain ranked list on the smallest screens.

This is the biggest engineering item in the plan — budget for it accordingly. It's the bet you chose, and it's the right one: one identity beats a good desktop view plus an apologetic mobile fallback.

---

## §BlindSpots — from hidden view to session engine

Right now it's a 58-line destination almost nobody finds. Reframe it as **the thing that decides what you drill**, keyed to actual FSRS lapses (words/rules you repeatedly miss), not sector coverage:

- **Delete Weakest Sectors.** Blind Spots replaces the injection logic in `store.ts` that currently tops sessions up from "weakest sectors."
- **Auto-inject blind-spot cards** into the daily session (a capped share), so they surface where you already are — inside study.
- **One Today entry point:** a "Blind Spots · N" chip that launches a session built purely from your lapsed items.

That satisfies "more valuable than Weakest Sectors" *and* "better integrated into study sessions" in one move.

---

## §Identity — logo + the Gym rename

**Logo.** The "L" reads as a placeholder. Go terminal-native — a mark that belongs on a trading screen:

- a monospace prompt/cursor mark (a blinking amber block, or `lexi_` with a cursor), or
- a candlestick / ticker-bar glyph whose vertical bar + baseline also reads as an "L".

I can generate a few concepts as a follow-up (dark + light, favicon + app icon) rather than block on it here.

**Grammar Gym → rename.** "Gym" is a fitness metaphor in a market/terminal app. Options that fit the theme *and* stay pedagogically honest:

- **Fundamentals** — grammar *is* the fundamentals of the language, and "fundamentals" is core market vocabulary. My pick.
- **The Grammar Desk** / **Rules Desk** — a trading-desk framing.
- Sub-drills (gender, plural, conjugation, cloze) become **instruments** if you want to lean into the metaphor.

---

## Priority sequence

**Now — fast, contained, high-clarity (mostly deletion + one screen):**
1. Cut Duel, Galaxy, Tutor, Reader/Lesen, Exam countdown, Weakest Sectors. Clean the nav in `App.tsx`. Verify the build passes and no dangling imports/routes remain.
2. De-crowd the study session (§Study).
3. Blind Spots → injection engine + Today chip (§BlindSpots).

**Next — the real investment:**
4. Word Exchange mobile-native drill-down (§Mobile).
5. New logo / app icon (§Identity).
6. Rename Gym → Fundamentals.

**Later — reliability for outside users (adjacent, but the real retention risk):**
7. Move review state off `localStorage` to IndexedDB + explicit export/import. For a stranger, one cleared cache = months of FSRS history gone = uninstall. This matters more than any feature once other people rely on it.
8. PWA polish — installable, offline. You're local-first already, so this is mostly manifest + layout.

---

## Explicitly NOT changing

The terminal identity, the market metaphor, FSRS, and the no-account / local-first stance. For a lean, local-first paid app those are the moat. This plan sharpens the identity by removing everything that dilutes it — it doesn't touch the core.
