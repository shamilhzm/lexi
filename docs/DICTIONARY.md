# Getting to Duden's 148,000 headwords

*Written 2026-09-05. Every number below came from a script run that day; the
script that produced each is named beside it, so none of this has to be believed
on my word. See [LESSONS.md](LESSONS.md) on why that rule exists.*

---

## The answer in one line

**Don't grow the corpus to 148,000 cards. Ship a second layer.**

Lexi should end up as two things that share a search box:

| | What it is | Gate | Size |
|---|---|---|---|
| **The corpus** | words Lexi *teaches* — FSRS cards, levels, examples, drills | machine-verified, hard | 6,520 → **~12,000** |
| **The lexicon** | words Lexi can *look up* — gloss and inflections, nothing else | machine-imported, light | 0 → **~150,000** |

That is the Duden replacement, and it is roughly two days of work rather than
two years — because the data is already on the disk.

---

## Why not 148,000 cards

Four reasons, in descending order of how much they should decide it.

### 1. Most of a dictionary is not teachable, and Lexi already reads a chunk of it

Sampling 1 in 17 of Wiktionary's 135,720 German nouns and running each through
the app's own matcher (`npm run corpus:dictgap`):

- **9.2%** are already a card or an inflection of one
- **11.7%** are compounds the matcher decomposes — *Gruppenticket* resolves to
  *das Ticket*, and a learner who knows both parts can read it. Teaching these
  as separate cards spends a review on something they already have.
- **79.2%** are genuinely new to the app

And that 79% is, by inspection of the sample: `Aborigine, VB, NC, MM, Hesse,
Apache, Gigant, Beelzebub, NO, Ferkel, Vandalismus, Pali, Mercedes, Popsicle`.
Abbreviations, proper nouns, English loans, obscure names. **A dictionary should
absolutely contain all of it. A vocabulary trainer should never teach any of
it.** That is the whole argument for two layers in one sample.

### 2. The gate does not scale, and it is the reason the corpus is trustworthy

`authoring:new` refuses to write a card it cannot verify: gender, plural, part of
speech and IPA looked up in de.wiktionary, a disagreement a hard reject, and
every example proved to contain a real inflection of its headword using the app's
own matcher. That gate is why 6,520 cards can be trusted. Running it 148,000
times is a different project with a different budget, and relaxing it to get
there would spend the one thing the corpus has.

The lexicon needs no such gate, because it makes no such claim. It says "here is
what Wiktionary says this means", which is what a dictionary says.

### 3. Returns diminish, measured

Token-weighted coverage over 116.5M tokens of news + subtitles
(`npm run corpus:tokencov`):

```
matched to a card   79.7%
compound of known    0.5%   (decomposable, not taught)
function words       7.1%   (handled, not taught)
proper nouns         0.1%   (excluded on purpose)
LIT UP TOTAL        87.5%
dark                12.5%
```

**Half the remaining dark mass sits in 1,511 of 53,560 missing forms.** The head
is worth chasing and the tail is not: 87% → 95% is a few thousand cards, and
95% → 99% is tens of thousands for text almost nobody reads.

### 4. Nobody can review 148,000 cards

At 30 new cards a day — an aggressive pace nobody sustains — that is **13.5
years** of introductions before a single review backlog is counted. A corpus
larger than a lifetime is not a corpus, it is a filing cabinet.

---

## Phase 0 — the lookup layer *(the actual Duden replacement)*

**The source is already downloaded.** `scripts/corpus/data/raw/kaikki-de.jsonl`
is a 1.0 GB Wiktionary extract: **348,666 distinct German headwords**, 367,157
with an English gloss, 82,437 with IPA, and inflection `forms` arrays on most
nouns and verbs. It is 2.4× Duden's headword count and it is sitting there.

Every gap this session found is in it, correctly:

| | Wiktionary says |
|---|---|
| Schadenfreude | malicious enjoyment derived from observing someone else's misfortune |
| Wimper | eyelash |
| Spaß | fun |
| Gott | god |
| Löwenzahn | dandelion |
| Klobürste | toilet brush |

Note the first row. It is the exact word the compound splitter got wrong, and the
lexicon answers it correctly — which is the strongest single argument for
building this.

### The work

1. **`corpus:lexicon`** — a new build script. Read the JSONL, keep `word`, `pos`,
   the first two glosses, IPA, and the inflection `forms`. Drop entries with no
   gloss. Emit **prefix-sharded** JSON: `public/data/lex/<first-two-letters>.json`,
   roughly 676 files. At ~120 bytes an entry that is ~18 MB total and **~30 KB a
   shard** — which is the point. Nothing is loaded at boot.

2. **`lib/lexicon.ts`** — `lookup(term)` fetches the one shard it needs and
   memoises it. Offline behaviour is honest: shards the learner has looked at are
   in the service worker cache, the rest are not, and the sheet says so.

3. **`SearchSheet`** — cards first, always, then a **`From the dictionary`**
   section. Two visibly different things:
   - a **card** can be studied, drilled, bookmarked
   - an **entry** shows gloss + inflections and one action: *note this word*

   The existing "note this word" flow already feeds `authoring:new`, so looking a
   word up in the dictionary layer is exactly how it becomes a candidate card.
   The loop closes itself.

