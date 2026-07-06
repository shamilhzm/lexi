# Lexi — Design Review & Path to Pitch-Readiness

*Written as if from inside Apple's design & product org: what's genuinely good, what's in the
way, and what it takes before you can stand in front of a Sprachschule director and promise
ROI with a straight face.*

---

## Overall impression

Lexi has the two things most apps in this category never achieve: a **point of view** (the
Bloomberg-terminal identity is committed, coherent, and unlike anything in language learning)
and **real machinery underneath it** (5,200+ curated cards, genuine FSRS scheduling, a
placement test, sentence mining, an interleaved session player). The bones are those of a
serious product.

The gap to the next level is not features. It is **discipline**: the metaphor is allowed to
leak into moments where it costs comprehension, the information architecture offers four
doors into the same room, and the app's single most important number — *how much German do I
now own?* — is computed everywhere and communicated almost nowhere. Apple's core habit is
ruthless subordination of cleverness to clarity. Lexi is 80% there; the last 20% is what a
school will judge you on.

---

## 1. The critique

### Usability

| Finding | Severity | Recommendation |
|---|---|---|
| Four browse surfaces for one lexicon (Market, Decks, Word Map, Galaxy) with overlapping jobs. A new learner cannot predict which door leads where. | 🔴 Critical | Collapse to one **Explore** surface: treemap as the hero, sector → deck → map as drill-down levels of the *same* navigation, not sibling views. |
| Mastery is invisible. `statusOf` (new/learning/known) exists per card; nothing on the card, deck, or Today ever says "you *know* 412 of these." "Coverage" is the proxy, but it counts *seen*, not *known*. | 🔴 Critical | Headline **Known** (FSRS Review state), not Coverage. Status pip on every card front. Per-deck "known %" bar. This is also the number the entire school pitch rests on. |
| Trading jargon inside learning moments: "Markets open", "OPEN" chip, "Sector" in the session sidebar. During *study*, the learner's working memory is full of German; the metaphor taxes it. | 🟡 Moderate | Metaphor discipline: terminal language lives in Explore and the ticker; study surfaces speak plainly ("Today's session", "Topic"). The brand is the *look*, not the vocabulary quiz. |
| The unified player signals flip→drill transitions with a small DRILL chip in the header chrome. Eyes are on the card; the state change happens where nobody is looking. | 🟡 Moderate | Let the *card itself* announce the mode: distinct surface tint or corner tag on drill cards, and a ~200 ms card-level transition between item types. Chrome should never be the primary signal. |
| No first-run experience beyond the placement nudge. First screen shows a 0-day streak, a treemap of unfamiliar jargon, and three KPI zeros. | 🟡 Moderate | A 60-second guided first session: placement → first 10 cards → "you now know 8 words; here's when you'll see them again." First-session aha is the whole retention game. |
| Session end states differ between what was Review and Gym (two recap layouts, different stats). | 🟢 Minor | One recap component: reviewed, recall %, new learned, drills hit, streak. |

### Visual hierarchy

**What draws the eye first** on Today: the session count (`56px` mono numeral) — correct, and
well done. On Study: the headword — correct. On Explore/Markt the treemap wins — correct.
Hierarchy at the *screen* level is genuinely strong.

At the *component* level it frays: 10px uppercase-tracked labels, 11px chips, 11.5px pills,
12.5px explainers, 13px body, 13.5px examples — six sizes doing three jobs. The terminal
aesthetic justifies density, not entropy. Define a scale (11 / 13 / 15 / 20 / 28 / 44) and
delete every intermediate value.

### Consistency

| Element | Issue | Recommendation |
|---|---|---|
| Color semantics | Green means: gains, correct, mastered, *and* CEFR B1 (`--color-b1` is literally `--color-green`). Red means: losses, wrong, weak sectors, *and* antonyms. | Separate the CEFR ink ramp from the semantic pair. A learner should never wonder if green text is a level badge or praise. |
| Corner radii | 9, 10, 12, 16 px across sibling cards. | Two radii: 10 (controls) and 16 (cards). |
| The paper theme | Fully built, thoughtfully commented, switched off. It is the *right* answer for study surfaces — reading German on warm paper with Fraunces headwords is calmer and more legible than the terminal floor — but it ships as dead code. | Decide. My recommendation: paper for the card faces only (the object in your hand), terminal for everything around it. That contrast *strengthens* the identity: the terminal is the room, the card is the thing you study. |
| Voice | "Üben", "Guten Tag", "Wortkarte" mix with "Grammar gym", "Blind Spots", "Markets open". | Pick the rule: German nouns for surfaces, English for actions — then apply everywhere. |

