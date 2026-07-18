# Lexi — UX Path Analysis (July 2026)

A walkthrough of the three journeys that decide whether Lexi is shareable: the
**happy path** (things go right), the **sad path** (things go wrong around the
learner), and the **frustrated path** (things go wrong *at* the learner). Traced
against the actual code (`App.tsx`, `Today.tsx`, `Review.tsx`, `Fundamentals.tsx`,
`GrammarDrill.tsx`, `Placement.tsx`), not against how we hope it behaves.
Findings are marked **✅ fixed in this pass** or **→ backlog**.

---

## 1. Happy path — the daily loop works

**First run.** Open → single guided hero ("Find your level, then learn your first
words · 2 minutes") → placement → interest picking → auto-built 10-card session →
recap with "These N words come back tomorrow — that's the whole system."
Nothing competes for attention (`firstRun` gates out the market and drills).
This is genuinely good: one door, one promise, an explanation of the mechanism
at the exact moment the learner has just experienced it.

**Daily return.** Today shows the streak, one big number, a one-line breakdown
(due · new · from which sectors), and one amber button. Session interleaves
flips with drills for the *same* words, weaves in blind-spot drills, linked
grammar (learn *obwohl* → its structure follows), and remediation. Recap →
streak → done. The "what should I study?" decision is fully removed.

**Strengths worth protecting:** the single CTA; the mechanism-explaining recap;
grading from either card face; undo; the blind-spots accordion expanding in
place; skip that never punishes.

**Happy-path findings**

| # | Finding | Status |
|---|---|---|
| H1 | Today's "Grammar exercises" row still read **"444 exercises"** (actual: 571). Stale numbers quietly corrode trust in every other number. | ✅ fixed |
| H2 | The session recap reports flips + recall but doesn't celebrate drill work distinctly. Minor; revisit with the recap next time it's opened. | → backlog (note) |

---

## 2. Sad path — things go wrong around the learner

Walked: empty queues, abandoned onboarding, lost data, mid-session exits, a
crashing view.

**What already holds up.** Per-view `ErrorBoundary` with reset; IndexedDB
persistence + export/import backup; the placement nudge persists until taken;
Review's empty state offers three real exits (drills / decks / done); FSRS
handles long gaps without "ease hell"; a mid-session exit loses only position —
every graded card was persisted at grade time.

**Sad-path findings**

| # | Finding | Status |
|---|---|---|
| S1 | Today's **"All clear"** state was a dead end: prose said "open a deck to push ahead" with no way to do it. The one moment a motivated learner asks for more, and we answered with a shrug. | ✅ fixed — "Open decks" button |
| S2 | Abandoning the guided first run mid-placement returns to the hero next launch (`onboarded` unset) — correct, but the hero doesn't acknowledge the retry ("Pick up where you left off"). Cosmetic. | → backlog (note) |
| S3 | A cleared browser cache with no backup is unrecoverable. Export exists but is passive — nothing ever *suggests* it. Consider a one-time nudge after the first week ("You own 200 words — save a backup?"). | → backlog |

---

## 3. Frustrated path — things go wrong at the learner

The path that decides whether this is shareable. Walked: typed answers, hard
cards, the post-vacation mountain, repeated misses, keyboard/mobile traps.

**What already holds up (much of it shipped this week).** Skip is free and
signals "too steep" without an FSRS lapse; near-misses ("schoen" for *schön*)
are affirmed, not punished; the hint ladder offers a path between blind guess
and giving up; drills the learner keeps missing summon the grammar point that
teaches the system; grounded gates (`canTransform`, `caseSafe`, `reliable`) mean
the app never renders wrong German to a struggling learner — support built on
correct material.

**Frustrated-path findings**

| # | Finding | Status |
|---|---|---|
| F1 | **Space couldn't be typed in typed exercises during a session.** Review's global key handler `preventDefault`ed Space to flip the card — so "habe gemacht" was untypeable in the transform drill; the space bar silently did nothing (worse: flipped state under the card). Classic frustrated path: the app looks broken and blames your fingers. | ✅ fixed — key handler ignores input/textarea/contentEditable |
| F2 | **The post-gap mountain.** `buildBriefing` included *every* due review, uncapped. After two weeks away a learner opened the app to "312 cards queued" — the single most common reason people quit SRS apps. | ✅ fixed — `DAILY_DUE_CAP` 60 oldest-first, `dueTotal` reported, Today frames it honestly ("… waiting in total — today serves the oldest 60. The rest keep.") |
| F3 | Wrong-answer feedback tone is uniform. After the 5th consecutive miss the app behaves identically to the 1st. A tiny circuit-breaker ("Rough patch — these will come back easier tomorrow" + offer to end the session at a natural break) would read as care, not failure. | → backlog |
| F4 | HD voice (Piper Thorsten) hides behind a Settings toggle; frustrated ears meet robo-TTS and never learn better exists. Offer once, in context, at first pronunciation tap. | → backlog |
| F5 | No session resume: an interruption rebuilds the queue from scratch. | ✅ resolved by design — grades persist at grade time and graded cards leave their pools, so reopening rebuilds exactly the remainder; only cosmetic position is lost. "Quick 5" now serves the short-moment case directly. |

---

## 4. Analysis — what the three paths say about the product

The happy path is the strongest of the three: the loop from "open app" to
"felt progress" is short, explained, and honest. The sad path is mostly
covered by architecture (local-first, backups, error boundaries) and now has no
dead ends. The frustrated path is where the July work landed — skip signals,
near-misses, hints, remediation, and now the **due cap (F2)**, which removed the
last finding that could end a learner's relationship with the app in a single
moment. What remains (F3–F5, S3) is texture, not structure.

The through-line of all three paths matches the product's one-liner: *grounded*
(never render wrong German, never show a stale number) and *supportive* (never
punish an attempt, never leave a dead end, never let a backlog feel like debt).

*Maintenance: when a backlogged finding ships, mark it ✅ here and move the
detail to BACKLOG.md's shipped log.*
