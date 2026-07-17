# Lexi — Simulated User Sessions (July 2026)

A stand-in for the real thing: two personas walked step-by-step through the
*actual* code paths (`App.tsx` first-run chain, `Placement.tsx`, `Interests.tsx`,
`Review.tsx`, `Today.tsx`, the drills), with every hesitation logged as a
finding. **A simulation can only find what the simulator can imagine — it
validates flows, not feelings.** Replace this with one silent session watching a
real friend as soon as one exists; their first confused tap outranks everything
below.

Findings are **✅ fixed in this pass** or **→ backlog**.

---

## Session A — "Anna": true beginner, iPhone, Safari, evening, ~8 minutes

**A1. Opens the link.** Boot splash → single guided hero ("Find your level, then
learn your first words · 2 minutes"). One door, a time estimate, a promise.
No hesitation. ✓

**A2. Placement.** Words appear; she knows none of the first five. The buttons
say "New to me" — kind framing, self-report, no red X shaming (the X icon is
decorative here). She can't fail, only calibrate. ✓ — but the **result screen
told her "Seeded 0 words you already know"**: the app's very first statement to
a beginner was a zero. **✅ fixed** — zero-seed case now reads "Starting fresh
at A1 — the best place to start."

**A3. Interests.** Chips with counts; she taps three. ✓

**A4. First session, first card.** A word she has *by definition* never seen,
and the buttons demanded a verdict: "Didn't know" — failing a test she was
never given, ten times in a row on her first session. **✅ fixed** — cards in
the `new` state now grade as **"Still learning / Got it"**; the know/didn't-know
framing appears only once a card is genuinely being *re*-tested.

**A5. Mid-session drill.** A gender drill on a word she just flipped — the aha
moment lands. She picks wrong; the right answer lights green *with a ✓ icon*
(**✅ fixed** — right/wrong in every multiple-choice widget was color-only;
icons added, since ~1 in 12 men can't rely on the green/red channel). ✓

**A6. Recap.** "These 8 words come back tomorrow — that's the whole system."
The mechanism explained at the moment she experienced it. ✓

**A7. She closes Safari.** This was the kill shot: ten days later iOS would
have evicted IndexedDB and every word with it. **✅ fixed (this pass)** —
`navigator.storage.persist()` at boot, plus the **install nudge** on Today
(iOS: Share → Add to Home Screen; Chromium: real install button; both with an
"export a backup" escape hatch).

## Session B — "Jonas": B1 returner, desktop Chrome, lunch break, ~15 minutes

**B1. Placement → B1.** ~20 words seeded, filter A1–B1, market reflects
reality. ✓

**B2. Daily session.** Space to flip, arrows to grade, undo when an arrow slips.
Typed transform drill: he types "habe gemact" — one letter off, graded wrong
with the answer shown. Acceptable but curt. **→ backlog**: edit-distance-1
tolerance as a near-miss ("typo, not a miss") — measure first whether it
over-forgives real confusions (gemacht/gemackt vs. gedacht).

**B3. Kasus drill (as a German-aware user).** Two authenticity wobbles a
learner would absorb as truth:
- "von dem Tisch" — grammatical, but natural German contracts to *vom Tisch*
  with a bare noun. **✅ fixed** — bare-noun dative article items now use only
  *mit* (the unmarked full form); von/bei remain in the adjective flavor, where
  the full article is natural again ("bei dem alten Tisch").
- "während der Lampe" — grammatical case, nonsense semantics (*während* takes
  temporal nouns only). **✅ fixed** — *während* removed; *wegen/trotz* read
  plausibly with almost any noun.

**B4. He hits a wrong plural on a card.** As of this pass there's a **flag
button** in the session chrome — one tap, deduped, rides the backup export to
the maintainer. **✅ built.** → backlog: surface the flagged list in Profile.

**B5. He leaves mid-session for a meeting.** Grades persisted; position lost.
Known (UX-PATHS F5, backlog). Tolerable for Jonas, worth fixing eventually.

---

## What the simulation cannot tell us

Honesty about the method: these sessions validate *logic and copy*, not
*motivation*. The open questions only a real human answers:

1. Does the treemap read as "my German" or as noise? (DESIGN-REVIEW's metaphor
   worry — unresolvable from inside.)
2. Does anyone come back on day 2 without being asked? (The retention question;
   no simulation returns tomorrow.)
3. Is a 20-card session too long or too short for a phone-on-the-couch mood?
4. Does "Still learning / Got it" read as kind or as patronizing?

When a friend is picked: hand them the phone, say only "learn some German,"
stay silent for ten minutes, and write down the first three things they say out
loud. Then update this file with what the simulation missed.
