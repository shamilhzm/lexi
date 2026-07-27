# Atlas cohesion plan — from Frankenstein to Kartenwerk

Source: Shamil's 8-point review request (2026-06-12). Companion to [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). Each phase is sized to one working session and ends with `typecheck + test` green and a STATE.md update.

## Review findings (current state vs the 8 points)

1. **Atlas theme everywhere** — Feinpapier tokens are solid but the vocabulary is Orbita-era: legacy aliases (`--galaxy-*`, `--void-*`, `--warp`, `--stardust`) still referenced in code/CSS; icons are generic; no written system. → DESIGN-SYSTEM.md now exists; code needs to converge on it.
2. **Karteto cards everywhere** — Good bones: `exerciseMarkup`/`bindExercise` already unify the 5 grammar widgets, and gap-check reuses them. But vocab recall-ladder cards, grammar cards, and gap-check render different chrome (different headers/footers/feedback). No universal skip.
3. **Claude-style shell** — Left sidebar exists but is fixed-width, non-collapsible; no right context panel; term detail lives in ad-hoc overlays.
4. **Daily Tagesschau pipeline** — Nothing in the app (the Verse artifact was separate). No transcript-in workflow, no generated-exercise import path. LLM runtime is shelved per BACKLOG.
5. **Home = Atlas** — Already true. No work.
6. **DaF A1-B1 images** — 69 HEIC scans confirmed as *Lektionswortschatz in Feldern* pages: taxonomy **Lektion → Feld → Wortart** (Nomen, Verben, Adjektive, Adverbien, Pronomen, Wendungen). `lexikon.ts` already has `feld` + `pos` fields, so the schema fits — but coverage is thin (≈370 lines vs ~69 dense pages) and the Katalog/Atlas grouping is interest-based, not Feld→Wortart-tiered.
7. **Grammar depth** — 52 points / 136 exercises total, but badly skewed: A1 14 · A2 15 · B1 14 · **B2 4 · C1 3 · C2 2** points, ~2–3 exercises each. For a C1 mission this is upside-down.
8. **Every UI word searchable** — Atlas search covers stars only. Chrome words (Schwachstellen, Stempelbogen, Überspringen, …) are not terms.

## Phases

### Phase 1 — Shell + token convergence (points 1, 3, 5)
- Collapsible left rail (224↔56px) + new right **Marginal** panel per DESIGN-SYSTEM §5; persist in `orbita_prefs_v1`; keyboard `[` `]` `/`.
- Move star/term detail popovers into the Marginal dossier.
- Sweep legacy token names out of source (keep CSS aliases in `theme.css` for safety); redraw `icons.ts` per §6.
- Tests: shell render smoke + prefs persistence.

### Phase 2 — The one Karte (point 2)
- Extract a single `karte.ts` + `card.css` chrome (Kopfzeile/Stage/Antwortzone/Fußzeile per §4); recall-ladder, grammar, and gap-check all render inside it.
- Universal **Überspringen**: logs a blind-spot signal tagged `zu-steil`, requeues the card lower (FSRS untouched — skip is not a lapse).

### Phase 3 — DaF extraction + taxonomy pivot (point 6)
- Convert 69 HEIC → JPG (pillow-heif, done once into `reference/DaF Wortschatz/`); transcribe each page in Cowork sessions (~10–15 images per session) into `lexikon.ts` entries with `lektion/feld/pos/level` — *style-faithful, not verbatim transcription beyond word lists*.
- Reconcile against existing lexikon + lessonmap: dedupe by term, fill B1 gaps (Lektionen 19–30 are thinnest).
- Pivot Katalog/Atlas grouping to tiered **Feld → Wortart**; interest decks remain as an alternate lens, not the primary one.
- **Frozen ids:** `lex-l{n}:{term}` — never rename existing terms; new entries only add.

### Phase 4 — Grammar depth (point 7)
- Target: every point ≥ 6 exercises across ≥ 3 widget kinds; B2→12 points, C1→12, C2→6 (C1 weighted to Goethe exam grammar: Nominalisierung, Passiv-Ersatzformen, Konjunktiv I, Partizipialattribute, Konnektoren).
- Wire grammar points into gap-checks for B2/C1 lessons-equivalent.

### Phase 5 — Tagesblatt (point 4)
Two tiers, shipped in order:
- **5a (paste, ships first):** new Werkstatt-style screen **Tagesblatt** — paste the YouTube transcript of *tagesschau in Einfacher Sprache*; the app segments it, surfaces unknown terms (diff vs lexikon+FSRS state), and builds Karte exercises per level A1–C2 with skip. Pure client logic where possible; LLM-graded generation needs the BYO-key runtime from BACKLOG.
- **5b (scheduled):** Cowork scheduled task (daily ~17:30) — pull the day's transcript, generate a `tagesblatt-YYYY-MM-DD.json` (terms + exercises, 6 levels) into `app/public/tagesblatt/`; app loads the latest file. Risk: YouTube transcript fetch from the sandbox may be blocked — if so, 5a remains the path and the scheduled task falls back to drafting from the tagesschau.de Einfache-Sprache text page instead.

### Phase 6 — UI-Lexikon (point 8)
- `src/ui-lexikon.ts`: registry of every German string in the chrome (term, translation, pos, example). New star scheme `ui:{slug}` (additive — frozen schemes untouched).
- These render as a "Kartenrand" ring on the Atlas and are fully searchable; clicking one opens the Marginal dossier like any term.
- Lint-style test: every string literal in nav/buttons/headers must exist in the registry.

## Sequencing & guardrails

Order: 1 → 2 → 3 → 4 → 5a → 6 → 5b. Phases 3 and 4 are content-heavy and can interleave with 5/6 if a session stalls.

Always: `STORAGE_KEY='orbita_v1'` untouched; star-id schemes frozen; `node --test` with `.ts` imports; `npm run typecheck && npm test` before done; data files `data.ts`/`explore-decks.ts` stay generated. Mission filter: C2 content in Tagesblatt is cheap to include since levels are generated together, but authoring effort always weights C1.
