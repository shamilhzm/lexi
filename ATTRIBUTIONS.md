# Attributions & data licensing

Lexi's **code** is MIT-licensed. Lexi's **corpus** (`public/data/vocab.json`,
`sectors.json`) is built from third-party open datasets by the pipeline in
[`scripts/corpus/`](scripts/corpus/). This file records every source, its
license, how it's used, and the obligations that attach to the data we ship.

> **What "ships" means here:** only *derived facts* (a word's gender, plural,
> frequency rank) and *attributed content* (glosses, example sentences) land in
> `vocab.json`. The bulk source dumps are cached locally under
> `scripts/corpus/data/` and are **git-ignored — never redistributed**.

## Sources

### 1. Leipzig Corpora Collection — "Deutscher Wortschatz" frequency lists
- **URL:** https://wortschatz.uni-leipzig.de/en/download/German
- **License:** CC BY 4.0
- **Used for:** gap discovery (coverage report) and the frequency-band → CEFR
  leveling heuristic. Frequency ranks are bare facts and are not copyrightable,
  but the collection is attributed here regardless.
- **Required citation:** Goldhahn, D., Eckart, T. & Quasthoff, U. (2012).
  *Building Large Monolingual Dictionaries at the Leipzig Corpora Collection:
  From 100 to 200 Languages.* Proceedings of LREC 2012.

### 1b. OpenSubtitles spoken-frequency list (Hermit Dave, FrequencyWords)
- **URL:** https://github.com/hermitdave/FrequencyWords (content/2018/de)
- **License:** MIT (Hermit Dave). Underlying counts are derived from the
  OpenSubtitles corpus via OPUS; word-frequency counts are bare facts and are not
  copyrightable.
- **Used for:** surfacing everyday/spoken vocabulary that a news corpus
  under-represents (blended with the Leipzig list to rank gap candidates,
  especially for A1/A2). Only the ranking is used — no list text is shipped.
- **Attribution:** "Spoken-frequency ranking from Hermit Dave's FrequencyWords
  (MIT), derived from OpenSubtitles/OPUS."

### 2. Wiktextract / kaikki.org — machine-readable Wiktionary
- **URL:** https://kaikki.org/dictionary/German/ (English Wiktionary, German
  entries) · https://kaikki.org/dewiktionary/ (German Wiktionary)
- **License:** CC BY-SA 4.0 **and** GFDL (Wiktionary's dual license).
- **Used for:** part of speech, gender, plural, IPA, English glosses, and (as a
  fallback) example sentences.
- **Attribution:** "Definitions and usage examples from Wiktionary
  (https://www.wiktionary.org), via Wiktextract/kaikki.org, licensed CC BY-SA
  4.0."
- **⚠️ Share-Alike propagation:** CC BY-SA requires that adaptations be licensed
  under the same (or a compatible) license. Because curated glosses/examples from
  Wiktionary are woven into `vocab.json`, **the corpus data files are effectively
  CC BY-SA 4.0**, even though the application code remains MIT. See
  *License of the shipped corpus* below.

### 3. Tatoeba — example sentences with translations
- **URL:** https://tatoeba.org/en/downloads
- **License:** CC BY 2.0 FR (a minority of sentences are CC0).
- **Used for:** the primary translated example on each new card.
- **Attribution:** "Example sentences from the Tatoeba Project
  (https://tatoeba.org), licensed CC BY 2.0 FR." Per-sentence provenance
  (Tatoeba sentence id) is recorded in `public/data/provenance.json` so any
  individual sentence can be traced to its contributor.

### 4. CEFR wordlists (Goethe-Institut / telc / Profile Deutsch) — reference only
- **License:** copyrighted. **Not redistributed and not shipped.**
- **Used for:** *checking/assigning* a level where a maintainer supplies a local
  `lemma<TAB>level` reference TSV (`scripts/corpus/data/raw/cefr-reference.tsv`).
  A word's CEFR level is a bare fact and using it to assign a level is fine; the
  wordlists' **text is never copied into the corpus**. If you don't supply a
  reference file, the pipeline levels from frequency + the LLM layer alone.

### 5. German Categorized Wordlist (ynsrc/german-categorized-wordlist)
- **URL:** https://github.com/ynsrc/german-categorized-wordlist
- **License:** CC BY 4.0.
- **Used for:** an *independent* cross-source — (a) gender/plural validation of
  the corpus (`npm run corpus:crosscheck`), (b) a gender **fallback** that recovers
  nouns Wiktextract can't gender so they become usable cards, and (c) curated
  closed-class vocab (contractions, connectors) behind hand-authored grammar
  tracks. It is never authoritative on its own — the upstream README warns entries
  may be miscategorized — so its lists are treated as candidates/checks, run
  through the same `normalize`/`validate` gates as everything else.
- **What ships:** only derived facts (a noun's der/die/das). No list text is
  copied into the corpus. Cards whose gender came from this source record
  `wordlist(gender)` in their `factsSource` provenance.
- **Attribution:** "Noun gender cross-checked/supplemented from the German
  Categorized Wordlist (https://github.com/ynsrc/german-categorized-wordlist),
  licensed CC BY 4.0." CC BY content folds cleanly into the corpus's CC BY-SA 4.0.

## License of the shipped corpus

Because of the CC BY-SA obligation from Wiktionary (source 2), the **data files**
`public/data/vocab.json` and `public/data/sectors.json` are distributed under
**CC BY-SA 4.0**, with attribution to Wiktionary/Wiktextract, Tatoeba, and the
Leipzig Corpora Collection as above. The **application code** stays **MIT**. State
this split in the repository README/LICENSE so downstream users know that reusing
the corpus carries share-alike obligations while reusing the code does not.

## Provenance

`public/data/provenance.json` (regenerated by `npm run corpus:build`) maps each
generated card id to the origin of its level, gloss, facts, example, and sector —
including the layer that decided the CEFR level (`reference` | `frequency` |
`llm`). This is the machine-readable audit trail behind the attributions above.

## Offline LLM use (build time only)

The optional leveling/sector layer calls an OpenAI-compatible API (OpenRouter by
default) **at build time only**, never in the shipped app. The key is read from
`openrouter.key.local` (git-ignored via `*.local`) or the `OPENROUTER_KEY` env
var, is **never committed**, and is **never `VITE_`-embedded** (which would leak
it into the client bundle). The LLM contributes level/sector *judgements*, not
copyrighted text, so it introduces no additional licensing obligation.
