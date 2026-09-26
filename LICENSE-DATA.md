# Licence of the data

Lexi's **code** is MIT — see [`LICENSE`](LICENSE). This file covers everything else
that ships: the word data in [`public/data/`](public/data/).

## The word data is CC BY-SA 4.0

`public/data/` — `cards.json`, `vocab.json`, `detail/*.json`, `lex/*.json`,
`inflections.json`, `sectors.json`, `freq.json`, `provenance.json` and `audio.json` —
is licensed under the **Creative Commons Attribution-ShareAlike 4.0 International
licence**: <https://creativecommons.org/licenses/by-sa/4.0/legalcode>.

It is not a choice, and it is not ours to change: the glosses, facts and dictionary
entries are adapted from Wiktionary (CC BY-SA 4.0), and the teaching order from the
*Datengeleiteter Kernwortschatz Deutsch* (CC BY-SA 4.0). Share-alike carries to
anything built from them.

**What you may do:** copy, redistribute, adapt and build on the data, for any purpose,
including commercially.

**What you must do:**

1. **Credit the sources.** The short form is in [`public/data/NOTICE.txt`](public/data/NOTICE.txt),
   which ships beside the data; the full record, with what each source supplied, is
   [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md). Example sentences from Tatoeba are CC BY 2.0 FR
   and are credited per sentence where `provenance.json` records the id; recordings
   are credited per contributor from `audio.json`.
2. **Say that you changed it**, if you did.
3. **Share adaptations under CC BY-SA 4.0** (or a licence the CC lists as compatible).
4. **Add no terms or technical restrictions** that stop the next person doing the same.
   If you ship the data inside an app store build, ship a licence notice that says the
   data stays under CC BY-SA 4.0 whatever the store's standard terms say.

**Adapted, not copied:** Lexi selected, reformatted and shortened the Wiktionary
material, added levels, topics and teaching order, and wrote many glosses and example
sentences with an AI model under machine verification (see ATTRIBUTIONS, *Written with
AI*). Text written by a machine alone carries no copyright of its own; it is included
under the same licence so the data set stays one thing.

## What this does not cover

- **News stories** are never in this repository. The learner's browser fetches them
  from each publisher for private reading; they remain © their publishers.
- **Typefaces** (`src/fonts/`) are under the SIL Open Font License 1.1; their licence
  texts sit beside them.
- **Generated media** (synthetic audio, pictograms), when it ships, carries its own
  `LICENSE` file in its folder — see ATTRIBUTIONS, *Written with AI*.