### Accessibility

- **Contrast:** `--color-dim #aab6c6` on panels passes AA. Verify `--color-red #ea3943` at
  11–12px on `#141b26` — it is close to the line; consider a lighter red for small text.
- **Touch targets:** ExamCard save/clear buttons are 32px; several icon buttons in headers are
  below 44pt. The swipe card and grade buttons are fine.
- **Type size:** 10px uppercase labels are below any comfortable floor on mobile. Nothing
  interactive or informative should render under 11px, and body-adjacent text belongs at 13+.
- **Motion:** `prefers-reduced-motion` is respected — genuinely rare and commendable. Extend it
  to the new swipe rotation.
- **Haptics:** grading by swipe on a phone gives zero physical confirmation. One line
  (`navigator.vibrate(10)`) on grade commit changes how the interaction *feels* more than any
  visual polish will.

### What works well

- The identity is committed. Ticker, live-dot, mono numerals, panel elevation — it's a *world*,
  not a theme, and the panel/card material system (token-driven, one-class reskin) is
  engineering that respects design.
- The card flip + swipe grade is now the correct interaction grammar: read, flip, judge, flick.
  One thought per gesture.
- Empty and done states everywhere, written in a human voice.
- Local-first architecture is quietly the most valuable strategic asset in the whole product
  (see the school pitch below).
- The interleaved session player is pedagogically *ahead* of the big consumer apps — Anki
  doesn't interleave modalities; Duolingo doesn't do honest FSRS.

---

## 2. The five moves to the next level

**1. One loop, one number.** The product is the daily session; everything else is instrumentation.
Today's session card is the home screen hero (it already is — good). The number it advertises
must graduate from "cards queued" to **"words you'll know by Friday"**. Make *Known* the
currency of the entire app: card pips, deck bars, level progress, ticker deltas. When the
learner's mental model is "my Known number goes up when I show up," retention follows.

**2. Metaphor discipline.** Terminal in the room, paper in the hand, plain language in the
lesson. The brand survives — it gets *stronger* — when the market metaphor stops narrating
moments it doesn't serve.

**3. Collapse the map.** Today · Study · Explore · Profile. Market/Decks/Map/Galaxy become one
Explore with drill-down. The More menu should hold settings and novelties, not core surfaces.
Twelve views is a hobby; four is a product.

**4. Make the session feel alive.** Haptic tick on grade, a felt (not just counted) streak
moment at session end, a level-up ceremony when a CEFR band crosses a threshold, and item-type
transitions that happen on the card. Duolingo's moat isn't pedagogy — it's that finishing
feels like something. Lexi can have that *and* honest scheduling.

**5. The learner's own words, front and center.** Sentence mining is the differentiator
(the roadmap already knows this). Surface it: after a session, "3 of today's words came from
*your* article about FC Bayern." Ownership is the deepest retention mechanic there is.

---

## 3. The school pitch

### Why a German language school should care — the honest version

A Sprachschule's economics: a course is 4–12 weeks, outcomes are measured by pass rates and
re-enrollment, and the single biggest drag on both is that **students arrive at each lesson
having forgotten the vocabulary of the last one**. Teachers cannot fix this in contact hours;
consolidation is homework, and homework compliance is unmeasurable. That is precisely the gap
Lexi occupies.

The pitch, in one sentence: *"Your teachers teach; Lexi guarantees the vocabulary sticks —
and shows you the receipts."*

### The three assets you already hold

1. **Learning science that isn't marketing.** Spaced retrieval is the most replicated effect
   in the learning literature (testing effect, distributed practice — effect sizes ~0.5–0.8
   across hundreds of studies). FSRS is the current state of the art in operationalizing it.
   Interleaved multi-format retrieval (your new session player) adds the second
   best-documented effect. You are not claiming magic; you are claiming arithmetic.
