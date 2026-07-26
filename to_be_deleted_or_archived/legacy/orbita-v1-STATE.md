# Orbita — project state

Single-file HTML app for self-directed German C1 learning (and other CEFR-leveled languages). Originally Lesefutter; renamed Verse at v5, Orbita at v17 (2026-06-09). As of 2026-05-25 the file is `app/orbita.html`.

## Layout

```
A Personalized Language Learning App/
├── README.md                      ← folder index / map
├── STATE.md                       ← you are here
├── app/
│   └── orbita.html                 ← the entire app, one file
├── docs/
│   ├── MISSION.md                 ← the goal: Goethe C1 by 2026-12-31
│   ├── C1-Roadmap.md              ← schools, placement, month-by-month plan
│   ├── orbita-backlog.md           ← roadmap, sequencing, shipped log
│   ├── orbita-mobile-setup.md      ← iCloud + GitHub Pages instructions
│   ├── learning-german-STATE.md   ← real-world study logistics (was Orbita/STATE.md)
│   └── lesefutter-redesign-notes.md ← 2026-05-30 session log (was LESEFUTTER-STATE.md)
├── reference-images/
│   ├── orbita-study-photos/        ← textbook/notes photos (IMG_46xx)
│   └── study-method/              ← study-technique article scans
└── decks/                         ← JSON deck exports for cross-device sync
```

**Mission** is now load-bearing: see [docs/MISSION.md](./docs/MISSION.md). One goal — Shamil passes Goethe-Zertifikat C1 by 2026-12-31. Everything below is judged against that.

## Shipped through v16

v1–v7: multi-language pipeline, current/stretch reading view, ten exercise tabs, vocab/cards/cloze/grammar/comprehension/writing/speaking/discuss/journal, phrase highlights, audio, dark mode, heat colors, command palette, Anki/Quizlet TSV export, LLM Conversation Partner.

v8: deep retention layer — Today tab as entry point, SM-2 scheduler with FSRS-ready logging, automatic capture (vocab + wrong cloze + warm/cold transformations), round-robin interleaving, keyboard review (Space/1-4), backfill migration.

v9: mobile — viewport meta, 760/420px responsive breakpoints, pointer-event scramble drag, three-tier `ask()` fallback (Cowork → API key → error), Standalone-mode panel with API key + model selector + Test key + JSON deck export/import, theme-color + apple-mobile-web-app meta tags.

v10: source picker (backlog 1.8). Third source mode "Browse" alongside Paste / URL. Three German sources curated: DW Top-Thema, Nachrichtenleicht (DLF), Tagesschau in einfacher Sprache. Universal fetch via r.jina.ai reader proxy (CORS-safe, works on iPhone Safari), `ask()` parses the index into structured `{title, url, snippet}` cards. Article click → fetch → clean → drop into textarea → switch to Paste tab. ~$0.005/browse on BYO key.

v11: file upload (backlog 1.5). Fourth source mode "Upload file" — txt/md/html/rtf parsed inline, pdf via pdf.js lazy CDN, docx via mammoth.js lazy CDN. Click-to-pick, drag-and-drop on the zone or anywhere on the source panel. 8 MB cap, binary-detection fallback. Auto-switches back to Paste after extraction.

v12: bug fixes. BROWSE_SOURCES lang code lowercased ('DE' → 'de') so the German source filter actually matches. Vocab review cards with no cached definition now lookup on demand via `lookupVocabDetail()`, persist into card.payload + STATE.vocab.

v13: **learner profile + memory injection** (single biggest pedagogical move). Inspired by Nihongo Dojo. `STATE.learner = { goal, examDeadline, weaknesses[], strengths[], interests[], notes, steeringHistory }` with defaults pointing at Goethe C1 / 2026-12-31 / Finanzmärkte. `learnerContext()` helper builds a `[LEARNER PROFILE]` block prepended to the main generation prompt, the Discuss opener, and the Discuss reply — exercises now target Shamil's specific gaps and interests, not a generic CEFR path. Recent steering signal (>=3 of last 5 = too_hard/too_easy) tilts the calibration knob. New collapsible **Learner profile** panel (above the standalone-mode disclosure) with goal/deadline inputs, three tag lists (weaknesses / strengths / interests) with add/remove, free-form notes textarea. New **steering bar** at the top of the Read tab after generation — "Too easy / Just right / Too hard" buttons, logged with article id, visible state on re-render. Backlog reorganized around MISSION.md priorities (audience-expansion + community items deferred to Phase 2).

