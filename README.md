# Lexi

**Your German vocabulary, A1–C2.** A free, open-source, local-first app for **English
speakers learning German words** — spaced repetition over a deep lexicon, the word-facts
that make a German word actually yours drilled alongside the meaning, and a scheduler
that tells you *why* each card is in front of you.

No account, no sign-in, no tracking, and nothing to cancel. It runs entirely on your
device and works offline.

**Opening the app is a German word.** There is no home screen to get past: the front
door is a feed you scroll, one word per screen, with the pronunciation, the meaning and
an example all present.

> **Scope, stated so the promise never runs ahead of the corpus:** every gloss,
> definition and example translation is in English. That is a deliberate choice — see
> [`docs/VISION.md`](docs/VISION.md). Other language pairs are an architectural goal,
> not a shipped feature.
>
> **Lexi does not teach grammar.** *Ruled 2026-09-05, and the ruling is the point:* a
> drill earns its place if it tests a property of the **word** — gender, plural,
> spelling, the German you have to produce — and goes if it tests a **rule of the
> language**. The 140-point grammar syllabus, the exam room and the reading room were
> all removed. [`docs/VISION.md`](docs/VISION.md) carries the whole argument, including
> what it would take to reverse it.

## Docs

[`docs/VISION.md`](docs/VISION.md) is the anchor — what this is, what it refuses, and
what is still undecided. [`docs/BACKLOG.md`](docs/BACKLOG.md) is what's next;
[`docs/CHANGELOG.md`](docs/CHANGELOG.md) is what shipped and why. Full index at
[`docs/README.md`](docs/README.md).

## What's inside

Measured against the shipped corpus on 2026-09-05, not estimated.

- **6,520 vocabulary cards** across all six CEFR levels — **A1 1,159 · A2 1,381 ·
  B1 2,278 · B2 942 · C1 575 · C2 185**.
- **Every card carries at least two usage examples**, German and English, graded at or
  just below the card's level.
- Cards carry IPA, gloss, gender + plural, synonyms/antonyms, word family and — from B2 —
  a German-language definition.
- **273 fine sectors** rolled up into **nine theme groups**, which the heatmap uses so
  the treemap reads on a phone.
- **FSRS** scheduling via `ts-fsrs`. Every drill mode is its own track, so *recognising*
  a word and *producing* it are scheduled separately — that split is what makes the
  recall drill honest.
- **Local-first**: progress lives in IndexedDB with export/import for backup and moving
  between machines.

## Surfaces

Four destinations, and the first one is where the app opens.

- **Wörter** — *the feed.* One German word per screen, scrolled: the headword with its
  article inked by gender, the IPA as a pill you press to hear it, the meaning, and one
  example sentence. Three actions — ⓘ opens everything the corpus knows, ♥ favourites,
  and **🔖 saves the word to your next session.** The feed does not grade you: scrolling
  is not evidence, so nothing here touches your schedule. The order is the scheduler's,
  though — what's due, then unseen words from your thinnest topics, then the rest by
  frequency.
- **Themen** — *what words are there?* A search over all 6,520 cards (German or English,
  umlauts optional), the nine theme groups with your coverage on each, **Decks**, the
  **Wortkarte** (a semantic map of a sector, with synonym links and node colour by
  learning status), and **Wörter aus einem Text** — paste any German you want to read
  and it says how much of it you can read, which words are in the way, and builds a
  session out of them.
- **Üben** — *test me.* Flip cards interleaved with the three word-fact drills, on one
  FSRS queue that opens with the words you bookmarked. Interval previews on the grade
  buttons, German text-to-speech on every string, a hint ladder and near-miss tolerance
  on typed answers, and a line under each item saying *why it is here* ("you flipped
  *anbieten* a few cards ago — now produce it"). Silence when there is nothing
  non-obvious to say.
- **Fortschritt** — *how is it going?* Words you know, the two-minute placement test, the
  A1→C2 level path (which is also the control that decides what you are shown), your
  goal, the knowledge heatmap, review and recall history, the 7-day due forecast,
  finished sectors, and **blind spots** — what you keep getting wrong, ranked by rate,
  each row a tap into a run of that drill.
- **Profile**, off the avatar — name, level, streak, goal, topics, flagged cards, and
  **Settings**: theme, text size, review intensity (FSRS desired retention), daily pace,
  which drills are in a session, the HD German voice, and backup / restore.

### The loop

> **browse freely → save what catches you → Üben teaches you what you chose.**

Bookmarking is the one thing a feed can honestly record, and it is an instruction to the
scheduler rather than a wishlist: `buildBriefing` serves saved words ahead of the ones it
would have picked itself. Favourites are separate and change nothing about what you are
taught.

### The three drills

Each is generated from the lexicon and scheduled on its own FSRS track under
`gym:<mode>:<wordId>`.

| | Asks | Why it is vocabulary and not grammar |
|---|---|---|
| **der / die / das** | the article of a noun | a German noun without its gender is a half-learned word |
| **Plurals** | `die Tische`, not `die Tischen` | same |
| **Recall** | English in, German out — typed, with the article | the productive half of knowing a word, which recognition never proves |

Recall is gated: a word becomes eligible only once its flip card has reached FSRS
`Review`, because asking someone to produce a word they have only just met is a
retrieval attempt on something not yet encoded.

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
npm test           # vitest — 600 tests over the pure logic and the shipped corpus
npm run lint       # eslint, including jsx-a11y
```

Before pushing anything that touches the corpus:

```bash
npm run corpus:validate && npm run corpus:selftest
```

## Repository layout

```
src/            the app — views/, components/ (+ ui/ primitives), lib/, data/
public/data/    the shipped corpus: cards.json, detail.json, sectors.json, freq.json,
                provenance.json, audio.json (vocab.json is canonical, not deployed)
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

`vocab.json` still carries 110 `kind: 'grammar'` cards. They are filtered out at load in
`src/data/index.ts` rather than cut from the corpus, because the corpus is canonical and
reversing the decision should be one line.

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
