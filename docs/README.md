# Lexi docs

Planning, strategy, and reference material. Code and product truth live in `src/`
and the root [`README.md`](../README.md); this folder is the *why* and the *next*.

## Start here

- **[BACKLOG.md](BACKLOG.md)** — the single, prioritized list of open work. If you
  want to know "what do we do next," it's here. Everything else is context.

## Living docs

| Doc | What it is | Use it when |
|---|---|---|
| [BACKLOG.md](BACKLOG.md) | Prioritized, actionable tasks with acceptance criteria + effort. The source of truth for open work. | Picking up work. |
| [ROADMAP.md](ROADMAP.md) | Product vision & freemium strategy (the 10 Pro features). **Pre-prune** — see banner. | Thinking about direction / monetization. |
| [DESIGN.md](DESIGN.md) | The design system as it actually is: tokens, the elevation ramp, radius/hue/motion rules, the two-rooms principle, and the gotchas that cost us time. Living — argue with it. | Touching anything visual. |
| [PERSONAS.md](PERSONAS.md) | **The single persona doc.** Round 3 (12 personas, 2 per CEFR level, desktop + mobile) is the first round run against the *running app* rather than the code, and carries the verdict on the terminal identity. Rounds 1–2 folded in with status. | Judging the design; before touching the aesthetic. |
| [SCHOOL-PITCH.md](SCHOOL-PITCH.md) | The B2B "Sprachschule" strategy: ROI arithmetic, the gap list, and a signable guarantee. Forward-looking; most of the gap list isn't built. | A school / B2B conversation. |
| [COMPETITIVE-RESEARCH.md](COMPETITIVE-RESEARCH.md) | The four camps (curriculum / immersion / AI tutors / SRS tools), what Lexi genuinely beats them at, the honest weakness list, and the argued case for the **comprehension meter** as the flagship. Carries an open decision. | Sizing a feature against the market; deciding direction. |

## Archived (`archive/`)

Delivered or superseded. Kept for provenance; **not current** — each carries a
banner explaining what replaced it.

| Doc | Status |
|---|---|
| [archive/DESIGN-REVIEW-2026-07.md](archive/DESIGN-REVIEW-2026-07.md) | The original design critique. Split into `DESIGN.md` + `SCHOOL-PITCH.md`. Most findings shipped; its paper-card recommendation was wrong and the banner explains why. |
| [archive/PRODUCT-FOCUS.md](archive/PRODUCT-FOCUS.md) | July 2026 prune. Decisions shipped; open items moved to the backlog. |
| [archive/IMPLEMENTATION-PLAN.md](archive/IMPLEMENTATION-PLAN.md) | Phased build order for the design review. Phases 1–5 delivered. |
| [archive/LEXICON-EXPANSION-TASK.md](archive/LEXICON-EXPANSION-TASK.md) | Corpus-pipeline brief. Delivered; the pipeline lives in [`../scripts/corpus/`](../scripts/corpus/README.md). |

## One reconciliation worth knowing

`ROADMAP.md` and `archive/PRODUCT-FOCUS.md` **disagree**, and the backlog follows
PRODUCT-FOCUS (it's newer): the roadmap's two flagship paid features — the **AI
tutor** and the sentence-mining **Reader/Mine** — were **cut from the core loop**
during the July prune.

**Updated 2026-07-27 by the competitive pass.** The two have now diverged:

- The **AI tutor stays cut**, and for a stated reason (commoditizing category;
  needs a backend; breaks the DSGVO-by-architecture story).
- The **reader is back as BACKLOG Now #0**, re-scoped into the *comprehension
  meter* — not a mining tool but a measurement instrument: what percentage of a
  given text you know, and the words that get you over the 95/98 threshold.

Three decisions were settled in that pass and are recorded in
[COMPETITIVE-RESEARCH.md](COMPETITIVE-RESEARCH.md) §5–6: the meter is **additive**
(Known and the market keep the headline), B2B is sequenced **after** consumer, and
Lexi is **English-base**, now said out loud in the root README and the first-run
hero.
