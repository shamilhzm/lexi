# Corpus pipeline

A reproducible, re-runnable pipeline that grows `public/data/vocab.json` from
open, correctly-licensed sources — **not by hand-editing JSON**. It measures the
real coverage gap against a frequency list, enriches the missing lemmas from
Wiktextract, attaches translated Tatoeba examples, assigns a CEFR level and
sector, dedupes against the existing corpus, validates, and emits deterministic
output.

> **Runs at build time on a maintainer's machine only.** It downloads large third-
> party dumps and (optionally) calls an LLM. None of this is part of the shipped
> app. See [`../../ATTRIBUTIONS.md`](../../ATTRIBUTIONS.md) for sources & licenses.

## Requirements

- Node ≥ 22.18 (runs the `.ts` scripts directly via native type-stripping).
- `tar` and `bzip2` on PATH (present on macOS and Linux) for archive extraction.
- No npm dependencies — the pipeline uses Node built-ins and reuses the app's own
  `conjugate`/`mining`/`ai` modules.

## Commands

```bash
npm run corpus:selftest    # offline end-to-end test over fixtures/ (no network)
npm run corpus:fetch       # download + cache raw sources into data/raw/ (git-ignored)
npm run corpus:coverage    # Goal 1: coverage report + ranked missing lemmas → data/out/
npm run corpus:build       # dry run: writes review artefacts to data/out/
npm run corpus:build -- --write                       # apply to public/data/*
npm run corpus:build -- --level=A1 --limit=300 --write # one reviewable batch
npm run corpus:build -- --llm --write                 # enable the offline LLM layer
npm run corpus:crosscheck  # cross-check corpus gender/plural vs the categorized wordlist
npm run corpus:validate    # Goal 6: schema/dupe/distribution/probe + gzip size
npm run corpus:validate -- --strict --sample=15       # gate on warnings, larger spot-check
```

Recommended loop: `fetch` → `coverage` (see the holes) → `build` batch (dry) →
inspect `data/out/new-cards.json` → `build --write` → `validate --strict` →
review the git diff → commit.

## How it works

| Stage | File | Notes |
| --- | --- | --- |
| Config | `config.ts` | Source URLs (env-overridable), freq→level bands, per-level targets, POS map. |
| Fetch/cache | `fetch.ts` | Idempotent; extracts `tar`/`bz2` via system tools. |
| Frequency | `sources/frequency.ts` | Leipzig `*-words.txt` → rank-ordered surface forms. |
| Lexical facts | `sources/wiktextract.ts` | kaikki JSONL → pos/gender/plural/IPA/gloss/examples; streamed, filtered to a candidate set. |
| Examples | `sources/tatoeba.ts` | Joins de/en/links → translated pairs; matches sentences via the app's conjugation engine. |
| Cross-source | `sources/wordlist.ts` | Categorized wordlist (CC BY 4.0): der/die/das + plural + POS lists. Gender fallback in `build.ts`; validation in `crosscheck.ts`. Graceful if unfetched. |
| Leveling | `level.ts` | reference wordlist → frequency band → LLM, with per-card provenance and held-out agreement. |
| Sectors | `sectors.ts` | Assigns an existing `field`/group; rebuilds `sectors.json`. |
| Normalize | `normalize.ts` | Assembles schema-valid `Word`s; drops malformed items. |
| Orchestrate | `build.ts` | `runBuild()` ties it together; deterministic ordering; `--write` gated. |
| Coverage | `coverage.ts` | Goal 1 report. |
| Validate | `validate.ts` | Goal 6 CI harness + reader-matching probe. |
| Cross-check | `crosscheck.ts` | Gender/plural agreement vs. the categorized wordlist; lists conflicts for review. |
| Self-test | `selftest.ts` | Offline regression guard over `fixtures/`. |

## CEFR leveling (the defensible bit)

Each lemma's level is decided by the first layer that applies, and the layer is
recorded in `public/data/provenance.json`:

1. **Reference** — a local `data/raw/cefr-reference.tsv` (`lemma<TAB>level`). A
   level is a bare fact, so using a Goethe/telc/Profile-Deutsch list to *assign*
   one is fine; the list's text is never shipped. Optional.
2. **Frequency band** — `FREQ_BANDS` in `config.ts` maps rank → level. Frequency
   correlates with level; band edges are fuzzy so other layers can override.
3. **LLM** (`--llm`) — for lemmas the above can't confidently place. Build-time
   only; key from `openrouter.key.local` / `OPENROUTER_KEY`, never committed.

`validate`'s and `level.ts`'s `levelingAgreement()` compares the frequency
heuristic against the reference (exact + within-one-level) so you can see how far
to trust it before committing a batch.

## Extending

- Point at a newer corpus year: `LEXI_FREQ_URL=… npm run corpus:fetch`.
- Grow past 10k: raise `LEVEL_TARGETS` in `config.ts` and re-run `build --write`;
  it only ever adds genuinely new terms and never touches user (`usr:`) or grammar
  (`gram:`) cards.
- Add fixtures + assertions to `selftest.ts` when you add a source or rule.
