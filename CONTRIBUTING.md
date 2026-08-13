# Contributing to Lexi

Lexi is MIT-licensed and built in the open. This file is the door: what the project is
trying to be, what it deliberately won't build, and the four rules that keep a
local-first learning app from quietly corrupting somebody's year of work.

Read [`docs/VISION.md`](docs/VISION.md) first. It is short, and it will save you
building something that gets declined for reasons that were settled months ago.

## Getting set up

```bash
npm install && npm run dev
```

The app opens at `http://localhost:5173/lexi/`. There is no backend, no API key, no
account and no seed step — the corpus is static JSON in `public/data/` and the app
fetches it at boot.

## The four rules

**1. The corpus is never hand-edited.** Not once, not for a typo. Every change to
`public/data/*.json` goes through a script in `scripts/corpus/` or the expect-guarded
`scripts/authoring/fix-authored.ts`, so every edit is reviewable and repeatable. Run
`npm run corpus:validate` afterwards. A pull request that edits corpus JSON directly
will be asked to redo it through the pipeline.

**2. New cards are machine-gated.** `npm run authoring:new -- <batch.json>` refuses to
write a card it cannot verify: gender, plural, part of speech and IPA are looked up in
de.wiktionary and a disagreement is a hard reject, and every example must contain a real
inflection of its headword — proved with the app's own matcher, not a substring test.
Facts are never generated; only the gloss and the example sentence are written, and both
are checked.

**3. A card id is a promise.** Learner FSRS schedules are keyed on card ids, and those
schedules are the only copy of something a person spent months building. If your change
renames, relevels or merges a card, it must ship `src/data/idmap.ts` entries that carry
the schedule across. `store-idmap.test.ts` guards this. There is no telemetry and no
server backup — if a schedule breaks, it breaks silently and forever.

**4. Never render wrong German.** Drills are constructed from verified corpus facts and
gated so they cannot produce a wrong fragment — `caseSafe` excludes n-Deklination
masculines, genitive frames are restricted to feminines, `canTransform` excludes verbs
whose bare finite form would be nonsense. If your feature can emit German, it needs a
gate and a test that pins it.

## Before you open a pull request

```bash
npm test && npm run typecheck && npm run lint
```

If you touched the corpus or anything under `scripts/`:

```bash
npm run corpus:validate && npm run corpus:selftest
```

All of it should be green. `corpus:selftest` runs offline against fixtures, so it works
without network access.

## What makes a good change here

- **Say why in the code.** This codebase explains its reasoning in comments and in
  [`docs/CHANGELOG.md`](docs/CHANGELOG.md), including the things that were tried and
  reverted. That habit is why the project can be handed to someone else. Match it.
- **Measure, don't estimate.** Several numbers in the docs were wrong for months because
  someone guessed. If you cite a count, get it from a script.
- **Treat a check that fires on thousands of rows as a bug in the check.** This has been
  learned the expensive way more than once.
- **Small and reviewable beats complete.** Corpus work especially: batches, with a
  recorded reason per group.

## What won't be accepted

Not because the ideas are bad — because they were argued and declined on the record.
[`docs/VISION.md`](docs/VISION.md) has the reasoning for each:

- An AI conversation tutor, or anything requiring a backend or API keys at runtime
- Machine-marked writing or speaking, or ASR pronunciation scoring
- Leagues, streak-shaming, or social pressure mechanics
- Any claim of competence the evidence doesn't support
- Bundled third-party content whose licence hasn't been checked

If you think one of these should be reopened, the way to do it is a dated argument in
the relevant doc — not a pull request.

## Reporting a problem with a card

The app has a flag button on every card, and flagged cards export with your backup. If
you're filing an issue instead, include the card id (e.g. `voc:A1:die Sprache`) — it is
shown in the card's provenance line.

## Licence

By contributing you agree that your code contributions are licensed under the MIT
licence in [`LICENSE`](LICENSE). Corpus contributions must be compatible with the terms
recorded in [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md), and any new source must be added there
with its licence and citation before the data it produces can ship.