v14: **karteto layer + B1-intensiv prep.** Cream/green re-skin (warm paper, rounded cards, serif headings, pill tabs). New **Map tab** — a CEFR "galaxy" (A1→C1 rings) plotting every deck word as a dot by estimated level + SRS status (`renderGalaxy()`, `cefrIndexOf()`, deterministic `hashStr` layout). **Swipe-to-rate** on the Today card (→ Good, ← Again; first swipe reveals, additive over buttons/1–4). **Battery Show energy deck** — 46 battery/EV/trade-fair cards seeded once via `seedDecks()` (flag `energy-battery-2026-06`) into SRS + STATE.vocab. Learner profile retuned A2/B1→C1: `startLevel`/`targetLevel` injected into `learnerContext()`, four seeded `weaknesses` (konj-ii, passiv, kasus-dekl, konnektoren), interests +Batterietechnik/Immobilien/KI. Two-week plan + validated Goethe/telc resources: `docs/next-2-weeks-plan.md`.

v15: **Claude Code migration + Blind Spots + vocab upgrades.** Moved into Claude Code under git (`CLAUDE.md`, `npm run check` syntax gate, 15-test `node --test` suite run against the real code via a `vm` sandbox). Three features on branch `feat/blindspots-vocab`, verified in-browser: (1) **Blind Spots tab** (backlog #1) — generation tags each cloze/transformation with a structural category from an 11-tag C1 taxonomy; misses log to `STATE.blindspots` and bump `learner.weaknesses` so `learnerContext()` sharpens from real errors; dashboard ranks patterns by 30-day frequency, top-3 = drill targets, "Drill" sets a transient `focusTag`. (2) **Capture-from-definition** — tap any word in a saved word's Definition/Example popover to save it (`saveWordToVocab`, `tokenizeClickable`). (3) **Vocab decks** — the saved-vocab tray groups into collapsible decks by source article / theme (`deckOf`, `groupVocabByDeck`); seeded Energy deck shows as ⚡ Energie & Batterie.

v16: **C1 Lesen module (Claude Code session 2).** First Goethe-C1-exam-aligned module — the Comprehension tab is now the real **Lesen** format (65 min, 4 Teile, scored /100, pass ≥60). `generateLesen()` lazily builds Teil 1 (productive summary cloze, graded via `clozeWarmth`), Teil 2 (Aussage→Abschnitt matching), Teil 3 (MC connector/structure cloze) from the current article; Teil 4 reuses the existing `reading[]` MC. Per-Teil "Auswerten" + a /100 pass bar. Structural misses (Teil 1/3 tags) feed the Blind Spots dashboard + learner profile. The heavily-tuned main generation prompt is untouched (lazy/isolated). New `renderGappedText`/`lesenScore` unit-tested (17 total). Browser-verified end-to-end.

## Working on (next)

Decisions locked 2026-06-09 (user): canonical app = the rebranded single-file `app/orbita.html`; `orbita-lab/` (Vite+TS) stays the design lab whose ideas get ported in. This week, in order:

1. **Deploy to iPhone** — GitHub Pages (private repo) + Add-to-Home-Screen, per `docs/orbita-mobile-setup.md`. Daily use starts here.
2. **Port the Lab galaxy + flip cards into the main app** — upgrade the Map tab to the zoomable/pannable CEFR star map (per `orbita-lab/orbita-home-galaxy-PRD.md`, canvas renderer, LOD labels, search-fly-to) and bring the Karteto-style flip-card review into Today.
3. **C1 Schreiben module** (next after) — Aufgabe 1+2 on the official 4-criterion rubric, feeding Blind Spots.

Then: monthly mock-exam mode · Hören/listening ingestion · Blind Spots fast-follows.

## Session 2026-06-04 — karteto redesign + B1-intensiv prep (SHIPPED v14)

**Decisions locked (user, via AskUserQuestion):**
- Build focus = **karteto-style UX redesign** — cream/serif look, CEFR "galaxy" map, swipe-to-rate, themed decks. Reference = `reference-images/orbita-study-photos/IMG_46xx` (12 phone shots of the "karteto" flashcard app the user liked: galaxy ring view, illustrated themed decks, flip cards, matching grid, audio-only recall, swipe "I know it"/"Learn again").
- Grammar weighting = **Konjunktiv II · Passiv · Kasus & Deklination · Konnektoren/Satzbau** → seeded into `learner.weaknesses`.
- Battery Show energy vocab = **Orbita deck only** (SRS cards, no printable).

**Real-world context (from the 3 photos IMG_4644-4646):** B1 Intensivkurs at **activ lernen Köln** (Kaiser-Wilhelm-Ring 24, 50672) runs **22.6–14.8**, then B2 17.8–9.10, C1 12.10–4.12 (Mon–Fri 9:00–12:15 or 13:00–16:15). Free Probetag **Mon 8.6 at 13:00**. Contact Markus Leal, info@activlernen.de, 0221-9525186. Textbooks: **Schritte PLUS NEU B1.1 (ISBN 978-3195010856)** + **B1.2 (978-3196410853)**, €23 ea at Thalia–Mayersche, Neumarkt 2, Köln. Already owns DaF Kompakt neu A1–B1. Next 2 weeks: drill in Orbita + Battery Show Stuttgart (next week).

**This session checklist — all shipped (node --check OK):**
- [x] retune learner profile (interests +Batterietechnik/Immobilien/KI; 4 grammar weaknesses seeded; startLevel A2/B1 + targetLevel C1 injected into learnerContext; notes)
- [x] retheme `:root` → karteto cream/green/rounded + serif headings + pill tabs
- [x] add **Map** tab — CEFR galaxy SVG (`renderGalaxy`/`cefrIndexOf`; rings A1–C1, dots by SRS status, tap-to-inspect)
- [x] seed **energy deck** (46 battery/EV/trade-fair terms) via `seedDecks()` flag `energy-battery-2026-06`
- [x] swipe-to-rate on Today review cards (→ Good / ← Again; buttons + keys still work)
- [x] `node --check` extracted script → OK. Plan written to `docs/next-2-weeks-plan.md`.

## Session 2026-06-04 (PM) — Claude Code migration + v15 (SHIPPED)

Orbita moved from Cowork-only editing into **Claude Code** under git, then shipped v15.

**Foundation (Phase 1 of `docs/claude-code-migration-plan.md`):**
- `git init` + `.gitignore` + first commit; branch-per-feature workflow.
- `CLAUDE.md` — mission, hard constraints (single file, frozen `STORAGE_KEY`, no textbook content), architecture map, the check/test/commit loop.
- `npm run check` (`scripts/check.mjs`): extracts the inline `<script>` and runs `node --check`.
- `npm test` (`test/verse.test.js` + `scripts/orbita-sandbox.mjs`): **15 unit tests run against the REAL shipped code** by booting orbita.html in a `vm` sandbox (no jsdom, zero deps) — SM-2, cefrIndexOf, hashStr, seedDecks no-double-seed, plus the v15 helpers.
- `npm run preview` (`scripts/preview-server.mjs`): zero-dep static server for in-browser verification.

**v15 on `feat/blindspots-vocab` — 3 gated commits, each `npm run check` + `npm test` green, then verified in a real browser (no console errors):**
- **Blind Spots tab** (backlog #1): 11-tag C1 taxonomy; generation tags cloze/transformation; misses → `STATE.blindspots` + bump `learner.weaknesses` (feeds `learnerContext()`); 30-day-ranked dashboard, top-3 drill targets, transient `focusTag`.
- **Capture-from-definition**: tap a word in a saved word's Definition/Example popover → saves it (shared `saveWordToVocab`, `tokenizeClickable`), inherits the parent's deck.
- **Vocab decks**: tray grouped into collapsible decks (`deckOf`, `groupVocabByDeck`); deck = open article's title at save time, themed decks (⚡ energy) first, General last; chip→popover click-mapping preserved.

**Next:** deploy to iPhone via GitHub Pages (private repo), then Goethe C1 exam-aligned exercises.

## Session 2026-06-07 — C1 Lesen module (SHIPPED v16)

Second Claude Code session. Shipped the first exam-aligned module on branch
`feat/c1-lesen` (gated commit → merged to `main`), browser-verified.

- **Comprehension tab → Goethe C1 Lesen** (65 min, 4 Teile, /100, pass ≥60), mission metric #1.
- `generateLesen()` — a **lazy, isolated** `ask()` call (built on demand from the
  Comprehension tab, cached on `exerciseData.lesen`) so the main generation prompt
  is untouched. Teil 1 productive summary cloze (graded by `clozeWarmth`), Teil 2
  section-matching (`<select>`), Teil 3 MC connector/structure cloze; Teil 4 = the
  existing `reading[]` MC.
- Per-Teil "Auswerten" → `lesenScore()` → /100 + pass bar; missed gaps reveal the
  answer; Teil 1/3 structural misses call `logBlindspot()` → Blind Spots dashboard.
- Pure helpers `renderGappedText` + `lesenScore` unit-tested (17 total). Verified in
  the browser via injected fixture: all 4 Teile render + grade, score = 57/100·4/7,
  `konnektoren` weakness bumped 3→4.

**Next:** C1 **Schreiben** module (Aufgabe 1+2 on the official rubric; corrections feed
Blind Spots) — the highest-leverage remaining module for the user's weak area (production).

## Important constraints

- **Do not rename `STORAGE_KEY = 'lesefutter_v2'` in orbita.html (line ~1021).** It's the localStorage namespace — renaming wipes every user's deck. The user-facing brand has been Orbita since v5; the storage key intentionally stays.
- Edits to the HTML use `Edit`, not `Write`. Always run `node --check` (extract `<script>` block) before pushing.
- Push artifact updates via `mcp__cowork__update_artifact`. The artifact slug history was `lesefutter`; the rename happened in the folder, not in Cowork's artifact registry.
- For session-resume context, this file is the first thing to read.

## Open questions / parked

- FSRS-5 upgrade once ~500 rating events accumulate (replace SM-2 fit).
- Cross-device cloud sync (3.4) — currently JSON export/import via Standalone mode.
- Chrome extension (1.6 / 2.1) for highlight-to-exercise.

## Session 2026-06-09 — Orbita consolidation (v17 rebrand)

Verse → **Orbita**, per user decision. The single-file app stays canonical; the Vite prototype is now `orbita-lab/` (design lab — galaxy, flip cards, FSRS via ts-fsrs, briefs + Home-Galaxy PRD live in there).

- Renamed: `app/orbita.html`, `app/orbita-cards.html`, `test/orbita*.test.js`, `scripts/orbita-sandbox.mjs`, `docs/orbita-backlog.md`, `docs/orbita-mobile-setup.md`, `reference-images/orbita-study-photos/`, root package `orbita`, `orbita/` → `orbita-lab/` (package `orbita-lab`).
- **Frozen, unchanged:** `STORAGE_KEY = 'lesefutter_v2'`, `verse_anthropic_key` / `verse_anthropic_model` localStorage keys — no saved data or keys are wiped.
- Deck JSON now exports `app: 'orbita'`; import accepts `'orbita'` **and** legacy `'verse'` files. New export filenames `orbita-deck-*.json` / `orbita-*.tsv`; Anki tag prefix `orbita::`.
- `npm run check` OK (both files) · `npm test` 37/37 green.
- Consolidated product definition + week plan: `docs/orbita-product.md`.
