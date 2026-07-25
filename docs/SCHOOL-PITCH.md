# Lexi — the Sprachschule pitch

*Extracted verbatim from `DESIGN-REVIEW.md` (July 2026) and given its own home.
It was buried inside a design critique, where nobody looking for a B2B strategy
would ever find it, and where it aged on a completely different clock from the
button paddings around it.*

**Status:** forward-looking. The gap list below is largely **not built**. Nothing
here should be said to a school until the corresponding row is true.

---

## Why a German language school should care — the honest version

A Sprachschule's economics: a course is 4–12 weeks, outcomes are measured by pass
rates and re-enrollment, and the single biggest drag on both is that **students
arrive at each lesson having forgotten the vocabulary of the last one**. Teachers
cannot fix this in contact hours; consolidation is homework, and homework
compliance is unmeasurable. That is precisely the gap Lexi occupies.

The pitch, in one sentence: *"Your teachers teach; Lexi guarantees the vocabulary
sticks — and shows you the receipts."*

## The three assets you already hold

1. **Learning science that isn't marketing.** Spaced retrieval is the most
   replicated effect in the learning literature (testing effect, distributed
   practice — effect sizes ~0.5–0.8 across hundreds of studies). FSRS is the
   current state of the art in operationalizing it. Interleaved multi-format
   retrieval (the session player) adds the second best-documented effect. You are
   not claiming magic; you are claiming arithmetic.
2. **DSGVO by architecture.** Local-first, no accounts, no student data leaves
   the device. For a German school this eliminates the data-processing agreement,
   the parental consent letters, and the works-council conversation. *No
   competitor with a teacher dashboard can say this.* Lead with it.
3. **Open source.** Schools can inspect it, keep it if you disappear, and never
   face a rug-pull. For public institutions and Volkshochschulen this is a
   procurement superpower.

## The ROI arithmetic (what "a few hours a week" actually buys)

Be precise, because precision is what makes a guarantee credible:

- 3 h/week ≈ 25 min/day ≈ 100–140 review actions/day at observed pace.
- Sustaining ~20 new words/day alongside reviews → **~500–600 new words/month**
  entering the FSRS pipeline, with long-run retention of scheduled material in the
  85–92% band (FSRS's own calibration target — and the app *measures* the actual
  figure per learner).
- CEFR vocabulary thresholds are roughly: A1 ~600, A2 ~1,300, B1 ~2,400, B2
  ~4,000 word families. The arithmetic therefore supports a claim like: **"a
  committed A2 student covers the B1 vocabulary gap in 8–10 weeks of 3 h/week"** —
  which happens to match a semester.
- The honest boundary: Lexi guarantees the *vocabulary and grammar-mechanics*
  component. Speaking, listening, and free writing remain the teacher's domain.
  Schools respect a tool that knows its lane; it's the "replaces teachers" pitch
  that gets you shown the door.

## What must exist before you can promise this (the B2B gap list)

| Gap | Why it blocks the pitch | Shape of the fix |
|---|---|---|
| **Measurement a teacher can see** | "Trust me, it works" is not a pitch. | A *Klassen-Report*: weekly per-student export (words known, minutes, retention %, weakest topics) — generated **on-device** and shared as a file/QR by the student, preserving the no-server DSGVO story. |
| **Curriculum alignment** | Schools teach Netzwerk, Menschen, Schritte, Begegnungen. If Lexi's Wednesday words aren't the textbook's chapter 7 words, teachers won't assign it. | Deck import format + pre-built decks per major textbook chapter (the sector/deck machinery already supports custom targets). |
| **Assignability** | A teacher needs "learn these 40 by Friday" to be one action. | Shareable deck codes/links (a JSON blob is enough — still serverless). |
| **Pre/post evidence** | The guarantee needs a baseline. | The placement test, run at week 0 and week 8, becomes your measurement instrument. Tighten it psychometrically (fixed item bank per level, known difficulty ordering). |
| **Device continuity** | A student who loses their phone loses their streak and their data — fatal in a paid pilot. | Encrypted export/restore file first (serverless); optional sync later. |
| **A pilot protocol** | Guarantees are earned, not asserted. | Two parallel classes at one school, one with Lexi homework, pre/post vocab test, 8 weeks. Publish the delta whatever it is. One honest pilot converts better than any deck of slides. |

## The guarantee, worded so you can sign it

> "Students who complete their daily Lexi session at least 5 days/week for 8 weeks
> will demonstrably know **≥400 new words** of their course's vocabulary (measured
> by in-app pre/post assessment, verifiable by the teacher's report), or the
> school's licence period extends free until they do."

Every clause is measurable with machinery you already have or is listed in the gap
table. That's what "a certain level of guarantee" means: not confidence —
*instrumentation*.

---

## What has moved since this was written

- **Device continuity** is partly addressed: encrypted-free JSON export/restore
  ships in Settings, and the install nudge exists because Safari evicts
  script-writable storage after ~7 days. Sync remains out of scope.
- Everything else in the gap table is still open. See
  [BACKLOG.md](BACKLOG.md).
