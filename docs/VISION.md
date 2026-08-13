# Lexi — what we are building, and what we refuse

**The anchor document.** Every other doc in this folder is downstream of this one. When
two docs disagree, this one decides; when this one is wrong, change it here first and
let the others follow.

---

## The goal, in one sentence

**A beautiful, bulletproof, effective, open-source, pedagogically sound app for English
speakers learning German — built so that a second language pair is an implementation,
not a rewrite.**

Those six words are not decoration. Each one forbids something, and the forbidding is
the useful part.

---

## The six commitments

### 1. Beautiful

Not "styled". The app draws on the German design tradition it teaches — Otl Aicher and
HfG Ulm, cartography, the printed lexicon — because form matching subject is the
difference between a tool that looks competent and one that feels like its subject.
The identity is **the Atlas**; the terminal it replaced was borrowed authority from a
domain Lexi is not in. [DESIGN.md](DESIGN.md) is the system of record.

**Forbids:** a visual language that could belong to any dashboard. Motion that has a
library instead of a director. Restraint used as a synonym for absence.

**Measured by:** one type ramp, zero hardcoded palette values, one documented motion
scale — all currently enforced and testable.

### 2. Bulletproof

A local-first app holds the only copy of something a learner spent a year building.
Losing it is not a bug, it is a betrayal. So correctness is a first-class feature:
650 tests over the logic that matters, a corpus that is never hand-edited, id
migrations that carry FSRS schedules through every rename, and entrance animations
that can never gate content.

**Forbids:** a schedule that can be silently re-pointed. A number on screen that
nothing verifies. Any change to `public/data/*.json` that did not go through a script.

**Measured by:** `npm test`, `npm run typecheck`, `npm run corpus:validate` — all green
before anything merges. Every retired card id has an `ID_MAP` entry.

### 3. Effective

The app exists to make people know German, not to make people open the app. Every
retention mechanism is judged against that: the streak is allowed because it is honest,
push notifications are still undecided, and leagues are refused outright.

**Forbids:** engagement machinery that works by manufacturing anxiety. Any number that
flatters. Any claim of competence the evidence does not support — this is why
`candos.ts` shows what a level *is* and never says "you can".

**Measured by:** the honest ones. Known is ratcheted and cannot be manufactured by
narrowing a filter; readiness reports preparation and performance as two numbers and
refuses to average them.

### 4. Open-source

**The code is MIT** ([LICENSE](../LICENSE)). The corpus is built from open data with
every source, licence and obligation recorded in [ATTRIBUTIONS.md](../ATTRIBUTIONS.md).
A school can inspect it, a learner can fork it, and nobody can be rug-pulled.

> **Settled 2026-08-13.** `README.md` had claimed *"the application code itself is
> proprietary"* while `package.json` and `ATTRIBUTIONS.md` both said MIT, and no
> LICENSE file existed. MIT wins on the weight of evidence and on the goal above. The
> README line is gone and the LICENSE file now exists.

**Forbids:** a dependency that cannot be shipped under MIT. Bundling someone else's
content without checking its terms — the Tatoeba audio allow-list is the standard.

### 5. Pedagogically sound

The app teaches the way the evidence says people learn, and says out loud where it
doesn't. Spaced retrieval, interleaved formats, worked examples before tests, grounded
drills that never render wrong German, and a scheduler that shows its reasoning.

**Forbids:** a drill that marks correct German wrong. Generated content that was not
verified — facts are looked up, never written. Fake scoring of anything a machine
cannot mark.

**Measured by:** [PEDAGOGY.md](PEDAGOGY.md), which is the standing critique of how well
this is actually going. Its current headline: the app measures the *receptive* half of
what it has already built the machinery to measure.

### 6. English → German, expandable to other pairs

**Gloss language is English, and this is a scope, not an oversight** — the corpus is
English-glossed to the last card, so a learner whose English is itself a second
language pays a translation tax on every item, and they should learn that in the first
ten seconds rather than in week three. The German definition layer (`defDe`, shown from
B2) is the deliberate exception, gated on the *learner's* level rather than the card's.

**Expandable** is a claim about architecture, not a promise of dates. See below.

---

## The multilingual arc

*Rescued from the retired ROADMAP, which is where this was quietly kept.*

"Eventually French and Spanish" is today **a hope, not an architecture.** The
German-specific logic is real and load-bearing: the function-word list, umlaut folding,
the conjugation engine, adjective de-inflection, plural derivation, and the
proper-noun heuristic — which only works *because* German capitalises every noun, and
which would need inverting for French or Spanish, where capitalisation marks proper
nouns and therefore actually helps.

**The refactor that makes the claim true** is a small per-language interface —
`tokenize`, `isFunctionWord`, `lemmatize`, `classifyEntity`, plus per-pair
enrichment — behind which the scheduler, the session builder, the reader and the
review surfaces stay language-agnostic. Most of the app is *already* agnostic; the
German knowledge is concentrated in `lib/matcher.ts`, `lib/conjugate.ts` and the
corpus pipeline, which is the good case.

**The rule: do not do this speculatively.** Build it when a second pair is actually
being built, because an interface designed against one implementation is a guess. What
*is* worth doing now is refusing to add new German assumptions outside those files —
that keeps the cost from growing while the decision waits.

