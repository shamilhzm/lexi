# Lexi docs

Planning, strategy and reference. Code and product truth live in `src/` and the
root [`README.md`](../README.md); this folder is the *why* and the *next*.

## Start here

- **[BACKLOG.md](BACKLOG.md)** — the single prioritised list of **open** work. If
  you want to know what to do next, it is here and nothing else is.
- **[CHANGELOG.md](CHANGELOG.md)** — what shipped and *why*. Check it before
  building something that sounds obvious: several entries exist because the obvious
  thing was tried and reverted.

## Living docs

| Doc | What it is | Use it when |
|---|---|---|
| [BACKLOG.md](BACKLOG.md) | Open work only, prioritised, with effort and acceptance criteria. | Picking up work. |
| [CHANGELOG.md](CHANGELOG.md) | Shipped work, newest first, with the reasoning kept. | Asking "why is it like this?" |
| [DESIGN.md](DESIGN.md) | The design system as it actually is: tokens, the elevation ramp, radius/hue/motion rules, the two-rooms principle, and the gotchas that cost time. Living — argue with it. | Touching anything visual. |
| [UX-PATHS.md](UX-PATHS.md) | Happy / sad / frustrated walkthroughs traced against the code, with each finding's status. | Changing the session or onboarding flow. |
| [SIMULATED-SESSION.md](SIMULATED-SESSION.md) · [SIMULATED-SESSIONS-2.md](SIMULATED-SESSIONS-2.md) | Persona sessions that drove most of the last two releases. Stand-ins until a real learner sits down with it. | Looking for the next real problem. |
| [SCHOOL-PITCH.md](SCHOOL-PITCH.md) | The B2B "Sprachschule" strategy: ROI arithmetic, gap list, a signable guarantee. Forward-looking; most of the gap list isn't built. | A school / B2B conversation. |
| [COMPETITIVE-RESEARCH.md](COMPETITIVE-RESEARCH.md) | Survey of Anki, LingQ, Clozemaster, Lingvist, Seedlang and others, with borrowable ideas. | Sizing a feature against the market. |
| [ROADMAP.md](ROADMAP.md) | Product vision & freemium strategy. **Pre-prune — see the reconciliation below.** | Thinking about direction or monetisation. |

## Pipeline docs

The corpus and authoring tooling documents itself where it lives:
[`../scripts/corpus/README.md`](../scripts/corpus/README.md) for the ingestion and
audit commands, [`../scripts/authoring/card-authoring.md`](../scripts/authoring/card-authoring.md)
for the card-authoring contract.

## Archive (`archive/`)

Delivered or superseded, kept for provenance. **Not current.**

| Item | Status |
|---|---|
| [archive/DESIGN-REVIEW-2026-07.md](archive/DESIGN-REVIEW-2026-07.md) | The original design critique. Split into `DESIGN.md` + `SCHOOL-PITCH.md`. Most findings shipped; its paper-card recommendation was wrong, and the banner says why. |
| [archive/PRODUCT-FOCUS.md](archive/PRODUCT-FOCUS.md) | July 2026 prune. Decisions shipped; open items moved to the backlog. |
| [archive/IMPLEMENTATION-PLAN.md](archive/IMPLEMENTATION-PLAN.md) | Phased build order for the design review. Phases 1–5 delivered. |
| [archive/LEXICON-EXPANSION-TASK.md](archive/LEXICON-EXPANSION-TASK.md) | Corpus-pipeline brief. Delivered; the pipeline lives in [`../scripts/corpus/`](../scripts/corpus/README.md). |
| [archive/COHESION-PLAN.md](archive/COHESION-PLAN.md) | The DaF-scan extraction rules. Still referenced by the corpus-growth item in the backlog. |
| [archive/next-2-weeks-plan.md](archive/next-2-weeks-plan.md) | A planning snapshot from the Orbita era. |
| [archive/briefs/](archive/briefs/) | Orbita-era product, style and content briefs — Lexi's predecessor. |
| [archive/print-and-play/](archive/print-and-play/) | Lexi Duel: printable card and rules PDFs plus their generators. The Duel was cut from the core loop; the artefacts are complete and kept. |

The legacy Orbita and Atlas applications used to sit in a root-level
`to_be_deleted_or_archived/` folder. They were removed in the July 2026 tidy —
2.6 MB of superseded code that git history still holds if it is ever wanted.

## One reconciliation worth knowing

`ROADMAP.md` and `archive/PRODUCT-FOCUS.md` **disagree**, and the backlog follows
PRODUCT-FOCUS because it is newer: the roadmap's two flagship paid features — the
**AI tutor** and the sentence-mining **Reader/Mine** — were cut from the core loop
in the July prune. A reading surface did return, but as **Lesen**, free and built
on the existing corpus rather than as a paid mining flow.
