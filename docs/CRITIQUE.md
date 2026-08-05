# Lexi — the hostile read

*2026-08-05. Written deliberately as an investor who has shipped consumer language
apps and sat on the other side of a Goethe-Institut procurement table. Every number
here was measured against the shipped build, not estimated. It is meant to be
argued with — where it is wrong, say why in this file.*

**The one-line verdict.** Lexi is an unusually well-built **vocabulary and grammar
trainer** with a genuine technical differentiator, wrapped in a strategy that
currently contradicts itself in two places and a distribution story that does not
exist yet. The engineering is not the risk. The risk is that nobody has ever used it.

---

## 1. The thing that would end the diligence conversation

**No real learner has ever used this.** The backlog says so in its own words: *every
finding came from a simulation or a DOM audit; none came from a learner.* Twelve
personas, three audit rounds, a 50-item findings list — all of it generated against
an imagined user by the same party that built the product.

And it cannot easily be fixed, because local-first with no accounts and no tracking
means **there is no telemetry and never will be**. There is no D1, no D7, no funnel,
no session-length distribution, no idea which of the 7,389 cards get flagged. The
product is being optimised against a model of a learner rather than a learner.

That is not a bug in the plan; it is the *price of the architecture*, and it has not
been priced. A competitor with 2% of this engineering quality and 500 real users
will out-iterate it, because they will be fixing things that are actually broken.

**What I would want to see before anything else:** ten real learners, four weeks,
hand-collected. The backlog already has "Run the *real* friend session · S" filed
under *Next*, below eleven other things. It is the highest-value item in the
document by an order of magnitude and it is not scheduled.

---

## 2. Two strategic contradictions, stated plainly

### The B2B pitch is incompatible with the product's core constraint

[SCHOOL-PITCH.md](SCHOOL-PITCH.md) targets Sprachschulen. What a language school
actually buys: a teacher dashboard, per-student progress, class assignment, seat
management, and an invoice. Every one of those requires **accounts and a backend** —
which the architecture refuses on principle, and which the DSGVO story (Lexi's best
B2B asset) is built on refusing.

So the two strongest B2B arguments are in direct opposition: *"your students' data
never leaves their device"* and *"here is your students' data."* Someone has to pick.
The honest B2B product is probably **content licensing plus a class-pack format**
(which already exists in `lib/classpack.ts`) rather than a managed platform — a much
smaller business, but a real one.

### "Grows with you A1–C2" is not a claim a Goethe examiner would accept

CEFR is four skills. Measured against the shipped build:

| Skill | What Lexi does | Honest verdict |
|---|---|---|
| Reading | Sentence-level examples; Lesen shows sentences you can almost read | **Partial** — no extended text, no comprehension questions |
| Listening | TTS on every string; **10 of 7,389 cards** have human audio (0.14%) | **Effectively absent** |
| Writing | Diktat and typed drills, where the target is known to the character | **Mechanical only** — no free production |
| Speaking | — | **None** |

Lexi is a vocabulary and grammar trainer, and an excellent one. The README's "atlas
of your German" framing is honest. Anything that implies exam readiness is not, and
B1 exam prep is the single biggest commercial pull in German-as-a-foreign-language.

**The listening claim deserves a specific callout**, because the CHANGELOG oversells
it. "Listening, phase 1: human voices with synthesis underneath" is written as though
the skill gap is being closed; it says listening *"makes the number the whole app is
organised around true."* The licence work behind it was careful and correct — an
allow-list, not a deny-list, because Tatoeba's audio rights are per-recording. But
the shipped result is **ten cards**. A learner will never encounter one. Either fund
the audio properly or describe it as the plumbing it currently is.

---

## 3. Acquisition and retention: the numbers are against you

**1.13 MB gzipped before the first card renders.** `vocab.json` is 5.4 MB raw /
1.13 MB gzipped and is fetched in full at boot — including every C2 card an A1
learner will not see for three years. Plus 615 KB of JS. On a Sprachschule's wifi or
a phone on 3G that is a ~20-second white screen before anything is interactive.
Backlog #49 files this as **P2**. For a product with no brand and no install base,
first-load time *is* the acquisition funnel; it is a P0.

**Time to first value is ~2 minutes.** First run routes through a placement test
before the learner does anything that feels like learning. Pedagogically it is the
right call — placement is why the queue is any good. Commercially it is the most
expensive two minutes in the product. Duolingo has a cold user answering a question
in about fifteen seconds and *then* places them adaptively. There is a version of
this where the first three cards come first and the placement is offered after.

**Nothing brings the learner back.** Streaks exist; the day-2 anchor exists. But the
reminder is a local watch that only fires **while the app is open**, and there is no
push, by design. Duolingo's entire retention engine is notification + streak + social
pressure. Lexi has the streak and neither of the other two.

