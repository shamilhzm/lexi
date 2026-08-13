# Lexi docs

Planning, strategy and reference. Code and product truth live in `src/` and the root
[`README.md`](../README.md); this folder is the *why* and the *next*.

## Start here

- **[VISION.md](VISION.md)** — **the anchor.** What we are building, the six
  commitments and what each one forbids, the refusals, the settled decisions, and the
  three things that are genuinely still open. When two docs disagree, this one decides.
- **[BACKLOG.md](BACKLOG.md)** — the single prioritised list of **open** work. If you
  want to know what to do next, it is here and nothing else is.
- **[CHANGELOG.md](CHANGELOG.md)** — what shipped and *why*. Check it before building
  something that sounds obvious: several entries exist because the obvious thing was
  tried and reverted.

## The four kinds of document

Nothing here is a fifth kind. A document that is none of these has finished its job and
should be deleted — git history is what history is for.

### Anchor

| Doc | What it is | Use it when |
|---|---|---|
| [VISION.md](VISION.md) | What Lexi is for, what it refuses, what is undecided. Changes rarely and deliberately. | Starting anything. Deciding whether a feature belongs at all. |

### Live state

| Doc | What it is | Use it when |
|---|---|---|
| [BACKLOG.md](BACKLOG.md) | Open work only, prioritised, with effort and acceptance criteria. | Picking up work. |
| [CHANGELOG.md](CHANGELOG.md) | Shipped work, newest first, with the reasoning kept. | Asking "why is it like this?" |
| [LESSONS.md](LESSONS.md) | **Append-only.** Mistakes caught and the rule each produced, grouped into eight recurring classes, with a pre-work checklist at the top. | **Before starting work** — and the moment you catch a mistake, before fixing it. |

### Systems — how one part works, or is proposed to

| Doc | What it is | Use it when |
|---|---|---|
| [DESIGN.md](DESIGN.md) | The design system as it actually is: tokens, the elevation ramp, radius/hue/motion rules, the two-rooms principle, and the gotchas that cost time. Living — argue with it. | Touching anything visual. |
| [BRAIN.md](BRAIN.md) | What the brain map at `#/brain` claims and what it does not: the sector→region atlas, its confidence tiers, and the sources. | Touching `lib/brain/*`, or asked whether the map is real. |
| [BACKEND.md](BACKEND.md) | **Proposal, not policy.** The accounts + sync design: what would sync, what deliberately would not, how two offline devices merge. No code written, and it contradicts the current shipping behaviour — see VISION § open decisions. | Before touching auth, sync or push. |
| [../ATTRIBUTIONS.md](../ATTRIBUTIONS.md) | Every corpus source, its licence, what is redistributed and what is only cached. | Adding a data source. Forking. |

### Standing critiques — one lens each, written to be argued with

| Doc | Lens | Use it when |
|---|---|---|
| [PEDAGOGY.md](PEDAGOGY.md) | **Does it teach?** Six learners and six teachers across A1–C2 and across the contexts German is actually taught in. Carries the wishlist and the eight items struck from it. | Deciding what to build for *learning*; before touching the session, the corpus shape, or what "known" means. |
| [PERSONAS.md](PERSONAS.md) | **Does it look and move like a thing worth using?** Twelve personas run against the running app, two per CEFR level, desktop + mobile. The only *design* persona doc. | Judging the design; before touching the aesthetic. |
| [CRITIQUE.md](CRITIQUE.md) | **Is this a business?** The hostile read, written as an investor who has shipped consumer language apps. Names the fact that no real learner has used the product. | Deciding what to build next, or why. |
| [COMPETITIVE-RESEARCH.md](COMPETITIVE-RESEARCH.md) | **Who else is in this market?** The four camps, what Lexi genuinely beats them at, the honest weakness list, and the case for the comprehension meter. | Sizing a feature against the market. |
| [SCHOOL-PITCH.md](SCHOOL-PITCH.md) | **Would a Sprachschule buy it?** ROI arithmetic, the gap list, a signable guarantee. Forward-looking; most of the gap list isn't built. | A school / B2B conversation. |

## Pipeline docs

The corpus and authoring tooling documents itself where it lives:
[`../scripts/corpus/README.md`](../scripts/corpus/README.md) for the ingestion and audit
commands, [`../scripts/authoring/card-authoring.md`](../scripts/authoring/card-authoring.md)
for the card-authoring contract.

## What was deleted, and when

Recoverable from git history only. Each was deleted because it had finished its job, not
because it was wrong.

**2026-08-13 docs pass** — `ROADMAP.md` (its ten Pro features assumed an AI tutor and a
mining flow that were cut or re-scoped; the multilingual section survives in VISION, the
tokenizer note in BACKLOG); `UX-PATHS.md` (ten of twelve findings shipped — the table is
preserved in the CHANGELOG because source comments cite its ids); and all of `archive/` —
`DESIGN-REVIEW-2026-07.md`, `PRODUCT-FOCUS.md`, `IMPLEMENTATION-PLAN.md`,
`LEXICON-EXPANSION-TASK.md` and the three Orbita-era briefs, every one already
banner-marked superseded.

**July 2026 tidy** — `archive/COHESION-PLAN.md` (the DaF-scan extraction rules, which
the backlog's corpus-growth item now carries in prose), `archive/next-2-weeks-plan.md`,
`archive/print-and-play/` (Lexi Duel, cut from the core loop), and the root-level
`to_be_deleted_or_archived/` folder — 2.6 MB of superseded Orbita and Atlas code. The
consolidation merge on 2026-08-04 re-proposed three of these and they were declined
again, deliberately.