2. **DSGVO by architecture.** Local-first, no accounts, no student data leaves the device.
   For a German school this eliminates the data-processing agreement, the parental consent
   letters, and the works-council conversation. *No competitor with a teacher dashboard can
   say this.* Lead with it.
3. **Open source.** Schools can inspect it, keep it if you disappear, and never face a rug-pull.
   For public institutions and Volkshochschulen this is a procurement superpower.

### The ROI arithmetic (what "a few hours a week" actually buys)

Be precise, because precision is what makes a guarantee credible:

- 3 h/week ≈ 25 min/day ≈ 100–140 review actions/day at observed pace.
- Sustaining ~20 new words/day alongside reviews → **~500–600 new words/month** entering the
  FSRS pipeline, with long-run retention of scheduled material in the 85–92% band (FSRS's
  own calibration target — and the app *measures* the actual figure per learner).
- CEFR vocabulary thresholds are roughly: A1 ~600, A2 ~1,300, B1 ~2,400, B2 ~4,000 word
  families. The arithmetic therefore supports a claim like: **"a committed A2 student covers
  the B1 vocabulary gap in 8–10 weeks of 3 h/week"** — which happens to match a semester.
- The honest boundary: Lexi guarantees the *vocabulary and grammar-mechanics* component.
  Speaking, listening, and free writing remain the teacher's domain. Schools respect a tool
  that knows its lane; it's the "replaces teachers" pitch that gets you shown the door.

### What must exist before you can promise this (the B2B gap list)

| Gap | Why it blocks the pitch | Shape of the fix |
|---|---|---|
| **Measurement a teacher can see** | "Trust me, it works" is not a pitch. | A *Klassen-Report*: weekly per-student export (words known, minutes, retention %, weakest topics) — generated **on-device** and shared as a file/QR by the student, preserving the no-server DSGVO story. |
| **Curriculum alignment** | Schools teach Netzwerk, Menschen, Schritte, Begegnungen. If Lexi's Wednesday words aren't the textbook's chapter 7 words, teachers won't assign it. | Deck import format + pre-built decks per major textbook chapter (the sector/deck machinery already supports custom targets). |
| **Assignability** | A teacher needs "learn these 40 by Friday" to be one action. | Shareable deck codes/links (a JSON blob is enough — still serverless). |
| **Pre/post evidence** | The guarantee needs a baseline. | The placement test, run at week 0 and week 8, becomes your measurement instrument. Tighten it psychometrically (fixed item bank per level, known difficulty ordering). |
| **Device continuity** | A student who loses their phone loses their streak and their data — fatal in a paid pilot. | Encrypted export/restore file first (serverless); optional sync later. |
| **A pilot protocol** | Guarantees are earned, not asserted. | Two parallel classes at one school, one with Lexi homework, pre/post vocab test, 8 weeks. Publish the delta whatever it is. One honest pilot converts better than any deck of slides. |

### The guarantee, worded so you can sign it

> "Students who complete their daily Lexi session at least 5 days/week for 8 weeks will
> demonstrably know **≥400 new words** of their course's vocabulary (measured by in-app
> pre/post assessment, verifiable by the teacher's report), or the school's licence period
> extends free until they do."

Every clause is measurable with machinery you already have or is listed in the gap table.
That's what "a certain level of guarantee" means: not confidence — *instrumentation*.

---

## 4. Sequence (90 days)

1. **Weeks 1–3 — the number.** Known as the headline metric everywhere; card pips; unified
   recap; type scale + radius cleanup; haptics; red-contrast fix; 44pt targets.
2. **Weeks 4–6 — the room and the hand.** IA collapse to four surfaces; paper card faces;
   metaphor pass over all study-surface copy; first-run guided session.
3. **Weeks 7–10 — the school kit.** Deck import/export codes; two textbook deck packs;
   Klassen-Report export; placement test hardening; encrypted backup file.
4. **Weeks 11–13 — the proof.** One pilot school, two classes, pre/post protocol. The result
   becomes the first slide of every future pitch.

---

*The product identity is already the strongest in the category. What's left is subtraction,
one legible number, and one honest pilot.*