This is the clearest consequence of local-first, and it is survivable — but only if
Lexi accepts it is a **tool people reach for**, not a habit product that reaches for
them. Those have very different growth curves and very different valuations. The
backlog has Web Push filed as *"still undecided"* (#34). It is the single decision
that most determines what kind of company this is.

---

## 4. Where the moat actually is — and where it isn't

**Not the corpus.** 7,389 cards is small. Anki's shared German decks run to tens of
thousands and cost nothing. The corpus pipeline is genuinely excellent — reproducible,
licence-clean, attributed — and that is a real legal asset for any B2B or content
deal. But card count is not a differentiator and growing it is the slowest, most
human-gated work in the backlog.

**Yes the scheduler, and specifically that it shows its work.** `WhyThisCard` —
*"because you just learned obwohl"*, *"you've missed Kasus 4× this month"* — is
something no competitor does, and per-mode FSRS tracks (recognising a word and
producing it scheduled separately) is genuinely better modelling than Duolingo's.
The backlog correctly identifies that this is invisible unless you are three cards
deep (#50) and correctly calls it *the cheapest thing on the list that changes how
the product is described*. It is filed under **Next**. It should be shipped this week.

**The comprehension meter is a real bet, and it is not de-risked.** The argument in
COMPETITIVE-RESEARCH is good: the 95–98% coverage threshold is the most robust
finding in reading-based SLA, every competitor approximates it badly, and FSRS state
makes Lexi the only product able to compute it honestly.

Two problems. First, **LingQ already ships this** and it is their most-criticised
feature; "ours is more accurate" is a hard sell to anyone who is not already a
methodology nerd. Second — and this is the one that matters — the meter is built on
the matcher, and this week's audit found the matcher **wrong on 21.6% of the corpus's
own example sentences**, in ways that produced *false positives* (knowing the colour
*weiß* counted you as knowing *wissen*). That is now substantially fixed, but the
episode is the point: the entire competitive claim is "our number is honest", and
the number was not honest, and nobody had checked until someone wrote a script.

**Recommendation:** before Phase 1 ships, the meter needs a published accuracy
methodology and a regression suite. "Honest" is the product; it has to be auditable.

---

## 5. Content quality at the level where churn happens

Beginners churn. Here is the flagged-definition rate by level:

| Level | Cards flagged | Share |
|---|---|---|
| A1 | 146 / 934 | **15.6%** |
| A2 | 422 / 1,724 | **24.5%** |
| B1 | 651 / 2,542 | 25.6% |
| C1 | 1 / 593 | 0.2% |

The best-authored content is at C1–C2, where almost nobody is, and the worst is at
A1–A2, where everybody starts. **One in four A2 cards** shows a definition that is a
list of translations rather than a definition. Add 286 cards with no English
definition at all and 370 with no part of speech, and the first two weeks of a new
learner's experience is the least-polished part of the product.

This inverts naturally — advanced content got authored because advanced personas were
the most credible critics — and it is exactly backwards from where the commercial
risk is.

---

## 6. What is genuinely, unusually good

Stated because a critique that only criticises is not useful:

- **The engineering discipline is top decile.** Zero hardcoded palette values, one
  type ramp, a documented design system that argues with itself, 339 tests over the
  logic that matters, and a corpus pipeline that can be re-run from source. Most
  seed-stage products in this category are a pile of hardcoded strings.
- **The reasoning is written down.** The CHANGELOG records why things were reverted,
  not just what shipped. Three separate times this month a wrong first answer was
  documented next to the right one. That is a real asset — it is why the codebase
  can be handed to someone else.
- **Zero infra cost, zero data liability.** No backend, no accounts, no PII. The
  gross margin is 100% and the DSGVO exposure is nil. For the European market that
  is a genuine, defensible position.
- **The scheduler is better than the market leader's.** That is not a small thing.

---

## 7. If I were writing the term sheet

The three things I would require before the next milestone, in order:

1. **Ten real learners for four weeks.** Hand-collected, no telemetry needed. Until
   this exists, every roadmap item is a guess. It is currently filed under *Next*,
   below eleven other things.
2. **Decide what kind of product this is** — the Web Push / retention decision (#34).
   Tool or habit. Everything downstream depends on it and it is marked "undecided".
3. **Fix the first ninety seconds.** Split the corpus by level so first paint is not
   1.13 MB, and put cards before the placement test. This is the acquisition funnel
   and it is currently filed as P2.

The thing I would *not* worry about: whether they can build it. That question is
answered.

---

*Rebuttals belong in this file, dated and signed. The point of writing the hostile
case down is that it can be argued with rather than re-derived every quarter.*