**Worth knowing:** the comprehension meter is the most portable feature Lexi could own.
Text is language-agnostic; only the matcher is German.

---

## What Lexi refuses

Consolidated from the competitive pass, the design system and the pedagogic critique,
so the refusals live in one place and can be argued with as a set. Each has been
argued and declined on the record — reopening one means writing down what changed.

| Refusal | Why |
|---|---|
| **AI conversation tutor** | Commoditizing category, needs a backend and keys, breaks the privacy-by-architecture story, six better-funded competitors already there. `lib/ai.ts` survives for **build-time corpus enrichment only**. |
| **Competing on content volume** | Duolingo shipped 20,500 units in a quarter. You lose. Do not enter. |
| **Leagues, streak-shaming, social pressure** | Four of six teachers and three of six learners in [PEDAGOGY.md](PEDAGOGY.md) named the absence as the reason they would recommend it. |
| **Machine-marked writing and speaking** | A drill that marks correct German wrong is worse than no drill. Show the examiners' criteria instead. |
| **Speech-recognition pronunciation scoring** | Consumer ASR marks accented-but-correct German wrong, punishing exactly the learner who most needs encouragement. Minimal-pair *listening* is the honest version. |
| **A teacher dashboard** | Needs accounts, which every teacher persona named as the thing they would lose. Print, learner-initiated export and class packs get most of the value at none of the price. |
| **Saying "you can now …" from a word count** | It would be the most dishonest sentence in the app. |

---

## Settled decisions

Recorded so they are not re-litigated by drift. Date is when the call was made.

- **English-base** *(2026-07-27)* — stated in the README and the first-run hero.
- **The Atlas identity** *(2026-07-28)* — the terminal is retired; the fintech reading
  goes with it.
- **The comprehension meter is additive** *(2026-07-27)* — Known and the market keep
  the headline. The full reframe was argued and declined; revisit only if the meter
  proves it carries more motivation than the market does.
- **Consumer before schools** *(2026-07-27)* — the meter makes the school pitch
  materially better, and school work does nothing for the consumer product until it is
  finished. [SCHOOL-PITCH.md](SCHOOL-PITCH.md) stays live, sequenced behind it.
- **Authoring is machine-gated, not human-gated** *(2026-08-11)* — `authoring:new`
  refuses to write a card it cannot verify against de.wiktionary, and every example
  must contain a real inflection proved by the app's own matcher.
- **Code is MIT** *(2026-08-13)* — see commitment 4.

---

## Open decisions — the honest list

These are genuinely undecided. Nothing downstream should assume an answer.

### 1. Accounts and a backend — **and the docs currently contradict each other**

[BACKEND.md](BACKEND.md) opens by saying *"the call was made: build toward accounts and
a backend."* [CLAUDE.md](../CLAUDE.md) — the project's own instructions — says
*"Local-first, no backend."* Every teacher and several learners in
[PEDAGOGY.md](PEDAGOGY.md) named the absence of accounts as the single thing they would
lose, and [CRITIQUE.md](CRITIQUE.md) names the same architecture as the reason there
will never be telemetry.

**This is the decision that most determines what kind of product this is**, and it is
currently answered two different ways in two authoritative files. BACKEND.md is
excellent design work and is explicitly unbuilt; it is kept for that reason and marked
as proposal, not policy. **Until this is settled, local-first is the shipping
behaviour and no doc should promise otherwise.**

### 2. Bundled reading content

The comprehension meter's Phase 2 wants a feed, and the obvious fit — DW's *Langsam
gesprochene Nachrichten* — is not automatically redistributable. Decide whether Lexi
ever ships someone else's text or stays strictly learner-supplied.

### 3. Billing / the supporter tier

The freemium split in the retired ROADMAP assumed an AI tutor and a mining flow that no
longer exist. Any future tier needs re-deriving from what the app actually is. No infra
exists; the Support link goes to GitHub.

---

## How the docs serve this

Four kinds of document, and nothing else:

| Kind | Files | Rule |
|---|---|---|
| **Anchor** | this file | What we are building. Changes rarely, deliberately. |
| **Live state** | [BACKLOG](BACKLOG.md) · [CHANGELOG](CHANGELOG.md) | Open work; shipped work with its reasoning. |
| **Systems** | [DESIGN](DESIGN.md) · [ATTRIBUTIONS](../ATTRIBUTIONS.md) · [BRAIN](BRAIN.md) · [BACKEND](BACKEND.md) | How one part works, or is proposed to. Living — argue with them. |
| **Standing critiques** | [PEDAGOGY](PEDAGOGY.md) · [PERSONAS](PERSONAS.md) · [CRITIQUE](CRITIQUE.md) · [COMPETITIVE-RESEARCH](COMPETITIVE-RESEARCH.md) · [SCHOOL-PITCH](SCHOOL-PITCH.md) | One lens each, written to be argued with in the file, dated. |

A document that is none of these is a document that has finished its job. The July and
August 2026 tidies deleted several; git history holds them, which is what history is
for.

---

*Written 2026-08-13, consolidating the anchor material that was spread across
ROADMAP.md (retired), COMPETITIVE-RESEARCH §5–6, BACKLOG's "decisions required", and
the README. Argue with it here, dated, rather than in a commit message.*
