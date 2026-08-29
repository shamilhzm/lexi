# Attributions & data licensing

Lexi's **code** is MIT-licensed. Lexi's **corpus** (`public/data/vocab.json`,
`sectors.json`) is built from third-party open datasets by the pipeline in
[`scripts/corpus/`](scripts/corpus/). This file records every source, its
license, how it's used, and the obligations that attach to the data we ship.

> **What "ships" means here:** only *derived facts* (a word's gender, plural,
> frequency rank) and *attributed content* (glosses, example sentences) land in
> `vocab.json`. The bulk source dumps are cached locally under
> `scripts/corpus/data/` and are **git-ignored — never redistributed**.

## Sources considered and rejected

Recording these so the same source is not proposed again — a licence check is
cheap the first time and invisible the second.

### DWDS (Digitales Wörterbuch der deutschen Sprache) — **rejected, licence**
- **URL:** https://www.dwds.de · API at `/api/wb/snippet`
- **Why it was wanted:** the Berlin-Brandenburgische Akademie der Wissenschaften
  dictionary is a stronger authority than Wiktionary, and it distinguishes *senses*
  — which is exactly what the ambiguous-prefix verbs need (`umstellen` is
  "rearrange" or "surround" depending on separability, and the card means one of
  them).
- **Why it is out.** The Nutzungsbedingungen are explicit: *"Jegliche Nutzung der
  Inhalte des DWDS, einschließlich jedoch nicht beschränkt auf automatisierte
  Abfragen und Auswertungen (Crawlen, Parsen, Text- und Data-Mining), sofern nicht
  über § 60d UrhG zulässig, ist nur mit ausdrücklicher Genehmigung gestattet."*
  BBAW additionally reserves its rights under § 44b UrhG (the TDM opt-out). § 60d
  is the *research-organisation* exception; Lexi is a public application, not a
  research body, so it does not apply. **Automated querying would need express
  written permission from BBAW.** The API answering a request is not permission.
- **If it is ever wanted:** ask BBAW via their contact form first, and record the
  answer here. Do not wire it in on the strength of the endpoint being reachable.

### Candidates verified 2026-08-29 — both usable

- **Wikidata Lexemes** — **verified, CC0, in use.** The 502 of 2026-08-15 was
  transient *and* partly self-inflicted: a query that binds a plain string and
  compares with `FILTER(STR(?lem) = ?lemma)` forces a scan and times out, where
  `VALUES ?lem { "Haus"@de }` against `wikibase:lemma` is an index lookup that
  answers in a second. Re-probed with the second form, the German lexeme set is
  large and populated — and the specific open question, whether **verb paradigms**
  are filled, is answered yes:

  | | lexemes | with inflected forms | |
  |---|---|---|---|
  | noun | 188,949 | 95% | gender stated for 96% |
  | verb | 20,428 | 94% | |
  | adjective | 26,862 | 91% | |
  | adverb | 2,656 | 100% | |

  Roughly twenty-eight times Lexi's whole corpus in nouns alone. **CC0** imposes
  nothing — no attribution, no share-alike — so it is the only source here that adds
  no obligation to the shipped data. Used two ways, both in `scripts/corpus/wikidata.ts`:
  as a **second opinion** on every gender already in the corpus, and as a **lookup**
  for words de.wiktionary has no page for.

  ⚠️ Two hazards. `wbsearchentities` matches a label in *every* language — `Disruption`
  returns the English lexeme first — so always bind `dct:language wd:Q188`. And the
  noun **forms are frequently generated rather than attested**: it offers
  *die Datensicherheiten* and *die Mitverantwortungen* without hesitation. Take gender
  and part of speech; treat a plural as a candidate for a human ruling.

- **UniMorph German** (`github.com/unimorph/deu`) — **verified, CC BY-SA 3.0**, stated
  in the README although GitHub's licence detector reports none. 519,143 inflected
  forms over 39,373 lemmas, tagged for case, number and gender
  (`Hirschhornsalz  Hirschhornsalzes  N;GEN;NEUT;SG`). A **static file**, which is its
  real advantage over the SPARQL endpoint: no rate limit, no availability risk, works
  on a maintainer's machine offline. Smaller than Wikidata and last updated 2024-07.
  Share-alike is already Lexi's position for the corpus, so it costs nothing extra.
  **Not yet wired in** — worth it if the Wikidata endpoint's flakiness becomes a
  problem, or as a cross-check of the cross-check.

