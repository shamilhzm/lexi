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
| [BACKLOG.md](BACKLOG.md) | Open work only, prioritised, with effort and acceptance criteria. The source of truth for what's next. | Picking up work. |
| [CHANGELOG.md](CHANGELOG.md) | Shipped work, newest first, with the reasoning kept. | Asking "why is it like this?" |
| [BRAIN.md](BRAIN.md) | What the brain map at `#/brain` claims and what it does not: the sector→region atlas, its confidence tiers, the joins worth arguing about, and the sources. | Touching `lib/brain/*`, or asked whether the map is real. |
| [DESIGN.md](DESIGN.md) | The design system as it actually is: tokens, the elevation ramp, radius/hue/motion rules, the two-rooms principle, and the gotchas that cost time. Living — argue with it. | Touching anything visual. |
| [BACKEND.md](BACKEND.md) | **The accounts + sync design.** Written before any code: what syncs, what deliberately does not, how two offline devices merge, and the user-facing promise that has to change first. Design only. | Before touching auth, sync or push. |
| [CRITIQUE.md](CRITIQUE.md) | **The hostile read** — the case against Lexi, written as an investor who has shipped consumer language apps and sat on a Goethe procurement panel. Names two strategic contradictions and the fact that no real learner has used the product. Argue with it in the file. | Deciding what to build next, or why. |
| [PERSONAS.md](PERSONAS.md) | **The single persona doc.** Round 3 (12 personas, 2 per CEFR level, desktop + mobile) is the first round run against the *running app* rather than the code, and carries the verdict on the terminal identity. Rounds 1–2 folded in with status. Supersedes the two `SIMULATED-SESSION*` files. | Judging the design; before touching the aesthetic. |
| [UX-PATHS.md](UX-PATHS.md) | Happy / sad / frustrated walkthroughs traced against the code, with each finding's status. | Changing the session or onboarding flow. |
| [SCHOOL-PITCH.md](SCHOOL-PITCH.md) | The B2B "Sprachschule" strategy: ROI arithmetic, the gap list, and a signable guarantee. Forward-looking; most of the gap list isn't built. | A school / B2B conversation. |
| [COMPETITIVE-RESEARCH.md](COMPETITIVE-RESEARCH.md) | The four camps (curriculum / immersion / AI tutors / SRS tools), what Lexi genuinely beats them at, the honest weakness list, and the argued case for the **comprehension meter** as the flagship. Carries an open decision. | Sizing a feature against the market; deciding direction. |
| [ROADMAP.md](ROADMAP.md) | Product vision & freemium strategy (the 10 Pro features). **Pre-prune — see the reconciliation below.** | Thinking about direction or monetisation. |

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
| [archive/briefs/](archive/briefs/) | Orbita-era product, style and content briefs — Lexi's predecessor. |

**Deleted in the July 2026 tidy, recoverable from git history only:**
`archive/COHESION-PLAN.md` (the DaF-scan extraction rules — note that the backlog's
corpus-growth item still describes them in prose, so nothing was lost that the
backlog does not now carry itself), `archive/next-2-weeks-plan.md` (an Orbita-era
planning snapshot), and `archive/print-and-play/` (the Lexi Duel printable PDFs and
their generators — the Duel was cut from the core loop). The consolidation merge on
2026-08-04 re-proposed all three and they were declined again, deliberately.

The legacy Orbita and Atlas applications used to sit in a root-level
`to_be_deleted_or_archived/` folder. They were removed in the July 2026 tidy —
2.6 MB of superseded code that git history still holds if it is ever wanted.

## One reconciliation worth knowing

`ROADMAP.md` and `archive/PRODUCT-FOCUS.md` **disagree**, and the backlog follows
PRODUCT-FOCUS because it is newer: the roadmap's two flagship paid features — the
**AI tutor** and the sentence-mining **Reader/Mine** — were **cut from the core
loop** during the July prune.

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

**Reconciled again 2026-08-04 by the consolidation merge.** A reading surface had
*already* returned on the stranded branch, as **Lesen** — free, built on the existing
corpus (`lib/reader.ts`, `components/ReadingList.tsx`, surfaced on Today) rather than
as a paid mining flow. It is a genuine down-payment on Now #0: it does the retrieval
half (find sentences you can almost read) but not the measurement half (report
coverage against the 95/98 bands). The two are now one item in the backlog.
