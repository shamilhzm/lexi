# Lexi

**An atlas of your German (A1–C2).** Lexi opens on **Today** and one button starts a
session: a queue assembled from what FSRS says is due, plus fresh cards from the
sectors you are thinnest in, with grammar drills woven in for the words you are
actually seeing. **Progress** holds the live *knowledge heatmap* — a squarified
treemap where every tile is a theme group, **area = cards in the group, colour = how
much of it you know**, classified over the range your own data actually occupies.
Click a tile to drill into its sectors; long-press to study it. **Library** is
everything the app can explain, A1 to C2, none of it locked.

**Lexi is built for English speakers learning German.** Every gloss, definition,
rule and exercise prompt is in English — that's a deliberate scope, not an
oversight, and it's stated here so the promise never runs ahead of what the
corpus can keep. It runs entirely on your device — no account, no sign-in, no
tracking, and nothing to cancel.

## Docs

Planning and strategy live in [`docs/`](docs/). Start with
[`docs/BACKLOG.md`](docs/BACKLOG.md) for what's next; see
[`docs/README.md`](docs/README.md) for the full index.

## What's inside

- **7,389 cards across all six CEFR levels** (A1 965 · A2 1,802 · B1 2,728 · B2 1,046
  · C1 617 · C2 231), including **104 grammar points**, merged from open German word
  lists and a dictionary-enrichment cache, deduped by level + term.
- **Every card carries at least two usage examples**, German and English, graded at
  or just below the card's level (`npm run corpus:examples` audits it).
- **131 authored grammar points · 805 exercises** (A1 20 · A2 32 · B1 40 · B2 16
  · C1 12 · C2 11), each point carrying a plain-English summary and rule — and, where
  the rule is a list rather than prose, a structured breakdown instead of a paragraph.
- Cards carry IPA, gloss, gender + plural, synonyms/antonyms, and example sentences
  where available.
- **284 fine sectors** rolled up into **16 theme groups** (Arbeit & Wirtschaft,
  Reisen & Verkehr, Gesundheit & Körper, Technik & Wissenschaft, Grammatik, …).
- **FSRS** scheduling via `ts-fsrs` — modern spaced repetition, not hand-rolled,
  and every drill mode is its own track, so recognising a word and producing it are
  scheduled separately.
- **Local-first**: progress lives in IndexedDB on the device, with export/import
  for backup and moving between machines. No backend, no account.

## Surfaces

Two rooms. The **instrument** — a collapsible left sidebar (a bottom bar on phones)
over three destinations — and the **session**, which renders full-bleed with no
sidebar, ticker or header, because one aesthetic cannot serve both scanning a
heatmap and studying a single word.

- **Today** — what to do now. One **Start session** button, the day's shape, and
  the things that only appear when they apply: a comeback greeting after a gap, a
  backlog burn-down, blind spots that expand inline into one-tap drills. The first
  run routes through a placement test and a topic picker.
- **Progress** — how it is going. The knowledge heatmap (treemap by theme group, area
  = cards, colour = how much you know) drilling into sectors, with a KPI strip, a live
  ticker and a **Markt / Liste** toggle; review and recall history, the 7-day due
  forecast, the known-growth curve, and **Decks**: every sector filterable by group and
  sortable by urgency / size / progress, each with a completion that ratchets and
  cannot be taken back by a lapse. A CEFR **level filter** rescopes the whole app, and
  opening a sector shows its **Wortkarte** — a semantic map (hub + word rings, synonym
  links, node colour = learning status).
- **Library** — what things mean and how they work. The full grammar syllabus, A1 to
  C2, with each concept's rule (structured into aligned rows where it is a list
  rather than prose) and a Practise button straight into its exercises. The drills
  behind it — der/die/das gender, noun plurals, verb conjugation (Präsens ·
  Präteritum · Partizip II, via a rule-based engine), and cloze from example
  sentences — each ride their own spaced-repetition track.
- **Profile** — name, level, streak, goal, topics, flagged cards, and **Settings**:
  theme, text size, review intensity (FSRS desired retention), daily pace, the HD
  German voice, class packs, and backup / restore.

**The session** — flip cards and ten drill types on one queue. Space to flip, 1–4
to grade, interval previews on the buttons, German text-to-speech on every string,
and a line under each item saying *why it is here* ("because you just learned
obwohl", "you've missed Kasus 4× this month"). Silence when there is nothing
non-obvious to say.

## Stack

Vite 6 · React 19 · TypeScript · Tailwind CSS v4 · `motion` (Framer Motion) ·
`lucide-react` · `ts-fsrs`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173/lexi/  (the base path is /lexi/ off Vercel)
npm run build      # production bundle to dist/
npm run typecheck  # tsc --noEmit
npm test           # vitest — 277 tests over the pure logic and the shipped corpus
npm run lint       # eslint, including jsx-a11y
```

Before pushing anything that touches the corpus:

```bash
npm run corpus:validate    # schema, duplicates, distribution, example + definition gates
npm run corpus:selftest    # offline end-to-end over fixtures, no network
```

## Repository layout

```
src/            the app — views/, components/ (+ ui/ primitives), lib/, data/
public/data/    the shipped corpus: vocab.json, grammar.json, sectors.json, provenance.json
scripts/corpus/     build-time ingestion, audits and one-shot corpus fixes (npm run corpus:*)
scripts/authoring/  the human-authoring loop: batch in, expect-guarded apply, audit trail
docs/           BACKLOG (open work) · CHANGELOG (shipped, with reasoning) · DESIGN · archive/
design/         logo sources
```

Nothing under `scripts/` ships to the browser: it runs on a maintainer's machine and
writes `public/data/*.json`, which the app fetches at runtime. Corpus JSON is never
hand-edited — every change goes through a script so it is reviewable and repeatable.

## Data

`public/data/vocab.json` (the cards) and `public/data/sectors.json` (sector → group
index). They're served as static files and fetched at runtime (see
`src/data/index.ts → initData`) so the ~2 MB corpus isn't parsed inside the JS
bundle — the app shell paints immediately and the service worker caches the data
for instant offline reloads. To extend coverage toward the whole German dictionary,
don't hand-edit the JSON — use the reproducible ingestion pipeline in
[`scripts/corpus/`](scripts/corpus/) (`npm run corpus:coverage` to see the gap,
`corpus:build` to grow it from open sources). Sources and licenses are recorded in
[`ATTRIBUTIONS.md`](ATTRIBUTIONS.md).

## Install as an app (PWA)

Lexi ships a web app manifest and a service worker, so it installs on phone and
desktop (Add to Home Screen / Install), runs full-screen and works offline after the
first load. The lexicon and assets are cached on first visit, and
`navigator.storage.persist()` runs at boot — without it Safari evicts IndexedDB
after about a week of not opening the app, which for a local-first tool is total
data loss.

## Data & licences

Lexi is built on open tools and open data. The **corpus data**
(`public/data/*.json`) is built from Wiktionary/Wiktextract, Tatoeba, and the
Leipzig Corpora Collection, so it carries **CC BY-SA 4.0** with attribution — see
[`ATTRIBUTIONS.md`](ATTRIBUTIONS.md). The application code itself is proprietary.

## Notes

Coverage colour uses FSRS state: a card counts as *learned* once it leaves `New`
and *consolidated* once it reaches `Review`. New-card introductions are capped per
day, at a pace you can change. Respects `prefers-reduced-motion`, honours iOS
Dynamic Type, and pairs every colour signal with a shape or a label so nothing
rides on hue alone.