### Sources rejected on licence, not on quality
- **Duden** — checked 2026-08-29. The public API (`api.duden.io`) is spellcheck and
  synonyms only and exposes **no gender, plural or part of speech**, so it could not
  have settled a single card even if it were free. The dictionary is © Cornelsen, and
  in Germany a database additionally carries the sui-generis right (§87b UrhG) against
  systematic extraction of substantial parts. Reading duden.de to settle a card by
  hand is fine and always was; harvesting it into a corpus this repo redistributes is
  not.

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

### 3b. Tatoeba audio — human recordings of example sentences
- **URL:** https://downloads.tatoeba.org/exports/sentences_with_audio.tar.bz2
- **License:** **per recording, chosen by the contributor.** This is the only
  source here without a single corpus-wide licence, and Tatoeba's download page
  is explicit: *"If the license field is empty, you may not reuse the audio
  outside the Tatoeba project."*
- **Used for:** playing a real human reading of a card's example sentence, in
  preference to synthetic speech. No audio is redistributed by this repository:
  `npm run corpus:audio` emits **`public/data/audio.json`**, a manifest of ids
  (`cardId → { audioId, license, attribution, by }`), and the app fetches each
  clip from Tatoeba on first play and caches it on the learner's own device.
- **How the obligation is met.** `scripts/corpus/sources/tatoeba-audio.ts`
  filters row by row with an **allow-list**, not a deny-list: a recording is kept
  only if its licence string is one recognised as permitting reuse (CC0, CC BY,
  CC BY-SA, public domain). An empty licence, an unrecognised licence, and the
  NC/ND variants are all dropped. Being too strict costs a card nothing but a
  fallback to synthetic speech; being too loose would mean redistributing a
  contributor's voice against their terms. The filter is covered by
  `scripts/corpus/tatoeba-audio.test.ts`, which asserts each rejection case
  individually.
- **Attribution:** the manifest carries each recording's contributor and
  attribution URL so the app can credit the specific voice, not just the project.

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

## The brain map (`#/brain`)

**three.js** — MIT licence, © 2010–present three.js authors. Loaded as a lazy
chunk; see `src/lib/brain/scene.ts`.

### The cortical surface — MNI ICBM152 2009c

`public/data/brain-mesh.bin` is a triangle mesh derived from the grey-matter
probability map of the **ICBM152 2009c nonlinear asymmetric** template, obtained
via TemplateFlow's public mirror and isosurfaced by `npm run brain:mesh`
(`scripts/brain/mesh.ts`). The gyri and sulci in the app are therefore measured
anatomy from a 152-subject average, not an artist's impression.

> Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre,
> Montreal Neurological Institute, McGill University. Permission to use, copy,
> modify, and distribute this software and its documentation for any purpose and
> without fee is hereby granted, provided that the above copyright notice appear
> in all copies.

The licence expressly permits modification and redistribution, which is what
shipping a derived mesh is. Cite:

- Fonov V, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL and BDCG
  (2011). *Unbiased average age-appropriate atlases for pediatric studies.*
  NeuroImage 54(1):313–327.
- Fonov V, Evans AC, McKinstry RC, Almli CR, Collins DL (2009). *Unbiased
  nonlinear average age-appropriate brain templates from birth to adulthood.*
  NeuroImage 47, Supplement 1:S102.

The 7.2MB source volume is cached under `scripts/brain/data/` (git-ignored) and
**is not redistributed** — only the derived surface ships.

### What is still an interpretation

The atlas that places a vocabulary sector in a cortical region is an
interpretation laid over published work, not a finding, and `docs/BRAIN.md`
states exactly what it claims and what it does not. The template is a group
average of 152 people; **nobody using Lexi has been scanned**, no individual's
imaging data is involved, and the surface says so in a standing caption.

Per-region citations live in `src/lib/brain/atlas.ts` and are shown to the learner
alongside a confidence tier. Primary sources are listed in `docs/BRAIN.md`.

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