**This is the deliverable that answers "can it replace my Duden".** After it,
Lexi teaches 6,520 words and answers about 150,000.

### The one rule that must not bend

An entry is **never** silently upgraded into a card, and the UI must never let
them look alike. The corpus's value is that everything in it was verified; the
moment an unverified Wiktionary gloss can be drilled, that is gone. Different
section, different affordance, different words on screen.

---

## Phase 1 — the teaching corpus to ~95%

Target **~12,000 cards**, not 148,000. Two ranked inputs, both already computable:

1. **The 1,511 forms holding half the dark mass** (`corpus:tokencov` prints
   them). Filter out the subtitle noise the current list is full of — `oh, hey,
   ok, ach, hi, dad, mom, sir, the, john` — and the interjections. What remains is
   real vocabulary: `Gott, Spaß, jemand, töten, Wimper` were all in the top 25.
2. **The type-coverage cliff** (`corpus:coverage`): ranks 1–2000 are at 85.9–96.6%,
   2001–5000 falls to 74.9%, 5001–10000 to 56.3%. Band 2001–5000 is where the
   next thousand cards should come from.

Sequence it in batches of ~200 through `authoring:new --report`, read the report
before `--write`, and keep the vocab.json copy-aside habit. Roughly 25–30 batches.

**Stop at 95% of running text.** Say so out loud in `VISION.md` so nobody
relitigates it in six months.

---

## Phase 2 — spend the same download on the matcher ✅ *shipped 2026-09-05*

`npm run corpus:inflections` → `public/data/inflections.json`, 370 KB, fetched
after first paint. Measured with `corpus:tokencov`, before and after, **without
adding a single card**:

| | before | after |
|---|---|---|
| matched to a card | 79.7% | **80.4%** |
| lit up in total | 87.5% | **88.1%** |
| dark | 12.5% | **11.9%** |
| distinct missing forms | 53,560 | **52,169** |

`hab`, `hause` and `jungs` dropped out of the top-25 dark list. `hause` was the
seam that named the problem: the generated dative-`e` rule requires a capitalised
token, so a lowercased *hause* missed although *das Haus* is an A1 card.

**Three sources of forms, ranked, each doing what it is good at.** Lemmas first,
so a real headword always beats another word's inflection. Then the attested
table, because a fact beats a guess. Then the generated rules, which still carry
the 15% of cards Wiktionary does not cover and every card added since the
extract was downloaded — which is why none of them were deleted.

Four things had to be *excluded*, and finding them was most of the work:

- **The closed class entirely.** Wiktionary's function-word tables are paradigm
  tables: `er`'s lists *du, es, euch, dein*; `bei`'s lists *dabei, wobei,
  hierbei*. Taking them produced 566 forms that were another card's headword.
  `matcher.ts` already hand-writes these, correctly.
- **Gender derivations.** *Arzt* lists *Ärztin* under `["feminine"]`. A separate
  card, not a form. Requiring a case or number tag drops them and keeps every
  real declension.
- **Auxiliary rows.** `können`'s table lists *haben*. Indexing it would resolve
  every "haben" in a text to *können*.
- **Regular adjective declension.** 56 of an adjective's 58 rows are
  *guter/gute/gutes/gutem/guten*, which suffix-stripping already handles — 44% of
  the file to teach the matcher what it knew. Only the irregular degrees stay
  (*gut → besser, besten*), indexed into `adjIndex` so the declined comparatives
  resolve through them.

327 collisions remain and all of them are genuine German homographs — *bitte* is
the imperative of *bitten* **and** the noun; *Besuchen* is the dative plural of
*der Besuch* **and** the verb. The index is first-wins with lemmas added first,
so the lemma keeps the token.

### What this surfaced and did not fix

`Bitte` capitalised resolves to the *bitte* card rather than *die Bitte*, on
corpus order. German capitalises nouns, and the matcher enforces the converse
rule — a lowercase token cannot be a noun — but not this one. It predates the
attested table and is unaffected by it. Worth a look; it is not a Phase 2 job.

---

## What we should never do

- **Teach compounds the matcher can already decompose.** 11.7% of dictionary
  nouns, and each one is a review spent on something the learner has.
- **Import Wiktionary into `vocab.json`.** That is the gate deleted with extra
  steps. It goes in the lexicon or it does not go in.
- **Show a dictionary entry with a card's chrome.** See Phase 0's rule.
- **Quote a coverage number that no script printed this session.** The whole
  reason this document names a command beside every figure.

---

## Provenance

| Figure | Script |
|---|---|
| 87.5% lit up · 87.0% taught · 1,511 forms | `npm run corpus:tokencov` |
| band coverage 96.6% → 41% | `npm run corpus:coverage` |
| 9.2% / 11.7% / 79.2% dictionary split | `npm run corpus:dictgap` |
| 6,520 cards, field completeness, lookup probe | `npm run corpus:dictcheck` |
| 348,666 headwords, 367,157 glosses, 82,437 IPA | direct scan of `kaikki-de.jsonl` |

Duden's headword count (~148,000, *Universalwörterbuch*) is the publisher's own
figure and is the one number here that is not measured locally.
