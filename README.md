# Lexi

**An atlas of your German (A1–C2).** A free, open-source, local-first app for **English
speakers learning German** — spaced repetition over a deep lexicon, grammar drills woven
in for the words you are actually seeing, and a scheduler that tells you *why* each card
is in front of you.

No account, no sign-in, no tracking, and nothing to cancel. It runs entirely on your
device and works offline.

> **Scope, stated so the promise never runs ahead of the corpus:** every gloss,
> definition, rule and exercise prompt is in English. That is a deliberate choice — see
> [`docs/VISION.md`](docs/VISION.md). Other language pairs are an architectural goal,
> not a shipped feature.

## Docs

[`docs/VISION.md`](docs/VISION.md) is the anchor — what this is, what it refuses, and
what is still undecided. [`docs/BACKLOG.md`](docs/BACKLOG.md) is what's next;
[`docs/CHANGELOG.md`](docs/CHANGELOG.md) is what shipped and why. Full index at
[`docs/README.md`](docs/README.md).

## What's inside

Measured against the shipped corpus on 2026-08-15, not estimated.

- **6,622 cards** — 6,514 vocabulary and 108 grammar points, across all six CEFR levels.
  Vocabulary by level: **A1 1,161 · A2 1,386 · B1 2,281 · B2 917 · C1 574 · C2 185**.
- **136 grammar points · 6,130 exercises** (A1 1,654 · A2 1,748 · B1 1,725 · B2 625 ·
  C1 204 · C2 174), each point carrying a plain-English summary and rule, and each
  exercise an explanation shown when you get it wrong.
- **Every card carries at least two usage examples**, German and English, graded at or
  just below the card's level.
- Cards carry IPA, gloss, gender + plural, synonyms/antonyms and example sentences
  where available.
- **274 fine sectors** rolled up into **15 theme groups**, which the market view
  coarsens further so the treemap reads on a phone.
- **Six full exam papers**, one per level — telc B1 and Goethe A1, A2, B2, C1, C2 — in
  their own formats and weightings.
- **FSRS** scheduling via `ts-fsrs`. Every drill mode is its own track, so recognising
  a word and producing a form are scheduled separately.
- **Local-first**: progress lives in IndexedDB with export/import for backup and moving
  between machines.

## Surfaces

Two rooms: the **instrument** — a top bar, plus a bottom bar below `md`, over five
destinations — and the **session**, which renders with its own chrome because one
aesthetic cannot serve both scanning a heatmap and studying a single word.

Each destination answers one question, and nothing is hidden behind a disclosure
triangle on the way to it.

- **Today** — *what do I do now?* One **Start session** button, the day's shape, and the
  things that only appear when they apply: a comeback greeting after a gap, an honest
  backlog burn-down, the level path, and a goal line. First run leads with a ten-card
  session, then offers the placement test.
- **Words** — *what words are there?* A search over all 6,622 cards (German or English,
  umlauts optional), the nine theme groups with your coverage on each, **Decks**, and the
  **Wortkarte** — a semantic map of a sector with synonym links and node colour by
  learning status.
- **Practice** — *drill me on something specific.* A **journey** through the grammar:
  six chapters (A1–C2), one node per concept, in the order the bank teaches them — each
  showing whether you've finished it, and which one to resume. Every chapter keeps a
  *read the rules* list, so reading what a concept **is** never requires starting a
  drill. Alongside it: the **Fundamentals**
  drills (ten modes, each on its own spaced-repetition track — gender, plurals,
  conjugation, cloze, sentence builder, tense transformation, Kasus, separable verbs,
  reflexive verbs, Diktat); **Redemittel**; printable worksheets; **Exam** — a full paper
  per level, with the oral rehearsed against model answers at three strengths and the
  written parts self-assessed against the examiners' own published criteria, refusing to
  machine-mark what a machine cannot mark; and **Tipprennen**, a typing race over your
  own cards, strict about the two things German actually punishes: capitalisation and
  umlauts.
