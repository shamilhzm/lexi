# Lexi

**A German vocabulary terminal (A1–C2).** Lexi opens on **Today** — a daily
briefing that assembles your session from what's due (FSRS) plus fresh cards from
your weakest sectors; a single **Start session** launches it. **Explore** holds the
live *knowledge heatmap*: a squarified treemap where every tile is a theme group —
**area = cards in the group, colour = % you've learned** (slate → green). Click a
tile to drill into its sectors; right-click to study it. A Bloomberg-style terminal
for working through German vocabulary with spaced repetition.

Lexi is built for everyone learning German and runs entirely on your device — no
accounts, no tracking.

## Docs

Planning and strategy live in [`docs/`](docs/). Start with
[`docs/BACKLOG.md`](docs/BACKLOG.md) for what's next; see
[`docs/README.md`](docs/README.md) for the full index.

## What's inside

- **5,213 cards across all six CEFR levels** (A1 887 · A2 1,239 · B1 1,828 · B2 559
  · C1 478 · C2 222), including **76 grammar points**, merged from open German word
  lists and a dictionary-enrichment cache, deduped by level + term.
- Cards carry IPA, gloss, gender + plural, synonyms/antonyms, and example sentences
  where available.
- **284 fine sectors** rolled up into **16 theme groups** (Arbeit & Wirtschaft,
  Reisen & Verkehr, Gesundheit & Körper, Technik & Wissenschaft, Grammatik, …).
- **FSRS** scheduling via `ts-fsrs` — modern spaced repetition, not hand-rolled.
- **Local-first**: all review state lives in `localStorage`. No backend.

## Surfaces

The app is a collapsible left **Sidebar** (a hamburger drawer on phones) over one
content area — four destinations plus the session:

- **Home (Today)** — the daily briefing ("markets open"): **Start session**
  auto-assembles a queue from what's due (FSRS) plus fresh cards from your weakest
  sectors. **Blind Spots** expand inline into one-tap drills, and a Fundamentals
  widget previews today's grammar. Streak counter; the first run routes through a
  placement test.
- **Explore** — the coverage **Knowledge Heatmap** (treemap by theme group) with a
  KPI strip and live ticker, a **Markt / Liste** toggle, and **Decks**: every sector
  as a card, filterable by group and sortable by urgency / size / progress. A CEFR
  **level filter** rescopes the whole terminal. Opening a sector shows its
  **Wortkarte** — a semantic map (hub + word rings, synonym links, node colour =
  learning status).
- **Fundamentals** — interactive grammar drills, each on its own spaced-repetition
  track: der/die/das gender, noun plurals, verb conjugation (Präsens · Präteritum ·
  Partizip II, via a rule-based engine), and cloze from example sentences.
- **Profile** — your display name, CEFR level, and streak. **Settings** live here:
  theme, review intensity (FSRS desired retention), the HD German voice, and
  backup / restore.

**Start session (Üben)** — the flip-card review loop launched from the sidebar:
Space to flip, 1–4 to grade, live FSRS interval previews, and German text-to-speech,
with grammar drills interleaved for the words you're seeing.

## Stack

Vite 6 · React 19 · TypeScript · Tailwind CSS v4 · `motion` (Framer Motion) ·
`lucide-react` · `ts-fsrs`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle to dist/
npm run typecheck  # tsc --noEmit
```

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

Lexi ships a web app manifest and a service worker, so it's installable on phone and
desktop (Add to Home Screen / Install), runs full-screen, and works offline after the
first load. The lexicon and assets are cached on first visit.

## Data & licences

Lexi is built on open tools and open data. The **corpus data**
(`public/data/*.json`) is built from Wiktionary/Wiktextract, Tatoeba, and the
Leipzig Corpora Collection, so it carries **CC BY-SA 4.0** with attribution — see
[`ATTRIBUTIONS.md`](ATTRIBUTIONS.md). The application code itself is proprietary.

## Notes

Coverage colour uses FSRS state: a card counts as *learned* once it leaves the
`New` state and *gefestigt* (consolidated) once it reaches the `Review` state.
New-card introductions are soft-capped per day. Respects `prefers-reduced-motion`.
