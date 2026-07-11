# Lexi — Task: close the coverage gap & grow the lexicon to a 10,000-card A1–C2 corpus

Paste this into a new coding session on the Lexi repo. The goal is to turn Lexi's lexicon from
~5,213 cards with real coverage holes into an impressive, balanced, ~10,000-card A1–C2 corpus —
built by a **reproducible, permissively-licensed pipeline**, not by hand-editing JSON.

## ⚠️ Licensing & provenance first — read before doing anything

Lexi's application code is proprietary, but every word, gloss, example, and frequency figure that
ships in `vocab.json` must come from a source we're allowed to redistribute **and use commercially**,
and each source must be recorded. Rules:

* **Use only permissive/attributable sources**: CC0, CC BY, CC BY-SA, or public domain. **No
  NC (non-commercial) or ND (no-derivatives) data**, and **do not redistribute copyrighted graded
  wordlists verbatim** (Goethe/telc/ÖSD lists) — those may be used as a *leveling reference* only.
* **Record everything** in a new `ATTRIBUTIONS.md` (source, URL, license, how it's used, required
  citation). CC BY-SA obligations propagate — note them.
* Bare facts (a word's gender, plural, frequency rank) aren't copyrightable, but curated glosses
  and example sentences are — attribute those.
* If the pipeline uses an LLM (e.g. OpenRouter) for leveling / sector-tagging / gap-filling, it
  runs **offline at build time only**. The API key lives in a **git-ignored** local file
  (`openrouter.key.local`), is **never committed**, and is **never `VITE_`-embedded** (it would
  leak into the shipped bundle). `git status` before finishing; confirm the key is in zero tracked
  files. (Same discipline as the AI-hardening task; `src/lib/ai.ts` already exists and is reusable.)

## Vetted sources (confirmed licenses)

* **Frequency / gap discovery** — Leipzig Corpora Collection "Deutscher Wortschatz" frequency lists
  (10K–1M), **CC BY 4.0**. Cite Goldhahn et al., LREC 2012. https://wortschatz.uni-leipzig.de/en/download/
  Also: Wiktionary German frequency list. https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/German
* **Lexical data (gender, plural, IPA, POS, inflections, glosses, examples)** — Wiktextract / kaikki
  machine-readable Wiktionary, **CC BY-SA + GFDL**. German: https://kaikki.org/dewiktionary/ ·
  English (for glosses): https://kaikki.org/dictionary/
* **Example sentences with translations** — Tatoeba, **CC BY 2.0 FR** (attribution per sentence;
  some CC0). https://tatoeba.org/en/downloads
* **CEFR leveling reference only** (do not redistribute verbatim) — Goethe/telc/Profile Deutsch
  wordlists, used to *check* level assignments, not to ship their text.

## What already exists

* **Corpus files** — `public/data/vocab.json` (`Word[]`) and `public/data/sectors.json`
  (`SectorMeta[]`), fetched at runtime by `src/data/index.ts` `initData()` (kept as a separate
  ~2 MB cached fetch, service-worker cached, so it isn't parsed inside the JS bundle).
* **Card schema** (`src/types.ts` `Word`): `{ id, term (nouns include the article — "der Tisch"),
  en, pos (noun|verb|adjective|adverb|…|"grammar"), level (A1–C2), gender (der|die|das|null),
  plural (string|null), ipa (string|null), def (string|null), syn[], ant[], ex[] ({de,en,lvl}),
  field (fine sector), kind ('word'|'grammar') }`. `SectorMeta`: `{ name, count, levels[], group }`.
* **Structure** — 284 fine sectors rolled into 16 theme groups; 76 `kind:'grammar'` cards. README
  says cards are **deduped by level + term**. User-mined words use the `usr:` id prefix and the
  "Mein Wortschatz" group — the build must not collide with those.
* **The reader depends on card quality** — `src/lib/mining.ts` builds its match index from the
  corpus: it indexes noun plurals, conjugates every `pos:'verb'` infinitive (via
  `src/lib/conjugate.ts`), and de-inflects adjectives. So accurate `pos`, article-bearing noun
  `term`s, correct `plural`, and conjugable verb infinitives directly determine whether words
  "light up" when reading. Garbage-in degrades matching.
* **A card-shaped enrichment template already exists** — `enrich()` in `mining.ts` + `parseLooseJSON`
  in `ai.ts` produce exactly this schema from an LLM; reuse the shape (and, offline, the model).
* **Known distribution & the gap** — current counts: A1 887 · A2 1,239 · B1 1,828 · B2 559 · C1 478
  · C2 222 (5,213). Two problems: (1) **breadth** — core high-frequency lemmas are simply missing
  (verified absent: `meinen`, `also`, `nur`, `mehr`, `Rolle`, `Schritt`, `Beispiel`, `Prozent`,
  `Interview`, `Ding`, `Reihe`, and many more); (2) **balance** — B1 is the largest band while A1/A2
  are thin, which is backwards for a corpus meant to support real reading from the start.

## Goals

1. **Measure the gap first (this is also the "seek out others" engine).** Build a reproducible
   coverage report: current lexicon vs. the Leipzig frequency list. Output (a) coverage % of the top
   frequency bands overall and per CEFR level, (b) the current level/sector distribution, and (c) a
   **ranked list of missing high-frequency lemmas**. Don't just patch the screenshot examples — let
   frequency data surface the real holes.
2. **Assemble the sources** above into cached raw inputs, and write `ATTRIBUTIONS.md`.
3. **Build a reproducible ingestion pipeline** under `scripts/` (not hand-edited JSON): fetch/cache
   raw sources → normalize to the `Word` schema → pull gender/plural/IPA/gloss/inflections from
   Wiktextract → attach ≥1 example (Tatoeba/Wiktionary) with translation → assign a sector/`field`
   + group → assign a CEFR `level` → dedupe by (level, term) within the batch and against the
   existing corpus → validate → emit updated `vocab.json` (+ `sectors.json`). Deterministic output
   ordering so diffs are reviewable. Re-runnable so the corpus can keep growing past 10k.
4. **CEFR leveling method** (the hard part — be explicit and defensible): blend (a) published CEFR
   wordlists as ground truth where a lemma appears, (b) a frequency-band → level heuristic, and
   (c) an LLM estimate for the remainder, then **validate against a held-out set / spot-check**.
   Store the provenance of each level assignment. Target a **foundation-weighted** distribution
   summing to ~10,000 — a sensible starting split (refine from the coverage analysis, and fill
   A1/A2 core first since that's where the reading gap hurts most): A1 ~1,200 · A2 ~2,000 ·
   B1 ~2,800 · B2 ~2,000 · C1 ~1,300 · C2 ~700.
5. **Quality bar & schema conformance.** Every new card: valid `term` (nouns carry der/die/das),
   `pos` in the allowed set, `level` A1–C2, nouns have `gender` + `plural`, `ipa` where available,
   ≥1 example with translation, and an existing (or deliberately added) `field`/group. Drop
   malformed items rather than shipping them. Leave the 76 grammar cards alone.
6. **Validation, tests & performance.** A validation script that runs in CI-style: JSON-schema
   check, duplicate check, per-level/-sector distribution report, IPA/example presence rates, and a
   random N-card sample for **human spot-check** of gender/plural/level accuracy. Re-run the
   existing mining probe/self-tests against the new corpus so reader matching (conjugation, plural,
   adjective de-inflection) still holds. Measure `vocab.json` size + first-load impact; if it grows
   materially, consider gzip/splitting while preserving the "separate cached fetch" design.
7. **Ship in reviewable batches** (by level or sector), each verified — not one 5k-card dump — and
   document the pipeline so the team can extend it.

## Constraints

* Commercial product → permissive/attributable, commercial-use-OK sources only; `ATTRIBUTIONS.md`
  complete; no NC/ND; no verbatim copyrighted graded lists.
* Local-first, no server → corpus stays static JSON fetched at runtime; respect the size/perf
  budget; no new runtime dependencies in the app itself (pipeline deps are dev-only).
* Any LLM use is offline/build-time; key git-ignored, never committed, never `VITE_`-embedded.
* Surgical to app code: the `Word` schema and `initData()` loader shouldn't need changes; if they
  do, keep them minimal. Preserve the existing id scheme and (level, term) dedupe; never collide
  with `usr:` user words. `npx tsc --noEmit` and `npm run build` stay clean.

## Definition of done

`vocab.json` reaches ~10,000 high-quality A1–C2 cards with a foundation-weighted distribution; the
previously-missing core lemmas are present at the right levels; a coverage report shows high
coverage of the top frequency bands per level (target ≥95% of the top ~2,000 lemmas) and lists
what's still missing; the pipeline is reproducible with fully documented, correctly-licensed
sources; every card passes schema/dupe/field validation and a spot-check confirms gender/plural/
level accuracy; the reader's matching still works (probe/self-tests green); `tsc`/`build` clean;
load/size impact measured and acceptable; existing user words unaffected; and no secrets are
committed.
