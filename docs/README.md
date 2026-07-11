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
| [DESIGN-REVIEW.md](DESIGN-REVIEW.md) | Design/product critique + the B2B "Sprachschule" pitch and ROI arithmetic. Most usability findings shipped; the school-kit section is still forward-looking. | Design decisions, or a school/B2B pitch. |
| [COMPETITIVE-RESEARCH.md](COMPETITIVE-RESEARCH.md) | Survey of Anki, LingQ, Clozemaster, Lingvist, Seedlang, etc., with borrowable ideas. | Sizing a feature against the market. |

## Archived (`archive/`)

Delivered or superseded. Kept for provenance; **not current** — each carries a
banner explaining what replaced it.

| Doc | Status |
|---|---|
| [archive/PRODUCT-FOCUS.md](archive/PRODUCT-FOCUS.md) | July 2026 prune. Decisions shipped; open items moved to the backlog. |
| [archive/IMPLEMENTATION-PLAN.md](archive/IMPLEMENTATION-PLAN.md) | Phased build order for the design review. Phases 1–5 delivered. |
| [archive/LEXICON-EXPANSION-TASK.md](archive/LEXICON-EXPANSION-TASK.md) | Corpus-pipeline brief. Delivered; the pipeline lives in [`../scripts/corpus/`](../scripts/corpus/README.md). |

## One reconciliation worth knowing

`ROADMAP.md` and `archive/PRODUCT-FOCUS.md` **disagree**, and the backlog follows
PRODUCT-FOCUS (it's newer): the roadmap's two flagship paid features — the **AI
tutor** and the sentence-mining **Reader/Mine** — were **cut from the core loop**
during the July prune. They may return as opt-in surfaces, but they are not
committed work. The root README still lists a "Mine" surface that no longer ships
in `src/views/` — flagged in the backlog.