- **Read** — *give me real German.* Sentences built from words you already have, and the
  comprehension meter: paste any German text and it says how much of it you can read,
  with the count beside the percentage and the words that would get you over the line.
- **Progress** — *how is it going?* The knowledge heatmap (treemap by theme group,
  area = cards, colour = how much you know); review and recall history, the 7-day due
  forecast, the known-growth curve; blind spots that expand inline into one-tap drills;
  finished sectors; and the observatory. A CEFR **level filter** rescopes the whole app.
- **Profile** — name, level, streak, goal, topics, flagged cards, and **Settings**:
  theme, text size, review intensity (FSRS desired retention), daily pace, the HD German
  voice, class packs, and backup / restore.

**The session** — flip cards and ten drill types on one queue. Interval previews on the
grade buttons, German text-to-speech on every string, a hint ladder on typed answers,
near-miss tolerance for a slipped finger, and a line under each item saying *why it is
here* ("because you just learned obwohl", "you've missed Kasus 4× this month"). Silence
when there is nothing non-obvious to say.

## Stack

Vite 6 · React 19 · TypeScript · Tailwind CSS v4 · `motion` · `lucide-react` · `ts-fsrs`.

## Run

```bash
npm install
```

```bash
npm run dev
```

Then open `http://localhost:5173/lexi/` — the base path is `/lexi/` locally and `/` on
Vercel.

```bash
npm run build      # production bundle to dist/
npm run typecheck  # tsc --noEmit
npm test           # vitest — 650 tests over the pure logic and the shipped corpus
npm run lint       # eslint, including jsx-a11y
```

Before pushing anything that touches the corpus:

```bash
npm run corpus:validate && npm run corpus:selftest
```

## Repository layout

```
src/            the app — views/, components/ (+ ui/ primitives), lib/, data/
public/data/    the shipped corpus: vocab.json, grammar.json, sectors.json, provenance.json
scripts/corpus/     build-time ingestion, audits and one-shot corpus fixes (npm run corpus:*)
scripts/authoring/  the verified card-authoring loop: batch in, machine-gated, audit trail
docs/           VISION (the anchor) · BACKLOG (open) · CHANGELOG (shipped, with reasoning)
design/         logo sources
```

Nothing under `scripts/` ships to the browser: it runs on a maintainer's machine and
writes `public/data/*.json`, which the app fetches at runtime. **Corpus JSON is never
hand-edited** — every change goes through a script so it is reviewable and repeatable.

## Data

`public/data/` is served as static files and fetched at runtime (see
`src/data/index.ts → initData`) so the corpus isn't parsed inside the JS bundle — the
app shell paints immediately and the service worker caches the data for offline reloads.
To extend coverage, use the reproducible pipeline in
[`scripts/corpus/`](scripts/corpus/README.md): `npm run corpus:coverage` to see the gap,
`corpus:build` to grow it from open sources.

## Install as an app (PWA)

Lexi ships a web app manifest and a service worker, so it installs on phone and desktop,
runs full-screen and works offline after the first load. `navigator.storage.persist()`
runs at boot — without it Safari evicts IndexedDB after about a week of not opening the
app, which for a local-first tool is total data loss.

## Licence

**The code is MIT** — see [`LICENSE`](LICENSE).

**The corpus** (`public/data/*.json`) is built from Wiktionary/Wiktextract, Tatoeba and
the Leipzig Corpora Collection, and carries **CC BY-SA 4.0** with attribution. Every
source, its licence, and exactly what is redistributed is recorded in
[`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) — if you fork this, that file travels with it.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). The short version: the corpus is never
hand-edited, tests and `corpus:validate` gate every merge, and
[`docs/VISION.md`](docs/VISION.md) lists what the project deliberately refuses to build.

## Notes

Coverage colour uses FSRS state: a card counts as *learned* once it leaves `New` and
*consolidated* once it reaches `Review`. New-card introductions are capped per day, at a
pace you can change. Respects `prefers-reduced-motion`, honours iOS Dynamic Type, and
pairs every colour signal with a shape or a label so nothing rides on hue alone.
